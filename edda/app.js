/* ============================================================
   SUBSPACE — interactions
   ============================================================ */
(function () {
  'use strict';

  /* ---------- nav scroll state ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => {
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- scroll reveals ---------- */
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  const revealEl = (el) => el.classList.add('in');
  const inView = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight * 0.92 && r.bottom > 0;
  };
  // reveal anything already on-screen right away
  reveals.forEach((el) => { if (inView(el)) revealEl(el); });

  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { revealEl(e.target); revealObs.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => { if (!el.classList.contains('in')) revealObs.observe(el); });
  }

  // scroll fallback (covers environments where the observer never fires)
  const revealOnScroll = () => reveals.forEach((el) => { if (!el.classList.contains('in') && inView(el)) revealEl(el); });
  window.addEventListener('scroll', revealOnScroll, { passive: true });
  // last-resort safety: never leave content hidden
  setTimeout(() => reveals.forEach(revealEl), 2500);

  /* ---------- synthesis bars fill on view ---------- */
  const fillBars = (el) => el.querySelectorAll('.synth-bar i').forEach((bar) => { bar.style.width = bar.dataset.w + '%'; });
  const synths = Array.from(document.querySelectorAll('.synth'));
  if ('IntersectionObserver' in window) {
    const barObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { fillBars(e.target); barObs.unobserve(e.target); } });
    }, { threshold: 0.3 });
    synths.forEach((el) => barObs.observe(el));
  }
  window.addEventListener('scroll', () => synths.forEach((el) => { if (inView(el)) fillBars(el); }), { passive: true });
  setTimeout(() => synths.forEach(fillBars), 2600);

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-q').forEach((q) => {
    q.addEventListener('click', () => {
      const item = q.closest('.faq-item');
      const ans = item.querySelector('.faq-a');
      const isOpen = item.classList.contains('open');
      // close siblings
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      if (isOpen) {
        item.classList.remove('open');
        ans.style.maxHeight = null;
      } else {
        item.classList.add('open');
        ans.style.maxHeight = ans.scrollHeight + 'px';
      }
    });
  });

  /* ---------- animated 1:1 chat ---------- */
  // Script: [type, text, meta]   type: them | me | relay | typing
  const chatScript = [
    { type: 'them', text: "Hi Dana — it's Subspace. You just shipped your third weekly export. Mind if I ask what you do with it once it leaves the app?", meta: 'Subspace · auto-started' },
    { type: 'typing', after: 900 },
    { type: 'me', text: "Honestly I paste it into a Google Sheet and rebuild half of it by hand.", meta: 'Dana · power user' },
    { type: 'relay', tag: 'Relayed from your product team', text: "Would she switch to a live, shareable dashboard instead of the export?" },
    { type: 'typing', after: 700 },
    { type: 'me', text: "A live dashboard? Yes — that's exactly the thing I keep wishing existed.", meta: 'Dana' },
    { type: 'relay', tag: 'Your team requested', text: "A 15-min live 1:1 with Dana — Subspace is finding a time." },
  ];

  function buildMessage(item) {
    if (item.type === 'typing') {
      const t = document.createElement('div');
      t.className = 'typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      return t;
    }
    if (item.type === 'relay') {
      const wrap = document.createElement('div');
      wrap.className = 'msg-relay';
      wrap.innerHTML =
        '<div class="relay-card">' +
        '<div style="margin-top:1px;color:var(--accent);flex-shrink:0">' + iconRelay() + '</div>' +
        '<div><div class="tag">' + item.tag + '</div><div class="rtext">' + item.text + '</div></div>' +
        '</div>';
      return wrap;
    }
    const m = document.createElement('div');
    m.className = 'msg ' + item.type;
    m.innerHTML = '<div class="msg-bubble">' + item.text + '</div>' +
      (item.meta ? '<div class="meta">' + item.meta + '</div>' : '');
    return m;
  }

  function iconRelay() {
    return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m22 7-10 5L2 7l10-5 10 5Z"/></svg>';
  }

  function playChat(body) {
    body.innerHTML = '';
    let i = 0;
    function step() {
      if (i >= chatScript.length) return;
      const item = chatScript[i];
      if (item.type === 'typing') {
        const t = buildMessage(item);
        body.appendChild(t);
        scrollChat(body);
        setTimeout(() => {
          t.remove();
          i++;
          step();
        }, item.after || 800);
      } else {
        const el = buildMessage(item);
        body.appendChild(el);
        scrollChat(body);
        i++;
        const delay = item.type === 'relay' ? 1300 : 1100;
        setTimeout(step, delay);
      }
    }
    setTimeout(step, 400);
  }

  function scrollChat(body) {
    body.scrollTop = body.scrollHeight;
  }

  const chatBodies = Array.from(document.querySelectorAll('.chat-body[data-animate]'));
  const started = new WeakSet();
  const startChat = (b) => { if (started.has(b)) return; started.add(b); playChat(b); };
  if ('IntersectionObserver' in window) {
    const chatObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { startChat(e.target); chatObs.unobserve(e.target); } });
    }, { threshold: 0.35 });
    chatBodies.forEach((b) => chatObs.observe(b));
  }
  window.addEventListener('scroll', () => chatBodies.forEach((b) => { if (inView(b)) startChat(b); }), { passive: true });
  setTimeout(() => chatBodies.forEach(startChat), 2800);

  /* ---------- count-up (e.g. "Join 1,248 builders") ---------- */
  function countUp(el) {
    const target = parseInt(el.dataset.count, 10);
    if (!target) return;
    const dur = 1400, start = performance.now();
    const fmt = (n) => n.toLocaleString('en-US');
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.floor(eased * target));
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = fmt(target);
    }
    requestAnimationFrame(tick);
  }
  const counters = Array.from(document.querySelectorAll('[data-count]'));
  const counted = new WeakSet();
  const startCount = (el) => { if (counted.has(el)) return; counted.add(el); countUp(el); };
  if ('IntersectionObserver' in window) {
    const cObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { startCount(e.target); cObs.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach((el) => cObs.observe(el));
  }
  setTimeout(() => counters.forEach(startCount), 2600);

  /* ---------- year ---------- */
  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

})();
