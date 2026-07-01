/* ============================================================
   Observant MCP — tool surface + implementations (helper, NOT a route)
   ------------------------------------------------------------
   The "_" prefix keeps this out of Vercel's file-based routing.
   It's require()'d by api/mcp/index.js, which speaks the MCP
   JSON-RPC-over-HTTP transport. This file just defines the tools
   and runs them.

   TWO KINDS OF TOOLS, ONE ENTRY POINT
   -----------------------------------
   1. Observant tools (REAL, DB-backed) — pull the user feedback
      Observant has already collected for this team:
        • observant_recent_feedback  — in-product snippet feedback
        • observant_conversations    — off-product 1:1 threads (email/Telegram)
      Both read Supabase via api/_db.js and degrade gracefully to a
      small simulated payload when no DB is configured (demo/local).

   2. Codified bridge tools (REAL PROXY when CODIFIED_API_KEY is set).
      Codified is the research/synthesis engine — a SEPARATE live
      product (the Codified MCP at CODIFIED_MCP_URL, default
      https://api.usercodified.com/mcp). We do NOT embed Codified's
      backend; we PROXY to it over its own JSON-RPC/streamable-HTTP
      transport using an org-scoped Bearer key (cdf_…):
        • CODIFIED_API_KEY set → on tools/list we also fetch Codified's
          tools/list and merge them in, prefixed `codified_…`; on
          tools/call for a `codified_…` tool we forward to Codified's
          tools/call with the un-prefixed real name + args and return
          the result. If dynamic listing fails we fall back to a fixed
          `codified_*` set (query_insights / search_transcripts /
          run_study / synthesize_journey) whose handlers still proxy.
        • CODIFIED_API_KEY NOT set → each `codified_*` tool returns a
          doc-stub ("add CODIFIED_API_KEY in Vercel to enable").
      Observant holds the raw feedback; Codified orchestrates studies
      + synthesis over it.

   Every tool returns the MCP content shape:
     { content: [{ type: "text", text }], isError? }
   ============================================================ */
const db = require("../_db");

/* ---------------------------------------------------------------
   TOOL DEFINITIONS (what `tools/list` advertises). Keep the
   descriptions agent-facing: an editor agent reads these to decide
   when to call them.
   --------------------------------------------------------------- */
const OBSERVANT_TOOLS = [
  {
    name: "observant_recent_feedback",
    source: "observant",
    description:
      "Pull the most recent in-product feedback your users left through Observant's snippet (thumbs up/down on AI output, short text, exit reasons, CSAT). Use this to see what users are reacting to in the product right now, in their words.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "Optional program/site slug to scope to one product." },
        type: { type: "string", enum: ["feedback", "eval", "exit", "csat"], description: "Optional filter by feedback kind." },
        limit: { type: "integer", description: "Max items to return (1-50, default 20).", minimum: 1, maximum: 50 },
      },
    },
  },
  {
    name: "observant_conversations",
    source: "observant",
    description:
      "Pull recent off-product 1:1 feedback conversations (email/Telegram threads Observant ran with named users) with their full turns. Use this to read the WHY behind behavior — what specific users actually said over time. Each thread is one user's living feedback file.",
    inputSchema: {
      type: "object",
      properties: {
        product: { type: "string", description: "Optional product name to scope to." },
        slug: { type: "string", description: "Optional program slug to scope to (preferred over product)." },
        contact: { type: "string", description: "Optional single user email/handle to read one person's thread." },
        limit: { type: "integer", description: "Max conversations to return (1-25, default 10).", minimum: 1, maximum: 25 },
      },
    },
  },
  {
    name: "observant_insights",
    source: "observant",
    description:
      "Pull synthesized Signals — the patterns Observant has surfaced across feedback (Issues / Insights / Opportunities), each grounded in named users and verbatim quotes. NOTE: synthesis is powered by the Codified engine; this is the Observant-side view of it. See codified_query_insights for the live research engine.",
    inputSchema: {
      type: "object",
      properties: {
        feature: { type: "string", description: "Optional feature/topic to filter signals (e.g. 'checkout', 'onboarding')." },
        limit: { type: "integer", description: "Max signals (1-20, default 8).", minimum: 1, maximum: 20 },
      },
    },
  },
];

