/* ============================================================
   Observant — urgent insight ALERTS (part of "Team updates").
   ------------------------------------------------------------
   maybeAlert({...}) fires an immediate, short email to the team the
   moment an URGENT signal lands, so the builder hears about the things
   that can't wait for the weekly digest:

     • CSAT ≤ 2                     (in-product)
     • any exit survey              (in-product)
     • an AI-eval thumbs-DOWN       (in-product)
     • a clearly negative / churny  off-product reply (email / telegram)

   It is imported by reply.js, inbound-email.js, in-product.js and
   telegram/webhook.js and always called BEST-EFFORT + NON-BLOCKING:
   await it, but it never throws into the caller's main flow. It also
   degrades cleanly with no keys —
     • no DB              → can't resolve the team's email → skip (no throw)
     • no RESEND_API_KEY  → skip the send, still log the alert
   and debounces on the team_alerts table so a burst of the same signal
   can't spam the team.

   The "_" prefix keeps this out of Vercel's function routing; it's a
   helper module (require("./_alerts")), not an endpoint.
   ============================================================ */
const DBX = require("../_db");   // PostgREST + service-role helper (api/_db.js)

const DEFAULT_BASE = "https://www.observanthq.com";
const DEBOUNCE_MINUTES = 30;   // don't re-send the same (workspace, kind, partner) inside this window

/* Decide whether a raw signal is urgent enough to interrupt the team, and
   normalize it into an alert kind + a short human label. Returns
   { urgent:false } for anything that belongs in the weekly digest instead. */
function classify(kind, value, quote) {
  const k = String(kind || "").toLowerCase();
  if (k === "exit") return { urgent: true, alertKind: "exit", label: "Exit survey" };
  if (k === "csat") {
    const n = parseInt(String(value || "").replace(/[^\d]/g, ""), 10);
    if (n >= 1 && n <= 2) return { urgent: true, alertKind: "csat_low", label: "Low CSAT (" + n + "/5)" };
    return { urgent: false };
  }
  if (k === "eval") {
    if (String(value || "").toLowerCase() === "down") return { urgent: true, alertKind: "eval_down", label: "Thumbs-down on an AI output" };
    return { urgent: false };
  }
  if (k === "reply" || k === "churn_reply") {
    if (looksChurny(quote)) return { urgent: true, alertKind: "churn_reply", label: "Possible churn signal in a reply" };
    return { urgent: false };
  }
  return { urgent: false };
}

/* Cheap keyword sentiment gate for off-product replies — no extra AI call.
   Deliberately conservative: it only fires the alert on clearly negative /
   churn-adjacent language, so the team isn't pinged for ordinary feedback. */
function looksChurny(text) {
  const s = String(text || "").toLowerCase();
  if (!s.trim()) return false;
  const signals = [
    "cancel", "canceling", "cancelling", "cancelled", "unsubscrib", "won't renew",
    "wont renew", "not renewing", "downgrad", "switching to", "switch to a", "moving to",
    "moving off", "leaving", "give up", "giving up", "too expensive", "not worth",
    "waste of", "frustrat", "hate ", "i hate", "useless", "broken", "doesn't work",
    "does not work", "doesn't do", "stopped working", "disappoint", "refund",
    "deleting", "delete my account", "close my account", "no longer",
  ];
  return signals.some((w) => s.includes(w));
}

/* Fire an alert if the signal is urgent. Never throws. Returns
   { alerted, skipped } for callers that care (they usually ignore it). */
async function maybeAlert(opts) {
  try {
    const o = opts || {};
    const verdict = classify(o.kind, o.value, o.quote);
    if (!verdict.urgent) return { alerted: false, skipped: "not urgent" };

    // Need the DB to resolve which team to notify (and to debounce).
    if (!DBX.dbConfigured()) return { alerted: false, skipped: "no DB" };

    const slug = norm(o.slug) || slugify(o.product);
    if (!slug) return { alerted: false, skipped: "no slug" };

    const team = await resolveTeam(slug);
    const workspaceId = team.workspaceId || null;

    // Debounce: same workspace + kind + partner within the window → skip.
    if (await recentlyAlerted(workspaceId, verdict.alertKind, o.partnerId || null)) {
      return { alerted: false, skipped: "debounced" };
    }

    const who = displayWho(o.name, o.handle);
    const channel = norm(o.channel) || "in-product";
    const quote = String(o.quote || o.detail || "").replace(/\s+/g, " ").trim().slice(0, 600);
    const product = String(o.product || team.productName || slug || "your product");

    // Always log (audit + debounce anchor), even if we can't email.
    await logAlert(workspaceId, verdict.alertKind, o.partnerId || null, verdict.label + " · " + who + " · " + channel);

    // Send the alert email to the team's account address.
    let sent = false;
    if (team.email && process.env.RESEND_API_KEY) {
      const base = norm(o.base) || DEFAULT_BASE;
      const dashUrl = base.replace(/\/+$/, "") + "/portal";
      sent = await sendAlertEmail(team.email, product, verdict.label, who, quote, channel, dashUrl);
    }
    return { alerted: true, sent: sent, kind: verdict.alertKind };
  } catch (e) {
    // Best-effort: swallow everything so the caller's main flow is untouched.
    console.error("[_alerts] maybeAlert failed:", e && e.message);
    return { alerted: false, error: String((e && e.message) || e) };
  }
}

