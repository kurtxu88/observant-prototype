# Cloudflare Email Worker — true inbound email (Build #4)

Lets a partner **reply directly in their inbox** and have it continue the Observant loop.
Cloudflare Email Routing catches the reply → runs `email-worker.js` → it POSTs the plain text
to `/api/selfserve/inbound-email`, which scores it, awards the reward, and sends the next question.

> The *sending* half already works (Resend + your verified domain). This adds the *receiving* half.
> You don't need this to use the loop — every email has an "Answer here →" link as the fallback.

## Setup (one time, ~10 min)

**1. Create the Worker**
- Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker** → give it a name
  (e.g. `observant-inbound`) → **Deploy**.
- Click **Edit code**, delete the template, and **paste the whole contents of `email-worker.js`** → **Deploy**.

**2. Point your inbound address at the Worker**
- Cloudflare dashboard → your domain (`observanthq.com`) → **Email** → **Email Routing** → enable it
  (Cloudflare auto-adds the MX records since your DNS is already on Cloudflare).
- Under **Routing rules**, add a rule: route **`feedback@observanthq.com`** (the same mailbox you set as
  `RESEND_REPLY_TO`) → action **Send to a Worker** → pick `observant-inbound`.
  *(Or use the catch-all rule → Send to a Worker, if you want every address to route in.)*

**3. (Optional but recommended) shared secret**
- Make up a random string. Set it in **two** places so only your Worker can post to the endpoint:
  - The Worker: Workers & Pages → `observant-inbound` → **Settings → Variables** → add `INBOUND_SECRET` = your string.
  - Vercel: `observant-prototype` → Settings → Environment Variables → add `INBOUND_SECRET` = the **same** string → redeploy.
- If you skip this, it still works (the endpoint only ever acts on emails from *known* partners), just without the extra lock.

## Test
Send yourself a feedback email (or go through join → first question), then **reply to it from your inbox**.
Within a few seconds the reply should appear in the conversation, earn the reward, and a follow-up should
arrive. Check the Worker's **Logs** (Cloudflare) and the function logs (Vercel) if anything's quiet.

## Notes
- The endpoint (`api/selfserve/inbound-email.js`) is provider-agnostic — it accepts a simple
  `{ from, to, subject, text }` POST, so this Worker and Resend Inbound are interchangeable.
- The Worker strips quoted history/signatures crudely; the endpoint strips again, so only the partner's
  freshly-typed reply is scored.
