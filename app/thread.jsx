/* ============================================================
   OBSERVANT — conversation-logic test surface
   Team seat: type a question -> C1 translates it to an interview plan.
   Participant seat: YOU play the user; Observant runs the live thread
   (C2) and decides when it's done (C3). One surface to tune the logic.
   Backend: /api/selfserve/interview  (loads C1/C2/C3, calls Claude)
   ============================================================ */
const { useState: useStateTW, useRef: useRefTW, useEffect: useEffectTW } = React;

function twPrefill() {
  const out = { product: "Northwind", channel: "email", question: "" };
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const s = JSON.parse(raw);
      if (s.workspace && s.workspace.companyName) out.product = s.workspace.companyName;
      if (s.setup && s.setup.surfaces && !s.setup.surfaces.email && s.setup.surfaces.telegram) out.channel = "telegram";
      if (s.workspace && s.workspace.learningGoal) out.question = s.workspace.learningGoal;
    }
  } catch (e) { /* ignore stale state */ }
  return out;
}

async function twPost(body) {
  const res = await fetch("/api/selfserve/interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function ThreadSurface() {
  const pre = twPrefill();
  const [product, setProduct] = useStateTW(pre.product);
  const [question, setQuestion] = useStateTW(pre.question);
  const [channel, setChannel] = useStateTW(pre.channel);
  const [plan, setPlan] = useStateTW(null);
  const [messages, setMessages] = useStateTW([]); // {role:'assistant'|'user', content}
  const [decision, setDecision] = useStateTW(null); // {decision, reason, report}
  const [draft, setDraft] = useStateTW("");
  const [busy, setBusy] = useStateTW(false);
  const [err, setErr] = useStateTW("");
  const endRef = useRefTW(null);

  useEffectTW(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const reset = () => { setPlan(null); setMessages([]); setDecision(null); setDraft(""); setErr(""); };

  async function start() {
    if (!question.trim()) { setErr("Type a question for the team to ask."); return; }
    setBusy(true); setErr(""); reset();
    try {
      const t = await twPost({ action: "translate", product, question });
      if (!t.ok) throw new Error(t.error || "translate failed");
      setPlan(t.plan);
      // Observant opens the thread.
      const first = await twPost({ action: "turn", product, channel, plan: t.plan, messages: [] });
      if (!first.ok) throw new Error(first.error || "turn failed");
      setMessages([{ role: "assistant", content: first.message }]);
      setDecision({ decision: first.decision, reason: first.reason, report: first.report });
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  async function sendReply() {
    if (!draft.trim() || busy) return;
    const next = messages.concat([{ role: "user", content: draft.trim() }]);
    setMessages(next); setDraft(""); setBusy(true); setErr("");
    try {
      const r = await twPost({ action: "turn", product, channel, plan, messages: next });
      if (!r.ok) throw new Error(r.error || "turn failed");
      if (r.message) setMessages(next.concat([{ role: "assistant", content: r.message }]));
      setDecision({ decision: r.decision, reason: r.reason, report: r.report });
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  const started = plan !== null;

  return (
    <div className="tw-wrap">
      <div className="tw-top">
        <Wordmark size="1.3rem" />
        <span className="tw-tag">conversation-logic test surface · C1 · C2 · C3</span>
      </div>

      <div className="tw-grid">
        {/* ---------- Team seat ---------- */}
        <div>
          <div className="tw-card">
            <h3>Team seat — feed a question</h3>
            <div className="tw-field">
              <label>Product</label>
              <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} />
            </div>
            <div className="tw-field">
              <label>Your question for users</label>
              <textarea className="input" value={question} placeholder="e.g. Do people understand our new pricing page?" onChange={(e) => setQuestion(e.target.value)} />
            </div>
            <div className="tw-field">
              <label>Channel (tone)</label>
              <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="email">Email (async, fuller)</option>
                <option value="telegram">Telegram / IM (short, chatty)</option>
              </select>
            </div>
            <Btn variant="primary" onClick={start} disabled={busy}>
              {busy && !started ? "Translating…" : started ? "Restart with this question" : "Start the program"} <Icon name="arrow" size={15} />
            </Btn>
            {err && <div className="tw-err">{err}</div>}
          </div>

          {plan && (
            <div className="tw-card" style={{ marginTop: 16 }}>
              <h3>C1 — interview plan</h3>
              <div className="tw-plan">
                <b>Goal</b>{plan.goal}
                <b>Anchors</b>
                <ul style={{ margin: "2px 0 0 16px", padding: 0 }}>
                  {(plan.anchors || []).map((a, i) => <li key={i}>{a}</li>)}
                </ul>
                {plan.success ? <><b>Success criteria</b>{plan.success}</> : null}
                {plan.outOfScope ? <><b>Out of scope</b>{plan.outOfScope}</> : null}
              </div>
            </div>
          )}
        </div>

        {/* ---------- Participant seat ---------- */}
        <div className="tw-card">
          <h3>Participant seat — you play the user, Observant runs the thread</h3>
          {!started && <p className="tw-muted">Feed a question on the left to begin. Observant opens the 1:1; you reply as the user; it follows up and decides when it has something meaningful.</p>}

          <div className="tw-thread">
            {messages.map((m, i) => (
              <div key={i} className={"tw-msg " + (m.role === "user" ? "me" : "them")}>
                {m.role === "assistant" && <Avatar name="Observant" color="rust" />}
                <div>
                  <div className="tw-who">{m.role === "user" ? "You (user)" : "Observant"}</div>
                  <div className="tw-bubble">{m.content}</div>
                </div>
              </div>
            ))}
            {busy && started && <div className="tw-muted">Observant is thinking…</div>}
            <div ref={endRef} />
          </div>

          {decision && (
            <div className={"tw-decision " + decision.decision} title={decision.reason}>
              <b>{decision.decision}</b> — {decision.reason}
            </div>
          )}

          {decision && decision.decision === "SUFFICIENT" && decision.report && (
            <div className="tw-report">
              <b>Reported to the team</b>
              {decision.report}
            </div>
          )}

          {started && (decision == null || decision.decision !== "SUFFICIENT") && (
            <div className="tw-composer">
              <input
                className="input"
                value={draft}
                placeholder="Reply as the user…"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                disabled={busy}
              />
              <Btn variant="primary" onClick={sendReply} disabled={busy || !draft.trim()}>Send</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ThreadSurface />);
