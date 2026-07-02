/* ============================================================
   Partner PORTAL (#9) — the END-USER's own view of a feedback
   program. Loads everything one signed-in partner needs to see:
     • their program(s): product, channel, cadence, status, rate
     • their balance: participating minutes + earned rewards ($)
     • their history: each loop/reply they contributed + minutes
   …and lets them CLAIM (redeem) what they've earned.

   Called by app/rewardsportal.jsx once the magic-link / Google
   sign-in lands the partner here.

   Auth: the browser passes the Supabase access token as a Bearer
   header. We verify it against Supabase's own /auth/v1/user (anon
   key) to recover the trusted email, then resolve the partner by
   that email. A signed-in user can thus only ever read/redeem
   THEIR OWN data. Falls back to ?email= only when no token is
   present (local poking); production always sends the token.

   GET  → { ok, email, linked, rate, totals, programs, history,
            payout:{ supported, connected, enabled, partnerId } }
     — `payout` tells the portal whether a real Stripe payout can
     happen: supported (Stripe wired), connected (partner has a
     Connect account), enabled (Stripe cleared it for payouts).

   POST { action:"redeem" } → cash out via a REAL Stripe Transfer
     (api/stripe/payout.payoutPartner). Only nets the balance to $0
     for the amount that actually paid out; a partner without a
     connected+enabled payout account gets their intent recorded
     (redemptions.status='requested') with the balance LEFT INTACT
     and needsSetup:true. Returns { ok, paid, requested, status,
     needsSetup }.

   Degrades without a DB or Stripe: returns { ok:true, simulated:true }
   and honest copy ("payouts aren't enabled yet") — never a fake
   success, never a zeroed balance.
   ============================================================ */
const db = require("../_db");
const stripe = require("../stripe/_stripe");
const { payoutPartner } = require("../stripe/payout");

