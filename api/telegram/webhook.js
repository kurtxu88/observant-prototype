/* ============================================================
   Observant — Telegram inbound webhook (#5).
   The SAME 1:1 loop the email path runs (api/selfserve/inbound-email.js),
   but over Telegram. Telegram POSTs every update here (set once via the
   Bot API setWebhook — see ./README.md).

   Two paths:
   1. /start <payload>  — the deep link from the "Connect Telegram"
      button (app/join.jsx). The payload is base64url(JSON) carrying the
      program slug (+ product name + rate), or a bare slug. We lazily
      upsert the program + the partner (channel='telegram',
      contact=String(chat_id), best-effort handle=@username), open a
      conversation, persist + send a welcome question. This is how a
      Telegram partner connects.
   2. a normal text message — resolve the partner by chat_id, load their
      open conversation + recent messages (DB), run the reply through the
      quality gate + interview `turn` (POST /api/selfserve/interview,
      exactly like inbound-email.js), award the PRE-DETERMINED minutes on
      PASS to minutes_ledger, persist the in/out messages, and send the
      next question. Honors the same HARD CAP (initial batch + ≤1 follow-up).

   Graceful no-op contract:
   - No TELEGRAM_BOT_TOKEN  → sendMessage() is a no-op; we still 200.
   - No DB                  → we skip persistence/rewards and run a
     stateless single-turn reply so a token-only demo still talks back.
   Always returns 200 quickly (Telegram retries on non-2xx).
   ============================================================ */
const db = require("../_db");
const { sendMessage } = require("./_send");
const alerts = require("../selfserve/_alerts");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  // Telegram only ever POSTs. Answer GET/HEAD so a setup ping doesn't error.
  if (req.method !== "POST") return res.status(200).json({ ok: true, info: "Observant Telegram webhook" });

  try {
    const update = await readJson(req);
    const msg = update && (update.message || update.edited_message);
    const chatId = msg && msg.chat && msg.chat.id;
    const text = msg && typeof msg.text === "string" ? msg.text.trim() : "";

    // Nothing actionable (callback_query, photo-only, etc.) → ack and move on.
    if (!chatId || !text) return res.status(200).json({ ok: true, ignored: true });

    if (text.startsWith("/start")) {
      await handleStart(req, chatId, text, msg);
    } else {
      await handleMessage(req, chatId, text, msg);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    // Never 500 to Telegram (it would retry forever). Log + ack.
    console.error("[telegram/webhook] error:", err && err.message);
    return res.status(200).json({ ok: true, error: err && err.message });
  }
};

/* ---------- /start <payload> : deep-link opt-in ---------- */
async function handleStart(req, chatId, text, msg) {
  const raw = text.replace(/^\/start(@\w+)?\s*/i, "").trim();   // strip "/start" and any @botname
  const link = decodePayload(raw);
  const slug = String(link.slug || "").trim().toLowerCase();
  const productName = String(link.productName || "").trim() || titleize(slug) || "the product";

  if (!slug) {
    await sendMessage(chatId, "Welcome to Observant. Open your invite link from the team to connect — it carries the code that links this chat to their feedback line.");
    return;
  }

  const firstName = (msg && msg.from && msg.from.first_name) ? String(msg.from.first_name).trim() : "";
  const handle = (msg && msg.from && msg.from.username) ? "@" + String(msg.from.username).trim() : "";
  const welcome =
    (firstName ? "Hi " + firstName + " — " : "Hi — ") +
    "you're connected to the " + productName + " feedback line on Observant. " +
    "The " + productName + " team will drop in with the occasional question here, and every reply earns you rewards. " +
    "Message me anytime about your feedback and thoughts on " + productName + ".";

  if (!db.dbConfigured()) {
    // No DB → we can't persist the opt-in, but the bot should still greet.
    await sendMessage(chatId, welcome);
    return;
  }

  try {
    const program = await db.upsert(
      "programs",
      { slug, product_name: productName, rate_per_min: Number(link.rate) > 0 ? Number(link.rate) : 2 },
      "slug"
    );
    const partner = await db.upsert(
      "partners",
      {
        program_id: program.id,
        channel: "telegram",
        contact: String(chatId),
        cadence: "occasional",
        status: "active",
        consent_at: new Date().toISOString(),
      },
      "program_id,channel,contact"
    );
    // Best-effort: record the @username for display. The `handle` column is
    // optional (db/migrations/telegram.sql) — if it isn't there, just skip.
    if (handle && partner && partner.id) {
      try { await db.update("partners", "id=eq." + partner.id, { handle }); }
      catch (e) { /* no handle column → ignore */ }
    }
    // Open the relationship thread and PERSIST the welcome as the first
    // 'observant' question, so the hard cap (below) counts it as the
    // initial batch — exactly like send-email.js persists the opener.
    if (partner && partner.id) {
      const open = await db.select("conversations", "partner_id=eq." + partner.id + "&status=eq.open&select=id&order=last_active_at.desc&limit=1");
      let conv = (Array.isArray(open) && open[0]) ? open[0] : null;
      if (!conv) conv = await db.insert("conversations", { partner_id: partner.id, subject: "Your line to the " + productName + " team", mode: "intro", status: "open" });
      await persistMsg(conv.id, "observant", welcome, 0);
    }
  } catch (err) {
    console.error("[telegram/webhook] start persist failed:", err && err.message);
  }
  await sendMessage(chatId, welcome);
}