/* ---------------------------------------------------------------
   CODIFIED BRIDGE TOOLS (fixed fallback surface).
   These are advertised whenever we CAN'T dynamically list the live
   Codified MCP — either because no CODIFIED_API_KEY is set (stub
   mode) or because the live tools/list call failed. When a key IS
   set and the live listing succeeds, this fixed set is REPLACED by
   the real, dynamically-fetched Codified tool list (name-prefixed
   `codified_…`). Either way, calling a `codified_*` tool with a key
   set proxies to the live Codified MCP; without a key it returns the
   "add CODIFIED_API_KEY" stub. Names/shapes below mirror the REAL
   Codified MCP tools (kurtxu88/codify_v2 packages/mcp-server).
   --------------------------------------------------------------- */
const CODIFIED_PREFIX = "codified_";
const CODIFIED_FALLBACK_TOOLS = [
  {
    name: "codified_query_insights",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `query_insights`. Search synthesized research insights by feature/topic across studies Observant has run — returns user quotes, market context, and recommendations. Proxies to the live Codified MCP when CODIFIED_API_KEY is set.",
    inputSchema: {
      type: "object",
      properties: {
        feature: { type: "string", description: "Feature or topic to search (e.g. 'checkout', 'onboarding', 'pricing')." },
        includeExamples: { type: "boolean", description: "Also search example/demo insights." },
      },
      required: ["feature"],
    },
  },
  {
    name: "codified_search_transcripts",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `search_transcripts`. Full-text search across all 1:1 interview transcripts to find what users actually said. Proxies to the live Codified MCP when CODIFIED_API_KEY is set.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term to find in transcripts." },
        includeExamples: { type: "boolean", description: "Also search example/demo transcripts." },
      },
      required: ["query"],
    },
  },
  {
    name: "codified_run_study",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `run_study`. Generate a study plan for a new round of user feedback (pmf / churn / drop_off / d0-retention / discovery / sentiment / concept-test / persona / launch_feedback / custom). Proxies to the live Codified MCP when CODIFIED_API_KEY is set; results flow back to observant_conversations + observant_insights.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["pmf", "drop_off", "churn", "d0-retention", "discovery", "sentiment", "concept-test", "persona", "launch_feedback", "custom"],
          description: "Study type, inferred from your question.",
        },
        description: { type: "string", description: "The research question / what you want to learn." },
        segment: { type: "string", description: "User segment to target (e.g. 'power_users', 'churned_7d')." },
      },
      required: ["type"],
    },
  },
  {
    name: "codified_synthesize_journey",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `synthesize_journey`. Synthesize a user journey from analytics data (e.g. PostHog output) into insight records. Proxies to the live Codified MCP when CODIFIED_API_KEY is set.",
    inputSchema: {
      type: "object",
      properties: {
        analyticsData: { type: "string", description: "Raw analytics output (PostHog MCP, SQL, or other)." },
        description: { type: "string", description: "What you want to understand from the data." },
        title: { type: "string", description: "Optional title for the journey." },
      },
      required: ["analyticsData"],
    },
  },
];

/* Map of Observant bridge tool → the real Codified MCP tool it stands
   in for. Derived from the fallback set (prefix stripped), but the
   proxy also handles any dynamically-listed codified_* tool by simply
   removing the prefix. Used in stub responses + the design doc. */
const BRIDGE_MAP = CODIFIED_FALLBACK_TOOLS.reduce((m, t) => {
  m[t.name] = t.name.slice(CODIFIED_PREFIX.length);
  return m;
}, {});

