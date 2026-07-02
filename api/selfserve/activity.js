/* ============================================================
   Observant — LIVE activity for the builder dashboard (#).
   Surfaces the REAL feedback partners and their 1:1 replies that
   the off-product loop writes to the DB (join.js opts them in;
   reply.js / inbound-email.js / telegram/webhook.js write the
   messages + minutes) — which otherwise never reach the dashboard,
   because the dashboard renders from the workspace STATE SNAPSHOT
   (state.people / state.conversations) and that snapshot is never
   synced from these live tables. THIS endpoint bridges that gap.

   Auth: same as workspace.js / partner-portal.js — the browser
   passes the Supabase access token as a Bearer header; we verify
   it against Supabase's /auth/v1/user (anon key) to recover the
   trusted { id, email }. A signed-in user can thus only ever read
   THEIR OWN workspace's activity.

   Linkage (the dashboard <-> DB join):
     accounts.auth_user_id = <verified user id>
       → workspaces (account_id) → { slug, id }
       → programs   WHERE slug = <workspace slug> OR workspace_id = <id>
       → partners   (status=active)
       → conversations (most-recent per partner) → messages
       → minutes    (partner_balances, else summed minutes_ledger)

   Returns { ok:true, people:[...], conversations:[...] } shaped to
   MATCH the dashboard's existing structures (see app/selfserve-data.jsx —
   ssCreatePeople / ssCreateConversations), so the merge is drop-in.

   Degrades to { ok:true, people:[], conversations:[] } on no DB /
   no token / no workspace / ANY error — never throws, so the caller
   can safely leave its clean empty state untouched.
   ============================================================ */
const db = require("../_db");

