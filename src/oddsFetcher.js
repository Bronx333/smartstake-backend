const axios = require("axios");
require("dotenv").config();

// ✅ Updated to use new Odds API key directly (or from .env if preferred)
const ODDS_API_KEY = process.env.ODDS_API_KEY || "1251526894b03d41d718ed734dc02532";

const {
  getMatchId,
  updatePriceHistory,
  getPriceHistory,
} = require("./priceTracker");

async function fetchUpcomingMatches() {
  try {
    const url = `https://api.the-odds-api.com/v4/sports/upcoming/odds?regions=eu&markets=h2h&apiKey=${ODDS_API_KEY}`;
    const response = await axios.get(url);
    const rawMatches = response.data;

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const filtered = rawMatches.filter((m) => {
      const kickoff = new Date(m.commence_time);
      return kickoff > now && kickoff <= in24h;
    });

    const formatted = filtered.map((match) => transformToSmartStakeFormat(match));
    return formatted;
  } catch (error) {
    console.error("❌ Failed to fetch odds:", error.message);
    return [];
  }
}

function transformToSmartStakeFormat(match) {
  const home = match.home_team;
  const away = match.away_team;

  const bestBookmaker = match.bookmakers.find(b => b.markets?.[0]?.outcomes);
  const h2h = bestBookmaker?.markets?.[0]?.outcomes || [];

  const homeOdds = h2h.find(o => o.name === home)?.price || null;
  const awayOdds = h2h.find(o => o.name === away)?.price || null;

  const suggestedOdds = homeOdds && awayOdds
    ? (homeOdds < awayOdds ? homeOdds : awayOdds)
    : null;

  const suggestion =
    homeOdds && awayOdds
      ? `Stake on ${homeOdds < awayOdds ? home : away} to win`
      : "No suggestion";

  const kickoff = match.commence_time || null;
  const matchId = getMatchId({ home_team: home, away_team: away, kickoff });

  // 🧠 Track dynamic price history
  if (suggestedOdds) {
    updatePriceHistory(matchId, suggestedOdds);
  }

  const priceChange = getPriceHistory(matchId);

  return {
    home_team: home,
    away_team: away,
    match: `${home} vs ${away}`,
    league: match.sport_title || "Unknown League",
    kickoff,
    suggestion,
    odds: suggestedOdds,
    trend: "High Volume",
    trendRatio: "61%",
    priceChange,
    newsInsight: null,
    newsUrl: null,
  };
}

module.exports = {
  fetchUpcomingMatches,
};