/* Full advertised surface (Observant tools + fixed Codified fallback).
   The dynamic path may swap the codified portion for the live listing. */
const TOOLS = OBSERVANT_TOOLS.concat(CODIFIED_FALLBACK_TOOLS);

/* ---------------------------------------------------------------
   helpers
   --------------------------------------------------------------- */
function text(t) { return { content: [{ type: "text", text: t }] }; }
function jsonText(obj, header) {
  const body = JSON.stringify(obj, null, 2);
  return text((header ? header + "\n\n" : "") + body);
}
function clampInt(v, lo, hi, dflt) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}
function enc(v) { return encodeURIComponent(String(v)); }

/* ---------------------------------------------------------------
   REAL TOOL 1 — recent in-product feedback
   --------------------------------------------------------------- */
async function recentFeedback(args) {
  const limit = clampInt(args.limit, 1, 50, 20);
  if (!db.dbConfigured()) {
    return jsonText(
      {
        simulated: true,
        note: "No DB configured — returning a sample shape so the tool is explorable.",
        items: [
          { type: "feedback", value: "open", note: "the export keeps timing out on large boards", url: "/export", user_ref: "u_8841", created_at: "2026-06-29T18:04:00Z" },
          { type: "eval", value: "down", note: "summary missed the main point of the thread", url: "/inbox", user_ref: "u_2207", created_at: "2026-06-29T15:22:00Z" },
        ],
      },
      "Observant — recent in-product feedback (simulated)"
    );
  }
  let q = "select=type,value,note,url,user_ref,created_at&order=created_at.desc&limit=" + limit;
  if (args.slug) q += "&slug=eq." + enc(String(args.slug).toLowerCase());
  if (args.type) q += "&type=eq." + enc(args.type);
  const rows = (await db.select("inproduct_feedback", q)) || [];
  return jsonText(
    { count: rows.length, items: rows },
    "Observant — " + rows.length + " recent in-product feedback item(s)"
  );
}

/* ---------------------------------------------------------------
   REAL TOOL 2 — off-product 1:1 conversation threads
   Resolves program(s) → partners → conversations → messages.
   --------------------------------------------------------------- */
async function conversations(args) {
  const limit = clampInt(args.limit, 1, 25, 10);
  if (!db.dbConfigured()) {
    return jsonText(
      {
        simulated: true,
        note: "No DB configured — returning a sample shape so the tool is explorable.",
        conversations: [
          {
            contact: "dana@acme.co",
            subject: "How's the new export flow landing?",
            status: "open",
            last_active_at: "2026-06-29T20:10:00Z",
            turns: [
              { sender: "observant", body: "Walk me through the last time you exported a board — what were you trying to do with it?" },
              { sender: "partner", body: "I export to CSV then rebuild it as a shared sheet so the team can see it. The CSV itself isn't the thing I need." },
            ],
          },
        ],
      },
      "Observant — 1:1 conversations (simulated)"
    );
  }

  // 1) resolve program ids
  let programs;
  if (args.slug) {
    programs = await db.select("programs", "slug=eq." + enc(String(args.slug).toLowerCase()) + "&select=id,product_name&limit=5");
  } else if (args.product) {
    programs = await db.select("programs", "product_name=eq." + enc(args.product) + "&select=id,product_name&limit=5");
  } else {
    programs = await db.select("programs", "select=id,product_name&order=created_at.desc&limit=5");
  }
  if (!programs || !programs.length) {
    return jsonText({ count: 0, conversations: [], note: "No matching program found." }, "Observant — 1:1 conversations");
  }
  const progIds = programs.map((p) => p.id);

  // 2) partners in those programs (optionally one contact)
  let pQuery = "program_id=in.(" + progIds.join(",") + ")&select=id,contact,channel";
  if (args.contact) pQuery += "&contact=eq." + enc(String(args.contact).toLowerCase());
  const partners = (await db.select("partners", pQuery)) || [];
  if (!partners.length) {
    return jsonText({ count: 0, conversations: [] }, "Observant — 1:1 conversations");
  }
  const byPartner = {};
  partners.forEach((p) => { byPartner[p.id] = p; });
  const partnerIds = partners.map((p) => p.id);

  // 3) recent conversations for those partners
  const convs =
    (await db.select(
      "conversations",
      "partner_id=in.(" + partnerIds.join(",") + ")&select=id,partner_id,subject,status,last_active_at&order=last_active_at.desc&limit=" + limit
    )) || [];
  if (!convs.length) {
    return jsonText({ count: 0, conversations: [] }, "Observant — 1:1 conversations");
  }

  // 4) messages for those conversations (one bounded query, grouped client-side)
  const convIds = convs.map((c) => c.id);
  const msgs =
    (await db.select(
      "messages",
      "conversation_id=in.(" + convIds.join(",") + ")&select=conversation_id,sender,body,created_at&order=created_at.asc&limit=400"
    )) || [];
  const turnsByConv = {};
  msgs.forEach((m) => {
    (turnsByConv[m.conversation_id] = turnsByConv[m.conversation_id] || []).push({ sender: m.sender, body: m.body });
  });

  const out = convs.map((c) => {
    const partner = byPartner[c.partner_id] || {};
    return {
      contact: partner.contact || null,
      channel: partner.channel || null,
      subject: c.subject || null,
      status: c.status || null,
      last_active_at: c.last_active_at || null,
      turns: turnsByConv[c.id] || [],
    };
  });
  return jsonText({ count: out.length, conversations: out }, "Observant — " + out.length + " recent 1:1 conversation(s)");
}

