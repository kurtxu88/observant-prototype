/* OBSERVANT surface — Channels (Slack + MCP + Settings/Context).
   Where the learning comes to her: Ask Observant in Slack (grounded answer,
   weekly digest, @observant relays a question into live 1:1s), the MCP endpoint
   so Claude Code/Cursor pull what users SAID mid-task + the out-of-app arrival
   card, and the light Settings/Context layer (install/identify status, connected
   channels, the consent/data-handling layer that explains its reasoning).
   Registers window.OBS_SURFACES.channels. Reads off `state` only (no new dataset).
   CSS prefix: obs-channels-  (all styles injected below, scoped, no collisions). */
(function () {
  window.OBS_SURFACES = window.OBS_SURFACES || {};
  const { useState } = React;

  const CSS = `
  .obs-channels-root { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
  .obs-channels-tabs { display: inline-flex; gap: .25rem; padding: .25rem; background: var(--surface, var(--panel)); border: 1px solid var(--border); border-radius: 12px; align-self: flex-start; }
  .obs-channels-tab { font-family: var(--font-mono); font-size: .72rem; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); background: none; border: none; padding: .45rem .8rem; border-radius: 9px; cursor: pointer; display: inline-flex; align-items: center; gap: .4rem; transition: all .18s; }
  .obs-channels-tab:hover { color: var(--text-secondary); }
  .obs-channels-tab.on { color: var(--accent); background: var(--accent-tint); box-shadow: inset 0 0 0 1px var(--accent-soft); }
  .obs-channels-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 1rem; }
  @media (max-width: 820px) { .obs-channels-grid { grid-template-columns: 1fr; } }
  .obs-channels-card-head { display: flex; align-items: center; gap: .5rem; margin-bottom: .7rem; color: var(--text-primary); }
  .obs-channels-card-head b { font-size: .95rem; }
  .obs-channels-card-head .obs-channels-pill { margin-left: auto; }
  .obs-channels-pill { font-family: var(--font-mono); font-size: .6rem; letter-spacing: .06em; text-transform: uppercase; padding: .22rem .5rem; border-radius: 100px; border: 1px solid var(--border); color: var(--text-muted); white-space: nowrap; }
  .obs-channels-pill.on { color: var(--success); background: var(--success-tint); border-color: var(--success-tint); }
  .obs-channels-pill.soon { color: var(--accent-hover); background: var(--accent-tint); border-color: var(--accent-soft); }
  .obs-channels-lead { color: var(--text-secondary); font-size: .9rem; margin: 0 0 .7rem; }
  .obs-channels-slack { display: flex; flex-direction: column; gap: .6rem; background: var(--canvas); border: 1px solid var(--border); border-radius: 12px; padding: .8rem; }
  .obs-channels-msg { display: flex; flex-direction: column; gap: .15rem; }
  .obs-channels-msg p { margin: 0; font-size: .88rem; line-height: 1.5; color: var(--text-primary); }
  .obs-channels-who { font-family: var(--font-mono); font-size: .62rem; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
  .obs-channels-msg.bot { border-left: 2px solid var(--accent-soft); padding-left: .65rem; }
  .obs-channels-msg.bot .obs-channels-who { color: var(--accent); }
  .obs-channels-cite { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .5rem; }
  .obs-channels-chip { display: inline-flex; align-items: center; gap: .3rem; font-size: .72rem; color: var(--text-secondary); background: var(--surface, var(--panel)); border: 1px solid var(--border); border-radius: 100px; padding: .18rem .5rem .18rem .22rem; }
  .obs-channels-chip .conv-ava, .obs-channels-chip .obs-channels-ava { width: 18px; height: 18px; font-size: .56rem; }
  .obs-channels-ava { display: inline-grid; place-items: center; border-radius: 50%; color: #fff; font-family: var(--font-mono); font-weight: 600; flex-shrink: 0; }
  .obs-channels-relay { margin-top: .9rem; border-top: 1px dashed var(--border); padding-top: .8rem; }
  .obs-channels-relay-row { display: flex; gap: .5rem; }
  .obs-channels-relay-row input { flex: 1; font: inherit; font-size: .86rem; padding: .5rem .65rem; border: 1px solid var(--border-strong); border-radius: 9px; background: var(--canvas); color: var(--text-primary); }
  .obs-channels-relay-row input:focus { outline: none; border-color: var(--accent); }
  .obs-channels-inflight { list-style: none; margin: .65rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .4rem; }
  .obs-channels-inflight li { display: flex; align-items: flex-start; gap: .45rem; font-size: .82rem; color: var(--text-secondary); background: var(--accent-tint); border: 1px solid var(--accent-soft); border-radius: 9px; padding: .45rem .6rem; }
  .obs-channels-inflight li b { color: var(--accent-hover); font-family: var(--font-mono); font-size: .58rem; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; padding-top: .12rem; }
  .obs-channels-cmd { display: flex; align-items: center; gap: .5rem; margin-top: .2rem; }
  .obs-channels-cmd code { flex: 1; font-family: var(--font-mono); font-size: .76rem; background: var(--accent-tint); color: var(--accent-hover); padding: .55rem .65rem; border-radius: 9px; overflow-x: auto; white-space: nowrap; }
  .obs-channels-copy { font-family: var(--font-mono); font-size: .62rem; letter-spacing: .05em; text-transform: uppercase; padding: .45rem .6rem; border: 1px solid var(--border-strong); border-radius: 9px; background: var(--canvas); color: var(--text-secondary); cursor: pointer; white-space: nowrap; }
  .obs-channels-copy:hover { border-color: var(--text-secondary); color: var(--text-primary); }
  .obs-channels-payload { list-style: none; margin: .7rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .55rem; }
  .obs-channels-quote { display: flex; gap: .55rem; }
  .obs-channels-quote-body p { margin: 0; font-size: .85rem; line-height: 1.45; color: var(--text-primary); }
  .obs-channels-quote-body p:before { content: "\\201C"; }
  .obs-channels-quote-body p:after { content: "\\201D"; }
  .obs-channels-quote-body span { font-family: var(--font-mono); font-size: .62rem; letter-spacing: .04em; text-transform: uppercase; color: var(--text-muted); }
  .obs-channels-arrival { display: flex; gap: .75rem; align-items: flex-start; background: var(--night, oklch(0.265 0.013 56)); color: oklch(0.94 0.012 75); border-radius: 14px; padding: .9rem 1rem; }
  .obs-channels-arrival .obs-channels-arrival-ico { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; background: oklch(0.99 0.01 70 / .12); color: oklch(0.92 0.04 50); flex-shrink: 0; }
  .obs-channels-arrival b { font-size: .9rem; }
  .obs-channels-arrival p { margin: .15rem 0 0; font-size: .82rem; line-height: 1.45; color: oklch(0.86 0.012 75); }
  .obs-channels-arrival em { font-family: var(--font-mono); font-style: normal; font-size: .6rem; letter-spacing: .06em; text-transform: uppercase; color: oklch(0.78 0.04 50); }
  .obs-channels-status-row { display: flex; flex-wrap: wrap; gap: .9rem 1.6rem; }
  .obs-channels-stat b { display: block; font-family: var(--font-display); font-size: 1.05rem; font-weight: 500; color: var(--text-primary); }
  .obs-channels-stat span { font-family: var(--font-mono); font-size: .62rem; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
  .obs-channels-chan { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .obs-channels-chan li { display: flex; align-items: center; gap: .6rem; padding: .6rem 0; border-bottom: 1px solid var(--border); font-size: .88rem; color: var(--text-primary); }
  .obs-channels-chan li:last-child { border-bottom: none; }
  .obs-channels-chan .obs-channels-chan-meta { margin-left: auto; font-size: .78rem; color: var(--text-muted); }
  .obs-channels-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--border-strong); }
  .obs-channels-dot.on { background: var(--success); box-shadow: 0 0 0 3px var(--success-tint); }
  .obs-channels-chan-toggle { margin-left: auto; font-family: var(--font-mono); font-size: .6rem; letter-spacing: .05em; text-transform: uppercase; padding: .35rem .55rem; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--canvas); color: var(--text-secondary); cursor: pointer; }
  .obs-channels-chan-toggle:hover { border-color: var(--accent); color: var(--accent); }
  .obs-channels-consent { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: .55rem; }
  .obs-channels-consent-row { border: 1px solid var(--border); border-radius: 11px; overflow: hidden; background: var(--canvas); }
  .obs-channels-consent-head { width: 100%; display: flex; align-items: center; gap: .6rem; padding: .7rem .8rem; background: none; border: none; cursor: pointer; text-align: left; color: var(--text-primary); }
  .obs-channels-consent-head b { font-size: .87rem; font-weight: 500; }
  .obs-channels-consent-head .obs-channels-consent-tag { margin-left: auto; font-family: var(--font-mono); font-size: .58rem; letter-spacing: .05em; text-transform: uppercase; color: var(--text-muted); }
  .obs-channels-consent-chev { transition: transform .2s; color: var(--text-muted); display: inline-flex; }
  .obs-channels-consent-row.open .obs-channels-consent-chev { transform: rotate(90deg); }
  .obs-channels-consent-why { padding: 0 .8rem .8rem 2.05rem; }
  .obs-channels-consent-why p { margin: 0; font-size: .84rem; line-height: 1.55; color: var(--text-secondary); }
  .obs-channels-consent-why .obs-channels-reason { display: block; margin-top: .45rem; font-size: .78rem; color: var(--text-muted); border-left: 2px solid var(--accent-soft); padding-left: .6rem; }
  .obs-channels-foot { font-size: .8rem; color: var(--text-muted); line-height: 1.5; }
  `;

  function ChannelsSurface(props) {
    const state = props.state || {};
    const ui = props.ui || window;
    const Icon = ui.Icon || window.Icon;
    const Avatar = ui.Avatar || window.Avatar;
    const PanelTitle = ui.PanelTitle || function (p) {
      return (
        <div className="ss-panel-title">
          <div><span>{p.k}</span><h2>{p.title}</h2></div>
          {p.status ? <em>{p.status}</em> : null}
        </div>
      );
    };

    const workspace = state.workspace || {};
    const product = (workspace.companyName || "Northwind").trim() || "Northwind";
    const people = state.people || [];
    const setup = state.setup || {};
    const surfaces = setup.surfaces || {};
    const digest = state.digest;
    const briefing = state.briefing;
    const qa = (state.slackQA || [])[0];
    const signals = state.signals || [];

    // names that the grounded Slack answer cites (the named existence-proofs)
    const citedIds = ["dana", "marcus", "owen"];
    const cited = citedIds
      .map((id) => people.find((pp) => pp.id === id))
      .filter(Boolean);

    // what Claude Code / Cursor pulls over MCP = what users SAID (verbatim), read off the roster
    const saidPayload = people
      .map((pp) => {
        const quote = (pp.profile && pp.profile.shared && pp.profile.shared[0]) || (pp.last ? "“" + pp.last + "”" : "");
        return quote ? { id: pp.id, name: pp.name, color: pp.color, segment: pp.segment, quote: quote } : null;
      })
      .filter(Boolean)
      .slice(0, 4);

    const [tab, setTab] = useState("slack");
    const [slackConnected, setSlackConnected] = useState(true);
    const [draft, setDraft] = useState("");
    const [inflight, setInflight] = useState([]);
    const [copied, setCopied] = useState(false);
    const [openRow, setOpenRow] = useState("hash");

    const mcpCmd = "claude mcp add observant https://api.observant.ai/mcp";

    const relay = () => {
      const q = draft.trim();
      if (!q) return;
      // target the live 1:1 lines this question best fits (the people with open threads)
      const target = cited[0] ? cited[0].name.split(" ")[0] + " + " + Math.max(cited.length - 1, 1) + " more" : "your open 1:1 lines";
      setInflight((cur) => [{ q: q, target: target }, ...cur]);
      setDraft("");
      if (typeof props.patchState === "function") {
        props.patchState((s) => ({
          ...s,
          activity: ["Relayed a question from Slack into live 1:1s: “" + q + "”", ...((s && s.activity) || [])],
        }));
      }
    };

    const copyCmd = () => {
      try { if (navigator.clipboard) navigator.clipboard.writeText(mcpCmd); } catch (e) {}
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    const installed = setup.route === "inproduct";
    const connectedCount =
      (surfaces.product ? 1 : 0) + (surfaces.email ? 1 : 0) + (surfaces.telegram ? 1 : 0) + (slackConnected ? 1 : 0) + 1; // +1 = MCP

    const consentRows = [
      {
        id: "hash",
        title: "Hashed identity",
        tag: "Default",
        body: "People are keyed by a one-way hash of the id you pass to identify() — never a raw name or email.",
        reason: "Reasoning: Observant needs a stable handle to keep a per-person living file across sessions, but never needs to know who the human actually is. Hashing gives continuity without ever holding PII.",
      },
      {
        id: "consent",
        title: "Per-conversation consent",
        tag: "Per decision",
        body: "Pulse (light, in-product, text, one round) runs under your existing privacy policy with a one-tap “what is this?” — no separate consent. A Deep dive (~10-min, recorded, or off-product) asks consent in the moment, every time.",
        reason: "Reasoning: a sentence typed while using the product isn’t research — it’s product feedback, trivially ignorable. The moment it becomes extensive, recorded, or reaches someone outside the product, it crosses the consent + pay line and asks first.",
      },
      {
        id: "retention",
        title: "Retention + right-to-forget",
        tag: "90 days",
        body: "Conversation transcripts retained 90 days; derived memory persists until you forget a person. One tap on any file erases that person and everything tied to them.",
        reason: "Reasoning: the moat is the living memory, not the raw transcript — so raw turns age out fast while the synthesized why stays. Forget is immediate and total because a partner who asks to leave should leave completely.",
      },
      {
        id: "raw",
        title: "Never holds raw user data",
        tag: "By construction",
        body: "Observant stores derived memory and the verbatim quotes you’ve already seen in a Signal. Raw PII, payment, or product data never leaves your product.",
        reason: "Reasoning: a learning product that quietly hoards its users’ raw data has a trust problem, not a feature. Holding only what surfaced into a Signal keeps the audit trail honest and the blast radius near zero.",
      },
    ];

    return (
      <div className="obs-channels-root">
        <style>{CSS}</style>

        <PanelTitle
          k="Channels"
          title="Where the learning comes to you"
          status={"Slack · MCP · " + (installed ? "live" : "setup")}
        />

        <div className="obs-channels-tabs" role="tablist">
          {[
            { id: "slack", label: "Slack", icon: "chat" },
            { id: "mcp", label: "MCP", icon: "link" },
            { id: "settings", label: "Settings & Context", icon: "settings" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              className={"obs-channels-tab" + (tab === t.id ? " on" : "")}
              onClick={() => setTab(t.id)}
            >
              <Icon name={t.icon} size={13} /> {t.label}
            </button>
          ))}
        </div>

        {tab === "slack" && (
          <div className="obs-channels-grid">
            <section className="ss-panel">
              <div className="obs-channels-card-head">
                <Icon name="chat" size={16} />
                <b>Ask Observant in Slack</b>
                <span className={"obs-channels-pill" + (slackConnected ? " on" : "")}>{slackConnected ? "Connected" : "Not connected"}</span>
              </div>
              <p className="obs-channels-lead">Ask about your users in plain English, right where your team already talks. Answers are grounded — they cite named people and verbatim quotes, never a guess.</p>
              {qa ? (
                <div className="obs-channels-slack">
                  <div className="obs-channels-msg"><span className="obs-channels-who">you · #product</span><p>{qa.q}</p></div>
                  <div className="obs-channels-msg bot">
                    <span className="obs-channels-who">Observant</span>
                    <p>{qa.a}</p>
                    {cited.length > 0 && (
                      <div className="obs-channels-cite">
                        <span className="obs-channels-who" style={{ alignSelf: "center" }}>grounded in</span>
                        {cited.map((pp) => (
                          <span className="obs-channels-chip" key={pp.id}>
                            {Avatar ? <Avatar name={pp.name} color={pp.color} cls="obs-channels-ava" /> : null}
                            {pp.name.split(" ")[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mut">Connect Slack to ask Observant about your users without leaving the channel.</p>
              )}

              <div className="obs-channels-relay">
                <span className="obs-channels-who">@observant — relay a question into live 1:1s</span>
                <div className="obs-channels-relay-row" style={{ marginTop: ".4rem" }}>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") relay(); }}
                    placeholder="e.g. would a read-only link actually replace the export?"
                    aria-label="Question to relay into live 1:1s"
                  />
                  <button type="button" className="obs-channels-copy" onClick={relay}>
                    <Icon name="relay" size={13} /> Relay
                  </button>
                </div>
                {inflight.length > 0 && (
                  <ul className="obs-channels-inflight">
                    {inflight.map((x, i) => (
                      <li key={i}><b>in flight</b><span>“{x.q}” → asked in {x.target}’s open lines; replies land back in this thread.</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="ss-panel">
              <div className="obs-channels-card-head">
                <Icon name="mail" size={16} />
                <b>Weekly digest</b>
                <span className="obs-channels-pill">Auto-posted Mon 9am</span>
              </div>
              {digest ? (
                <div>
                  <p className="obs-channels-lead" style={{ color: "var(--text-primary)", fontSize: ".95rem" }}>{digest.headline}</p>
                  <div className="obs-channels-slack" style={{ background: "var(--canvas)" }}>
                    <div className="obs-channels-msg bot">
                      <span className="obs-channels-who">Observant · {digest.period}</span>
                      <ul style={{ margin: ".2rem 0 0", paddingLeft: "1.05rem", fontSize: ".86rem", lineHeight: 1.5, color: "var(--text-primary)" }}>
                        {digest.items.map((x, i) => <li key={i} style={{ marginBottom: ".25rem" }}>{x}</li>)}
                      </ul>
                    </div>
                  </div>
                  <p className="obs-channels-foot" style={{ marginTop: ".7rem" }}>One glance, one tap-through — the digest links straight to the Signal it came from. {signals.length ? signals.length + " fresh Signals this week." : ""}</p>
                </div>
              ) : (
                <p className="mut">The first weekly digest posts once your 1:1 lines have replies to summarize.</p>
              )}
            </section>
          </div>
        )}

        {tab === "mcp" && (
          <div className="obs-channels-grid">
            <section className="ss-panel">
              <div className="obs-channels-card-head">
                <Icon name="link" size={16} />
                <b>MCP server</b>
                <span className="obs-channels-pill on">Endpoint live</span>
              </div>
              <p className="obs-channels-lead">Pull what your users <b>said</b> into Claude Code, Cursor, or any MCP client — mid-task. The sharpest inversion of a behavior-only tool: their assistant reads what happened; ours reads what users <em>told you</em>, in their words.</p>
              <div className="obs-channels-cmd">
                <code>{mcpCmd}</code>
                <button type="button" className="obs-channels-copy" onClick={copyCmd}>{copied ? "Copied ✓" : "Copy"}</button>
              </div>
              <p className="obs-channels-foot" style={{ marginTop: ".7rem" }}>Exposes the why-on-record as a tool your agent can call: search what {product}’s users said by person, cohort, trigger, or theme — every claim drills to the verbatim turn.</p>

              <div className="obs-channels-card-head" style={{ marginTop: "1.1rem" }}>
                <Icon name="search" size={15} />
                <b style={{ fontSize: ".82rem" }}>What your agent pulls back</b>
              </div>
              {saidPayload.length ? (
                <ul className="obs-channels-payload">
                  {saidPayload.map((q) => (
                    <li className="obs-channels-quote" key={q.id}>
                      {Avatar ? <Avatar name={q.name} color={q.color} cls="obs-channels-ava" style={{ width: 24, height: 24, fontSize: ".62rem" }} /> : null}
                      <div className="obs-channels-quote-body">
                        <p>{q.quote.replace(/^[“"]|[”"]$/g, "")}</p>
                        <span>{q.name.split(" ")[0]} · {q.segment}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mut">As your users reply, their verbatim words become callable here.</p>
              )}
            </section>

            <section className="ss-panel">
              <div className="obs-channels-card-head">
                <Icon name="bolt" size={16} />
                <b>It comes to you, out of app</b>
              </div>
              <p className="obs-channels-lead">When a Signal grounds or a loop closes, Observant doesn’t wait for you to open a dashboard — it arrives where you already are.</p>
              <div className="obs-channels-arrival">
                <span className="obs-channels-arrival-ico"><Icon name="spark" size={16} /></span>
                <div>
                  <b>New Signal grounded — in {product}</b>
                  <p>{signals[0] ? signals[0].title : "Power users export only to share — the CSV is a sharing workaround."}</p>
                  <p style={{ marginTop: ".35rem" }}>{signals[0] ? signals[0].metric : "5 of 7 power users · high agreement"} · grounded in named existence-proofs.</p>
                  <em style={{ display: "block", marginTop: ".45rem" }}>delivered to #product · tap to open the Signal →</em>
                </div>
              </div>
              {briefing && (
                <p className="obs-channels-foot" style={{ marginTop: ".8rem" }}>
                  Pre-briefed from the scan ({briefing.scanned.slice(0, 2).join(", ")}…) — so the answer your agent pulls already understands {product}’s flows and who’s worth talking to.
                </p>
              )}
            </section>
          </div>
        )}

        {tab === "settings" && (
          <div className="obs-channels-root" style={{ gap: "1rem" }}>
            <section className="ss-panel">
              <div className="obs-channels-card-head">
                <Icon name="check" size={16} />
                <b>Install &amp; identify</b>
                <span className={"obs-channels-pill" + (installed ? " on" : " soon")}>{installed ? "Snippet live" : "Not connected"}</span>
              </div>
              <div className="obs-channels-status-row">
                <div className="obs-channels-stat"><b>{installed ? "Detected" : "—"}</b><span>identify()</span></div>
                <div className="obs-channels-stat"><b>{connectedCount}</b><span>channels connected</span></div>
                <div className="obs-channels-stat"><b>{installed ? "In-product" : "Off-product"}</b><span>default route</span></div>
                <div className="obs-channels-stat"><b>{(state.people || []).length}</b><span>people identified</span></div>
              </div>
            </section>

            <section className="ss-panel">
              <PanelTitle k="Channels" title="Connected channels" status={connectedCount + " on"} />
              <ul className="obs-channels-chan">
                <li><span className={"obs-channels-dot" + (surfaces.product ? " on" : "")} /> In-product snippet <span className="obs-channels-chan-meta">{surfaces.product ? "watching · text only" : "off"}</span></li>
                <li><span className={"obs-channels-dot" + (surfaces.email ? " on" : "")} /> Email (off-product) <span className="obs-channels-chan-meta">{surfaces.email ? "consent + pay" : "off"}</span></li>
                <li><span className={"obs-channels-dot" + (surfaces.telegram ? " on" : "")} /> Telegram (off-product) <span className="obs-channels-chan-meta">{surfaces.telegram ? "consent + pay" : "off"}</span></li>
                <li>
                  <span className={"obs-channels-dot" + (slackConnected ? " on" : "")} /> Slack
                  <button type="button" className="obs-channels-chan-toggle" onClick={() => setSlackConnected((v) => !v)}>{slackConnected ? "Disconnect" : "Connect"}</button>
                </li>
                <li><span className="obs-channels-dot on" /> MCP endpoint <span className="obs-channels-chan-meta">api.observant.ai/mcp</span></li>
              </ul>
            </section>

            <section className="ss-panel">
              <PanelTitle k="Data handling" title="The consent layer, and why" status="Explains each decision" />
              <p className="obs-channels-lead">Every data decision is shown with its reasoning — partners, not subjects. Tap any line to see why it works this way.</p>
              <ul className="obs-channels-consent">
                {consentRows.map((r) => {
                  const open = openRow === r.id;
                  return (
                    <li className={"obs-channels-consent-row" + (open ? " open" : "")} key={r.id}>
                      <button type="button" className="obs-channels-consent-head" onClick={() => setOpenRow(open ? "" : r.id)} aria-expanded={open}>
                        <span className="obs-channels-consent-chev"><Icon name="arrow" size={13} /></span>
                        <b>{r.title}</b>
                        <span className="obs-channels-consent-tag">{r.tag}</span>
                      </button>
                      {open && (
                        <div className="obs-channels-consent-why">
                          <p>{r.body}</p>
                          <span className="obs-channels-reason">{r.reason}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="obs-channels-foot" style={{ marginTop: ".8rem" }}>In-product disclosure your users see: “this product is learning from how you use it so it can improve — your answer helps, you can ignore it.”</p>
            </section>
          </div>
        )}
      </div>
    );
  }

  window.OBS_SURFACES.channels = ChannelsSurface;
})();
