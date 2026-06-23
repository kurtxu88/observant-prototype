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
  learningGoal: "Stay ahead of which accounts are quietly disengaging before they churn — and learn what would get them onto live dashboards and expanding seats.",
  context: {
    goal3mo: "Get 30% of power accounts onto live dashboards (off spreadsheet exports) and open 3 expansion conversations a week, on the way to the Series A.",
    priorLearning: "Support spikes around quarter-close reporting; a couple of accounts went quiet after a permissions change, then downgraded. Unverified which signals actually predict churn.",
    docs: [
      { id: "doc-onb", name: "Account onboarding playbook.pdf", note: "The first 30 days for a new account." },
      { id: "doc-churn", name: "Churn post-mortems Q2.doc", note: "Why four accounts left last quarter." },
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
  { id: "power", label: "Power accounts", text: "Accounts that run most of their reporting through Northwind." },
  { id: "onboarding", label: "Newly onboarded", text: "Accounts in their first 30 days, still forming habits." },
  { id: "expansion", label: "Expansion candidates", text: "Teams that could add more seats and workspaces." },
  { id: "owners", label: "Account admins", text: "Admins and owners who decide on renewal." },
  { id: "at-risk", label: "At-risk accounts", text: "Accounts gone quiet or trending toward churn." },
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
  return raw || fallback || "Northwind";
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
      id: "bright", name: "Maria · Brightline Ops", color: "teal",
      segment: "Power account", surface: "Email", status: "Healthy",
      memory: "Ops lead; runs all of her weekly reporting through Northwind for a 40-person team.",
      last: "Honestly Northwind replaced three spreadsheets — but the new permissions model has me nervous.",
      profile: {
        since: "Partner 7 months · Strategic partner",
        reward: "Advisory seat + roadmap influence",
        knows: [
          "Ops lead at a single-team, 40-person company.",
          "Runs 100% of her weekly reporting through Northwind.",
          "Most valuable when the dashboard just refreshes without her checking.",
        ],
        shared: [
          "“Northwind replaced three spreadsheets.”",
          "Anxious about the new permissions model — wants to know her team keeps access.",
        ],
        open: ["Would a heads-up when permissions change keep her confident? — awaiting reply"],
      },
    },
    {
      id: "cedar", name: "Tom · Cedar Analytics", color: "green",
      segment: "Newly onboarded", surface: "Email", status: "Onboarding",
      memory: "Onboarded 3 weeks ago; still learning to trust the auto-refreshed numbers.",
      last: "Took me a bit to trust the live dashboard — I exported and double-checked everything week one.",
      profile: {
        since: "Partner 3 weeks · Design partner",
        reward: "10% off + early access",
        knows: [
          "New account, week 3; the data analyst is the daily user.",
          "Exported and double-checked every dashboard in week one before trusting it.",
        ],
        shared: ["“Took me a bit to trust the live dashboard.”"],
        open: ["What would have made you trust the dashboards faster?"],
      },
    },
    {
      id: "lakeview", name: "Priya · Lakeview Data Group", color: "blue",
      segment: "Expansion candidate", surface: "In-product", status: "Expanding",
      memory: "Growing org running Northwind on 2 of 5 teams.",
      last: "If this works for the other three teams, that's our whole reporting stack.",
      profile: {
        since: "Partner 4 months · Reference partner",
        reward: "Co-marketing + case study",
        knows: [
          "5-team org; Northwind live for 2 teams, evaluating the rest.",
          "Decision hinges on the pilot teams showing real hours saved.",
        ],
        shared: ["“If this works for the other three teams, that's our whole reporting stack.”"],
        open: ["What proof from the 2 pilot teams unlocks the other 3?"],
      },
    },
    {
      id: "summit", name: "Owen · Summit Data", color: "rust",
      segment: "At-risk account", surface: "Email", status: "At risk",
      memory: "Went quiet after a permissions change last month; usage down 40%.",
      last: "Our dashboards broke after the access change and nobody reached out.",
      profile: {
        since: "Partner 9 months · was Strategic partner",
        reward: "Advisory seat (lapsing)",
        knows: [
          "Account admin; was a heavy user until a permissions change broke their dashboards.",
          "Usage down ~40%; logins sporadic since the change.",
        ],
        shared: [
          "“Our dashboards broke after the access change and nobody reached out.”",
          "Feels unsupported — not unhappy with the product itself.",
        ],
        open: ["⚠ Churn risk — what would rebuild trust after the broken dashboards?"],
      },
    },
    {
      id: "harbor", name: "Dana · Harbor Insights", color: "gold",
      segment: "Account admin", surface: "Email", status: "Renewal",
      memory: "Admin; renewal in 60 days, quietly comparing a competitor.",
      last: "I need to know my team actually saves time before I re-sign.",
      profile: {
        since: "Partner 11 months · Reference partner",
        reward: "Co-marketing + referral perks",
        knows: [
          "Admin; renewal in 60 days. Weighing a cheaper competitor.",
          "Will re-sign on proof of hours saved, not features.",
        ],
        shared: ["“I need to know my team actually saves time before I re-sign.”"],
        open: ["What hours-saved proof would make the renewal a no-brainer?"],
      },
    },
  ];
}

