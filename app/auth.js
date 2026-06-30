/* ============================================================
   OBSERVANT — browser auth helper (Supabase Auth)
   Plain script (NOT babel) — load AFTER the supabase-js CDN and
   BEFORE the page jsx. Exposes window.ObservantAuth.

   Lazily initializes a Supabase client from /api/config (public
   url + anon key), then wraps the auth methods both the partner
   rewards portal (#9) and the builder/team login (#8) need:

     ObservantAuth.signInWithGoogle(redirectTo?)  → Google OAuth
     ObservantAuth.signInWithEmail(email, redirectTo?) → magic link
     ObservantAuth.getUser()            → current user | null
     ObservantAuth.getAccessToken()     → JWT for Bearer calls | null
     ObservantAuth.onAuth(cb)           → fires cb(user) on changes
     ObservantAuth.signOut()
     ObservantAuth.isConfigured()       → was Supabase wired up?

   Everything no-ops gracefully (resolves null / configured:false)
   when Supabase env isn't set, so the static demo still renders.
   ============================================================ */
window.ObservantAuth = (function () {
  let _client = null;
  let _initPromise = null;
  let _configured = false;

  async function init() {
    if (_client) return _client;
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
      let cfg = {};
      try {
        const res = await fetch("/api/config");
        cfg = await res.json();
      } catch (_e) {
        cfg = {};
      }
      if (!cfg || !cfg.url || !cfg.anonKey) {
        // Unconfigured: leave _client null so callers fall back to demo mode.
        _configured = false;
        return null;
      }
      if (!window.supabase || !window.supabase.createClient) {
        console.warn("[auth] supabase-js CDN not loaded");
        _configured = false;
        return null;
      }
      _client = window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // completes the OAuth / magic-link redirect
        },
      });
      _configured = true;
      return _client;
    })();
    return _initPromise;
  }

  function isConfigured() { return _configured; }

  async function signInWithGoogle(redirectTo) {
    const c = await init();
    if (!c) return { error: { message: "Supabase not configured" } };
    return c.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo || window.location.href },
    });
  }

  async function signInWithEmail(email, redirectTo) {
    const c = await init();
    if (!c) return { error: { message: "Supabase not configured" } };
    return c.auth.signInWithOtp({
      email: String(email || "").trim(),
      options: { emailRedirectTo: redirectTo || window.location.href },
    });
  }

  async function getUser() {
    const c = await init();
    if (!c) return null;
    try {
      const { data } = await c.auth.getUser();
      return data ? data.user : null;
    } catch (_e) {
      return null;
    }
  }

  async function getAccessToken() {
    const c = await init();
    if (!c) return null;
    try {
      const { data } = await c.auth.getSession();
      return data && data.session ? data.session.access_token : null;
    } catch (_e) {
      return null;
    }
  }

  async function onAuth(cb) {
    const c = await init();
    if (!c) return () => {};
    const { data } = c.auth.onAuthStateChange((_event, session) => {
      cb(session ? session.user : null);
    });
    return () => { try { data.subscription.unsubscribe(); } catch (_e) {} };
  }

  async function signOut() {
    const c = await init();
    if (!c) return;
    try { await c.auth.signOut(); } catch (_e) {}
  }

  return {
    init,
    isConfigured,
    signInWithGoogle,
    signInWithEmail,
    getUser,
    getAccessToken,
    onAuth,
    signOut,
    client: () => _client,
  };
})();
