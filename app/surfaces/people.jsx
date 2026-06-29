/* OBSERVANT surface — People / Feedback partners (PRD §3: the person is the unit of analysis).
   Registers window.OBS_SURFACES.people. Roster + a per-person LIVING FILE drawer (who · what they DID ·
   what they SAID over time · open threads · reward/tenure) — the structurally un-copyable moat.
   Reads state.people (incl. .file / .profile). CSS prefix: obs-people- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const R = window.React;

  function PeopleSurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const people = state.people || [];
    const [openId, setOpenId] = R.useState(people[0] ? people[0].id : null);
    const person = people.find((p) => p.id === openId) || people[0];
    const initials = (n) => String(n || "").split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();

    const f = (person && person.file) || {};
    const prof = (person && person.profile) || {};
    const did = f.whatTheyDid || [];
    const said = f.whatTheySaid || (prof.shared || []).map((s) => ({ text: s }));
    const open = f.openThreads || prof.open || [];

    return (
      <div className="obs-people">
        <style>{CSS}</style>
        <header className="obs-people-head">
          <div><h1>Feedback partners</h1><p>The person — not the study — is the unit of analysis. Each is a living file Observant carries across every conversation, so no one repeats themselves.</p></div>
          <span className="obs-people-count">{people.length} partners · {people.filter((p) => p.file).length} with full files</span>
        </header>

        <div className="obs-people-grid">
          <div className="obs-people-roster">
            {people.map((p) => (
              <button key={p.id} className={"obs-people-row" + (openId === p.id ? " on" : "")} onClick={() => setOpenId(p.id)}>
                <span className="obs-people-av">{initials(p.name)}</span>
                <div className="obs-people-row-body">
                  <b>{p.name}</b>
                  <span>{(p.segment || (p.file && p.file.cohort) || "") + (p.surface ? " · " + p.surface : "")}</span>
                </div>
                {p.status ? <em className={"obs-people-status " + (p.status || "").toLowerCase().replace(/\W+/g, "-")}>{p.status}</em> : null}
              </button>
            ))}
          </div>

          {person && (
            <div className="obs-people-file">
              <div className="obs-people-file-head">
                <span className="obs-people-av big">{initials(person.name)}</span>
                <div><h2>{person.name}</h2><span>{f.who || person.memory || ""}</span></div>
              </div>
              <div className="obs-people-meta">
                {f.tenure || prof.since ? <span><Icon name="clock" size={12} /> {f.tenure || prof.since}</span> : null}
                {f.reward || prof.reward ? <span><Icon name="spark" size={12} /> {f.reward || prof.reward}</span> : null}
                {f.channel || person.surface ? <span><Icon name="mail" size={12} /> {f.channel || person.surface}</span> : null}
              </div>

              {did.length ? (
                <section className="obs-people-sec">
                  <h3>What they did</h3>
                  {did.map((d, i) => (
                    <div className="obs-people-timeline" key={i}><span className="obs-people-when">{d.when || ""}</span><p>{d.text || d}</p></div>
                  ))}
                </section>
              ) : null}

              {said.length ? (
                <section className="obs-people-sec">
                  <h3>What they said</h3>
                  {said.map((s, i) => <p className="obs-people-quote" key={i}>{s.when ? <em>{s.when} — </em> : null}{s.text || s}</p>)}
                </section>
              ) : null}

              {(prof.knows || []).length ? (
                <section className="obs-people-sec">
                  <h3>What Observant knows</h3>
                  <ul className="obs-people-knows">{prof.knows.map((k, i) => <li key={i}>{k}</li>)}</ul>
                </section>
              ) : null}

              {open.length ? (
                <section className="obs-people-sec obs-people-open">
                  <h3>Still want to ask</h3>
                  {open.map((o, i) => <div className="obs-people-thread" key={i}><Icon name="chat" size={13} /> {typeof o === "string" ? o : (o.q || o.text || "")}{o && o.status ? <em className="obs-people-thread-status">{o.status}</em> : null}</div>)}
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  const CSS = `
  .obs-people { max-width: 1040px; }
  .obs-people-head { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; }
  .obs-people-head h1 { font-family:var(--font-display); font-size:1.6rem; }
  .obs-people-head p { color:var(--text-secondary); font-size:.88rem; margin-top:.2rem; max-width:60ch; }
  .obs-people-count { font-size:.74rem; color:var(--text-muted); font-family:var(--font-mono); white-space:nowrap; }
  .obs-people-grid { display:grid; grid-template-columns:300px 1fr; gap:1rem; margin-top:1.1rem; align-items:start; }
  @media (max-width:820px){ .obs-people-grid{ grid-template-columns:1fr; } }
  .obs-people-roster { display:flex; flex-direction:column; gap:.4rem; }
  .obs-people-row { display:flex; align-items:center; gap:.55rem; text-align:left; border:1px solid var(--border); border-radius:11px; background:var(--canvas); padding:.6rem .7rem; cursor:pointer; }
  .obs-people-row.on { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-tint); }
  .obs-people-av { width:30px; height:30px; border-radius:50%; background:var(--accent-tint); color:var(--accent-hover); font-weight:700; font-size:.78rem; display:flex; align-items:center; justify-content:center; flex:none; }
  .obs-people-av.big { width:44px; height:44px; font-size:1rem; }
  .obs-people-row-body { flex:1; min-width:0; } .obs-people-row-body b { font-size:.86rem; display:block; } .obs-people-row-body span { font-size:.74rem; color:var(--text-muted); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .obs-people-status { font-style:normal; font-size:.62rem; font-family:var(--font-mono); text-transform:uppercase; padding:.12rem .35rem; border-radius:5px; background:#f0efec; color:var(--text-muted); flex:none; }
  .obs-people-status.off-product { background:var(--accent-tint); color:var(--accent-hover); }
  .obs-people-file { border:1px solid var(--border); border-radius:14px; background:var(--canvas); padding:1.1rem 1.2rem; }
  .obs-people-file-head { display:flex; align-items:center; gap:.7rem; }
  .obs-people-file-head h2 { font-family:var(--font-display); font-size:1.2rem; } .obs-people-file-head span { font-size:.82rem; color:var(--text-secondary); }
  .obs-people-meta { display:flex; flex-wrap:wrap; gap:.8rem; margin:.7rem 0; padding-bottom:.7rem; border-bottom:1px solid var(--border); }
  .obs-people-meta span { display:inline-flex; align-items:center; gap:.3rem; font-size:.78rem; color:var(--text-muted); }
  .obs-people-sec { margin:.9rem 0; }
  .obs-people-sec h3 { font-size:.72rem; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); margin-bottom:.5rem; }
  .obs-people-timeline { display:flex; gap:.7rem; margin-bottom:.4rem; }
  .obs-people-when { flex:none; width:90px; font-size:.74rem; color:var(--text-muted); font-family:var(--font-mono); }
  .obs-people-timeline p { font-size:.84rem; color:var(--text-secondary); }
  .obs-people-quote { font-size:.86rem; color:var(--text-primary); font-style:italic; border-left:2px solid var(--accent-soft); padding-left:.6rem; margin-bottom:.4rem; } .obs-people-quote em { font-style:normal; color:var(--text-muted); font-size:.76rem; }
  .obs-people-knows { list-style:none; margin:0; padding:0; } .obs-people-knows li { font-size:.84rem; color:var(--text-secondary); padding-left:1rem; position:relative; margin-bottom:.25rem; } .obs-people-knows li::before { content:"·"; position:absolute; left:.3rem; color:var(--accent); font-weight:700; }
  .obs-people-open { background:var(--accent-tint); border-radius:10px; padding:.7rem .85rem; }
  .obs-people-thread { display:flex; align-items:center; gap:.4rem; font-size:.84rem; color:var(--text-secondary); padding:.2rem 0; } .obs-people-thread svg { color:var(--accent); }
  `;

  window.OBS_SURFACES.people = PeopleSurface;
})();
