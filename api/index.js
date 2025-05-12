// /api/index.js
const express = require("express");
const microCors = require("micro-cors");
const bodyParser = require("body-parser");
const { fetchUpcomingMatches } = require("../src/oddsFetcher");
const { getNewsTrendScore } = require("../src/newsAnalyzer");
const { updatePriceHistory, getPriceHistory, getMatchId } = require("../src/priceTracker");
const { logEvent } = require("../src/logger");

const app = express();

const cors = microCors({
  allowMethods: ["GET", "POST", "OPTIONS"],
  origin: process.env.FRONTEND_ORIGIN || "*",
});
app.use(cors());

app.use(bodyParser.json());

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

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  res.json({ matches: enriched.sort((a, b) => b.aiScore - a.aiScore).slice(0, 5) });
});

app.post("/api/log", async (req, res) => {
  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Missing log type" });

  try {
    await logEvent(type, payload || {});
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error logging event:", err);
    res.status(500).json({ error: "Failed to log event" });
  }
});

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

// ✅ Add a simple root route for browser
app.get("/", (req, res) => {
  res.send("✅ SmartStake Backend is live.");
});
// ✅ Export handler for Vercel
module.exports = app;