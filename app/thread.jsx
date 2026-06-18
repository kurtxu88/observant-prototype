/* ============================================================
   OBSERVANT — conversation-logic test surface
   ① Team (left): set up the question, exploration level, preview.
   ② User (right): read what the user receives and reply as them.
   Email = Gmail-style thread with an embedded per-question survey;
   Telegram = IM. Each batch ends with a participation/reward strip.
   ============================================================ */
const { useState: useStateTW, useRef: useRefTW, useEffect: useEffectTW } = React;

function twPrefill() {
  const out = { product: "Northwind", channel: "email", question: "", rate: 2 };
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const s = JSON.parse(raw);
      if (s.workspace && s.workspace.companyName) out.product = s.workspace.companyName;
      if (s.setup && s.setup.surfaces && !s.setup.surfaces.email && s.setup.surfaces.telegram) out.channel = "telegram";
      if (s.workspace && s.workspace.learningGoal) out.question = s.workspace.learningGoal;
      if (s.setup && s.setup.rate) out.rate = Number(s.setup.rate) || 2;
    }
  } catch (e) { /* ignore */ }
  // Seeded from the dashboard's "Test run the email thread" link.
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("product")) out.product = params.get("product");
    if (params.get("question")) out.question = params.get("question");
    if (["email", "telegram"].includes(params.get("channel"))) out.channel = params.get("channel");
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

function estMinutes(text) { const w = String(text || "").trim().split(/\s+/).filter(Boolean).length; return Math.max(1, Math.round(w / 22)); }

/* Split an agent email into {intro, questions[], outro} preserving the
   text before/after the numbered block so the survey can REPLACE the list. */
function parseNumbered(text) {
  const str = String(text || "");
  const lines = str.split("\n");
  const questions = []; let first = -1, last = -1;
  lines.forEach((raw, idx) => {
    const m = raw.trim().match(/^(\d+)[.)]\s+(.*)/);
    if (m) { questions.push(m[2]); if (first < 0) first = idx; last = idx; }
  });
  if (!questions.length) return { intro: str, questions: [], outro: "" };
  return { intro: lines.slice(0, first).join("\n").trim(), questions, outro: lines.slice(last + 1).join("\n").trim() };
}

/* body: paragraphs, numbered lists, bullets, **bold** */
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

