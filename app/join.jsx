/* ============================================================
   OBSERVANT magic-link experience — what a user sees when they
   open the invite link a team sent them.
   Participant-facing: the page speaks in the cliednt's brand,
   with Observant as the feedback partner running the program.
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
  // B2B partnership benefit (single Design-partner tier) — replaces cash/minutes.
  let partnerBenefit = "5% discount + early access";
  let channels = (params.get("channels") || "").split(",").map((c) => c.trim()).filter((c) => ["email", "telegram"].includes(c));
  let route = ["offproduct", "inproduct"].includes(params.get("route")) ? params.get("route") : "";
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const state = JSON.parse(raw);
      if (!product && state.workspace && state.workspace.companyName) product = state.workspace.companyName;
      if (state.setup && state.setup.rate) rate = Number(state.setup.rate) || 2;
      if (state.setup && state.setup.tierRewards && state.setup.tierRewards.bronze) partnerBenefit = state.setup.tierRewards.bronze;
      if (!channels.length && state.setup && state.setup.surfaces) {
        channels = ["email", "telegram"].filter((c) => state.setup.surfaces[c]);
      }
      if (!route && state.setup && state.setup.route) route = state.setup.route;
    }
  } catch (err) { /* stale local state never blocks the invite */ }
  return {
    product: product || "Northwind",
    rate,
    partnerBenefit,
    channels: channels.length ? channels : ["email", "telegram"],
    route: route || "offproduct",
  };
}

function JoinApp() {
  const { product, rate, partnerBenefit, channels, route } = jnContext();
  const [phase, setPhase] = useStateJN("invite");
  const [channel, setChannel] = useStateJN("");
  const [contactEmail, setContactEmail] = useStateJN("");
  const [cadence, setCadence] = useStateJN("occasional");
  // In-product programs have no contact-preference step — the conversation
  // lives inside the product. Off-product is where the user picks a channel.
  const onJoin = route === "inproduct"
    ? () => { setChannel("inproduct"); setPhase("joined"); }
    : () => setPhase("choose");

  return (
    <div className="jn-page">
      <header className="jn-top">
        <span className="jn-brand">{product} <em>· feedback partner program</em></span>
        <span className="jn-powered">run by <Wordmark size="1.05rem" /></span>
      </header>

      <JoinProgress phase={phase} route={route} />

      {phase === "invite" && <JoinInvite product={product} partnerBenefit={partnerBenefit} channels={channels} route={route} onJoin={onJoin} />}
      {phase === "choose" && <JoinChoose product={product} channels={channels} onConnect={(picked, contact, cad) => { setChannel(picked); setContactEmail(contact || ""); setCadence(cad || "occasional"); setPhase("joined"); }} />}
      {phase === "joined" && <JoinWelcome product={product} channel={channel} contactEmail={contactEmail} cadence={cadence} />}

      <footer className="jn-foot">
        <p>Run by <b>Observant</b> on behalf of the {product} team. Opt out anytime, in one tap.</p>
      </footer>
    </div>
  );
}

function JoinProgress({ phase, route }) {
  const steps = route === "inproduct" ? ["Join", "Get started"] : ["Join", "Choose channel", "Get started"];
  const current = phase === "invite" ? 0 : (route === "inproduct" ? 1 : (phase === "choose" ? 1 : 2));
  return (
    <ol className="jn-progress" aria-label="Sign-up progress">
      {steps.map((label, i) => (
        <li key={label} className={"jn-progress-step" + (i < current ? " done" : i === current ? " on" : "")}>
          <span className="jn-progress-dot">{i < current ? <Icon name="check" size={12} sw={3} /> : i + 1}</span>
          <span className="jn-progress-label">{label}</span>
        </li>
      ))}
    </ol>
  );
}

const JN_CADENCE = [
  { id: "open", t: "As often as helps", d: "Happy to hear from the team regularly." },
  { id: "occasional", t: "Every week or two", d: "A light, steady rhythm." },
  { id: "rare", t: "Only now and then", d: "Sparingly — and whenever I reach out myself." },
];

