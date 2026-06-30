/* ============================================================
   Minimal Supabase REST (PostgREST) helper — no SDK, fits the
   bare serverless setup (same raw-fetch pattern as interview.js).
   The "_" prefix keeps this out of routing; it's imported by the
   other api/selfserve functions via require("../_db").

   Env required (set in Vercel): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
   The service-role key bypasses RLS — keep it server-side only.
   ============================================================ */
const SB_URL = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function dbConfigured() { return !!(SB_URL && SB_KEY); }

async function sbFetch(path, { method = "GET", body, prefer } = {}) {
  if (!dbConfigured()) {
    const e = new Error("DB not configured — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    e.code = "NO_DB";
    throw e;
  }
  const res = await fetch(SB_URL + "/rest/v1/" + path, {
    method,
    headers: {
      apikey: SB_KEY,
      Authorization: "Bearer " + SB_KEY,
      "Content-Type": "application/json",
      Prefer: prefer || "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_e) { data = text; }
  if (!res.ok) {
    const err = new Error("Supabase " + res.status + ": " + ((data && data.message) || text || "request failed"));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Insert one row, return the inserted row.
async function insert(table, row) {
  const r = await sbFetch(table, { method: "POST", body: row });
  return Array.isArray(r) ? r[0] : r;
}

// Upsert on a conflict target (comma-separated column list), return the row.
async function upsert(table, row, onConflict) {
  const r = await sbFetch(table + (onConflict ? "?on_conflict=" + encodeURIComponent(onConflict) : ""), {
    method: "POST",
    body: row,
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return Array.isArray(r) ? r[0] : r;
}

// Select with a raw PostgREST query, e.g. select("partners", "program_id=eq." + id + "&select=*").
async function select(table, query) {
  return sbFetch(table + (query ? "?" + query : ""));
}

// Patch rows matching a query, e.g. update("partners", "id=eq." + id, { status: "paused" }).
async function update(table, query, patch) {
  return sbFetch(table + (query ? "?" + query : ""), { method: "PATCH", body: patch });
}

module.exports = { dbConfigured, sbFetch, insert, upsert, select, update };
