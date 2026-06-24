/* ============================================================
   OBSERVANT magic-link experience — what a user sees when they
   open the invite link a team sent them.
   Participant-facing: the page speaks in the client's brand,
   with Observant as the user-learning platform running the program.
   ============================================================ */
const { useState: useStateJN } = React;

function jnContext() {
  const params = new URLSearchParams(window.location.search);
  let product = (params.get("product") || "").trim();
  // Pretty URLs (observant.link/northwind, /join/northwind) carry the slug in the
  // path — rewrites serve this page, but the browser URL keeps no query string.
  if (!product) {
    const match = window.location.pathname.match(/^\/(?:join\/)?([a-z0-9][a-z0-9-]*)\/?$/i);
    if (match && !["join", "app", "docs", "observant", "api", "setup", "portal"].includes(match[1].toLowerCase())) product = match[1];
  }
  // Slugs become presentable names.
  if (/^[a-z0-9][a-z0-9-]*$/.test(product)) {
    product = product.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  let rate = 2;
  // B2B partnership benefit (the feedback-partner reward).
  let partnerBenefit = "8% discount + early access";
  // Compensation choices the company set. Default = partnership only, no cash.
  let partnershipOn = true;
  let cashOn = false;
  // Editable cash rate (free text like the reward), default "$2/min".
  let cashRate = "$2/min";
  // Off-product channels that already exist between the user and the team.
  let channels = (params.get("channels") || "").split(",").map((c) => c.trim()).filter((c) => ["email", "slack"].includes(c));
  let route = ["offproduct", "inproduct"].includes(params.get("route")) ? params.get("route") : "";
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const state = JSON.parse(raw);
      if (!product && state.workspace && state.workspace.companyName) product = state.workspace.companyName;
      if (state.setup && state.setup.rate) rate = Number(state.setup.rate) || 2;
      if (state.setup && state.setup.tierRewards && state.setup.tierRewards.bronze) partnerBenefit = state.setup.tierRewards.bronze;
      if (state.setup) { partnershipOn = state.setup.partnership !== false; cashOn = !!state.setup.cashComp; if (state.setup.cashRate != null && String(state.setup.cashRate).trim()) cashRate = String(state.setup.cashRate); }
      if (!channels.length && state.setup && state.setup.surfaces) {
        channels = ["email", "slack"].filter((c) => state.setup.surfaces[c]);
      }
      if (!route && state.setup && state.setup.route) route = state.setup.route;
    }
  } catch (err) { /* stale local state never blocks the invite */ }
  return {
    product: product || "Northwind",
    rate,
    cashRate,
    partnerBenefit,
    partnershipOn,
    cashOn,
    channels: channels.length ? channels : ["email", "slack"],
    route: route || "offproduct",
  };
}

function JoinApp() {
  const { product, rate, cashRate, partnerBenefit, partnershipOn, cashOn, channels, route } = jnContext();
  const [phase, setPhase] = useStateJN("invite");
  const [channel, setChannel] = useStateJN("");
  const [contactEmail, setContactEmail] = useStateJN("");
  const [cadence, setCadence] = useStateJN("occasional");
  // In-product programs have no contact-preference step — the conversation
  // lives inside the product. Off-product is where the user picks a channel.
  const onJoin = route === "inproduct"
    ? () => { setChannel("inproduct"); setPhase("joined"); }
    : () => setPhase("choose");

  // Stepper index → phase, so a completed step can be clicked to go back.
  const phaseForStep = (i) => {
    if (i === 0) return "invite";
    if (route === "inproduct") return "joined";
    return i === 1 ? "choose" : "joined";
  };
  const goPhase = (p) => setPhase(p);

  return (
    <div className="jn-page">
      <header className="jn-top">
        <span className="jn-brand">{product} <em>· feedback partner program</em></span>
        <span className="jn-powered">run by <Wordmark size="1.05rem" /></span>
      </header>

      <JoinProgress phase={phase} route={route} onJump={(i) => goPhase(phaseForStep(i))} />

      {phase === "invite" && <JoinInvite product={product} partnerBenefit={partnerBenefit} partnershipOn={partnershipOn} cashOn={cashOn} cashRate={cashRate} channels={channels} route={route} onJoin={onJoin} />}
      {phase === "choose" && <JoinChoose product={product} channels={channels} onBack={() => setPhase("invite")} onConnect={(picked, contact, cad) => { setChannel(picked); setContactEmail(contact || ""); setCadence(cad || "occasional"); setPhase("joined"); }} />}
      {phase === "joined" && <JoinWelcome product={product} channel={channel} contactEmail={contactEmail} cadence={cadence} onBack={() => setPhase(route === "inproduct" ? "invite" : "choose")} />}

      <footer className="jn-foot">
        <p>Run by <b>Observant</b> on behalf of the {product} team. Opt out anytime, in one tap.</p>
      </footer>
    </div>
  );
}

