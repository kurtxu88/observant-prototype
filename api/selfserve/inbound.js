/* ============================================================
   Observant — INBOUND email webhook (Resend inbound).
   A user replies to a loop email from their own mail client; Resend
   forwards the parsed message here. We recover the conversation from
   the reply+<token>@<inbound-domain> address (see _thread.js), strip
   the quoted original + signature to get just the new reply, run it
   through the SAME engine continuation reply.js uses (action:"turn"),
   and send the next email.

   NOTE: this is correct, ready code, but it does NOT work end-to-end
   until external infra is configured: the inbound domain's MX records
   and a Resend inbound webhook pointed at /api/selfserve/inbound.

   Env: RESEND_API_KEY, RESEND_FROM, RESEND_INBOUND_DOMAIN
        (RESEND_REPLY_TO as the static fallback).
   ============================================================ */
const { encodeState, outboundReplyTo, stateFromInboundAddress } = require("./_thread");

// In-memory idempotency guard (best-effort; resets on cold start). The real
// build moves this to KV/DB so retries across instances are also deduped.
const SEEN = new Set();
function seen(id) {
  if (!id) return false;
  if (SEEN.has(id)) return true;
  SEEN.add(id);
  if (SEEN.size > 2000) { for (const k of SEEN) { SEEN.delete(k); if (SEEN.size <= 1500) break; } }
  return false;
}

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    // Resend wraps the email under { type, data } on some plans; accept both shapes.
    const mail = (payload && payload.data && typeof payload.data === "object") ? payload.data : payload;

    // Idempotency: dedupe on the provider's message id / our own header.
    const messageId = pick(mail, ["message_id", "messageId", "id", "email_id"])
      || headerVal(mail, "message-id") || headerVal(mail, "Message-ID");
    if (seen(messageId)) return res.status(200).json({ ok: true, skipped: "duplicate" });

    const fromAddr = bareAddr(pick(mail, ["from", "sender"]) || headerVal(mail, "from"));
    // Ignore auto-replies, bounces, and our own outbound (loop guard).
    if (isAutomated(mail) || isOwnAddress(fromAddr)) {
      return res.status(200).json({ ok: true, skipped: "automated-or-self" });
    }

    // Recover the conversation from the to/recipient sub-address.
    const toCandidates = [pick(mail, ["to", "recipient", "envelope_to"]), headerVal(mail, "to"), headerVal(mail, "delivered-to")].filter(Boolean);
    const state = stateFromInboundAddress(toCandidates);
    if (!state || !Array.isArray(state.messages)) {
      return res.status(200).json({ ok: true, skipped: "no-thread" });
    }

    // Extract just the user's new reply (strip quoted original + signature).
    const rawText = pick(mail, ["text", "plain", "stripped_text"]) || htmlToText(pick(mail, ["html", "body"]));
    const userText = extractReply(rawText);
    if (!userText) return res.status(200).json({ ok: true, skipped: "empty-reply" });

    const base = "https://" + (req.headers.host || "");
    const messages = state.messages.concat([{ role: "user", content: userText }]);
    const priorEmails = state.messages.filter((m) => m.role === "assistant").length;

    // PRE-DETERMINED minutes for this turn (same model as reply.js).
    const minutes = Math.max(1, Number(state.estMin) || 1);
    const totalMinutes = (Number(state.accruedMinutes) || 0) + minutes;

    // HARD CAP: initial batch + at most one follow-up, mirroring reply.js.
    if (priorEmails >= 2) {
      return res.status(200).json({ ok: true, done: true, decision: "PAUSE", minutes, totalMinutes, capped: true });
    }

    // Same engine continuation reply.js uses.
    const turn = await callSelf(base, {
      action: "turn", product: state.product, channel: state.channel || "email",
      exploration: state.exploration, wishlist: state.wishlist, memory: state.memory, context: state.context, final: true,
      plan: { essence: state.question, subject: state.subject }, messages,
    });
    const next = (turn && turn.message) || "";
    const decision = (turn && turn.decision) || "CONTINUE";

    if (decision === "SUFFICIENT" || decision === "PAUSE" || !next.trim()) {
      return res.status(200).json({ ok: true, done: true, decision, minutes, totalMinutes });
    }

    // Continue: send the next email, carrying a fresh thread state + answer link.
    const newMessages = messages.concat([{ role: "assistant", content: next }]).slice(-8);
    const newState = Object.assign({}, state, { messages: newMessages, accruedMinutes: totalMinutes });
    const answerUrl = base + "/app/Answer.html?d=" + encodeState(newState);
    let sent = false;
    if (process.env.RESEND_API_KEY && state.toEmail) {
      const emailPayload = {
        from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>",
        to: [state.toEmail],
        subject: "Re: " + (state.subject || "your feedback"),
        html: htmlEmail(next, answerUrl),
        text: next + footer(answerUrl),
      };
      const replyTo = outboundReplyTo(newState);
      if (replyTo) emailPayload.reply_to = replyTo;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });
      sent = r.ok;
    }
    return res.status(200).json({ ok: true, done: false, sent, decision, minutes, totalMinutes });
  } catch (error) {
    // Always 200 to the webhook so the provider doesn't hammer retries on a parse error.
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

/* ---- reply extraction: keep only the new text the user typed ---- */
function extractReply(raw) {
  let s = String(raw || "").replace(/\r\n/g, "\n");
  if (!s.trim()) return "";
  const lines = s.split("\n");
  const out = [];
  // Quote boundaries: "On <date> ... wrote:", Outlook "-----Original Message-----",
  // our forwarded footer ("———"), and the start of a quoted block (">").
  const onWrote = /^\s*On .+ wrote:\s*$/i;
  const onWroteStart = /^\s*On .+,?\s*$/i;            // "On Mon, ..." that continues onto next line
  const origMsg = /^\s*-{2,}\s*Original Message\s*-{2,}/i;
  const fromBlock = /^\s*(From|De|Von):\s.+/i;        // forwarded header block
  const dashSep = /^\s*(—{2,}|-{2,}|_{2,})\s*$/;      // our footer rule / signature delimiter
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (onWrote.test(line) || origMsg.test(line) || fromBlock.test(line) || dashSep.test(line)) break;
    if (/^\s*>/.test(line)) break;                    // start of a quoted block
    // "On <date>," immediately followed by a line containing "wrote:" / an address
    if (onWroteStart.test(line) && i + 1 < lines.length && /wrote:|@/.test(lines[i + 1])) break;
    // common signature delimiter "-- "
    if (/^--\s?$/.test(line)) break;
    out.push(line);
  }
  // Trim a trailing "Sent from my iPhone"-style footer and blank lines.
  let text = out.join("\n").replace(/\n\s*Sent from my .+$/i, "").trim();
  return text;
}

