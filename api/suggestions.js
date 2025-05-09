const { fetchUpcomingMatches } = require("../src/oddsFetcher");
const { getNewsTrendScore } = require("../src/newsAnalyzer");
const { getPriceHistory, getMatchId } = require("../src/priceTracker");

function calculateScore({ newsScore, priceChange, kickoff }) {
  const newsWeight = 0.6, priceWeight = 0.3, timeWeight = 0.1;
  const priceStart = priceChange?.[0] || 0;
  const priceEnd = priceChange?.[priceChange.length - 1] || 0;
  const priceChangePercent = priceStart ? ((priceStart - priceEnd) / priceStart) * 100 : 0;
  const hoursToKickoff = Math.max(0, Math.min(24, (new Date(kickoff) - new Date()) / 3600000));
  return (
    Math.min(newsScore / 10, 1) * newsWeight +
    Math.min(Math.abs(priceChangePercent) / 10, 1) * priceWeight +
    (1 - hoursToKickoff / 24) * timeWeight
  );
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const upcoming = await fetchUpcomingMatches();
    const enriched = [];

    for (const match of upcoming) {
      if (!match.home_team || !match.away_team || !match.odds) continue;
      const title = `${match.home_team} vs ${match.away_team}`;
      const matchId = getMatchId(match);
      const newsData = await getNewsTrendScore(title);
      const priceChange = getPriceHistory(matchId);
      const aiScore = calculateScore({ newsScore: newsData.score, priceChange, kickoff: match.kickoff });

      enriched.push({
        ...match,
        newsScore: newsData.score,
        topNews: newsData.articles?.[0] ? {
          title: newsData.articles[0].title,
          url: newsData.articles[0].url,
        } : null,
        newsInsight: newsData.articles?.[0]?.title || null,
        newsUrl: newsData.articles?.[0]?.url || null,
        priceChange,
        aiScore: aiScore.toFixed(3),
      });

      await new Promise((r) => setTimeout(r, 300));
    }

    res.status(200).json({
      matches: enriched.sort((a, b) => b.aiScore - a.aiScore).slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};