function JoinProgress({ phase, route, onJump }) {
  const steps = route === "inproduct" ? ["Join", "Get started"] : ["Join", "Choose channel", "Get started"];
  const current = phase === "invite" ? 0 : (route === "inproduct" ? 1 : (phase === "choose" ? 1 : 2));
  return (
    <ol className="jn-progress" aria-label="Sign-up progress">
      {steps.map((label, i) => {
        const done = i < current;
        // Completed steps are clickable to jump back; current/future are not.
        const clickable = done && typeof onJump === "function";
        return (
          <li key={label} className={"jn-progress-step" + (done ? " done" : i === current ? " on" : "") + (clickable ? " clickable" : "")}>
            <button type="button" className="jn-progress-hit" disabled={!clickable} onClick={() => clickable && onJump(i)} aria-label={clickable ? "Back to " + label : label}>
              <span className="jn-progress-dot">{done ? <Icon name="check" size={12} sw={3} /> : i + 1}</span>
              <span className="jn-progress-label">{label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

const JN_CADENCE = [
  { id: "open", t: "As often as helps", d: "Happy to hear from the team regularly." },
  { id: "occasional", t: "Every week or two", d: "A light, steady rhythm." },
  { id: "rare", t: "Only now and then", d: "Sparingly — and whenever I reach out myself." },
];

// Prominent, standalone Back control at the top-left of a step. Renders nothing
// when there's no destination, so a step is never a dead end with a stray button.
function JoinBack({ onClick, label }) {
  if (!onClick) return null;
  return (
    <div className="jn-topback-row">
      <button type="button" className="jn-topback" onClick={onClick}>
        <Icon name="back" size={15} /> {label || "Back"}
      </button>
    </div>
  );
}

function JoinChoose({ product, channels, onConnect, onBack }) {
  const single = channels.length === 1;
  const [picked, setPicked] = useStateJN(single ? channels[0] : "");
  // Work email is the identity differentiator — collected for BOTH channels so
  // Observant recognizes who's who and keeps a separate 1:1 line per person.
  const [workEmail, setWorkEmail] = useStateJN("");
  const [cadence, setCadence] = useStateJN("occasional");
  const emailValid = workEmail.includes("@") && workEmail.includes(".");
  // Reliable back: from the detail page → channel grid (clear the pick); if there's
  // only one channel (no grid), step back to the invite phase instead.
  const goBack = () => { if (!single) setPicked(""); else if (onBack) onBack(); };

  // Step 1 — pick the channel
  if (!picked) {
    return (
      <main className="jn-main">
        <JoinBack onClick={onBack} label="Back to invitation" />
        <section className="jn-hero">
          <span className="eyebrow">One last choice</span>
          <h1>Where should we reach you?</h1>
          <p>You're <b>already on both of these</b> with the {product} team — a team email and the shared Slack channel. Just pick where your one-on-one should live. You can switch later, and opt out anytime.</p>
        </section>
        <div className="jn-choice-grid">
          {channels.includes("email") && (
            <article className="jn-choice jn-choice-pick" role="button" tabIndex={0} onClick={() => setPicked("email")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked("email"); } }}>
              <span className="jn-choice-ic"><Icon name="mail" size={20} /></span>
              <b>Team email</b>
              <p>Quiet and async — lands in the team inbox you already use.</p>
              <span className="jn-choice-go">Choose email <Icon name="arrow" size={14} /></span>
            </article>
          )}
          {channels.includes("slack") && (
            <article className="jn-choice jn-choice-pick" role="button" tabIndex={0} onClick={() => setPicked("slack")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked("slack"); } }}>
              <span className="jn-choice-ic"><Icon name="chat" size={20} /></span>
              <b>Slack channel with {product}</b>
              <p>The shared Slack channel you're already in with the team — reply right where you already talk.</p>
              <span className="jn-choice-go">Choose Slack <Icon name="arrow" size={14} /></span>
            </article>
          )}
        </div>
        <p className="jn-choice-note">Either way, we'll ask for your work email next — that's how the {product} team recognizes you. No other personal data changes hands.</p>
      </main>
    );
  }

  // Step 2 — next step for the chosen channel
  return (
    <main className="jn-main">
      <JoinBack onClick={goBack} label={single ? "Back to invitation" : "Back to channel choice"} />
      <section className="jn-hero">
        <span className="eyebrow">{picked === "email" ? "Team email" : "Slack"}</span>
        <h1>{picked === "email" ? "Join by email." : "Join on Slack."}</h1>
        <p>This is where your one-on-one with the {product} team will live.</p>
      </section>

      <div className="jn-cadence">
        <span className="jn-cadence-label">How often do you want to hear from the {product} team?</span>
        <div className="jn-cadence-grid">
          {JN_CADENCE.map((c) => (
            <button key={c.id} type="button" className={"jn-cadence-opt" + (cadence === c.id ? " on" : "")} onClick={() => setCadence(c.id)}>
              <b>{c.t}</b><span>{c.d}</span>
            </button>
          ))}
        </div>
        <p className="jn-cadence-note">We'll respect this — and you can change it or pause anytime. (You can always reach out yourself, no matter what you pick.)</p>
      </div>

      <p className="jn-howitworks">How it works: every so often the {product} team sends a quick question — reply when you have a minute, right here. Your replies go straight to the team, and you can reach out anytime you have feedback, not just when asked.</p>

      <div className="jn-workemail">
        <label className="jn-field-label" htmlFor="jn-workemail-input">Work email</label>
        <input id="jn-workemail-input" className="input" type="email" value={workEmail} placeholder="you@company.com" onChange={(e) => setWorkEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && emailValid) onConnect(picked, workEmail, cadence); }} />
        <p className="jn-field-help">So the {product} team knows it's you across email and Slack.</p>
      </div>

      {picked === "slack" && (
        <p className="jn-choice-hint">Your 1:1 happens right in the shared Slack channel you're already in with the {product} team — your work email is just how they recognize you.</p>
      )}
      <div className="jn-next">
        <Btn variant="primary" size="lg" disabled={!emailValid} onClick={() => onConnect(picked, workEmail, cadence)}>Join</Btn>
      </div>
      <p className="jn-choice-note">Your work email is how Observant tells partners apart within {product}'s account — nothing else personal changes hands.</p>
    </main>
  );
}

function JoinInvite({ product, partnerBenefit, partnershipOn, cashOn, cashRate, channels, route, onJoin }) {
  const benefit = partnerBenefit || "8% discount + early access";
  const showPartnership = partnershipOn !== false;
  const rateLabel = (cashRate != null && String(cashRate).trim()) ? String(cashRate) : "$2/min";
  const bothComp = showPartnership && cashOn;
  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">You're invited</span>
        <h1>Help shape {product}.</h1>
        <p>The team at <b>{product}</b> is inviting a small group of their most engaged users to become <b>feedback partners</b>. They're building {product} around the people who actually use it — so from time to time, they'd love a quick one-on-one with you about how it really works in your hands. {showPartnership ? <>As a feedback partner, your team gets {benefit} and a real say in the roadmap.</> : <>As a feedback partner, you get a real say in the roadmap.</>}{cashOn && <> You also accrue minutes you can redeem.</>}</p>
      </section>

      <section className="jn-block">
        <h2>How it works</h2>
        <ol className="jn-steps">
          <li>
            <b>Opt in, then a quick hello</b>
            <p>A minute to join, then a short intro chat so the team learns how you use it. Leave anytime.</p>
          </li>
          <li>
            <b>Quick one-on-ones, on your time</b>
            <p>A few messages or a short voice chat — email or Slack, your call. It remembers your context, so you never repeat yourself.</p>
          </li>
          <li>
            <b>A real say — and an open line</b>
            <p>You help steer what {product} builds next — and the line's open anytime, not just when they ask.</p>
          </li>
        </ol>
      </section>

      <section className="jn-block">
        <h2>What you get</h2>
        <p className="jn-block-lead">{bothComp ? "Two ways your time pays off." : showPartnership ? "This is about the relationship, not a payout." : "A real say in what gets built — and cash for your time."}</p>
        {bothComp ? (
          <div className="jn-get-grid">
            <div className="jn-rate-card jn-get-col">
              <b>Partnership — {benefit}</b>
              <p>A real say in the roadmap — the team builds around what you tell them.</p>
              <p className="jn-rate-perks">And it only gets better the longer you're in — the {product} team brings long-time partners in close: first look at what's coming, invites to in-person events, and real time with the founders building it.</p>
            </div>
            <div className="jn-rate-card jn-get-col">
              <b>Cash for your time</b>
              <p>Accrue minutes (~{rateLabel}) you can redeem.</p>
            </div>
          </div>
        ) : showPartnership ? (
          <div className="jn-rate-card">
            <b>Feedback partner — {benefit}</b>
            <p>As a {product} feedback partner, your team gets {benefit}, plus a real say in the roadmap — the team builds around what you tell them.</p>
            <p className="jn-rate-perks">And it only gets better the longer you're in — the {product} team brings long-time partners in close: first look at what's coming, invites to in-person events, and real time with the founders building it.</p>
          </div>
        ) : (
          <div className="jn-rate-card">
            <b>Cash for your time</b>
            <p>As a {product} feedback partner, you get a real say in the roadmap, and you accrue minutes (~{rateLabel}) you can redeem.</p>
          </div>
        )}
      </section>

      <section className="jn-cta">
        <Btn variant="primary" size="lg" onClick={onJoin}>Join as a feedback partner <Icon name="arrow" size={16} /></Btn>
      </section>

      <section className="jn-block jn-faq">
        <h2>Common questions</h2>
        <details>
          <summary>Who is Observant, and why am I hearing from them?</summary>
          <p>Observant is the user-learning platform {product} uses to stay close to its users — it runs these one-on-one conversations on {product}'s behalf. So the emails or Slack messages asking about {product} come from Observant. The invitation comes from {product}; the conversations are run by Observant, for the {product} team only.</p>
        </details>
        <details>
          <summary>What do I get out of it?</summary>
          <p>As a {product} feedback partner, your team gets {benefit} and a real say in what they build next. You're always in control of when and how much you participate, and the team builds around what you actually tell them.</p>
        </details>
        <details>
          <summary>What about my privacy — who sees my responses?</summary>
          <p>Your feedback belongs to {product}. Their team has access to it — they're the ones asking — and everything is anonymized for their data-analysis purposes. It doesn't go into a database that anyone else keeps or sells. You can skip any question, or opt out entirely, anytime.</p>
        </details>
        <details>
          <summary>Is there anything beyond the discount?</summary>
          <p>Often, yes. Teams usually invite their long-time active partners to extras — in-person events or festivals (think Robinhood-style media events), conferences, early access, and time with the founding team. The {product} team decides who and when.</p>
        </details>
      </section>
    </main>
  );
}

