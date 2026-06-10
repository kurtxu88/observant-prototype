/* ============================================================
   OBSERVANT magic-link experience — what a user sees when they
   open the invite link a team sent them.
   Participant-facing: the page speaks in the client's brand,
   with Observant as the feedback partner running the program.
   ============================================================ */
const { useState: useStateJN } = React;

const JN_TIERS = [
  {
    id: "bronze", name: "Bronze", min: 30, cash: 30, color: "gold",
    reward: "$30 gift card",
    note: "A couple of quick chats gets you here.",
  },
  {
    id: "silver", name: "Silver", min: 100, cash: 90, color: "teal",
    reward: "6 months free subscription",
    note: "For regulars who check in over time.",
  },
  {
    id: "gold", name: "Gold", min: 200, cash: 150, color: "rust",
    reward: "In-person event invite, early access & perks",
    note: "The inner circle — first to see what's next.",
  },
];

function jnContext() {
  const params = new URLSearchParams(window.location.search);
  let product = (params.get("product") || "").trim();
  // Pretty URLs (observant.link/northwind, /join/northwind) carry the slug in the
  // path — rewrites serve this page, but the browser URL keeps no query string.
  if (!product) {
    const match = window.location.pathname.match(/^\/(?:join\/)?([a-z0-9][a-z0-9-]*)\/?$/i);
    if (match && !["join", "app", "docs", "observant", "api"].includes(match[1].toLowerCase())) product = match[1];
  }
  // Slugs become presentable names.
  if (/^[a-z0-9][a-z0-9-]*$/.test(product)) {
    product = product.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  }
  let tiers = JN_TIERS;
  let channels = (params.get("channels") || "").split(",").map((c) => c.trim()).filter((c) => ["email", "telegram"].includes(c));
  let route = ["offproduct", "inproduct"].includes(params.get("route")) ? params.get("route") : "";
  let question = "";
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const state = JSON.parse(raw);
      if (!product && state.workspace && state.workspace.companyName) product = state.workspace.companyName;
      if (state.workspace && state.workspace.learningGoal) question = state.workspace.learningGoal;
      if (state.setup && state.setup.tierRewards) {
        tiers = JN_TIERS.map((tier) => ({ ...tier, reward: state.setup.tierRewards[tier.id] || tier.reward }));
      }
      if (!channels.length && state.setup && state.setup.surfaces) {
        channels = ["email", "telegram"].filter((c) => state.setup.surfaces[c]);
      }
      if (!route && state.setup && state.setup.route) route = state.setup.route;
    }
  } catch (err) { /* stale local state never blocks the invite */ }
  return {
    product: product || "Northwind",
    tiers,
    channels: channels.length ? channels : ["email", "telegram"],
    route: route || "offproduct",
    question,
  };
}

function JoinApp() {
  const { product, tiers, channels, route, question } = jnContext();
  const [phase, setPhase] = useStateJN("invite");
  const [channel, setChannel] = useStateJN("");
  const [contactEmail, setContactEmail] = useStateJN("");
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

      {phase === "invite" && <JoinInvite product={product} tiers={tiers} channels={channels} route={route} onJoin={onJoin} />}
      {phase === "choose" && <JoinChoose product={product} channels={channels} onConnect={(picked, contact) => { setChannel(picked); setContactEmail(contact || ""); setPhase("joined"); }} />}
      {phase === "joined" && <JoinWelcome product={product} channel={channel} question={question} contactEmail={contactEmail} />}

      <footer className="jn-foot">
        <p>Run by <b>Observant</b> on behalf of the {product} team. Opt out anytime, in one tap.</p>
      </footer>
    </div>
  );
}

