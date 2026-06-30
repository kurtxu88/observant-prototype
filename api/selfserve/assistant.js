/* ============================================================
   Observant — feedback assistant endpoint
   ------------------------------------------------------------
   POST { question, product, context, history }
   The Observant assistant helps teams make sense of user feedback
   and turn it into agent-ready build actions. The framing lives in
   the feedback brain (require'd below) — this handler just frames
   the team's product/context and runs the Claude turn.

   Same bare-serverless shape as interview.js: raw fetch to
   Anthropic (no SDK), ANTHROPIC_API_KEY from env, always returns
   a 200-ish JSON body, never throws to the client. Without a key
   it returns a graceful stub so the UI still works.
   ============================================================ */
const { RESEARCH_SYSTEM } = require("./_research-brain");

const MAX_BODY_BYTES = 30000;
const DEFAULT_MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 500; // concise by design — a researcher's answer, not an essay

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const question = limit(payload.question, 4000);
    if (!question) {
      return res.status(200).json({ ok: false, error: "Missing 'question'." });
    }

    const product = limit(payload.product, 120);
    const context = limit(payload.context, 2000);

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(200).json(noKeyStub());
    }

    // System = the research brain + one line orienting it to this team's product.
    let system = RESEARCH_SYSTEM;
    const teamLine =
      (product ? "THE TEAM'S PRODUCT: " + product + "\n" : "") +
      (context ? "WHAT THE TEAM HAS TOLD US (use it to answer sharper; never parrot it back): " + context + "\n" : "");
    if (teamLine) {
      system += "\n\n========================\nTHIS TEAM\n========================\n" + teamLine;
    }

    const messages = buildMessages(payload.history, question);
    const reply = await callClaude(system, messages, MAX_TOKENS);
    return res.status(200).json({ ok: true, reply: reply });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String((error && error.message) || error) });
  }
};

/* Prior turns from `history` (user/assistant) + the new question. */
function buildMessages(history, question) {
  const out = [];
  if (Array.isArray(history)) {
    for (const m of history) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) continue;
      const content = limit(m.content, 4000);
      if (content) out.push({ role: m.role, content });
    }
  }
  out.push({ role: "user", content: question });

  // Anthropic requires the first turn to be a user turn and turns to be non-empty.
  let trimmed = out.slice(-20);
  while (trimmed.length && trimmed[0].role !== "user") trimmed = trimmed.slice(1);
  if (!trimmed.length) trimmed = [{ role: "user", content: question }];
  return trimmed;
}

/* ---------- Claude call (raw API, no SDK) — mirrors interview.js ---------- */
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
      max_tokens: maxTokens || MAX_TOKENS,
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

function noKeyStub() {
  return {
    ok: true,
    stub: true,
    reply:
      "[ANTHROPIC_API_KEY not set] — add it to the Vercel project env (Settings → Environment Variables) and redeploy, then the feedback assistant answers here, helping you turn user feedback into what to build next.",
  };
}

/* ---------- helpers (same shape as interview.js) ---------- */
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
