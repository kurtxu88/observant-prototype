const MAX_BODY_BYTES = 24000;
const DEFAULT_MODEL = "gpt-5.5";

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const payload = await readJson(req);
    const workspace = cleanWorkspace(payload.workspace);
    const loopConfig = cleanLoopConfig(payload.loopConfig);
    const runId = cleanId(payload.runId || "run-" + Date.now().toString(36));

    if (!workspace.companyName || !loopConfig.question) {
      return res.status(400).json({ error: "workspace and loopConfig.question are required" });
    }

    const fallback = fallbackSimulation(workspace, loopConfig, runId);
    if (!process.env.OPENAI_API_KEY) return res.status(200).json(fallback);

    const ai = await generateWithOpenAI(workspace, loopConfig, runId);
    return res.status(200).json(normalizeSimulation(ai, fallback));
  } catch (error) {
    return res.status(200).json(fallbackSimulation({}, {}, "run-" + Date.now().toString(36), true));
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

function cleanId(value) {
  return limit(value, 80).replace(/[^a-zA-Z0-9_-]/g, "") || "run";
}

function cleanWorkspace(input = {}) {
  return {
    companyName: limit(input.companyName, 80) || "Your product",
    productUrl: limit(input.productUrl, 160),
    learningGoal: limit(input.learningGoal, 360) || "Learn what users need next.",
    founderName: limit(input.founderName, 80),
  };
}

function cleanLoopConfig(input = {}) {
  return {
    name: limit(input.name, 90) || "New learning loop",
    question: limit(input.question, 420) || "What should we learn from users?",
    groupIds: cleanList(input.groupIds, ["power-users", "evaluators"]),
    surfaceIds: cleanList(input.surfaceIds, ["product"]),
    signalIds: cleanList(input.signalIds, ["feature_opened"]),
  };
}

function cleanList(value, fallback) {
  const list = Array.isArray(value) ? value.map((item) => limit(item, 50)).filter(Boolean) : [];
  return list.length ? list.slice(0, 6) : fallback;
}

async function generateWithOpenAI(workspace, loopConfig, runId) {
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
          content: "You generate synthetic SaaS user-learning data for a no-login product prototype. Return JSON only. Do not claim real users were contacted.",
        },
        {
          role: "user",
          content: JSON.stringify({ runId, workspace, loopConfig, requirements: outputContract() }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "observant_selfserve_simulation",
          strict: false,
          schema: simulationSchema(),
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

function outputContract() {
  return {
    users: "5 synthetic users with id, name, color, segment, surface, status, memory, last",
    groups: "2-4 synthetic groups with id, sourceId, name, size, signal, detail",
    conversations: "one 1:1 line per user, each with 2-4 messages using t=them/user/relay/system",
    events: "3-5 synthetic behavior events tied to conversation IDs",
    insights: "2 evidence-backed insights tied to a conversation and the loop",
    nextQuestions: "3 follow-up questions the team could relay",
    timeline: "use the five provided progress stages",
  };
}

function simulationSchema() {
  const string = { type: "string" };
  return {
    type: "object",
    additionalProperties: false,
    required: ["runId", "generatedAt", "fallback", "loop", "users", "groups", "conversations", "events", "insights", "nextQuestions", "timeline"],
    properties: {
      runId: string,
      generatedAt: string,
      fallback: { type: "boolean" },
      loop: {
        type: "object",
        additionalProperties: true,
        required: ["id", "name", "status", "cadence", "people", "active", "memory", "question", "surfaceIds", "signalIds", "groupIds"],
        properties: {
          id: string, name: string, status: string, cadence: string, question: string,
          people: { type: "number" }, active: { type: "number" }, memory: { type: "number" },
          surfaceIds: { type: "array", items: string },
          signalIds: { type: "array", items: string },
          groupIds: { type: "array", items: string },
        },
      },
      users: { type: "array", items: { type: "object", additionalProperties: true } },
      groups: { type: "array", items: { type: "object", additionalProperties: true } },
      conversations: { type: "array", items: { type: "object", additionalProperties: true } },
      events: { type: "array", items: { type: "object", additionalProperties: true } },
      insights: { type: "array", items: { type: "object", additionalProperties: true } },
      nextQuestions: { type: "array", items: string },
      timeline: { type: "array", items: { type: "object", additionalProperties: true } },
    },
  };
}

function normalizeSimulation(ai, fallback) {
  return {
    ...fallback,
    ...ai,
    runId: fallback.runId,
    fallback: false,
    loop: { ...fallback.loop, ...(ai.loop || {}), id: fallback.loop.id },
    users: Array.isArray(ai.users) && ai.users.length ? ai.users.slice(0, 6) : fallback.users,
    groups: Array.isArray(ai.groups) && ai.groups.length ? ai.groups.slice(0, 5) : fallback.groups,
    conversations: Array.isArray(ai.conversations) && ai.conversations.length ? ai.conversations.slice(0, 6) : fallback.conversations,
    events: Array.isArray(ai.events) && ai.events.length ? ai.events.slice(0, 6) : fallback.events,
    insights: Array.isArray(ai.insights) && ai.insights.length ? ai.insights.slice(0, 4) : fallback.insights,
    nextQuestions: Array.isArray(ai.nextQuestions) && ai.nextQuestions.length ? ai.nextQuestions.slice(0, 4) : fallback.nextQuestions,
  };
}

function fallbackSimulation(workspaceInput = {}, configInput = {}, runId, errored) {
  const workspace = cleanWorkspace(workspaceInput);
  const config = cleanLoopConfig(configInput);
  const product = workspace.companyName || "Your product";
  const actualRunId = runId || "run-" + Date.now().toString(36);
  const loopId = "loop-" + actualRunId;
  const names = ["Avery N.", "Samir P.", "Elena R.", "Jordan M.", "Mina S."];
  const colors = ["rust", "green", "blue", "gold", "teal"];
  const quotes = [
    "I like the promise, but I need proof it fits our current workflow.",
    "The missing piece is showing my team why this changes our week.",
    "I would try it if the first useful output appeared before setup got heavy.",
    "We keep circling the same decision because nobody owns the handoff.",
    "I need a recommendation I can defend, not another page to inspect.",
  ];
  const users = names.map((name, index) => ({
    id: actualRunId + "-person-" + index,
    name,
    color: colors[index % colors.length],
    segment: groupLabel(config.groupIds[index % config.groupIds.length]),
    surface: surfaceLabel(config.surfaceIds[index % config.surfaceIds.length]),
    status: index < 2 ? "Active now" : index < 4 ? "Async" : "Watching",
    memory: "Synthetic context for " + config.question,
    last: quotes[index],
  }));
  const conversations = users.map((user, index) => ({
    id: actualRunId + "-conv-" + index,
    userId: user.id,
    title: user.segment + " learning line",
    state: index < 2 ? "Active" : index < 4 ? "Async" : "Watching",
    messages: [
      { t: "them", text: "Hi " + user.name.split(" ")[0] + " - what matters most for " + product + " when you think about: " + config.question, meta: "Observant - synthetic 1:1" },
      { t: "user", text: user.last, meta: user.name.split(" ")[0] },
    ],
  }));
  const events = conversations.slice(0, 4).map((conversation, index) => ({
    id: actualRunId + "-evt-" + index,
    event: config.signalIds[index % config.signalIds.length],
    user: users[index].name,
    detail: index % 2 ? "opened related settings twice" : "returned to the same decision point",
    time: ["2m ago", "9m ago", "21m ago", "46m ago"][index],
    type: "synthetic",
    conversationId: conversation.id,
  }));
  return {
    runId: actualRunId,
    generatedAt: new Date().toISOString(),
    fallback: true,
    loop: {
      id: loopId,
      name: config.name,
      status: "Collecting",
      cadence: "Synthetic panel",
      people: 0,
      active: 0,
      memory: 0,
      question: config.question,
      surfaceIds: config.surfaceIds,
      signalIds: config.signalIds,
      groupIds: config.groupIds,
    },
    users,
    groups: config.groupIds.map((id, index) => ({
      id: actualRunId + "-group-" + id,
      sourceId: id,
      name: groupLabel(id),
      size: String(18 + index * 7) + " synthetic matches",
      signal: config.signalIds[index % config.signalIds.length],
      detail: "Matched to " + config.question,
    })),
    conversations,
    events,
    insights: [
      {
        id: actualRunId + "-insight-primary",
        title: "Users need proof that " + product + " fits their existing workflow.",
        metric: errored ? "Fallback" : "66%",
        detail: "Synthetic lines show interest, but users need evidence that the product removes coordination work.",
        evidence: "Grounded in " + users.length + " synthetic users and " + events.length + " behavior signals.",
        next: "Show a first useful output before asking users to commit setup time.",
        conversationId: conversations[0].id,
        loopId,
      },
    ],
    nextQuestions: [
      "What proof would make " + product + " feel worth trying?",
      "Who else on the team would need to trust this?",
      "Which result would make this pattern roadmap-ready?",
    ],
    timeline: [
      { id: "match", label: "Finding matching users", detail: "Synthetic users are being matched to the loop audience." },
      { id: "lines", label: "Opening private lines", detail: "Observant opens 1:1 learning lines with matched people." },
      { id: "replies", label: "Collecting replies", detail: "Early answers and behavior signals start coming in." },
      { id: "patterns", label: "Detecting patterns", detail: "Repeated context is grouped into stronger signals." },
      { id: "insights", label: "Drafting insights", detail: "Evidence-backed recommendations are prepared for the team." },
    ],
  };
}

function groupLabel(id) {
  const labels = {
    "power-users": "Power users",
    "new-signups": "New signups",
    evaluators: "Upgrade evaluators",
    admins: "Workspace admins",
    "at-risk": "At-risk users",
  };
  return labels[id] || id;
}

function surfaceLabel(id) {
  const labels = { product: "In-product", browser: "Browser companion", email: "Email" };
  return labels[id] || id;
}
