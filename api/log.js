const { logEvent } = require("../src/logger");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.FRONTEND_ORIGIN || "https://smartstake-frontend-v3-3.vercel.app"
  );
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { type, payload } = req.body;
  if (!type) {
    return res.status(400).json({ error: "Missing log type" });
  }

  try {
    await logEvent(type, payload || {});
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error logging event:", err);
    res.status(500).json({ error: "Failed to log event" });
  }
};