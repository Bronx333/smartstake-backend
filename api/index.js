require("dotenv").config(); // ✅ Load environment variables
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { fetchUpcomingMatches } = require("../src/oddsFetcher");
const { getNewsTrendScore } = require("../src/newsAnalyzer");
const { updatePriceHistory, getPriceHistory, getMatchId } = require("../src/priceTracker");
const { logEvent } = require("../src/logger");

const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN);
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(bodyParser.json());

let cachedTopMatches = [];

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

app.get("/api/suggestions", async (req, res) => {
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

    await wait(1000);
  }

  res.json({ matches: enriched.sort((a, b) => b.aiScore - a.aiScore).slice(0, 5) });
});

app.post("/api/log", (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Missing log type" });
  logEvent(type, payload || {});
  res.json({ success: true });
});

// ✅ Export as handler for Vercel
module.exports = app;