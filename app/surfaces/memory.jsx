/* OBSERVANT surface — Memory: the auto-written, editable product brain (§3).
   Mirrors Novus's Memory sub-pages, but for user-learning:
     · Product brain  — Overview / Personas / Product Areas / Key Flows / Site Map
                        (auto-written from the read-only GitHub scan — value before any data)
     · Moments & triggers — the "moments worth interviewing" as editable first-class
                        objects, gated by the visible conversation-quality bar
     · Context          — the standing context the team feeds (3-mo goal, hypotheses, docs)
   Registers window.OBS_SURFACES.memory. Reads state.workspace(.context), state.events,
   state.people, state.insights, state.signals, state.actLedger, state.conversations,
   state.pulseMoments. CSS prefix: obs-memory- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const { useState } = React;

  /* ---- local fallbacks (primitives live in selfserve.jsx; resolve via ui|window|local) ---- */
  function LocalPanelTitle({ k, title, status }) {
    return (
      <div className="ss-panel-title">
        <div><span>{k}</span><h2>{title}</h2></div>
        {status && <em>{status}</em>}
      </div>
    );
  }
  function LocalEmptyState({ title, text }) {
    return <div className="ss-empty-state"><b>{title}</b><span>{text}</span></div>;
  }

  /* ---- derivation helpers (read off state — no separate dataset) ---- */
  function firstName(p) { return p && p.name ? p.name.split(" ")[0] : ""; }

  // Behavioral moments the scan proposes from in-product events.
  const MOMENT_META = {
    export_completed:  { label: "Repeat export",     why: "A power user working around a missing share flow — ask what they're really doing with the CSV." },
    feature_opened:    { label: "Settings hunt",     why: "Someone hunting for a capability that may not exist — ask what they expected to find." },
    user_signed_up:    { label: "Onboarding",        why: "Catch the new-user mental model in week one, before confusion becomes churn." },
    checkout_abandoned:{ label: "Abandoned upgrade", why: "Ask what tipped them off the upgrade — price, or a team-visibility doubt." },
  };
  // Off-product cohorts (reached with consent + compensation) — ON by default.
  const OFF_META = {
    "Churned":         { label: "Churn outreach",          why: "Reach cancelled accounts off-product — the only way to hear why they really left." },
    "Never-converted": { label: "Never-converted outreach", why: "Free users who never upgraded — ask what would have gotten their team to look." },
    "Resurrected":     { label: "Resurrection",            why: "A dormant user returned — ask what pulled them back vs. what pushed them away." },
  };

  function inProductMoments(state) {
    return (state.events || []).map((e) => {
      const meta = MOMENT_META[e.event] || { label: e.event, why: "Worth a conversation." };
      return {
        id: e.id, tier: "in-product", event: e.event, label: meta.label, why: meta.why,
        detail: e.detail, last: e.time, who: e.user, conversationId: e.conversationId,
      };
    });
  }
  function offProductMoments(state) {
    const seen = {};
    const out = [];
    (state.people || []).forEach((p) => {
      const meta = OFF_META[p.segment];
      if (!meta || seen[p.segment]) return;
      seen[p.segment] = true;
      out.push({
        id: "off-" + p.segment.toLowerCase().replace(/[^a-z]+/g, "-"), tier: "off-product",
        event: p.surface || "off-product", label: meta.label, why: meta.why,
        detail: p.memory || "", last: "ongoing", who: p.name, conversationId: p.id,
      });
    });
    return out;
  }

  // Product areas + site-map "built/missing" derived from the file paths the
  // scan + every fix plan reference (state.insights / signals / actLedger steps).
  function collectAffects(state) {
    const out = [];
    const push = (s, title, kind) => { if (s && s.affects) out.push({ affects: s.affects, title, kind }); };
    (state.insights || []).forEach((i) => (i.steps || []).forEach((s) => push(s, i.title, "Insight")));
    (state.signals || []).forEach((g) => (g.steps || []).forEach((s) => push(s, g.title, "Signal")));
    (state.actLedger || []).forEach((a) => (a.steps || []).forEach((s) => push(s, a.title, "Act")));
    return out;
  }
  function areaForPath(p) {
    if (!p) return null;
    if (/Export/.test(p)) return "Reporting & export";
    if (/dashboard/i.test(p)) return "Dashboards & sharing";
    if (/onboarding/i.test(p)) return "Onboarding";
    if (/pricing/i.test(p)) return "Pricing & upgrade";
    if (/^docs/.test(p)) return "Product docs";
    return "Core app";
  }
  const AREA_DESC = {
    "Dashboards & sharing": "Where the value lives — and where the sharing gap keeps pushing people out to a CSV.",
    "Reporting & export":   "The weekly export path power users lean on as a sharing workaround.",
    "Onboarding":           "First-run setup. Where new users form (or fail to form) the reporting mental model.",
    "Pricing & upgrade":    "The self-serve upgrade surface — three plan tiers, the key conversion decision.",
    "Product docs":         "Internal specs the scan read to ground the product map.",
    "Core app":             "Routing, auth, and the shell every flow passes through.",
  };
  function deriveAreas(state) {
    const map = {};
    collectAffects(state).forEach((a) => {
      const name = areaForPath(a.affects);
      if (!map[name]) map[name] = { name, files: {}, related: {} };
      map[name].files[a.affects] = true;
      map[name].related[a.title] = a.kind;
    });
    return Object.values(map).map((a) => ({
      name: a.name, desc: AREA_DESC[a.name] || "",
      files: Object.keys(a.files),
      related: Object.keys(a.related).map((t) => ({ title: t, kind: a.related[t] })),
    }));
  }

  // Key flows — anchored to the trigger events that watch each one.
  function deriveFlows(state) {
    const ev = (name) => (state.events || []).find((e) => e.event === name);
    return [
      {
        id: "flow-onboarding", name: "Onboarding", persona: "New customer",
        steps: ["Sign up", "First-run setup", "Open first report", "Invite / share"],
        watch: ev("user_signed_up"),
        note: "The share step has no path yet — new users fall back to emailing a CSV.",
      },
      {
        id: "flow-reporting", name: "Reporting / export", persona: "Power user",
        steps: ["Build a view", "Export CSV", "Rebuild in a sheet", "Send to team"],
        watch: ev("export_completed") || ev("feature_opened"),
        note: "The export is really a sharing workaround — the recurring friction in every Signal.",
      },
      {
        id: "flow-upgrade", name: "Upgrade", persona: "Upgrade evaluator",
        steps: ["Check permissions", "Open pricing", "Price reveal", "Checkout"],
        watch: ev("checkout_abandoned"),
        note: "Evaluators stall before checkout — blocked on team-visibility proof, not price.",
      },
    ];
  }

  // Site map — a small synthesized route tree, with each leaf marked built/missing
  // against the file paths the scan actually found.
  function deriveSiteMap(state) {
    const paths = collectAffects(state).map((a) => a.affects.toLowerCase());
    const has = (frag) => paths.some((p) => p.includes(frag.toLowerCase()));
    return [
      { route: "/", label: "Home", depth: 0, file: "src/pages/Home.tsx", built: true },
      { route: "/onboarding", label: "First-run setup", depth: 0, file: "src/onboarding/FirstRun.tsx", built: has("firstrun") },
      { route: "/dashboard", label: "Dashboards", depth: 0, file: "src/dashboard/Dashboard.tsx", built: true },
      { route: "/dashboard/export", label: "Export to CSV", depth: 1, file: "src/dashboard/ExportButton.tsx", built: has("export") },
      { route: "/dashboard/share", label: "Read-only share link", depth: 1, file: "src/dashboard/ShareLink.tsx", built: has("sharelink") },
      { route: "/reports", label: "Saved reports", depth: 0, file: "src/pages/Reports.tsx", built: true },
      { route: "/pricing", label: "Pricing — Free / Team / Business", depth: 0, file: "src/pages/Pricing.tsx", built: has("pricing") },
      { route: "/settings", label: "Workspace settings", depth: 0, file: "src/pages/Settings.tsx", built: true },
      { route: "/api-docs", label: "API reference", depth: 0, file: "src/pages/ApiDocs.tsx", built: true },
    ];
  }

  // Conversation-quality bar — the "concrete-behavior bar," upstream of every Signal.
  const QUALITY_DIMS = [
    { label: "Grounded in real behavior", note: "Every conversation is stamped to a moment that actually fired — never a cold blast.", score: 0.96 },
    { label: "Asks one thing at a time", note: "One question per turn; no compound or leading questions.", score: 0.91 },
    { label: "Follows the thread", note: "Picks up the last answer instead of reading the next scripted line.", score: 0.88 },
    { label: "Stays on the user's job", note: "Anchors on what they were trying to get done, not feature opinions.", score: 0.93 },
    { label: "Stops at an existence-proof", note: "Pushes for something they DID — not what they'd hypothetically want.", score: 0.84 },
  ];
  function qualityGrade(avg) { return avg >= 0.9 ? "Strong" : avg >= 0.75 ? "Solid" : "Forming"; }

  /* =========================== component =========================== */
  function MemorySurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const Avatar = ui.Avatar || window.Avatar;
    const PanelTitle = ui.PanelTitle || window.PanelTitle || LocalPanelTitle;
    const EmptyState = ui.EmptyState || window.EmptyState || LocalEmptyState;

    const w = state.workspace || {};
    const ctx = w.context || {};
    const product = (w.companyName || "Northwind").trim();

    const areas = deriveAreas(state);
    const flows = deriveFlows(state);
    const sitemap = deriveSiteMap(state);
    const moments = inProductMoments(state).concat(offProductMoments(state));

    const [tab, setTab] = useState("brain");
    const [drawer, setDrawer] = useState(null);          // { kind, id }
    const [expanded, setExpanded] = useState({});        // flow expand
    const [editOverview, setEditOverview] = useState(false);
    const [overview, setOverview] = useState(w.productDescription || "");
    const [ctxDraft, setCtxDraft] = useState({ goal3mo: ctx.goal3mo || "", priorLearning: ctx.priorLearning || "" });
    const [ctxEditing, setCtxEditing] = useState(false);
    const [momentState, setMomentState] = useState(() => {
      const init = {};
      moments.forEach((m) => { init[m.id] = m.tier === "off-product"; }); // off ON, in-product OFF by default
      return init;
    });
    const [momFilter, setMomFilter] = useState("all");
    const [bar, setBar] = useState(0.7);                  // tunable quality threshold

    const qAvg = QUALITY_DIMS.reduce((s, d) => s + d.score, 0) / QUALITY_DIMS.length;
    const personById = (id) => (state.people || []).find((p) => p.id === id);
    const convoById = (id) => (state.conversations || []).find((c) => c.id === id || c.userId === id);

    // personas grouped off state.people
    const personaGroups = (() => {
      const map = {};
      (state.people || []).forEach((p) => {
        const seg = p.segment || "Other";
        if (!map[seg]) map[seg] = { segment: seg, people: [] };
        map[seg].people.push(p);
      });
      return Object.values(map);
    })();

    const filteredMoments = moments.filter((m) => momFilter === "all" || m.tier === momFilter);
    const liveCount = moments.filter((m) => momentState[m.id]).length;

    const TABS = [
      { id: "brain", label: "Product brain", icon: "grid" },
      { id: "moments", label: "Moments & triggers", icon: "bolt" },
      { id: "context", label: "Context", icon: "book" },
    ];

    /* ---------- drawer body ---------- */
    function renderDrawer() {
      if (!drawer) return null;
      let title = "", sub = "", body = null;
      if (drawer.kind === "persona") {
        const g = personaGroups.find((x) => x.segment === drawer.id);
        if (g) {
          title = g.segment; sub = g.people.length + " on the panel";
          body = (
            <div className="obs-memory-dwrap">
              {g.people.map((p) => (
                <div className="obs-memory-pcard" key={p.id}>
                  <div className="obs-memory-prow">
                    <Avatar name={p.name} color={p.color} />
                    <div><b>{p.name}</b><span className="obs-memory-pstatus">{p.status} · {p.surface}</span></div>
                  </div>
                  <p className="obs-memory-pmem">{p.memory}</p>
                  {p.last && <p className="obs-memory-pquote">“{p.last}”</p>}
                </div>
              ))}
            </div>
          );
        }
      } else if (drawer.kind === "area") {
        const a = areas.find((x) => x.name === drawer.id);
        if (a) {
          title = a.name; sub = a.files.length + " files · " + a.related.length + " linked";
          body = (
            <div className="obs-memory-dwrap">
              <p className="obs-memory-dlead">{a.desc}</p>
              <div className="obs-memory-dsec">Files</div>
              {a.files.map((f) => <code className="obs-memory-file" key={f}>{f}</code>)}
              <div className="obs-memory-dsec">What the learning touches here</div>
              {a.related.map((r, i) => (
                <div className="obs-memory-rel" key={i}><span className={"obs-memory-kind k-" + r.kind.toLowerCase()}>{r.kind}</span> {r.title}</div>
              ))}
            </div>
          );
        }
      } else if (drawer.kind === "moment") {
        const m = moments.find((x) => x.id === drawer.id);
        if (m) {
          const conv = convoById(m.conversationId);
          title = m.label; sub = m.tier === "off-product" ? "Off-product moment" : "In-product trigger";
          body = (
            <div className="obs-memory-dwrap">
              <div className="obs-memory-mline"><span className="obs-memory-evchip mono">{m.event}</span><span className="obs-memory-mlast">last fired {m.last}</span></div>
              <p className="obs-memory-dlead">{m.detail}</p>
              <div className="obs-memory-dsec">Why it's worth a conversation</div>
              <p className="obs-memory-why">{m.why}</p>
              {conv && (
                <>
                  <div className="obs-memory-dsec">The 1:1 it opened</div>
                  <div className="obs-memory-convo">
                    {(conv.messages || []).slice(0, 4).map((msg, i) => (
                      <div className={"obs-memory-msg " + (msg.t === "user" ? "them" : "obs")} key={i}>
                        <span className="obs-memory-msgmeta">{msg.meta}</span>{msg.text}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        }
      }
      return (
        <div className="obs-memory-drawer-scrim" onClick={() => setDrawer(null)}>
          <aside className="obs-memory-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="obs-memory-drawer-top">
              <div><span className="obs-memory-dkind">{sub}</span><h3>{title}</h3></div>
              <button className="obs-memory-x" onClick={() => setDrawer(null)} aria-label="Close"><Icon name="x" size={18} /></button>
            </div>
            {body}
          </aside>
        </div>
      );
    }

    /* ---------- product brain tab ---------- */
    function renderBrain() {
      return (
        <div className="obs-memory-stack">
          {/* Overview */}
          <section className="obs-memory-card">
            <div className="obs-memory-cardhead">
              <div><span className="obs-memory-eyebrow">Product overview</span><h3 className="obs-memory-h3">{product}</h3></div>
              <button className="obs-memory-editbtn" onClick={() => { if (editOverview) setEditOverview(false); else { setOverview(w.productDescription || ""); setEditOverview(true); } }}>
                {editOverview ? "Done" : "Edit"}
              </button>
            </div>
            {editOverview ? (
              <textarea className="obs-memory-ta" value={overview} onChange={(e) => setOverview(e.target.value)} />
            ) : (
              <p className="obs-memory-lead">{overview || w.productDescription}</p>
            )}
            <div className="obs-memory-facts">
              <div><span>Who it's for</span><b>{w.userBase}</b></div>
              <div><span>Live at</span><b className="mono">{w.productUrl}</b></div>
              <div><span>Learning goal</span><b>{w.learningGoal}</b></div>
            </div>
            <p className="obs-memory-source"><Icon name="check" size={12} sw={2.4} /> Auto-written from a read-only scan · main @ 4f9c2a1 · 318 files · no analytics found</p>
          </section>

          {/* Personas */}
          <section className="obs-memory-card">
            <span className="obs-memory-eyebrow">Personas</span>
            <h3 className="obs-memory-h3">{personaGroups.length} types using {product}</h3>
            {personaGroups.length ? (
              <div className="obs-memory-grid">
                {personaGroups.map((g) => (
                  <button className="obs-memory-tile" key={g.segment} onClick={() => setDrawer({ kind: "persona", id: g.segment })}>
                    <div className="obs-memory-tilehead"><b>{g.segment}</b><span>{g.people.length}</span></div>
                    <div className="obs-memory-avastack">
                      {g.people.slice(0, 4).map((p) => <Avatar key={p.id} name={p.name} color={p.color} />)}
                    </div>
                    <p>{(g.people[0] && g.people[0].memory) || ""}</p>
                  </button>
                ))}
              </div>
            ) : <EmptyState title="No personas yet" text="They're written from your panel as people opt in." />}
          </section>

          {/* Product areas */}
          <section className="obs-memory-card">
            <span className="obs-memory-eyebrow">Product areas</span>
            <h3 className="obs-memory-h3">{areas.length} areas the scan mapped</h3>
            {areas.length ? (
              <div className="obs-memory-grid">
                {areas.map((a) => (
                  <button className="obs-memory-tile" key={a.name} onClick={() => setDrawer({ kind: "area", id: a.name })}>
                    <div className="obs-memory-tilehead"><b>{a.name}</b><span>{a.related.length}</span></div>
                    <p>{a.desc}</p>
                    <div className="obs-memory-filerow">{a.files.slice(0, 2).map((f) => <code key={f}>{f.split("/").pop()}</code>)}</div>
                  </button>
                ))}
              </div>
            ) : <EmptyState title="Mapping your areas" text="Connect the repo and the scan writes them here." />}
          </section>

          {/* Key flows */}
          <section className="obs-memory-card">
            <span className="obs-memory-eyebrow">Key flows</span>
            <h3 className="obs-memory-h3">{flows.length} flows worth watching</h3>
            <div className="obs-memory-flows">
              {flows.map((f) => {
                const open = !!expanded[f.id];
                return (
                  <div className={"obs-memory-flow" + (open ? " open" : "")} key={f.id}>
                    <button className="obs-memory-flowhead" onClick={() => setExpanded((s) => ({ ...s, [f.id]: !open }))}>
                      <b>{f.name}</b>
                      <span className="obs-memory-flowpersona">{f.persona}</span>
                      <Icon name={open ? "x" : "arrow"} size={14} />
                    </button>
                    <div className="obs-memory-flowsteps">
                      {f.steps.map((s, i) => (
                        <React.Fragment key={i}>
                          <span className="obs-memory-step">{s}</span>
                          {i < f.steps.length - 1 && <span className="obs-memory-stepsep">›</span>}
                        </React.Fragment>
                      ))}
                    </div>
                    {open && (
                      <div className="obs-memory-flowbody">
                        <p>{f.note}</p>
                        {f.watch && <span className="obs-memory-watch"><Icon name="bolt" size={12} /> Watched by <code className="mono">{f.watch.event}</code> — {f.watch.detail}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Site map */}
          <section className="obs-memory-card">
            <span className="obs-memory-eyebrow">Site map</span>
            <h3 className="obs-memory-h3">Routes the scan found</h3>
            <div className="obs-memory-sitemap">
              {sitemap.map((n) => (
                <div className={"obs-memory-node depth-" + n.depth + (n.built ? "" : " missing")} key={n.route}>
                  <code className="obs-memory-noderoute">{n.route}</code>
                  <span className="obs-memory-nodelabel">{n.label}</span>
                  <code className="obs-memory-nodefile">{n.file}</code>
                  {n.built
                    ? <span className="obs-memory-nodetag built"><Icon name="check" size={11} sw={2.6} /></span>
                    : <span className="obs-memory-nodetag gap">missing — the gap</span>}
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    }

    /* ---------- moments & triggers tab ---------- */
    function renderMoments() {
      return (
        <div className="obs-memory-stack">
          {/* conversation-quality bar */}
          <section className="obs-memory-card obs-memory-qbar">
            <div className="obs-memory-cardhead">
              <div><span className="obs-memory-eyebrow">Conversation quality</span><h3 className="obs-memory-h3">The concrete-behavior bar</h3></div>
              <span className={"obs-memory-grade g-" + qualityGrade(qAvg).toLowerCase()}>{qualityGrade(qAvg)} · {Math.round(qAvg * 100)}</span>
            </div>
            <p className="obs-memory-lead">This sits upstream of every Signal. A pretty Signals tab on a lazy interviewer loses you on the first hallucinated insight — so every conversation is graded before it's allowed to feed a Signal.</p>
            <div className="obs-memory-qdims">
              {QUALITY_DIMS.map((d) => (
                <div className="obs-memory-qdim" key={d.label}>
                  <div className="obs-memory-qdimtop"><span>{d.label}</span><b>{Math.round(d.score * 100)}</b></div>
                  <div className="obs-memory-meter"><i style={{ width: (d.score * 100) + "%" }} /></div>
                  <p>{d.note}</p>
                </div>
              ))}
            </div>
            <div className="obs-memory-thresh">
              <div className="obs-memory-threshtop">
                <span>Minimum quality to raise a Signal</span>
                <b>{Math.round(bar * 100)}</b>
              </div>
              <input type="range" min="40" max="95" value={Math.round(bar * 100)} onChange={(e) => setBar(Number(e.target.value) / 100)} />
              <p className="obs-memory-threshnote">Below the bar, Observant keeps asking the next question instead of raising a Signal — it never guesses to pad a number.</p>
            </div>
          </section>

          {/* moments / triggers */}
          <section className="obs-memory-card">
            <div className="obs-memory-cardhead">
              <div><span className="obs-memory-eyebrow">Moments worth interviewing</span><h3 className="obs-memory-h3">{liveCount} of {moments.length} live</h3></div>
              <div className="obs-memory-seg">
                {["all", "in-product", "off-product"].map((f) => (
                  <button key={f} className={momFilter === f ? "on" : ""} onClick={() => setMomFilter(f)}>{f === "all" ? "All" : f}</button>
                ))}
              </div>
            </div>
            <p className="obs-memory-lead">Asking people feels heavy — so most behavior is just watched. These are the few moments where a 1:1 pays off. Edit them, or switch them on and off.</p>
            <div className="obs-memory-moments">
              {filteredMoments.map((m) => {
                const on = !!momentState[m.id];
                return (
                  <div className={"obs-memory-moment" + (on ? " on" : "")} key={m.id}>
                    <button className="obs-memory-momenttog" role="switch" aria-checked={on} onClick={() => setMomentState((s) => ({ ...s, [m.id]: !on }))}>
                      <span className="obs-memory-knob" />
                    </button>
                    <button className="obs-memory-momentmain" onClick={() => setDrawer({ kind: "moment", id: m.id })}>
                      <div className="obs-memory-momenttop">
                        <b>{m.label}</b>
                        <span className={"obs-memory-tier t-" + m.tier.split("-")[0]}>{m.tier}</span>
                        <span className="obs-memory-evchip mono">{m.event}</span>
                      </div>
                      <p className="obs-memory-momentdetail">{m.detail}</p>
                      <p className="obs-memory-why">{m.why}</p>
                      <span className="obs-memory-momentlast">last fired {m.last} · {m.who}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      );
    }

    /* ---------- context tab ---------- */
    function renderContext() {
      const docs = ctx.docs || [];
      const filled = [w.productDescription, w.userBase, w.productUrl, ctxDraft.goal3mo, ctxDraft.priorLearning, docs.length ? "x" : ""].filter((v) => String(v || "").trim()).length;
      return (
        <div className="obs-memory-stack">
          <section className="obs-memory-card">
            <div className="obs-memory-cardhead">
              <div><span className="obs-memory-eyebrow">Standing context</span><h3 className="obs-memory-h3">What you've told Observant about {product}</h3></div>
              <span className="obs-memory-filled">{filled} of 6 filled</span>
            </div>
            <p className="obs-memory-lead">The shared memory behind every question Observant asks. The more it knows, the sharper each conversation — add to it anytime.</p>
            <div className="obs-memory-ctx">
              <div className="obs-memory-ctxblock">
                <div className="obs-memory-ctxlabel"><span>3-month business goal — the decision this learning serves</span>
                  <button className="obs-memory-editbtn" onClick={() => setCtxEditing((v) => !v)}>{ctxEditing ? "Done" : "Edit"}</button>
                </div>
                {ctxEditing
                  ? <textarea className="obs-memory-ta" value={ctxDraft.goal3mo} onChange={(e) => setCtxDraft((s) => ({ ...s, goal3mo: e.target.value }))} />
                  : <p className="obs-memory-ctxval">{ctxDraft.goal3mo || <em className="mut">Not set yet.</em>}</p>}
              </div>
              <div className="obs-memory-ctxblock">
                <div className="obs-memory-ctxlabel"><span>What you've already learned / current hypotheses</span></div>
                {ctxEditing
                  ? <textarea className="obs-memory-ta" value={ctxDraft.priorLearning} onChange={(e) => setCtxDraft((s) => ({ ...s, priorLearning: e.target.value }))} />
                  : <p className="obs-memory-ctxval">{ctxDraft.priorLearning || <em className="mut">Not set yet.</em>}</p>}
              </div>
            </div>
          </section>

          <section className="obs-memory-card">
            <span className="obs-memory-eyebrow">Documents</span>
            <h3 className="obs-memory-h3">{docs.length} fed to the brain</h3>
            <div className="obs-memory-docs">
              {docs.map((d, i) => (
                <div className="obs-memory-doc" key={d.id || i}>
                  <span className="obs-memory-docname"><Icon name="check" size={13} sw={2.4} /> {d.name}</span>
                  <span className="obs-memory-docnote">{d.note}</span>
                </div>
              ))}
              <div className="obs-memory-docadd"><Icon name="plus" size={14} /> Upload more — PRDs, decks, past research, support themes</div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <div className="obs-memory-root">
        <StyleOnce />
        <PanelTitle k="Memory" title={"The product brain for " + product} status={moments.length + " moments · " + areas.length + " areas"} />
        <div className="obs-memory-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={"obs-memory-tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
          <span className="obs-memory-tabq">Conversation quality <b className={"g-" + qualityGrade(qAvg).toLowerCase()}>{qualityGrade(qAvg)}</b></span>
        </div>
        {tab === "brain" ? renderBrain() : tab === "moments" ? renderMoments() : renderContext()}
        {renderDrawer()}
      </div>
    );
  }

  /* ---------------- scoped styles (obs-memory- prefix) ---------------- */
  function StyleOnce() {
    return (
      <style dangerouslySetInnerHTML={{ __html: `
.obs-memory-root{ max-width:980px; }
.obs-memory-tabs{ display:flex; align-items:center; gap:6px; border-bottom:1px solid var(--border); margin:6px 0 22px; }
.obs-memory-tab{ display:inline-flex; align-items:center; gap:7px; padding:9px 14px; font-size:.86rem; font-weight:500; color:var(--text-secondary); background:none; border:none; border-bottom:2px solid transparent; margin-bottom:-1px; cursor:pointer; transition:all .18s; }
.obs-memory-tab:hover{ color:var(--text-primary); }
.obs-memory-tab.on{ color:var(--accent); border-bottom-color:var(--accent); }
.obs-memory-tabq{ margin-left:auto; font-family:var(--font-mono); font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; color:var(--text-muted); }
.obs-memory-tabq b{ margin-left:5px; }
.obs-memory-stack{ display:flex; flex-direction:column; gap:18px; }
.obs-memory-card{ background:var(--panel); border:1px solid var(--border); border-radius:14px; padding:22px 24px; }
.obs-memory-eyebrow{ font-family:var(--font-mono); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); font-weight:500; }
.obs-memory-h3{ font-family:var(--font-display); font-weight:500; font-size:1.32rem; margin:3px 0 0; color:var(--text-primary); letter-spacing:-.01em; }
.obs-memory-cardhead{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.obs-memory-lead{ color:var(--text-secondary); font-size:.92rem; margin:12px 0 0; line-height:1.6; max-width:64ch; }
.obs-memory-editbtn{ font-family:var(--font-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; color:var(--text-secondary); background:none; border:1px solid var(--border-strong); border-radius:7px; padding:5px 11px; cursor:pointer; flex-shrink:0; }
.obs-memory-editbtn:hover{ color:var(--accent); border-color:var(--accent); }
.obs-memory-ta{ width:100%; margin-top:12px; font-family:var(--font-sans); font-size:.92rem; color:var(--text-primary); background:var(--surface); border:1px solid var(--border-strong); border-radius:10px; padding:11px 13px; line-height:1.55; min-height:74px; resize:vertical; }
.obs-memory-facts{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:16px; margin-top:18px; padding-top:18px; border-top:1px solid var(--border); }
.obs-memory-facts > div{ display:flex; flex-direction:column; gap:4px; }
.obs-memory-facts span{ font-size:.72rem; text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); }
.obs-memory-facts b{ font-weight:500; color:var(--text-primary); font-size:.9rem; line-height:1.5; }
.obs-memory-source{ display:flex; align-items:center; gap:7px; margin-top:16px; font-size:.78rem; color:var(--success); }
.obs-memory-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; margin-top:16px; }
.obs-memory-tile{ text-align:left; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:15px 16px; cursor:pointer; transition:all .18s; display:flex; flex-direction:column; gap:9px; }
.obs-memory-tile:hover{ border-color:var(--accent); transform:translateY(-1.5px); box-shadow:0 10px 24px -18px oklch(0.4 0.05 40 / .5); }
.obs-memory-tilehead{ display:flex; align-items:center; justify-content:space-between; }
.obs-memory-tilehead b{ font-weight:600; font-size:.95rem; color:var(--text-primary); }
.obs-memory-tilehead span{ font-family:var(--font-mono); font-size:.78rem; color:var(--accent); background:var(--accent-tint); border-radius:20px; padding:1px 9px; }
.obs-memory-tile p{ font-size:.82rem; color:var(--text-secondary); line-height:1.5; margin:0; }
.obs-memory-avastack{ display:flex; }
.obs-memory-avastack .conv-ava{ margin-right:-7px; border:2px solid var(--panel); }
.obs-memory-filerow{ display:flex; gap:6px; flex-wrap:wrap; }
.obs-memory-filerow code, .obs-memory-file, .obs-memory-evchip{ font-family:var(--font-mono); font-size:.72rem; color:var(--text-secondary); background:var(--surface-2); border:1px solid var(--border); border-radius:6px; padding:2px 7px; }
.obs-memory-flows{ display:flex; flex-direction:column; gap:10px; margin-top:16px; }
.obs-memory-flow{ border:1px solid var(--border); border-radius:11px; background:var(--surface); overflow:hidden; }
.obs-memory-flow.open{ border-color:var(--border-strong); }
.obs-memory-flowhead{ width:100%; display:flex; align-items:center; gap:12px; padding:13px 16px; background:none; border:none; cursor:pointer; color:var(--text-primary); }
.obs-memory-flowhead b{ font-weight:600; font-size:.95rem; }
.obs-memory-flowpersona{ font-size:.74rem; color:var(--accent); background:var(--accent-tint); border-radius:20px; padding:1px 9px; }
.obs-memory-flowhead > svg{ margin-left:auto; color:var(--text-muted); }
.obs-memory-flowsteps{ display:flex; align-items:center; gap:7px; flex-wrap:wrap; padding:0 16px 13px; }
.obs-memory-step{ font-size:.78rem; color:var(--text-secondary); background:var(--surface-2); border:1px solid var(--border); border-radius:7px; padding:3px 9px; }
.obs-memory-stepsep{ color:var(--text-muted); }
.obs-memory-flowbody{ padding:0 16px 15px; border-top:1px solid var(--border); margin-top:2px; padding-top:13px; }
.obs-memory-flowbody p{ font-size:.86rem; color:var(--text-secondary); margin:0 0 9px; line-height:1.55; }
.obs-memory-watch{ display:inline-flex; align-items:center; gap:6px; font-size:.78rem; color:var(--text-muted); }
.obs-memory-watch code{ color:var(--accent); }
.obs-memory-sitemap{ margin-top:16px; border:1px solid var(--border); border-radius:11px; overflow:hidden; }
.obs-memory-node{ display:flex; align-items:center; gap:12px; padding:9px 16px; border-top:1px solid var(--border); font-size:.84rem; }
.obs-memory-node:first-child{ border-top:none; }
.obs-memory-node.depth-1{ padding-left:38px; background:var(--surface); }
.obs-memory-node.missing{ background:var(--accent-tint); }
.obs-memory-noderoute{ font-family:var(--font-mono); font-size:.78rem; color:var(--text-primary); min-width:170px; }
.obs-memory-nodelabel{ color:var(--text-secondary); }
.obs-memory-nodefile{ margin-left:auto; font-family:var(--font-mono); font-size:.72rem; color:var(--text-muted); }
.obs-memory-nodetag{ flex-shrink:0; display:inline-flex; align-items:center; }
.obs-memory-nodetag.built{ color:var(--success); }
.obs-memory-nodetag.gap{ font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; color:var(--accent); font-weight:600; }
/* quality bar */
.obs-memory-qbar{ background:linear-gradient(180deg, var(--accent-tint), var(--panel) 60%); }
.obs-memory-grade{ flex-shrink:0; font-family:var(--font-mono); font-size:.74rem; letter-spacing:.06em; padding:5px 11px; border-radius:8px; font-weight:600; }
.obs-memory-grade.g-strong, .g-strong{ color:var(--success); }
.obs-memory-grade.g-strong{ background:var(--success-tint); }
.obs-memory-grade.g-solid, .g-solid{ color:var(--accent); }
.obs-memory-grade.g-solid{ background:var(--accent-tint); }
.obs-memory-grade.g-forming, .g-forming{ color:var(--text-muted); }
.obs-memory-qdims{ display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; margin-top:18px; }
.obs-memory-qdim{ display:flex; flex-direction:column; gap:6px; }
.obs-memory-qdimtop{ display:flex; align-items:baseline; justify-content:space-between; }
.obs-memory-qdimtop span{ font-size:.85rem; font-weight:500; color:var(--text-primary); }
.obs-memory-qdimtop b{ font-family:var(--font-mono); font-size:.82rem; color:var(--text-secondary); }
.obs-memory-meter{ height:6px; background:var(--surface-2); border-radius:4px; overflow:hidden; }
.obs-memory-meter i{ display:block; height:100%; background:var(--accent); border-radius:4px; }
.obs-memory-qdim p{ font-size:.78rem; color:var(--text-muted); margin:0; line-height:1.5; }
.obs-memory-thresh{ margin-top:20px; padding-top:18px; border-top:1px solid var(--border); }
.obs-memory-threshtop{ display:flex; align-items:baseline; justify-content:space-between; }
.obs-memory-threshtop span{ font-size:.86rem; font-weight:500; color:var(--text-primary); }
.obs-memory-threshtop b{ font-family:var(--font-mono); font-size:1.05rem; color:var(--accent); }
.obs-memory-thresh input[type=range]{ width:100%; margin:10px 0 6px; accent-color:var(--accent); }
.obs-memory-threshnote{ font-size:.78rem; color:var(--text-muted); margin:0; line-height:1.5; }
/* moments */
.obs-memory-seg{ display:inline-flex; background:var(--surface-2); border:1px solid var(--border); border-radius:9px; padding:2px; flex-shrink:0; }
.obs-memory-seg button{ font-size:.74rem; padding:5px 11px; background:none; border:none; border-radius:7px; color:var(--text-secondary); cursor:pointer; text-transform:capitalize; }
.obs-memory-seg button.on{ background:var(--panel); color:var(--text-primary); box-shadow:0 1px 2px oklch(0.4 0.05 40 / .12); }
.obs-memory-moments{ display:flex; flex-direction:column; gap:10px; margin-top:16px; }
.obs-memory-moment{ display:flex; gap:13px; align-items:flex-start; padding:14px 16px; border:1px solid var(--border); border-radius:12px; background:var(--surface); opacity:.7; transition:all .18s; }
.obs-memory-moment.on{ opacity:1; background:var(--panel); border-color:var(--border-strong); }
.obs-memory-momenttog{ flex-shrink:0; margin-top:2px; width:38px; height:22px; border-radius:20px; background:var(--border-strong); border:none; cursor:pointer; position:relative; transition:background .18s; }
.obs-memory-moment.on .obs-memory-momenttog{ background:var(--accent); }
.obs-memory-knob{ position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; transition:transform .18s; }
.obs-memory-moment.on .obs-memory-knob{ transform:translateX(16px); }
.obs-memory-momentmain{ text-align:left; background:none; border:none; cursor:pointer; padding:0; flex:1; min-width:0; }
.obs-memory-momenttop{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.obs-memory-momenttop b{ font-weight:600; font-size:.95rem; color:var(--text-primary); }
.obs-memory-tier{ font-size:.68rem; text-transform:uppercase; letter-spacing:.05em; border-radius:5px; padding:1px 7px; font-weight:600; }
.obs-memory-tier.t-in{ color:var(--accent); background:var(--accent-tint); }
.obs-memory-tier.t-off{ color:var(--success); background:var(--success-tint); }
.obs-memory-momentdetail{ font-size:.85rem; color:var(--text-primary); margin:7px 0 0; }
.obs-memory-why{ font-size:.83rem; color:var(--text-secondary); margin:5px 0 0; line-height:1.5; font-style:italic; }
.obs-memory-momentlast{ display:inline-block; margin-top:7px; font-family:var(--font-mono); font-size:.7rem; color:var(--text-muted); }
/* context */
.obs-memory-filled, .obs-memory-evchip.mono{ }
.obs-memory-filled{ flex-shrink:0; font-family:var(--font-mono); font-size:.72rem; color:var(--text-muted); }
.obs-memory-ctx{ display:flex; flex-direction:column; gap:18px; margin-top:18px; }
.obs-memory-ctxlabel{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.obs-memory-ctxlabel span{ font-size:.82rem; font-weight:500; color:var(--text-primary); }
.obs-memory-ctxval{ font-size:.9rem; color:var(--text-secondary); margin:8px 0 0; line-height:1.6; }
.obs-memory-docs{ display:flex; flex-direction:column; gap:9px; margin-top:16px; }
.obs-memory-doc{ display:flex; flex-direction:column; gap:3px; padding:11px 14px; background:var(--surface); border:1px solid var(--border); border-radius:10px; }
.obs-memory-docname{ display:inline-flex; align-items:center; gap:7px; font-size:.88rem; font-weight:500; color:var(--text-primary); }
.obs-memory-docname svg{ color:var(--success); }
.obs-memory-docnote{ font-size:.8rem; color:var(--text-muted); padding-left:20px; }
.obs-memory-docadd{ display:inline-flex; align-items:center; gap:7px; padding:11px 14px; border:1px dashed var(--border-strong); border-radius:10px; font-size:.84rem; color:var(--text-secondary); cursor:pointer; }
.obs-memory-docadd:hover{ color:var(--accent); border-color:var(--accent); }
/* drawer */
.obs-memory-drawer-scrim{ position:fixed; inset:0; background:oklch(0.3 0.02 60 / .28); z-index:60; display:flex; justify-content:flex-end; animation:obsMemFade .18s ease; }
@keyframes obsMemFade{ from{opacity:0} to{opacity:1} }
.obs-memory-drawer{ width:min(440px,92vw); height:100%; background:var(--panel); border-left:1px solid var(--border); padding:24px 26px; overflow-y:auto; box-shadow:-24px 0 60px -30px oklch(0.3 0.04 50 / .5); animation:obsMemSlide .22s cubic-bezier(.2,.7,.3,1); }
@keyframes obsMemSlide{ from{transform:translateX(24px); opacity:.6} to{transform:none; opacity:1} }
.obs-memory-drawer-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:18px; }
.obs-memory-dkind{ font-family:var(--font-mono); font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; color:var(--text-muted); }
.obs-memory-drawer-top h3{ font-family:var(--font-display); font-weight:500; font-size:1.35rem; margin:3px 0 0; color:var(--text-primary); }
.obs-memory-x{ background:none; border:none; cursor:pointer; color:var(--text-muted); padding:2px; flex-shrink:0; }
.obs-memory-x:hover{ color:var(--text-primary); }
.obs-memory-dwrap{ display:flex; flex-direction:column; gap:10px; }
.obs-memory-dlead{ font-size:.9rem; color:var(--text-secondary); line-height:1.6; margin:0; }
.obs-memory-dsec{ font-family:var(--font-mono); font-size:.66rem; letter-spacing:.1em; text-transform:uppercase; color:var(--text-muted); margin-top:8px; }
.obs-memory-file{ display:block; width:fit-content; }
.obs-memory-rel{ font-size:.86rem; color:var(--text-primary); display:flex; align-items:baseline; gap:8px; }
.obs-memory-kind{ font-size:.66rem; text-transform:uppercase; letter-spacing:.05em; font-weight:600; border-radius:5px; padding:1px 7px; }
.obs-memory-kind.k-issue, .obs-memory-kind.k-signal{ color:var(--accent); background:var(--accent-tint); }
.obs-memory-kind.k-insight{ color:var(--accent); background:var(--accent-tint); }
.obs-memory-kind.k-act{ color:var(--success); background:var(--success-tint); }
.obs-memory-pcard{ padding:13px 15px; border:1px solid var(--border); border-radius:11px; background:var(--surface); }
.obs-memory-prow{ display:flex; align-items:center; gap:11px; }
.obs-memory-prow b{ font-weight:600; font-size:.92rem; color:var(--text-primary); display:block; }
.obs-memory-pstatus{ font-size:.74rem; color:var(--text-muted); }
.obs-memory-pmem{ font-size:.84rem; color:var(--text-secondary); margin:9px 0 0; line-height:1.5; }
.obs-memory-pquote{ font-size:.84rem; color:var(--text-primary); font-style:italic; margin:7px 0 0; padding-left:11px; border-left:2px solid var(--accent); }
.obs-memory-mline{ display:flex; align-items:center; gap:10px; }
.obs-memory-mlast{ font-family:var(--font-mono); font-size:.72rem; color:var(--text-muted); }
.obs-memory-convo{ display:flex; flex-direction:column; gap:8px; }
.obs-memory-msg{ font-size:.84rem; line-height:1.5; padding:9px 12px; border-radius:10px; }
.obs-memory-msg.obs{ background:var(--surface-2); color:var(--text-secondary); }
.obs-memory-msg.them{ background:var(--accent-tint); color:var(--text-primary); }
.obs-memory-msgmeta{ display:block; font-family:var(--font-mono); font-size:.64rem; letter-spacing:.05em; text-transform:uppercase; color:var(--text-muted); margin-bottom:3px; }
` }} />
    );
  }

  window.OBS_SURFACES.memory = MemorySurface;
})();
