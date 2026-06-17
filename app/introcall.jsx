/* The 10-minute intro a new feedback partner runs after opting in — now with
   VOICE (Web Speech: speech-to-text + text-to-speech, continuous mode), ported
   from the xualaya voice chat. Runs the CLIENT's intro questions on the engine;
   its output seeds C4 (individual memory) so later questions are tailored. */
const { useState: useIC, useRef: useICRef, useEffect: useICFx } = React;

const IC_VOICE_OK = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition) && !!window.speechSynthesis;

function icSpeak(text, onEnd) {
  try {
    if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
    const clean = String(text || "").replace(/\*\*/g, "").replace(/\n{2,}/g, ". ").replace(/\n/g, " ").trim();
    if (!clean) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.05; u.pitch = 1.0;
    if (onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
  } catch (e) { if (onEnd) onEnd(); }
}
function icRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR(); r.continuous = false; r.interimResults = false; r.lang = "en-US";
  return r;
}

function icIntroQuestions(product) {
  try {
    const s = JSON.parse(localStorage.getItem("observant.selfserve.v1") || "{}");
    const list = String((s.workspace && s.workspace.introQuestions) || "").split("\n").map((q) => q.trim()).filter(Boolean);
    if (list.length) return list;
  } catch (e) { /* fall through */ }
  return ["What got you using " + product + ", and how does it fit into your day right now?"];
}
function icPlan(product) {
  return {
    essence: "Get to know this new feedback partner via the team's intro questions — who they are, how they use " + product + ", the context around it, and what they care about — so future questions can be tailored to them.",
    questions: icIntroQuestions(product),
    subject: "",
  };
}

