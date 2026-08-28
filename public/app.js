/* ================================================================
 *  PowerWyze Buyer Discovery Station — AF&B Miami Beach 2026
 *  Flow: category → SAMPLE recs → lead + consent → thank you / reset
 * ================================================================ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const state = {
  catalog: null,
  category: null,
  lastCapture: null,
};

function showScreen(id) {
  $$(".screen").forEach((el) => {
    const on = el.id === id;
    el.classList.toggle("is-active", on);
    el.hidden = !on;
    el.setAttribute("aria-hidden", on ? "false" : "true");
  });
  const stepMap = {
    screenHome: "home",
    screenRecs: "recs",
    screenLead: "lead",
    screenThanks: "thanks",
  };
  const step = stepMap[id];
  $$(".steps__item").forEach((el) => {
    el.classList.toggle("is-active", el.getAttribute("data-step") === step);
  });
}

function setHero(title, lede) {
  $("#heroTitle").textContent = title;
  $("#heroLede").textContent = lede;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderCategories() {
  const grid = $("#catGrid");
  grid.innerHTML = "";
  state.catalog.categories.forEach((cat, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cat-tile";
    btn.setAttribute("role", "listitem");
    btn.style.setProperty("--tile-accent", cat.accent || "#D4AF37");
    btn.innerHTML = `
      <span class="cat-tile__num">${pad(i + 1)}</span>
      <span class="cat-tile__label">${cat.label}</span>
      <span class="cat-tile__note">${cat.note || ""}</span>
    `;
    btn.addEventListener("click", () => selectCategory(cat));
    grid.appendChild(btn);
  });
}

function renderRoles() {
  const sel = $("#roleInput");
  sel.innerHTML = `<option value="">Select your role</option>` +
    state.catalog.roles.map((r) => `<option value="${r.id}">${r.label}</option>`).join("");
}

function selectCategory(cat) {
  state.category = cat;
  $$(".cat-tile").forEach((el) => {
    el.classList.toggle("is-selected", el.querySelector(".cat-tile__label")?.textContent === cat.label);
  });
  $("#recsChosen").textContent = `Sourcing · ${cat.label}`;
  $("#leadChosen").textContent = `Sourcing · ${cat.label}`;
  $("#interestInput").value = cat.label;
  renderRecs(cat);
  setHero(cat.label, "SAMPLE participating companies for this category. Not official AF&B exhibitors.");
  showScreen("screenRecs");
}

function renderRecs(cat) {
  const list = $("#recList");
  list.innerHTML = "";
  cat.companies.forEach((co) => {
    const card = document.createElement("article");
    card.className = "rec-card";
    card.innerHTML = `
      <div class="rec-card__top">
        <div class="rec-card__name">${co.name}</div>
        <div class="rec-card__booth">${co.booth}</div>
      </div>
      <p class="rec-card__blurb">${co.blurb}</p>
      <span class="rec-card__tag">SAMPLE</span>
    `;
    list.appendChild(card);
  });
}

function resetLeadForm() {
  $("#leadForm").reset();
  $("#leadErr").textContent = "";
  if (state.category) $("#interestInput").value = state.category.label;
}

function goHome() {
  state.category = null;
  $$(".cat-tile").forEach((el) => el.classList.remove("is-selected"));
  resetLeadForm();
  setHero("What are you sourcing?", "Tap a category. We’ll recommend SAMPLE participating companies, then capture your buyer lead.");
  showScreen("screenHome");
}

function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s || "");
}

async function submitLead(ev) {
  ev.preventDefault();
  const err = $("#leadErr");
  err.textContent = "";

  const name = $("#nameInput").value.trim();
  const company = $("#companyInput").value.trim();
  const email = $("#emailInput").value.trim();
  const role = $("#roleInput").value;
  const consent = $("#consentCheck").checked;

  if (!name) { err.textContent = "Please enter your name."; return; }
  if (!company) { err.textContent = "Please enter your company."; return; }
  if (!isEmail(email)) { err.textContent = "Please enter a valid work email."; return; }
  if (!role) { err.textContent = "Please select your role."; return; }
  if (!consent) { err.textContent = "Consent is required to capture this lead."; return; }
  if (!state.category) { err.textContent = "Please choose a sourcing category."; return; }

  const btn = $("#leadSubmit");
  btn.disabled = true;
  btn.textContent = "Saving…";

  const payload = {
    name,
    company,
    email,
    role,
    sourcingInterest: state.category.id,
    categoryId: state.category.id,
    categoryLabel: state.category.label,
    consent: true,
    companies: state.category.companies,
  };

  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    let data = {};
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
    if (!res.ok || !data.ok) {
      throw new Error(typeof data === "object" && data.raw ? data.raw : (text || "Lead capture failed"));
    }
    state.lastCapture = { ...payload, emailed: data.emailed, emailReason: data.emailReason };
    const recap = data.emailed
      ? `A SAMPLE recap was emailed to ${email}.`
      : `Lead saved. Email recap not sent (${data.emailReason || "smtp optional"}).`;
    $("#thanksLede").textContent = `Thanks, ${name}. Your ${state.category.label} interest is on the demand board.`;
    $("#thanksMeta").textContent = recap;
    setHero("You’re on the board.", "PowerWyze turns booth traffic into structured lead capture and branded takeaways.");
    showScreen("screenThanks");
  } catch (e) {
    err.textContent = e.message || "Could not save this lead. Try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit lead";
  }
}

async function boot() {
  try {
    const res = await fetch("/data/categories.json", { cache: "no-store" });
    if (!res.ok) throw new Error("catalog");
    state.catalog = await res.json();
  } catch (_) {
    $("#heroLede").textContent = "Could not load sourcing categories. Refresh the kiosk.";
    return;
  }

  renderCategories();
  renderRoles();
  goHome();

  $("#recsBack").addEventListener("click", goHome);
  $("#recsContinue").addEventListener("click", () => {
    setHero("Capture this buyer.", "Name, company, email, role, sourcing interest, and consent.");
    showScreen("screenLead");
  });
  $("#leadBack").addEventListener("click", () => {
    if (state.category) selectCategory(state.category);
    else goHome();
  });
  $("#leadForm").addEventListener("submit", submitLead);
  $("#thanksReset").addEventListener("click", goHome);

  (function attachOSKWhenReady(tries) {
    if (window.OSK && typeof window.OSK.attach === "function") {
      window.OSK.attach({
        targets: ["#nameInput", "#companyInput", "#emailInput"],
        lang: "en",
        onSubmit: () => document.getElementById("leadSubmit")?.click(),
      });
      return;
    }
    if (tries > 0) setTimeout(() => attachOSKWhenReady(tries - 1), 80);
  })(40);
}

if (document.readyState !== "loading") boot();
else window.addEventListener("DOMContentLoaded", boot);
