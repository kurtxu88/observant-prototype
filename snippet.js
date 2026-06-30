/* ============================================================
   Observant — in-product feedback SDK (snippet.js)

   This is the runtime behind the "Observant is live" screen: the
   actual code that runs INSIDE a customer's app. It is referenced
   by the one-line install the GitHub PR adds to the host page:

     <script async src="https://www.observanthq.com/snippet.js" data-observant></script>

   Self-contained vanilla JS — NO deps, NO build. It runs straight
   from the <script> tag. On load it:
     - reads config from data-* attributes on its own <script> tag
     - injects scoped styles (all class names prefixed `obsv-`)
     - exposes window.Observant
     - mounts the four feedback surfaces:
         1. Unsolicited "Feedback" floating button + popover
         2. AI/output evals  (window.Observant.evalOutput / data-observant-eval)
         3. Exit survey       (window.Observant.exitSurvey)
         4. CSAT              (window.Observant.csat + rare auto trigger)

   Every response POSTs to the ingest endpoint with the program
   slug + current url. Failures are swallowed — the host app must
   never break because of us.
   ============================================================ */
(function () {
  "use strict";

  // Don't double-init if the snippet is included twice.
  if (window.Observant && window.Observant.__loaded) return;

  // -- Config (read off our own <script data-observant ...> tag) -----------
  var self =
    document.currentScript ||
    (function () {
      var s = document.querySelectorAll("script[data-observant]");
      return s.length ? s[s.length - 1] : null;
    })();

  function attr(name, fallback) {
    var v = self && self.getAttribute ? self.getAttribute(name) : null;
    return v == null || v === "" ? fallback : v;
  }

  // data-slug identifies the program/site; falls back to the hostname.
  var SLUG = attr("data-slug", (location.hostname || "site").replace(/^www\./, ""));
  // data-api overrides the ingest origin. A present-but-empty data-api ("")
  // means "same origin" (used by the demo page); absent means the default host.
  var hasApiAttr = !!(self && self.hasAttribute && self.hasAttribute("data-api"));
  var apiOrigin = hasApiAttr ? (self.getAttribute("data-api") || "") : "https://www.observanthq.com";
  var API = apiOrigin.replace(/\/+$/, "") + "/api/selfserve/in-product";
  // data-user is an optional opaque caller-supplied user ref (no PII required).
  var USER = attr("data-user", "");
  // data-csat-days throttles the auto CSAT (default: at most once / 30 days).
  var CSAT_DAYS = parseInt(attr("data-csat-days", "30"), 10) || 30;
  // data-auto-csat="off" disables the periodic CSAT auto-trigger.
  var AUTO_CSAT = attr("data-auto-csat", "on") !== "off";

  var LS_PREFIX = "obsv:" + SLUG + ":";

  // -- Tiny helpers --------------------------------------------------------
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function lsGet(k) { try { return localStorage.getItem(LS_PREFIX + k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(LS_PREFIX + k, v); } catch (e) {} }

  // Fire-and-forget POST to the ingest endpoint. Never throws.
  function send(payload) {
    var body = {
      slug: SLUG,
      url: location.href,
      user: USER || undefined,
      ts: new Date().toISOString(),
    };
    for (var k in payload) if (payload.hasOwnProperty(k)) body[k] = payload[k];
    try {
      // keepalive lets exit-survey beacons survive an unload.
      fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
        mode: "cors",
        credentials: "omit",
      }).catch(function () {});
    } catch (e) {
      // Last-ditch beacon for browsers mid-unload.
      try { navigator.sendBeacon && navigator.sendBeacon(API, JSON.stringify(body)); } catch (e2) {}
    }
    return body;
  }

  // -- Styles (scoped to .obsv-*; injected once) ---------------------------
  function injectStyles() {
    if (document.getElementById("obsv-styles")) return;
    var css =
      ".obsv-root,.obsv-root *{box-sizing:border-box;}" +
      ".obsv-root{position:fixed;z-index:2147483000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;}" +
      // floating launcher
      ".obsv-fab{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:inline-flex;align-items:center;gap:7px;" +
      "background:#b4532a;color:#fff;border:none;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:600;" +
      "cursor:pointer;box-shadow:0 6px 22px rgba(124,58,28,.32);transition:transform .12s ease,box-shadow .12s ease;}" +
      ".obsv-fab:hover{transform:translateY(-1px);box-shadow:0 9px 26px rgba(124,58,28,.4);}" +
      ".obsv-fab svg{width:15px;height:15px;}" +
      // shared card / popover
      ".obsv-card{position:fixed;z-index:2147483001;background:#fffdf8;color:#3a352d;border:1px solid #ece4d6;" +
      "border-radius:14px;box-shadow:0 16px 48px rgba(60,45,30,.22);padding:16px;width:300px;max-width:calc(100vw - 32px);}" +
      ".obsv-pop{right:20px;bottom:74px;}" +
      ".obsv-center{left:50%;bottom:24px;transform:translateX(-50%);}" +
      ".obsv-ttl{font-size:14px;font-weight:700;margin:0 0 4px;line-height:1.3;}" +
      ".obsv-sub{font-size:12px;color:#8a857c;margin:0 0 12px;line-height:1.45;}" +
      ".obsv-ta{width:100%;min-height:76px;resize:vertical;border:1px solid #e6ddcd;border-radius:9px;padding:9px 10px;" +
      "font:inherit;font-size:13px;color:#3a352d;background:#fff;outline:none;}" +
      ".obsv-ta:focus{border-color:#b4532a;}" +
      ".obsv-row{display:flex;align-items:center;gap:8px;margin-top:11px;}" +
      ".obsv-spacer{flex:1;}" +
      ".obsv-btn{border:none;border-radius:8px;padding:8px 14px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;}" +
      ".obsv-btn-primary{background:#b4532a;color:#fff;}" +
      ".obsv-btn-primary:disabled{opacity:.45;cursor:default;}" +
      ".obsv-btn-ghost{background:transparent;color:#8a857c;}" +
      ".obsv-x{position:absolute;top:9px;right:10px;border:none;background:transparent;color:#b8b0a2;font-size:17px;" +
      "line-height:1;cursor:pointer;padding:3px;}" +
      // rating scale (CSAT)
      ".obsv-scale{display:flex;gap:6px;margin:4px 0 2px;}" +
      ".obsv-scale button{flex:1;border:1px solid #e6ddcd;background:#fff;border-radius:8px;padding:9px 0;font:inherit;" +
      "font-size:15px;cursor:pointer;color:#6b6557;transition:all .1s ease;}" +
      ".obsv-scale button:hover{border-color:#b4532a;}" +
      ".obsv-scale button.obsv-on{background:#b4532a;border-color:#b4532a;color:#fff;}" +
      ".obsv-scalelbl{display:flex;justify-content:space-between;font-size:10.5px;color:#b0a999;margin-top:5px;}" +
      // inline eval chip
      ".obsv-eval{display:inline-flex;align-items:center;gap:4px;vertical-align:middle;margin-left:6px;}" +
      ".obsv-eval button{border:1px solid #e6ddcd;background:#fff;border-radius:7px;width:30px;height:26px;cursor:pointer;" +
      "font-size:13px;line-height:1;color:#6b6557;transition:all .1s ease;}" +
      ".obsv-eval button:hover{border-color:#b4532a;}" +
      ".obsv-eval button.obsv-on{background:#fbf1e8;border-color:#b4532a;}" +
      ".obsv-eval-note{margin-left:5px;border:1px solid #e6ddcd;border-radius:7px;padding:4px 8px;font:inherit;font-size:12px;" +
      "width:150px;outline:none;background:#fff;}" +
      ".obsv-eval-note:focus{border-color:#b4532a;}" +
      // thank-you toast
      ".obsv-toast{position:fixed;right:20px;bottom:74px;z-index:2147483002;background:#3a352d;color:#fff;" +
      "border-radius:10px;padding:10px 15px;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.28);" +
      "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}" +
      "@media (max-width:480px){.obsv-pop{left:16px;right:16px;bottom:74px;width:auto;}}";
    var s = el("style");
    s.id = "obsv-styles";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // -- One open surface at a time ------------------------------------------
  var openCard = null;
  function closeCard() {
    if (openCard && openCard.parentNode) openCard.parentNode.removeChild(openCard);
    openCard = null;
  }
  function mountCard(node, position) {
    closeCard();
    node.classList.add("obsv-card", position === "center" ? "obsv-center" : "obsv-pop");
    document.body.appendChild(node);
    openCard = node;
    return node;
  }

  function toast(msg) {
    var t = el("div", "obsv-toast", msg || "Thanks — sent.");
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  function closeX(onClose) {
    var b = el("button", "obsv-x", "&times;");
    b.setAttribute("aria-label", "Close");
    b.onclick = onClose;
    return b;
  }

  // ========================================================================
  // 1. Unsolicited "give feedback" — floating button + textarea popover
  // ========================================================================
  function feedbackPopover() {
    var card = el("div");
    card.appendChild(closeX(closeCard));
    card.appendChild(el("p", "obsv-ttl", "Got feedback?"));
    card.appendChild(el("p", "obsv-sub", "Anything — a bug, a wish, a what-the-heck. We read every note."));
    var ta = el("textarea", "obsv-ta");
    ta.placeholder = "Tell us what's on your mind…";
    card.appendChild(ta);
    var row = el("div", "obsv-row");
    row.appendChild(el("span", "obsv-spacer"));
    var cancel = el("button", "obsv-btn obsv-btn-ghost", "Cancel");
    cancel.onclick = closeCard;
    var sendBtn = el("button", "obsv-btn obsv-btn-primary", "Send");
    sendBtn.disabled = true;
    ta.oninput = function () { sendBtn.disabled = !ta.value.trim(); };
    sendBtn.onclick = function () {
      send({ type: "feedback", value: "open", note: ta.value.trim() });
      closeCard();
      toast("Thanks — got it.");
    };
    row.appendChild(cancel);
    row.appendChild(sendBtn);
    card.appendChild(row);
    mountCard(card, "pop");
    setTimeout(function () { ta.focus(); }, 30);
  }

  function mountFab() {
    if (document.querySelector(".obsv-fab")) return;
    var fab = el(
      "button",
      "obsv-fab",
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Feedback</span>'
    );
    fab.setAttribute("aria-label", "Give feedback");
    fab.onclick = function () {
      if (openCard) { closeCard(); return; }
      feedbackPopover();
    };
    document.body.appendChild(fab);
  }

  // ========================================================================
  // 2. AI / output evals — 👍 / 👎 + optional note attached to an output
  // ========================================================================
  function attachEval(target, opts) {
    opts = opts || {};
    if (!target || target.querySelector(".obsv-eval")) return; // idempotent
    var outputId = opts.outputId || target.getAttribute("data-observant-eval") || "";
    var wrap = el("div", "obsv-eval");
    var up = el("button", null, "👍");
    var down = el("button", null, "👎");
    up.setAttribute("aria-label", "Helpful");
    down.setAttribute("aria-label", "Not helpful");
    var note = el("input", "obsv-eval-note");
    note.type = "text";
    note.placeholder = "why? (optional)";
    note.style.display = "none";

    function pick(value) {
      up.classList.toggle("obsv-on", value === "up");
      down.classList.toggle("obsv-on", value === "down");
      note.style.display = "";
      wrap.__value = value;
      send({ type: "eval", value: value, note: (note.value || "").trim(), output_id: outputId });
    }
    up.onclick = function () { pick("up"); };
    down.onclick = function () { pick("down"); };
    // Re-send with the note when the user blurs after typing.
    note.onblur = function () {
      if (wrap.__value && note.value.trim())
        send({ type: "eval", value: wrap.__value, note: note.value.trim(), output_id: outputId });
    };
    wrap.appendChild(up);
    wrap.appendChild(down);
    wrap.appendChild(note);
    target.appendChild(wrap);
  }

  // Auto-wire any element already marked up with data-observant-eval.
  function scanEvalTargets(root) {
    var nodes = (root || document).querySelectorAll("[data-observant-eval]");
    for (var i = 0; i < nodes.length; i++) attachEval(nodes[i]);
  }

  // ========================================================================
  // 3. Exit survey — one question, fired on a cancel / downgrade / leave
  // ========================================================================
  function exitSurvey(opts) {
    opts = opts || {};
    var card = el("div");
    card.appendChild(closeX(closeCard));
    card.appendChild(el("p", "obsv-ttl", opts.title || "Before you go —"));
    card.appendChild(el("p", "obsv-sub", opts.question || "What's the main reason you're leaving?"));
    var ta = el("textarea", "obsv-ta");
    ta.placeholder = "One honest line helps more than you'd think…";
    if (opts.reason) ta.value = opts.reason;
    card.appendChild(ta);
    var row = el("div", "obsv-row");
    row.appendChild(el("span", "obsv-spacer"));
    var skip = el("button", "obsv-btn obsv-btn-ghost", "Skip");
    skip.onclick = closeCard;
    var done = el("button", "obsv-btn obsv-btn-primary", "Send");
    done.onclick = function () {
      send({ type: "exit", value: opts.reason || "leave", note: ta.value.trim() });
      closeCard();
      toast("Thank you — noted.");
    };
    row.appendChild(skip);
    row.appendChild(done);
    card.appendChild(row);
    mountCard(card, "center");
    setTimeout(function () { ta.focus(); }, 30);
  }

  // ========================================================================
  // 4. CSAT — 1–5 rating + optional note. Throttled via localStorage.
  // ========================================================================
  function csat(opts) {
    opts = opts || {};
    lsSet("csat_last", String(Date.now())); // mark shown so auto won't re-fire
    var card = el("div");
    card.appendChild(closeX(closeCard));
    card.appendChild(el("p", "obsv-ttl", opts.title || "How's it going so far?"));
    card.appendChild(el("p", "obsv-sub", opts.question || "Your honest read on the experience."));
    var scale = el("div", "obsv-scale");
    var chosen = 0;
    var btns = [];
    for (var n = 1; n <= 5; n++) {
      (function (val) {
        var b = el("button", null, String(val));
        b.onclick = function () {
          chosen = val;
          for (var j = 0; j < btns.length; j++) btns[j].classList.toggle("obsv-on", j + 1 === val);
          done.disabled = false;
        };
        btns.push(b);
        scale.appendChild(b);
      })(n);
    }
    card.appendChild(scale);
    var lbl = el("div", "obsv-scalelbl", "<span>Not great</span><span>Love it</span>");
    card.appendChild(lbl);
    var ta = el("textarea", "obsv-ta");
    ta.placeholder = "Anything you'd change? (optional)";
    ta.style.marginTop = "11px";
    card.appendChild(ta);
    var row = el("div", "obsv-row");
    row.appendChild(el("span", "obsv-spacer"));
    var skip = el("button", "obsv-btn obsv-btn-ghost", "Not now");
    skip.onclick = closeCard;
    var done = el("button", "obsv-btn obsv-btn-primary", "Send");
    done.disabled = true;
    done.onclick = function () {
      send({ type: "csat", value: String(chosen), note: ta.value.trim() });
      closeCard();
      toast("Thanks for the read.");
    };
    row.appendChild(skip);
    row.appendChild(done);
    card.appendChild(row);
    mountCard(card, "center");
  }

  // Periodic auto-CSAT: rare, throttled to once per CSAT_DAYS, and only after
  // the user has been around a little (so it never greets a brand-new visitor).
  function maybeAutoCsat() {
    if (!AUTO_CSAT) return;
    var last = parseInt(lsGet("csat_last") || "0", 10);
    var firstSeen = parseInt(lsGet("first_seen") || "0", 10);
    if (!firstSeen) { lsSet("first_seen", String(Date.now())); return; }
    var dayMs = 86400000;
    if (Date.now() - last < CSAT_DAYS * dayMs) return;     // shown recently → skip
    if (Date.now() - firstSeen < 60 * 1000) return;        // too new this session → skip
    setTimeout(function () { if (!openCard) csat(); }, 45 * 1000); // after 45s of use
  }

  // -- Public API ----------------------------------------------------------
  var api = {
    __loaded: true,
    config: { slug: SLUG, api: API, user: USER },
    feedback: feedbackPopover,         // open the unsolicited-feedback popover
    evalOutput: function (elOrOpts, opts) {
      // accepts an element, a selector string, or {el, outputId}
      var t = elOrOpts;
      if (t && t.el) { opts = t; t = t.el; }
      if (typeof t === "string") t = document.querySelector(t);
      if (t) attachEval(t, opts);
      return t;
    },
    scanEvals: scanEvalTargets,        // re-scan DOM for data-observant-eval
    exitSurvey: exitSurvey,
    csat: csat,
    send: send,                        // low-level escape hatch
    setUser: function (u) { USER = String(u || ""); api.config.user = USER; },
    close: closeCard,
  };
  window.Observant = api;

  // -- Boot ----------------------------------------------------------------
  function boot() {
    injectStyles();
    mountFab();
    scanEvalTargets(document);
    maybeAutoCsat();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
