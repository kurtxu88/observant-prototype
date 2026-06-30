/* ============================================================
   Observant — GitHub App post-install callback (Build #11).
   GitHub redirects the user HERE after they install the Observant
   App on a repo:
     /api/github/callback?installation_id=123&setup_action=install

   What it does:
     1. read installation_id (+ setup_action) from the query
     2. resolve which account/repo was granted (via an install token)
     3. persist the installation into `github_installations`
        (db/migrations/github.sql) so install-pr.js can find it later
     4. redirect the user back to /setup (browser) — or answer JSON
        if hit programmatically (Accept: application/json)

   Degrades gracefully: with no GitHub env it still redirects/answers;
   with no DB it skips the persist but still completes the redirect.
   Always answers (never crashes) so the install flow never dead-ends.
   ============================================================ */
const app = require("./_app");
const db = require("../_db");

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const installationId = String(q.installation_id || q.installationId || "").trim();
  const setupAction = String(q.setup_action || "").trim();
  const wantsJson = String(req.headers["accept"] || "").includes("application/json") || String(q.format || "") === "json";

  // setup_action can be "install" | "update" | "request"; only persist real installs.
  try {
    if (installationId && app.appConfigured() && db.dbConfigured() && setupAction !== "request") {
      const repos = await app.listInstallationRepos(installationId);
      const first = repos[0] || null;
      const account = first && first.owner ? first.owner.login : (q.account || null);

      if (repos.length) {
        // One row per (installation, repo) so a multi-repo install is captured.
        for (const r of repos) {
          await safeUpsert({
            installation_id: installationId,
            account: r.owner ? r.owner.login : account,
            repo: r.full_name || (r.owner ? r.owner.login + "/" + r.name : r.name) || null,
          });
        }
      } else {
        // No repo readable yet (perms/propagation) — still record the installation.
        await safeUpsert({ installation_id: installationId, account, repo: null });
      }
    }
  } catch (error) {
    console.error("[github/callback] persist failed:", error && error.message);
    // fall through — never block the redirect on a persist hiccup
  }

  if (wantsJson) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      ok: true,
      installationId: installationId || null,
      setupAction: setupAction || null,
      configured: app.appConfigured(),
      persisted: !!(installationId && db.dbConfigured()),
    });
  }

  // Browser path: bounce back to setup, carrying the installation id so the UI
  // can immediately offer "Open the snippet PR".
  const dest = "/setup?gh=installed" + (installationId ? "&installation_id=" + encodeURIComponent(installationId) : "");
  res.statusCode = 302;
  res.setHeader("Location", dest);
  res.setHeader("Cache-Control", "no-store");
  return res.end();
};

// Upsert keyed on (installation_id, repo); tolerate a missing unique index by
// falling back to a plain insert.
async function safeUpsert(row) {
  try {
    await db.upsert("github_installations", row, "installation_id,repo");
  } catch (_e) {
    try { await db.insert("github_installations", row); } catch (e2) {
      console.error("[github/callback] upsert+insert failed:", e2 && e2.message);
    }
  }
}
