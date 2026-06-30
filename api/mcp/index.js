/* ============================================================
   Observant MCP — HTTP endpoint (route → /api/mcp)
   ------------------------------------------------------------
   A single entry point from a user's editor (Claude Code / Cursor)
   into Observant. It speaks the MCP "streamable HTTP" transport:
   JSON-RPC 2.0 over POST, single (non-streaming) JSON responses.

   Connect from an editor:
     claude mcp add --transport http observant https://www.observanthq.com/api/mcp
   (or point Cursor/Claude Desktop at the same URL).

   WHAT IT EXPOSES (see api/mcp/_tools.js):
     • Observant tools (REAL, DB-backed) — your collected user feedback:
         observant_recent_feedback, observant_conversations, observant_insights
     • Codified bridge tools (DESIGNED/STUBBED) — the research engine:
         codified_query_insights, codified_search_transcripts, codified_run_study
       Production proxies these to the Codified MCP; the scaffold returns a
       clear "add the Codified MCP" stub. One door: read your users'
       feedback AND drive studies, without leaving the editor.

   Methods handled:
     initialize · notifications/initialized · ping · tools/list · tools/call

   Transport notes:
     • POST  — JSON-RPC requests (the MCP client path).
     • GET   — a human/agent-readable server card (server info + tool list),
               handy for `curl`-ing the endpoint or wiring a plain HTTP client.
     • CORS-enabled; answers OPTIONS preflight.
     • Degrades gracefully with no DB — read tools return a simulated shape.
   ============================================================ */
const tools = require("./_tools");

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "observant", version: "0.1.0" };
const MAX_BODY_BYTES = 60000;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Mcp-Session-Id");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
}

/* JSON-RPC envelopes */
function rpcResult(id, result) { return { jsonrpc: "2.0", id: id == null ? null : id, result }; }
function rpcError(id, code, message) { return { jsonrpc: "2.0", id: id == null ? null : id, error: { code, message } }; }

async function readBody(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) throw new Error("Payload too large");
  }
  return raw ? JSON.parse(raw) : {};
}

/* The server card returned on GET — the same content `tools/list` returns,
   plus connection guidance. Lets you inspect the server with a browser/curl. */
function serverCard() {
  return {
    server: SERVER_INFO,
    protocolVersion: PROTOCOL_VERSION,
    transport: "http (json-rpc 2.0 over POST)",
    connect: {
      claude_code: "claude mcp add --transport http observant https://www.observanthq.com/api/mcp",
      note: "Point Cursor / Claude Desktop at the same URL. Add the Codified MCP too for live study orchestration.",
    },
    tools: tools.listTools(),
    bridge: {
      engine: "codified",
      map: tools.BRIDGE_MAP,
      note: "Observant holds the raw feedback; Codified orchestrates studies + synthesis over it.",
    },
  };
}

/* Dispatch a single JSON-RPC request → a JSON-RPC response (or null for
   notifications, which take no reply). */
async function handleRpc(msg) {
  const { id, method, params } = msg || {};

  switch (method) {
    case "initialize":
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Observant exposes your collected user feedback (in-product snippets + off-product 1:1 conversations) and bridges to the Codified research engine. Use observant_* tools to read what users said; use codified_* tools to synthesize or run new studies.",
      });

    // Notifications carry no id and expect no response.
    case "notifications/initialized":
    case "initialized":
      return null;

    case "ping":
      return rpcResult(id, {});

    case "tools/list":
      return rpcResult(id, { tools: tools.listTools() });

    case "tools/call": {
      const name = params && params.name;
      const args = (params && params.arguments) || {};
      if (!name) return rpcError(id, -32602, "Missing tool name");
      try {
        const result = await tools.callTool(name, args);
        return rpcResult(id, result);
      } catch (err) {
        // Surface tool failures as an in-band tool error, not a transport error,
        // so the agent sees the message and can recover.
        return rpcResult(id, {
          content: [{ type: "text", text: "Tool '" + name + "' failed: " + ((err && err.message) || err) }],
          isError: true,
        });
      }
    }

    default:
      return rpcError(id, -32601, "Method not found: " + method);
  }
}

module.exports = async function handler(req, res) {
  cors(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  // GET → server card (inspect with a browser or curl).
  if (req.method === "GET") { res.status(200).json(serverCard()); return; }

  if (req.method !== "POST") {
    res.status(405).json(rpcError(null, -32600, "Use POST for JSON-RPC, GET for the server card."));
    return;
  }

  let payload;
  try {
    payload = await readBody(req);
  } catch (err) {
    res.status(200).json(rpcError(null, -32700, "Parse error: " + ((err && err.message) || err)));
    return;
  }

  // Support JSON-RPC batches (array) and single messages.
  if (Array.isArray(payload)) {
    const responses = [];
    for (const msg of payload) {
      const r = await handleRpc(msg);
      if (r) responses.push(r);
    }
    // An all-notification batch yields no responses → 204.
    if (!responses.length) { res.status(204).end(); return; }
    res.status(200).json(responses);
    return;
  }

  const response = await handleRpc(payload);
  if (!response) { res.status(204).end(); return; } // notification → no body
  res.status(200).json(response);
};