function ssCreateConversations(workspace) {
  return [
    {
      id: "summit-voice", userId: "summit", title: "After the broken dashboards — voice interview",
      state: "Done", mode: "voice", duration: "18 min",
      messages: [
        { t: "them", text: "You mentioned your dashboards broke last month — walk me through what happened.", meta: "Observant" },
        { t: "user", text: "After an access change, a set of dashboards stopped refreshing and we didn't catch it for days. Reporting backed up and I felt blind.", meta: "Owen" },
        { t: "them", text: "When you realized, what did you need from us that wasn't there?", meta: "Observant" },
        { t: "user", text: "Someone to reach out. The product's fine — it was the silence. I didn't know if it was me or Northwind.", meta: "Owen" },
        { t: "them", text: "If Northwind had flagged the broken dashboards and a person had called, would that have changed it?", meta: "Observant" },
        { t: "user", text: "Completely. I'd still be all-in. Right now I'm quietly looking around.", meta: "Owen" },
      ],
    },
    {
      id: "summit", userId: "summit", title: "Quiet since the permissions change", state: "At risk", mode: "chat",
      messages: [
        { t: "them", text: "Owen — I noticed logins dropped off after last month. Anything we got wrong?", meta: "Observant - behavior-triggered" },
        { t: "user", text: "A permissions change broke our dashboards and nobody reached out. Made me wonder if I can rely on this at quarter-close.", meta: "Owen" },
      ],
    },
    {
      id: "lakeview", userId: "lakeview", title: "Rolling out to the other teams", state: "Active", mode: "chat",
      messages: [
        { t: "them", text: "You're live for 2 of 5 teams — what would it take to bring the other three on?", meta: "Observant" },
        { t: "user", text: "Proof. Show me the hours the two pilot teams got back and the rollout sells itself internally.", meta: "Priya" },
      ],
    },
    {
      id: "cedar", userId: "cedar", title: "First 30 days", state: "Onboarding", mode: "chat",
      messages: [
        { t: "them", text: "Welcome — three weeks in, what's still taking a second look before you trust it?", meta: "Observant - onboarding" },
        { t: "user", text: "The live dashboard. I exported and checked it against my own numbers all week one. It's right — I just needed to see it be right.", meta: "Tom" },
      ],
    },
    {
      id: "harbor", userId: "harbor", title: "Renewal in 60 days", state: "Renewal", mode: "chat",
      messages: [
        { t: "them", text: "Your renewal's coming up — what would make it an easy yes?", meta: "Observant - remembered context" },
        { t: "user", text: "Hours saved, in numbers. A competitor's cheaper, so I need to see my team actually gets time back.", meta: "Dana" },
      ],
    },
    {
      id: "bright", userId: "bright", title: "Staying ahead of permissions changes", state: "Active", mode: "chat",
      messages: [
        { t: "them", text: "You mentioned the new permissions model — what are you worried Northwind might miss?", meta: "Observant" },
        { t: "user", text: "That access changes and I don't find out until my team loses a dashboard. A heads-up would keep me calm.", meta: "Maria" },
      ],
    },
  ];
}

function ssCreateEvents(workspace) {
  return [
    { id: "evt-1", event: "dashboard_refresh_failed", user: "Summit Data", detail: "dashboards stopped refreshing; unflagged 3 days", time: "1d ago", type: "watch", conversationId: "summit" },
    { id: "evt-2", event: "usage_drop", user: "Summit Data", detail: "logins down 40% since the access change", time: "2d ago", type: "watch", conversationId: "summit" },
    { id: "evt-3", event: "account_onboarded", user: "Cedar Analytics", detail: "completed onboarding, week 3", time: "1h ago", type: "onboarding", conversationId: "cedar" },
    { id: "evt-4", event: "renewal_upcoming", user: "Harbor Insights", detail: "renews in 60 days", time: "5h ago", type: "trigger", conversationId: "harbor" },
  ];
}

