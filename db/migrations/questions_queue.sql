-- Observant — questions_queue (follow-up migration; run in the Supabase SQL editor)
-- The per-person / per-program backlog of team questions the cadence scheduler
-- (api/cron/cadence.js) drains one-at-a-time, paced to each partner's cadence.
-- This is the queue C6 (the multi-question weaver) reads from: a person has ONE
-- thread, new team questions join it, and the scheduler fires the next due one.
--
-- Run db/schema.sql first (it creates programs + partners that this references).

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- A pending team question. partner_id NULL = the question applies to the whole
-- program (any partner can be asked it); a set partner_id targets one person.
create table if not exists questions_queue (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  partner_id  uuid references partners(id) on delete cascade,   -- null = whole program
  question    text not null,
  mode        text not null default 'light' check (mode in ('light','deep')),
  status      text not null default 'queued' check (status in ('queued','sent','answered','skipped')),
  priority    int  not null default 0,                          -- higher = sent sooner
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);

-- The scheduler's hot path: "what's queued / outstanding for this partner?"
create index if not exists questions_queue_partner_status_idx on questions_queue(partner_id, status);

-- Enable RLS (no policies yet → anon/authenticated denied; service-role bypasses).
alter table questions_queue enable row level security;
