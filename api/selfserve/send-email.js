/* ============================================================
   Observant — send a REAL test email so the team sees the end-user experience.
   LIGHT mode: the question set inline, answered by REPLYING to the email
   (true in-email fill-in fields need AMP for email — a later upgrade).
   DEEP mode: an invitation to a ~10-min AI-guided session, with an async
   fallback. Sent via Resend. Needs RESEND_API_KEY (+ optional RESEND_FROM /
   RESEND_REPLY_TO).
   ============================================================ */
const { outboundReplyTo } = require("./_thread");

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const product = limit(payload.product, 100) || "your product";
    const question = limit(payload.question, 500);
    const toEmail = limit(payload.toEmail, 160);
    const exploration = Number(payload.exploration);
    const channel = ["email", "telegram"].includes(payload.channel) ? payload.channel : "email";
    const wishlist = limit(payload.wishlist, 500);
    const memory = limit(payload.memory, 1200);
    const context = limit(payload.context, 2000);
    const mode = payload.mode === "deep" ? "deep" : "light";
    const deepPlan = payload.deepPlan && typeof payload.deepPlan === "object" ? payload.deepPlan : null;
    const estMin = Math.max(1, Number(payload.estMin) || (mode === "deep" ? 10 : 4)); // pre-determined; ~$2/min
    const estPay = estMin * 2;
    if (!question) return res.status(200).json({ ok: false, error: "question is required" });
    if (!/.+@.+\..+/.test(toEmail)) return res.status(200).json({ ok: false, error: "a valid test email is required" });

    const base = "https://" + req.headers.host;
    const exp = isFinite(exploration) ? exploration : 0.5;
    // One ongoing thread per person → one stable, relationship-level subject (so every loop groups together).
    const threadSubject = "Your line to the " + product + " team";

    // C1 — the light question set (light delivery, and deep's async fallback).
    const t = await callSelf(base, { action: "translate", product, question, wishlist, memory, context });
    const plan = (t && t.plan) || { essence: question, questions: [question], subject: "A couple questions from the " + product + " team" };

    let subject, body, html, emailText;

    if (mode === "deep") {
      subject = threadSubject;
      const essence = (deepPlan && deepPlan.essence) || plan.essence || question;
      // async fallback: the light set, opened on the hosted form
      const lightState = { product, question, exploration: exp, channel, wishlist, memory, context, toEmail, subject: threadSubject, estMin, accruedMinutes: 0, messages: [{ role: "assistant", content: lightMessageFromPlan(product, plan) }] };
      const answerUrl = base + "/app/Answer.html?d=" + encodeState(lightState);
      const introUrl = base + "/app/IntroCall.html?product=" + encodeURIComponent(product) + "&d=" + encodeState({ product, mode: "deep", essence: essence, threads: (deepPlan && deepPlan.threads) || [] });
      const manageUrl = base + "/app/Manage.html?d=" + encodeState({ product, contact: toEmail });
      body = deepInviteText(product, essence, introUrl, answerUrl, manageUrl);
      html = deepInviteHtml(product, essence, introUrl, answerUrl, manageUrl);
      emailText = body;
      if (!process.env.RESEND_API_KEY) return res.status(200).json({ ok: false, needKey: true, mode, subject, body: emailText, to: toEmail });
      // reply_to encodes the async-fallback thread state, so a mail-client reply continues it.
      const r = await resendSend(toEmail, subject, html, emailText, lightState);
      if (!r.ok) return res.status(200).json({ ok: false, error: r.error, mode, subject, body, to: toEmail });
      return res.status(200).json({ ok: true, id: r.id, mode, subject, body, to: toEmail });
    }

    // LIGHT — compose the professional opening (C2), answered by replying inline.
    const turn = await callSelf(base, { action: "turn", product, channel, exploration: exp, plan, wishlist, memory, context, messages: [] });
    subject = threadSubject;
    body = stripSubjectLine((turn && turn.message) || lightMessageFromPlan(product, plan));
    const manageUrl = base + "/app/Manage.html?d=" + encodeState({ product, contact: toEmail });
    emailText = body + lightFooterText(manageUrl);
    html = lightInlineHtml(body, manageUrl);
    if (!process.env.RESEND_API_KEY) return res.status(200).json({ ok: false, needKey: true, mode, subject, body: emailText, to: toEmail });
    // Thread state for inbound replies: the assistant's opening is the last message,
    // so inbound.js can append the user's reply and run the same continuation.
    const lightThreadState = { product, question, exploration: exp, channel, wishlist, memory, context, toEmail, subject: threadSubject, estMin, accruedMinutes: 0, messages: [{ role: "assistant", content: body }] };
    const r = await resendSend(toEmail, subject, html, emailText, lightThreadState);
    if (!r.ok) return res.status(200).json({ ok: false, error: r.error, mode, subject, body, to: toEmail });
    return res.status(200).json({ ok: true, id: r.id, mode, subject, body, to: toEmail });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

