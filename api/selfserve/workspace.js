/* ============================================================
   Account-keyed workspace persistence (#) — the builder's product
   info + full self-serve state, stored server-side keyed to their
   Supabase account so the SAME workspace loads on ANY browser
   (fixes "incognito = re-onboard": localStorage is per-browser).

   Called by app/selfserve.jsx after the sign-in gate passes.

   Auth: the browser passes the Supabase access token as a Bearer
   header. We verify it against Supabase's own /auth/v1/user (with
   the anon key) to recover the trusted { id, email } — that id is
   the account key. No/invalid token → 401. A signed-in user can
   thus only ever read/write THEIR OWN workspace.

   Schema (created separately):
     accounts(id, auth_user_id UNIQUE, email, name, created_at)
     workspaces(id, account_id→accounts, slug, product_name,
                product_description, config jsonb, state jsonb,
                updated_at, unique(account_id,slug))

   Actions (POST body, or GET = load):
     { action:"save", state, product, slug } → upsert account +
        workspace, returns { ok, workspaceId }
     { action:"load" }                       → most-recent workspace,
        returns { ok, workspace:{ slug, product_name, state, ... } }
        or { ok, workspace:null }

   Degrades gracefully: no DB / no Supabase env → { ok:true,
   simulated:true } and the app falls back to localStorage. Never
   crashes.
   ============================================================ */
const db = require("../_db");

const SB_URL = (process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
// Prefer the anon key for token verification; fall back to service role.
const SB_APIKEY = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

// Verify a Supabase access token → returns { id, email, ... } or null.
async function verifyToken(token) {
  if (!token || !SB_URL || !SB_APIKEY) return null;
  try {
    const res = await fetch(SB_URL + "/auth/v1/user", {
      headers: { apikey: SB_APIKEY, Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return u && u.id ? u : null;
  } catch (_e) {
    return null;
  }
}

function readBody(req) {
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_e) { body = {}; } }
  return body || {};
}

module.exports = async function handler(req, res) {
  // No DB / no Supabase env → simulated, so the app falls back to localStorage.
  if (!db.dbConfigured() || !SB_URL || !SB_APIKEY) {
    res.status(200).json({ ok: true, simulated: true, workspace: null });
    return;
  }

  // Recover + verify the bearer token — this is how we know which account.
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const user = await verifyToken(token);
  if (!user) { res.status(401).json({ error: "not authenticated" }); return; }

  const body = readBody(req);
  const action = String(body.action || (req.method === "GET" ? "load" : "")).toLowerCase();

  try {
    // --- resolve (upsert) the account keyed to the verified auth user ---
    async function resolveAccount(forWrite) {
      if (forWrite) {
        const row = await db.upsert(
          "accounts",
          {
            auth_user_id: user.id,
            email: String(user.email || "").trim().toLowerCase() || null,
            name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || null,
          },
          "auth_user_id"
        );
        return row || null;
      }
      const rows = await db.select("accounts", "auth_user_id=eq." + encodeURIComponent(user.id) + "&select=id&limit=1");
      return rows && rows.length ? rows[0] : null;
    }

    if (action === "save") {
      const account = await resolveAccount(true);
      if (!account || !account.id) { res.status(500).json({ error: "account upsert failed" }); return; }

      const product = body.product || {};
      const slug = String(body.slug || "").trim() || "default";
      const row = await db.upsert(
        "workspaces",
        {
          account_id: account.id,
          slug,
          product_name: (product.name || "").toString().trim() || null,
          product_description: (product.description || "").toString().trim() || null,
          state: body.state || null,
          updated_at: new Date().toISOString(),
        },
        "account_id,slug"
      );
      res.status(200).json({ ok: true, workspaceId: row ? row.id : null });
      return;
    }

    // --- load (default): most-recent workspace for this account ---
    const account = await resolveAccount(false);
    if (!account || !account.id) { res.status(200).json({ ok: true, workspace: null }); return; }

    const rows = await db.select(
      "workspaces",
      "account_id=eq." + encodeURIComponent(account.id) +
        "&select=slug,product_name,product_description,state,updated_at" +
        "&order=updated_at.desc&limit=1"
    );
    const workspace = rows && rows.length ? rows[0] : null;
    res.status(200).json({ ok: true, workspace });
  } catch (err) {
    console.error("[selfserve/workspace] failed:", err && err.message);
    res.status(500).json({ error: err && err.message });
  }
};
