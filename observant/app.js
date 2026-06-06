/* ============================================================
   OBSERVANT — interactions
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

  /* ---------- hero demo: sequential 1:1 surfaces ---------- */
  const demo = document.querySelector('[data-demo]');
  if (demo) {
    const scenes = Array.from(demo.querySelectorAll('.scene'));
    const steps = Array.from(demo.querySelectorAll('.rail-step'));
    const DWELL = [3000, 3400, 4600]; // per-scene dwell (ms)
    let timer = null;
    function show(n) {
      scenes.forEach((s, i) => s.classList.toggle('is-active', i === n));
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === n);
        s.classList.toggle('is-done', i < n);
      });
      clearTimeout(timer);
      timer = setTimeout(() => show((n + 1) % scenes.length), DWELL[n] || 3400);
    }
    let demoStarted = false;
    const startDemo = () => { if (demoStarted || !scenes.length) return; demoStarted = true; show(0); };
    if ('IntersectionObserver' in window) {
      const dObs = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { startDemo(); dObs.disconnect(); } });
      }, { threshold: 0.25 });
      dObs.observe(demo);
    }
    window.addEventListener('scroll', () => { if (inView(demo)) startDemo(); }, { passive: true });
    setTimeout(startDemo, 1600);
  }

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