async function icPost(body) {
  const r = await fetch("/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

// A deep-mode invitation link carries the deep plan (essence + threads) in ?d=
function icDecodeState(s) {
  try {
    const b = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = b + "===".slice((b.length + 3) % 4);
    return JSON.parse(decodeURIComponent(escape(atob(pad))));
  } catch (e) { return null; }
}

function IntroCall() {
  const params = new URLSearchParams(window.location.search);
  const product = (params.get("product") || "the product").trim();
  const deep = (() => { const o = icDecodeState(params.get("d")); return (o && o.mode === "deep") ? o : null; })();
  const plan = deep
    ? { essence: deep.essence || ("A deeper conversation for the " + product + " team."), questions: (deep.threads && deep.threads.length ? deep.threads : icIntroQuestions(product)), subject: "" }
    : icPlan(product);

  const sessionTag = deep ? "conversation" : "intro";
  const [messages, setMessages] = useIC([]);
  const [draft, setDraft] = useIC("");
  const [busy, setBusy] = useIC(false);
  const [done, setDone] = useIC(false);
  const [memory, setMemory] = useIC("");
  const [err, setErr] = useIC("");
  const [mode, setMode] = useIC("loading"); // loading | voice (ElevenLabs) | chat (text/Web-Speech fallback)
  const [agentId, setAgentId] = useIC("");
  const [voiceMode, setVoiceMode] = useIC(false);
  const [listening, setListening] = useIC(false);
  const voiceRef = useICRef(false);
  const recogRef = useICRef(null);
  const endRef = useICRef(null);

  useICFx(() => { voiceRef.current = voiceMode; }, [voiceMode]);
  useICFx(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  // Prefer a real ElevenLabs voice agent; fall back to the text/Web-Speech chat.
  useICFx(() => { (async () => {
    try {
      const v = await fetch("/api/selfserve/intro-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, introQuestions: plan.questions, essence: deep ? plan.essence : "", deep: !!deep }) }).then((r) => r.json());
      if (v && v.ok && v.agentId) { setAgentId(v.agentId); setMode("voice"); return; }
    } catch (e) { /* fall through to chat */ }
    setMode("chat");
  })(); }, []);

  // When in (or switched to) the text chat, fetch the opening once.
  useICFx(() => {
    if (mode !== "chat" || messages.length || busy) return;
    (async () => {
      setBusy(true);
      try { const r = await icPost({ action: "turn", product, channel: "telegram", exploration: 0.6, plan, messages: [] }); if (r && r.message) setMessages([{ role: "assistant", content: r.message }]); }
      catch (e) { setErr(String(e.message || e)); }
      setBusy(false);
    })();
  }, [mode]);

  async function sendText(text) {
    const t = String(text || "").trim();
    if (!t || busy) return;
    const next = messages.concat([{ role: "user", content: t }]);
    setMessages(next); setDraft(""); setBusy(true); setErr("");
    try {
      const r = await icPost({ action: "turn", product, channel: "telegram", exploration: 0.6, plan, messages: next });
      const reply = (r && r.message && r.message.trim()) ? r.message : "";
      const full = reply ? next.concat([{ role: "assistant", content: reply }]) : next;
      if (reply) setMessages(full);
      const finished = (r && (r.decision === "SUFFICIENT" || r.decision === "PAUSE")) || next.filter((m) => m.role === "user").length >= 4;
      if (finished) { setDone(true); finishIntro(full); }
      if (reply && voiceRef.current) icSpeak(reply, () => { if (voiceRef.current && !finished) startListen(); });
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  function startListen() {
    const r = icRecognizer();
    if (!r) { setErr("Voice isn't supported here — try Chrome."); return; }
    recogRef.current = r;
    r.onresult = (e) => { const t = e.results[0][0].transcript; setListening(false); sendText(t); };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    setListening(true);
    try { r.start(); } catch (e) { setListening(false); }
  }

  function toggleVoice() {
    const next = !voiceMode;
    setVoiceMode(next); voiceRef.current = next;
    if (next) {
      const last = messages.slice().reverse().find((m) => m.role === "assistant");
      if (last) icSpeak(last.content, () => { if (voiceRef.current) startListen(); });
      else startListen();
    } else {
      setListening(false);
      try { if (recogRef.current) recogRef.current.stop(); } catch (e) {}
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  }

  async function finishIntro(allMessages) {
    try {
      const r = await icPost({ action: "synthesize", product, messages: allMessages });
      if (r && r.memory) {
        let store = {}; try { store = JSON.parse(localStorage.getItem("observant.memory.v1") || "{}"); } catch (e) {}
        store[product] = { memory: r.memory, at: Date.now() };
        localStorage.setItem("observant.memory.v1", JSON.stringify(store));
        setMemory(r.memory);
      }
    } catch (e) { /* non-blocking */ }
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
  }

  if (mode === "loading") {
    return (
      <div className="ic-wrap">
        <div className="ic-top"><span className="ic-brand">{product} <em>· {sessionTag}</em></span><span className="ic-muted">run by <Wordmark size="1rem" /></span></div>
        <p className="ic-muted">Setting up your intro…</p>
      </div>
    );
  }

  if (mode === "voice") {
    return (
      <div className="ic-wrap">
        <div className="ic-top"><span className="ic-brand">{product} <em>· {sessionTag}</em></span><span className="ic-muted">run by <Wordmark size="1rem" /></span></div>
        <p className="ic-sub">A quick ~10-minute voice hello so the {product} team can tailor what they ask you. Tap the mic to start talking — or <button type="button" className="ss-doc-link" style={{ background: "none", border: "none", color: "var(--accent,#b4532a)", cursor: "pointer", padding: 0 }} onClick={() => setMode("chat")}>type instead</button>.</p>
        <div style={{ display: "flex", justifyContent: "center", padding: "34px 0" }}>
          {React.createElement("elevenlabs-convai", { "agent-id": agentId })}
        </div>
        <p className="ic-muted" style={{ textAlign: "center" }}>A real-time voice conversation. When you're done, just close the tab — we'll have what we need to tailor things to you.</p>
      </div>
    );
  }

  return (
    <div className="ic-wrap">
      <div className="ic-top">
        <span className="ic-brand">{product} <em>· {sessionTag}</em></span>
        <span className="ic-muted">run by <Wordmark size="1rem" /></span>
      </div>
      <p className="ic-sub">A quick ~10-minute hello so the {product} team can tailor what they ask you. {IC_VOICE_OK ? "Type, or tap Voice to talk." : "No wrong answers — just chat."}</p>

      <div className="ic-thread">
        {messages.map((m, i) => (
          <div key={i} className={"ic-msg " + (m.role === "user" ? "me" : "them")}>
            {m.role === "assistant" && <Avatar name="Observant" color="rust" />}
            <div className="ic-bubble">{m.content}</div>
          </div>
        ))}
        {busy && <div className="ic-muted">Observant is {voiceMode ? "thinking…" : "typing…"}</div>}
        {listening && <div className="ic-muted">🎙 Listening…</div>}
        <div ref={endRef} />
      </div>

      {done ? (
        <div className="ic-done">
          Thanks — that's a great start. The {product} team now has a feel for how you actually use it, so when they check in it'll be relevant to <em>you</em>. You'll hear from us by email; reply anytime.
          {memory && <div style={{ marginTop: 12, textAlign: "left", fontSize: ".85rem", color: "#6b665d", borderTop: "1px solid #e6e3dd", paddingTop: 10 }}><b>What I noted about you</b><br />{memory}</div>}
        </div>
      ) : (
        <div className="ic-composer">
          {IC_VOICE_OK && <Btn variant={voiceMode ? "primary" : "ghost"} onClick={toggleVoice} disabled={busy}>{voiceMode ? (listening ? "Listening…" : "Voice on") : "🎙 Voice"}</Btn>}
          <input className="input" value={draft} placeholder="Type your reply…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendText(draft); }} disabled={busy} />
          <Btn variant="primary" onClick={() => sendText(draft)} disabled={busy || !draft.trim()}>Send</Btn>
        </div>
      )}
      {err && <p className="ic-muted" style={{ color: "#b4291f" }}>{err}</p>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<IntroCall />);
