/**
 * In-instance demand + lead store.
 * Vercel filesystems are ephemeral; this keeps a playable report for the
 * warm function instance (and /tmp while that instance lives).
 */
const fs = require("fs");
const path = require("path");
const { emptyDemand } = require("./shared");

const FILE = path.join("/tmp", "buyer-discovery-store.json");

function blank() {
  return { leads: [], demand: emptyDemand() };
}

function load() {
  if (global.__bdsStore) return global.__bdsStore;
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8"));
    if (parsed && parsed.demand && Array.isArray(parsed.leads)) {
      global.__bdsStore = {
        leads: parsed.leads,
        demand: { ...emptyDemand(), ...parsed.demand },
      };
      return global.__bdsStore;
    }
  } catch (_) { /* first boot */ }
  global.__bdsStore = blank();
  return global.__bdsStore;
}

function persist(store) {
  global.__bdsStore = store;
  try { fs.writeFileSync(FILE, JSON.stringify(store)); } catch (_) { /* ignore */ }
}

function addLead(lead) {
  const store = load();
  const categoryId = lead.categoryId;
  if (Object.prototype.hasOwnProperty.call(store.demand, categoryId)) {
    store.demand[categoryId] += 1;
  }
  store.leads.push(lead);
  if (store.leads.length > 400) store.leads = store.leads.slice(-400);
  persist(store);
  return store;
}

function report() {
  const store = load();
  return {
    totalLeads: store.leads.length,
    demand: { ...emptyDemand(), ...store.demand },
  };
}

module.exports = { addLead, report, load };