/* ---------------------------------------------------------------
   DESIGNED TOOL — synthesized Signals (Observant view of Codified
   synthesis). Signals aren't yet a first-class table, so this
   returns the designed shape + points at the live engine.
   --------------------------------------------------------------- */
async function insights(args) {
  return jsonText(
    {
      stub: true,
      note:
        "Synthesized Signals are produced by the Codified engine and surfaced here. Live synthesis is not yet wired into a Signals table in this scaffold — use codified_query_insights (bridge) for live results, or observant_conversations for the raw verbatims.",
      designed_shape: [
        {
          kind: "ISSUE",
          headline: "61% rebuild the export by hand to get a shareable view",
          why: "The CSV-first flow is the friction, not the export itself.",
          evidence: { agreement: "5 of 7 power users", quotes: ["I export to CSV then rebuild it as a shared sheet"] },
          recommendation: "Ship a live, shareable dashboard; keep CSV as secondary.",
          feature: args.feature || "export",
        },
      ],
      bridges_to: "codified_query_insights",
    },
    "Observant — Signals (designed shape; synthesis via Codified)"
  );
}

/* ===============================================================
   CODIFIED MCP PROXY — the real bridge.
   Speaks Codified's JSON-RPC 2.0 streamable-HTTP transport:
     - POST JSON-RPC with `Authorization: Bearer <cdf_…>` and
       `Accept: application/json, text/event-stream`.
     - Parses both plain-JSON and SSE (`text/event-stream`) replies.
     - Runs the MCP handshake (initialize → notifications/initialized)
       and reuses any `Mcp-Session-Id` the server issues.
   Only active when CODIFIED_API_KEY is present; otherwise every
   codified_* tool degrades to bridgeStub().
   =============================================================== */
const CODIFIED_DEFAULT_URL = "https://api.usercodified.com/mcp";
const CODIFIED_PROTOCOL = "2024-11-05";
const CODIFIED_TIMEOUT_MS = 20000;

function codifiedKey() { return process.env.CODIFIED_API_KEY || ""; }
function codifiedUrl() { return process.env.CODIFIED_MCP_URL || CODIFIED_DEFAULT_URL; }
function codifiedEnabled() { return !!codifiedKey(); }

