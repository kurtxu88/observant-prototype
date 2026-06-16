/* ============================================================
   Observant — the inbound reply loop (hosted answer form).
   The "Answer here" form posts here. 'load' returns the questions
   to render; 'submit' runs the answers through C2/C3 and, if the
   conversation should continue, sends the NEXT email automatically.
   Thread state rides in the link (base64) — fine for a demo;
   the real build moves this to a DB/KV.
   ============================================================ */
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
      // load: hand the form the questions to render
      return res.status(200).json({ ok: true, product: state.product, intro: parsed.intro, questions: parsed.questions, outro: parsed.outro, subject: state.subject });
    }

    // submit: assemble the user's reply, run it through the engine
    const answers = Array.isArray(payload.answers) ? payload.answers : [];
    const userText = parsed.questions.length
      ? parsed.questions.map((q, i) => (i + 1) + ". " + String(answers[i] || "").trim()).filter((s) => s.replace(/^\d+\.\s*/, "").trim()).join("\n")
      : String(answers[0] || "").trim();
    if (!userText.trim()) return res.status(200).json({ ok: false, error: "no answers provided" });

    const messages = state.messages.concat([{ role: "user", content: userText }]);
    const minutes = estMinutes(userText);
    const priorEmails = state.messages.filter((m) => m.role === "assistant").length;

    // HARD CAP: one inquiry = the initial batch + AT MOST ONE follow-up. Then stop, always.
    if (priorEmails >= 2) {
      return res.status(200).json({ ok: true, done: true, decision: "PAUSE", minutes, capped: true });
    }

    // This is the only follow-up we're allowed — tell the engine so it only asks if genuinely worth it.
    const turn = await callSelf(base, {
      action: "turn", product: state.product, channel: state.channel || "email",
      exploration: state.exploration, wishlist: state.wishlist, memory: state.memory, final: true,
      plan: { essence: state.question, subject: state.subject }, messages,
    });
    const next = (turn && turn.message) || "";
    const decision = (turn && turn.decision) || "CONTINUE";

    if (decision === "SUFFICIENT" || decision === "PAUSE" || !next.trim()) {
      return res.status(200).json({ ok: true, done: true, decision, message: next, minutes });
    }

    // continue: send the next email with a fresh answer link
    const newMessages = messages.concat([{ role: "assistant", content: next }]).slice(-8);
    const newState = Object.assign({}, state, { messages: newMessages });
    const answerUrl = base + "/app/Answer.html?d=" + encodeState(newState);
    const emailText = next + footer(answerUrl);
    let sent = false;
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>",
          to: [state.toEmail], subject: "Re: " + (state.subject || "your feedback"), html: htmlEmail(next, answerUrl), text: emailText,
        }),
      });
      sent = r.ok;
    }
    return res.status(200).json({ ok: true, done: false, sent, decision, minutes });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}
function parseNumbered(text) {
  const str = String(text || ""); const lines = str.split("\n"); const questions = []; let first = -1, last = -1;
  lines.forEach((raw, i) => { const m = raw.trim().match(/^(\d+)[.)]\s+(.*)/); if (m) { questions.push(m[2]); if (first < 0) first = i; last = i; } });
  if (!questions.length) return { intro: str.trim(), questions: [], outro: "" };
  return { intro: lines.slice(0, first).join("\n").trim(), questions: questions, outro: lines.slice(last + 1).join("\n").trim() };
}
function estMinutes(text) { const w = String(text || "").trim().split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w / 22)); }
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
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) { if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; let b = ""; for await (const c of req) { b += c; if (b.length > 60000) throw new Error("too large"); } return b ? JSON.parse(b) : {}; }
