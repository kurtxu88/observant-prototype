/* One-tap preferences — reachable from a link in every message.

   Three axes, made coherent (not three equal buttons):
     • FREQUENCY  — the primary, ongoing setting: how often we reach out while active.
     • PAUSE      — a secondary "take a break" that OVERRIDES frequency for a period,
                    then auto-resumes. While paused, the frequency chips are de-emphasized
                    (they don't apply until you're back on).
     • OPT OUT    — leaving entirely, visually separated as the exit.

   Every change is a REAL save (POST /api/selfserve/preferences); the confirm shows
   only after the backend acks. The page opens in the partner's real current state
   (a "load" round-trip), and knows WHICH partner it is from the same base64 `?d=`
   payload every email carries — { product, contact }. */
const { useState: useMG, useEffect: useMGEffect } = React;

function mgDecode(s) {
  try {
    const b = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
  } catch (e) { return {}; }
}

function mgFmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  const [status, setStatus] = useMG(info.status || "active");
  const [pausedUntil, setPausedUntil] = useMG(info.paused_until || null);
  const [confirm, setConfirm] = useMG("");
  const [err, setErr] = useMG("");

  // Open in the partner's real current state (best-effort; falls back to payload defaults).
  useMGEffect(() => {
    let live = true;
    post({ action: "load" }).then((d) => {
      if (!live || !d) return;
      if (MG_CADENCE.some((c) => c.id === d.cadence)) setCadence(d.cadence);
      if (d.status) setStatus(d.status);
      if (d.paused_until !== undefined) setPausedUntil(d.paused_until);
    });
    return () => { live = false; };
  }, []);

  // POST to the real endpoint; identity rides the same payload every email carries.
  function post(body) {
    return fetch("/api/selfserve/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ product: info.product, contact: info.contact }, body)),
    })
      .then((r) => r.json())
      .then((d) => (d && d.ok ? d : null))
      .catch(() => null);
  }

  // Save a change, then confirm only on ack (soft error otherwise).
  function save(body, onOk, confirmMsg) {
    setErr("");
    return post(body).then((d) => {
      if (!d) { setConfirm(""); setErr("Couldn't save just now — try again in a moment."); return; }
      if (onOk) onOk(d);
      setConfirm(confirmMsg(d));
    });
  }

  const cadenceLabel = ((MG_CADENCE.find((c) => c.id === cadence) || {}).label || "every week or two").toLowerCase();
  const paused = status === "paused";
  const optedOut = status === "opted_out";

  function pickCadence(c) {
    save({ cadence: c.id }, () => setCadence(c.id),
      () => paused
        ? "Saved — once you resume, you'll hear from us " + c.label.toLowerCase() + "."
        : "Saved — you'll hear from us " + c.label.toLowerCase() + ".");
  }
  function doPause(days) {
    const body = days === "indefinite" ? { pause: { indefinite: true } } : { pause: { days } };
    save(body, (d) => { setStatus("paused"); setPausedUntil(d.paused_until || null); }, (d) => {
      const date = mgFmtDate(d.paused_until);
      return date ? "Paused until " + date + ". We'll pick back up on our own — or resume anytime."
        : "Paused until you turn it back on. Resume anytime — and you can always message us.";
    });
  }
  function doResume() {
    save({ resume: true }, () => { setStatus("active"); setPausedUntil(null); },
      () => "You're back on — we'll reach out " + cadenceLabel + ".");
  }
  function doOptOut() {
    save({ optOut: true }, () => setStatus("opted_out"),
      () => "You've opted out — you won't hear from us again. Your earned rewards stay yours. You can rejoin anytime.");
  }
  function doRejoin() {
    save({ resume: true }, () => { setStatus("active"); setPausedUntil(null); },
      () => "Welcome back — we'll reach out " + cadenceLabel + ".");
  }

  const dividerStyle = { border: "none", borderTop: "1px solid var(--border,#e6e3dd)", margin: "22px 0 16px" };
  const dimStyle = { opacity: 0.5 };
  const pausedBannerStyle = {
    border: "1px solid #e6c98f", background: "#fbf3e2", borderRadius: 12,
    padding: 16, margin: "0 0 14px",
  };

  return (
    <div className="mg-wrap">
      <div className="mg-top">
        <span className="mg-brand">{product} <em>· feedback</em></span>
        <span className="mg-powered">run by <Wordmark size="1rem" /></span>
      </div>

      <h1 className="mg-h1">Your preferences</h1>
      <p className="mg-sub">You're in control of how the {product} team reaches you. Change it anytime — and you can always message them yourself, even if you pause.</p>

      {confirm && <div className="mg-confirm"><Icon name="check" size={16} sw={2.4} /> <span>{confirm}</span></div>}
      {err && <div className="mg-confirm" style={{ background: "#fbeeee", borderColor: "#e7c2bd", color: "#8a3a34" }}><span>{err}</span></div>}

      {optedOut ? (
        <div className="mg-sec">
          <h2>You've opted out</h2>
          <p>You won't get messages from the {product} feedback program. Your earned rewards stay yours.</p>
          <div className="mg-btns">
            <button type="button" className="mg-btn" onClick={doRejoin}>Rejoin the program</button>
          </div>
        </div>
      ) : (
        <React.Fragment>
          {/* FREQUENCY — the primary, ongoing setting */}
          <div className="mg-sec" style={paused ? dimStyle : null}>
            <h2>How often you hear from us</h2>
            {paused
              ? <p>Paused right now — this is how often we'll check in once you resume.</p>
              : <p>Currently <b>{cadenceLabel}</b>. This is the ongoing setting for when you're active.</p>}
            <div className="mg-chips">
              {MG_CADENCE.map((c) => (
                <button key={c.id} type="button" className={"mg-chip" + (cadence === c.id ? " on" : "")} onClick={() => pickCadence(c)}>{c.label}</button>
              ))}
            </div>
          </div>

          {/* PAUSE — secondary; overrides frequency for a while, then auto-resumes */}
          {paused ? (
            <div style={pausedBannerStyle}>
              <h2 style={{ fontSize: "1rem", margin: "0 0 4px" }}>
                {pausedUntil ? "Paused until " + mgFmtDate(pausedUntil) : "Paused until you turn it back on"}
              </h2>
              <p style={{ fontSize: ".85rem", color: "#7a6a45", margin: "0 0 12px", lineHeight: 1.5 }}>
                {pausedUntil
                  ? "We've stopped reaching out and will pick back up on our own then — your frequency setting doesn't apply while paused."
                  : "We've stopped reaching out. We won't check in again until you resume."}
              </p>
              <div className="mg-btns">
                <button type="button" className="mg-chip on" onClick={doResume}>Resume now</button>
              </div>
            </div>
          ) : (
            <div className="mg-sec">
              <h2>Need a break?</h2>
              <p>Pause for a while — we'll stop reaching out and pick back up on our own. You can always message us in the meantime.</p>
              <div className="mg-btns">
                <button type="button" className="mg-btn" onClick={() => doPause(30)}>Pause 30 days</button>
                <button type="button" className="mg-btn" onClick={() => doPause(90)}>Pause 90 days</button>
                <button type="button" className="mg-btn" onClick={() => doPause("indefinite")}>Until I turn it back on</button>
              </div>
            </div>
          )}

          {/* OPT OUT — the exit, set apart */}
          <hr style={dividerStyle} />
          <div className="mg-sec mg-out">
            <h2>Leave the program</h2>
            <p>Stop all messages from the {product} feedback program for good. Your earned rewards stay yours, and you can rejoin anytime from your invite link.</p>
            <div className="mg-btns">
              <button type="button" className="mg-btn" onClick={doOptOut}>Opt out of all messages</button>
            </div>
          </div>
        </React.Fragment>
      )}

      <p className="mg-note">Preferences are honored automatically — this saves your choice with the {product} team right away.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ManageApp />);
