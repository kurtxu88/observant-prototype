/* ============================================================
   OBSERVANT self-serve SaaS prototype
   ============================================================ */
const { useState: useStateSS, useEffect: useEffectSS, useRef: useRefSS } = React;

const SS_SECTIONS = [
  { id: "home", label: "Home", icon: "grid" },
  { id: "learning", label: "Loop history", icon: "chat" },
  { id: "people", label: "Feedback partners", icon: "users" },
  { id: "insights", label: "Insights", icon: "book" },
  { id: "settings", label: "Settings", icon: "settings" },
];

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

// ── In-product connect (GitHub import → scan → install PR) ───────────────────
// Modeled screen-for-screen on the Novus-by-Pendo flow, but the scan is looking
// for the MOMENTS WORTH INTERVIEWING (the why), not just instrumentation points.
// Simulated against a synthetic repo — no real OAuth / codegen in the prototype.
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
  { k: "Analytics", v: "None found — Observant will instrument the triggers it needs" },
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

function ssLoadState() {
  try {
    const raw = localStorage.getItem(SS_STORAGE_KEY);
    return raw ? SelfServeData.normalizeState(JSON.parse(raw)) : null;
  } catch (err) {
    return null;
  }
}

function ssSaveState(state) {
  if (!state) return;
  localStorage.setItem(SS_STORAGE_KEY, JSON.stringify(state));
}

