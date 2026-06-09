/* ============================================================
   OBSERVANT self-serve SaaS prototype
   ============================================================ */
const { useState: useStateSS, useEffect: useEffectSS } = React;

const SS_SECTIONS = [
  { id: "home", label: "Home", icon: "grid" },
  { id: "loops", label: "Learning loops", icon: "spark" },
  { id: "people", label: "People", icon: "users" },
  { id: "conversations", label: "Conversations", icon: "chat" },
  { id: "learned", label: "What Observant learned", icon: "book" },
  { id: "install", label: "Install", icon: "link" },
  { id: "settings", label: "Settings", icon: "settings" },
];

function ssLoadState() {
  try {
    const raw = localStorage.getItem(SS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
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
  const section = state.section || "home";
  const product = SelfServeData.productName(state.workspace);
  const unread = state.conversations.filter((c) => c.state === "Active").length;

  const setSection = (id) => patchState((current) => ({ ...current, section: id }));

  return (
    <div className="ss-shell">
      <aside className="ss-sidebar">
        <div className="ss-sidebar-brand"><Wordmark size="1.45rem" /></div>
        <nav className="ss-nav">
          {SS_SECTIONS.map((item) => (
            <button key={item.id} type="button" className={section === item.id ? "on" : ""} onClick={() => setSection(item.id)}>
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
              {item.id === "conversations" && <em>{unread}</em>}
            </button>
          ))}
        </nav>
        <div className="ss-workspace-foot">
          <span className="ws-logo">{SelfServeData.initials(product).slice(0, 1)}</span>
          <div>
            <b>{product}</b>
            <span>Learning mode on</span>
          </div>
        </div>
      </aside>

      <div className="ss-app-main">
        <header className="ss-topbar">
          <div>
            <span className="ss-breadcrumb">{product}</span>
            <h1>{SS_SECTIONS.find((s) => s.id === section)?.label || "Home"}</h1>
          </div>
          <div className="ss-topbar-actions">
            <span className="ss-live"><i></i>Learning mode is on</span>
            <Btn variant="ghost" size="sm" onClick={() => setSection("install")}>Install</Btn>
          </div>
        </header>

        <main className="ss-app-content">
          {section === "home" && <HomeView state={state} patchState={patchState} />}
          {section === "loops" && <LoopsView state={state} />}
          {section === "people" && <PeopleView state={state} />}
          {section === "conversations" && <ConversationsView state={state} patchState={patchState} />}
          {section === "learned" && <LearnedView state={state} patchState={patchState} />}
          {section === "install" && <InstallView state={state} copied={copied} copyText={copyText} patchState={patchState} />}
          {section === "settings" && <SettingsViewSS state={state} patchState={patchState} resetWorkspace={resetWorkspace} />}
        </main>
      </div>
    </div>
  );
}

function HomeView({ state, patchState }) {
  const readiness = SelfServeData.readiness(state.setup);
  const product = SelfServeData.productName(state.workspace);
  const latestAnswer = state.answers[0];

  return (
    <div className="ss-page-stack">
      <section className="ss-hero-status">
        <div>
          <span className="eyebrow no-rule">Operating system</span>
          <h2>Learning mode is on.</h2>
          <p>Observant is watching behavior, keeping private lines open, and bringing signal back to {product} while you ship.</p>
        </div>
        <div className="ss-hero-metrics">
          <Metric n="252" l="moments remembered" />
          <Metric n={String(readiness.connectedSurfaces)} l="surfaces connected" />
          <Metric n="3" l="active private lines" />
        </div>
      </section>

      <div className="ss-dashboard-grid">
        <section className="ss-panel">
          <PanelTitle k="Now" title="Active private lines" status="Live" />
          <ConversationList state={state} compact />
        </section>
        <section className="ss-panel">
          <PanelTitle k="Signals" title="Recent behavior triggers" status="Watching" />
          <EventList events={state.events} />
        </section>
      </div>

      <div className="ss-dashboard-grid">
        <AskObservant state={state} patchState={patchState} />
        <section className="ss-panel">
          <PanelTitle k="Memory" title="What Observant remembers" status="Growing" />
          <ul className="ss-memory-list">
            {state.people.slice(0, 3).map((person) => (
              <li key={person.id}><b>{person.name}</b><span>{person.memory}</span></li>
            ))}
          </ul>
        </section>
      </div>

      {latestAnswer && <LatestAnswerCard answer={latestAnswer} />}
    </div>
  );
}

function LoopsView({ state }) {
  return (
    <div className="ss-page-stack">
      <div className="ss-list-grid">
        {state.loops.map((loop) => (
          <article className="ss-loop-card" key={loop.id}>
            <div className="ss-loop-top">
              <span className="ss-status success">{loop.status}</span>
              <span className="mono mut">{loop.cadence}</span>
            </div>
            <h3>{loop.name}</h3>
            <p>{loop.question}</p>
            <div className="ss-loop-stats">
              <Metric n={String(loop.people)} l="people" />
              <Metric n={String(loop.active)} l="active now" />
              <Metric n={String(loop.memory)} l="memories" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PeopleView({ state }) {
  return (
    <section className="ss-panel">
      <PanelTitle k="People" title="Private user lines" status={state.people.length + " users"} />
      <div className="ss-table-list">
        {state.people.map((person) => (
          <div className="ss-person-row" key={person.id}>
            <Avatar name={person.name} color={person.color} />
            <div>
              <b>{person.name}</b>
              <span>{person.segment} - {person.surface}</span>
            </div>
            <p>{person.last}</p>
            <em>{person.status}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function ConversationsView({ state, patchState }) {
  const selected = state.conversations.find((c) => c.id === state.selectedConversationId) || state.conversations[0];
  const person = state.people.find((p) => p.id === selected.userId);

  const setSelected = (id) => patchState((current) => ({ ...current, selectedConversationId: id }));

  const relayQuestion = () => {
    patchState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          { t: "relay", text: "Would a live, shareable dashboard solve this workflow?", meta: "Relayed from your product team" },
          { t: "them", text: "Observant is threading this into the conversation with the context already remembered.", meta: "Observant" },
        ],
      })),
      activity: ["Question relayed to active private lines.", ...current.activity],
    }));
  };

  const requestLive = () => {
    patchState((current) => ({
      ...current,
      scheduledCalls: [
        { id: "call-" + Date.now(), user: person.name, time: "Thu 2:00pm", topic: selected.title },
        ...current.scheduledCalls,
      ],
      conversations: ssUpdateById(current.conversations, selected.id, () => ({
        messages: [
          ...selected.messages,
          { t: "relay", text: "Live 1:1 requested.", meta: "Your team" },
          { t: "them", text: person.name.split(" ")[0] + " - the team would love 15 minutes to watch this workflow. Does Thursday at 2pm work?", meta: "Observant" },
          { t: "user", text: "Thursday works. Send the invite.", meta: person.name.split(" ")[0] },
        ],
      })),
      activity: ["Live 1:1 scheduled with " + person.name + ".", ...current.activity],
    }));
  };

  return (
    <div className="ss-conv-layout">
      <section className="ss-panel">
        <PanelTitle k="Conversations" title="Active private lines" status="Live" />
        <div className="ss-conv-list">
          {state.conversations.map((conversation) => {
            const rowPerson = state.people.find((p) => p.id === conversation.userId);
            return (
              <button key={conversation.id} type="button" className={selected.id === conversation.id ? "on" : ""} onClick={() => setSelected(conversation.id)}>
                <Avatar name={rowPerson.name} color={rowPerson.color} />
                <span><b>{rowPerson.name}</b><em>{conversation.title}</em></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ss-chat-panel">
        <div className="ss-chat-head">
          <Avatar name={person.name} color={person.color} />
          <div>
            <h3>{person.name}</h3>
            <p>{person.segment} - {person.surface}</p>
          </div>
          <span className="ss-live"><i></i>{selected.state}</span>
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

function LearnedView({ state, patchState }) {
  const latestAnswer = state.answers[0];

  return (
    <div className="ss-page-stack">
      <AskObservant state={state} patchState={patchState} />
      {latestAnswer && <LatestAnswerCard answer={latestAnswer} />}
      <div className="ss-list-grid">
        {state.insights.map((insight) => (
          <article className="ss-insight-card" key={insight.id}>
            <span>{insight.metric}</span>
            <h3>{insight.title}</h3>
            <p>{insight.detail}</p>
            <em>{insight.evidence}</em>
            <div>{insight.next}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

function LatestAnswerCard({ answer }) {
  return (
    <section className="ss-answer-card">
      <span className="eyebrow no-rule">Latest answer</span>
      <h3>{answer.question}</h3>
      <p>{answer.answer}</p>
      <em>{answer.evidence}</em>
      <div>{answer.recommendation}</div>
    </section>
  );
}

function InstallView({ state, copied, copyText, patchState }) {
  const product = SelfServeData.productName(state.workspace);
  const snippet = `<script src="https://cdn.observant.ai/agent.js" data-workspace="${product.toLowerCase().replace(/[^a-z0-9]+/g, "-")}"></script>`;
  const apiKey = "obv_live_sample_" + product.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 10);
  const webhook = `POST https://api.observant.ai/v1/events
Authorization: Bearer ${apiKey}

{
  "event": "export_completed",
  "user_id": "user_123",
  "properties": {
    "workspace": "${product}"
  }
}`;

  const toggleEvent = (eventName) => {
    patchState((current) => ({
      ...current,
      setup: {
        ...current.setup,
        events: { ...current.setup.events, [eventName]: !current.setup.events[eventName] },
      },
    }));
  };

  return (
    <div className="ss-page-stack">
      <section className="ss-panel">
        <PanelTitle k="Install" title="Connect Observant to product behavior" status="Configured" />
        <CodeBlock label="Browser or in-product snippet" text={snippet} copied={copied === "install-snippet"} onCopy={() => copyText("install-snippet", snippet)} />
        <CodeBlock label="API key" text={apiKey} copied={copied === "api-key"} onCopy={() => copyText("api-key", apiKey)} />
        <CodeBlock label="Webhook sample" text={webhook} copied={copied === "install-webhook"} onCopy={() => copyText("install-webhook", webhook)} />
      </section>
      <section className="ss-panel">
        <PanelTitle k="Events" title="Events Observant is watching" status="Live" />
        <div className="ss-event-grid">
          {Object.keys(state.setup.events).map((eventName) => (
            <button type="button" key={eventName} className={`ss-event${state.setup.events[eventName] ? " on" : ""}`} onClick={() => toggleEvent(eventName)}>
              <span><Icon name={state.setup.events[eventName] ? "check" : "bolt"} size={15} /></span>
              <b>{eventName}</b>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsViewSS({ state, patchState, resetWorkspace }) {
  const updateWorkspace = (field, value) => {
    patchState((current) => ({ ...current, workspace: { ...current.workspace, [field]: value } }));
  };

  return (
    <section className="ss-panel ss-settings-panel">
      <PanelTitle k="Settings" title="Workspace settings" status="Saved locally" />
      <Field label="Company or product name">
        <input className="input" value={state.workspace.companyName} onChange={(e) => updateWorkspace("companyName", e.target.value)} />
      </Field>
      <Field label="Product URL">
        <input className="input" value={state.workspace.productUrl} onChange={(e) => updateWorkspace("productUrl", e.target.value)} />
      </Field>
      <Field label="Primary learning goal">
        <textarea className="textarea" value={state.workspace.learningGoal} onChange={(e) => updateWorkspace("learningGoal", e.target.value)} />
      </Field>
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

function ConversationList({ state, compact }) {
  return (
    <div className="ss-mini-lines">
      {state.conversations.map((conversation) => {
        const person = state.people.find((p) => p.id === conversation.userId);
        return (
          <div className="ss-mini-line" key={conversation.id}>
            <Avatar name={person.name} color={person.color} />
            <div>
              <b>{person.name}</b>
              <span>{compact ? person.last : conversation.title}</span>
            </div>
            <em>{conversation.state}</em>
          </div>
        );
      })}
    </div>
  );
}

function EventList({ events }) {
  return (
    <div className="ss-event-list">
      {events.map((event) => (
        <div key={event.id}>
          <span>{event.time}</span>
          <b>{event.event}</b>
          <p>{event.user} - {event.detail}</p>
        </div>
      ))}
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

function Metric({ n, l }) {
  return (
    <div className="ss-metric">
      <b>{n}</b>
      <span>{l}</span>
    </div>
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