const SB_URL = (process.env.SUPABASE_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
// Prefer the anon key for token verification; fall back to service role.
const SB_APIKEY = (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

const COLORS = ["rust", "green", "blue", "gold", "teal", "plum"];

// Verify a Supabase access token → returns { id, email, ... } or null.
async function verifyToken(token) {
  if (!token || !SB_URL || !SB_APIKEY) return null;
  try {
    const res = await fetch(SB_URL + "/auth/v1/user", {
      headers: { apikey: SB_APIKEY, Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return u && u.id ? u : null;
  } catch (_e) {
    return null;
  }
}

// PostgREST in.(...) list, comma-joined (slugs + uuids are safe raw).
function inList(ids) {
  return "(" + ids.map((id) => String(id)).join(",") + ")";
}

// Empty (but ok) response — the caller treats this as "no live rows; leave
// the current clean state alone". Used for every degrade path.
function empty(res) {
  res.status(200).json({ ok: true, people: [], conversations: [], inproductFeedback: [] });
}

// created_at → a short relative label ("12m ago", "3h ago", "2d ago").
function relTime(iso) {
  const t = Date.parse(iso || "");
  if (!t) return "";
  const secs = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days + "d ago";
}

// email → "Jane Doe"; telegram → @handle (or a neutral label); never blank.
function displayName(partner) {
  const channel = String(partner.channel || "").toLowerCase();
  if (channel === "telegram") {
    if (partner.handle) return String(partner.handle);
    return "Telegram partner";
  }
  const contact = String(partner.contact || "").trim();
  const local = (contact.split("@")[0] || contact).trim();
  if (!local) return contact || "Feedback partner";
  const pretty = local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return pretty || contact;
}

function surfaceLabel(channel) {
  const c = String(channel || "").toLowerCase();
  if (c === "telegram") return "Telegram";
  if (c === "inproduct") return "In-product";
  return "Email";
}

// live conversation.status → dashboard conversation.state
function convState(status) {
  if (status === "sufficient") return "Done";
  if (status === "paused") return "Async";
  return "Active"; // open / anything else
}

// live conversation.status → dashboard person.status
function personStatus(status) {
  if (status === "open") return "Active now";
  if (status === "sufficient") return "Watching";
  return "Async"; // paused / no conversation
}

function rewardLabel(minutes) {
  if (minutes >= 200) return "Gold tier";
  if (minutes >= 100) return "Silver tier";
  if (minutes >= 30) return "Bronze tier";
  return "Just started accruing";
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();

  // No DB / no Supabase env → nothing live to surface.
  if (!db.dbConfigured() || !SB_URL || !SB_APIKEY) return empty(res);

  // Recover + verify the bearer token — this is how we know which account.
  const authHeader = req.headers.authorization || req.headers.Authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const user = await verifyToken(token);
  if (!user) return empty(res); // no/invalid token → empty, never a throw/401 that clobbers

  try {
    // --- account → workspace(s) ---
    const accounts = await db.select(
      "accounts",
      "auth_user_id=eq." + encodeURIComponent(user.id) + "&select=id&limit=1"
    );
    const account = Array.isArray(accounts) && accounts[0];
    if (!account || !account.id) return empty(res);

    const workspaces = await db.select(
      "workspaces",
      "account_id=eq." + encodeURIComponent(account.id) + "&select=id,slug"
    );
    const wsList = Array.isArray(workspaces) ? workspaces : [];
    if (!wsList.length) return empty(res);
    const wsIds = wsList.map((w) => w.id).filter(Boolean);
    const slugs = wsList.map((w) => w.slug).filter(Boolean);

    // --- in-product feedback (snippet.js signals) for this workspace ---
    // Keyed by workspace SLUG (always) OR workspace_id (once ownership.sql has run),
    // NOT by program — so these surface even before any off-product partner replies.
    // Same two-select + dedupe pattern as programs, tolerant of the missing column.
    const ipfById = {};
    const ipfCols = "&select=id,type,value,note,url,user_ref,created_at&order=created_at.desc&limit=200";
    if (slugs.length) {
      try {
        const bySlug = await db.select("inproduct_feedback", "slug=in." + inList(slugs) + ipfCols);
        (Array.isArray(bySlug) ? bySlug : []).forEach((r) => { ipfById[r.id] = r; });
      } catch (_e) { /* no table yet → no in-product signals */ }
    }
    if (wsIds.length) {
      try {
        const byWs = await db.select("inproduct_feedback", "workspace_id=in." + inList(wsIds) + ipfCols);
        (Array.isArray(byWs) ? byWs : []).forEach((r) => { ipfById[r.id] = r; });
      } catch (_e) { /* no workspace_id column yet — slug match is enough */ }
    }
    // Shape to MATCH the dashboard's ssCreateInproductFeedback rows (type/value/note/
    // url/user_ref/time) so the merge into state.inproductFeedback is drop-in.
    const inproductFeedback = Object.keys(ipfById).map((k) => {
      const r = ipfById[k];
      return {
        id: r.id,
        type: r.type,
        value: r.value,
        note: r.note,
        url: r.url,
        user_ref: r.user_ref || "",
        time: relTime(r.created_at),
      };
    });

    // --- programs: slug === workspace slug OR workspace_id === workspace id ---
    // (two selects + dedupe by id, to avoid brittle PostgREST OR-list syntax)
    const progById = {};
    const progCols = "&select=id,slug,product_name,rate_per_min,comp_type";
    if (slugs.length) {
      const bySlug = await db.select("programs", "slug=in." + inList(slugs) + progCols);
      (Array.isArray(bySlug) ? bySlug : []).forEach((p) => { progById[p.id] = p; });
    }
    if (wsIds.length) {
      // Optional: also match by workspace_id — but that column only exists once
      // ownership.sql has been run. Tolerate its absence so the slug match (above)
      // still works without the migration.
      try {
        const byWs = await db.select("programs", "workspace_id=in." + inList(wsIds) + progCols);
        (Array.isArray(byWs) ? byWs : []).forEach((p) => { progById[p.id] = p; });
      } catch (_e) { /* no workspace_id column yet — slug match is enough */ }
    }
    const programs = Object.keys(progById).map((k) => progById[k]);
    // No off-product programs yet — but still surface any in-product signals.
    if (!programs.length) return res.status(200).json({ ok: true, people: [], conversations: [], inproductFeedback });
    const progIds = programs.map((p) => p.id);

    // --- partners (active) for those programs ---
    // `handle` is an optional column (db/migrations/telegram.sql) — try with it,
    // fall back without so an older schema still resolves.
    const pQuery = "program_id=in." + inList(progIds) + "&status=eq.active";
    let partners;
    try {
      partners = await db.select("partners", pQuery + "&select=id,program_id,channel,contact,handle,cadence,status,created_at&order=created_at.asc");
    } catch (_e) {
      partners = await db.select("partners", pQuery + "&select=id,program_id,channel,contact,cadence,status,created_at&order=created_at.asc");
    }
    partners = Array.isArray(partners) ? partners : [];
    // Never surface the signed-in builder (the account owner) as a feedback partner —
    // e.g. when they opted their own email in while testing. Their contact === user.email.
    const ownerEmail = String(user.email || "").trim().toLowerCase();
    if (ownerEmail) {
      partners = partners.filter((p) => String(p.contact || "").trim().toLowerCase() !== ownerEmail);
    }
    // No off-product partners yet — but still surface any in-product signals.
    if (!partners.length) return res.status(200).json({ ok: true, people: [], conversations: [], inproductFeedback });
    const partnerIds = partners.map((p) => p.id);
    const partnerById = {};
    partners.forEach((p) => { partnerById[p.id] = p; });

    // --- conversations: most-recent per partner ---
    const convs = await db.select(
      "conversations",
      "partner_id=in." + inList(partnerIds) +
        "&select=id,partner_id,subject,status,mode,last_active_at,created_at&order=last_active_at.desc"
    );
    const convByPartner = {};
    (Array.isArray(convs) ? convs : []).forEach((c) => {
      if (!convByPartner[c.partner_id]) convByPartner[c.partner_id] = c; // desc → first is most recent
    });
    const convList = Object.keys(convByPartner).map((k) => convByPartner[k]);
    const convIds = convList.map((c) => c.id);

    // --- messages for those conversations (oldest → newest) ---
    const msgsByConv = {};
    if (convIds.length) {
      const msgs = await db.select(
        "messages",
        "conversation_id=in." + inList(convIds) +
          "&select=conversation_id,sender,body,minutes,created_at&order=created_at.asc&limit=500"
      );
      (Array.isArray(msgs) ? msgs : []).forEach((m) => {
        (msgsByConv[m.conversation_id] = msgsByConv[m.conversation_id] || []).push(m);
      });
    }

    // --- minutes per partner: partner_balances view, else sum minutes_ledger ---
    const balByPartner = {};
    try {
      const balances = await db.select(
        "partner_balances",
        "partner_id=in." + inList(partnerIds) + "&select=partner_id,net_minutes,earned_minutes,balance_amount"
      );
      (Array.isArray(balances) ? balances : []).forEach((b) => { balByPartner[b.partner_id] = b; });
    } catch (_e) { /* no view → fall through to ledger sum */ }
    if (!Object.keys(balByPartner).length) {
      try {
        const ledger = await db.select(
          "minutes_ledger",
          "partner_id=in." + inList(partnerIds) + "&select=partner_id,minutes,amount,kind"
        );
        (Array.isArray(ledger) ? ledger : []).forEach((l) => {
          const b = balByPartner[l.partner_id] = balByPartner[l.partner_id] || { partner_id: l.partner_id, net_minutes: 0, earned_minutes: 0, balance_amount: 0 };
          const min = Number(l.minutes) || 0;
          b.net_minutes += min;
          b.earned_minutes += (l.kind === "earned" ? min : 0);
          b.balance_amount += Number(l.amount) || 0;
        });
      } catch (_e) { /* no ledger → minutes just render as 0 */ }
    }

    // --- shape people (one per active partner, incl. those pre-reply) ---
    const people = partners.map((p, i) => {
      const conv = convByPartner[p.id];
      const bal = balByPartner[p.id] || {};
      const mins = Math.round(Number(bal.earned_minutes || bal.net_minutes || 0));
      const cmsgs = conv ? (msgsByConv[conv.id] || []) : [];
      const replies = cmsgs.filter((m) => m.sender === "partner").map((m) => String(m.body || "")).filter(Boolean);
      const lastReply = replies.length ? replies[replies.length - 1] : "";
      const surface = surfaceLabel(p.channel);
      return {
        id: p.id,
        name: displayName(p),
        color: COLORS[i % COLORS.length],
        segment: "Feedback partner",
        surface,
        status: conv ? personStatus(conv.status) : "Async",
        memory: (conv && conv.subject) || ("Opted in via " + surface.toLowerCase() + "."),
        last: lastReply,
        profile: {
          since: mins + " min",
          reward: rewardLabel(mins),
          knows: [],
          shared: replies,
          open: [],
        },
      };
    });

    // --- shape conversations (mirror ssCreateConversations: t/text/meta) ---
    const conversations = convList.map((c) => {
      const p = partnerById[c.partner_id];
      const name = p ? displayName(p) : "Partner";
      const cmsgs = msgsByConv[c.id] || [];
      return {
        id: c.id,
        userId: c.partner_id,
        title: c.subject || (surfaceLabel(p && p.channel) + " 1:1"),
        state: convState(c.status),
        mode: c.mode === "voice" ? "voice" : "chat",
        duration: "",
        messages: cmsgs.map((m) => ({
          t: m.sender === "observant" ? "them" : "user",
          text: String(m.body || ""),
          meta: m.sender === "observant" ? "Observant" : name,
          minutes: Number(m.minutes) || 0,
          at: m.created_at,
        })),
      };
    });

    res.status(200).json({ ok: true, people, conversations, inproductFeedback });
  } catch (err) {
    // Never throw — degrade to empty so the dashboard keeps its clean state.
    console.error("[selfserve/activity] failed:", err && err.message);
    empty(res);
  }
};