/* Module-scoped session cache (survives warm serverless invocations). */
let _codifiedSession = { id: null, initialized: false, ts: 0 };
const CODIFIED_SESSION_TTL_MS = 5 * 60 * 1000;
let _rpcSeq = 0;

/* Parse an MCP HTTP reply: SSE frames (data: <json>) OR a plain JSON body.
   Returns the JSON-RPC message object (result/error), or null. */
function parseMcpBody(contentType, raw) {
  if (!raw) return null;
  const ct = (contentType || "").toLowerCase();
  if (ct.indexOf("text/event-stream") !== -1 || /^\s*(event|data):/m.test(raw)) {
    let last = null;
    for (const line of raw.split(/\r?\n/)) {
      const m = /^data:\s?(.*)$/.exec(line);
      if (!m) continue;
      const payload = m[1];
      if (!payload || payload === "[DONE]") continue;
      try {
        const obj = JSON.parse(payload);
        if (obj && (obj.result !== undefined || obj.error !== undefined)) return obj;
        last = obj;
      } catch (_) { /* skip non-JSON data lines */ }
    }
    return last;
  }
  try { return JSON.parse(raw); } catch (_) { return null; }
}

/* One JSON-RPC round-trip to the Codified MCP. Notifications (no id)
   expect no body. Captures Mcp-Session-Id from response headers. */
async function codifiedRpc(method, params, { notification = false } = {}) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: "Bearer " + codifiedKey(),
    "MCP-Protocol-Version": CODIFIED_PROTOCOL,
  };
  if (_codifiedSession.id) headers["Mcp-Session-Id"] = _codifiedSession.id;

  const body = { jsonrpc: "2.0", method };
  if (params !== undefined) body.params = params;
  if (!notification) body.id = ++_rpcSeq;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CODIFIED_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(codifiedUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  const sid = res.headers.get("mcp-session-id");
  if (sid) _codifiedSession.id = sid;

  if (notification) { try { await res.text(); } catch (_) {} return null; }

  const raw = await res.text();
  if (!res.ok) {
    const err = new Error("Codified MCP " + res.status + ": " + (raw ? raw.slice(0, 300) : res.statusText));
    err.status = res.status;
    throw err;
  }
  const msg = parseMcpBody(res.headers.get("content-type"), raw);
  if (msg && msg.error) {
    const err = new Error("Codified MCP error: " + (msg.error.message || JSON.stringify(msg.error)));
    err.rpc = msg.error;
    throw err;
  }
  return msg ? msg.result : null;
}

/* Ensure the MCP handshake has run (once per warm session/TTL). */
async function ensureCodifiedSession() {
  const fresh = _codifiedSession.initialized && Date.now() - _codifiedSession.ts < CODIFIED_SESSION_TTL_MS;
  if (fresh) return;
  await codifiedRpc("initialize", {
    protocolVersion: CODIFIED_PROTOCOL,
    capabilities: {},
    clientInfo: { name: "observant-bridge", version: "0.1.0" },
  });
  try { await codifiedRpc("notifications/initialized", undefined, { notification: true }); } catch (_) {}
  _codifiedSession.initialized = true;
  _codifiedSession.ts = Date.now();
}

/* Run an op against Codified, re-initializing once if the session is
   rejected (e.g. server restarted / session expired). */
async function codifiedOp(fn) {
  try {
    await ensureCodifiedSession();
    return await fn();
  } catch (err) {
    if (err && (err.status === 400 || err.status === 401 || err.status === 404)) {
      _codifiedSession = { id: null, initialized: false, ts: 0 };
      await ensureCodifiedSession();
      return await fn();
    }
    throw err;
  }
}

/* DYNAMIC: fetch Codified's live tool list, prefix names `codified_`. */
async function listCodifiedTools() {
  const result = await codifiedOp(() => codifiedRpc("tools/list", {}));
  const list = (result && result.tools) || [];
  return list.map((t) => ({
    name: CODIFIED_PREFIX + t.name,
    description:
      "BRIDGE → Codified MCP `" + t.name + "`. " + (t.description || "").trim(),
    inputSchema: t.inputSchema || { type: "object", properties: {} },
  }));
}

