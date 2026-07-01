-- Observant — insights (the synthesized learnings surface; run in the Supabase SQL editor)
--
-- One row per distilled learning about a workspace's product. Insights are produced
-- from three sources and rolled up per workspace for the builder dashboard:
--   'conversation' — synthesized from partner 1:1 threads
--   'inproduct'    — rolled up from the in-app feedback SDK (inproduct_feedback)
--   'signal'       — derived from other signals (usage, GitHub, etc.)
--
-- RUN ORDER: db/schema.sql → accounts-workspaces.sql → THIS FILE → ownership.sql.
-- Requires the workspaces table (accounts-workspaces.sql) to exist first.
--
-- Idempotent; safe to run standalone and to re-run. RLS enabled, no policies
-- (anon/authenticated denied; service-role bypasses).

create extension if not exists "pgcrypto";   -- gen_random_uuid()

create table if not exists insights (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  title         text,
  detail        text,
  metric        text,
  source        text,                          -- 'conversation' | 'inproduct' | 'signal'
  status        text not null default 'open',  -- 'open' | 'reviewed' | 'archived' (free-form)
  created_at    timestamptz not null default now()
);

-- Dashboard read path: a workspace's insights, newest first.
create index if not exists insights_workspace_created_idx on insights(workspace_id, created_at desc);

-- Filter a workspace's insights by where they came from.
create index if not exists insights_workspace_source_idx on insights(workspace_id, source);

-- Enable RLS (no policies → anon/authenticated denied; service-role bypasses).
alter table insights enable row level security;
