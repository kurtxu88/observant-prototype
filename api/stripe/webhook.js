/* ============================================================
   Stripe webhook (#10) — keep the DB in sync with Stripe events.
   POST (raw body) from Stripe. Endpoint to register:
     https://observant-prototype.vercel.app/api/stripe/webhook

   Handles:
     - checkout.session.completed → the TEAM paid: mark the program
       funded (funded_at=now, stash subscription id if any) via the
       session's client_reference_id (= program.id).
     - account.updated → a PARTNER's Connect account changed: flip
       partners.payouts_enabled from the account's payouts_enabled.

   Signature: when STRIPE_WEBHOOK_SECRET is set, verify the
   `stripe-signature` header (HMAC-SHA256 of `${t}.${rawBody}`, hex)
   via node crypto. ALWAYS responds 200 (even on bad sig / unknown
   event / no DB) so Stripe doesn't retry-storm and the build stays
   green before Stripe is wired up.
   ============================================================ */
const crypto = require("crypto");
const db = require("../_db");

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const raw = await readRaw(req);
    const secret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
    if (secret && !verifyStripeSig(raw, req.headers["stripe-signature"], secret)) {
      // Don't process an unverified event — but still 200 (per spec, no retry-storm).
      return res.status(200).json({ ok: false, error: "bad signature" });
    }

    const event = parseJson(raw);
    const type = event && event.type;
    const obj = (event && event.data && event.data.object) || {};

    if (!db.dbConfigured()) return res.status(200).json({ ok: true, ignored: "no DB", type });

    if (type === "checkout.session.completed") {
      // program.id rides on client_reference_id (fallback: metadata.program_id).
      const programId = obj.client_reference_id || (obj.metadata && obj.metadata.program_id) || "";
      if (programId) {
        const patch = { funded_at: new Date().toISOString() };
        if (obj.subscription) patch.stripe_subscription_id = obj.subscription;
        if (obj.customer) patch.stripe_customer_id = obj.customer;
        try { await db.update("programs", "id=eq." + programId, patch); }
        catch (e) { console.error("[webhook] program funded:", e && e.message); }
      }
      return res.status(200).json({ ok: true, type, programId });
    }

    if (type === "account.updated") {
      const accountId = obj.id || "";
      if (accountId) {
        const enabled = !!obj.payouts_enabled;
        try { await db.update("partners", "stripe_account_id=eq." + encodeURIComponent(accountId), { payouts_enabled: enabled }); }
        catch (e) { console.error("[webhook] account.updated:", e && e.message); }
      }
      return res.status(200).json({ ok: true, type, payouts_enabled: !!obj.payouts_enabled });
    }

    // Anything else: acknowledge, no-op.
    return res.status(200).json({ ok: true, ignored: type || "unknown" });
  } catch (error) {
    console.error("[webhook] failed:", error && error.message);
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

/* ---------- Stripe signature (t=…,v1=…) over `${t}.${raw}` ---------- */
function verifyStripeSig(raw, header, secret) {
  try {
    if (raw == null || typeof raw !== "string") return false;   // need the exact raw bytes
    const fields = String(header || "").split(",").reduce((acc, p) => {
      const i = p.indexOf("=");
      if (i > 0) acc[p.slice(0, i).trim()] = p.slice(i + 1).trim();
      return acc;
    }, {});
    const t = fields.t, v1 = fields.v1;
    if (!t || !v1) return false;
    const expected = crypto.createHmac("sha256", secret).update(t + "." + raw, "utf8").digest("hex");
    const a = Buffer.from(expected), b = Buffer.from(v1);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (_e) { return false; }
}

/* ---------- io ---------- */
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function parseJson(raw) { if (raw && typeof raw === "object") return raw; try { return JSON.parse(String(raw || "") || "{}"); } catch (_e) { return {}; } }
async function readRaw(req) {
  // Prefer the exact raw body (needed for signature verification).
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return req.body;   // already parsed → sig verify is skipped
  let b = ""; for await (const c of req) { b += c; if (b.length > 1000000) throw new Error("payload too large"); }
  return b;
}
