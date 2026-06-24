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
// The entered workspace context, so the voice agent grounds in THIS product.
function icWorkspaceContext() {
  try {
    const s = JSON.parse(localStorage.getItem("observant.selfserve.v1") || "{}");
    const w = s.workspace || {};
    return { productDescription: String(w.productDescription || ""), userBase: String(w.userBase || "") };
  } catch (e) { return { productDescription: "", userBase: "" }; }
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
  const [mode, setMode] = useIC("loading"); // loading | voice (ElevenLabs live) | chat (text/Web-Speech fallback)
  const [agentId, setAgentId] = useIC("");
  const [signedUrl, setSignedUrl] = useIC("");
  const [voiceState, setVoiceState] = useIC("idle"); // idle | connecting | live | ended
  const [agentMode, setAgentMode] = useIC(null); // listening | speaking | null
  const [voiceMode, setVoiceMode] = useIC(false);
  const [listening, setListening] = useIC(false);
  const voiceRef = useICRef(false);
  const recogRef = useICRef(null);
  const endRef = useICRef(null);
  const convRef = useICRef(null);
  const voiceMsgsRef = useICRef([]);

  useICFx(() => { voiceRef.current = voiceMode; }, [voiceMode]);
  useICFx(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  // Prefer a real ElevenLabs voice agent (custom UI, not the embed widget); fall back to text chat.
  useICFx(() => { (async () => {
    try {
      const ws = icWorkspaceContext();
      const v = await fetch("/api/selfserve/intro-voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product, productDescription: ws.productDescription, userBase: ws.userBase, introQuestions: plan.questions, essence: deep ? plan.essence : "", deep: !!deep }) }).then((r) => r.json());
      if (v && v.ok && (v.signedUrl || v.agentId)) { setSignedUrl(v.signedUrl || ""); setAgentId(v.agentId || ""); setMode("voice"); return; }
    } catch (e) { /* fall through to chat */ }
    setMode("chat");
  })(); }, []);

  async function startVoice() {
    const Conversation = window.ElevenLabsConversation;
    if (!Conversation) { setMode("chat"); return; }
    setVoiceState("connecting"); setErr("");
    voiceMsgsRef.current = [];
    try {
      const opts = signedUrl ? { signedUrl } : { agentId };
      convRef.current = await Conversation.startSession({
        ...opts,
        onModeChange: (m) => setAgentMode((m && m.mode) === "speaking" ? "speaking" : "listening"),
        onStatusChange: (s) => { if (s && s.status === "connected") setVoiceState("live"); },
        onMessage: (msg) => {
          const text = msg && (msg.message || msg.text) || "";
          if (!text.trim()) return;
          const role = (msg.source === "ai" || msg.source === "agent") ? "assistant" : "user";
          voiceMsgsRef.current = voiceMsgsRef.current.concat([{ role, content: text }]);
          setMessages(voiceMsgsRef.current.slice());
        },
        onDisconnect: () => { setVoiceState("ended"); setAgentMode(null); if (!done) finishVoice(); },
        onError: (e) => { setErr("Voice connection hiccup — you can type instead."); },
      });
      setVoiceState("live");
    } catch (e) { setErr("Couldn't start the mic — check permission, or type instead."); setVoiceState("idle"); }
  }

  async function endVoice() {
    try { if (convRef.current) await convRef.current.endSession(); } catch (e) {}
    setVoiceState("ended"); setAgentMode(null); finishVoice();
  }
  function finishVoice() {
    const msgs = voiceMsgsRef.current.slice();
    setDone(true);
    if (msgs.length) finishIntro(msgs);
  }

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
        {done ? (
          <div className="ic-voice">
            <VoiceOrb agentMode={null} />
            <p className="ic-voice-status">Thank you — that's everything we needed.</p>
            <p className="ic-voice-hint">The {product} team now has a feel for how you use it, so what they ask next will be tailored to you.</p>
            {memory && <div style={{ marginTop: 4, textAlign: "left", fontSize: ".85rem", color: "#6b665d", borderTop: "1px solid #e6e3dd", paddingTop: 10, maxWidth: 420 }}><b>What I noted about you</b><br />{memory}</div>}
          </div>
        ) : (
          <div className="ic-voice">
            <VoiceOrb agentMode={voiceState === "live" ? agentMode : null} />
            {voiceState === "idle" && <>
              <p className="ic-voice-status">A ~10-minute voice conversation.</p>
              <p className="ic-voice-hint">The {product} team would love to hear how you actually use it. Tap below and just talk — no prep, no wrong answers.</p>
              <div className="ic-voice-btns">
                <Btn variant="primary" size="lg" onClick={startVoice}><Icon name="phone" size={16} /> Start the conversation</Btn>
              </div>
            </>}
            {voiceState === "connecting" && <p className="ic-voice-status">Connecting…</p>}
            {voiceState === "live" && <>
              <p className="ic-voice-status">{agentMode === "speaking" ? "Observant is speaking…" : "Listening — go ahead"}</p>
              <p className="ic-voice-hint">Talk naturally. When you're done, tap End and we'll save what we learned.</p>
              <div className="ic-voice-btns"><Btn variant="ghost" size="lg" onClick={endVoice}>End conversation</Btn></div>
            </>}
            <button type="button" className="ss-linklike" onClick={() => { try { if (convRef.current) convRef.current.endSession(); } catch (e) {} setMode("chat"); }}>or type instead</button>
            {err && <p className="ic-muted" style={{ color: "#b4291f" }}>{err}</p>}
          </div>
        )}
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

function VoiceOrb({ agentMode }) {
  const [scale, setScale] = useIC(1);
  useICFx(() => {
    const id = setInterval(() => {
      if (agentMode === "speaking") setScale(1 + Math.random() * 0.22);
      else setScale(1 + Math.sin(Date.now() / 600) * 0.05);
    }, 90);
    return () => clearInterval(id);
  }, [agentMode]);
  const speaking = agentMode === "speaking";
  const grad = speaking ? "linear-gradient(135deg,#c9663a,#b4532a)" : "linear-gradient(135deg,#b4532a,#d98a5b)";
  const glow = speaking ? "0 0 60px rgba(180,83,42,.42), 0 0 120px rgba(217,138,91,.22)" : "0 0 40px rgba(180,83,42,.28), 0 0 80px rgba(217,138,91,.16)";
  return (
    <div className="ic-orb" style={{ background: grad, transform: "scale(" + scale + ")", boxShadow: glow }}>
      <div className="ic-orb-core" />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<IntroCall />);
