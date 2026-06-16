/* ============================================================
   Observant — live interview endpoint (conversation-logic test surface)
   Runs C1 (translate) / C2 (continuous interviewer) + C3 (stop policy)
   turn-by-turn against Claude. Loads the prompt files at runtime as the
   source of truth — does NOT hardcode them (see mvp/conversation-logic).
   ============================================================ */
const fs = require("fs");
const path = require("path");

const MAX_BODY_BYTES = 30000;
const DEFAULT_MODEL = "claude-sonnet-4-6";
const PROMPT_DIR = path.join(__dirname, "..", "..", "mvp", "conversation-logic");

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const action = ["translate", "synthesize"].includes(payload.action) ? payload.action : "turn";

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(200).json(noKeyStub(action, payload));
    }

    if (action === "translate") {
      const plan = await translate(payload);
      return res.status(200).json({ ok: true, plan });
    }
    if (action === "synthesize") {
      const memory = await synthesize(payload);
      return res.status(200).json({ ok: true, memory });
    }
    const turn = await nextTurn(payload);
    return res.status(200).json({ ok: true, ...turn });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String(error && error.message || error) });
  }
};

/* ---------- C1: raw question -> essence + opening question ---------- */
async function translate(payload) {
  const question = limit(payload.question, 500);
  const product = limit(payload.product, 100) || "the product";
  const wishlist = limit(payload.wishlist, 500);
  const context = limit(payload.context, 600);
  const memory = limit(payload.memory, 1200);
  const system = readPrompt("C1-question-translator.md");
  const user =
    "PRODUCT: " + product + "\n" +
    (context ? "CONTEXT: " + context + "\n" : "") +
    (memory ? "WHAT WE ALREADY KNOW ABOUT THIS PERSON (from their intro — tailor to them, reference it naturally, don't ask what's already answered): " + memory + "\n" : "") +
    (wishlist ? "WISHLIST (where to dig deeper if it comes up): " + wishlist + "\n" : "") +
    'TEAM QUESTION: "' + question + '"\n\n' +
    'Return JSON only: {"essence": string, "questions": [string], "subject": string}. ' +
    "essence short; questions = a small set (2-4, usually 3), MOST IMPORTANT FIRST, anchored on TODAY and behavioral (no 'last time', no closed 'is there anything'); subject = the subject of the ONE ongoing thread (not about this round's topic), reading like a REAL, personal note from the [product] team that warrants attention — NOT a 'feedback program'/onboarding label, not spammy. e.g. 'A couple questions from the Northwind team'.";
  const text = await callClaude(system, [{ role: "user", content: user }], 700);
  return parseJson(text, {
    essence: question,
    questions: ["What's something you ran into with this recently — maybe today? What happened?"],
    subject: "A quick question about your experience",
  });
}

/* ---------- C4: synthesize a per-person memory from the intro conversation ---------- */
async function synthesize(payload) {
  const product = limit(payload.product, 100) || "the product";
  const messages = normalizeMessages(payload.messages);
  const transcript = messages.map((m) => (m.role === "user" ? "User: " : "Observant: ") + m.content).join("\n");
  const system =
    "You build a compact MEMORY PROFILE of a product user from a short intro conversation, so the team's future questions can be tailored to them. " +
    "Capture, in their own framing and only what's actually supported: who they are / their role, how they use " + product + " day to day, the context around it, and what they care about or struggle with. " +
    "3–5 short factual lines (or a tight paragraph). No preamble, no fluff, no invention — output the profile text only.";
  const text = await callClaude(system, [{ role: "user", content: "Conversation:\n" + transcript + "\n\nWrite the memory profile." }], 400);
  return limit(text, 1200);
}

