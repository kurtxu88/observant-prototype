/* OBSERVANT surface — Ask Observant (the docked right rail, present on EVERY surface).
   "Reads AND has a mouth" — the sharpest inversion of Novus: their assistant only reads what
   behavior already happened; ours reads AND can go ask. Grounded answers cite named people +
   verbatim quotes; thin evidence -> "I don't have enough — want me to go ask?" -> a tracked
   question-in-flight (an explicit waiting state, NOT a hanging chat bubble).
   Registers window.OBS_SURFACES.askRail (rendered by ProductShell's rail slot). CSS prefix: obs-ask- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const R = window.React;

  // A couple of pre-grounded answers; anything else routes to "go ask".
  function groundedAnswer(q, state) {
    const t = q.toLowerCase();
    const sig = (state.signals || [])[0];
    if (/export|csv|share|dashboard/.test(t)) {
      return { grounded: true, text: "Power users export only to share — the CSV is a workaround for a missing read-only link.",
        cites: [{ who: "Dana", quote: "give me a read-only link and I'd never export again" }, { who: "Marcus", quote: "a link my ops lead can read, not another CSV" }], n: "5 of 7 power users" };
    }
    if (/upgrade|pric|convert|buy|churn/.test(t)) {
      return { grounded: true, text: "Upgrade abandoners aren't price-sensitive — they can't justify the value to teammates internally.",
        cites: [{ who: "Leah", quote: "I couldn't tell my team why this beats the spreadsheet" }], n: "3 abandoners · grounded in the behavioral existence-proof (they left after the price reveal)" };
    }
    return null;
  }

  function AskRail(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const people = state.people || [];
    const [thread, setThread] = R.useState([]); // {role:'you'|'obs', ...}
    const [inFlight, setInFlight] = R.useState(state.questionsInFlight || []);
    const [draft, setDraft] = R.useState("");
    const scrollRef = R.useRef && R.useRef(null);

    const ask = (q) => {
      if (!q.trim()) return;
      const ans = groundedAnswer(q, state);
      const next = [{ role: "you", text: q }];
      if (ans) next.push({ role: "obs", kind: "answer", ans });
      else next.push({ role: "obs", kind: "thin", q });
      setThread((t) => t.concat(next));
      setDraft("");
    };
    const goAsk = (q) => {
      const cohort = (people.slice(0, 3).map((p) => p.name.split(" ")[0]).join(", ")) || "3 partners";
      setInFlight((f) => f.concat([{ id: "q" + Date.now(), q, cohort, when: "just now" }]));
      setThread((t) => t.concat([{ role: "obs", kind: "sent", q, cohort }]));
    };

    const suggestions = ["Why do power users export?", "What are upgrade abandoners saying?", "Summarize product health"];

    return (
      <div className="obs-ask-rail">
        <style>{CSS}</style>
        <div className="obs-ask-head">
          <span className="obs-ask-dot" />
          <div><b>Ask Observant</b><em>grounded in your users — and it can go ask</em></div>
        </div>

        {inFlight.length > 0 && (
          <div className="obs-ask-inflight">
            <span className="obs-ask-inflight-h">{Icon ? <Icon name="clock" size={12} /> : null} {inFlight.length} question{inFlight.length > 1 ? "s" : ""} in flight</span>
            {inFlight.map((q) => (
              <div key={q.id} className="obs-ask-inflight-row"><span className="obs-ask-spin" /><div><b>{q.q}</b><em>asking {q.cohort} · replies in ~a day</em></div></div>
            ))}
          </div>
        )}

        <div className="obs-ask-thread" ref={scrollRef}>
          {thread.length === 0 && (
            <div className="obs-ask-empty">
              <p>Ask anything about your users. I answer from real conversations — with names and quotes. If I don't have enough, I'll offer to go ask.</p>
              <div className="obs-ask-suggest">{suggestions.map((s) => <button key={s} onClick={() => ask(s)}>{s}</button>)}</div>
            </div>
          )}
          {thread.map((m, i) => {
            if (m.role === "you") return <div key={i} className="obs-ask-you">{m.text}</div>;
            if (m.kind === "answer") return (
              <div key={i} className="obs-ask-obs">
                <p>{m.ans.text}</p>
                <div className="obs-ask-cites">{m.ans.cites.map((c, j) => <div key={j} className="obs-ask-cite"><b>{c.who}</b> "{c.quote}"</div>)}</div>
                <span className="obs-ask-n">{m.ans.n}</span>
              </div>
            );
            if (m.kind === "thin") return (
              <div key={i} className="obs-ask-obs thin">
                <p>I don't have enough to answer that yet — I've only heard from your most-active repliers.</p>
                <button className="obs-ask-go" onClick={() => goAsk(m.q)}>{Icon ? <Icon name="relay" size={13} /> : null} Want me to go ask?</button>
              </div>
            );
            return <div key={i} className="obs-ask-obs sent">On it — asking {m.cohort}. The answer returns here when replies land.</div>;
          })}
        </div>

        <div className="obs-ask-input">
          <input value={draft} placeholder="Ask about your users…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(draft); }} />
          <button onClick={() => ask(draft)} aria-label="Ask">{Icon ? <Icon name="arrow" size={15} /> : "→"}</button>
        </div>
      </div>
    );
  }

  const CSS = `
  .obs-ask-rail { display:flex; flex-direction:column; height:100%; min-height:0; }
  .obs-ask-head { display:flex; gap:.5rem; align-items:flex-start; padding:0 0 .8rem; border-bottom:1px solid var(--border); }
  .obs-ask-head b { font-size:.92rem; } .obs-ask-head em { font-style:normal; font-size:.74rem; color:var(--text-muted); display:block; }
  .obs-ask-dot { width:8px; height:8px; border-radius:50%; background:var(--success); margin-top:.4rem; flex:none; }
  .obs-ask-inflight { background: var(--accent-tint); border-radius:10px; padding:.6rem .7rem; margin:.7rem 0; }
  .obs-ask-inflight-h { display:flex; align-items:center; gap:.3rem; font-size:.72rem; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:.08em; color:var(--accent-hover); margin-bottom:.4rem; }
  .obs-ask-inflight-row { display:flex; gap:.5rem; align-items:flex-start; padding:.25rem 0; }
  .obs-ask-inflight-row b { font-size:.8rem; } .obs-ask-inflight-row em { font-style:normal; font-size:.72rem; color:var(--text-muted); display:block; }
  .obs-ask-spin { width:9px; height:9px; border-radius:50%; border:2px solid var(--accent); border-top-color:transparent; margin-top:.3rem; flex:none; animation: obsAskSpin .8s linear infinite; }
  .obs-ask-thread { flex:1; overflow-y:auto; padding:.8rem 0; display:flex; flex-direction:column; gap:.7rem; min-height:120px; }
  .obs-ask-empty p { font-size:.82rem; color:var(--text-secondary); }
  .obs-ask-suggest { display:flex; flex-direction:column; gap:.4rem; margin-top:.7rem; }
  .obs-ask-suggest button { text-align:left; font-size:.8rem; padding:.4rem .6rem; border:1px solid var(--border); border-radius:8px; background:var(--canvas); color:var(--text-secondary); }
  .obs-ask-suggest button:hover { border-color: var(--accent-soft); color: var(--accent-hover); }
  .obs-ask-you { align-self:flex-end; background: var(--accent); color:#fff; padding:.4rem .7rem; border-radius:12px 12px 3px 12px; font-size:.84rem; max-width:85%; }
  .obs-ask-obs { background:#f6f5f3; border-radius:12px 12px 12px 3px; padding:.6rem .7rem; font-size:.84rem; max-width:92%; }
  .obs-ask-obs p { color:var(--text-primary); }
  .obs-ask-cites { margin:.5rem 0 .3rem; display:flex; flex-direction:column; gap:.35rem; }
  .obs-ask-cite { font-size:.78rem; color:var(--text-secondary); border-left:2px solid var(--accent-soft); padding-left:.5rem; } .obs-ask-cite b { color:var(--text-primary); }
  .obs-ask-n { font-size:.7rem; color:var(--text-muted); font-family:var(--font-mono); }
  .obs-ask-obs.thin { background: #fff7f2; }
  .obs-ask-go { margin-top:.5rem; display:inline-flex; align-items:center; gap:.3rem; font-size:.8rem; font-weight:600; color:var(--accent-hover); background:var(--accent-tint); border:1px solid var(--accent-soft); border-radius:8px; padding:.35rem .6rem; }
  .obs-ask-obs.sent { background: var(--success-tint); color: var(--success); }
  .obs-ask-input { display:flex; gap:.4rem; padding-top:.6rem; border-top:1px solid var(--border); }
  .obs-ask-input input { flex:1; border:1px solid var(--border); border-radius:9px; padding:.45rem .6rem; font-size:.84rem; }
  .obs-ask-input button { width:34px; border-radius:9px; background: var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; }
  @keyframes obsAskSpin { to { transform: rotate(360deg); } }
  `;

  window.OBS_SURFACES.askRail = AskRail;
})();
