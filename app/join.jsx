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
  let tiers = JN_TIERS;
  try {
    const raw = localStorage.getItem("observant.selfserve.v1");
    if (raw) {
      const state = JSON.parse(raw);
      if (!product && state.workspace && state.workspace.companyName) product = state.workspace.companyName;
      if (state.setup && state.setup.tierRewards) {
        tiers = JN_TIERS.map((tier) => ({ ...tier, reward: state.setup.tierRewards[tier.id] || tier.reward }));
      }
    }
  } catch (err) { /* stale local state never blocks the invite */ }
  return { product: product || "Northwind", tiers };
}

function JoinApp() {
  const { product, tiers } = jnContext();
  const [joined, setJoined] = useStateJN(false);

  return (
    <div className="jn-page">
      <header className="jn-top">
        <span className="jn-brand">{product} <em>· feedback partner program</em></span>
        <span className="jn-powered">run by <Wordmark size="1.05rem" /></span>
      </header>

      {!joined ? <JoinInvite product={product} tiers={tiers} onJoin={() => setJoined(true)} /> : <JoinWelcome product={product} />}

      <footer className="jn-foot">
        <p>This program is run by <b>Observant</b> on behalf of the {product} team — secure conversations, accurate notes, and automatic reward tracking. You can opt out anytime, in one tap, and your conversations are never shared outside the {product} team.</p>
      </footer>
    </div>
  );
}

function JoinInvite({ product, tiers, onJoin }) {
  return (
    <main className="jn-main">
      <section className="jn-hero">
        <span className="eyebrow">You're invited</span>
        <h1>Help shape {product}.</h1>
        <p>The team at <b>{product}</b> is inviting a small group of their most engaged users to become <b>feedback partners</b> — a direct line to the people building the product you use. You show them how {product} really works for you; they use it to build. You earn rewards for your time, automatically.</p>
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
            <p>Every conversation is private — just you and the {product} team's interviewer. Sometimes it's a couple of messages, sometimes a short voice chat, occasionally a longer call. It reaches you where you already are — email, Slack, Discord, or right inside {product} — and it remembers your context, so you never repeat yourself.</p>
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

      <section className="jn-block jn-privacy">
        <h2>The fine print, up front</h2>
        <ul>
          <li><b>Why Observant?</b> {product} uses Observant so your feedback is captured accurately and your privacy is protected — Observant runs the conversations and the reward tracking; the {product} team focuses on building.</li>
          <li><b>A real direct line.</b> What you share goes to the founders and product people at {product} — not into a survey database.</li>
          <li><b>You're in control.</b> Conversations are 1:1 and private. Skip any question, snooze the program, or opt out entirely — anytime, in one tap.</li>
        </ul>
      </section>

      <section className="jn-cta">
        <Btn variant="primary" size="lg" onClick={onJoin}>Join as a feedback partner <Icon name="arrow" size={16} /></Btn>
        <span>Takes about a minute. Opt out anytime.</span>
      </section>
    </main>
  );
}

function JoinWelcome({ product }) {
  const [messages, setMessages] = useStateJN([
    { t: "them", text: "Hi! I'm the " + product + " team's interviewer — great to have you. First, no schedules here: I'll only check in occasionally, and you reply whenever suits you.", meta: "Observant, for the " + product + " team" },
    { t: "them", text: "To start us off — what made you give " + product + " a try in the first place?", meta: "Observant" },
  ]);
  const [draft, setDraft] = useStateJN("");

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
        <p>Watch your inbox — the first check-in arrives soon, and most take just a few minutes. Your minutes and rewards are tracked automatically from the very first reply.</p>
      </section>

      <section className="jn-block">
        <h2>Here's how a conversation feels</h2>
        <p className="jn-block-lead">Try it — type anything below.</p>
        <div className="jn-chat">
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
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<JoinApp />);