function ssRemoveState() {
  localStorage.removeItem(SS_STORAGE_KEY);
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

// Deep links: /setup always lands on onboarding (clears a launched workspace,
// keeps an in-progress one); /portal always lands on the dashboard (sample
// workspace auto-created if none exists yet).
const SS_VIEW = (() => {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("/setup")) return "setup";
  if (path.endsWith("/portal")) return "portal";
  return "";
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
      if (saved && saved.launched) { ssRemoveState(); return null; }
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

  useEffectSS(() => {
    if (state) ssSaveState(state);
  }, [state]);

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
// Path-aware progress: in-product (default) installs the snippet; off-product runs the
// invite/compensation program. The first two steps (Product, Context) are shared.
const SS_FLOW_INPRODUCT = [
  { id: "product", label: "Product" },
  { id: "context", label: "Context" },
  { id: "install", label: "Install" },
  { id: "review", label: "Review" },
];
const SS_FLOW_OFFPRODUCT = [
  { id: "product", label: "Product" },
  { id: "context", label: "Context" },
  { id: "channel", label: "Channel" },
  { id: "program", label: "Program" },
  { id: "review", label: "Review" },
];
const SS_ONBOARD_FLOW = SS_FLOW_INPRODUCT; // default (Product/Context wizard)

function OnboardingBar({ current, flow = SS_ONBOARD_FLOW }) {
  return (
    <ol className="ss-onboard-bar" aria-label="Setup progress">
      {flow.map((s, i) => (
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
function OnboardingWizard({ initial, startStep, onSubmit, onExit, onSample, onLogin }) {
  const editing = !!initial;
  const [form, setForm] = useStateSS(() => editing ? { ...SS_EMPTY_WORKSPACE_FORM, ...initial } : { ...SS_EMPTY_WORKSPACE_FORM });
  const [step, setStep] = useStateSS(startStep || 0); // 0 product, 1 context
  const [drafting, setDrafting] = useStateSS(false);
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

  const submit = () => onSubmit(form, editing ? null : { name: form.founderName, email: form.email });

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
        <OnboardingBar current={step} />

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
              <Field label="Company or product name">
                <input className="input" value={form.companyName} placeholder="Your product" onChange={(e) => update("companyName", e.target.value)} />
              </Field>
              <Field label="Product URL">
                <input className="input" value={form.productUrl} placeholder="https://yourproduct.com" onChange={(e) => update("productUrl", e.target.value)} onBlur={() => { if (form.productUrl.trim() && !form.productDescription.trim()) draftFromSite(); }} />
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
                : <Btn variant="ghost" size="lg" onClick={() => { setForm({ ...SS_EMPTY_WORKSPACE_FORM, ...SS_DEFAULT_WORKSPACE }); setStep(0); }}>Use the sample workspace</Btn>}
            </div>
            {!editing && <p className="ss-fineprint">Already have an account? <button type="button" className="ss-linklike" onClick={onLogin}>Log in</button>. Demo — no password.</p>}
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

// Header copy per activation step, keyed by the computed step id (path-aware).
const SS_STEP_META = {
  surface_in: { t: "Install Observant in your app", d: "Connect your repo — one PR and it watches + researches on its own." },
  surface_off: { t: "Invite your users", d: "Off-product channels — a magic link to the users you already have." },
  program: { t: "Set up the program", d: "Compensation and your invitation." },
  review: { t: "Review & launch", d: "Check it, then go live." },
};

const SS_CONNECT_OPTIONS = [
  { id: "share", icon: "link", title: "Share a list or invite link", text: "Give Observant emails, a segment, or an invite link. The lightest way to start — nothing to install.", tag: "Easiest" },
  { id: "inproduct", icon: "globe", title: "Connect inside your product", text: "Observant loads with a hashed user ID you pass it, so it always knows who it's talking to — without ever holding your real user data.", tag: "One-time setup" },
];

function ActivationScreen({ state, patchState, onLaunch, resetWorkspace, onBackToProduct }) {
  const product = SelfServeData.productName(state.workspace);
  const setup = state.setup;
  const [step, setStep] = useStateSS(0);
  const [linkCopied, setLinkCopied] = useStateSS(false);
  const [inviteCopied, setInviteCopied] = useStateSS(false);
  const [linkGenerated, setLinkGenerated] = useStateSS(false);
  const [sendPreviewOpen, setSendPreviewOpen] = useStateSS(false);
  const [previewEmail, setPreviewEmail] = useStateSS(state.workspace.email || "");
  const [previewSentTo, setPreviewSentTo] = useStateSS("");
  const [previewSending, setPreviewSending] = useStateSS(false);
  const [previewErr, setPreviewErr] = useStateSS("");

  const patchSetup = (patch) => patchState((current) => ({ ...current, setup: { ...current.setup, ...patch } }));
  const setAudience = (id) => patchSetup({ audienceMode: id });
  const setRecruit = (id) => patchSetup({ recruitMode: id });
  const setConnect = (id) => patchSetup({ connectMode: id });
  const route = setup.route || "inproduct";
  const setRoute = (id) => { patchSetup({ route: id }); setStep(0); };
  // Path-aware steps: in-product installs the snippet (no program/invite); off-product
  // runs the compensation program + magic-link invite.
  const stepIds = route === "inproduct" ? ["surface", "review"] : ["surface", "program", "review"];
  const curId = stepIds[Math.min(step, stepIds.length - 1)];
  const onboardFlow = route === "inproduct" ? SS_FLOW_INPRODUCT : SS_FLOW_OFFPRODUCT;
  const stepMeta = curId === "surface" ? (route === "inproduct" ? SS_STEP_META.surface_in : SS_STEP_META.surface_off) : SS_STEP_META[curId];

  const surfaceSummary = SS_FAST_CHANNELS.map(ssSurfaceLabel).join(" · ");
  // The link is real wherever the app is served (localhost dev server and the
  // Vercel deploy both rewrite /join/:slug) — observant.link later just points here.
  const productSlug = product.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const magicLink = window.location.host + "/join/" + productSlug;
  const joinUrl = "/join/" + productSlug + "?route=" + route;
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
    route === "inproduct"
      ? "From time to time you'll have a quick one-on-one: a couple of messages, sometimes a short voice chat — right inside " + product + ", while you're using it. You earn rewards for every minute you participate, tracked automatically."
      : "From time to time you'll have a quick one-on-one: a couple of messages, sometimes a short voice chat. You choose where it reaches you — " + channelPhrase + " — and you earn rewards for every minute you participate, tracked automatically.",
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
  // Surface-route changes rewrite the invitation, so the copy always matches the setup.
  useEffectSS(() => { setInviteDraft(inviteText); }, [route, product]);
  async function sendInvitePreview() {
    if (!previewEmail.includes("@") || previewSending) return;
    setPreviewSending(true); setPreviewErr("");
    try {
      const r = await ssPostJson("/api/selfserve/send-invite", { toEmail: previewEmail, product, body: inviteDraft, joinUrl: window.location.origin + "/join/" + productSlug + "?route=" + route });
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

  const next = () => setStep((s) => Math.min(s + 1, stepIds.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="ss-activation">
      <header className="ss-activation-top">
        <Wordmark size="1.45rem" />
        <div className="ss-top-right">
          <span>{product}</span>
          <button type="button" onClick={resetWorkspace}>Start over</button>
        </div>
      </header>

      <div className="ss-activation-bar"><OnboardingBar current={2 + step} flow={onboardFlow} /></div>

      <div className="ss-activation-wrap">
        <aside className="ss-checklist">
          <span className="eyebrow">Getting started</span>
          <h1>{stepMeta ? stepMeta.t : "Set up Observant."}</h1>
          <p>{stepMeta ? stepMeta.d : ""} Observant starts talking to your users one-on-one — following up in the moment and surfacing what matters, while you ship.</p>
        </aside>

        <main className="ss-activation-main">
          {curId === "surface" && (
            <section className="ss-panel">
              <PanelTitle k="Step 3" title="How does Observant reach your users?" status={route === "inproduct" ? "In-product" : "Off-product"} />
              <p className="ss-step-lead"><b>The default is in-product</b> — install one snippet and Observant watches and researches on its own. Prefer to reach the users you already have over email or Telegram? Switch to off-product.</p>
              <div className="ss-route-grid">
                <button type="button" className={"ss-route" + (route === "inproduct" ? " on" : "")} onClick={() => setRoute("inproduct")}>
                  <span className="ss-route-head"><span className="ss-route-radio" /><b>In-product</b><em className="ss-route-tag pro">Recommended</em></span>
                  <p>Observant lives inside your app and catches people at the exact moment of use — the richest surface. <b>Install one snippet; it watches and researches on its own.</b></p>
                  <small>Small feedback flows freely in-app. Only longer 1:1s ask the user's consent and reward their time.</small>
                </button>
                <button type="button" className={"ss-route" + (route === "offproduct" ? " on" : "")} onClick={() => setRoute("offproduct")}>
                  <span className="ss-route-head"><span className="ss-route-radio" /><b>Off-product channels</b><em className="ss-route-tag start">No code</em></span>
                  <p>No install. You share one magic link, and <b>each user chooses how to be reached — email or Telegram</b> — when they opt in. Their identifier arrives with that choice; you never hand over user data.</p>
                  <small>Invite your existing users into a compensated feedback program.</small>
                </button>
              </div>
              {route === "inproduct" && (
                <>
                  <InProductConnect product={product} patchSetup={patchSetup} connected={!!setup.connected} />
                  <InProductIncentive product={product} setup={setup} patchSetup={patchSetup} />
                </>
              )}
            </section>
          )}

          {curId === "program" && (
            <section className="ss-panel">
              <PanelTitle k="Step 4" title="How the program works" status="You set the terms" />
              <p className="ss-step-lead">Observant handles the logistics. You set the terms once, and can change them anytime.</p>
              <div className="ss-program-block">
                <h3><span className="ss-substep">1</span> Compensation</h3>
                <p>People earn by <b>participated minutes</b> — every text reply, voice chat, and call counts. <b>Observant measures and audits every minute for you.</b> You pay Observant, we pay your participants, and they redeem as they go — like spending down a gift card balance.</p>

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
            </section>
          )}

          {curId === "review" && route === "inproduct" && (
            <section className="ss-panel">
              <PanelTitle k="Step 4" title="Review & launch" status={setup.connected ? "Installed ✓" : "Last step"} />
              <p className="ss-step-lead">{setup.connected ? "The snippet is merged — Observant is ready to watch and run 1:1s on its own." : "Finish merging the install PR in the previous step to go live. You can still open your dashboard to look around."}</p>
              <div className="ss-review">
                <ReviewRowSS k="Product" v={product} sub={state.workspace.productDescription} />
                <ReviewRowSS k="How it reaches users" v={setup.connected ? "In-product — snippet installed" : "In-product — snippet pending merge"} sub="Observant watches your product and starts 1:1s at the moments it finds — no invite to send." />
                <ReviewRowSS
                  k="Incentives"
                  v="Pay only for the deep ones"
                  sub={<>
                    <span className="ss-review-tier">Small, in-the-moment feedback flows freely — no opt-in, no cost.</span>
                    <span className="ss-review-tier">Longer ~10-min 1:1s ask the user's consent and reward their time at ${setup.rate || 2}/min ≈ ${Math.round(10 * (setup.rate || 2))}.</span>
                  </>}
                />
                <ReviewRowSS k="Research questions" v={state.workspace.learningGoal || "None yet — that's fine"} sub="Users never see these. Feed in new questions anytime — Observant weaves them into the in-product 1:1s." />
              </div>
              <div className="ss-program-block">
                <h3>{setup.connected ? "You're ready" : "Go live"}</h3>
                <p>{setup.connected ? "Observant is installed in " + product + ". Open your dashboard to watch insights — and agent-ready fixes — land as it learns." : "Once the snippet is merged, Observant starts on its own. Open your dashboard to look around in the meantime."}</p>
                <div className="ss-golive-actions">
                  <Btn variant="primary" size="lg" onClick={onLaunch}>Open your dashboard <Icon name="arrow" size={16} /></Btn>
                </div>
              </div>
            </section>
          )}

          {curId === "review" && route !== "inproduct" && (
            <section className="ss-panel">
              <PanelTitle k="Step 5" title="Preview" status="Last step" />
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
                  sub="The text you wrote in the program step — we'll email you a preview, exactly as your users receive it."
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
                    <p>The magic link is an invitation to join your feedback program — it's where users read about the details and rewards, and decide if they want to opt in. Once they opt in, {route === "inproduct" ? "the conversations find them right inside " + product : "they choose their preferred way of being contacted"} — and you can preview the whole experience once you generate your link.</p>
                    <div className="ss-golive-actions">
                      <Btn variant="primary" size="lg" onClick={() => setLinkGenerated(true)}><Icon name="spark" size={16} /> Generate my magic link</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Live and ready — drop it into your invitation where the placeholder sits, and send. Replies start flowing as people opt in, and <b>you're only charged by the responses you gather</b>.</p>
                    <div className="ss-magiclink">
                      <a className="ss-magiclink-open" href={joinUrl} target="_blank" rel="noreferrer"><code>{magicLink}</code></a>
                      <button type="button" className="ss-magiclink-copy" onClick={copyLink}>{linkCopied ? "Copied ✓" : "Copy link"}</button>
                    </div>
                    <div className="ss-golive-actions">
                      <Btn variant="ghost" onClick={onLaunch}>Open your dashboard <Icon name="arrow" size={16} /></Btn>
                    </div>
                  </>
                )}
              </div>

              <div className="ss-program-block ss-suggest">
                <span className="ss-suggest-badge">Our suggestions</span>
                <h3>Who to send it to</h3>
                <p>When you're thinking about who to send the magic link to — who you're inviting into your feedback program — here are a few ways to think about your first batch, if you want them. Keep in mind: usually <b>5–10% of those you invite opt in</b>, and they tend to be your most engaged.</p>
                <div className="ss-advice-block">
                  {SS_AUDIENCE_OPTIONS.map((opt) => (
                    <div className="ss-advice-item" key={opt.id}>
                      <span className="ss-advice-ic"><Icon name="users" size={15} /></span>
                      <div><b>{opt.label}{opt.tag && <em className="ss-advice-tag">{opt.tag}</em>}</b><p>{opt.text}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="ss-onboard-nav">
            {step > 0
              ? <Btn variant="ghost" onClick={back}><Icon name="back" size={16} /> Back</Btn>
              : (onBackToProduct ? <Btn variant="ghost" onClick={onBackToProduct}><Icon name="back" size={16} /> Back</Btn> : <span />)}
            <span className="count">{"Step " + (step + 3) + " of " + onboardFlow.length}</span>
            {step < stepIds.length - 1
              ? <Btn variant="primary" onClick={next}>Continue <Icon name="arrow" size={16} /></Btn>
              : <span />}
          </div>
        </main>
      </div>
    </div>
  );
}

// In-product: install one snippet, and Observant watches + researches on its own.
// Three screens, modeled on Novus: Connect GitHub → Scan (live reasoning) → Install PR.
function InProductConnect({ product, patchSetup, connected }) {
  const [phase, setPhase] = useStateSS(connected ? "installed" : "connect");
  const [scanIdx, setScanIdx] = useStateSS(0);
  const [merged, setMerged] = useStateSS(connected);
  const pr = ssInstallPR(product);

  useEffectSS(() => {
    if (phase !== "scanning") return undefined;
    if (scanIdx >= SS_SCAN_STEPS.length) {
      const t = setTimeout(() => setPhase("scanned"), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setScanIdx((i) => i + 1), 850);
    return () => clearTimeout(t);
  }, [phase, scanIdx]);

  const detectedShown = SS_SCAN_DETECTED.slice(0, Math.min(SS_SCAN_DETECTED.length, scanIdx));
  const mergePR = () => { setMerged(true); setPhase("installed"); if (patchSetup) patchSetup({ connected: true, route: "inproduct" }); };

  if (phase === "installed") {
    return (
      <section className="ss-connect ss-connect-done">
        <div className="ss-connect-livehead">
          <span className="ss-connect-dot" />
          <div><b>Observant is live in {product}.</b><p>The snippet is merged. From here it watches for the moments below and starts 1:1s on its own — feedback and agent-ready fixes land in your workspace. Nothing else to set up.</p></div>
        </div>
        <div className="ss-trigger-grid">
          {SS_SCAN_TRIGGERS.map((t) => (
            <div className="ss-trigger" key={t.moment}>
              <b>{t.moment}</b><span className="ss-trigger-when">{t.detail}</span><em>{t.why}</em>
            </div>
          ))}
        </div>
        <small className="ss-connect-foot">Watching live · triggers tune themselves as data builds. Off-product email / Telegram still works alongside this.</small>
      </section>
    );
  }

  return (
    <section className="ss-connect">
      {phase === "connect" && (
        <div className="ss-connect-stage">
          <PanelTitle k="In-product" title="Connect & scan your codebase" status="~2 min · one PR" />
          <p className="ss-step-lead">Install one snippet and Observant watches your product, finds the moments worth a conversation, and runs the 1:1s itself. Start by connecting the repo so it can read your flows and open the install PR.</p>
          <div className="ss-repo-row">
            <Icon name="grid" size={15} /><code>{SS_CONNECT_REPO.owner}/{SS_CONNECT_REPO.name}</code><span className="ss-repo-branch">{SS_CONNECT_REPO.branch}</span>
          </div>
          <div className="ss-golive-actions">
            <Btn variant="primary" size="lg" onClick={() => { setScanIdx(0); setPhase("scanning"); }}><Icon name="grid" size={16} /> Sign in with GitHub</Btn>
          </div>
          <small className="ss-connect-foot">Read-only on your code + permission to open one pull request. No write access to anything but the install PR — which you review before merging.</small>
        </div>
      )}

      {(phase === "scanning" || phase === "scanned") && (
        <div className="ss-connect-stage">
          <PanelTitle k="In-product" title={phase === "scanned" ? "Your product map is ready" : "Observant is reading your product…"} status={phase === "scanned" ? "Scan complete" : "Scanning"} />
          <div className="ss-scan-grid">
            <div className="ss-scan-reason">
              <span className="ss-scan-reason-h">Reasoning · {Math.min(scanIdx, SS_SCAN_STEPS.length)}/{SS_SCAN_STEPS.length} steps</span>
              {SS_SCAN_STEPS.slice(0, scanIdx).map((s, i) => (
                <div className="ss-scan-step" key={i}>
                  <code className="ss-scan-tool">{s.tool}</code>
                  <div className="ss-scan-step-body">
                    <span className="ss-scan-cmd">{s.cmd}</span>
                    <span className="ss-scan-out">{s.out}</span>
                    <span className="ss-scan-concl"><Icon name="check" size={11} sw={2.6} /> {s.concl}</span>
                  </div>
                </div>
              ))}
              {phase === "scanning" && scanIdx < SS_SCAN_STEPS.length && <div className="ss-scan-step ss-scan-working"><span className="ss-scan-spinner" /> working…</div>}
            </div>
            <div className="ss-scan-map">
              <span className="ss-scan-map-h">What Observant learned</span>
              {detectedShown.map((d) => (
                <div className="ss-scan-fact" key={d.k}><Icon name="check" size={12} sw={2.6} /><b>{d.k}</b><span>{d.v}</span></div>
              ))}
              {phase === "scanned" && (
                <>
                  <span className="ss-scan-map-h" style={{ marginTop: 14 }}>Moments worth interviewing</span>
                  {SS_SCAN_TRIGGERS.map((t) => <div className="ss-scan-fact ss-scan-moment" key={t.moment}><Icon name="spark" size={12} /><b>{t.moment}</b><span>{t.detail}</span></div>)}
                </>
              )}
            </div>
          </div>
          {phase === "scanned" && (
            <div className="ss-golive-actions">
              <Btn variant="primary" size="lg" onClick={() => setPhase("install")}><Icon name="arrow" size={16} /> Go live with a single PR</Btn>
            </div>
          )}
        </div>
      )}

      {phase === "install" && (
        <div className="ss-connect-stage">
          <PanelTitle k="In-product" title="Go live with a single PR" status="Review & merge" />
          <p className="ss-step-lead">Observant wrote the install as one pull request. Review it like any other PR — merge when you're happy and it's live.</p>
          <div className="ss-pr">
            <div className="ss-pr-head"><Icon name="grid" size={14} /><b>{pr.title}</b><span className="ss-pr-branch">{pr.branch} → {SS_CONNECT_REPO.branch}</span></div>
            <p className="ss-pr-body">{pr.body}</p>
            {pr.files.map((f) => (
              <div className="ss-pr-file" key={f.path}>
                <span className="ss-pr-path">{f.path}</span>
                {f.add.map((line, i) => <div className="ss-pr-add" key={i}><span>+</span><code>{line}</code></div>)}
              </div>
            ))}
            <div className="ss-pr-caveat"><b>Heads up — what it did not wire, and why</b><p>{pr.caveat}</p></div>
          </div>
          <div className="ss-golive-actions">
            <Btn variant="primary" size="lg" onClick={mergePR}><Icon name="check" size={16} /> Merge PR — go live</Btn>
          </div>
        </div>
      )}
    </section>
  );
}

// In-product incentive model: small feedback is free-flowing; only longer 1:1s ask
// consent + reward. (The user-facing consent prompt itself ships later, in the
// conversation flow — this is the founder-side setup of the model.)
function InProductIncentive({ product, setup, patchSetup }) {
  const rate = setup.rate || 2;
  return (
    <section className="ss-incentive">
      <PanelTitle k="Incentives" title="You only pay for the deep ones" status="In-product" />
      <p className="ss-step-lead">In-product, most learning is small and in-the-moment — so the incentive model is different from a classic paid panel.</p>
      <div className="ss-incentive-grid">
        <article className="ss-incentive-card free">
          <em className="ss-incentive-tag">Fragmented · in-the-moment</em>
          <b>Small feedback flows freely</b>
          <p>A tap, a reaction, a sentence while someone's using {product}. No opt-in, nothing to manage — it just happens in-app, and costs you nothing.</p>
        </article>
        <article className="ss-incentive-card paid">
          <em className="ss-incentive-tag">Longer · ~10-min 1:1</em>
          <b>Deep interviews ask consent + reward</b>
          <p>When Observant wants real time from someone, it asks their consent first and rewards their time. You only pay for these.</p>
          <div className="ss-incentive-rate">
            <span className="ss-rate-input">$ <input className="input" type="number" min="0.25" step="0.25" value={rate} onChange={(e) => patchSetup({ rate: Math.max(0.25, Number(e.target.value) || 2) })} /> / min</span>
            <b>10-min 1:1 ≈ ${Math.round(10 * rate)}</b>
          </div>
        </article>
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
  const EXTRA_SECTIONS = { context: "Context", compose: "Send a new loop" }; // non-nav pages
  const section = (SS_SECTIONS.some((item) => item.id === state.section) || EXTRA_SECTIONS[state.section]) ? state.section : "home";
  const product = SelfServeData.productName(state.workspace);
  const firstLoopId = state.selectedLoopId || (state.loops[0] ? state.loops[0].id : "");
  const [slackConnected, setSlackConnected] = useStateSS(false);
  const [navStack, setNavStack] = useStateSS([]);

  const navigate = ({ section: nextSection, conversationId, loopId, focusedTarget, pendingInsightQuestion }) => {
    // remember where we are so any in-app jump is reversible
    setNavStack((st) => st.concat([{
      section: state.section, selectedConversationId: state.selectedConversationId,
      selectedLoopId: state.selectedLoopId, focusedTarget: state.focusedTarget,
    }]).slice(-25));
    patchState((current) => ({
      ...current,
      section: nextSection || current.section || "home",
      selectedConversationId: conversationId || current.selectedConversationId,
      selectedLoopId: loopId || current.selectedLoopId,
      focusedTarget: focusedTarget || "",
      pendingInsightQuestion: pendingInsightQuestion !== undefined ? pendingInsightQuestion : current.pendingInsightQuestion,
    }));
  };

  const goBack = () => {
    setNavStack((st) => {
      if (!st.length) return st;
      const prev = st[st.length - 1];
      patchState((current) => ({
        ...current,
        section: prev.section || "home",
        selectedConversationId: prev.selectedConversationId,
        selectedLoopId: prev.selectedLoopId,
        focusedTarget: prev.focusedTarget || "",
      }));
      return st.slice(0, -1);
    });
  };

  return (
    <div className="ss-shell">
      <aside className="ss-sidebar">
        <button type="button" className="ss-sidebar-brand" onClick={() => navigate({ section: "home" })} aria-label="Go to Home">
          <Wordmark size="1.45rem" />
        </button>
        <button type="button" className="ss-ask-cta" onClick={() => navigate({ section: "compose" })}>
          <Icon name="spark" size={16} /> Send a new loop
        </button>
        <nav className="ss-nav">
          {SS_SECTIONS.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? "on" : ""} onClick={() => navigate({ section: item.id })}>
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "people" && <em>{state.people.length}</em>}
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
              <h1>{(SS_SECTIONS.find((s) => s.id === section) || {}).label || EXTRA_SECTIONS[section] || "Home"}</h1>
            </div>
          </div>
          <div className="ss-topbar-actions">
            <button type="button" className="ss-linklike" onClick={ssLogout} style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}><Icon name="back" size={14} /> Log out</button>
          </div>
        </header>

        <main className="ss-app-content">
          {section === "home" && <HomeView state={state} patchState={patchState} navigate={navigate} />}
          {section === "learning" && <LearningView state={state} patchState={patchState} navigate={navigate} copied={copied} copyText={copyText} />}
          {section === "people" && <PeopleView state={state} patchState={patchState} navigate={navigate} />}
          {section === "insights" && <InsightsView state={state} patchState={patchState} navigate={navigate} />}
          {section === "compose" && <div className="ss-page-stack"><AskPanel product={product} state={state} patchState={patchState} navigate={navigate} /></div>}
          {section === "context" && <ContextView state={state} patchState={patchState} />}
          {section === "settings" && <SettingsViewSS state={state} patchState={patchState} resetWorkspace={resetWorkspace} />}
        </main>
      </div>
    </div>
  );
}

function HomeView({ state, patchState, navigate }) {
  const readiness = SelfServeData.readiness(state.setup);
  const product = SelfServeData.productName(state.workspace);
  const latestAnswer = state.answers[0];
  const activeConversationId = ssFirstActiveConversationId(state);
  const activePerson = ssPersonForConversation(state, state.conversations.find((item) => item.id === activeConversationId));
  const custom = ssWorkspaceIsCustom(state);

  return (
    <div className="ss-page-stack">
      <section className="ss-hero-status">
        <div>
          <span className="eyebrow no-rule">Always on</span>
          <h2>{custom && !state.loops.length ? "Your panel is live." : "Learning mode is on."}</h2>
          <p>{custom && !state.loops.length ? "Observant is opening one-on-one lines with the users who opted in for " + product + ". Ask them anything, anytime — it keeps learning automatically." : "Observant is keeping one-on-one lines open with your users and bringing what it learns back to " + product + " while you ship."}</p>
        </div>
        <div className="ss-hero-metrics">
          <Metric n={String(state.people.length)} l="feedback partners" onClick={() => navigate({ section: "people" })} />
          <Metric n={String(state.conversations.length)} l="active 1:1 conversations" onClick={() => navigate({ section: "people", conversationId: activeConversationId, focusedTarget: "person-" + (activePerson ? activePerson.id : activeConversationId) })} />
          <Metric n={String(readiness.connectedSurfaces)} l="channels open" onClick={() => navigate({ section: "learning" })} />
        </div>
      </section>

      <WeeklyDigest state={state} navigate={navigate} />

      {custom && !state.loops.length && (
        <section className="ss-panel ss-start-panel">
          <PanelTitle k="Next" title="Send a new loop" status="Ready" />
          <p>Your people are already on a continuous one-on-one line. Ask anything you're curious about and watch their answers and the insight arrive in stages.</p>
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={() => navigate({ section: "compose" })}><Icon name="spark" size={15} /> Send a new loop</Btn>
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

      {/* 2 — Recently opened chats */}
      <section className="ss-panel">
        <PanelTitle k="Now" title="Recently opened chats" status={state.conversations.length ? "Live" : "Quiet"} />
        {state.conversations.length ? <ConversationList state={state} compact navigate={navigate} /> : <EmptyState title="No lines yet" text="Ask a question and Observant opens 1:1 lines with your panel." />}
      </section>

      {/* 3 — Question activity history */}
      <QuestionHistory state={state} />

      <div className="ss-dashboard-grid">
        <HomeAskEntry navigate={navigate} />
      </div>
    </div>
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

      {/* ── STEP 3 · TEST ── */}
      {page === 2 && tri && (
        <div className="ss-step-block">
          <span className="ss-step-tag">Step 3 · See it as your users do</span>
          {channel === "email" ? (
            <>
              <p className="ss-result-help">Send yourself a test {isDeep ? "invitation" : "email"} to experience exactly what your users receive.</p>
              <div className="ss-send-row">
                <input className="input" type="email" value={testEmail} placeholder="you@example.com" onChange={(e) => setTestEmail(e.target.value)} />
                <Btn variant="primary" onClick={sendTest} disabled={sending || !testEmail.includes("@")}><Icon name="mail" size={15} /> {sending ? "Sending…" : "Send test email"}</Btn>
              </div>
            </>
          ) : (
            <p className="ss-result-help">Telegram delivery comes with the bot integration — switch to <b>Email</b> to send a real test now.</p>
          )}
          {result && result.ok && <p className="ss-sent-note" style={{ color: "#2e7d46" }}><Icon name="check" size={15} sw={2.4} /> Sent to {result.to} — check your inbox. In a live program, replies flow back to your dashboard.</p>}
          {result && !result.ok && result.needKey && <p className="ss-result-help" style={{ color: "#b07a1e" }}>Composed ✓ — no email provider connected yet. Add <code>RESEND_API_KEY</code> to send for real.</p>}
          {result && !result.ok && !result.needKey && <p className="ss-result-help" style={{ color: "#b4291f" }}>{result.error}</p>}
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

function LearningView({ state, patchState, navigate }) {
  const product = SelfServeData.productName(state.workspace);
  const custom = ssWorkspaceIsCustom(state);
  const [question, setQuestion] = useStateSS("");
  const activeRun = (state.loopRuns || []).find((run) => run.status === "generating" || run.status === "collecting");
  const stageLabel = activeRun
    ? (activeRun.status === "generating"
      ? SS_SIMULATION_STAGES[0].label
      : ((activeRun.timeline || SS_SIMULATION_STAGES)[Math.max(0, activeRun.stageIndex)] || {}).label || "Sending it out")
    : "";

  const startLoop = async (config) => {
    const runId = SelfServeData.makeRunId();
    const loop = SelfServeData.createCustomLoop(state.workspace, config, runId);
    const loopRun = SelfServeData.createLoopRun(runId, loop, config);
    patchState((current) => ({
      ...current,
      selectedLoopId: loop.id,
      loops: [loop, ...current.loops],
      loopRuns: [loopRun, ...current.loopRuns],
      activity: ["Question created: " + loop.name + ".", ...current.activity],
    }));

    let simulation;
    try {
      simulation = await ssPostJson("/api/selfserve/simulate", {
        runId,
        workspace: state.workspace,
        loopConfig: config,
      });
    } catch (err) {
      simulation = SelfServeData.fallbackSimulation(state.workspace, config, runId);
    }

    const normalized = {
      ...simulation,
      runId,
      fallback: !!simulation.fallback,
      loop: { ...loop, ...(simulation.loop || {}), id: loop.id },
      timeline: simulation.timeline || SS_SIMULATION_STAGES,
    };

    patchState((current) => {
      const withSimulation = {
        ...current,
        simulationRuns: [normalized, ...current.simulationRuns.filter((run) => run.runId !== runId)],
        loopRuns: current.loopRuns.map((run) => run.runId === runId ? {
          ...run,
          status: "collecting",
          generatedAt: normalized.generatedAt || new Date().toISOString(),
          timeline: normalized.timeline,
          fallback: !!normalized.fallback,
        } : run),
      };
      return SelfServeData.revealSimulation(withSimulation, runId, 0);
    });
  };

  const submit = () => {
    const q = question.trim();
    if (!q || activeRun) return;
    const activeSurfaces = Object.keys(state.setup.surfaces).filter((surface) => state.setup.surfaces[surface]);
    setQuestion("");
    startLoop({
      name: q.length > 44 ? q.slice(0, 42) + "…" : q,
      question: q,
      // Everyone on the always-on panel — no per-question sampling.
      groupIds: ["power-users", "new-signups", "evaluators"],
      surfaceIds: activeSurfaces.length ? activeSurfaces : ["email"],
      signalIds: [],
    });
  };

  return (
    <div className="ss-page-stack">
      <div className="ss-activity-head">
        <div><span className="eyebrow no-rule">Loop history</span><h2 style={{ margin: "2px 0 0" }}>Loops you've sent</h2></div>
        <Btn variant="primary" onClick={() => navigate({ section: "compose" })}><Icon name="spark" size={15} /> Send a new loop</Btn>
      </div>
      <QuestionHistory state={state} />
    </div>
  );
}

function QuestionHistory({ state }) {
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
      ) : <EmptyState title="No questions yet" text="Ask your panel anything — every question your team asks lands here." />}
    </section>
  );
}

function PeopleView({ state, patchState }) {
  const selected = state.conversations.find((c) => c.id === state.selectedConversationId) || state.conversations[0];
  const person = ssPersonForConversation(state, selected);
  const [followUpOpen, setFollowUpOpen] = useStateSS(false);
  const [followUpQ, setFollowUpQ] = useStateSS("");
  const [followUpStage, setFollowUpStage] = useStateSS("");
  const [modeTab, setModeTab] = useStateSS("chat");

  if (!selected || !person) {
    return (
      <section className="ss-panel">
        <PanelTitle k="Partners" title="Your feedback partners" status="No lines" />
        <p className="mut">No lines are open yet.</p>
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
      section: "people",
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
            <p>{person.segment} · {person.surface}</p>
          </div>
          <span className="ss-via">via Observant over {person.surface}</span>
        </div>
        <p className="ss-relay-note">This isn't a direct message thread — Observant's interviewer holds this line with {person.name.split(" ")[0]} over {person.surface} and relays what your team needs.</p>
        <PartnerMemory person={person} />
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
          <code className="ss-mcp">claude mcp add observant https://api.observant.ai/mcp</code>
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

// One-click fix — revived for the IN-PRODUCT path. Off-product we couldn't know an
// insight was actionable or execute a code fix; with the snippet live (repo connected,
// behavior triggered the conversation) we can: synthesis → root cause → file-scoped
// plan → open a real PR → close the loop with the humans who raised it.
function ssCopyClip(text) { try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) {} }

function InsightStep({ step }) {
  const [open, setOpen] = useStateSS(false);
  const [on, setOn] = useStateSS(true);
  const [copied, setCopied] = useStateSS(false);
  const copy = (e) => { e.stopPropagation(); ssCopyClip(step.prompt || step.detail); setCopied(true); setTimeout(() => setCopied(false), 1600); };
  return (
    <div className={"ss-step" + (on ? "" : " off")}>
      <button type="button" className="ss-step-check" aria-label="Include this step" onClick={() => setOn((v) => !v)}>{on ? <Icon name="check" size={13} sw={2.6} /> : null}</button>
      <div className="ss-step-main">
        <button type="button" className="ss-step-head" onClick={() => setOpen((v) => !v)}>
          <span className="ss-step-label">STEP {step.n}</span>
          <b>{step.title}</b>
          <span className="ss-step-type">{step.type}</span>
        </button>
        {open && (
          <div className="ss-step-body">
            <p>{step.detail}</p>
            {step.affects && <span className="ss-step-affects">Affects: {step.affects}</span>}
            <button type="button" className="ss-step-copy" onClick={copy}>{copied ? "Copied ✓" : "Copy prompt"}</button>
          </div>
        )}
      </div>
    </div>
  );
}

function InsightDetail({ insight, state, patchState, onBack }) {
  const [closed, setClosed] = useStateSS(false);
  const [planCopied, setPlanCopied] = useStateSS(false);
  const [prOpened, setPrOpened] = useStateSS(false);
  const raised = (insight.raisedBy || []).map((id) => (state.people || []).find((pp) => pp.id === id)).filter(Boolean);
  const steps = insight.steps || [];
  const firstNames = raised.map((pp) => pp.name.split(" ")[0]).join(", ");
  const copyPlan = () => {
    const text = insight.title + "\n\nRoot cause:\n" + (insight.rootCause || []).map((x) => "- " + x).join("\n") +
      "\n\nPlan:\n" + steps.map((s) => "STEP " + s.n + " — " + s.title + (s.affects ? " (" + s.affects + ")" : "") + "\n" + s.detail).join("\n\n");
    ssCopyClip(text); setPlanCopied(true); setTimeout(() => setPlanCopied(false), 1600);
  };
  const openPR = () => {
    setPrOpened(true);
    patchState((cur) => ({ ...cur, activity: ["Opened PR “Fix: " + insight.title + "” (" + steps.length + " files) from a behavior-triggered insight.", ...(cur.activity || [])] }));
  };
  const closeLoop = () => {
    setClosed(true);
    patchState((cur) => ({ ...cur, activity: ["Closed the loop with " + firstNames + " on “" + insight.title + "”.", ...(cur.activity || [])] }));
  };
  return (
    <div className="ss-page-stack">
      <button type="button" className="ss-insight-link" onClick={onBack}><Icon name="back" size={14} /> All insights</button>
      <section className="ss-panel">
        <div className="ss-insight-detail-head">
          <span className="ss-insight-metric-big">{insight.metric}</span>
          <div>
            <span className="eyebrow no-rule">Insight · Plan ready{insight.trigger ? " · triggered by " + insight.trigger : ""}</span>
            <h2>{insight.title}</h2>
            <p>{insight.detail}</p>
          </div>
        </div>
      </section>
      <div className="ss-insight-detail-grid">
        <section className="ss-panel">
          <PanelTitle k="Root cause" title="What the conversations say" />
          <ol className="ss-rootcause">{(insight.rootCause || []).map((x, i) => <li key={i}>{x}</li>)}</ol>
        </section>
        <section className="ss-panel ss-sources">
          <PanelTitle k="Sources" title="Grounded in" status={raised.length + " partners"} />
          <div className="ss-source-people">
            {raised.map((pp) => <PersonLine key={pp.id} person={pp} meta={pp.segment + " · " + pp.surface} compact />)}
          </div>
          {insight.sourceCounts && <p className="ss-source-counts">{insight.sourceCounts.conversations} conversations · {insight.sourceCounts.moments} remembered moments</p>}
        </section>
      </div>
      <section className="ss-panel">
        <PanelTitle k="Agent-ready fix" title={steps.length + " steps — grounded in the why"} status={prOpened ? "PR opened ✓" : "Plan ready"} />
        <div className="ss-plan-actions">
          <Btn variant="ghost" size="sm" onClick={copyPlan}><Icon name="book" size={14} /> {planCopied ? "Copied ✓" : "Copy plan"}</Btn>
          <Btn variant="ghost" size="sm" onClick={copyPlan}><Icon name="spark" size={14} /> Hand to Claude</Btn>
          <Btn variant="primary" size="sm" onClick={openPR} disabled={prOpened}><Icon name="link" size={14} /> {prOpened ? "PR opened ✓" : "Open PR"}</Btn>
        </div>
        {prOpened && <p className="ss-fix-closed">Observant opened <b>“Fix: {insight.title}”</b> against {SS_CONNECT_REPO.owner}/{SS_CONNECT_REPO.name} — {steps.length} files, scoped to the plan below. Review and merge like any PR.</p>}
        <div className="ss-steps">{steps.map((s) => <InsightStep key={s.id} step={s} />)}</div>
      </section>
      {raised.length > 0 && (
        <section className="ss-panel ss-closeloop">
          <PanelTitle k="Close the loop" title="Tell the people who raised this" status={raised.length + " partners"} />
          <p className="ss-step-lead">Behavioral tools fix the code and stop. You have the relationship — let {firstNames} know you're acting on what they told you.</p>
          <Btn variant="primary" size="sm" onClick={closeLoop} disabled={closed}><Icon name="relay" size={14} /> {closed ? "Loop closed ✓" : "Tell " + firstNames}</Btn>
          {closed && <p className="ss-fix-closed">Observant let {firstNames} know their feedback shaped a fix — the part a behavioral tool can't do.</p>}
        </section>
      )}
    </div>
  );
}

function InsightsView({ state, patchState, navigate }) {
  const latestAnswer = state.answers[0];
  const connected = !!(state.setup && (state.setup.connected || state.setup.route === "inproduct"));
  const [selectedId, setSelectedId] = useStateSS(() => {
    const ft = state.focusedTarget || "";
    return (state.insights || []).some((i) => i.id === ft) ? ft : "";
  });
  const selected = connected ? (state.insights || []).find((i) => i.id === selectedId) : null;
  if (selected) return <InsightDetail insight={selected} state={state} patchState={patchState} onBack={() => setSelectedId("")} />;

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
                onClick={() => connected
                  ? setSelectedId(insight.id)
                  : navigate({ section: "people", conversationId: insight.conversationId, focusedTarget: "person-" + (rowPerson ? rowPerson.id : insight.conversationId) })}
              >
                <span>{insight.metric}</span>
                <h3>{insight.title}</h3>
                <p>{insight.detail}</p>
                <em>{insight.evidence}</em>
                <div className="ss-insight-cta">{connected && insight.steps ? insight.steps.length + "-step fix ready" : insight.next} <Icon name="arrow" size={13} /></div>
              </button>
            );
          })}
        </div>
      ) : <EmptyState title="No insights yet" text="Ask your panel a question and Observant drafts insights as patterns emerge across the 1:1s." />}
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
        <Btn variant="primary" onClick={ask} disabled={!question.trim() || asking}><Icon name="spark" size={15} /> {asking ? "Thinking" : "Ask Observant"}</Btn>
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

function EmptyState({ title, text }) {
  return (
    <div className="ss-empty-state">
      <b>{title}</b>
      <span>{text}</span>
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
