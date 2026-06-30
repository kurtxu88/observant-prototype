/* ============================================================
   Observant — Telegram inbound webhook (#5).
   Telegram POSTs every update here (set via the Bot API setWebhook).

   Two paths:
   1. /start <payload>  — the deep link from the "Connect Telegram"
      button (app/join.jsx). The payload is base64url(JSON) carrying
      the program slug (+ product name + optional partner token).
      We lazily upsert the program + the partner (channel='telegram',
      contact=String(chat_id)) and send a welcome.
   2. a normal text message — find the partner by chat_id, find/open
      their conversation, run the C2/C3 interview `turn` (by POSTing to
      this same deployment's /api/selfserve/interview), persist the
      inbound + outbound `messages`, and reply via ./send.

   Graceful no-op contract:
   - No TELEGRAM_BOT_TOKEN  → sendMessage() is a no-op; we still 200.
   - No DB                  → we skip persistence and run a stateless
     single-turn reply so a token-only demo still talks back.
   Always returns 200 quickly (Telegram retries on non-2xx).
   ============================================================ */
const db = require("../_db");
const { sendMessage } = require("./_send");

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
  const productName = String(link.productName || "").trim() || (slug || "the product");

  if (!slug) {
    await sendMessage(chatId, "Welcome to Observant. Open your invite link from the team to connect — it carries the code that links this chat to their feedback line.");
    return;
  }

  const firstName = (msg && msg.from && msg.from.first_name) ? String(msg.from.first_name).trim() : "";
  const welcome =
    (firstName ? "Hi " + firstName + " — " : "Hi — ") +
    "you're connected to the " + productName + " feedback line on Observant. " +
    "This is a two-way thread: we'll send the occasional question here, and you can message anytime something breaks or you want to share feedback — that earns rewards too. " +
    "What's something you did with " + productName + " recently? Anything stand out?";

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
    await db.upsert(
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
  } catch (err) {
    console.error("[telegram/webhook] start persist failed:", err && err.message);
  }
  await sendMessage(chatId, welcome);
}

/* ---------- normal message : run an interview turn ---------- */
async function handleMessage(req, chatId, text, msg) {
  const base = "https://" + req.headers.host;

  // No DB → stateless single-turn reply so a token-only demo still responds.
  if (!db.dbConfigured()) {
    const turn = await callInterview(base, {
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

  // 2. Product/program context.
  const programs = await db.select("programs", "id=eq." + partner.program_id + "&select=*&limit=1");
  const program = Array.isArray(programs) ? programs[0] : null;
  const product = (program && program.product_name) || "the product";

  // 3. Find the open conversation or open a fresh one.
  const open = await db.select("conversations", "partner_id=eq." + partner.id + "&status=eq.open&select=*&order=last_active_at.desc&limit=1");
  let conversation = Array.isArray(open) ? open[0] : null;
  if (!conversation) {
    conversation = await db.insert("conversations", {
      partner_id: partner.id,
      subject: "Ongoing thread with " + product,
      mode: "light",
      status: "open",
    });
  }

  // 4. Load the thread so far (oldest → newest), map to interview roles.
  const prior = await db.select("messages", "conversation_id=eq." + conversation.id + "&select=sender,body&order=created_at.asc&limit=30");
  const history = (Array.isArray(prior) ? prior : []).map((m) => ({
    role: m.sender === "partner" ? "user" : "assistant",
    content: String(m.body || ""),
  }));

  // 5. Persist the inbound turn now (so it's recorded even if the AI call fails).
  await db.insert("messages", { conversation_id: conversation.id, sender: "partner", body: text });

  // 6. Run the C2/C3 interview turn against this deployment.
  const messages = history.concat([{ role: "user", content: text }]);
  const turn = await callInterview(base, {
    action: "turn",
    channel: "telegram",
    product,
    plan: { essence: conversation.subject || "", subject: conversation.subject || "" },
    messages,
  });
  const reply = (turn && turn.message) || "";
  const decision = (turn && turn.decision) || "CONTINUE";

  // 7. Persist + send the AI reply (only when there's actually a message).
  if (reply.trim()) {
    await db.insert("messages", {
      conversation_id: conversation.id,
      sender: "observant",
      body: reply,
      meta: { decision, reason: (turn && turn.reason) || "" },
    });
    await sendMessage(chatId, reply);
  }

  // 8. Advance conversation state.
  const status = (decision === "SUFFICIENT") ? "sufficient" : (decision === "PAUSE" ? "paused" : "open");
  try {
    await db.update("conversations", "id=eq." + conversation.id, { status, last_active_at: new Date().toISOString() });
  } catch (err) {
    console.error("[telegram/webhook] conversation update failed:", err && err.message);
  }
}

/* ---------- helpers ---------- */
async function callInterview(base, body) {
  const r = await fetch(base + "/api/selfserve/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
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
