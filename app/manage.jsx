/* One-tap preferences — reachable from a link in every message. Change how often,
   pause, or opt out, all in one tap. (Honoring is the backend's job; here it confirms.) */
const { useState: useMG } = React;

function mgDecode(s) {
  try {
    const b = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
  } catch (e) { return {}; }
}

const MG_CADENCE = [
  { id: "open", label: "As often as helps" },
  { id: "occasional", label: "Every week or two" },
  { id: "rare", label: "Only now and then" },
];

function ManageApp() {
  const info = mgDecode(new URLSearchParams(window.location.search).get("d") || "");
  const product = (info.product || "the team").trim();
  const [cadence, setCadence] = useMG(info.cadence || "occasional");
  const [confirm, setConfirm] = useMG("");

  const cadenceLabel = (MG_CADENCE.find((c) => c.id === cadence) || {}).label || "every week or two";

  return (
    <div className="mg-wrap">
      <div className="mg-top">
        <span className="mg-brand">{product} <em>· feedback</em></span>
        <span className="mg-powered">run by <Wordmark size="1rem" /></span>
      </div>

      <h1 className="mg-h1">Your preferences</h1>
      <p className="mg-sub">You're in control of how the {product} team reaches you. Change it anytime — and you can always message them yourself, even if you pause.</p>

      {confirm && <div className="mg-confirm"><Icon name="check" size={16} sw={2.4} /> <span>{confirm}</span></div>}

      <div className="mg-sec">
        <h2>How often you hear from us</h2>
        <p>Currently: <b>{cadenceLabel.toLowerCase()}</b>.</p>
        <div className="mg-chips">
          {MG_CADENCE.map((c) => (
            <button key={c.id} type="button" className={"mg-chip" + (cadence === c.id ? " on" : "")} onClick={() => { setCadence(c.id); setConfirm("Saved — you'll hear from us " + c.label.toLowerCase() + "."); }}>{c.label}</button>
          ))}
        </div>
      </div>

      <div className="mg-sec">
        <h2>Pause for a while</h2>
        <p>Take a break — we'll stop reaching out and pick back up when you're ready.</p>
        <div className="mg-btns">
          <button type="button" className="mg-btn" onClick={() => setConfirm("Paused for 30 days. We'll check back after that — or message us anytime to resume sooner.")}>30 days</button>
          <button type="button" className="mg-btn" onClick={() => setConfirm("Paused for 90 days. Message us anytime to resume sooner.")}>90 days</button>
          <button type="button" className="mg-btn" onClick={() => setConfirm("Paused until you turn it back on. We won't reach out — message us whenever you'd like to resume.")}>Until I turn it back on</button>
        </div>
      </div>

      <div className="mg-sec mg-out">
        <h2>Opt out</h2>
        <p>Stop all messages from the {product} feedback program. You can rejoin anytime from your invite link.</p>
        <div className="mg-btns">
          <button type="button" className="mg-btn" onClick={() => setConfirm("You've opted out — you won't hear from us again. Your earned rewards stay yours. You can rejoin anytime.")}>Opt out of all messages</button>
        </div>
      </div>

      <p className="mg-note">Preferences are honored automatically. (In this demo nothing's actually sent — your choice is just confirmed here.)</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ManageApp />);
