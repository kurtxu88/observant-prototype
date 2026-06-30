/* ============================================================
   OBSERVANT magic-link experience — what a user sees when they
   open the invite link a team sent them.
   Participant-facing: the page speaks in the cliednt's brand,
   with Observant as the feedback partner running the program.
   ============================================================ */
const { useState: useStateJN } = React;

// ── Telegram bot ──────────────────────────────────────────────────────────
// The bot a partner opens to start their 1:1 over Telegram.
// ⚠️ XUAN: set this to the real bot username from @BotFather (without the @).
// Placeholder until then — see api/telegram/README.md.
const OBSERVANT_BOT = "OBSERVANT_BOT";

// Build the t.me deep link. The `start` payload carries the program so the
// webhook (api/telegram/webhook.js) can link the chat to the right program.
// Telegram caps the start param at 64 chars and allows only [A-Za-z0-9_-]:
// we try a compact base64url(JSON) (keeps product name + rate) and fall back
// to the bare slug when that would overflow. Both decode server-side.
function tgStartPayload(product, rate) {
  const slug = String(product || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  try {
    const json = JSON.stringify({ slug, productName: product, rate: Number(rate) || 2 });
    const b64 = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (b64.length <= 64 && /^[A-Za-z0-9_-]+$/.test(b64)) return b64;
  } catch (_e) { /* fall through to bare slug */ }
  return slug;
}
function tgDeepLink(product, rate) {
  return "https://t.me/" + OBSERVANT_BOT + "?start=" + encodeURIComponent(tgStartPayload(product, rate));
}

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
  let channels = (params.get("channels") || "").split(",").map((c) => c.trim()).filter((c) => ["email", "telegram"].includes(c));
  let route = ["offproduct", "inproduct"].includes(params.get("route")) ? params.get("route") : "";
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const state = JSON.parse(raw);
      if (!product && state.workspace && state.workspace.companyName) product = state.workspace.companyName;
      if (state.setup && state.setup.rate) rate = Number(state.setup.rate) || 2;
      if (!channels.length && state.setup && state.setup.surfaces) {
        channels = ["email", "telegram"].filter((c) => state.setup.surfaces[c]);
      }
      if (!route && state.setup && state.setup.route) route = state.setup.route;
    }
  } catch (err) { /* stale local state never blocks the invite */ }
  return {
    product: product || "Northwind",
    rate,
    channels: channels.length ? channels : ["email", "telegram"],
    route: route || "offproduct",
  };
}

function JoinApp() {
  const { product, rate, channels, route } = jnContext();
  const [phase, setPhase] = useStateJN("invite");
  const [channel, setChannel] = useStateJN("");
  const [contactEmail, setContactEmail] = useStateJN("");
  const [cadence, setCadence] = useStateJN("occasional");
  const slug = product.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  // Records the opt-in server-side (#2). Fire-and-forget — the endpoint no-ops
  // gracefully until the DB is wired, so it never blocks the join.
  const persistJoin = (ch, contact, cad) => {
    try {
      fetch("/api/selfserve/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, productName: product, rate, channel: ch, contact: contact || "", cadence: cad || "occasional" }),
      }).catch(() => {});
    } catch (_e) { /* never block the opt-in */ }
  };
  // In-product programs have no contact-preference step — the conversation
  // lives inside the product. Off-product is where the user picks a channel.
  const onJoin = route === "inproduct"
    ? () => { persistJoin("inproduct", "", "occasional"); setChannel("inproduct"); setPhase("joined"); }
    : () => setPhase("choose");

  return (
    <div className="jn-page">
      <header className="jn-top">
        <span className="jn-brand">{product} <em>· feedback partner program</em></span>
        <span className="jn-powered">run by <Wordmark size="1.05rem" /></span>
      </header>

      <JoinProgress phase={phase} route={route} />

      {phase === "invite" && <JoinInvite product={product} rate={rate} channels={channels} route={route} onJoin={onJoin} />}
      {phase === "choose" && <JoinChoose product={product} channels={channels} tgLink={tgDeepLink(product, rate)} onConnect={(picked, contact, cad) => { persistJoin(picked, contact, cad); setChannel(picked); setContactEmail(contact || ""); setCadence(cad || "occasional"); setPhase("joined"); }} />}
      {phase === "joined" && <JoinWelcome product={product} slug={slug} channel={channel} contactEmail={contactEmail} cadence={cadence} />}

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
  { id: "open", t: "As often as this helps" },
  { id: "occasional", t: "Every week or two" },
  { id: "rare", t: "Only now and then" },
];

function JoinChoose({ product, channels, tgLink, onConnect }) {
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
              <p>Quiet and async.</p>
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
              <b>{c.t}</b>
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
          <p className="jn-choice-hint">Opens Telegram and starts your private 1:1 with the Observant bot.</p>
          <a
            className="btn btn-primary btn-lg"
            href={tgLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onConnect("telegram", "", cadence)}
          >Connect Telegram</a>
        </div>
      )}
      <p className="jn-choice-note">That's all we know you by — no other personal data changes hands.</p>
    </main>
  );
}

