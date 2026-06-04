/* ============================================================
   SUBSPACE — /how-it-works interactions (reveals + rich 1:1 demo)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- nav scroll ---------- */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveals (robust) ---------- */
  const reveals = Array.from(document.querySelectorAll('.reveal'));
  const inView = (el) => { const r = el.getBoundingClientRect(); return r.top < innerHeight * 0.92 && r.bottom > 0; };
  const show = (el) => el.classList.add('in');
  reveals.forEach((el) => { if (inView(el)) show(el); });
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { show(e.target); obs.unobserve(e.target); } }), { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => { if (!el.classList.contains('in')) obs.observe(el); });
  }
  window.addEventListener('scroll', () => reveals.forEach((el) => { if (!el.classList.contains('in') && inView(el)) show(el); }), { passive: true });
  setTimeout(() => reveals.forEach(show), 2500);

  /* ---------- rich 1:1 demo ---------- */
  const script = [
    { type: 'them', text: "Marcus — I noticed you hit an error twice this afternoon while bulk-importing. What were you trying to get done right then?", meta: 'Subspace · behavior-triggered · 4:06pm' },
    { type: 'typing', after: 1000 },
    { type: 'me', text: "Importing my whole Q2 contact list. It choked on the rate limit around 4pm.", meta: 'Marcus · power user' },
    { type: 'them', text: "Got it. Is that a once-a-quarter push, or something you do more often?", meta: 'Subspace' },
    { type: 'typing', after: 850 },
    { type: 'me', text: "Honestly closer to weekly. It's the most annoying part of my week.", meta: 'Marcus' },
    { type: 'relay', tag: 'Relayed from your product team', text: "Would a scheduled background import solve this, or do you need it instant?" },
    { type: 'typing', after: 950 },
    { type: 'me', text: "Background is fine — I just need it to finish without babysitting it.", meta: 'Marcus' },
    { type: 'relay', tag: 'Your team requested', text: "A live 15-min 1:1 with Marcus to watch the workflow." },
    { type: 'typing', after: 900 },
    { type: 'them', text: "Happy to set that up. Marcus — the team would love 15 minutes to see this live. Does Thursday 2pm work?", meta: 'Subspace' },
    { type: 'typing', after: 850 },
    { type: 'me', text: "Thursday works. Send the invite.", meta: 'Marcus' },
    { type: 'relay', tag: 'Scheduled', text: "Live 1:1 booked · Thu 2:00pm · invite sent to Marcus." },
  ];

  const relayIcon = (tag) => {
    if (tag === 'Scheduled') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
    if (tag === 'Your team requested') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m23 7-7 5 7 5V7Z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>';
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m22 7-10 5L2 7l10-5 10 5Z"/></svg>';
  };

  function build(item) {
    if (item.type === 'typing') {
      const t = document.createElement('div');
      t.className = 'typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      return t;
    }
    if (item.type === 'relay') {
      const w = document.createElement('div');
      w.className = 'msg-relay';
      w.innerHTML = '<div class="relay-card"><div style="margin-top:1px;color:var(--accent);flex-shrink:0">' + relayIcon(item.tag) + '</div><div><div class="tag">' + item.tag + '</div><div class="rtext">' + item.text + '</div></div></div>';
      return w;
    }
    const m = document.createElement('div');
    m.className = 'msg ' + item.type;
    m.innerHTML = '<div class="msg-bubble">' + item.text + '</div>' + (item.meta ? '<div class="meta">' + item.meta + '</div>' : '');
    return m;
  }

  function play(body) {
    body.innerHTML = '';
    let i = 0;
    (function step() {
      if (i >= script.length) return;
      const item = script[i];
      const el = build(item);
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      if (item.type === 'typing') {
        setTimeout(() => { el.remove(); i++; step(); }, item.after || 800);
      } else {
        i++;
        setTimeout(step, item.type === 'relay' ? 1350 : 1150);
      }
    })();
  }

  const body = document.querySelector('.chat-body[data-animate]');
  if (body) {
    let started = false;
    const start = () => { if (!started) { started = true; play(body); } };
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { start(); o.unobserve(e.target); } }), { threshold: 0.3 });
      o.observe(body);
    }
    window.addEventListener('scroll', () => { if (inView(body)) start(); }, { passive: true });
    setTimeout(start, 2800);
  }

  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
