/* ============================================================
   Observant — GitHub App auth + tiny REST helpers (Build #11).
   No SDK: Node `crypto` only + raw fetch, same bare-serverless
   style as api/_db.js. The "_" prefix keeps this OUT of routing;
   it's imported by callback.js / install-pr.js via require("./_app").

   What it does:
     1. mint an App JWT (RS256, signed with GITHUB_APP_PRIVATE_KEY,
        iss = GITHUB_APP_ID)
     2. exchange that JWT for an INSTALLATION access token
        (POST /app/installations/<id>/access_tokens)
     3. small wrappers for the few GitHub REST + Git-Data calls
        install-pr.js needs (get ref, get repo, create ref, create
        blob/commit, create/update file contents, open PR)

   Env required (set in Vercel):
     GITHUB_APP_ID            — numeric App ID
     GITHUB_APP_PRIVATE_KEY   — the App's PEM private key. Paste the
        whole "-----BEGIN ...-----" block; \n-escaped newlines OK.
   Optional (used elsewhere):
     GITHUB_APP_CLIENT_ID, GITHUB_APP_WEBHOOK_SECRET, GITHUB_APP_SLUG

   Throws a clean { code:"NO_GH" } error when unconfigured — callers
   catch it and answer a "not configured" JSON, never crash.
   ============================================================ */
const crypto = require("crypto");

const API = "https://api.github.com";
const UA = "observant-github-app";

const APP_ID = String(process.env.GITHUB_APP_ID || "").trim();
// Vercel env values often arrive with literal "\n" instead of real newlines.
const PRIVATE_KEY = String(process.env.GITHUB_APP_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();

function appConfigured() { return !!(APP_ID && PRIVATE_KEY); }

function notConfigured() {
  const e = new Error("GitHub App not configured — set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY");
  e.code = "NO_GH";
  return e;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/* ---- 1. App JWT (RS256) ---- */
function mintAppJwt() {
  if (!appConfigured()) throw notConfigured();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  // iat backdated 60s for clock skew; exp 8min ahead → total span < GitHub's 10min cap.
  const payload = { iat: now - 60, exp: now + 8 * 60, iss: APP_ID };
  const signingInput = b64url(JSON.stringify(header)) + "." + b64url(JSON.stringify(payload));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = b64url(signer.sign(PRIVATE_KEY));
  return signingInput + "." + signature;
}

/* ---- raw GitHub fetch with a given bearer (jwt or install token) ---- */
async function ghFetch(token, path, { method = "GET", body, accept } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      Accept: accept || "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": UA,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_e) { data = text; }
  if (!res.ok) {
    const err = new Error("GitHub " + res.status + ": " + ((data && data.message) || text || "request failed"));
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ---- 2. installation access token ---- */
// Exchange the App JWT for a short-lived installation token. Optionally scope
// it to one repo (repositories:[repo]) + minimal permissions.
async function installationToken(installationId, opts = {}) {
  if (!appConfigured()) throw notConfigured();
  if (!installationId) throw new Error("installationId required");
  const jwt = mintAppJwt();
  const body = {};
  if (opts.repositories) body.repositories = opts.repositories;
  if (opts.permissions) body.permissions = opts.permissions;
  const data = await ghFetch(jwt, "/app/installations/" + encodeURIComponent(installationId) + "/access_tokens", {
    method: "POST",
    body: Object.keys(body).length ? body : undefined,
  });
  return (data && data.token) || "";
}

// List the repos an installation can see (handy for the callback to record
// which repo was granted). Returns [] on any soft failure.
async function listInstallationRepos(installationId) {
  try {
    const token = await installationToken(installationId);
    const data = await ghFetch(token, "/installation/repositories?per_page=100");
    return (data && data.repositories) || [];
  } catch (_e) { return []; }
}

/* ---- 3. Git-Data / contents helpers (all take an install token) ---- */
async function getRepo(token, owner, repo) {
  return ghFetch(token, "/repos/" + owner + "/" + repo);
}
async function getRef(token, owner, repo, ref) {
  // ref like "heads/main"
  return ghFetch(token, "/repos/" + owner + "/" + repo + "/git/ref/" + ref);
}
async function createRef(token, owner, repo, ref, sha) {
  // ref MUST be the full "refs/heads/<branch>"
  return ghFetch(token, "/repos/" + owner + "/" + repo + "/git/refs", {
    method: "POST",
    body: { ref, sha },
  });
}
// Read a file (base64) on a branch; returns null if it doesn't exist.
async function getContent(token, owner, repo, path, ref) {
  try {
    return await ghFetch(token, "/repos/" + owner + "/" + repo + "/contents/" + encodeURIComponent(path) + (ref ? "?ref=" + encodeURIComponent(ref) : ""));
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}
// Create OR update a file via the contents API (handles the blob+commit for us).
async function putContent(token, owner, repo, path, { message, content, branch, sha }) {
  const body = { message, content: Buffer.from(content, "utf8").toString("base64"), branch };
  if (sha) body.sha = sha;   // updating an existing file requires its blob sha
  return ghFetch(token, "/repos/" + owner + "/" + repo + "/contents/" + encodeURIComponent(path), {
    method: "PUT",
    body,
  });
}
async function createPull(token, owner, repo, { title, head, base, body }) {
  return ghFetch(token, "/repos/" + owner + "/" + repo + "/pulls", {
    method: "POST",
    body: { title, head, base, body },
  });
}

module.exports = {
  appConfigured,
  mintAppJwt,
  installationToken,
  listInstallationRepos,
  ghFetch,
  getRepo,
  getRef,
  createRef,
  getContent,
  putContent,
  createPull,
};
