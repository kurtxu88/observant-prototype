/* ============================================================
   OBSERVANT self-serve SaaS prototype
   ============================================================ */
const { useState: useStateSS, useEffect: useEffectSS, useRef: useRefSS } = React;

// Sidebar nav — two labeled program groups (Off-product, In-product), each sub-item its
// own focused page. Home sits above; Insights + Settings below. Groups render as an
// uppercase section label with always-visible, indented sub-rows.
const SS_NAV = [
  { id: "home", label: "Home", icon: "grid" },
  {
    group: "Off-product",
    items: [
      { id: "partners", label: "Partners", icon: "users" },
      { id: "loops", label: "Loops", icon: "spark" },
      { id: "threads", label: "1:1 threads", icon: "chat" },
      { id: "offmanage", label: "Manage setup", title: "Off-product setup", icon: "settings" },
    ],
  },
  {
    group: "In-product",
    items: [
      { id: "signals", label: "Signals", icon: "globe" },
      { id: "inmanage", label: "Manage setup", title: "In-product setup", icon: "settings" },
    ],
  },
  { id: "insights", label: "Insights", icon: "book" },
  { id: "settings", label: "Settings", icon: "settings" },
];
// Flat list of every reachable nav section (for label lookups + validity checks).
const SS_ALL_SECTIONS = SS_NAV.reduce((acc, entry) => acc.concat(entry.items ? entry.items : [entry]), []);

// Legacy section ids → their new leaf destination, so any older
// navigate({section:"people"|"compose"|"learning"|"offproduct"|"inproduct"}) call
// (and old deep-links) still lands on the right focused page.
// "sources" stays a reachable (non-nav) first-run setup hub.
const SS_SECTION_ALIAS = {
  people: "partners", compose: "loops", learning: "loops",
  offproduct: "partners", inproduct: "signals",
};
// Legacy Off-product sub-tab id → new leaf section (for navigate({offTab}) + ?tab= URLs).
const SS_OFF_TAB_TO_SECTION = { partners: "partners", loops: "loops", threads: "threads", manage: "offmanage" };

// Resolve a (possibly legacy) section + optional offTab into a concrete leaf section id.
function ssResolveSection(section, offTab) {
  if (section === "offproduct" && offTab && SS_OFF_TAB_TO_SECTION[offTab]) return SS_OFF_TAB_TO_SECTION[offTab];
  if (section === "inproduct" && offTab === "manage") return "inmanage";
  return SS_SECTION_ALIAS[section] || section;
}

// --- Deep-linkable section URLs ---
// Each leaf gets its own path under /setup (or /portal):
//   /setup/home
//   /setup/off-product/partners  /setup/off-product/loops
//   /setup/off-product/threads   /setup/off-product/manage
//   /setup/in-product/signals    /setup/in-product/manage
//   /setup/insights  /setup/settings  (context + sources non-nav but addressable)
const SS_SECTION_TO_SLUG = {
  home: "home",
  partners: "off-product/partners", loops: "off-product/loops",
  threads: "off-product/threads", offmanage: "off-product/manage",
  signals: "in-product/signals", inmanage: "in-product/manage",
  insights: "insights", settings: "settings", context: "context", sources: "sources",
};
const SS_SLUG_TO_SECTION = {
  home: "home",
  "off-product/partners": "partners", "off-product/loops": "loops",
  "off-product/threads": "threads", "off-product/manage": "offmanage",
  "in-product/signals": "signals", "in-product/manage": "inmanage",
  insights: "insights", settings: "settings", context: "context", sources: "sources",
  // legacy front-door slugs (no leaf segment) → each program's default page
  "off-product": "partners", "in-product": "signals",
};

// The base segment we're mounted under — "/setup" (real workspace) or "/portal" (sample).
function ssBasePath() { return SS_VIEW === "portal" ? "/portal" : "/setup"; }

// Build the URL path for a leaf section.
function ssSectionPath(section) {
  const slug = SS_SECTION_TO_SLUG[SS_SECTION_ALIAS[section] || section] || "home";
  return ssBasePath() + "/" + slug;
}

// Parse the current pathname → { section } (or null if not a dashboard URL).
function ssParseLocation() {
  const segs = window.location.pathname.toLowerCase().replace(/^\/+|\/+$/g, "").split("/");
  if (segs[0] !== "setup" && segs[0] !== "portal") return null;
  const two = segs.slice(1, 3).join("/");
  let section = SS_SLUG_TO_SECTION[two] || SS_SLUG_TO_SECTION[segs[1] || ""];
  // legacy ?tab= on the off-product front door (/setup/off-product?tab=threads)
  if ((segs[1] || "") === "off-product" && !segs[2]) {
    const qtab = new URLSearchParams(window.location.search).get("tab");
    if (SS_OFF_TAB_TO_SECTION[qtab]) section = SS_OFF_TAB_TO_SECTION[qtab];
  }
  if (!section) return null;
  return { section };
}

// PLACEHOLDER — swap for the real booking link before sharing externally.
const SS_BOOK_CALL_URL = "https://calendly.com/observant-ai/intro";

const SS_EMPTY_WORKSPACE_FORM = {
  founderName: "",
  email: "",
  companyName: "",
  productUrl: "",
  productDescription: "",
  userBase: "",
  learningGoal: "",
  context: { goal3mo: "", priorLearning: "", docs: [] },
};

const SS_ANSWER_STAGES = [
  { id: "existing", label: "Finding from existing feedback", detail: "Checking prior 1:1 lines, behavior signals, and open loops." },
  { id: "context", label: "Collecting context", detail: "Pulling the product goal and remembered user context into the answer." },
  { id: "users", label: "Finding the right users", detail: "Choosing who can add fresh context to this question." },
  { id: "feedback", label: "Collecting feedback", detail: "Reading new replies and recent user signals as they come in." },
  { id: "answer", label: "Summarizing answer", detail: "Turning the evidence into a grounded recommendation." },
];

function ssLoadState() {
  try {
    const raw = localStorage.getItem(SS_STORAGE_KEY);
    return raw ? SelfServeData.normalizeState(JSON.parse(raw)) : null;
  } catch (err) {
    return null;
  }
}

// Persist the per-browser cache. When a signed-in account is provided, tag the
// cache with that account identity (`_account`) so a DIFFERENT account signing in
// on the same browser can't inherit this workspace. When no account is given
// (signed-out / Supabase-unconfigured), the tag is stripped → account-untagged-safe,
// exactly as before.
function ssSaveState(state, account) {
  if (!state) return;
  const { _account, ...rest } = state;
  const payload = account ? { ...rest, _account: account } : rest;
  localStorage.setItem(SS_STORAGE_KEY, JSON.stringify(payload));
}

// Normalized account key used for tagging + matching the cache (emails are
// case-insensitive; empty when signed out).
function ssAcctKey(email) {
  return String(email || "").trim().toLowerCase();
}

function ssRemoveState() {
  localStorage.removeItem(SS_STORAGE_KEY);
}

// Is this the ephemeral Northwind SAMPLE (not a real account)? A sample is
// identified three ways, any of which is decisive:
//   1. the durable `isSample` marker set by createSampleState,
//   2. a non-"custom" workspaceMode (only custom workspaces are ever real),
//   3. the demo's identity leaking through as "custom" — a workspace carrying
//      SS_DEFAULT_WORKSPACE's company + email (the reported bug: Settings shows
//      Northwind / maya@northwind.ai while all real data arrays are empty).
// Sample state must NEVER be persisted (localStorage or DB) and must be discarded
// on a real sign-in / on /setup init, so a real account is always a clean slate.
function ssIsSampleState(state) {
  if (!state) return false;
  if (state.isSample) return true;
  if (state.workspaceMode && state.workspaceMode !== "custom") return true;
  try {
    const ws = state.workspace || {};
    const name = String(ws.companyName || "").trim().toLowerCase();
    const email = String(ws.email || "").trim().toLowerCase();
    const demoName = String(SS_DEFAULT_WORKSPACE.companyName || "").trim().toLowerCase();
    const demoEmail = String(SS_DEFAULT_WORKSPACE.email || "").trim().toLowerCase();
    if (name && email && name === demoName && email === demoEmail) return true;
  } catch (e) {}
  return false;
}

// ---- account-keyed DB persistence (survives a new browser / incognito) ----
// localStorage above is a per-browser cache; the DB (keyed to the signed-in
// Supabase account) is the cross-browser source of truth, so the same workspace
// loads anywhere instead of forcing re-onboarding. All calls degrade quietly:
// signed-out / no DB / any error → null, and the app keeps using localStorage.
const SS_WS_ENDPOINT = "/api/selfserve/workspace";

function ssWorkspaceSlug(state) {
  try {
    const name = ((state && state.workspace && state.workspace.companyName) || "").trim().toLowerCase();
    const slug = name.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || "default";
  } catch (e) { return "default"; }
}

// Get the current session's access token (via the shared auth helper), or null
// when Supabase isn't configured / there's no session.
async function ssDbToken() {
  try {
    const A = await ssEnsureAuth();
    if (!A || !A.isConfigured || !A.isConfigured()) return null;
    return await A.getAccessToken();
  } catch (e) { return null; }
}

// Load this account's most-recent workspace from the DB. Returns a normalized
// state object (preferred over localStorage) or null when there's nothing real
// to hydrate (no DB, signed out, simulated, or no saved workspace yet).
async function ssDbLoadState() {
  try {
    const token = await ssDbToken();
    if (!token) return null;
    const res = await fetch(SS_WS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ action: "load" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.simulated) return null;
    const ws = data.workspace;
    if (!ws || !ws.state || !ws.state.workspace) return null;
    return SelfServeData.normalizeState(ws.state);
  } catch (e) { return null; }
}

// ---- LIVE activity (real feedback partners + their 1:1 replies) ----
// join.js / reply.js / inbound-email.js / telegram/webhook.js write real
// partners + conversations + messages to the DB, but the dashboard renders
// from the workspace STATE SNAPSHOT (state.people / state.conversations),
// which is never synced from those tables — so real replies never surface.
// This fetches /api/selfserve/activity (account-scoped, same bearer token)
// and returns { people, conversations } in the dashboard's own shapes, or
// null on any failure so the caller can leave its clean state untouched.
const SS_ACTIVITY_ENDPOINT = "/api/selfserve/activity";

async function ssActivityLoad() {
  try {
    const token = await ssDbToken();
    if (!token) return null;
    const res = await fetch(SS_ACTIVITY_ENDPOINT, {
      method: "GET",
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.ok !== true) return null;
    return {
      people: Array.isArray(data.people) ? data.people : [],
      conversations: Array.isArray(data.conversations) ? data.conversations : [],
    };
  } catch (e) { return null; }
}

// Merge incoming rows over the current list by id (incoming first, then any
// current rows not present in incoming). No-op when incoming is empty.
function ssMergeById(currentList, incomingList) {
  const current = Array.isArray(currentList) ? currentList : [];
  const incoming = Array.isArray(incomingList) ? incomingList : [];
  if (!incoming.length) return current;
  const incomingIds = new Set(incoming.map((r) => r && r.id).filter(Boolean));
  const kept = current.filter((r) => r && !incomingIds.has(r.id));
  return [...incoming, ...kept];
}

// Fold live people/conversations into the current state. Selects the first
// live conversation when nothing is selected yet, so the People / Off-product
// view has something focused.
function ssMergeLiveActivity(state, people, conversations) {
  const nextPeople = ssMergeById(state.people, people);
  const nextConversations = ssMergeById(state.conversations, conversations);
  const hasSelected = state.selectedConversationId
    && nextConversations.some((c) => c.id === state.selectedConversationId);
  const selectedConversationId = hasSelected
    ? state.selectedConversationId
    : (conversations && conversations[0] ? conversations[0].id : state.selectedConversationId);
  return { ...state, people: nextPeople, conversations: nextConversations, selectedConversationId };
}

// Fire-and-forget save of the current workspace state, keyed to the account.
async function ssDbSaveState(state) {
  try {
    if (!state || !state.workspace) return;
    const token = await ssDbToken();
    if (!token) return;
    await fetch(SS_WS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        action: "save",
        slug: ssWorkspaceSlug(state),
        product: {
          name: ((state.workspace.companyName) || "").trim(),
          description: ((state.workspace.productDescription) || "").trim(),
        },
        state,
      }),
    });
  } catch (e) { /* fire-and-forget */ }
}

function ssUpdateById(items, id, update) {
  return items.map((item) => item.id === id ? { ...item, ...update(item) } : item);
}

function ssFirstActiveConversationId(state) {
  const conversation = state.conversations.find((item) => item.state === "Active") || state.conversations[0];
  return conversation ? conversation.id : "";
}

function ssConversationIdForPerson(state, personId) {
  const conversation = state.conversations.find((item) => item.userId === personId) || state.conversations.find((item) => item.id === personId) || state.conversations[0];
  return conversation ? conversation.id : "";
}

function ssPersonForConversation(state, conversation) {
  if (!conversation) return null;
  return state.people.find((item) => item.id === conversation.userId) || state.people.find((item) => item.id === conversation.id) || null;
}

function ssFocusClass(state, target) {
  return state.focusedTarget === target ? " is-focused" : "";
}

function ssSelectedLoop(state) {
  return state.loops.find((loop) => loop.id === state.selectedLoopId) || state.loops[0];
}

function ssLoopPeople(state, loop) {
  if (!loop) return [];
  const ids = loop.peopleIds || [];
  return state.people.filter((person) => ids.includes(person.id));
}

function ssLoopConversations(state, loop) {
  if (!loop) return [];
  const ids = loop.conversationIds || (loop.conversationId ? [loop.conversationId] : []);
  return state.conversations.filter((conversation) => ids.includes(conversation.id));
}

function ssLoopEvents(state, loop) {
  if (!loop) return [];
  const ids = loop.eventIds || [];
  return state.events.filter((event) => ids.includes(event.id));
}

function ssSurfaceLabel(surface) {
  const labels = { email: "Email", slack: "Slack", discord: "Discord", product: "In-product" };
  return labels[surface] || surface;
}

// ---- Channel model: normalize a person's surface into a channel key + badge meta.
// Off-product = email + Telegram (the 1:1 threads); in-product = the snippet signals.
function ssChannelKey(surface) {
  const s = String(surface || "").toLowerCase();
  if (s.indexOf("telegram") >= 0) return "telegram";
  if (s.indexOf("mail") >= 0) return "email";
  if (s.indexOf("product") >= 0 || s.indexOf("app") >= 0) return "inproduct";
  return "offproduct";
}
function ssChannelMeta(key) {
  const map = {
    email: { label: "Email", icon: "mail" },
    telegram: { label: "Telegram", icon: "chat" },
    inproduct: { label: "In-product", icon: "globe" },
  };
  return map[key] || { label: "Off-product", icon: "relay" };
}
function ssPersonMinutes(person) {
  const m = String(person && person.profile && person.profile.since || "").match(/(\d+)\s*min/);
  return m ? m[1] + " min" : "";
}
function ssPersonReward(person) {
  return (person && person.profile && person.profile.reward) || "";
}
// The four in-product feedback kinds the snippet collects.
function ssInproductMeta(type) {
  const map = {
    feedback: { label: "Feedback", icon: "chat" },
    eval: { label: "AI eval", icon: "spark" },
    exit: { label: "Exit survey", icon: "back" },
    csat: { label: "CSAT", icon: "check" },
  };
  return map[type] || { label: "Signal", icon: "globe" };
}
function ssInproductValue(fb) {
  const t = fb && fb.type;
  const v = String((fb && fb.value) || "");
  if (t === "eval") return v === "up" ? "Rated helpful" : v === "down" ? "Rated not helpful" : (v || "Rated");
  if (t === "csat") return v ? "CSAT " + v + "/5" : "CSAT";
  if (t === "exit") return "Left — " + (v ? v.replace(/-/g, " ") : "no reason given");
  if (t === "feedback") return v === "open" ? "Opened feedback" : (v || "Feedback");
  return v || "Signal";
}
function ssInproductWho(state, fb) {
  const person = (state && Array.isArray(state.people) ? state.people : []).find((p) => p.id === fb.userId);
  if (person) return { name: person.name, person: person };
  return { name: fb.user_ref ? "Anonymous · " + fb.user_ref : "Anonymous user", person: null };
}

function ssWorkspaceIsCustom(state) {
  return state.workspaceMode === "custom";
}

function ssActiveLoopRun(state, loopId) {
  return (state.loopRuns || []).find((run) => run.loopId === loopId);
}

async function ssPostJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("Request failed");
  return response.json();
}

function ssWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- sign-in gate plumbing ---------------------------------------------------
// SelfServe.html doesn't ship the Supabase CDN + auth.js (Login/Portal pages do),
// so the gate loads them on demand the first time /setup mounts. Everything
// degrades to null if a script can't load → caller skips the gate.
function ssLoadScript(src) {
  return new Promise((resolve, reject) => {
    const found = Array.from(document.scripts).find((s) => s.src && s.src.indexOf(src) !== -1);
    if (found) {
      if (found.dataset.ssLoaded === "1") return resolve();
      found.addEventListener("load", () => resolve());
      found.addEventListener("error", reject);
      return;
    }
    const tag = document.createElement("script");
    tag.src = src;
    tag.onload = () => { tag.dataset.ssLoaded = "1"; resolve(); };
    tag.onerror = reject;
    document.head.appendChild(tag);
  });
}

let _ssAuthLoad = null;
function ssEnsureAuth() {
  if (_ssAuthLoad) return _ssAuthLoad;
  _ssAuthLoad = (async () => {
    if (window.ObservantAuth) return window.ObservantAuth;
    try {
      if (!window.supabase || !window.supabase.createClient) {
        await ssLoadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      }
      if (!window.ObservantAuth) await ssLoadScript("/app/auth.js");
    } catch (_e) {
      return null; // can't load → degrade to no-gate
    }
    return window.ObservantAuth || null;
  })();
  return _ssAuthLoad;
}

// Quiet loading state while we check the session — no flash of the wizard.
function SsAuthChecking() {
  return <div className="ss-auth-loading"><span>Loading…</span></div>;
}

function SsGoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}

// First thing a signed-out user sees on /setup. Mirrors the standalone /login
// page (Google + magic link) but wears the warm onboarding split layout so the
// gate feels continuous with the wizard behind it.
function SsAuthGate({ redirectTo }) {
  const [email, setEmail] = useStateSS("");
  const [sent, setSent] = useStateSS(false);
  const [busy, setBusy] = useStateSS(false);
  const [note, setNote] = useStateSS("");
  const emailValid = email.includes("@") && email.includes(".");

  const google = async () => {
    setBusy(true); setNote("");
    const A = await ssEnsureAuth();
    if (!A) { setNote("Sign-in is still loading — try again in a moment."); setBusy(false); return; }
    const { error } = await A.signInWithGoogle(redirectTo);
    if (error) { setNote(error.message); setBusy(false); }
  };
  const magic = async () => {
    if (!emailValid || busy) return;
    setBusy(true); setNote("");
    const A = await ssEnsureAuth();
    if (!A) { setNote("Sign-in is still loading — try again in a moment."); setBusy(false); return; }
    const { error } = await A.signInWithEmail(email, redirectTo);
    setBusy(false);
    if (error) { setNote(error.message); return; }
    setSent(true);
  };

  return (
    <div className="ss-entry">
      <div className="ss-entry-left">
        <div className="ss-entry-brand"><Wordmark size="1.65rem" /></div>
        <div className="ss-entry-copy">
          <span className="eyebrow">Get started</span>
          <h1>Sign in to set up Observant.</h1>
          <p>Sign in to get started — then a few steps and Observant starts learning from your users one-on-one, continuously, on their own time.</p>
          <p className="ss-fineprint">Just exploring? <a href="/portal">See the live demo →</a></p>
        </div>
        <div className="ss-proof-grid" aria-label="Product signals">
          <div><b>1:1</b><span>with every user</span></div>
          <div><b>Always on</b><span>learning runs itself</span></div>
          <div><b>MCP</b><span>agent-ready output</span></div>
        </div>
      </div>

      <main className="ss-entry-card">
        <div className="ss-card-head"><span className="eyebrow gray">Sign in</span><h2>Sign in to get started.</h2></div>
        {sent ? (
          <div className="ss-auth-sent">
            <Icon name="check" size={16} sw={2.4} /> Check your inbox — we sent a sign-in link to <b>{email}</b>.
          </div>
        ) : (
          <div className="ss-auth-signin">
            <button type="button" className="btn btn-ghost btn-lg ss-auth-google" onClick={google} disabled={busy}>
              <SsGoogleMark /> Continue with Google
            </button>
            <div className="ss-auth-or"><span>or</span></div>
            <Field label="Work email">
              <input
                className="input"
                type="email"
                value={email}
                placeholder="you@company.com"
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && emailValid && !busy) magic(); }}
              />
            </Field>
            <Btn variant="primary" size="lg" disabled={!emailValid || busy} onClick={magic}>
              Email me a sign-in link
            </Btn>
          </div>
        )}
        {note && <p className="ss-auth-err">{note}</p>}
        <p className="ss-fineprint">No password — we email you a secure sign-in link, or continue with Google.</p>
      </main>
    </div>
  );
}

// Deep links: /setup keeps a signed-in user's launched CUSTOM workspace (their
// real dashboard) and resumes an in-progress one, but never shows the Northwind
// SAMPLE — that belongs only to /portal, which always lands on the sample
// dashboard (auto-created if none exists yet).
const SS_VIEW = (() => {
  // First path segment identifies the base — works for bare /setup and deep links
  // like /setup/insights or /setup/off-product/partners.
  const seg = window.location.pathname.toLowerCase().replace(/^\/+/, "").split("/")[0];
  if (seg === "setup") return "setup";
  if (seg === "portal") return "portal";
  return "";
})();

