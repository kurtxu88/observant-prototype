/* ============================================================
   EDDA app — seed data (demo workspace: "Northwind")
   ============================================================ */

const PANEL = {
  dana: {
    id: "dana", name: "Dana K.", color: "rust", cohort: "Power user", surface: "in your product",
    last: "A live dashboard is exactly the thing I keep wishing existed.", time: "2m", live: true,
    thread: [
      { t: "them", text: "Hi Dana — it's Edda. You just shipped your third weekly export. Mind if I ask what you do with it once it leaves the app?", meta: "Edda · auto-started · Mon" },
      { t: "user", text: "Honestly I paste it into a Google Sheet and rebuild half of it by hand.", meta: "Dana · Mon" },
      { t: "them", text: "That sounds tedious. What's the part you rebuild — the formatting, or the actual numbers?", meta: "Edda" },
      { t: "user", text: "The layout, mostly. I need a version my whole team can glance at without me explaining it.", meta: "Dana" },
    ],
  },
  marcus: {
    id: "marcus", name: "Marcus T.", color: "green", cohort: "Power user", surface: "browser companion",
    last: "I hit the rate limit again around 4pm.", time: "18m", live: true,
    thread: [
      { t: "them", text: "Hey Marcus — noticed you ran into an error twice this afternoon. What were you trying to do right then?", meta: "Edda · behavior-triggered" },
      { t: "user", text: "Bulk-importing my Q2 contacts. I hit the rate limit again around 4pm.", meta: "Marcus" },
      { t: "them", text: "Got it. Is bulk import usually a once-a-quarter thing, or more often?", meta: "Edda" },
    ],
  },
  priya: {
    id: "priya", name: "Priya S.", color: "blue", cohort: "Early adopter", surface: "email",
    last: "Day one — still figuring out where things are.", time: "1h", live: false,
    thread: [
      { t: "them", text: "Welcome to Northwind, Priya! I'm Edda — I'll check in now and then to learn what's working for you. What made you sign up this week?", meta: "Edda · onboarding · day 1" },
      { t: "user", text: "My old tool got acquired and shut down. Day one here — still figuring out where things are.", meta: "Priya" },
    ],
  },
  leah: {
    id: "leah", name: "Leah M.", color: "plum", cohort: "Recruited", surface: "Edda app",
    last: "I'd probably stay if the mobile app caught up.", time: "3h", live: false,
    thread: [
      { t: "them", text: "Thanks for joining the panel, Leah. You mentioned you've been evaluating a few tools — what would make you commit to one?", meta: "Edda · churn follow-up" },
      { t: "user", text: "I'd probably stay if the mobile app caught up. Desktop is great, mobile feels like an afterthought.", meta: "Leah" },
    ],
  },
  owen: {
    id: "owen", name: "Owen R.", color: "gold", cohort: "Power user", surface: "in your product",
    last: "The API is the whole reason I'm here.", time: "5h", live: false,
    thread: [
      { t: "them", text: "Owen — you're in the top 1% of API usage this month. What are you building on top of us?", meta: "Edda · behavior-triggered" },
      { t: "user", text: "An internal ops dashboard for my team. The API is the whole reason I'm here.", meta: "Owen" },
    ],
  },
};

const PROGRAMS = [
  {
    id: "power-diary", name: "Power-user diary", status: "live",
    desc: "A rolling diary study across your most engaged users.",
    panelSize: 128, activeNow: 3, tier: "6-month continuous",
    members: ["dana", "marcus", "owen"],
    cohorts: [
      { name: "Power users", n: 128, pct: 100, color: "var(--accent)" },
    ],
    insights: [
      { q: "Why do power users rebuild the export by hand?", meta: "synthesis · 252 conversations · 2d ago" },
      { q: "Which workflows trigger the rate limit?", meta: "bottom-up · surfaced 4h ago" },
    ],
  },
  {
    id: "onboarding", name: "Launch-traffic onboarding", status: "live",
    desc: "Meets every new signup on day one to learn what brought them.",
    panelSize: 74, activeNow: 1, tier: "1-month",
    members: ["priya"],
    cohorts: [
      { name: "Early adopters", n: 74, pct: 100, color: "var(--success)" },
    ],
    insights: [
      { q: "What pushed new users to switch this week?", meta: "synthesis · 74 conversations · 1d ago" },
    ],
  },
  {
    id: "churn", name: "Churn signals", status: "live",
    desc: "Recruited panel probing why evaluators don't convert.",
    panelSize: 50, activeNow: 1, tier: "6-month continuous",
    members: ["leah"],
    cohorts: [
      { name: "Recruited (Prolific)", n: 50, pct: 100, color: "var(--blue)" },
    ],
    insights: [
      { q: "What's the #1 reason evaluators churn before week 2?", meta: "synthesis · 50 conversations · 6h ago" },
    ],
  },
];

const GOAL_CHIPS = [
  "Why power users churn", "What to build next", "Onboarding friction",
  "Pricing willingness", "Feature validation", "Why people switched to us",
];

Object.assign(window, { PANEL, PROGRAMS, GOAL_CHIPS });
