/* OBSERVANT surface — User-side conversation surface (the CAPTURE half the END USER sees).
   §3 / §8: the highest-risk capture flow, shown as a previewable phone frame.
     1) In-product Pulse prompt — light, text, one tap, dismissible, with the "what is this?" disclosure.
     2) Async 1:1 chat thread — text bubbles, stamped with the trigger moment.
     3) Deep-dive consent + reward — the user-accepted escalation offer (~10 min, compensated).
   HARD RULES baked in: in-product is NEVER voice (text only); Pulse = light/free/no-consent;
   Deep dive = consent + pay. Reads off props.state (pulseMoments / conversations / people), with a
   window.OBS_DATA fallback so it renders before the orchestrator folds entities into state.
   Registers window.OBS_SURFACES.userside.  CSS prefix: obs-user- */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const { useState } = React;

  const CSS = `
  .obs-user-wrap { display:flex; flex-direction:column; gap:1.4rem; }
  .obs-user-head h1 { font-family:var(--font-display); font-weight:400; font-size:clamp(1.5rem,2.6vw,2rem); line-height:1.12; letter-spacing:-0.015em; color:var(--text-primary); }
  .obs-user-head p { color:var(--text-secondary); margin-top:.4rem; font-size:.96rem; max-width:60ch; }
  .obs-user-eyebrow { font-family:var(--font-mono); font-size:.68rem; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); font-weight:500; }

  /* scene tabs */
  .obs-user-tabs { display:flex; gap:.5rem; flex-wrap:wrap; }
  .obs-user-tab { text-align:left; background:var(--surface); border:1px solid var(--border); border-radius:13px; padding:.7rem .85rem; cursor:pointer; transition:all .18s; min-width:172px; }
  .obs-user-tab:hover { border-color:var(--border-strong); }
  .obs-user-tab.on { border-color:var(--accent); background:var(--accent-tint); box-shadow:0 1px 2px oklch(0.4 0.05 40 / .12); }
  .obs-user-tab .tt { display:flex; align-items:center; gap:.4rem; font-weight:600; font-size:.9rem; color:var(--text-primary); }
  .obs-user-tab .ts { font-size:.72rem; color:var(--text-muted); margin-top:.18rem; }
  .obs-user-tier { display:inline-flex; align-items:center; gap:.32rem; font-family:var(--font-mono); font-size:.6rem; letter-spacing:.06em; text-transform:uppercase; padding:.12rem .4rem; border-radius:6px; margin-top:.4rem; }
  .obs-user-tier.light { background:var(--success-tint); color:var(--success); }
  .obs-user-tier.deep  { background:var(--accent-soft); color:var(--accent-hover); }

  /* stage: phone + caption */
  .obs-user-stage { display:flex; gap:1.6rem; align-items:flex-start; flex-wrap:wrap; }
  .obs-user-phone { width:330px; height:660px; flex-shrink:0; background:var(--canvas); border:9px solid oklch(0.30 0.012 56); border-radius:42px; box-shadow:0 30px 60px -28px oklch(0.3 0.04 40 / .55); position:relative; overflow:hidden; display:flex; flex-direction:column; }
  .obs-user-notch { position:absolute; top:0; left:50%; transform:translateX(-50%); width:120px; height:24px; background:oklch(0.30 0.012 56); border-radius:0 0 14px 14px; z-index:6; }
  .obs-user-status { height:34px; flex-shrink:0; display:flex; align-items:center; justify-content:space-between; padding:0 1.3rem; font-family:var(--font-mono); font-size:.64rem; color:var(--text-muted); z-index:5; }
  .obs-user-status .dots { display:flex; gap:3px; }
  .obs-user-status .dots i { width:5px; height:5px; border-radius:50%; background:var(--border-strong); }
  .obs-user-screen { flex:1; position:relative; overflow:hidden; display:flex; flex-direction:column; }

  /* faux product app behind the pulse */
  .obs-user-app { position:absolute; inset:0; padding:.9rem; overflow:hidden; transition:filter .3s, opacity .3s; }
  .obs-user-app.dim { filter:saturate(.6) brightness(.99); opacity:.55; }
  .obs-user-app-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:.9rem; }
  .obs-user-app-name { font-family:var(--font-display); font-weight:500; font-size:1rem; color:var(--text-primary); }
  .obs-user-app-tag { font-family:var(--font-mono); font-size:.6rem; color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:.1rem .35rem; }
  .obs-user-sk { border:1px solid var(--border); background:var(--surface); border-radius:11px; padding:.7rem; margin-bottom:.7rem; }
  .obs-user-sk h4 { font-size:.78rem; color:var(--text-secondary); font-weight:600; margin-bottom:.55rem; }
  .obs-user-bars { display:flex; align-items:flex-end; gap:6px; height:64px; }
  .obs-user-bars i { flex:1; background:var(--accent-soft); border-radius:4px 4px 0 0; }
  .obs-user-bars i:nth-child(odd){ background:var(--accent-tint); }
  .obs-user-row { display:flex; gap:6px; align-items:center; padding:.3rem 0; border-bottom:1px dashed var(--border); }
  .obs-user-row span { height:8px; border-radius:4px; background:var(--surface-2); }

  /* pulse card */
  .obs-user-pulse { position:absolute; left:.6rem; right:.6rem; bottom:.6rem; background:var(--panel,#fff); border:1px solid var(--border-strong); border-radius:18px; box-shadow:0 18px 40px -20px oklch(0.3 0.05 40 / .5); padding:.95rem 1rem 1rem; z-index:4; animation:obs-user-rise .42s cubic-bezier(.2,.7,.3,1); }
  @keyframes obs-user-rise { from { transform:translateY(36px); opacity:0; } to { transform:translateY(0); opacity:1; } }
  .obs-user-pulse-top { display:flex; align-items:center; gap:.4rem; margin-bottom:.55rem; }
  .obs-user-mark { display:inline-flex; align-items:baseline; font-family:var(--font-display); font-weight:500; font-size:.78rem; color:var(--text-secondary); }
  .obs-user-mark i { width:4px; height:4px; border-radius:50%; background:var(--accent); margin-left:2px; align-self:center; }
  .obs-user-pulse-x { margin-left:auto; background:none; border:none; color:var(--text-muted); cursor:pointer; padding:2px; line-height:0; border-radius:6px; }
  .obs-user-pulse-x:hover { color:var(--text-primary); background:var(--surface-2); }
  .obs-user-q { font-family:var(--font-display); font-size:1.02rem; line-height:1.34; color:var(--text-primary); }
  .obs-user-input { margin-top:.7rem; display:flex; gap:.4rem; align-items:flex-end; }
  .obs-user-input textarea { flex:1; resize:none; border:1px solid var(--border-strong); border-radius:12px; padding:.55rem .65rem; font-family:var(--font-sans); font-size:.86rem; line-height:1.4; color:var(--text-primary); background:var(--canvas); min-height:42px; max-height:90px; }
  .obs-user-input textarea:focus { outline:none; border-color:var(--accent); }
  .obs-user-send { flex-shrink:0; width:38px; height:38px; border-radius:11px; border:none; background:var(--accent); color:#fff; cursor:pointer; display:grid; place-items:center; }
  .obs-user-send:disabled { background:var(--border-strong); cursor:default; }
  .obs-user-pulse-foot { display:flex; align-items:center; gap:.5rem; margin-top:.6rem; }
  .obs-user-whatlink { background:none; border:none; padding:0; color:var(--text-muted); font-size:.72rem; cursor:pointer; text-decoration:underline; text-underline-offset:2px; font-family:var(--font-sans); }
  .obs-user-whatlink:hover { color:var(--accent); }
  .obs-user-ignore { margin-left:auto; font-size:.7rem; color:var(--text-muted); font-family:var(--font-mono); }
  .obs-user-disc { margin-top:.55rem; background:var(--surface-2); border:1px solid var(--border); border-radius:11px; padding:.6rem .7rem; font-size:.78rem; line-height:1.45; color:var(--text-secondary); }

  /* pulse moment toggle (under phone is operator-only; this is in-frame test) */
  .obs-user-momentpick { display:flex; gap:.4rem; margin-bottom:.55rem; }
  .obs-user-chip { border:1px solid var(--border); background:var(--surface); border-radius:999px; padding:.2rem .6rem; font-size:.7rem; color:var(--text-secondary); cursor:pointer; font-family:var(--font-mono); }
  .obs-user-chip.on { border-color:var(--accent); background:var(--accent-tint); color:var(--accent-hover); }

  /* thank-you + escalation */
  .obs-user-thanks { display:flex; gap:.55rem; align-items:flex-start; }
  .obs-user-thanks .ok { width:26px; height:26px; border-radius:50%; background:var(--success-tint); color:var(--success); display:grid; place-items:center; flex-shrink:0; }
  .obs-user-thanks p { font-size:.88rem; color:var(--text-secondary); line-height:1.45; }
  .obs-user-esc { margin-top:.8rem; border-top:1px dashed var(--border); padding-top:.75rem; }
  .obs-user-esc .lead { font-family:var(--font-display); font-size:.96rem; color:var(--text-primary); line-height:1.34; }
  .obs-user-esc-btns { display:flex; gap:.5rem; margin-top:.65rem; }

  /* async chat */
  .obs-user-chat { flex:1; display:flex; flex-direction:column; background:var(--canvas); }
  .obs-user-chat-head { display:flex; align-items:center; gap:.55rem; padding:.7rem .8rem; border-bottom:1px solid var(--border); background:var(--surface); }
  .obs-user-chat-head .nm { font-weight:600; font-size:.86rem; color:var(--text-primary); }
  .obs-user-chat-head .ch { font-family:var(--font-mono); font-size:.62rem; color:var(--text-muted); }
  .obs-user-chanbadge { margin-left:auto; font-family:var(--font-mono); font-size:.58rem; text-transform:uppercase; letter-spacing:.05em; padding:.12rem .4rem; border-radius:6px; border:1px solid var(--border); color:var(--text-muted); }
  .obs-user-trigger { padding:.5rem .8rem; background:var(--accent-tint); border-bottom:1px solid var(--accent-soft); font-size:.72rem; color:var(--text-secondary); display:flex; gap:.4rem; align-items:center; }
  .obs-user-trigger b { color:var(--accent-hover); font-weight:600; }
  .obs-user-msgs { flex:1; overflow:auto; padding:.8rem; display:flex; flex-direction:column; gap:.5rem; }
  .obs-user-msg { max-width:84%; }
  .obs-user-msg > div { padding:.55rem .72rem; border-radius:14px; font-size:.84rem; line-height:1.45; }
  .obs-user-msg.them { align-self:flex-start; }
  .obs-user-msg.them > div { background:var(--surface-2); border:1px solid var(--border); border-bottom-left-radius:4px; color:var(--text-primary); }
  .obs-user-msg.user { align-self:flex-end; }
  .obs-user-msg.user > div { background:var(--accent); color:oklch(0.99 0.005 70); border-bottom-right-radius:4px; }
  .obs-user-msg label { display:block; font-family:var(--font-mono); font-size:.56rem; color:var(--text-muted); margin:.22rem .3rem 0; }
  .obs-user-msg.user label { text-align:right; }
  .obs-user-personrow { display:flex; gap:.35rem; padding:.5rem .8rem; border-top:1px solid var(--border); background:var(--surface); overflow:auto; }
  .obs-user-pbtn { border:1px solid var(--border); background:var(--canvas); border-radius:999px; padding:.18rem .5rem .18rem .25rem; display:flex; align-items:center; gap:.3rem; cursor:pointer; flex-shrink:0; font-size:.72rem; color:var(--text-secondary); }
  .obs-user-pbtn.on { border-color:var(--accent); background:var(--accent-tint); color:var(--accent-hover); }
  .obs-user-chatin { display:flex; gap:.4rem; padding:.6rem .7rem; border-top:1px solid var(--border); background:var(--panel,#fff); }
  .obs-user-chatin input { flex:1; border:1px solid var(--border-strong); border-radius:11px; padding:.5rem .6rem; font-size:.84rem; font-family:var(--font-sans); background:var(--canvas); color:var(--text-primary); }
  .obs-user-chatin input:focus { outline:none; border-color:var(--accent); }

  /* deep-dive consent */
  .obs-user-deep { flex:1; overflow:auto; padding:1.3rem 1.1rem; display:flex; flex-direction:column; }
  .obs-user-deep .badge { align-self:flex-start; font-family:var(--font-mono); font-size:.6rem; letter-spacing:.08em; text-transform:uppercase; color:var(--accent); background:var(--accent-tint); border:1px solid var(--accent-soft); border-radius:7px; padding:.15rem .45rem; }
  .obs-user-deep h2 { font-family:var(--font-display); font-weight:400; font-size:1.5rem; line-height:1.2; color:var(--text-primary); margin-top:.7rem; }
  .obs-user-deep .ctx { color:var(--text-secondary); font-size:.9rem; line-height:1.5; margin-top:.55rem; }
  .obs-user-deep .ctx em { color:var(--text-primary); font-style:normal; font-weight:600; }
  .obs-user-terms { list-style:none; margin:1rem 0 0; padding:0; display:flex; flex-direction:column; gap:.6rem; }
  .obs-user-terms li { display:flex; gap:.55rem; align-items:flex-start; font-size:.84rem; color:var(--text-secondary); line-height:1.4; }
  .obs-user-terms .ic { color:var(--accent); margin-top:1px; flex-shrink:0; }
  .obs-user-reward { margin-top:1rem; display:flex; align-items:center; gap:.5rem; background:var(--success-tint); border:1px solid var(--success); border-radius:12px; padding:.6rem .75rem; }
  .obs-user-reward .amt { font-family:var(--font-display); font-size:1.15rem; color:var(--success); }
  .obs-user-reward .lbl { font-size:.78rem; color:var(--text-secondary); }
  .obs-user-consent { margin-top:1rem; display:flex; gap:.5rem; align-items:flex-start; font-size:.82rem; color:var(--text-secondary); line-height:1.4; cursor:pointer; }
  .obs-user-consent input { margin-top:2px; accent-color:var(--accent); width:16px; height:16px; flex-shrink:0; }
  .obs-user-deep-btns { margin-top:auto; padding-top:1rem; display:flex; flex-direction:column; gap:.5rem; }
  .obs-user-confirm { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:2rem 1.4rem; gap:.7rem; }
  .obs-user-confirm .big { width:50px; height:50px; border-radius:50%; background:var(--success-tint); color:var(--success); display:grid; place-items:center; }
  .obs-user-confirm h3 { font-family:var(--font-display); font-weight:400; font-size:1.3rem; color:var(--text-primary); }
  .obs-user-confirm p { color:var(--text-secondary); font-size:.9rem; line-height:1.5; max-width:30ch; }

  /* operator caption */
  .obs-user-cap { flex:1; min-width:260px; max-width:380px; display:flex; flex-direction:column; gap:.9rem; }
  .obs-user-cap-card { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:1rem 1.1rem; }
  .obs-user-cap-card h3 { font-family:var(--font-display); font-weight:500; font-size:1.05rem; color:var(--text-primary); display:flex; align-items:center; gap:.5rem; }
  .obs-user-cap-card .tier-tag { font-family:var(--font-mono); font-size:.6rem; letter-spacing:.06em; text-transform:uppercase; padding:.12rem .4rem; border-radius:6px; }
  .obs-user-cap-card p { color:var(--text-secondary); font-size:.86rem; line-height:1.5; margin-top:.55rem; }
  .obs-user-rules { list-style:none; margin:.7rem 0 0; padding:0; display:flex; flex-direction:column; gap:.4rem; }
  .obs-user-rules li { display:flex; gap:.45rem; align-items:flex-start; font-size:.8rem; color:var(--text-secondary); line-height:1.4; }
  .obs-user-rules .y { color:var(--success); flex-shrink:0; margin-top:1px; }
  .obs-user-rules .n { color:var(--text-muted); flex-shrink:0; margin-top:1px; }
  .obs-user-meta { display:flex; flex-direction:column; gap:.3rem; margin-top:.7rem; padding-top:.7rem; border-top:1px solid var(--border); }
  .obs-user-meta div { display:flex; justify-content:space-between; gap:1rem; font-size:.76rem; }
  .obs-user-meta .k { color:var(--text-muted); font-family:var(--font-mono); }
  .obs-user-meta .v { color:var(--text-secondary); text-align:right; }
  `;

  function StatusBar() {
    return (
      <div className="obs-user-status">
        <span>9:41</span>
        <span className="dots"><i /><i /><i style={{ background: "var(--text-muted)" }} /></span>
      </div>
    );
  }

  function Phone(props) {
    return (
      <div className="obs-user-phone">
        <div className="obs-user-notch" />
        <StatusBar />
        <div className="obs-user-screen">{props.children}</div>
      </div>
    );
  }

  // ── Scene 1: in-product Pulse ────────────────────────────────
  function PulseScene(props) {
    const { product, moment, momentKey, setMomentKey, hasKeyCta, onEscalate } = props;
    const [text, setText] = useState("");
    const [sent, setSent] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [showWhat, setShowWhat] = useState(false);
    const [escDecline, setEscDecline] = useState(false);
    const canEscalate = momentKey === "keyCta"; // strong existence-proof on a hot decision

    function reset() { setText(""); setSent(false); setDismissed(false); setShowWhat(false); setEscDecline(false); }
    function switchMoment(k) { setMomentKey(k); reset(); }

    const App = (
      <div className={"obs-user-app" + ((!sent && !dismissed) ? " dim" : "")}>
        <div className="obs-user-app-top">
          <span className="obs-user-app-name">{product}</span>
          <span className="obs-user-app-tag">Reporting</span>
        </div>
        <div className="obs-user-sk">
          <h4>Weekly summary</h4>
          <div className="obs-user-bars">
            <i style={{ height: "40%" }} /><i style={{ height: "70%" }} /><i style={{ height: "55%" }} />
            <i style={{ height: "90%" }} /><i style={{ height: "62%" }} /><i style={{ height: "80%" }} /><i style={{ height: "48%" }} />
          </div>
        </div>
        <div className="obs-user-sk">
          <h4>Recent exports</h4>
          {[68, 52, 60, 44].map((w, i) => (
            <div className="obs-user-row" key={i}>
              <span style={{ width: w + "%" }} /><span style={{ width: (90 - w) + "%", opacity: .5 }} />
            </div>
          ))}
        </div>
      </div>
    );

    let card;
    if (dismissed) {
      card = null;
    } else if (!sent) {
      card = (
        <div className="obs-user-pulse">
          {hasKeyCta && (
            <div className="obs-user-momentpick">
              <button className={"obs-user-chip" + (momentKey === "aiEval" ? " on" : "")} onClick={() => switchMoment("aiEval")}>AI output</button>
              <button className={"obs-user-chip" + (momentKey === "keyCta" ? " on" : "")} onClick={() => switchMoment("keyCta")}>Stopped upgrade</button>
            </div>
          )}
          <div className="obs-user-pulse-top">
            <span className="obs-user-mark">{product} is learning<i /></span>
            <button className="obs-user-pulse-x" title="Dismiss — no penalty" onClick={() => setDismissed(true)}><window.Icon name="x" size={15} /></button>
          </div>
          <div className="obs-user-q">{moment.question}</div>
          <div className="obs-user-input">
            <textarea
              placeholder="A sentence is plenty…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && text.trim()) { e.preventDefault(); setSent(true); } }}
            />
            <button className="obs-user-send" disabled={!text.trim()} onClick={() => setSent(true)} title="Send"><window.Icon name="arrow" size={16} /></button>
          </div>
          <div className="obs-user-pulse-foot">
            <button className="obs-user-whatlink" onClick={() => setShowWhat((v) => !v)}>{showWhat ? "hide" : "what is this?"}</button>
            <span className="obs-user-ignore">text only · ignorable</span>
          </div>
          {showWhat && (
            <div className="obs-user-disc">
              This product is learning from how you use it so it can improve — your answer helps, and you can ignore it. One question, your words stay with {product}, nothing is recorded.
            </div>
          )}
        </div>
      );
    } else {
      card = (
        <div className="obs-user-pulse">
          <div className="obs-user-pulse-top">
            <span className="obs-user-mark">{product} is learning<i /></span>
            <button className="obs-user-pulse-x" onClick={() => setDismissed(true)}><window.Icon name="x" size={15} /></button>
          </div>
          <div className="obs-user-thanks">
            <span className="ok"><window.Icon name="check" size={15} sw={2.4} /></span>
            <p>Thanks — that goes straight into how {product} improves. That's the whole ask.</p>
          </div>
          {canEscalate && !escDecline && (
            <div className="obs-user-esc">
              <div className="lead">That's really useful — can I ask a couple more questions? About 10 minutes, and we'll send you a reward.</div>
              <div className="obs-user-esc-btns">
                <window.Btn variant="primary" size="sm" onClick={onEscalate}>Sure, tell me more</window.Btn>
                <window.Btn variant="ghost" size="sm" onClick={() => setEscDecline(true)}>Not now</window.Btn>
              </div>
            </div>
          )}
          {canEscalate && escDecline && (
            <p style={{ fontSize: ".8rem", color: "var(--text-muted)", marginTop: ".7rem" }}>No problem — that one answer already counts. Nothing else needed.</p>
          )}
        </div>
      );
    }

    return <Phone>{App}{card}</Phone>;
  }

  // ── Scene 2: async 1:1 chat thread (text only) ───────────────
  function AsyncScene(props) {
    const { convos, byId, triggerFor, product } = props;
    const [convId, setConvId] = useState(convos.length ? convos[0].id : "");
    const [extra, setExtra] = useState({}); // convId -> appended messages
    const [draft, setDraft] = useState("");

    const convo = convos.find((c) => c.id === convId) || convos[0] || { messages: [] };
    const person = byId[convo.userId] || { name: convo.userId || "User", color: "rust" };
    const channelRaw = (person.surface || convo.mode || "In-product");
    const offProduct = /off-product|email|telegram/i.test(channelRaw) || convo.mode === "voice";
    const trig = convo.trigger || triggerFor[convo.id] || null;
    const msgs = (convo.messages || []).concat(extra[convId] || []);

    function send() {
      const t = draft.trim();
      if (!t) return;
      const add = [
        { t: "user", text: t, meta: person.name },
        { t: "them", text: "Got it — thank you. I'll fold that in. One more whenever you have a sec, no rush.", meta: "Observant" },
      ];
      setExtra((prev) => ({ ...prev, [convId]: (prev[convId] || []).concat(add) }));
      setDraft("");
    }

    return (
      <Phone>
        <div className="obs-user-chat">
          <div className="obs-user-chat-head">
            <window.Avatar name={person.name} color={person.color} cls="conv-ava" style={{ width: 30, height: 30, fontSize: ".68rem" }} />
            <div>
              <div className="nm">{person.name}</div>
              <div className="ch">with {product} · Observant</div>
            </div>
            <span className="obs-user-chanbadge">{convo.mode === "voice" ? "off-product" : (offProduct ? channelRaw : "text only")}</span>
          </div>
          {trig && (
            <div className="obs-user-trigger">
              <window.Icon name="bolt" size={13} />
              <span>Because you <b>{(trig.moment || "did something") + (trig.detail ? " — " + trig.detail : "")}</b></span>
            </div>
          )}
          <div className="obs-user-msgs">
            {msgs.map((m, i) => (
              <div key={i} className={"obs-user-msg " + (m.t === "user" ? "user" : "them")}>
                <div>{m.text}</div>
                <label>{m.meta || (m.t === "user" ? person.name : "Observant")}</label>
              </div>
            ))}
          </div>
          <div className="obs-user-chatin">
            <input
              placeholder="Reply in your own words…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <button className="obs-user-send" disabled={!draft.trim()} onClick={send} title="Send"><window.Icon name="arrow" size={16} /></button>
          </div>
          <div className="obs-user-personrow">
            {convos.map((c) => {
              const p = byId[c.userId] || { name: c.userId, color: "rust" };
              return (
                <button key={c.id} className={"obs-user-pbtn" + (c.id === convId ? " on" : "")} onClick={() => { setConvId(c.id); setDraft(""); }}>
                  <window.Avatar name={p.name} color={p.color} cls="conv-ava" style={{ width: 18, height: 18, fontSize: ".5rem" }} />
                  {(p.name || "").split(" ")[0]}
                </button>
              );
            })}
          </div>
        </div>
      </Phone>
    );
  }

  // ── Scene 3: deep-dive consent + reward ──────────────────────
  function DeepDiveScene(props) {
    const { product, person, reward, channel } = props;
    const [consent, setConsent] = useState(false);
    const [outcome, setOutcome] = useState(""); // "" | "in" | "declined"

    if (outcome === "in") {
      return (
        <Phone>
          <div className="obs-user-confirm">
            <span className="big"><window.Icon name="check" size={24} sw={2.2} /></span>
            <h3>You're in.</h3>
            <p>We'll reach out by {channel} to set up the {`~10-minute`} chat. Your reward — {reward} — lands after. Thanks for helping shape {product}.</p>
          </div>
        </Phone>
      );
    }
    if (outcome === "declined") {
      return (
        <Phone>
          <div className="obs-user-confirm">
            <span className="big" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}><window.Icon name="x" size={22} sw={2} /></span>
            <h3>No problem.</h3>
            <p>The offer's gone — nothing happens, and your light answer still counts. We won't ask again on this one.</p>
          </div>
        </Phone>
      );
    }

    return (
      <Phone>
        <div className="obs-user-deep">
          <span className="badge">An invitation · {product}</span>
          <h2>Can we go a little deeper?</h2>
          <p className="ctx">Your answer about <em>{`stopping before the upgrade`}</em> was genuinely useful. We'd love to understand the why behind it — a short conversation, on your terms.</p>
          <ul className="obs-user-terms">
            <li><span className="ic"><window.Icon name="clock" size={16} /></span><span>About <b>10 minutes</b>, whenever suits you — you can stop any time.</span></li>
            <li><span className="ic"><window.Icon name="mail" size={16} /></span><span>We'll move to <b>{channel}</b> so it's not crammed into a single box.</span></li>
            <li><span className="ic"><window.Icon name="chat" size={16} /></span><span>A real back-and-forth — more than one question this time.</span></li>
            <li><span className="ic"><window.Icon name="check" size={16} /></span><span>Recorded only with your okay, kept private, used to improve {product}.</span></li>
          </ul>
          <div className="obs-user-reward">
            <span className="amt">{reward.split("—")[0].trim() || reward}</span>
            <span className="lbl">our thank-you for ~10 minutes of your time</span>
          </div>
          <label className="obs-user-consent">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>I'm okay being contacted for a longer, compensated conversation about my experience, and I understand it may be recorded with my consent.</span>
          </label>
          <div className="obs-user-deep-btns">
            <window.Btn variant="primary" disabled={!consent} onClick={() => setOutcome("in")}>Yes, count me in</window.Btn>
            <window.Btn variant="quiet" onClick={() => setOutcome("declined")}>Not now</window.Btn>
          </div>
        </div>
      </Phone>
    );
  }

  // ── Surface root ─────────────────────────────────────────────
  function UserSideSurface(props) {
    const state = props.state || {};
    const workspace = state.workspace || {};
    const product = (workspace.companyName || "").trim() || "Northwind";

    // Pulse moments — prefer state, fall back to OBS_DATA.
    let pm = state.pulseMoments;
    if (!pm || !pm.config || (!pm.config.aiEval && !pm.config.keyCta)) {
      pm = (window.OBS_DATA && window.OBS_DATA.pulseMoments) ? window.OBS_DATA.pulseMoments(workspace) : { config: {}, recent: [] };
    }
    const cfg = pm.config || {};
    const hasKeyCta = !!cfg.keyCta;

    // Conversations — prefer state, fall back to OBS_DATA extras.
    let convos = (state.conversations && state.conversations.length) ? state.conversations : null;
    if (!convos) convos = (window.OBS_DATA && window.OBS_DATA.extraConversations) ? window.OBS_DATA.extraConversations(workspace) : [];
    // Keep only text-renderable threads first, but include voice (rendered as off-product transcript).
    convos = convos.slice(0, 6);

    // People lookup (state.people + OBS_DATA.extraPeople), by id.
    const byId = {};
    const stPeople = (state.people && state.people.length) ? state.people : [];
    const exPeople = (window.OBS_DATA && window.OBS_DATA.extraPeople) ? window.OBS_DATA.extraPeople(workspace) : [];
    stPeople.concat(exPeople).forEach((p) => { if (p && !byId[p.id]) byId[p.id] = p; });

    // Trigger stamps fallback.
    const triggerFor = (window.OBS_DATA && window.OBS_DATA.conversationTriggers) ? window.OBS_DATA.conversationTriggers(workspace) : {};

    const [scene, setScene] = useState("pulse");
    const [momentKey, setMomentKey] = useState(hasKeyCta ? "keyCta" : "aiEval");
    const moment = cfg[momentKey] || cfg.aiEval || cfg.keyCta || { question: "Did that do what you needed just now?", cooldown: "—" };

    // Deep-dive target person (the upgrade evaluator who escalated).
    const escPerson = byId.leah || { name: "Leah R.", color: "gold", profile: { reward: "Bronze — $30 gift card" }, file: { channel: "Telegram", reward: "Bronze — $30 gift card" } };
    const reward = (escPerson.profile && escPerson.profile.reward) || (escPerson.file && escPerson.file.reward) || "$30 gift card";
    const escChannel = (escPerson.file && escPerson.file.channel) || escPerson.surface || "Telegram";

    const SCENES = [
      { key: "pulse", icon: "spark", title: "In-product Pulse", sub: "Light prompt, one tap", tier: "light", tierLabel: "Pulse · light" },
      { key: "async", icon: "chat", title: "Async 1:1", sub: "Text thread, on record", tier: "light", tierLabel: "1:1 · text" },
      { key: "deep", icon: "users", title: "Deep-dive consent", sub: "Escalation + reward", tier: "deep", tierLabel: "Deep dive · paid" },
    ];

    // Operator caption per scene.
    let cap;
    if (scene === "pulse") {
      cap = {
        tag: "light", tagLabel: "Pulse · light",
        title: "The light tier",
        body: "A single behavior-anchored question, in-product, in the user's own words. No consent screen, no reward — it runs under the privacy policy they already accepted, and it's trivially ignorable.",
        yes: ["One question, at most one clarifier — then hard stop", "Text only, never voice", "Dismissible with zero penalty", "A one-tap “what is this?” disclosure"],
        no: ["No consent screen", "No compensation", "No new PII asked"],
        meta: [["Moment", moment.label || momentKey], ["Cooldown", moment.cooldown || "—"], ["Last fired", moment.lastFired || "—"]],
      };
    } else if (scene === "async") {
      cap = {
        tag: "light", tagLabel: "1:1 · text",
        title: "The async 1:1",
        body: "A continuing text conversation, stamped with the moment that opened it. In-product threads stay text-only and light. Off-product threads (churned, never-converted, voice) are the recruited program — consent + reward by construction.",
        yes: ["Every thread stamped with its trigger moment", "In-product = text only", "User replies on their own time"],
        no: ["In-product is never voice", "Off-product never runs without consent + pay"],
        meta: [["Threads", String(convos.length)], ["In-product", "text only"], ["Off-product", "consent + reward"]],
      };
    } else {
      cap = {
        tag: "deep", tagLabel: "Deep dive · paid",
        title: "The consent gate",
        body: "A light answer that lands as a strong existence-proof on a hot decision earns an offer — never a forced jump. Accepting the offer IS the consent: it flips the user onto the recruited program (off-product, ~10 min, compensated). Until accepted, everything stays at one round.",
        yes: ["User-accepted offer, never automatic", "Informed consent before anything deeper", "Compensation attached (off-product + recorded)"],
        no: ["Never auto-escalates", "Never deepens without the user saying yes"],
        meta: [["For", escPerson.name || "—"], ["Channel", escChannel], ["Reward", reward]],
      };
    }

    return (
      <div className="obs-user-wrap">
        <style>{CSS}</style>

        <div className="obs-user-head">
          <span className="obs-user-eyebrow">Capture · what your users see</span>
          <h1>The user side</h1>
          <p>Every prompt, thread, and consent moment exactly as it reaches the people using {product}. In-product stays light, text, and ignorable; going deeper is always an offer they accept.</p>
        </div>

        <div className="obs-user-tabs">
          {SCENES.map((s) => (
            <button key={s.key} className={"obs-user-tab" + (scene === s.key ? " on" : "")} onClick={() => setScene(s.key)}>
              <span className="tt"><window.Icon name={s.icon} size={15} />{s.title}</span>
              <span className="ts">{s.sub}</span>
              <span className={"obs-user-tier " + s.tier}>{s.tier === "light" ? <window.Icon name="check" size={10} sw={2.5} /> : <window.Icon name="users" size={10} />}{s.tierLabel}</span>
            </button>
          ))}
        </div>

        <div className="obs-user-stage">
          {scene === "pulse" && (
            <PulseScene
              product={product}
              moment={moment}
              momentKey={momentKey}
              setMomentKey={setMomentKey}
              hasKeyCta={hasKeyCta}
              onEscalate={() => setScene("deep")}
            />
          )}
          {scene === "async" && (
            <AsyncScene convos={convos} byId={byId} triggerFor={triggerFor} product={product} />
          )}
          {scene === "deep" && (
            <DeepDiveScene product={product} person={escPerson} reward={reward} channel={escChannel} />
          )}

          <div className="obs-user-cap">
            <div className="obs-user-cap-card">
              <h3>
                {cap.title}
                <span className={"tier-tag obs-user-tier " + cap.tag} style={{ marginTop: 0 }}>{cap.tagLabel}</span>
              </h3>
              <p>{cap.body}</p>
              <ul className="obs-user-rules">
                {cap.yes.map((t, i) => (<li key={"y" + i}><span className="y"><window.Icon name="check" size={13} sw={2.4} /></span>{t}</li>))}
                {cap.no.map((t, i) => (<li key={"n" + i}><span className="n"><window.Icon name="x" size={13} sw={2.2} /></span>{t}</li>))}
              </ul>
              <div className="obs-user-meta">
                {cap.meta.map((row, i) => (
                  <div key={i}><span className="k">{row[0]}</span><span className="v">{row[1]}</span></div>
                ))}
              </div>
            </div>

            {scene === "pulse" && (pm.recent && pm.recent.length > 0) && (
              <div className="obs-user-cap-card">
                <h3>Recent light answers</h3>
                <p style={{ marginTop: ".4rem" }}>What came back from this moment — kept only when it's an existence-proof.</p>
                <ul className="obs-user-rules" style={{ marginTop: ".6rem" }}>
                  {pm.recent.filter((r) => r.moment === momentKey || r.moment === (momentKey === "aiEval" ? "ai_eval" : "key_cta")).slice(0, 3).map((r) => {
                    const p = byId[r.personId] || { name: r.personId };
                    return (
                      <li key={r.id} style={{ display: "block" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: ".66rem", color: "var(--text-muted)" }}>{(p.name || r.personId)} · {r.when}{r.escalated ? " · escalated" : ""}</span>
                        <div style={{ marginTop: ".15rem", color: "var(--text-secondary)" }}>{`“${r.response}”`}</div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  window.OBS_SURFACES.userside = UserSideSurface;
})();
