/* ============================================================
   Observant — the inbound reply loop (hosted answer form).
   The "Answer here" form posts here. 'load' returns the questions
   to render; 'submit' runs the answers through C2/C3 and, if the
   conversation should continue, sends the NEXT email automatically.
   Thread state rides in the link (base64) — fine for a demo;
   the real build moves this to a DB/KV.
   ============================================================ */
const db = require("../_db");

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const state = decodeState(payload.d);
    if (!state || !Array.isArray(state.messages)) return res.status(200).json({ ok: false, error: "broken or expired link" });
    const base = "https://" + req.headers.host;
    const last = state.messages[state.messages.length - 1];
    const parsed = parseNumbered(last ? last.content : "");

    if (payload.action !== "submit") {
      // load: hand the form the questions to render (+ minutes already banked in earlier rounds)
      // It's a follow-up only if the user has actually replied before (not on the first answer).
      const followup = state.messages.filter((m) => m.role === "user").length > 0;
      const manageUrl = base + "/app/Manage.html?d=" + encodeState({ product: state.product, contact: state.toEmail });
      return res.status(200).json({ ok: true, product: state.product, intro: parsed.intro, questions: parsed.questions, outro: parsed.outro, subject: state.subject, accruedMinutes: Number(state.accruedMinutes) || 0, estMin: Number(state.estMin) || 0, followup, manageUrl });
    }

    // submit: assemble the user's reply, run it through the engine
    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    const userText = parsed.questions.length
      ? parsed.questions.map((q, i) => (i + 1) + ". " + String(answers[i] || "").trim()).filter((s) => s.replace(/^\d+\.\s*/, "").trim()).join("\n")
      : String(answers[0] || "").trim();
    if (!userText.trim()) return res.status(200).json({ ok: false, error: "no answers provided" });

    const messages = state.messages.concat([{ role: "user", content: userText }]);
    const answeredCount = answers.filter((a) => String(a || "").trim()).length;
    const priorEmails = state.messages.filter((m) => m.role === "assistant").length;

    // AI-judged quality gate (ported from the Codified quality-assessor): does this EARN the reward?
    const qa = await callSelf(base, { action: "quality", product: state.product, questions: parsed.questions, answers });
    const verdict = (qa && ["pass", "partial", "fail"].includes(qa.overall)) ? qa.overall : "pass";
    if (verdict !== "pass") {
      // No reward yet — fail = re-answer, partial = add a bit more. The user stays on the form.
      return res.status(200).json({ ok: true, done: false, verdict, quality: qa });
    }

    // PASS → award the PRE-DETERMINED minutes (what the loop is worth), not time spent.
    const minutes = Math.max(1, Number(state.estMin) || estLoopMin(parsed.questions));   // PRE-DETERMINED reward for this loop (never time-on-page)
    const totalMinutes = (Number(state.accruedMinutes) || 0) + minutes;
    await recordEarnedMinutes(state, minutes, qa);   // #3 — persist the earn (audit = quality verdict)
    await persistMsg(state.conversationId, "partner", userText, minutes);   // log the inbound reply (mirrors the ledger earn)

    // HARD CAP: one inquiry = the initial batch + AT MOST ONE follow-up. Then stop, always.
    if (priorEmails >= 2) {
      await setConvStatus(state.conversationId, "paused");
      return res.status(200).json({ ok: true, done: true, decision: "PAUSE", verdict, minutes, totalMinutes, capped: true });
    }

    // This is the only follow-up we're allowed — tell the engine so it only asks if genuinely worth it.
    const turn = await callSelf(base, {
      action: "turn", product: state.product, channel: state.channel || "email",
      exploration: state.exploration, wishlist: state.wishlist, memory: state.memory, context: state.context, final: true,
      plan: { essence: state.question, subject: state.subject }, messages,
    });
    const next = (turn && turn.message) || "";
    const decision = (turn && turn.decision) || "CONTINUE";

    if (decision === "SUFFICIENT" || decision === "PAUSE" || !next.trim()) {
      await persistMsg(state.conversationId, "observant", next, 0);
      await setConvStatus(state.conversationId, decision === "SUFFICIENT" ? "sufficient" : "paused");
      return res.status(200).json({ ok: true, done: true, decision, verdict, message: next, minutes, totalMinutes });
    }

    // continue: send the next email with a fresh answer link
    const newMessages = messages.concat([{ role: "assistant", content: next }]).slice(-8);
    const newState = Object.assign({}, state, { messages: newMessages, accruedMinutes: totalMinutes });
    const answerUrl = base + "/app/Answer.html?d=" + encodeState(newState);
    const emailText = next + footer(answerUrl);
    let sent = false;
    if (process.env.RESEND_API_KEY) {
      const emailPayload = {
        from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>",
        to: [state.toEmail],
        subject: "Re: " + (state.subject || "your feedback"),
        html: htmlEmail(next, answerUrl),
        text: emailText,
      };
      const replyTo = String(process.env.RESEND_REPLY_TO || "").trim();
      if (replyTo) emailPayload.reply_to = replyTo;

      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(emailPayload),
      });
      sent = r.ok;
    }
    // newState (and thus the next link) carries conversationId via the Object.assign above.
    await persistMsg(state.conversationId, "observant", next, 0);
    return res.status(200).json({ ok: true, done: false, sent, decision, verdict, minutes, totalMinutes });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
