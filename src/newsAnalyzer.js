const axios = require('axios');

const GNEWS_API_KEY = 'b0741c6a7e03838dc922557ab64e1fe7';
const NEWSDATA_API_KEY = 'pub_79553687edf66d9e82bd0d20b92ee11e70696';

async function fetchFromGNews(title) {
  const url = `https://gnews.io/api/v4/search?q="${encodeURIComponent(title)}"&lang=en&token=${GNEWS_API_KEY}`;

  try {
    const res = await axios.get(url);
    const articles = res.data.articles || [];

    return {
      score: articles.length,
      articles: articles.map(a => ({ title: a.title, url: a.url }))
    };
  } catch (err) {
    const code = err.response?.status;
    console.error(`❌ GNews error for ${title}: ${err.message}`);
    if (code === 429 || code === 403) {
      return null; // Trigger fallback
    }
    return { score: 0, articles: [] };
  }
}

async function fetchFromNewsData(title) {
  const url = `https://newsdata.io/api/1/news?apikey=${NEWSDATA_API_KEY}&q="${encodeURIComponent(title)}"&language=en`;

  try {
    const res = await axios.get(url);
    const articles = res.data.results || [];

    return {
      score: articles.length,
      articles: articles.map(a => ({ title: a.title, url: a.link }))
    };
  } catch (err) {
    console.error(`❌ NewsData.io error for ${title}: ${err.message}`);
    return { score: 0, articles: [] };
  }
}

async function getNewsTrendScore(title) {
  let data = await fetchFromGNews(title);
  if (!data) {
    data = await fetchFromNewsData(title);
  }

  if (data && data.articles.length > 0) {
    console.log(`📰 ${title}: ${data.articles.length} articles`);
  } else {
    console.log(`📰 ${title}: 0 articles`);
  }

  return data || { score: 0, articles: [] };
}

module.exports = { getNewsTrendScore };