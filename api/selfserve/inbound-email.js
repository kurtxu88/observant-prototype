/* ============================================================
   Observant — TRUE two-way email loop (Build #4).
   Resend INBOUND webhook: when a partner *replies to an Observant
   email*, that reply lands here and continues the 1:1 loop using the
   DB-persisted conversation (send-email.js + reply.js write it).

   Flow (mirrors reply.js's submit path, but driven by a real email):
     1. parse the inbound email (from-address + plain-text reply,
        quoted history stripped)
     2. resolve the partner by from-email (channel='email'); load their
        open conversation + recent messages from the DB
     3. run the reply through the quality gate, then the interview `turn`
        (POST /api/selfserve/interview, exactly like reply.js)
     4. on PASS, award the PRE-DETERMINED minutes to minutes_ledger
        (reuse reply.js's pattern), persist the in/out messages, and
        send the next question by email (reuse the Resend call)

   No-ops gracefully without SUPABASE_* (can't resolve a partner) or
   RESEND_API_KEY (can't send the follow-up). Always answers 200 so
   Resend doesn't retry-storm.

   Register: Resend → Inbound on a VERIFIED domain → webhook URL
     https://<host>/api/selfserve/inbound-email
   Optional: RESEND_WEBHOOK_SECRET (Svix) for signature verification.
   ============================================================ */