function JoinChoose({ product, channels, onConnect }) {
  const single = channels.length === 1;
  const [picked, setPicked] = useStateJN(single ? channels[0] : "");
  const [email, setEmail] = useStateJN("");
  const [cadence, setCadence] = useStateJN("occasional");
  const emailValid = email.includes("@") && email.includes(".");

  // Step 1 — pick the channel
  if (!picked) {
    return (
      <main className="jn-main">
        <section className="jn-hero">
          <span className="eyebrow">One last choice</span>
          <h1>Where should we reach you?</h1>
          <p>Pick one — this is where your one-on-one with the {product} team will live. You can switch channels later, and opt out anytime.</p>
        </section>
        <div className="jn-choice-grid">
          {channels.includes("email") && (
            <article className="jn-choice jn-choice-pick" role="button" tabIndex={0} onClick={() => setPicked("email")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked("email"); } }}>
              <span className="jn-choice-ic"><Icon name="mail" size={20} /></span>
              <b>Email</b>
              <p>Quiet and async — reply whenever you have five minutes.</p>
              <span className="jn-choice-go">Choose email <Icon name="arrow" size={14} /></span>
            </article>
          )}
          {channels.includes("telegram") && (
            <article className="jn-choice jn-choice-pick" role="button" tabIndex={0} onClick={() => setPicked("telegram")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPicked("telegram"); } }}>
              <span className="jn-choice-ic"><Icon name="chat" size={20} /></span>
              <b>Telegram</b>
              <p>A private chat with the Observant bot — replying feels like texting a friend.</p>
              <span className="jn-choice-go">Choose Telegram <Icon name="arrow" size={14} /></span>
            </article>
          )}
        </div>
        <p className="jn-choice-note">Whichever you pick, that's all we know you by — your email or your Telegram handle. No other personal data changes hands.</p>
      </main>
    );
  }

  // Step 2 — next step for the chosen channel
  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">{picked === "email" ? "Email" : "Telegram"}</span>
        <h1>{picked === "email" ? "Join by email." : "Connect on Telegram."}</h1>
        <p>This is where your one-on-one with the {product} team will live.{!single && <> <button type="button" className="jn-back" onClick={() => setPicked("")}>← pick a different way</button></>}</p>
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

      {picked === "email" ? (
        <div className="jn-next">
          <input className="input" type="email" value={email} placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && emailValid) onConnect("email", email, cadence); }} />
          <Btn variant="primary" size="lg" disabled={!emailValid} onClick={() => onConnect("email", email, cadence)}>Join by email</Btn>
        </div>
      ) : (
        <div className="jn-next">
          <p className="jn-choice-hint">Opens Telegram and starts your private 1:1.</p>
          <Btn variant="primary" size="lg" onClick={() => onConnect("telegram", "", cadence)}>Connect Telegram</Btn>
        </div>
      )}
      <p className="jn-choice-note">That's all we know you by — no other personal data changes hands.</p>
    </main>
  );
}

function JoinInvite({ product, partnerBenefit, channels, route, onJoin }) {
  const benefit = partnerBenefit || "5% discount + early access";
  const channelPhrase = channels.map((c) => c === "telegram" ? "Telegram" : "email").join(" or ");
  const reachLine = route === "inproduct"
    ? <>It reaches you right inside {product}, at the moment you're using it</>
    : <>You choose where it reaches you — {channelPhrase}</>;
  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">You're invited</span>
        <h1>Help shape {product}.</h1>
        <p>The team at <b>{product}</b> is inviting a small group of their most engaged users to become <b>design partners</b>. They're building {product} around the people who actually use it — so from time to time, they'd love a quick one-on-one with you about how it really works in your hands. As a design partner, your team gets {benefit} and a real say in the roadmap.</p>
      </section>

      <section className="jn-block">
        <h2>How it works</h2>
        <ol className="jn-steps">
          <li>
            <b>Opt in, then a quick hello</b>
            <p>Joining takes a minute, then a short ~10-minute intro chat so the {product} team gets to know how you actually use it — that way everything they ask later is tailored to you. Pause or leave anytime.</p>
          </li>
          <li>
            <b>Quick one-on-ones, on your time</b>
            <p>Usually a few messages or a short voice chat with the {product} team's AI interviewer; once in a while, the product folks themselves may ask for a live video call. {reachLine}, and you say yes or no each time — it remembers your context, so you never repeat yourself.</p>
          </li>
          <li>
            <b>A real say — and a line that's always open</b>
            <p>Being a design partner means you help steer what {product} builds next. It's a two-way line, too: message the team anytime something goes wrong or you want to share feedback, not just when they ask.</p>
          </li>
        </ol>
      </section>

      <section className="jn-block">
        <h2>What you get</h2>
        <p className="jn-block-lead">This is about the relationship, not a payout.</p>
        <div className="jn-rate-card">
          <b>Design partner — {benefit}</b>
          <p>As a {product} design partner, your team gets {benefit}, plus a real say in the roadmap — the team builds around what you tell them.</p>
          <p className="jn-rate-perks">And for long-time partners: the {product} team may invite you to extra perks — in-person events, early access, time with the founding team.</p>
        </div>
      </section>

      <section className="jn-cta">
        <Btn variant="primary" size="lg" onClick={onJoin}>Join as a feedback partner <Icon name="arrow" size={16} /></Btn>
      </section>

      <section className="jn-block jn-faq">
        <h2>Common questions</h2>
        <details>
          <summary>Who is Observant, and why am I hearing from them?</summary>
          <p>Observant is {product}'s feedback partner — it runs these one-on-one conversations and the reward tracking on {product}'s behalf. {route === "inproduct" ? "You'll hear from Observant right inside " + product + " while you're using it." : "So the emails or Telegram messages asking about " + product + " will come from Observant."} The invitation comes from {product}; the conversations are run by Observant, for the {product} team only.</p>
        </details>
        <details>
          <summary>What do I get out of it?</summary>
          <p>As a {product} design partner, your team gets {benefit} and a real say in what they build next. You're always in control of when and how much you participate, and the team builds around what you actually tell them.</p>
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

function JoinWelcome({ product, channel, contactEmail, cadence }) {
  const [accountEmail, setAccountEmail] = useStateJN(contactEmail || "");
  const [accountDone, setAccountDone] = useStateJN(false);
  const [introSkipped, setIntroSkipped] = useStateJN(false);
  const reachWord = channel === "telegram" ? "Telegram" : channel === "inproduct" ? "right inside " + product : "email";
  const cadenceWord = cadence === "open" ? "as often as it helps" : cadence === "rare" ? "only now and then" : "about every week or two";

  return (
    <main className="jn-main">
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
          <p>The {product} team will reach out with their first question by {reachWord} when they have one. You're a design partner from your very first reply. Want to do the intro after all? <button type="button" className="jn-back" onClick={() => setIntroSkipped(false)}>It's still here.</button></p>
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
