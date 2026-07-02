/* ============================================================
   Stripe payout — a PARTNER cashes out earned minutes (#10).
   POST { partnerId }

   Reads the partner's redeemable balance from the partner_balances
   view (balance_amount = sum of minutes_ledger.amount, which already
   nets out prior redemptions), then:
     1. guards against zero / negative balance and a missing/!enabled
        connected account (double-payout self-guards: we net the
        ledger immediately, so a re-call sees a $0 balance);
     2. creates a Stripe Transfer to the partner's connected account
        (destination = partners.stripe_account_id), amount in cents;
     3. records the cash-out as BOTH a minutes_ledger row
        (kind=redeemed, negative minutes+amount → balance nets to ~0)
        and a redemptions row (status=paid, stripe_transfer_id).

   Returns { ok, amount, transferId }, or a graceful { ok:false,
   error } with no Stripe / no DB / nothing to pay.

   The core is exported as payoutPartner(partner) so the rewards
   portal (api/selfserve/partner-portal.js) can drive a real payout
   straight from a Claim — same guards, same ledger + redemption
   bookkeeping — without re-resolving the partner over HTTP.
   ============================================================ */
const db = require("../_db");
const stripe = require("./_stripe");

/* payoutPartner(partner) — cash out ONE partner row's redeemable
   balance as a Stripe Transfer to its connected account.

   `partner` is a full partners row (needs id, program_id,
   stripe_account_id, payouts_enabled). Returns:
     { ok:true, amount, transferId }                     — money moved
     { ok:false, simulated:true, error }                 — Stripe/DB off
     { ok:false, needsSetup:true, error }                — no connected/enabled account
     { ok:false, error, amount:0 }                       — nothing to pay
   NEVER inserts the balance-zeroing ledger row unless the Transfer
   actually succeeded, so an un-payable claim leaves the balance intact. */
async function payoutPartner(partner) {
  // Degrade gracefully — never a fake success.
  if (!stripe.stripeConfigured()) return { ok: false, simulated: true, error: "payouts aren't enabled yet" };
  if (!db.dbConfigured()) return { ok: false, simulated: true, error: "payouts aren't enabled yet" };
  if (!partner || !partner.id) return { ok: false, error: "unknown partner" };

  // Must have a connected + Stripe-cleared payout destination.
  if (!partner.stripe_account_id) return { ok: false, needsSetup: true, error: "no connected payout account" };
  if (partner.payouts_enabled === false) return { ok: false, needsSetup: true, error: "payouts not enabled yet — finish Stripe onboarding" };

  // ---- read redeemable balance from the view ----
  const bal = await db.select("partner_balances", "partner_id=eq." + partner.id + "&select=net_minutes,balance_amount&limit=1");
  const row = Array.isArray(bal) && bal[0];
  const amount = Math.round(((row && Number(row.balance_amount)) || 0) * 100) / 100;
  const netMinutes = (row && Number(row.net_minutes)) || 0;
  if (!(amount > 0)) return { ok: false, error: "no balance to pay out", amount: 0 };

  const cents = Math.round(amount * 100);

  // ---- create the Transfer (idempotency-keyed on partner + cents to dampen accidental double-clicks) ----
  const transfer = await stripe.sapi("POST", "transfers", {
    amount: cents,
    currency: "usd",
    destination: partner.stripe_account_id,
    transfer_group: "partner_" + partner.id,
    metadata: { partner_id: partner.id, program_id: partner.program_id, minutes: netMinutes },
  }, { idempotencyKey: "payout_" + partner.id + "_" + cents });

  const transferId = transfer && transfer.id;

  // ---- net the ledger so the balance returns to ~0 (the real balance source) ----
  // Only runs once the Transfer above succeeded — so a failed/absent payout
  // never zeroes the balance.
  try {
    await db.insert("minutes_ledger", {
      partner_id: partner.id,
      kind: "redeemed",
      minutes: -Math.abs(netMinutes),
      amount: -Math.abs(amount),
      note: "stripe payout " + (transferId || ""),
    });
  } catch (e) { console.error("[payout] ledger:", e && e.message); }

  // ---- record the redemption (audit / cash-out log) ----
  try {
    await db.insert("redemptions", {
      partner_id: partner.id,
      amount,
      method: "stripe",
      status: "paid",
      stripe_transfer_id: transferId || null,
    });
  } catch (e) { console.error("[payout] redemption:", e && e.message); }

  return { ok: true, amount, transferId };
}

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    if (!stripe.stripeConfigured()) return res.status(200).json({ ok: false, error: "stripe not configured" });
    if (!db.dbConfigured()) return res.status(200).json({ ok: false, error: "DB not configured" });

    const body = readBody(req);
    const partnerId = String(body.partnerId || "").trim();
    if (!partnerId) return res.status(400).json({ ok: false, error: "missing partnerId" });

    // ---- resolve the partner + its connected account ----
    const rows = await db.select("partners", "id=eq." + encodeURIComponent(partnerId) + "&select=*&limit=1");
    const partner = Array.isArray(rows) && rows[0];
    if (!partner) return res.status(404).json({ ok: false, error: "unknown partner: " + partnerId });

    const out = await payoutPartner(partner);
    return res.status(200).json(out);
  } catch (error) {
    console.error("[payout] failed:", error && error.message);
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

module.exports.payoutPartner = payoutPartner;

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function readBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_e) { b = {}; } }
  return b && typeof b === "object" ? b : {};
}