const crypto = require("crypto");
const db = require("../_db");
const alerts = require("./_alerts");
const layout = require("./_email-layout");

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    // Optional shared secret for the Cloudflare Email Worker path (set INBOUND_SECRET in both places).
    const inboundSecret = String(process.env.INBOUND_SECRET || "").trim();
    if (inboundSecret && req.headers["x-inbound-secret"] !== inboundSecret) {
      return res.status(401).json({ ok: false, error: "bad inbound secret" });
    }
    const raw = await readRaw(req);
    if (!verifySignature(req, raw)) return res.status(401).json({ ok: false, error: "bad signature" });
    const payload = parseJson(raw);

    // Resend wraps the email in { type, data:{...} }; tolerate a few shapes.
    const evt = (payload && (payload.data || payload.email || payload)) || {};
    const fromEmail = parseAddress(evt.from || evt.sender || (payload && payload.from));
    const rawText = pickText(evt) || pickText(payload) || "";
    const inboundText = stripQuoted(rawText);

    if (!fromEmail || !inboundText) return res.status(200).json({ ok: true, ignored: "no sender or empty reply" });
    if (!db.dbConfigured()) return res.status(200).json({ ok: true, ignored: "no DB — can't resolve partner" });

    const base = "https://" + req.headers.host;

    // ---- resolve partner + conversation by from-email ----
    const resolved = await resolvePartner(fromEmail);
    if (!resolved) return res.status(200).json({ ok: true, ignored: "unknown sender: " + fromEmail });
    const { partner, program, conversation } = resolved;
    const rate = Number(program.rate_per_min) || 2;

    // ---- load recent history, rebuild the interview message list ----
    const history = await db.select(
      "messages",
      "conversation_id=eq." + conversation.id + "&select=sender,body,minutes,created_at&order=created_at.asc&limit=20"
    );
    const hist = (Array.isArray(history) ? history : []).map((m) => ({
      role: m.sender === "observant" ? "assistant" : "user",
      content: String(m.body || ""),
    }));
    const lastObservant = [...hist].reverse().find((m) => m.role === "assistant");
    const parsed = parseNumbered(lastObservant ? lastObservant.content : "");
    const priorEmails = hist.filter((m) => m.role === "assistant").length;
    const messages = hist.concat([{ role: "user", content: inboundText }]).slice(-8);

    // ---- quality gate (same assessor reply.js uses): does this EARN the reward? ----
    const qa = await callSelf(base, { action: "quality", product: program.product_name, questions: parsed.questions, answers: [inboundText] });
    const verdict = (qa && ["pass", "partial", "fail"].includes(qa.overall)) ? qa.overall : "pass";

    // Always log the inbound reply, even if it doesn't (yet) pass.
    const earned = verdict === "pass";
    const minutes = earned ? Math.max(1, estLoopMin(parsed.questions)) : 0;   // PRE-DETERMINED reward (never time-on-page)
    await persistMsg(conversation.id, "partner", inboundText, minutes);

    // Team update — urgent alert if this reply reads negative/churny (best-effort, non-blocking).
    try { await alerts.maybeAlert({ base, slug: program.slug, kind: "reply", product: program.product_name, channel: "email", name: fromEmail, partnerId: partner.id, quote: inboundText }); } catch (_e) {}

    if (!earned) {
      // No reward yet — leave the conversation open; the partner can add more in a reply.
      return res.status(200).json({ ok: true, earned: false, verdict, partner: partner.id });
    }

    // PASS → append the PRE-DETERMINED minutes to the ledger (audit = quality verdict).
    await db.insert("minutes_ledger", {
      partner_id: partner.id,
      conversation_id: conversation.id,
      kind: "earned",
      minutes,
      amount: Math.round(minutes * rate * 100) / 100,
      quality_verdict: qa || null,
      note: "inbound email reply",
    });

    // HARD CAP: one inquiry = the initial batch + AT MOST ONE follow-up. Then stop.
    if (priorEmails >= 2) {
      await setConvStatus(conversation.id, "paused");
      return res.status(200).json({ ok: true, earned: true, verdict, minutes, capped: true });
    }

    // The one allowed follow-up — tell the engine so it only asks if genuinely worth it.
    const turn = await callSelf(base, {
      action: "turn", product: program.product_name, channel: "email", final: priorEmails >= 1,
      plan: { essence: conversation.subject || program.product_name, subject: conversation.subject || ("Re: " + program.product_name) },
      messages,
    });
    const next = (turn && turn.message) || "";
    const decision = (turn && turn.decision) || "CONTINUE";

    if (decision === "SUFFICIENT" || decision === "PAUSE" || !next.trim()) {
      if (next.trim()) await persistMsg(conversation.id, "observant", next, 0);
      await setConvStatus(conversation.id, decision === "SUFFICIENT" ? "sufficient" : "paused");
      return res.status(200).json({ ok: true, earned: true, verdict, minutes, decision, done: true });
    }

    // continue: persist the follow-up and email it back (partner replies again → back to this webhook)
    await persistMsg(conversation.id, "observant", next, 0);
    const subject = "Re: " + (conversation.subject || program.product_name);
    const optOut = optOutUrl(base, { partnerId: partner.id, contact: fromEmail, product: program.product_name });
    const sent = await resendSend(fromEmail, subject, replyHtml(next, optOut, program.product_name), next + replyFooter(optOut, program.product_name));
    return res.status(200).json({ ok: true, earned: true, verdict, minutes, decision, sent });
  } catch (error) {
    // Never retry-storm: log and 200.
    console.error("[inbound-email] failed:", error && error.message);
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

/* ---------- partner / conversation resolution ----------
   Match on the from-email (channel='email'). A single email can belong to
   several programs → pick the partner whose conversation is most-recently
   active, preferring an OPEN one. If the matched conversation isn't open (or
   none exists), open a fresh one so the reply still has somewhere to land. */
async function resolvePartner(email) {
  const partners = await db.select(
    "partners",
    "contact=eq." + encodeURIComponent(email) + "&channel=eq.email&select=id,program_id"
  );
  if (!Array.isArray(partners) || !partners.length) return null;
  const ids = partners.map((p) => p.id);

  const convs = await db.select(
    "conversations",
    "partner_id=in.(" + ids.join(",") + ")&select=id,partner_id,subject,status,last_active_at&order=last_active_at.desc&limit=20"
  );
  const list = Array.isArray(convs) ? convs : [];
  let conversation = list.find((c) => c.status === "open") || list[0] || null;
  let partner = conversation ? partners.find((p) => p.id === conversation.partner_id) : partners[0];
  partner = partner || partners[0];

  if (!conversation || conversation.status !== "open") {
    conversation = await db.insert("conversations", { partner_id: partner.id, subject: (conversation && conversation.subject) || null, mode: "light", status: "open" });
  }

  const progs = await db.select("programs", "id=eq." + partner.program_id + "&select=id,slug,product_name,rate_per_min&limit=1");
  const program = (Array.isArray(progs) && progs[0]) || { product_name: "your product", rate_per_min: 2 };
  return { partner, program, conversation };
}

async function persistMsg(convId, sender, body, minutes) {
  try {
    if (!db.dbConfigured() || !convId || !String(body || "").trim()) return;
    await db.insert("messages", { conversation_id: convId, sender, body: String(body).slice(0, 8000), minutes: Number(minutes) || 0 });
    await db.update("conversations", "id=eq." + convId, { last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[inbound-email] persistMsg:", e && e.message); }
}
async function setConvStatus(convId, status) {
  try {
    if (!db.dbConfigured() || !convId) return;
    await db.update("conversations", "id=eq." + convId, { status, last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[inbound-email] setConvStatus:", e && e.message); }
}

/* ---------- the interview engine + Resend (same calls as reply.js) ---------- */
async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
async function resendSend(toEmail, subject, html, text) {
  if (!process.env.RESEND_API_KEY) return false;
  const payload = { from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>", to: [toEmail], subject, html, text };
  const replyTo = String(process.env.RESEND_REPLY_TO || "").trim();
  if (replyTo) payload.reply_to = replyTo;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return r.ok;
}

/* ---------- inbound email parsing ---------- */
function parseAddress(v) {
  const s = Array.isArray(v) ? v[0] : v;
  if (s && typeof s === "object") return String(s.address || s.email || s.value || "").trim().toLowerCase();
  const str = String(s || "");
  const m = str.match(/<([^>]+)>/);
  return (m ? m[1] : str).trim().toLowerCase();
}
function pickText(o) {
  if (!o || typeof o !== "object") return "";
  return String(o.text || o.plain || o["text/plain"] || (o.body && (o.body.text || o.body)) || "");
}
// Keep only the partner's freshly-typed reply, dropping quoted history + signatures.
function stripQuoted(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n");
  const markers = [
    /^>/,                                   // quoted lines
    /^\s*On .+wrote:\s*$/i,                  // "On <date> <name> wrote:"
    /^\s*On .+,.*<[^>]+>\s*wrote:/i,         // gmail variant w/ address
    /^-{2,}\s*Original Message\s*-{2,}/i,
    /^_{5,}/,
    /^\s*From:\s.+@.+/i,                     // forwarded header block
    /^Sent from my /i,
  ];
  const out = [];
  for (const line of text.split("\n")) {
    if (markers.some((re) => re.test(line))) break;
    out.push(line);
  }
  let body = out.join("\n").trim();
  body = body.replace(/\n-- \n[\s\S]*$/, "").trim();   // trailing "-- " signature
  return body || text.trim();
}

/* ---------- shared with reply.js (kept inline to stay bare-serverless) ---------- */
function stripMd(s) { return String(s || "").replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s*/gm, "").trim(); }
function parseNumbered(text) {
  const str = String(text || ""); const lines = str.split("\n"); const questions = []; let first = -1, last = -1;
  lines.forEach((raw, i) => { const m = raw.trim().match(/^(\d+)[.)]\s+(.*)/); if (m) { questions.push(stripMd(m[2])); if (first < 0) first = i; last = i; } });
  if (!questions.length) return { intro: stripMd(str), questions: [], outro: "" };
  return { intro: stripMd(lines.slice(0, first).join("\n")), questions, outro: stripMd(lines.slice(last + 1).join("\n")) };
}
// PRE-DETERMINED reward for a loop, from its shape (question count), never time-on-page.
function estLoopMin(questions) { const n = (Array.isArray(questions) ? questions.length : 0) || 1; return Math.max(2, Math.round(n * 1.5)); }

function replyFooter(optOut, product) { return "\n\n———\nJust reply to this email with your answer. Your minutes and rewards are tracked automatically — redeem on Observant anytime." + accountFooterText(optOut, product); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function replyHtml(body, optOut, product) {
  const parsed = parseNumbered(body);
  const intro = parsed.questions.length ? parsed.intro : body;
  const bodyHtml =
    layout.paragraphs(intro) +
    layout.questionBlock(parsed.questions) +
    (parsed.outro ? layout.paragraphs(parsed.outro) : "") +
    layout.calloutBox('↩︎ <b>Just reply to this email</b> with your answer.');
  const footerHtml =
    '<p style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#8a857c;margin:0 0 4px">You earn about $2 per minute you spend answering — tracked automatically. Redeem on Observant anytime.</p>' +
    accountFooterHtml(optOut, product);
  return layout.emailLayout({
    heading: "A quick follow-up from the " + product + " team",
    preheader: "One more question — just reply to this email to earn.",
    bodyHtml: bodyHtml,
    footerHtml: footerHtml,
  });
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

/* ---------- Svix (Resend) signature verification — optional ---------- */
function verifySignature(req, raw) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!secret) return true;                       // not configured → don't block (demo)
  try {
    const id = req.headers["svix-id"]; const ts = req.headers["svix-timestamp"]; const sigHeader = req.headers["svix-signature"];
    if (!id || !ts || !sigHeader || raw == null) return true;   // can't verify (e.g. pre-parsed body) → don't block
    const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = crypto.createHmac("sha256", key).update(id + "." + ts + "." + raw).digest("base64");
    return String(sigHeader).split(" ").some((p) => p.split(",")[1] === expected);
  } catch (_e) { return true; }
}

/* ---------- io ---------- */
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
function parseJson(raw) { if (raw && typeof raw === "object") return raw; try { return JSON.parse(String(raw || "") || "{}"); } catch (_e) { return {}; } }
async function readRaw(req) {
  // Prefer the raw body (needed for signature verification); fall back to a pre-parsed object.
  if (typeof req.body === "string") return req.body;
  if (req.body && typeof req.body === "object") return req.body;   // already parsed → verify is skipped
  let b = ""; for await (const c of req) { b += c; if (b.length > 300000) throw new Error("payload too large"); }
  return b;
}