function ssCreateInsights(workspace) {
  return [
    {
      id: "insight-churn",
      title: "At-risk accounts go quiet before they churn — not loud.",
      metric: "4 / 5",
      detail: "The pattern before a downgrade: an unresolved breakage (dashboards stop refreshing) → a usage drop → silence. Not a complaint.",
      evidence: "Grounded across this quarter's churn post-mortems and recent at-risk lines.",
      next: "Trigger a human outreach the moment dashboards break and usage dips.",
      conversationId: "summit",
    },
    {
      id: "insight-expansion",
      title: "Expansion is blocked on hours-saved proof from the pilot team.",
      metric: "3 accounts",
      detail: "Growing orgs won't roll out to every team until the pilot teams show real hours back — features don't move them, proof does.",
      evidence: "Surfaced from expansion-candidate and renewal conversations.",
      next: "Auto-generate an hours-saved recap per account for the rollout conversation.",
      conversationId: "lakeview",
    },
  ];
}

function ssCreateReviews(workspace) {
  return [
    { id: "rev-1", source: "G2", author: "Ops lead", rating: 4, text: "Replaced three spreadsheets for us. Wish we got a heads-up when permissions change.", status: "open" },
    { id: "rev-2", source: "Support ticket", author: "Summit Data", rating: null, text: "Our dashboards stopped refreshing after an access change and no one reached out.", status: "open" },
  ];
}

function ssCreateDigest(workspace) {
  return {
    period: "This week",
    headline: "Two accounts need a human this week — both went quiet, neither complained.",
    stats: [
      { n: "1", l: "at-risk account" },
      { n: "3", l: "expansion-ready" },
      { n: "60d", l: "to Harbor's renewal" },
    ],
    items: [
      "Summit Data went quiet after their dashboards broke — churn-risk, but recoverable with outreach.",
      "Lakeview is ready to expand if the pilot teams show hours saved.",
      "Harbor renews in 60 days and wants hours-saved proof, not features.",
    ],
    insightId: "insight-churn",
  };
}

function ssCreateSlackQA(workspace) {
  return [
    {
      q: "Which accounts are at risk this week?",
      a: "One clear risk: Summit Data. Their dashboards broke after a permissions change, usage dropped ~40%, and they've gone quiet — the same pattern that preceded 4 of last quarter's 5 churns. It's recoverable: Owen said the product's fine, it was the silence. Suggested move: a human reaches out and owns the broken dashboards.",
    },
  ];
}

function ssCreateBriefing(workspace) {
  const product = ssProductName(workspace);
  return {
    scanned: [workspace.productUrl || "your site", "G2 reviews", "this quarter's churn post-mortems", "the onboarding playbook"],
    knows: [
      product + " is a reporting and analytics tool for ops and data teams.",
      "Churn pattern: a breakage (dashboards stop refreshing) → usage drop → silence → downgrade.",
      "Worth talking to: at-risk accounts, expansion candidates, and admins near renewal.",
    ],
  };
}

function ssCreateLoops() {
  return [
    {
      id: "loop-health", name: "Account health & churn signals", status: "Learning", cadence: "Always on",
      people: 712, active: 4, memory: 318,
      question: "Which accounts are quietly disengaging before they churn?",
      conversationId: "summit", conversationIds: ["summit", "harbor"], peopleIds: ["summit", "harbor", "bright"],
      eventIds: ["evt-1", "evt-2"], surfaceIds: ["email", "product"],
    },
    {
      id: "loop-onboarding", name: "New account onboarding", status: "Learning", cadence: "First 30 days",
      people: 38, active: 1, memory: 74,
      question: "Where do new accounts lose trust in the first month?",
      conversationId: "cedar", conversationIds: ["cedar"], peopleIds: ["cedar"],
      eventIds: ["evt-3"], surfaceIds: ["email", "product"],
    },
    {
      id: "loop-expansion", name: "Expansion & renewal", status: "Learning", cadence: "Triggered by account stage",
      people: 64, active: 2, memory: 51,
      question: "What unlocks multi-team rollout and renewal?",
      conversationId: "lakeview", conversationIds: ["lakeview", "harbor"], peopleIds: ["lakeview", "harbor"],
      eventIds: ["evt-4"], surfaceIds: ["email", "product"],
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
      "Which churned accounts would have stayed with earlier outreach — needs last quarter's win-back attempts logged.",
      "Whether the new permissions changes are landing as friction — too few accounts have hit them yet.",
    ],
    nextQuestions: [
      "Which accounts are quietly at risk of churning this month?",
      "What would get Lakeview to roll out to the other three teams?",
      "What hours-saved proof would lock in Harbor's renewal?",
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
    answer: "Observant is seeing the strongest signal around at-risk accounts going quiet. Accounts aren't complaining loudly; a breakage they never flagged is followed by a usage drop and silence before they churn from " + product + ".",
    evidence: "Grounded in Maria, Priya, and Owen's private lines plus dashboard_refresh_failed and usage_drop events.",
    recommendation: "Trigger a human outreach the moment dashboards break and usage dips. Keep the at-risk loop always on.",
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
