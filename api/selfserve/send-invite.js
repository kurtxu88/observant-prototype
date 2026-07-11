/* Sends a REAL preview of the invitation email (the recruit message the team
   wrote) to a test address via Resend. Used by the setup review step. */
module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const payload = await readJson(req);
    const product = limit(payload.product, 100) || "the product";
    const toEmail = limit(payload.toEmail, 160);
    const body = String(payload.body || "").slice(0, 6000).trim();
    const joinUrl = limit(payload.joinUrl, 400);
    if (!/.+@.+\..+/.test(toEmail)) return res.status(200).json({ ok: false, error: "a valid email is required" });
    if (!body) return res.status(200).json({ ok: false, error: "invitation text is empty" });

    const subject = "You're invited — " + product + " feedback partner program";
    const text = body + (joinUrl ? "\n\nJoin here → " + joinUrl : "");
    if (!process.env.RESEND_API_KEY) return res.status(200).json({ ok: false, needKey: true });

    const emailPayload = { from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>", to: [toEmail], subject: subject, text: text };
    const replyTo = String(process.env.RESEND_REPLY_TO || "").trim();
    if (replyTo) emailPayload.reply_to = replyTo;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    });
    if (!send.ok) return res.status(200).json({ ok: false, error: "Resend " + send.status + ": " + (await send.text()).slice(0, 200) });
    return res.status(200).json({ ok: true, to: toEmail });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) { if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("too large"); } return b ? JSON.parse(b) : {}; }
function limit(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
