# Observant GitHub App — install → callback → open snippet PR

The real version of the in-product `SnippetSetup` flow. The user installs the
Observant GitHub App on one repo (read + PR scope); Observant then opens a single
pull request adding one snippet line. No clone, no codebase scan.

```
user clicks Install
  → GitHub install screen (pick ONE repo)
  → GitHub redirects to  /api/github/callback?installation_id=…&setup_action=install
  → callback.js persists the installation in `github_installations`, redirects to /setup
  → UI calls  POST /api/github/install-pr  { installationId, owner, repo }
  → install-pr.js opens the PR, returns { ok, prUrl }
```

Everything degrades gracefully with no env set: endpoints return a clear
`{ ok:false, code:"NO_GH" | "NOT_INSTALLED" }` and never crash, so the deployed
build stays green until the App exists.

## Endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/github/callback` | GET | Post-install redirect target. Persists the installation, then 302 → `/setup?gh=installed&installation_id=…` (or JSON with `Accept: application/json`). |
| `/api/github/install-pr` | POST | `{ installationId, owner, repo, snippet? }` → opens the PR, returns `{ ok, prUrl, branch, path }`. owner/repo fall back to the persisted installation. |
| `api/github/_app.js` | — | Helper (not routed): App JWT (RS256) + installation token + REST/Git-Data wrappers. `crypto` only, no SDK. |

## 1. Create the GitHub App (one time, Xuan)

GitHub → **Settings → Developer settings → GitHub Apps → New GitHub App**

- **Name:** Observant
- **Homepage URL:** `https://observant-prototype.vercel.app`
- **Callback URL:** `https://observant-prototype.vercel.app/api/github/callback`
  - check **Request user authorization (OAuth) during installation** is OFF (we use the install redirect, not OAuth)
- **Setup URL (after install):** `https://observant-prototype.vercel.app/api/github/callback`
  - check **Redirect on update** ON
- **Webhook:** can be left **Active OFF** for now (no webhook handler in this build). If you turn it on, set a secret and put it in `GITHUB_APP_WEBHOOK_SECRET`.
- **Repository permissions:**
  - **Contents: Read & write** (create the branch + commit the file)
  - **Pull requests: Read & write** (open the PR)
  - (everything else: No access)
- **Where can this app be installed:** Any account (or Only this account for testing).

Then:
- **Generate a private key** → downloads a `.pem`. You'll paste its full contents into Vercel.
- Note the **App ID** (top of the App's General page) and the **Client ID**.
- The public install URL is `https://github.com/apps/<your-app-slug>/installations/new`
  (the slug is the App name slugified — shown on the App page as "Public link").

## 2. Set Vercel env vars

Project → Settings → Environment Variables (Production + Preview):

| Var | Value |
|---|---|
| `GITHUB_APP_ID` | the numeric App ID |
| `GITHUB_APP_PRIVATE_KEY` | the **entire** `.pem` contents, including the `-----BEGIN/END-----` lines. Paste as-is (real newlines) or with `\n`-escaped newlines — `_app.js` handles both. |
| `GITHUB_APP_CLIENT_ID` | the App's Client ID (reserved; not required by this build) |
| `GITHUB_APP_WEBHOOK_SECRET` | only if you enabled webhooks (reserved; not used yet) |
| `GITHUB_APP_SLUG` | the app slug, for building the install URL in the UI (optional) |

(Supabase env — `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — already set; the
installation is persisted via the same `api/_db.js` client.)

## 3. Run the migration

In the Supabase SQL editor, run `db/migrations/github.sql` (creates
`github_installations` + RLS). Service-role (used server-side) bypasses RLS.

## 4. Verify

- Before the App exists: `POST /api/github/install-pr` → `{ ok:false, code:"NO_GH" }` (green build, no crash).
- After install: GitHub redirects to `/api/github/callback`, a row lands in
  `github_installations`, and `POST /api/github/install-pr { installationId, owner, repo }`
  returns `{ ok:true, prUrl }` pointing at the opened PR.

## Notes

- The snippet line defaults to
  `<script async src="https://observant-prototype.vercel.app/snippet.js" data-observant></script>`
  — pass `snippet` in the POST body to override.
- install-pr appends to an obvious entry file if present
  (`index.html`, `app/layout.tsx`, `README.md`, …); otherwise it creates
  `observant-snippet.html`. It skips files that already contain `data-observant`,
  and reuses the branch/PR if run twice (idempotent).
