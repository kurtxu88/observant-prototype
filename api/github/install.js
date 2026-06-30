/* ============================================================
   Observant — GitHub App install redirect (#11).
   The in-product "Connect GitHub" button links here; we 302 to the
   App's public install page. After the user installs it on a repo,
   GitHub redirects to the App's configured callback URL
   (/api/github/callback), which lands them back on /setup.
   Keeps the App slug server-side (env), so the front-end just links
   to /api/github/install.
   ============================================================ */
module.exports = async function handler(req, res) {
  const slug = String(process.env.GITHUB_APP_SLUG || "observanthq").trim();
  if (!slug) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ ok: false, error: "GITHUB_APP_SLUG not set — add it in Vercel to enable the install button." }));
  }
  res.statusCode = 302;
  res.setHeader("Location", "https://github.com/apps/" + encodeURIComponent(slug) + "/installations/new");
  res.end();
};
