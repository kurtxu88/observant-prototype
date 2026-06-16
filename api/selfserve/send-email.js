/* ============================================================
   Observant — send a REAL test email of the first batch.
   Composes the opening email via our own conversation engine
   (C1 translate -> C2 compose) then sends it through Resend.
   Needs RESEND_API_KEY (and optionally RESEND_FROM) in env.
   ============================================================ */
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
    if (!question) return res.status(200).json({ ok: false, error: "question is required" });
    if (!/.+@.+\..+/.test(toEmail)) return res.status(200).json({ ok: false, error: "a valid test email is required" });

    const base = "https://" + req.headers.host;
    // 1) C1 — translate the raw question into essence + the question set + subject
    const t = await callSelf(base, { action: "translate", product, question, wishlist, memory });
    const plan = (t && t.plan) || { essence: question, questions: [question], subject: "A couple questions from the " + product + " team" };
    // 2) C2 — compose the actual opening email (batched, professional)
    const turn = await callSelf(base, { action: "turn", product, channel: channel, exploration: isFinite(exploration) ? exploration : 0.5, plan, wishlist, memory, messages: [] });
    const subject = plan.subject || ("A couple questions from the " + product + " team");
    const body = (turn && turn.message) || "";

    const state = { product, question, exploration: isFinite(exploration) ? exploration : 0.5, channel, wishlist, memory, toEmail, subject, messages: [{ role: "assistant", content: body }] };
    const answerUrl = "https://" + req.headers.host + "/app/Answer.html?d=" + encodeState(state);
    const emailText = body + footer(answerUrl);

    if (!process.env.RESEND_API_KEY) {
      return res.status(200).json({ ok: false, needKey: true, subject, body: emailText, answerUrl, to: toEmail });
    }

    const send = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>",
        to: [toEmail],
        subject: subject,
        text: emailText,
      }),
    });
    if (!send.ok) {
      const detail = await send.text();
      return res.status(200).json({ ok: false, error: "Resend " + send.status + ": " + detail.slice(0, 240), subject, body, to: toEmail });
    }
    const data = await send.json();
    return res.status(200).json({ ok: true, id: data.id, subject, body, to: toEmail });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

function setJson(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("Payload too large"); }
  return b ? JSON.parse(b) : {};
}
function limit(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
function encodeState(obj) { return Buffer.from(JSON.stringify(obj)).toString("base64url"); }
function footer(answerUrl) {
  return "\n\n———\nAnswer these here → " + answerUrl +
    "\n\nYou earn about $2 for every minute you spend answering, tracked automatically. Track and redeem your rewards on Observant anytime.";
}
