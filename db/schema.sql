-- Observant — off-product backend schema (Postgres / Supabase)
-- Run in the Supabase SQL editor once the project exists.
-- The serverless functions talk to this via the REST API using the SERVICE ROLE key
-- (api/_db.js), which BYPASSES RLS. RLS is enabled at the bottom (no policies yet) so
-- the anon/authenticated keys are denied by default. Add anon policies when the
-- partner portal (#9) reads from the browser.

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- A team's feedback partner program (one per product/magic-link slug).
create table if not exists programs (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,                 -- the magic-link slug, e.g. "northwind"
  product_name    text not null,
  rate_per_min    numeric(10,2) not null default 2,     -- $ per participating minute
  comp_type       text not null default 'cash',         -- cash | giftcard | product_credits | account_credits
  invitation_text text,
  created_at      timestamptz not null default now()
);

-- A user who opted into a program. `contact` is the only identifier we hold
-- (email address or telegram chat id) — it arrives with the channel choice.
create table if not exists partners (
  id          uuid primary key default gen_random_uuid(),
  program_id  uuid not null references programs(id) on delete cascade,
  channel     text not null check (channel in ('email','telegram','inproduct')),
  contact     text not null,                            -- email | telegram chat_id | hashed in-product id
  cadence     text not null default 'occasional' check (cadence in ('open','occasional','rare')),
  status      text not null default 'active' check (status in ('active','paused','opted_out')),
  consent_at  timestamptz,
  created_at  timestamptz not null default now(),
  unique (program_id, channel, contact)
);
create index if not exists partners_program_idx on partners(program_id);

-- A 1:1 thread with a partner (the intro, a light ask, or a deep dive).
create table if not exists conversations (
  id             uuid primary key default gen_random_uuid(),
  partner_id     uuid not null references partners(id) on delete cascade,
  subject        text,
  mode           text not null default 'light' check (mode in ('intro','light','deep')),
  status         text not null default 'open' check (status in ('open','sufficient','paused','dormant')),
  created_at     timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);
create index if not exists conversations_partner_idx on conversations(partner_id);

-- Each turn in a conversation. `minutes` = minutes earned on this turn (0 for the AI's turns).
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender          text not null check (sender in ('observant','partner')),
  body            text not null,
  meta            jsonb,
  minutes         numeric(10,2) not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id);

-- Append-only ledger. Every earn carries the AI quality verdict as its audit record.
create table if not exists minutes_ledger (
  id              uuid primary key default gen_random_uuid(),
  partner_id      uuid not null references partners(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  kind            text not null check (kind in ('earned','redeemed','adjustment')),
  minutes         numeric(10,2) not null default 0,     -- + for earned, - for redeemed/adjustment
  amount          numeric(10,2),                         -- $ value (minutes * rate at time of entry)
  quality_verdict jsonb,                                 -- assessQuality() result — the audit trail
  note            text,
  created_at      timestamptz not null default now()
);
create index if not exists ledger_partner_idx on minutes_ledger(partner_id);

-- Cash-out requests.
create table if not exists redemptions (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partners(id) on delete cascade,
  amount      numeric(10,2) not null,
  method      text,
  status      text not null default 'requested' check (status in ('requested','paid','failed')),
  created_at  timestamptz not null default now()
);

-- Convenience: a partner's current balance from the ledger.
create or replace view partner_balances as
  select p.id as partner_id,
         coalesce(sum(l.minutes), 0)                          as net_minutes,
         coalesce(sum(case when l.kind='earned' then l.minutes else 0 end), 0) as earned_minutes,
         coalesce(sum(l.amount), 0)                           as balance_amount
  from partners p
  left join minutes_ledger l on l.partner_id = p.id
  group by p.id;

-- Enable RLS (no policies yet → anon/authenticated denied by default; service-role bypasses).
alter table programs       enable row level security;
alter table partners       enable row level security;
alter table conversations  enable row level security;
alter table messages       enable row level security;
alter table minutes_ledger enable row level security;
alter table redemptions    enable row level security;


-- ============================================================================
-- OWNERSHIP LAYER — folded in from db/migrations/accounts-workspaces.sql,
-- insights.sql, and ownership.sql. This is the canonical source of truth; the
-- migration files exist so a live Supabase project can be upgraded in place, but
-- a fresh project can be created by running THIS file top to bottom.
--
-- Ownership chain:
--   accounts → workspaces → programs → partners → conversations → messages
--                        ↘ insights (per workspace)
-- ============================================================================

-- One row per signed-in human (mirrors a Supabase auth.users row).
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique not null,                 -- Supabase auth.users.id (from the verified token)
  email         text,
  name          text,
  created_at    timestamptz not null default now()
);
create unique index if not exists accounts_auth_user_idx on accounts(auth_user_id);

-- One product per account. slug matches programs.slug (the magic-link identifier).
create table if not exists workspaces (
  id                   uuid primary key default gen_random_uuid(),
  account_id           uuid references accounts(id) on delete cascade,
  slug                 text not null,                 -- product identifier; matches programs.slug
  product_name         text,
  product_description  text,
  config               jsonb not null default '{}',   -- setup / surfaces / rate / etc.
  state                jsonb not null default '{}',   -- full app-state snapshot for hydration
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (account_id, slug)
);
create index if not exists workspaces_slug_idx       on workspaces(slug);
create index if not exists workspaces_account_id_idx on workspaces(account_id);

-- Synthesized learnings, rolled up per workspace for the builder dashboard.
create table if not exists insights (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references workspaces(id) on delete cascade,
  title         text,
  detail        text,
  metric        text,
  source        text,                          -- 'conversation' | 'inproduct' | 'signal'
  status        text not null default 'open',
  created_at    timestamptz not null default now()
);
create index if not exists insights_workspace_created_idx on insights(workspace_id, created_at desc);
create index if not exists insights_workspace_source_idx  on insights(workspace_id, source);

-- Ownership FKs on existing tables (add-if-not-exists so this stays idempotent).
-- NOTE: github_installations + inproduct_feedback are created in their own feature
-- migrations; run those before this section on a fresh project, or the two alters
-- below are no-ops until those tables exist.
alter table programs add column if not exists workspace_id uuid references workspaces(id);
alter table programs add column if not exists account_id   uuid references accounts(id);
create index if not exists programs_workspace_idx on programs(workspace_id);
create index if not exists programs_account_idx   on programs(account_id);

-- Enable RLS on the new ownership tables (no policies → anon/authenticated denied;
-- service-role bypasses).
alter table accounts   enable row level security;
alter table workspaces enable row level security;
alter table insights   enable row level security;
