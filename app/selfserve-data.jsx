/* ============================================================
   OBSERVANT self-serve seed data and factories
   ============================================================ */

const SS_STORAGE_KEY = "observant.selfserve.v1";

const SS_DEFAULT_WORKSPACE = {
  founderName: "Maya Chen",
  email: "maya@northwind.ai",
  companyName: "Northwind",
  productUrl: "https://northwind.ai",
  learningGoal: "Learn why power users export data and rebuild reports by hand instead of using our dashboards.",
};

function ssInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function ssProductName(workspace) {
  const raw = (workspace.companyName || "").trim();
  return raw || "Northwind";
}

function ssCreateWorkspace(input) {
  const merged = { ...SS_DEFAULT_WORKSPACE, ...(input || {}) };
  const product = ssProductName(merged);
  return {
    id: "workspace-" + Date.now(),
    founderName: merged.founderName.trim() || SS_DEFAULT_WORKSPACE.founderName,
    email: merged.email.trim() || SS_DEFAULT_WORKSPACE.email,
    companyName: product,
    productUrl: merged.productUrl.trim() || "https://" + product.toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com",
    learningGoal: merged.learningGoal.trim() || SS_DEFAULT_WORKSPACE.learningGoal,
    createdAt: new Date().toISOString(),
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
      surface: "In-product",
      status: "Active now",
      memory: "Exports every Monday and rebuilds the report for her team.",
      last: "A live dashboard is exactly the thing I keep wishing existed.",
    },
    {
      id: "marcus",
      name: "Marcus T.",
      color: "green",
      segment: "Power user",
      surface: "Browser companion",
      status: "Active now",
      memory: "Uses " + product + " for weekly ops reporting and wants share links.",
      last: "I need a link my ops lead can read, not another CSV.",
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
    },
    {
      id: "owen",
      name: "Owen R.",
      color: "gold",
      segment: "API-heavy account",
      surface: "In-product",
      status: "Watching",
      memory: "Builds internal dashboards on top of the API.",
      last: "The API is the whole reason I am here.",
    },
    {
      id: "leah",
      name: "Leah M.",
      color: "rust",
      segment: "Upgrade evaluator",
      surface: "Browser companion",
      status: "Watching",
      memory: "Paused on the upgrade page after comparing reporting permissions.",
      last: "I need to know whether the team can see this before we upgrade.",
    },
  ];
}

function ssCreateConversations(workspace) {
  const product = ssProductName(workspace);
  return [
    {
      id: "dana",
      userId: "dana",
      title: "Weekly export workflow",
      state: "Active",
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

function ssCreateLoops(workspace) {
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
      surfaceIds: ["product", "browser"],
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
      surfaceIds: ["browser"],
    },
  ];
}

function ssCreateInitialState(input) {
  const workspace = ssCreateWorkspace(input);
  const product = ssProductName(workspace);
  return {
    version: 1,
    workspace,
    launched: false,
    section: "home",
    focusedTarget: "",
    selectedLoopId: "loop-export",
    selectedConversationId: "dana",
    setup: {
      usersSource: "",
      inviteUrl: workspace.productUrl.replace(/\/$/, "") + "/observant-invite",
      surfaces: { product: false, browser: false, email: false },
      events: {
        user_signed_up: false,
        export_completed: false,
        feature_opened: false,
        checkout_abandoned: false,
      },
    },
    people: ssCreatePeople(workspace),
    conversations: ssCreateConversations(workspace),
    events: ssCreateEvents(workspace),
    insights: ssCreateInsights(workspace),
    loops: ssCreateLoops(workspace),
    nextQuestions: [
      "Would a live, shareable dashboard replace your weekly export cleanup?",
      "Which part of " + product + " still makes you leave the product?",
      "What should Observant watch after the next release?",
    ],
    scheduledCalls: [],
    answers: [],
    activity: [
      "Workspace created for " + product + ".",
      "Learning goal saved.",
    ],
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
  const seededIds = new Set(seededRecords.map((record) => record.id));
  const currentById = new Map(current.filter(Boolean).map((record) => [record.id, record]));
  return [
    ...seededRecords.map((seed) => ssMergeRecord(seed, currentById.get(seed.id))),
    ...current.filter((record) => record && !seededIds.has(record.id)),
  ];
}

function ssNormalizeSection(section) {
  if (section === "loops" || section === "install") return "learning";
  if (section === "conversations") return "people";
  if (section === "learned") return "insights";
  if (["home", "learning", "people", "insights", "settings"].includes(section)) return section;
  return "home";
}

function ssNormalizeState(state) {
  if (!state || !state.workspace) return state;

  const workspace = ssMergeRecord(ssCreateWorkspace(state.workspace), state.workspace);
  const seeded = ssCreateInitialState(workspace);
  const setup = state.setup || {};
  const conversations = ssMergeSeededRecords(state.conversations, seeded.conversations);
  const loops = ssMergeSeededRecords(state.loops, seeded.loops);
  const selectedConversationId = conversations.some((conversation) => conversation.id === state.selectedConversationId)
    ? state.selectedConversationId
    : seeded.selectedConversationId;
  const selectedLoopId = loops.some((loop) => loop.id === state.selectedLoopId)
    ? state.selectedLoopId
    : seeded.selectedLoopId;

  return {
    ...seeded,
    ...state,
    version: 1,
    workspace,
    section: ssNormalizeSection(state.section || seeded.section),
    focusedTarget: state.focusedTarget || "",
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
    conversations,
    events: ssMergeSeededRecords(state.events, seeded.events),
    insights: ssMergeSeededRecords(state.insights, seeded.insights),
    loops,
    nextQuestions: Array.isArray(state.nextQuestions) ? state.nextQuestions : seeded.nextQuestions,
    scheduledCalls: Array.isArray(state.scheduledCalls) ? state.scheduledCalls : [],
    answers: Array.isArray(state.answers) ? state.answers : [],
    activity: Array.isArray(state.activity) ? state.activity : seeded.activity,
  };
}

function ssReadiness(setup) {
  const connectedSurfaces = Object.values(setup.surfaces).filter(Boolean).length;
  const installedEvents = Object.values(setup.events).filter(Boolean).length;
  return {
    users: !!setup.usersSource,
    surfaces: connectedSurfaces > 0,
    events: installedEvents > 0,
    connectedSurfaces,
    installedEvents,
    ready: !!setup.usersSource && connectedSurfaces > 0 && installedEvents > 0,
  };
}

function ssCannedAnswer(state, question) {
  const workspace = state.workspace;
  const product = ssProductName(workspace);
  const asked = (question || workspace.learningGoal || "").trim();
  return {
    id: "answer-" + Date.now(),
    question: asked,
    answer: "Observant is seeing the strongest signal around shareable reporting. Users are not asking for another export format; they want a live view they can send to teammates without rebuilding the report outside " + product + ".",
    evidence: "Grounded in Dana, Marcus, and Priya's private lines plus export_completed and feature_opened events.",
    recommendation: "Build a live dashboard link first. Keep CSV export as a fallback for raw data workflows.",
  };
}

Object.assign(window, {
  SS_STORAGE_KEY,
  SS_DEFAULT_WORKSPACE,
  SelfServeData: {
    createInitialState: ssCreateInitialState,
    normalizeState: ssNormalizeState,
    readiness: ssReadiness,
    cannedAnswer: ssCannedAnswer,
    productName: ssProductName,
    initials: ssInitials,
  },
});
