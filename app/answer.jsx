/* The hosted answer form the email links to. Renders the questions with
   inline fields + the reward note; submitting runs through C2/C3 (which may
   fire the next email). This IS the inbound reply — no email parsing. */
const { useState: useStateAN, useEffect: useEffectAN } = React;

async function anPost(body) {
  const r = await fetch("/api/selfserve/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return r.json();
}

function AnswerApp() {
  const d = new URLSearchParams(window.location.search).get("d") || "";
  const [phase, setPhase] = useStateAN("loading");
  const [data, setData] = useStateAN(null);
  const [answers, setAnswers] = useStateAN({});
  const [busy, setBusy] = useStateAN(false);
  const [err, setErr] = useStateAN("");
  const [result, setResult] = useStateAN(null);

  useEffectAN(() => {
    (async () => {
      if (!d) { setErr("This link is missing its data."); setPhase("error"); return; }
      try {
        const r = await anPost({ action: "load", d });
        if (!r.ok) throw new Error(r.error || "couldn't open this link");
        setData(r); setPhase("form");
      } catch (e) { setErr(String(e.message || e)); setPhase("error"); }
    })();
  }, []);

  async function submit() {
    if (busy) return;
    const ans = (data.questions || []).map((q, i) => answers[i] || "");
    if (!ans.some((a) => a.trim())) { setErr("Add at least one answer."); return; }
    setBusy(true); setErr("");
    try {
      const r = await anPost({ action: "submit", d, answers: ans });
      if (!r.ok) throw new Error(r.error || "couldn't submit");
      setResult(r); setPhase("done");
    } catch (e) { setErr(String(e.message || e)); }
    setBusy(false);
  }

  const product = (data && data.product) || "the team";

  return (
    <div className="an-wrap">
      <div className="an-top">
        <span className="an-brand">{product} <em>· feedback</em></span>
        <span className="an-powered">run by <Wordmark size="1rem" /></span>
      </div>

      {phase === "loading" && <p className="an-muted">Opening your questions…</p>}
      {phase === "error" && <p className="an-err">{err}</p>}

      {phase === "form" && data && (
        <div>
          {data.round > 0 && (
            <div className="an-followup">
              <span className="an-followup-tag">Follow-up · round {data.round + 1}</span>
              <span>A couple of follow-ups based on what you shared earlier.{data.accruedMinutes > 0 ? <> You've banked about <b>{data.accruedMinutes} min</b> so far.</> : null}</span>
            </div>
          )}
          <div className="an-hero">
            <h1>{data.round > 0 ? "A couple more questions" : "A few questions from the " + product + " team"}</h1>
            {data.intro ? <p>{data.intro}</p> : <p>Answer in your own words — whatever comes to mind is useful.</p>}
          </div>
          {(data.questions || []).map((q, i) => (
            <div className="an-q" key={i}>
              <label>{i + 1}. {q}</label>
              <textarea className="input" value={answers[i] || ""} placeholder="Your answer…" onChange={(e) => setAnswers(Object.assign({}, answers, { [i]: e.target.value }))} />
            </div>
          ))}
          <div className="an-reward">You earn about <b>$2 per minute</b> you spend answering — tracked automatically.{data.accruedMinutes > 0 ? <> You're at about <b>{data.accruedMinutes} min</b> so far this conversation.</> : null} You can track and redeem your rewards on Observant anytime.</div>
          <Btn variant="primary" size="lg" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send my answers"} <Icon name="arrow" size={16} /></Btn>
          {err && <p className="an-err">{err}</p>}
        </div>
      )}

      {phase === "done" && (
        <div className="an-done">
          <Icon name="check" size={34} sw={2} />
          <h1>Thank you!</h1>
          {result && result.sent
            ? <p>Got it — that's about <b>{result.minutes} min</b> added{result.totalMinutes ? <>, for <b>{result.totalMinutes} min</b> total</> : null}. {product} had a follow-up, so we've just emailed it to you. Reply whenever you have a moment.</p>
            : <p>Got it — that's about <b>{result && result.minutes} min</b> added{result && result.totalMinutes ? <>, for <b>{result.totalMinutes} min</b> total</> : null}. That's everything {product} needed for now; we'll be in touch when there's something new.</p>}
          <p className="an-muted" style={{ marginTop: 14 }}>Your minutes and rewards are tracked on Observant.</p>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<AnswerApp />);
