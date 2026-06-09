const MAX_BODY_BYTES = 20000;
const DEFAULT_MODEL = "gpt-5.5";

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const question = limit(payload.question, 420);
    const summary = trimSummary(payload.summary || {});
    if (!question) return res.status(400).json({ error: "question is required" });

    const fallback = fallbackAnswer(question, summary);
    if (!process.env.OPENAI_API_KEY) return res.status(200).json(fallback);

    const ai = await generateWithOpenAI(question, summary);
    return res.status(200).json({ ...fallback, ...ai, id: "answer-" + Date.now(), fallback: false });
  } catch (error) {
    return res.status(200).json(fallbackAnswer("What is Observant learning?", {}));
  }
};

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
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function trimSummary(summary) {
  return {
    workspace: {
      companyName: limit(summary.workspace && summary.workspace.companyName, 80) || "Your product",
      learningGoal: limit(summary.workspace && summary.workspace.learningGoal, 360),
    },
    loops: Array.isArray(summary.loops) ? summary.loops.slice(0, 5) : [],
    people: Array.isArray(summary.people) ? summary.people.slice(0, 8) : [],
    events: Array.isArray(summary.events) ? summary.events.slice(0, 8) : [],
    insights: Array.isArray(summary.insights) ? summary.insights.slice(0, 6) : [],
    conversations: Array.isArray(summary.conversations) ? summary.conversations.slice(0, 6) : [],
  };
}

async function generateWithOpenAI(question, summary) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      input: [
        {
          role: "developer",
          content: "Answer as Observant for a no-login SaaS prototype. Ground every answer in the provided synthetic users, events, conversations, and insights. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({ question, summary }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "observant_selfserve_answer",
          strict: false,
          schema: answerSchema(),
        },
      },
    }),
  });
  if (!response.ok) throw new Error("OpenAI request failed");
  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) throw new Error("No model text");
  return JSON.parse(text);
}

function extractOutputText(data) {
  if (data.output_text) return data.output_text;
  const chunks = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.text) chunks.push(content.text);
    });
  });
  return chunks.join("");
}

function answerSchema() {
  const string = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["question", "answer", "evidence", "recommendation", "relatedPersonIds", "relatedInsightIds"],
    properties: {
      question: string,
      answer: string,
      evidence: string,
      recommendation: string,
      relatedPersonIds: { type: "array", items: string },
      relatedInsightIds: { type: "array", items: string },
    },
  };
}

function fallbackAnswer(question, summary) {
  const product = summary.workspace && summary.workspace.companyName || "your product";
  const insight = summary.insights && summary.insights[0];
  const people = summary.people || [];
  return {
    id: "answer-" + Date.now(),
    question,
    fallback: true,
    answer: insight
      ? "Observant is seeing the strongest signal around: " + insight.title + " The synthetic learning lines suggest users are interested, but they need a clearer reason to change their current workflow."
      : "Observant has not collected enough synthetic evidence yet. Create or finish a learning loop for " + product + " so answers can be grounded in users, behavior signals, and private lines.",
    evidence: insight ? insight.evidence : "No insight deliverables are available yet.",
    recommendation: insight ? insight.next : "Start one loop with a narrow user group and one or two behavior signals.",
    relatedPersonIds: people.slice(0, 3).map((person) => person.id).filter(Boolean),
    relatedInsightIds: insight && insight.id ? [insight.id] : [],
  };
}
