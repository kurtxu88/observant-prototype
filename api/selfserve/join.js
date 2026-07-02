/* ============================================================
   Off-product #2 — partner join / opt-in (persistence).
   Called when a user opts into a feedback program from the
   magic-link page (app/join.jsx). Lazily upserts the program
   (by slug) and inserts the partner record.

   POST body: { slug, productName, rate, channel, contact, cadence }
   Returns:   { ok, partnerId, programId }  — or { ok, simulated:true }
              when no DB is configured (so the demo keeps working).

   NOTE: magic-link / Google sign-in for the partner account lives in
   #9 (partner portal). This endpoint just records the opt-in.
   ============================================================ */
const db = require("../_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_e) { body = {}; } }
  body = body || {};

  const slug = String(body.slug || "").trim().toLowerCase();
  const productName = String(body.productName || "").trim() || (slug ? slug : "your product");
  const channel = String(body.channel || "").trim();
  const contact = String(body.contact || "").trim();
  const cadence = ["open", "occasional", "rare"].includes(body.cadence) ? body.cadence : "occasional";
  const rate = Number(body.rate) > 0 ? Number(body.rate) : 2;

  if (!slug) { res.status(400).json({ error: "missing program slug" }); return; }
  if (!["email", "telegram", "inproduct"].includes(channel)) { res.status(400).json({ error: "invalid channel" }); return; }
  if (channel !== "inproduct" && !contact) { res.status(400).json({ error: "missing contact" }); return; }

  // No DB yet → succeed as a no-op so the magic-link flow still works in the demo.
  if (!db.dbConfigured()) { res.status(200).json({ ok: true, simulated: true }); return; }

  try {
    // Resolve ownership (account/workspace) by the same slug, best-effort.
    const owner = await resolveOwnership(slug);
    // Lazily create the program from the magic-link context (the team-side
    // persist will replace this once #8 builder-auth lands).
    const program = await db.upsert(
      "programs",
      Object.assign({ slug, product_name: productName, rate_per_min: rate }, owner),
      "slug"
    );
    // Insert the partner; on repeat opt-in, merge (keep one row per contact).
    const partner = await db.upsert(
      "partners",
      {
        program_id: program.id,
        channel,
        contact: contact || "pending",
        cadence,
        status: "active",
        consent_at: new Date().toISOString(),
      },
      "program_id,channel,contact"
    );

    // EMAIL parity with Telegram's /start: open the relationship thread and get a
    // first question out, so an email partner lands on a live thread, not silence.
    // (Telegram opens the convo + persists + sends a welcome in webhook.js /start;
    // email had no equivalent — it just recorded the opt-in.) Best-effort: never
    // block the opt-in on delivery. inproduct has no push channel; telegram opts
    // in through the webhook, so this only runs for email.
    if (channel === "email" && partner && partner.id) {
      const base = "https://" + (req.headers.host || process.env.VERCEL_URL || "");
      const intro = introOpener(productName);
      // Real send (send-email opens the convo + persists + delivers when a key is set).
      const delivered = await sendIntroLoop(base, productName, contact, intro);
      // No key / send failed → still open the thread + log the opener directly, so
      // the partner has a documented first question regardless of delivery.
      if (!delivered) await openThreadWithIntro(partner.id, productName, intro);
    }

    res.status(200).json({ ok: true, partnerId: partner.id, programId: program.id });
  } catch (err) {
    // Never block the opt-in on a backend hiccup — log and fall back.
    console.error("[join] persist failed:", err && err.message);
    res.status(200).json({ ok: true, simulated: true, error: err && err.message });
  }
};

// The intro first loop for a fresh email partner — a genuine opener, not filler.
function introOpener(productName) {
  const p = productName || "the product";
  return "Welcome to the " + p + " feedback line — glad you're here. To kick things off: " +
    "what made you start using " + p + ", and how has it been going for you so far?";
}

// Fire the intro loop through the real send-email path (C1 translate → Resend),
// which also opens the conversation + persists the outbound. Returns true only on
// a confirmed send, so callers can fall back to a direct thread write otherwise.
// Best-effort — never throws.
async function sendIntroLoop(base, productName, toEmail, question) {
  try {
    const r = await fetch(base + "/api/selfserve/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: productName, question, toEmail, channel: "email", mode: "light" }),
    });
    const data = await r.json().catch(() => ({}));
    return !!(data && data.ok);
  } catch (_e) { return false; }
}

// Fallback (no email key / send failed): open the partner's ONE thread and persist
// the opener as the first 'observant' message, mirroring telegram/webhook.js /start.
// So the email partner still has a thread + first question — never silence.
async function openThreadWithIntro(partnerId, productName, intro) {
  try {
    if (!db.dbConfigured() || !partnerId || !String(intro || "").trim()) return;
    const open = await db.select("conversations", "partner_id=eq." + partnerId + "&status=eq.open&select=id&order=last_active_at.desc&limit=1");
    let conv = (Array.isArray(open) && open[0]) ? open[0] : null;
    if (!conv) conv = await db.insert("conversations", { partner_id: partnerId, subject: "Your line to the " + (productName || "product") + " team", mode: "intro", status: "open" });
    if (!conv || !conv.id) return;
    await db.insert("messages", { conversation_id: conv.id, sender: "observant", body: String(intro).slice(0, 8000), minutes: 0 });
    await db.update("conversations", "id=eq." + conv.id, { last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[join] intro persist failed:", e && e.message); }
}

// Resolve the owning workspace by slug and return { workspace_id, account_id } to
// stamp onto the program. Best-effort: returns {} if the workspaces table doesn't
// exist yet (migration not run) or no workspace matches the slug, so callers proceed
// exactly as before (owner columns left null). Never throws.
async function resolveOwnership(slug) {
  try {
    if (!db.dbConfigured() || !slug) return {};
    const rows = await db.select("workspaces", "slug=eq." + encodeURIComponent(slug) + "&select=id,account_id&order=created_at.asc&limit=1");
    const ws = Array.isArray(rows) && rows[0];
    if (!ws) return {};
    const out = { workspace_id: ws.id };
    if (ws.account_id) out.account_id = ws.account_id;
    return out;
  } catch (e) { return {}; }
}
