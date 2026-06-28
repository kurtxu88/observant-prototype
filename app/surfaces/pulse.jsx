/* OBSERVANT surface — Pulse (the light tier: free / in-product / text-only / one-round / no-consent).
   v1 MINIMAL = exactly two moments: ai_eval + key_cta. The rest of the moment library stays parked.
   Principle on the surface: asking feels heavy → we watch mostly, prompt rarely.
   Registers window.OBS_SURFACES.pulse. Reads state.pulseMoments {config, recent} + state.people.
   CSS prefix: obs-pulse- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const R = window.React;

  function PulseSurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const pm = state.pulseMoments || { config: {}, recent: [] };
    const people = state.people || [];
    const nameOf = (id) => { const p = people.find((x) => x.id === id); return p ? p.name : id; };
    const cfg = pm.config || {};
    const moments = [cfg.aiEval, cfg.keyCta].filter(Boolean);
    const [on, setOn] = R.useState(() => {
      const m = {}; moments.forEach((x) => { m[x.id] = x.enabled !== false; }); return m;
    });

    return (
      <div className="obs-pulse">
        <style>{CSS}</style>
        <header className="obs-pulse-head">
          <span className="obs-pulse-eyebrow">Pulse · the light tier</span>
          <h1>Small feedback, in the moment. Free.</h1>
          <p>A tap, a reaction, a sentence while someone's using your product — text only, one round, no
            opt-in, no cost. <b>Asking feels heavy, so we watch mostly and prompt rarely</b> — only at the
            few moments that earn the interruption. v1 ships two; the rest of the library stays parked.</p>
        </header>

        <div className="obs-pulse-cards">
          {moments.map((m) => (
            <article key={m.id} className={"obs-pulse-card" + (on[m.id] ? "" : " off")}>
              <div className="obs-pulse-card-top">
                <div>
                  <span className="obs-pulse-tier">Pulse</span>
                  <b>{m.label}</b>
                </div>
                <button className={"obs-pulse-toggle" + (on[m.id] ? " on" : "")} onClick={() => setOn((s) => ({ ...s, [m.id]: !s[m.id] }))} aria-label="toggle">
                  <span />
                </button>
              </div>
              {m.ctaName && <div className="obs-pulse-cta">{Icon ? <Icon name="grid" size={12} /> : null} watches <b>{m.ctaName}</b> · <code>{m.ctaPath}</code> · the one CTA, not every CTA</div>}
              <div className="obs-pulse-q">
                <span className="obs-pulse-q-label">The one question</span>
                <p>"{m.question}"</p>
              </div>
              <div className="obs-pulse-meta">
                <span>{Icon ? <Icon name="clock" size={12} /> : null} {m.cooldown}</span>
                <span>last fired {m.lastFired}</span>
              </div>
            </article>
          ))}
        </div>

        <div className="obs-pulse-rules">
          <span><Icon2 ui={ui} name="check" /> text only</span>
          <span><Icon2 ui={ui} name="check" /> one round</span>
          <span><Icon2 ui={ui} name="check" /> no consent</span>
          <span><Icon2 ui={ui} name="check" /> free</span>
          <em>Anything deeper → it offers a Deep dive (consent + reward). The urge to ask a second question is the escalation trigger.</em>
        </div>

        <section className="obs-pulse-feed">
          <h2>Recent light responses</h2>
          {(pm.recent || []).map((r) => (
            <div key={r.id} className="obs-pulse-resp">
              <div className="obs-pulse-resp-h">
                <span className="obs-pulse-moment">{r.moment === "ai_eval" ? "AI eval" : "Key CTA"}</span>
                <b>{nameOf(r.personId)}</b><em>{r.when}</em>
              </div>
              <p className="obs-pulse-prompt">"{r.prompt}"</p>
              <p className="obs-pulse-answer">{r.response}</p>
            </div>
          ))}
          {(pm.recent || []).length === 0 && <p className="obs-pulse-pending">No light responses yet — watching for the moments above.</p>}
        </section>

        <p className="obs-pulse-parked">⏳ Parked (continuing): onboarding, churn-risk, session-end, key-journey, activation, resurrection… added only when each earns the interruption. Full library + consent boundary in the moment-library spec.</p>
      </div>
    );
  }

  function Icon2({ ui, name }) { const I = (ui && ui.Icon) || window.Icon; return I ? <I name={name} size={12} sw={3} /> : <span>✓</span>; }

  const CSS = `
  .obs-pulse { max-width: 900px; }
  .obs-pulse-eyebrow { font-family: var(--font-mono); font-size:.7rem; letter-spacing:.14em; text-transform:uppercase; color: var(--accent); }
  .obs-pulse-head h1 { font-family: var(--font-display); font-size:1.7rem; margin:.2rem 0 .4rem; }
  .obs-pulse-head p { color: var(--text-secondary); max-width:72ch; font-size:.9rem; }
  .obs-pulse-cards { display:grid; grid-template-columns:1fr 1fr; gap:.8rem; margin:1.3rem 0 1rem; }
  @media (max-width:760px){ .obs-pulse-cards{ grid-template-columns:1fr; } }
  .obs-pulse-card { border:1px solid var(--border); border-radius:13px; background:var(--canvas); padding:1rem 1.1rem; }
  .obs-pulse-card.off { opacity:.55; }
  .obs-pulse-card-top { display:flex; justify-content:space-between; align-items:flex-start; }
  .obs-pulse-tier { font-family:var(--font-mono); font-size:.62rem; letter-spacing:.1em; text-transform:uppercase; color:var(--success); display:block; margin-bottom:.15rem; }
  .obs-pulse-card-top b { font-size:1rem; }
  .obs-pulse-toggle { width:38px; height:22px; border-radius:99px; background:var(--border-strong); position:relative; transition:background .15s; flex:none; }
  .obs-pulse-toggle.on { background: var(--success); }
  .obs-pulse-toggle span { position:absolute; top:2px; left:2px; width:18px; height:18px; border-radius:50%; background:#fff; transition:left .15s; }
  .obs-pulse-toggle.on span { left:18px; }
  .obs-pulse-cta { font-size:.76rem; color:var(--text-muted); margin:.5rem 0; } .obs-pulse-cta code { font-family:var(--font-mono); font-size:.72rem; }
  .obs-pulse-q { background:#f7f6f4; border-radius:9px; padding:.6rem .7rem; margin:.6rem 0; }
  .obs-pulse-q-label { font-size:.66rem; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); }
  .obs-pulse-q p { font-size:.86rem; color:var(--text-primary); margin-top:.2rem; font-style:italic; }
  .obs-pulse-meta { display:flex; justify-content:space-between; font-size:.74rem; color:var(--text-muted); } .obs-pulse-meta span { display:inline-flex; align-items:center; gap:.25rem; }
  .obs-pulse-rules { display:flex; align-items:center; gap:.9rem; flex-wrap:wrap; padding:.7rem .9rem; background:var(--success-tint); border-radius:10px; font-size:.8rem; color:var(--success); }
  .obs-pulse-rules span { display:inline-flex; align-items:center; gap:.25rem; font-weight:600; }
  .obs-pulse-rules em { font-style:normal; color:var(--text-secondary); font-size:.78rem; flex:1; min-width:240px; }
  .obs-pulse-feed { margin-top:1.4rem; }
  .obs-pulse-feed h2 { font-family:var(--font-display); font-size:1.1rem; margin-bottom:.7rem; }
  .obs-pulse-resp { border:1px solid var(--border); border-radius:11px; padding:.7rem .9rem; margin-bottom:.6rem; }
  .obs-pulse-resp-h { display:flex; align-items:center; gap:.5rem; margin-bottom:.35rem; }
  .obs-pulse-moment { font-family:var(--font-mono); font-size:.62rem; text-transform:uppercase; letter-spacing:.06em; background:var(--accent-tint); color:var(--accent-hover); padding:.1rem .4rem; border-radius:5px; }
  .obs-pulse-resp-h b { font-size:.85rem; } .obs-pulse-resp-h em { font-style:normal; font-size:.72rem; color:var(--text-muted); }
  .obs-pulse-prompt { font-size:.8rem; color:var(--text-muted); font-style:italic; }
  .obs-pulse-answer { font-size:.86rem; color:var(--text-primary); margin-top:.2rem; }
  .obs-pulse-pending, .obs-pulse-parked { font-size:.8rem; color:var(--text-muted); }
  .obs-pulse-parked { margin-top:1rem; padding-top:.8rem; border-top:1px dashed var(--border); }
  `;

  window.OBS_SURFACES.pulse = PulseSurface;
})();