async function resendSend(toEmail, subject, html, text, replyToState) {
  const payload = {
    from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>",
    to: [toEmail],
    subject,
    html,
    text,
  };
  // Thread-encoding reply_to so a mail-client reply routes back to this
  // conversation; falls back to RESEND_REPLY_TO when no inbound domain is set.
  const replyTo = replyToState ? outboundReplyTo(replyToState) : String(process.env.RESEND_REPLY_TO || "").trim();
  if (replyTo) payload.reply_to = replyTo;

  const send = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!send.ok) { const detail = await send.text(); return { ok: false, error: "Resend " + send.status + ": " + detail.slice(0, 240) }; }
  const data = await send.json();
  return { ok: true, id: data.id };
}

async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

// C2 sometimes echoes a literal "Subject: ..." line into the body — the email
// already has a subject header, so strip any leading one.
function stripSubjectLine(s) {
  return String(s || "")
    .replace(/^\s*subject:.*(\r?\n)+/i, "")
    .replace(/\[\s*(?:first\s*)?name\s*\]/gi, "there")  // unfilled "Hi [Name]," placeholder
    .trim();
}
function lightMessageFromPlan(product, plan) {
  const qs = (plan.questions || []).map((q, i) => (i + 1) + ". " + q).join("\n");
  return "A couple of quick questions from the " + product + " team:\n\n" + qs;
}

/* ---- LIGHT: answer by replying inline ---- */
function lightFooterText(manageUrl) {
  return "\n\n———\nJust reply to this email with your answers — write right under each question. And this is a two-way line: reply anytime something goes wrong or you want to share feedback, not only when we ask. As a feedback partner, your team gets a product discount, early access, and a real say in the roadmap." +
    (manageUrl ? "\n\nChange how often, pause, or opt out anytime: " + manageUrl : "");
}
function lightInlineHtml(body, manageUrl) {
  const bodyHtml = "<p style=\"margin:0 0 14px\">" + esc(body).replace(/\n\n+/g, "</p><p style=\"margin:0 0 14px\">").replace(/\n/g, "<br>") + "</p>";
  return shell(
    bodyHtml +
    '<div style="margin:20px 0;padding:12px 14px;background:#f4efe6;border:1px solid #e6ddcb;border-radius:10px;font-size:14px;color:#5a5347">↩︎ <b>Just reply to this email</b> with your answers — write right under each question.<br><span style="color:#8a857c">It\'s a two-way line — reach out anytime something breaks or you have feedback, not only when we ask.</span></div>' +
    rewardNote() + manageLink(manageUrl)
  );
}

/* ---- DEEP: invitation to the live session, with an async fallback ---- */
function deepInviteText(product, essence, introUrl, answerUrl, manageUrl) {
  return "Hi,\n\n" +
    "The " + product + " team would love to go a little deeper on something — a short conversation, about 10 minutes, guided by our AI interviewer, whenever suits you. No prep needed; you can use voice or just type.\n\n" +
    "▶ Start the conversation: " + introUrl + "\n\n" +
    "Short on time? You can answer a few quick questions async instead:\n→ " + answerUrl + "\n\n" +
    "As a feedback partner, your team gets a product discount, early access, and a real say in the roadmap — this is about the relationship, not a payout.\n\n" +
    "And this is a two-way line: reach out anytime something goes wrong or you've got product feedback — not just when we ask." +
    (manageUrl ? "\n\nChange how often, pause, or opt out anytime: " + manageUrl : "");
}
function deepInviteHtml(product, essence, introUrl, answerUrl, manageUrl) {
  return shell(
    '<p style="margin:0 0 14px">Hi,</p>' +
    '<p style="margin:0 0 14px">The <b>' + esc(product) + '</b> team would love to go a little deeper on something — a short conversation, about <b>10 minutes</b>, guided by our AI interviewer, whenever suits you. No prep needed; use voice or just type.</p>' +
    '<div style="margin:22px 0"><a href="' + esc(introUrl) + '" style="display:inline-block;background:#b4532a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Start the conversation →</a></div>' +
    '<p style="margin:0 0 14px;font-size:14px;color:#5a5347">Short on time? <a href="' + esc(answerUrl) + '" style="color:#b4532a">Answer a few quick questions async instead →</a></p>' +
    '<p style="margin:0 0 6px;font-size:13px;color:#8a857c">And it\'s a two-way line — reach out anytime something goes wrong or you have feedback, not just when we ask.</p>' +
    rewardNote() + manageLink(manageUrl)
  );
}
function manageLink(manageUrl) {
  if (!manageUrl) return "";
  return '<p style="font-size:12px;color:#8a857c;margin:14px 0 0;border-top:1px solid #eee7da;padding-top:10px"><a href="' + esc(manageUrl) + '" style="color:#8a857c">Change how often, pause, or opt out</a></p>';
}

function rewardNote() {
  return '<p style="font-size:13px;color:#8a857c;margin:14px 0 0">As a feedback partner, your team gets a product discount, early access, and a real say in the roadmap. Long-time partners get extra perks — events and time with the founding team.</p>';
}
function shell(inner) {
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#24221e;max-width:560px">' + inner + '</div>';
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("Payload too large"); }
  return b ? JSON.parse(b) : {};
}
function limit(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
function encodeState(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
