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
  const ids = loop.peopleIds || [];
  return state.people.filter((person) => ids.includes(person.id));
}

function ssLoopConversations(state, loop) {
  const ids = loop.conversationIds || (loop.conversationId ? [loop.conversationId] : []);
  return state.conversations.filter((conversation) => ids.includes(conversation.id));
}

function ssLoopEvents(state, loop) {
  const ids = loop.eventIds || [];
  return state.events.filter((event) => ids.includes(event.id));
}

function ssSurfaceLabel(surface) {
  const labels = { product: "In-product", browser: "Browser companion", email: "Email" };
  return labels[surface] || surface;
}

function ssCreateLoopDraft(state, loop) {
  const loopSurfaceIds = loop.surfaceIds || Object.keys(state.setup.surfaces).filter((surface) => state.setup.surfaces[surface]);
  const loopEventIds = loop.eventIds || state.events.filter((event) => state.setup.events[event.event]).map((event) => event.id);
  return {
    loopId: loop.id,
    question: loop.question,
    learningGoal: state.workspace.learningGoal,
    surfaces: Object.fromEntries(Object.keys(state.setup.surfaces).map((surface) => [surface, loopSurfaceIds.includes(surface)])),
    events: Object.fromEntries(Object.keys(state.setup.events).map((eventName) => {
      const event = state.events.find((item) => item.event === eventName);
      return [eventName, event ? loopEventIds.includes(event.id) : !!state.setup.events[eventName]];
    })),
  };
}

