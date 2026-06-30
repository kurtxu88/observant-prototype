/* ============================================================
   Stripe REST client — raw fetch, no SDK (Build #10).
   Mirrors api/_db.js's bare-serverless style: a tiny client over
   `fetch`, form-encoding params the way Stripe's API expects
   (nested → key[sub], arrays → key[0][sub]) and Bearer auth with
   STRIPE_SECRET_KEY. The "_" prefix keeps this OUT of routing — it's
   required by the api/stripe/* handlers via require("./_stripe").

   No-ops cleanly without the key: stripeConfigured() === false and
   sapi() clean-throws (code "NO_STRIPE") so every endpoint can return
   a graceful { ok:false, error:"stripe not configured" } and the
   deployed build stays green before Xuan sets Stripe up.

   Env required (set in Vercel): STRIPE_SECRET_KEY
   (sk_live_… / sk_test_…). Webhook secret lives in webhook.js.
   ============================================================ */
const STRIPE_KEY = (process.env.STRIPE_SECRET_KEY || "").trim();
const STRIPE_BASE = "https://api.stripe.com/v1/";

function stripeConfigured() { return !!STRIPE_KEY; }

// Form-encode a (possibly nested) params object the Stripe way:
//   { a: 1, b: { c: 2 }, d: [ "x", { e: 3 } ] }
//   → a=1&b[c]=2&d[0]=x&d[1][e]=3
function formEncode(obj, prefix) {
  const parts = [];
  for (const key of Object.keys(obj || {})) {
    const val = obj[key];
    if (val === undefined || val === null) continue;
    const k = prefix ? prefix + "[" + key + "]" : key;
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        if (item !== null && typeof item === "object") {
          parts.push(formEncode(item, k + "[" + i + "]"));
        } else {
          parts.push(encodeURIComponent(k + "[" + i + "]") + "=" + encodeURIComponent(item));
        }
      });
    } else if (typeof val === "object") {
      parts.push(formEncode(val, k));
    } else {
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(val));
    }
  }
  return parts.filter(Boolean).join("&");
}

/* sapi(method, path, params, opts?)
   - method: "GET" | "POST" | "DELETE"
   - path:   e.g. "checkout/sessions", "accounts", "transfers"
   - params: plain object (nested ok); GET → querystring, else form body
   - opts.idempotencyKey: optional Idempotency-Key header (safe retries)
   Clean-throws without the key, and throws on non-2xx with the Stripe
   error message attached. */
async function sapi(method, path, params, opts) {
  if (!stripeConfigured()) {
    const e = new Error("stripe not configured — set STRIPE_SECRET_KEY");
    e.code = "NO_STRIPE";
    throw e;
  }
  const m = String(method || "GET").toUpperCase();
  const enc = params ? formEncode(params) : "";
  let url = STRIPE_BASE + String(path || "").replace(/^\/+/, "");
  const headers = {
    Authorization: "Bearer " + STRIPE_KEY,
    "Content-Type": "application/x-www-form-urlencoded",
  };
  if (opts && opts.idempotencyKey) headers["Idempotency-Key"] = String(opts.idempotencyKey);

  const init = { method: m, headers };
  if (m === "GET" || m === "DELETE") {
    if (enc) url += "?" + enc;
  } else {
    init.body = enc;
  }

  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_e) { data = text; }
  if (!res.ok) {
    const msg = (data && data.error && data.error.message) || text || "request failed";
    const err = new Error("Stripe " + res.status + ": " + msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

module.exports = { stripeConfigured, sapi, formEncode };