/* ---------- C2 + C3: next interviewer turn + stop decision ---------- */
async function nextTurn(payload) {
  const product = limit(payload.product, 100) || "the product";
  const channel = ["email", "telegram"].includes(payload.channel) ? payload.channel : "email";
  const plan = payload.plan || {};
  const wishlist = limit(payload.wishlist, 500);
  const memory = limit(payload.memory, 1200);
  let temp = Number(payload.exploration);
  if (!(temp >= 0 && temp <= 1)) temp = 0.5; // continuous 0..1 "temperature"
  const final = !!payload.final;
  const messages = normalizeMessages(payload.messages);
  const minutesSinceReply = Number(payload.minutesSinceReply || 0);

  const system =
    readPrompt("C2-continuous-interviewer.md") +
    "\n\n========================\nSTOP POLICY (C3):\n========================\n" +
    readPrompt("C3-stop-policy.md") +
    "\n\n========================\nRUNTIME\n========================\n" +
    "PRODUCT: " + product + "\n" +
    channelHint(channel) + "\n" +
    "MINUTES SINCE USER'S LAST MESSAGE: " + minutesSinceReply + "\n" +
    "WHAT WE'RE LEARNING (essence + question set, most important first, from C1): " + JSON.stringify(plan) + "\n" +
    (wishlist ? "WISHLIST / dig deeper here if the conversation opens it up: " + wishlist + "\n" : "") +
    (memory ? "WHAT WE ALREADY KNOW ABOUT THIS PERSON (from their intro — tailor to them, reference it naturally, never re-ask what's known): " + memory + "\n" : "") +
    "EXPLORATION TEMPERATURE: " + temp.toFixed(2) + " on a 0-1 scale (0 = stick strictly to the client's questions, 1 = roam freely). " + explorationHint(temp) + "\n" +
    (final ? "FINAL FOLLOW-UP — this is the ONLY follow-up for this inquiry. Ask AT MOST 3 genuinely important questions their answers opened up; fewer is better. If nothing is genuinely worth asking, do NOT ask — decide SUFFICIENT with an empty message. Never manufacture questions to fill space.\n" : "") +
    "\n" +
    "FORMAT — write your next message to the user in PLAIN TEXT (it may be multiple lines or a numbered list — do NOT JSON-encode it, do NOT use code fences). Then on its own line write exactly:\n" +
    "---META---\n" +
    "and then these three lines:\n" +
    "DECISION: CONTINUE|SUFFICIENT|PAUSE|NUDGE\n" +
    "REASON: <one line>\n" +
    "REPORT: <only if SUFFICIENT — the concrete answer + a short quote for the team; otherwise leave blank>\n" +
    "Everything before ---META--- is the message; it must be NON-EMPTY when DECISION is CONTINUE or NUDGE.";

  let out = await callClaude(system, messages, 900);
  let meta = splitMeta(out);
  if (!meta.message.trim() && (meta.decision === "CONTINUE" || meta.decision === "NUDGE")) {
    const retry = await callClaude(
      system + "\n\nYour previous reply had an empty message but decided " + meta.decision + ". Write the actual follow-up message now (plain text), then the ---META--- block.",
      messages, 700
    );
    const rm = splitMeta(retry);
    if (rm.message.trim()) meta = rm;
  }
  return meta;
}

/* Newline-safe parse: message is plain text before ---META---; decision/reason/report after. */
function splitMeta(text) {
  const raw = String(text || "");
  const idx = raw.indexOf("---META---");
  let message = (idx >= 0 ? raw.slice(0, idx) : raw).trim();
  message = message.replace(/^```[a-z]*\s*/i, "").replace(/\s*```$/i, "").trim();
  const metaStr = idx >= 0 ? raw.slice(idx) : "";
  const dm = metaStr.match(/DECISION:\s*(CONTINUE|SUFFICIENT|PAUSE|NUDGE)/i);
  const rm = metaStr.match(/REASON:\s*([^\n]*)/i);
  const pm = metaStr.match(/REPORT:\s*([\s\S]*)/i);
  return {
    message: message,
    decision: dm ? dm[1].toUpperCase() : "CONTINUE",
    reason: rm ? limit(rm[1], 300) : "",
    report: pm ? limit(pm[1], 1200) : "",
  };
}