function JoinInvite({ product, rate, channels, route, onJoin }) {
  const channelPhrase = channels.map((c) => c === "telegram" ? "Telegram" : "email").join(" or ");
  const reachLine = route === "inproduct"
    ? <>It reaches you right inside {product}, at the moment you're using it</>
    : <>You choose how to hear from {product} — {channelPhrase}</>;
  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">You're invited</span>
        <h1>Help shape {product}.</h1>
        <p>The team at <b>{product}</b> is inviting a small group of their most engaged users to become <b>feedback partners</b>. You earn rewards for your time, tracked automatically.</p>
      </section>

      <section className="jn-block">
        <h2>How it works</h2>
        <ol className="jn-steps">
          <li>
            <b>Opt in, then a quick hello</b>
            <p>Joining takes a minute, then a short ~10-minute intro chat so the {product} team gets to know how you actually use it. Everything they ask later is tailored to you.</p>
          </li>
          <li>
            <b>Quick one-on-ones, on your time</b>
            <p>Usually a few messages or a short video chat. {reachLine}, and you say yes or no each time. It remembers your context, so you never repeat yourself.</p>
          </li>
          <li>
            <b>Earn as you go — and reach out anytime</b>
            <p>Every minute you participate counts — email replies, voice chats — tracked and audited automatically. It's a two-way line, too: you can message the team anytime with feedback you want to share.</p>
          </li>
        </ol>
      </section>

      <section className="jn-block">
        <h2>Your rewards</h2>
        <p className="jn-block-lead">Minutes add up like a balance — redeem as you go, whenever you like.</p>
        <div className="jn-rate-card">
          <b>${rate} per participating minute</b>
          <p>Your balance works like a gift card — claim small amounts often, or save it up.</p>
          <p className="jn-rate-perks">For long-time partners, the {product} team may invite you to extra perks — in-person events, early access, time with the founding team.</p>
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
          <summary>How do I earn rewards?</summary>
          <p>Your participated minutes accumulate every time you answer a chat or an email — or join a voice interview, if you happen to have a bigger block of time. You're always in control of when and how much you participate. Your minutes are tracked and audited automatically, and they're what you redeem rewards with.</p>
        </details>
        <details>
          <summary>How do I redeem my rewards?</summary>
          <p>Once you register an account with Observant, you can log in anytime to track your participated minutes as they add up. Rewards work like a gift card balance — claim smaller amounts often, or hold your balance for a bigger one. You cash out directly on Observant, anytime.</p>
        </details>
        <details>
          <summary>What about my privacy — who sees my responses?</summary>
          <p>Your feedback belongs to {product}. Their team has access to it — they're the ones asking — and everything is anonymized for their data-analysis purposes. It doesn't go into a database that anyone else keeps or sells. You can skip any question, or opt out entirely, anytime.</p>
        </details>
        <details>
          <summary>Is there anything beyond the cash?</summary>
          <p>Often, yes. Teams usually invite their long-time active partners to extras — in-person events or festivals (think Robinhood-style media events), conferences, early access, and time with the founding team. The {product} team decides who and when.</p>
        </details>
      </section>
    </main>
  );
}

function JoinWelcome({ product, slug, channel, contactEmail, cadence }) {
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
            <li><b>You earn for it.</b> The intro counts like any other time — your minutes and rewards are tracked from your very first reply.</li>
          </ul>
          <div className="jn-intro-actions">
            <a className="btn btn-primary btn-lg" href={"/app/IntroCall.html?product=" + encodeURIComponent(product) + (slug ? "&slug=" + encodeURIComponent(slug) : "") + (contactEmail ? "&contact=" + encodeURIComponent(contactEmail) : "")}>Start the 10-minute intro <Icon name="arrow" size={16} /></a>
            <button type="button" className="jn-skip" onClick={() => setIntroSkipped(true)}>Skip for now</button>
          </div>
        </section>
      ) : (
        <section className="jn-hero">
          <span className="eyebrow">You're all set</span>
          <h1>You're in — no intro needed.</h1>
          <p>The {product} team will reach out with their first question by {reachWord} when they have one. Your minutes and rewards are tracked automatically from your very first reply. Want to do the intro after all? <button type="button" className="jn-back" onClick={() => setIntroSkipped(false)}>It's still here.</button></p>
        </section>
      )}

      <section className="jn-block jn-account">
        <h2>Track your {product} rewards</h2>
        {!accountDone ? (
          <>
            <p className="jn-block-lead">Register an account with <b>Observant</b>, the user learning platform, to see your participated minutes add up and claim your {product} rewards whenever you like.</p>
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
          <p className="jn-account-done"><Icon name="check" size={15} sw={2.4} /> You're set — we've sent a sign-in link to {accountEmail}. Your minutes and {product} rewards will be waiting there.</p>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<JoinApp />);
