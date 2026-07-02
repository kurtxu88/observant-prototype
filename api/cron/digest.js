/* ============================================================
   Observant — WEEKLY DIGEST cron (part of "Team updates").
   ------------------------------------------------------------
   Runs on a weekly Vercel cron (schedule wired in vercel.json — see the
   handoff note). For every workspace with activity in the last 7 days it:

     1. gathers the week's raw feedback —
          • off-product replies   (messages / conversations)
          • in-product signals    (inproduct_feedback: eval up/down, CSAT, exit)
          • partners / minutes active
          • any new insights (workspace_id)
     2. computes the headline stats (counts + avg CSAT — facts, not guesses)
     3. asks Claude (raw fetch, claude-sonnet-4-6, low max_tokens) for the
        HEADLINE + 3–6 top items (each named + quoted + sourced by channel)
     4. stores the digest row AND emails it to the team (the workspace's
        account email) via Resend, branded "{product} — your week in feedback".

   Degrades gracefully:
     • no DB        → returns { ok:true, skipped:"no DB" }
     • no ANTHROPIC → falls back to a computed headline + raw items (still stored/sent)
     • no RESEND    → stores the digest, skips the send, still returns ok.

   Auth: if CRON_SECRET is set, require it (Vercel sends it as a Bearer token
   on the cron request); otherwise open (fine for the demo). Accepts GET/POST.
   ============================================================ */
const db = require("../_db");

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = 700;                 // concise — a digest, not an essay
const WINDOW_DAYS = 7;
const MAX_WORKSPACES = 200;             // safety cap per run