function explorationHint(temp) {
  if (temp <= 0.25) return "Protocol-tight: stay on the client's questions; don't chase tangents.";
  if (temp >= 0.7) return "Explore freely: actively chase interesting/off-brief threads and reframe — the client's questions are a starting point, not a fence (every follow-up must still ladder to something useful).";
  return "Balanced: follow genuinely interesting threads when they surface, but keep returning to the client's questions.";
}

function channelHint(channel) {
  if (channel === "telegram") {
    return "CHANNEL: telegram — texting cadence. Ask ONE question at a time, short and chatty; wait for the reply before the next.";
  }
  return "CHANNEL: email — an ongoing thread, PROFESSIONAL and warm (not breezy/casual). " +
    "FIRST email — they have ALREADY opted in via the invitation, so do NOT re-pitch the program or repeat the rewards spiel. Just a short professional note that briefly recaps and sets how this thread works: (a) this is the [product] feedback program; (b) we'll have a back-and-forth right here in this email thread, and you can email us anytime with any new insight or anything you want to share; (c) we'll also periodically reach out with questions; (d) every response is logged and converted into rewards on the [product] platform. THEN 'To start, we have a few questions about your [topic] experience:' and the whole set as a short NUMBERED list, most important first. Tight and professional, not a re-pitch. " +
    "RULE — EVERY email carries a small BATCH of ~3 questions; never one-question-then-wait (too costly — people won't keep returning to the thread). Extract as much as possible per reply and relate it to the client's questions/context. " +
    "FOLLOW-UP email — you get ONLY ONE per inquiry: a short recap paragraph, then UP TO 3 genuinely-worth-asking questions (fewer is better; bold a brand-new-topic one with **double asterisks**). If nothing is genuinely worth a follow-up, send none — decide SUFFICIENT. Never pad to three, never ask for asking's sake.";
}

/* ---------- Claude call (raw API, no SDK) ---------- */
async function callClaude(system, messages, maxTokens) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
      max_tokens: maxTokens || 900,
      system,
      messages,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Anthropic " + response.status + ": " + detail.slice(0, 300));
  }
  const data = await response.json();
  const block = (data.content || []).find((c) => c.type === "text");
  return block ? block.text : "";
}

/* ---------- helpers ---------- */
function readPrompt(file) {
  return fs.readFileSync(path.join(PROMPT_DIR, file), "utf-8");
}

function normalizeMessages(list) {
  if (!Array.isArray(list)) return [{ role: "user", content: "hi" }];
  const out = list
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: limit(m.content, 4000) }));
  if (!out.length || out[0].role !== "user") out.unshift({ role: "user", content: "(start the conversation)" });
  return out.slice(-30);
}

function parseJson(text, fallback) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) { try { return JSON.parse(match[0]); } catch (e2) { /* fall through */ } }
    return fallback;
  }
}

function noKeyStub(action, payload) {
  if (action === "synthesize") {
    return { ok: true, stub: true, memory: "[ANTHROPIC_API_KEY not set] would summarize this person from their intro." };
  }
  if (action === "translate") {
    return {
      ok: true,
      stub: true,
      plan: {
        essence: "[ANTHROPIC_API_KEY not set] would distill: " + limit(payload.question, 200),
        questions: ["Set ANTHROPIC_API_KEY (local env or Vercel project) to run the live interviewer."],
        subject: "(set ANTHROPIC_API_KEY)",
      },
    };
  }
  return {
    ok: true,
    stub: true,
    message: "[ANTHROPIC_API_KEY not set] — add it to the Vercel project env (Settings → Environment Variables) and redeploy, then the live interviewer runs here.",
    decision: "CONTINUE",
    reason: "no key",
    report: "",
  };
}

function setJson(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

async function readJson(req) {
  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("Payload too large");
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  }
  return body ? JSON.parse(body) : {};
}

function limit(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, max);
}
