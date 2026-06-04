/* ============================================================
   OBSERVANT app — Setup flow (build a learning program)
   ============================================================ */
const { useState: useStateS, useEffect: useEffectS } = React;

const SETUP_STEPS = [
  { t: "Brief the agent", d: "What do you want to learn?" },
  { t: "Who you learn from", d: "Choose your panel" },
  { t: "Cadence", d: "How continuous?" },
  { t: "Where it lives", d: "Each user's private line" },
  { t: "Review & launch", d: "Confirm and go live" },
];

function CheckCircle({ on }) {
  return <span className="check">{on ? <Icon name="check" size={13} sw={2.6} /> : null}</span>;
}

function OptCard({ on, onClick, icon, name, desc, tag, multi }) {
  return (
    <button className={`opt${on ? " on" : ""}`} onClick={onClick} type="button">
      <div className="opt-top">
        <span className="opt-name">
          {icon && <span className="opt-ic"><Icon name={icon} size={17} /></span>}
          {name}
        </span>
        <CheckCircle on={on} />
      </div>
      {desc && <span className="opt-desc">{desc}</span>}
      {tag && <span className="opt-tag">{tag}</span>}
    </button>
  );
}

function SetupFlow({ onLaunch, onExit }) {
  const [step, setStep] = useStateS(0);
  const [launching, setLaunching] = useStateS(false);

  const [goal, setGoal] = useStateS("");
  const [product, setProduct] = useStateS("Northwind");
  const [source, setSource] = useStateS(null);     // 'own' | 'recruit'
  const [link, setLink] = useStateS("");
  const [profile, setProfile] = useStateS("");
  const [cohorts, setCohorts] = useStateS(["power"]);
  const [tier, setTier] = useStateS(null);
  const [surfaces, setSurfaces] = useStateS(["product"]);

  const toggle = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const valid = [
    goal.trim().length > 3,
    source === "own" ? link.trim().length > 2 : source === "recruit" ? profile.trim().length > 3 : false,
    !!tier,
    surfaces.length > 0,
    true,
  ];

  const next = () => setStep((s) => Math.min(s + 1, SETUP_STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const tierLabel = { oneoff: "One-off study", "1mo": "1-month program", "6mo": "6-month continuous" };
  const surfaceLabel = { product: "In your product", browser: "Browser companion", email: "Email", app: "Observant app" };
  const sourceLabel = source === "own" ? `Your own users · ${link || "—"}` : source === "recruit" ? "Recruited vetted panel (Prolific)" : "—";

  const launch = () => {
    setLaunching(true);
    const draft = {
      id: "new-" + Date.now(),
      name: goal.trim().length > 28 ? goal.trim().slice(0, 26) + "…" : (goal.trim() || "New program"),
      status: "live", desc: `${tierLabel[tier]} · ${product}`,
      panelSize: source === "recruit" ? 50 : 32, activeNow: 2, tier: tierLabel[tier],
      members: ["dana", "priya"],
      cohorts: source === "recruit"
        ? [{ name: "Recruited (Prolific)", n: 50, pct: 100, color: "var(--blue)" }]
        : cohorts.map((c, i) => ({
            name: c === "power" ? "Power users" : c === "early" ? "Early adopters" : "All users",
            n: c === "power" ? 32 : c === "early" ? 18 : 60, pct: 100,
            color: ["var(--accent)", "var(--success)", "var(--blue)"][i % 3],
          })),
      insights: [],
      isNew: true,
    };
    setTimeout(() => onLaunch(draft), 3200);
  };

  return (
    <div className="setup">
      <div className="setup-top">
        <Wordmark size="1.4rem" />
        <div className="right">
          <span>New learning program</span>
          <a href="#" onClick={(e) => { e.preventDefault(); onExit(); }}>Skip to portal →</a>
        </div>
      </div>

      <div className="setup-body">
        <aside className="setup-rail">
          <span className="eyebrow">Setup</span>
          <ol className="steps">
            {SETUP_STEPS.map((s, i) => (
              <li key={i} className={`step-li${i === step ? " active" : ""}${i < step ? " done" : ""}`}>
                <div className="step-rail">
                  <span className="step-bullet">{i < step ? <Icon name="check" size={13} sw={2.6} /> : i + 1}</span>
                  <span className="step-line" />
                </div>
                <div className="step-label">
                  <div className="t">{s.t}</div>
                  <div className="d">{s.d}</div>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        {launching ? (
          <LaunchScreen product={product} />
        ) : (
          <main className="setup-main">
            <div className="setup-stage">
              {step === 0 && (
                <Step head={{ eyebrow: "Step 1", h1: "What do you want to learn?", p: "Brief Observant like you'd brief a researcher. It encodes real qualitative methodology — you bring the question." }}>
                  <div className="field">
                    <label>Your learning goal</label>
                    <textarea className="textarea" placeholder="e.g. Why do power users export data and rebuild it by hand instead of using our dashboards?" value={goal} onChange={(e) => setGoal(e.target.value)} />
                    <div className="chips">
                      {GOAL_CHIPS.map((c) => (
                        <button key={c} type="button" className="chip" onClick={() => setGoal(goal ? goal : c)}>{c}</button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Product <span className="hint">what Observant will reference in conversations</span></label>
                    <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} />
                  </div>
                </Step>
              )}

              {step === 1 && (
                <Step head={{ eyebrow: "Step 2", h1: "Who you learn from.", p: "Observant finds the right people for you — bring your own, or have Observant recruit a vetted panel. Start with the users worth listening to." }}>
                  <div className="opt-grid two">
                    <OptCard on={source === "own"} onClick={() => setSource("own")} icon="link" name="Bring your own" desc="Drop a link to your users. Observant opens a private 1:1 line with each." tag="Recommended" />
                    <OptCard on={source === "recruit"} onClick={() => setSource("recruit")} icon="users" name="Recruit a panel" desc="We recruit a vetted panel for you — Prolific is the day-one bridge." tag="No users yet?" />
                  </div>
                  {source === "own" && (
                    <div className="field" style={{ marginTop: "1.6rem" }}>
                      <label>Link to your users <span className="hint">CSV, a segment, or a shareable invite</span></label>
                      <input className="input" placeholder="https://app.northwind.com/users/power-segment" value={link} onChange={(e) => setLink(e.target.value)} />
                      <div className="chips">
                        {[["power", "Power users"], ["early", "Early adopters"], ["all", "All users"]].map(([k, l]) => (
                          <button key={k} type="button" className={`chip${cohorts.includes(k) ? " on" : ""}`} onClick={() => toggle(cohorts, setCohorts, k)}>{l}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {source === "recruit" && (
                    <div className="field" style={{ marginTop: "1.6rem" }}>
                      <label>Your best-customer profile <span className="hint">who should we screen for?</span></label>
                      <textarea className="textarea" placeholder="e.g. Ops leads at 50–500 person B2B companies who own a reporting workflow." value={profile} onChange={(e) => setProfile(e.target.value)} />
                    </div>
                  )}
                </Step>
              )}

              {step === 2 && (
                <Step head={{ eyebrow: "Step 3", h1: "How continuous?", p: "Observant runs like a diary study — the longer it runs, the more it learns. You can change this anytime." }}>
                  <div className="opt-grid three">
                    <OptCard on={tier === "oneoff"} onClick={() => setTier("oneoff")} icon="bolt" name="One-off" desc="A single round of 1:1s. Good for a focused question." />
                    <OptCard on={tier === "1mo"} onClick={() => setTier("1mo")} icon="clock" name="1 month" desc="A short rolling study with follow-ups in the moment." />
                    <OptCard on={tier === "6mo"} onClick={() => setTier("6mo")} icon="calendar" name="6 months" desc="A continuous relationship. The real moat." tag="Most signal" />
                  </div>
                </Step>
              )}

              {step === 3 && (
                <Step head={{ eyebrow: "Step 4", h1: "Where it lives.", p: "Each user gets a private 1:1 line — never a noisy shared channel. Offer the surfaces you want; users pick their own." }}>
                  <div className="opt-grid two">
                    {[["product", "globe", "In your product", "An embedded companion inside Northwind."],
                      ["browser", "search", "Browser companion", "A lightweight extension that travels with them."],
                      ["email", "mail", "Email", "Quiet, asynchronous check-ins."],
                      ["app", "phone", "Observant app", "A dedicated space on their phone."]].map(([k, ic, nm, d]) => (
                      <OptCard key={k} multi on={surfaces.includes(k)} onClick={() => toggle(surfaces, setSurfaces, k)} icon={ic} name={nm} desc={d} />
                    ))}
                  </div>
                </Step>
              )}

              {step === 4 && (
                <Step head={{ eyebrow: "Step 5", h1: "Review & launch.", p: "Observant will open private 1:1 lines and begin the moment you launch." }}>
                  <div className="review">
                    <ReviewRow k="Learning goal" v={goal} onEdit={() => setStep(0)} />
                    <ReviewRow k="Product" v={product} onEdit={() => setStep(0)} />
                    <ReviewRow k="Panel" v={sourceLabel} sub={source === "recruit" ? profile : cohorts.map((c) => ({ power: "Power users", early: "Early adopters", all: "All users" }[c])).join(", ")} onEdit={() => setStep(1)} />
                    <ReviewRow k="Cadence" v={tierLabel[tier]} onEdit={() => setStep(2)} />
                    <ReviewRow k="Surfaces" v={surfaces.map((s) => surfaceLabel[s]).join(" · ")} onEdit={() => setStep(3)} />
                  </div>
                </Step>
              )}
            </div>

            <div className="setup-nav">
              {step > 0
                ? <Btn variant="quiet" onClick={back}><Icon name="back" size={16} /> Back</Btn>
                : <Btn variant="quiet" onClick={onExit}>Cancel</Btn>}
              <span className="count">{step + 1} / {SETUP_STEPS.length}</span>
              {step < SETUP_STEPS.length - 1
                ? <Btn variant="primary" disabled={!valid[step]} onClick={next}>Continue <Icon name="arrow" size={16} /></Btn>
                : <Btn variant="primary" onClick={launch}>Launch program <Icon name="arrow" size={16} /></Btn>}
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

function Step({ head, children }) {
  return (
    <div>
      <div className="setup-step-head">
        <span className="eyebrow">{head.eyebrow}</span>
        <h1>{head.h1}</h1>
        <p>{head.p}</p>
      </div>
      <div className="setup-fields">{children}</div>
    </div>
  );
}

function ReviewRow({ k, v, sub, onEdit }) {
  return (
    <div className="review-row">
      <span className="rk">{k}</span>
      <span className="rv">{v || "—"}{sub ? <span className="sub">{sub}</span> : null}</span>
      <button className="edit" onClick={onEdit} type="button">Edit</button>
    </div>
  );
}

function LaunchScreen({ product }) {
  const lines = [
    "Opening private 1:1 lines…",
    "Encoding your brief into Observant's methodology…",
    `Syncing with ${product}…`,
    "Observant is reaching out to your first users.",
  ];
  const [shown, setShown] = useStateS(0);
  useEffectS(() => {
    const timers = lines.map((_, i) => setTimeout(() => setShown(i + 1), 500 + i * 650));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="launching">
      <div className="launch-card">
        <div className="launch-ring" />
        <h2 className="serif">Going live</h2>
        <p>Observant is taking it from here — setting up your program and reaching out.</p>
        <div className="launch-log">
          {lines.slice(0, shown).map((l, i) => (
            <div className="row" key={i}><Icon name="check" size={15} sw={2.4} /> {l}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SetupFlow });
