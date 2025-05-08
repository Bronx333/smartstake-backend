require("dotenv").config(); // ✅ Load environment variables
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const bodyParser = require("body-parser");

const { fetchUpcomingMatches } = require("./src/oddsFetcher");
const { getNewsTrendScore } = require("./src/newsAnalyzer");
const {
  updatePriceHistory,
  getPriceHistory,
  getMatchId,
} = require("./src/priceTracker");
const { logEvent } = require("./src/logger");

const app = express();
const PORT = 5051;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || "http://localhost:5173");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(bodyParser.json());

let cachedTopMatches = [];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateScore({ newsScore, priceChange, kickoff }) {
  const newsWeight = 0.6;
  const priceWeight = 0.3;
  const timeWeight = 0.1;

  const priceStart = priceChange?.[0] || 0;
  const priceEnd = priceChange[priceChange.length - 1] || 0;
  const priceChangePercent = priceStart
    ? ((priceStart - priceEnd) / priceStart) * 100
    : 0;

  const kickoffTime = new Date(kickoff);
  const now = new Date();
  const hoursToKickoff = Math.max(
    0,
    Math.min(24, (kickoffTime - now) / (1000 * 60 * 60))
  );

  const normNews = Math.min(newsScore / 10, 1);
  const normPrice = Math.min(Math.abs(priceChangePercent) / 10, 1);
  const normTime = 1 - hoursToKickoff / 24;

  return (
    normNews * newsWeight +
    normPrice * priceWeight +
    normTime * timeWeight
  );
}

async function refreshTopMatches() {
  console.log("🔁 Refreshing top match suggestions...");
  try {
    const upcoming = await fetchUpcomingMatches();
    const enriched = [];

    for (const match of upcoming) {
      const { home_team, away_team, kickoff, odds } = match;
      if (!home_team || !away_team || !odds) continue;

      const matchId = getMatchId(match);
      const title = `${home_team} vs ${away_team}`;

      const newsData = await getNewsTrendScore(title);
      const priceChange = getPriceHistory(matchId);

      const score = calculateScore({
        newsScore: newsData.score,
        priceChange,
        kickoff,
      });

      enriched.push({
        ...match,
        newsScore: newsData.score,
        topNews: newsData.articles?.[0]
          ? {
              title: newsData.articles[0].title,
              url: newsData.articles[0].url,
            }
          : null,
        newsInsight: newsData.articles?.[0]?.title || null,
        newsUrl: newsData.articles?.[0]?.url || null,
        priceChange,
        aiScore: score.toFixed(3),
      });

      await wait(1000);
    }

    cachedTopMatches = enriched
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 5);

    console.log("✅ Top 5 matches refreshed");
  } catch (err) {
    console.error("❌ Failed to refresh top matches:", err.message);
  }
}

app.get("/api/suggestions", (req, res) => {
  res.json({ matches: cachedTopMatches });
});

app.post("/api/log", (req, res) => {
  const { type, payload } = req.body;
  if (!type) {
    return res.status(400).json({ error: "Missing log type" });
  }
  console.log("📥 Received log:", type, payload);
  logEvent(type, payload || {});
  res.json({ success: true });
});

setInterval(async () => {
  console.log("⏳ Updating odds history...");
  try {
    const matches = await fetchUpcomingMatches();
    for (const match of matches) {
      const { odds } = match;
      if (!match.home_team || !match.away_team || !odds) continue;
      const matchId = getMatchId(match);
      updatePriceHistory(matchId, odds);
    }
    console.log("✅ Odds history updated");
  } catch (err) {
    console.error("❌ Failed to update odds history:", err.message);
  }
}, 1000 * 60 * 20);

setInterval(refreshTopMatches, 1000 * 60 * 60);

refreshTopMatches();

app.listen(PORT, () => {
  console.log(`✅ SmartStake backend running on port ${PORT}`);
});