/* ============================================================
   Observant — SEND A LOOP FOR REAL to the program's enrolled off-product
   feedback partners. This is the "Send to your users" action in the compose
   flow (distinct from send-email.js's "send yourself a test").

   It resolves the program by slug (from the product name), loads its ACTIVE
   partners, and dispatches the loop to each on their channel — reusing the
   real send path (email → send-email.js's C1-translate → Resend + thread
   persistence; telegram → /api/telegram/send). Best-effort per partner.

   Degrades cleanly with NO DB / NO KEYS (sample/demo mode): never throws,
   returns { ok:true, simulated:true, count } so the UI still completes and
   confirms. count = partners we WOULD reach when we can't actually send.
   ============================================================ */
const db = require("../_db");

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const product = limit(payload.product, 100) || "your product";
    const question = limit(payload.question, 500);
    const mode = payload.mode === "deep" ? "deep" : "light";
    const exploration = Number(payload.exploration);
    const wishlist = limit(payload.wishlist, 500);
    const memory = limit(payload.memory, 1200);
    const context = limit(payload.context, 2000);
    const deepPlan = payload.deepPlan && typeof payload.deepPlan === "object" ? payload.deepPlan : null;
    const estMin = payload.estMin != null && isFinite(Number(payload.estMin)) ? Number(payload.estMin) : undefined;
    if (!question) return res.status(200).json({ ok: false, error: "question is required" });

    // No DB → no real panel to reach (sample/demo). Degrade cleanly.
    if (!db.dbConfigured()) {
      return res.status(200).json({ ok: true, simulated: true, count: 0, reason: "db-not-configured" });
    }

    // Resolve the program by slug (same slug rule as send-email.js's persistOutbound).
    const slug = String(product || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const programs = slug
      ? await safe(() => db.select("programs", "slug=eq." + encodeURIComponent(slug) + "&select=id,slug,product_name&limit=1"), [])
      : [];
    const program = Array.isArray(programs) && programs[0];
    if (!program) {
      return res.status(200).json({ ok: true, simulated: true, count: 0, reason: "no-program" });
    }

    // The enrolled, still-active partners for this program.
    const partners = await safe(
      () => db.select("partners", "program_id=eq." + program.id + "&status=eq.active&select=id,channel,contact&order=created_at.asc"),
      []
    );
    const list = Array.isArray(partners) ? partners : [];
    if (!list.length) {
      return res.status(200).json({ ok: true, simulated: true, count: 0, reason: "no-partners" });
    }

    // No email provider → we know WHO we'd reach, but can't send for real.
    if (!process.env.RESEND_API_KEY) {
      return res.status(200).json({ ok: true, simulated: true, count: list.length, reason: "no-email-key" });
    }

    const base = "https://" + (req.headers.host || process.env.VERCEL_URL || "");
    const loop = { product: program.product_name || product, question, mode, exploration, wishlist, memory, context, deepPlan, estMin };
    let sent = 0;
    const errors = [];
    for (const partner of list) {
      const r = await dispatch(base, partner, loop);
      if (r.ok) sent++;
      else errors.push({ partner: partner.id, error: r.error });
    }
    if (!sent) {
      return res.status(200).json({ ok: true, simulated: true, count: list.length, reason: "no-delivery", errors: errors.slice(0, 5) });
    }
    return res.status(200).json({ ok: true, simulated: false, count: sent, considered: list.length, errors: errors.slice(0, 5) });
  } catch (error) {
    // Never hard-fail the compose flow — degrade to simulated.
    return res.status(200).json({ ok: true, simulated: true, count: 0, error: String((error && error.message) || error) });
  }
};

/* ---- dispatch one loop to one partner on their channel (best-effort) ---- */
async function dispatch(base, partner, loop) {
  if (partner.channel === "telegram") {
    try {
      const r = await fetch(base + "/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: partner.contact, text: loop.question, product: loop.product }),
      });
      return r.ok ? { ok: true } : { ok: false, error: "telegram/send " + r.status };
    } catch (e) {
      return { ok: false, error: "telegram unavailable: " + String((e && e.message) || e) };
    }
  }

  // email (default) — reuse the real send-email loop (C1 translate → Resend + thread persist).
  try {
    const r = await fetch(base + "/api/selfserve/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: loop.product,
        question: loop.question,
        toEmail: partner.contact,
        channel: "email",
        exploration: loop.exploration,
        wishlist: loop.wishlist,
        memory: loop.memory,
        context: loop.context,
        mode: loop.mode,
        deepPlan: loop.deepPlan,
        estMin: loop.estMin,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (data && data.ok) return { ok: true };
    if (data && data.needKey) return { ok: false, error: "no-email-key" };
    return { ok: false, error: (data && data.error) || ("send-email " + r.status) };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/* ---- helpers ---- */
async function safe(fn, fallback) { try { return await fn(); } catch (_e) { return fallback; } }
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("Payload too large"); }
  return b ? JSON.parse(b) : {};
}
function limit(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