// GitHub App post-install return. The callback bounces the browser back to
// /setup?gh=installed&installation_id=<id>. Read it ONCE on load, then strip the
// params (replaceState) so a refresh doesn't re-trigger the "open PR" step.
const SS_GH_RETURN = (() => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") !== "installed") return { installed: false, installationId: "" };
    const installationId = params.get("installation_id") || params.get("installationId") || "";
    params.delete("gh");
    params.delete("installation_id");
    params.delete("installationId");
    params.delete("setup_action");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
    return { installed: true, installationId };
  } catch (_e) {
    return { installed: false, installationId: "" };
  }
})();

// --- demo login gate: lets you log out and walk someone through setup again ---
const SS_AUTH_KEY = "observant.auth";
function ssIsAuthed() { try { return !!localStorage.getItem(SS_AUTH_KEY); } catch (e) { return false; } }
function ssSetAuth(info) { try { const v = typeof info === "string" ? { email: info } : (info || {}); localStorage.setItem(SS_AUTH_KEY, JSON.stringify({ name: v.name || "", email: v.email || "", at: Date.now() })); } catch (e) {} }
function ssAuth() { try { return JSON.parse(localStorage.getItem(SS_AUTH_KEY) || "{}"); } catch (e) { return {}; } }
function ssLogout() { try { localStorage.removeItem(SS_AUTH_KEY); ssRemoveState(); } catch (e) {} window.location.href = "/"; }

function LoginGate({ onLogin, onBack }) {
  const [name, setName] = useStateSS("");
  const [email, setEmail] = useStateSS("");
  const ok = email.includes("@") && email.includes(".");
  return (
    <div className="ss-entry">
      <div className="ss-entry-left">
        <div className="ss-entry-brand"><Wordmark size="1.65rem" /></div>
        <div className="ss-entry-copy">
          <span className="eyebrow">Welcome back</span>
          <h1>Log in to Observant.</h1>
          <p>Pick up your workspace where you left off. New here? Head back to set up your product first.</p>
        </div>
      </div>
      <main className="ss-entry-card">
        <div className="ss-card-head"><span className="eyebrow gray">Sign in</span><h2>Continue to your workspace.</h2></div>
        <div className="ss-form-grid">
          <Field label="Your name"><input className="input" value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Work email"><input className="input" value={email} placeholder="you@company.com" onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ok) onLogin({ name, email }); }} /></Field>
        </div>
        <div className="ss-entry-actions">
          <Btn variant="primary" size="lg" disabled={!ok} onClick={() => onLogin({ name, email })}>Log in <Icon name="arrow" size={16} /></Btn>
        </div>
        <p className="ss-fineprint">{onBack && <><button type="button" className="ss-linklike" onClick={onBack}>← Back to setup</button> · </>}Demo login — no password.</p>
      </main>
    </div>
  );
}

function SelfServeApp() {
  const [state, setState] = useStateSS(() => {
    if (SS_VIEW === "setup") {
      const saved = ssLoadState();
      // The Northwind SAMPLE belongs only to the /portal demo — a signed-in user must
      // never be dropped into it on /setup. Discard ANY sample (marker, non-custom
      // mode, or leaked Northwind identity carried as "custom") → clean onboarding.
      if (saved && ssIsSampleState(saved)) { ssRemoveState(); return null; }
      // A launched CUSTOM workspace is the user's real dashboard — keep it; an
      // in-progress (not-yet-launched) workspace resumes onboarding where they left off.
      return saved;
    }
    let saved = ssLoadState();
    if (SS_VIEW === "portal") {
      if (!saved) saved = SelfServeData.createSampleState(SS_DEFAULT_WORKSPACE);
      if (!saved.launched) saved = { ...saved, launched: true, section: "home" };
    }
    return saved;
  });
  const [copied, setCopied] = useStateSS("");
  const [authed, setAuthed] = useStateSS(() => ssIsAuthed());
  const [showLogin, setShowLogin] = useStateSS(false);
  const [editing, setEditing] = useStateSS(false);
  // Supabase sign-in gate: "checking" while we read the session, "signin" if
  // signed-out, "pass" once signed in OR when Supabase isn't configured (degrade).
  const [gate, setGate] = useStateSS("checking");
  const [authEmail, setAuthEmail] = useStateSS("");

  useEffectSS(() => {
    let cancelled = false;
    let unsub = () => {};
    // Safety net: if the auth check ever stalls (slow CDN / hung network), don't
    // sit on the loading screen — fall to the sign-in screen so it's never stuck.
    const stall = setTimeout(() => { if (!cancelled) setGate((g) => (g === "checking" ? "signin" : g)); }, 6000);
    (async () => {
      const A = await ssEnsureAuth();
      if (cancelled) return;
      if (!A) { setGate("signin"); return; }          // scripts unavailable → no gate
      await A.init();
      if (cancelled) return;
      if (!A.isConfigured()) { setGate("pass"); return; } // configured:false → no gate
      // Hydrate the workspace for the signed-in account. The DB (account-keyed) is
      // the source of truth; the localStorage cache is only trusted when it's tagged
      // to THIS same account. This is what stops a brand-new account from inheriting
      // a stale/foreign workspace (e.g. a leftover "Northwind") and skipping onboarding.
      //
      //  - DB has a real workspace  → hydrate it and (re)tag the cache to this account.
      //  - DB has NOTHING (new user) → keep the local cache ONLY if its `_account`
      //    matches this account AND it's a real custom workspace; otherwise DISCARD
      //    the stale/foreign cache and start FRESH onboarding (empty form).
      //  - Skip /portal — that's the public sample demo, not an account's workspace.
      const hydrate = async (acctKey) => {
        if (SS_VIEW === "portal") return;
        try {
          const dbState = await ssDbLoadState();
          if (cancelled) return;
          if (dbState && !ssIsSampleState(dbState)) {
            setState(dbState);
            ssSaveState(dbState, acctKey);           // (re)tag cache to this account
            return;
          }
          // Nothing real in the DB → this account is new here. Only reuse the local
          // cache if it belongs to this account and is a real (custom) workspace —
          // never a sample or a leaked Northwind-identity cache.
          const cached = ssLoadState();
          const mine = cached
            && ssAcctKey(cached._account) === acctKey
            && acctKey
            && cached.workspaceMode === "custom"
            && !ssIsSampleState(cached);
          if (mine) {
            setState(cached);
          } else {
            ssRemoveState();                         // drop stale/foreign cache
            setState(null);                          // → fresh onboarding
          }
        } catch (e) {}
      };

      const session = await A.getSession();
      if (cancelled) return;
      const user = session ? session.user : null;
      if (user) {
        setAuthEmail(user.email || "");
        await hydrate(ssAcctKey(user.email));
        if (cancelled) return;
        setGate("pass");
      } else setGate("signin");
      // Pick up the OAuth / magic-link redirect (or any later change).
      A.onAuthChange(async (u) => {
        if (cancelled || !u) return;
        setAuthEmail(u.email || "");
        await hydrate(ssAcctKey(u.email));
        if (cancelled) return;
        setGate("pass");
      }).then((fn) => { unsub = fn; });
    })();
    return () => { cancelled = true; clearTimeout(stall); unsub(); };
  }, []);

  const signOutAuth = async () => {
    try { if (window.ObservantAuth) await window.ObservantAuth.signOut(); } catch (_e) {}
    // Clear the per-browser workspace cache so the next account signing in on this
    // browser can't inherit this one's workspace.
    ssRemoveState();
    window.location.href = "/setup";
  };

  // GitHub App just got installed → stash the installation id on setup so the
  // in-product track can open the real PR (and survive a reload).
  useEffectSS(() => {
    if (!SS_GH_RETURN.installed || !SS_GH_RETURN.installationId) return;
    setState((current) => current
      ? { ...current, setup: { ...current.setup, githubInstallationId: SS_GH_RETURN.installationId } }
      : current);
  }, []);

  // Persist the per-browser cache, but only once the sign-in gate has SETTLED
  // ("pass"). While "checking"/"signin" we must NOT write — that would clobber the
  // cache's `_account` tag before hydrate can read it to decide keep-vs-discard.
  // Tag the cache with the account ONLY for a real (custom) workspace of a signed-in
  // user; the sample/portal workspace and the signed-out/unconfigured path stay
  // untagged (exactly as before).
  useEffectSS(() => {
    if (gate !== "pass" || !state) return;
    // The sample is EPHEMERAL — never write it. Clear any prior cache so a leftover
    // sample (or a leaked Northwind-identity state) can't linger, then bail.
    if (ssIsSampleState(state)) { ssRemoveState(); return; }
    // Only a real (custom) workspace reaches here — tag it to the signed-in account.
    const account = authEmail ? ssAcctKey(authEmail) : "";
    ssSaveState(state, account);
  }, [state, gate, authEmail]);

  // Account-keyed DB persistence: debounced, fire-and-forget. localStorage (above)
  // stays the fast per-browser cache; the DB is the cross-browser source of truth
  // for a signed-in user. Only real (custom) workspaces are pushed — never the
  // sample / /portal demo — so signed-out or unconfigured behaves exactly as today.
  const ssDbSaveTimer = useRefSS(null);
  useEffectSS(() => {
    if (SS_VIEW === "portal") return undefined;
    if (gate !== "pass" || !authEmail) return undefined;                 // signed-in only
    // Only a real (custom) workspace is pushed — never the ephemeral sample, and
    // never a leaked Northwind-identity state masquerading as custom.
    if (!state || !state.workspace || ssIsSampleState(state)) return undefined;
    if (ssDbSaveTimer.current) clearTimeout(ssDbSaveTimer.current);
    ssDbSaveTimer.current = setTimeout(() => { ssDbSaveState(state); }, 1200);
    return () => { if (ssDbSaveTimer.current) clearTimeout(ssDbSaveTimer.current); };
  }, [state, gate, authEmail]);

  // Pull the REAL feedback partners + their 1:1 replies (written to the live
  // DB by the off-product loop) into the dashboard snapshot, ONCE, for a
  // signed-in CUSTOM workspace (never the sample, never /portal). The activity
  // endpoint is account-scoped and degrades to empty. CRITICAL: only merge
  // when it actually returns rows — an empty/failed fetch leaves the current
  // clean empty state exactly as-is (no clobber, no crash, no loop).
  const ssActivityLoaded = useRefSS(false);
  useEffectSS(() => {
    if (SS_VIEW === "portal") return;                                    // public sample demo
    if (gate !== "pass" || !authEmail) return;                           // signed-in only
    if (!state || !state.workspace || ssIsSampleState(state)) return;    // custom workspace only
    if (ssActivityLoaded.current) return;                                // once per load
    ssActivityLoaded.current = true;
    (async () => {
      const live = await ssActivityLoad();
      if (!live) return;                                                 // failed → leave clean state
      const people = Array.isArray(live.people) ? live.people : [];
      const conversations = Array.isArray(live.conversations) ? live.conversations : [];
      if (!people.length && !conversations.length) return;               // no rows → leave clean state
      setState((current) => {
        if (!current || ssIsSampleState(current)) return current;        // never touch the sample
        return ssMergeLiveActivity(current, people, conversations);
      });
    })();
  }, [state, gate, authEmail]);

  useEffectSS(() => {
    if (!state || !state.loopRuns || !state.loopRuns.length) return undefined;
    const collecting = state.loopRuns.find((run) => {
      const timeline = run.timeline || SS_SIMULATION_STAGES;
      return run.status === "collecting" && run.stageIndex < timeline.length - 1;
    });
    if (!collecting) return undefined;
    const timer = setTimeout(() => {
      setState((current) => current ? SelfServeData.revealSimulation(current, collecting.runId, collecting.stageIndex + 1) : current);
    }, 2200);
    return () => clearTimeout(timer);
  }, [state]);

  const createWorkspace = (form, mode) => {
    if (mode === "sample") { setState(SelfServeData.createSampleState(SS_DEFAULT_WORKSPACE)); return; }
    const auth = ssAuth();
    setState(SelfServeData.createCustomState({ ...form, founderName: form.founderName || auth.name || "", email: form.email || auth.email || "" }));
  };

  const resetWorkspace = () => {
    ssRemoveState();
    setState(null);
  };

  const patchState = (updater) => {
    setState((current) => {
      if (!current) return current;
      const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
      return next;
    });
  };

  const copyText = (key, text) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(""), 1400);
  };

  // Sign-in gate — the first thing on /setup: quiet loading while checking, sign-in screen if signed out.
  if (gate === "checking") return <SsAuthChecking />;
  if (gate === "signin") return <SsAuthGate redirectTo={window.location.href} />;

  // Returning users can reach login; it's a side door, not the front door.
  if (showLogin && !authed && !(state && state.launched)) {
    return <LoginGate onLogin={(info) => { ssSetAuth(info); setAuthed(true); setShowLogin(false); }} onBack={() => setShowLogin(false)} />;
  }

  // Steps 1-2 (Product + optional Context) until there's a workspace.
  if (!state) {
    return (
      <OnboardingWizard
        initial={null}
        startStep={0}
        onLogin={() => setShowLogin(true)}
        onSample={() => { if (!authed) { ssSetAuth({ name: "Demo workspace", email: "demo@observant.dev" }); setAuthed(true); } createWorkspace(SS_DEFAULT_WORKSPACE, "sample"); }}
        onSubmit={(form, acct) => { if (acct) { ssSetAuth(acct); setAuthed(true); } createWorkspace(form, "custom"); }}
      />
    );
  }

  // Editing product/context (Back from the Program step lands on Context).
  if (!state.launched && editing) {
    return (
      <OnboardingWizard
        initial={state.workspace}
        startStep={1}
        onExit={() => setEditing(false)}
        onSubmit={(form) => {
          patchState((current) => ({ ...current, workspace: { ...current.workspace, founderName: form.founderName, email: form.email, companyName: form.companyName, productUrl: form.productUrl, productDescription: form.productDescription, userBase: form.userBase, learningGoal: form.learningGoal, context: form.context } }));
          setEditing(false);
        }}
      />
    );
  }

  // Steps 3-5 (program/surface/review) — ActivationScreen renders the shared bar.
  if (!state.launched) {
    return (
      <ActivationScreen
        state={state}
        patchState={patchState}
        authEmail={authEmail}
        onSignOut={signOutAuth}
        onBackToProduct={() => setEditing(true)}
        onLaunch={() => patchState((current) => ({
          ...current,
          launched: true,
          section: "home",
          activity: ["Learning mode turned on.", ...current.activity],
        }))}
        copied={copied}
        copyText={copyText}
        resetWorkspace={resetWorkspace}
      />
    );
  }

  return (
    <ProductShell
      state={state}
      patchState={patchState}
      copied={copied}
      copyText={copyText}
      resetWorkspace={resetWorkspace}
    />
  );
}

// The whole onboarding, as one progress bar. Step 1 (Product — with account at the
// top) lives in OnboardingWizard; the last three (Program, Surface, Review) are
// ActivationScreen. Both render the SAME bar so it's one continuous flow. Richer
// context (goal/learned/docs) is NOT a step — it lives on the dashboard Context page.
const SS_ONBOARD_FLOW = [
  { id: "product", label: "Product" },
  { id: "context", label: "Context" },
  { id: "surface", label: "Feedback surface" },
  { id: "program", label: "Feedback program" },
  { id: "review", label: "Preview" },
];

// Maps a flow step id to its bar label. `install` only appears when in-product is chosen.
const SS_STEP_LABELS = { product: "Product", context: "Context", surface: "Feedback surface", install: "Code snippet", program: "Feedback program", preview: "Preview" };

// The top stepper is now three phases. The per-surface steps (install / program /
// preview) live INSIDE each surface's sub-flow on the Set-up hub, not here.
const SS_PHASES = [
  { id: "product", label: "Product" },
  { id: "setup", label: "Set up" },
  { id: "done", label: "Done" },
];

