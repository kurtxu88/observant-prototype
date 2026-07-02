/* ============================================================
   Observant — one-click opt-out for feedback partners.
   Every user-facing email footer links here. A GET (the clicked
   link) flips the partner's status to 'opted_out' so they stop
   getting messages, then returns a simple confirmation page.

     GET /api/selfserve/opt-out?p=<partnerId>
     GET /api/selfserve/opt-out?c=<contact>[&product=<name|slug>]

   Prefers the partner id (?p=); tolerates ?c=<contact> (+ optional
   ?product / ?slug to narrow to one program). Degrades gracefully
   without a DB — it still shows the confirmation page, so the link
   never dead-ends. Bare-serverless: never throws.
   ============================================================ */
const db = require("../_db");

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }

  const q = getParams(req);
  const partnerId = String(q.p || "").trim();
  const contact = String(q.c || q.contact || "").trim();
  const product = String(q.product || q.slug || "").trim();

  try {
    if (db.dbConfigured()) {
      if (partnerId) {
        await db.update("partners", "id=eq." + encodeURIComponent(partnerId), { status: "opted_out" });
      } else if (contact) {
        // Resolve by contact across ALL channels — a Telegram partner's contact
        // is their chat_id, so hard-filtering channel=email would leave them
        // unable to opt out. Match the identity given, whatever the channel.
        let query = "contact=eq." + encodeURIComponent(contact);
        const programId = product ? await resolveProgramId(product) : null;
        if (programId) query += "&program_id=eq." + programId;
        await db.update("partners", query, { status: "opted_out" });
      }
    }
  } catch (e) {
    // Never dead-end the link — log and still confirm.
    console.error("[opt-out] update failed:", e && e.message);
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(confirmationHtml(product));
};

// Resolve a program id from a slug or product name so a contact-based opt-out
// only touches the right program. Best-effort: null if no DB / no match.
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

function getParams(req) {
  if (req.query && typeof req.query === "object") return req.query;
  try {
    const u = new URL(req.url, "http://" + (req.headers && req.headers.host || "localhost"));
    return Object.fromEntries(u.searchParams.entries());
  } catch (_e) { return {}; }
}

function confirmationHtml(product) {
  const name = esc(product) || "";
  const scope = name ? name + " feedback" : "these feedback messages";
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Opted out</title></head>' +
    '<body style="margin:0;background:#f7f3ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#24221e">' +
    '<div style="max-width:460px;margin:12vh auto;padding:32px 28px;background:#fff;border:1px solid #e6ddcb;border-radius:14px">' +
    '<p style="margin:0 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#8a857c">Observant</p>' +
    '<h1 style="margin:0 0 12px;font-size:20px;font-weight:600">You\'ve opted out of ' + scope + '.</h1>' +
    '<p style="margin:0 0 14px;font-size:15px;line-height:1.6">You won\'t get more messages.</p>' +
    '<p style="margin:0;font-size:14px;line-height:1.6;color:#5a5347">Changed your mind? Just reply to any email and we\'ll pick the thread back up.</p>' +
    '</div></body></html>';
}

function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
