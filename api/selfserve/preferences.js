/* ============================================================
   Observant — save a partner's contact preferences (the Manage page).

   The "Your preferences" page (app/manage.jsx) posts here on every change.
   It knows WHICH partner it is from the same base64 `?d=` payload every email
   carries — { product, contact } — so we resolve the partner the same way the
   reply ledger and opt-out link do: product → program slug → program id, then
   (contact + channel=email) → the partner row. A raw `partnerId` is honored if
   the caller has one.

     POST /api/selfserve/preferences
     body: {
       partnerId?  |  (contact + product|slug),   // identity
       action?: "load",                            // read current state, no write
       cadence?: "open" | "occasional" | "rare",   // the ongoing frequency
       pause?:   { days: 30|90 } | { indefinite:true },  // take a break (overrides)
       resume?:  true,                             // end the pause now
       optOut?:  true                              // leave entirely
     }

   Writes to `partners`:
     cadence  → partner.cadence
     pause    → status='paused'  (+ paused_until = now+days, or null if indefinite)
     resume   → status='active'  (+ paused_until = null)
     optOut   → status='opted_out'

   Degrades gracefully: no DB → { ok:true, simulated:true, ...computed } so the
   page still shows its saved confirmation. Tolerates a missing `paused_until`
   column (retries status-only) so a pause still works before that migration.
   Bare-serverless: never throws.
   ============================================================ */
const db = require("../_db");

const DAY_MS = 24 * 60 * 60 * 1000;
const VALID_CADENCE = ["open", "occasional", "rare"];

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = await readJson(req);
    const partnerId = String(body.partnerId || "").trim();
    const contact = String(body.contact || "").trim();
    const product = String(body.product || body.slug || "").trim();

    // ---- work out what changed, and the values to echo back for the UI ----
    const now = Date.now();
    const cadence = VALID_CADENCE.includes(body.cadence) ? body.cadence : null;
    const patch = {};
    let pausedUntil; // undefined = untouched; null = indefinite / cleared; string = ISO

    if (cadence) patch.cadence = cadence;

    if (body.optOut === true) {
      patch.status = "opted_out";
    } else if (body.resume === true) {
      patch.status = "active";
      patch.paused_until = null;
      pausedUntil = null;
    } else if (body.pause && typeof body.pause === "object") {
      const p = body.pause;
      const indefinite = p.indefinite === true || p.days === "indefinite" || p.days == null;
      pausedUntil = indefinite ? null : new Date(now + Number(p.days) * DAY_MS).toISOString();
      patch.status = "paused";
      patch.paused_until = pausedUntil;
    }

    const echo = {};
    if (cadence) echo.cadence = cadence;
    if (patch.status) echo.status = patch.status;
    if (pausedUntil !== undefined) echo.paused_until = pausedUntil;

    // ---- no DB → simulate cleanly (the page still confirms) ----
    if (!db.dbConfigured()) {
      return res.status(200).json({ ok: true, simulated: true, ...echo });
    }

    // ---- resolve which partner row(s) this targets ----
    const query = await buildQuery({ partnerId, contact, product });
    if (!query) return res.status(200).json({ ok: false, error: "couldn't identify partner" });

    // ---- load: read current state so the page opens in the real state ----
    if (body.action === "load") {
      const cur = await loadState(query);
      return res.status(200).json({ ok: true, ...cur });
    }

    if (!Object.keys(patch).length) return res.status(200).json({ ok: false, error: "nothing to change" });

    await applyPatch(query, patch);
    return res.status(200).json({ ok: true, ...echo });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

/* ---- identity: raw id, else contact+program (product/slug) ---- */
async function buildQuery({ partnerId, contact, product }) {
  if (partnerId) return "id=eq." + encodeURIComponent(partnerId);
  if (!contact) return null;
  let query = "contact=eq." + encodeURIComponent(contact) + "&channel=eq.email";
  const programId = product ? await resolveProgramId(product) : null;
  if (programId) query += "&program_id=eq." + programId;
  return query;
}

// Program id from a slug or product name (best-effort, null if none).
async function resolveProgramId(product) {
  try {
    const slug = String(product || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    let rows = slug ? await db.select("programs", "slug=eq." + encodeURIComponent(slug) + "&select=id&limit=1") : [];
    if ((!rows || !rows.length) && product) {
      rows = await db.select("programs", "product_name=eq." + encodeURIComponent(product) + "&select=id&limit=1");
    }
    return (Array.isArray(rows) && rows[0]) ? rows[0].id : null;
  } catch (_e) { return null; }
}

// Current cadence/status/paused_until; tolerates a DB without a paused_until column.
async function loadState(query) {
  try {
    const rows = await db.select("partners", query + "&select=cadence,status,paused_until&order=created_at.asc&limit=1");
    return (Array.isArray(rows) && rows[0]) || {};
  } catch (_e) {
    try {
      const rows = await db.select("partners", query + "&select=cadence,status&order=created_at.asc&limit=1");
      return (Array.isArray(rows) && rows[0]) || {};
    } catch (_e2) { return {}; }
  }
}

// Apply the patch; if paused_until isn't a column yet, retry with the rest so
// a status-only pause still lands.
async function applyPatch(query, patch) {
  try {
    return await db.update("partners", query, patch);
  } catch (e) {
    if (patch.paused_until !== undefined) {
      const rest = {};
      Object.keys(patch).forEach((k) => { if (k !== "paused_until") rest[k] = patch[k]; });
      if (Object.keys(rest).length) return db.update("partners", query, rest);
    }
    throw e;
  }
}

async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let b = "";
  for await (const c of req) { b += c; if (b.length > 60000) throw new Error("too large"); }
  return b ? JSON.parse(b) : {};
}
