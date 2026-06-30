/* ============================================================
   Observant — in-product feedback INGEST (runtime behind the
   "Observant is live" screen). Receives every response posted by
   the in-app SDK (snippet.js) and persists it.

   This endpoint is called CROSS-ORIGIN from the customer's own app
   (their domain → www.observanthq.com), so it is fully CORS-enabled
   and answers OPTIONS preflight. It always returns ~200 — the host
   app must never see an error because of feedback collection.

   POST body (JSON):
     {
       type:  "feedback" | "eval" | "exit" | "csat",
       value: string,        // 'open' | 'up'/'down' | reason | '1'..'5'
       note:  string,        // optional free text
       url:   string,        // page the response came from
       user:  string,        // optional opaque caller user ref (no PII required)
       slug:  string,        // program / site identifier
       output_id: string     // optional — which AI output an eval targets
     }

   Persists to `inproduct_feedback` via api/_db.js. Degrades
   gracefully (returns { ok, simulated:true }) when no DB is set.
   ============================================================ */
const db = require("../_db");

const ALLOW = "Access-Control-Allow-Origin";
const TYPES = ["feedback", "eval", "exit", "csat"];

function cors(res) {
  res.setHeader(ALLOW, "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
}

function clip(v, max) {
  if (v == null) return null;
  var s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

module.exports = async function handler(req, res) {
  cors(res);

  // CORS preflight.
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_e) { body = {}; } }
  body = body || {};

  const type = TYPES.includes(body.type) ? body.type : null;
  const slug = clip((body.slug || "").toString().trim().toLowerCase(), 200) || "unknown";
  const value = clip(body.value, 500);
  const note = clip(body.note, 4000);
  const url = clip(body.url, 1000);
  const userRef = clip(body.user, 300);
  const outputId = clip(body.output_id, 300);

  if (!type) { res.status(400).json({ ok: false, error: "invalid type" }); return; }
  // Require *some* signal so we don't store empty rows.
  if (!value && !note) { res.status(400).json({ ok: false, error: "empty response" }); return; }

  const row = {
    slug: slug,
    type: type,
    value: value,
    // Keep the (optional) output id alongside the note so the eval is traceable
    // without needing a schema column for it.
    note: outputId ? "[output:" + outputId + "] " + (note || "") : note,
    url: url,
    user_ref: userRef,
  };

  // No DB configured → accept and move on so the SDK/demo keeps working.
  if (!db.dbConfigured()) {
    res.status(200).json({ ok: true, simulated: true, received: { type: type, slug: slug } });
    return;
  }

  try {
    const saved = await db.insert("inproduct_feedback", row);
    res.status(200).json({ ok: true, id: saved && saved.id });
  } catch (err) {
    // Never block the host app on a backend hiccup — log + soft-succeed.
    console.error("[in-product] persist failed:", err && err.message);
    res.status(200).json({ ok: true, simulated: true, error: err && err.message });
  }
};