function SelfServeApp() {
  const [state, setState] = useStateSS(() => ssLoadState());
  const [copied, setCopied] = useStateSS("");

  useEffectSS(() => {
    if (state) ssSaveState(state);
  }, [state]);

  const createWorkspace = (form) => {
    setState(SelfServeData.createInitialState(form));
  };

  const resetWorkspace = () => {
    ssRemoveState();
    setState(null);
  };

  const patchState = (updater) => {
    setState((current) => {
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
          <Btn variant="primary" size="lg" onClick={() => onCreate(form)}>Create workspace <Icon name="arrow" size={16} /></Btn>
          <Btn variant="ghost" size="lg" onClick={() => onCreate(SS_DEFAULT_WORKSPACE)}>Continue with sample workspace</Btn>
        </div>
        <p className="ss-fineprint">No real signup, billing, or data connection is created.</p>
      </main>
    </div>
  );
}

function ActivationScreen({ state, patchState, onLaunch, copied, copyText, resetWorkspace }) {
  const readiness = SelfServeData.readiness(state.setup);
  const product = SelfServeData.productName(state.workspace);

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
  const webhook = `POST https://api.observant.ai/v1/events\nAuthorization: Bearer obv_live_sample\n{\n  "event": "export_completed",\n  "user_id": "user_123",\n  "properties": { "workspace": "${product}" }\n}`;

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
          <p>Connect the minimum pieces Observant needs to keep learning from your users.</p>
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
                title="Invite your users"
                text="Share an invite link with power users, early adopters, or a segment from your product."
                detail={state.setup.inviteUrl}
                onClick={() => setUsersSource("invite")}
              />
              <SelectCard
                active={state.setup.usersSource === "recruit"}
                icon="users"
                title="Recruit a vetted group"
                text="Start before launch with screened people who match your best-customer profile."
                detail="Managed by Observant"
                onClick={() => setUsersSource("recruit")}
              />
            </div>
          </section>

          <section className="ss-panel">
            <PanelTitle k="Surfaces" title="Connect where conversations happen" status={readiness.surfaces ? readiness.connectedSurfaces + " connected" : "Required"} />
            <div className="ss-card-grid three">
              <SurfaceCard active={state.setup.surfaces.product} icon="globe" title="In-product" text="Open a private line inside " product={product} onClick={() => toggleSurface("product")} />
              <SurfaceCard active={state.setup.surfaces.browser} icon="search" title="Browser companion" text="Catch web behavior and follow up in context." onClick={() => toggleSurface("browser")} />
              <SurfaceCard active={state.setup.surfaces.email} icon="mail" title="Email" text="Keep quiet async lines open for users who prefer inbox replies." onClick={() => toggleSurface("email")} />
            </div>
            <CodeBlock label="Embed snippet" text={snippet} copied={copied === "embed"} onCopy={() => copyText("embed", snippet)} />
          </section>

          <section className="ss-panel">
            <PanelTitle k="Events" title="Install behavior events" status={readiness.events ? readiness.installedEvents + " installed" : "Required"} />
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
              <p>{readiness.ready ? "Observant has enough to open private lines, remember context, and surface what changes." : "Complete user source, at least one surface, and at least one event to turn learning mode on."}</p>
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
            <button type="button" className="ss-live ss-live-button" onClick={() => navigate({ section: "learning", loopId: "loop-export", focusedTarget: "loop-export" })}><i></i>Learning mode is on</button>
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

  return (
    <div className="ss-page-stack">
      <section className="ss-hero-status">
        <div>
          <span className="eyebrow no-rule">Operating system</span>
          <h2>Learning mode is on.</h2>
          <p>Observant is watching behavior, keeping private lines open, and bringing signal back to {product} while you ship.</p>
        </div>
        <div className="ss-hero-metrics">
          <Metric n="252" l="moments remembered" onClick={() => navigate({ section: "insights", focusedTarget: "insight-export" })} />
          <Metric n={String(readiness.connectedSurfaces)} l="surfaces connected" onClick={() => navigate({ section: "learning", focusedTarget: "learning-config" })} />
          <Metric n={String(state.conversations.length)} l="active private lines" onClick={() => navigate({ section: "people", conversationId: activeConversationId, focusedTarget: "person-" + (activePerson ? activePerson.id : activeConversationId) })} />
        </div>
      </section>

      <div className="ss-dashboard-grid">
        <section className="ss-panel">
          <PanelTitle k="Now" title="Active private lines" status="Live" />
          <ConversationList state={state} compact navigate={navigate} />
        </section>
        <section className="ss-panel">
          <PanelTitle k="Signals" title="Recent behavior triggers" status="Watching" />
          <EventList state={state} events={state.events} navigate={navigate} />
        </section>
      </div>

      <div className="ss-dashboard-grid">
        <AskObservant state={state} patchState={patchState} />
        <section className="ss-panel">
          <PanelTitle k="Memory" title="What Observant remembers" status="Growing" />
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
  const loopPeople = ssLoopPeople(state, selected);
  const loopConversations = ssLoopConversations(state, selected);
  const loopEvents = ssLoopEvents(state, selected);
  const selectedSurfaceIds = selected.surfaceIds || Object.keys(state.setup.surfaces).filter((surface) => state.setup.surfaces[surface]);
  const selectedEventIds = selected.eventIds || loopEvents.map((event) => event.id);
  const [isEditing, setIsEditing] = useStateSS(false);
  const [draft, setDraft] = useStateSS(() => ssCreateLoopDraft(state, selected));
  const productSlug = product.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const apiKey = "obv_live_sample_" + product.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10);
  const snippet = `<script src="https://cdn.observant.ai/agent.js" data-workspace="${productSlug}"></script>`;
  const webhook = `POST https://api.observant.ai/v1/events
Authorization: Bearer ${apiKey}

{
  "event": "export_completed",
  "user_id": "user_123",
  "properties": {
    "workspace": "${product}"
  }
}`;

  useEffectSS(() => {
    if (isEditing) setDraft(ssCreateLoopDraft(state, selected));
  }, [selected.id]);

  const selectLoop = (loop) => {
    patchState((current) => ({ ...current, selectedLoopId: loop.id, focusedTarget: loop.id }));
  };

  const openEdit = () => {
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
    patchState((current) => ({
      ...current,
      workspace: { ...current.workspace, learningGoal: draft.learningGoal },
      loops: ssUpdateById(current.loops, draft.loopId, () => ({
        question: draft.question,
        surfaceIds: Object.keys(draft.surfaces).filter((surface) => draft.surfaces[surface]),
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

  return (
    <>
      <div className="ss-learning-layout">
        <section className="ss-panel">
          <PanelTitle k="Learning" title="Learning loops" status={state.loops.length + " loops"} />
          <div className="ss-loop-list">
            {state.loops.map((loop) => (
              <button
                type="button"
                className={"ss-loop-option" + (selected.id === loop.id ? " on" : "") + ssFocusClass(state, loop.id)}
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

        <section className={"ss-panel ss-loop-detail" + ssFocusClass(state, selected.id) + ssFocusClass(state, "learning-config")}>
          <div className="ss-loop-detail-head">
            <PanelTitle k="Loop detail" title={selected.name} status={selected.status} />
            <Btn variant="primary" size="sm" onClick={openEdit}><Icon name="settings" size={15} /> Edit loop</Btn>
          </div>
          <div className="ss-loop-detail-grid">
            <Metric n={String(selected.people)} l="people watched" />
            <Metric n={String(selected.active)} l="active now" />
            <Metric n={String(selected.memory)} l="memories" />
            <Metric n={String(selectedEventIds.length || readiness.installedEvents)} l="events installed" />
          </div>

          <div className="ss-loop-read-grid">
            <ReadCard label="Loop question" text={selected.question} />
            <ReadCard label="Primary learning goal" text={state.workspace.learningGoal} />
          </div>

          <div className="ss-loop-meta-grid">
            <div><b>Cadence</b><span>{selected.cadence}</span></div>
            <div><b>Audience</b><span>{loopPeople.map((person) => person.segment).join(", ")}</span></div>
            <div><b>Surfaces</b><span>{selectedSurfaceIds.length ? selectedSurfaceIds.map(ssSurfaceLabel).join(", ") : "No surfaces connected"}</span></div>
          </div>

          <div className="ss-loop-columns">
            <section>
              <h3>Related people</h3>
              <div className="ss-related-list">
                {loopPeople.map((person) => (
                  <PersonLine
                    key={person.id}
                    person={person}
                    meta={person.segment + " · " + person.surface}
                    body={person.memory}
                    card
                    focused={state.focusedTarget === "person-" + person.id}
                    onClick={() => openPerson(person)}
                  />
                ))}
              </div>
            </section>
            <section>
              <h3>Relevant 1:1 lines</h3>
              <ConversationList state={state} conversations={loopConversations} compact navigate={navigate} />
            </section>
          </div>

          <div className="ss-loop-columns">
            <section>
              <h3>Signals watched by this loop</h3>
              <EventList state={state} events={loopEvents} navigate={navigate} />
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
              <h3>Events this loop can use</h3>
              <div className="ss-event-read-grid">
                {Object.keys(state.setup.events).map((eventName) => (
                  <span key={eventName} className={`ss-event-pill${state.events.some((event) => event.event === eventName && selectedEventIds.includes(event.id)) ? " on" : ""}`}>
                    <Icon name={state.events.some((event) => event.event === eventName && selectedEventIds.includes(event.id)) ? "check" : "bolt"} size={15} />
                    <b>{eventName}</b>
                  </span>
                ))}
              </div>
            </div>
            <CodeBlock label="Browser or in-product snippet" text={snippet} copied={copied === "learning-snippet"} onCopy={() => copyText("learning-snippet", snippet)} />
            <CodeBlock label="API key" text={apiKey} copied={copied === "learning-api-key"} onCopy={() => copyText("learning-api-key", apiKey)} />
            <CodeBlock label="Webhook sample" text={webhook} copied={copied === "learning-webhook"} onCopy={() => copyText("learning-webhook", webhook)} />
          </div>
        </section>
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

  const ask = () => {
    const answer = SelfServeData.cannedAnswer(state, question);
    patchState((current) => ({
      ...current,
      answers: [answer, ...current.answers],
      activity: ["Asked Observant: " + answer.question, ...current.activity],
    }));
  };

  return (
    <section className="ss-panel">
      <PanelTitle k="Ask Observant" title="Ask across what it has learned" status="Grounded" />
      <textarea className="textarea" value={question} onChange={(e) => setQuestion(e.target.value)} />
      <div className="ss-panel-actions">
        <Btn variant="primary" onClick={ask} disabled={!question.trim()}><Icon name="spark" size={15} /> Ask Observant</Btn>
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