module.exports = async function handler(req, res) {
  setJson(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  // Optional cron auth — only enforced when CRON_SECRET is configured.
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (secret) {
    const auth = String(req.headers.authorization || req.headers.Authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (auth !== secret) return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  try {
    if (!db.dbConfigured()) return res.status(200).json({ ok: true, skipped: "no DB" });

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const period = periodLabel(since);

    const workspaces = await db.select("workspaces", "select=id,account_id,slug,product_name&order=updated_at.desc&limit=" + MAX_WORKSPACES);
    const list = Array.isArray(workspaces) ? workspaces : [];

    const results = [];
    for (const ws of list) {
      try {
        const r = await buildForWorkspace(ws, since, period);
        if (r) results.push(r);
      } catch (e) {
        console.error("[cron/digest] workspace failed:", ws && ws.slug, e && e.message);
      }
    }

    return res.status(200).json({ ok: true, workspaces: list.length, digests: results.length, results });
  } catch (err) {
    console.error("[cron/digest] failed:", err && err.message);
    return res.status(200).json({ ok: false, error: String((err && err.message) || err) });
  }
};

/* Build (and store + email) one workspace's digest. Returns a small summary,
   or null when the workspace had no activity this week (skipped). */
async function buildForWorkspace(ws, since, period) {
  const slug = String(ws.slug || "").toLowerCase();
  const product = String(ws.product_name || slug || "your product");

  // --- off-product replies (partner-sent messages this week) ---
  const replies = [];
  const program = slug ? await one("programs", "slug=eq." + encodeURIComponent(slug) + "&select=id,product_name&limit=1") : null;
  if (program) {
    const partners = await db.select("partners", "program_id=eq." + program.id + "&select=id,channel,contact,handle,status");
    const pList = Array.isArray(partners) ? partners : [];
    const pById = {};
    pList.forEach((p) => { pById[p.id] = p; });
    const pIds = pList.map((p) => p.id);
    if (pIds.length) {
      const convs = await db.select("conversations", "partner_id=in.(" + pIds.join(",") + ")&select=id,partner_id");
      const cList = Array.isArray(convs) ? convs : [];
      const convPartner = {};
      cList.forEach((c) => { convPartner[c.id] = c.partner_id; });
      const cIds = cList.map((c) => c.id);
      if (cIds.length) {
        const msgs = await db.select(
          "messages",
          "conversation_id=in.(" + cIds.join(",") + ")&sender=eq.partner&created_at=gte." + since +
            "&select=conversation_id,body,minutes,created_at&order=created_at.desc&limit=60"
        );
        (Array.isArray(msgs) ? msgs : []).forEach((m) => {
          const p = pById[convPartner[m.conversation_id]] || {};
          replies.push({ who: whoOf(p), channel: p.channel || "email", body: String(m.body || "").trim(), minutes: Number(m.minutes) || 0 });
        });
      }
    }
  }

  // --- in-product signals this week (prefer workspace_id, fall back to slug) ---
  let inproduct = await db.select("inproduct_feedback", "workspace_id=eq." + encodeURIComponent(ws.id) + "&created_at=gte." + since + "&select=type,value,note,url,created_at&order=created_at.desc&limit=150");
  if (!Array.isArray(inproduct) || !inproduct.length) {
    inproduct = slug ? await db.select("inproduct_feedback", "slug=eq." + encodeURIComponent(slug) + "&created_at=gte." + since + "&select=type,value,note,url,created_at&order=created_at.desc&limit=150") : [];
  }
  inproduct = Array.isArray(inproduct) ? inproduct : [];

  // --- new insights this week ---
  const insights = await db.select("insights", "workspace_id=eq." + encodeURIComponent(ws.id) + "&created_at=gte." + since + "&select=title,detail,source,created_at&order=created_at.desc&limit=20");
  const insightList = Array.isArray(insights) ? insights : [];

  // Activity gate — nothing happened → no digest.
  const activity = replies.length + inproduct.length + insightList.length;
  if (activity === 0) return null;

  // --- computed stats (facts — the model doesn't invent numbers) ---
  const stats = computeStats(replies, inproduct);

  // --- headline + items via Claude (with a deterministic fallback) ---
  const bundle = buildBundle(replies, inproduct, insightList);
  let headline = "";
  let items = [];
  const ai = await synthesize(product, bundle);
  if (ai && ai.headline) { headline = ai.headline; items = Array.isArray(ai.items) ? ai.items.slice(0, 6) : []; }
  if (!headline) headline = fallbackHeadline(replies, inproduct, insightList, product);
  if (!items.length) items = fallbackItems(replies, inproduct, insightList);

  // --- store the digest ---
  let digestId = null;
  try {
    const row = await db.insert("digests", {
      workspace_id: ws.id,
      account_id: ws.account_id || null,
      period: period,
      headline: headline,
      stats: stats,
      items: items,
    });
    digestId = row && row.id;
  } catch (e) { console.error("[cron/digest] store failed:", e && e.message); }

  // --- email the team (the workspace's account email) ---
  let sent = false;
  const email = await teamEmail(ws.account_id);
  if (email && process.env.RESEND_API_KEY) {
    sent = await sendDigestEmail(email, product, period, headline, stats, items);
  }

  return { slug: slug, product: product, activity: activity, stored: !!digestId, emailed: sent };
}

/* ---------- stats ---------- */
function computeStats(replies, inproduct) {
  const stats = [];
  const activePartners = new Set(replies.map((r) => r.who)).size;
  stats.push({ n: replies.length, l: replies.length === 1 ? "reply" : "replies" });
  if (activePartners) stats.push({ n: activePartners, l: activePartners === 1 ? "active partner" : "active partners" });

  const csats = inproduct.filter((f) => f.type === "csat").map((f) => parseInt(String(f.value || "").replace(/[^\d]/g, ""), 10)).filter((n) => n >= 1 && n <= 5);
  if (csats.length) {
    const avg = Math.round((csats.reduce((a, b) => a + b, 0) / csats.length) * 10) / 10;
    stats.push({ n: avg + "/5", l: "avg CSAT" });
  }
  const downs = inproduct.filter((f) => f.type === "eval" && String(f.value || "").toLowerCase() === "down").length;
  const exits = inproduct.filter((f) => f.type === "exit").length;
  const negatives = downs + exits;
  if (negatives && stats.length < 4) stats.push({ n: negatives, l: exits && !downs ? "exit surveys" : "warning signals" });

  return stats.slice(0, 4);
}

/* ---------- Claude synthesis (raw fetch, no SDK — mirrors assistant.js) ---------- */
async function synthesize(product, bundle) {
  if (!process.env.ANTHROPIC_API_KEY || !bundle.trim()) return null;
  const system =
    "You write Observant's WEEKLY FEEDBACK DIGEST for a product team. You are given a week of real user feedback " +
    "gathered across channels (email, telegram, in-product). Distill it into the single most important thing this week " +
    "and the handful of items the team should actually read.\n\n" +
    "Respond with ONLY a JSON object, no prose or code fences:\n" +
    '{ "headline": string, "items": string[] }\n\n' +
    "- headline: one sentence — the most important thing this week (specific, not generic).\n" +
    "- items: 3 to 6 strings. Each names the user (or handle), quotes a specific phrase from their feedback, and cites " +
    "the channel in parentheses. Example: 'Dana pushed back on the export flow (email): \"I only export to rebuild a team view.\"'\n" +
    "- Ground everything in the feedback given; never invent quotes, names, or numbers.";
  const user = "THE TEAM'S PRODUCT: " + product + "\n\nRAW FEEDBACK THIS WEEK:\n" + bundle;
  try {
    const text = await callClaude(system, [{ role: "user", content: user }], MAX_TOKENS);
    return parseLooseJson(text);
  } catch (e) {
    console.error("[cron/digest] synthesize failed:", e && e.message);
    return null;
  }
}

async function callClaude(system, messages, maxTokens) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens || MAX_TOKENS, system, messages }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error("Anthropic " + response.status + ": " + detail.slice(0, 300));
  }
  const data = await response.json();
  const block = (data.content || []).find((c) => c.type === "text");
  return block ? block.text : "";
}

