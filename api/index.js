// Vercel Serverless Function  ->  /api?pair=usdbrl_otc&tf=1M
// Key sirf backend pe hai. Vercel Dashboard > Settings > Environment Variables me
// SIGNAL_KEY set karo (recommended). Warna neeche wali fallback key use hogi.

const BASE_URL = "https://magic-scripts-live.vercel.app/s";
const API_KEY = process.env.SIGNAL_KEY || "KEY_241A00989277";

const PAIR_RE = /^[a-z]{6}_otc$/;                 // e.g. eurusd_otc, usdbrl_otc
const TF_ALLOWED = ["5S", "10S", "15S", "30S", "1M", "2M", "3M", "5M", "10M", "15M"];

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method !== "GET") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  const pair = String(req.query.pair || "").toLowerCase().trim();
  const tf = String(req.query.tf || "").toUpperCase().trim();

  if (!PAIR_RE.test(pair)) {
    return res.status(400).json({ status: "error", message: "Invalid pair" });
  }
  if (!TF_ALLOWED.includes(tf)) {
    return res.status(400).json({ status: "error", message: "Invalid timeframe" });
  }

  const url = `${BASE_URL}?pair=${encodeURIComponent(pair)}&tf=${encodeURIComponent(tf)}&key=${encodeURIComponent(API_KEY)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);

  try {
    const r = await fetch(url, { signal: ctrl.signal });
    const text = await r.text();
    let json;
    try { json = JSON.parse(text); }
    catch { return res.status(502).json({ status: "error", message: "Signal service returned an invalid response" }); }

    // Key ya koi private cheez client ko kabhi nahi bhejte
    return res.status(r.ok ? 200 : r.status).json(json);
  } catch (e) {
    const timeout = e.name === "AbortError";
    return res.status(timeout ? 504 : 502).json({
      status: "error",
      message: timeout ? "Signal service timed out" : "Could not reach the signal service",
    });
  } finally {
    clearTimeout(timer);
  }
};
