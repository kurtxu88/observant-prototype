/* OBSERVANT surface — Act (four-state close-the-loop ledger: drafted → shipped → told → verified).
   Registers window.OBS_SURFACES.act. Reads state.actLedger + state.signals + state.people.
   The self-evolving proof: watch ONE loop travel end to end — and the two moves Novus structurally
   can't make (tell the named humans; re-validate with them after ship). CSS prefix: obs-act- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const R = window.React;
  const STATES = ["drafted", "shipped", "told", "verified"];
  const STATE_LABEL = { drafted: "Drafted", shipped: "Shipped", told: "Told", verified: "Verified" };

  function ActSurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const Btn = ui.Btn || window.Btn;
    const ledger = state.actLedger || [];
    const people = state.people || [];
    const signals = state.signals || [];
    const nameOf = (id) => { const p = people.find((x) => x.id === id); return p ? (p.name || id) : id; };
    const firstName = (id) => nameOf(id).split(" ")[0];
    const reached = (item) => STATES.indexOf(item.state);

    const [filter, setFilter] = R.useState("all");
    const [openId, setOpenId] = R.useState(ledger[0] ? ledger[0].id : null);
    const shown = filter === "all" ? ledger : ledger.filter((a) => a.state === filter);
    const open = ledger.find((a) => a.id === openId);
    const sig = open ? signals.find((s) => s.id === open.signalId) : null;

    return (
      <div className="obs-act">
        <style>{CSS}</style>
        <header className="obs-act-head">
          <div>
            <span className="obs-act-eyebrow">Act</span>
            <h1>Close the loop — and prove it landed.</h1>
            <p>Every learning Signal that became a fix lives here in one of four states. Watch a loop travel
              end to end: <b>drafted → shipped → told → verified</b>. The last two — telling the humans who
              raised it, then re-asking if it actually worked — are the moves a behavior-only tool can't make.</p>
          </div>
        </header>

        <div className="obs-act-tabs">
          {["all"].concat(STATES).map((s) => (
            <button key={s} className={"obs-act-tab" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}>
              {s === "all" ? "All" : STATE_LABEL[s]}
              <em>{s === "all" ? ledger.length : ledger.filter((a) => a.state === s).length}</em>
            </button>
          ))}
        </div>

        <div className="obs-act-grid">
          <div className="obs-act-list">
            {shown.map((item) => {
              const at = reached(item);
              return (
                <button key={item.id} className={"obs-act-card" + (openId === item.id ? " on" : "")} onClick={() => setOpenId(item.id)}>
                  <div className="obs-act-card-top">
                    <span className={"obs-act-class " + (item.evidenceClass || "Issue").toLowerCase()}>{item.evidenceClass}</span>
                    <span className="obs-act-state">{STATE_LABEL[item.state]}</span>
                  </div>
                  <b>{item.title}</b>
                  <div className="obs-act-stepper">
                    {STATES.map((s, i) => (
                      <span key={s} className={"obs-act-dot" + (i <= at ? " done" : "") + (i === at ? " cur" : "")} title={STATE_LABEL[s]}>
                        <i />{i < STATES.length - 1 ? <u className={i < at ? "done" : ""} /> : null}
                      </span>
                    ))}
                  </div>
                  <div className="obs-act-raised">
                    {(item.raisedBy || []).map((id) => <span key={id} className="obs-act-av" title={nameOf(id)}>{initials(nameOf(id))}</span>)}
                    <em>raised by {(item.raisedBy || []).map(firstName).join(", ")}</em>
                  </div>
                </button>
              );
            })}
          </div>

          {open && (
            <div className="obs-act-detail">
              <div className="obs-act-detail-head">
                <span className={"obs-act-class " + (open.evidenceClass || "Issue").toLowerCase()}>{open.evidenceClass}</span>
                <h2>{open.title}</h2>
              </div>

              <Section icon={Icon} name="search" k="Root cause" sub="what the conversations say">
                <p className="obs-act-root">{sig ? sig.whySurfaced : "Grounded in the named partners who raised it."}</p>
                <span className="obs-act-grounded">Grounded in {(open.raisedBy || []).length} partners · {(open.steps || []).length}-step fix</span>
              </Section>

              <Section icon={Icon} name="book" k="Agent-ready fix" sub={(open.steps || []).length + " steps, file-scoped"}>
                <div className="obs-act-steps">
                  {(open.steps || []).map((s) => (
                    <div key={s.id} className="obs-act-step">
                      <span className="obs-act-step-n">{s.n}</span>
                      <div>
                        <b>{s.title} <em className="obs-act-step-type">{s.type}</em></b>
                        <code className="obs-act-affects">{s.affects}</code>
                        <p>{s.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="obs-act-pr">
                  {open.pr
                    ? <span className={"obs-act-prchip " + open.pr.status}>{Icon ? <Icon name="grid" size={13} /> : null} {open.pr.title} #{open.pr.number} · <b>{open.pr.status}</b></span>
                    : <span className="obs-act-prchip">PR drafts when the repo's connected</span>}
                  {Btn ? <Btn variant="ghost" size="sm">{Icon ? <Icon name="spark" size={13} /> : null} Hand to Claude</Btn> : null}
                </div>
                {open.evidenceClass === "Opportunity" && <p className="obs-act-gate">Opportunity = weakest evidence → opens a validation conversation, never an auto-PR.</p>}
              </Section>

              <Section icon={Icon} name="relay" k="Told the humans" sub="the move a behavior tool can't make" done={!!open.told}>
                {open.told
                  ? <><p className="obs-act-quote">"{open.told.message}"</p><span className="obs-act-meta">→ {open.told.people.map(firstName).join(", ")} · {open.told.at} · in the product's voice, never as the founder</span></>
                  : <p className="obs-act-pending">Pending — close the loop with {(open.raisedBy || []).map(firstName).join(", ")} once shipped.</p>}
              </Section>

              <Section icon={Icon} name="check" k="Verified" sub="behavior moved AND the humans confirmed" done={!!open.verified}>
                {open.verified
                  ? <div className="obs-act-verified">
                      <span className={"obs-act-vflag" + (open.verified.behaviorMoved ? " ok" : "")}>{Icon ? <Icon name="check" size={12} sw={3} /> : "✓"} behavior moved</span>
                      <span className={"obs-act-vflag" + (open.verified.humansConfirmed ? " ok" : "")}>{Icon ? <Icon name="check" size={12} sw={3} /> : "✓"} humans confirmed</span>
                      <p>{open.verified.note}</p>
                    </div>
                  : <p className="obs-act-pending">Will re-ask the same people "did this land?" after ship — results return as fresh Signals.</p>}
              </Section>
            </div>
          )}
        </div>
      </div>
    );
  }

  function Section({ icon: Icon, name, k, sub, children, done }) {
    return (
      <section className={"obs-act-section" + (done ? " done" : "")}>
        <div className="obs-act-section-h">
          {Icon ? <Icon name={name} size={14} /> : null}
          <b>{k}</b><em>{sub}</em>
          {done ? <span className="obs-act-section-done">✓</span> : null}
        </div>
        <div className="obs-act-section-body">{children}</div>
      </section>
    );
  }

  function initials(name) {
    return String(name || "").split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  }

  const CSS = `
  .obs-act { max-width: 1040px; }
  .obs-act-eyebrow { font-family: var(--font-mono); font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; color: var(--accent); }
  .obs-act-head h1 { font-family: var(--font-display); font-size: 1.7rem; margin:.2rem 0 .4rem; }
  .obs-act-head p { color: var(--text-secondary); max-width: 70ch; font-size:.9rem; }
  .obs-act-tabs { display:flex; gap:.4rem; margin:1.2rem 0 1rem; flex-wrap:wrap; }
  .obs-act-tab { display:inline-flex; align-items:center; gap:.4rem; padding:.35rem .7rem; border:1px solid var(--border); border-radius:99px; background:var(--canvas); font-size:.82rem; color:var(--text-secondary); }
  .obs-act-tab.on { background: var(--accent-tint); border-color: var(--accent-soft); color: var(--accent-hover); font-weight:600; }
  .obs-act-tab em { font-style:normal; font-size:.72rem; opacity:.7; }
  .obs-act-grid { display:grid; grid-template-columns: 340px 1fr; gap:1rem; align-items:start; }
  @media (max-width: 860px){ .obs-act-grid{ grid-template-columns:1fr; } }
  .obs-act-list { display:flex; flex-direction:column; gap:.6rem; }
  .obs-act-card { text-align:left; border:1px solid var(--border); border-radius:12px; background:var(--canvas); padding:.8rem .9rem; cursor:pointer; }
  .obs-act-card.on { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-tint); }
  .obs-act-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:.35rem; }
  .obs-act-card b { display:block; font-size:.9rem; margin-bottom:.5rem; }
  .obs-act-class { font-family:var(--font-mono); font-size:.64rem; letter-spacing:.08em; text-transform:uppercase; padding:.12rem .4rem; border-radius:5px; }
  .obs-act-class.issue { background:#fbe9e7; color:#b4291f; } .obs-act-class.insight { background: var(--accent-tint); color: var(--accent-hover); } .obs-act-class.opportunity { background: var(--success-tint); color: var(--success); }
  .obs-act-state { font-size:.7rem; color:var(--text-muted); font-family:var(--font-mono); }
  .obs-act-stepper { display:flex; align-items:center; margin:.3rem 0 .55rem; }
  .obs-act-dot { display:flex; align-items:center; }
  .obs-act-dot i { width:9px; height:9px; border-radius:50%; background:var(--border-strong); display:block; }
  .obs-act-dot.done i { background: var(--success); } .obs-act-dot.cur i { box-shadow:0 0 0 3px var(--success-tint); }
  .obs-act-dot u { width:34px; height:2px; background:var(--border); display:block; } .obs-act-dot u.done { background: var(--success); }
  .obs-act-raised { display:flex; align-items:center; gap:.3rem; }
  .obs-act-av { width:20px; height:20px; border-radius:50%; background:var(--accent-tint); color:var(--accent-hover); font-size:.6rem; font-weight:700; display:inline-flex; align-items:center; justify-content:center; }
  .obs-act-raised em { font-style:normal; font-size:.74rem; color:var(--text-muted); margin-left:.2rem; }
  .obs-act-detail { border:1px solid var(--border); border-radius:14px; background:var(--canvas); padding:1.2rem 1.3rem; }
  .obs-act-detail-head { display:flex; align-items:center; gap:.6rem; margin-bottom:.4rem; }
  .obs-act-detail-head h2 { font-family:var(--font-display); font-size:1.2rem; }
  .obs-act-section { border-top:1px solid var(--border); padding:.9rem 0; }
  .obs-act-section-h { display:flex; align-items:center; gap:.45rem; margin-bottom:.5rem; }
  .obs-act-section-h b { font-size:.9rem; } .obs-act-section-h em { font-style:normal; font-size:.78rem; color:var(--text-muted); }
  .obs-act-section-done { margin-left:auto; color:var(--success); font-weight:700; }
  .obs-act-root { font-size:.86rem; color:var(--text-secondary); }
  .obs-act-grounded { display:inline-block; margin-top:.35rem; font-size:.74rem; color:var(--text-muted); font-family:var(--font-mono); }
  .obs-act-steps { display:flex; flex-direction:column; gap:.6rem; }
  .obs-act-step { display:flex; gap:.6rem; }
  .obs-act-step-n { flex:none; width:22px; height:22px; border-radius:50%; background:var(--accent-tint); color:var(--accent-hover); font-size:.72rem; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .obs-act-step b { font-size:.85rem; } .obs-act-step-type { font-style:normal; font-family:var(--font-mono); font-size:.62rem; color:var(--text-muted); text-transform:uppercase; margin-left:.3rem; }
  .obs-act-affects { display:block; font-family:var(--font-mono); font-size:.72rem; color:var(--text-muted); margin:.1rem 0; }
  .obs-act-step p { font-size:.82rem; color:var(--text-secondary); }
  .obs-act-pr { display:flex; align-items:center; gap:.6rem; margin-top:.7rem; flex-wrap:wrap; }
  .obs-act-prchip { display:inline-flex; align-items:center; gap:.35rem; font-size:.78rem; padding:.25rem .55rem; border:1px solid var(--border); border-radius:7px; background:#fafafa; }
  .obs-act-prchip.merged { background: var(--success-tint); color: var(--success); border-color: transparent; }
  .obs-act-gate { font-size:.78rem; color:#b4291f; margin-top:.4rem; }
  .obs-act-quote { font-style:italic; color:var(--text-primary); font-size:.88rem; } .obs-act-meta { font-size:.74rem; color:var(--text-muted); }
  .obs-act-pending { font-size:.82rem; color:var(--text-muted); }
  .obs-act-vflag { display:inline-flex; align-items:center; gap:.25rem; font-size:.78rem; color:var(--text-muted); margin-right:.8rem; }
  .obs-act-vflag.ok { color: var(--success); } .obs-act-verified p { font-size:.84rem; color:var(--text-secondary); margin-top:.4rem; }
  `;

  window.OBS_SURFACES.act = ActSurface;
})();
