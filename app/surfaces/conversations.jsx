/* OBSERVANT surface — Conversations (the why-on-record: 1:1 threads + voice transcripts, each stamped
   with the trigger moment). Registers window.OBS_SURFACES.conversations. Reads state.conversations
   (userId · title · trigger{moment,theme} · mode · duration · messages[{t,text,meta}]) + state.people.
   The audit trail every Signal drills into. CSS prefix: obs-conv- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const R = window.React;

  function ConversationsSurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const convos = state.conversations || [];
    const people = state.people || [];
    const nameOf = (id) => { const p = people.find((x) => x.id === id); return p ? p.name : id; };
    const initials = (n) => String(n || "").split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
    const themeOf = (c) => (c.trigger && (c.trigger.theme || c.trigger.moment)) || "other";

    const themes = []; convos.forEach((c) => { const t = themeOf(c); if (!themes.includes(t)) themes.push(t); });
    const [filter, setFilter] = R.useState("all");
    const [openId, setOpenId] = R.useState(convos[0] ? convos[0].id : null);
    const shown = filter === "all" ? convos : convos.filter((c) => themeOf(c) === filter);
    const open = convos.find((c) => c.id === openId) || shown[0];

    return (
      <div className="obs-conv">
        <style>{CSS}</style>
        <header className="obs-conv-head">
          <h1>Conversations</h1>
          <p>The why, on record — every 1:1 thread and voice transcript, stamped with the moment that triggered it. This is the evidence behind every Signal.</p>
        </header>

        <div className="obs-conv-filters">
          <button className={"obs-conv-chip" + (filter === "all" ? " on" : "")} onClick={() => setFilter("all")}>All <em>{convos.length}</em></button>
          {themes.map((t) => (
            <button key={t} className={"obs-conv-chip" + (filter === t ? " on" : "")} onClick={() => setFilter(t)}>{t}</button>
          ))}
        </div>

        <div className="obs-conv-grid">
          <div className="obs-conv-list">
            {shown.map((c) => (
              <button key={c.id} className={"obs-conv-row" + (open && open.id === c.id ? " on" : "")} onClick={() => setOpenId(c.id)}>
                <span className="obs-conv-av">{initials(nameOf(c.userId))}</span>
                <div className="obs-conv-row-body">
                  <b>{nameOf(c.userId)}</b>
                  <span>{c.title}</span>
                  {c.trigger ? <em className="obs-conv-trig">{c.trigger.moment || themeOf(c)}</em> : null}
                </div>
                {c.mode === "voice" ? <span className="obs-conv-mode"><Icon name="phone" size={11} /> {c.duration || "voice"}</span> : <span className="obs-conv-mode"><Icon name="chat" size={11} /></span>}
              </button>
            ))}
            {!shown.length ? <p className="obs-conv-none">No conversations in this view.</p> : null}
          </div>

          {open && (
            <div className="obs-conv-thread">
              <div className="obs-conv-thread-head">
                <span className="obs-conv-av big">{initials(nameOf(open.userId))}</span>
                <div><h2>{nameOf(open.userId)}</h2><span>{open.title}</span></div>
                {open.mode === "voice" ? <em className="obs-conv-mode big"><Icon name="phone" size={12} /> {open.duration}</em> : null}
              </div>
              {open.trigger ? (
                <div className="obs-conv-stamp"><Icon name="spark" size={12} /> Opened after: <b>{open.trigger.moment}</b>{open.trigger.detail ? " — " + open.trigger.detail : ""}</div>
              ) : null}
              <div className="obs-conv-msgs">
                {(open.messages || []).map((m, i) => (
                  <div className={"obs-conv-msg " + (m.t === "user" ? "them" : "obs")} key={i}>
                    <p>{m.text}</p>
                    {m.meta ? <span className="obs-conv-meta">{m.meta}</span> : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const CSS = `
  .obs-conv { max-width: 1040px; }
  .obs-conv-head h1 { font-family:var(--font-display); font-size:1.6rem; }
  .obs-conv-head p { color:var(--text-secondary); font-size:.88rem; margin-top:.2rem; max-width:64ch; }
  .obs-conv-filters { display:flex; gap:.4rem; flex-wrap:wrap; margin:1rem 0; }
  .obs-conv-chip { display:inline-flex; align-items:center; gap:.35rem; padding:.3rem .65rem; border:1px solid var(--border); border-radius:99px; background:var(--canvas); font-size:.8rem; color:var(--text-secondary); text-transform:capitalize; }
  .obs-conv-chip.on { background:var(--accent-tint); border-color:var(--accent-soft); color:var(--accent-hover); font-weight:600; }
  .obs-conv-chip em { font-style:normal; opacity:.7; font-size:.72rem; }
  .obs-conv-grid { display:grid; grid-template-columns:320px 1fr; gap:1rem; align-items:start; }
  @media (max-width:820px){ .obs-conv-grid{ grid-template-columns:1fr; } }
  .obs-conv-list { display:flex; flex-direction:column; gap:.4rem; max-height:560px; overflow-y:auto; }
  .obs-conv-row { display:flex; align-items:center; gap:.55rem; text-align:left; border:1px solid var(--border); border-radius:11px; background:var(--canvas); padding:.6rem .7rem; cursor:pointer; }
  .obs-conv-row.on { border-color:var(--accent); box-shadow:0 0 0 3px var(--accent-tint); }
  .obs-conv-av { width:30px; height:30px; border-radius:50%; background:var(--accent-tint); color:var(--accent-hover); font-weight:700; font-size:.76rem; display:flex; align-items:center; justify-content:center; flex:none; }
  .obs-conv-av.big { width:42px; height:42px; font-size:.95rem; }
  .obs-conv-row-body { flex:1; min-width:0; } .obs-conv-row-body b { font-size:.85rem; display:block; } .obs-conv-row-body span { font-size:.76rem; color:var(--text-muted); display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .obs-conv-trig { font-style:normal; font-size:.66rem; font-family:var(--font-mono); color:var(--accent); }
  .obs-conv-mode { font-size:.7rem; color:var(--text-muted); display:inline-flex; align-items:center; gap:.2rem; flex:none; } .obs-conv-mode.big { font-style:normal; margin-left:auto; }
  .obs-conv-thread { border:1px solid var(--border); border-radius:14px; background:var(--canvas); padding:1.1rem 1.2rem; }
  .obs-conv-thread-head { display:flex; align-items:center; gap:.7rem; }
  .obs-conv-thread-head h2 { font-family:var(--font-display); font-size:1.15rem; } .obs-conv-thread-head span { font-size:.82rem; color:var(--text-secondary); }
  .obs-conv-stamp { display:flex; align-items:center; gap:.35rem; font-size:.78rem; color:var(--text-muted); background:var(--accent-tint); border-radius:8px; padding:.4rem .6rem; margin:.7rem 0; } .obs-conv-stamp svg{ color:var(--accent); }
  .obs-conv-msgs { display:flex; flex-direction:column; gap:.6rem; margin-top:.5rem; }
  .obs-conv-msg { max-width:80%; padding:.55rem .75rem; border-radius:13px; font-size:.86rem; }
  .obs-conv-msg.obs { align-self:flex-start; background:#f6f5f3; border-bottom-left-radius:3px; }
  .obs-conv-msg.them { align-self:flex-end; background:var(--accent); color:#fff; border-bottom-right-radius:3px; }
  .obs-conv-meta { display:block; font-size:.68rem; opacity:.7; margin-top:.2rem; }
  .obs-conv-none { font-size:.82rem; color:var(--text-muted); }
  `;

  window.OBS_SURFACES.conversations = ConversationsSurface;
})();