function OnboardingBar({ phase }) {
  const current = Math.max(0, SS_PHASES.findIndex((p) => p.id === phase));
  return (
    <ol className="ss-onboard-bar" aria-label="Setup progress">
      {SS_PHASES.map((s, i) => (
        <li key={s.id} className={"ss-onboard-bstep" + (i < current ? " done" : i === current ? " on" : "")}>
          <span className="ss-onboard-bdot">{i < current ? <Icon name="check" size={12} sw={3} /> : i + 1}</span>
          <span className="ss-onboard-blabel">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}

// Onboarding steps 1-2: Product (account at the top) + optional Context & docs.
// `initial` set => editing an existing draft; `startStep` picks which to land on;
// `onExit` returns to the program steps without advancing.
// Guess a product name from the URL's domain (linear.app -> "Linear"), so the
// name field can auto-fill the moment the user drops their URL.
function ssNameFromUrl(url) {
  try {
    let u = String(url || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    const host = new URL(u).hostname.replace(/^www\./i, "");
    const sld = (host.split(".")[0] || "").trim();
    if (!sld) return "";
    return sld.charAt(0).toUpperCase() + sld.slice(1);
  } catch (e) { return ""; }
}

function OnboardingWizard({ initial, startStep, onSubmit, onExit, onSample, onLogin }) {
  const editing = !!initial;
  const [form, setForm] = useStateSS(() => editing ? { ...SS_EMPTY_WORKSPACE_FORM, ...initial } : { ...SS_EMPTY_WORKSPACE_FORM });
  const [step, setStep] = useStateSS(startStep || 0); // 0 product, 1 context
  const [drafting, setDrafting] = useStateSS(false);
  const [sampleMode, setSampleMode] = useStateSS(false); // sample route: pre-filled form -> pre-filled (Northwind) dashboard
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const acctOk = (form.email || "").includes("@") && (form.email || "").includes(".");
  const ready = form.companyName.trim() && acctOk;

  async function draftFromSite() {
    if (!form.productUrl.trim() || drafting) return;
    setDrafting(true);
    try {
      const r = await ssPostJson("/api/selfserve/interview", { action: "describe", product: form.companyName, url: form.productUrl });
      if (r && r.description) setForm((f) => ({ ...f, productDescription: r.description }));
    } catch (e) { /* leave the field for manual entry */ }
    setDrafting(false);
  }

  const submit = () => sampleMode ? onSample() : onSubmit(form, editing ? null : { name: form.founderName, email: form.email });

  return (
    <div className="ss-entry">
      <div className="ss-entry-left">
        <div className="ss-entry-brand"><Wordmark size="1.65rem" /></div>
        <div className="ss-entry-copy">
          <span className="eyebrow">Get started</span>
          <h1>Set up Observant.</h1>
          <p>A few steps and Observant starts learning from your users one-on-one — continuously, on their own time.</p>
        </div>
        <div className="ss-proof-grid" aria-label="Product signals">
          <div><b>1:1</b><span>with every user</span></div>
          <div><b>Always on</b><span>learning runs itself</span></div>
          <div><b>MCP</b><span>agent-ready output</span></div>
        </div>
      </div>

      <main className="ss-entry-card">
        <OnboardingBar phase="product" />

        {step === 0 && (
          <>
            <div className="ss-card-head"><span className="eyebrow gray">You &amp; your product</span><h2>Start with the basics.</h2></div>
            <div className="ss-form-grid">
              <Field label="Your name">
                <input className="input" value={form.founderName} placeholder="Your name" onChange={(e) => update("founderName", e.target.value)} />
              </Field>
              <Field label="Work email">
                <input className="input" type="email" value={form.email} placeholder="you@company.com" onChange={(e) => update("email", e.target.value)} />
              </Field>
              <Field label="Product URL">
                <input className="input" value={form.productUrl} placeholder="https://yourproduct.com" onChange={(e) => update("productUrl", e.target.value)} onBlur={() => {
                  if (!form.productUrl.trim()) return;
                  const guessed = ssNameFromUrl(form.productUrl);
                  if (guessed && !form.companyName.trim()) update("companyName", guessed);
                  if (!form.productDescription.trim()) draftFromSite();
                }} />
              </Field>
              <Field label="Company or product name">
                <input className="input" value={form.companyName} placeholder="Filled from your URL — edit if needed" onChange={(e) => update("companyName", e.target.value)} />
              </Field>
              <Field label="What does it do?" wide>
                <textarea className="textarea" value={form.productDescription} placeholder={drafting ? "Reading your site and drafting this…" : "Drop your URL above and Observant drafts this from your site — or write a sentence yourself."} onChange={(e) => update("productDescription", e.target.value)} />
                {form.productUrl.trim() && (
                  <button type="button" className="ss-linklike ss-draft-btn" onClick={draftFromSite} disabled={drafting}>
                    <Icon name="spark" size={13} /> {drafting ? "Drafting from your site…" : (form.productDescription.trim() ? "Re-draft from site" : "Draft from site")}
                  </button>
                )}
              </Field>
              <Field label="Who uses it today?" wide>
                <textarea className="textarea" value={form.userBase} placeholder="Ops leads at small B2B companies. / Early-career designers. — who Observant should listen to." onChange={(e) => update("userBase", e.target.value)} />
              </Field>
              <Field label="Top-of-mind questions you'd like to learn from users? (optional)" wide>
                <textarea className="textarea" value={form.learningGoal} placeholder="No need to lock anything in — you can feed Observant questions anytime. But if a few are already on your mind, drop them here." onChange={(e) => update("learningGoal", e.target.value)} />
              </Field>
            </div>
            <div className="ss-entry-actions">
              <Btn variant="primary" size="lg" disabled={!ready} onClick={() => setStep(1)}>Continue <Icon name="arrow" size={16} /></Btn>
              {editing
                ? (onExit ? <Btn variant="ghost" size="lg" onClick={onExit}><Icon name="back" size={16} /> Back to setup</Btn> : null)
                : <Btn variant="ghost" size="lg" onClick={() => { setForm({ ...SS_EMPTY_WORKSPACE_FORM, ...SS_DEFAULT_WORKSPACE }); setSampleMode(true); }}>See the sample workspace</Btn>}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="ss-card-head"><span className="eyebrow gray">Context &amp; docs · optional</span><h2>Give Observant more to work with.</h2></div>
            <p className="ss-step-lead">The more Observant knows — your goal, what you've already learned, your docs — the sharper every question. Skip it if you like; you can always add or change this later from the <b>Context</b> page on your dashboard.</p>
            <div className="ss-form-grid">
              <ContextExtraFields value={form.context} onChange={(ctx) => update("context", ctx)} />
            </div>
            <div className="ss-entry-actions">
              <Btn variant="primary" size="lg" onClick={submit}>{editing ? "Save & continue" : "Continue"} <Icon name="arrow" size={16} /></Btn>
              {!editing && <Btn variant="ghost" size="lg" onClick={submit}>Skip for now</Btn>}
              <Btn variant="ghost" size="lg" onClick={() => setStep(0)}><Icon name="back" size={16} /> Back</Btn>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const SS_ONBOARD_STEPS = [
  { id: "surface", t: "Choose feedback surface", d: "Off-product, in-product, or both" },
  { id: "install", t: "Install the snippet", d: "One PR, then it's live" },
  { id: "program", t: "Set up the feedback program", d: "Compensation, your invitation" },
  { id: "preview", t: "Preview", d: "Check it, generate your magic link" },
];

const SS_CONNECT_OPTIONS = [
  { id: "share", icon: "link", title: "Share a list or invite link", text: "Give Observant emails, a segment, or an invite link. The lightest way to start — nothing to install.", tag: "Easiest" },
  { id: "inproduct", icon: "globe", title: "Connect inside your product", text: "Observant loads with a hashed user ID you pass it, so it always knows who it's talking to — without ever holding your real user data.", tag: "One-time setup" },
];

// Right-side docked setup assistant (à la Novus): a full-height rail that introduces
// itself, asks the qualifying role question, streams the conversation, narrates install.
function ObsSetupChat({ product, context, curId }) {
  const [open, setOpen] = useStateSS(true);
  const [input, setInput] = useStateSS("");
  const [noted, setNoted] = useStateSS({});
  const [msgs, setMsgs] = useStateSS([
    { from: "them", text: "Hi — I'm your Observant assistant for " + product + ". I'll help you get set up, and once feedback starts coming in I can help you make sense of it — what to ask, whose feedback to trust, and how to turn it into what to build next. Ask me anything." },
    { from: "them", emph: true, text: "First — what's your role on the team?", chips: ["Founder", "PM", "Engineer", "Designer", "Other"] },
  ]);
  const bodyRef = useRefSS(null);
  // Inset the onboarding layout while the assistant is open, so it sits BESIDE the content (never over it).
  useEffectSS(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.toggle("obs-chat-open", open);
    return () => document.body.classList.remove("obs-chat-open");
  }, [open]);
  useEffectSS(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, open]);
  useEffectSS(() => {
    if (curId === "install" && !noted.install) {
      setNoted((n) => ({ ...n, install: true }));
      replyWithTyping("Prepping your install PR now — this'll take a moment. It'll appear on the left, ready for you to review and merge.");
    }
  }, [curId]);

  // Swap the live "typing…" bubble for the actual reply.
  const swapTyping = (text) => setMsgs((m) => {
    const copy = m.slice();
    for (let i = copy.length - 1; i >= 0; i--) { if (copy[i].typing) { copy[i] = { from: "them", text: text }; return copy; } }
    copy.push({ from: "them", text: text });
    return copy;
  });
  // Static typing→text (used for the install-step note).
  const replyWithTyping = (text) => { setMsgs((m) => m.concat([{ from: "them", typing: true }])); setTimeout(() => swapTyping(text), 850); };

  // Canned fallback if the research endpoint is unreachable.
  const answer = (q) => {
    const s = q.toLowerCase();
    if (/access|permission|secur|scan|read|why.*(github|access)/.test(s)) return "We open one install PR on the repo you pick — scoped to that single repo, just enough to add the snippet. Prefer to grant nothing? You can paste the line yourself.";
    if (/snippet|sdk|install|\bpr\b|pull request|code/.test(s)) return "It's a single line that loads the Observant SDK. We add it via a PR you review and merge — or paste it yourself. Once it's live, the feedback loops start.";
    if (/program|partner|off.?product|panel|invite/.test(s)) return "The feedback program is your opt-in panel — you invite users, the ones who join become partners, and Observant runs the 1:1s.";
    return "Good question — let me think about that with you. What are you hoping to learn from your users?";
  };
  // Real answers come from the Codified-trained research brain (api/selfserve/assistant); fall back to a canned line if it's unreachable.
  const respondTo = (question, history) => {
    setMsgs((m) => m.concat([{ from: "them", typing: true }]));
    fetch("/api/selfserve/assistant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, product, context: context || "", history, mode: "setup" }),
    }).then((r) => r.json()).then((d) => swapTyping((d && d.reply) || answer(question))).catch(() => swapTyping(answer(question)));
  };
  // After the role is picked, offer 1–2 setup-relevant nudges as quick replies.
  const replyWithChips = (text, chips) => {
    setMsgs((m) => m.concat([{ from: "them", typing: true }]));
    setTimeout(() => setMsgs((m) => {
      const copy = m.slice();
      for (let i = copy.length - 1; i >= 0; i--) { if (copy[i].typing) { copy[i] = { from: "them", text: text, chips: chips }; return copy; } }
      copy.push({ from: "them", text: text, chips: chips });
      return copy;
    }), 850);
  };
  const send = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    const history = msgs.filter((m) => !m.typing && m.text).map((m) => ({ role: m.from === "me" ? "user" : "assistant", content: m.text }));
    setMsgs((m) => m.concat([{ from: "me", text: t }]));
    if (["Founder", "PM", "Engineer", "Designer", "Other"].includes(t)) { replyWithChips("Got it — thanks. That helps me tailor what I suggest as you set up. Want a hand picking what to ask first, or which tools to connect?", ["What should I ask my users first?", "Should I connect Slack or PostHog?"]); return; }
    respondTo(t, history);
  };

  if (!open) {
    return <button type="button" className="obs-chat-bubble" onClick={() => setOpen(true)} aria-label={"Open " + product + " setup assistant"}><Icon name="chat" size={20} /></button>;
  }
  return (
    <aside className="obs-chat" aria-label={product + " setup assistant"}>
      <header className="obs-chat-head">
        <span className="obs-chat-mark"><Icon name="spark" size={16} /></span>
        <div className="obs-chat-id"><b>{product} Setup</b><span>Observant assistant</span></div>
        <button type="button" className="obs-chat-min" onClick={() => setOpen(false)} aria-label="Minimize assistant"><Icon name="x" size={15} /></button>
      </header>
      <div className="obs-chat-body" ref={bodyRef}>
        {msgs.map((m, i) => {
          const lead = m.from === "them" && (i === 0 || msgs[i - 1].from !== "them");
          return (
            <div key={i} className={"obs-chat-msg " + m.from + (m.emph ? " emph" : "")}>
              {lead && <span className="obs-chat-sender">Observant</span>}
              {m.typing ? <p className="obs-chat-typing"><i></i><i></i><i></i></p> : <p>{m.text}</p>}
              {!m.typing && m.chips && <div className="obs-chat-chips">{m.chips.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}</div>}
            </div>
          );
        })}
      </div>
      <div className="obs-chat-input">
        <input value={input} placeholder="Ask anything about setup…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button type="button" onClick={() => send()} aria-label="Send"><Icon name="arrow" size={16} /></button>
      </div>
    </aside>
  );
}

// Compact, bounded brief of the dashboard's REAL feedback data (partners, recent
// conversations, top insights) so the assistant answers grounded in what's actually
// on screen — it has access, so it must never tell the user to "paste it in here".
// Everything is guarded (sample vs real vs empty); when there's truly nothing yet it
// says so honestly. Capped so the prompt stays small.
function ssAssistantContext(state, product) {
  const CAP = 1500;
  const desc = (state && state.workspace && state.workspace.productDescription || "").trim();
  const people = (state && Array.isArray(state.people)) ? state.people : [];
  const convos = (state && Array.isArray(state.conversations)) ? state.conversations : [];
  const insights = (state && Array.isArray(state.insights)) ? state.insights : [];
  const feedback = (state && Array.isArray(state.inproductFeedback)) ? state.inproductFeedback : [];

  // Genuinely no data yet → say so, so the model can be honest instead of evasive.
  if (!people.length && !convos.length && !insights.length && !feedback.length) {
    return "RECENT FEEDBACK ON " + (product || "THIS PRODUCT") + ": no feedback collected yet"
      + (desc ? " — product is: " + desc : "") + ". You have access to the dashboard; there's simply nothing in it so far.";
  }

  const nameById = {};
  const channelById = {};
  people.forEach((p) => { if (p && p.id) { nameById[p.id] = p.name || p.id; channelById[p.id] = ssChannelMeta(ssChannelKey(p.surface)).label; } });

  const parts = ["RECENT FEEDBACK ON " + (product || "THIS PRODUCT")
    + " — spans OFF-PRODUCT 1:1 threads (email + Telegram) AND in-product signals (snippet)."
    + " Live from this dashboard — you DO have access; never ask the user to paste anything:"];
  if (desc) parts.push("Product: " + desc);

  if (people.length) {
    const notable = people.slice(0, 4).map((p) => {
      const tag = [p.segment, p.surface].filter(Boolean).join(" · ");
      return (p.name || "A partner") + (tag ? " (" + tag + ")" : "");
    }).join("; ");
    parts.push("Partners: " + people.length + " feedback partner" + (people.length === 1 ? "" : "s")
      + (notable ? " — incl. " + notable : "") + ".");
  }

  if (convos.length) {
    const lines = convos.slice(0, 5).map((c) => {
      const who = nameById[(c && c.userId)] || (c && c.userId) || "A user";
      const chan = channelById[(c && c.userId)] || "off-product";
      const msgs = (c && Array.isArray(c.messages)) ? c.messages : [];
      let lastUser = "";
      for (let i = msgs.length - 1; i >= 0; i--) {
        const mm = msgs[i];
        if (mm && mm.t === "user" && mm.text) { lastUser = mm.text.trim(); break; }
      }
      const topic = (c && c.title || "").trim();
      return "- " + who + " [" + chan + "]" + (topic ? " — " + topic : "") + (lastUser ? ": “" + lastUser + "”" : "");
    });
    parts.push("Off-product 1:1 conversations (" + convos.length + " total):\n" + lines.join("\n"));
  }

  if (feedback.length) {
    const lines = feedback.slice(0, 5).map((f) => {
      const label = ssInproductMeta(f && f.type).label;
      const who = ssInproductWho(state, f || {}).name;
      const note = (f && f.note || "").trim();
      return "- " + label + " · " + ssInproductValue(f || {}) + " (" + who + ")" + (note ? ": “" + note + "”" : "");
    });
    parts.push("In-product feedback (" + feedback.length + " signals from the snippet):\n" + lines.join("\n"));
  }

  if (insights.length) {
    const lines = insights.slice(0, 4).map((it) => {
      const metric = (it && it.metric) ? " [" + it.metric + "]" : "";
      const gist = (it && (it.detail || it.next) || "").trim();
      return "- " + ((it && it.title || "Theme").trim()) + metric + (gist ? " — " + gist : "");
    });
    parts.push("Top themes / insights:\n" + lines.join("\n"));
  }

  let out = parts.join("\n");
  if (out.length > CAP) out = out.slice(0, CAP - 1).replace(/\s+\S*$/, "") + "…";
  return out;
}

// Dashboard right-rail "Ask about your product" assistant. Same warm patterns as
// ObsSetupChat (sender-labeled flowing replies, live "typing…" indicator, outlined
// chips, minimize-to-bubble) but scoped to the dashboard: it answers about feedback,
// partners, minutes, signals and loops with canned demo answers (no API). Its open/
// closed state is lifted to ProductShell so the shell can inset its content beside it.
function ProductAssistant({ product, state, open, setOpen }) {
  const [input, setInput] = useStateSS("");
  const [msgs, setMsgs] = useStateSS([
    { from: "them", text: "Product AI assistant — I have context from every feedback loop Observant runs for " + product + ". Ask me what your users are saying, whose feedback to trust, or how to turn it into what to build next." },
    { from: "them", suggest: true, chips: ["Show me recent feedback", "Which users should I hear from?", "Summarize what users are saying", "What signals need attention?"] },
  ]);
  const bodyRef = useRefSS(null);
  useEffectSS(() => { if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight; }, [msgs, open]);

  // Swap the live "typing…" bubble for the reply.
  const swapTyping = (text) => setMsgs((m) => {
    const copy = m.slice();
    for (let i = copy.length - 1; i >= 0; i--) { if (copy[i].typing) { copy[i] = { from: "them", text: text }; return copy; } }
    copy.push({ from: "them", text: text });
    return copy;
  });
  // Real answers from the Codified-trained research brain; fall back to a canned line if unreachable.
  const respondTo = (question, history) => {
    const ctx = ssAssistantContext(state, product);
    setMsgs((m) => m.concat([{ from: "them", typing: true }]));
    fetch("/api/selfserve/assistant", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, product, context: ctx, history }),
    }).then((r) => r.json()).then((d) => swapTyping((d && d.reply) || answer(question))).catch(() => swapTyping(answer(question)));
  };

  const answer = (q) => {
    const s = q.toLowerCase();
    const partners = (state && state.people ? state.people.length : 0);
    const convos = (state && state.conversations ? state.conversations.length : 0);
    const insights = (state && state.insights ? state.insights.length : 0);
    if (/recent feedback|recent activity|what.?s new|latest/.test(s)) { const fb = (state && state.inproductFeedback ? state.inproductFeedback.length : 0); return "Across both channels: " + convos + " off-product 1:1 threads (email + Telegram) added new replies, and " + fb + " in-product signals came in through the snippet. The strongest thread is sharing — users trust the numbers but can't get a team-readable view out of the product. Want me to open those conversations?"; }
    if (/which user|who should|hear from|right user|talk to/.test(s)) return "Three of your " + partners + " feedback partners are worth a direct line right now: the two who churned signals are creeping on, plus one power user who keeps hitting the same edge in a core flow. Observant already has open loops with them — I can draft the next question.";
    if (/summar|saying|theme|trend|pattern/.test(s)) return "Across the loops, users keep returning to three themes: setup takes longer than they expect, the value of the core flow isn't obvious until they're deep in it, and they want clearer pricing. " + insights + " insights are drafted from these patterns — the onboarding one is the most cited.";
    if (/signal|attention|need attention|watch|risk|churn/.test(s)) return "Two signals need attention: a small cluster of partners went quiet after their first session (early drop-off), and a recurring confusion in the core flow that's showing up across personas. Neither is urgent yet, but both are trending — I'd open a loop on the drop-off first.";
    if (/minute|compensat|cost|spend|budget|pay/.test(s)) return "Your partners are compensated for the minutes they spend in 1:1s — it's bottom-up and opt-in, so spend tracks real engagement, not a fixed panel fee. Recent loops have been short and high-signal. I can pull the exact minutes per loop if you want.";
    if (/loop|question|ask|send/.test(s)) return "A loop is a question Observant carries to the right users on their continuous 1:1 line — it follows up on its own and brings the answers back as they land. You've run a few; the next good one is probably on that onboarding friction. Want me to draft it?";
    if (/persona|segment|who are/.test(s)) return "Observant is tracking your personas off the real conversations — power users, new arrivals, and the at-risk cluster. The at-risk group is the one giving the clearest signal right now. I can break any of them down.";
    return "Good question. I'd ground that in your loops and product memory — the clearest signal right now is onboarding friction and a couple of at-risk partners. Want me to pull the relevant conversations or draft a loop to learn more?";
  };

  const send = (text) => {
    const t = (text || input).trim();
    if (!t) return;
    setInput("");
    const history = msgs.filter((m) => !m.typing && m.text).map((m) => ({ role: m.from === "me" ? "user" : "assistant", content: m.text }));
    setMsgs((m) => m.concat([{ from: "me", text: t }]));
    respondTo(t, history);
  };

  if (!open) {
    return <button type="button" className="obs-chat-bubble" onClick={() => setOpen(true)} aria-label={"Open " + product + " product assistant"}><Icon name="chat" size={20} /></button>;
  }
  return (
    <aside className="obs-chat" aria-label={"Ask about " + product}>
      <header className="obs-chat-head">
        <span className="obs-chat-mark"><Icon name="spark" size={16} /></span>
        <div className="obs-chat-id"><b>Ask about {product}</b><span>Observant assistant</span></div>
        <button type="button" className="obs-chat-min" onClick={() => setOpen(false)} aria-label="Minimize assistant"><Icon name="x" size={15} /></button>
      </header>
      <div className="obs-chat-body" ref={bodyRef}>
        {msgs.map((m, i) => {
          const lead = m.from === "them" && (i === 0 || msgs[i - 1].from !== "them");
          return (
            <div key={i} className={"obs-chat-msg " + m.from + (m.emph ? " emph" : "")}>
              {lead && <span className="obs-chat-sender">Observant</span>}
              {m.suggest && <span className="obs-chat-suggest-label">Suggested</span>}
              {m.typing ? <p className="obs-chat-typing"><i></i><i></i><i></i></p> : (m.text ? <p>{m.text}</p> : null)}
              {!m.typing && m.chips && <div className="obs-chat-chips">{m.chips.map((c) => <button key={c} type="button" onClick={() => send(c)}>{c}</button>)}</div>}
            </div>
          );
        })}
      </div>
      <div className="obs-chat-input">
        <input value={input} placeholder="Ask about your product…" onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
        <button type="button" onClick={() => send()} aria-label="Send"><Icon name="arrow" size={16} /></button>
      </div>
    </aside>
  );
}

// Per-surface "Active" status — the unit the Set-up hub tracks. In-product is
// active once the snippet is live (setup.connected); off-product once the program
// is set up and a magic link has been generated (setup.offproductActive).
function ssSurfaceActive(setup) {
  return {
    inproduct: !!(setup && (setup.inproductActive || setup.connected)),
    offproduct: !!(setup && setup.offproductActive),
  };
}

// The two hub cards — each surface as an independent track with its own status +
// action. Shared by onboarding (ActivationScreen) and the dashboard (SourcesView).
const SS_HUB_CARDS = [
  {
    key: "offproduct", title: "Off-product feedback",
    desc: <>Users choose whether they want to be contacted via <b>Email</b> or <b>Telegram</b>. Invite some or all of your users; those who opt in are compensated for their participating minutes.</>,
  },
  {
    key: "inproduct", title: "In-product feedback",
    desc: "Install a code snippet and Observant runs a few key feedback loops right inside your app — AI output evals, exit surveys, and CSAT. The most minimal viable loop for your product.",
  },
];

function SetupHubCards({ setup, onPick }) {
  const active = ssSurfaceActive(setup);
  return (
    <div className="ss-hub-grid">
      {SS_HUB_CARDS.map((c) => {
        const on = active[c.key];
        return (
          <article className={"ss-hub-card" + (on ? " on" : "")} key={c.key}>
            <div className="ss-hub-card-head">
              <b>{c.title}</b>
            </div>
            <p>{c.desc}</p>
            <div className="ss-hub-card-foot">
              <span className={"ss-hub-status" + (on ? " on" : "")}>
                {on ? <><Icon name="check" size={13} sw={2.8} /> Active</> : <>○ Not set up</>}
              </span>
              <Btn variant={on ? "ghost" : "primary"} size="sm" onClick={() => onPick(c.key)}>
                {on ? "Manage" : <>Set up <Icon name="arrow" size={15} /></>}
              </Btn>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// A light, neutral nudge toward the surface you haven't set up yet — never pushy.
function HubNudge({ active }) {
  if (active.inproduct && active.offproduct) {
    return <p className="ss-hub-nudge done"><Icon name="check" size={13} sw={2.6} /> Both surfaces are live — Observant is listening everywhere your users are.</p>;
  }
  const live = active.offproduct ? "Off-product" : "In-product";
  const other = active.offproduct ? "in-product loops" : "an off-product panel";
  return <p className="ss-hub-nudge"><Icon name="spark" size={13} /> {live} feedback is live — add {other} too whenever you're ready. No rush.</p>;
}

// In-product sub-flow: re-hosts the existing SnippetSetup install flow, with its own
// "← Back to setup" affordance. Marks the surface Active once the snippet is live.
function InProductTrack({ product, setup, patchSetup, onBackToHub, backLabel }) {
  useEffectSS(() => {
    if (setup.connected && !setup.inproductActive) {
      patchSetup({ inproductActive: true, inproduct: true, surfaces: { ...setup.surfaces, product: true } });
    }
  }, [setup.connected]);
  return (
    <div className="ss-track">
      <div className="ss-track-head">
        <button type="button" className="ss-linklike" onClick={onBackToHub}><Icon name="back" size={14} /> {backLabel || "Back to setup"}</button>
        <span className="ss-track-steps">In-product · Connect → authorize → PR → live</span>
      </div>
      <SnippetSetup product={product} setup={setup} patchSetup={patchSetup} step={1} />
      {setup.connected && (
        <div className="ss-track-done">
          <p><Icon name="check" size={15} sw={2.4} /> In-product feedback is live in {product}.</p>
          <Btn variant="primary" onClick={onBackToHub}>Back to setup <Icon name="arrow" size={15} /></Btn>
        </div>
      )}
    </div>
  );
}

// Off-product sub-flow: re-hosts the existing program (compensation + invitation)
// and preview (review + magic link) screens as a focused two-step track. Marks the
// surface Active once the magic link is generated.
function OffProductTrack({ state, patchState, product, setup, patchSetup, onBackToHub, backLabel }) {
  const [step, setStep] = useStateSS(setup.offproductActive ? 1 : 0); // 0 program · 1 preview
  const [linkCopied, setLinkCopied] = useStateSS(false);
  const [inviteCopied, setInviteCopied] = useStateSS(false);
  const [linkGenerated, setLinkGenerated] = useStateSS(!!setup.offproductActive);
  const [sendPreviewOpen, setSendPreviewOpen] = useStateSS(false);
  const [previewEmail, setPreviewEmail] = useStateSS(state.workspace.email || "");
  const [previewSentTo, setPreviewSentTo] = useStateSS("");
  const [previewSending, setPreviewSending] = useStateSS(false);
  const [previewErr, setPreviewErr] = useStateSS("");

  const surfaceSummary = SS_FAST_CHANNELS.map(ssSurfaceLabel).join(" · ");
  // The link is real wherever the app is served (localhost dev server and the
  // Vercel deploy both rewrite /join/:slug) — observant.link later just points here.
  const productSlug = product.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const magicLink = window.location.host + "/join/" + productSlug;
  const joinUrl = "/join/" + productSlug + "?route=offproduct";
  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.origin + "/join/" + productSlug).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };
  const channelPhrase = surfaceSummary ? surfaceSummary.replace(" · ", " or ") : "email or Telegram";
  const inviteText = [
    "Subject: You're invited to help shape " + product,
    "",
    "Hi there,",
    "",
    "We're inviting a small group of our most engaged users into our feedback partner program — a direct line to the team building " + product + ".",
    "",
    "From time to time you'll have a quick one-on-one: a couple of messages, sometimes a short voice chat. You choose where it reaches you — " + channelPhrase + " — and you earn rewards for every minute you participate, tracked automatically.",
    "",
    "Long-time partners often get a little extra, too — event invites, early access, time with the team.",
    "",
    "Join here: [your magic link — generated in the last step]",
    "",
    "You can opt out anytime, in one tap.",
    "",
    "— The " + product + " team",
  ].join("\n");
  const [inviteDraft, setInviteDraft] = useStateSS(inviteText);
  useEffectSS(() => { setInviteDraft(inviteText); }, [product]);
  async function sendInvitePreview() {
    if (!previewEmail.includes("@") || previewSending) return;
    setPreviewSending(true); setPreviewErr("");
    try {
      const r = await ssPostJson("/api/selfserve/send-invite", { toEmail: previewEmail, product, body: inviteDraft, joinUrl: window.location.origin + joinUrl });
      if (r && r.ok) { setPreviewSentTo(previewEmail); setSendPreviewOpen(false); }
      else if (r && r.needKey) setPreviewErr("No email provider connected yet.");
      else setPreviewErr((r && r.error) || "Couldn't send — try again.");
    } catch (e) { setPreviewErr(String(e.message || e)); }
    setPreviewSending(false);
  }
  const copyInvite = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(inviteDraft).catch(() => {});
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 1500);
  };
  const generateLink = () => {
    setLinkGenerated(true);
    patchSetup({ offproductActive: true, offproduct: true });
  };

  return (
    <div className="ss-track">
      <div className="ss-track-head">
        <button type="button" className="ss-linklike" onClick={onBackToHub}><Icon name="back" size={14} /> {backLabel || "Back to setup"}</button>
        <ol className="ss-loop-steps ss-track-steps-ol">
          {["Compensation & invite", "Preview & magic link"].map((s, i) => (
            <li key={s} className={"ss-loop-step" + (i < step ? " done" : i === step ? " on" : "") + ((i === 0 || step > 0 || linkGenerated) ? " nav" : "")} onClick={() => { if (i === 0 || step > 0 || linkGenerated) setStep(i); }}>
              <span className="ss-loop-dot">{i < step ? <Icon name="check" size={12} sw={3} /> : i + 1}</span>
              <span className="ss-loop-label">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <section className="ss-panel">
          <PanelTitle k="Off-product" title="Set up the feedback program" />
          <p className="ss-step-lead">A <b>feedback program</b> is a small panel of your users who opt in to hear from you. You invite a group once; the ones who join become your <b>feedback partners</b>, and Observant runs the 1:1 conversations with them over time — so you always have people to learn from. Set two things here — how partners are <b>compensated</b> and the <b>invitation</b> they'll receive — and change either anytime.</p>
          <div className="ss-program-block">
            <h3><span className="ss-substep">1</span> Compensation</h3>
            <p>People earn by the <b>minutes they participate</b> — every reply, voice chat, and call counts, tracked and audited automatically. You pay Observant; we pay your participants, and they redeem as they go.</p>

            <div className="ss-comp-grid">
              <article className="ss-comp-card on">
                <em className="ss-comp-tag active">Active · managed by Observant</em>
                <b>Cash</b>
                <p>Set your rate — we handle payouts and redemption.</p>
                <div className="ss-comp-rate">
                  <span className="ss-rate-input">$ <input className="input" type="number" min="0.25" step="0.25" value={setup.rate} onChange={(e) => patchSetup({ rate: Math.max(0.25, Number(e.target.value) || 2) })} /> / min</span>
                  <b>30 minutes ≈ ${Math.round(30 * (setup.rate || 2))}</b>
                </div>
                <small>Industry guideline: $2 per minute.</small>
              </article>

              <article className={"ss-comp-card ss-comp-pick" + (setup.perks ? " on" : "")} role="button" tabIndex={0}
                onClick={() => patchSetup({ perks: !setup.perks })}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); patchSetup({ perks: !setup.perks }); } }}>
                <em className="ss-comp-tag rec">Recommended add-on</em>
                <b>Additional perks {setup.perks ? <Icon name="check" size={14} sw={2.6} /> : null}</b>
                <p>Most companies invite long-term active partners to extras — in-person events, conferences, time with the founding team. Up to you, and a great motivator — worth mentioning in your invitation.</p>
                <small>{setup.perks ? "✓ Included — mention this in your invitation" : "Tap to include"}</small>
              </article>

              <article className="ss-comp-card">
                <em className="ss-comp-tag coming">Coming</em>
                <b>Your product credits</b>
                <p>We're building a universal redemption flow so you can reward partners in your own product credits. Until then, cash is the default.</p>
              </article>
            </div>
          </div>
          <div className="ss-program-block">
            <h3><span className="ss-substep">2</span> Your invitation</h3>
            <p><b>You send the invite yourself</b>, under your own brand — so your users are never confused about who's reaching out. People opt in as a <b>feedback partner</b>, and can opt out anytime, in one tap. Here's the invitation, ready to send — make it yours if you like.</p>
            <div className="ss-invite-copyblock">
              <textarea className="ss-invite-edit" value={inviteDraft} rows={14} onChange={(e) => setInviteDraft(e.target.value)} />
              <button type="button" className="ss-magiclink-copy" onClick={copyInvite}>{inviteCopied ? "Copied ✓" : "Copy text"}</button>
            </div>
          </div>
          <div className="ss-golive-actions">
            <Btn variant="primary" size="lg" onClick={() => setStep(1)}>Continue to preview <Icon name="arrow" size={16} /></Btn>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="ss-panel">
          <PanelTitle k="Off-product" title="Preview" status="Last step" />
          <p className="ss-step-lead">Everything you decided, in one place. When it looks right, generate your magic link.</p>
          <div className="ss-review">
            <ReviewRowSS k="Product" v={product} sub={state.workspace.productDescription} />
            <ReviewRowSS k="Feedback surface" v={"Off-product — " + surfaceSummary} sub="Your users pick one at opt-in." />
            <ReviewRowSS
              k="Compensation"
              v="Cash — managed by Observant"
              sub={<>
                <span className="ss-review-tier">${setup.rate || 2} per participated minute · 30 min ≈ ${Math.round(30 * (setup.rate || 2))} · redeem as you go</span>
                <span className="ss-review-tier">Plus any perks you invite long-time partners to — events, early access, founder time.</span>
              </>}
            />
            <ReviewRowSS k="Research questions" v={state.workspace.learningGoal || "None yet — that's fine"} sub="Participants never see these. Update them or feed in new questions anytime — Observant keeps weaving them into the 1:1s." />
            <ReviewRowSS
              k="Invitation to users"
              v={previewSentTo
                ? <span className="ss-sent-note"><Icon name="check" size={14} sw={2.4} /> Preview sent to {previewSentTo} <button type="button" className="ss-doc-link ss-row-cta" onClick={() => { setPreviewSentTo(""); setSendPreviewOpen(true); }}>Send again</button></span>
                : <button type="button" className="ss-doc-link ss-row-cta" onClick={() => setSendPreviewOpen((v) => !v)}>Preview the invitation email →</button>}
              sub="The text you wrote in the previous step — we'll email you a preview, exactly as your users receive it."
            />
          </div>
          {sendPreviewOpen && !previewSentTo && (
            <div className="ss-sendpreview">
              <Field label="What's your email address?">
                <input className="input" type="email" value={previewEmail} placeholder="you@company.com" onChange={(e) => setPreviewEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && previewEmail.includes("@")) sendInvitePreview(); }} />
              </Field>
              <Btn variant="primary" size="sm" disabled={!previewEmail.includes("@") || previewSending} onClick={sendInvitePreview}>{previewSending ? "Sending…" : "Send me the preview"}</Btn>
              {previewErr && <p style={{ color: "#b4291f", fontSize: ".82rem", marginTop: 6 }}>{previewErr}</p>}
            </div>
          )}

          <div className="ss-program-block">
            <h3>Your magic link</h3>
            {!linkGenerated ? (
              <>
                <p>The magic link is an invitation to join your feedback program — it's where users read about the details and rewards, and decide if they want to opt in. Once they opt in, they choose their preferred way of being contacted — and you can preview the whole experience once you generate your link.</p>
                <div className="ss-golive-actions">
                  <Btn variant="primary" size="lg" onClick={generateLink}><Icon name="spark" size={16} /> Generate my magic link</Btn>
                </div>
              </>
            ) : (
              <>
                <p>Live and ready — drop it into your invitation where the placeholder sits, and send. Replies start flowing as people opt in, and <b>you're only charged by the responses you gather</b>.</p>
                <div className="ss-magiclink">
                  <a className="ss-magiclink-open" href={joinUrl} target="_blank" rel="noreferrer"><code>{magicLink}</code></a>
                  <button type="button" className="ss-magiclink-copy" onClick={copyLink}>{linkCopied ? "Copied ✓" : "Copy link"}</button>
                </div>
                <div className="ss-track-done">
                  <p><Icon name="check" size={15} sw={2.4} /> Off-product feedback is set up.</p>
                  <Btn variant="primary" onClick={onBackToHub}>Back to setup <Icon name="arrow" size={15} /></Btn>
                </div>
              </>
            )}
          </div>

          <details className="ss-program-block ss-suggest">
            <summary className="ss-suggest-summary"><Icon name="spark" size={14} /> Wonder who to send it to?</summary>
            <div className="ss-suggest-body">
              <p>Here are a few ways to think about your first batch — who you invite to your feedback partner program:</p>
              <div className="ss-advice-block">
                {SS_AUDIENCE_OPTIONS.map((opt) => (
                  <div className="ss-advice-item" key={opt.id}>
                    <span className="ss-advice-ic"><Icon name="users" size={15} /></span>
                    <div><b>{opt.label}{opt.tag && <em className="ss-advice-tag">{opt.tag}</em>}</b><p>{opt.text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}

// Onboarding host for the Set-up hub. After Product/Context, the user lands here and
// sets up each surface as an independent track — now, or later from the dashboard.
// Compact SaaS account control for the onboarding top bar. Collapses the old loose
// right cluster (email · workspace · Start over · Sign out) into one avatar button that
// opens a dropdown. Closes on outside-click / Esc. Degrades gracefully w/o authEmail.
function AccountMenu({ authEmail, product, resetWorkspace, onSignOut }) {
  const [open, setOpen] = useStateSS(false);
  const ref = useRefSS(null);

  useEffectSS(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  // No signed-in user: nothing to attach a session to — just expose Start over.
  if (!authEmail) {
    return <div className="ss-acct"><button type="button" className="ss-acct-plain" onClick={resetWorkspace}>Start over</button></div>;
  }

  const initial = authEmail.trim().charAt(0).toUpperCase() || "?";
  const act = (fn) => { setOpen(false); fn && fn(); };

  return (
    <div className="ss-acct" ref={ref}>
      <button type="button" className="ss-acct-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="ss-acct-ava">{initial}</span>
        <svg className={"ss-acct-chev" + (open ? " is-open" : "")} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="ss-acct-menu" role="menu">
          <div className="ss-acct-head">
            <span className="ss-acct-email" title={authEmail}>{authEmail}</span>
            {product && <span className="ss-acct-ws">{product}</span>}
          </div>
          <button type="button" className="ss-acct-item" role="menuitem" onClick={() => act(resetWorkspace)}>Start over</button>
          <button type="button" className="ss-acct-item" role="menuitem" onClick={() => act(onSignOut)}>Sign out</button>
        </div>
      )}
    </div>
  );
}

function ActivationScreen({ state, patchState, onLaunch, resetWorkspace, onBackToProduct, authEmail, onSignOut }) {
  const product = SelfServeData.productName(state.workspace);
  const setup = state.setup;
  const patchSetup = (patch) => patchState((current) => ({ ...current, setup: { ...current.setup, ...patch } }));
  // Returning from the GitHub App install lands straight in the in-product track.
  const [view, setView] = useStateSS(SS_GH_RETURN.installed ? "inproduct" : "hub"); // "hub" | "inproduct" | "offproduct"
  const active = ssSurfaceActive(setup);
  const anyActive = active.inproduct || active.offproduct;
  const phase = view === "hub" && anyActive ? "done" : "setup";

  return (
    <div className="ss-activation">
      <header className="ss-activation-top">
        <Wordmark size="1.3rem" />
        <nav className="ss-activation-nav"><OnboardingBar phase={phase} /></nav>
        <div className="ss-top-right">
          <AccountMenu authEmail={authEmail} product={product} resetWorkspace={resetWorkspace} onSignOut={onSignOut} />
        </div>
      </header>

      <ObsSetupChat product={product} context={(state.workspace && state.workspace.productDescription) || ""} curId={view === "inproduct" ? "install" : "surface"} />

      <div className="ss-activation-wrap">
        <main className="ss-activation-main">
          {view === "hub" && (
            <section className="ss-panel">
              <PanelTitle k="Set up" title="Set up your feedback" status={anyActive ? "1 active" : ""} />
              <p className="ss-step-lead"><b>Start with one — add the other anytime.</b> Each feedback surface sets up on its own track. You can come back to add or manage either one whenever you like, from <b>Manage setup</b> inside the Off-product and In-product sections of your dashboard.</p>
              <SetupHubCards setup={setup} onPick={setView} />
              {anyActive && <HubNudge active={active} />}
              <div className="ss-hub-foot">
                <Btn variant="primary" size="lg" disabled={!anyActive} onClick={onLaunch}>Go to dashboard <Icon name="arrow" size={16} /></Btn>
                {!anyActive
                  ? <span className="ss-hub-hint">Set up at least one surface to continue.</span>
                  : (onBackToProduct ? <button type="button" className="ss-linklike" onClick={onBackToProduct}>← Edit product</button> : null)}
              </div>
            </section>
          )}
          {view === "inproduct" && <InProductTrack product={product} setup={setup} patchSetup={patchSetup} onBackToHub={() => setView("hub")} />}
          {view === "offproduct" && <OffProductTrack state={state} patchState={patchState} product={product} setup={setup} patchSetup={patchSetup} onBackToHub={() => setView("hub")} />}
        </main>
      </div>
    </div>
  );
}

// Dashboard host for the SAME hub — the "come back later" mechanism. A surface skipped
// in onboarding shows "Set up →" here, and setting it up launches the identical sub-flow.
function SourcesView({ state, patchState }) {
  const product = SelfServeData.productName(state.workspace);
  const setup = state.setup;
  const patchSetup = (patch) => patchState((current) => ({ ...current, setup: { ...current.setup, ...patch } }));
  const [view, setView] = useStateSS(SS_GH_RETURN.installed ? "inproduct" : "hub");
  const active = ssSurfaceActive(setup);
  const anyActive = active.inproduct || active.offproduct;
  const count = (active.inproduct ? 1 : 0) + (active.offproduct ? 1 : 0);

  return (
    <div className="ss-page-stack">
      {view === "hub" && (
        <section className="ss-panel">
          <PanelTitle k="Setup" title="Set up your feedback sources" status={anyActive ? count + " active" : "None yet"} />
          <p className="ss-step-lead">Each feedback surface is its own track. Set up the one you skipped here — once live, manage it anytime from <b>Manage setup</b> inside the Off-product or In-product section.</p>
          <SetupHubCards setup={setup} onPick={setView} />
          {anyActive && <HubNudge active={active} />}
        </section>
      )}
      {view === "inproduct" && <InProductTrack product={product} setup={setup} patchSetup={patchSetup} onBackToHub={() => setView("hub")} />}
      {view === "offproduct" && <OffProductTrack state={state} patchState={patchState} product={product} setup={setup} patchSetup={patchSetup} onBackToHub={() => setView("hub")} />}
    </div>
  );
}


// ── Faithful Novus install (ported from session branch): Connect→Authorize→Scan→PR→live ──
const SS_CONNECT_REPO = { owner: "your-org", name: "web-app", branch: "main", stack: "React + Vite + TypeScript" };

const SS_SCAN_STEPS = [
  { tool: "Bash", cmd: "git clone --depth 1 your-org/web-app", out: "Cloned main @ 4f9c2a1 · 318 files", concl: "Repo reachable. Read-only clone." },
  { tool: "Read", cmd: "package.json · vite.config.ts", out: "react@18 · vite@5 · typescript@5 · stripe@14", concl: "React + Vite + TypeScript SPA. Stripe billing present." },
  { tool: "Grep", cmd: "grep -r 'posthog|amplitude|pendo|segment' src/", out: "0 matches", concl: "No product analytics wired — behavior is currently invisible." },
  { tool: "Read", cmd: "src/routes/* · src/pages/Pricing.tsx", out: "12 routes · 3 plan tiers (Free / Team / Business)", concl: "B2B app with self-serve upgrade. Pricing is a key decision surface." },
  { tool: "Read", cmd: "src/onboarding/* · src/dashboard/*", out: "FirstRun.tsx · ExportButton.tsx · ShareLink (none)", concl: "Onboarding + export are core flows; no share-link path exists." },
];

// What the scan submits — the product map, plus the behavioral moments where a
// 1:1 would pay off most (these become the auto-triggers once the snippet is live).
const SS_SCAN_DETECTED = [
  { k: "Platform", v: "React + Vite SPA · Stripe billing" },
  { k: "Key flows", v: "Onboarding · Reporting / export · Upgrade" },
  { k: "Personas", v: "Power user · New user · Upgrade evaluator" },
  { k: "Analytics", v: "None found — Observant adds its own feedback snippet" },
];
const SS_SCAN_TRIGGERS = [
  { moment: "Abandoned upgrade", detail: "Left the upgrade page after the price reveal", why: "Ask what tipped them off — price, or team-visibility doubt." },
  { moment: "Repeat export", detail: "3rd CSV export in a week", why: "A power user working around a missing share flow — ask what they're really doing with it." },
  { moment: "Onboarding stall", detail: "No report opened in week 1", why: "Catch the new-user confusion before it becomes churn." },
];

// The single PR Observant opens to go live — snippet + init, plus an honest note
// of what it could NOT wire (the Novus credibility move).
function ssInstallPR(product) {
  return {
    number: 1,
    title: "Install Observant #1",
    branch: "observant/install",
    files: [
      { path: "index.html", add: ['<script src="https://cdn.observant.dev/o.js" data-app="obs_live_8fa2"></script>'] },
      { path: "src/main.tsx", add: ['import { observant } from "@observant/web";', 'observant.init({ app: "obs_live_8fa2" });'] },
      { path: "src/observant.d.ts", add: ['declare module "@observant/web";'] },
    ],
    body: "Adds the Observant snippet + init so the product can start its own 1:1s at the moments above. One file each — no behavior change to your app.",
    caveat: "Did NOT call observant.identify() — your auth lives in a Supabase callback I can't safely edit. When you're ready, call observant.identify(user.id) in src/auth/onSignIn.ts so conversations attach to the right person.",
  };
}

// Calm, human messages for the few ways opening the install PR can fall short.
const SS_PR_FAIL_MSG = {
  NOT_INSTALLED: "We didn't see the GitHub App on a repo yet — install it and grant access to one repo, then try again.",
  NO_REPO: "Couldn't open the PR yet — make sure you granted Observant access to a repo on GitHub.",
  NO_TOKEN: "Couldn't reach GitHub on your behalf just now — try again in a moment.",
  NO_BASE: "Couldn't read that repo's default branch — pick a repo with code in it, then try again.",
  NO_GH: "GitHub isn't fully configured on this server yet — paste the snippet yourself for now.",
};

function SnippetSetup({ product, setup, patchSetup, step }) {
  const [copied, setCopied] = useStateSS(false);
  // Real GitHub flow: start (Sign in w/ GitHub) → authorize (the explainer) → leave for
  //   github.com/apps/observanthq install → return to /setup?gh=installed → opening (POST
  //   /api/github/install-pr) → live (links to the real PR).  Fallback: paste → listening → live.
  const ghReturning = SS_GH_RETURN.installed && !setup.connected;
  const [phase, setPhase] = useStateSS(setup.connected ? "live" : (ghReturning ? "opening" : "start"));
  const [testSent, setTestSent] = useStateSS(false);
  const [prUrl, setPrUrl] = useStateSS(setup.installPrUrl || "");
  const [prErr, setPrErr] = useStateSS("");
  const prFiredRef = useRefSS(false);
  const connected = phase === "live" || !!setup.connected;
  const snippet = '<script src="https://cdn.observant.dev/o.js" data-key="obs_live_8fa2"></script>';
  const copy = () => { try { if (navigator.clipboard) navigator.clipboard.writeText(snippet); } catch (e) {} setCopied(true); setTimeout(() => setCopied(false), 1500); };
  // Step 1 — hand off to GitHub's own install screen (server 302s to the App).
  const connectGithub = () => { window.location.href = "/api/github/install"; };

  // Step 2 — once installed, open the ONE real PR via the backend.
  const runInstallPr = async () => {
    const installationId = setup.githubInstallationId || SS_GH_RETURN.installationId || "";
    setPrErr("");
    try {
      const resp = await fetch("/api/github/install-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installationId }),
      });
      const data = await resp.json().catch(() => ({}));
      if (data && data.ok) {
        setPrUrl(data.prUrl || "");
        patchSetup({ connected: true, inproductActive: true, inproduct: true, installPrUrl: data.prUrl || "", githubInstallationId: installationId });
        setPhase("live");
      } else {
        setPrErr((data && data.code) || "FAILED");
        setPhase("prfail");
      }
    } catch (e) {
      setPrErr("NETWORK");
      setPhase("prfail");
    }
  };

  // The "opening" spinner is the single driver — fire the call exactly once each
  // time we enter it (guard the ref; reset on leave so retry can re-fire).
  useEffectSS(() => {
    if (phase === "opening") {
      if (!prFiredRef.current) { prFiredRef.current = true; runInstallPr(); }
    } else {
      prFiredRef.current = false;
    }
  }, [phase]);

  const added = () => { setPhase("listening"); setTimeout(() => { setPhase("live"); patchSetup({ connected: true }); }, 2000); };
  const liveMoments = [
    { k: "Unsolicited “give feedback”", d: "A quiet, always-available way for any user to volunteer a thought." },
    { k: "AI / output evals", d: "A one-tap rating on each AI output — tied to that exact output." },
    { k: "Exit survey", d: "One question on the way out — leave, downgrade, or cancel." },
    { k: "CSAT", d: "A periodic satisfaction tap, throttled so it's rare." },
  ];
  return (
    <section className="ss-panel">
      <PanelTitle k={"Step " + (step || 4)} title={connected ? "Observant is live" : "Install Observant"} status={connected ? "Watching ✓" : "One PR"} />

      {phase === "start" && (
        <>
          <p className="ss-step-lead">Sign in with GitHub and pick one repo. Observant opens a <b>single pull request</b> that adds the web SDK — review it like any PR and merge, or paste the line yourself.</p>
          <div className="ss-golive-actions"><Btn variant="primary" size="lg" onClick={() => setPhase("authorize")}><Icon name="grid" size={16} /> Sign in with GitHub</Btn></div>
          <button type="button" className="ss-fork-skip" onClick={() => setPhase("paste")}>Rather paste the snippet yourself? →</button>
        </>
      )}

      {phase === "authorize" && (
        <div className="ss-ghauth">
          <div className="ss-ghauth-head"><span className="ss-ghauth-mark"><Icon name="grid" size={16} /></span> <b>Install Observant on GitHub</b></div>
          <p className="ss-step-lead">Pick the repository to add the SDK to — Observant only ever touches this one repo.</p>
          <div className="ss-repo-row"><Icon name="grid" size={15} /><code>{SS_CONNECT_REPO.owner}/{SS_CONNECT_REPO.name}</code><span className="ss-repo-branch">{SS_CONNECT_REPO.branch}</span></div>
          <ul className="ss-ghauth-perms">
            <li><Icon name="check" size={13} sw={2.6} /> <b>Open one pull request</b> <span>— the install PR you review and merge</span></li>
            <li><Icon name="check" size={13} sw={2.6} /> <b>Scoped to this one repo</b> <span>— it only opens the install PR</span></li>
          </ul>
          <div className="ss-golive-actions"><Btn variant="primary" size="lg" onClick={connectGithub}><Icon name="check" size={16} /> Install &amp; authorize on GitHub</Btn></div>
          <small className="ss-snippet-note">This is GitHub's own install screen — you choose the repo, and can revoke anytime.</small>
        </div>
      )}

      {phase === "opening" && (
        <div className="ss-snippet-listen"><span className="ss-snippet-spin" /> GitHub connected — opening your install PR on {product}…</div>
      )}

      {phase === "prfail" && (
        <div className="ss-pr-fail">
          <p className="ss-pr-fail-msg"><Icon name="x" size={15} sw={2.4} /> {SS_PR_FAIL_MSG[prErr] || "Couldn't open the PR yet — make sure you granted Observant access to a repo, then try again."}</p>
          <div className="ss-golive-actions">
            <Btn variant="primary" size="lg" onClick={() => setPhase("opening")}><Icon name="arrow" size={16} /> Try again</Btn>
            <button type="button" className="ss-fork-skip" onClick={() => setPhase("paste")}>Rather paste the snippet yourself? →</button>
          </div>
        </div>
      )}

      {phase === "paste" && (
        <>
          <p className="ss-step-lead">Add one line to your app — nothing else to configure.</p>
          <div className="ss-snippet"><code>{snippet}</code><button type="button" className="ss-snippet-copy" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button></div>
          <small className="ss-snippet-note">Drop it before <code>&lt;/body&gt;</code> (or your framework's root). <b>Only the feedback surface is exposed — never your codebase</b> · hashed identity, no new PII · bring your own LLM key.</small>
          <div className="ss-golive-actions"><Btn variant="primary" size="lg" onClick={added}><Icon name="check" size={16} /> I've added it</Btn></div>
        </>
      )}

      {phase === "listening" && (
        <div className="ss-snippet-listen"><span className="ss-snippet-spin" /> Listening for the first signal from {product}…</div>
      )}

      {connected && (
        <>
          <div className="ss-snippet-live"><span className="ss-snippet-dot" /> <b>Live in {product}.</b> Observant is now running your key feedback loops:</div>
          {prUrl && (
            <div className="ss-pr-link"><a href={prUrl} target="_blank" rel="noreferrer"><Icon name="grid" size={14} /> View the install PR <Icon name="arrow" size={14} /></a><span>Merge it on GitHub to ship the snippet.</span></div>
          )}
          <div className="ss-moments">
            {liveMoments.map((m) => (
              <div className="ss-moment" key={m.k}><Icon name="spark" size={14} /><div><b>{m.k}</b><span>{m.d}</span></div></div>
            ))}
          </div>

          <div className="ss-feelit">
            {!testSent ? (
              <Btn variant="ghost" onClick={() => setTestSent(true)}><Icon name="spark" size={14} /> Send yourself a test — see exactly what your users see</Btn>
            ) : (
              <div className="ss-pulse-preview">
                <span className="ss-pulse-preview-tag">What your user sees</span>
                <div className="ss-pulse-bubble">
                  <p>Quick one — did that output do what you needed?</p>
                  <div className="ss-pulse-row"><span className="ss-pulse-tap">👍</span><span className="ss-pulse-tap">👎</span><span className="ss-pulse-input">a few words (optional)</span></div>
                  <span className="ss-pulse-what">what is this?</span>
                </div>
                <small className="ss-pulse-disclosure">The "what is this?" link says: <i>"This product is learning from how you use it so it can improve — your answer helps, you can ignore it."</i> One tap, dismissible, no account.</small>
              </div>
            )}
          </div>

          <small className="ss-snippet-foot">Baseline gives you the score, never the why — and it only reaches users still active. For the why (or to reach the churned and never-converted), add <b>customized feedback loops</b>.</small>
        </>
      )}
    </section>
  );
}

function ProUpsell() {
  return (
    <section className="ss-pro-upsell">
      <div className="ss-pro-head">
        <span className="ss-pro-badge">Pro</span>
        <b>Want people to provide feedback inside your app?</b>
        <p>This is a Pro feature — we'll walk you through some simple setup. It unlocks the following:</p>
      </div>
      <ul className="ss-pro-list">
        <li><b>In-product conversations</b><span>Observant lives inside your app and catches people at the exact moment of use — the richest surface. Your users can still connect by email or Telegram too.</span></li>
        <li><b>Enrich your analysis</b><span>Merge conversations with names, segments, and behavior data from your side — every insight gets sharper.</span></li>
        <li><b>Behavior triggers</b><span>Control exactly when a conversation starts: a churn signal, a third visit, an abandoned step.</span></li>
        <li><b>Background recruiting</b><span>We quietly bring the right people into your panel for you, continuously.</span></li>
      </ul>
      <div className="ss-pro-cta">
        <a className="btn btn-primary btn-sm" href={SS_BOOK_CALL_URL} target="_blank" rel="noreferrer">Book a call with us</a>
      </div>
    </section>
  );
}

function ReviewRowSS({ k, v, sub }) {
  return (
    <div className="ss-review-row">
      <span className="rk">{k}</span>
      <span className="rv">{v}{sub ? <em>{sub}</em> : null}</span>
    </div>
  );
}

function ProductShell({ state, patchState, copied, copyText, resetWorkspace }) {
  // "sources" = the first-run setup hub, reachable from Home / empty states but not in nav.
  const EXTRA_SECTIONS = { context: "Context", sources: "Feedback sources" }; // non-nav pages
  const rawSection = SS_SECTION_ALIAS[state.section] || state.section;
  const section = (SS_ALL_SECTIONS.some((item) => item.id === rawSection) || EXTRA_SECTIONS[rawSection]) ? rawSection : "home";
  const product = SelfServeData.productName(state.workspace);
  const patchSetup = (patch) => patchState((current) => ({ ...current, setup: { ...current.setup, ...patch } }));
  const firstLoopId = state.selectedLoopId || (state.loops[0] ? state.loops[0].id : "");
  const [slackConnected, setSlackConnected] = useStateSS(false);
  const [navStack, setNavStack] = useStateSS([]);
  const [assistantOpen, setAssistantOpen] = useStateSS(true);

  const navigate = ({ section: nextSection, offTab, conversationId, loopId, focusedTarget, pendingInsightQuestion }) => {
    // Resolve legacy ids (people/compose/learning/offproduct/inproduct + offTab) into a
    // concrete leaf section, so no call site ever lands on a dead id.
    const sec = ssResolveSection(nextSection, offTab) || state.section || "home";
    // remember where we are so any in-app jump is reversible
    setNavStack((st) => st.concat([{
      section: state.section, selectedConversationId: state.selectedConversationId,
      selectedLoopId: state.selectedLoopId, focusedTarget: state.focusedTarget,
    }]).slice(-25));
    patchState((current) => ({
      ...current,
      section: sec,
      selectedConversationId: conversationId || current.selectedConversationId,
      selectedLoopId: loopId || current.selectedLoopId,
      focusedTarget: focusedTarget || "",
      pendingInsightQuestion: pendingInsightQuestion !== undefined ? pendingInsightQuestion : current.pendingInsightQuestion,
    }));
    // Give the section its own URL so it's deep-linkable / back-forward navigable.
    ssPushSectionUrl(sec, false);
  };

  const goBack = () => {
    if (!navStack.length) return;
    const prev = navStack[navStack.length - 1];
    patchState((current) => ({
      ...current,
      section: prev.section || "home",
      selectedConversationId: prev.selectedConversationId,
      selectedLoopId: prev.selectedLoopId,
      focusedTarget: prev.focusedTarget || "",
    }));
    setNavStack((st) => st.slice(0, -1));
    ssPushSectionUrl(prev.section || "home", false);
  };

  // Keep the address bar in sync with the section (push = new history entry).
  const ssPushSectionUrl = (section, replace) => {
    if (!SS_VIEW) return;
    try {
      const url = ssSectionPath(section);
      if (!replace && url === window.location.pathname) return;
      const st = { section };
      if (replace) window.history.replaceState(st, "", url);
      else window.history.pushState(st, "", url);
    } catch (e) {}
  };

  // On first mount, adopt any deep-linked section from the URL; otherwise stamp the
  // current section into the URL so the address bar is shareable from the start.
  useEffectSS(() => {
    if (!SS_VIEW) return;
    const loc = ssParseLocation();
    if (loc) {
      patchState((current) => ({ ...current, section: loc.section }));
    } else {
      ssPushSectionUrl(section, true);
    }
    // Browser back/forward → sync the section from the URL.
    const onPop = () => {
      const at = ssParseLocation();
      if (!at) return;
      patchState((current) => ({ ...current, section: at.section, focusedTarget: "" }));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div className={"ss-shell" + (assistantOpen ? " ss-assistant-open" : "")}>
      <aside className="ss-sidebar">
        <button type="button" className="ss-sidebar-brand" onClick={() => navigate({ section: "home" })} aria-label="Go to Home">
          <Wordmark size="1.45rem" />
        </button>
        <nav className="ss-nav">
          {SS_NAV.map((entry, i) => entry.items ? (
            <div className="ss-nav-group" key={"grp-" + i}>
              <span className="ss-nav-group-label">{entry.group}</span>
              {entry.items.map((item) => (
                <button key={item.id} type="button" className={"ss-nav-sub" + (section === item.id ? " on" : "")} onClick={() => navigate({ section: item.id })}>
                  <Icon name={item.icon} size={16} />
                  <span>{item.label}</span>
                  {item.id === "partners" && state.people.length > 0 && <em>{state.people.length}</em>}
                </button>
              ))}
            </div>
          ) : (
            <button key={entry.id} type="button" className={section === entry.id ? "on" : ""} onClick={() => navigate({ section: entry.id })}>
              <Icon name={entry.icon} size={17} />
              <span>{entry.label}</span>
            </button>
          ))}
        </nav>
        <div className={"ss-slack-side" + (slackConnected ? " on" : "")}>
          {slackConnected ? (
            <div className="ss-slack-side-done"><Icon name="check" size={15} sw={2.4} /> <div><b>Slack connected</b><span>Ask straight from your channel — replies pipe back here.</span></div></div>
          ) : (
            <>
              <div className="ss-slack-side-copy"><b>Ask straight from Slack</b><span>Relay your team's questions from your channel — responses pipe back within the hour.</span></div>
              <button type="button" className="ss-slack-side-btn" onClick={() => setSlackConnected(true)}><Icon name="spark" size={14} /> Connect Slack</button>
            </>
          )}
        </div>
        <button type="button" className="ss-workspace-foot" onClick={() => navigate({ section: "settings", focusedTarget: "settings-workspace" })}>
          <span className="ws-logo">{SelfServeData.initials(product).slice(0, 1)}</span>
          <div>
            <b>{product}</b>
            <span>Learning mode on</span>
          </div>
        </button>
      </aside>

      <div className="ss-app-main">
        <header className="ss-topbar">
          <div className="ss-topbar-lead">
            {navStack.length > 0 && <button type="button" className="ss-back-btn" onClick={goBack}><Icon name="back" size={15} /> Back</button>}
            <div>
              <span className="ss-breadcrumb">{product}</span>
              <h1>{(() => { const it = SS_ALL_SECTIONS.find((s) => s.id === section); return (it && (it.title || it.label)) || EXTRA_SECTIONS[section] || "Home"; })()}</h1>
            </div>
          </div>
          <div className="ss-topbar-actions">
            <button type="button" className="ss-linklike" onClick={ssLogout} style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><Icon name="back" size={14} /> Log out</button>
          </div>
        </header>

        <main className="ss-app-content">
          {section === "home" && <HomeView state={state} patchState={patchState} navigate={navigate} />}
          {section === "partners" && (
            <div className="ss-page-stack ss-offproduct">
              <PeopleView state={state} patchState={patchState} navigate={navigate} onManage={() => navigate({ section: "offmanage" })} />
            </div>
          )}
          {section === "loops" && (
            <div className="ss-page-stack ss-offproduct">
              <AskPanel product={product} state={state} patchState={patchState} navigate={navigate} />
              <QuestionHistory state={state} navigate={navigate} />
            </div>
          )}
          {section === "threads" && (
            <div className="ss-page-stack ss-offproduct">
              <ConversationsCRM state={state} navigate={navigate} onManage={() => navigate({ section: "offmanage" })} />
            </div>
          )}
          {section === "offmanage" && (
            <div className="ss-page-stack ss-offproduct">
              <OffProductTrack state={state} patchState={patchState} product={product} setup={state.setup} patchSetup={patchSetup} onBackToHub={() => navigate({ section: "partners" })} backLabel="Back to partners" />
            </div>
          )}
          {section === "signals" && (
            <div className="ss-page-stack ss-inproduct-view">
              <InProductSignals state={state} navigate={navigate} onManage={() => navigate({ section: "inmanage" })} />
            </div>
          )}
          {section === "inmanage" && (
            <div className="ss-page-stack ss-inproduct-view">
              <InProductTrack product={product} setup={state.setup} patchSetup={patchSetup} onBackToHub={() => navigate({ section: "signals" })} backLabel="Back to signals" />
            </div>
          )}
          {section === "insights" && <InsightsView state={state} patchState={patchState} navigate={navigate} />}
          {section === "sources" && <SourcesView state={state} patchState={patchState} />}
          {section === "context" && <ContextView state={state} patchState={patchState} />}
          {section === "settings" && <SettingsViewSS state={state} patchState={patchState} resetWorkspace={resetWorkspace} />}
        </main>
      </div>

      <ProductAssistant product={product} state={state} open={assistantOpen} setOpen={setAssistantOpen} />
    </div>
  );
}

function HomeView({ state, patchState, navigate }) {
  const readiness = SelfServeData.readiness(state.setup);
  const product = SelfServeData.productName(state.workspace);
  const latestAnswer = (state.answers || []).find((a) => SelfServeData.answerIsReal(a));
  const activeConversationId = ssFirstActiveConversationId(state);
  const activePerson = ssPersonForConversation(state, state.conversations.find((item) => item.id === activeConversationId));
  const custom = ssWorkspaceIsCustom(state);

  // Clean, empty dashboard for a real new client — no fake Key Metrics. One
  // setup-aware next-action instead, so the first thing they see is the next move.
  const hasData = state.conversations.length || state.people.length || state.insights.length || state.loops.length;
  if (!hasData) {
    const surfaceActive = ssSurfaceActive(state.setup);
    const anySourceActive = surfaceActive.inproduct || surfaceActive.offproduct;
    return (
      <div className="ss-page-stack">
        <section className="ss-hero-status ss-hero-empty">
          <div>
            <span className="eyebrow no-rule">Always on</span>
            <h2>Welcome, {product}.</h2>
            <p>{anySourceActive
              ? "Your feedback source is live."
              : "Let's set up where your users give feedback — one source is enough to begin."}</p>
          </div>
        </section>

        <section className="ss-panel ss-empty-home">
          <PanelTitle k="Next" title={anySourceActive ? "Bring your users in" : "Get your first feedback"} status={anySourceActive ? "Source live" : "Start here"} />
          {anySourceActive ? (
            <>
              <p className="ss-empty-home-lead">Your source is set up. Invite your users so Observant can open its first conversations — or send yourself a test to see exactly what they'll get.</p>
              <div className="ss-panel-actions">
                <Btn variant="primary" onClick={() => navigate({ section: "sources" })}><Icon name="users" size={15} /> Invite your users <Icon name="arrow" size={15} /></Btn>
                <Btn variant="ghost" onClick={() => navigate({ section: "sources" })}><Icon name="spark" size={15} /> Send yourself a test</Btn>
              </div>
            </>
          ) : (
            <>
              <p className="ss-empty-home-lead">Pick where Observant talks to your users — inside your product, or over email and Telegram. It takes a minute.</p>
              <div className="ss-panel-actions">
                <Btn variant="primary" onClick={() => navigate({ section: "sources" })}><Icon name="relay" size={15} /> Set up a feedback source <Icon name="arrow" size={15} /></Btn>
              </div>
            </>
          )}
          <p className="ss-empty-home-quiet">No feedback yet — it'll appear here as users reply.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="ss-page-stack">
      <section className="ss-hero-status">
        <div>
          <span className="eyebrow no-rule">Always on</span>
          <h2>{custom && !state.loops.length ? "Your panel is live." : "Learning mode is on."}</h2>
          <p>{custom && !state.loops.length ? "Observant is opening one-on-one lines with the users who opted in for " + product + ". Ask them anything, anytime — it keeps learning automatically." : "Observant is keeping one-on-one lines open with your users and bringing what it learns back to " + product + " while you ship."}</p>
        </div>
        <div className="ss-hero-metrics">
          <Metric n={String(state.people.length)} l="feedback partners" onClick={() => navigate({ section: "offproduct", offTab: "partners" })} />
          <Metric n={String(state.conversations.length)} l="active 1:1 conversations" onClick={() => navigate({ section: "offproduct", offTab: "partners", conversationId: activeConversationId, focusedTarget: "person-" + (activePerson ? activePerson.id : activeConversationId) })} />
          <Metric n={String(readiness.connectedSurfaces)} l="channels open" onClick={() => navigate({ section: "offproduct", offTab: "manage" })} />
        </div>
      </section>

      <WeeklyDigest state={state} navigate={navigate} />

      {custom && !state.loops.length && (
        <section className="ss-panel ss-start-panel">
          <PanelTitle k="Next" title="Send a new loop" status="Ready" />
          <p>Your people are already on a continuous one-on-one line. Ask anything you're curious about and watch their answers and the insight arrive in stages.</p>
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={() => navigate({ section: "offproduct", offTab: "loops" })}><Icon name="spark" size={15} /> Send a new loop</Btn>
          </div>
        </section>
      )}

      {/* 1 — New insights: what Observant has learned, most recent first */}
      <section className="ss-panel">
        <PanelTitle k="Insights" title="New insights" status={state.insights.length ? state.insights.length + " fresh" : "Listening"} />
        {latestAnswer && (
          <LatestAnswerCard answer={latestAnswer} onClick={() => navigate({ section: "insights", focusedTarget: "ask-observant" })} />
        )}
        {state.insights.length ? (
          <div className="ss-home-insights">
            {state.insights.slice(0, 3).map((insight) => (
              <button type="button" className="ss-home-insight" key={insight.id} onClick={() => navigate({ section: "insights", focusedTarget: "insight-" + insight.id })}>
                <span className="ss-home-insight-metric">{insight.metric}</span>
                <b>{insight.title}</b>
                <span className="ss-home-insight-detail">{insight.detail}</span>
              </button>
            ))}
            <button type="button" className="ss-home-seeall" onClick={() => navigate({ section: "insights" })}>See all insights <Icon name="arrow" size={14} /></button>
          </div>
        ) : !latestAnswer ? <EmptyState title="No insights yet" text="Ask your panel a question and Observant drafts insights as patterns emerge across the 1:1s." /> : null}
      </section>

      {/* 2 — Recently opened chats (off-product qualitative pulse) */}
      <section className="ss-panel">
        <PanelTitle k="Off-product" title="Recently opened chats" status={state.conversations.length ? "Live" : "Quiet"} />
        {state.conversations.length ? <ConversationList state={state} compact navigate={navigate} /> : <EmptyState title="No lines yet" text="Ask a question and Observant opens 1:1 lines with your panel." />}
      </section>

      {/* 2b — In-product pulse (behavioral, at a glance) */}
      <HomeInProductPulse state={state} navigate={navigate} />

      {/* 3 — Question activity history */}
      <QuestionHistory state={state} />

      <div className="ss-dashboard-grid">
        <HomeAskEntry navigate={navigate} />
      </div>
    </div>
  );
}

// Compact in-product pulse for Home — the behavioral counterpart to the 1:1 chats,
// summarized as headline rates that deep-link into the In-product section.
function HomeInProductPulse({ state, navigate }) {
  const items = state.inproductFeedback || [];
  if (!items.length) return null;
  const s = ssInproductStats(items);
  const topExit = s.exitReasons[0];
  return (
    <section className="ss-panel">
      <div className="ss-panel-title-with-action">
        <PanelTitle k="In-product" title="Signals pulse" status={s.total + " signals"} />
        <button type="button" className="ss-home-seeall" onClick={() => navigate({ section: "inproduct" })}>Open signals <Icon name="arrow" size={14} /></button>
      </div>
      <div className="ss-pulse-stats">
        {s.helpfulRate != null && (
          <button type="button" className="ss-pulse-stat" onClick={() => navigate({ section: "inproduct" })}>
            <b>{s.helpfulRate}%</b><span>AI output helpful</span>
          </button>
        )}
        {s.csatAvg != null && (
          <button type="button" className="ss-pulse-stat" onClick={() => navigate({ section: "inproduct" })}>
            <b>{s.csatAvg.toFixed(1)}<span className="ss-signal-unit">/5</span></b><span>CSAT average</span>
          </button>
        )}
        {topExit && (
          <button type="button" className="ss-pulse-stat" onClick={() => navigate({ section: "inproduct" })}>
            <b>{s.exits.length}</b><span>exits · top: {topExit.reason}</span>
          </button>
        )}
      </div>
    </section>
  );
}

function HomeAskEntry({ navigate }) {
  const [question, setQuestion] = useStateSS("");
  const submit = () => {
    const q = question.trim();
    navigate({ section: "insights", focusedTarget: "ask-observant", pendingInsightQuestion: q || "" });
  };

  return (
    <section className="ss-panel">
      <PanelTitle k="Ask Observant" title="Ask across what it has learned" status="Insights" />
      <textarea
        className="textarea"
        value={question}
        placeholder="Ask a product question and Observant will pull from feedback, context, and the right users."
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className="ss-panel-actions">
        <Btn variant="primary" onClick={submit}><Icon name="spark" size={15} /> Ask in Insights</Btn>
      </div>
    </section>
  );
}

// C4: read the per-person memory the intro chat stored (same-origin localStorage).
function anMemory(product) {
  try { return (JSON.parse(localStorage.getItem("observant.memory.v1") || "{}")[product] || {}).memory || ""; } catch (e) { return ""; }
}

// The richer context fields (goal / terms / prior learning / docs) — reused in
// onboarding and in the Ask-page "what Observant knows" panel.
function ContextExtraFields({ value, onChange }) {
  const c = value || { goal3mo: "", priorLearning: "", docs: [] };
  const set = (k, v) => onChange({ ...c, [k]: v });
  const docs = c.docs || [];
  const setDoc = (i, k, v) => onChange({ ...c, docs: docs.map((d, j) => (j === i ? { ...d, [k]: v } : d)) });
  const rmDoc = (i) => onChange({ ...c, docs: docs.filter((_, j) => j !== i) });
  const onUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const added = files.map((f, k) => ({ id: "doc-" + docs.length + k + "-" + (f.name.length), name: f.name, note: "", uploaded: true }));
    onChange({ ...c, docs: [...docs, ...added] });
    e.target.value = "";
  };
  return (
    <>
      <Field label="Your 3-month business goal — the decision this learning serves" wide>
        <textarea className="textarea" value={c.goal3mo} placeholder="e.g. Get 30% of power users onto live dashboards before the raise." onChange={(e) => set("goal3mo", e.target.value)} />
      </Field>
      <Field label="What you've already learned / current hypotheses" wide>
        <textarea className="textarea" value={c.priorLearning} placeholder="e.g. We suspect people don't trust auto-refreshed numbers — unverified." onChange={(e) => set("priorLearning", e.target.value)} />
      </Field>
      <Field label="Documents" wide>
        <p className="ss-ctx-doc-hint">Anything that helps Observant understand your product and users — PRDs, pitch decks, past user research, support-ticket themes, onboarding docs, roadmaps. The more it has, the sharper its questions.</p>
        <div className="ss-ctx-docs">
          {docs.map((d, i) => (
            <div className="ss-ctx-doc" key={d.id || i}>
              <span className="ss-ctx-doc-name">{d.uploaded && <Icon name="check" size={13} sw={2.4} />} {d.name || "Untitled"}</span>
              <input className="input" value={d.note} placeholder="One line on what it is (optional)" onChange={(e) => setDoc(i, "note", e.target.value)} />
              <button type="button" className="ss-ctx-doc-rm" onClick={() => rmDoc(i)} aria-label="Remove document">×</button>
            </div>
          ))}
          <label className="ss-ctx-doc-upload">
            <input type="file" multiple onChange={onUpload} style={{ display: "none" }} />
            <Icon name="plus" size={14} /> Upload documents
          </label>
        </div>
      </Field>
    </>
  );
}

// The dedicated Context page — the full living profile on its own surface,
// always inviting more. Reached from the nav and the Ask-page strip.
function ContextView({ state, patchState }) {
  const product = SelfServeData.productName(state.workspace);
  const comp = SelfServeData.contextCompleteness(state.workspace);
  return (
    <div className="ss-page-stack">
      <PreBriefed state={state} />
      <section className="ss-panel">
        <PanelTitle k="Context" title={"What Observant knows about " + product} status={comp.filled + " of " + comp.total + " filled"} />
        <p className="ss-step-lead">This is the shared memory behind every question Observant asks your users. The more it knows, the sharper and more tailored each conversation — and you can keep adding to it anytime, forever. <b>New context is always welcome.</b></p>
        <ContextPanel state={state} patchState={patchState} bare />
      </section>
    </div>
  );
}

// The "what Observant knows about you" profile body — the full living profile,
// editable. Used on the Context page (and anywhere the profile is edited).
function ContextPanel({ state, patchState, bare }) {
  const w = state.workspace;
  const patchWs = (partial) => patchState((cur) => ({ ...cur, workspace: { ...cur.workspace, ...partial } }));
  const patchCtx = (ctx) => patchState((cur) => ({ ...cur, workspace: { ...cur.workspace, context: ctx } }));
  return (
    <div className={bare ? "" : "ss-ctx-panel"}>
      {!bare && <p className="ss-ctx-lead">This is everything Observant uses to tailor questions. The more it knows, the sharper every question lands — fill it out once, refine anytime.</p>}
      <div className="ss-form-grid">
        <Field label="What your product does" wide>
          <textarea className="textarea" value={w.productDescription} onChange={(e) => patchWs({ productDescription: e.target.value })} />
        </Field>
        <Field label="Who uses it today" wide>
          <textarea className="textarea" value={w.userBase} onChange={(e) => patchWs({ userBase: e.target.value })} />
        </Field>
        <Field label="Product URL">
          <input className="input" value={w.productUrl} onChange={(e) => patchWs({ productUrl: e.target.value })} />
        </Field>
        <ContextExtraFields value={w.context} onChange={patchCtx} />
      </div>
    </div>
  );
}

// Launch the REAL ElevenLabs voice interview (IntroCall) for a deep question —
// encodes the deep plan exactly the way IntroCall.html decodes it (?d=). Needs
// ELEVENLABS_API_KEY set on the Vercel project; otherwise IntroCall falls back to text.
function ssEncodeDeep(plan) {
  try { return btoa(unescape(encodeURIComponent(JSON.stringify(plan)))); } catch (e) { return ""; }
}
function ssOpenVoicePreview(product, deepPlan) {
  const plan = { product, mode: "deep", essence: (deepPlan && deepPlan.essence) || "", threads: (deepPlan && deepPlan.threads) || [] };
  const url = "IntroCall.html?product=" + encodeURIComponent(product) + "&d=" + encodeURIComponent(ssEncodeDeep(plan));
  try { window.open(url, "_blank", "noopener"); } catch (e) { window.location.href = url; }
}

// Redesigned ask experience — applies the conversation logic (C1) inline and
// Sends a real test email of the first batch. No dashboard thread is created here.
function AskPanel({ product, state, patchState, navigate }) {
  const [question, setQuestion] = useStateSS("");
  const [wishlist, setWishlist] = useStateSS("");
  const [tri, setTri] = useStateSS(null);
  const [previewing, setPreviewing] = useStateSS(false);
  const [testEmail, setTestEmail] = useStateSS("");
  const [sending, setSending] = useStateSS(false);
  const [result, setResult] = useStateSS(null);
  const [err, setErr] = useStateSS("");
  const [sendingLoop, setSendingLoop] = useStateSS(false); // real send to the panel
  const [loopResult, setLoopResult] = useStateSS(null);
  const [loopErr, setLoopErr] = useStateSS("");
  const [page, setPage] = useStateSS(0); // which step is showing: 0 write · 1 review · 2 test

  const channel = "email";                 // each user picks their own channel at opt-in; the preview shows the email view
  const plan = tri && tri.lightPlan;       // the light set (also the deep-mode fallback)
  const isDeep = tri && tri.mode === "deep";
  const comp = SelfServeData.contextCompleteness(state.workspace);
  const rate = (state.setup && state.setup.rate) || 2;
  const loopStep = !tri ? 0 : (result && result.ok ? 2 : 1); // 0 write · 1 review · 2 test

  async function preview() {
    if (!question.trim()) return;
    setTri(null); setPreviewing(true); setErr(""); setResult(null);
    setTimeout(() => { const el = document.getElementById("ss-preview-out"); if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 30);
    try {
      const t = await ssPostJson("/api/selfserve/interview", { action: "triage", product, question, wishlist, context: SelfServeData.contextSummary(state.workspace), memory: anMemory(product) });
      if (!t || !t.lightPlan) throw new Error("couldn't compose the questions");
      setTri(t); setPage(1);
    } catch (e) { setErr(String(e.message || e)); }
    setPreviewing(false);
  }

  async function sendTest() {
    if (!testEmail.includes("@") || !question.trim()) return;
    setSending(true); setErr(""); setResult(null);
    try {
      const r = await ssPostJson("/api/selfserve/send-email", { product, question, toEmail: testEmail, exploration: (tri ? tri.exploration : 0.5), channel, wishlist, context: SelfServeData.contextSummary(state.workspace), memory: anMemory(product), mode: tri ? tri.mode : "light", deepPlan: tri ? tri.deepPlan : null, estMin: tri ? tri.estMin : undefined });
      setResult(r);
      if (r && r.ok) {
        // log this loop to Activity history
        patchState((cur) => {
          if ((cur.loops || []).some((l) => l.question === question)) return cur;
          const loop = { id: "loop-" + (cur.loops ? cur.loops.length : 0) + "-" + question.length, name: question.length > 44 ? question.slice(0, 42) + "…" : question, question, mode: tri ? tri.mode : "light", people: 0, memory: 0 };
          return { ...cur, loops: [loop, ...(cur.loops || [])], activity: ["Loop sent: " + loop.name + ".", ...(cur.activity || [])] };
        });
      }
    } catch (e) { setErr(String(e.message || e)); }
    setSending(false);
  }

  // How many enrolled feedback partners this loop would reach. In sample/demo mode
  // that's the panel on screen; a real program returns the true count from the API.
  const enrolledCount = (state.people || []).length;

  // SEND FOR REAL — dispatch the loop to the program's enrolled off-product partners
  // over their channel (email/Telegram), reusing send-email.js via /api/selfserve/send-loop.
  // Degrades cleanly: with no DB/keys the API returns { simulated:true } and the UI still completes.
  async function sendLoop() {
    if (!question.trim()) return;
    setSendingLoop(true); setLoopErr(""); setLoopResult(null);
    try {
      const r = await ssPostJson("/api/selfserve/send-loop", { product, question, exploration: (tri ? tri.exploration : 0.5), channel, wishlist, context: SelfServeData.contextSummary(state.workspace), memory: anMemory(product), mode: tri ? tri.mode : "light", deepPlan: tri ? tri.deepPlan : null, estMin: tri ? tri.estMin : undefined });
      const realCount = r && typeof r.count === "number" && r.count > 0 ? r.count : 0;
      const simulated = !r || r.simulated || !realCount;
      const count = realCount || enrolledCount; // fall back to the on-screen panel size (demo)
      setLoopResult({ ok: true, count, simulated });
      // Record the sent loop (+ a run) so it shows live in Loop history / Off-product.
      patchState((cur) => SelfServeData.recordSentLoop(cur, { question, mode: tri ? tri.mode : "light", channel, count, simulated }));
    } catch (e) { setLoopErr(String(e.message || e)); }
    setSendingLoop(false);
  }

  const goStep = (i) => { if (i === 0 || tri) setPage(i); };

  return (
    <section className="ss-panel" id="create-loop">
      <PanelTitle k="Loop" title="Send a new loop" status="Always on" />

      <ol className="ss-loop-steps">
        {["Write", "Review", "Test"].map((s, i) => (
          <li key={s} className={"ss-loop-step" + (i < page ? " done" : i === page ? " on" : "") + ((i === 0 || tri) ? " nav" : "")} onClick={() => goStep(i)}>
            <span className="ss-loop-dot">{i < page ? <Icon name="check" size={12} sw={3} /> : i + 1}</span>
            <span className="ss-loop-label">{s}</span>
          </li>
        ))}
      </ol>

      {/* ── STEP 1 · WRITE ── */}
      {page === 0 && (
        <div className="ss-step-block">
          <p className="ss-step-lead">A <b>loop</b> is one batch of questions Observant sends a user. Write what you want to learn in your own words — business or product questions are fine; Observant rewrites them as natural user questions. It runs as <b>Light mode</b> (a couple of quick questions) or <b>Deep mode</b> (a ~10-minute AI-guided voice interview) — Observant picks. Keep each loop to one theme; mix too much and we'll suggest splitting it.</p>
          <button type="button" className="ss-ctx-strip" onClick={() => navigate({ section: "context" })}>
            <span className="ss-ctx-strip-main"><Icon name="book" size={15} /> What Observant knows about {product}</span>
            <span className="ss-ctx-strip-meta">{comp.filled} of {comp.total} areas filled · review / add more <Icon name="arrow" size={13} /></span>
          </button>
          <Field label="What do you want to learn?">
            <textarea className="textarea ss-ask-open" value={question} placeholder={"Write your questions however you think of them — e.g. How do people use " + product + " day-to-day? What made power users stick around? Observant will translate and group them."} onChange={(e) => { setQuestion(e.target.value); setTri(null); setPage(0); }} />
          </Field>
          {anMemory(product) && <p style={{ fontSize: ".82rem", color: "#2e7d46", margin: "-4px 0 14px" }}>✓ Observant will tailor these to what it learned about this person in their intro.</p>}
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={preview} disabled={!question.trim() || previewing}>{previewing ? "Reading your question…" : "Next: see what Observant will ask"} <Icon name="arrow" size={16} /></Btn>
          </div>
        </div>
      )}

      {/* ── STEP 2 · REVIEW ── */}
      {page === 1 && tri && (
        <div className="ss-step-block">
          <span className="ss-step-tag">Step 2 · What Observant will do</span>
          <div className={"ss-depth-card " + (isDeep ? "deep" : "light")}>
            <div className="ss-depth-head">
              <span className="ss-depth-badge">{isDeep ? "Deep mode — 10-minute AI-guided conversation" : "Light mode — a couple of quick questions"}</span>
              <span className="ss-depth-sub">{isDeep ? "Observant will invite them to a ~10-minute voice interview." : "Observant will ask in-channel; at most one follow-up."}</span>
            </div>
            {tri.estMin > 0 && (
              <p className="ss-depth-reward">Reward offered: <b>~{tri.estMin} min · ${tri.estMin * rate}</b> per person — paid when their answers pass a quick quality check.</p>
            )}
            <details className="ss-depth-learn">
              <summary>What's light mode vs deep mode?</summary>
              <p><b>Light</b> — a couple of quick questions answered async in their inbox or chat, with at most one follow-up. Best for tactical, recallable things.<br /><b>Deep</b> — a ~10-minute AI-guided voice interview for questions whose real answer only comes out through back-and-forth. If someone doesn't have time, they're offered the light version instead.</p>
            </details>
          </div>

          {isDeep && (
            <div className="ss-voice-preview">
              <span className="ss-result-label">The 10-minute voice interview</span>
              <p className="ss-result-help">This runs a real, live AI voice interview on the question above — try it exactly the way your user would.</p>
              <Btn variant="primary" onClick={() => ssOpenVoicePreview(product, tri.deepPlan)}><Icon name="phone" size={15} /> Preview the voice interview</Btn>
            </div>
          )}

          {tri.split && tri.split.recommend && (
            <div className="ss-split-note"><Icon name="spark" size={15} /> <span><b>These span a few themes — consider sending them as separate loops.</b> {tri.split.note}</span></div>
          )}

          {!isDeep && (
            <div style={{ marginTop: 14 }}>
              <span className="ss-result-label">The questions it'll ask</span>
              <ol className="ss-result-qs">{(plan.questions || []).map((q, i) => <li key={i}>{q}</li>)}</ol>
            </div>
          )}

          <div className="ss-wiz-nav">
            <button type="button" className="ss-linklike" onClick={() => setPage(0)}><Icon name="back" size={14} /> Back to edit</button>
            <Btn variant="primary" onClick={() => setPage(2)}>Next: see what users get <Icon name="arrow" size={16} /></Btn>
          </div>
        </div>
      )}

      {/* ── STEP 3 · TEST & SEND ── */}
      {page === 2 && tri && (
        <div className="ss-step-block">
          <span className="ss-step-tag">Step 3 · See it, then send it</span>

          {/* PRIMARY — send the loop to the real feedback panel */}
          <div className={"ss-depth-card " + (isDeep ? "deep" : "light")}>
            <div className="ss-depth-head">
              <span className="ss-depth-badge">Send to your users</span>
              <span className="ss-depth-sub">{enrolledCount ? "Goes out to your " + enrolledCount + " enrolled feedback " + (enrolledCount === 1 ? "partner" : "partners") + " on their channel — replies come back to your dashboard." : "Goes out to your enrolled feedback partners on their channel — replies come back to your dashboard."}</span>
            </div>
            <div className="ss-panel-actions">
              <Btn variant="primary" onClick={sendLoop} disabled={sendingLoop}><Icon name="relay" size={15} /> {sendingLoop ? "Sending to your users…" : "Send to your users"} <Icon name="arrow" size={16} /></Btn>
            </div>
            {loopResult && loopResult.ok && (
              <p className="ss-sent-note" style={{ color: "#2e7d46" }}><Icon name="check" size={15} sw={2.4} /> Loop sent to {loopResult.count} {loopResult.count === 1 ? "user" : "users"} — replies will flow to your dashboard.{navigate ? <> · <button type="button" className="ss-linklike" onClick={() => navigate({ section: "offproduct", offTab: "threads" })}>View 1:1 threads →</button></> : null}</p>
            )}
            {loopErr && <p className="ss-result-help" style={{ color: "#b4291f" }}>{loopErr}</p>}
          </div>

          {/* SECONDARY — preview to yourself first */}
          <div style={{ marginTop: 18 }}>
            <span className="ss-result-label">Want to preview it first?</span>
            {channel === "email" ? (
              <>
                <p className="ss-result-help">Send yourself a test {isDeep ? "invitation" : "email"} to experience exactly what your users receive — no one else is contacted.</p>
                <div className="ss-send-row">
                  <input className="input" type="email" value={testEmail} placeholder="you@example.com" onChange={(e) => setTestEmail(e.target.value)} />
                  <Btn variant="ghost" onClick={sendTest} disabled={sending || !testEmail.includes("@")}><Icon name="mail" size={15} /> {sending ? "Sending…" : "Send yourself a test"}</Btn>
                </div>
              </>
            ) : (
              <p className="ss-result-help">Telegram delivery comes with the bot integration — switch to <b>Email</b> to send yourself a real test now.</p>
            )}
            {result && result.ok && <p className="ss-sent-note" style={{ color: "#2e7d46" }}><Icon name="check" size={15} sw={2.4} /> Test sent to {result.to} — check your inbox.</p>}
            {result && !result.ok && result.needKey && <p className="ss-result-help" style={{ color: "#b07a1e" }}>Composed ✓ — no email provider connected yet. Add <code>RESEND_API_KEY</code> to send for real.</p>}
            {result && !result.ok && !result.needKey && <p className="ss-result-help" style={{ color: "#b4291f" }}>{result.error}</p>}
          </div>

          <div className="ss-wiz-nav">
            <button type="button" className="ss-linklike" onClick={() => setPage(1)}><Icon name="back" size={14} /> Back</button>
          </div>
        </div>
      )}

      {previewing && !tri && (
        <div className="ss-step-block">
          <div className="ss-depth-card ss-skel-card"><div className="ss-skel-line w40" /><div className="ss-skel-line w70" /><div className="ss-skel-line w90" /></div>
          <p className="ss-muted-note">Observant is reading your question and composing what to ask…</p>
        </div>
      )}
      {err && <p className="ss-result-help" style={{ color: "#b4291f" }}>{err}</p>}
    </section>
  );
}

// The Off-product program (Partners · Loops · 1:1 threads · Manage setup) and the
// In-product signals (Signals · Manage setup) are now each their OWN sidebar page —
// see SS_NAV + the render switch in ProductShell. Their building blocks (PeopleView,
// AskPanel, QuestionHistory, ConversationsCRM, OffProductTrack, InProductSignals,
// InProductTrack) live below and are mounted directly per-section, no tab hub.

// Roll the raw in-product signals up into rates/counts — the pulse, not a thread list.
function ssInproductStats(items) {
  const list = Array.isArray(items) ? items : [];
  const evals = list.filter((i) => i.type === "eval");
  const up = evals.filter((i) => i.value === "up");
  const down = evals.filter((i) => i.value === "down");
  const evalTotal = up.length + down.length;
  const csats = list.filter((i) => i.type === "csat" && i.value != null && i.value !== "");
  const csatVals = csats.map((i) => Number(i.value)).filter((n) => !isNaN(n));
  const csatAvg = csatVals.length ? csatVals.reduce((a, b) => a + b, 0) / csatVals.length : null;
  const csatDist = [1, 2, 3, 4, 5].map((n) => ({ n, count: csatVals.filter((v) => v === n).length }));
  const exits = list.filter((i) => i.type === "exit");
  const exitMap = {};
  exits.forEach((e) => { const r = (e.value || "no reason given").replace(/-/g, " "); exitMap[r] = (exitMap[r] || 0) + 1; });
  const exitReasons = Object.keys(exitMap).map((r) => ({ reason: r, count: exitMap[r] })).sort((a, b) => b.count - a.count);
  const feedbacks = list.filter((i) => i.type === "feedback");
  return {
    total: list.length,
    evals, up, down, evalTotal,
    helpfulRate: evalTotal ? Math.round((up.length / evalTotal) * 100) : null,
    csats, csatVals, csatAvg, csatDist,
    exits, exitReasons, feedbacks,
  };
}

// One short, representative quote inside a metric card — never a full thread.
function SignalQuote({ state, fb, tone }) {
  if (!fb || !fb.note) return null;
  const who = ssInproductWho(state, fb);
  return (
    <blockquote className={"ss-signal-quote" + (tone ? " tone-" + tone : "")}>
      <p>“{fb.note}”</p>
      <cite>{who.name}{fb.url ? <span className="mono"> · {fb.url}</span> : null}{fb.time ? " · " + fb.time : ""}</cite>
    </blockquote>
  );
}

function InProductSignals({ state, navigate, onManage }) {
  const items = state.inproductFeedback || [];
  if (!items.length) {
    const setupCta = onManage
      ? { label: "Install the snippet", onClick: onManage }
      : (navigate ? { label: "Set up in-product feedback", onClick: () => navigate({ section: "sources" }) } : null);
    return (
      <section className="ss-panel">
        <PanelTitle k="In-product" title="In-product signals" status="None yet" />
        <EmptyState
          icon="globe"
          title="No in-product signals yet"
          text="Once the snippet is live, thumbs on AI output, CSAT taps and exit reasons roll up here as rates and trends — the pulse from inside your product."
          cta={setupCta}
        />
      </section>
    );
  }

  const s = ssInproductStats(items);
  const bestUp = s.up.find((f) => f.note) || s.up[0];
  const worstDown = s.down.find((f) => f.note) || s.down[0];
  const lowCsat = s.csats.filter((f) => Number(f.value) <= 2).find((f) => f.note);
  const highCsat = s.csats.filter((f) => Number(f.value) >= 4).find((f) => f.note);
  const csatMax = Math.max(1, ...s.csatDist.map((d) => d.count));

  return (
    <div className="ss-signals">
      <p className="ss-source-note"><Icon name="globe" size={13} /> Collected inside your product by the Observant snippet — {s.total} signals. Rates and quotes, not threads; the deep <b>why</b> lives in Off-product.</p>

      <div className="ss-signal-grid">
        {/* AI output evals — helpful vs not-helpful pass rate */}
        <section className="ss-signal-card">
          <div className="ss-signal-card-head"><Icon name="spark" size={14} /> <b>AI output evals</b><span className="ss-signal-n">{s.evalTotal} rated</span></div>
          {s.helpfulRate != null ? (
            <>
              <div className="ss-signal-stat"><b>{s.helpfulRate}%</b><em>rated helpful</em></div>
              <div className="ss-rate-bar"><span className="ss-rate-fill" style={{ width: s.helpfulRate + "%" }} /></div>
              <div className="ss-rate-legend"><span><i className="dot up" /> {s.up.length} helpful</span><span><i className="dot down" /> {s.down.length} not helpful</span></div>
              {worstDown && <SignalQuote state={state} fb={worstDown} tone="neg" />}
              {bestUp && <SignalQuote state={state} fb={bestUp} tone="pos" />}
            </>
          ) : <p className="ss-signal-empty">No evals rated yet.</p>}
        </section>

        {/* CSAT — average + 1–5 distribution */}
        <section className="ss-signal-card">
          <div className="ss-signal-card-head"><Icon name="check" size={14} /> <b>CSAT</b><span className="ss-signal-n">{s.csats.length} responses</span></div>
          {s.csatAvg != null ? (
            <>
              <div className="ss-signal-stat"><b>{s.csatAvg.toFixed(1)}<span className="ss-signal-unit">/5</span></b><em>average satisfaction</em></div>
              <div className="ss-csat-dist">
                {s.csatDist.map((d) => (
                  <div className="ss-csat-col" key={d.n}>
                    <span className="ss-csat-bar" style={{ height: Math.round((d.count / csatMax) * 100) + "%" }} />
                    <span className="ss-csat-tick">{d.n}</span>
                  </div>
                ))}
              </div>
              {lowCsat && <SignalQuote state={state} fb={lowCsat} tone="neg" />}
              {highCsat && <SignalQuote state={state} fb={highCsat} tone="pos" />}
            </>
          ) : <p className="ss-signal-empty">No CSAT responses yet.</p>}
        </section>

        {/* Exit survey — top reasons by count */}
        <section className="ss-signal-card">
          <div className="ss-signal-card-head"><Icon name="back" size={14} /> <b>Exit survey</b><span className="ss-signal-n">{s.exits.length} exits</span></div>
          {s.exitReasons.length ? (
            <>
              <ul className="ss-exit-reasons">
                {s.exitReasons.map((r) => (
                  <li key={r.reason}><span className="ss-exit-reason">{r.reason}</span><span className="ss-exit-count">{r.count}</span></li>
                ))}
              </ul>
              {s.exits.find((f) => f.note) && <SignalQuote state={state} fb={s.exits.find((f) => f.note)} tone="neg" />}
            </>
          ) : <p className="ss-signal-empty">No exits recorded yet.</p>}
        </section>

        {/* Unsolicited feedback — count + a quote */}
        {s.feedbacks.length > 0 && (
          <section className="ss-signal-card">
            <div className="ss-signal-card-head"><Icon name="chat" size={14} /> <b>Unsolicited feedback</b><span className="ss-signal-n">{s.feedbacks.length}</span></div>
            <div className="ss-signal-stat"><b>{s.feedbacks.length}</b><em>users volunteered a thought</em></div>
            {s.feedbacks.find((f) => f.note) && <SignalQuote state={state} fb={s.feedbacks.find((f) => f.note)} />}
          </section>
        )}
      </div>
    </div>
  );
}

// Channel pill — email / Telegram / in-product, used everywhere a source is shown.
function ChannelBadge({ channel, small }) {
  const meta = ssChannelMeta(channel);
  return (
    <span className={"ss-chan-badge chan-" + channel + (small ? " sm" : "")}>
      <Icon name={meta.icon} size={small ? 10 : 12} /> {meta.label}
    </span>
  );
}

// Master-detail CRM: browsable list of 1:1 threads on the left, full back-and-forth on the right.
function ConversationsCRM({ state, navigate, onManage }) {
  const convos = state.conversations || [];
  const [selId, setSelId] = useStateSS(convos[0] ? convos[0].id : "");
  const selected = convos.find((c) => c.id === selId) || convos[0];

  if (!convos.length) {
    const inviteCta = onManage
      ? { label: "Invite your users", onClick: onManage }
      : (navigate ? { label: "Invite users to your program", onClick: () => navigate({ section: "sources" }) } : null);
    return (
      <section className="ss-panel">
        <PanelTitle k="Conversations" title="1:1 feedback threads" status="None yet" />
        <EmptyState
          icon="chat"
          title="No 1:1s yet"
          text="Once your users opt in and reply over email or Telegram, every 1:1 shows up here as a thread you can read in full."
          cta={inviteCta}
        />
      </section>
    );
  }

  const person = ssPersonForConversation(state, selected);
  return (
    <div className="ss-learning-layout">
      <section className="ss-panel">
        <PanelTitle k="Conversations" title="1:1 feedback threads" status={convos.length + " threads"} />
        <div className="ss-conv-list">
          {convos.map((c) => (
            <ConversationRow key={c.id} state={state} conversation={c} selected={c.id === selected.id} onClick={() => setSelId(c.id)} />
          ))}
        </div>
      </section>
      <ConversationThread state={state} conversation={selected} person={person} navigate={navigate} />
    </div>
  );
}

// One CRM row: person, channel badge, last-message snippet, status, minutes.
function ConversationRow({ state, conversation, selected, onClick }) {
  const person = ssPersonForConversation(state, conversation);
  if (!person) return null;
  const channel = ssChannelKey(person.surface);
  const msgs = conversation.messages || [];
  let snippet = "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i] && msgs[i].t === "user" && msgs[i].text) { snippet = msgs[i].text; break; }
  }
  if (!snippet && msgs.length) snippet = msgs[msgs.length - 1].text || "";
  const minutes = ssPersonMinutes(person);
  return (
    <button type="button" className={"ss-conv-row" + (selected ? " on" : "")} onClick={onClick}>
      <ProfileAvatar person={person} />
      <div className="ss-conv-row-copy">
        <div className="ss-conv-row-top">
          <b>{person.name}</b>
          <ChannelBadge channel={channel} small />
        </div>
        {snippet && <p>{snippet}</p>}
        <div className="ss-conv-row-meta">
          <span className={"ss-conv-status st-" + String(conversation.state || "").toLowerCase().replace(/\s+/g, "")}>{conversation.state || "Open"}</span>
          {conversation.mode === "voice" && <span className="ss-conv-tag">Voice · transcript</span>}
          {minutes && <span className="ss-conv-min">{minutes}</span>}
        </div>
      </div>
    </button>
  );
}

// Thread reader: person + channel header, the full Observant→user→follow-up exchange.
function ConversationThread({ state, conversation, person, navigate }) {
  if (!conversation) {
    return <section className="ss-chat-panel"><div className="ss-chat-body"><EmptyState title="No thread selected" text="Pick a conversation to read the full back-and-forth." /></div></section>;
  }
  const channel = ssChannelKey(person ? person.surface : "");
  const meta = ssChannelMeta(channel);
  const first = person ? person.name.split(" ")[0] : "this user";
  const minutes = ssPersonMinutes(person);
  const reward = ssPersonReward(person);
  return (
    <section className="ss-chat-panel ss-thread-panel">
      <div className="ss-chat-head">
        {person && <ProfileAvatar person={person} />}
        <div>
          <h3>{person ? person.name : conversation.title}</h3>
          <p>{conversation.title}</p>
        </div>
        <ChannelBadge channel={channel} />
      </div>
      <div className="ss-thread-strip">
        <span className={"ss-conv-status st-" + String(conversation.state || "").toLowerCase().replace(/\s+/g, "")}>{conversation.state || "Open"}</span>
        <span>Observant relays this {meta.label} line</span>
        {minutes && <span className="ss-conv-min">{minutes}</span>}
        {reward && <span className="ss-conv-min">{reward}</span>}
      </div>
      <div className="ss-chat-body">
        {(conversation.messages || []).map((message, i) => <ChatMessage key={i} message={message} />)}
      </div>
      {person && navigate && (
        <div className="ss-chat-actions">
          <Btn variant="ghost" size="sm" onClick={() => navigate({ section: "people", conversationId: conversation.id, focusedTarget: "person-" + person.id })}>
            <Icon name="users" size={15} /> Open {first}'s full profile
          </Btn>
        </div>
      )}
    </section>
  );
}

// In-product feedback stream — the snippet's short signals, each labeled by source.
function InProductFeedbackList({ state, navigate }) {
  const items = state.inproductFeedback || [];
  if (!items.length) {
    return (
      <section className="ss-panel">
        <PanelTitle k="In-product" title="In-product feedback" status="None yet" />
        <EmptyState
          icon="globe"
          title="No in-product feedback yet"
          text="Once the in-product snippet is live, thumbs on AI output, exit reasons and CSAT land here — each clearly labeled by source."
          cta={navigate ? { label: "Set up in-product feedback", onClick: () => navigate({ section: "sources" }) } : null}
        />
      </section>
    );
  }
  return (
    <section className="ss-panel">
      <PanelTitle k="In-product" title="In-product feedback" status={items.length + " signals"} />
      <p className="ss-source-note"><Icon name="globe" size={13} /> Collected inside your product by the Observant snippet — separate from the off-product 1:1 threads.</p>
      <div className="ss-inproduct-list">
        {items.map((fb) => <InProductRow key={fb.id} state={state} fb={fb} navigate={navigate} />)}
      </div>
    </section>
  );
}

function InProductRow({ state, fb, navigate }) {
  const meta = ssInproductMeta(fb.type);
  const who = ssInproductWho(state, fb);
  const clickable = who.person && navigate;
  const Wrapper = clickable ? "button" : "div";
  const open = clickable
    ? () => navigate({ section: "people", conversationId: ssConversationIdForPerson(state, who.person.id), focusedTarget: "person-" + who.person.id })
    : undefined;
  return (
    <Wrapper type={clickable ? "button" : undefined} className={"ss-inproduct-row" + (clickable ? " ss-card-action" : "")} onClick={open}>
      <span className="ss-src-badge"><Icon name={meta.icon} size={11} /> In-product · {meta.label}</span>
      <div className="ss-inproduct-body">
        <b>{ssInproductValue(fb)}</b>
        {fb.note && <p>{fb.note}</p>}
      </div>
      <div className="ss-inproduct-foot">
        <span>{who.name}</span>
        {fb.url && <span className="mono">{fb.url}</span>}
        {fb.time && <span>{fb.time}</span>}
      </div>
    </Wrapper>
  );
}

function QuestionHistory({ state, navigate }) {
  return (
    <section className="ss-panel">
      <PanelTitle k="History" title="Questions your team has asked" status={state.loops.length + " asked"} />
      {state.loops.length ? (
        <div className="ss-question-history">
          {state.loops.map((loop) => {
            const run = ssActiveLoopRun(state, loop.id);
            const collecting = run && run.status !== "running";
            return (
              <div className={"ss-question-row" + ssFocusClass(state, loop.id)} key={loop.id}>
                <p>{loop.question}</p>
                <em>{collecting ? "collecting…" : (loop.people ? loop.people + " people · " + loop.memory + " replies" : "sent to your panel")}</em>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="chat"
          title="No conversations yet"
          text="Once users opt in and reply, every 1:1 shows up here. Send a loop to start the first one."
          cta={navigate ? { label: "Send a new loop", onClick: () => navigate({ section: "compose" }) } : null}
        />
      )}
    </section>
  );
}

function PeopleView({ state, patchState, navigate, onManage }) {
  const selected = state.conversations.find((c) => c.id === state.selectedConversationId) || state.conversations[0];
  const person = ssPersonForConversation(state, selected);
  const [followUpOpen, setFollowUpOpen] = useStateSS(false);
  const [followUpQ, setFollowUpQ] = useStateSS("");
  const [followUpStage, setFollowUpStage] = useStateSS("");
  const [modeTab, setModeTab] = useStateSS("chat");

  if (!selected || !person) {
    return (
      <section className="ss-panel">
        <PanelTitle k="Partners" title="Your feedback partners" status="None yet" />
        <EmptyState
          icon="users"
          title="No partners yet"
          text="Invite your users and the people who opt in will show up here, each on their own 1:1 line."
          cta={onManage
            ? { label: "Invite your users", onClick: onManage }
            : (navigate ? { label: "Invite users to your program", onClick: () => navigate({ section: "sources" }) } : null)}
        />
      </section>
    );
  }

  const personConversations = state.conversations.filter((item) => item.userId === person.id || item.id === person.id);
  const chatConversation = personConversations.find((item) => item.mode !== "voice") || null;
  const voiceConversations = personConversations.filter((item) => item.mode === "voice");

  const setSelected = (conversationId) => {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    const rowPerson = ssPersonForConversation(state, conversation);
    setModeTab(conversation && conversation.mode === "voice" ? "voice" : "chat");
    patchState((current) => ({
      ...current,
      section: "offproduct",
      offTab: "partners",
      selectedConversationId: conversationId,
      focusedTarget: "person-" + (rowPerson ? rowPerson.id : conversationId),
    }));
  };

  // Follow-ups go through Observant, never straight to the person —
  // the staged send makes the relay model felt.
  const sendFollowUp = () => {
    const q = followUpQ.trim();
    if (!q || followUpStage) return;
    setFollowUpStage("Refining your question");
    setTimeout(() => setFollowUpStage("Sending it to " + person.name.split(" ")[0] + " over " + person.surface), 1400);
    setTimeout(() => {
      patchState((current) => ({
        ...current,
        conversations: ssUpdateById(current.conversations, (chatConversation || selected).id, (conversation) => ({
          messages: [
            ...conversation.messages,
            { t: "relay", text: q, meta: "Follow-up from your team — Observant is phrasing it for " + person.name.split(" ")[0] },
            { t: "them", text: "On it — I'll work this into the conversation with the context already remembered for " + person.name.split(" ")[0] + ".", meta: "Observant" },
          ],
        })),
        activity: ["Follow-up sent to " + person.name + " via Observant.", ...current.activity],
      }));
      setFollowUpStage("");
      setFollowUpQ("");
      setFollowUpOpen(false);
    }, 2800);
  };

  const requestLive = () => {
    patchState((current) => ({
      ...current,
      scheduledCalls: [
        { id: "call-" + (current.scheduledCalls.length + 1), user: person.name, time: "Thu 2:00pm", topic: selected.title },
        ...current.scheduledCalls,
      ],
      conversations: ssUpdateById(current.conversations, selected.id, (conversation) => ({
        messages: [
          ...conversation.messages,
          { t: "relay", text: "Live 1:1 requested.", meta: "Your team" },
          { t: "them", text: person.name.split(" ")[0] + " - the team would love 15 minutes to watch this workflow. Does Thursday at 2pm work?", meta: "Observant" },
          { t: "user", text: "Thursday works. Send the invite.", meta: person.name.split(" ")[0] },
        ],
      })),
      activity: ["Live 1:1 scheduled with " + person.name + ".", ...current.activity],
    }));
  };

  return (
    <div className="ss-people-layout">
      <section className="ss-panel">
        <PanelTitle k="Partners" title="Your feedback partners" status={state.people.length + " partners"} />
        <div className="ss-table-list">
          {state.people.map((rowPerson) => {
            const conversationId = ssConversationIdForPerson(state, rowPerson.id);
            return (
              <PersonLine
                key={rowPerson.id}
                person={rowPerson}
                meta={rowPerson.segment + " · " + rowPerson.surface}
                body={rowPerson.last}
                selected={selected.id === conversationId}
                focused={state.focusedTarget === "person-" + rowPerson.id}
                onClick={() => setSelected(conversationId)}
              />
            );
          })}
        </div>
      </section>

      <section className={"ss-chat-panel ss-person-detail" + ssFocusClass(state, "person-" + person.id)}>
        <div className="ss-chat-head">
          <ProfileAvatar person={person} />
          <div>
            <h3>{person.name}</h3>
            <p>{person.segment}</p>
          </div>
          <ChannelBadge channel={ssChannelKey(person.surface)} />
        </div>
        <p className="ss-relay-note">This isn't a direct message thread — Observant's interviewer holds this line with {person.name.split(" ")[0]} over {person.surface} and relays what your team needs.</p>
        <PartnerMemory person={person} />
        <PersonInProduct feedback={(state.inproductFeedback || []).filter((f) => f.userId === person.id)} />
        <div className="ss-mode-tabs">
          <button type="button" className={modeTab === "chat" ? "on" : ""} onClick={() => setModeTab("chat")}><Icon name="chat" size={15} /> 1:1 chat <em>async</em></button>
          <button type="button" className={modeTab === "voice" ? "on" : ""} onClick={() => setModeTab("voice")}><Icon name="phone" size={15} /> Voice interviews <em>transcripts{voiceConversations.length ? " · " + voiceConversations.length : ""}</em></button>
        </div>
        {modeTab === "chat" ? (
          <div className="ss-chat-body">
            {chatConversation
              ? chatConversation.messages.map((message, i) => <ChatMessage key={i} message={message} />)
              : <EmptyState title="No chat yet" text={"The async 1:1 with " + person.name.split(" ")[0] + " opens with their first reply."} />}
          </div>
        ) : (
          <div className="ss-chat-body ss-transcript-body">
            {voiceConversations.length ? voiceConversations.map((conversation) => (
              <div className="ss-transcript" key={conversation.id}>
                <div className="ss-transcript-head"><b>{conversation.title}</b><span>{conversation.duration || "voice"} · transcript</span></div>
                {conversation.messages.map((message, i) => (
                  <div className="ss-turn" key={i}><b>{message.meta}</b><p>{message.text}</p></div>
                ))}
              </div>
            )) : <EmptyState title="No voice interviews yet" text={"When " + person.name.split(" ")[0] + " takes a focused voice interview, the full transcript lands here."} />}
          </div>
        )}
        <div className="ss-chat-actions">
          <Btn variant="primary" size="sm" onClick={() => setFollowUpOpen(true)}><Icon name="relay" size={15} /> Follow up with a question</Btn>
          <Btn variant="ghost" size="sm" onClick={requestLive}><Icon name="video" size={15} /> Request live 1:1</Btn>
        </div>
      </section>
      {followUpOpen && (
        <>
          <button type="button" className="ss-edit-backdrop" aria-label="Close" onClick={() => { if (!followUpStage) { setFollowUpOpen(false); } }} />
          <div className="ss-modal" role="dialog" aria-label="Follow up with a question">
            <div className="ss-modal-head">
              <div>
                <span className="eyebrow no-rule">Follow up</span>
                <h2>Ask {person.name.split(" ")[0]} a question</h2>
              </div>
              {!followUpStage && <button type="button" className="ss-modal-close" onClick={() => setFollowUpOpen(false)} aria-label="Close"><Icon name="x" size={17} /></button>}
            </div>
            <p className="ss-modal-lead">Observant refines your question, phrases it for {person.name.split(" ")[0]}, and sends it over {person.surface} — you'll see the reply land in this line.</p>
            <div className="ss-modal-body">
              <textarea className="textarea" value={followUpQ} placeholder={"e.g. Would a live dashboard replace your weekly export?"} onChange={(e) => setFollowUpQ(e.target.value)} disabled={!!followUpStage} />
              {followUpStage
                ? <div className="ss-asking"><span className="ss-spinner" /> {followUpStage}…</div>
                : (
                  <div className="ss-modal-actions">
                    <span />
                    <Btn variant="primary" disabled={!followUpQ.trim()} onClick={sendFollowUp}>Send via Observant</Btn>
                  </div>
                )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Bucket A: relationship-frame surfaces ----

// Per-partner living memory — the company side of the relationship, made visible.
function PartnerMemory({ person }) {
  const p = person.profile;
  if (!p) return null;
  const block = (label, items) => items && items.length ? (
    <div className="ss-memory-block"><b>{label}</b><ul>{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
  ) : null;
  return (
    <div className="ss-memory">
      <div className="ss-memory-head">
        <span className="eyebrow no-rule">Relationship memory</span>
        <em>{p.since}{p.reward ? " · " + p.reward : ""}</em>
      </div>
      {block("What Observant knows", p.knows)}
      {block("What they’ve shared", p.shared)}
      {block("Open threads", p.open)}
      <p className="ss-memory-foot">Carried across every conversation — {person.name.split(" ")[0]} never repeats themselves, and the relationship compounds.</p>
    </div>
  );
}

// The in-product half of a person's unified feedback profile — snippet signals this
// user left inside the product, alongside their off-product 1:1 history above.
function PersonInProduct({ feedback }) {
  if (!feedback || !feedback.length) return null;
  return (
    <div className="ss-person-inproduct">
      <div className="ss-memory-head">
        <span className="eyebrow no-rule">In-product feedback</span>
        <em>{feedback.length} signal{feedback.length === 1 ? "" : "s"} · from your product</em>
      </div>
      <div className="ss-inproduct-list">
        {feedback.map((fb) => (
          <div className="ss-inproduct-row" key={fb.id}>
            <span className="ss-src-badge"><Icon name={ssInproductMeta(fb.type).icon} size={11} /> In-product · {ssInproductMeta(fb.type).label}</span>
            <div className="ss-inproduct-body">
              <b>{ssInproductValue(fb)}</b>
              {fb.note && <p>{fb.note}</p>}
            </div>
            <div className="ss-inproduct-foot">
              {fb.url && <span className="mono">{fb.url}</span>}
              {fb.time && <span>{fb.time}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// (Removed the in-portal "reply & invite" reviews panel — fictional: the portal
// can't DM anonymous reviewers. Real recruiting = post the magic link where the
// feedback already happens. Public signal still pre-briefs the companion below.)

// Weekly digest — the relationship-flavored version of Novus's Signals.
function WeeklyDigest({ state, navigate }) {
  const d = state.digest;
  if (!d) return null;
  return (
    <section className="ss-panel ss-digest">
      <PanelTitle k="Weekly digest" title={d.period + " — what your users told you"} status="Auto-sent" />
      <p className="ss-digest-headline">{d.headline}</p>
      {d.stats && <div className="ss-digest-stats">{d.stats.map((s, i) => <div key={i}><b>{s.n}</b><span>{s.l}</span></div>)}</div>}
      <ul className="ss-digest-list">{d.items.map((x, i) => <li key={i}>{x}</li>)}</ul>
      {d.insightId && navigate && <button type="button" className="ss-home-seeall" onClick={() => navigate({ section: "insights", focusedTarget: d.insightId })}>Open the insight <Icon name="arrow" size={14} /></button>}
    </section>
  );
}

// Ask Observant where teams already work — Slack + MCP (mirrors Novus's MCP presentation).
function Integrations({ state }) {
  const qa = (state.slackQA || [])[0];
  return (
    <section className="ss-panel">
      <PanelTitle k="Integrations" title="Ask Observant where you already work" status="Slack · MCP" />
      <div className="ss-integ-grid">
        <div className="ss-integ-card">
          <div className="ss-integ-head"><Icon name="chat" size={16} /> <b>Ask Observant in Slack</b></div>
          {qa ? (
            <div className="ss-slack">
              <div className="ss-slack-msg"><span className="ss-slack-who">you</span><p>{qa.q}</p></div>
              <div className="ss-slack-msg ss-slack-bot"><span className="ss-slack-who">Observant</span><p>{qa.a}</p></div>
            </div>
          ) : <p className="mut">Ask about your users in plain English, right in Slack.</p>}
        </div>
        <div className="ss-integ-card">
          <div className="ss-integ-head"><Icon name="link" size={16} /> <b>MCP server</b></div>
          <p className="mut">Pull what Observant has learned into Claude Code, Cursor, or any MCP client — mid-task.</p>
          <code className="ss-mcp">claude mcp add --transport http observant https://www.observanthq.com/api/mcp</code>
          <a href="/MCP.html" className="ss-integ-link" target="_blank" rel="noopener">Connect to your editor →</a>
        </div>
      </div>
    </section>
  );
}

// Pre-briefed companion — Observant arrives already knowing the product (from a scan).
function PreBriefed({ state }) {
  const b = state.briefing;
  if (!b) return null;
  return (
    <section className="ss-panel ss-prebrief">
      <PanelTitle k="Pre-briefed" title="What Observant already knows" status="From a scan" />
      <p className="ss-step-lead">Before the first conversation, Observant read {b.scanned.join(", ")} — so the companion shows up already understanding your product and who’s worth talking to.</p>
      <ul className="ss-prebrief-list">{b.knows.map((x, i) => <li key={i}><Icon name="check" size={13} sw={2.4} /> {x}</li>)}</ul>
    </section>
  );
}

function InsightsView({ state, patchState, navigate }) {
  const latestAnswer = (state.answers || []).find((a) => SelfServeData.answerIsReal(a));

  return (
    <div className="ss-page-stack">
      <AskObservant
        state={state}
        patchState={patchState}
        autoQuestion={state.pendingInsightQuestion}
        focused={state.focusedTarget === "ask-observant"}
      />
      {latestAnswer && <LatestAnswerCard answer={latestAnswer} />}
      {state.insights.length ? (
        <div className="ss-list-grid">
          {state.insights.map((insight) => {
            const conversation = state.conversations.find((item) => item.id === insight.conversationId);
            const rowPerson = ssPersonForConversation(state, conversation);
            return (
              <button
                type="button"
                className={"ss-insight-card ss-card-action" + ssFocusClass(state, insight.id)}
                key={insight.id}
                onClick={() => navigate({ section: "people", conversationId: insight.conversationId, focusedTarget: "person-" + (rowPerson ? rowPerson.id : insight.conversationId) })}
              >
                <span>{insight.metric}</span>
                <h3>{insight.title}</h3>
                <p>{insight.detail}</p>
                <em>{insight.evidence}</em>
                <div>{insight.next}</div>
              </button>
            );
          })}
        </div>
      ) : latestAnswer ? null : (
        // No real answer and no insights yet → one clean line, never the verbose
        // no-evidence block (that lived in the guarded LatestAnswerCard stub).
        <p className="mut ss-answer-empty">No signal yet — set up a feedback source and answers will appear here as feedback comes in.</p>
      )}
    </div>
  );
}

async function ssBuildObservantAnswer(state, question) {
  let answer;
  if (ssWorkspaceIsCustom(state)) {
    const summary = {
      workspace: state.workspace,
      loops: state.loops.map((loop) => ({ id: loop.id, name: loop.name, question: loop.question, status: loop.status })),
      people: state.people.map((person) => ({ id: person.id, name: person.name, segment: person.segment, memory: person.memory, last: person.last })).slice(0, 8),
      events: state.events.slice(0, 8),
      insights: state.insights.slice(0, 6),
      conversations: state.conversations.slice(0, 6).map((conversation) => ({
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        messages: conversation.messages.slice(-4),
      })),
    };
    try {
      answer = await ssPostJson("/api/selfserve/answer", { question, summary });
    } catch (err) {
      answer = SelfServeData.cannedAnswer(state, question);
    }
  } else {
    answer = SelfServeData.cannedAnswer(state, question);
  }
  return answer && answer.answer ? answer : SelfServeData.cannedAnswer(state, question);
}

function LatestAnswerCard({ answer, onClick }) {
  // Render nothing unless this is a real answer — a missing answer, an object-valued
  // question ("[object Object]"), or the no-data/no-evidence stub all show nothing.
  if (!SelfServeData.answerIsReal(answer)) return null;
  const Wrapper = onClick ? "button" : "section";
  return (
    <Wrapper type={onClick ? "button" : undefined} className={onClick ? "ss-answer-card ss-card-action" : "ss-answer-card"} onClick={onClick}>
      <span className="eyebrow no-rule">Latest answer</span>
      <h3>{answer.question}</h3>
      <p>{answer.answer}</p>
      <em>{answer.evidence}</em>
      <div>{answer.recommendation}</div>
    </Wrapper>
  );
}

function ssDefaultIntroText(product) {
  return [
    "What got you using " + product + ", and what do you mainly use it for?",
    "What's your role, and the context you're using it in?",
    "How does it fit into your day — when and how often do you reach for it?",
    "What matters most to you about it, and what's felt frustrating lately?",
  ].join("\n");
}

function SettingsViewSS({ state, patchState, resetWorkspace }) {
  const updateWorkspace = (field, value) => {
    patchState((current) => ({ ...current, workspace: { ...current.workspace, [field]: value } }));
  };
  const product = SelfServeData.productName(state.workspace);
  const introText = state.workspace.introQuestions != null ? state.workspace.introQuestions : ssDefaultIntroText(product);
  return (
    <div className="ss-page-stack">
    <section className={"ss-panel ss-settings-panel" + ssFocusClass(state, "settings-workspace")}>
      <PanelTitle k="Settings" title="Workspace settings" status="Saved locally" />
      <Field label="Company or product name">
        <input className="input" value={state.workspace.companyName} onChange={(e) => updateWorkspace("companyName", e.target.value)} />
      </Field>
      <Field label="Founder name">
        <input className="input" value={state.workspace.founderName} onChange={(e) => updateWorkspace("founderName", e.target.value)} />
      </Field>
      <Field label="Work email">
        <input className="input" value={state.workspace.email} onChange={(e) => updateWorkspace("email", e.target.value)} />
      </Field>
      <Field label="Product URL">
        <input className="input" value={state.workspace.productUrl} onChange={(e) => updateWorkspace("productUrl", e.target.value)} />
      </Field>
      <Field label="Intro conversation — what should we learn about each new customer?" wide>
        <textarea className="textarea" value={introText} placeholder="One per line — the context the 10-minute intro gathers from each customer." onChange={(e) => updateWorkspace("introQuestions", e.target.value)} />
      </Field>
      <div className="ss-default-list">
        <div><b>Private lines</b><span>One-on-one with every person on the panel.</span></div>
        <div><b>Team updates</b><span>Weekly digest and urgent insight alerts.</span></div>
        <div><b>Agent handoffs</b><span>Insight deliverables can include PRD and MCP-ready context.</span></div>
      </div>
      <div className="ss-danger">
        <div>
          <b>Reset workspace</b>
          <span>Clears local state and returns to program setup.</span>
        </div>
        <Btn variant="ghost" onClick={resetWorkspace}>Reset workspace</Btn>
      </div>
      <div className="ss-danger">
        <div>
          <b>Log out</b>
          <span>Ends the session. "Get started" will ask you to log in, then set up again.</span>
        </div>
        <Btn variant="ghost" onClick={ssLogout}>Log out</Btn>
      </div>
    </section>
    <Integrations state={state} />
    </div>
  );
}

function AnswerProgressCard({ stageIndex }) {
  const activeIndex = Math.max(0, Math.min(stageIndex, SS_ANSWER_STAGES.length - 1));
  const width = ((activeIndex + 1) / SS_ANSWER_STAGES.length) * 100;
  const active = SS_ANSWER_STAGES[activeIndex];

  return (
    <div className="ss-progress-card ss-answer-progress" aria-live="polite">
      <div className="ss-progress-head">
        <div>
          <span className="eyebrow no-rule">Answer progress</span>
          <h3>{active.label}</h3>
        </div>
        <em>Working</em>
      </div>
      <div className="ss-progress-track"><span style={{ width: width + "%" }} /></div>
      <ol className="ss-progress-steps">
        {SS_ANSWER_STAGES.map((stage, index) => (
          <li key={stage.id} className={index < activeIndex ? "done" : index === activeIndex ? "on" : ""}>
            <span>{index < activeIndex ? "✓" : index + 1}</span>
            <div><b>{stage.label}</b><p>{stage.detail}</p></div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AskObservant({ state, patchState, autoQuestion, focused }) {
  const [question, setQuestion] = useStateSS(state.workspace.learningGoal);
  const [asking, setAsking] = useStateSS(false);
  const [progressStage, setProgressStage] = useStateSS(-1);
  const inputRef = useRefSS(null);
  const autoAskedRef = useRefSS("");

  const ask = async (overrideQuestion) => {
    const q = String(overrideQuestion !== undefined ? overrideQuestion : question).trim();
    if (!q || asking) return;
    setQuestion(q);
    setAsking(true);
    setProgressStage(0);
    patchState((current) => ({
      ...current,
      pendingInsightQuestion: current.pendingInsightQuestion === q ? "" : current.pendingInsightQuestion,
    }));

    const answerPromise = ssBuildObservantAnswer(state, q);
    for (let index = 0; index < SS_ANSWER_STAGES.length; index += 1) {
      setProgressStage(index);
      await ssWait(index === 0 ? 650 : 900);
    }
    const answer = await answerPromise;
    patchState((current) => ({
      ...current,
      pendingInsightQuestion: "",
      answers: [{ ...answer, id: answer.id || "answer-" + Date.now(), question: q }, ...(current.answers || [])],
      activity: ["Asked Observant: " + q, ...(current.activity || [])],
    }));
    setProgressStage(-1);
    setAsking(false);
  };

  useEffectSS(() => {
    const q = String(autoQuestion || "").trim();
    if (!q) {
      if (focused && inputRef.current) inputRef.current.focus();
      return;
    }
    if (autoAskedRef.current === q) return;
    autoAskedRef.current = q;
    ask(q);
  }, [autoQuestion]);

  useEffectSS(() => {
    if (focused && !asking && inputRef.current) inputRef.current.focus();
  }, [focused, asking]);

  return (
    <section className={"ss-panel" + (focused ? " is-focused" : "")}>
      <PanelTitle k="Ask Observant" title="Ask across what it has learned" status="Grounded" />
      <textarea ref={inputRef} className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} disabled={asking} />
      {asking && <AnswerProgressCard stageIndex={progressStage} />}
      <div className="ss-panel-actions">
        <Btn variant="primary" onClick={() => ask()} disabled={!question.trim() || asking}><Icon name="spark" size={15} /> {asking ? "Thinking" : "Ask Observant"}</Btn>
      </div>
    </section>
  );
}

function ConversationList({ state, conversations, compact, navigate }) {
  const items = conversations || state.conversations;
  return (
    <div className="ss-mini-lines">
      {items.map((conversation) => {
        const person = ssPersonForConversation(state, conversation);
        if (!person) return null;
        const openConversation = () => navigate && navigate({ section: "people", conversationId: conversation.id, focusedTarget: "person-" + person.id });
        const modeLabel = conversation.mode === "voice" ? "Voice interview · transcript" : "Chat";
        return (
          <PersonLine
            key={conversation.id}
            person={person}
            meta={compact ? modeLabel + " · " + person.surface : conversation.title}
            body={compact ? person.last : person.memory}
            compact={compact}
            focused={state.focusedTarget === "person-" + person.id}
            onClick={navigate ? openConversation : null}
          />
        );
      })}
    </div>
  );
}

function PersonLine({ person, meta, body, status, compact, card, selected, focused, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  const classes = [
    "ss-person-line",
    compact ? "compact" : "",
    card ? "card" : "",
    selected ? "on" : "",
    focused ? "is-focused" : "",
  ].filter(Boolean).join(" ");

  return (
    <Wrapper type={onClick ? "button" : undefined} className={classes} onClick={onClick}>
      <ProfileAvatar person={person} />
      <div className="ss-person-line-copy">
        <b>{person.name}</b>
        {meta && <span>{meta}</span>}
        {body && <p>{body}</p>}
      </div>
      {status && <em>{status}</em>}
    </Wrapper>
  );
}

function ProfileAvatar({ person }) {
  return <Avatar name={person.name} color={person.color} cls="ss-profile-avatar" />;
}

function EventList({ state, events, navigate }) {
  return (
    <div className="ss-event-list">
      {events.map((event) => {
        const conversationId = event.conversationId || ssFirstActiveConversationId(state);
        const conversation = state.conversations.find((item) => item.id === conversationId);
        const person = ssPersonForConversation(state, conversation);
        return (
          <button
            type="button"
            key={event.id}
            onClick={() => navigate({ section: "people", conversationId, focusedTarget: "person-" + (person ? person.id : conversationId) })}
          >
            <span>{event.time}</span>
            <b>{event.event}</b>
            <p>{event.user} - {event.detail}</p>
          </button>
        );
      })}
    </div>
  );
}

function Checklist({ readiness, launched }) {
  const items = [
    ["Create workspace", true],
    ["Define learning goal", true],
    ["Choose users", readiness.users],
    ["Connect surfaces", readiness.surfaces],
    ["Install events", readiness.events],
    ["Turn on learning mode", launched],
  ];
  return (
    <ol className="ss-checks">
      {items.map(([label, done], i) => (
        <li key={label} className={done ? "done" : ""}>
          <span>{done ? <Icon name="check" size={13} sw={2.4} /> : i + 1}</span>
          <b>{label}</b>
        </li>
      ))}
    </ol>
  );
}

function EmptyState({ icon, title, text, cta }) {
  return (
    <div className="ss-empty-state">
      {icon && <div className="ss-empty-icon"><Icon name={icon} size={20} /></div>}
      <b>{title}</b>
      <span>{text}</span>
      {cta && <button type="button" className="ss-empty-cta" onClick={cta.onClick}>{cta.label} <Icon name="arrow" size={14} /></button>}
    </div>
  );
}

function Field({ label, children, wide }) {
  return (
    <label className={wide ? "ss-field wide" : "ss-field"}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function PanelTitle({ k, title, status }) {
  return (
    <div className="ss-panel-title">
      <div>
        <span>{k}</span>
        <h2>{title}</h2>
      </div>
      {status && <em>{status}</em>}
    </div>
  );
}

function SelectCard({ active, icon, title, text, detail, onClick }) {
  return (
    <button type="button" className={active ? "ss-select-card on" : "ss-select-card"} onClick={onClick}>
      <span><Icon name={icon} size={18} /></span>
      <b>{title}</b>
      <p>{text}</p>
      <em>{detail}</em>
    </button>
  );
}

function ReadCard({ label, text }) {
  return (
    <div className="ss-read-card">
      <b>{label}</b>
      <p>{text}</p>
    </div>
  );
}

function SurfaceStatusCard({ active, icon, title, text }) {
  return (
    <article className={active ? "ss-surface-read-card on" : "ss-surface-read-card"}>
      <span><Icon name={icon} size={18} /></span>
      <b>{title}</b>
      <p>{text}</p>
      <em>{active ? "Enabled" : "Not enabled"}</em>
    </article>
  );
}

function SurfaceCard({ active, icon, title, text, product, onClick }) {
  return (
    <button type="button" className={active ? "ss-surface-card on" : "ss-surface-card"} onClick={onClick}>
      <span><Icon name={icon} size={18} /></span>
      <b>{title}</b>
      <p>{text}{product ? product + "." : ""}</p>
      <em className="ss-surface-toggle">
        {active ? <><Icon name="check" size={13} sw={2.8} /> Enabled</> : "Tap to enable"}
      </em>
    </button>
  );
}

function CodeBlock({ label, text, copied, onCopy }) {
  return (
    <div className="ss-code-block">
      <div>
        <span>{label}</span>
        <button type="button" onClick={onCopy}>{copied ? "Copied" : "Copy"}</button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

function Metric({ n, l, onClick }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper type={onClick ? "button" : undefined} className={onClick ? "ss-metric ss-card-action" : "ss-metric"} onClick={onClick}>
      <b>{n}</b>
      <span>{l}</span>
    </Wrapper>
  );
}

function ChatMessage({ message }) {
  return (
    <div className={"ss-chat-msg " + message.t}>
      <div>{message.text}</div>
      <span>{message.meta}</span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<SelfServeApp />);
