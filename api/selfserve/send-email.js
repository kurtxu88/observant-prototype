/* ============================================================
   Observant — send a REAL test email so the team sees the end-user experience.
   LIGHT mode: the question set inline, answered by REPLYING to the email
   (true in-email fill-in fields need AMP for email — a later upgrade).
   DEEP mode: an invitation to a ~10-min AI-guided session, with an async
   fallback. Sent via Resend. Needs RESEND_API_KEY (+ optional RESEND_FROM /
   RESEND_REPLY_TO).
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
      // Persist the conversation so a later EMAIL reply can be reconstructed (best-effort;
      // only when we're actually sending). The conversation id rides in the async-fallback link.
      const haveKey = !!process.env.RESEND_API_KEY;
      const conversationId = haveKey ? await persistOutbound({ product, toEmail, subject: threadSubject, mode: "deep", body: lightMessageFromPlan(product, plan) }) : null;
      // async fallback: the light set, opened on the hosted form
      const lightState = { product, question, exploration: exp, channel, wishlist, memory, context, toEmail, subject: threadSubject, estMin, accruedMinutes: 0, conversationId, messages: [{ role: "assistant", content: lightMessageFromPlan(product, plan) }] };
      const answerUrl = base + "/app/Answer.html?d=" + encodeState(lightState);
      const introUrl = base + "/app/IntroCall.html?product=" + encodeURIComponent(product) + "&d=" + encodeState({ product, mode: "deep", essence: essence, threads: (deepPlan && deepPlan.threads) || [] });
      const manageUrl = base + "/app/Manage.html?d=" + encodeState({ product, contact: toEmail });
      const optOut = optOutUrl(base, { contact: toEmail, product });
      body = deepInviteText(product, essence, introUrl, answerUrl, manageUrl, optOut);
      html = deepInviteHtml(product, essence, introUrl, answerUrl, manageUrl, optOut);
      emailText = body;
      if (!process.env.RESEND_API_KEY) return res.status(200).json({ ok: false, needKey: true, mode, subject, body: emailText, to: toEmail });
      const r = await resendSend(toEmail, subject, html, emailText);
      if (!r.ok) return res.status(200).json({ ok: false, error: r.error, mode, subject, body, to: toEmail });
      return res.status(200).json({ ok: true, id: r.id, mode, subject, body, to: toEmail });
    }

    // LIGHT — compose the professional opening (C2), answered by replying inline.
    const turn = await callSelf(base, { action: "turn", product, channel, exploration: exp, plan, wishlist, memory, context, messages: [] });
    subject = threadSubject;
    body = stripSubjectLine((turn && turn.message) || lightMessageFromPlan(product, plan));
    const manageUrl = base + "/app/Manage.html?d=" + encodeState({ product, contact: toEmail });
    const optOut = optOutUrl(base, { contact: toEmail, product });
    // Upfront, honest effort estimate: question count (via estMin) × $2/min. Leads the email.
    const estLine = "≈ " + estMin + " min · earn about $" + estPay;
    emailText = estLine + "\n\n" + body + lightFooterText(manageUrl) + accountFooterText(optOut, product);
    html = lightInlineHtml(body, manageUrl, estLine, optOut, product);
    if (!process.env.RESEND_API_KEY) return res.status(200).json({ ok: false, needKey: true, mode, subject, body: emailText, to: toEmail });
    // Persist the conversation so the partner's email REPLY can continue the loop (best-effort).
    await persistOutbound({ product, toEmail, subject: threadSubject, mode: "light", body });
    const r = await resendSend(toEmail, subject, html, emailText);
    if (!r.ok) return res.status(200).json({ ok: false, error: r.error, mode, subject, body, to: toEmail });
    return res.status(200).json({ ok: true, id: r.id, mode, subject, body, to: toEmail });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

async function resendSend(toEmail, subject, html, text) {
  const payload = {
    from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>",
    to: [toEmail],
    subject,
    html,
    text,
  };
  const replyTo = String(process.env.RESEND_REPLY_TO || "").trim();
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

// Persist the outbound loop so an email reply can be reconstructed later. Resolves/creates the
// program + partner (by program slug + channel='email' + contact=email), reuses the partner's
// open conversation if one exists (one ongoing thread per person) else opens one, and logs the
// outbound question as an 'observant' message. Returns the conversation id, or null on no-DB/error.
// Best-effort — never throws, so a backend hiccup can't block the send.
async function persistOutbound({ product, toEmail, subject, mode, body }) {
  try {
    if (!db.dbConfigured() || !toEmail) return null;
    const slug = String(product || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug) return null;
    const owner = await resolveOwnership(slug);
    const program = await db.upsert("programs", Object.assign({ slug, product_name: product, rate_per_min: 2 }, owner), "slug");
    // Don't clobber consent_at here (that's join.js's opt-in) — omit it so merge preserves it.
    const partner = await db.upsert("partners", { program_id: program.id, channel: "email", contact: toEmail, status: "active" }, "program_id,channel,contact");
    let conv = null;
    const open = await db.select("conversations", "partner_id=eq." + partner.id + "&status=eq.open&select=id&order=last_active_at.desc&limit=1");
    if (Array.isArray(open) && open[0]) conv = open[0];
    else conv = await db.insert("conversations", { partner_id: partner.id, subject: subject || null, mode: mode === "deep" ? "deep" : "light", status: "open" });
    await db.insert("messages", { conversation_id: conv.id, sender: "observant", body: String(body || "").slice(0, 8000), minutes: 0 });
    await db.update("conversations", "id=eq." + conv.id, { last_active_at: new Date().toISOString() });
    return conv.id;
  } catch (e) { console.error("[send-email] persist failed:", e && e.message); return null; }
}

// Resolve the owning workspace by slug → { workspace_id, account_id } to stamp onto
// the program. Best-effort: {} if the workspaces table is absent or no slug match,
// so the write proceeds exactly as before. Never throws.
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
  return "\n\n———\nJust reply to this email with your answers — write right under each question. And this is a two-way line: reply anytime something goes wrong or you want to share feedback, not only when we ask — genuine feedback earns rewards too. Your minutes and rewards are tracked automatically; redeem on Observant anytime." +
    (manageUrl ? "\n\nChange how often, pause, or opt out anytime: " + manageUrl : "");
}
function lightInlineHtml(body, manageUrl, estLine, optOut, product) {
  const bodyHtml = "<p style=\"margin:0 0 14px\">" + esc(body).replace(/\n\n+/g, "</p><p style=\"margin:0 0 14px\">").replace(/\n/g, "<br>") + "</p>";
  return shell(
    (estLine ? '<p style="margin:0 0 12px;font-size:14px"><b style="color:#b4532a">' + esc(estLine) + '</b></p>' : "") +
    bodyHtml +
    '<div style="margin:20px 0;padding:12px 14px;background:#f4efe6;border:1px solid #e6ddcb;border-radius:10px;font-size:14px;color:#5a5347">↩︎ <b>Just reply to this email</b> with your answers — write right under each question.<br><span style="color:#8a857c">It\'s a two-way line — reach out anytime something breaks or you have feedback, not only when we ask. Genuine feedback earns rewards too.</span></div>' +
    rewardNote() + manageLink(manageUrl) + accountFooterHtml(optOut, product)
  );
}

/* ---- DEEP: invitation to the live session, with an async fallback ---- */
function deepInviteText(product, essence, introUrl, answerUrl, manageUrl, optOut) {
  return "Hi,\n\n" +
    "The " + product + " team would love to go a little deeper on something — a short conversation, about 10 minutes, guided by our AI interviewer, whenever suits you. No prep needed; you can use voice or just type.\n\n" +
    "▶ Start the conversation: " + introUrl + "\n\n" +
    "Short on time? You can answer a few quick questions async instead:\n→ " + answerUrl + "\n\n" +
    "Either way your time is rewarded — about $2 per minute, tracked automatically. Redeem on Observant anytime.\n\n" +
    "And this is a two-way line: reach out anytime something goes wrong or you've got product feedback — not just when we ask. Genuine feedback you send earns rewards too." +
    (manageUrl ? "\n\nChange how often, pause, or opt out anytime: " + manageUrl : "") +
    accountFooterText(optOut, product);
}
function deepInviteHtml(product, essence, introUrl, answerUrl, manageUrl, optOut) {
  return shell(
    '<p style="margin:0 0 14px">Hi,</p>' +
    '<p style="margin:0 0 14px">The <b>' + esc(product) + '</b> team would love to go a little deeper on something — a short conversation, about <b>10 minutes</b>, guided by our AI interviewer, whenever suits you. No prep needed; use voice or just type.</p>' +
    '<div style="margin:22px 0"><a href="' + esc(introUrl) + '" style="display:inline-block;background:#b4532a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600">Start the conversation →</a></div>' +
    '<p style="margin:0 0 14px;font-size:14px;color:#5a5347">Short on time? <a href="' + esc(answerUrl) + '" style="color:#b4532a">Answer a few quick questions async instead →</a></p>' +
    '<p style="margin:0 0 6px;font-size:13px;color:#8a857c">And it\'s a two-way line — reach out anytime something goes wrong or you have feedback, not just when we ask. Genuine feedback earns rewards too.</p>' +
    rewardNote() + manageLink(manageUrl) + accountFooterHtml(optOut, product)
  );
}

