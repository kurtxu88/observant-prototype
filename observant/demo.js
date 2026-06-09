/* ============================================================
   OBSERVANT - standalone live demo interactions
   ============================================================ */
(function () {
  'use strict';

  const moments = [
    {
      kicker: 'Day 1 · learning mode turns on',
      title: 'Observant opens private lines.',
      copy: 'Each user gets a private 1:1 line in the surface they already use. Observant starts with baseline intent so future follow-ups have memory.',
      status: 'Still learning',
      signal: 14,
      pattern: 12,
      patternCopy: 'Baseline conversations are opening. Nothing is stale yet; Observant is building memory.',
      active: 'dana',
      conversation: 'Dana K.',
      label: 'Private 1:1 · in product',
      lines: {
        dana: 'Introduced herself and named the weekly export workflow.',
        marcus: 'Said bulk import is the most fragile part of his week.',
        priya: 'Explained what brought her to Northwind on day one.'
      },
      memory: [
        'Dana exports every Monday for her team meeting.',
        'Marcus wants reliable background jobs more than speed.',
        'Priya is still orienting and prefers email.'
      ],
      activity: [
        'Dana joined from inside Northwind.',
        'Marcus accepted the browser companion.',
        'Priya chose quiet email check-ins.'
      ],
      messages: [
        { type: 'them', text: "Hi Dana - it's Observant. I will check in lightly as you use Northwind. What are you usually trying to get done here?", meta: 'Observant · onboarding' },
        { type: 'user', text: 'Weekly reporting. I export data every Monday and clean it up for the team.', meta: 'Dana' },
        { type: 'system', text: 'Remembered: weekly export, team-facing report, Monday rhythm.', meta: 'Learning memory' }
      ]
    },
    {
      kicker: 'Day 4 · behavior changes',
      title: 'Observant follows up with memory.',
      copy: 'Dana finishes another export. Observant does not ask from scratch; it remembers last week and follows up in the moment.',
      status: 'Remembered from last week',
      signal: 39,
      pattern: 28,
      patternCopy: 'The same workflow has repeated. Observant is still learning from the relationship, not launching a new study.',
      active: 'dana',
      conversation: 'Dana K.',
      label: 'Private 1:1 · in product',
      lines: {
        dana: 'Finished a third export; follow-up opened in context.',
        marcus: 'Hit the import limit again and stayed opted in.',
        priya: 'Asked where reporting settings live.'
      },
      memory: [
        'Dana exports for a team meeting, not personal analysis.',
        'The cleanup happens after export, outside Northwind.',
        'Her next export is likely next Monday.'
      ],
      activity: [
        'export_completed fired for Dana.',
        'Observant matched it to her remembered workflow.',
        'A follow-up opened while the task was fresh.'
      ],
      messages: [
        { type: 'them', text: 'You just finished another weekly export. Last week you said you clean it up for the team - what happened after it left Northwind today?', meta: 'Observant · remembered from last week' },
        { type: 'user', text: 'Same thing. I pasted it into a sheet and rebuilt the header row by hand.', meta: 'Dana' },
        { type: 'them', text: 'Is the export missing data, or is it missing a version your team can read without you translating it?', meta: 'Observant' },
        { type: 'user', text: 'The second one. The numbers are fine; the presentation is the work.', meta: 'Dana' }
      ]
    },
    {
      kicker: 'Week 2 · signal compounds',
      title: 'The pattern strengthens across users.',
      copy: 'Similar moments keep appearing in separate private lines. Observant connects them over time, while each user still feels like a personal conversation.',
      status: 'Pattern strengthened',
      signal: 117,
      pattern: 46,
      patternCopy: 'Export cleanup has moved from a single quote to a strengthening pattern across power users.',
      active: 'marcus',
      conversation: 'Marcus T.',
      label: 'Private 1:1 · browser companion',
      lines: {
        dana: 'Repeated export cleanup twice in two weeks.',
        marcus: 'Asked for a share link after rebuilding a report.',
        priya: 'Forwarded a CSV because dashboard sharing was unclear.'
      },
      memory: [
        'Multiple users are using CSV as a workaround.',
        'The desired object is a readable team view.',
        'The pain appears after export, not during export.'
      ],
      activity: [
        'Marcus opened reporting settings three times.',
        'Priya forwarded a CSV from email.',
        'Dana mentioned the same cleanup again.'
      ],
      messages: [
        { type: 'them', text: 'You opened reporting settings a few times after export. Were you trying to share the report with someone?', meta: 'Observant · behavior-triggered' },
        { type: 'user', text: 'Yes. I needed a link my ops lead could read, not another CSV.', meta: 'Marcus' },
        { type: 'system', text: 'Pattern strengthened: exports are being used as a workaround for shareable reporting.', meta: 'Observant' }
      ]
    },
    {
      kicker: 'Today · your team steers it',
      title: 'Relay a question into the live lines.',
      copy: 'The team can steer learning without stopping the autopilot. Observant threads a question into ongoing conversations with the right context.',
      status: 'Team question ready',
      signal: 188,
      pattern: 54,
      patternCopy: 'The signal is strong enough to ask a sharper question across active lines today.',
      active: 'dana',
      conversation: 'Dana K.',
      label: 'Private 1:1 · in product',
      lines: {
        dana: 'Active now; ready for a team relay.',
        marcus: 'Recent evidence supports the same direction.',
        priya: 'Email line can receive the same question async.'
      },
      memory: [
        'Dana needs a team-readable view by Monday.',
        'Marcus wants a link, not another export.',
        'Priya shares reports from her inbox.'
      ],
      activity: [
        'Northwind team opened the export question.',
        'Observant found active users with relevant memory.',
        'Relay is ready to thread into live 1:1s.'
      ],
      messages: [
        { type: 'them', text: 'The Northwind team is looking at the reporting workflow today. I have enough context to ask a sharper follow-up.', meta: 'Observant · still learning' },
        { type: 'system', text: 'Relay one question when you are ready.', meta: 'Your team' }
      ]
    },
    {
      kicker: 'Next · insight reaches the build',
      title: 'Observant surfaces what changed.',
      copy: 'The result is grounded in remembered conversations and recent behavior. The loop does not end here; Observant keeps watching whether the shipped fix changes the pattern.',
      status: 'Loop still running',
      signal: 252,
      pattern: 61,
      patternCopy: 'The shareable dashboard pattern is now strong enough to hand to your agent, and Observant will keep learning after it ships.',
      active: 'dana',
      conversation: 'Dana K.',
      label: 'Private 1:1 · in product',
      lines: {
        dana: 'Confirmed a live dashboard would replace the cleanup.',
        marcus: 'Confirmed a share link would solve the handoff.',
        priya: 'Said email updates should include the same live view.'
      },
      memory: [
        '61% want a live, shareable view.',
        'CSV should remain secondary for raw export.',
        'Next learning trigger: usage of the new share link.'
      ],
      activity: [
        'Insight surfaced without a new study.',
        'Agent-ready PRD attached to the finding.',
        'Observant keeps the lines open for the shipped fix.'
      ],
      messages: [
        { type: 'relay', text: 'Would a live, shareable dashboard solve this?', meta: 'Relayed from your product team' },
        { type: 'them', text: 'One more from the Northwind team - would a live, shareable dashboard replace the cleanup you do after export?', meta: 'Observant · relaying' },
        { type: 'user', text: 'Yes. If I could send a link before the Monday meeting, I would stop rebuilding the sheet.', meta: 'Dana' },
        { type: 'system', text: 'Surfaced without a new study: 61% want a live, shareable view. Loop still running.', meta: 'Observant' }
      ]
    }
  ];

  const people = [
    { id: 'dana', name: 'Dana K.', surface: 'in product', initial: 'D', color: 'oklch(0.62 0.10 30)' },
    { id: 'marcus', name: 'Marcus T.', surface: 'browser companion', initial: 'M', color: 'oklch(0.58 0.09 150)' },
    { id: 'priya', name: 'Priya S.', surface: 'email', initial: 'P', color: 'oklch(0.55 0.10 260)' }
  ];

  const root = document.querySelector('[data-control-room]');
  const nav = document.querySelector('.nav');
  const state = { current: 0, started: false, relaySent: false };

  const $ = (sel) => root ? root.querySelector(sel) : null;
  const $$ = (sel) => root ? Array.from(root.querySelectorAll(sel)) : [];

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[ch]));
  }

  function msgHtml(message) {
    return '<div class="demo-msg ' + message.type + '">' +
      '<div class="bubble">' + escapeHtml(message.text) + '</div>' +
      (message.meta ? '<div class="meta">' + escapeHtml(message.meta) + '</div>' : '') +
      '</div>';
  }

  function renderLines(moment) {
    const lines = $('[data-lines]');
    lines.innerHTML = people.map((person) => {
      const active = person.id === moment.active ? ' is-active' : '';
      return '<article class="line-card' + active + '">' +
        '<div class="line-top">' +
          '<span class="line-ava" style="background:' + person.color + '">' + person.initial + '</span>' +
          '<div><div class="line-name">' + person.name + '</div><span class="line-surface">' + person.surface + '</span></div>' +
        '</div>' +
        '<div class="line-status">' + escapeHtml(moment.lines[person.id]) + '</div>' +
      '</article>';
    }).join('');
  }

  function renderList(selector, items) {
    const el = $(selector);
    el.innerHTML = items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('');
  }

  function renderConversation(moment) {
    const body = $('[data-conversation]');
    let messages = moment.messages.slice();
    if (state.current === 3 && state.relaySent) {
      messages = [
        { type: 'relay', text: 'Would a live, shareable dashboard solve this?', meta: 'Relayed from your product team' },
        { type: 'them', text: 'One more from the Northwind team - would a live, shareable dashboard replace the cleanup you do after export?', meta: 'Observant · relaying' },
        { type: 'user', text: 'Yes. If I could send a link before Monday, I would stop rebuilding the sheet.', meta: 'Dana' },
        { type: 'system', text: 'Pattern strengthened. Observant keeps listening for this across active lines.', meta: 'Still learning' }
      ];
    }
    body.innerHTML = messages.map(msgHtml).join('');
    body.scrollTop = body.scrollHeight;
  }

  function render() {
    if (!root) return;
    const moment = moments[state.current];
    $('[data-room-status]').textContent = moment.status;
    $('[data-stage-kicker]').textContent = moment.kicker;
    $('[data-stage-title]').textContent = moment.title;
    $('[data-stage-copy]').textContent = moment.copy;
    $('[data-signal-count]').textContent = moment.signal;
    $('[data-conversation-label]').textContent = moment.label;
    $('[data-conversation-title]').textContent = moment.conversation;
    $('[data-pattern-value]').textContent = moment.pattern + '%';
    $('[data-pattern-copy]').textContent = moment.patternCopy;
    $('[data-pattern-bar]').style.width = moment.pattern + '%';

    $$('.time-step').forEach((btn, i) => {
      btn.classList.toggle('is-active', i === state.current);
      btn.classList.toggle('is-done', i < state.current);
    });

    renderLines(moment);
    renderList('[data-memory]', moment.memory);
    renderList('[data-activity]', moment.activity);
    renderConversation(moment);

    const relayPanel = $('[data-relay-panel]');
    const insightPanel = $('[data-insight-panel]');
    relayPanel.hidden = state.current !== 3 || state.relaySent;
    insightPanel.hidden = state.current !== 4;

    $('[data-back]').disabled = state.current === 0;
    $('[data-next]').textContent = state.started ? (state.current === moments.length - 1 ? 'Keep watching' : 'Next') : 'Start';
  }

  function goTo(index) {
    state.started = true;
    state.current = Math.max(0, Math.min(moments.length - 1, index));
    if (state.current !== 3) state.relaySent = false;
    render();
  }

  function next() {
    if (!state.started) {
      state.started = true;
    } else if (state.current < moments.length - 1) {
      state.current += 1;
      if (state.current !== 3) state.relaySent = false;
    }
    render();
  }

  function back() {
    if (state.current > 0) {
      state.current -= 1;
      if (state.current !== 3) state.relaySent = false;
      state.started = true;
      render();
    }
  }

  function reset() {
    state.current = 0;
    state.started = false;
    state.relaySent = false;
    render();
  }

  function initReveals() {
    const reveals = Array.from(document.querySelectorAll('.reveal'));
    const inView = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    };
    const show = (el) => el.classList.add('in');
    reveals.forEach((el) => { if (inView(el)) show(el); });
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
      reveals.forEach((el) => { if (!el.classList.contains('in')) obs.observe(el); });
    }
    window.addEventListener('scroll', () => {
      reveals.forEach((el) => { if (!el.classList.contains('in') && inView(el)) show(el); });
    }, { passive: true });
    setTimeout(() => reveals.forEach(show), 2500);
  }

  function init() {
    if (nav) {
      const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 12);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    if (root) {
      $$('.time-step').forEach((btn) => {
        btn.addEventListener('click', () => goTo(parseInt(btn.dataset.step, 10)));
      });
      $('[data-next]').addEventListener('click', next);
      $('[data-back]').addEventListener('click', back);
      $('[data-reset]').addEventListener('click', reset);
      $('[data-relay]').addEventListener('click', () => {
        state.relaySent = true;
        render();
      });
      render();
    }

    document.querySelectorAll('[data-demo-start]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.started = true;
        state.current = 0;
        state.relaySent = false;
        render();
      });
    });

    const yr = document.getElementById('year');
    if (yr) yr.textContent = new Date().getFullYear();
    initReveals();
  }

  init();
})();
