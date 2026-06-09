/* ============================================================
   OBSERVANT self-serve SaaS prototype
   ============================================================ */
const { useState: useStateSS, useEffect: useEffectSS } = React;

const SS_SECTIONS = [
  { id: "home", label: "Home", icon: "grid" },
  { id: "learning", label: "Learning", icon: "spark" },
  { id: "people", label: "People", icon: "users" },
  { id: "insights", label: "Insights", icon: "book" },
  { id: "settings", label: "Settings", icon: "settings" },
];

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
  const labels = { product: "In-product", browser: "Browser companion", email: "Email" };
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
  const [form, setForm] = useStateSS({ ...SS_DEFAULT_WORKSPACE });
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <div className="ss-entry">
      <div className="ss-entry-left">
        <div className="ss-entry-brand"><Wordmark size="1.65rem" /></div>
        <div className="ss-entry-copy">
          <span className="eyebrow">Self-serve setup</span>
          <h1>Create your Observant workspace.</h1>
          <p>Turn on learning mode for your product. Observant will open private lines, remember user context, and surface what is changing while you ship.</p>
        </div>
        <div className="ss-proof-grid" aria-label="Product signals">
          <div><b>24/7</b><span>learning mode</span></div>
          <div><b>1:1</b><span>private user lines</span></div>
          <div><b>MCP</b><span>agent-ready output</span></div>
        </div>
      </div>

      <main className="ss-entry-card">
        <div className="ss-card-head">
          <span className="eyebrow gray">Workspace</span>
          <h2>Start with your product.</h2>
        </div>
        <div className="ss-form-grid">
          <Field label="Your name">
            <input className="input" value={form.founderName} onChange={(e) => update("founderName", e.target.value)} />
          </Field>
          <Field label="Work email">
            <input className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Company or product name">
            <input className="input" value={form.companyName} onChange={(e) => update("companyName", e.target.value)} />
          </Field>
          <Field label="Product URL">
            <input className="input" value={form.productUrl} onChange={(e) => update("productUrl", e.target.value)} />
          </Field>
          <Field label="Primary learning goal" wide>
            <textarea className="textarea" value={form.learningGoal} onChange={(e) => update("learningGoal", e.target.value)} />
          </Field>
        </div>
        <div className="ss-entry-actions">
          <Btn variant="primary" size="lg" onClick={() => onCreate(form, "custom")}>Create workspace <Icon name="arrow" size={16} /></Btn>
          <Btn variant="ghost" size="lg" onClick={() => onCreate(SS_DEFAULT_WORKSPACE, "sample")}>Continue with sample workspace</Btn>
        </div>
        <p className="ss-fineprint">Custom workspaces use synthetic users. No real signup, billing, or data connection is created.</p>
      </main>
    </div>
  );
}

