/* ============================================================
   OBSERVANT — Builder / team login (#8)
   Gates the team workspace. Sign in with Google or a magic link,
   then land in the dashboard. Self-contained (loads on its own
   page); auth via window.ObservantAuth.

   Redirect target after sign-in: /setup (the self-serve workspace,
   served from app/SelfServe.html). Override with ?next=/somewhere.
   ============================================================ */
const { useState: useStateLG, useEffect: useEffectLG } = React;

function loginNext() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("next");
  // Only allow same-origin relative paths.
  if (next && /^\/[a-z0-9/_-]*$/i.test(next)) return next;
  return "/setup";
}

function TeamLogin() {
  const [phase, setPhase] = useStateLG("loading"); // loading | signedout
  const [email, setEmail] = useStateLG("");
  const [sent, setSent] = useStateLG(false);
  const [busy, setBusy] = useStateLG(false);
  const [note, setNote] = useStateLG("");
  const next = loginNext();
  const emailValid = email.includes("@") && email.includes(".");

  // If a session already exists (or the OAuth/magic-link redirect just
  // completed), bounce straight to the dashboard.
  useEffectLG(() => {
    let cancelled = false;
    (async () => {
      const u = await ObservantAuth.getUser();
      if (cancelled) return;
      if (u) { window.location.replace(next); return; }
      setPhase("signedout");
    })();
    let unsub = () => {};
    ObservantAuth.onAuth((u) => { if (u && !cancelled) window.location.replace(next); })
      .then((fn) => { unsub = fn; });
    return () => { cancelled = true; unsub(); };
  }, []);

  const google = async () => {
    setBusy(true); setNote("");
    // Return back to this login page; the effect above forwards to `next`
    // once the session lands.
    const { error } = await ObservantAuth.signInWithGoogle(window.location.href);
    if (error) { setNote(error.message); setBusy(false); }
  };
  const magic = async () => {
    if (!emailValid) return;
    setBusy(true); setNote("");
    const { error } = await ObservantAuth.signInWithEmail(email, window.location.href);
    setBusy(false);
    if (error) { setNote(error.message); return; }
    setSent(true);
  };

  if (phase === "loading") {
    return <div className="lg-shell"><div className="lg-card"><p className="lg-muted">Loading…</p></div></div>;
  }

  return (
    <div className="lg-shell">
      <div className="lg-card">
        <div className="lg-brand"><Wordmark size="1.4rem" /></div>
        <h1 className="lg-title">Sign in</h1>
        <p className="lg-muted">Access your team's workspace — your feedback programs, panel, and insights.</p>

        {sent ? (
          <div className="lg-sent">
            <Icon name="check" size={16} sw={2.4} /> Check your inbox — we sent a sign-in link to <b>{email}</b>.
          </div>
        ) : (
          <div className="lg-signin">
            <button type="button" className="btn btn-ghost btn-lg lg-google" onClick={google} disabled={busy}>
              <LgGoogleMark /> Continue with Google
            </button>
            <div className="lg-or"><span>or</span></div>
            <input
              className="input"
              type="email"
              value={email}
              placeholder="you@company.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && emailValid && !busy) magic(); }}
            />
            <Btn variant="primary" size="lg" disabled={!emailValid || busy} onClick={magic}>
              Email me a sign-in link
            </Btn>
          </div>
        )}
        {note && <p className="lg-err">{note}</p>}
        <p className="lg-fine">New here? <a href="/setup">Set up a workspace</a>.</p>
      </div>
    </div>
  );
}

function LgGoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/>
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/>
    </svg>
  );
}

(function injectLgStyles() {
  if (document.getElementById("lg-styles")) return;
  const css = `
  .lg-shell{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:6vh 1.2rem;background:var(--bg,#faf8f5);}
  .lg-card{width:100%;max-width:420px;background:var(--surface,#fff);border:1px solid var(--border,#e7e2da);border-radius:18px;padding:2.4rem 2rem;box-shadow:0 10px 40px rgba(0,0,0,.05);}
  .lg-brand{margin-bottom:1.4rem;}
  .lg-title{font-size:1.6rem;margin:.2rem 0 .5rem;}
  .lg-muted{color:var(--text-muted,#857d70);font-size:.92rem;line-height:1.5;}
  .lg-signin{display:flex;flex-direction:column;gap:.7rem;margin-top:1.4rem;}
  .lg-google{display:flex;align-items:center;justify-content:center;gap:.6rem;}
  .lg-or{display:flex;align-items:center;text-align:center;color:var(--text-muted,#999);font-size:.8rem;margin:.2rem 0;}
  .lg-or::before,.lg-or::after{content:"";flex:1;height:1px;background:var(--border,#e7e2da);}
  .lg-or span{padding:0 .8rem;}
  .lg-sent{display:flex;align-items:center;gap:.5rem;color:var(--success,#2e7d4f);font-size:.9rem;font-weight:600;margin-top:1.3rem;line-height:1.4;}
  .lg-err{color:#b54034;font-size:.86rem;margin-top:.9rem;}
  .lg-fine{font-size:.82rem;color:var(--text-muted,#857d70);margin-top:1.4rem;text-align:center;}
  .lg-fine a{color:inherit;}
  `;
  const tag = document.createElement("style");
  tag.id = "lg-styles";
  tag.textContent = css;
  document.head.appendChild(tag);
})();

ReactDOM.createRoot(document.getElementById("root")).render(<TeamLogin />);
