-- Observant — digests + team_alerts (Team updates: weekly digest + urgent alerts)
-- Run in the Supabase SQL editor. Idempotent; safe to re-run.
--
--   digests      — one row per generated weekly digest (api/cron/digest.js writes;
--                  api/selfserve/digest.js reads). Scoped to a workspace.
--   team_alerts  — audit + debounce log for the immediate "urgent insight" emails
--                  (api/selfserve/_alerts.js writes one row per fired alert).
--
-- RUN ORDER: db/schema.sql (or accounts-workspaces.sql) must exist first — this
-- references workspaces + accounts. Falls back to null FKs if those are absent.
--
-- RLS enabled, no policies (anon/authenticated denied; the service-role key used
-- by api/_db.js bypasses RLS, so the serverless functions still read/write).

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- One generated digest per workspace per period.
create table if not exists digests (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  account_id    uuid references accounts(id)   on delete set null,
  period        text,                             -- e.g. "This week" / "Jun 24–Jul 1"
  headline      text,                             -- the single most important thing this week
  stats         jsonb not null default '[]',      -- [{ n, l }] — matches the dashboard's ss-digest-stats
  items         jsonb not null default '[]',      -- string[] — named + quoted + sourced by channel
  created_at    timestamptz not null default now()
);

-- Dashboard/API read path: a workspace's digests, newest first.
create index if not exists digests_workspace_created_idx on digests(workspace_id, created_at desc);

-- Audit + debounce log for urgent alert emails. partner_id is intentionally FK-free
-- (in-product alerts carry no partner; only an opaque user ref), so any inserter
-- can log without a matching partners row.
create table if not exists team_alerts (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  kind          text,                             -- 'csat_low' | 'exit' | 'eval_down' | 'churn_reply'
  partner_id    uuid,                             -- optional; who triggered it (no FK by design)
  detail        text,                             -- short human description (for the audit trail)
  created_at    timestamptz not null default now()
);

-- Debounce read path: recent alerts for a workspace, by kind, newest first.
create index if not exists team_alerts_workspace_created_idx on team_alerts(workspace_id, created_at desc);
create index if not exists team_alerts_workspace_kind_idx     on team_alerts(workspace_id, kind);

-- Enable RLS (no policies → anon/authenticated denied; service-role bypasses).
alter table digests     enable row level security;
alter table team_alerts enable row level security;