function JoinChoose({ product, channels, onConnect }) {
  const [email, setEmail] = useStateJN("");
  const emailValid = email.includes("@") && email.includes(".");
  const single = channels.length === 1;

  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">One last choice</span>
        <h1>{single ? (channels[0] === "email" ? "Join by email." : "Connect on Telegram.") : "Where should we reach you?"}</h1>
        <p>{single ? "This is where your one-on-one with the " + product + " team will live." : "Pick one — this is where your one-on-one with the " + product + " team will live."} You can switch channels later, and opt out anytime.</p>
      </section>

      <div className={"jn-choice-grid" + (single ? " single" : "")}>
        {channels.includes("email") && (
          <article className="jn-choice">
            <span className="jn-choice-ic"><Icon name="mail" size={20} /></span>
            <b>Email</b>
            <p>Quiet and async — reply whenever you have five minutes. We'll only ever use this address for your 1:1.</p>
            <input
              className="input"
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && emailValid) onConnect("email", email); }}
            />
            <Btn variant="primary" size="sm" disabled={!emailValid} onClick={() => onConnect("email", email)}>Join by email</Btn>
          </article>
        )}

        {channels.includes("telegram") && (
          <article className="jn-choice">
            <span className="jn-choice-ic"><Icon name="chat" size={20} /></span>
            <b>Telegram</b>
            <p>A private chat with the Observant bot — one tap to connect, and replying feels like texting a friend.</p>
            <p className="jn-choice-hint">Opens Telegram and starts your private 1:1.</p>
            <Btn variant="primary" size="sm" onClick={() => onConnect("telegram")}>Connect Telegram</Btn>
          </article>
        )}
      </div>

      <p className="jn-choice-note">{single ? "That's all we know you by — no other personal data changes hands." : "Whichever you pick, that's all we know you by — your email or your Telegram handle. No other personal data changes hands."}</p>
    </main>
  );
}

