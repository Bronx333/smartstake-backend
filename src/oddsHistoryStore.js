// oddsHistoryStore.js
const oddsHistory = {}; // In-memory store: { 'matchId': [odds1, odds2, ...] }

function storeOddsSnapshot(matches) {
  const now = Date.now();

  matches.forEach(match => {
    const matchId = `${match.home_team} vs ${match.away_team}`;
    if (!oddsHistory[matchId]) {
      oddsHistory[matchId] = [];
    }
    oddsHistory[matchId].push({ odds: match.odds, timestamp: now });

    // 🔁 Keep only last 6 snapshots (approx. last 2 hours if every 20min)
    if (oddsHistory[matchId].length > 6) {
      oddsHistory[matchId].shift();
    }
  });
}

function getOddsHistory(matchId) {
  return oddsHistory[matchId]?.map(o => o.odds) || [];
}

module.exports = { storeOddsSnapshot, getOddsHistory };