function htmlToText(html) {
  return String(html || "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])\s*>/gi, "\n")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "")   // drop quoted blocks outright
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .trim();
}

function isAutomated(mail) {
  const auto = headerVal(mail, "auto-submitted");
  if (auto && !/^no$/i.test(auto)) return true;
  if (headerVal(mail, "x-autoreply") || headerVal(mail, "x-autorespond") || headerVal(mail, "precedence") === "bulk") return true;
  const subj = String(pick(mail, ["subject"]) || "").toLowerCase();
  if (/^(auto(matic)? reply|out of office|undeliverable|delivery status|mail delivery|returned mail)/.test(subj)) return true;
  const from = bareAddr(pick(mail, ["from"]) || headerVal(mail, "from"));
  if (/(^|@)(mailer-daemon|postmaster|no-?reply)@/i.test(from) || /^(mailer-daemon|postmaster)$/i.test(from.split("@")[0] || "")) return true;
  return false;
}

function isOwnAddress(addr) {
  const a = String(addr || "").toLowerCase();
  if (!a) return false;
  const from = bareAddr(process.env.RESEND_FROM || "").toLowerCase();
  if (from && a === from) return true;
  const domain = String(process.env.RESEND_INBOUND_DOMAIN || "").trim().toLowerCase().replace(/^@/, "");
  if (domain && a.endsWith("@" + domain)) return true;   // our own reply+token address
  return false;
}

/* ---- small helpers ---- */
function pick(obj, keys) {
  for (const k of keys) { if (obj && obj[k] != null && obj[k] !== "") return obj[k]; }
  return "";
}
function headerVal(mail, name) {
  if (!mail) return "";
  const h = mail.headers || mail.header;
  const want = String(name).toLowerCase();
  if (Array.isArray(h)) {
    const hit = h.find((x) => x && String(x.name || x.key || "").toLowerCase() === want);
    return hit ? String(hit.value || "") : "";
  }
  if (h && typeof h === "object") {
    for (const k of Object.keys(h)) { if (k.toLowerCase() === want) return String(h[k] || ""); }
  }
  return "";
}
function bareAddr(v) {
  const s = String(v || "");
  const m = s.match(/<([^>]+)>/);
  return (m ? m[1] : s).trim().toLowerCase();
}

async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

function footer(answerUrl) {
  return "\n\n———\nPrefer a form? Answer here → " + answerUrl + "\n\nAs a design partner, your team gets a product discount, early access, and a real say in the roadmap.";
}
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function htmlEmail(body, answerUrl) {
  const bodyHtml = "<p style=\"margin:0 0 14px\">" + esc(body).replace(/\n\n+/g, "</p><p style=\"margin:0 0 14px\">").replace(/\n/g, "<br>") + "</p>";
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#24221e;max-width:560px">' + bodyHtml +
    '<div style="margin:22px 0"><a href="' + esc(answerUrl) + '" style="display:inline-block;background:#b4532a;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">Prefer a form? Answer here →</a></div>' +
    '<p style="font-size:13px;color:#8a857c;margin:0">As a design partner, your team gets a product discount, early access, and a real say in the roadmap.</p></div>';
}
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) { if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; let b = ""; for await (const c of req) { b += c; if (b.length > 200000) throw new Error("too large"); } return b ? JSON.parse(b) : {}; }