const SB_URL = (process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
const SB_ANON = (process.env.SUPABASE_ANON_KEY || "").trim();

// Verify a Supabase access token → returns the user (with .email) or null.
async function verifyToken(token) {
  if (!token || !SB_URL || !SB_ANON) return null;
  try {
    const res = await fetch(SB_URL + "/auth/v1/user", {
      headers: { apikey: SB_ANON, Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return u && u.email ? u : null;
  } catch (_e) {
    return null;
  }
}

// PostgREST in.(...) list, comma-joined (uuids left raw).
function inList(ids) {
  return "(" + ids.map((id) => String(id)).join(",") + ")";
}

function round2(n) {
  return Math.round(Number(n || 0) * 100) / 100;
}

// A small, realistic populated portal for the no-DB demo.
function simulatedPortal(email) {
  const now = Date.now();
  const day = 86400000;
  return {
    ok: true,
    simulated: true,
    email: email || "you@example.com",
    linked: true,
    rate: 2,
    totals: { netMinutes: 11, earnedMinutes: 14, balance: 22, claimed: 6 },
    // No DB/Stripe in the static demo → payouts can't actually run yet. Honest.
    payout: { supported: stripe.stripeConfigured(), connected: false, enabled: false, partnerId: null },
    programs: [
      { product: "Northwind", slug: "northwind", channel: "email", cadence: "occasional", status: "active", rate: 2, compType: "cash" },
    ],
    history: [
      { kind: "earned", earned: true, minutes: 4, amount: 8, verdict: "pass", reason: "", note: "email reply", product: "Northwind", date: new Date(now - 1 * day).toISOString() },
      { kind: "unqualified", earned: false, minutes: 0, amount: null, verdict: "partial", reason: "Too brief — add a specific example to earn.", note: "", product: "Northwind", date: new Date(now - 2 * day).toISOString() },
      { kind: "earned", earned: true, minutes: 3, amount: 6, verdict: "pass", reason: "", note: "email reply", product: "Northwind", date: new Date(now - 5 * day).toISOString() },
      { kind: "redeemed", minutes: -3, amount: -6, note: "payout requested", product: "Northwind", date: new Date(now - 6 * day).toISOString() },
      { kind: "earned", earned: true, minutes: 4, amount: 8, verdict: "pass", reason: "", note: "email reply", product: "Northwind", date: new Date(now - 9 * day).toISOString() },
      { kind: "earned", earned: true, minutes: 3, amount: 6, verdict: "pass", reason: "", note: "email reply", product: "Northwind", date: new Date(now - 14 * day).toISOString() },
    ],
  };
}

// Resolve the trusted email + this partner's rows (across programs) once, for
// both GET and the redeem POST.
async function resolvePartner(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_e) { body = {}; } }
  body = body || {};
  const q = req.query || {};
  let email = String((q.email || body.email) || "").trim().toLowerCase();

  // Prefer the verified token's email — never trust a client-supplied email
  // when a token is present.
  const user = await verifyToken(token);
  if (user) email = String(user.email || "").trim().toLowerCase();

  return { email, body };
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();

  const { email, body } = await resolvePartner(req);
  if (!email) { res.status(401).json({ error: "not authenticated" }); return; }

  // No DB → simulated populated portal (demo). Redeem can't move money — say so honestly.
  if (!db.dbConfigured()) {
    if (req.method === "POST" && body.action === "redeem") {
      res.status(200).json({ ok: true, simulated: true, paid: 0, requested: 0, claimed: 0, status: "unavailable", error: "payouts aren't enabled yet" });
      return;
    }
    res.status(200).json(simulatedPortal(email));
    return;
  }

  try {
    // Every partner row keyed by this identity (may span programs AND channels).
    // Resolve by contact across all channels — do NOT hard-filter channel=email,
    // or a Telegram partner (who has real earned minutes) would be invisible here.
    // Limitation: we can only match rows whose `contact` equals the signed-in
    // email; a Telegram partner keyed solely by chat_id (no email on file) still
    // can't be reached from a Bearer-token email — that needs an email↔chat_id link.
    const partners = await db.select(
      "partners",
      "contact=eq." + encodeURIComponent(email) +
        "&select=id,program_id,channel,cadence,status,stripe_account_id,payouts_enabled"
    );

    if (!partners || !partners.length) {
      // Authenticated but not yet linked to any program.
      res.status(200).json({
        ok: true, email, linked: false, rate: 2,
        totals: { netMinutes: 0, earnedMinutes: 0, balance: 0, claimed: 0 },
        payout: { supported: stripe.stripeConfigured(), connected: false, enabled: false, partnerId: null },
        programs: [], history: [],
      });
      return;
    }

    const ids = partners.map((p) => p.id);
    const progIds = Array.from(new Set(partners.map((p) => p.program_id)));

    // Program metadata (product name, rate, comp type) keyed by id.
    const progRows = progIds.length
      ? await db.select("programs", "id=in." + inList(progIds) + "&select=id,slug,product_name,rate_per_min,comp_type")
      : [];
    const progById = {};
    (progRows || []).forEach((p) => { progById[p.id] = p; });

    // Partner-id → program (for stamping history rows with their product).
    const progByPartner = {};
    partners.forEach((p) => { progByPartner[p.id] = progById[p.program_id] || null; });

    // ---- REDEEM: pay out via a REAL Stripe Transfer (only zero what actually pays) ----
    if (req.method === "POST" && body.action === "redeem") {
      const balances = await db.select(
        "partner_balances",
        "partner_id=in." + inList(ids) + "&select=partner_id,balance_amount"
      );
      const total = (balances || []).reduce((a, b) => a + Number(b.balance_amount || 0), 0);
      if (total <= 0) { res.status(200).json({ ok: false, error: "nothing to claim yet" }); return; }

      // Stripe not wired at all → be honest, leave the balance untouched.
      if (!stripe.stripeConfigured()) {
        res.status(200).json({ ok: true, simulated: true, paid: 0, requested: round2(total), claimed: 0, status: "unavailable", needsSetup: true, error: "payouts aren't enabled yet" });
        return;
      }

      const byId = {};
      partners.forEach((p) => { byId[p.id] = p; });
      // One onboarding covers all of this partner's programs: reuse a single
      // connected+enabled Connect account across every program row.
      const shared = partners.find((p) => p.stripe_account_id && p.payouts_enabled) || null;
      const alreadyRequested = new Set();   // guard duplicate 'requested' rows across re-clicks

      let paid = 0, requested = 0;
      const transfers = [];
      for (const b of balances || []) {
        const amt = round2(b.balance_amount);
        if (amt <= 0) continue;
        let p = byId[b.partner_id];
        if (!p) continue;

        // Propagate the shared payout account to a program row that lacks one.
        if (shared && (!p.stripe_account_id || p.payouts_enabled === false) && shared.id !== p.id) {
          p = Object.assign({}, p, { stripe_account_id: shared.stripe_account_id, payouts_enabled: shared.payouts_enabled });
          try { await db.update("partners", "id=eq." + b.partner_id, { stripe_account_id: shared.stripe_account_id, payouts_enabled: shared.payouts_enabled }); }
          catch (e) { console.error("[partner-portal] share account:", e && e.message); }
        }

        const out = await payoutPartner(p);   // real Transfer + nets the ledger on success
        if (out && out.ok) {
          paid += Number(out.amount || amt);
          if (out.transferId) transfers.push(out.transferId);
        } else {
          // Can't pay yet (no connected/enabled account). Record the intent —
          // but DO NOT insert a redeemed ledger row, so the balance stays claimable.
          requested += amt;
          if (!alreadyRequested.has(b.partner_id)) {
            alreadyRequested.add(b.partner_id);
            try {
              const open = await db.select("redemptions", "partner_id=eq." + b.partner_id + "&status=eq.requested&select=id&limit=1");
              if (!(Array.isArray(open) && open.length)) {
                await db.insert("redemptions", { partner_id: b.partner_id, amount: amt, method: "stripe", status: "requested" });
              }
            } catch (e) { console.error("[partner-portal] requested redemption:", e && e.message); }
          }
        }
      }

      const status = paid > 0 ? (requested > 0 ? "partial" : "paid") : "requested";
      res.status(200).json({
        ok: paid > 0,
        paid: round2(paid),
        claimed: round2(paid),                 // back-compat: what actually paid out
        requested: round2(requested),
        needsSetup: paid <= 0 && requested > 0,
        status,
        transfers,
        error: paid <= 0 ? "finish payout setup to receive your rewards" : undefined,
      });
      return;
    }

    // ---- GET: balance + programs + history ----
    const balances = await db.select(
      "partner_balances",
      "partner_id=in." + inList(ids) + "&select=partner_id,net_minutes,earned_minutes,balance_amount"
    );
    const netMinutes = (balances || []).reduce((a, b) => a + Number(b.net_minutes || 0), 0);
    const earnedMinutes = (balances || []).reduce((a, b) => a + Number(b.earned_minutes || 0), 0);
    const balance = (balances || []).reduce((a, b) => a + Number(b.balance_amount || 0), 0);

    // Recent ledger across all of this partner's programs = their history.
    // quality_verdict is the audit trail stamped on each earn — surface its verdict/reason.
    const ledger = await db.select(
      "minutes_ledger",
      "partner_id=in." + inList(ids) +
        "&select=partner_id,kind,minutes,amount,note,quality_verdict,created_at&order=created_at.desc&limit=60"
    );
    const claimed = (ledger || [])
      .filter((l) => l.kind === "redeemed")
      .reduce((a, l) => a + Math.abs(Number(l.amount || 0)), 0);

    const history = (ledger || []).map((l) => {
      const prog = progByPartner[l.partner_id];
      const qv = l.quality_verdict && typeof l.quality_verdict === "object" ? l.quality_verdict : null;
      const earned = l.kind === "earned";
      return {
        kind: l.kind,
        earned,                                        // earn rows always qualified
        minutes: Number(l.minutes || 0),
        amount: l.amount == null ? null : Number(l.amount),
        verdict: earned ? (qv && qv.overall) || "pass" : null,
        reason: earned ? String((qv && qv.summary) || "") : "",
        note: l.note || "",
        product: prog ? prog.product_name : "",
        date: l.created_at,
      };
    });

    // Replies that were ASSESSED but didn't (yet) earn have no ledger row (the ledger
    // only records earns/redemptions), so pull them from the persisted partner messages —
    // each carries its verdict/reason in meta. Best-effort: a missing meta column or any
    // query error just omits them (the ledger-based history still renders).
    try {
      const convs = await db.select(
        "conversations",
        "partner_id=in." + inList(ids) + "&select=id,partner_id&limit=200"
      );
      const convProgById = {};
      (convs || []).forEach((c) => { convProgById[c.id] = progByPartner[c.partner_id] || null; });
      const convIds = (convs || []).map((c) => c.id);
      if (convIds.length) {
        const msgs = await db.select(
          "messages",
          "conversation_id=in." + inList(convIds) +
            "&sender=eq.partner&select=conversation_id,minutes,meta,created_at&order=created_at.desc&limit=100"
        );
        (msgs || []).forEach((m) => {
          const meta = m.meta && typeof m.meta === "object" ? m.meta : null;
          const verdict = meta && meta.quality_verdict;
          if (!verdict || verdict === "pass") return;    // earned replies already come from the ledger
          const prog = convProgById[m.conversation_id];
          history.push({
            kind: "unqualified",
            earned: false,
            minutes: 0,
            amount: null,
            verdict,
            reason: String(meta.quality_note || ""),
            note: "",
            product: prog ? prog.product_name : "",
            date: m.created_at,
          });
        });
        history.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      }
    } catch (e) {
      console.error("[partner-portal] verdict enrich skipped:", e && e.message);
    }

    // Effective per-minute rate for display: prefer a program rate, else derive.
    let rate = 2;
    const firstProg = progRows && progRows[0];
    if (firstProg && Number(firstProg.rate_per_min) > 0) rate = Number(firstProg.rate_per_min);

    const programs = partners.map((p) => {
      const prog = progById[p.program_id] || {};
      return {
        product: prog.product_name || "",
        slug: prog.slug || "",
        channel: p.channel,
        cadence: p.cadence,
        status: p.status,
        rate: Number(prog.rate_per_min) || rate,
        compType: prog.comp_type || "cash",
      };
    });

    // Real payout capability: can a Claim actually move money right now?
    const connectedRow = partners.find((p) => p.stripe_account_id);
    const enabledRow = partners.find((p) => p.stripe_account_id && p.payouts_enabled);
    const primary = connectedRow || partners[0];
    const payout = {
      supported: stripe.stripeConfigured(),
      connected: !!connectedRow,
      enabled: !!enabledRow,
      partnerId: primary ? primary.id : null,
    };

    res.status(200).json({
      ok: true,
      email,
      linked: true,
      rate: round2(rate) || 2,
      totals: {
        netMinutes: round2(netMinutes),
        earnedMinutes: round2(earnedMinutes),
        balance: round2(balance),
        claimed: round2(claimed),
      },
      payout,
      programs,
      history,
    });
  } catch (err) {
    console.error("[partner-portal] failed:", err && err.message);
    res.status(500).json({ error: err && err.message });
  }
};
