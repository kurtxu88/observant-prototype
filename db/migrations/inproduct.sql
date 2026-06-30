-- Observant — inproduct_feedback (in-app SDK ingest; run in the Supabase SQL editor)
-- Stores every response collected by the in-product feedback SDK (snippet.js)
-- and written by api/selfserve/in-product.js. One row per response across all
-- four surfaces: unsolicited feedback, AI/output evals, exit survey, and CSAT.
--
-- Idempotent; safe to re-run.

create extension if not exists "pgcrypto";   -- gen_random_uuid()

create table if not exists inproduct_feedback (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,                  -- program / site identifier (from the snippet's data-slug)
  type        text not null,                  -- 'feedback' | 'eval' | 'exit' | 'csat'
  value       text,                           -- 'open' | 'up'/'down' | exit reason | '1'..'5'
  note        text,                           -- optional free-text (eval notes are prefixed "[output:<id>]")
  url         text,                           -- page the response came from
  user_ref    text,                           -- optional opaque caller-supplied user ref (no PII required)
  created_at  timestamptz not null default now()
);

-- Per-program reads, newest first ("show me this site's recent feedback").
create index if not exists inproduct_feedback_slug_created_idx
  on inproduct_feedback(slug, created_at desc);

-- Filter a program's stream by surface (e.g. just the CSAT scores).
create index if not exists inproduct_feedback_slug_type_idx
  on inproduct_feedback(slug, type);

-- Enable RLS (no policies → anon/authenticated denied; the service-role key
-- used by api/_db.js bypasses RLS, so the ingest endpoint still writes).
alter table inproduct_feedback enable row level security;