function JoinWelcome({ product, channel, contactEmail, cadence, onBack }) {
  const [accountEmail, setAccountEmail] = useStateJN(contactEmail || "");
  const [accountDone, setAccountDone] = useStateJN(false);
  const [introSkipped, setIntroSkipped] = useStateJN(false);
  const reachWord = channel === "slack" ? "Slack" : channel === "inproduct" ? "right inside " + product : "email";
  const cadenceWord = cadence === "open" ? "as often as it helps" : cadence === "rare" ? "only now and then" : "about every week or two";

  return (
    <main className="jn-main">
      <JoinBack onClick={onBack} label="Back to channel choice" />
      {!introSkipped ? (
        <section className="jn-hero">
          <span className="eyebrow">You're in</span>
          <p className="jn-cadence-confirm">You'll hear from the {product} team <b>{cadenceWord}</b> — change it or pause anytime.</p>
          <h1>Want to give the team a head start?</h1>
          <p>It's optional — but a short ~10-minute intro chat helps the {product} team get to know how you actually use {product}. Here's why it's worth it:</p>
          <ul className="jn-intro-why">
            <li><b>Everything's tailored to you.</b> They learn your context once, so later questions fit how you really use {product}.</li>
            <li><b>Fewer, better check-ins.</b> Knowing you up front means they ask less often and never repeat themselves — far less spammy.</li>
            <li><b>It counts.</b> The intro is your first design-partner conversation — shaping the roadmap from your very first reply.</li>
          </ul>
          <div className="jn-intro-actions">
            <a className="btn btn-primary btn-lg" href={"/app/IntroCall.html?product=" + encodeURIComponent(product)}>Start the 10-minute intro <Icon name="arrow" size={16} /></a>
            <button type="button" className="jn-skip" onClick={() => setIntroSkipped(true)}>Skip for now</button>
          </div>
        </section>
      ) : (
        <section className="jn-hero">
          <span className="eyebrow">You're all set</span>
          <h1>You're in — no intro needed.</h1>
          <p>The {product} team will reach out with their first question by {reachWord} when they have one. You're a feedback partner from your very first reply. Want to do the intro after all? <button type="button" className="jn-back" onClick={() => setIntroSkipped(false)}>It's still here.</button></p>
        </section>
      )}

      <section className="jn-block jn-account">
        <h2>Your {product} design-partner account</h2>
        {!accountDone ? (
          <>
            <p className="jn-block-lead">Register an account with <b>Observant</b>, the user learning platform, to manage your design-partner status with {product} — your perks, your contact preferences, and your say in the roadmap.</p>
            <div className="jn-account-form">
              <input
                className="input"
                type="email"
                value={accountEmail}
                placeholder="you@example.com"
                onChange={(e) => setAccountEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && accountEmail.includes("@")) setAccountDone(true); }}
              />
              <Btn variant="primary" size="sm" disabled={!accountEmail.includes("@")} onClick={() => setAccountDone(true)}>Register</Btn>
            </div>
          </>
        ) : (
          <p className="jn-account-done"><Icon name="check" size={15} sw={2.4} /> You're set — we've sent a sign-in link to {accountEmail}. Your {product} design-partner perks and preferences will be waiting there.</p>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<JoinApp />);
