/* ============================================================
   Observant — read the latest weekly DIGEST for a workspace.
   ------------------------------------------------------------
   The dashboard's "Weekly digest" panel fetches this (front end wired
   separately). Two ways to say which workspace:

     • ?slug=<program slug>         — public-ish lookup by product slug
     • Authorization: Bearer <tok>  — the signed-in account's most-recent
                                       workspace (verified like workspace.js
                                       / partner-portal.js)

   Returns { ok:true, digest:{ period, headline, stats, items, created_at } }
   or a graceful { ok:true, digest:null } when there's nothing yet / no DB.
   Bare-serverless; never throws to the client.
   ============================================================ */
const db = require("../_db");

const SB_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
const SB_APIKEY = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (!["GET", "POST"].includes(req.method)) { res.status(405).json({ ok: false, error: "GET or POST only" }); return; }

  try {
    // No DB → nothing stored yet; the panel falls back to its sample.
    if (!db.dbConfigured()) { res.status(200).json({ ok: true, digest: null, simulated: true }); return; }

    const q = queryParams(req);
    const body = req.method === "POST" ? await readJson(req) : {};
    const slug = String((body && body.slug) || q.slug || "").trim().toLowerCase();

    let workspaceId = null;
    if (slug) {
      workspaceId = await workspaceIdBySlug(slug);
    } else {
      // Fall back to the signed-in account's most-recent workspace.
      const authHeader = req.headers.authorization || req.headers.Authorization || "";
      const token = String(authHeader).replace(/^Bearer\s+/i, "").trim();
      const user = await verifyToken(token);
      if (user) workspaceId = await workspaceIdByAccount(user.id);
    }

    if (!workspaceId) { res.status(200).json({ ok: true, digest: null }); return; }

    const rows = await db.select(
      "digests",
      "workspace_id=eq." + encodeURIComponent(workspaceId) +
        "&select=period,headline,stats,items,created_at&order=created_at.desc&limit=1"
    );
    const row = Array.isArray(rows) && rows[0];
    if (!row) { res.status(200).json({ ok: true, digest: null }); return; }

    res.status(200).json({
      ok: true,
      digest: {
        period: row.period || "This week",
        headline: row.headline || "",
        stats: Array.isArray(row.stats) ? row.stats : [],
        items: Array.isArray(row.items) ? row.items : [],
        created_at: row.created_at,
      },
    });
  } catch (err) {
    // Never crash the panel — soft-succeed with an empty digest.
    console.error("[digest] read failed:", err && err.message);
    res.status(200).json({ ok: true, digest: null, error: err && err.message });
  }
};

async function workspaceIdBySlug(slug) {
  try {
    const rows = await db.select("workspaces", "slug=eq." + encodeURIComponent(slug) + "&select=id&order=created_at.asc&limit=1");
    const ws = Array.isArray(rows) && rows[0];
    return ws ? ws.id : null;
  } catch (_e) { return null; }
}

async function workspaceIdByAccount(authUserId) {
  try {
    const accts = await db.select("accounts", "auth_user_id=eq." + encodeURIComponent(authUserId) + "&select=id&limit=1");
    const acct = Array.isArray(accts) && accts[0];
    if (!acct) return null;
    const rows = await db.select("workspaces", "account_id=eq." + encodeURIComponent(acct.id) + "&select=id&order=updated_at.desc&limit=1");
    const ws = Array.isArray(rows) && rows[0];
    return ws ? ws.id : null;
  } catch (_e) { return null; }
}

// Verify a Supabase access token → { id, ... } or null (same pattern as workspace.js).
async function verifyToken(token) {
  if (!token || !SB_URL || !SB_APIKEY) return null;
  try {
    const res = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_APIKEY, Authorization: "Bearer " + token } });
    if (!res.ok) return null;
    const u = await res.json();
    return u && u.id ? u : null;
  } catch (_e) { return null; }
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function queryParams(req) {
  try { const u = new URL(req.url, "http://x"); const o = {}; u.searchParams.forEach((v, k) => { o[k] = v; }); return o; }
  catch (_e) { return {}; }
}
async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("Payload too large"); }
  return b ? JSON.parse(b) : {};
}
