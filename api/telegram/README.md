# Telegram channel (#5)

The same 1:1 feedback loop the email path runs (`api/selfserve/inbound-email.js`),
but over a Telegram bot. A partner taps **Connect Telegram** on the join page
(`app/join.jsx`) → opens the bot deep link → the bot links their chat to the
program and runs the loop (quality gate → award pre-determined minutes on PASS →
ask at most one follow-up, then stop).

## Files

- `webhook.js` — the webhook Telegram POSTs every update to. Handles `/start`
  (deep-link opt-in → links chat to program, sends a welcome question) and
  normal messages (the interview loop). Always returns 200.
- `_send.js` — `sendMessage(chatId, text)` via the Bot API. `_`-prefixed so
  Vercel doesn't route it. No-ops without `TELEGRAM_BOT_TOKEN`.

## One-time setup (Xuan)

1. **Create the bot**: message [@BotFather](https://t.me/BotFather) → `/newbot`
   → pick a name + a username (e.g. `ObservantFeedbackBot`). BotFather returns a
   **token** like `123456:ABC-DEF...`.

2. **Set the token in Vercel** (Project → Settings → Environment Variables):

   ```
   TELEGRAM_BOT_TOKEN = 123456:ABC-DEF...
   ```

   Redeploy so the functions pick it up. (Without it, the bot just no-ops.)

3. **Point Telegram at the webhook** — run once (no dashboard for this):

   ```sh
   curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://www.observanthq.com/api/telegram/webhook"
   ```

   Expect `{"ok":true,"result":true,"description":"Webhook was set"}`.
   Check anytime with `.../getWebhookInfo`.

4. **Tell the dev the bot username** so the deep link is real: set
   `OBSERVANT_BOT` in `app/join.jsx` (currently the placeholder `OBSERVANT_BOT`)
   to your bot's username **without the `@`**, e.g. `ObservantFeedbackBot`.

5. *(Optional)* Run `db/migrations/telegram.sql` to store each partner's
   `@username` (display only — the loop works without it).

## How the connect flow links a chat

`Connect Telegram` opens `https://t.me/<bot>?start=<payload>`, where `<payload>`
is `base64url(JSON{slug,productName,rate})` (or the bare slug if that overflows
Telegram's 64-char cap). Telegram delivers it as `/start <payload>`; the webhook
decodes it, upserts the program + a `channel='telegram'` partner keyed by
`chat_id` (stored in `contact`), and replies with the first question.
