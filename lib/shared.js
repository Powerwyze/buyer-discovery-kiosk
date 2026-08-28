function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 256 * 1024) reject(new Error("Payload too large"));
    });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");

const CATEGORY_IDS = [
  "beverages",
  "dry-goods",
  "protein-seafood",
  "produce",
  "packaging",
  "equipment",
  "private-label",
  "logistics",
];

const CATEGORY_LABELS = {
  beverages: "Beverages",
  "dry-goods": "Dry Goods",
  "protein-seafood": "Protein / Seafood",
  produce: "Produce",
  packaging: "Packaging",
  equipment: "Equipment",
  "private-label": "Private Label",
  logistics: "Logistics",
};

function emptyDemand() {
  return Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0]));
}

module.exports = {
  setCors,
  readJson,
  isEmail,
  CATEGORY_IDS,
  CATEGORY_LABELS,
  emptyDemand,
};
