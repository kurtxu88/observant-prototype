# Enabling the voice interview (env setup)

The AI voice interview is fully coded and working — it just needs **one secret set
in the Vercel project's environment**. `api/selfserve/intro-voice.js` reads
`process.env.ELEVENLABS_API_KEY`; if it's missing, the deep-mode interview returns
`needKey` and the front-end falls back to **async text** (that's the "voice shows
as async" behavior on the orcin deploy).

## Turn voice on for this Vercel project
1. Vercel → the **observant-orcin** project → **Settings → Environment Variables**.
2. Add **`ELEVENLABS_API_KEY`** = _(the ElevenLabs key — Xuan will send it
   separately; do **not** paste it into the repo)_.
3. _(Optional)_ Add **`ELEVENLABS_VOICE_ID`** for a specific voice.
4. **Redeploy.** The 10-minute deep interview now runs as a live ElevenLabs voice call.

## Same pattern for real email
`api/selfserve/send-email.js` needs **`RESEND_API_KEY`** (and optional `RESEND_FROM`)
to actually send. Without it, emails are composed but not delivered.

Keys are secrets — they live in Vercel env vars, never in the repo.
See `.env.example` for the full list. (This PR also adds a "Preview the voice
interview" button in the deep-mode compose step, which launches the real
ElevenLabs interview once the key is set.)
