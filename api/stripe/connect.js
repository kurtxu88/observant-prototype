/* ============================================================
   Stripe Connect (Express) — a PARTNER connects a payout dest (#10).
   POST { partnerId }

   Creates (or reuses) a Stripe Connect **Express** account for the
   partner — the account that receives Transfers when they cash out
   earned minutes — and returns a hosted onboarding account link the
   partner opens to finish KYC / add a bank or debit card.

   Side effect: persists `stripe_account_id` onto the partners row and
   refreshes `payouts_enabled` live from the Stripe account (so status
   stays honest even if the account.updated webhook isn't wired).

   POST { partnerId, action:"status" } → do NOT create anything / issue
   no onboarding link; just report { ok, connected, enabled, accountId }
   for a partner that already has an account (connected:false if none).
   Used by the rewards portal on return from onboarding to sync state.

   Returns { ok, url, accountId, enabled } (the onboarding URL), or a
   graceful { ok:false, error } with no Stripe / no DB / unknown partner.
   ============================================================ */
const db = require("../_db");
const stripe = require("./_stripe");

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
    const wantStatus = String(body.action || "").trim() === "status";

    // ---- resolve the partner ----
    const rows = await db.select("partners", "id=eq." + encodeURIComponent(partnerId) + "&select=*&limit=1");
    const partner = Array.isArray(rows) && rows[0];
    if (!partner) return res.status(404).json({ ok: false, error: "unknown partner: " + partnerId });

    // ---- status-only: report the account's current state, create nothing ----
    if (wantStatus) {
      const acctId = partner.stripe_account_id || "";
      if (!acctId) return res.status(200).json({ ok: true, connected: false, enabled: false });
      const enabled = await refreshEnabled(partner, acctId);
      return res.status(200).json({ ok: true, connected: true, enabled, accountId: acctId });
    }

    // ---- ensure an Express account (persist the id) ----
    let accountId = partner.stripe_account_id || "";
    if (!accountId) {
      const acct = await stripe.sapi("POST", "accounts", {
        type: "express",
        capabilities: { transfers: { requested: true } },
        // contact email only helps when this partner joined by email.
        email: partner.channel === "email" ? partner.contact : undefined,
        metadata: { partner_id: partner.id, program_id: partner.program_id },
      });
      accountId = acct && acct.id;
      if (accountId) {
        try { await db.update("partners", "id=eq." + partner.id, { stripe_account_id: accountId }); }
        catch (e) { console.error("[connect] persist account:", e && e.message); }
      }
    }
    if (!accountId) return res.status(200).json({ ok: false, error: "could not create Stripe account" });

    // Refresh eligibility now too (an account revisited after finishing KYC
    // may already be enabled before the webhook lands).
    const enabled = await refreshEnabled(partner, accountId);

    // ---- hosted onboarding link (returns the partner to their rewards portal) ----
    const base = "https://" + req.headers.host;
    const refreshUrl = process.env.STRIPE_CONNECT_REFRESH_URL || base + "/rewards?connect=refresh";
    const returnUrl = process.env.STRIPE_CONNECT_RETURN_URL || base + "/rewards?connect=done";

    const link = await stripe.sapi("POST", "account_links", {
      account: accountId,
      type: "account_onboarding",
      refresh_url: refreshUrl,
      return_url: returnUrl,
    });

    return res.status(200).json({ ok: true, url: link && link.url, accountId, enabled });
  } catch (error) {
    console.error("[connect] failed:", error && error.message);
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

// Retrieve the Connect account and sync partners.payouts_enabled → returns
// the current eligibility. Best-effort: any error leaves the stored value.
async function refreshEnabled(partner, accountId) {
  try {
    const acct = await stripe.sapi("GET", "accounts/" + encodeURIComponent(accountId));
    const enabled = !!(acct && acct.payouts_enabled);
    if (enabled !== !!partner.payouts_enabled) {
      try { await db.update("partners", "id=eq." + partner.id, { payouts_enabled: enabled }); }
      catch (e) { console.error("[connect] persist enabled:", e && e.message); }
    }
    return enabled;
  } catch (e) {
    console.error("[connect] refresh enabled:", e && e.message);
    return !!partner.payouts_enabled;
  }
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function readBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_e) { b = {}; } }
  return b && typeof b === "object" ? b : {};
}
