/* ============================================================
   Stripe Checkout — the TEAM pays for their feedback program (#10).
   POST { slug, plan?, amount? }

     plan = "prepaid" (default) → a one-time funding amount (USD) the
            team prepays into their program. `amount` is dollars
            (default $500); we mint an inline price_data line item.
     plan = "subscription" OR a price id ("price_…") → a recurring
            subscription billed against that Stripe Price. When plan
            === "subscription" we use STRIPE_PRICE_ID from env.

   Side effects: ensures a Stripe Customer for the program and
   persists `stripe_customer_id` onto the programs row. The session
   carries client_reference_id = program.id + metadata so webhook.js
   can mark the program funded on checkout.session.completed.

   Returns { ok, url } (the hosted Checkout URL to redirect the team
   to), or a graceful { ok:false, error } with no Stripe / no DB.
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
    const slug = String(body.slug || "").trim();
    if (!slug) return res.status(400).json({ ok: false, error: "missing slug" });

    // ---- resolve the program by slug ----
    const progs = await db.select("programs", "slug=eq." + encodeURIComponent(slug) + "&select=*&limit=1");
    const program = Array.isArray(progs) && progs[0];
    if (!program) return res.status(404).json({ ok: false, error: "unknown program slug: " + slug });

    // ---- ensure a Stripe Customer for this program (persist the id) ----
    let customerId = program.stripe_customer_id || "";
    if (!customerId) {
      const customer = await stripe.sapi("POST", "customers", {
        name: program.product_name || slug,
        metadata: { program_id: program.id, slug },
      });
      customerId = customer && customer.id;
      if (customerId) {
        try { await db.update("programs", "id=eq." + program.id, { stripe_customer_id: customerId }); }
        catch (e) { console.error("[checkout] persist customer:", e && e.message); }
      }
    }

    const base = "https://" + req.headers.host;
    const successUrl = (process.env.STRIPE_SUCCESS_URL || base + "/?checkout=success").replace(/\{slug\}/g, encodeURIComponent(slug));
    const cancelUrl = process.env.STRIPE_CANCEL_URL || base + "/?checkout=cancel";

    // ---- build the session params (subscription vs prepaid) ----
    const planRaw = String(body.plan || "prepaid").trim();
    const isPrice = /^price_/.test(planRaw);
    const isSub = isPrice || planRaw === "subscription";

    const params = {
      mode: isSub ? "subscription" : "payment",
      customer: customerId || undefined,
      client_reference_id: program.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { program_id: program.id, slug, plan: planRaw },
    };

    if (isSub) {
      const price = isPrice ? planRaw : String(process.env.STRIPE_PRICE_ID || "").trim();
      if (!price) {
        return res.status(200).json({ ok: false, error: "no subscription price — set STRIPE_PRICE_ID or pass plan=price_…" });
      }
      params.line_items = [{ price, quantity: 1 }];
    } else {
      // Prepaid funding: dollars → cents, inline price_data (no pre-made Price needed).
      const dollars = Math.max(1, Math.round(Number(body.amount) || 500));
      params.line_items = [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: dollars * 100,
          product_data: { name: (program.product_name || slug) + " — feedback program funding" },
        },
      }];
      params.payment_intent_data = { metadata: { program_id: program.id, slug } };
    }

    const session = await stripe.sapi("POST", "checkout/sessions", params);
    return res.status(200).json({ ok: true, url: session && session.url, id: session && session.id });
  } catch (error) {
    console.error("[checkout] failed:", error && error.message);
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function readBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_e) { b = {}; } }
  return b && typeof b === "object" ? b : {};
}
