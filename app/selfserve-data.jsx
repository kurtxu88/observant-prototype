/* ============================================================
   OBSERVANT self-serve seed data, simulation data, and factories
   ============================================================ */

const SS_STORAGE_KEY = "observant.selfserve.v1";
const SS_STATE_VERSION = 6;

const SS_DEFAULT_WORKSPACE = {
  founderName: "Teddy",
  email: "teddy@magicpatterns.com",
  companyName: "Magic Patterns",
  productUrl: "https://magicpatterns.com",
  productDescription: "An AI design tool — describe what you want and it generates the UI. Used by founders, designers, and PMs to prototype fast.",
  userBase: "Founders, designers, and PMs at companies adopting AI prototyping — a growing set of enterprise accounts.",
  learningGoal: "Stay ahead of which enterprise accounts are quietly at risk, and stop losing the product signal buried inside sales calls.",
  context: {
    goal3mo: "Hold net revenue retention as we move upmarket; get the whole team — not just the founders — to know every key account.",
    priorLearning: "We rely on Intercom, sales calls, and Slack Connect, and trust that 'the important things surface themselves.' At enterprise scale that's starting to feel risky.",
    docs: [
      { id: "doc-onb", name: "Account onboarding playbook.pdf", note: "The first 30 days for a new account." },
      { id: "doc-churn", name: "Churn post-mortems Q2.doc", note: "Why accounts went quiet last quarter." },
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
  { id: "power", label: "Power accounts", text: "Accounts that live in Slack Connect and lean on Magic Patterns every day." },
  { id: "onboarding", label: "Newly onboarded", text: "Accounts in their first 30 days, still forming habits." },
  { id: "expansion", label: "Expansion candidates", text: "Accounts ready to add more seats and teams." },
  { id: "owners", label: "Enterprise (in sales)", text: "Accounts in an active sales motion where product signal is at risk." },
  { id: "at-risk", label: "At-risk accounts", text: "Accounts gone quiet or trending toward churn." },
];

const SS_SURFACE_OPTIONS = [
  { id: "email", label: "Email", icon: "mail" },
  { id: "telegram", label: "Intercom", icon: "chat" },
  { id: "slack", label: "Slack Connect", icon: "chat" },
  { id: "discord", label: "PostHog", icon: "globe" },
  { id: "product", label: "Sales call", icon: "globe" },
];

// Fast-start connections a user can pick on the magic link.
// Slack Connect needs a workspace install and sales-call ingest needs the SDK — both live on the Pro side.
const SS_FAST_CHANNELS = ["email", "telegram"];

// People-first: how the always-on panel is built. Ranked — reach everyone leads.
const SS_AUDIENCE_OPTIONS = [
  { id: "everyone", label: "Reach everyone", text: "Invite all your users and let anyone who's interested opt in.", tag: "Best for builders" },
  { id: "power", label: "Power users first", text: "Start with your most engaged users — they're the most likely to opt in.", tag: "Most engaged" },
  { id: "representative", label: "A representative mix", text: "Reach across your user types for a full picture of who's using your product.", tag: "Full picture" },
];

// B2B: the currency is partnership, not cash. You trade product value + status for
// insight and co-building — a sales-led relationship, not a survey payout.
const SS_COMPENSATION_OPTIONS = [
  { id: "discount", label: "Product discount", text: "A discount on their plan for being a design partner.", tag: "Default" },
  { id: "earlyaccess", label: "Early access & influence", text: "First look at new features and a real say in the roadmap.", tag: "Most valued" },
  { id: "comarketing", label: "Co-marketing", text: "Case study, logo, and referral perks." },
  { id: "advisory", label: "Advisory relationship", text: "A direct line to the team; an advisory seat for key accounts." },
];

// Partnership tiers by depth of the relationship, not minutes. The deeper the
// partnership, the more the account gets — and the more the team learns.
const SS_REWARD_TIERS = [
  { id: "bronze", name: "Design partner", min: 1, cash: 0, reward: "10% off + early access", color: "teal" },
  { id: "silver", name: "Reference partner", min: 3, cash: 0, reward: "Co-marketing, case study & referral perks", color: "gold" },
  { id: "gold", name: "Strategic partner", min: 6, cash: 0, reward: "Advisory seat, roadmap influence & exec relationship", color: "rust" },
];

const SS_DEFAULT_TIER_REWARDS = { bronze: "10% off + early access", silver: "Co-marketing, case study & referral perks", gold: "Advisory seat, roadmap influence & exec relationship" };

const SS_SIGNAL_OPTIONS = [
  { id: "user_signed_up", label: "account_activated" },
  { id: "export_completed", label: "prototype_generated" },
  { id: "feature_opened", label: "feature_opened" },
  { id: "checkout_abandoned", label: "usage_dropped" },
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
  return raw || fallback || "Magic Patterns";
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
  return [
    {
      id: "bright", name: "Northstar Design Co.", color: "teal",
      segment: "Power account", surface: "Slack Connect", status: "Healthy",
      memory: "Design lead champions Magic Patterns daily; the team lives in the shared Slack Connect.",
      last: "Magic Patterns is how we prototype now — but we're hitting the ceiling on advanced components.",
      profile: {
        since: "Partner 7 months · Strategic partner",
        reward: "Advisory seat + roadmap influence",
        knows: [
          "Pro account; the design lead is the champion and daily power user.",
          "Heavy daily usage — prototypes ship straight from Magic Patterns.",
          "Most valuable when generated UI is close enough to hand to engineering.",
        ],
        shared: [
          "“Magic Patterns is how we prototype now.”",
          "Asking for advanced components — a signal they're ready to do more.",
        ],
        open: ["Would advanced components open an expansion conversation? — awaiting reply"],
      },
    },
    {
      id: "cedar", name: "Cedar & Co.", color: "green",
      segment: "Newly onboarded", surface: "Intercom", status: "Onboarding",
      memory: "Onboarded 3 weeks ago; unsure yet if the prototyping flow is sticking. No Slack Connect yet.",
      last: "Took me a bit to trust that what it generates is actually usable — I rebuilt the first few by hand.",
      profile: {
        since: "Partner 3 weeks · Design partner",
        reward: "10% off + early access",
        knows: [
          "New account, week 3; a PM is the daily user.",
          "Rebuilt the first few generated screens by hand before trusting the output.",
          "No Slack Connect yet — only reachable through Intercom.",
        ],
        shared: ["“Took me a bit to trust that what it generates is actually usable.”"],
        open: ["What would have made the prototyping flow click faster?"],
      },
    },
    {
      id: "lakeview", name: "Vela Robotics", color: "blue",
      segment: "Expansion candidate", surface: "Sales call", status: "Expanding",
      memory: "Co-founder is mid-deal; a product signal surfaced on a sales call and risks getting lost in deal talk.",
      last: "Our engineers don't have the design intuition the founders do — we need the tool to give them that.",
      profile: {
        since: "In sales · Reference partner (pending)",
        reward: "Co-marketing + case study",
        knows: [
          "Enterprise account in an active sales motion; the co-founder is the buyer.",
          "Real product signal raised on a sales call: engineers need their own design intuition.",
          "That signal is at risk of being lost inside the deal conversation.",
        ],
        shared: ["“Our engineers don't have the design intuition the founders do.”"],
        open: ["What would let engineers inherit the founders' intuition through Magic Patterns?"],
      },
    },
    {
      id: "summit", name: "Harbor Labs", color: "rust",
      segment: "At-risk account", surface: "Intercom", status: "At risk",
      memory: "Was vocal in Intercom about a bug, then went silent; PostHog shows a usage drop after the pricing change.",
      last: "We hit a bug, flagged it in Intercom, and then just stopped — wasn't sure it was worth it after the price change.",
      profile: {
        since: "Partner 9 months · was Strategic partner",
        reward: "Advisory seat (lapsing)",
        knows: [
          "Pro account; was a heavy user until a bug went unresolved and the pricing changed.",
          "PostHog shows usage down ~40%; logins sporadic since the pricing change.",
        ],
        shared: [
          "“We hit a bug, flagged it in Intercom, and then just stopped.”",
          "Went quiet — not loud. The drop-off followed the pricing change.",
        ],
        open: ["⚠ Churn risk — what would rebuild trust after the bug and the pricing change?"],
      },
    },
    {
      id: "harbor", name: "Lumen Studio", color: "gold",
      segment: "Enterprise (in sales)", surface: "Intercom", status: "Renewal",
      memory: "Renewal coming up; the champion is happy but an engineer raised a permissions concern in Intercom.",
      last: "I'm sold — but one of our engineers flagged a permissions worry and I need that settled before we re-sign.",
      profile: {
        since: "Partner 11 months · Reference partner",
        reward: "Co-marketing + referral perks",
        knows: [
          "Pro account; renewal coming up and the champion is happy.",
          "An engineer raised a permissions concern in Intercom that's blocking a clean yes.",
        ],
        shared: ["“One of our engineers flagged a permissions worry and I need that settled before we re-sign.”"],
        open: ["What would resolve the engineer's permissions concern before renewal?"],
      },
    },
  ];
}

function ssCreateConversations(workspace) {
  return [
    {
      id: "summit-voice", userId: "summit", title: "Harbor Labs — why they went quiet after the pricing change",
      state: "Done", mode: "voice", duration: "18 min", surface: "Intercom",
      messages: [
        { t: "them", text: "You flagged a bug in Intercom a few weeks back and then went quiet — walk me through what happened.", meta: "Observant" },
        { t: "user", text: "We hit a bug, reported it, and never really heard back. Around the same time the pricing changed, so we just... stopped opening it.", meta: "Harbor Labs" },
        { t: "them", text: "When you went quiet, what would have brought you back?", meta: "Observant" },
        { t: "user", text: "Someone catching it. The product's fine — it was the silence plus a price bump with no clear reason to keep paying.", meta: "Harbor Labs" },
        { t: "them", text: "If Magic Patterns had caught the usage drop and a person had reached out, would that have changed it?", meta: "Observant" },
        { t: "user", text: "Completely. We were happy users. Right now we're quietly evaluating whether to renew.", meta: "Harbor Labs" },
      ],
    },
    {
      id: "summit", userId: "summit", title: "Harbor Labs — usage drop after the pricing change", state: "At risk", mode: "chat", surface: "PostHog",
      messages: [
        { t: "them", text: "PostHog shows your usage down ~40% since the pricing change, and you've gone quiet in Intercom — anything we got wrong?", meta: "Observant - behavior-triggered" },
        { t: "user", text: "A bug we flagged never got resolved, then the price went up. We weren't sure it was still worth it, so we drifted.", meta: "Harbor Labs" },
      ],
    },
    {
      id: "lakeview", userId: "lakeview", title: "Vela Robotics — product signal from a sales call, routed to the product team", state: "Active", mode: "chat", surface: "Sales call",
      messages: [
        { t: "them", text: "On the last sales call your co-founder said engineers lack the founders' design intuition — that's a product signal, not just a deal note. Tell me more?", meta: "Observant - from sales call" },
        { t: "user", text: "Exactly. We can prototype because we've built the taste over years. Our engineers haven't. If Magic Patterns gave them that, the whole team moves faster.", meta: "Vela Robotics" },
      ],
    },
    {
      id: "cedar", userId: "cedar", title: "Cedar & Co. — first 30 days", state: "Onboarding", mode: "chat", surface: "Intercom",
      messages: [
        { t: "them", text: "Welcome — three weeks in, what's still taking a second look before you trust what it generates?", meta: "Observant - onboarding" },
        { t: "user", text: "Whether the generated UI is actually usable. I rebuilt the first few by hand to check — it held up, I just needed to see it hold up.", meta: "Cedar & Co." },
      ],
    },
    {
      id: "harbor", userId: "harbor", title: "Lumen Studio — renewal + an engineer's permissions worry", state: "Renewal", mode: "chat", surface: "Intercom",
      messages: [
        { t: "them", text: "Your renewal's coming up and you're happy — but an engineer raised a permissions concern in Intercom. What would make renewal an easy yes?", meta: "Observant - remembered context" },
        { t: "user", text: "Settle the permissions question. One of our engineers worries about who can edit shared prototypes. Clear that up and I re-sign tomorrow.", meta: "Lumen Studio" },
      ],
    },
    {
      id: "bright", userId: "bright", title: "Northstar Design Co. — staying ahead: the expansion ask", state: "Active", mode: "chat", surface: "Slack Connect",
      messages: [
        { t: "them", text: "You're a daily power account and asking for advanced components — proactively, what would an expansion look like for your team?", meta: "Observant" },
        { t: "user", text: "Advanced components plus a way to hand cleaner output to engineering. Give us that and we'd happily bring more of the team on.", meta: "Northstar Design Co." },
      ],
    },
  ];
}

function ssCreateEvents(workspace) {
  return [
    { id: "evt-1", event: "intercom_bug_unresolved", user: "Harbor Labs", detail: "bug flagged in Intercom, then silence", time: "1d ago", type: "watch", conversationId: "summit" },
    { id: "evt-2", event: "usage_dropped", user: "Harbor Labs", detail: "PostHog usage down 40% since the pricing change", time: "2d ago", type: "watch", conversationId: "summit" },
    { id: "evt-3", event: "account_onboarded", user: "Cedar & Co.", detail: "completed onboarding, week 3", time: "1h ago", type: "onboarding", conversationId: "cedar" },
    { id: "evt-4", event: "renewal_upcoming", user: "Lumen Studio", detail: "renewal coming up; engineer's permissions worry open", time: "5h ago", type: "trigger", conversationId: "harbor" },
  ];
}

function ssCreateInsights(workspace) {
  return [
    {
      id: "insight-churn",
      title: "At-risk accounts go quiet before they churn — not loud.",
      metric: "4 / 5",
      detail: "The pattern before a downgrade: an unresolved Intercom bug → a PostHog usage drop after the pricing change → silence. Not a complaint — 'the important things surface themselves' stops working at enterprise scale.",
      evidence: "Grounded across this quarter's churn post-mortems and Harbor Labs' Intercom + PostHog signals.",
      next: "Trigger a human outreach the moment an Intercom thread goes unresolved and PostHog usage dips.",
      conversationId: "summit",
    },
    {
      id: "insight-expansion",
      title: "Product signal is getting lost inside sales calls.",
      metric: "3 accounts",
      detail: "The real product asks — like Vela's engineers needing the founders' design intuition — surface mid-deal on sales calls and never reach the product team. Spreading that founder intuition to engineers is the unlock for expansion.",
      evidence: "Surfaced from Vela's sales call and Northstar's expansion ask in Slack Connect.",
      next: "Route the product signal out of every sales call to the product team, attributed to the account.",
      conversationId: "lakeview",
    },
  ];
}

function ssCreateReviews(workspace) {
  return [
    { id: "rev-1", source: "Slack Connect", author: "Northstar Design Co.", rating: 4, text: "Magic Patterns is how we prototype now. We're just hitting the ceiling on advanced components.", status: "open" },
    { id: "rev-2", source: "Intercom", author: "Harbor Labs", rating: null, text: "Flagged a bug here weeks ago and never heard back — then the price went up. Hard to justify staying.", status: "open" },
  ];
}

function ssCreateDigest(workspace) {
  return {
    period: "This week",
    headline: "Two accounts need a human this week — both went quiet, neither complained.",
    stats: [
      { n: "1", l: "at-risk account" },
      { n: "1", l: "product signal from a sales call" },
      { n: "1", l: "renewal with an open worry" },
    ],
    items: [
      "Harbor Labs went quiet after a bug and the pricing change — churn-risk, but recoverable with outreach.",
      "Vela's sales call surfaced a real product signal — engineers need the founders' design intuition; route it to the product team.",
      "Lumen renews soon but an engineer's permissions worry is blocking a clean yes.",
    ],
    insightId: "insight-churn",
  };
}

function ssCreateSlackQA(workspace) {
  return [
    {
      q: "Which accounts are at risk this week?",
      a: "One clear risk: Harbor Labs. They flagged a bug in Intercom, never heard back, then PostHog showed usage down ~40% after the pricing change — the same quiet drop-off that preceded 4 of last quarter's 5 churns. It's recoverable: they said the product's fine, it was the silence plus the price bump. Suggested move: a human reaches out, owns the bug, and reframes the pricing.",
    },
  ];
}

function ssCreateBriefing(workspace) {
  const product = ssProductName(workspace);
  return {
    scanned: [workspace.productUrl || "your site", "Intercom threads", "sales-call transcripts", "Slack Connect", "PostHog usage"],
    knows: [
      product + " is an AI design tool that generates UI from a description, used by founders, designers, and PMs.",
      "Churn pattern: an unresolved Intercom bug → PostHog usage drop after the pricing change → silence → downgrade.",
      "Worth talking to: at-risk accounts, enterprise accounts mid-sale, and accounts near renewal.",
    ],
  };
}

function ssCreateLoops() {
  return [
    {
      id: "loop-health", name: "Account health & churn signals", status: "Learning", cadence: "Always on",
      people: 712, active: 4, memory: 318,
      question: "Which enterprise accounts are quietly at risk before they churn?",
      conversationId: "summit", conversationIds: ["summit", "harbor"], peopleIds: ["summit", "harbor", "bright"],
      eventIds: ["evt-1", "evt-2"], surfaceIds: ["telegram", "discord"],
    },
    {
      id: "loop-onboarding", name: "New account onboarding", status: "Learning", cadence: "First 30 days",
      people: 38, active: 1, memory: 74,
      question: "Where do new accounts lose trust in the prototyping flow in the first month?",
      conversationId: "cedar", conversationIds: ["cedar"], peopleIds: ["cedar"],
      eventIds: ["evt-3"], surfaceIds: ["telegram", "email"],
    },
    {
      id: "loop-expansion", name: "Sales-call product signal & renewal", status: "Learning", cadence: "Triggered by account stage",
      people: 64, active: 2, memory: 51,
      question: "What product signal is getting lost in sales calls, and what unlocks expansion and renewal?",
      conversationId: "lakeview", conversationIds: ["lakeview", "harbor"], peopleIds: ["lakeview", "harbor"],
      eventIds: ["evt-4"], surfaceIds: ["product", "slack"],
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
    selectedLoopId: "loop-health",
    selectedConversationId: "summit",
    people: ssCreatePeople(workspace),
    conversations: ssCreateConversations(workspace),
    events: ssCreateEvents(workspace),
    insights: ssCreateInsights(workspace),
    loops: ssCreateLoops(workspace),
    reviews: ssCreateReviews(workspace),
    digest: ssCreateDigest(workspace),
    slackQA: ssCreateSlackQA(workspace),
    briefing: ssCreateBriefing(workspace),
    unanswered: [
      "Which quiet accounts would have stayed with earlier outreach — needs last quarter's win-back attempts logged.",
      "How much product signal is being lost in sales calls — needs the deal-call transcripts ingested.",
    ],
    nextQuestions: [
      "Which enterprise accounts are quietly at risk this month?",
      "What product signal from this week's sales calls should reach the product team?",
      "What would resolve Lumen's permissions worry before renewal?",
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

function ssCreateCustomState(input) {
  const workspace = ssCreateWorkspace(input, SS_CUSTOM_WORKSPACE_FALLBACK);
  const base = ssBaseState(workspace, "custom");
  const runId = "initial-" + ssSlug(workspace.companyName);
  const config = ssInitialCustomConfig(workspace);
  const simulation = ssFallbackSimulation(workspace, config, runId);
  const loop = ssHydrateSimulationLoop(simulation);
  const loopRun = {
    ...ssCreateLoopRun(runId, loop, config),
    status: "running",
    stageIndex: SS_SIMULATION_STAGES.length - 1,
    fallback: true,
    generatedAt: simulation.generatedAt,
    completedAt: simulation.generatedAt,
    timeline: simulation.timeline || SS_SIMULATION_STAGES,
  };

  return {
    ...base,
    selectedLoopId: loop.id,
    selectedConversationId: loop.conversationId,
    people: simulation.users,
    groups: simulation.groups,
    conversations: simulation.conversations,
    events: simulation.events,
    insights: simulation.insights,
    loops: [loop],
    loopRuns: [loopRun],
    simulationRuns: [{ ...simulation, loop }],
    nextQuestions: simulation.nextQuestions,
    generatedAt: simulation.generatedAt,
    activity: [
      "Feedback partners are ready for " + workspace.companyName + ".",
      "Question created: " + loop.name + ".",
      ...base.activity,
    ],
  };
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
  if (["home", "learning", "people", "insights", "context", "compose", "settings"].includes(section)) return section;
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
    answer: "Observant is seeing the strongest signal around at-risk accounts going quiet. Accounts aren't complaining loudly; an unresolved Intercom bug is followed by a PostHog usage drop after the pricing change and then silence before they churn from " + product + ".",
    evidence: "Grounded in Northstar, Vela, and Harbor Labs' private lines plus intercom_bug_unresolved and usage_dropped events.",
    recommendation: "Trigger a human outreach the moment an Intercom thread goes unresolved and PostHog usage dips. Keep the at-risk loop always on.",
    relatedPersonIds: ["bright", "lakeview", "summit"],
    relatedInsightIds: ["insight-churn"],
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