/* ---------- normal message : run a quality-gated interview turn ----------
   Mirrors api/selfserve/inbound-email.js: quality gate → award PRE-DETERMINED
   minutes on PASS → persist → next question, with the same hard cap. */
async function handleMessage(req, chatId, text, msg) {
  const base = "https://" + req.headers.host;

  // No DB → stateless single-turn reply so a token-only demo still responds.
  if (!db.dbConfigured()) {
    const turn = await callSelf(base, {
      action: "turn", channel: "telegram", product: "the product",
      messages: [{ role: "user", content: text }],
    });
    const reply = (turn && turn.message) || "";
    if (reply.trim()) await sendMessage(chatId, reply);
    return;
  }

  // 1. Resolve the partner by chat id.
  const partners = await db.select("partners", "channel=eq.telegram&contact=eq." + encodeURIComponent(String(chatId)) + "&select=*&limit=1");
  const partner = Array.isArray(partners) ? partners[0] : null;
  if (!partner) {
    await sendMessage(chatId, "I don't have you linked to a feedback program yet — tap your team's invite link to connect, then message me here.");
    return;
  }

  // 2. Product / program context (+ the pre-set reward rate).
  const programs = await db.select("programs", "id=eq." + partner.program_id + "&select=*&limit=1");
  const program = (Array.isArray(programs) && programs[0]) || { product_name: "the product", rate_per_min: 2 };
  const product = program.product_name || "the product";
  const rate = Number(program.rate_per_min) || 2;

  // 3. Find the open conversation or open a fresh one.
  const openConvs = await db.select("conversations", "partner_id=eq." + partner.id + "&status=eq.open&select=*&order=last_active_at.desc&limit=1");
  let conversation = (Array.isArray(openConvs) && openConvs[0]) ? openConvs[0] : null;
  if (!conversation) {
    conversation = await db.insert("conversations", { partner_id: partner.id, subject: "Your line to the " + product + " team", mode: "light", status: "open" });
  }

  // 4. Load the thread so far (oldest → newest), map to interview roles.
  const prior = await db.select("messages", "conversation_id=eq." + conversation.id + "&select=sender,body,minutes,created_at&order=created_at.asc&limit=20");
  const hist = (Array.isArray(prior) ? prior : []).map((m) => ({
    role: m.sender === "observant" ? "assistant" : "user",
    content: String(m.body || ""),
  }));
  // The last question we asked → what this reply is answering (for the quality gate).
  const lastObservant = [...hist].reverse().find((m) => m.role === "assistant");
  const parsed = parseNumbered(lastObservant ? lastObservant.content : "");
  const priorAsks = hist.filter((m) => m.role === "assistant").length;   // # of questions we've sent (initial + any follow-up)
  const messages = hist.concat([{ role: "user", content: text }]).slice(-8);

  // 5. Quality gate (same assessor inbound-email.js uses): does this EARN the reward?
  const qa = await callSelf(base, { action: "quality", product, questions: parsed.questions, answers: [text] });
  const verdict = (qa && ["pass", "partial", "fail"].includes(qa.overall)) ? qa.overall : "pass";
  const earned = verdict === "pass";
  const minutes = earned ? Math.max(1, estLoopMin(parsed.questions)) : 0;   // PRE-DETERMINED reward (never time-on-page)

  // Always log the inbound turn (with the earned minutes baked in).
  await persistMsg(conversation.id, "partner", text, minutes);

  // Team update — urgent alert if this reply reads negative/churny (best-effort, non-blocking).
  const tgName = partner.handle || (msg && msg.from && msg.from.first_name) || String(chatId);
  try { await alerts.maybeAlert({ base, slug: program.slug, kind: "reply", product, channel: "telegram", name: tgName, handle: partner.handle, partnerId: partner.id, quote: text }); } catch (_e) {}

  if (!earned) {
    // No reward yet — leave the conversation open; the partner can add more.
    await db.update("conversations", "id=eq." + conversation.id, { last_active_at: new Date().toISOString() }).catch(() => {});
    return;
  }

  // PASS → append the PRE-DETERMINED minutes to the ledger (audit = quality verdict).
  await db.insert("minutes_ledger", {
    partner_id: partner.id,
    conversation_id: conversation.id,
    kind: "earned",
    minutes,
    amount: Math.round(minutes * rate * 100) / 100,
    quality_verdict: qa || null,
    note: "inbound telegram reply",
  });

  // HARD CAP: one inquiry = the initial batch + AT MOST ONE follow-up. Then stop.
  if (priorAsks >= 2) {
    await setConvStatus(conversation.id, "paused");
    return;
  }

  // The one allowed follow-up — tell the engine so it only asks if genuinely worth it.
  const turn = await callSelf(base, {
    action: "turn", product, channel: "telegram", final: priorAsks >= 1,
    plan: { essence: conversation.subject || product, subject: conversation.subject || product },
    messages,
  });
  const next = (turn && turn.message) || "";
  const decision = (turn && turn.decision) || "CONTINUE";

  if (decision === "SUFFICIENT" || decision === "PAUSE" || !next.trim()) {
    if (next.trim()) { await persistMsg(conversation.id, "observant", next, 0); await sendMessage(chatId, next); }
    await setConvStatus(conversation.id, decision === "SUFFICIENT" ? "sufficient" : "paused");
    return;
  }

  // continue: persist the follow-up and send it (partner replies again → back to this webhook).
  await persistMsg(conversation.id, "observant", next, 0);
  await sendMessage(chatId, next);
}

