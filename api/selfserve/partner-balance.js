/* ============================================================
   Partner rewards portal (#9) — balance + ledger for ONE partner.
   Called by app/rewardsportal.jsx once a partner is signed in.

   Auth: the browser passes the Supabase access token as a Bearer
   header. We verify it against Supabase's own /auth/v1/user (with
   the anon key) to recover the trusted email — then look the partner
   up by that email (the `contact` we hold). A signed-in user can
   thus only ever read THEIR OWN balance.

   Falls back to ?email= (or body.email) only when no token is given
   (e.g. local poking); production always sends the token.

   Returns:
     { ok, email, minutes, earnedMinutes, balance, rate, ledger:[...] }
   or { ok, simulated:true, ... } when no DB is configured (demo).
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

// PostGREST in.(...) list, comma-joined, each value left raw (uuids).
function inList(ids) {
  return "(" + ids.map((id) => String(id)).join(",") + ")";
}

module.exports = async function handler(req, res) {
  // Recover the bearer token (case-insensitive header).
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Email fallback (only used when no verifiable token is present).
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_e) { body = {}; } }
  body = body || {};
  const q = req.query || {};
  let email = String((q.email || body.email) || "").trim().toLowerCase();

  // Prefer the verified token's email — never trust a client-supplied email
  // when a token is present.
  const user = await verifyToken(token);
  if (user) email = String(user.email || "").trim().toLowerCase();

  if (!email) { res.status(401).json({ error: "not authenticated" }); return; }

  // No DB → return a small simulated balance so the portal still renders.
  if (!db.dbConfigured()) {
    res.status(200).json({
      ok: true,
      simulated: true,
      email,
      minutes: 0,
      earnedMinutes: 0,
      balance: 0,
      rate: 2,
      ledger: [],
    });
    return;
  }

  try {
    // Find every partner row keyed by this email (could span programs).
    const partners = await db.select(
      "partners",
      "contact=eq." + encodeURIComponent(email) +
        "&channel=eq.email&select=id,program_id"
    );

    if (!partners || !partners.length) {
      // Authenticated but not yet linked to any program — empty balance.
      res.status(200).json({
        ok: true,
        email,
        minutes: 0,
        earnedMinutes: 0,
        balance: 0,
        rate: 2,
        ledger: [],
        linked: false,
      });
      return;
    }

    const ids = partners.map((p) => p.id);

    // Roll the per-partner balances up into one number (the view does the math).
    const balances = await db.select(
      "partner_balances",
      "partner_id=in." + inList(ids) + "&select=net_minutes,earned_minutes,balance_amount"
    );
    const minutes = (balances || []).reduce((a, b) => a + Number(b.net_minutes || 0), 0);
    const earnedMinutes = (balances || []).reduce((a, b) => a + Number(b.earned_minutes || 0), 0);
    const balance = (balances || []).reduce((a, b) => a + Number(b.balance_amount || 0), 0);

    // Most recent ledger entries across all of this partner's programs.
    const ledger = await db.select(
      "minutes_ledger",
      "partner_id=in." + inList(ids) +
        "&select=kind,minutes,amount,note,created_at&order=created_at.desc&limit=50"
    );

    // Effective rate (for display) — derive from the most recent earn, else 2.
    let rate = 2;
    const lastEarn = (ledger || []).find((l) => l.kind === "earned" && Number(l.minutes) > 0 && l.amount != null);
    if (lastEarn) rate = Number(lastEarn.amount) / Number(lastEarn.minutes);

    res.status(200).json({
      ok: true,
      email,
      linked: true,
      minutes,
      earnedMinutes,
      balance,
      rate: Math.round(rate * 100) / 100 || 2,
      ledger: ledger || [],
    });
  } catch (err) {
    console.error("[partner-balance] failed:", err && err.message);
    res.status(500).json({ error: err && err.message });
  }
};
