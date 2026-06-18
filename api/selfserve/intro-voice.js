/* ============================================================
   Observant — ElevenLabs Conversational AI voice agent for the
   10-minute intro. Ported from ~/uxr-claw/src/lib/elevenlabs.ts:
   create a Claude-powered convai agent seeded with the client's
   intro questions; the intro page connects to it for live voice.
   Needs ELEVENLABS_API_KEY (and optionally ELEVENLABS_VOICE_ID).
   ============================================================ */
const fs = require("fs");
const path = require("path");
const PROMPT_DIR = path.join(__dirname, "..", "..", "mvp", "conversation-logic");
function readPrompt(f) { try { return fs.readFileSync(path.join(PROMPT_DIR, f), "utf-8"); } catch (e) { return ""; } }

const BASE = "https://api.elevenlabs.io/v1/convai";
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM"; // Rachel — a standard premade voice present on most accounts

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const product = limit(payload.product, 100) || "the product";
    const essence = limit(payload.essence, 400);
    const deep = !!payload.deep || !!essence;
    const questions = (Array.isArray(payload.introQuestions) ? payload.introQuestions : [])
      .map((q) => limit(q, 240)).filter(Boolean).slice(0, 8);

    if (!process.env.ELEVENLABS_API_KEY) {
      return res.status(200).json({ ok: false, needKey: true });
    }

    const qLines = questions.length
      ? questions.map((q) => "- " + q).join("\n")
      : "- What got you using " + product + ", and how does it fit into your day?";

    // The REAL trained interviewer (C2) + a voice override so it runs as a live call.
    const c2 = readPrompt("C2-continuous-interviewer.md");
    const systemPrompt =
      (c2 ? c2 + "\n\n" : "") +
      "================ OVERRIDE FOR THIS SESSION (these instructions win over anything above) ================\n" +
      "You are on a LIVE ~10-minute VOICE call — SYNCHRONOUS, not async. Ignore any 'no clock / async / email thread / batch / wait days' guidance above: here you SPEAK in short, natural turns, ONE question at a time, and there IS a soft ~10-minute budget. " +
      "KEEP the probing craft from above: anchor on what they actually DID (not hypotheticals); unfold thin answers ('it's fine') into a concrete story; ladder every follow-up to something the team could act on; mirror their words; one construct at a time; follow the richest thread rather than reading a list. " +
      "PRODUCT: " + product + ". " +
      (deep ? "This is a DEEPER conversation on a specific topic. " : "This is a warm get-to-know-you intro with a brand-new feedback partner who just opted in. ") +
      (essence ? "WHAT WE'RE REALLY AFTER: " + essence + ". " : "GOAL: understand them as a person and a user so the team can tailor future questions to them. ") +
      "COVER THESE, conversationally and one at a time:\n" + qLines + "\n" +
      "When you have a genuine, concrete feel for the answer, thank them warmly and wrap up — don't drag it out.";
    const firstMessage = deep
      ? "Hey, thanks so much for making the time — this'll be about ten minutes, and there are no wrong answers. " + (questions[0] ? "To start: " + questions[0] : "To start, tell me a bit about how you actually use " + product + " day to day.")
      : "Hi! Thanks so much for joining the " + product + " feedback program. I'd love to get to know you for a few minutes so the team can tailor what they ask you down the line. To start — what got you using " + product + "?";

    const voiceId = await resolveVoiceId(process.env.ELEVENLABS_API_KEY, process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE);
    const agent = await createAgent(process.env.ELEVENLABS_API_KEY, {
      name: "Observant intro — " + product,
      systemPrompt, firstMessage, voiceId,
    });
    let signedUrl = "";
    try { signedUrl = await getSignedUrl(process.env.ELEVENLABS_API_KEY, agent.agent_id); } catch (e) { /* widget can use agent_id directly */ }
    return res.status(200).json({ ok: true, agentId: agent.agent_id, signedUrl });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

async function createAgent(apiKey, opts) {
  const payload = {
    name: opts.name,
    conversation_config: {
      agent: { first_message: opts.firstMessage, language: "en", prompt: { prompt: opts.systemPrompt, llm: "claude-sonnet-4-5", temperature: 0.5 } },
      tts: { voice_id: opts.voiceId || DEFAULT_VOICE, model_id: "eleven_v3_conversational", stability: 0.8, similarity_boost: 0.3, speed: 0.92 },
      turn: { turn_timeout: 10 },
    },
    platform_settings: { auth: { enable_auth: false } },
  };
  const res = await fetch(BASE + "/agents/create", { method: "POST", headers: { "xi-api-key": apiKey, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error("ElevenLabs " + res.status + ": " + (await res.text()).slice(0, 240));
  return res.json();
}
// Use a voice that actually exists in THIS account: keep the preferred one if present,
// else a premade voice, else whatever the account has.
async function resolveVoiceId(apiKey, preferred) {
  try {
    const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": apiKey } });
    if (!r.ok) return preferred;
    const voices = ((await r.json()) || {}).voices || [];
    if (!voices.length) return preferred;
    if (preferred && voices.some((v) => v.voice_id === preferred)) return preferred;
    const premade = voices.find((v) => v.category === "premade");
    return (premade && premade.voice_id) || voices[0].voice_id || preferred;
  } catch (e) { return preferred; }
}
async function getSignedUrl(apiKey, agentId) {
  const res = await fetch(BASE + "/conversation/get-signed-url?agent_id=" + agentId, { headers: { "xi-api-key": apiKey } });
  if (!res.ok) throw new Error("signed-url " + res.status);
  return (await res.json()).signed_url;
}

function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
async function readJson(req) { if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; let b = ""; for await (const c of req) { b += c; if (b.length > 20000) throw new Error("too large"); } return b ? JSON.parse(b) : {}; }
function limit(v, n) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n); }