/* PROXY: forward a codified_* tools/call to the live Codified MCP. */
async function proxyCodifiedCall(name, args) {
  const realName = name.slice(CODIFIED_PREFIX.length);
  const result = await codifiedOp(() =>
    codifiedRpc("tools/call", { name: realName, arguments: args || {} })
  );
  // Codified returns the MCP content shape already — pass it through.
  if (result && Array.isArray(result.content)) return result;
  return jsonText(result || {}, "Codified MCP · " + realName);
}

/* STUB — returned for codified_* tools when no CODIFIED_API_KEY is set.
   Names the real Codified tool + how to turn the live proxy on. */
function bridgeStub(name, args) {
  const codifiedTool = BRIDGE_MAP[name] || name.slice(CODIFIED_PREFIX.length) || name;
  return jsonText(
    {
      bridge: true,
      connects_out_to: "codified-mcp (separate live product)",
      codified_tool: codifiedTool,
      arguments_seen: args,
      status: "not-connected — CODIFIED_API_KEY not set on this Observant deployment",
      how_to_connect:
        "Set CODIFIED_API_KEY (an org-scoped Codified key, cdf_…) in Vercel to turn this " +
        "bridge on. Optionally set CODIFIED_MCP_URL (default " + CODIFIED_DEFAULT_URL + "). " +
        "Once set, Observant proxies `" + codifiedTool + "` to the live Codified MCP with " +
        "these arguments, and tools/list merges in Codified's live tools (prefixed codified_). " +
        "Observant holds your raw feedback (conversations + in-product snippets); Codified " +
        "orchestrates studies and synthesizes over it.",
    },
    "Bridge → Codified MCP · " + codifiedTool + " (set CODIFIED_API_KEY to run this live)"
  );
}

/* ---------------------------------------------------------------
   dispatch
   --------------------------------------------------------------- */
async function callTool(name, args) {
  const a = args || {};
  switch (name) {
    case "observant_recent_feedback":
      return recentFeedback(a);
    case "observant_conversations":
      return conversations(a);
    case "observant_insights":
      return insights(a);
  }
  // Any codified_* tool: proxy live when a key is set, else doc-stub.
  if (name.indexOf(CODIFIED_PREFIX) === 0) {
    if (!codifiedEnabled()) return bridgeStub(name, a);
    try {
      return await proxyCodifiedCall(name, a);
    } catch (err) {
      return {
        content: [{ type: "text", text: "Codified bridge call '" + name + "' failed: " + ((err && err.message) || err) }],
        isError: true,
      };
    }
  }
  return { content: [{ type: "text", text: "Unknown tool: " + name }], isError: true };
}

/* Strip internal fields → schema-clean MCP tool shape. */
function clean(t) {
  return { name: t.name, description: t.description, inputSchema: t.inputSchema };
}

/* SYNC list — Observant tools + the fixed Codified fallback. Used for the
   human-readable GET server card (no network) and as the safe default. */
function listTools() {
  return TOOLS.map(clean);
}

/* ASYNC list — the wire path for MCP tools/list. When a key is set, merge
   in Codified's LIVE tools (dynamic); on any failure fall back to the
   fixed set. Observant's own tools are always present and unchanged. */
async function listToolsAsync() {
  const observant = OBSERVANT_TOOLS.map(clean);
  if (codifiedEnabled()) {
    try {
      const live = await listCodifiedTools();
      if (live && live.length) return observant.concat(live);
    } catch (_) { /* fall through to fixed fallback */ }
  }
  return observant.concat(CODIFIED_FALLBACK_TOOLS.map(clean));
}

module.exports = {
  TOOLS,
  BRIDGE_MAP,
  listTools,
  listToolsAsync,
  callTool,
  codifiedEnabled,
};
