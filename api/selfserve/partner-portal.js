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

   GET  → { ok, email, linked, rate, totals, programs, history }
   POST { action:"redeem" } → records a redemptions row (+ a
     matching 'redeemed' ledger entry so the balance zeroes and
     can't be double-claimed), returns { ok, claimed, status }.

   Degrades without a DB: returns a small SIMULATED populated
   portal so the page still renders in the static demo.
   ============================================================ */
const db = require("../_db");

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
    programs: [
      { product: "Northwind", slug: "northwind", channel: "email", cadence: "occasional", status: "active", rate: 2, compType: "cash" },
    ],
    history: [
      { kind: "earned", minutes: 4, amount: 8, note: "email reply", product: "Northwind", date: new Date(now - 1 * day).toISOString() },
      { kind: "earned", minutes: 3, amount: 6, note: "email reply", product: "Northwind", date: new Date(now - 5 * day).toISOString() },
      { kind: "redeemed", minutes: -3, amount: -6, note: "payout requested", product: "Northwind", date: new Date(now - 6 * day).toISOString() },
      { kind: "earned", minutes: 4, amount: 8, note: "email reply", product: "Northwind", date: new Date(now - 9 * day).toISOString() },
      { kind: "earned", minutes: 3, amount: 6, note: "email reply", product: "Northwind", date: new Date(now - 14 * day).toISOString() },
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

  // No DB → simulated populated portal (demo). Redeem just confirms.
  if (!db.dbConfigured()) {
    if (req.method === "POST" && body.action === "redeem") {
      res.status(200).json({ ok: true, simulated: true, claimed: 22, status: "requested" });
      return;
    }
    res.status(200).json(simulatedPortal(email));
    return;
  }

  try {
    // Every partner row keyed by this email (may span programs).
    const partners = await db.select(
      "partners",
      "contact=eq." + encodeURIComponent(email) +
        "&channel=eq.email&select=id,program_id,channel,cadence,status"
    );

    if (!partners || !partners.length) {
      // Authenticated but not yet linked to any program.
      res.status(200).json({
        ok: true, email, linked: false, rate: 2,
        totals: { netMinutes: 0, earnedMinutes: 0, balance: 0, claimed: 0 },
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

    // ---- REDEEM: record the cash-out, zero the balance so it can't be re-claimed ----
    if (req.method === "POST" && body.action === "redeem") {
      const balances = await db.select(
        "partner_balances",
        "partner_id=in." + inList(ids) + "&select=partner_id,balance_amount"
      );
      const total = (balances || []).reduce((a, b) => a + Number(b.balance_amount || 0), 0);
      if (total <= 0) { res.status(200).json({ ok: false, error: "nothing to claim yet" }); return; }

      const method = String(body.method || "cash");
      let claimed = 0;
      // Zero each partner-program that carries a positive balance.
      for (const b of balances || []) {
        const amt = round2(b.balance_amount);
        if (amt <= 0) continue;
        await db.insert("redemptions", { partner_id: b.partner_id, amount: amt, method, status: "requested" });
        // Matching ledger entry so partner_balances drops to 0 (guards re-claim).
        await db.insert("minutes_ledger", {
          partner_id: b.partner_id, kind: "redeemed", minutes: 0, amount: -amt, note: "payout requested",
        });
        claimed += amt;
      }
      res.status(200).json({ ok: true, claimed: round2(claimed), status: "requested" });
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
    const ledger = await db.select(
      "minutes_ledger",
      "partner_id=in." + inList(ids) +
        "&select=partner_id,kind,minutes,amount,note,created_at&order=created_at.desc&limit=60"
    );
    const claimed = (ledger || [])
      .filter((l) => l.kind === "redeemed")
      .reduce((a, l) => a + Math.abs(Number(l.amount || 0)), 0);

    const history = (ledger || []).map((l) => {
      const prog = progByPartner[l.partner_id];
      return {
        kind: l.kind,
        minutes: Number(l.minutes || 0),
        amount: l.amount == null ? null : Number(l.amount),
        note: l.note || "",
        product: prog ? prog.product_name : "",
        date: l.created_at,
      };
    });

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
      programs,
      history,
    });
  } catch (err) {
    console.error("[partner-portal] failed:", err && err.message);
    res.status(500).json({ error: err && err.message });
  }
};
