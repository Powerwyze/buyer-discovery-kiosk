/**
 * Health — reports which env NAMES are present. Never returns values.
 * Names copied from closest kiosks (turespana-imex-kiosk / godr-marlins-kiosk).
 * This lead kiosk does not require Gemini or camera keys.
 */

const NAMES = [
  "WYZER_GMAIL_USER",
  "WYZER_APP_PASSWORD",
  "FROM_NAME",
  "OPENAI_API_KEY",
  "GMAIL_USER",
  "GOOGLE_APP_PASSWORD",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_IMAGE_SIZE",
  "OPENAI_IMAGE_QUALITY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_BUCKET",
];

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }
  const present = {};
  for (const name of NAMES) present[name] = Boolean(process.env[name]);
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify({
    ok: true,
    service: "buyer-discovery-kiosk",
    demo: "DEMO-002",
    mode: "lead-capture",
    event: "AF&B Miami Beach · Sept 14–16 2026",
    env: present,
  }));
};