function EmailMsg({ m, product }) {
  const them = m.role === "assistant";
  return (
    <div className="gm-msg">
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
}

/* Email where the questions are asked ONCE — each with its answer field inline. */
function SurveyEmail({ m, product, intro, questions, outro, survey, setSurvey, onSend, busy }) {
  return (
    <div className="gm-msg">
      <div className="gm-head">
        <Avatar name="Observant" color="rust" />
        <div className="gm-from">
          <b>Observant</b> <span>&lt;learning@observant.io&gt;</span>
          <span className="gm-to">on behalf of {product}  ·  to you</span>
        </div>
        <span className="gm-time">{fmtTime(m.ts)}</span>
      </div>
      <div className="gm-body">
        {renderBody(intro)}
        {questions.map((q, i) => (
          <div key={i} className="tw-surveyq">
            <div className="tw-surveyq-label">{i + 1}. {q}</div>
            <input className="input" value={survey[i] || ""} placeholder="Your answer…" onChange={(e) => setSurvey(Object.assign({}, survey, { [i]: e.target.value }))} disabled={busy} />
          </div>
        ))}
        {outro ? renderBody(outro) : null}
        <Btn variant="primary" size="sm" onClick={onSend} disabled={busy}>Send replies</Btn>
      </div>
    </div>
  );
}

function ThreadSurface() {
  const pre = twPrefill();
  const [product, setProduct] = useStateTW(pre.product);
  const [question, setQuestion] = useStateTW(pre.question);
  const [wishlist, setWishlist] = useStateTW("");
  const [channel, setChannel] = useStateTW(pre.channel);
  const [exploration, setExploration] = useStateTW(0.5); // continuous 0..1 temperature

  const [essence, setEssence] = useStateTW("");
  const [subject, setSubject] = useStateTW("");
  const [questions, setQuestions] = useStateTW([]);
  const [translated, setTranslated] = useStateTW(false);

  const [messages, setMessages] = useStateTW([]);
  const [wrapped, setWrapped] = useStateTW(false);
  const [draft, setDraft] = useStateTW("");
  const [survey, setSurvey] = useStateTW({}); // {idx: answer} for embedded email survey
  const [minutes, setMinutes] = useStateTW(0);
  const [busy, setBusy] = useStateTW(false);
  const [err, setErr] = useStateTW("");
  const endRef = useRefTW(null);

  useEffectTW(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  const started = messages.length > 0;
  const isEmail = channel === "email";
  const rate = pre.rate;
  const reward = Math.round(minutes * rate);
  const planNow = () => ({ essence, subject, questions });

  const lastAgent = started && messages[messages.length - 1].role === "assistant" ? messages[messages.length - 1] : null;
  const pending = (isEmail && lastAgent && !wrapped) ? parseNumbered(lastAgent.content) : { intro: "", questions: [], outro: "" };
  const isSurvey = pending.questions.length >= 1;

  async function translate() {
    if (!question.trim()) { setErr("Type a question for the team to ask."); return; }
    setBusy(true); setErr(""); setMessages([]); setWrapped(false); setDraft(""); setSurvey({}); setMinutes(0); setTranslated(false);
    try {
      const t = await twPost({ action: "translate", product, question, wishlist });
      if (!t.ok) throw new Error(t.error || "translate failed");
      setEssence(t.plan.essence || ""); setSubject(t.plan.subject || ""); setQuestions(t.plan.questions || []);
      setTranslated(true);
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  async function launch() {
    if (!questions.length) { setErr("Translate a question first."); return; }
    setBusy(true); setErr(""); setWrapped(false); setDraft(""); setSurvey({}); setMinutes(0);
    try {
      const r = await twPost({ action: "turn", product, channel, wishlist, exploration, plan: planNow(), messages: [] });
      if (!r.ok) throw new Error(r.error || "launch failed");
      setMessages([{ role: "assistant", content: r.message, ts: Date.now() }]);
      setWrapped(r.decision === "SUFFICIENT");
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  async function send(replyText) {
    if (!replyText.trim() || busy) return;
    const next = messages.concat([{ role: "user", content: replyText.trim(), ts: Date.now() }]);
    setMessages(next); setDraft(""); setSurvey({}); setMinutes((m) => m + estMinutes(replyText)); setBusy(true); setErr("");
    try {
      const r = await twPost({ action: "turn", product, channel, wishlist, exploration, plan: planNow(), messages: next });
      if (!r.ok) throw new Error(r.error || "turn failed");
      if (r.message && r.message.trim()) setMessages(next.concat([{ role: "assistant", content: r.message, ts: Date.now() }]));
      setWrapped(r.decision === "SUFFICIENT");
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  function sendSurvey() {
    const assembled = pending.questions.map((q, i) => (i + 1) + ". " + (survey[i] || "").trim()).filter((s) => s.replace(/^\d+\.\s*/, "").trim()).join("\n");
    send(assembled);
  }

  const replyOpen = started && !wrapped;

  return (
    <div className="tw-wrap">
      <div className="tw-top">
        <Wordmark size="1.3rem" />
        <span className="tw-tag">conversation-logic test surface · you play both seats</span>
      </div>

      <div className="tw-grid">
        {/* ① Team */}
        <div>
          <div className="tw-card">
            <h3><span className="tw-seat">① Team</span> set up &amp; preview</h3>
            <div className="tw-field"><label>Product</label>
              <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} /></div>
            <div className="tw-field"><label>Your question for users</label>
              <textarea className="input" value={question} placeholder="e.g. What unique challenges do people run into with our doorbell?" onChange={(e) => setQuestion(e.target.value)} /></div>
            <div className="tw-field"><label>Wishlist — where to dig deeper if it comes up <span className="tw-muted">(optional)</span></label>
              <textarea className="input" value={wishlist} placeholder="e.g. If they mention notifications, dig into whether they turned any off." onChange={(e) => setWishlist(e.target.value)} /></div>
            <div className="tw-field"><label>Channel</label>
              <select className="input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="email">Email — whole set in one message</option>
                <option value="telegram">Telegram / IM — one at a time</option>
              </select></div>
            <div className="tw-field">
              <div className="tw-temp-head"><label>Temperature <span className="tw-muted">— how far past your questions Observant roams</span></label><span className="tw-temp-val">{exploration.toFixed(1)}</span></div>
              <input type="range" className="tw-range" min="0" max="1" step="0.1" value={exploration} onChange={(e) => setExploration(Number(e.target.value))} />
              <div className="tw-temp-ends"><span>stick to the script</span><span>explore freely</span></div>
            </div>
            <Btn variant="primary" onClick={translate} disabled={busy}>
              {busy && !translated ? "Translating…" : translated ? "Re-translate" : "Translate the question"} <Icon name="arrow" size={15} />
            </Btn>
            {err && <div className="tw-err">{err}</div>}
          </div>

          {translated && (
            <div className="tw-card" style={{ marginTop: 16 }}>
              <h3>Ready to preview</h3>
              <div className="tw-field"><label>The essence — what we're really after</label>
                <div className="tw-essence">{essence}</div></div>
              {isEmail && (
                <div className="tw-field"><label>Email subject <span className="tw-muted">(the whole relationship lives in this one thread)</span></label>
                  <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
              )}
              <p className="tw-note">This previews the <b>first batch</b>. Observant keeps learning from replies, follows up on what's interesting, and may roam beyond these questions — so the conversation can land somewhere you didn't script.</p>
              <Btn variant="primary" onClick={launch} disabled={busy}>
                {busy ? "Composing…" : started ? "Re-preview this 1:1" : "Preview this 1:1"} <Icon name="arrow" size={15} />
              </Btn>
            </div>
          )}
        </div>

        {/* ② User */}
        <div className="tw-card">
          <h3><span className="tw-seat">② User</span> {isEmail ? "their inbox — reply as the user" : "their Telegram — reply as the user"}</h3>
          {!started && <p className="tw-muted">Set up &amp; preview on the left. {isEmail ? "Observant sends one email with the whole set; you reply as the user and it follows up." : "Observant texts one question at a time; you reply as the user."}</p>}

          {started && (isEmail ? (
            <div className="gm">
              <div className="gm-subject">{subject || "(no subject)"}</div>
              <div className="gm-list">
                {messages.map((m, i) => {
                  if (i === messages.length - 1 && isSurvey) {
                    return <SurveyEmail key={i} m={m} product={product} intro={pending.intro} questions={pending.questions} outro={pending.outro} survey={survey} setSurvey={setSurvey} onSend={sendSurvey} busy={busy} />;
                  }
                  return <EmailMsg key={i} m={m} product={product} />;
                })}
              </div>
            </div>
          ) : (
            <div className="tw-thread">
              {messages.map((m, i) => (
                <div key={i} className={"tw-msg " + (m.role === "user" ? "me" : "them")}>
                  {m.role === "assistant" && <Avatar name="Observant" color="rust" />}
                  <div><div className="tw-who">{m.role === "user" ? "You" : "Observant"}</div><div className="tw-bubble">{m.content}</div></div>
                </div>
              ))}
            </div>
          ))}

          {busy && started && <div className="tw-muted" style={{ marginTop: 10 }}>Observant is thinking…</div>}
          {wrapped && <div className="tw-muted" style={{ marginTop: 10 }}>— Observant feels it has what it needs for now —</div>}
          <div ref={endRef} />

          {/* reward / participation strip (#17/#18) */}
          {started && (
            <div className="tw-reward">
              <span className="tw-reward-min">You've contributed <b>{minutes} min</b> so far <span className="tw-muted">· ≈ ${reward}</span></span>
              <button className="tw-reward-cta" type="button">Track and redeem rewards on Observant →</button>
            </div>
          )}

          {/* reply: survey is INLINE in the email above (asked once). Here: email follow-ups (single Q) + telegram. */}
          {replyOpen && !isSurvey && (isEmail ? (
            <div className="gm-reply">
              <div className="gm-reply-to">Reply to Observant</div>
              <textarea className="input" value={draft} placeholder="Write your reply as the user…" onChange={(e) => setDraft(e.target.value)} disabled={busy} />
              <Btn variant="primary" size="sm" onClick={() => send(draft)} disabled={busy || !draft.trim()}>Send reply</Btn>
            </div>
          ) : (
            <div className="tw-composer">
              <input className="input" value={draft} placeholder="Reply as the user…" onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(draft); }} disabled={busy} />
              <Btn variant="primary" onClick={() => send(draft)} disabled={busy || !draft.trim()}>Send</Btn>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ThreadSurface />);
