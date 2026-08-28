# PowerWyze Buyer Discovery Station

Portrait **1080×1920** lead-capture kiosk for the **Americas Food & Beverage Show & Conference (AF&B) — 30th Anniversary**, produced by **World Trade Center Miami**.

**DEMO-002 · INTERNAL house activation.** Owner: Bryan Stewart / PowerWyze. No client, no invoice, no external sponsor. Do not email staff about this activation.

Closest pattern: [turespana-imex-kiosk](https://github.com/Powerwyze/turespana-imex-kiosk) (portrait tiles + lead + optional SMTP). This kiosk is **lead / recommendation only** — no camera, no AI image gen, no `GEMINI_API_KEY`.

## Guest flow

1. Kiosk first screen (not a marketing landing page): pick **1 of 8** sourcing categories.
2. See **3 SAMPLE** participating companies (clearly labeled SAMPLE; booths like `SAMPLE-101`).
3. Capture buyer lead: name, company, email, role, sourcing interest + consent.
4. Thank-you / reset for the next attendee.

Backend increments **demand-by-category** counts on each successful `POST /api/lead`.

## Event facts (researched)

Confirmed on the official site [americasfoodandbeverage.com](https://www.americasfoodandbeverage.com/):

- Dates: **September 14–16, 2026**
- Venue name: **Miami Beach Convention Center**
- 30th anniversary edition
- Produced by **World Trade Center Miami**

Hall letters **A, B & C** and street address **1901 Convention Center Drive, Miami Beach, FL 33139** come from intake. They were **not** confirmed on the homepage scrape and should be treated as provisional until a human checks the official travel/venue page.

## SAMPLE data — do not treat as official

Company names and booth numbers are **placeholders** for this internal demo. Do **not** invent or present them as real AF&B exhibitors. Swap in the official exhibitor list when a human provides it.

## Categories (first draft)

Beverages · Dry Goods · Protein / Seafood · Produce · Packaging · Equipment · Private Label · Logistics

## Missing human-only inputs (shipped playable anyway)

- Official 2026 exhibitor roster and booth map
- Licensed PowerWyze logo file (typographic SVG mark ships as a stand-in)
- Confirmed hall letters / street address
- Legal review of consent copy
- Official show category taxonomy
- CRM destination for captured leads
- `FROM_NAME` value if attendee recap email should be branded

## Repo shape

```
public/index.html
public/app.js
public/styles.css
public/data/categories.json
public/assets/           logo.svg, OSK
api/lead.js              POST /api/lead
api/health.js            GET /api/health (env NAME presence only)
api/report.js            GET /api/report (demand-by-category)
lib/                     shared helpers (not public routes)
package.json
vercel.json
```

## APIs

| Method | Path | Role |
| --- | --- | --- |
| `POST` | `/api/lead` | Capture lead + increment category demand. Optional attendee recap email. |
| `GET` | `/api/health` | `{ ok: true }` + which env **names** are present (booleans, never values). |
| `GET` | `/api/report` | Demand-by-category counts. Instance-local on Vercel (ephemeral filesystem). |

Lead JSON: `{ name, company, email, role, categoryId, categoryLabel, consent: true }`.

## Environment variables

Copy **by name** from the closest Vercel project (`turespana-imex-kiosk` or `godr-marlins-kiosk`). Never commit values.

Checked on health (names only):

| Name | Role on this kiosk |
| --- | --- |
| `WYZER_GMAIL_USER` | Preferred SMTP user for optional attendee recap |
| `WYZER_APP_PASSWORD` | Preferred SMTP app password |
| `FROM_NAME` | Email from-name (set to `PowerWyze` if unused) |
| `OPENAI_API_KEY` | Present on closest kiosks; **unused** here |

If SMTP env is missing, lead capture still confirms. Recap email goes **only** to the attendee who consented — never to staff.

## Design

Portrait-first 1080×1920 touch UI. PowerWyze dark premium chrome, gold high-contrast tiles. English first.

## Deploy

Vercel project: `buyer-discovery-kiosk` · team `powerwyzes-projects`.
