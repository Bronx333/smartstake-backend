const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'topMatchesCache.json');

// ✅ Load top matches from file (fallback to empty array)
function loadTopMatchesFromFile() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
    return [];
  } catch (err) {
    console.error("❌ Failed to load top matches from file:", err.message);
    return [];
  }
}

// ✅ Save top matches to file
function saveTopMatchesToFile(matches) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(matches, null, 2), 'utf8');
  } catch (err) {
    console.error("❌ Failed to save top matches to file:", err.message);
  }
}

module.exports = {
  loadTopMatchesFromFile,
  saveTopMatchesToFile,
};