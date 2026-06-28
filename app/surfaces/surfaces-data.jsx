/* ============================================================
   OBSERVANT — self-evolving-flow synthetic data (Phase A scaffold)
   ------------------------------------------------------------
   New entities the redesigned surfaces (Signals / People files /
   Pulse / Act ledger / Conversations) read off app state. All
   coherent with the ONE sample workspace seeded in
   selfserve-data.jsx (Northwind — reporting/analytics for ops &
   data teams). Exposed as window.OBS_DATA; selfserve-data.jsx
   folds these into the sample + normalized state at runtime.

   READ CONTRACT (how a surface reads these off `state`):
     state.signals        -> Array<Signal>
     state.pulseMoments   -> { config, recent }   (v1 = ai_eval + key_cta only)
     state.actLedger      -> Array<ActItem>   (states: drafted|shipped|told|verified)
     state.people[i].file -> living-file extension (whatTheyDid / whatTheySaid / openThreads)
     state.conversations[i].trigger -> the moment that stamped the 1:1
   ============================================================ */
(function () {
  function product(workspace) {
    const raw = (workspace && workspace.companyName || "").trim();
    return raw || "Northwind";
  }

  // ── SIGNALS ──────────────────────────────────────────────
  // type: Issue | Insight | Opportunity   status: Active | Forming | Verifying | Closed
  // evidenceGrade counts past-behavior existence-proofs vs. hypotheticals, names people.
  function signals(workspace) {
    const p = product(workspace);
    return [
      {
        id: "sig-export-share",
        type: "Issue",
        title: "Power users export only to share — the CSV is a sharing workaround.",
        metric: "5 of 7 power users · high agreement",
        status: "Active",
        whatTheDataShows:
          "export_completed fired a 3rd time this week for Dana; Marcus opened reporting settings 3× hunting for a link. Verbatim — Dana: “give me a read-only link and I'd never export again.” Marcus: “a link my ops lead can read, not another CSV.”",
        whySurfaced:
          "export_completed converged with 4 independent 1:1s that all name the same job — sharing without a seat. High agreement across Dana, Marcus, Owen; Priya echoes it as a new user.",
        evidenceGrade: { existenceProofs: 5, hypotheticals: 1, namedPeople: ["dana", "marcus", "owen", "priya"] },
        sampleBias: "Grounded in your 5 most-active repliers; 22 quieter power users haven't been heard from yet.",
        contradiction: null,
        raisedBy: ["dana", "marcus", "owen"],
        trigger: "export_completed (3rd weekly export)",
        quotes: [
          { personId: "dana", text: "Give me a read-only link and I'd never export again." },
          { personId: "marcus", text: "I need a link my ops lead can read, not another CSV." },
        ],
        sourceCounts: { conversations: 18, moments: 252 },
        actId: "act-share",
        insightId: "insight-export",
      },
      {
        id: "sig-upgrade-value",
        type: "Insight",
        title: "Upgrade abandoners aren't price-sensitive — they can't prove team value internally.",
        metric: "3 of 4 evaluators",
        status: "Active",
        whatTheDataShows:
          "checkout_abandoned: Leah left the upgrade page 2s after the price reveal. But her words anchor elsewhere — “I need to know whether the team can see this before we upgrade.”",
        whySurfaced:
          "The behavior reads as price-sensitivity; the 1:1s say it's team-visibility proof. Anchored on what evaluators DID next (re-checked reporting permissions), not on what they say they'd pay.",
        evidenceGrade: { existenceProofs: 3, hypotheticals: 2, namedPeople: ["leah"] },
        sampleBias: "Only evaluators still in-product are heard here; the ones who bounced for good aren't on the panel.",
        contradiction: { behavior: "Left upgrade page right after price reveal (reads as price-sensitive).", words: "Blocker is team visibility, not price — Leah re-checked sharing permissions, never the plan tiers." },
        raisedBy: ["leah"],
        trigger: "checkout_abandoned (left upgrade page after price reveal)",
        quotes: [
          { personId: "leah", text: "I need to know whether the team can see this before we upgrade." },
        ],
        sourceCounts: { conversations: 6, moments: 51 },
        actId: "act-upgrade",
        insightId: null,
      },
      {
        id: "sig-scheduled-digest",
        type: "Opportunity",
        title: "A scheduled, emailed report digest keeps coming up unprompted.",
        metric: "Raised unprompted by 4 people",
        status: "Active",
        whatTheDataShows:
          "Recurring unprompted ask across 1:1s for “a Monday email that's already built.” No behavioral trigger fired — this is stated desire, not observed action.",
        whySurfaced:
          "Latent unmet need recurring on its own. Weakest evidence class — opens a validation conversation only; never auto-opens a PR.",
        evidenceGrade: { existenceProofs: 0, hypotheticals: 4, namedPeople: ["priya", "marcus"] },
        sampleBias: "All hypothetical intent — no one has DONE anything that proves they'd use it.",
        contradiction: null,
        raisedBy: ["priya", "marcus"],
        trigger: "unprompted in 1:1s",
        quotes: [
          { personId: "priya", text: "I'd love a clean update that just shows up in my inbox Monday morning." },
        ],
        sourceCounts: { conversations: 9, moments: 31 },
        actId: "act-digest",
        insightId: "insight-onboarding",
      },
      {
        id: "sig-mobile-friction",
        type: "Issue",
        title: "Read-only views may be breaking on mobile.",
        metric: "2 mentions",
        status: "Forming",
        whatTheDataShows:
          "Two passing mentions of a dashboard that “didn't render right on my phone.” Below the confidence threshold to call it.",
        whySurfaced:
          "Only 2 people so far, low agreement — watching for more, or recruit for depth before raising as an Issue.",
        evidenceGrade: { existenceProofs: 2, hypotheticals: 0, namedPeople: ["owen"] },
        sampleBias: "Too few mobile sessions in the 1:1s to ground this honestly.",
        contradiction: null,
        raisedBy: ["owen"],
        trigger: "watching (sub-threshold)",
        quotes: [],
        sourceCounts: { conversations: 2, moments: 4 },
        actId: null,
        insightId: null,
      },
      {
        id: "sig-churn-trust",
        type: "Insight",
        title: "Churned accounts say “too expensive,” but never hit the value moment.",
        metric: "Behavior ≠ words",
        status: "Verifying",
        whatTheDataShows:
          "Off-product 1:1 with Sofia (churned): cited price at cancel. But event history shows she never shared a single dashboard — she churned before the core value moment.",
        whySurfaced:
          "A first-class Contradiction: the stated reason (price) is contradicted by behavior (never reached value). Reached off-product — consent + compensation, by construction.",
        evidenceGrade: { existenceProofs: 1, hypotheticals: 1, namedPeople: ["sofia"] },
        sampleBias: "1 churned partner so far; recruit more cancellations to confirm the pattern.",
        contradiction: { behavior: "Never shared a dashboard — churned before reaching the value moment.", words: "Said the product was “too expensive” at cancel." },
        raisedBy: ["sofia"],
        trigger: "off-product churn outreach",
        quotes: [
          { personId: "sofia", text: "Honestly I never got far enough to feel it was worth it." },
        ],
        sourceCounts: { conversations: 3, moments: 7 },
        actId: null,
        insightId: null,
      },
    ];
  }

  // ── PULSE (v1 MINIMAL: ai_eval + key_cta ONLY) ──────────────
  // Light / free / in-product / text-only / one-round / no-consent.
  // Everything else in the moment library stays parked.
  function pulseMoments(workspace) {
    const p = product(workspace);
    return {
      config: {
        aiEval: {
          id: "ai_eval",
          enabled: true,
          label: "AI eval ratings",
          question: "Did that output actually do what you needed? What did you do with it next?",
          cooldown: "≤1 / day / user · fires on retry or heavy edit",
          tier: "Pulse",
          lastFired: "2h ago",
        },
        keyCta: {
          id: "key_cta",
          enabled: true,
          label: "Key conversion-CTA follow-up",
          ctaName: "Upgrade to Team",
          ctaPath: "src/pages/Pricing.tsx",
          question: "Looked like you were about to upgrade and stopped — what got in the way?",
          cooldown: "≥30d / step / user · the one CTA, not every CTA",
          tier: "Pulse",
          lastFired: "3h ago",
        },
      },
      recent: [
        { id: "pulse-1", moment: "ai_eval", personId: "owen", when: "2h ago", prompt: "Did that export summary do what you needed?", response: "Edited it heavily — the columns came out in the wrong order for my exec view.", kept: true, escalated: false },
        { id: "pulse-2", moment: "ai_eval", personId: "dana", when: "5h ago", prompt: "You re-ran that a couple times — what wasn't right?", response: "The weekly summary missed last week's numbers, so I rebuilt it by hand.", kept: true, escalated: false },
        { id: "pulse-3", moment: "key_cta", personId: "leah", when: "3h ago", prompt: "Looked like you were about to upgrade and stopped — what got in the way?", response: "Need to know the team can see this before I pay for it.", kept: true, escalated: true },
        { id: "pulse-4", moment: "key_cta", personId: "marcus", when: "1d ago", prompt: "Looked like you were about to upgrade and stopped — what got in the way?", response: "Not the price — I just couldn't tell if my ops lead would get a login.", kept: true, escalated: false },
      ],
    };
  }

  // ── ACT LEDGER (close-the-loop: drafted → shipped → told → verified) ──
  // Reuses the InsightDetail fix-steps shape (steps[] with n/type/title/affects/detail/prompt).
  function actLedger(workspace) {
    const p = product(workspace);
    return [
      {
        id: "act-share",
        signalId: "sig-export-share",
        insightId: "insight-export",
        title: "Read-only dashboard share links (no seat required)",
        state: "verified",
        evidenceClass: "Issue",
        raisedBy: ["dana", "marcus", "owen"],
        steps: [
          { id: "s1", n: 1, type: "Code change", title: "Add read-only dashboard share links", affects: "src/dashboard/ShareLink.tsx", detail: "Per-dashboard read-only link, no login/seat, revocable from settings.", prompt: "Add a read-only, no-auth, revocable per-dashboard share link in src/dashboard/." },
          { id: "s2", n: 2, type: "Copy", title: "Reframe export toward sharing", affects: "src/dashboard/ExportButton.tsx", detail: "Make “Share a link” primary; CSV secondary.", prompt: "Add a primary “Share a link” action next to Export." },
        ],
        pr: { number: 42, title: "Fix: read-only share links", branch: "observant/share-links", status: "merged" },
        told: { people: ["dana", "marcus", "owen"], message: "You asked for a link instead of a CSV — we shipped read-only share links because of what you said.", at: "3d ago" },
        verified: { behaviorMoved: true, humansConfirmed: true, note: "Weekly exports/user down 47% among the 3 who raised it; Dana confirmed: “this is exactly it.”" },
      },
      {
        id: "act-upgrade",
        signalId: "sig-upgrade-value",
        insightId: null,
        title: "Make team-visibility legible on the upgrade page",
        state: "told",
        evidenceClass: "Insight",
        raisedBy: ["leah"],
        steps: [
          { id: "s1", n: 1, type: "Copy", title: "Surface “your team can read this — no seat needed” on the pricing page", affects: "src/pages/Pricing.tsx", detail: "Answer the team-visibility question before the price reveal.", prompt: "Add team-visibility proof above the price tiers in src/pages/Pricing.tsx." },
        ],
        pr: { number: 44, title: "Pricing: team-visibility proof", branch: "observant/pricing-trust", status: "open" },
        told: { people: ["leah"], message: "You said you needed to know the team could see it before upgrading — we're making that clear up front.", at: "1d ago" },
        verified: null,
      },
      {
        id: "act-onboarding",
        signalId: null,
        insightId: "insight-onboarding",
        title: "Add a first-run “what do you need to report on?” step",
        state: "shipped",
        evidenceClass: "Insight",
        raisedBy: ["priya"],
        steps: [
          { id: "s1", n: 1, type: "Copy", title: "First-run report-intent step", affects: "src/onboarding/FirstRun.tsx", detail: "Ask the reporting job in the user's words; route to a starting view.", prompt: "Add a first-run “what do you need to report on?” step in src/onboarding/FirstRun.tsx." },
        ],
        pr: { number: 45, title: "Onboarding: report-intent step", branch: "observant/firstrun-intent", status: "merged" },
        told: null,
        verified: null,
      },
      {
        id: "act-digest",
        signalId: "sig-scheduled-digest",
        insightId: null,
        title: "Validate scheduled emailed digest (Opportunity — no PR)",
        state: "drafted",
        evidenceClass: "Opportunity",
        raisedBy: ["priya", "marcus"],
        steps: [
          { id: "s1", n: 1, type: "Validation", title: "Open a validation conversation before building", affects: "(no code — Opportunity)", detail: "Weakest evidence class: all hypothetical. Confirm an existence-proof before any PR.", prompt: "Draft 1:1 validation questions to confirm whether users would actually use a scheduled digest." },
        ],
        pr: null,
        told: null,
        verified: null,
      },
    ];
  }

  // ── PEOPLE living-file extensions (merged onto seeded + new people) ──
  // Each file: who / tenure / reward / whatTheyDid[] / whatTheySaid[] / openThreads[] / channel / cohort
  function peopleFileById(workspace) {
    return {
      dana: {
        who: "Ops lead — owns the weekly report her team reads.",
        tenure: "On the panel 6 weeks · 41 min",
        reward: "Silver — 6 months free",
        channel: "In-product",
        cohort: "Power user",
        whatTheyDid: [
          { when: "this week", text: "Completed a 3rd weekly CSV export, then opened Sheets." },
          { when: "2 weeks ago", text: "Rebuilt a pivot by hand (~20 min) after exporting." },
        ],
        whatTheySaid: [
          { when: "this week", text: "The numbers are fine. The presentation is the work.", conversationId: "dana" },
          { when: "voice · last week", text: "Give me a read-only link and I'd never export again.", conversationId: "dana-voice" },
        ],
        openThreads: [{ q: "Would a shareable live dashboard replace the export?", status: "verified — confirmed it landed" }],
      },
      marcus: {
        who: "Runs weekly ops reporting; reports up to a seat-less ops lead.",
        tenure: "On the panel 5 weeks · 33 min",
        reward: "Bronze — $30 gift card",
        channel: "Telegram",
        cohort: "Power user",
        whatTheyDid: [{ when: "today", text: "Opened reporting settings 3× after export, hunting for a share link." }],
        whatTheySaid: [{ when: "today", text: "I need a link my ops lead can read, not another CSV.", conversationId: "marcus" }],
        openThreads: [{ q: "Would per-report share links (no seat) unblock you?", status: "awaiting reply" }],
      },
      priya: {
        who: "New this week — still forming her mental model.",
        tenure: "Joined this week · 8 min",
        reward: "Just started accruing",
        channel: "Email",
        cohort: "New customer",
        whatTheyDid: [{ when: "this week", text: "Emailed a CSV because she couldn't find the dashboard-sharing flow." }],
        whatTheySaid: [{ when: "this week", text: "I need a clean update I can send from email without rebuilding the export.", conversationId: "priya" }],
        openThreads: [{ q: "Where did the sharing flow break down in week one?", status: "open" }],
      },
      owen: {
        who: "Builds the exec-facing internal dashboard on top of the API.",
        tenure: "On the panel 9 weeks · 22 min",
        reward: "Bronze — $30 gift card",
        channel: "In-product",
        cohort: "API-heavy account",
        whatTheyDid: [{ when: "last week", text: "Exported, then rebuilt outside the product to match exec expectations." }],
        whatTheySaid: [{ when: "last week", text: "The API is the whole reason I am here.", conversationId: "owen" }],
        openThreads: [{ q: "What would the in-product dashboard need to replace your internal one?", status: "open" }],
      },
      leah: {
        who: "Evaluating an upgrade; blocked on team visibility, not price.",
        tenure: "On the panel 2 weeks · 12 min",
        reward: "Just started accruing",
        channel: "Telegram",
        cohort: "Upgrade evaluator",
        whatTheyDid: [{ when: "3h ago", text: "Left the upgrade page 2s after the price reveal; re-checked reporting permissions." }],
        whatTheySaid: [{ when: "3h ago", text: "I need to know whether the team can see this before we upgrade.", conversationId: "leah" }],
        openThreads: [{ q: "What proof of safe team sharing would let you upgrade?", status: "told — awaiting verify" }],
      },
    };
  }

  // ── EXTRA named people (off-product cohorts: churned / never-converted / dormant) ──
  function extraPeople(workspace) {
    const p = product(workspace);
    return [
      {
        id: "sofia",
        name: "Sofia M.",
        color: "plum",
        segment: "Churned",
        surface: "Email (off-product)",
        status: "Off-product",
        memory: "Cancelled last month; reached off-product as a feedback partner.",
        last: "Honestly I never got far enough to feel it was worth it.",
        profile: {
          since: "Recruited 1 week ago · 14 min",
          reward: "Bronze — $30 gift card",
          knows: ["Cancelled before sharing a single dashboard.", "Cited price at cancel — but never reached the value moment."],
          shared: ["“I never got far enough to feel it was worth it.”"],
          open: ["What would have made the first week feel worth it?"],
        },
        file: {
          who: "Churned account — reached off-product with consent + compensation.",
          tenure: "Recruited 1 week ago · 14 min",
          reward: "Bronze — $30 gift card",
          channel: "Email (off-product)",
          cohort: "Churned",
          whatTheyDid: [{ when: "last month", text: "Entered the cancel flow; had never shared a dashboard." }],
          whatTheySaid: [{ when: "this week", text: "I never got far enough to feel it was worth it.", conversationId: "sofia" }],
          openThreads: [{ q: "What would have made week one feel worth it?", status: "open" }],
        },
      },
      {
        id: "raj",
        name: "Raj P.",
        color: "teal",
        segment: "Never-converted",
        surface: "Telegram (off-product)",
        status: "Off-product",
        memory: "Signed up free, never upgraded; opted into the program.",
        last: "I liked it but couldn't get my team to look at it.",
        profile: {
          since: "Recruited 4 days ago · 9 min",
          reward: "Just started accruing",
          knows: ["Free user who never upgraded.", "Adoption stalled at getting teammates to look."],
          shared: ["“I couldn't get my team to look at it.”"],
          open: ["What would have gotten your team to look?"],
        },
        file: {
          who: "Never-converted free user — reached off-product, consent + compensation.",
          tenure: "Recruited 4 days ago · 9 min",
          reward: "Just started accruing",
          channel: "Telegram (off-product)",
          cohort: "Never-converted",
          whatTheyDid: [{ when: "last week", text: "Hit the share wall, never invited a teammate, never upgraded." }],
          whatTheySaid: [{ when: "4 days ago", text: "I couldn't get my team to look at it.", conversationId: "raj" }],
          openThreads: [{ q: "What would have gotten your team to look?", status: "open" }],
        },
      },
      {
        id: "nadia",
        name: "Nadia F.",
        color: "blue",
        segment: "Resurrected",
        surface: "In-product",
        status: "Active now",
        memory: "Went dormant for a month, then returned this week.",
        last: "Came back when I heard you could share without a seat now.",
        profile: {
          since: "On the panel 7 weeks · 19 min",
          reward: "Bronze — $30 gift card",
          knows: ["Dormant for a month; returned this week.", "Came back specifically for share-without-seat."],
          shared: ["“Came back when I heard you could share without a seat.”"],
          open: ["What pulled you back vs. what pushed you away?"],
        },
        file: {
          who: "Resurrected user — dormant a month, returned for share links.",
          tenure: "On the panel 7 weeks · 19 min",
          reward: "Bronze — $30 gift card",
          channel: "In-product",
          cohort: "Resurrected",
          whatTheyDid: [{ when: "this week", text: "Returned after a month dormant; immediately created a share link." }],
          whatTheySaid: [{ when: "this week", text: "Came back when I heard you could share without a seat.", conversationId: "nadia" }],
          openThreads: [{ q: "What pulled you back vs. what pushed you away?", status: "open" }],
        },
      },
    ];
  }

  // ── Conversation trigger stamps (the moment that opened each 1:1) ──
  function conversationTriggers(workspace) {
    return {
      "dana-voice": { moment: "Repeat export", detail: "3rd CSV export in a week", theme: "sharing" },
      dana: { moment: "Repeat export", detail: "export_completed (3rd weekly)", theme: "sharing" },
      marcus: { moment: "Settings hunt", detail: "reporting settings opened 3×", theme: "sharing" },
      priya: { moment: "Onboarding", detail: "first week, no report opened", theme: "onboarding" },
      owen: { moment: "API handoff", detail: "opened API docs after export", theme: "sharing" },
      leah: { moment: "Abandoned upgrade", detail: "left upgrade page after price reveal", theme: "upgrade" },
      sofia: { moment: "Churn outreach", detail: "off-product, post-cancel", theme: "churn" },
      raj: { moment: "Never-converted outreach", detail: "off-product, free user", theme: "conversion" },
      nadia: { moment: "Resurrection", detail: "dormant user returned", theme: "resurrection" },
    };
  }

  // ── Extra conversations for the new off-product / resurrected people ──
  function extraConversations(workspace) {
    const p = product(workspace);
    return [
      {
        id: "sofia", userId: "sofia", title: "Why you cancelled", state: "Done", mode: "voice", duration: "14 min",
        trigger: { moment: "Churn outreach", detail: "off-product, post-cancel", theme: "churn" },
        messages: [
          { t: "them", text: "Thanks for hopping on — you cancelled last month. What were you trying to get done that " + p + " stopped doing?", meta: "Observant" },
          { t: "user", text: "Honestly I never got far enough to feel it was worth it. I kept exporting and gave up on sharing.", meta: "Sofia" },
        ],
      },
      {
        id: "raj", userId: "raj", title: "Never upgraded", state: "Async", mode: "chat",
        trigger: { moment: "Never-converted outreach", detail: "off-product, free user", theme: "conversion" },
        messages: [
          { t: "them", text: "You've been on the free plan a while — what's kept you from upgrading?", meta: "Observant" },
          { t: "user", text: "I liked it but couldn't get my team to look at it.", meta: "Raj" },
        ],
      },
      {
        id: "nadia", userId: "nadia", title: "What brought you back", state: "Active", mode: "chat",
        trigger: { moment: "Resurrection", detail: "dormant user returned", theme: "resurrection" },
        messages: [
          { t: "them", text: "Welcome back — you were away about a month. What pulled you back today?", meta: "Observant - resurrection" },
          { t: "user", text: "Came back when I heard you could share without a seat now.", meta: "Nadia" },
        ],
      },
    ];
  }

  function sampleEntities(workspace) {
    return {
      signals: signals(workspace),
      pulseMoments: pulseMoments(workspace),
      actLedger: actLedger(workspace),
      extraPeople: extraPeople(workspace),
      extraConversations: extraConversations(workspace),
      peopleFileById: peopleFileById(workspace),
      conversationTriggers: conversationTriggers(workspace),
    };
  }

  window.OBS_DATA = {
    sampleEntities,
    signals,
    pulseMoments,
    actLedger,
    extraPeople,
    extraConversations,
    peopleFileById,
    conversationTriggers,
  };
})();
