/* ============================================================
   EDDA app — Portal (shell · programs · detail · insights · panel)
   ============================================================ */
const { useState: useStateP } = React;

function Portal({ programs, onNewProgram, onOpenIM }) {
  const [section, setSection] = useStateP("programs");
  const [selId, setSelId] = useStateP(null);
  const selected = programs.find((p) => p.id === selId);

  const totalUsers = programs.reduce((a, p) => a + p.panelSize, 0);
  const allInsights = programs.flatMap((p) => p.insights.map((i) => ({ ...i, prog: p.name })));
  const allMembers = Object.values(PANEL);

  const go = (sec) => { setSection(sec); setSelId(null); };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><Wordmark size="1.45rem" /></div>
        <nav className="side-nav">
          <NavI icon="grid" label="Programs" on={section === "programs"} onClick={() => go("programs")} badge={programs.length} />
          <NavI icon="spark" label="Insights" on={section === "insights"} onClick={() => go("insights")} badge={allInsights.length} />
          <NavI icon="users" label="Panel" on={section === "panel"} onClick={() => go("panel")} badge={totalUsers} />
          <div className="side-sec">Workspace</div>
          <NavI icon="settings" label="Settings" on={section === "settings"} onClick={() => go("settings")} />
          <a className="nav-i" href="https://api.usercodified.com/docs" target="_blank" rel="noopener">
            <Icon name="book" size={17} />
            Docs
            <Icon name="arrow" size={13} />
          </a>
        </nav>
        <div className="side-foot">
          <div className="workspace">
            <span className="ws-logo">N</span>
            <div>
              <div className="ws-name">Northwind</div>
              <div className="ws-sub">Pro · {totalUsers} on panel</div>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <div className="crumbs">
            {selected ? (
              <React.Fragment>
                <a href="#" onClick={(e) => { e.preventDefault(); setSelId(null); }}>Programs</a>
                <span className="sep">/</span>
                <span className="cur">{selected.name}</span>
              </React.Fragment>
            ) : (
              <span className="cur">{{ programs: "Programs", insights: "Insights", panel: "Panel", settings: "Settings" }[section]}</span>
            )}
          </div>
          <div className="acts">
            {section === "programs" && !selected && (
              <Btn variant="primary" size="sm" onClick={onNewProgram}><Icon name="plus" size={15} /> New program</Btn>
            )}
          </div>
        </div>

        <div className="content">
          <div className="content-w">
            {section === "programs" && !selected && (
              <ProgramsList programs={programs} onOpen={setSelId} onNew={onNewProgram} />
            )}
            {section === "programs" && selected && (
              <ProgramDetail prog={selected} onOpenIM={onOpenIM} />
            )}
            {section === "insights" && <InsightsView insights={allInsights} />}
            {section === "panel" && <PanelView members={allMembers} onOpenIM={onOpenIM} />}
            {section === "settings" && <SettingsView />}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavI({ icon, label, on, onClick, badge }) {
  return (
    <button className={`nav-i${on ? " on" : ""}`} onClick={onClick} type="button">
      <Icon name={icon} size={17} />
      {label}
      {badge != null && <span className="badge">{badge}</span>}
    </button>
  );
}

/* ---------- programs list ---------- */
function ProgramsList({ programs, onOpen, onNew }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Your programs</h1>
          <div className="sub">Continuous 1:1 learning across your panels. Each runs like a diary study.</div>
        </div>
      </div>
      <div className="prog-grid">
        {programs.map((p) => (
          <button key={p.id} className="prog-card" onClick={() => onOpen(p.id)} type="button">
            <div className="pc-top">
              <StatusPill status={p.status} />
              <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{p.tier}</span>
            </div>
            <h3>{p.name}</h3>
            <div className="pc-desc">{p.desc}</div>
            <div className="pc-stats">
              <div className="pc-stat"><div className="n">{p.panelSize}</div><div className="l">on panel</div></div>
              <div className="pc-stat"><div className="n"><span className="ac">{p.activeNow}</span></div><div className="l">in 1:1 now</div></div>
              <div className="pc-stat"><div className="n">{p.insights.length}</div><div className="l">insights</div></div>
            </div>
          </button>
        ))}
        <button className="prog-card new-card" onClick={onNew} type="button">
          <span className="plus-ic"><Icon name="plus" size={20} /></span>
          <span style={{ fontWeight: 600 }}>New program</span>
          <span style={{ fontSize: "0.82rem" }}>Brief Edda on what to learn next</span>
        </button>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  if (status === "live") return <span className="pill live"><span className="d" /> Live</span>;
  if (status === "setup") return <span className="pill setup">Setting up</span>;
  return <span className="pill draft">Draft</span>;
}

/* ---------- program detail ---------- */
function ProgramDetail({ prog, onOpenIM }) {
  const [ask, setAsk] = useStateP("");
  const [sent, setSent] = useStateP(false);
  const members = prog.members.map((id) => PANEL[id]).filter(Boolean);

  const submitAsk = () => {
    if (!ask.trim()) return;
    setSent(true);
    setAsk("");
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div>
      <div className="page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <h1>{prog.name}</h1>
            <StatusPill status={prog.status} />
          </div>
          <div className="sub">{prog.desc} · {prog.panelSize} users on private 1:1 lines</div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="panel-box">
          <div className="pb-head">
            <h3>Live conversations</h3>
            <span className="mut mono" style={{ fontSize: "0.72rem" }}>{prog.activeNow} active now</span>
          </div>
          {members.map((m) => (
            <button key={m.id} className="conv-row" onClick={() => onOpenIM(m)} type="button">
              <Avatar name={m.name} color={m.color} />
              <div className="conv-main">
                <div className="conv-name">{m.name} <span className="conv-tag">{m.cohort}</span></div>
                <div className="conv-last">{m.last}</div>
              </div>
              <div className="conv-meta">
                <div className="conv-time">{m.time}</div>
                <div className={`conv-dot${m.live ? " live" : ""}`} />
              </div>
            </button>
          ))}
          {members.length === 0 && (
            <div style={{ padding: "2.5rem 1.25rem", textAlign: "center", color: "var(--text-muted)" }}>
              Edda is opening the first 1:1 lines — conversations will appear here shortly.
            </div>
          )}
        </div>

        <div>
          <div className="scard">
            <h4>Panel composition</h4>
            {prog.cohorts.map((c, i) => (
              <div className="cohort-mini" key={i}>
                <div className="cm-top"><b>{c.name}</b><span className="mut">{c.n}</span></div>
                <div className="cm-bar"><i style={{ width: c.pct + "%", background: c.color }} /></div>
              </div>
            ))}
          </div>

          <div className="scard">
            <h4>Ask the panel</h4>
            <div className="relay-box">
              <textarea className="textarea" placeholder="Relay one question to every active 1:1…" value={ask} onChange={(e) => setAsk(e.target.value)} style={{ minHeight: "78px" }} />
              <Btn variant="primary" size="sm" onClick={submitAsk} disabled={!ask.trim()}>
                <Icon name="relay" size={15} /> Relay to {prog.activeNow} conversations
              </Btn>
              {sent && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "var(--success)", fontSize: "0.84rem", fontWeight: 600 }}>
                  <Icon name="check" size={15} sw={2.4} /> Relayed — answers will surface here.
                </div>
              )}
            </div>
          </div>

          {prog.insights.length > 0 && (
            <div className="scard">
              <h4>Recent insights</h4>
              {prog.insights.map((it, i) => (
                <div className="insight-item" key={i}>
                  <div className="it-q">{it.q}</div>
                  <div className="it-m">{it.meta}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- insights view ---------- */
function InsightsView({ insights }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Insights</h1>
          <div className="sub">Findings rise bottom-up across every program. Synthesize on demand.</div>
        </div>
      </div>
      <div className="prog-grid">
        {insights.map((it, i) => (
          <div key={i} className="prog-card" style={{ cursor: "default" }}>
            <div className="pc-top"><span className="eyebrow gray">{it.prog}</span></div>
            <div className="it-q serif" style={{ fontSize: "1.2rem", lineHeight: 1.25 }}>{it.q}</div>
            <div className="it-m mut" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>{it.meta}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- panel view ---------- */
function PanelView({ members, onOpenIM }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Panel</h1>
          <div className="sub">Everyone on a private 1:1 line with Edda, across all programs.</div>
        </div>
      </div>
      <div className="panel-box">
        <div className="pb-head"><h3>All users</h3><span className="mut mono" style={{ fontSize: "0.72rem" }}>{members.length} shown</span></div>
        {members.map((m) => (
          <button key={m.id} className="conv-row" onClick={() => onOpenIM(m)} type="button">
            <Avatar name={m.name} color={m.color} />
            <div className="conv-main">
              <div className="conv-name">{m.name} <span className="conv-tag">{m.cohort}</span></div>
              <div className="conv-last">{m.last}</div>
            </div>
            <div className="conv-meta">
              <div className="conv-time">{m.time}</div>
              <div className={`conv-dot${m.live ? " live" : ""}`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div>
      <div className="page-head"><div><h1>Settings</h1><div className="sub">Workspace, surfaces, and data controls.</div></div></div>
      <div className="scard" style={{ maxWidth: 520 }}>
        <h4>Workspace</h4>
        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginTop: "0.3rem" }}>
          <span className="ws-logo" style={{ width: 40, height: 40, borderRadius: 11 }}>N</span>
          <div><div style={{ fontWeight: 600 }}>Northwind</div><div className="mut" style={{ fontSize: "0.84rem" }}>Pro plan · billing managed by Xuan</div></div>
        </div>
      </div>
      <div className="scard" style={{ maxWidth: 520, marginTop: "1.25rem" }}>
        <h4>Developers</h4>
        <div className="mut" style={{ fontSize: "0.84rem", marginTop: "0.3rem" }}>Pull user insight into Claude Code, Cursor, or your terminal over MCP.</div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.9rem", background: "var(--night)", borderRadius: 10, padding: "0.7rem 0.9rem", fontFamily: "var(--font-mono)", fontSize: "0.82rem", color: "oklch(0.91 0.012 75)" }}>
          <span style={{ color: "oklch(0.70 0.115 45)" }}>$</span>
          <span style={{ flex: 1, overflowX: "auto", whiteSpace: "nowrap" }}>claude mcp add edda</span>
          <button type="button" onClick={(e) => { navigator.clipboard?.writeText("claude mcp add edda"); const b = e.currentTarget; const t = b.textContent; b.textContent = "Copied"; setTimeout(() => { b.textContent = t; }, 1400); }} style={{ fontFamily: "var(--font-mono)", fontSize: "0.64rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "oklch(0.66 0.015 70)", border: "1px solid oklch(0.34 0.014 58)", borderRadius: 7, padding: "0.35em 0.7em", flexShrink: 0, cursor: "pointer", background: "transparent" }}>Copy</button>
        </div>
        <a className="btn btn-ghost btn-sm" href="https://api.usercodified.com/docs" target="_blank" rel="noopener" style={{ marginTop: "0.9rem" }}>
          <Icon name="book" size={15} /> Read the docs
        </a>
      </div>
    </div>
  );
}

Object.assign(window, { Portal });
