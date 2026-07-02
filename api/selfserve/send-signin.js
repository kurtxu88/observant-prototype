/* Sends the feedback-partner's rewards-portal SIGN-IN LINK via OUR OWN Resend
   (from RESEND_FROM — a verified sending domain), instead of Supabase's flaky
   built-in magic-link mailer. We still mint a REAL Supabase magic link server-
   side (admin generate_link), then deliver it ourselves so it actually arrives.
   Bare-serverless, mirrors send-invite.js: always 200-ish JSON, never throws. */
module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });
  try {
    const payload = await readJson(req);
    const email = limit(payload.email, 160);
    const product = limit(payload.product, 100) || "the product";
    if (!email.includes("@")) return res.status(200).json({ ok: false, error: "a valid email is required" });

    // No admin key or no mailer → don't crash, don't falsely claim a send.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY) {
      return res.status(200).json({ ok: true, simulated: true });
    }

    // 1) Mint a REAL Supabase magic link server-side (admin API). Tolerate a
    //    pasted SUPABASE_URL with a trailing slash and/or "/rest/v1" suffix.
    const sbUrl = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const gen = await fetch(sbUrl + "/auth/v1/admin/generate_link", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + svcKey,
        apikey: svcKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "magiclink",
        email: email,
        options: { redirect_to: "https://www.observanthq.com/rewards" },
      }),
    });
    if (!gen.ok) {
      return res.status(200).json({ ok: false, error: "Supabase " + gen.status + ": " + (await gen.text()).slice(0, 200) });
    }
    const gd = await gen.json();
    const actionLink = (gd && (gd.action_link || (gd.properties && gd.properties.action_link))) || "";
    if (!actionLink) return res.status(200).json({ ok: false, error: "no sign-in link returned" });

    // 2) Deliver that link via OUR OWN Resend (same call as send-invite.js).
    //    This is the welcome/confirmation email — it carries the rewards widget
    //    (the "Track & claim your rewards →" CTA into their portal).
    const subject = "You're a " + product + " feedback partner";
    const text =
      "You're in — you're now a " + product + " feedback partner.\n\n" +
      "Your minutes and rewards are tracked automatically from your very first reply. " +
      "Track and claim your rewards here:\n\n" +
      actionLink + "\n\n" +
      "Sign in anytime to see your minutes add up and claim your rewards.";
    const html = welcomeHtml(product, actionLink);

    const emailPayload = { from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>", to: [email], subject: subject, html: html, text: text };
    const replyTo = String(process.env.RESEND_REPLY_TO || "").trim();
    if (replyTo) emailPayload.reply_to = replyTo;

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    });
    if (!send.ok) return res.status(200).json({ ok: false, error: "Resend " + send.status + ": " + (await send.text()).slice(0, 200) });
    return res.status(200).json({ ok: true, sent: true });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

function welcomeHtml(product, actionLink) {
  const p = esc(product);
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#24221e;max-width:560px">' +
    '<p style="margin:0 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#8a857c">You\'re in</p>' +
    '<p style="margin:0 0 14px;font-size:18px;font-weight:600">You\'re a <b>' + p + '</b> feedback partner.</p>' +
    '<p style="margin:0 0 14px">Your minutes and rewards are tracked automatically from your very first reply.</p>' +
    '<div style="margin:22px 0"><a href="' + esc(actionLink) + '" style="display:inline-block;background:#b4532a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Track &amp; claim your rewards →</a></div>' +
    '<p style="font-size:13px;color:#8a857c;margin:14px 0 0">Sign in anytime to see your minutes add up and claim your rewards.</p>' +
    '</div>';
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) { if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("too large"); } return b ? JSON.parse(b) : {}; }
function limit(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
