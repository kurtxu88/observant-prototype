/* ============================================================
   OBSERVANT — Partner rewards portal (#9)
   The user-facing side of a feedback program: sign in (Google or
   magic link), then see your participating minutes, your $ balance,
   a ledger of how it added up, and request a payout.

   Client-facing voice (not pitch): describes what Observant does for
   the partner — track minutes, claim rewards. Auth via window.ObservantAuth.
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
      if (u) { setUser(u); setPhase("signedin"); loadBalance(); }
      else { setPhase("signedout"); }
    })();
    // React to sign-in/out happening in this tab.
    let unsub = () => {};
    ObservantAuth.onAuth((u) => {
      if (cancelled) return;
      if (u) { setUser(u); setPhase("signedin"); loadBalance(); }
      else { setUser(null); setData(null); setPhase("signedout"); }
    }).then((fn) => { unsub = fn; });
    return () => { cancelled = true; unsub(); };
  }, []);

  async function loadBalance() {
    setErr("");
    try {
      const token = await ObservantAuth.getAccessToken();
      const res = await fetch("/api/selfserve/partner-balance", {
        headers: token ? { Authorization: "Bearer " + token } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "could not load balance");
      setData(json);
    } catch (e) {
      setErr(e.message || "could not load your balance");
    }
  }

  if (phase === "loading") {
    return <div className="rp-shell"><div className="rp-card"><p className="rp-muted">Loading…</p></div></div>;
  }
  if (phase === "signedout") {
    return <SignIn intro="Sign in to see your participating minutes add up and claim your rewards whenever you like." />;
  }
  return <RewardsHome user={user} data={data} err={err} onReload={loadBalance} />;
}

/* ---------- sign-in card (shared shape with builder login) ---------- */
function SignIn({ intro }) {
  const [email, setEmail] = useStateRP("");
  const [sent, setSent] = useStateRP(false);
  const [busy, setBusy] = useStateRP(false);
  const [note, setNote] = useStateRP("");
  const emailValid = email.includes("@") && email.includes(".");

  const google = async () => {
    setBusy(true); setNote("");
    const { error } = await ObservantAuth.signInWithGoogle();
    if (error) { setNote(error.message); setBusy(false); }
  };
  const magic = async () => {
    if (!emailValid) return;
    setBusy(true); setNote("");
    const { error } = await ObservantAuth.signInWithEmail(email);
    setBusy(false);
    if (error) { setNote(error.message); return; }
    setSent(true);
  };

  return (
    <div className="rp-shell">
      <div className="rp-card">
        <div className="rp-brand"><Wordmark size="1.4rem" /></div>
        <h1 className="rp-title">Your rewards</h1>
        <p className="rp-muted">{intro}</p>

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

/* ---------- signed-in: balance + ledger + payout ---------- */
function RewardsHome({ user, data, err, onReload }) {
  const [payoutAsked, setPayoutAsked] = useStateRP(false);
  const minutes = data ? data.minutes : 0;
  const balance = data ? data.balance : 0;
  const rate = data ? data.rate : 2;
  const ledger = (data && data.ledger) || [];
  const linked = !data || data.linked !== false;

  return (
    <div className="rp-shell">
      <div className="rp-card rp-wide">
        <header className="rp-top">
          <Wordmark size="1.25rem" />
          <button type="button" className="rp-signout" onClick={() => ObservantAuth.signOut()}>Sign out</button>
        </header>

        <p className="rp-hi">Signed in as <b>{user && user.email}</b></p>

        {err && <p className="rp-err">{err} <button type="button" className="rp-link" onClick={onReload}>Retry</button></p>}

        {!linked && !err && (
          <p className="rp-muted rp-pad">We don't see participating minutes tied to this email yet. Once you start replying to a team's questions, your minutes show up here. Make sure you sign in with the same email you joined with.</p>
        )}

        <div className="rp-balance">
          <div className="rp-bal-box">
            <div className="rp-bal-n">{fmtUSD(balance)}</div>
            <div className="rp-bal-l">available balance</div>
          </div>
          <div className="rp-bal-box">
            <div className="rp-bal-n">{Math.round(minutes)}</div>
            <div className="rp-bal-l">participating minutes</div>
          </div>
          <div className="rp-bal-box">
            <div className="rp-bal-n">{fmtUSD(rate)}</div>
            <div className="rp-bal-l">per minute</div>
          </div>
        </div>

        <div className="rp-payout">
          {payoutAsked ? (
            <div className="rp-sent">
              <Icon name="check" size={16} sw={2.4} /> Payout requested. We'll email you when it's on the way.
            </div>
          ) : (
            <Btn variant="primary" size="lg" disabled={balance <= 0} onClick={() => setPayoutAsked(true)}>
              Request payout {balance > 0 ? "· " + fmtUSD(balance) : ""}
            </Btn>
          )}
          <p className="rp-muted rp-fine">Your balance works like a gift card — claim small amounts often, or save it up.</p>
        </div>

        <section className="rp-ledger">
          <h3 className="rp-h3">Your activity</h3>
          {ledger.length === 0 ? (
            <p className="rp-muted">No activity yet. Every minute you participate — email replies, voice chats — shows up here, tracked automatically.</p>
          ) : (
            <ul className="rp-rows">
              {ledger.map((l, i) => (
                <li key={i} className="rp-row">
                  <div className="rp-row-l">
                    <div className="rp-row-k">{ledgerLabel(l.kind)}</div>
                    {l.note && <div className="rp-row-note">{l.note}</div>}
                    <div className="rp-row-date">{fmtDate(l.created_at)}</div>
                  </div>
                  <div className={"rp-row-amt" + (Number(l.minutes) < 0 ? " neg" : "")}>
                    {Number(l.minutes) >= 0 ? "+" : ""}{fmtMin(Math.abs(l.minutes))}
                    {l.amount != null && <span className="rp-row-usd">{fmtUSD(Math.abs(l.amount))}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="rp-foot">Rewards tracked and audited automatically by Observant. Opt out anytime.</footer>
      </div>
    </div>
  );
}

function ledgerLabel(kind) {
  if (kind === "earned") return "Participated";
  if (kind === "redeemed") return "Redeemed";
  return "Adjustment";
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
  .rp-brand,.rp-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem;}
  .rp-title{font-size:1.6rem;margin:.2rem 0 .5rem;}
  .rp-muted{color:var(--text-muted,#857d70);font-size:.92rem;line-height:1.5;}
  .rp-pad{margin:.6rem 0 0;}
  .rp-fine{font-size:.8rem;margin-top:.6rem;}
  .rp-signin{display:flex;flex-direction:column;gap:.7rem;margin-top:1.3rem;}
  .rp-google{display:flex;align-items:center;justify-content:center;gap:.6rem;}
  .rp-or{display:flex;align-items:center;text-align:center;color:var(--text-muted,#999);font-size:.8rem;margin:.2rem 0;}
  .rp-or::before,.rp-or::after{content:"";flex:1;height:1px;background:var(--border,#e7e2da);}
  .rp-or span{padding:0 .8rem;}
  .rp-sent{display:flex;align-items:center;gap:.5rem;color:var(--success,#2e7d4f);font-size:.9rem;font-weight:600;margin-top:1.2rem;line-height:1.4;}
  .rp-err{color:#b54034;font-size:.86rem;margin-top:.9rem;}
  .rp-link{background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;font:inherit;padding:0;}
  .rp-hi{font-size:.88rem;color:var(--text-muted,#857d70);margin:.2rem 0 1.3rem;}
  .rp-signout{background:none;border:none;color:var(--text-muted,#857d70);font-size:.84rem;cursor:pointer;text-decoration:underline;}
  .rp-balance{display:grid;grid-template-columns:repeat(3,1fr);gap:.8rem;margin:.4rem 0 1.4rem;}
  .rp-bal-box{background:var(--bg,#faf8f5);border:1px solid var(--border,#e7e2da);border-radius:13px;padding:1.1rem .9rem;text-align:center;}
  .rp-bal-n{font-size:1.5rem;font-weight:700;letter-spacing:-.01em;}
  .rp-bal-l{font-size:.74rem;color:var(--text-muted,#857d70);margin-top:.25rem;}
  .rp-payout{margin:.4rem 0 1.6rem;}
  .rp-payout .btn{width:100%;}
  .rp-h3{font-size:1rem;margin:0 0 .8rem;}
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
