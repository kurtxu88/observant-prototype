/* ============================================================
   Public runtime config for the browser Supabase client.
   Returns the PROJECT URL + the ANON / publishable key — both are
   public by design (the anon key is meant to ship to the browser;
   RLS protects the data). The SERVICE ROLE key is never exposed here.

   Env (set in Vercel):
     SUPABASE_URL        — e.g. https://abcd.supabase.co
     SUPABASE_ANON_KEY   — the anon / publishable key (safe in browser)

   Consumed by app/auth.js → supabase.createClient(url, anonKey).
   No-ops gracefully (empty strings) when unconfigured.
   ============================================================ */
module.exports = function handler(req, res) {
  // Tolerate a pasted base URL with a trailing slash and/or "/rest/v1" suffix.
  const url = (process.env.SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "");
  const anonKey = (process.env.SUPABASE_ANON_KEY || "").trim();

  // Short cache — this rarely changes and every page load hits it.
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ url, anonKey, configured: !!(url && anonKey) });
};