/* ---------- bundle + fallbacks ---------- */
function buildBundle(replies, inproduct, insights) {
  const lines = [];
  if (replies.length) {
    lines.push("OFF-PRODUCT REPLIES:");
    replies.slice(0, 25).forEach((r) => { const b = clip(r.body, 400); if (b) lines.push("- " + r.who + " (" + r.channel + "): \"" + b + "\""); });
  }
  if (inproduct.length) {
    lines.push("\nIN-PRODUCT SIGNALS:");
    inproduct.slice(0, 40).forEach((f) => {
      const tag = f.type === "csat" ? "CSAT " + (f.value || "") + "/5"
        : f.type === "eval" ? "AI-eval " + (String(f.value || "").toLowerCase() === "down" ? "👎" : "👍")
        : f.type === "exit" ? "Exit survey" : "Feedback";
      const note = clip(f.note, 300);
      lines.push("- " + tag + (note ? ": \"" + note + "\"" : "") + (f.url ? " [" + clip(f.url, 80) + "]" : ""));
    });
  }
  if (insights.length) {
    lines.push("\nNEW INSIGHTS THIS WEEK:");
    insights.slice(0, 10).forEach((i) => lines.push("- " + clip(i.title || i.detail, 200) + (i.source ? " (" + i.source + ")" : "")));
  }
  return lines.join("\n").slice(0, 12000);
}

function fallbackHeadline(replies, inproduct, insights, product) {
  const bits = [];
  if (replies.length) bits.push(replies.length + (replies.length === 1 ? " reply" : " replies"));
  const signals = inproduct.length;
  if (signals) bits.push(signals + (signals === 1 ? " in-product signal" : " in-product signals"));
  if (insights.length) bits.push(insights.length + (insights.length === 1 ? " new insight" : " new insights"));
  const summary = bits.length ? bits.join(", ") : "some activity";
  return summary + " from your " + product + " users this week.";
}

function fallbackItems(replies, inproduct, insights) {
  const items = [];
  replies.slice(0, 3).forEach((r) => { const b = clip(r.body, 180); if (b) items.push(r.who + " (" + r.channel + "): \"" + b + "\""); });
  inproduct.filter((f) => (f.type === "eval" && String(f.value || "").toLowerCase() === "down") || f.type === "exit" || (f.type === "csat" && Number(f.value) <= 2)).slice(0, 2).forEach((f) => {
    const tag = f.type === "csat" ? "Low CSAT (" + f.value + "/5)" : f.type === "exit" ? "Exit survey" : "Thumbs-down on an AI output";
    items.push(tag + (f.note ? " (in-product): \"" + clip(f.note, 160) + "\"" : " (in-product)"));
  });
  insights.slice(0, 2).forEach((i) => { const t = clip(i.title || i.detail, 180); if (t) items.push(t + (i.source ? " (" + i.source + ")" : "")); });
  return items.slice(0, 6);
}