function JoinInvite({ product, tiers, channels, route, onJoin }) {
  const channelPhrase = channels.map((c) => c === "telegram" ? "Telegram" : "email").join(" or ");
  const reachLine = route === "inproduct"
    ? <>It reaches you right inside {product}, at the moment you're using it</>
    : <>You choose where it reaches you — {channelPhrase}</>;
  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">You're invited</span>
        <h1>Help shape {product}.</h1>
        <p>The team at <b>{product}</b> is inviting a small group of their most engaged users to become <b>feedback partners</b>. They're building {product} around the people who actually use it — so from time to time, they'd love a quick one-on-one with you about how it really works in your hands. You earn rewards for your time, tracked automatically.</p>
      </section>

      <section className="jn-block">
        <h2>How it works</h2>
        <ol className="jn-steps">
          <li>
            <b>Opt in once</b>
            <p>Joining takes a minute. You can pause or leave anytime — one tap, no questions.</p>
          </li>
          <li>
            <b>Quick one-on-ones, on your time</b>
            <p>Every conversation is private — just you and the {product} team's interviewer. Sometimes it's a couple of messages, sometimes a short voice chat, occasionally a longer call. {reachLine} — and it remembers your context, so you never repeat yourself.</p>
          </li>
          <li>
            <b>Earn as you go</b>
            <p>Every minute you participate counts — text replies, voice chats, and calls alike. Your minutes are tracked and audited automatically. You never log anything.</p>
          </li>
        </ol>
      </section>

      <section className="jn-block">
        <h2>Your rewards</h2>
        <p className="jn-block-lead">Minutes add up like a balance — redeem as you go, cash out anytime, or hold for a higher tier.</p>
        <div className="jn-tier-grid">
          {tiers.map((tier) => (
            <article className="jn-tier" key={tier.id}>
              <div className="jn-tier-head">
                <Avatar name={tier.name} color={tier.color} cls="ss-tier-badge" />
                <div><b>{tier.name}</b><span>{tier.min} participated minutes · ≈ ${tier.cash} cash value</span></div>
              </div>
              <p className="jn-tier-reward">{tier.reward}</p>
              <p className="jn-tier-note">{tier.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="jn-cta">
        <Btn variant="primary" size="lg" onClick={onJoin}>Join as a feedback partner <Icon name="arrow" size={16} /></Btn>
        <span>Takes about a minute. Opt out anytime.</span>
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
          <summary>How do I redeem them?</summary>
          <p>Like a gift card balance: claim smaller rewards often, or hold your balance and wait for a bigger one. You can cash out anytime.</p>
        </details>
        <details>
          <summary>What about my privacy?</summary>
          <p>Every conversation is a private 1:1 — never a group or a public channel. {route === "inproduct" ? "You're identified only by an anonymous ID inside " + product + "." : "The only thing identifying you is the email or handle you opt in with."} Skip any question, snooze the program, or opt out entirely — anytime, in one tap.</p>
        </details>
        <details>
          <summary>What's the Gold tier?</summary>
          <p>Gold is the inner circle — {(tiers[2] && tiers[2].reward) || "in-person event invites, early access & perks"}, for partners who've participated {(tiers[2] && tiers[2].min) || 200}+ minutes. First to see what's next.</p>
        </details>
        <details>
          <summary>Who sees my responses?</summary>
          <p>Your feedback goes to the founders and product people at {product} — not into a database that gets kept or sold.</p>
        </details>
      </section>
    </main>
  );
}

function JoinWelcome({ product, channel, question, contactEmail }) {
  const [accountEmail, setAccountEmail] = useStateJN(contactEmail || "");
  const [accountDone, setAccountDone] = useStateJN(false);
  const opener = channel === "inproduct"
    ? "Hi! I'm the " + product + " team's interviewer — great to have you. First, no schedules here: I'll only check in occasionally, right inside " + product + " while you're using it, and you reply whenever suits you."
    : "Hi! I'm the " + product + " team's interviewer — great to have you. First, no schedules here: I'll only check in occasionally over " + (channel === "telegram" ? "Telegram" : "email") + ", and you reply whenever suits you.";
  const firstQuestion = question
    ? "To start us off, the team's curious: " + question.trim().replace(/\.?$/, question.trim().endsWith("?") ? "" : "?")
    : "To start us off — what made you give " + product + " a try in the first place?";
  const [messages, setMessages] = useStateJN([
    { t: "them", text: opener, meta: "Observant, for the " + product + " team" },
    { t: "them", text: firstQuestion, meta: "Observant" },
  ]);
  const [draft, setDraft] = useStateJN("");
  const minutes = messages.filter((message) => message.t === "user").length;

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setMessages((current) => [
      ...current,
      { t: "user", text, meta: "You" },
      { t: "them", text: "That's exactly the kind of context the team is looking for — noted, and it counts toward your minutes. I'll follow up in a few days; feel free to drop me anything that bugs or delights you in the meantime.", meta: "Observant" },
    ]);
  };

  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">You're in</span>
        <h1>Welcome to the {product} feedback partner program.</h1>
        <p>{channel === "inproduct" ? "The first check-in will find you inside " + product + " — most take just a few minutes." : "Watch for the first check-in soon — most take just a few minutes."} Your minutes and rewards are tracked automatically from the very first reply.</p>
      </section>

      <section className="jn-block">
        <h2>Here's how a conversation feels</h2>
        <p className="jn-block-lead">Try it — type anything below.</p>
        <div className="jn-chat">
          <div className="jn-chat-meter"><Icon name="clock" size={14} /> {minutes} participated {minutes === 1 ? "minute" : "minutes"} · Bronze at 30 min</div>
          <div className="jn-chat-body">
            {messages.map((message, index) => (
              <div className={"ss-chat-msg " + message.t} key={index}>
                <div>{message.text}</div>
                <span>{message.meta}</span>
              </div>
            ))}
          </div>
          <div className="jn-chat-input">
            <input
              className="input"
              value={draft}
              placeholder="Type a reply…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            />
            <Btn variant="primary" size="sm" onClick={send} disabled={!draft.trim()}>Send</Btn>
          </div>
        </div>
      </section>

      <section className="jn-block jn-account">
        <h2>One last thing — your rewards</h2>
        {!accountDone ? (
          <>
            <p className="jn-block-lead">Set up your Observant account to see your minutes add up and claim rewards whenever you like.</p>
            <div className="jn-account-form">
              <input
                className="input"
                type="email"
                value={accountEmail}
                placeholder="you@example.com"
                onChange={(e) => setAccountEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && accountEmail.includes("@")) setAccountDone(true); }}
              />
              <Btn variant="primary" size="sm" disabled={!accountEmail.includes("@")} onClick={() => setAccountDone(true)}>Set up my account</Btn>
            </div>
          </>
        ) : (
          <p className="jn-account-done"><Icon name="check" size={15} sw={2.4} /> You're set — we've sent a sign-in link to {accountEmail}. Your minutes and rewards will be waiting there.</p>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<JoinApp />);
