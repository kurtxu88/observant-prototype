/* ============================================================
   Observant — open the snippet PR (Build #11).
   The REAL version of what the in-product SnippetSetup flow fakes:
   using an INSTALLATION token, open ONE pull request on the user's
   repo that adds the Observant feedback snippet — no clone, no
   codebase scan.

   POST { installationId, owner, repo, snippet? }
     -> { ok:true, prUrl, branch }            (PR opened / already open)
     -> { ok:false, error, code }             (not configured / not installed / failed)

   Flow (contents API, no manual blob/tree juggling):
     1. resolve owner/repo (from body, else the persisted installation)
     2. mint an installation token scoped to that repo
     3. read the default branch + its head sha
     4. create a branch  observant/add-snippet
     5. append the snippet to an obvious entry file if present
        (README.md / index.html / app/layout.tsx ...), else create
        observant-snippet.html with the line
     6. open a PR "Add Observant feedback snippet"

   Degrades gracefully:
     - no GitHub env  -> { ok:false, code:"NO_GH" }   200
     - no installation -> { ok:false, code:"NOT_INSTALLED" } 200
   Never throws to the platform.
   ============================================================ */
const app = require("./_app");
const db = require("../_db");

const BRANCH = "observant/add-snippet";
const PR_TITLE = "Add Observant feedback snippet";

// The one line we add. Override per-request via body.snippet.
const DEFAULT_SNIPPET = '<script async src="https://observant-prototype.vercel.app/snippet.js" data-observant></script>';

// Where we'll try to append the snippet, in priority order. First match wins.
const ENTRY_CANDIDATES = [
  "index.html", "public/index.html", "app/layout.tsx", "app/layout.jsx",
  "src/app/layout.tsx", "pages/_document.tsx", "pages/_app.tsx", "README.md",
];

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = await readJson(req);
    let { installationId, owner, repo } = body || {};
    const snippet = String((body && body.snippet) || DEFAULT_SNIPPET).trim();

    if (!app.appConfigured()) {
      return res.status(200).json({ ok: false, code: "NO_GH", error: "GitHub App not configured (set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY)" });
    }

    // Fill missing owner/repo/installationId from the persisted installation.
    if ((!owner || !repo || !installationId) && db.dbConfigured()) {
      const inst = await lookupInstallation({ installationId, owner, repo });
      if (inst) {
        installationId = installationId || inst.installation_id;
        if ((!owner || !repo) && inst.repo && inst.repo.includes("/")) {
          const parts = inst.repo.split("/");
          owner = owner || parts[0];
          repo = repo || parts[1];
        }
        owner = owner || inst.account;
      }
    }

    if (!installationId) return res.status(200).json({ ok: false, code: "NOT_INSTALLED", error: "No installation found — install the Observant GitHub App first" });
    if (!owner || !repo) return res.status(200).json({ ok: false, code: "NO_REPO", error: "owner + repo required (none persisted for this installation)" });

    const token = await app.installationToken(installationId, { repositories: [repo] });
    if (!token) return res.status(200).json({ ok: false, code: "NO_TOKEN", error: "could not mint installation token" });

    // 3. default branch + head sha
    const repoInfo = await app.getRepo(token, owner, repo);
    const baseBranch = (repoInfo && repoInfo.default_branch) || "main";
    const baseRef = await app.getRef(token, owner, repo, "heads/" + baseBranch);
    const headSha = baseRef && baseRef.object && baseRef.object.sha;
    if (!headSha) return res.status(200).json({ ok: false, code: "NO_BASE", error: "could not read default branch head" });

    // 4. branch (idempotent — ignore "already exists")
    try {
      await app.createRef(token, owner, repo, "refs/heads/" + BRANCH, headSha);
    } catch (e) {
      if (e.status !== 422) throw e;   // 422 = ref exists; reuse it
    }

    // 5. write the snippet — append to an entry file if one exists, else new file
    const target = await pickTarget(token, owner, repo, baseBranch);
    let path, newContent, existingSha = null, action;
    if (target) {
      path = target.path;
      existingSha = target.sha;
      action = "append";
      const sep = target.text.endsWith("\n") ? "" : "\n";
      newContent = target.text + sep + observantBlock(snippet, target.path);
    } else {
      path = "observant-snippet.html";
      action = "create";
      newContent = observantBlock(snippet, path) + "\n";
    }
    await app.putContent(token, owner, repo, path, {
      message: "Add Observant feedback snippet",
      content: newContent,
      branch: BRANCH,
      sha: existingSha || undefined,
    });

    // 6. open the PR (idempotent — reuse the open one if it already exists)
    let pr;
    try {
      pr = await app.createPull(token, owner, repo, {
        title: PR_TITLE,
        head: BRANCH,
        base: baseBranch,
        body: prBody(snippet, path),
      });
    } catch (e) {
      const msg = (e.data && JSON.stringify(e.data)) || e.message || "";
      if (e.status === 422 && /already exists|pull request/i.test(msg)) {
        pr = await findOpenPr(token, owner, repo);
      } else { throw e; }
    }

    const prUrl = (pr && pr.html_url) || null;
    return res.status(200).json({ ok: true, prUrl, branch: BRANCH, path, action });
  } catch (error) {
    console.error("[github/install-pr] failed:", error && error.message);
    return res.status(200).json({ ok: false, code: error.code || "FAILED", error: String((error && error.message) || error) });
  }
};

