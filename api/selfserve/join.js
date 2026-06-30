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
    // Lazily create the program from the magic-link context (the team-side
    // persist will replace this once #8 builder-auth lands).
    const program = await db.upsert(
      "programs",
      { slug, product_name: productName, rate_per_min: rate },
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
    res.status(200).json({ ok: true, partnerId: partner.id, programId: program.id });
  } catch (err) {
    // Never block the opt-in on a backend hiccup — log and fall back.
    console.error("[join] persist failed:", err && err.message);
    res.status(200).json({ ok: true, simulated: true, error: err && err.message });
  }
};