function stripMd(s) { return String(s || "").replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s*/gm, "").trim(); }
function parseNumbered(text) {
  const str = String(text || ""); const lines = str.split("\n"); const questions = []; let first = -1, last = -1;
  lines.forEach((raw, i) => { const m = raw.trim().match(/^(\d+)[.)]\s+(.*)/); if (m) { questions.push(stripMd(m[2])); if (first < 0) first = i; last = i; } });
  if (!questions.length) return { intro: stripMd(str), questions: [], outro: "" };
  return { intro: stripMd(lines.slice(0, first).join("\n")), questions: questions, outro: stripMd(lines.slice(last + 1).join("\n")) };
}
function estMinutes(text, answered) {
  const str = String(text || "").trim();
  const words = str.split(/\s+/).filter(Boolean).length;
  const q = Math.max(1, answered || 1);
  const overhead = 0.4 * q;                 // read + think time per question engaged
  const writing = words / 18;               // considered-writing rate (slower than raw typing)
  const perAnswer = words / q;              // depth proxy
  const richness = perAnswer >= 35 ? 1.25 : perAnswer >= 18 ? 1.1 : 1.0;
  const numbers = (str.match(/\d/g) || []).length;
  const detailBonus = numbers >= 4 ? 0.5 : 0; // cited specifics / metrics
  const raw = (overhead + writing) * richness + detailBonus;
  return Math.max(1, Math.round(raw * 2) / 2); // nearest 0.5, floor 1
}
function footer(answerUrl) { return "\n\n———\nAnswer these here → " + answerUrl + "\n\nYou earn about $2 for every minute you spend answering, tracked automatically. Track and redeem your rewards on Observant anytime."; }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function htmlEmail(body, answerUrl) {
  const bodyHtml = "<p style=\"margin:0 0 14px\">" + esc(body).replace(/\n\n+/g, "</p><p style=\"margin:0 0 14px\">").replace(/\n/g, "<br>") + "</p>";
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#24221e;max-width:560px">' + bodyHtml +
    '<div style="margin:22px 0"><a href="' + esc(answerUrl) + '" style="display:inline-block;background:#b4532a;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">Answer these questions →</a></div>' +
    '<p style="font-size:13px;color:#8a857c;margin:0">You earn about $2 per minute you spend answering — tracked automatically. Track and redeem your rewards on Observant anytime.</p></div>';
}
function encodeState(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
function decodeState(s) { try { return JSON.parse(Buffer.from(String(s || ""), "base64url").toString("utf8")); } catch (e) { return null; } }
// The reward for a loop, derived from the loop's shape (question count), not the response — a fallback
// for when state.estMin (set upfront at loop generation) is missing. Never time-on-page.
function estLoopMin(questions) { const n = (Array.isArray(questions) ? questions.length : 0) || 1; return Math.max(2, Math.round(n * 1.5)); }

// #3 — on a passing reply, append the PRE-DETERMINED reward to the minutes ledger, with the
// quality verdict as the audit record. Resolves the partner from the program slug + email.
async function recordEarnedMinutes(state, minutes, qa) {
  try {
    if (!db.dbConfigured()) return;
    const slug = String(state.product || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!slug || !state.toEmail) return;
    const progs = await db.select("programs", "slug=eq." + encodeURIComponent(slug) + "&select=id,rate_per_min&limit=1");
    const program = Array.isArray(progs) && progs[0];
    if (!program) return;
    const parts = await db.select("partners", "program_id=eq." + program.id + "&channel=eq.email&contact=eq." + encodeURIComponent(state.toEmail) + "&select=id&limit=1");
    const partner = Array.isArray(parts) && parts[0];
    if (!partner) return;
    const rate = Number(program.rate_per_min) || 2;
    await db.insert("minutes_ledger", { partner_id: partner.id, conversation_id: state.conversationId || null, kind: "earned", minutes: minutes, amount: Math.round(minutes * rate * 100) / 100, quality_verdict: qa || null, note: "email reply" });
  } catch (e) { console.error("[ledger] record failed:", e && e.message); }
}

// Append a turn to the persisted conversation (so an email reply can later reconstruct it).
// Best-effort: no-ops without a DB or a conversation id (e.g. older base64-only links).
async function persistMsg(convId, sender, body, minutes) {
  try {
    if (!db.dbConfigured() || !convId || !String(body || "").trim()) return;
    await db.insert("messages", { conversation_id: convId, sender, body: String(body).slice(0, 8000), minutes: Number(minutes) || 0 });
    await db.update("conversations", "id=eq." + convId, { last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[reply] persistMsg failed:", e && e.message); }
}
async function setConvStatus(convId, status) {
  try {
    if (!db.dbConfigured() || !convId) return;
    await db.update("conversations", "id=eq." + convId, { status, last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[reply] setConvStatus failed:", e && e.message); }
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) { if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; let b = ""; for await (const c of req) { b += c; if (b.length > 60000) throw new Error("too large"); } return b ? JSON.parse(b) : {}; }
