/* ============================================================
   OBSERVANT self-serve SaaS prototype
   ============================================================ */
const { useState: useStateSS, useEffect: useEffectSS } = React;

const SS_SECTIONS = [
  { id: "home", label: "Home", icon: "grid" },
  { id: "learning", label: "Questions", icon: "chat" },
  { id: "people", label: "People", icon: "users" },
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
};

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

function ssCreateLoopDraft(state, loop) {
  if (!loop) {
    return {
      loopId: "",
      question: state.workspace.learningGoal,
      learningGoal: state.workspace.learningGoal,
      surfaces: { ...state.setup.surfaces },
      events: { ...state.setup.events },
    };
  }
  const loopSurfaceIds = loop.surfaceIds || Object.keys(state.setup.surfaces).filter((surface) => state.setup.surfaces[surface]);
  const loopEventIds = loop.eventIds || state.events.filter((event) => state.setup.events[event.event]).map((event) => event.id);
  const loopSignalIds = loop.signalIds || [];
  return {
    loopId: loop.id,
    question: loop.question,
    learningGoal: state.workspace.learningGoal,
    surfaces: Object.fromEntries(Object.keys(state.setup.surfaces).map((surface) => [surface, loopSurfaceIds.includes(surface)])),
    events: Object.fromEntries(Object.keys(state.setup.events).map((eventName) => {
      const event = state.events.find((item) => item.event === eventName);
      return [eventName, loopSignalIds.includes(eventName) || (event ? loopEventIds.includes(event.id) : !!state.setup.events[eventName])];
    })),
  };
}

