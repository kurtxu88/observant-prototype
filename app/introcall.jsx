/* The 10-minute intro chat a new feedback partner runs after opting in.
   A warm get-to-know-you so future questions can be tailored to them.
   Runs on the same engine (one-at-a-time, casual), seeded with an intro
   "plan" rather than a team question. Its output is the seed for C4
   (individual memory) — that's queued. */
const { useState: useIC, useRef: useICRef, useEffect: useICFx } = React;

function icPlan(product) {
  return {
    essence: "Get to know this new feedback partner — who they are, how they use " + product + " in their day, the context around it, and what they care about — so future questions can be tailored to them.",
    questions: ["To start — what got you using " + product + ", and how does it fit into your day right now?"],
    subject: "",
  };
}

async function icPost(body) {
  const r = await fetch("/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

function IntroCall() {
  const params = new URLSearchParams(window.location.search);
  const product = (params.get("product") || "the product").trim();
  const [messages, setMessages] = useIC([]); // {role, content}
  const [draft, setDraft] = useIC("");
  const [busy, setBusy] = useIC(false);
  const [done, setDone] = useIC(false);
  const [err, setErr] = useIC("");
  const endRef = useICRef(null);
  const plan = icPlan(product);
  const userTurns = messages.filter((m) => m.role === "user").length;

  useICFx(() => { (async () => {
    setBusy(true);
    try {
      const r = await icPost({ action: "turn", product, channel: "telegram", exploration: 0.6, plan, messages: [] });
      if (r && r.message) setMessages([{ role: "assistant", content: r.message }]);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  })(); }, []);

  useICFx(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send() {
    if (!draft.trim() || busy) return;
    const next = messages.concat([{ role: "user", content: draft.trim() }]);
    setMessages(next); setDraft(""); setBusy(true); setErr("");
    try {
      const r = await icPost({ action: "turn", product, channel: "telegram", exploration: 0.6, plan, messages: next });
      if (r && r.message && r.message.trim()) setMessages(next.concat([{ role: "assistant", content: r.message }]));
      // wrap the intro after a handful of exchanges or when the agent feels it has enough
      if (r && (r.decision === "SUFFICIENT" || r.decision === "PAUSE") || next.filter((m) => m.role === "user").length >= 4) setDone(true);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  return (
    <div className="ic-wrap">
      <div className="ic-top">
        <span className="ic-brand">{product} <em>· intro</em></span>
        <span className="ic-muted">run by <Wordmark size="1rem" /></span>
      </div>
      <p className="ic-sub">A quick ~10-minute hello so the {product} team can tailor what they ask you. No wrong answers — just chat.</p>

      <div className="ic-thread">
        {messages.map((m, i) => (
          <div key={i} className={"ic-msg " + (m.role === "user" ? "me" : "them")}>
            {m.role === "assistant" && <Avatar name="Observant" color="rust" />}
            <div className="ic-bubble">{m.content}</div>
          </div>
        ))}
        {busy && <div className="ic-muted">Observant is typing…</div>}
        <div ref={endRef} />
      </div>

      {done ? (
        <div className="ic-done">Thanks — that's a great start. The {product} team now has a feel for how you actually use it, so when they check in it'll be relevant to <em>you</em>. You'll hear from us by email; reply anytime.</div>
      ) : (
        <div className="ic-composer">
          <input className="input" value={draft} placeholder="Type your reply…" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} disabled={busy} />
          <Btn variant="primary" onClick={send} disabled={busy || !draft.trim()}>Send</Btn>
        </div>
      )}
      {err && <p className="ic-muted" style={{ color: "#b4291f" }}>{err}</p>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<IntroCall />);
