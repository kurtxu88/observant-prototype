/* ============================================================
   Observant — insights persistence (the synthesized-learnings
   surface for the builder dashboard). One row per distilled
   learning about a workspace's product, scoped by workspace.

   POST { action:"add", slug, title, detail?, metric?, source? }
        → resolve workspace by slug → insert an `insights` row.
   GET/POST { action:"list", slug }
        → the workspace's insights, most recent first.

   Bare-serverless (api/_db.js). Degrades gracefully with no DB
   ({ ok:true, simulated:true }) and never crashes the caller.
   ============================================================ */
const db = require("../_db");

const SOURCES = ["conversation", "inproduct", "signal"];

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (!["GET", "POST"].includes(req.method)) { res.status(405).json({ ok: false, error: "GET or POST only" }); return; }

  try {
    let body = req.method === "POST" ? await readJson(req) : {};
    body = body || {};
    // Allow query params too (so a GET ?action=list&slug=... works).
    const q = queryParams(req);
    const action = String(body.action || q.action || "list").trim().toLowerCase();
    const slug = String(body.slug || q.slug || "").trim().toLowerCase();

    if (!slug) { res.status(400).json({ ok: false, error: "missing slug" }); return; }

    // No DB → succeed as a no-op so the dashboard/demo keeps working.
    if (!db.dbConfigured()) {
      res.status(200).json({ ok: true, simulated: true, insights: action === "list" ? [] : undefined });
      return;
    }

    if (action === "add") {
      const title = clip(body.title, 300);
      const detail = clip(body.detail, 4000);
      const metric = clip(body.metric, 300);
      const source = SOURCES.includes(body.source) ? body.source : null;
      if (!title && !detail) { res.status(400).json({ ok: false, error: "title or detail required" }); return; }

      const owner = await resolveWorkspaceId(slug);
      const row = { title: title, detail: detail, metric: metric, source: source };
      if (owner) row.workspace_id = owner;
      const saved = await db.insert("insights", row);
      res.status(200).json({ ok: true, id: saved && saved.id, insight: saved });
      return;
    }

    // list (default): the workspace's insights, newest first.
    const wsId = await resolveWorkspaceId(slug);
    if (!wsId) { res.status(200).json({ ok: true, insights: [] }); return; }
    const rows = await db.select("insights", "workspace_id=eq." + encodeURIComponent(wsId) + "&select=*&order=created_at.desc");
    res.status(200).json({ ok: true, insights: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    // Never crash the caller — soft-succeed.
    console.error("[insights] failed:", err && err.message);
    res.status(200).json({ ok: true, simulated: true, error: err && err.message });
  }
};

// Resolve the owning workspace id by slug. Returns null if the workspaces table
// is absent (migration not run) or no workspace matches. Never throws.
async function resolveWorkspaceId(slug) {
  try {
    if (!db.dbConfigured() || !slug) return null;
    const rows = await db.select("workspaces", "slug=eq." + encodeURIComponent(slug) + "&select=id&order=created_at.asc&limit=1");
    const ws = Array.isArray(rows) && rows[0];
    return ws ? ws.id : null;
  } catch (e) { return null; }
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function clip(v, max) { if (v == null) return null; const s = String(v); return s.length > max ? s.slice(0, max) : s; }
function queryParams(req) {
  try {
    const u = new URL(req.url, "http://x");
    const o = {};
    u.searchParams.forEach((v, k) => { o[k] = v; });
    return o;
  } catch (e) { return {}; }
}
async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? (JSON.parse(req.body || "{}")) : req.body;
  let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("Payload too large"); }
  return b ? JSON.parse(b) : {};
}
