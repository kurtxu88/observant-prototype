-- Observant — github_installations (Build #11; run in the Supabase SQL editor)
-- Records which GitHub App installation belongs to which account/repo, so the
-- snippet-PR endpoint (api/github/install-pr.js) can mint an installation token
-- for the right install later. Written by api/github/callback.js on the
-- post-install redirect; read by install-pr.js.
--
-- One row per (installation, repo) — a multi-repo install yields several rows.

create extension if not exists "pgcrypto";   -- gen_random_uuid()

create table if not exists github_installations (
  id               uuid primary key default gen_random_uuid(),
  installation_id  text not null,                 -- GitHub App installation id
  account          text,                          -- the org/user login that installed
  repo             text,                           -- "owner/name" (null until a repo is granted)
  created_at       timestamptz not null default now()
);

-- Upsert target used by the callback (on_conflict=installation_id,repo).
-- Plain column index so PostgREST's on_conflict can resolve to it. NULL repos
-- are "distinct" in a unique index, so a not-yet-granted install can recur — the
-- callback only writes a null-repo row when no repo is readable, which is rare.
create unique index if not exists github_installations_inst_repo_idx
  on github_installations(installation_id, repo);

-- Lookup path install-pr.js uses ("most recent for this installation / repo").
create index if not exists github_installations_installation_idx
  on github_installations(installation_id);

-- Enable RLS (no policies → anon/authenticated denied; service-role bypasses).
alter table github_installations enable row level security;
