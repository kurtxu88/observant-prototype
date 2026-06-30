# Stripe payment layer (Build #10)

Teams **fund/pay** for their feedback program; partners **get paid out** (earned
minutes → money) via Stripe **Connect (Express)**. Pure Node + raw `fetch` over
the Stripe REST API — no `stripe` npm package, no SDK. Every endpoint degrades
gracefully: with no Stripe env it returns `{ ok:false, error:"stripe not
configured" }` and never crashes, so the deployed build stays green until setup.

## Endpoints

| Route | Method / body | Does |
|---|---|---|
| `POST /api/stripe/checkout` | `{ slug, plan?, amount? }` | TEAM pays. Creates a Checkout Session — `plan:"prepaid"` (default, one-time `amount` in USD, default $500) or `plan:"subscription"` / a `price_…` id. Ensures a Stripe Customer and persists `stripe_customer_id` on the program. → `{ ok, url }` |
| `POST /api/stripe/connect` | `{ partnerId }` | PARTNER connects a payout destination. Creates/reuses a Connect **Express** account, persists `stripe_account_id`, returns a hosted onboarding link. → `{ ok, url }` |
| `POST /api/stripe/payout` | `{ partnerId }` | PARTNER cashes out. Reads redeemable balance from `partner_balances`, creates a Transfer to their connected account, writes a `minutes_ledger` (kind=redeemed, negative) row so the balance nets to ~0, and a `redemptions` row. → `{ ok, amount }` |
| `POST /api/stripe/webhook` | Stripe event (raw) | `checkout.session.completed` → marks the program funded (`funded_at`). `account.updated` → flips `partners.payouts_enabled`. Verifies the signature when `STRIPE_WEBHOOK_SECRET` is set. Always 200. |

### Flows

- **Team pays:** `checkout` → Stripe Customer (saved on program) → hosted
  Checkout URL → team pays → `webhook`/`checkout.session.completed` marks the
  program `funded_at` (+ `stripe_subscription_id` for subscriptions).
- **Partner gets paid:** `connect` → Express account + onboarding link → partner
  finishes KYC → `webhook`/`account.updated` sets `payouts_enabled=true` →
  `payout` reads `partner_balances.balance_amount`, Transfers it to the connected
  account, and nets the ledger so the balance returns to ~0.

## Migration

Run `db/migrations/stripe.sql` in the Supabase SQL editor (idempotent). Adds:

- `programs.stripe_customer_id`, `programs.stripe_subscription_id`, `programs.funded_at`
- `partners.stripe_account_id`, `partners.payouts_enabled` (default false)
- `redemptions.stripe_transfer_id`

---

## What Xuan must set up (DEV: do NOT create these — they're Xuan's)

These are PROHIBITED for the dev to create. Xuan does them in the Stripe
Dashboard + Vercel:

1. **Stripe account** — create one (test mode is fine to start).
2. **Enable Connect → Express** (Connect → Settings → enable Express accounts).
   Required for `connect`/`payout` (the partner payout side).
3. **API key** — copy the **Secret key** (`sk_test_…` / `sk_live_…`) →
   set `STRIPE_SECRET_KEY` in Vercel.
4. **Webhook endpoint** — add `https://observant-prototype.vercel.app/api/stripe/webhook`,
   subscribe to **`checkout.session.completed`** and **`account.updated`**, copy
   its **signing secret** (`whsec_…`) → set `STRIPE_WEBHOOK_SECRET` in Vercel.
5. **(Subscription plans only)** create a Product + recurring **Price** in Stripe,
   copy the price id (`price_…`) → set `STRIPE_PRICE_ID` (used when
   `plan:"subscription"`), or pass the `price_…` directly as `plan`. The default
   `prepaid` plan needs no pre-made price (it builds the line item inline).

### Vercel env vars

| Var | Required | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | yes | Stripe API auth (Bearer). Without it every endpoint returns `stripe not configured`. |
| `STRIPE_WEBHOOK_SECRET` | recommended | Verifies webhook signatures. If unset, the webhook still 200s but skips verification. |
| `STRIPE_PRICE_ID` | only for subscriptions | Recurring Price for `plan:"subscription"`. |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | optional | Override Checkout redirect URLs (default `https://<host>/?checkout=success|cancel`). `{slug}` is substituted in the success URL. |
| `STRIPE_CONNECT_RETURN_URL` / `STRIPE_CONNECT_REFRESH_URL` | optional | Override Connect onboarding redirect URLs. |

Also relies on the existing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
(via `api/_db.js`) to persist ids and read balances.
