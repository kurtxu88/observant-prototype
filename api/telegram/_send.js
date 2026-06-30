/* ============================================================
   Observant — Telegram outbound (#5).
   sendMessage(chatId, text) POSTs to the Bot API. Used by the
   inbound webhook (./webhook) to reply in the user's chat.

   No SDK — raw fetch, same pattern as api/selfserve/*.js.
   No-op (returns null) when TELEGRAM_BOT_TOKEN is missing, so the
   whole integration degrades gracefully on a deployment without a bot.

   This file also exports a bare handler so Vercel treats it as a
   valid (if unused) serverless function; sendMessage rides as a
   property: require("./send").sendMessage.
   ============================================================ */

// Send one message to a Telegram chat. Returns the Telegram API
// result object, or null when un-configured / on any failure.
async function sendMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;                       // no bot → no-op
  const body = String(text == null ? "" : text).trim();
  if (!chatId || !body) return null;

  try {
    const res = await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: body.slice(0, 4096),               // Telegram hard cap per message
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!data || data.ok !== true) {
      console.error("[telegram/send] API error:", data && data.description);
      return null;
    }
    return data.result;
  } catch (err) {
    console.error("[telegram/send] failed:", err && err.message);
    return null;
  }
}

// Bare handler so this file is a valid Vercel function if ever routed.
module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(405).json({ error: "helper module — not a route" });
};
module.exports.sendMessage = sendMessage;
