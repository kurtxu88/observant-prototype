/* ============================================================
   EDDA app — 1:1 IM surface (slide-over conversation)
   ============================================================ */
const { useState: useStateI, useEffect: useEffectI, useRef: useRefI } = React;

const CANNED_REPLIES = [
  "Yeah, honestly that would make my week a lot easier.",
  "Good question — I'd use that constantly if it existed.",
  "Depends on the pricing, but in principle, yes.",
  "That's actually the main thing holding me back right now.",
];

function IMSurface({ user, onClose }) {
  const [messages, setMessages] = useStateI(user.thread.map((m) => ({ ...m })));
  const [typing, setTyping] = useStateI(false);
  const [busy, setBusy] = useStateI(false);
  const [draft, setDraft] = useStateI("");
  const bodyRef = useRefI(null);
  const runId = useRefI(0);

  useEffectI(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, typing]);

  // esc to close
  useEffectI(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function play(seq) {
    const myRun = ++runId.current;
    setBusy(true);
    for (const s of seq) {
      if (runId.current !== myRun) return;
      if (s.pre) await sleep(s.pre);
      if (s.typing) { setTyping(true); await sleep(s.typing); setTyping(false); }
      if (s.msg) { setMessages((m) => [...m, s.msg]); await sleep(s.post || 500); }
    }
    if (runId.current === myRun) setBusy(false);
  }

  const fname = user.name.split(" ")[0];

  const relay = () => {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft("");
    play([
      { msg: { t: "relay", tag: "Relayed from your product team", text: q }, post: 700 },
      { typing: 950 },
      { msg: { t: "them", text: `One more from the ${"Northwind"} team — ${q.charAt(0).toLowerCase() + q.slice(1)}`, meta: "Edda · relaying" }, post: 1500 },
      { typing: 1200 },
      { msg: { t: "user", text: CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)], meta: fname }, post: 300 },
    ]);
  };

  const requestLive = () => {
    if (busy) return;
    play([
      { msg: { t: "relay", tag: "Your team requested", text: `A live 15-min 1:1 with ${fname}.` }, post: 700 },
      { typing: 950 },
      { msg: { t: "them", text: `Happy to arrange that. ${fname} — the Northwind team would love 15 minutes to dig in. Does Thursday at 2pm work?`, meta: "Edda" }, post: 1600 },
      { typing: 1100 },
      { msg: { t: "user", text: "Thursday works. Send the invite.", meta: fname }, post: 400 },
      { msg: { t: "relay", tag: "Scheduled", text: `Live 1:1 booked · Thu 2:00pm · calendar invite sent to ${fname}.` }, post: 300 },
    ]);
  };

  return (
    <React.Fragment>
      <div className="im-overlay" onClick={onClose} />
      <aside className="im" role="dialog" aria-label={`Conversation with ${user.name}`}>
        <header className="im-head">
          <Avatar name={user.name} color={user.color} cls="conv-ava" />
          <div>
            <div className="who">{user.name}</div>
            <div className="where">{user.cohort} · {user.surface}</div>
          </div>
          <button className="x" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        </header>

        <div className="im-body" ref={bodyRef}>
          <div className="im-day">Private 1:1 · only {fname} sees this</div>
          {messages.map((m, i) => <Message key={i} m={m} />)}
          {typing && <div className="typing-b"><span /><span /><span /></div>}
        </div>

        <footer className="im-foot">
          <span className="foot-label">Relay a question through Edda</span>
          <div className="relay-input">
            <textarea
              className="textarea" placeholder={`Ask ${fname} something — Edda threads it into the conversation…`}
              value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) relay(); }}
            />
          </div>
          <div className="foot-acts">
            <Btn variant="primary" size="sm" onClick={relay} disabled={busy || !draft.trim()}>
              <Icon name="relay" size={15} /> Relay question
            </Btn>
            <Btn variant="ghost" size="sm" onClick={requestLive} disabled={busy}>
              <Icon name="video" size={15} /> Request live 1:1
            </Btn>
          </div>
        </footer>
      </aside>
    </React.Fragment>
  );
}

function Message({ m }) {
  if (m.t === "relay") {
    return (
      <div className="relay-note">
        <div className="rn">
          <Icon name={m.tag === "Scheduled" ? "calendar" : m.tag === "Your team requested" ? "video" : "relay"} size={14} />
          <div>
            <div className="tag">{m.tag}</div>
            <div className="txt">{m.text}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`bub ${m.t}`}>
      <div className="bub-in">{m.text}</div>
      {m.meta && <div className="bmeta">{m.meta}</div>}
    </div>
  );
}

Object.assign(window, { IMSurface });
