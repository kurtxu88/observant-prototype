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
    const action = payload.action === "translate" ? "translate" : "turn";

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(200).json(noKeyStub(action, payload));
    }

    if (action === "translate") {
      const plan = await translate(payload);
      return res.status(200).json({ ok: true, plan });
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
  const system = readPrompt("C1-question-translator.md");
  const user =
    "PRODUCT: " + product + "\n" +
    (context ? "CONTEXT: " + context + "\n" : "") +
    (wishlist ? "WISHLIST (where to dig deeper if it comes up): " + wishlist + "\n" : "") +
    'TEAM QUESTION: "' + question + '"\n\n' +
    'Return JSON only: {"essence": string, "questions": [string], "subject": string}. ' +
    "essence short; questions = a small set (2-4, usually 3), MOST IMPORTANT FIRST, present-grounded and behavioral; subject is a short human email subject line (used on email).";
  const text = await callClaude(system, [{ role: "user", content: user }], 700);
  return parseJson(text, {
    essence: question,
    questions: ["What's something you ran into with this recently — maybe today? What happened?"],
    subject: "A quick question about your experience",
  });
}

/* ---------- C2 + C3: next interviewer turn + stop decision ---------- */
async function nextTurn(payload) {
  const product = limit(payload.product, 100) || "the product";
  const channel = ["email", "telegram"].includes(payload.channel) ? payload.channel : "email";
  const plan = payload.plan || {};
  const wishlist = limit(payload.wishlist, 500);
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
    "\n" +
    "Output JSON ONLY, no prose outside it, with this shape:\n" +
    '{"message": string,            // your next message to the user (empty string if decision is SUFFICIENT/PAUSE and no message is needed)\n' +
    ' "decision": "CONTINUE"|"SUFFICIENT"|"PAUSE"|"NUDGE",\n' +
    ' "reason": string,             // one line: why this decision\n' +
    ' "report": string }            // only when SUFFICIENT: the concrete answer + a quote, to hand the team. Otherwise "".';

  const text = await callClaude(system, messages, 900);
  const parsed = parseJson(text, null);
  if (parsed && typeof parsed.message === "string") {
    return {
      message: parsed.message,
      decision: ["CONTINUE", "SUFFICIENT", "PAUSE", "NUDGE"].includes(parsed.decision) ? parsed.decision : "CONTINUE",
      reason: limit(parsed.reason, 300),
      report: limit(parsed.report, 1200),
    };
  }
  // If the model returned plain prose, treat it as the message and assume CONTINUE.
  return { message: limit(text, 1200), decision: "CONTINUE", reason: "unparsed", report: "" };
}

function channelHint(channel) {
  if (channel === "telegram") {
    return "CHANNEL: telegram — texting cadence. Ask ONE question at a time, short and chatty; wait for the reply before the next.";
  }
  return "CHANNEL: email — an ongoing thread, warm and human in tone, BUT this message must present the WHOLE remaining question set together: a short warm line, then the questions as a short numbered list, most important first. The person answers them all in one reply. Do NOT drip one question at a time on email. (Only on a later follow-up, if one answer was thin, a single targeted question is fine.)";
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
