/* ============================================================
   OBSERVANT — conversation-logic test surface
   Team seat: a question (+ wishlist) -> C1 gives the ESSENCE + a small
   SET of questions (most important first). Launch -> C2 composes the
   channel-appropriate opening (email = whole set in one message;
   Telegram = one at a time). You play the user; C3 decides when done.
   Email renders as a Gmail-style thread; Telegram as IM.
   Backend: /api/selfserve/interview
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
  } catch (e) { /* ignore */ }
  return out;
}

async function twPost(body) {
  const res = await fetch("/api/selfserve/interview", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  return res.json();
}

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
  catch (e) { return ""; }
}

/* Render a message body: paragraphs, numbered lists, bullets, **bold**. */
function renderBody(text) {
  const lines = String(text || "").split("\n");
  const out = []; let para = []; let list = null; let listType = null; let key = 0;
  const flushPara = () => { if (para.length) { out.push(<p key={key++}>{inline(para.join(" "))}</p>); para = []; } };
  const flushList = () => { if (list) { const L = listType === "ol" ? "ol" : "ul"; out.push(React.createElement(L, { key: key++ }, list)); list = null; listType = null; } };
  lines.forEach((raw) => {
    const line = raw.trim();
    const num = line.match(/^(\d+)[.)]\s+(.*)/);
    const bul = line.match(/^[-*•]\s+(.*)/);
    if (num) { flushPara(); if (listType && listType !== "ol") flushList(); listType = "ol"; list = list || []; list.push(<li key={key++}>{inline(num[2])}</li>); }
    else if (bul) { flushPara(); if (listType && listType !== "ul") flushList(); listType = "ul"; list = list || []; list.push(<li key={key++}>{inline(bul[1])}</li>); }
    else if (!line) { flushPara(); flushList(); }
    else { flushList(); para.push(line); }
  });
  flushPara(); flushList();
  return out;
}
function inline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => p.startsWith("**") && p.endsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p);
}