/* ---------- email ---------- */
async function teamEmail(accountId) {
  if (!accountId) return null;
  try {
    const accts = await db.select("accounts", "id=eq." + encodeURIComponent(accountId) + "&select=email&limit=1");
    const a = Array.isArray(accts) && accts[0];
    return a && a.email ? String(a.email).trim() : null;
  } catch (_e) { return null; }
}

async function sendDigestEmail(toEmail, product, period, headline, stats, items) {
  const subject = product + " — your week in feedback";
  const statLine = (Array.isArray(stats) ? stats : []).map((s) => s.n + " " + s.l).join(" · ");
  const text =
    period + " — what your users told you\n\n" +
    headline + "\n\n" +
    (statLine ? statLine + "\n\n" : "") +
    (Array.isArray(items) ? items.map((i) => "• " + i).join("\n") : "") + "\n";
  const html = digestHtml(product, period, headline, stats, items);
  const payload = { from: process.env.RESEND_FROM || "Observant <onboarding@resend.dev>", to: [toEmail], subject: subject, html: html, text: text };
  const replyTo = String(process.env.RESEND_REPLY_TO || "").trim();
  if (replyTo) payload.reply_to = replyTo;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return r.ok;
  } catch (e) { console.error("[cron/digest] send failed:", e && e.message); return false; }
}

function digestHtml(product, period, headline, stats, items) {
  const statHtml = (Array.isArray(stats) ? stats : []).map((s) =>
    '<div style="text-align:left"><div style="font-size:24px;font-weight:700;color:#b4532a;line-height:1">' + esc(s.n) + '</div><div style="font-size:12px;color:#8a857c">' + esc(s.l) + '</div></div>'
  ).join('<div style="width:22px"></div>');
  const itemsHtml = (Array.isArray(items) ? items : []).map((i) => '<li style="margin:.35rem 0;line-height:1.5">' + esc(i) + '</li>').join("");
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#24221e;max-width:600px">' +
    '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#8a857c">' + esc(period) + ' · ' + esc(product) + '</p>' +
    '<p style="margin:0 0 18px;font-size:18px;font-weight:600">' + esc(headline) + '</p>' +
    (statHtml ? '<div style="display:flex;gap:0;align-items:flex-end;margin:0 0 20px">' + statHtml + '</div>' : '') +
    (itemsHtml ? '<ul style="margin:0;padding-left:1.1rem">' + itemsHtml + '</ul>' : '') +
    '<p style="font-size:13px;color:#8a857c;margin:22px 0 0">Your week in feedback, gathered and synthesized by Observant.</p></div>';
}

/* ---------- helpers ---------- */
async function one(table, query) {
  try { const rows = await db.select(table, query); return (Array.isArray(rows) && rows[0]) || null; }
  catch (_e) { return null; }
}
function whoOf(p) {
  const h = (p && p.handle) ? String(p.handle).trim() : "";
  const c = (p && p.contact) ? String(p.contact).trim() : "";
  return h || c || "a user";
}
function periodLabel(sinceIso) {
  try {
    const opts = { month: "short", day: "numeric" };
    const from = new Date(sinceIso).toLocaleDateString("en-US", opts);
    const to = new Date().toLocaleDateString("en-US", opts);
    return from + "–" + to;
  } catch (_e) { return "This week"; }
}
// Tolerant JSON extraction from a model reply (handles ```json fences / prose).
function parseLooseJson(text) {
  const s = String(text || "");
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : s;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(candidate.slice(start, end + 1)); } catch (_e) { return null; }
}
function clip(v, max) { if (v == null) return ""; const s = String(v).replace(/\s+/g, " ").trim(); return s.length > max ? s.slice(0, max) + "…" : s; }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function setJson(res) { res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); }