function SelfServeApp() {
  const [state, setState] = useStateSS(() => ssLoadState());
  const [copied, setCopied] = useStateSS("");

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
    setState(mode === "sample" ? SelfServeData.createSampleState(SS_DEFAULT_WORKSPACE) : SelfServeData.createCustomState(form));
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

  if (!state) {
    return <EntryScreen onCreate={createWorkspace} />;
  }

  if (!state.launched) {
    return (
      <ActivationScreen
        state={state}
        patchState={patchState}
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

function EntryScreen({ onCreate }) {
  const [form, setForm] = useStateSS({ ...SS_EMPTY_WORKSPACE_FORM });
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const canCreate = form.companyName.trim();

  return (
    <div className="ss-entry">
      <div className="ss-entry-left">
        <div className="ss-entry-brand"><Wordmark size="1.65rem" /></div>
        <div className="ss-entry-copy">
          <span className="eyebrow">Step 1 · Product context</span>
          <h1>Tell Observant about your product.</h1>
          <p>This is all Observant needs to start — enough to know <b>who to talk to</b> and how to run <b>continuous, one-on-one learning</b> for you.</p>
        </div>
        <div className="ss-proof-grid" aria-label="Product signals">
          <div><b>1:1</b><span>with every user</span></div>
          <div><b>Always on</b><span>learning runs itself</span></div>
          <div><b>MCP</b><span>agent-ready output</span></div>
        </div>
      </div>

      <main className="ss-entry-card">
        <div className="ss-card-head">
          <span className="eyebrow gray">About your product</span>
          <h2>Start with the basics.</h2>
        </div>
        <div className="ss-form-grid">
          <Field label="Your name">
            <input className="input" value={form.founderName} placeholder="Your name" onChange={(e) => update("founderName", e.target.value)} />
          </Field>
          <Field label="Work email">
            <input className="input" value={form.email} placeholder="you@company.com" onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Company or product name">
            <input className="input" value={form.companyName} placeholder="Your product" onChange={(e) => update("companyName", e.target.value)} />
          </Field>
          <Field label="Product URL">
            <input className="input" value={form.productUrl} placeholder="https://yourproduct.com" onChange={(e) => update("productUrl", e.target.value)} />
          </Field>
          <Field label="What does it do?" wide>
            <textarea className="textarea" value={form.productDescription} placeholder="A reporting tool for ops teams. / A habit app for runners. — a sentence is plenty." onChange={(e) => update("productDescription", e.target.value)} />
          </Field>
          <Field label="Who uses it today?" wide>
            <textarea className="textarea" value={form.userBase} placeholder="Ops leads at small B2B companies. / Early-career designers. — who Observant should listen to." onChange={(e) => update("userBase", e.target.value)} />
          </Field>
          <Field label="What are some top-of-mind questions you'd like to learn from users? (optional)" wide>
            <textarea className="textarea" value={form.learningGoal} placeholder="No need to lock anything in — you and your team can keep feeding Observant questions anytime, right from Slack and your other channels. But if a few are already on your mind, drop them here." onChange={(e) => update("learningGoal", e.target.value)} />
          </Field>
        </div>
        <div className="ss-entry-actions">
          <Btn variant="primary" size="lg" disabled={!canCreate} onClick={() => onCreate(form, "custom")}>Continue <Icon name="arrow" size={16} /></Btn>
          <Btn variant="ghost" size="lg" onClick={() => onCreate(SS_DEFAULT_WORKSPACE, "sample")}>Use the sample workspace</Btn>
        </div>
        <p className="ss-fineprint">Set up your program in a couple of minutes — you can change any of this later.</p>
      </main>
    </div>
  );
}

const SS_ONBOARD_STEPS = [
  { id: "channels", t: "Choose your surface", d: "Email & Telegram, on by default" },
  { id: "program", t: "The program", d: "Consent, rewards, your invitation" },
  { id: "preview", t: "Preview", d: "Check it, generate your magic link" },
];

const SS_CONNECT_OPTIONS = [
  { id: "share", icon: "link", title: "Share a list or invite link", text: "Give Observant emails, a segment, or an invite link. The lightest way to start — nothing to install.", tag: "Easiest" },
  { id: "inproduct", icon: "globe", title: "Connect inside your product", text: "Observant loads with a hashed user ID you pass it, so it always knows who it's talking to — without ever holding your real user data.", tag: "One-time setup" },
];

function ActivationScreen({ state, patchState, onLaunch, resetWorkspace }) {
  const product = SelfServeData.productName(state.workspace);
  const setup = state.setup;
  const [step, setStep] = useStateSS(0);
  const [linkCopied, setLinkCopied] = useStateSS(false);
  const [inviteCopied, setInviteCopied] = useStateSS(false);
  const [linkGenerated, setLinkGenerated] = useStateSS(false);

  const patchSetup = (patch) => patchState((current) => ({ ...current, setup: { ...current.setup, ...patch } }));
  const setAudience = (id) => patchSetup({ audienceMode: id });
  const setCompensation = (id) => patchSetup({ compensation: id });
  const setTierReward = (id, value) => patchSetup({ tierRewards: { ...setup.tierRewards, [id]: value } });
  const setRecruit = (id) => patchSetup({ recruitMode: id });
  const setConnect = (id) => patchSetup({ connectMode: id });
  const toggleSurface = (surface) => patchState((current) => ({
    ...current,
    setup: { ...current.setup, surfaces: { ...current.setup.surfaces, [surface]: !current.setup.surfaces[surface] } },
  }));

  const surfaceCount = SS_FAST_CHANNELS.filter((channel) => setup.surfaces[channel]).length;
  const surfaceSummary = SS_FAST_CHANNELS.filter((channel) => setup.surfaces[channel]).map(ssSurfaceLabel).join(" · ");
  const canLaunch = surfaceCount > 0;
  const magicLink = "observant.link/" + product.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const copyLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText("https://" + magicLink).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };
  const enabledChannels = SS_FAST_CHANNELS.filter((channel) => setup.surfaces[channel]);
  const joinUrl = "Join.html?product=" + encodeURIComponent(product) + "&channels=" + enabledChannels.join(",");
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
    "Join here: https://" + magicLink,
    "",
    "You can opt out anytime, in one tap.",
    "",
    "— The " + product + " team",
  ].join("\n");
  const [inviteDraft, setInviteDraft] = useStateSS(inviteText);
  // Channel changes rewrite the invitation, so the link/copy always match what's enabled.
  useEffectSS(() => { setInviteDraft(inviteText); }, [channelPhrase, product]);
  const copyInvite = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(inviteDraft).catch(() => {});
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 1500);
  };

  const next = () => setStep((s) => Math.min(s + 1, SS_ONBOARD_STEPS.length - 1));
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

      <div className="ss-activation-wrap">
        <aside className="ss-checklist">
          <span className="eyebrow">Getting started</span>
          <h1>Set up Observant.</h1>
          <p>A few choices and Observant starts talking to your users one-on-one — following up in the moment and surfacing what matters, while you ship.</p>
          <ol className="ss-checks ss-onboard-rail">
            {SS_ONBOARD_STEPS.map((s, i) => (
              <li key={s.id} className={i === step ? "active" : i < step ? "done" : ""}>
                <span>{i < step ? <Icon name="check" size={13} sw={2.4} /> : i + 1}</span>
                <div className="ss-check-label"><b>{s.t}</b><em>{s.d}</em></div>
              </li>
            ))}
          </ol>
        </aside>

        <main className="ss-activation-main">
          {step === 0 && (
            <section className="ss-panel">
              <PanelTitle k="Step 1" title="Choose your feedback surface" status={surfaceCount + " on"} />
              <p className="ss-step-lead"><b>The most important decision: where the learning happens.</b> You'll share one magic link; each person who opts in picks their channel, and that choice is also how Observant knows who they are — their email, or their Telegram handle. <b>You never hand over your user data.</b> Both are on by default; turn one off only if it doesn't fit your brand.</p>
              <div className="ss-channel-grid">
                <SurfaceCard active={setup.surfaces.email} icon="mail" title="Email" text="Quiet async 1:1s, whenever the user has five minutes. Each person is identified by the email they opt in with." onClick={() => toggleSurface("email")} />
                <SurfaceCard active={setup.surfaces.telegram} icon="chat" title="Telegram" text="A private 1:1 with the Observant bot — one tap to connect, and replying feels like texting a friend." onClick={() => toggleSurface("telegram")} />
              </div>
              <p className="ss-fineprint">The surfaces you enable set how rich the learning gets — and the richest options need a closer partnership:</p>
              <ProUpsell />
            </section>
          )}

          {step === 1 && (
            <section className="ss-panel">
              <PanelTitle k="Step 2" title="How the program works" status="You set the terms" />
              <p className="ss-step-lead">Observant handles the logistics. You set the terms once, and can change them anytime.</p>
              <div className="ss-program-block">
                <h3>Consent — and your invitation</h3>
                <p><b>You send the invite yourself</b>, under your own brand — so your users are never confused about who's reaching out. People opt in as a <b>feedback partner</b>, and can opt out anytime, in one tap. Here's the invitation, ready to send — make it yours if you like. The join link inside is your magic link.</p>
                <div className="ss-invite-copyblock">
                  <textarea className="ss-invite-edit" value={inviteDraft} rows={14} onChange={(e) => setInviteDraft(e.target.value)} />
                  <button type="button" className="ss-magiclink-copy" onClick={copyInvite}>{inviteCopied ? "Copied ✓" : "Copy text"}</button>
                </div>
              </div>
              <div className="ss-program-block">
                <h3>Compensation</h3>
                <p>People earn by <b>participated minutes</b> — every text reply, voice interview, and call counts. <b>Observant measures and audits every minute for you.</b> Three status tiers, each with a reward. The defaults below are the standard baseline — edit any reward to fit your team.</p>

                <div className="ss-tier-cards">
                  {SS_REWARD_TIERS.map((t) => (
                    <div className="ss-tier-card" key={t.id}>
                      <div className="ss-tier-head">
                        <Avatar name={t.name} color={t.color} cls="ss-tier-badge" />
                        <div><b>{t.name}</b><span>{t.min} min · ≈ ${t.cash} cash</span></div>
                      </div>
                      <label className="ss-tier-reward">
                        <span>Reward</span>
                        <input className="input" value={setup.tierRewards[t.id]} onChange={(e) => setTierReward(t.id, e.target.value)} />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="ss-conversion">
                  <div className="ss-conversion-head"><b>Cash conversion (only as a reference)</b><span>Minutes accumulate, and people redeem their rewards as they go — much like spending down a gift card balance. They can cash out anytime, or hold for a higher tier.</span></div>
                  <div className="ss-conversion-rows">
                    {SS_REWARD_TIERS.map((t) => (
                      <span key={t.id}>{t.min} min ≈ <b>${t.cash}</b></span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="ss-panel">
              <PanelTitle k="Step 3" title="Preview" status="Last step" />
              <p className="ss-step-lead">Everything you decided, in one place. When it looks right, generate your magic link.</p>
              <div className="ss-review">
                <ReviewRowSS k="Product" v={product} sub={state.workspace.productDescription} />
                <ReviewRowSS k="Surface" v={surfaceSummary || "Open at least one channel"} sub={surfaceSummary ? "Your users pick one at opt-in" : ""} />
                <ReviewRowSS k="They get" v="Tiered rewards by minutes" sub="Bronze · Silver · Gold — audited automatically" />
                {state.workspace.learningGoal ? <ReviewRowSS k="On your mind" v={state.workspace.learningGoal} /> : null}
              </div>

              <div className="ss-program-block">
                <h3>Your invitation</h3>
                <p>What your users receive — sent by you, under your brand. Want to change it? It lives in Step 2.</p>
                <div className="ss-invite-copyblock">
                  <pre>{inviteDraft}</pre>
                  <button type="button" className="ss-magiclink-copy" onClick={copyInvite}>{inviteCopied ? "Copied ✓" : "Copy text"}</button>
                </div>
              </div>

              <div className="ss-program-block">
                <h3>Your magic link</h3>
                {!linkGenerated ? (
                  <>
                    <p>One link does the recruiting. Each person who opens it opts in, picks {channelPhrase ? channelPhrase.toLowerCase() : "their channel"}, and lands on their own continuous 1:1 line — their identifier arrives with the opt-in.</p>
                    <div className="ss-golive-actions">
                      <Btn variant="primary" size="lg" disabled={!canLaunch} onClick={() => setLinkGenerated(true)}><Icon name="spark" size={16} /> Generate my magic link</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    <p>Live and ready — put it in your invitation and send. Replies start flowing as people opt in, and <b>you're only charged by the responses you gather</b>.</p>
                    <div className="ss-magiclink">
                      <code>{magicLink}</code>
                      <button type="button" className="ss-magiclink-copy" onClick={copyLink}>{linkCopied ? "Copied ✓" : "Copy link"}</button>
                    </div>
                    <p className="ss-fineprint"><a className="ss-doc-link" href={joinUrl} target="_blank" rel="noreferrer">Open it yourself — see exactly what your users will see →</a></p>
                    <div className="ss-golive-actions">
                      <Btn variant="ghost" onClick={onLaunch}>Open your dashboard <Icon name="arrow" size={16} /></Btn>
                    </div>
                  </>
                )}
              </div>

              <div className="ss-program-block">
                <h3>Who to send it to</h3>
                <p>It's up to you — your whole list or hand-picked. A few ways to think about your first batch:</p>
                <div className="ss-advice-block">
                  {SS_AUDIENCE_OPTIONS.map((opt) => (
                    <div className="ss-advice-item" key={opt.id}>
                      <span className="ss-advice-ic"><Icon name="users" size={15} /></span>
                      <div><b>{opt.label}</b><p>{opt.text}</p></div>
                    </div>
                  ))}
                  <div className="ss-advice-foot"><b>What to expect:</b> usually 5–10% of those you invite opt in, and they tend to be your most engaged.</div>
                </div>
              </div>
            </section>
          )}

          <div className="ss-onboard-nav">
            {step > 0 ? <Btn variant="ghost" onClick={back}><Icon name="back" size={16} /> Back</Btn> : <span />}
            <span className="count">{step === 0 && surfaceCount === 0 ? "Turn on at least one surface to continue" : (step + 1) + " / " + SS_ONBOARD_STEPS.length}</span>
            {step < SS_ONBOARD_STEPS.length - 1
              ? <Btn variant="primary" onClick={next} disabled={step === 0 && surfaceCount === 0}>Continue <Icon name="arrow" size={16} /></Btn>
              : <span />}
          </div>
        </main>
      </div>
    </div>
  );
}

function ProUpsell() {
  return (
    <section className="ss-pro-upsell">
      <div className="ss-pro-head">
        <span className="eyebrow no-rule">Go further</span>
        <b>Share more data, unlock more</b>
        <p>Everything above runs without Observant touching your user data. Share more with us, and it gets more powerful:</p>
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
  const section = SS_SECTIONS.some((item) => item.id === state.section) ? state.section : "home";
  const product = SelfServeData.productName(state.workspace);
  const firstLoopId = state.selectedLoopId || (state.loops[0] ? state.loops[0].id : "");

  const navigate = ({ section: nextSection, conversationId, loopId, focusedTarget }) => {
    patchState((current) => ({
      ...current,
      section: nextSection || current.section || "home",
      selectedConversationId: conversationId || current.selectedConversationId,
      selectedLoopId: loopId || current.selectedLoopId,
      focusedTarget: focusedTarget || "",
    }));
  };

  return (
    <div className="ss-shell">
      <aside className="ss-sidebar">
        <button type="button" className="ss-sidebar-brand" onClick={() => navigate({ section: "home" })} aria-label="Go to Home">
          <Wordmark size="1.45rem" />
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
          <div>
            <span className="ss-breadcrumb">{product}</span>
            <h1>{SS_SECTIONS.find((s) => s.id === section)?.label || "Home"}</h1>
          </div>
          <div className="ss-topbar-actions">
            {ssWorkspaceIsCustom(state) && <span className="ss-sim-pill" title="The people and replies below are simulated — your real panel fills in after you send invites.">Simulated preview</span>}
            <button type="button" className="ss-live ss-live-button" onClick={() => navigate({ section: "learning", loopId: firstLoopId, focusedTarget: firstLoopId || "create-loop" })}><i></i>Learning mode is on</button>
            <Btn variant="ghost" size="sm" onClick={() => navigate({ section: "learning", focusedTarget: "create-loop" })}>Ask a question</Btn>
          </div>
        </header>

        <main className="ss-app-content">
          {section === "home" && <HomeView state={state} patchState={patchState} navigate={navigate} />}
          {section === "learning" && <LearningView state={state} patchState={patchState} navigate={navigate} copied={copied} copyText={copyText} />}
          {section === "people" && <PeopleView state={state} patchState={patchState} navigate={navigate} />}
          {section === "insights" && <InsightsView state={state} patchState={patchState} navigate={navigate} />}
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
  const memoryCount = state.loops.reduce((sum, loop) => sum + Number(loop.memory || 0), 0);
  const custom = ssWorkspaceIsCustom(state);

  return (
    <div className="ss-page-stack">
      <section className="ss-hero-status">
        <div>
          <span className="eyebrow no-rule">Always on</span>
          <h2>{custom && !state.loops.length ? "Your panel is live." : "Learning is running."}</h2>
          <p>{custom && !state.loops.length ? "Observant is opening one-on-one lines with the users who opted in for " + product + ". Ask them anything, anytime — it keeps learning automatically." : "Observant is keeping one-on-one lines open with your users and bringing what it learns back to " + product + " while you ship."}</p>
        </div>
        <div className="ss-hero-metrics">
          <Metric n={String(memoryCount)} l="moments remembered" onClick={() => navigate({ section: state.insights.length ? "insights" : "learning", focusedTarget: state.insights[0] ? state.insights[0].id : "create-loop" })} />
          <Metric n={String(readiness.connectedSurfaces)} l="channels open" onClick={() => navigate({ section: "learning", focusedTarget: "learning-config" })} />
          <Metric n={String(state.conversations.length)} l="active private lines" onClick={() => navigate({ section: "people", conversationId: activeConversationId, focusedTarget: "person-" + (activePerson ? activePerson.id : activeConversationId) })} />
        </div>
      </section>

      {custom && !state.loops.length && (
        <section className="ss-panel ss-start-panel">
          <PanelTitle k="Next" title="Ask your panel a question" status="Ready" />
          <p>Your people are already on a continuous one-on-one line. Ask anything you're curious about and watch their answers and the insight arrive in stages.</p>
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={() => navigate({ section: "learning", focusedTarget: "create-loop" })}><Icon name="spark" size={15} /> Ask a question</Btn>
          </div>
        </section>
      )}

      <div className="ss-dashboard-grid">
        <section className="ss-panel">
          <PanelTitle k="Now" title="Active private lines" status="Live" />
          {state.conversations.length ? <ConversationList state={state} compact navigate={navigate} /> : <EmptyState title="No private lines yet" text="Ask a question and Observant opens 1:1 lines with your panel." />}
        </section>
        {state.events.length ? (
          <section className="ss-panel">
            <PanelTitle k="Signals" title="Behavior triggers" status="Advanced" />
            <EventList state={state} events={state.events} navigate={navigate} />
          </section>
        ) : <ProUpsell />}
      </div>

      <div className="ss-dashboard-grid">
        <AskObservant state={state} patchState={patchState} />
        <section className="ss-panel">
          <PanelTitle k="Memory" title="What Observant remembers" status="Growing" />
          {state.people.length ? (
            <ul className="ss-memory-list">
              {state.people.slice(0, 3).map((person) => (
                <li key={person.id}>
                  <button type="button" className="ss-memory-row" onClick={() => {
                    const conversationId = ssConversationIdForPerson(state, person.id);
                    navigate({ section: "people", conversationId, focusedTarget: "person-" + person.id });
                  }}>
                    <b>{person.name}</b><span>{person.memory}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <EmptyState title="No memory yet" text="Observant remembers each person's context as soon as the first conversations come in." />}
        </section>
      </div>

      {latestAnswer && <LatestAnswerCard answer={latestAnswer} onClick={() => navigate({ section: "insights", focusedTarget: "insight-export" })} />}
    </div>
  );
}

function LearningView({ state, patchState, navigate, copied, copyText }) {
  const product = SelfServeData.productName(state.workspace);
  const readiness = SelfServeData.readiness(state.setup);
  const selected = ssSelectedLoop(state);
  const custom = ssWorkspaceIsCustom(state);
  const loopRun = selected ? ssActiveLoopRun(state, selected.id) : null;
  const loopPeople = ssLoopPeople(state, selected);
  const loopConversations = ssLoopConversations(state, selected);
  const loopEvents = ssLoopEvents(state, selected);
  const selectedSurfaceIds = selected ? (selected.surfaceIds || Object.keys(state.setup.surfaces).filter((surface) => state.setup.surfaces[surface])) : [];
  const selectedSignalIds = selected ? (selected.signalIds || loopEvents.map((event) => event.event)) : [];
  const [isEditing, setIsEditing] = useStateSS(false);
  const [isCreating, setIsCreating] = useStateSS(false);
  const [draft, setDraft] = useStateSS(() => ssCreateLoopDraft(state, selected));
  const productSlug = product.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const snippet = `<script src="https://cdn.observant.ai/agent.js" data-workspace="${productSlug}"></script>`;
  const webhook = `POST https://api.observant.ai/v1/events
Authorization: Bearer <server-issued token>

{
  "event": "${selectedSignalIds[0] || "feature_opened"}",
  "user_id": "synthetic_user_123",
  "properties": {
    "workspace": "${product}"
  }
}`;

  useEffectSS(() => {
    if (isEditing) setDraft(ssCreateLoopDraft(state, selected));
  }, [selected ? selected.id : ""]);

  const selectLoop = (loop) => {
    patchState((current) => ({ ...current, selectedLoopId: loop.id, focusedTarget: loop.id }));
  };

  const openEdit = () => {
    if (!selected) return;
    setDraft(ssCreateLoopDraft(state, selected));
    setIsEditing(true);
  };

  const closeEdit = () => {
    setDraft(ssCreateLoopDraft(state, selected));
    setIsEditing(false);
  };

  const updateDraft = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleDraftSurface = (surface) => {
    setDraft((current) => ({
      ...current,
      surfaces: { ...current.surfaces, [surface]: !current.surfaces[surface] },
    }));
  };

  const saveEdit = () => {
    if (!selected) return;
    patchState((current) => ({
      ...current,
      workspace: { ...current.workspace, learningGoal: draft.learningGoal },
      loops: ssUpdateById(current.loops, draft.loopId, () => ({
        question: draft.question,
        surfaceIds: Object.keys(draft.surfaces).filter((surface) => draft.surfaces[surface]),
        signalIds: Object.keys(draft.events).filter((eventName) => draft.events[eventName]),
        eventIds: current.events.filter((event) => draft.events[event.event]).map((event) => event.id),
      })),
      setup: {
        ...current.setup,
        surfaces: { ...draft.surfaces },
        events: { ...draft.events },
      },
    }));
    setIsEditing(false);
  };

  const openPerson = (person) => {
    const conversationId = ssConversationIdForPerson(state, person.id);
    navigate({ section: "people", conversationId, focusedTarget: "person-" + person.id });
  };

  const startLoop = async (config) => {
    const runId = SelfServeData.makeRunId();
    const loop = SelfServeData.createCustomLoop(state.workspace, config, runId);
    const loopRun = SelfServeData.createLoopRun(runId, loop, config);
    setIsCreating(false);
    patchState((current) => ({
      ...current,
      selectedLoopId: loop.id,
      focusedTarget: loop.id,
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

  const audienceText = loopPeople.length
    ? [...new Set(loopPeople.map((person) => person.segment))].join(", ")
    : ((selected && selected.groupIds) || []).map((id) => {
      const option = SS_GROUP_OPTIONS.find((group) => group.id === id);
      return option ? option.label : id;
    }).join(", ");

  return (
    <>
      <div className="ss-learning-layout">
        <section className="ss-panel">
          <div className="ss-panel-title ss-panel-title-with-action">
            <div>
              <span>Always on</span>
              <h2>Questions you've asked</h2>
            </div>
            <em>{state.loops.length + " asked"}</em>
          </div>
          {custom && (
            <Btn variant={state.loops.length ? "ghost" : "primary"} size="sm" className="ss-wide-action" onClick={() => setIsCreating(true)}>
              <Icon name="spark" size={15} /> Ask a question
            </Btn>
          )}
          {custom && (isCreating || !state.loops.length) && (
            <LoopCreatePanel state={state} onStart={startLoop} onCancel={state.loops.length ? () => setIsCreating(false) : null} />
          )}
          <div className="ss-loop-list">
            {state.loops.map((loop) => (
              <button
                type="button"
                className={"ss-loop-option" + (selected && selected.id === loop.id ? " on" : "") + ssFocusClass(state, loop.id)}
                key={loop.id}
                onClick={() => selectLoop(loop)}
              >
                <div>
                  <span className="ss-status success">{loop.status}</span>
                  <em>{loop.cadence}</em>
                </div>
                <h3>{loop.name}</h3>
                <p>{loop.question}</p>
                <small>{loop.people} people · {loop.memory} remembered moments</small>
              </button>
            ))}
          </div>
        </section>

        {selected ? (
          <section className={"ss-panel ss-loop-detail" + ssFocusClass(state, selected.id) + ssFocusClass(state, "learning-config")}>
            <div className="ss-loop-detail-head">
              <PanelTitle k="Question" title={selected.name} status={selected.status} />
              <Btn variant="primary" size="sm" onClick={openEdit}><Icon name="settings" size={15} /> Edit</Btn>
            </div>
            {loopRun && <CollectingProgress run={loopRun} />}
            <div className="ss-loop-detail-grid">
              <Metric n={String(selected.people)} l="people on it" />
              <Metric n={String(selected.active)} l="active now" />
              <Metric n={String(selected.memory)} l="memories" />
              <Metric n={String(loopConversations.reduce((sum, conversation) => sum + (conversation.messages || []).filter((message) => message.t === "user").length, 0))} l="replies in" />
            </div>

            <div className="ss-loop-read-grid">
              <ReadCard label="What you asked" text={selected.question} />
            </div>

            <div className="ss-loop-meta-grid">
              <div><b>Cadence</b><span>{selected.cadence}</span></div>
              <div><b>Who's on it</b><span>{audienceText || "Your always-on panel"}</span></div>
              <div><b>Channels</b><span>{selectedSurfaceIds.length ? selectedSurfaceIds.map(ssSurfaceLabel).join(", ") : "Your open channels"}</span></div>
            </div>

            <div className="ss-loop-columns">
              <section>
                <h3>Related people</h3>
                <div className="ss-related-list">
                  {loopPeople.length ? loopPeople.map((person) => (
                    <PersonLine
                      key={person.id}
                      person={person}
                      meta={person.segment + " · " + person.surface}
                      body={person.memory}
                      card
                      focused={state.focusedTarget === "person-" + person.id}
                      onClick={() => openPerson(person)}
                    />
                  )) : <EmptyState title="Matching users" text="Synthetic users appear as collection progresses." />}
                </div>
              </section>
              <section>
                <h3>Relevant 1:1 lines</h3>
                {loopConversations.length ? <ConversationList state={state} conversations={loopConversations} compact navigate={navigate} /> : <EmptyState title="No 1:1 lines yet" text="Private lines open after matching users." />}
              </section>
            </div>

            <div className="ss-loop-columns">
              <section>
                <h3>Behavior triggers <span className="ss-adv-tag">advanced</span></h3>
                {loopEvents.length ? <EventList state={state} events={loopEvents} navigate={navigate} /> : <EmptyState title="No triggers on this question" text="Triggers are part of the data-sharing tier — control exactly when a conversation starts. Book a call with us and we'll tailor them to this question." />}
              </section>
              <section className="ss-loop-install">
                <h3>Channels in use</h3>
                <div className="ss-surface-read-grid">
                  <SurfaceStatusCard active={selectedSurfaceIds.includes("email")} icon="mail" title="Email" text="Quiet async 1:1 lines." />
                  <SurfaceStatusCard active={selectedSurfaceIds.includes("telegram")} icon="chat" title="Telegram" text="Private 1:1 with the Observant bot." />
                  <SurfaceStatusCard active={selectedSurfaceIds.includes("product")} icon="globe" title="In-product" text={"A private line inside " + product + ". Data-sharing tier."} />
                </div>
              </section>
            </div>

            {selectedSignalIds.length ? (
              <div className="ss-loop-config" id="learning-config">
                <div>
                  <h3>Behavior triggers on this question <span className="ss-adv-tag">advanced</span></h3>
                  <div className="ss-event-read-grid">
                    {selectedSignalIds.map((eventName) => (
                      <span key={eventName} className="ss-event-pill on">
                        <Icon name="check" size={15} />
                        <b>{eventName}</b>
                      </span>
                    ))}
                  </div>
                </div>
                <CodeBlock label="In-product snippet" text={snippet} copied={copied === "learning-snippet"} onCopy={() => copyText("learning-snippet", snippet)} />
              </div>
            ) : null}
          </section>
        ) : (
          <section className="ss-panel ss-loop-detail">
            <EmptyState title="No questions yet" text="Ask your always-on panel a question and watch Observant gather 1:1 answers for your product." />
          </section>
        )}
      </div>
      {isEditing && (
        <LoopEditDrawer
          draft={draft}
          product={product}
          onUpdate={updateDraft}
          onToggleSurface={toggleDraftSurface}
          onCancel={closeEdit}
          onSave={saveEdit}
        />
      )}
    </>
  );
}

function LoopCreatePanel({ state, onStart, onCancel }) {
  const product = SelfServeData.productName(state.workspace);
  const activeSurfaces = Object.keys(state.setup.surfaces).filter((surface) => state.setup.surfaces[surface]);
  const [question, setQuestion] = useStateSS(state.workspace.learningGoal || "");

  const submit = () => {
    const q = question.trim();
    if (!q) return;
    onStart({
      name: q.length > 44 ? q.slice(0, 42) + "…" : q,
      question: q,
      // Everyone on the always-on panel — no per-question sampling.
      groupIds: ["power-users", "new-signups", "evaluators"],
      surfaceIds: activeSurfaces.length ? activeSurfaces : ["email"],
      signalIds: [],
    });
  };

  return (
    <div className="ss-create-loop" id="create-loop">
      <PanelTitle k="Ask" title="Ask your panel a question" status="Always on" />
      <p className="ss-step-lead">Everyone who opted in is on a continuous one-on-one line. Ask anything, and Observant puts it to each of them and gathers the answers for you.</p>
      <Field label="Your question">
        <textarea className="textarea" value={question} placeholder={"e.g. What almost stopped you from sticking with " + product + "?"} onChange={(e) => setQuestion(e.target.value)} />
      </Field>
      <p className="ss-fineprint">Goes to your always-on panel — each person on the channel they chose ({activeSurfaces.length ? activeSurfaces.map(ssSurfaceLabel).join(", ") : "your open channels"}).</p>
      <div className="ss-create-loop-actions">
        {onCancel && <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>}
        <Btn variant="primary" onClick={submit} disabled={!question.trim()}>
          <Icon name="spark" size={15} /> Ask the panel
        </Btn>
      </div>
    </div>
  );
}

function CollectingProgress({ run }) {
  const timeline = run.timeline || SS_SIMULATION_STAGES;
  const current = Math.max(-1, run.stageIndex);
  const percent = run.status === "generating" ? 8 : Math.round(((current + 1) / timeline.length) * 100);
  const label = run.status === "generating"
    ? "Preparing your panel"
    : run.status === "running"
      ? "Still learning"
      : (timeline[current] ? timeline[current].label : "Collecting");

  return (
    <section className="ss-progress-card">
      <div className="ss-progress-head">
        <div>
          <span className="eyebrow no-rule">Collecting progress</span>
          <h3>{label}</h3>
        </div>
        <em>Collecting</em>
      </div>
      <div className="ss-progress-track"><span style={{ width: percent + "%" }} /></div>
      <ol className="ss-progress-steps">
        {timeline.map((step, index) => (
          <li key={step.id || step.label} className={index <= current || run.status === "running" ? "done" : ""}>
            <span>{index + 1}</span>
            <div><b>{step.label}</b><p>{step.detail}</p></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function LoopEditDrawer({ draft, product, onUpdate, onToggleSurface, onCancel, onSave }) {
  return (
    <>
      <button type="button" className="ss-edit-backdrop" aria-label="Cancel loop editing" onClick={onCancel} />
      <aside className="ss-edit-drawer" aria-label="Edit question">
        <div className="ss-edit-drawer-head">
          <div>
            <span className="eyebrow no-rule">Edit</span>
            <h2>Edit this question</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close edit drawer"><Icon name="x" size={17} /></button>
        </div>
        <div className="ss-edit-drawer-body">
          <Field label="Your question">
            <textarea className="textarea" value={draft.question} onChange={(e) => onUpdate("question", e.target.value)} />
          </Field>
          <section>
            <h3>Channels</h3>
            <div className="ss-card-grid two">
              <SurfaceCard active={draft.surfaces.email} icon="mail" title="Email" text="Quiet async 1:1 lines." onClick={() => onToggleSurface("email")} />
              <SurfaceCard active={draft.surfaces.telegram} icon="chat" title="Telegram" text="Private 1:1 with the Observant bot." onClick={() => onToggleSurface("telegram")} />
            </div>
          </section>
        </div>
        <div className="ss-edit-drawer-actions">
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant="primary" onClick={onSave}>Save changes</Btn>
        </div>
      </aside>
    </>
  );
}

function PeopleView({ state, patchState }) {
  const selected = state.conversations.find((c) => c.id === state.selectedConversationId) || state.conversations[0];
  const person = ssPersonForConversation(state, selected);

  if (!selected || !person) {
    return (
      <section className="ss-panel">
        <PanelTitle k="People" title="People Observant learns from" status="No lines" />
        <p className="mut">No private learning lines are available yet.</p>
      </section>
    );
  }

  const setSelected = (conversationId) => {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    const rowPerson = ssPersonForConversation(state, conversation);
    patchState((current) => ({
      ...current,
      section: "people",
      selectedConversationId: conversationId,
      focusedTarget: "person-" + (rowPerson ? rowPerson.id : conversationId),
    }));
  };

  const relayQuestion = () => {
    patchState((current) => ({
      ...current,
      conversations: ssUpdateById(current.conversations, selected.id, (conversation) => ({
        messages: [
          ...conversation.messages,
          { t: "relay", text: current.nextQuestions[0], meta: "Relayed from your product team" },
          { t: "them", text: "Observant is following up with the context already remembered for this person.", meta: "Observant" },
        ],
      })),
      activity: ["Question relayed to " + person.name + ".", ...current.activity],
    }));
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
        <PanelTitle k="People" title="People Observant learns from" status={state.people.length + " people"} />
        <div className="ss-table-list">
          {state.people.map((rowPerson) => {
            const conversationId = ssConversationIdForPerson(state, rowPerson.id);
            return (
              <PersonLine
                key={rowPerson.id}
                person={rowPerson}
                meta={rowPerson.segment + " · " + rowPerson.surface}
                body={rowPerson.last}
                status={rowPerson.status}
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
          <span className="ss-live"><i></i>{selected.state}</span>
        </div>
        <div className="ss-person-context">
          <div><b>Learned context</b><span>{person.memory}</span></div>
          <div><b>Last signal</b><span>{person.last}</span></div>
          <div><b>Active line</b><span>{selected.title}</span></div>
        </div>
        <div className="ss-chat-body">
          {selected.messages.map((message, i) => <ChatMessage key={i} message={message} />)}
        </div>
        <div className="ss-chat-actions">
          <Btn variant="primary" size="sm" onClick={relayQuestion}><Icon name="relay" size={15} /> Relay a question</Btn>
          <Btn variant="ghost" size="sm" onClick={requestLive}><Icon name="video" size={15} /> Request live 1:1</Btn>
        </div>
      </section>
    </div>
  );
}

function InsightsView({ state, patchState, navigate }) {
  const latestAnswer = state.answers[0];

  return (
    <div className="ss-page-stack">
      <AskObservant state={state} patchState={patchState} />
      {latestAnswer && <LatestAnswerCard answer={latestAnswer} />}
      {state.insights.length ? (
        <div className="ss-list-grid">
          {state.insights.map((insight) => (
            <button
              type="button"
              className={"ss-insight-card ss-card-action" + ssFocusClass(state, insight.id)}
              key={insight.id}
              onClick={() => {
                const conversation = state.conversations.find((item) => item.id === insight.conversationId);
                const rowPerson = ssPersonForConversation(state, conversation);
                navigate({ section: "people", conversationId: insight.conversationId, focusedTarget: "person-" + (rowPerson ? rowPerson.id : insight.conversationId) });
              }}
            >
              <span>{insight.metric}</span>
              <h3>{insight.title}</h3>
              <p>{insight.detail}</p>
              <em>{insight.evidence}</em>
              <div>{insight.next}</div>
            </button>
          ))}
        </div>
      ) : <EmptyState title="No insights yet" text="Ask your panel a question and Observant drafts insights as patterns emerge across the 1:1s." />}
    </div>
  );
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

function SettingsViewSS({ state, patchState, resetWorkspace }) {
  const updateWorkspace = (field, value) => {
    patchState((current) => ({ ...current, workspace: { ...current.workspace, [field]: value } }));
  };

  return (
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
      <div className="ss-default-list">
        <div><b>Private lines</b><span>One-on-one with every person on the panel.</span></div>
        <div><b>Team updates</b><span>Weekly digest and urgent insight alerts.</span></div>
        <div><b>Agent handoffs</b><span>Insight deliverables can include PRD and MCP-ready context.</span></div>
      </div>
      <div className="ss-danger">
        <div>
          <b>Reset workspace</b>
          <span>Clears local state and returns to onboarding.</span>
        </div>
        <Btn variant="ghost" onClick={resetWorkspace}>Reset workspace</Btn>
      </div>
    </section>
  );
}

function AskObservant({ state, patchState }) {
  const [question, setQuestion] = useStateSS(state.workspace.learningGoal);
  const [asking, setAsking] = useStateSS(false);

  const ask = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
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
    if (!answer || !answer.answer) answer = SelfServeData.cannedAnswer(state, question);
    patchState((current) => ({
      ...current,
      answers: [{ id: answer.id || "answer-" + Date.now(), question, ...answer }, ...current.answers],
      activity: ["Asked Observant: " + question, ...current.activity],
    }));
    setAsking(false);
  };

  return (
    <section className="ss-panel">
      <PanelTitle k="Ask Observant" title="Ask across what it has learned" status="Grounded" />
      <textarea className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} />
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
        return (
          <PersonLine
            key={conversation.id}
            person={person}
            meta={compact ? person.segment + " · " + person.surface : conversation.title}
            body={compact ? person.last : person.memory}
            status={conversation.state}
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
