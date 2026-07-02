/* ============================================================
   Observant — Telegram outbound ROUTE (#5).
   The loop dispatchers (api/cron/cadence.js + api/selfserve/send-loop.js)
   fire-and-forget POST here to push one question into a partner's chat:
       fetch(base + "/api/telegram/send", { chatId, text })
   Without this route those dispatches 404 and the Telegram loop never
   delivers. All the real work lives in ./_send.sendMessage — this file is
   just the HTTP wrapper around it.

     POST /api/telegram/send
     body: { chatId, text }   (callers also send `product` — ignored here)
     → { ok:true }                     when delivered (or best-effort)
     → { ok:true, simulated:true }     when no TELEGRAM_BOT_TOKEN (no-op)

   Bare-serverless: never throws; a delivery failure still returns ok so the
   caller's best-effort dispatch doesn't blow up the whole loop.
   ============================================================ */
const { sendMessage } = require("./_send");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const body = await readJson(req);
    const chatId = body.chatId != null ? String(body.chatId).trim() : "";
    const text = body.text != null ? String(body.text) : "";
    if (!chatId || !text.trim()) {
      return res.status(400).json({ ok: false, error: "chatId and text required" });
    }

    // No bot configured → sendMessage no-ops (returns null). Report simulated
    // so the caller records a (harmless) success in the static/no-token demo.
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(200).json({ ok: true, simulated: true });
    }

    const result = await sendMessage(chatId, text);
    return res.status(200).json({ ok: true, delivered: !!result });
  } catch (error) {
    console.error("[telegram/send] route failed:", error && error.message);
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

async function readJson(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let b = "";
  for await (const c of req) { b += c; if (b.length > 60000) throw new Error("too large"); }
  return b ? JSON.parse(b) : {};
}