/* Resolve the notify target for a program slug: the owning workspace and the
   account email behind it. Returns {} when the workspace/account/email is
   missing (migration not run, no owner yet) — the caller then just logs. */
async function resolveTeam(slug) {
  try {
    const ws = await DBX.select("workspaces", "slug=eq." + encodeURIComponent(slug) + "&select=id,account_id,product_name&order=created_at.asc&limit=1");
    const w = Array.isArray(ws) && ws[0];
    if (!w) return {};
    const out = { workspaceId: w.id, accountId: w.account_id || null, productName: w.product_name || null, email: null };
    if (w.account_id) {
      const accts = await DBX.select("accounts", "id=eq." + encodeURIComponent(w.account_id) + "&select=email&limit=1");
      const a = Array.isArray(accts) && accts[0];
      if (a && a.email) out.email = String(a.email).trim();
    }
    return out;
  } catch (_e) { return {}; }
}

/* Debounce guard — has an equivalent alert fired in the last DEBOUNCE_MINUTES?
   Tolerates a missing team_alerts table (migration not run) by returning false. */
async function recentlyAlerted(workspaceId, kind, partnerId) {
  try {
    const since = new Date(Date.now() - DEBOUNCE_MINUTES * 60 * 1000).toISOString();
    let q = "created_at=gte." + since + "&kind=eq." + encodeURIComponent(kind) + "&select=id&limit=1";
    q += workspaceId ? "&workspace_id=eq." + encodeURIComponent(workspaceId) : "&workspace_id=is.null";
    if (partnerId) q += "&partner_id=eq." + encodeURIComponent(partnerId);
    const rows = await DBX.select("team_alerts", q);
    return Array.isArray(rows) && rows.length > 0;
  } catch (_e) { return false; }
}

async function logAlert(workspaceId, kind, partnerId, detail) {
  try {
    await DBX.insert("team_alerts", { workspace_id: workspaceId, kind: kind, partner_id: partnerId, detail: String(detail || "").slice(0, 500) });
  } catch (e) { console.error("[_alerts] logAlert failed:", e && e.message); }
}

/* ---------- the alert email (short by design) ---------- */
async function sendAlertEmail(toEmail, product, label, who, quote, channel, dashUrl) {
  const subject = "⚠ " + product + " — " + label;
  const text =
    label + " from " + who + " (" + channel + ").\n\n" +
    (quote ? "“" + quote + "”\n\n" : "") +
    "See it on your Observant dashboard:\n" + dashUrl + "\n";
  const html = alertHtml(product, label, who, quote, channel, dashUrl);
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
  } catch (e) { console.error("[_alerts] send failed:", e && e.message); return false; }
}

function alertHtml(product, label, who, quote, channel, dashUrl) {
  const q = esc(quote);
  return '<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#24221e;max-width:560px">' +
    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:.05em;text-transform:uppercase;color:#b4532a;font-weight:600">Urgent • ' + esc(channel) + '</p>' +
    '<p style="margin:0 0 12px;font-size:17px;font-weight:600">' + esc(label) + ' — <span style="color:#5a5347;font-weight:500">' + esc(who) + '</span></p>' +
    (q ? '<blockquote style="margin:0 0 16px;padding:12px 14px;background:#f4efe6;border-left:3px solid #b4532a;border-radius:6px;color:#3a352d">“' + q + '”</blockquote>' : '') +
    '<div style="margin:18px 0"><a href="' + esc(dashUrl) + '" style="display:inline-block;background:#b4532a;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">Open your dashboard →</a></div>' +
    '<p style="font-size:13px;color:#8a857c;margin:0">You’re getting this because it’s the kind of feedback you’d want to know about right away, from ' + esc(product) + '.</p></div>';
}

/* ---------- helpers ---------- */
function displayWho(name, handle) {
  const h = norm(handle);
  const n = norm(name);
  if (h && n && h !== n) return n + " (" + h + ")";
  return h || n || "a user";
}
function norm(v) { return String(v == null ? "" : v).replace(/\s+/g, " ").trim(); }
function slugify(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

module.exports = { maybeAlert, looksChurny, classify };
