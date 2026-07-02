/* ============================================================
   OBSERVANT — Partner rewards portal (#9)
   The END-USER (feedback partner) side of a program. A partner
   enrolls → gets a magic-link email → the link signs them in and
   lands them HERE. This is their own warm little portal — NOT the
   team/builder dashboard, no workspace nav, no onboarding.

   Signed in, they see:
     • their participating minutes + earned rewards ($)
     • which program(s) they're in — channel, cadence, status
     • a history of every loop they contributed + minutes each
     • a Claim button to cash out what they've earned

   Signed out, they get the same magic-link / Google sign-in the
   enrollment email points at, so landing here always works.

   Client-facing voice (not pitch). Auth via window.ObservantAuth;
   data via /api/selfserve/partner-portal.
   ============================================================ */
const { useState: useStateRP, useEffect: useEffectRP } = React;

function fmtMin(m) {
  const n = Math.round(Number(m || 0));
  return n === 1 ? "1 minute" : n + " minutes";
}
function fmtUSD(v) {
  return "$" + (Number(v || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(s) {
  if (!s) return "";
  try { return new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch (_e) { return ""; }
}
function titleCase(s) {
  return String(s || "").replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function RewardsPortal() {
  const [phase, setPhase] = useStateRP("loading"); // loading | signedout | signedin
  const [user, setUser] = useStateRP(null);
  const [data, setData] = useStateRP(null);
  const [err, setErr] = useStateRP("");

  // On load, see if we're already signed in (also catches the redirect back
  // from Google / a magic link, which ObservantAuth completes for us).
  useEffectRP(() => {
    let cancelled = false;
    (async () => {
      const u = await ObservantAuth.getUser();
      if (cancelled) return;
      if (u) { setUser(u); setPhase("signedin"); loadPortal(); }
      else { setPhase("signedout"); }
    })();
    // React to sign-in/out happening in this tab (magic link completing).
    let unsub = () => {};
    ObservantAuth.onAuth((u) => {
      if (cancelled) return;
      if (u) { setUser(u); setPhase("signedin"); loadPortal(); }
      else { setUser(null); setData(null); setPhase("signedout"); }
    }).then((fn) => { unsub = fn; });
    return () => { cancelled = true; unsub(); };
  }, []);

  async function loadPortal() {
    setErr("");
    try {
      const token = await ObservantAuth.getAccessToken();
      const res = await fetch("/api/selfserve/partner-portal", {
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "could not load your rewards");
      setData(json);
    } catch (e) {
      setErr(e.message || "could not load your rewards");
    }
  }

  if (phase === "loading") {
    return <div className="rp-shell"><div className="rp-card"><p className="rp-muted">Loading…</p></div></div>;
  }
  if (phase === "signedout") {
    return <SignIn />;
  }
  return <PartnerHome user={user} data={data} err={err} onReload={loadPortal} />;
}

/* ---------- signed-out: partner sign-in (magic link / Google) ---------- */
function SignIn() {
  const [email, setEmail] = useStateRP("");
  const [sent, setSent] = useStateRP(false);
  const [busy, setBusy] = useStateRP(false);
  const [note, setNote] = useStateRP("");
  const emailValid = email.includes("@") && email.includes(".");

  // Always come back to the partner rewards portal on THIS host (so a partner
  // signing in on partner.observanthq.com lands on their rewards, not the
  // client dashboard). Requires this origin to be allow-listed in Supabase.
  const rewardsRedirect = window.location.origin + "/rewards";
  const google = async () => {
    setBusy(true); setNote("");
    const { error } = await ObservantAuth.signInWithGoogle(rewardsRedirect);
    if (error) { setNote(error.message); setBusy(false); }
  };
  const magic = async () => {
    if (!emailValid) return;
    setBusy(true); setNote("");
    const { error } = await ObservantAuth.signInWithEmail(email, rewardsRedirect);
    setBusy(false);
    if (error) { setNote(error.message); return; }
    setSent(true);
  };

  return (
    <div className="rp-shell">
      <div className="rp-card">
        <div className="rp-brand"><Wordmark size="1.35rem" /></div>
        <h1 className="rp-title">Your rewards</h1>
        <p className="rp-muted">
          Sign in to see your participating minutes add up and claim your rewards whenever you like.
          Use the same email you were invited with.
        </p>

        {sent ? (
          <div className="rp-sent">
            <Icon name="check" size={16} sw={2.4} /> Check your inbox — we sent a sign-in link to <b>{email}</b>.
          </div>
        ) : (
          <div className="rp-signin">
            <button type="button" className="btn btn-ghost btn-lg rp-google" onClick={google} disabled={busy}>
              <GoogleMark /> Continue with Google
            </button>
            <div className="rp-or"><span>or</span></div>
            <input
              className="input"
              type="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && emailValid && !busy) magic(); }}
            />
            <Btn variant="primary" size="lg" disabled={!emailValid || busy} onClick={magic}>
              Email me a sign-in link
            </Btn>
          </div>
        )}
        {note && <p className="rp-err">{note}</p>}
      </div>
    </div>
  );
}

/* ---------- signed-in: the partner's own portal ---------- */
function PartnerHome({ user, data, err, onReload }) {
  const [claimState, setClaimState] = useStateRP("idle"); // idle | busy | done | error
  const [claimMsg, setClaimMsg] = useStateRP("");
  const [claimedAmt, setClaimedAmt] = useStateRP(0);

  const totals = (data && data.totals) || { netMinutes: 0, earnedMinutes: 0, balance: 0, claimed: 0 };
  const rate = data ? data.rate : 2;
  const programs = (data && data.programs) || [];
  const history = (data && data.history) || [];
  const linked = !data || data.linked !== false;
  const balance = Number(totals.balance || 0);

  // Brand the portal to the partner's product when we know it.
  const product = programs.length && programs[0].product ? programs[0].product : "";
  const partnerLabel = product ? product + " feedback partner" : "Feedback partner";

  async function claim() {
    if (balance <= 0 || claimState === "busy" || claimState === "done") return;
    setClaimState("busy"); setClaimMsg("");
    try {
      const token = await ObservantAuth.getAccessToken();
      const res = await fetch("/api/selfserve/partner-portal", {
        method: "POST",
        headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: "Bearer " + token } : {}),
        body: JSON.stringify({ action: "redeem" }),
      });
      const json = await res.json();
      if (!res.ok || json.ok === false) throw new Error(json.error || "could not request your payout");
      setClaimedAmt(Number(json.claimed || balance));
      setClaimState("done");
      // Refresh so the balance + history reflect the redemption.
      onReload();
    } catch (e) {
      setClaimState("error");
      setClaimMsg(e.message || "could not request your payout");
    }
  }

  return (
    <div className="rp-shell">
      <div className="rp-card rp-wide">
        <header className="rp-top">
          <div className="rp-topl">
            <Wordmark size="1.15rem" />
            <span className="rp-tag">{partnerLabel}</span>
          </div>
          <button type="button" className="rp-signout" onClick={() => ObservantAuth.signOut()}>Sign out</button>
        </header>

        <h1 className="rp-title">Your rewards</h1>
        <p className="rp-hi">Signed in as <b>{user && user.email}</b></p>

        {err && <p className="rp-err">{err} <button type="button" className="rp-link" onClick={onReload}>Retry</button></p>}

        {!linked && !err && (
          <p className="rp-muted rp-pad">
            We don't see participating minutes tied to this email yet. Once you start replying to a
            team's questions, your minutes show up here — just make sure you sign in with the same
            email you were invited with.
          </p>
        )}

        {/* balance */}
        <div className="rp-balance">
          <div className="rp-bal-box rp-bal-hero">
            <div className="rp-bal-n">{fmtUSD(balance)}</div>
            <div className="rp-bal-l">ready to claim</div>
          </div>
          <div className="rp-bal-box">
            <div className="rp-bal-n">{Math.round(totals.netMinutes)}</div>
            <div className="rp-bal-l">participating minutes</div>
          </div>
          <div className="rp-bal-box">
            <div className="rp-bal-n">{fmtUSD(rate)}</div>
            <div className="rp-bal-l">per minute</div>
          </div>
        </div>

        {/* claim / redeem */}
        <div className="rp-payout">
          {claimState === "done" ? (
            <div className="rp-sent">
              <Icon name="check" size={16} sw={2.4} /> Payout requested — {fmtUSD(claimedAmt)} on its way. We'll email you when it's sent.
            </div>
          ) : (
            <Btn variant="primary" size="lg" disabled={balance <= 0 || claimState === "busy"} onClick={claim}>
              {claimState === "busy" ? "Requesting…" : (balance > 0 ? "Claim " + fmtUSD(balance) : "Nothing to claim yet")}
            </Btn>
          )}
          {claimState === "error" && <p className="rp-err">{claimMsg} <button type="button" className="rp-link" onClick={claim}>Try again</button></p>}
          <p className="rp-muted rp-fine">
            Your rewards work like a gift card — claim small amounts often, or let them add up.
            {totals.claimed > 0 ? " You've claimed " + fmtUSD(totals.claimed) + " so far." : ""}
          </p>
        </div>

        {/* program status */}
        {programs.length > 0 && (
          <section className="rp-progs">
            <h3 className="rp-h3">Your program{programs.length > 1 ? "s" : ""}</h3>
            <ul className="rp-prog-rows">
              {programs.map((p, i) => (
                <li key={i} className="rp-prog">
                  <div className="rp-prog-l">
                    <div className="rp-prog-name">{p.product || "Feedback program"}</div>
                    <div className="rp-prog-meta">
                      {channelLabel(p.channel)} · {cadenceLabel(p.cadence)} · {fmtUSD(p.rate)}/min
                    </div>
                  </div>
                  <span className={"rp-status rp-status-" + (p.status || "active")}>{titleCase(statusLabel(p.status))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* history of loops / replies */}
        <section className="rp-ledger">
          <h3 className="rp-h3">Your history</h3>
          {history.length === 0 ? (
            <p className="rp-muted">
              Nothing here yet. Every loop you take part in — an email reply, a quick chat — shows up
              here with the minutes it earned, tracked automatically.
            </p>
          ) : (
            <ul className="rp-rows">
              {history.map((l, i) => (
                <li key={i} className="rp-row">
                  <div className="rp-row-l">
                    <div className="rp-row-k">{historyLabel(l)}</div>
                    {l.product && <div className="rp-row-note">{l.product}</div>}
                    <div className="rp-row-date">{fmtDate(l.date)}</div>
                  </div>
                  <div className={"rp-row-amt" + (l.kind === "redeemed" ? " neg" : "")}>
                    {l.kind === "redeemed"
                      ? "Claimed"
                      : (Number(l.minutes) >= 0 ? "+" : "") + fmtMin(Math.abs(l.minutes))}
                    {l.amount != null && <span className="rp-row-usd">{fmtUSD(Math.abs(l.amount))}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="rp-foot">Your minutes and rewards are tracked and audited automatically by Observant. Opt out anytime.</footer>
      </div>
    </div>
  );
}

function historyLabel(l) {
  if (l.kind === "redeemed") return "Payout requested";
  if (l.kind === "adjustment") return "Adjustment";
  return "Participated in a loop";
}
function channelLabel(c) {
  if (c === "telegram") return "Telegram";
  if (c === "inproduct") return "In-product";
  return "Email";
}
function cadenceLabel(c) {
  if (c === "open") return "Happy to hear often";
  if (c === "rare") return "Only now and then";
  return "Every so often";
}
function statusLabel(s) {
  if (s === "paused") return "paused";
  if (s === "opted_out") return "opted out";
  return "active";
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}

/* ---------- self-contained styles (no edits to shared CSS) ---------- */
(function injectRPStyles() {
  if (document.getElementById("rp-styles")) return;
  const css = `
  .rp-shell{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:6vh 1.2rem;background:var(--bg,#faf8f5);}
  .rp-card{width:100%;max-width:440px;background:var(--surface,#fff);border:1px solid var(--border,#e7e2da);border-radius:18px;padding:2.2rem 2rem;box-shadow:0 10px 40px rgba(0,0,0,.05);}
  .rp-card.rp-wide{max-width:620px;}
  .rp-brand{display:flex;align-items:center;margin-bottom:1.4rem;}
  .rp-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;}
  .rp-topl{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;}
  .rp-tag{font-size:.72rem;font-weight:600;letter-spacing:.02em;color:var(--text-muted,#857d70);background:var(--bg,#faf8f5);border:1px solid var(--border,#e7e2da);border-radius:999px;padding:.2rem .6rem;}
  .rp-title{font-size:1.6rem;margin:.2rem 0 .4rem;}
  .rp-muted{color:var(--text-muted,#857d70);font-size:.92rem;line-height:1.5;}
  .rp-pad{margin:.6rem 0 0;}
  .rp-fine{font-size:.8rem;margin-top:.7rem;}
  .rp-signin{display:flex;flex-direction:column;gap:.7rem;margin-top:1.3rem;}
  .rp-google{display:flex;align-items:center;justify-content:center;gap:.6rem;}
  .rp-or{display:flex;align-items:center;text-align:center;color:var(--text-muted,#999);font-size:.8rem;margin:.2rem 0;}
  .rp-or::before,.rp-or::after{content:"";flex:1;height:1px;background:var(--border,#e7e2da);}
  .rp-or span{padding:0 .8rem;}
  .rp-sent{display:flex;align-items:center;gap:.5rem;color:var(--success,#2e7d4f);font-size:.9rem;font-weight:600;margin-top:.2rem;line-height:1.4;}
  .rp-err{color:#b54034;font-size:.86rem;margin-top:.9rem;}
  .rp-link{background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:0;}
  .rp-hi{font-size:.88rem;color:var(--text-muted,#857d70);margin:.1rem 0 1.3rem;}
  .rp-signout{background:none;border:none;color:var(--text-muted,#857d70);font-size:.84rem;cursor:pointer;text-decoration:underline;white-space:nowrap;}
  .rp-balance{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin:.4rem 0 1.3rem;}
  .rp-bal-box{background:var(--bg,#faf8f5);border:1px solid var(--border,#e7e2da);border-radius:13px;padding:1.1rem .9rem;text-align:center;}
  .rp-bal-hero{background:var(--accent-soft,#fbeee6);border-color:var(--accent,#e6c3ad);}
  .rp-bal-n{font-size:1.5rem;font-weight:700;letter-spacing:-.01em;}
  .rp-bal-l{font-size:.74rem;color:var(--text-muted,#857d70);margin-top:.25rem;}
  .rp-payout{margin:.2rem 0 1.6rem;}
  .rp-payout .btn{width:100%;}
  .rp-h3{font-size:1rem;margin:0 0 .8rem;}
  .rp-progs{margin-bottom:1.6rem;}
  .rp-prog-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.5rem;}
  .rp-prog{display:flex;align-items:center;justify-content:space-between;gap:.8rem;background:var(--bg,#faf8f5);border:1px solid var(--border,#e7e2da);border-radius:12px;padding:.8rem 1rem;}
  .rp-prog-name{font-weight:600;font-size:.92rem;}
  .rp-prog-meta{font-size:.78rem;color:var(--text-muted,#857d70);margin-top:.2rem;}
  .rp-status{font-size:.72rem;font-weight:600;padding:.2rem .55rem;border-radius:999px;white-space:nowrap;}
  .rp-status-active{color:#2e7d4f;background:rgba(46,125,79,.1);}
  .rp-status-paused{color:#8a6d1f;background:rgba(180,140,40,.12);}
  .rp-status-opted_out{color:#857d70;background:rgba(133,125,112,.12);}
  .rp-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;}
  .rp-row{display:flex;align-items:center;justify-content:space-between;padding:.8rem 0;border-top:1px solid var(--border,#eee);}
  .rp-row-k{font-weight:600;font-size:.9rem;}
  .rp-row-note{font-size:.8rem;color:var(--text-muted,#857d70);margin-top:.15rem;}
  .rp-row-date{font-size:.74rem;color:var(--text-muted,#aaa);margin-top:.15rem;}
  .rp-row-amt{text-align:right;font-weight:600;font-size:.9rem;white-space:nowrap;}
  .rp-row-amt.neg{color:var(--text-muted,#857d70);}
  .rp-row-usd{display:block;font-size:.78rem;color:var(--text-muted,#857d70);font-weight:500;}
  .rp-foot{margin-top:1.6rem;font-size:.78rem;color:var(--text-muted,#aaa);text-align:center;}
  `;
  const tag = document.createElement("style");
  tag.id = "rp-styles";
  tag.textContent = css;
  document.head.appendChild(tag);
})();

ReactDOM.createRoot(document.getElementById("root")).render(<RewardsPortal />);
window.SignIn = SignIn;
window.GoogleMark = GoogleMark;