function ActivationScreen({ state, patchState, onLaunch, copied, copyText, resetWorkspace }) {
  const readiness = SelfServeData.readiness(state.setup);
  const product = SelfServeData.productName(state.workspace);
  const custom = ssWorkspaceIsCustom(state);

  const setUsersSource = (source) => {
    patchState((current) => ({
      ...current,
      setup: { ...current.setup, usersSource: source },
      activity: ["User source selected: " + source + ".", ...current.activity],
    }));
  };

  const toggleSurface = (surface) => {
    patchState((current) => ({
      ...current,
      setup: {
        ...current.setup,
        surfaces: { ...current.setup.surfaces, [surface]: !current.setup.surfaces[surface] },
      },
    }));
  };

  const toggleEvent = (eventName) => {
    patchState((current) => ({
      ...current,
      setup: {
        ...current.setup,
        events: { ...current.setup.events, [eventName]: !current.setup.events[eventName] },
      },
    }));
  };

  const updateGoal = (value) => {
    patchState((current) => ({ ...current, workspace: { ...current.workspace, learningGoal: value } }));
  };

  const snippet = `<script src="https://cdn.observant.ai/agent.js" data-workspace="${product.toLowerCase().replace(/[^a-z0-9]+/g, "-")}"></script>`;
  const webhook = `POST https://api.observant.ai/v1/events\nAuthorization: Bearer <server-issued token>\n{\n  "event": "feature_opened",\n  "user_id": "synthetic_user_123",\n  "properties": { "workspace": "${product}" }\n}`;

  return (
    <div className="ss-activation">
      <header className="ss-activation-top">
        <Wordmark size="1.45rem" />
        <div className="ss-top-right">
          <span>{product}</span>
          <button type="button" onClick={resetWorkspace}>Reset workspace</button>
        </div>
      </header>

      <div className="ss-activation-wrap">
        <aside className="ss-checklist">
          <span className="eyebrow">Activation</span>
          <h1>Turn on learning mode.</h1>
          <p>{custom ? "Choose the surfaces and synthetic signals Observant should simulate before your real install exists." : "Connect the minimum pieces Observant needs to keep learning from your users."}</p>
          <Checklist readiness={readiness} launched={state.launched} />
        </aside>

        <main className="ss-activation-main">
          <section className="ss-panel">
            <PanelTitle k="Workspace" title="Create workspace" status="Complete" />
            <div className="ss-workspace-card">
              <Avatar name={product} color="oklch(0.255 0.018 58)" />
              <div>
                <h3>{product}</h3>
                <p>{state.workspace.productUrl}</p>
              </div>
              <span className="ss-status success">Ready</span>
            </div>
          </section>

          <section className="ss-panel">
            <PanelTitle k="Learning goal" title="Define what Observant should learn" status="Saved" />
            <textarea className="textarea" value={state.workspace.learningGoal} onChange={(e) => updateGoal(e.target.value)} />
          </section>

          <section className="ss-panel">
            <PanelTitle k="Users" title="Choose who Observant learns from" status={readiness.users ? "Selected" : "Required"} />
            <div className="ss-card-grid two">
              <SelectCard
                active={state.setup.usersSource === "invite"}
                icon="link"
                title={custom ? "Use synthetic lookalikes" : "Invite your users"}
                text={custom ? "Simulate people who match your target users without contacting anyone real." : "Share an invite link with power users, early adopters, or a segment from your product."}
                detail={custom ? "No real users contacted" : state.setup.inviteUrl}
                onClick={() => setUsersSource("invite")}
              />
              <SelectCard
                active={state.setup.usersSource === "recruit"}
                icon="users"
                title={custom ? "Generate a test panel" : "Recruit a vetted group"}
                text={custom ? "Create a synthetic panel for your first learning loops." : "Start before launch with screened people who match your best-customer profile."}
                detail={custom ? "Generated for this prototype" : "Managed by Observant"}
                onClick={() => setUsersSource("recruit")}
              />
            </div>
          </section>

          <section className="ss-panel">
            <PanelTitle k="Surfaces" title={custom ? "Choose simulated surfaces" : "Connect where conversations happen"} status={readiness.surfaces ? readiness.connectedSurfaces + " connected" : "Required"} />
            <div className="ss-card-grid three">
              <SurfaceCard active={state.setup.surfaces.product} icon="globe" title="In-product" text="Open a private line inside " product={product} onClick={() => toggleSurface("product")} />
              <SurfaceCard active={state.setup.surfaces.browser} icon="search" title="Browser companion" text="Catch web behavior and follow up in context." onClick={() => toggleSurface("browser")} />
              <SurfaceCard active={state.setup.surfaces.email} icon="mail" title="Email" text="Keep quiet async lines open for users who prefer inbox replies." onClick={() => toggleSurface("email")} />
            </div>
            <CodeBlock label="Embed snippet" text={snippet} copied={copied === "embed"} onCopy={() => copyText("embed", snippet)} />
          </section>

          <section className="ss-panel">
            <PanelTitle k="Events" title={custom ? "Choose simulated behavior signals" : "Install behavior events"} status={readiness.events ? readiness.installedEvents + " installed" : "Required"} />
            <div className="ss-event-grid">
              {Object.keys(state.setup.events).map((eventName) => (
                <button type="button" key={eventName} className={`ss-event${state.setup.events[eventName] ? " on" : ""}`} onClick={() => toggleEvent(eventName)}>
                  <span><Icon name={state.setup.events[eventName] ? "check" : "bolt"} size={15} /></span>
                  <b>{eventName}</b>
                </button>
              ))}
            </div>
            <CodeBlock label="Webhook sample" text={webhook} copied={copied === "webhook"} onCopy={() => copyText("webhook", webhook)} />
          </section>

          <section className="ss-launch-panel">
            <div>
              <span className="eyebrow no-rule">Learning mode</span>
              <h2>Ready to start continuous learning?</h2>
              <p>{readiness.ready ? "Observant has enough to open synthetic private lines, remember context, and surface what changes." : "Complete user source, at least one surface, and at least one event to turn learning mode on."}</p>
            </div>
            <Btn variant="primary" size="lg" disabled={!readiness.ready} onClick={onLaunch}>Turn on learning mode <Icon name="arrow" size={16} /></Btn>
          </section>
        </main>
      </div>
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
            <button type="button" className="ss-live ss-live-button" onClick={() => navigate({ section: "learning", loopId: firstLoopId, focusedTarget: firstLoopId || "create-loop" })}><i></i>Learning mode is on</button>
            <Btn variant="ghost" size="sm" onClick={() => navigate({ section: "learning", focusedTarget: "learning-config" })}>Review learning</Btn>
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
          <span className="eyebrow no-rule">Operating system</span>
          <h2>{custom && !state.loops.length ? "Learning mode is ready." : "Learning mode is on."}</h2>
          <p>{custom && !state.loops.length ? "Create a learning loop to simulate synthetic users, private lines, and product insight for " + product + "." : "Observant is watching behavior, keeping private lines open, and bringing signal back to " + product + " while you ship."}</p>
        </div>
        <div className="ss-hero-metrics">
          <Metric n={String(memoryCount)} l="moments remembered" onClick={() => navigate({ section: state.insights.length ? "insights" : "learning", focusedTarget: state.insights[0] ? state.insights[0].id : "create-loop" })} />
          <Metric n={String(readiness.connectedSurfaces)} l="surfaces connected" onClick={() => navigate({ section: "learning", focusedTarget: "learning-config" })} />
          <Metric n={String(state.conversations.length)} l="active private lines" onClick={() => navigate({ section: "people", conversationId: activeConversationId, focusedTarget: "person-" + (activePerson ? activePerson.id : activeConversationId) })} />
        </div>
      </section>

      {custom && !state.loops.length && (
        <section className="ss-panel ss-start-panel">
          <PanelTitle k="Next" title="Create your first learning loop" status="Ready" />
          <p>Ask a question about your product, pick the synthetic users Observant should learn from, and watch replies and insights arrive in stages.</p>
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={() => navigate({ section: "learning", focusedTarget: "create-loop" })}><Icon name="spark" size={15} /> Create learning loop</Btn>
          </div>
        </section>
      )}

      <div className="ss-dashboard-grid">
        <section className="ss-panel">
          <PanelTitle k="Now" title="Active private lines" status="Live" />
          {state.conversations.length ? <ConversationList state={state} compact navigate={navigate} /> : <EmptyState title="No private lines yet" text="Create a learning loop to open synthetic 1:1 lines." />}
        </section>
        <section className="ss-panel">
          <PanelTitle k="Signals" title="Recent behavior triggers" status="Watching" />
          {state.events.length ? <EventList state={state} events={state.events} navigate={navigate} /> : <EmptyState title="No signals yet" text="Signals appear as the loop collects synthetic behavior." />}
        </section>
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
          ) : <EmptyState title="No memory yet" text="Observant will remember context once the first loop starts collecting." />}
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

  const toggleDraftEvent = (eventName) => {
    setDraft((current) => ({
      ...current,
      events: { ...current.events, [eventName]: !current.events[eventName] },
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
      activity: ["Learning loop created: " + loop.name + ".", ...current.activity],
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
    ? loopPeople.map((person) => person.segment).join(", ")
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
              <span>Learning</span>
              <h2>Learning loops</h2>
            </div>
            <em>{state.loops.length + " loops"}</em>
          </div>
          {custom && (
            <Btn variant={state.loops.length ? "ghost" : "primary"} size="sm" className="ss-wide-action" onClick={() => setIsCreating(true)}>
              <Icon name="spark" size={15} /> New loop
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
              <PanelTitle k="Loop detail" title={selected.name} status={selected.status} />
              <Btn variant="primary" size="sm" onClick={openEdit}><Icon name="settings" size={15} /> Edit loop</Btn>
            </div>
            {loopRun && <CollectingProgress run={loopRun} />}
            <div className="ss-loop-detail-grid">
              <Metric n={String(selected.people)} l="people watched" />
              <Metric n={String(selected.active)} l="active now" />
              <Metric n={String(selected.memory)} l="memories" />
              <Metric n={String(selectedSignalIds.length || readiness.installedEvents)} l="signals watched" />
            </div>

            <div className="ss-loop-read-grid">
              <ReadCard label="Loop question" text={selected.question} />
              <ReadCard label="Primary learning goal" text={state.workspace.learningGoal} />
            </div>

            <div className="ss-loop-meta-grid">
              <div><b>Cadence</b><span>{selected.cadence}</span></div>
              <div><b>Audience</b><span>{audienceText || "Waiting for matched synthetic users"}</span></div>
              <div><b>Surfaces</b><span>{selectedSurfaceIds.length ? selectedSurfaceIds.map(ssSurfaceLabel).join(", ") : "No surfaces connected"}</span></div>
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
                <h3>Signals watched by this loop</h3>
                {loopEvents.length ? <EventList state={state} events={loopEvents} navigate={navigate} /> : <EmptyState title="Waiting for behavior" text="Synthetic signals arrive during collection." />}
              </section>
              <section className="ss-loop-install">
                <h3>Connected surfaces</h3>
                <div className="ss-surface-read-grid">
                  <SurfaceStatusCard active={selectedSurfaceIds.includes("product")} icon="globe" title="In-product" text={"Private follow-ups inside " + product + "."} />
                  <SurfaceStatusCard active={selectedSurfaceIds.includes("browser")} icon="search" title="Browser companion" text="Behavior context and web follow-up." />
                  <SurfaceStatusCard active={selectedSurfaceIds.includes("email")} icon="mail" title="Email" text="Quiet async learning lines." />
                </div>
              </section>
            </div>

            <div className="ss-loop-config" id="learning-config">
              <div>
                <h3>Signals this loop can use</h3>
                <div className="ss-event-read-grid">
                  {(selectedSignalIds.length ? selectedSignalIds : Object.keys(state.setup.events)).map((eventName) => (
                    <span key={eventName} className="ss-event-pill on">
                      <Icon name="check" size={15} />
                      <b>{eventName}</b>
                    </span>
                  ))}
                </div>
              </div>
              <CodeBlock label="Browser or in-product snippet" text={snippet} copied={copied === "learning-snippet"} onCopy={() => copyText("learning-snippet", snippet)} />
              <CodeBlock label="Webhook sample" text={webhook} copied={copied === "learning-webhook"} onCopy={() => copyText("learning-webhook", webhook)} />
            </div>
          </section>
        ) : (
          <section className="ss-panel ss-loop-detail">
            <EmptyState title="No learning loops yet" text="Create a loop to watch Observant collect synthetic 1:1 learning for your product." />
          </section>
        )}
      </div>
      {isEditing && (
        <LoopEditDrawer
          draft={draft}
          product={product}
          onUpdate={updateDraft}
          onToggleSurface={toggleDraftSurface}
          onToggleEvent={toggleDraftEvent}
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
  const activeSignals = Object.keys(state.setup.events).filter((eventName) => state.setup.events[eventName]);
  const [draft, setDraft] = useStateSS({
    name: product + " adoption loop",
    question: state.workspace.learningGoal,
    groupIds: ["power-users", "evaluators"],
    surfaceIds: activeSurfaces.length ? activeSurfaces : ["product"],
    signalIds: activeSignals.length ? activeSignals : ["feature_opened"],
  });

  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const toggleList = (field, id) => {
    setDraft((current) => {
      const values = current[field] || [];
      const next = values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
      return { ...current, [field]: next.length ? next : values };
    });
  };

  return (
    <div className="ss-create-loop" id="create-loop">
      <PanelTitle k="New loop" title="Create learning loop" status="Synthetic" />
      <Field label="Loop name">
        <input className="input" value={draft.name} onChange={(e) => update("name", e.target.value)} />
      </Field>
      <Field label="Learning question">
        <textarea className="textarea" value={draft.question} onChange={(e) => update("question", e.target.value)} />
      </Field>
      <div>
        <h3>Who should Observant learn from?</h3>
        <div className="ss-chip-grid">
          {SS_GROUP_OPTIONS.map((group) => (
            <button type="button" key={group.id} className={draft.groupIds.includes(group.id) ? "ss-choice-chip on" : "ss-choice-chip"} onClick={() => toggleList("groupIds", group.id)}>
              <b>{group.label}</b>
              <span>{group.text}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3>Surfaces</h3>
        <div className="ss-small-toggle-grid">
          {SS_SURFACE_OPTIONS.map((surface) => (
            <button type="button" key={surface.id} className={draft.surfaceIds.includes(surface.id) ? "ss-event on" : "ss-event"} onClick={() => toggleList("surfaceIds", surface.id)}>
              <span><Icon name={surface.icon} size={15} /></span>
              <b>{surface.label}</b>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3>Signals</h3>
        <div className="ss-small-toggle-grid">
          {SS_SIGNAL_OPTIONS.map((signal) => (
            <button type="button" key={signal.id} className={draft.signalIds.includes(signal.id) ? "ss-event on" : "ss-event"} onClick={() => toggleList("signalIds", signal.id)}>
              <span><Icon name={draft.signalIds.includes(signal.id) ? "check" : "bolt"} size={15} /></span>
              <b>{signal.label}</b>
            </button>
          ))}
        </div>
      </div>
      <p className="ss-fineprint">This uses synthetic users only. No real users are contacted and no product data is installed.</p>
      <div className="ss-create-loop-actions">
        {onCancel && <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>}
        <Btn variant="primary" onClick={() => onStart(draft)} disabled={!draft.name.trim() || !draft.question.trim()}>
          <Icon name="spark" size={15} /> Start collecting
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
    ? "Preparing synthetic panel"
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
        <em>{run.fallback ? "Local fallback" : "AI-assisted"}</em>
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

function LoopEditDrawer({ draft, product, onUpdate, onToggleSurface, onToggleEvent, onCancel, onSave }) {
  return (
    <>
      <button type="button" className="ss-edit-backdrop" aria-label="Cancel loop editing" onClick={onCancel} />
      <aside className="ss-edit-drawer" aria-label="Edit learning loop">
        <div className="ss-edit-drawer-head">
          <div>
            <span className="eyebrow no-rule">Edit loop</span>
            <h2>Learning configuration</h2>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close edit drawer"><Icon name="x" size={17} /></button>
        </div>
        <div className="ss-edit-drawer-body">
          <Field label="Loop question">
            <textarea className="textarea" value={draft.question} onChange={(e) => onUpdate("question", e.target.value)} />
          </Field>
          <Field label="Primary learning goal">
            <textarea className="textarea" value={draft.learningGoal} onChange={(e) => onUpdate("learningGoal", e.target.value)} />
          </Field>
          <section>
            <h3>Connected surfaces</h3>
            <div className="ss-card-grid two">
              <SurfaceCard active={draft.surfaces.product} icon="globe" title="In-product" text="Private follow-ups inside " product={product} onClick={() => onToggleSurface("product")} />
              <SurfaceCard active={draft.surfaces.browser} icon="search" title="Browser companion" text="Behavior context and web follow-up." onClick={() => onToggleSurface("browser")} />
              <SurfaceCard active={draft.surfaces.email} icon="mail" title="Email" text="Quiet async learning lines." onClick={() => onToggleSurface("email")} />
            </div>
          </section>
          <section>
            <h3>Watched events</h3>
            <div className="ss-event-grid">
              {Object.keys(draft.events).map((eventName) => (
                <button type="button" key={eventName} className={`ss-event${draft.events[eventName] ? " on" : ""}`} onClick={() => onToggleEvent(eventName)}>
                  <span><Icon name={draft.events[eventName] ? "check" : "bolt"} size={15} /></span>
                  <b>{eventName}</b>
                </button>
              ))}
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
      ) : <EmptyState title="No insight deliverables yet" text="Create a learning loop and Observant will draft insights once patterns emerge." />}
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
        <div><b>Private lines</b><span>Default on for learning loops.</span></div>
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
      <em>{active ? "Connected" : "Not connected"}</em>
    </article>
  );
}

function SurfaceCard({ active, icon, title, text, product, onClick }) {
  return (
    <button type="button" className={active ? "ss-surface-card on" : "ss-surface-card"} onClick={onClick}>
      <span><Icon name={icon} size={18} /></span>
      <b>{title}</b>
      <p>{text}{product ? product + "." : ""}</p>
      <em>{active ? "Connected" : "Connect"}</em>
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
