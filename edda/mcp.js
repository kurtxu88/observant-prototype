/* ============================================================
   OBSERVANT — /mcp interactions (reveals + terminal line reveal)
   ============================================================ */
(function () {
  'use strict';

  const nav = document.querySelector('.nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* reveals (robust) */
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

  /* terminal: reveal lines sequentially when scrolled into view */
  const term = document.querySelector('.term-body');
  if (term) {
    const lines = Array.from(term.querySelectorAll('.tline, .t-insight'));
    let played = false;
    const play = () => {
      if (played) return;
      played = true;
      lines.forEach((ln, i) => {
        const delay = parseInt(ln.dataset.delay || (i * 520), 10);
        setTimeout(() => ln.classList.add('in'), delay);
      });
    };
    if ('IntersectionObserver' in window) {
      const o = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { play(); o.unobserve(e.target); } }), { threshold: 0.3 });
      o.observe(term);
    }
    window.addEventListener('scroll', () => { if (inView(term)) play(); }, { passive: true });
    setTimeout(play, 2800);
  }

  /* copy buttons */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.copy;
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {});
      const old = btn.textContent;
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = old; }, 1400);
    });
  });

  const yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();
})();
