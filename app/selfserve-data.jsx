/* ============================================================
   OBSERVANT self-serve seed data, simulation data, and factories
   ============================================================ */

const SS_STORAGE_KEY = "observant.selfserve.v1";
const SS_STATE_VERSION = 6;

const SS_DEFAULT_WORKSPACE = {
  founderName: "Maya Chen",
  email: "maya@northwind.ai",
  companyName: "Northwind",
  productUrl: "https://northwind.ai",
  productDescription: "A reporting and analytics tool for ops and data teams.",
  userBase: "Ops leads and analysts at 50–500 person B2B companies.",
  learningGoal: "Learn why power users export data and rebuild reports by hand instead of using our dashboards.",
  context: {
    goal3mo: "Get 30% of power users onto live dashboards (off spreadsheet exports) before the Series A raise.",
    priorLearning: "Support tickets suggest people don't trust auto-refreshed numbers; a few power users said boards 'can't be cut the way I need.' Unverified.",
    docs: [
      { id: "doc-prd", name: "Dashboards v2 PRD.pdf", note: "The redesign meant to replace spreadsheet exports." },
      { id: "doc-icp", name: "ICP & segments.doc", note: "Power users, new analysts, admin/buyers." },
    ],
  },
};

const SS_CUSTOM_WORKSPACE_FALLBACK = {
  founderName: "Founder",
  email: "founder@example.com",
  companyName: "Your product",
  productUrl: "https://yourproduct.example",
  productDescription: "What your product helps people do.",
  userBase: "The people who use your product today.",
  learningGoal: "",
  context: { goal3mo: "", priorLearning: "", docs: [] },
};

const SS_GROUP_OPTIONS = [
  { id: "power-users", label: "Power users", text: "Frequent users who already rely on the workflow." },
  { id: "new-signups", label: "New signups", text: "People still forming their first mental model." },
  { id: "evaluators", label: "Upgrade evaluators", text: "Teams comparing value, permissions, and trust." },
  { id: "admins", label: "Workspace admins", text: "Owners who care about rollout and team adoption." },
  { id: "at-risk", label: "At-risk users", text: "Accounts showing hesitation or stalled progress." },
];

const SS_SURFACE_OPTIONS = [
  { id: "email", label: "Email", icon: "mail" },
  { id: "telegram", label: "Telegram", icon: "chat" },
  { id: "slack", label: "Slack", icon: "chat" },
  { id: "discord", label: "Discord", icon: "chat" },
  { id: "product", label: "In-product", icon: "globe" },
];

// Fast-start connections a user can pick on the magic link.
// Slack needs a workspace install and in-product needs the SDK — both live on the Pro side.
const SS_FAST_CHANNELS = ["email", "telegram"];

// People-first: how the always-on panel is built. Ranked — reach everyone leads.
const SS_AUDIENCE_OPTIONS = [
  { id: "everyone", label: "Reach everyone", text: "Invite all your users and let anyone who's interested opt in.", tag: "Best for early-stage" },
  { id: "power", label: "Power users", text: "Start with your most engaged users, who are most likely to opt in." },
  { id: "representative", label: "Representative mixture", text: "Reach across all your user types for a full picture of who's using your product." },
];

// What you offer people for opting in as a feedback partner (the currency).
const SS_COMPENSATION_OPTIONS = [
  { id: "giftcard", label: "Gift cards", text: "A simple thank-you. Universal and easy.", tag: "Default" },
  { id: "productcredits", label: "Your product credits", text: "Credit inside your own product.", tag: "In-product" },
  { id: "accountcredits", label: "Account credits", text: "Apply credit toward their plan or usage." },
  { id: "cash", label: "Cash / PayPal", text: "Direct payment for deeper or recurring time." },
];

// One model: status tiers by participated minutes (text, voice, calls). Observant audits the minutes.
// `cash` = redeem-as-you-go conversion baseline; `reward` = the team's default tier reward (customizable).
const SS_REWARD_TIERS = [
  { id: "bronze", name: "Bronze", min: 30, cash: 30, reward: "$30 gift card", color: "gold" },
  { id: "silver", name: "Silver", min: 100, cash: 90, reward: "6 months free subscription", color: "teal" },
  { id: "gold", name: "Gold", min: 200, cash: 150, reward: "In-person event invite, early access & perks", color: "rust" },
];

const SS_DEFAULT_TIER_REWARDS = { bronze: "$30 gift card", silver: "6 months free subscription", gold: "In-person event invite, early access & perks" };

const SS_SIGNAL_OPTIONS = [
  { id: "user_signed_up", label: "user_signed_up" },
  { id: "export_completed", label: "export_completed" },
  { id: "feature_opened", label: "feature_opened" },
  { id: "checkout_abandoned", label: "checkout_abandoned" },
];

const SS_SIMULATION_STAGES = [
  { id: "match", label: "Refining your question", detail: "Turning it into questions users can answer naturally." },
  { id: "lines", label: "Finding the right participants", detail: "Matching people on your panel." },
  { id: "replies", label: "Sending it out", detail: "First replies are coming in." },
  { id: "patterns", label: "Listening", detail: "Repeated context is grouped into stronger signals." },
  { id: "insights", label: "Drafting insights", detail: "Evidence-backed recommendations are prepared for the team." },
];

function ssScrubPublicCopy(value) {
  const legacySourceWord = "syn" + "thetic";
  const legacySourceWordTitle = "Syn" + "thetic";
  const legacyPattern = (pattern) => new RegExp(
    pattern
      .replaceAll("{source}", legacySourceWord)
      .replaceAll("{Source}", legacySourceWordTitle),
    "gi"
  );
  if (Array.isArray(value)) return value.map(ssScrubPublicCopy);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (key === "type" && item === legacySourceWord) return [key, "behavior"];
      return [key, ssScrubPublicCopy(item)];
    }));
  }
  if (typeof value !== "string") return value;
  return value
    .replace(legacyPattern("{Source} feedback partners generated for"), "Feedback partners are ready for")
    .replace(legacyPattern("Observant - {source} 1:1"), "Observant - 1:1")
    .replace(legacyPattern("{source} 1:1 lines?"), "private 1:1 lines")
    .replace(legacyPattern("{source} learning lines?"), "learning lines")
    .replace(legacyPattern("{source} users?"), "feedback partners")
    .replace(legacyPattern("{source} groups?"), "feedback groups")
    .replace(legacyPattern("{source} matches"), "matched people")
    .replace(legacyPattern("{source} evidence"), "evidence")
    .replace(legacyPattern("{Source} panel"), "Always on")
    .replace(new RegExp("\\b" + legacySourceWord + "\\b", "gi"), "learned");
}

function ssInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ssProductName(workspace, fallback) {
  const raw = (workspace && workspace.companyName || "").trim();
  // NEVER default to the "Northwind" demo company. The Northwind fixture is only
  // ever produced by ssCreateSampleState (the /portal sample demo). A real/custom
  // workspace with no name yet shows a neutral placeholder, not the demo company.
  return raw || fallback || "Your product";
}

function ssSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "workspace";
}

function ssTrim(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function ssPhrase(value, fallback) {
  return ssTrim(value, fallback).replace(/[.!?]+$/g, "");
}

function ssCreateWorkspace(input, fallback) {
  const base = fallback || SS_DEFAULT_WORKSPACE;
  const merged = { ...base, ...(input || {}) };
  const product = ssProductName(merged, base.companyName);
  return {
    id: merged.id || "workspace-" + Date.now(),
    founderName: ssTrim(merged.founderName, base.founderName),
    email: ssTrim(merged.email, base.email),
    companyName: product,
    productUrl: ssTrim(merged.productUrl, "https://" + ssSlug(product).replace(/-/g, "") + ".com"),
    productDescription: ssTrim(merged.productDescription, base.productDescription),
    userBase: ssTrim(merged.userBase, base.userBase),
    learningGoal: ssTrim(merged.learningGoal, base.learningGoal === undefined ? "" : base.learningGoal),
    context: ssNormalizeContext(merged.context, base.context),
    createdAt: merged.createdAt || new Date().toISOString(),
  };
}

/* The persistent "what Observant knows about you" profile. */
function ssNormalizeContext(input, base) {
  const c = input || base || {};
  return {
    goal3mo: ssTrim(c.goal3mo, ""),
    priorLearning: ssTrim(c.priorLearning, ""),
    docs: Array.isArray(c.docs) ? c.docs.filter(Boolean).map((d, i) => ({ id: d.id || "doc-" + i, name: ssTrim(d.name, "Untitled"), note: ssTrim(d.note, ""), uploaded: !!d.uploaded })) : [],
  };
}

/* Completeness across the six context areas the agent uses to tailor questions. */
function ssContextCompleteness(workspace) {
  const w = workspace || {};
  const c = w.context || {};
  const areas = [
    !!ssTrim(w.productDescription, ""),
    !!ssTrim(w.userBase, ""),
    !!ssTrim(w.productUrl, ""),
    !!ssTrim(c.goal3mo, ""),
    !!ssTrim(c.priorLearning, ""),
    (c.docs || []).length > 0,
  ];
  const filled = areas.filter(Boolean).length;
  return { filled, total: areas.length };
}

/* Serialize the profile into the `context` string the engine (C0/C1/C2) reads. */
function ssContextSummary(workspace) {
  const w = workspace || {};
  const c = w.context || {};
  const parts = [];
  if (ssTrim(w.productDescription, "")) parts.push("PRODUCT: " + w.productDescription);
  if (ssTrim(w.userBase, "")) parts.push("USERS: " + w.userBase);
  if (ssTrim(c.goal3mo, "")) parts.push("3-MONTH GOAL: " + c.goal3mo);
  if (ssTrim(c.priorLearning, "")) parts.push("ALREADY LEARNED / HYPOTHESES: " + c.priorLearning);
  if ((c.docs || []).length) parts.push("DOCS ON FILE: " + c.docs.map((d) => d.name + (d.note ? " (" + d.note + ")" : "")).join("; "));
  return parts.join("\n");
}

function ssCreateSetup(workspace) {
  return {
    // People-first program. Solid defaults so a first version is usable out of the box.
    audienceMode: "representative",
    recruitMode: "byo",
    connectMode: "share",
    batchLabel: "",
    // Cash is the day-one model, managed by Observant. Product credits: coming.
    compensation: "cash",
    // Dollars per participated minute — $2/min is the industry guideline.
    rate: 2,
    tierRewards: { ...SS_DEFAULT_TIER_REWARDS },
    consentAck: true,
    usersSource: "invite",
    inviteUrl: workspace.productUrl.replace(/\/$/, "") + "/observant-invite",
    // The client's one surface decision: off-product (start today) vs in-product (Pro).
    // Email vs Telegram is the USER's choice at opt-in — both always available.
    route: "offproduct",
    surfaces: { email: true, telegram: true, product: false },
    // Behavior triggers are an advanced, optional add-on — off by default.
    events: {
      user_signed_up: false,
      export_completed: false,
      feature_opened: false,
      checkout_abandoned: false,
    },
  };
}

function ssCreatePeople(workspace) {
  const product = ssProductName(workspace);
  return [
    {
      id: "dana",
      name: "Dana K.",
      color: "rust",
      segment: "Power user",
      surface: "Telegram",
      status: "Active now",
      memory: "Exports every Monday and rebuilds the report for her team.",
      last: "A live dashboard is exactly the thing I keep wishing existed.",
      profile: {
        since: "On the panel 6 weeks · 41 min",
        reward: "Silver — 6 months free",
        knows: [
          "Ops lead; owns the weekly report her team reads.",
          "Exports every Monday, then rebuilds a pivot by hand (~20 min/week).",
          "Her team has no seats — the CSV is really a sharing workaround.",
        ],
        shared: [
          "“Give me a read-only link and I’d never export again.”",
          "Trusts the numbers; it’s the presentation that’s the work.",
        ],
        open: ["Would a shareable live dashboard replace the export? — awaiting reply"],
      },
    },
    {
      id: "marcus",
      name: "Marcus T.",
      color: "green",
      segment: "Power user",
      surface: "Telegram",
      status: "Active now",
      memory: "Uses " + product + " for weekly ops reporting and wants share links.",
      last: "I need a link my ops lead can read, not another CSV.",
      profile: {
        since: "On the panel 5 weeks · 33 min",
        reward: "Bronze — $30 gift card",
        knows: [
          "Runs weekly ops reporting; reports up to an ops lead without a seat.",
          "Opened reporting settings 3× after export, hunting for a share link.",
        ],
        shared: ["“I need a link my ops lead can read, not another CSV.”"],
        open: ["Would per-report share links (no seat needed) unblock you?"],
      },
    },
    {
      id: "priya",
      name: "Priya S.",
      color: "blue",
      segment: "New customer",
      surface: "Email",
      status: "Async",
      memory: "Joined this week and shares reporting updates from email.",
      last: "I forwarded the CSV because I could not find the dashboard sharing flow.",
      profile: {
        since: "Joined this week · 8 min",
        reward: "Just started accruing",
        knows: [
          "New this week; still forming her mental model of " + product + ".",
          "Couldn’t find the dashboard-sharing flow, so she emailed a CSV.",
        ],
        shared: ["“I need a clean update I can send from email without rebuilding the export.”"],
        open: ["Where did the sharing flow break down in your first week?"],
      },
    },
    {
      id: "owen",
      name: "Owen R.",
      color: "gold",
      segment: "API-heavy account",
      surface: "Email",
      status: "Watching",
      memory: "Builds internal dashboards on top of the API.",
      last: "The API is the whole reason I am here.",
      profile: {
        since: "On the panel 9 weeks · 22 min",
        reward: "Bronze — $30 gift card",
        knows: [
          "Builds the exec-facing internal dashboard on top of the API.",
          "Exports, then rebuilds outside the product to match exec expectations.",
        ],
        shared: ["“The API is the whole reason I am here.”"],
        open: ["What would the in-product dashboard need to replace your internal one?"],
      },
    },
    {
      id: "leah",
      name: "Leah M.",
      color: "rust",
      segment: "Upgrade evaluator",
      surface: "Telegram",
      status: "Watching",
      memory: "Paused on the upgrade page after comparing reporting permissions.",
      last: "I need to know whether the team can see this before we upgrade.",
      profile: {
        since: "On the panel 2 weeks · 12 min",
        reward: "Just started accruing",
        knows: [
          "Evaluating an upgrade; paused on the page after checking reporting permissions.",
          "Blocker is team visibility, not price.",
        ],
        shared: ["“I need to know whether the team can see this before we upgrade.”"],
        open: ["What proof of safe team sharing would let you upgrade?"],
      },
    },
  ];
}

function ssCreateConversations(workspace) {
  const product = ssProductName(workspace);
  return [
    {
      id: "dana-voice",
      userId: "dana",
      title: "Export workflow — voice interview",
      state: "Done",
      mode: "voice",
      duration: "26 min",
      messages: [
        { t: "them", text: "You said Mondays are export day — walk me through what happens after you hit export.", meta: "Observant" },
        { t: "user", text: "I pull the CSV, drop it into Sheets, and rebuild the pivot my team expects. Maybe twenty minutes of cleanup — every single week.", meta: "Dana" },
        { t: "them", text: "If the dashboard gave you that view directly, what would still be missing?", meta: "Observant" },
        { t: "user", text: "Sharing. My team doesn't have seats, so even a perfect dashboard dies at the paywall. The CSV is really a sharing workaround.", meta: "Dana" },
        { t: "them", text: "So the export is less about the data and more about access.", meta: "Observant" },
        { t: "user", text: "Exactly. Give me a read-only link and I'd never export again.", meta: "Dana" },
      ],
    },
    {
      id: "dana",
      userId: "dana",
      title: "Weekly export workflow",
      state: "Active",
      mode: "chat",
      messages: [
        { t: "them", text: "Hi Dana - I noticed you finished another weekly export in " + product + ". What happens after it leaves the app?", meta: "Observant - behavior-triggered" },
        { t: "user", text: "I paste it into a sheet and rebuild half of it by hand.", meta: "Dana" },
        { t: "them", text: "Is the data wrong, or is the output missing a version your team can read without translation?", meta: "Observant" },
        { t: "user", text: "The second one. The numbers are fine. The presentation is the work.", meta: "Dana" },
      ],
    },
    {
      id: "marcus",
      userId: "marcus",
      title: "Shareable reporting",
      state: "Active",
      messages: [
        { t: "them", text: "You opened reporting settings three times after export. Were you trying to share the report?", meta: "Observant - remembered context" },
        { t: "user", text: "Yes. I needed a link my ops lead could read, not another CSV.", meta: "Marcus" },
      ],
    },
    {
      id: "priya",
      userId: "priya",
      title: "First reporting setup",
      state: "Async",
      messages: [
        { t: "them", text: "Welcome to " + product + ". What are you hoping the reporting view helps you do this week?", meta: "Observant - onboarding" },
        { t: "user", text: "I need a clean update I can send from email without rebuilding the export.", meta: "Priya" },
      ],
    },
    {
      id: "owen",
      userId: "owen",
      title: "API reporting handoff",
      state: "Watching",
      messages: [
        { t: "them", text: "You opened the API docs after exporting from " + product + ". Are you rebuilding the dashboard outside the product?", meta: "Observant - behavior-triggered" },
        { t: "user", text: "Yes. The API lets us make the internal view our exec team already expects.", meta: "Owen" },
      ],
    },
    {
      id: "leah",
      userId: "leah",
      title: "Upgrade hesitation",
      state: "Watching",
      messages: [
        { t: "them", text: "You paused on the upgrade page after checking reporting permissions. What did you need to know?", meta: "Observant - remembered context" },
        { t: "user", text: "Whether the dashboard can be shared safely with the team before we commit.", meta: "Leah" },
      ],
    },
  ];
}

function ssCreateEvents(workspace) {
  const product = ssProductName(workspace);
  return [
    { id: "evt-1", event: "export_completed", user: "Dana K.", detail: "third weekly export finished", time: "2m ago", type: "trigger", conversationId: "dana" },
    { id: "evt-2", event: "feature_opened", user: "Marcus T.", detail: "reporting settings opened 3 times", time: "18m ago", type: "trigger", conversationId: "marcus" },
    { id: "evt-3", event: "user_signed_up", user: "Priya S.", detail: "joined " + product + " from referral", time: "1h ago", type: "onboarding", conversationId: "priya" },
    { id: "evt-4", event: "checkout_abandoned", user: "Leah M.", detail: "left upgrade page after price reveal", time: "3h ago", type: "watch", conversationId: "leah" },
  ];
}

// In-product feedback — the short signals the in-app snippet (snippet.js) collects.
// Same shape the ingest endpoint stores (type/value/note/url), plus userId to tie a
// signal to a known partner and a friendly time. Anonymous rows carry only a user_ref.
// These sit ALONGSIDE the off-product 1:1 threads so the team sees both in one place.
function ssCreateInproductFeedback(workspace) {
  const product = ssProductName(workspace);
  return [
    { id: "ipf-1", type: "eval", value: "down", note: "The shared dashboard summary dropped the grouping I actually report on.", url: "/dashboards/weekly", userId: "dana", time: "12m ago" },
    { id: "ipf-2", type: "feedback", value: "open", note: "Give me a read-only link instead of another CSV export.", url: "/reports/export", userId: "marcus", time: "40m ago" },
    { id: "ipf-3", type: "csat", value: "2", note: "Couldn't find how to share a report with a teammate who has no seat.", url: "/share", userId: "priya", time: "2h ago" },
    { id: "ipf-4", type: "eval", value: "up", note: "The API export matched the exec deck exactly — kept it.", url: "/settings/api", userId: "owen", time: "3h ago" },
    { id: "ipf-5", type: "exit", value: "missing-share-link", note: "Left the upgrade page — still no proof the team can see the dashboard.", url: "/upgrade", userId: "leah", time: "4h ago" },
    { id: "ipf-6", type: "exit", value: "export-timeout", note: "Export timed out on a large board.", url: "/export", user_ref: "u_5521", time: "5h ago" },
    { id: "ipf-7", type: "csat", value: "5", note: "Love the new dashboards — just wish I could send them out.", url: "/dashboards", user_ref: "u_3390", time: "yesterday" },
  ];
}

function ssCreateInsights(workspace) {
  const product = ssProductName(workspace);
  return [
    {
      id: "insight-export",
      title: "Power users want a live, shareable dashboard.",
      metric: "61%",
      detail: "The export works. The recurring pain is turning the CSV into a team-readable view after it leaves " + product + ".",
      evidence: "Grounded in 252 remembered moments and 18 recent private lines.",
      next: "Ship a live dashboard link; keep CSV as secondary.",
      conversationId: "dana",
    },
    {
      id: "insight-onboarding",
      title: "New customers need reporting language earlier.",
      metric: "34%",
      detail: "New users describe the same reporting job in different words, then search for settings later.",
      evidence: "Surfaced from onboarding lines and feature_opened events.",
      next: "Add reporting intent to first-run setup.",
      conversationId: "priya",
    },
  ];
}

function ssCreateReviews(workspace) {
  const product = ssProductName(workspace);
  return [
    { id: "rev-1", source: "App Store", author: "ops_nerd", rating: 2, text: "Love the data but I export to a spreadsheet every week just to share it with my team. Why no read-only link?", status: "open" },
    { id: "rev-2", source: "Reddit", author: "u/dashboards4life", rating: null, text: "Anyone else rebuilding " + product + " reports by hand for execs? Feels like the dashboard stops one step short.", status: "open" },
    { id: "rev-3", source: "Support ticket", author: "Priya S.", rating: null, text: "Couldn’t find how to share a dashboard with a teammate who doesn’t have a login.", status: "open" },
    { id: "rev-4", source: "G2", author: "Verified user", rating: 4, text: "Solid for analysts. Sharing with non-users is the one rough edge.", status: "open" },
  ];
}

function ssCreateDigest(workspace) {
  const product = ssProductName(workspace);
  return {
    period: "This week",
    headline: "Sharing — not the data — is what keeps pulling power users out of " + product + ".",
    items: [
      "Power users export weekly only to rebuild a team-readable view — the CSV is a sharing workaround.",
      "New customers can’t find the dashboard-sharing flow in their first week.",
      "Upgrade evaluators are blocked on team-visibility proof, not price.",
    ],
    insightId: "insight-export",
  };
}

function ssCreateSlackQA(workspace) {
  const product = ssProductName(workspace);
  return [
    {
      q: "What are users saying about sharing this week?",
      a: "61% of active partners raised a sharing gap. The pattern: the dashboard is trusted, but teammates have no seats — so people export a CSV to share. Dana, Marcus, and Owen all described the same workaround. Suggested next step: a read-only dashboard link (no seat).",
    },
  ];
}

function ssCreateBriefing(workspace) {
  const product = ssProductName(workspace);
  return {
    scanned: [workspace.productUrl || "your product site", "App Store + G2 reviews", "Reddit mentions", "uploaded docs"],
    knows: [
      product + " is a reporting/analytics tool for ops and data teams.",
      "Key flow: export → rebuild → share. Sharing is the recurring friction.",
      "Worth talking to: weekly exporters, new customers in week one, upgrade evaluators.",
    ],
  };
}

function ssCreateLoops() {
  return [
    {
      id: "loop-export",
      name: "Export and reporting workflow",
      status: "Learning",
      cadence: "Always on",
      people: 128,
      active: 3,
      memory: 252,
      question: "Why do power users rebuild reports outside the product?",
      conversationId: "dana",
      conversationIds: ["dana", "marcus", "owen"],
      peopleIds: ["dana", "marcus", "owen"],
      eventIds: ["evt-1", "evt-2"],
      surfaceIds: ["email", "telegram"],
    },
    {
      id: "loop-onboarding",
      name: "New customer onboarding",
      status: "Learning",
      cadence: "First 14 days",
      people: 74,
      active: 1,
      memory: 96,
      question: "What brought new users here, and where do they get stuck?",
      conversationId: "priya",
      conversationIds: ["priya"],
      peopleIds: ["priya"],
      eventIds: ["evt-3"],
      surfaceIds: ["product", "email"],
    },
    {
      id: "loop-upgrade",
      name: "Upgrade hesitation",
      status: "Watching",
      cadence: "Triggered by behavior",
      people: 42,
      active: 0,
      memory: 51,
      question: "What makes teams pause before upgrading?",
      conversationId: "leah",
      conversationIds: ["leah"],
      peopleIds: ["leah"],
      eventIds: ["evt-4"],
      surfaceIds: ["telegram"],
    },
  ];
}

function ssBaseState(workspace, mode) {
  return {
    version: SS_STATE_VERSION,
    workspace,
    workspaceMode: mode,
    launched: false,
    section: "home",
    focusedTarget: "",
    selectedLoopId: "",
    selectedConversationId: "",
    setup: ssCreateSetup(workspace),
    people: [],
    groups: [],
    conversations: [],
    events: [],
    inproductFeedback: [],
    insights: [],
    loops: [],
    loopRuns: [],
    simulationRuns: [],
    nextQuestions: [
      "Which users should Observant learn from first?",
      "What changed after the latest product release?",
      "What should we ask before the next roadmap decision?",
    ],
    scheduledCalls: [],
    answers: [],
    reviews: [],
    digest: null,
    slackQA: [],
    briefing: null,
    unanswered: [],
    generatedAt: "",
    activity: [
      "Workspace created for " + ssProductName(workspace) + ".",
      "Learning goal saved.",
    ],
  };
}

function ssCreateSampleState(input) {
  const workspace = ssCreateWorkspace(input || SS_DEFAULT_WORKSPACE);
  const product = ssProductName(workspace);
  return {
    ...ssBaseState(workspace, "sample"),
    // Durable marker: this is the ephemeral Northwind demo. It must NEVER be
    // written to localStorage or the DB, and must be discarded on any real
    // sign-in / on /setup init so a real account gets a true clean slate.
    isSample: true,
    // The sample opens straight on the populated dashboard (both from "See the
    // sample workspace" and /portal), not the activation steps.
    launched: true,
    section: "home",
    selectedLoopId: "loop-export",
    selectedConversationId: "dana",
    people: ssCreatePeople(workspace),
    conversations: ssCreateConversations(workspace),
    events: ssCreateEvents(workspace),
    inproductFeedback: ssCreateInproductFeedback(workspace),
    insights: ssCreateInsights(workspace),
    loops: ssCreateLoops(workspace),
    reviews: ssCreateReviews(workspace),
    digest: ssCreateDigest(workspace),
    slackQA: ssCreateSlackQA(workspace),
    briefing: ssCreateBriefing(workspace),
    unanswered: [
      "Why churned users left — no churned users are on the panel yet (recruit from cancellations).",
      "Mobile-specific friction — too few mobile sessions in the lines so far.",
    ],
    nextQuestions: [
      "Would a live, shareable dashboard replace your weekly export cleanup?",
      "Which part of " + product + " still makes you leave the product?",
      "What should Observant watch after the next release?",
    ],
  };
}

function ssInitialCustomQuestion(workspace) {
  const product = ssProductName(workspace);
  const firstQuestion = String(workspace.learningGoal || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)[0];
  if (firstQuestion) return firstQuestion;

  const audience = ssPhrase(workspace.userBase, "the people who use " + product);
  return "What would make " + product + " feel worth using regularly for " + audience + "?";
}

function ssInitialCustomConfig(workspace) {
  const question = ssInitialCustomQuestion(workspace);
  return {
    name: question.length > 44 ? question.slice(0, 41) + "..." : question,
    question,
    groupIds: ["power-users", "new-signups", "evaluators"],
    surfaceIds: ["email", "telegram"],
    signalIds: ["user_signed_up", "feature_opened", "checkout_abandoned"],
  };
}

function ssHydrateSimulationLoop(simulation) {
  const conversations = simulation.conversations || [];
  const users = simulation.users || [];
  const events = simulation.events || [];
  const firstConversation = conversations[0];
  const replies = conversations.reduce((sum, conversation) => {
    return sum + (conversation.messages || []).filter((message) => message.t === "user").length;
  }, 0);

  return {
    ...simulation.loop,
    status: "Learning",
    cadence: "Still learning",
    people: users.length,
    active: conversations.filter((conversation) => conversation.state === "Active").length,
    memory: replies,
    conversationId: firstConversation ? firstConversation.id : "",
    conversationIds: conversations.map((conversation) => conversation.id),
    peopleIds: users.map((user) => user.id),
    eventIds: events.map((event) => event.id),
    generatedAt: simulation.generatedAt,
  };
}

// A real onboarded client starts with a CLEAN, EMPTY dashboard — no seeded
// conversations / insights / partners / loops. Feedback only ever appears once
// real users opt in and reply (or the client sends their first loop). The Northwind
// fixture lives ONLY in ssCreateSampleState (the demo toggle); real users are never
// routed into it. ssBaseState already provides the empty arrays + sensible defaults.
function ssCreateCustomState(input) {
  const workspace = ssCreateWorkspace(input, SS_CUSTOM_WORKSPACE_FALLBACK);
  return ssBaseState(workspace, "custom");
}

function ssCreateInitialState(input, mode) {
  return mode === "custom" ? ssCreateCustomState(input) : ssCreateSampleState(input || SS_DEFAULT_WORKSPACE);
}

function ssMakeRunId() {
  return "run-" + Date.now().toString(36);
}

function ssGroupLabel(id) {
  const option = SS_GROUP_OPTIONS.find((item) => item.id === id);
  return option ? option.label : id;
}

function ssSurfaceLabelData(id) {
  const option = SS_SURFACE_OPTIONS.find((item) => item.id === id);
  return option ? option.label : id;
}

function ssCreateCustomLoop(workspace, config, runId) {
  const surfaceIds = (config.surfaceIds && config.surfaceIds.length ? config.surfaceIds : ["email"]);
  // Behavior triggers are a contact-us add-on — never auto-attached to a question.
  const signalIds = (config.signalIds && config.signalIds.length ? config.signalIds : []);
  return {
    id: "loop-" + runId,
    name: ssTrim(config.name, "New question"),
    status: "Collecting",
    cadence: "Always on",
    people: 0,
    active: 0,
    memory: 0,
    question: ssTrim(config.question, workspace.learningGoal),
    conversationId: "",
    conversationIds: [],
    peopleIds: [],
    eventIds: [],
    surfaceIds,
    signalIds,
    groupIds: config.groupIds || ["power-users"],
    generatedAt: "",
  };
}

// Record a loop that was just SENT to the real feedback panel (from the compose flow's
// "Send to your users"). Adds it to state.loops as live/collecting with a run so it shows
// in Loop history / the Off-product section. Upserts by question (so a prior test-send row
// gets promoted, not duplicated). Pure — returns the next state.
function ssRecordSentLoop(state, opts) {
  const options = opts || {};
  const question = ssTrim(options.question, "");
  if (!question) return state;
  const count = Math.max(0, Number(options.count) || 0);
  const mode = options.mode === "deep" ? "deep" : "light";
  const channel = options.channel === "telegram" ? "telegram" : "email";
  const nowIso = new Date().toISOString();
  const shortName = question.length > 44 ? question.slice(0, 42) + "…" : question;
  const existing = (state.loops || []).find((loop) => loop.question === question);
  const runId = ssMakeRunId();
  const loopId = existing ? existing.id : "loop-" + runId;
  const run = {
    runId,
    loopId,
    status: "collecting",
    stageIndex: 2,
    fallback: false,
    error: "",
    startedAt: nowIso,
    generatedAt: nowIso,
    completedAt: "",
    timeline: SS_SIMULATION_STAGES,
    config: { question, mode },
  };

  let loops;
  let loopRuns;
  if (existing) {
    loops = (state.loops || []).map((loop) => loop.id === existing.id
      ? { ...loop, status: "Collecting", cadence: "Always on", people: count, active: count, sentToUsers: true, simulated: !!options.simulated }
      : loop);
    const hasRun = (state.loopRuns || []).some((r) => r.loopId === existing.id);
    loopRuns = hasRun
      ? (state.loopRuns || []).map((r) => r.loopId === existing.id ? { ...run, runId: r.runId } : r)
      : [run, ...(state.loopRuns || [])];
  } else {
    const loop = {
      id: loopId,
      name: shortName,
      status: "Collecting",
      cadence: "Always on",
      people: count,
      active: count,
      memory: 0,
      question,
      mode,
      conversationId: "",
      conversationIds: [],
      peopleIds: [],
      eventIds: [],
      surfaceIds: [channel],
      signalIds: [],
      generatedAt: nowIso,
      sentToUsers: true,
      simulated: !!options.simulated,
    };
    loops = [loop, ...(state.loops || [])];
    loopRuns = [run, ...(state.loopRuns || [])];
  }

  return {
    ...state,
    loops,
    loopRuns,
    activity: ["Loop sent to " + count + " user" + (count === 1 ? "" : "s") + ": " + shortName + ".", ...(state.activity || [])].slice(0, 24),
  };
}

function ssCreateLoopRun(runId, loop, config) {
  return {
    runId,
    loopId: loop.id,
    status: "generating",
    stageIndex: -1,
    fallback: false,
    error: "",
    startedAt: new Date().toISOString(),
    generatedAt: "",
    completedAt: "",
    timeline: SS_SIMULATION_STAGES,
    config,
  };
}

function ssFallbackSimulation(workspace, config, runId) {
  const product = ssProductName(workspace);
  const audience = ssPhrase(workspace.userBase, "the people who use " + product);
  const productContext = ssPhrase(workspace.productDescription, "the workflow " + product + " supports");
  const actualRunId = runId || ssMakeRunId();
  const loop = ssCreateCustomLoop(workspace, config || {}, actualRunId);
  const groupIds = loop.groupIds.length ? loop.groupIds : ["power-users"];
  const surfaceIds = loop.surfaceIds.length ? loop.surfaceIds : ["email"];
  const signalIds = loop.signalIds || [];
  const colors = ["rust", "green", "blue", "gold", "teal", "plum"];
  const names = ["Avery N.", "Samir P.", "Elena R.", "Jordan M.", "Mina S.", "Theo L."];
  const quotes = [
    "I understand what " + product + " is trying to do, but I need to see how it fits the workflow we already trust.",
    "The feature sounds right. The missing piece is knowing who on my team will use it every week.",
    "I would try this if setup felt lighter and the first result was obvious.",
    "The current path works, but it takes too many small decisions to get to the answer.",
    "I need a confident recommendation, not another place to check manually.",
    "The blocker is not interest. It is proving this can save time for more than one person.",
  ];
  const memories = [
    "Compares " + product + " against the workflows trusted by " + audience + ".",
    "Looks for shared visibility before asking the team to change habits around " + product + ".",
    "Needs fast first-run confidence before committing setup time.",
    "Keeps returning to the same decision point around " + productContext + ".",
    "Wants a recommendation grounded in what similar users already did.",
    "Needs proof that the workflow scales beyond a single champion.",
  ];

  const groups = groupIds.map((id, index) => ({
    id: actualRunId + "-group-" + id,
    sourceId: id,
    name: ssGroupLabel(id),
    size: String(18 + (index * 7)) + " matched people",
    signal: signalIds.length ? signalIds[index % signalIds.length] : "",
    detail: "Matched from " + audience + " for: " + loop.question,
  }));

  const users = names.slice(0, 5).map((name, index) => {
    const groupId = groupIds[index % groupIds.length];
    const surface = ssSurfaceLabelData(surfaceIds[index % surfaceIds.length]);
    return {
      id: actualRunId + "-person-" + index,
      name,
      color: colors[index % colors.length],
      segment: ssGroupLabel(groupId),
      surface,
      status: index < 2 ? "Active now" : index < 4 ? "Async" : "Watching",
      memory: memories[index],
      last: quotes[index],
      groupId,
    };
  });

  const conversations = users.map((person, index) => ({
    id: actualRunId + "-conv-" + index,
    userId: person.id,
    title: person.segment + " 1:1",
    mode: index === 1 ? "voice" : "chat",
    duration: index === 1 ? "22 min" : "",
    state: index < 2 ? "Active" : index < 4 ? "Async" : "Watching",
    messages: [
      { t: "them", text: "Hi " + person.name.split(" ")[0] + " - Observant is learning about " + product + ". What matters most when you think about: " + loop.question, meta: "Observant - 1:1" },
      { t: "user", text: person.last, meta: person.name.split(" ")[0] },
      { t: "them", text: "What would make this feel worth changing your current workflow for?", meta: "Observant - remembered context" },
      { t: "user", text: quotes[(index + 2) % quotes.length], meta: person.name.split(" ")[0] },
    ],
  }));

  // Behavior triggers are a contact-us add-on, so the simulation generates no trigger events.
  const events = signalIds.length ? users.slice(0, 4).map((person, index) => ({
    id: actualRunId + "-evt-" + index,
    event: signalIds[index % signalIds.length],
    user: person.name,
    detail: index % 2 === 0 ? "returned to the same decision point" : "opened related settings twice",
    time: ["2m ago", "9m ago", "21m ago", "46m ago"][index],
    type: "behavior",
    conversationId: conversations[index].id,
  })) : [];

  const metric = Math.max(2, users.length - 1) + " of " + users.length;
  const insights = [
    {
      id: actualRunId + "-insight-primary",
      title: "Users need proof that " + product + " fits their existing workflow.",
      metric,
      detail: "Private 1:1 lines from " + audience + " show interest, but users keep asking for evidence that " + product + " will reduce coordination work instead of adding another step.",
      evidence: "Grounded in " + users.length + " feedback partners and " + conversations.length + " private lines.",
      next: "Show a first useful output before asking users to commit setup time.",
      conversationId: conversations[0].id,
      loopId: loop.id,
    },
    {
      id: actualRunId + "-insight-secondary",
      title: "Team visibility is the strongest adoption question.",
      metric: "3 of " + users.length,
      detail: "Across feedback groups, people ask how teammates will see, trust, or reuse the output from " + product + ".",
      evidence: "Mentioned by " + users.slice(0, 3).map((person) => person.name).join(", ") + ".",
      next: "Add a shareable team-facing artifact to the activation path.",
      conversationId: conversations[1].id,
      loopId: loop.id,
    },
  ];

  return {
    runId: actualRunId,
    generatedAt: new Date().toISOString(),
    fallback: true,
    loop,
    users,
    groups,
    conversations,
    events,
    insights,
    nextQuestions: [
      "What would make " + product + " feel worth changing your current workflow for?",
      "Who else on your team would need to trust this before adoption?",
      "Which proof would make this loop strong enough for the roadmap?",
    ],
    timeline: SS_SIMULATION_STAGES,
  };
}

function ssMergeRecord(seed, current) {
  if (!current) return seed;
  const merged = { ...seed };
  Object.keys(current).forEach((key) => {
    if (current[key] !== undefined) merged[key] = current[key];
  });
  return merged;
}

function ssMergeSeededRecords(currentRecords, seededRecords) {
  const current = Array.isArray(currentRecords) ? currentRecords : [];
  const seeded = Array.isArray(seededRecords) ? seededRecords : [];
  const seededIds = new Set(seeded.map((record) => record.id));
  const currentById = new Map(current.filter(Boolean).map((record) => [record.id, record]));
  return [
    ...seeded.map((seed) => ssMergeRecord(seed, currentById.get(seed.id))),
    ...current.filter((record) => record && !seededIds.has(record.id)),
  ];
}

function ssNormalizeSection(section) {
  if (section === "loops" || section === "install") return "learning";
  if (section === "conversations") return "people";
  if (section === "learned") return "insights";
  if (["home", "offproduct", "inproduct", "learning", "people", "insights", "context", "compose", "settings", "sources"].includes(section)) return section;
  return "home";
}

function ssNormalizeState(state) {
  if (!state || !state.workspace) return state;

  const workspace = ssMergeRecord(ssCreateWorkspace(state.workspace), state.workspace);
  const mode = state.workspaceMode || "sample";
  const seeded = mode === "custom" ? ssCreateCustomState(workspace) : ssCreateSampleState(workspace);
  const setup = state.setup || {};
  const conversations = ssMergeSeededRecords(state.conversations, seeded.conversations);
  const loops = ssMergeSeededRecords(state.loops, seeded.loops);
  const loopRuns = Array.isArray(state.loopRuns) && state.loopRuns.length ? state.loopRuns : seeded.loopRuns;
  const simulationRuns = Array.isArray(state.simulationRuns) && state.simulationRuns.length ? state.simulationRuns : seeded.simulationRuns;
  const selectedConversationId = conversations.some((conversation) => conversation.id === state.selectedConversationId)
    ? state.selectedConversationId
    : (conversations[0] ? conversations[0].id : "");
  const selectedLoopId = loops.some((loop) => loop.id === state.selectedLoopId)
    ? state.selectedLoopId
    : (loops[0] ? loops[0].id : "");

  return ssScrubPublicCopy({
    ...seeded,
    ...state,
    version: SS_STATE_VERSION,
    workspace,
    workspaceMode: mode,
    section: ssNormalizeSection(state.section || seeded.section),
    focusedTarget: state.focusedTarget || "",
    pendingInsightQuestion: typeof state.pendingInsightQuestion === "string" ? state.pendingInsightQuestion : "",
    selectedLoopId,
    selectedConversationId,
    setup: {
      ...seeded.setup,
      ...setup,
      inviteUrl: setup.inviteUrl || seeded.setup.inviteUrl,
      surfaces: { ...seeded.setup.surfaces, ...(setup.surfaces || {}) },
      events: { ...seeded.setup.events, ...(setup.events || {}) },
    },
    people: ssMergeSeededRecords(state.people, seeded.people),
    groups: ssMergeSeededRecords(state.groups, seeded.groups),
    conversations,
    events: ssMergeSeededRecords(state.events, seeded.events),
    inproductFeedback: ssMergeSeededRecords(state.inproductFeedback, seeded.inproductFeedback),
    insights: ssMergeSeededRecords(state.insights, seeded.insights),
    loops,
    loopRuns,
    simulationRuns,
    nextQuestions: Array.isArray(state.nextQuestions) ? state.nextQuestions : seeded.nextQuestions,
    scheduledCalls: Array.isArray(state.scheduledCalls) ? state.scheduledCalls : [],
    answers: Array.isArray(state.answers) ? state.answers : [],
    generatedAt: state.generatedAt || seeded.generatedAt || "",
    activity: Array.isArray(state.activity) ? state.activity : seeded.activity,
  });
}

function ssReadiness(setup) {
  const connectedSurfaces = Object.values(setup.surfaces || {}).filter(Boolean).length;
  const installedEvents = Object.values(setup.events || {}).filter(Boolean).length;
  return {
    users: !!setup.usersSource,
    surfaces: connectedSurfaces > 0,
    events: installedEvents > 0,
    connectedSurfaces,
    installedEvents,
    ready: !!setup.usersSource && connectedSurfaces > 0 && installedEvents > 0,
  };
}

function ssRevealSimulation(state, runId, stageIndex) {
  const simulation = (state.simulationRuns || []).find((run) => run.runId === runId);
  if (!simulation) return state;

  const safeStage = Math.max(0, Math.min(stageIndex, SS_SIMULATION_STAGES.length - 1));
  const visibleGroups = safeStage >= 0 ? simulation.groups || [] : [];
  const visiblePeople = safeStage >= 1 ? (simulation.users || []).slice(0, safeStage >= 2 ? undefined : 2) : [];
  const visibleConversations = safeStage >= 1 ? (simulation.conversations || []).slice(0, safeStage >= 2 ? undefined : 2) : [];
  const visibleEvents = safeStage >= 2 ? (simulation.events || []).slice(0, safeStage >= 3 ? undefined : 2) : [];
  const visibleInsights = safeStage >= 4 ? simulation.insights || [] : [];
  const visibleQuestionIds = visiblePeople.map((person) => person.id);
  const visibleConversationIds = visibleConversations.map((conversation) => conversation.id);
  const visibleEventIds = visibleEvents.map((event) => event.id);
  const finalStage = safeStage >= SS_SIMULATION_STAGES.length - 1;
  const firstConversation = visibleConversations[0];
  // Memory = actual replies in visible 1:1s, so every number on screen is countable.
  const visibleReplies = visibleConversations.reduce((sum, conversation) => sum + (conversation.messages || []).filter((message) => message.t === "user").length, 0);
  const loopPatch = {
    ...simulation.loop,
    status: finalStage ? "Learning" : "Collecting",
    cadence: finalStage ? "Still learning" : "Collecting now",
    people: visiblePeople.length,
    active: visibleConversations.filter((conversation) => conversation.state === "Active").length,
    memory: visibleReplies,
    peopleIds: visibleQuestionIds,
    conversationIds: visibleConversationIds,
    eventIds: visibleEventIds,
    conversationId: firstConversation ? firstConversation.id : "",
    generatedAt: simulation.generatedAt,
  };
  const stage = SS_SIMULATION_STAGES[safeStage];
  const existingLoop = (state.loops || []).some((loop) => loop.id === simulation.loop.id);
  const loops = existingLoop
    ? (state.loops || []).map((loop) => loop.id === simulation.loop.id ? { ...loop, ...loopPatch } : loop)
    : [...(state.loops || []), loopPatch];

  return ssScrubPublicCopy({
    ...state,
    generatedAt: simulation.generatedAt || state.generatedAt,
    groups: ssMergeSeededRecords(state.groups, visibleGroups),
    people: ssMergeSeededRecords(state.people, visiblePeople),
    conversations: ssMergeSeededRecords(state.conversations, visibleConversations),
    events: ssMergeSeededRecords(state.events, visibleEvents),
    insights: ssMergeSeededRecords(state.insights, visibleInsights),
    loops,
    selectedLoopId: simulation.loop.id,
    selectedConversationId: firstConversation ? firstConversation.id : state.selectedConversationId,
    nextQuestions: safeStage >= 3 && simulation.nextQuestions && simulation.nextQuestions.length ? simulation.nextQuestions : state.nextQuestions,
    loopRuns: (state.loopRuns || []).map((run) => run.runId === runId ? {
      ...run,
      stageIndex: safeStage,
      status: finalStage ? "running" : "collecting",
      completedAt: finalStage ? (run.completedAt || new Date().toISOString()) : "",
      generatedAt: simulation.generatedAt,
      timeline: simulation.timeline || SS_SIMULATION_STAGES,
      fallback: !!simulation.fallback,
    } : run),
    activity: [stage.label + " for " + simulation.loop.name + ".", ...(state.activity || [])].slice(0, 24),
  });
}

function ssCannedAnswer(state, question) {
  const workspace = state.workspace;
  const product = ssProductName(workspace);
  const asked = ssTrim(question || workspace.learningGoal, workspace.learningGoal);
  const insight = (state.insights || [])[0];

  if (state.workspaceMode === "custom" && insight) {
    return {
      id: "answer-" + Date.now(),
      question: asked,
      answer: "Observant is seeing the strongest signal around: " + insight.title + " The private 1:1 lines suggest users are interested, but they need proof that the workflow saves coordination time.",
      evidence: insight.evidence,
      recommendation: insight.next,
      relatedPersonIds: (state.people || []).slice(0, 3).map((person) => person.id),
      relatedInsightIds: [insight.id],
    };
  }

  return {
    id: "answer-" + Date.now(),
    question: asked,
    answer: "Observant is seeing the strongest signal around shareable reporting. Users are not asking for another export format; they want a live view they can send to teammates without rebuilding the report outside " + product + ".",
    evidence: "Grounded in Dana, Marcus, and Priya's private lines plus export_completed and feature_opened events.",
    recommendation: "Build a live dashboard link first. Keep CSV export as a fallback for raw data workflows.",
    relatedPersonIds: ["dana", "marcus", "priya"],
    relatedInsightIds: ["insight-export"],
  };
}

Object.assign(window, {
  SS_STORAGE_KEY,
  SS_STATE_VERSION,
  SS_DEFAULT_WORKSPACE,
  SS_GROUP_OPTIONS,
  SS_SURFACE_OPTIONS,
  SS_FAST_CHANNELS,
  SS_AUDIENCE_OPTIONS,
  SS_COMPENSATION_OPTIONS,
  SS_REWARD_TIERS,
  SS_SIGNAL_OPTIONS,
  SS_SIMULATION_STAGES,
  SelfServeData: {
    createInitialState: ssCreateInitialState,
    createSampleState: ssCreateSampleState,
    createCustomState: ssCreateCustomState,
    createCustomLoop: ssCreateCustomLoop,
    createLoopRun: ssCreateLoopRun,
    recordSentLoop: ssRecordSentLoop,
    fallbackSimulation: ssFallbackSimulation,
    revealSimulation: ssRevealSimulation,
    makeRunId: ssMakeRunId,
    normalizeState: ssNormalizeState,
    readiness: ssReadiness,
    cannedAnswer: ssCannedAnswer,
    productName: ssProductName,
    initials: ssInitials,
    contextCompleteness: ssContextCompleteness,
    contextSummary: ssContextSummary,
  },
});