/* ---- shared account/opt-out footer (client-facing, on EVERY email) ---- */
function optOutUrl(base, { partnerId, contact, product } = {}) {
  const qs = [];
  if (partnerId) qs.push("p=" + encodeURIComponent(partnerId));
  if (contact) qs.push("c=" + encodeURIComponent(contact));
  if (product) qs.push("product=" + encodeURIComponent(product));
  return base + "/api/selfserve/opt-out" + (qs.length ? "?" + qs.join("&") : "");
}
function accountFooterText(optOut, product) {
  return "\n\nLog in at partner.observanthq.com to check your minutes and rewards." +
    (optOut ? "\nOpt out of " + (product || "these") + " feedback: " + optOut : "");
}
function accountFooterHtml(optOut, product) {
  return '<p style="font-size:12px;color:#8a857c;margin:16px 0 0;border-top:1px solid #eee7da;padding-top:10px">Log in at <a href="https://partner.observanthq.com" style="color:#8a857c">partner.observanthq.com</a> to check your minutes and rewards.' +
    (optOut ? '<br><a href="' + esc(optOut) + '" style="color:#8a857c">Opt out' + (product ? " of " + esc(product) + " feedback" : "") + '</a>' : "") + "</p>";
}
function manageLink(manageUrl) {
  if (!manageUrl) return "";
  return '<p style="font-size:12px;color:#8a857c;margin:14px 0 0;border-top:1px solid #eee7da;padding-top:10px"><a href="' + esc(manageUrl) + '" style="color:#8a857c">Change how often, pause, or opt out</a></p>';
}

function rewardNote() {
  return '<p style="font-size:13px;color:#8a857c;margin:14px 0 0">You earn about $2 per minute you spend — tracked automatically. Track and redeem your rewards on Observant anytime.</p>';
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
