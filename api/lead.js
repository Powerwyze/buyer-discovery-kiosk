/**
 * POST /api/lead — capture a buyer lead + increment demand-by-category.
 *
 * JSON: { name, company, email, role, sourcingInterest, categoryId, categoryLabel, consent }
 *
 * Optional attendee recap via WYZER_GMAIL_USER / WYZER_APP_PASSWORD / FROM_NAME.
 * If SMTP env is missing, capture still succeeds. Never emails staff.
 */

const nodemailer = require("nodemailer");
const { setCors, readJson, isEmail, CATEGORY_IDS, CATEGORY_LABELS } = require("../lib/shared");
const { addLead } = require("../lib/store");

const ROLE_IDS = new Set([
  "buyer", "distributor", "retailer", "foodservice", "importer", "broker", "other",
]);

function esc(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function smtpReady() {
  const user = process.env.WYZER_GMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.WYZER_APP_PASSWORD || process.env.GOOGLE_APP_PASSWORD;
  return Boolean(user && pass);
}

async function sendRecap({ name, email, company, role, categoryLabel, companies }) {
  const user = process.env.WYZER_GMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.WYZER_APP_PASSWORD || process.env.GOOGLE_APP_PASSWORD;
  if (!user || !pass) return { emailed: false, reason: "smtp-not-configured" };

  const fromName = process.env.FROM_NAME || "PowerWyze";
  const greet = name ? esc(name) : "there";
  const rows = (companies || []).slice(0, 3).map((c) => (
    `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="font-weight:700;color:#FFFFFF">${esc(c.name)}</div>
        <div style="font-size:12px;color:#D4AF37;letter-spacing:0.08em;margin-top:2px">SAMPLE · ${esc(c.booth)}</div>
        <div style="font-size:13px;color:#C8C4B8;margin-top:4px">${esc(c.blurb)}</div>
      </td>
    </tr>`
  )).join("");

  const html = `<!doctype html><html><body style="margin:0;padding:0;font-family:Inter,Helvetica,Arial,sans-serif;background:#07080C;color:#FFFFFF">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#07080C;padding:32px 16px">
      <tr><td align="center">
        <table role="presentation" width="600" style="max-width:600px;width:100%;background:#111318;border:1px solid rgba(212,175,55,0.35);border-radius:18px;overflow:hidden;color:#FFFFFF">
          <tr><td style="padding:28px 32px 16px;border-bottom:1px solid rgba(255,255,255,0.08)">
            <div style="font-size:11px;letter-spacing:0.28em;color:#D4AF37;font-weight:700;text-transform:uppercase">PowerWyze</div>
            <div style="font-size:26px;font-weight:700;margin-top:8px;line-height:1.15">Buyer Discovery recap</div>
            <div style="margin-top:8px;font-size:12px;letter-spacing:0.16em;color:#A8A49A;text-transform:uppercase">AF&amp;B · Sept 14–16 2026 · Miami Beach Convention Center</div>
          </td></tr>
          <tr><td style="padding:24px 32px">
            <p style="margin:0 0 12px;font-size:16px">Hi ${greet},</p>
            <p style="margin:0 0 16px;color:#C8C4B8;line-height:1.5">Thanks for stopping at the PowerWyze Buyer Discovery Station. We captured your sourcing interest in <strong style="color:#FFFFFF">${esc(categoryLabel)}</strong>${company ? ` for <strong style="color:#FFFFFF">${esc(company)}</strong>` : ""}.</p>
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;color:#D4AF37;text-transform:uppercase">SAMPLE recommendations — not official exhibitors</p>
            <table role="presentation" width="100%" style="border-collapse:collapse">${rows}</table>
            <p style="margin:18px 0 0;color:#A8A49A;font-size:13px;line-height:1.5">Role noted: ${esc(role || "—")}. This is an internal PowerWyze house demo (DEMO-002). No client invoice. Official show site: americasfoodandbeverage.com</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"${fromName}" <${user}>`,
    to: email,
    subject: `Your AF&B Buyer Discovery recap — ${categoryLabel}`,
    html,
    text: `Hi ${name || "there"}, thanks for visiting the PowerWyze Buyer Discovery Station. Sourcing interest: ${categoryLabel}. SAMPLE recommendations only — not official AF&B exhibitors.`,
  });

  return { emailed: true };
}

module.exports = async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.statusCode = 405; return res.end("Method not allowed"); }

  let body;
  try { body = await readJson(req); }
  catch (e) {
    res.statusCode = 400;
    return res.end("Invalid JSON: " + e.message);
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const company = String(body.company || "").trim().slice(0, 120);
  const email = String(body.email || "").trim().slice(0, 320);
  const role = String(body.role || "").trim().slice(0, 40);
  const categoryId = String(body.categoryId || body.sourcingInterest || "").trim();
  const categoryLabel = String(
    body.categoryLabel || CATEGORY_LABELS[categoryId] || ""
  ).trim().slice(0, 80);
  const consent = body.consent === true || body.consent === "true";
  const companies = Array.isArray(body.companies) ? body.companies.slice(0, 3).map((c) => ({
    name: String(c.name || "").slice(0, 80),
    booth: String(c.booth || "").slice(0, 24),
    blurb: String(c.blurb || "").slice(0, 180),
  })) : [];

  if (!name) { res.statusCode = 400; return res.end("Name is required"); }
  if (!company) { res.statusCode = 400; return res.end("Company is required"); }
  if (!isEmail(email)) { res.statusCode = 400; return res.end("Invalid email"); }
  if (!ROLE_IDS.has(role)) { res.statusCode = 400; return res.end("Invalid role"); }
  if (!CATEGORY_IDS.includes(categoryId)) { res.statusCode = 400; return res.end("Invalid category"); }
  if (!consent) { res.statusCode = 400; return res.end("Consent is required"); }

  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const record = {
    id,
    name,
    company,
    email,
    role,
    categoryId,
    categoryLabel,
    sourcingInterest: categoryId,
    consent: true,
    createdAt: new Date().toISOString(),
    source: "buyer-discovery-kiosk",
    event: "AF&B Miami Beach · Sept 14–16 2026",
    demo: "DEMO-002",
  };

  const store = addLead(record);
  let emailed = false;
  let emailReason = smtpReady() ? "pending" : "smtp-not-configured";

  try {
    const result = await sendRecap({
      name, email, company, role, categoryLabel, companies,
    });
    emailed = Boolean(result.emailed);
    emailReason = result.reason || (emailed ? "sent" : "skipped");
  } catch (e) {
    console.error("optional recap skipped", e.message || e);
    emailReason = "send-failed";
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify({
    ok: true,
    captured: true,
    id,
    emailed,
    emailReason,
    categoryId,
    demand: store.demand,
    totalLeads: store.leads.length,
  }));
};
