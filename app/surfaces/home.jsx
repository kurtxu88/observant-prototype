/* OBSERVANT surface — Home (relationship-first monitoring landing, PRD §3 + §8).
   Registers window.OBS_SURFACES.home. Reads state.conversations/signals/actLedger/pulseMoments/activity.
   Topline is RELATIONSHIP metrics (open 1:1 lines · replies · fresh Signals · loops closed) — never
   "triggers fired: 0". Thin-data empty state is a first-class designed screen. CSS prefix: obs-home- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};

  function HomeSurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const go = props.navigate || (() => {});
    const convos = state.conversations || [];
    const signals = state.signals || [];
    const ledger = state.actLedger || [];
    const people = state.people || [];
    const activity = state.activity || [];
    const pm = (state.pulseMoments && state.pulseMoments.config) || {};
    const founder = (state.workspace && state.workspace.founderName || "").split(" ")[0];
    const nameOf = (id) => { const p = people.find((x) => x.id === id); return p ? p.name : id; };

    const openLines = convos.length;
    const replies = convos.reduce((n, c) => n + (c.messages || []).filter((m) => m.t === "user").length, 0);
    const fresh = signals.filter((s) => s.status === "Active" || s.status === "Forming").length || signals.length;
    const loopsClosed = ledger.filter((a) => a.state === "verified" || a.state === "told").length;
    const thin = openLines === 0;

    const watching = [pm.aiEval, pm.keyCta].filter(Boolean);
    const topSignals = signals.slice(0, 3);
    const recent = convos.slice(0, 4);

    return (
      <div className="obs-home">
        <style>{CSS}</style>
        <header className="obs-home-head">
          <div>
            <h1>{founder ? "Good to see you, " + founder + "." : "Observant is learning from your users."}</h1>
            <p>{thin
              ? "Installed and watching. The first 1:1s open as your users hit the moments below."
              : openLines + " conversations going · Observant surfaces what matters while you ship."}</p>
          </div>
        </header>

        <div className="obs-home-metrics">
          <button className="obs-home-metric" onClick={() => go({ section: "people" })}><b>{openLines}</b><span>open 1:1 lines</span></button>
          <button className="obs-home-metric" onClick={() => go({ section: "conversations" })}><b>{replies}</b><span>replies in</span></button>
          <button className="obs-home-metric" onClick={() => go({ section: "signals" })}><b>{fresh}</b><span>fresh Signals</span></button>
          <button className="obs-home-metric" onClick={() => go({ section: "act" })}><b>{loopsClosed}</b><span>loops closed</span></button>
        </div>

        {thin ? (
          <section className="obs-home-empty">
            <div className="obs-home-empty-head"><span className="obs-home-dot" /><b>Watching for these moments</b></div>
            <p>Observant is live and listening. The moment a user hits one of these, a light 1:1 opens on its own — the first answers land here.</p>
            <div className="obs-home-watch">
              {(watching.length ? watching : [{ label: "AI / output rating" }, { label: "Key conversion moment" }]).map((m, i) => (
                <div className="obs-home-watch-row" key={i}><Icon name="spark" size={13} /><b>{m.label}</b>{m.question ? <span>"{m.question}"</span> : null}</div>
              ))}
            </div>
            <small>Velocity now, volume as users arrive. Want a reply today? Add a feedback program and invite your users.</small>
          </section>
        ) : (
          <div className="obs-home-grid">
            <section className="obs-home-col">
              <div className="obs-home-col-h"><b>Fresh Signals</b><button onClick={() => go({ section: "signals" })}>View all →</button></div>
              {topSignals.map((s) => (
                <button className="obs-home-signal" key={s.id} onClick={() => go({ section: "signals", focusedTarget: s.id })}>
                  <div className="obs-home-signal-top"><span className={"obs-home-sigtype " + (s.type || "Issue").toLowerCase()}>{s.type}</span><em>{s.metric}</em></div>
                  <p>{s.title}</p>
                  {s.status === "Forming" ? <span className="obs-home-forming">Forming · watching for more</span> : null}
                </button>
              ))}
              {!topSignals.length ? <p className="obs-home-none">No Signals yet — they form as conversations land.</p> : null}
            </section>

            <section className="obs-home-col">
              <div className="obs-home-col-h"><b>Recent 1:1s</b><button onClick={() => go({ section: "people" })}>Partners →</button></div>
              {recent.map((c) => (
                <button className="obs-home-convo" key={c.id} onClick={() => go({ section: "people", conversationId: c.id })}>
                  <span className="obs-home-av">{(nameOf(c.userId) || "?").slice(0, 1)}</span>
                  <div><b>{nameOf(c.userId)}</b><span>{c.title}{c.trigger ? " · " + (c.trigger.moment || c.trigger) : ""}</span></div>
                  {c.mode === "voice" ? <em className="obs-home-mode"><Icon name="phone" size={11} /> {c.duration}</em> : null}
                </button>
              ))}
            </section>
          </div>
        )}

        <section className="obs-home-activity">
          <div className="obs-home-col-h"><b>Observant did this on its own</b></div>
          {activity.slice(0, 6).map((a, i) => (
            <div className="obs-home-act" key={i}><span className="obs-home-act-dot" />{typeof a === "string" ? a : (a && a.text) || ""}</div>
          ))}
          {!activity.length ? <p className="obs-home-none">Activity shows up here as Observant opens conversations, raises Signals, and closes loops.</p> : null}
        </section>
      </div>
    );
  }

  const CSS = `
  .obs-home { max-width: 1000px; }
  .obs-home-head h1 { font-family: var(--font-display); font-size:1.7rem; }
  .obs-home-head p { color: var(--text-secondary); font-size:.9rem; margin-top:.2rem; }
  .obs-home-metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:.7rem; margin:1.2rem 0; }
  @media (max-width:680px){ .obs-home-metrics{ grid-template-columns:repeat(2,1fr); } }
  .obs-home-metric { text-align:left; border:1px solid var(--border); border-radius:12px; background:var(--canvas); padding:.8rem .9rem; cursor:pointer; }
  .obs-home-metric:hover { border-color:var(--accent-soft); }
  .obs-home-metric b { display:block; font-family:var(--font-display); font-size:1.7rem; line-height:1; }
  .obs-home-metric span { font-size:.78rem; color:var(--text-muted); }
  .obs-home-empty { border:1px solid var(--accent-soft); background:var(--accent-tint); border-radius:14px; padding:1.2rem 1.3rem; }
  .obs-home-empty-head { display:flex; align-items:center; gap:.5rem; } .obs-home-empty-head b { font-size:1rem; }
  .obs-home-dot { width:9px; height:9px; border-radius:50%; background:var(--success); box-shadow:0 0 0 0 oklch(0.56 0.09 152 / .5); animation:obsHomePulse 1.8s ease-out infinite; }
  .obs-home-empty p { font-size:.88rem; color:var(--text-secondary); margin:.4rem 0 .8rem; max-width:64ch; }
  .obs-home-watch { display:flex; flex-direction:column; gap:.45rem; }
  .obs-home-watch-row { display:flex; align-items:baseline; gap:.45rem; font-size:.85rem; } .obs-home-watch-row svg{ color:var(--accent); } .obs-home-watch-row span{ color:var(--text-muted); font-style:italic; }
  .obs-home-empty small { display:block; margin-top:.9rem; font-size:.78rem; color:var(--text-muted); }
  .obs-home-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
  @media (max-width:760px){ .obs-home-grid{ grid-template-columns:1fr; } }
  .obs-home-col-h { display:flex; justify-content:space-between; align-items:center; margin-bottom:.6rem; }
  .obs-home-col-h b { font-size:.92rem; } .obs-home-col-h button { font-size:.78rem; color:var(--accent-hover); }
  .obs-home-signal, .obs-home-convo { display:block; width:100%; text-align:left; border:1px solid var(--border); border-radius:11px; background:var(--canvas); padding:.7rem .85rem; margin-bottom:.55rem; cursor:pointer; }
  .obs-home-signal:hover, .obs-home-convo:hover { border-color:var(--accent-soft); }
  .obs-home-signal-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:.3rem; }
  .obs-home-sigtype { font-family:var(--font-mono); font-size:.6rem; text-transform:uppercase; letter-spacing:.06em; padding:.1rem .35rem; border-radius:4px; }
  .obs-home-sigtype.issue{ background:#fbe9e7; color:#b4291f; } .obs-home-sigtype.insight{ background:var(--accent-tint); color:var(--accent-hover); } .obs-home-sigtype.opportunity{ background:var(--success-tint); color:var(--success); }
  .obs-home-signal-top em { font-style:normal; font-size:.72rem; color:var(--text-muted); }
  .obs-home-signal p { font-size:.85rem; }
  .obs-home-forming { display:inline-block; margin-top:.3rem; font-size:.7rem; color:var(--text-muted); font-family:var(--font-mono); }
  .obs-home-convo { display:flex; align-items:center; gap:.55rem; }
  .obs-home-av { width:28px; height:28px; border-radius:50%; background:var(--accent-tint); color:var(--accent-hover); font-weight:700; font-size:.8rem; display:flex; align-items:center; justify-content:center; flex:none; }
  .obs-home-convo b { font-size:.85rem; } .obs-home-convo span { display:block; font-size:.76rem; color:var(--text-muted); }
  .obs-home-mode { margin-left:auto; font-style:normal; font-size:.7rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:.2rem; }
  .obs-home-activity { margin-top:1.2rem; border-top:1px solid var(--border); padding-top:.9rem; }
  .obs-home-act { display:flex; align-items:flex-start; gap:.5rem; font-size:.84rem; color:var(--text-secondary); padding:.25rem 0; }
  .obs-home-act-dot { width:6px; height:6px; border-radius:50%; background:var(--accent); margin-top:.45rem; flex:none; }
  .obs-home-none { font-size:.82rem; color:var(--text-muted); }
  @keyframes obsHomePulse { 0%{box-shadow:0 0 0 0 oklch(0.56 0.09 152 /.5);} 70%{box-shadow:0 0 0 7px oklch(0.56 0.09 152 /0);} 100%{box-shadow:0 0 0 0 oklch(0.56 0.09 152 /0);} }
  `;

  window.OBS_SURFACES.home = HomeSurface;
})();
