const priceMap = new Map();

function getMatchId(match) {
  return `${match.home_team}-${match.away_team}-${match.kickoff}`;
}

function updatePriceHistory(matchId, currentOdds) {
  if (!priceMap.has(matchId)) {
    // Push the first value twice so chart has at least 2 points
    priceMap.set(matchId, [currentOdds, currentOdds]);
  } else {
    const existing = priceMap.get(matchId);
    const last = existing[existing.length - 1];
    if (last !== currentOdds) {
      existing.push(currentOdds);
      if (existing.length > 6) existing.shift(); // keep max 6
      priceMap.set(matchId, existing);
    }
  }
}

function getPriceHistory(matchId) {
  return priceMap.get(matchId) || [];
}

module.exports = {
  getMatchId,
  updatePriceHistory,
  getPriceHistory,
};