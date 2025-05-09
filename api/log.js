const { logEvent } = require("../src/logger");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { type, payload } = req.body;
  if (!type) return res.status(400).json({ error: "Missing log type" });

  logEvent(type, payload || {});
  res.status(200).json({ success: true });
};