/* ---------- helpers ---------- */
async function callSelf(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

async function persistMsg(convId, sender, body, minutes) {
  try {
    if (!db.dbConfigured() || !convId || !String(body || "").trim()) return;
    await db.insert("messages", { conversation_id: convId, sender, body: String(body).slice(0, 8000), minutes: Number(minutes) || 0 });
    await db.update("conversations", "id=eq." + convId, { last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[telegram/webhook] persistMsg:", e && e.message); }
}
async function setConvStatus(convId, status) {
  try {
    if (!db.dbConfigured() || !convId) return;
    await db.update("conversations", "id=eq." + convId, { status, last_active_at: new Date().toISOString() });
  } catch (e) { console.error("[telegram/webhook] setConvStatus:", e && e.message); }
}

/* ---- shared with inbound-email.js / reply.js (inlined to stay bare-serverless) ---- */
function stripMd(s) { return String(s || "").replace(/\*\*/g, "").replace(/__/g, "").replace(/^#+\s*/gm, "").trim(); }
function parseNumbered(text) {
  const str = String(text || ""); const lines = str.split("\n"); const questions = []; let first = -1, last = -1;
  lines.forEach((raw, i) => { const m = raw.trim().match(/^(\d+)[.)]\s+(.*)/); if (m) { questions.push(stripMd(m[2])); if (first < 0) first = i; last = i; } });
  if (!questions.length) return { intro: stripMd(str), questions: [], outro: "" };
  return { intro: stripMd(lines.slice(0, first).join("\n")), questions, outro: stripMd(lines.slice(last + 1).join("\n")) };
}
// PRE-DETERMINED reward for a loop, from its shape (question count), never time-on-page.
function estLoopMin(questions) { const n = (Array.isArray(questions) ? questions.length : 0) || 1; return Math.max(2, Math.round(n * 1.5)); }
function titleize(slug) {
  return String(slug || "").split("-").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// Deep-link payload: base64url(JSON) → { slug, productName, rate, token }.
// Falls back to treating a bare token as the slug for hand-built links.
function decodePayload(raw) {
  if (!raw) return {};
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const obj = JSON.parse(json);
    if (obj && typeof obj === "object") return obj;
  } catch (_e) { /* not base64url JSON — fall through */ }
  if (/^[a-z0-9_-]+$/i.test(raw)) return { slug: raw.toLowerCase() };
  return {};
}

async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let b = "";
  for await (const c of req) {
    b += c;
    if (b.length > 100000) throw new Error("payload too large");
  }
  return b ? JSON.parse(b) : {};
}
