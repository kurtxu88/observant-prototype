-- Observant — partner payout account (Stripe Connect Express).
-- The rewards Claim pays earned minutes out as a Stripe Transfer to
-- the partner's connected account, so a partner must have a connected
-- + enabled payout destination before a claim can actually move money.
--
-- Adds the two columns that gate + destination the payout:
--   stripe_account_id  — the Connect Express account (set by connect.js)
--   payouts_enabled    — Stripe has cleared it (flipped by webhook.js /
--                        connect.js status refresh on account.updated)
--
-- Idempotent (add column if not exists); safe to run standalone. These
-- columns also live in stripe.sql — re-asserted here for the payout build.
alter table partners add column if not exists stripe_account_id text;
alter table partners add column if not exists payouts_enabled   boolean not null default false;

create index if not exists partners_stripe_account_idx on partners(stripe_account_id);
