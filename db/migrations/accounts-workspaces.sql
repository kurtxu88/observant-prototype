-- Observant — accounts + workspaces (the ownership root; run in the Supabase SQL editor)
--
-- This EXTENDS db/schema.sql — it does not replace it. It introduces the two
-- tables that sit ABOVE everything the base schema already created:
--
--   accounts   = one row per signed-in human (mirrors a Supabase auth.users row)
--   workspaces = one product per account (the thing that owns a program/slug)
--
-- Ownership chain (top → bottom):
--   accounts → workspaces → programs → partners → conversations → messages
--                        ↘ insights (per workspace)
--
-- RUN ORDER:
--   1. db/schema.sql                          (programs, partners, conversations, ...)
--   2. db/migrations/accounts-workspaces.sql  ← THIS FILE
--   3. db/migrations/insights.sql
--   4. db/migrations/ownership.sql            (back-fills workspace_id/account_id FKs)
--   ...plus the feature migrations (github, stripe, telegram, questions_queue, inproduct).
--
-- Idempotent (create table / index / policy if not exists). Safe to run standalone
-- and safe to re-run. RLS is enabled with no policies → anon/authenticated denied
-- by default; the service-role key used by api/_db.js BYPASSES RLS.

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- One row per signed-in human. auth_user_id is the Supabase auth.users.id from the
-- verified JWT — the join key every account-scoped API endpoint resolves against.
create table if not exists accounts (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique not null,                 -- Supabase auth.users.id (from the verified token)
  email         text,
  name          text,
  created_at    timestamptz not null default now()
);

-- The join key for "who is this request?" — API endpoints look up the account by
-- the auth_user_id carried in the verified Supabase token.
create unique index if not exists accounts_auth_user_idx on accounts(auth_user_id);

-- A single product owned by an account. `slug` matches programs.slug (the magic-link
-- identifier), so a workspace and its off-product program share one identifier.
-- `config` = setup/surfaces/rate/etc.; `state` = a full app-state snapshot used to
-- rehydrate the builder UI on load.
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

-- Lookup by slug (the magic-link / program identifier) and by owner.
create index if not exists workspaces_slug_idx       on workspaces(slug);
create index if not exists workspaces_account_id_idx on workspaces(account_id);

-- Enable RLS (no policies yet → anon/authenticated denied by default; the
-- service-role key used by api/_db.js bypasses RLS, so the API still reads/writes).
alter table accounts   enable row level security;
alter table workspaces enable row level security;
