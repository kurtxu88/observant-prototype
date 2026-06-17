/* Self-serve triage scorecard. Edit questions + expected labels, "Run all" to
   score C0's deep/light calls live, see why it decided, and copy the set as JSON.
   Edits persist in localStorage. Mirrors mvp/conversation-logic/triage-evalset.json. */
const { useState: useEV, useEffect: useEVfx } = React;
const EV_KEY = "observant.evalset.v1";
const EV_DEFAULT = {
  product: "AlphaCommons",
  cases: [
    { q: "how do they feel about the community feature", expect: "light" },
    { q: "what do people think of our pricing page", expect: "light" },
    { q: "how satisfied are people with onboarding", expect: "light" },
    { q: "do they like the new dashboard design", expect: "light" },
    { q: "how was their experience with support last time", expect: "light" },
    { q: "would they recommend us to a friend", expect: "light" },
    { q: "how often do people use boards", expect: "light" },
    { q: "did people notice the new export button", expect: "light" },
    { q: "what's confusing about the signup flow", expect: "light" },
    { q: "why do power users export to a spreadsheet instead of dashboards", expect: "light" },
    { q: "what's the real job people hire us for", expect: "light" },
    { q: "how important is the community board vs recruiting privately", expect: "light" },
    { q: "what are people's complaints and struggles", expect: "light" },
    { q: "why did they churn", expect: "deep" },
    { q: "what do people think of our pricing", expect: "deep" },
    { q: "how do people use competitors", expect: "deep" },
    { q: "what should we build next for power users", expect: "deep" },
    { q: "how do builders think about where we fit alongside their other tools", expect: "deep" },
    { q: "how do people mentally categorize our product", expect: "deep" },
  ],
};
const EV_VERSION = 2; // bump to push a fresh default over a stale localStorage set
function evLoad() { try { const s = JSON.parse(localStorage.getItem(EV_KEY) || "null"); if (s && Array.isArray(s.cases) && s.v === EV_VERSION) return s; } catch (e) {} return EV_DEFAULT; }

function EvalApp() {
  const init = evLoad();
  const [product, setProduct] = useEV(init.product || "AlphaCommons");
  const [cases, setCases] = useEV(init.cases);
  const [results, setResults] = useEV({}); // index -> {got, why}
  const [running, setRunning] = useEV(false);
  const [copied, setCopied] = useEV(false);
  useEVfx(() => { try { localStorage.setItem(EV_KEY, JSON.stringify({ v: EV_VERSION, product, cases })); } catch (e) {} }, [product, cases]);

  const setCase = (i, patch) => setCases((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const addCase = () => setCases((cs) => [...cs, { q: "", expect: "light" }]);
  const rmCase = (i) => { setCases((cs) => cs.filter((_, j) => j !== i)); setResults((r) => { const n = {}; Object.keys(r).forEach((k) => { const kk = +k; if (kk < i) n[kk] = r[k]; else if (kk > i) n[kk - 1] = r[k]; }); return n; }); };

  async function runOne(i, list) {
    const c = (list || cases)[i]; if (!c || !c.q.trim()) return;
    let r;
    try { r = await fetch("/api/selfserve/interview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "triage", product, question: c.q }) }).then((x) => x.json()); }
    catch (e) { r = { mode: "ERR", rationale: String(e) }; }
    setResults((res) => ({ ...res, [i]: { got: r.mode || "?", why: r.rationale || "" } }));
  }
  async function runAll() { setRunning(true); setResults({}); const list = cases; for (let i = 0; i < list.length; i++) { await runOne(i, list); } setRunning(false); }

  let pass = 0, total = 0;
  cases.forEach((c, i) => { if (results[i] && results[i].got !== "ERR") { total++; if (results[i].got === c.expect) pass++; } });
  const pct = total ? Math.round((pass / total) * 100) : 0;

  function copyJson() {
    const out = JSON.stringify({ product, cases: cases.map((c) => ({ q: c.q, expect: c.expect })) }, null, 2);
    if (navigator.clipboard) navigator.clipboard.writeText(out).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="ev-wrap">
      <div className="ev-head">
        <div><span className="eyebrow">Conversation logic</span><h1 style={{ margin: "2px 0" }}>Triage scorecard</h1></div>
        <div className="ev-score">{total ? pass + " / " + total + " (" + pct + "%)" : "—"}</div>
      </div>
      <p className="ev-sub">Edit a question or flip its expected label, then <b>Run all</b> to score C0's live deep/light calls. Misses show why it decided. Your set is saved in this browser; <b>Copy JSON</b> to hand the set back to lock it into the repo.</p>
      {total > 0 && <div className="ev-bar"><i style={{ width: pct + "%" }} /></div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <label style={{ fontSize: ".85rem", color: "#6b665d" }}>Product</label>
        <input className="input" style={{ maxWidth: 220 }} value={product} onChange={(e) => setProduct(e.target.value)} />
      </div>

      {cases.map((c, i) => {
        const res = results[i];
        const ok = res && res.got === c.expect;
        return (
          <div className="ev-row" key={i}>
            <input className="input" value={c.q} placeholder="A question a PM would ask…" onChange={(e) => setCase(i, { q: e.target.value })} />
            <span className="ev-exp">
              <button type="button" className={c.expect === "light" ? "on" : ""} onClick={() => setCase(i, { expect: "light" })}>light</button>
              <button type="button" className={c.expect === "deep" ? "on" : ""} onClick={() => setCase(i, { expect: "deep" })}>deep</button>
            </span>
            <span className={"ev-res " + (!res ? "idle" : ok ? "ok" : "bad")}>{!res ? "—" : (ok ? "✓ " : "✗ ") + res.got}</span>
            <button type="button" className="ev-rm" onClick={() => rmCase(i)} aria-label="Remove">×</button>
            {res && !ok && res.why && <p className="ev-why">said {res.got}: {res.why}</p>}
          </div>
        );
      })}

      <div className="ev-actions">
        <Btn variant="primary" onClick={runAll} disabled={running}>{running ? "Running…" : "Run all"}</Btn>
        <Btn variant="ghost" onClick={addCase}>+ Add question</Btn>
        <Btn variant="ghost" onClick={copyJson}>{copied ? "Copied ✓" : "Copy JSON"}</Btn>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<EvalApp />);
