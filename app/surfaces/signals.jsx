/* OBSERVANT surface — Signals (Issue / Insight / Opportunity, grounded in the why).
   Registers window.OBS_SURFACES.signals. Reads state.signals (falls back to the
   canonical window.OBS_DATA.signals(workspace) until the data fold-in lands).
   Two non-negotiable spines made visible: the EVIDENCE GRADE (past-behavior
   existence-proofs vs. hypothetical intent, counted + named) and CONTRADICTION
   (behavior says X, words say Y) as a first-class flag. Sub-threshold = "Forming".
   CSS prefix: obs-signals-  ·  PRD §3, §4, §5. */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const { useState } = React;

  /* ---------- one-time scoped styles ---------- */
  (function injectStyles() {
    if (typeof document === "undefined") return;
    if (document.getElementById("obs-signals-styles")) return;
    const st = document.createElement("style");
    st.id = "obs-signals-styles";
    st.textContent = `
.obs-signals { display: flex; flex-direction: column; gap: 1.1rem; }
.obs-signals-ptitle { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.obs-signals-ptitle span { font-family: var(--font-mono); font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.obs-signals-ptitle h2 { font-family: var(--font-display); font-weight: 500; font-size: 1.5rem; margin: 0.1rem 0 0; letter-spacing: -0.01em; }
.obs-signals-ptitle em { font-family: var(--font-mono); font-size: 0.74rem; color: var(--text-muted); font-style: normal; }

.obs-signals-controls { display: flex; flex-direction: column; gap: 0.7rem; }
.obs-signals-tabs { display: inline-flex; gap: 0.25rem; background: var(--surface); border: 1px solid var(--border); border-radius: 11px; padding: 0.25rem; width: fit-content; }
.obs-signals-tab { font-family: var(--font-sans); font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); background: transparent; border: 0; border-radius: 8px; padding: 0.38rem 0.85rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; transition: all .16s; }
.obs-signals-tab:hover { color: var(--text-primary); }
.obs-signals-tab.on { background: var(--panel); color: var(--text-primary); box-shadow: 0 1px 2px oklch(0.4 0.05 40 / .12); }
.obs-signals-tab .obs-signals-tabn { font-family: var(--font-mono); font-size: 0.68rem; color: var(--text-muted); }
.obs-signals-tab.on .obs-signals-tabn { color: var(--accent); }

.obs-signals-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.55rem; }
.obs-signals-fl { font-family: var(--font-mono); font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
.obs-signals-sel { font-family: var(--font-sans); font-size: 0.8rem; color: var(--text-primary); background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 0.32rem 0.6rem; cursor: pointer; }
.obs-signals-chip { font-family: var(--font-sans); font-size: 0.78rem; font-weight: 500; color: var(--text-secondary); background: var(--panel); border: 1px solid var(--border); border-radius: 999px; padding: 0.3rem 0.7rem; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem; transition: all .16s; }
.obs-signals-chip.on { border-color: var(--contra); color: var(--contra); background: var(--contra-tint); }

.obs-signals-list { display: flex; flex-direction: column; gap: 0.9rem; }

.obs-signals-card { background: var(--panel); border: 1px solid var(--border); border-radius: 14px; padding: 1.15rem 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; transition: border-color .18s, box-shadow .18s; }
.obs-signals-card:hover { border-color: var(--border-strong); box-shadow: 0 10px 30px -22px oklch(0.4 0.05 40 / .55); }
.obs-signals-card.forming { border-style: dashed; background: var(--surface); }
.obs-signals-card.contra { border-left: 3px solid var(--contra); }

.obs-signals-cardtop { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.obs-signals-type { font-family: var(--font-mono); font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; padding: 0.22rem 0.55rem; border-radius: 6px; }
.obs-signals-type.Issue { color: var(--accent-hover); background: var(--accent-tint); }
.obs-signals-type.Insight { color: var(--ins); background: var(--ins-tint); }
.obs-signals-type.Opportunity { color: var(--opp); background: var(--opp-tint); }
.obs-signals-status { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 0.22rem 0.5rem; border-radius: 6px; color: var(--text-secondary); background: var(--surface-2); }
.obs-signals-status.Active { color: var(--success); background: var(--success-tint); }
.obs-signals-status.Verifying { color: var(--ins); background: var(--ins-tint); }
.obs-signals-status.Forming { color: var(--text-muted); background: var(--surface-2); }
.obs-signals-flag { margin-left: auto; font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; color: var(--contra); background: var(--contra-tint); padding: 0.22rem 0.55rem; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.3rem; }
.obs-signals-metric { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); }

.obs-signals-title { font-family: var(--font-display); font-size: 1.16rem; font-weight: 500; line-height: 1.3; letter-spacing: -0.01em; color: var(--text-primary); margin: 0; cursor: pointer; text-align: left; background: none; border: 0; padding: 0; }
.obs-signals-title:hover { color: var(--accent-hover); }

.obs-signals-people { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
.obs-signals-ava { width: 24px; height: 24px; font-size: 0.62rem; border-radius: 50%; color: oklch(0.99 0 0); display: grid; place-items: center; font-weight: 600; }
.obs-signals-pnames { font-size: 0.8rem; color: var(--text-secondary); }

.obs-signals-grade { border: 1px solid var(--border); border-radius: 11px; padding: 0.8rem 0.9rem; background: var(--surface); display: flex; flex-direction: column; gap: 0.55rem; }
.obs-signals-gradehd { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
.obs-signals-gradehd b { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; }
.obs-signals-gradetag { font-family: var(--font-mono); font-size: 0.66rem; padding: 0.15rem 0.45rem; border-radius: 5px; }
.obs-signals-gradetag.Strong { color: var(--success); background: var(--success-tint); }
.obs-signals-gradetag.Emerging { color: var(--accent-hover); background: var(--accent-tint); }
.obs-signals-gradetag.Forming { color: var(--text-muted); background: var(--surface-2); }
.obs-signals-meter { display: flex; height: 7px; border-radius: 4px; overflow: hidden; background: var(--surface-2); }
.obs-signals-meter .ep { background: var(--success); }
.obs-signals-meter .hy { background: repeating-linear-gradient(45deg, var(--border-strong), var(--border-strong) 3px, var(--surface-2) 3px, var(--surface-2) 6px); }
.obs-signals-gradelegend { display: flex; gap: 1.1rem; font-size: 0.76rem; color: var(--text-secondary); flex-wrap: wrap; }
.obs-signals-gradelegend .ep b, .obs-signals-gradelegend .hy b { font-family: var(--font-mono); color: var(--text-primary); }
.obs-signals-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.35rem; vertical-align: middle; }
.obs-signals-dot.ep { background: var(--success); }
.obs-signals-dot.hy { background: var(--border-strong); }
.obs-signals-bias { font-size: 0.76rem; color: var(--text-muted); display: flex; gap: 0.4rem; align-items: flex-start; line-height: 1.45; }
.obs-signals-bias svg { flex-shrink: 0; margin-top: 1px; color: var(--text-muted); }

.obs-signals-contrablock { border: 1px solid var(--contra-bord); border-radius: 11px; padding: 0.75rem 0.9rem; background: var(--contra-tint); display: flex; flex-direction: column; gap: 0.5rem; }
.obs-signals-contrablock .ch { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--contra); font-weight: 600; display: flex; align-items: center; gap: 0.35rem; }
.obs-signals-contrarow { display: grid; grid-template-columns: 84px 1fr; gap: 0.6rem; font-size: 0.82rem; line-height: 1.45; align-items: baseline; }
.obs-signals-contrarow span:first-child { font-family: var(--font-mono); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.obs-signals-contrarow span:last-child { color: var(--text-primary); }

.obs-signals-why { display: flex; flex-direction: column; gap: 0.7rem; }
.obs-signals-whyblock b { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-secondary); display: block; margin-bottom: 0.25rem; }
.obs-signals-whyblock p { margin: 0; font-size: 0.86rem; line-height: 1.55; color: var(--text-secondary); }

.obs-signals-quote { border-left: 2px solid var(--accent-soft); padding: 0.15rem 0 0.15rem 0.75rem; font-family: var(--font-display); font-style: italic; font-size: 0.92rem; color: var(--text-primary); line-height: 1.45; }
.obs-signals-quote .who { display: block; font-family: var(--font-mono); font-style: normal; font-size: 0.66rem; color: var(--text-muted); margin-top: 0.25rem; }

.obs-signals-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding-top: 0.15rem; }
.obs-signals-gate { font-family: var(--font-mono); font-size: 0.66rem; color: var(--text-muted); margin-left: auto; }
.obs-signals-done { font-family: var(--font-mono); font-size: 0.7rem; color: var(--success); display: inline-flex; align-items: center; gap: 0.3rem; }

.obs-signals-more { font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent); background: none; border: 0; cursor: pointer; padding: 0; display: inline-flex; align-items: center; gap: 0.3rem; }
.obs-signals-more:hover { color: var(--accent-hover); }

/* drawer */
.obs-signals-scrim { position: fixed; inset: 0; background: oklch(0.3 0.02 60 / .32); backdrop-filter: blur(1.5px); z-index: 40; animation: obsSigFade .18s ease; }
.obs-signals-drawer { position: fixed; top: 0; right: 0; height: 100vh; width: min(560px, 94vw); background: var(--canvas); border-left: 1px solid var(--border); z-index: 41; display: flex; flex-direction: column; box-shadow: -24px 0 60px -40px oklch(0.3 0.05 40 / .6); animation: obsSigSlide .22s cubic-bezier(.2,.8,.2,1); }
@keyframes obsSigFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes obsSigSlide { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.obs-signals-dwhead { display: flex; align-items: flex-start; gap: 0.6rem; padding: 1.2rem 1.3rem 0.9rem; border-bottom: 1px solid var(--border); }
.obs-signals-dwx { margin-left: auto; background: none; border: 0; color: var(--text-muted); cursor: pointer; padding: 0.2rem; border-radius: 7px; }
.obs-signals-dwx:hover { color: var(--text-primary); background: var(--surface-2); }
.obs-signals-dwbody { overflow-y: auto; padding: 1.2rem 1.3rem 2rem; display: flex; flex-direction: column; gap: 1.05rem; }
.obs-signals-dwtitle { font-family: var(--font-display); font-size: 1.32rem; font-weight: 500; line-height: 1.28; letter-spacing: -0.01em; margin: 0.15rem 0 0; }
.obs-signals-sec b { font-family: var(--font-mono); font-size: 0.62rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-secondary); display: block; margin-bottom: 0.4rem; }
.obs-signals-sec p { margin: 0; font-size: 0.88rem; line-height: 1.55; color: var(--text-secondary); }
.obs-signals-link { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.82rem; color: var(--text-primary); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 0.4rem 0.6rem; cursor: pointer; transition: all .15s; }
.obs-signals-link:hover { border-color: var(--accent); color: var(--accent-hover); }
.obs-signals-link .obs-signals-ava { width: 20px; height: 20px; font-size: 0.56rem; }
.obs-signals-linkrow { display: flex; flex-wrap: wrap; gap: 0.45rem; }
.obs-signals-actlink { border: 1px solid var(--border); border-radius: 11px; padding: 0.7rem 0.85rem; background: var(--surface); display: flex; flex-direction: column; gap: 0.3rem; }
.obs-signals-actlink .st { font-family: var(--font-mono); font-size: 0.64rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent); }
.obs-signals-actlink .ti { font-size: 0.86rem; color: var(--text-primary); }
.obs-signals-empty { border: 1px dashed var(--border-strong); border-radius: 13px; padding: 2rem; text-align: center; display: flex; flex-direction: column; gap: 0.4rem; background: var(--surface); }
.obs-signals-empty b { font-family: var(--font-display); font-size: 1.05rem; }
.obs-signals-empty span { color: var(--text-muted); font-size: 0.86rem; }
`;
    document.head.appendChild(st);
  })();

  /* color tokens local to this surface (kept off global :root) */
  (function injectTokens() {
    if (typeof document === "undefined") return;
    if (document.getElementById("obs-signals-tokens")) return;
    const st = document.createElement("style");
    st.id = "obs-signals-tokens";
    st.textContent = `.obs-signals {
      --ins: oklch(0.52 0.10 255); --ins-tint: oklch(0.95 0.022 255);
      --opp: oklch(0.58 0.09 90); --opp-tint: oklch(0.95 0.03 90);
      --contra: oklch(0.55 0.15 28); --contra-tint: oklch(0.955 0.028 32); --contra-bord: oklch(0.84 0.06 30);
    }`;
    document.head.appendChild(st);
  })();

  /* ---------- helpers ---------- */
  function capId(id) {
    if (!id) return "";
    return id.charAt(0).toUpperCase() + id.slice(1);
  }
  function confidenceOf(s) {
    if (s.status === "Forming") return "Forming";
    const ep = (s.evidenceGrade && s.evidenceGrade.existenceProofs) || 0;
    return ep >= 3 ? "Strong" : "Emerging";
  }
  function canDriveFix(s) {
    const ep = (s.evidenceGrade && s.evidenceGrade.existenceProofs) || 0;
    return s.type !== "Opportunity" && s.status !== "Forming" && ep > 0;
  }

  /* ---------- named-people avatar cluster ---------- */
  function NamedAvatars(p) {
    const Avatar = window.Avatar;
    const ids = (p.ids || []).slice(0, 4);
    const extra = (p.ids || []).length - ids.length;
    return (
      <div className="obs-signals-people">
        {ids.map((id) => (
          <Avatar key={id} name={p.nameFor(id)} color={p.colorFor(id)} cls="obs-signals-ava" />
        ))}
        <span className="obs-signals-pnames">
          {ids.map((id) => p.nameFor(id).split(" ")[0]).join(", ")}
          {extra > 0 ? " +" + extra : ""}
        </span>
      </div>
    );
  }

  /* ---------- evidence grade ---------- */
  function EvidenceGrade(p) {
    const Icon = window.Icon;
    const g = p.grade || { existenceProofs: 0, hypotheticals: 0, namedPeople: [] };
    const ep = g.existenceProofs || 0;
    const hy = g.hypotheticals || 0;
    const total = ep + hy || 1;
    const named = (g.namedPeople || []).map((id) => p.nameFor(id).split(" ")[0]).join(", ");
    return (
      <div className="obs-signals-grade">
        <div className="obs-signals-gradehd">
          <b>Evidence grade</b>
          <span className={"obs-signals-gradetag " + p.tag}>{p.tag}</span>
        </div>
        <div className="obs-signals-meter">
          <div className="ep" style={{ width: (ep / total) * 100 + "%" }} />
          <div className="hy" style={{ width: (hy / total) * 100 + "%" }} />
        </div>
        <div className="obs-signals-gradelegend">
          <span className="ep"><span className="obs-signals-dot ep" /><b>{ep}</b> past-behavior existence-proof{ep === 1 ? "" : "s"}</span>
          <span className="hy"><span className="obs-signals-dot hy" /><b>{hy}</b> hypothetical intent</span>
        </div>
        {named && <div className="obs-signals-bias" style={{ color: "var(--text-secondary)" }}><Icon name="users" size={13} /><span>Named: {named}</span></div>}
        {p.bias && <div className="obs-signals-bias"><Icon name="globe" size={13} /><span>{p.bias}</span></div>}
      </div>
    );
  }

  /* ---------- contradiction block ---------- */
  function ContradictionBlock(p) {
    const Icon = window.Icon;
    const c = p.contradiction;
    if (!c) return null;
    return (
      <div className="obs-signals-contrablock">
        <div className="ch"><Icon name="bolt" size={12} /> Contradiction — behavior vs. words</div>
        <div className="obs-signals-contrarow"><span>Behavior</span><span>{c.behavior}</span></div>
        <div className="obs-signals-contrarow"><span>Words</span><span>{c.words}</span></div>
      </div>
    );
  }

  /* ---------- action buttons (shared card + drawer) ---------- */
  function SignalActions(p) {
    const Btn = window.Btn;
    const Icon = window.Icon;
    const s = p.signal;
    const drafted = p.drafted;
    const asked = p.asked;
    const canFix = canDriveFix(s);
    return (
      <div className="obs-signals-actions">
        {!p.hideInvestigate && (
          <Btn variant="ghost" size="sm" onClick={p.onInvestigate}>
            <Icon name="search" size={14} /> Investigate
          </Btn>
        )}
        {asked ? (
          <span className="obs-signals-done"><Icon name="check" size={13} /> Routed to Ask Observant</span>
        ) : (
          <Btn variant="ghost" size="sm" onClick={p.onAsk}>
            <Icon name="chat" size={14} /> Ask Observant
          </Btn>
        )}
        {s.status === "Forming" ? (
          <Btn variant="quiet" size="sm" onClick={p.onAsk}><Icon name="users" size={14} /> Recruit for depth</Btn>
        ) : drafted ? (
          <span className="obs-signals-done"><Icon name="check" size={13} /> Fix drafted</span>
        ) : canFix ? (
          <Btn variant="primary" size="sm" onClick={p.onDraft}><Icon name="bolt" size={14} /> Draft fix</Btn>
        ) : (
          <Btn variant="quiet" size="sm" onClick={p.onDraft}><Icon name="chat" size={14} /> Open validation</Btn>
        )}
        {s.type === "Opportunity" && <span className="obs-signals-gate">Opportunity — opens a validation conversation, never a PR.</span>}
        {s.status === "Forming" && <span className="obs-signals-gate">Sub-threshold — watching for more before it's called.</span>}
      </div>
    );
  }

  /* ---------- card ---------- */
  function SignalCard(p) {
    const Icon = window.Icon;
    const s = p.signal;
    const [open, setOpen] = useState(false);
    return (
      <div className={"obs-signals-card " + (s.status === "Forming" ? "forming " : "") + (s.contradiction ? "contra" : "")}>
        <div className="obs-signals-cardtop">
          <span className={"obs-signals-type " + s.type}>{s.type}</span>
          <span className={"obs-signals-status " + s.status}>{s.status}</span>
          <span className="obs-signals-metric">{s.metric}</span>
          {s.contradiction && <span className="obs-signals-flag"><Icon name="bolt" size={11} /> Contradiction</span>}
        </div>

        <button type="button" className="obs-signals-title" onClick={p.onInvestigate}>{s.title}</button>

        {(s.raisedBy && s.raisedBy.length) ? <NamedAvatars ids={s.raisedBy} nameFor={p.nameFor} colorFor={p.colorFor} /> : null}

        <EvidenceGrade grade={s.evidenceGrade} tag={confidenceOf(s)} bias={s.sampleBias} nameFor={p.nameFor} />

        <ContradictionBlock contradiction={s.contradiction} />

        <div className="obs-signals-why">
          <div className="obs-signals-whyblock">
            <b>What the data shows</b>
            <p>{s.whatTheDataShows}</p>
          </div>
          {open && (
            <div className="obs-signals-whyblock">
              <b>Why this surfaced</b>
              <p>{s.whySurfaced}</p>
            </div>
          )}
          {open && s.quotes && s.quotes.map((q, i) => (
            <div className="obs-signals-quote" key={i}>“{q.text}”<span className="who">— {p.nameFor(q.personId)}</span></div>
          ))}
          <button type="button" className="obs-signals-more" onClick={() => setOpen(!open)}>
            {open ? "Less" : "Why this surfaced · verbatim"} <Icon name={open ? "back" : "arrow"} size={13} />
          </button>
        </div>

        <SignalActions signal={s} drafted={p.drafted} asked={p.asked} onInvestigate={p.onInvestigate} onAsk={p.onAsk} onDraft={p.onDraft} />
      </div>
    );
  }

  /* ---------- detail drawer ---------- */
  function SignalDetail(p) {
    const Icon = window.Icon;
    const Avatar = window.Avatar;
    const s = p.signal;
    if (!s) return null;
    const named = (s.evidenceGrade && s.evidenceGrade.namedPeople) || s.raisedBy || [];
    return (
      <React.Fragment>
        <div className="obs-signals-scrim" onClick={p.onClose} />
        <aside className="obs-signals-drawer" role="dialog" aria-label="Signal detail">
          <div className="obs-signals-dwhead">
            <div>
              <span className={"obs-signals-type " + s.type}>{s.type}</span>
              <span className={"obs-signals-status " + s.status} style={{ marginLeft: "0.4rem" }}>{s.status}</span>
              <h2 className="obs-signals-dwtitle">{s.title}</h2>
            </div>
            <button type="button" className="obs-signals-dwx" onClick={p.onClose} aria-label="Close"><Icon name="x" size={18} /></button>
          </div>
          <div className="obs-signals-dwbody">
            <div className="obs-signals-sec">
              <b>Root cause — what the conversations say</b>
              <p>{s.whySurfaced}</p>
            </div>

            <EvidenceGrade grade={s.evidenceGrade} tag={confidenceOf(s)} bias={s.sampleBias} nameFor={p.nameFor} />

            <ContradictionBlock contradiction={s.contradiction} />

            <div className="obs-signals-sec">
              <b>What the data shows</b>
              <p>{s.whatTheDataShows}</p>
            </div>

            {s.quotes && s.quotes.length ? (
              <div className="obs-signals-sec">
                <b>Verbatim</b>
                {s.quotes.map((q, i) => (
                  <div className="obs-signals-quote" key={i}>“{q.text}”<span className="who">— {p.nameFor(q.personId)}</span></div>
                ))}
              </div>
            ) : null}

            <div className="obs-signals-sec">
              <b>The trigger that opened these 1:1s</b>
              <p>{s.trigger} · grounded in {s.sourceCounts ? s.sourceCounts.conversations : 0} conversations across {s.sourceCounts ? s.sourceCounts.moments : 0} observed moments.</p>
            </div>

            <div className="obs-signals-sec">
              <b>Drill into the people who raised this</b>
              <div className="obs-signals-linkrow">
                {named.map((id) => (
                  <button type="button" className="obs-signals-link" key={id} onClick={() => p.onOpenConversation(id)}>
                    <Avatar name={p.nameFor(id)} color={p.colorFor(id)} cls="obs-signals-ava" />
                    {p.nameFor(id).split(" ")[0]} · {p.cohortFor(id)}
                    <Icon name="arrow" size={13} />
                  </button>
                ))}
              </div>
            </div>

            {p.actItem && (
              <div className="obs-signals-sec">
                <b>Linked close-the-loop</b>
                <div className="obs-signals-actlink">
                  <span className="st">{p.actItem.state}</span>
                  <span className="ti">{p.actItem.title}</span>
                </div>
              </div>
            )}

            <SignalActions signal={s} hideInvestigate drafted={p.drafted} asked={p.asked} onAsk={p.onAsk} onDraft={p.onDraft} />
          </div>
        </aside>
      </React.Fragment>
    );
  }

  /* ---------- main surface ---------- */
  function SignalsSurface(props) {
    const state = props.state || {};
    const navigate = props.navigate;
    const ui = props.ui || window;
    const PanelTitle = ui.PanelTitle || window.PanelTitle || (function FallbackPT(q) {
      return (
        <div className="obs-signals-ptitle">
          <div><span>{q.k}</span><h2>{q.title}</h2></div>
          {q.status && <em>{q.status}</em>}
        </div>
      );
    });

    // read off state; fall back to the canonical OBS_DATA dataset (same workspace).
    let signals = (state.signals && state.signals.length) ? state.signals
      : (window.OBS_DATA && window.OBS_DATA.signals ? window.OBS_DATA.signals(state.workspace) : []);

    // people lookup = seeded panel + off-product extras (churned/never-converted).
    const extras = (window.OBS_DATA && window.OBS_DATA.extraPeople) ? window.OBS_DATA.extraPeople(state.workspace) : [];
    const people = (state.people || []).concat(extras);
    const byId = {};
    people.forEach((person) => { byId[person.id] = person; });
    const nameFor = (id) => (byId[id] && byId[id].name) || capId(id);
    const colorFor = (id) => (byId[id] && byId[id].color) || "rust";
    const cohortFor = (id) => (byId[id] && (byId[id].segment || (byId[id].file && byId[id].file.cohort))) || "—";

    const actLedger = (state.actLedger && state.actLedger.length) ? state.actLedger
      : (window.OBS_DATA && window.OBS_DATA.actLedger ? window.OBS_DATA.actLedger(state.workspace) : []);
    const actById = {};
    actLedger.forEach((a) => { actById[a.id] = a; });

    const [tab, setTab] = useState("all");
    const [status, setStatus] = useState("all");
    const [confidence, setConfidence] = useState("all");
    const [cohort, setCohort] = useState("all");
    const [contraOnly, setContraOnly] = useState(false);
    const [selectedId, setSelectedId] = useState("");
    const [drafted, setDrafted] = useState({});
    const [asked, setAsked] = useState({});

    const cohortOptions = (function () {
      const set = {};
      signals.forEach((s) => (s.evidenceGrade && s.evidenceGrade.namedPeople || []).forEach((id) => { set[cohortFor(id)] = true; }));
      return Object.keys(set).filter((c) => c && c !== "—");
    })();

    const counts = {
      all: signals.length,
      Issue: signals.filter((s) => s.type === "Issue").length,
      Insight: signals.filter((s) => s.type === "Insight").length,
      Opportunity: signals.filter((s) => s.type === "Opportunity").length,
    };

    const visible = signals.filter((s) => {
      if (tab !== "all" && s.type !== tab) return false;
      if (status !== "all" && s.status !== status) return false;
      if (confidence !== "all" && confidenceOf(s) !== confidence) return false;
      if (contraOnly && !s.contradiction) return false;
      if (cohort !== "all") {
        const named = (s.evidenceGrade && s.evidenceGrade.namedPeople) || [];
        if (!named.some((id) => cohortFor(id) === cohort)) return false;
      }
      return true;
    });

    const formingCount = visible.filter((s) => s.status === "Forming").length;

    const onAsk = (s) => {
      setAsked((m) => Object.assign({}, m, { [s.id]: true }));
      if (typeof navigate === "function") {
        navigate({ section: "compose", pendingInsightQuestion: "Tell me more about: " + s.title });
      }
    };
    const onDraft = (s) => {
      setDrafted((m) => Object.assign({}, m, { [s.id]: true }));
      if (typeof props.patchState === "function") {
        props.patchState((prev) => Object.assign({}, prev, { selectedActId: s.actId || prev.selectedActId }));
      }
    };
    const onOpenConversation = (personId) => {
      if (typeof navigate === "function") {
        navigate({ section: "conversations", conversationId: personId, focusedTarget: "person-" + personId });
      }
    };

    const selected = signals.find((s) => s.id === selectedId);

    const TABS = [
      { id: "all", label: "All" },
      { id: "Issue", label: "Issues" },
      { id: "Insight", label: "Insights" },
      { id: "Opportunity", label: "Opportunities" },
    ];

    return (
      <div className="obs-signals">
        <PanelTitle
          k="Analyze · grounded in the why"
          title="Signals"
          status={counts.all + " open · " + (counts.all - formingCount) + " called, " + signals.filter((s) => s.status === "Forming").length + " forming"}
        />

        <div className="obs-signals-controls">
          <div className="obs-signals-tabs">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={"obs-signals-tab" + (tab === t.id ? " on" : "")} onClick={() => setTab(t.id)}>
                {t.label} <span className="obs-signals-tabn">{counts[t.id]}</span>
              </button>
            ))}
          </div>

          <div className="obs-signals-filters">
            <span className="obs-signals-fl">Status</span>
            <select className="obs-signals-sel" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">All</option>
              <option value="Active">Active</option>
              <option value="Verifying">Verifying</option>
              <option value="Forming">Forming</option>
            </select>

            <span className="obs-signals-fl">Confidence</span>
            <select className="obs-signals-sel" value={confidence} onChange={(e) => setConfidence(e.target.value)}>
              <option value="all">All</option>
              <option value="Strong">Strong</option>
              <option value="Emerging">Emerging</option>
              <option value="Forming">Forming</option>
            </select>

            <span className="obs-signals-fl">Cohort</span>
            <select className="obs-signals-sel" value={cohort} onChange={(e) => setCohort(e.target.value)}>
              <option value="all">All</option>
              {cohortOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <button type="button" className={"obs-signals-chip" + (contraOnly ? " on" : "")} onClick={() => setContraOnly(!contraOnly)}>
              <window.Icon name="bolt" size={12} /> Contradictions only
            </button>
          </div>
        </div>

        {visible.length ? (
          <div className="obs-signals-list">
            {visible.map((s) => (
              <SignalCard
                key={s.id}
                signal={s}
                nameFor={nameFor}
                colorFor={colorFor}
                drafted={!!drafted[s.id]}
                asked={!!asked[s.id]}
                onInvestigate={() => setSelectedId(s.id)}
                onAsk={() => onAsk(s)}
                onDraft={() => onDraft(s)}
              />
            ))}
          </div>
        ) : (
          <div className="obs-signals-empty">
            <b>Nothing here yet</b>
            <span>No Signals match this view. Observant is still watching — sub-threshold patterns show as “Forming” the moment two independent 1:1s agree.</span>
          </div>
        )}

        {selected && (
          <SignalDetail
            signal={selected}
            nameFor={nameFor}
            colorFor={colorFor}
            cohortFor={cohortFor}
            actItem={selected.actId ? actById[selected.actId] : null}
            drafted={!!drafted[selected.id]}
            asked={!!asked[selected.id]}
            onClose={() => setSelectedId("")}
            onAsk={() => onAsk(selected)}
            onDraft={() => onDraft(selected)}
            onOpenConversation={onOpenConversation}
          />
        )}
      </div>
    );
  }

  window.OBS_SURFACES.signals = SignalsSurface;
})();
