-- Observant — Stripe payment layer (Build #10; run in the Supabase SQL editor)
-- Adds the columns the api/stripe/* endpoints persist. Idempotent
-- (add column if not exists), keeps RLS enabled (service-role bypasses;
-- anon/authenticated stay denied until the portal needs a policy).

-- TEAM side: the Stripe Customer that pays for the program, plus funding state
-- written by api/stripe/webhook.js on checkout.session.completed.
alter table programs add column if not exists stripe_customer_id     text;
alter table programs add column if not exists stripe_subscription_id text;
alter table programs add column if not exists funded_at              timestamptz;

create index if not exists programs_stripe_customer_idx on programs(stripe_customer_id);

-- PARTNER side: the Connect (Express) account that RECEIVES payouts, and
-- whether Stripe has cleared it for payouts (flipped by account.updated).
alter table partners add column if not exists stripe_account_id text;
alter table partners add column if not exists payouts_enabled   boolean not null default false;

create index if not exists partners_stripe_account_idx on partners(stripe_account_id);

-- REDEMPTION audit: the Stripe Transfer id created at payout time.
alter table redemptions add column if not exists stripe_transfer_id text;

-- RLS stays on (no policy change). Tables already had it enabled in schema.sql;
-- re-assert here so this migration is safe to run standalone.
alter table programs    enable row level security;
alter table partners    enable row level security;
alter table redemptions enable row level security;
