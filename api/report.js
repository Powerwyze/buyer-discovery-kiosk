/**
 * GET /api/report — demand-by-category counts for the Buyer Discovery Station.
 */
const { setCors, CATEGORY_IDS, CATEGORY_LABELS, emptyDemand } = require("../lib/shared");
const { report } = require("../lib/store");

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "GET") {
    res.statusCode = 405;
    return res.end("Method not allowed");
  }

  const snap = report();
  const demand = { ...emptyDemand(), ...snap.demand };
  const byCategory = CATEGORY_IDS.map((id) => ({
    id,
    label: CATEGORY_LABELS[id],
    count: Number(demand[id] || 0),
  }));

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify({
    ok: true,
    service: "buyer-discovery-kiosk",
    event: "Americas Food & Beverage Show & Conference · Sept 14–16 2026 · Miami Beach Convention Center",
    persistence: "instance",
    totalLeads: snap.totalLeads,
    demand,
    byCategory,
  }));
};
