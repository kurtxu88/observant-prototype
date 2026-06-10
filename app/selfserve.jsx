/* ============================================================
   OBSERVANT self-serve SaaS prototype
   ============================================================ */
const { useState: useStateSS, useEffect: useEffectSS } = React;

const SS_SECTIONS = [
  { id: "home", label: "Home", icon: "grid" },
  { id: "learning", label: "Questions", icon: "chat" },
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

// Deep links: /setup always lands on onboarding (clears a launched workspace,
// keeps an in-progress one); /portal always lands on the dashboard (sample
// workspace auto-created if none exists yet).
const SS_VIEW = (() => {
  const path = window.location.pathname.toLowerCase();
  if (path.endsWith("/setup")) return "setup";
  if (path.endsWith("/portal")) return "portal";
  return "";
})();

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
  { id: "program", t: "Set up the program", d: "Compensation, your invitation" },
  { id: "surface", t: "Choose feedback surface", d: "Off-product or in-product" },
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
  const [sendPreviewOpen, setSendPreviewOpen] = useStateSS(false);
  const [previewEmail, setPreviewEmail] = useStateSS(state.workspace.email || "");
  const [previewSentTo, setPreviewSentTo] = useStateSS("");

  const patchSetup = (patch) => patchState((current) => ({ ...current, setup: { ...current.setup, ...patch } }));
  const setAudience = (id) => patchSetup({ audienceMode: id });
  const setRecruit = (id) => patchSetup({ recruitMode: id });
  const setConnect = (id) => patchSetup({ connectMode: id });
  const route = setup.route || "offproduct";
  const setRoute = (id) => patchSetup({ route: id });

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
          {step === 1 && (
            <section className="ss-panel">
              <PanelTitle k="Step 2" title="Choose your feedback surface" status={route === "inproduct" ? "In-product" : "Off-product"} />
              <p className="ss-step-lead"><b>One decision: where do the conversations live?</b></p>
              <div className="ss-route-grid">
                <button type="button" className={"ss-route" + (route === "offproduct" ? " on" : "")} onClick={() => setRoute("offproduct")}>
                  <span className="ss-route-head"><span className="ss-route-radio" /><b>Off-product channels</b><em className="ss-route-tag start">Start today</em></span>
                  <p>No setup needed. You share one magic link, and <b>each user chooses how to be reached — email or Telegram</b> — when they opt in. Their identifier arrives with that choice; you never hand over user data.</p>
                  <small>Email: quiet async 1:1s, whenever they have five minutes. Telegram: a one-tap private chat with the Observant bot.</small>
                </button>
                <button type="button" className={"ss-route" + (route === "inproduct" ? " on" : "")} onClick={() => setRoute("inproduct")}>
                  <span className="ss-route-head"><span className="ss-route-radio" /><b>In-product</b><em className="ss-route-tag pro">Pro · richer data</em></span>
                  <p>Observant lives inside your app and catches people at the exact moment of use — the richest surface. Simple setup, walked through with our team.</p>
                </button>
              </div>
              {route === "inproduct" && <ProUpsell />}
            </section>
          )}

          {step === 0 && (
            <section className="ss-panel">
              <PanelTitle k="Step 1" title="How the program works" status="You set the terms" />
              <p className="ss-step-lead">Observant handles the logistics. You set the terms once, and can change them anytime.</p>
              <div className="ss-program-block">
                <h3>Compensation</h3>
                <p>People earn by <b>participated minutes</b> — every text reply, voice chat, and call counts. <b>Observant measures and audits every minute for you.</b> You pay Observant, we pay your participants, and they redeem as they go — like spending down a gift card balance.</p>

                <div className="ss-rate-row">
                  <Field label="Reward rate">
                    <span className="ss-rate-input">$ <input className="input" type="number" min="0.25" step="0.25" value={setup.rate} onChange={(e) => patchSetup({ rate: Math.max(0.25, Number(e.target.value) || 1) })} /> per participated minute</span>
                  </Field>
                  <div className="ss-rate-calc"><b>30 minutes ≈ ${Math.round(30 * (setup.rate || 1))}</b><span>Industry guideline: $1 per minute. Set whatever fits your program.</span></div>
                </div>

                <div className="ss-upsell">
                  <div>
                    <b>Your product credits — coming</b>
                    <span>We're building a universal redemption flow so you can reward partners in your own product credits. For now, everyone defaults to cash compensation.</span>
                  </div>
                </div>

                <p className="ss-fineprint"><b>Perks worth mentioning in your invitation:</b> most companies we work with also give long-term active partners extras — invites to in-person events, conferences, time with the founding team. Completely up to you — we recommend it as a motivational mechanism for becoming a long-term feedback partner.</p>
              </div>
              <div className="ss-program-block">
                <h3>Your invitation</h3>
                <p><b>You send the invite yourself</b>, under your own brand — so your users are never confused about who's reaching out. People opt in as a <b>feedback partner</b>, and can opt out anytime, in one tap. Here's the invitation, ready to send — make it yours if you like.</p>
                <div className="ss-invite-copyblock">
                  <textarea className="ss-invite-edit" value={inviteDraft} rows={14} onChange={(e) => setInviteDraft(e.target.value)} />
                  <button type="button" className="ss-magiclink-copy" onClick={copyInvite}>{inviteCopied ? "Copied ✓" : "Copy text"}</button>
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
                <ReviewRowSS k="Feedback surface" v={route === "inproduct" ? "In-product (Pro) — set up with our team" : "Off-product — " + surfaceSummary} sub={route === "inproduct" ? "Your users can still connect by email or Telegram alongside it." : "Your users pick one at opt-in."} />
                <ReviewRowSS
                  k="Compensation"
                  v="Cash — managed by Observant"
                  sub={<>
                    <span className="ss-review-tier">${setup.rate || 1} per participated minute · 30 min ≈ ${Math.round(30 * (setup.rate || 1))} · redeem as you go</span>
                    <span className="ss-review-tier">Plus any perks you invite long-time partners to — events, early access, founder time.</span>
                  </>}
                />
                <ReviewRowSS k="Research questions" v={state.workspace.learningGoal || "None yet — that's fine"} sub="Participants never see these. Update them or feed in new questions anytime — Observant keeps weaving them into the 1:1s." />
                <ReviewRowSS
                  k="Invitation to users"
                  v={previewSentTo
                    ? <span className="ss-sent-note"><Icon name="check" size={14} sw={2.4} /> Preview sent to {previewSentTo} <button type="button" className="ss-doc-link ss-row-cta" onClick={() => { setPreviewSentTo(""); setSendPreviewOpen(true); }}>Send again</button></span>
                    : <button type="button" className="ss-doc-link ss-row-cta" onClick={() => setSendPreviewOpen((v) => !v)}>Preview the invitation email →</button>}
                  sub="The text you wrote in Step 1 — we'll email you a preview, exactly as your users receive it."
                />
              </div>
              {sendPreviewOpen && !previewSentTo && (
                <div className="ss-sendpreview">
                  <Field label="What's your email address?">
                    <input className="input" type="email" value={previewEmail} placeholder="you@company.com" onChange={(e) => setPreviewEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && previewEmail.includes("@")) { setPreviewSentTo(previewEmail); setSendPreviewOpen(false); } }} />
                  </Field>
                  <Btn variant="primary" size="sm" disabled={!previewEmail.includes("@")} onClick={() => { setPreviewSentTo(previewEmail); setSendPreviewOpen(false); }}>Send me the preview</Btn>
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
                      <div><b>{opt.label}</b><p>{opt.text}</p></div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          <div className="ss-onboard-nav">
            {step > 0 ? <Btn variant="ghost" onClick={back}><Icon name="back" size={16} /> Back</Btn> : <span />}
            <span className="count">{(step + 1) + " / " + SS_ONBOARD_STEPS.length}</span>
            {step < SS_ONBOARD_STEPS.length - 1
              ? <Btn variant="primary" onClick={next}>Continue <Icon name="arrow" size={16} /></Btn>
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

      {custom && !state.loops.length && (
        <section className="ss-panel ss-start-panel">
          <PanelTitle k="Next" title="Ask your panel a question" status="Ready" />
          <p>Your people are already on a continuous one-on-one line. Ask anything you're curious about and watch their answers and the insight arrive in stages.</p>
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={() => navigate({ section: "learning", focusedTarget: "create-loop" })}><Icon name="spark" size={15} /> Ask a question</Btn>
          </div>
        </section>
      )}

      <section className="ss-panel">
        <PanelTitle k="Now" title="Active lines" status="Live" />
        {state.conversations.length ? <ConversationList state={state} compact navigate={navigate} /> : <EmptyState title="No lines yet" text="Ask a question and Observant opens 1:1 lines with your panel." />}
      </section>

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

function LearningView({ state, patchState, navigate }) {
  const product = SelfServeData.productName(state.workspace);
  const custom = ssWorkspaceIsCustom(state);
  const [question, setQuestion] = useStateSS("");
  const [slackConnected, setSlackConnected] = useStateSS(false);
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
      <section className="ss-panel ss-slack-banner">
        <div>
          <PanelTitle k="Integrate" title="Ask straight from Slack" status="Recommended" />
          <p className="ss-step-lead">Connect Slack and your team's questions relay here automatically — ask in your channel, your panel hears it, and responses start piping back within the hour.</p>
        </div>
        {slackConnected
          ? <p className="ss-sent-note"><Icon name="check" size={15} sw={2.4} /> Slack connected — questions your team asks there will appear below.</p>
          : <Btn variant="primary" size="sm" onClick={() => setSlackConnected(true)}>Connect Slack</Btn>}
      </section>

      <section className={"ss-panel" + ssFocusClass(state, "create-loop")} id="create-loop">
        <PanelTitle k="Ask" title="Ask your panel a question" status="Always on" />
        <p className="ss-step-lead">Everyone who opted in is on a continuous one-on-one line. Ask anything — Observant phrases it for each person and gathers the answers.</p>
        <Field label="Your question">
          <textarea className="textarea" value={question} placeholder={"e.g. What almost stopped you from sticking with " + product + "?"} onChange={(e) => setQuestion(e.target.value)} />
        </Field>
        {activeRun ? (
          <div className="ss-asking"><span className="ss-spinner" /> {stageLabel}…</div>
        ) : (
          <div className="ss-panel-actions">
            <Btn variant="primary" onClick={submit} disabled={!question.trim()}><Icon name="spark" size={15} /> Ask the panel</Btn>
          </div>
        )}
      </section>

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
    </div>
  );
}

function PeopleView({ state, patchState }) {
  const selected = state.conversations.find((c) => c.id === state.selectedConversationId) || state.conversations[0];
  const person = ssPersonForConversation(state, selected);
  const [followUpOpen, setFollowUpOpen] = useStateSS(false);
  const [followUpQ, setFollowUpQ] = useStateSS("");
  const [followUpStage, setFollowUpStage] = useStateSS("");

  if (!selected || !person) {
    return (
      <section className="ss-panel">
        <PanelTitle k="Partners" title="Your feedback partners" status="No lines" />
        <p className="mut">No lines are open yet.</p>
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
        conversations: ssUpdateById(current.conversations, selected.id, (conversation) => ({
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
          <span className="ss-via">{selected.mode === "voice" ? "Voice interview · transcript" : "Chat"} · via Observant</span>
        </div>
        <p className="ss-relay-note">This isn't a direct message thread — Observant's interviewer holds this line with {person.name.split(" ")[0]} over {person.surface} and relays what your team needs.</p>
        <div className="ss-person-context">
          <div><b>Learned context</b><span>{person.memory}</span></div>
          <div><b>Last signal</b><span>{person.last}</span></div>
          <div><b>Active line</b><span>{selected.title}</span></div>
        </div>
        <div className="ss-chat-body">
          {selected.messages.map((message, i) => <ChatMessage key={i} message={message} />)}
        </div>
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