/* ---------- Gmail-style email thread ---------- */
function EmailThread({ subject, product, messages }) {
  return (
    <div className="gm">
      <div className="gm-subject">{subject || "(no subject)"}</div>
      <div className="gm-list">
        {messages.map((m, i) => {
          const them = m.role === "assistant";
          return (
            <div key={i} className="gm-msg">
              <div className="gm-head">
                <Avatar name={them ? "Observant" : "You"} color={them ? "rust" : "blue"} />
                <div className="gm-from">
                  <b>{them ? "Observant" : "You"}</b> <span>{them ? "<learning@observant.io>" : "<you@example.com>"}</span>
                  <span className="gm-to">{them ? "on behalf of " + product + "  ·  to you" : "to Observant"}</span>
                </div>
                <span className="gm-time">{fmtTime(m.ts)}</span>
              </div>
              <div className="gm-body">{renderBody(m.content)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Telegram-style chat ---------- */
function ChatThread({ messages }) {
  return (
    <div className="tw-thread">
      {messages.map((m, i) => (
        <div key={i} className={"tw-msg " + (m.role === "user" ? "me" : "them")}>
          {m.role === "assistant" && <Avatar name="Observant" color="rust" />}
          <div>
            <div className="tw-who">{m.role === "user" ? "You" : "Observant"}</div>
            <div className="tw-bubble">{m.content}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadSurface() {
  const pre = twPrefill();
  const [product, setProduct] = useStateTW(pre.product);
  const [question, setQuestion] = useStateTW(pre.question);
  const [wishlist, setWishlist] = useStateTW("");
  const [channel, setChannel] = useStateTW(pre.channel);

  const [essence, setEssence] = useStateTW("");
  const [subject, setSubject] = useStateTW("");
  const [questionsText, setQuestionsText] = useStateTW(""); // editable, one per line
  const [translated, setTranslated] = useStateTW(false);

  const [messages, setMessages] = useStateTW([]); // {role, content, ts}
  const [decision, setDecision] = useStateTW(null);
  const [draft, setDraft] = useStateTW("");
  const [busy, setBusy] = useStateTW(false);
  const [err, setErr] = useStateTW("");
  const endRef = useRefTW(null);

  useEffectTW(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const started = messages.length > 0;
  const isEmail = channel === "email";
  const planNow = () => ({ essence, subject, questions: questionsText.split("\n").map((s) => s.trim()).filter(Boolean) });

  async function translate() {
    if (!question.trim()) { setErr("Type a question for the team to ask."); return; }
    setBusy(true); setErr(""); setMessages([]); setDecision(null); setDraft(""); setTranslated(false);
    try {
      const t = await twPost({ action: "translate", product, question, wishlist });
      if (!t.ok) throw new Error(t.error || "translate failed");
      setEssence(t.plan.essence || "");
      setSubject(t.plan.subject || "");
      setQuestionsText((t.plan.questions || []).join("\n"));
      setTranslated(true);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  async function launch() {
    const plan = planNow();
    if (!plan.questions.length) { setErr("Add at least one question."); return; }
    setBusy(true); setErr(""); setDecision(null); setDraft("");
    try {
      // C2 composes the channel-appropriate opening (email: whole set; telegram: first question).
      const r = await twPost({ action: "turn", product, channel, wishlist, plan, messages: [] });
      if (!r.ok) throw new Error(r.error || "launch failed");
      setMessages([{ role: "assistant", content: r.message, ts: Date.now() }]);
      setDecision({ decision: r.decision, reason: r.reason, report: r.report });
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  async function sendReply() {
    if (!draft.trim() || busy) return;
    const next = messages.concat([{ role: "user", content: draft.trim(), ts: Date.now() }]);
    setMessages(next); setDraft(""); setBusy(true); setErr("");
    try {
      const r = await twPost({ action: "turn", product, channel, wishlist, plan: planNow(), messages: next });
      if (!r.ok) throw new Error(r.error || "turn failed");
      if (r.message) setMessages(next.concat([{ role: "assistant", content: r.message, ts: Date.now() }]));
      setDecision({ decision: r.decision, reason: r.reason, report: r.report });
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  const replyOpen = started && (decision == null || decision.decision !== "SUFFICIENT");

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
              <textarea className="input" value={question} placeholder="e.g. What unique challenges do people run into with our doorbell?" onChange={(e) => setQuestion(e.target.value)} />
            </div>
            <div className="tw-field">
              <label>Wishlist — where to dig deeper if it comes up <span className="tw-muted">(optional)</span></label>
              <textarea className="input" value={wishlist} placeholder="e.g. If they mention notifications, dig into whether they turned any off." onChange={(e) => setWishlist(e.target.value)} />
            </div>
            <div className="tw-field">
              <label>Channel</label>
              <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="email">Email — whole set in one message</option>
                <option value="telegram">Telegram / IM — one at a time</option>
              </select>
            </div>
            <Btn variant="primary" onClick={translate} disabled={busy}>
              {busy && !translated ? "Translating…" : translated ? "Re-translate" : "Translate the question"} <Icon name="arrow" size={15} />
            </Btn>
            {err && <div className="tw-err">{err}</div>}
          </div>

          {translated && (
            <div className="tw-card" style={{ marginTop: 16 }}>
              <h3>Ready to test</h3>
              <div className="tw-field">
                <label>The essence — what we're really after</label>
                <div className="tw-essence">{essence}</div>
              </div>
              {isEmail && (
                <div className="tw-field">
                  <label>Email subject</label>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
              )}
              <div className="tw-field">
                <label>Questions <span className="tw-muted">(most important first · one per line · edit freely)</span></label>
                <textarea className="input" style={{ minHeight: 100 }} value={questionsText} onChange={(e) => setQuestionsText(e.target.value)} />
              </div>
              <Btn variant="primary" onClick={launch} disabled={busy}>
                {busy ? "Composing…" : started ? "Relaunch this 1:1 test" : "Launch this 1:1 test"} <Icon name="arrow" size={15} />
              </Btn>
            </div>
          )}
        </div>

        {/* ---------- Participant seat ---------- */}
        <div>
          <div className="tw-card">
            <h3>Participant seat — {isEmail ? "their inbox" : "their Telegram"}</h3>
            {!started && <p className="tw-muted">Translate a question, then launch. {isEmail ? "Observant sends one email with the whole set; you reply as the user." : "Observant texts one question at a time; you reply as the user."}</p>}

            {started && (isEmail
              ? <EmailThread subject={subject} product={product} messages={messages} />
              : <ChatThread messages={messages} />)}

            {busy && started && <div className="tw-muted" style={{ marginTop: 10 }}>Observant is thinking…</div>}
            <div ref={endRef} />

            {replyOpen && (
              isEmail ? (
                <div className="gm-reply">
                  <div className="gm-reply-to">Reply to Observant</div>
                  <textarea className="input" value={draft} placeholder="Write your reply as the user…" onChange={(e) => setDraft(e.target.value)} disabled={busy} />
                  <Btn variant="primary" size="sm" onClick={sendReply} disabled={busy || !draft.trim()}>Send reply</Btn>
                </div>
              ) : (
                <div className="tw-composer">
                  <input className="input" value={draft} placeholder="Reply as the user…" onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }} disabled={busy} />
                  <Btn variant="primary" onClick={sendReply} disabled={busy || !draft.trim()}>Send</Btn>
                </div>
              )
            )}
          </div>

          {/* C3 signal — kept OUTSIDE the thread so it never overlaps the real UI */}
          {decision && (
            <div className="tw-debug">
              <span className="tw-debug-tag">C3 (debug)</span>
              <span className={"tw-debug-dec " + decision.decision}>{decision.decision}</span>
              <span className="tw-debug-reason">{decision.reason}</span>
              {decision.decision === "SUFFICIENT" && decision.report && (
                <div className="tw-debug-report"><b>Would report to team:</b> {decision.report}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ThreadSurface />);