// Find the persisted installation by id, owner/repo, or just the most recent.
async function lookupInstallation({ installationId, owner, repo }) {
  try {
    let q = "select=installation_id,account,repo,created_at&order=created_at.desc&limit=1";
    if (installationId) q = "installation_id=eq." + encodeURIComponent(installationId) + "&" + q;
    else if (owner && repo) q = "repo=eq." + encodeURIComponent(owner + "/" + repo) + "&" + q;
    const rows = await db.select("github_installations", q);
    return (Array.isArray(rows) && rows[0]) || null;
  } catch (_e) { return null; }
}

// First existing entry file we can append to; null = none → create a new file.
async function pickTarget(token, owner, repo, branch) {
  for (const path of ENTRY_CANDIDATES) {
    const c = await app.getContent(token, owner, repo, path, branch);
    if (c && c.content && c.type === "file") {
      const text = Buffer.from(c.content, "base64").toString("utf8");
      if (text.includes("data-observant")) continue;   // already added — skip
      return { path, sha: c.sha, text };
    }
  }
  return null;
}

async function findOpenPr(token, owner, repo) {
  try {
    const list = await app.ghFetch(token, "/repos/" + owner + "/" + repo + "/pulls?state=open&head=" + encodeURIComponent(owner + ":" + BRANCH));
    return (Array.isArray(list) && list[0]) || null;
  } catch (_e) { return null; }
}

// The snippet, wrapped so it reads clearly in whatever file it lands in.
function observantBlock(snippet, path) {
  if (/\.(md|markdown)$/i.test(path)) {
    return "\n<!-- Observant feedback snippet -->\n```html\n" + snippet + "\n```\n";
  }
  return "<!-- Observant feedback snippet -->\n" + snippet;
}

function prBody(snippet, path) {
  return [
    "This PR adds the Observant feedback snippet so Observant can run continuous 1:1s with your users.",
    "",
    "**File:** `" + path + "`",
    "",
    "```html",
    snippet,
    "```",
    "",
    "Merge to go live. Nothing else changes — it's one line.",
    "",
    "— opened automatically by the Observant GitHub App",
  ].join("\n");
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body || "{}"); } catch (_e) { return {}; } }
  let b = ""; for await (const c of req) { b += c; if (b.length > 100000) break; }
  try { return JSON.parse(b || "{}"); } catch (_e) { return {}; }
}
