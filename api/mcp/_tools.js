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

   2. Codified bridge tools (DOCUMENTED CONNECTION — not built here).
      Codified is the research/synthesis engine — a SEPARATE live
      product (the Codified MCP). We do NOT have Codified's backend in
      this repo and do not embed or reimplement it. These tools are an
      interface that names the exact Codified MCP tool each one would
      connect out to; the live endpoint + auth come from the Codified
      product (TBD-from-Codified/Bin). Until that's wired, each returns
      a stub documenting the call. Observant holds the raw feedback;
      Codified orchestrates studies + synthesis over it.

   Every tool returns the MCP content shape:
     { content: [{ type: "text", text }], isError? }
   ============================================================ */
const db = require("../_db");

/* ---------------------------------------------------------------
   TOOL DEFINITIONS (what `tools/list` advertises). Keep the
   descriptions agent-facing: an editor agent reads these to decide
   when to call them.
   --------------------------------------------------------------- */
const TOOLS = [
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
  {
    name: "codified_query_insights",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `query_insights`. Search synthesized research insights by feature/topic across studies Observant has run — returns user quotes, market context, and recommendations. Add the Codified MCP for live results; this tool documents the call.",
    inputSchema: {
      type: "object",
      properties: { feature: { type: "string", description: "Feature or topic to search (e.g. 'checkout')." } },
      required: ["feature"],
    },
  },
  {
    name: "codified_search_transcripts",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `search_transcripts`. Full-text search across all 1:1 interview transcripts to find what users actually said. Add the Codified MCP for live results.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Search term to find in transcripts." } },
      required: ["query"],
    },
  },
  {
    name: "codified_run_study",
    source: "codified-bridge",
    description:
      "BRIDGE → Codified MCP `run_study`. Kick off a new round of user feedback (pmf / churn / drop_off / d0-retention / discovery / launch_feedback / concept-test …). Observant recruits the right users from your roster and runs the 1:1s; results flow back to observant_conversations + observant_insights. Add the Codified MCP to actually launch a study.",
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
];

/* Map of Observant bridge tool → the Codified MCP tool it stands in for.
   Used both in stub responses and in the design doc. */
const BRIDGE_MAP = {
  codified_query_insights: "query_insights",
  codified_search_transcripts: "search_transcripts",
  codified_run_study: "run_study",
};

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

/* ---------------------------------------------------------------
   BRIDGE TOOLS — document the call OUT to the live Codified MCP.
   Codified is a separate product; its backend is NOT in this repo,
   so nothing here is executed against Codified. The stub names the
   exact Codified MCP tool this maps to and how to connect to the
   live engine. The endpoint/auth come from Codified (TBD-from-
   Codified/Bin). This is a documented connection, not a fake call.
   --------------------------------------------------------------- */
function bridgeStub(name, args) {
  const codifiedTool = BRIDGE_MAP[name] || name;
  return jsonText(
    {
      bridge: true,
      connects_out_to: "codified-mcp (separate live product)",
      codified_tool: codifiedTool,
      arguments_seen: args,
      status: "not-connected — Codified MCP endpoint + auth not configured here",
      connection_tbd: "live Codified MCP URL/command + org auth (TBD-from-Codified/Bin)",
      how_to_connect:
        "Add the live Codified MCP alongside Observant so this runs against the engine:\n" +
        "  claude mcp add codified -- npx -y @usercodified/mcp   # exact command from Codified\n" +
        "Observant holds your raw feedback (conversations + in-product snippets); Codified orchestrates studies and synthesizes over it. Once Codified is connected, call `" +
        codifiedTool +
        "` on it directly with these arguments.",
    },
    "Bridge → Codified MCP · " + codifiedTool + " (connect the live Codified MCP to run this)"
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
    case "codified_query_insights":
    case "codified_search_transcripts":
    case "codified_run_study":
      return bridgeStub(name, a);
    default:
      return { content: [{ type: "text", text: "Unknown tool: " + name }], isError: true };
  }
}

/* Tool list as advertised over the wire (strip the internal `source` field
   into the schema-clean MCP shape, but keep `source` available to callers
   that want to group Observant vs bridge tools). */
function listTools() {
  return TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  }));
}

module.exports = { TOOLS, BRIDGE_MAP, listTools, callTool };
