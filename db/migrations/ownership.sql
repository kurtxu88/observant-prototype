-- Observant — ownership back-fill (wire existing tables to accounts/workspaces)
-- Run in the Supabase SQL editor.
--
-- The base schema (db/schema.sql) and the feature migrations (github, inproduct)
-- created their tables BEFORE the accounts/workspaces ownership root existed. This
-- migration adds the foreign keys that connect them to it, so every row can be
-- traced back to the account that owns it:
--
--   programs             → workspace_id, account_id
--   inproduct_feedback   → workspace_id   (joins the slug-keyed stream to a workspace)
--   github_installations → account_id     (which account owns this GitHub install)
--
-- RUN ORDER: run LAST of the ownership set —
--   db/schema.sql → accounts-workspaces.sql → insights.sql → THIS FILE.
-- Also run the feature migrations (github.sql, inproduct.sql) at some point before
-- this so the tables it alters exist; add-column-if-not-exists makes order-within
-- forgiving, but the tables themselves must be present.
--
-- All changes are `add column if not exists` / `create index if not exists`, so this
-- is idempotent and safe to run standalone and to re-run. Columns are nullable — this
-- back-fills the shape without forcing existing rows to have an owner. RLS is
-- re-asserted at the bottom (service-role bypasses; anon/authenticated stay denied).

-- programs: the off-product program now belongs to a workspace (and, denormalized
-- for convenient scoping, directly to an account).
alter table programs add column if not exists workspace_id uuid references workspaces(id);
alter table programs add column if not exists account_id   uuid references accounts(id);

create index if not exists programs_workspace_idx on programs(workspace_id);
create index if not exists programs_account_idx   on programs(account_id);

-- inproduct_feedback: the slug-keyed in-app stream gets an explicit workspace FK
-- (slug still carries the raw identifier; workspace_id is the resolved owner).
alter table inproduct_feedback add column if not exists workspace_id uuid references workspaces(id);

create index if not exists inproduct_feedback_workspace_idx on inproduct_feedback(workspace_id);

-- github_installations: tie an install to the account that owns it, so the
-- snippet-PR endpoint can scope installs per account.
alter table github_installations add column if not exists account_id uuid references accounts(id);

create index if not exists github_installations_account_idx on github_installations(account_id);

-- RLS stays on (no policy change). Re-assert so this migration is safe standalone.
alter table programs             enable row level security;
alter table inproduct_feedback   enable row level security;
alter table github_installations enable row level security;
