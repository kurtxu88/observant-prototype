# Observant — Self-Evolving Product: Comprehensive Flow Redesign (PRD)

_**THE single, always-current PRD** for Observant's product + flow — kept in sync with the live build on
every change. Hand this to anyone joining the team. (`PRD.md` = positioning copy only; this = the end-to-end
product + the logic behind it.) Obsidian mirror: `*Observant/03-product/`._

## 0. Read this first (for anyone joining)

**Rule for this doc:** it is the **single source of truth**, kept current with the build. If the build and
this doc ever disagree, fix it here. Last synced to build: **2026-06-29 (PM)**.

> ⚠️ **CURRENT BUILD (2026-06-29 PM) — reverted to the MentorMates demo + in-product snippet install.**
> Xuan rolled the build back to the demo we showed MentorMates last week (the **original dashboard** + the
> **off-product vs in-product** surface fork) and made ONE change on top: **in-product no longer dead-ends at
> "book a call" — it goes forward into the faithful Novus install** (Sign in with GitHub → Authorize →
> "reading your app" reasoning panel → single install PR → merge → live with **a few key feedback loops** —
> AI evals · exit survey · CSAT (the day-1 MVP; **not** framed as a "standardized pipeline" — full behavioral
> triggers and more come later). Off-product = the feedback program (invite + light/deep, magic link), unchanged.
> **Surfaces are pick-one-or-both** (off-product is the easy default); if both, you set up the in-product
> snippet **first**, then the off-product panel.
> **The elaborate three-product (baseline/customized) model + the three-layer dashboard redesign in §6–§8
> below are PARKED as future/advanced direction — NOT the current MVP.** Current MVP = off-product program +
> in-product key feedback loops. Live on branch **`xuan/demo-rebuild`**.

**Where it lives.** Live prototype: **observant-prototype.vercel.app** (current build = branch
**`xuan/demo-rebuild`** on Bin's repo `kurtxu88/observant-prototype`; the parked redesign lives on
`xuan/inproduct-self-evolving`). Deeper detail (all in `*Observant/03-product/`):
`access-levels-architecture` (snippet vs scan), `feedback-moments-and-consent`, `onboarding-flow-team-critique`,
`real-build-prerequisites`, `dashboard-ia-redesign` (the parked three-layer IA).

**Observant in one paragraph.** The mirror image of Novus (Pendo). Novus reads your repo to instrument
*behavior* (the *what*); Observant gathers the *why* — it installs in your product, runs feedback loops,
turns thin signals into reasons, ships fixes as PRs, and closes the loop with the named humans who raised
them. We never say "user research" — it's a **self-evolving product**. Wedge: *"Feedback, from the moment
you launch."*

**The model at a glance — three products** (current canonical names):

| Product | What | Who | Access | Consent |
|---|---|---|---|---|
| **Baseline feedback loops** | the smallest viable feedback pipeline — thin attitudinal signals (give-feedback · AI evals · exit survey · CSAT). A score, no reason; **no follow-up** (the *why* is a customized loop) | all users | install a **snippet** (no repo scan) | none (ambient) |
| **Customized — light** | the team sends a question → Observant *translates* it → light, runs it | opt-in panel | feedback partner program (magic link) | consent + reward |
| **Customized — deep** | same, but a ~10-min interview | opt-in panel | same | consent + reward |

Rule: **proactive = off-product** (email / IM only); **in-product = text only**.

**Glossary (names evolved — same things):** "Baseline feedback loops" = earlier *Standardized program* /
*Pulse*. "Customized feedback loops" = earlier *Feedback program* / Products 2–3; "deep" = earlier *Deep
dive*. On-ramp = **install a snippet** (the earlier *connect GitHub → scan the repo* is **retired**; the
repo scan is opt-in/advanced only). _Body sections below may still use the older terms — they mean the above._

**Build state (2026-06-29 PM):** prototype only — React + Babel SPA, **synthetic data, NO backend/auth**.
- **Current build (`xuan/demo-rebuild`):** onboarding = product context → the **off-product / in-product**
  surface choice (**multi-select — pick one or both**; off-product default) → **in-product** (its own page):
  the faithful Novus install (Sign in with GitHub → Authorize → reading-your-app reasoning panel → single
  install PR → merge → live with **a few key feedback loops**: AI evals · exit survey · CSAT — the day-1 MVP,
  *not* a "standardized pipeline"; behavioral triggers come later); **off-product:** program setup + magic link.
  If both are chosen, **install first, then the panel.** Dashboard = the **original demo dashboard** (Home ·
  Loop history · Feedback partners · Insights · Settings).
- **Parked (`xuan/inproduct-self-evolving`):** the baseline/customized three-product model + the three-layer
  dashboard redesign described in §6–§8 — future/advanced direction, NOT the MVP.
- **Open (need Xuan):** pricing/payments + payout liability, whose voice carries the messages, the off-product
  PII/send mechanic, and the real backend (auth/DB/GitHub-App/Stripe — see `real-build-prerequisites`).

**Decision changelog (the logic behind):**
- **6/29 (PM) — REVERTED the build to the MentorMates demo** (original dashboard + the off-product vs in-product
  surface fork) and made one change on top: **in-product now goes forward into the faithful Novus snippet
  install** (was a "book a call" dead-end). Why: off-product/in-product is the cleaner *buyer* decision point —
  some teams prefer off-product-only (light, no code) and shouldn't be pushed to install just to start; the
  baseline-vs-advanced framing wrongly implied baseline is a required minimum. MVP for day one = off-product
  program + in-product **a few key feedback loops** (AI evals · exit survey · CSAT — deliberately *not* called a
  "standardized pipeline"; behavioral triggers and more come later). Surfaces are **multi-select** (pick one or
  both; both → install first, then panel). Advanced (customized loops, the three-layer dashboard) is built later.
  The §6–§8 elaboration is kept but **parked**.
- **6/27** — Three-product architecture (passive/proactive × light/deep). Wedge = the acute "feedback from the
  moment you launch," not "autopilot" (you can't sell a latent-value muscle a founder's never used).
- **6/28 (Siyu)** — On-ramp = **install a snippet, not read-the-repo**: a snippet exposes only the interview
  surface; reading the whole codebase pipes the app to cloud (a security non-starter for an MVP). Triple-sourced
  (Siyu + access-levels + the Novus teardown, which confirmed Novus does *both* — we deliberately skip the scan).
- **6/29** — Verified the snippet alone covers the baseline program (no scan needed). Onboarding bifurcates
  early: baseline (default) + customized (add-on). Team critique (Jack/PM/Researcher/Designer) applied: a
  default-hero fork (not a coin-flip), honest install (listening-verify), evidence-graded moments, a test-Pulse
  with the consent disclosure. Renamed to **baseline / customized feedback loops** (the axis is passive vs
  proactive — both are "always-on," so that wording was dropped). Baseline reframed as *"the smallest viable
  feedback pipeline"* — thin scalar/binary attitudinal signals; a score with no reason, **no follow-up** (the
  why is a customized loop). Install step duplicates the Novus connect-GitHub → install-PR → merge flow.
  Customized = Observant **translates** the team's question (you don't craft research), gated on a feedback
  partner program.

---

> **Status: core model LOCKED; architecture clarified 2026-06-29.** Locked: acute wedge + wedge line ("Feedback,
> from the moment you launch." — doc only, not deployed), the **three-product architecture** (§6: Product 1
> passive/in-product/snippet · Products 2–3 proactive/off-product/consent), in-product=text-only,
> **proactive=off-product**, the consent boundary (§6.6). **Verified 6/29: NO whole-repo scan needed** — the
> standardized program runs on the snippet alone; the scan is opt-in/advanced only (on-ramp in §7 to be
> rewritten to snippet-install). Still open: pricing/payments, whose voice, signal labels, the off-product
> PII/Mailchimp send mechanic.

---

## 1. North star

Observant is the **mirror image of Novus**. Novus turns your repo into self-instrumenting behavioral
analytics (the **WHAT** users did); **Observant turns your repo into a self-evolving product that learns
the WHY.** It reads your code to find the moments worth a conversation, runs a living 1:1 with each named
user, grounds every signal in existence-proof evidence (refusing to hallucinate the way a rigorous
researcher refuses), ships the fix as a PR, and then **closes the loop the one way a behavior-only tool
never can — it goes back to the same humans and confirms it actually worked.**

Same on-ramp as Novus (**come → read your GitHub repo → install behavioral triggers → run user feedback
automatically**). The substrate is continuous async 1:1 conversations (the why) fused with behavioral
triggers (the when/who), and **per-user living memory is the moat.** It is never "user research" — it is a
**self-evolving product.**

**The loop, one line:** *Novus closes the loop in code and stops; Observant closes it in code, in the
relationship, AND in re-validated evidence — a self-evolving AND self-verifying product.*

## 1.5 The wedge — how we lead (Xuan, 2026-06-27)

**Lead with the acute, in-product-feedback wedge — not "autopilot."** The insight: most builders, once they
launch, *know* they should be gathering user feedback but have **no idea where to start.** Observant gives
them the starting point — it installs the feedback loop at the moments every product should be learning
from, **beginning with the user journey**, and for AI products, **session-level / eval feedback.** Autopilot
is the residue that accrues behind the wedge, not the hero copy.

**LOCKED (Xuan, 2026-06-27 — documented, NOT yet on the live site):**

> **Feedback, from the moment you launch.**
> You know you should be learning from your users. Observant installs the loop and starts with your user
> journey — onboarding, churn, every session. For AI apps, session-level feedback and evals.

A 5-word hook built on the *trigger* (launch day), not the feature — leaving the body line to carry the
"where do I start" pain and the concrete starting points (journey + evals). Runner-up hook:
**"Stop guessing why users leave."** _(Do not push to the marketing site yet — copy is locked in the doc
only, pending Xuan's go to deploy.)_

## 2. The two non-negotiable spines

Everything below hangs on two primitives the session treated as load-bearing:

1. **Evidence Grade** (the trust contract). Every Signal distinguishes **past-behavior existence-proof**
   ("last week I tried to export and couldn't find it" = strong) from **hypothetical intent** ("I'd use
   that if you built it" = weak), counted and named. This is research methodology made into UI — it's what
   makes an autonomous system safe for a builder with **zero hallucination tolerance.** It carries a
   **sample-bias disclosure** ("grounded in your 6 most-active repliers; 22 quiet") and never hides a
   pattern below threshold — sub-threshold renders as **"Forming,"** not a wall of low-confidence cards.
2. **Close-the-loop-and-verify.** Every shipped change goes back to the **named humans** who raised it
   ("we changed this because of what you said"), then **re-asks them after ship** whether it actually
   landed. The human-close is the durable wedge a clicks-only tool structurally cannot make, and it
   compounds panel retention (people answer again because they watched the last answer matter).

## 3. Surface / IA map

Collapsed to ~6 nav destinations + a docked assistant (calm, not console). Program folds into People;
Triggers fold into Memory; People Memory is a drawer, not a page.

| Surface | Novus analog | What it is | Priority |
|---|---|---|---|
| **Home** | Dashboard ("monitoring your product") | Calm, **relationship-first** monitoring landing (never "triggers fired: 0"). Topline = open 1:1 lines · replies this week · fresh Signals · loops closed. Weekly digest, 2–3 forming Signals, recent 1:1s, an **Activity ledger** (every conversation/Signal/PR/loop it ran on its own). The **thin-data empty state is a first-class designed screen** — "watching for these 3 moments" — because for a 40-user account, days 1–14 *are* the product and the demo. | **P0** |
| **Ask Observant** (docked rail, every surface) | Product AI Assistant | The sharpest inversion of Novus: their assistant only **reads** what happened; ours reads **and has a mouth.** Grounded answers cite named people + verbatim quotes. Thin evidence → it doesn't guess: *"I don't have enough to answer — want me to go ask?"* → one click turns the question into a tracked **question-in-flight** (explicit waiting/notification state, not a hanging chat bubble) that returns into the thread when replies land. | **P0** |
| **Signals** | Signals (Issues/Insights/Opportunities) | The analyze surface, grounded in the *why* (see §4). | **P0** |
| **Memory** (Product brain + Moments/Triggers) | Memory + Targeting/Segments | Auto-written, editable product brain from the GitHub scan (flows, personas, JTBD, sitemap) — **value before any data.** Houses the **"Moments worth interviewing" / behavioral Triggers** as editable first-class objects, plus the standing **Context** the team feeds (3-mo goal, hypotheses, docs) and the visible **conversation-quality bar**. | **P0** |
| **People / Feedback partners** | Segments + Replays-by-visitor (no Novus per-person *why*-memory) | The roster where each person is a **living file** (who they are, what they DID, what they SAID verbatim over time, open threads, reward/tenure) — the person, not the study, is the unit of analysis; each file is an automated diary study. Opens as a **drawer** from any name. **Program (compensation + recruitment) folds in here** as a dial on a cohort. The structurally un-copyable moat. | **P0** |
| **Act** | ACT (PR reviews, instrumentation PRs, guides) | The **four-state close-the-loop ledger** (drafted → shipped → told → verified) — watch one loop travel end to end (see §5). | **P0** |
| **Conversations** | Replays (searchable by visitor) | The **why-on-record**: async 1:1 threads + ~10-min voice transcripts, searchable by person/cohort/trigger/theme, each stamped with the moment that triggered it. Every Signal claim drills down to the exact verbatim turns here — the audit trail. Mostly a drill-down, kept top-level for suite completeness. | **P1** |
| **Channels — Slack + MCP** | Ask Novus in Slack + MCP | Where the learning **comes to her**: Ask Observant in Slack (grounded answers, weekly digest, @observant relays a question into live 1:1s) + an **MCP endpoint** so Claude Code/Cursor pull what users *said* mid-task. Low-build, high "infrastructure" payoff. | **P1** |
| **User-side conversation surface** (the CAPTURE half) | In-app guides/polls — but as capture, not push | The screens the **end user** sees: in-product 1:1 prompt, async chat thread, ~10-min voice surface, and the consent + reward moment. **The highest-risk omission** — no console matters if the prompt has a 2% response rate. Determines response rate → determines whether any Signal has data. **Must have a v1 owner.** | **P0** |
| **Settings & Context** | Instructions + PII masking | Install/identify() status, channels, editable intro questions, and the **consent/data-handling layer that explains its reasoning per decision** (hashed identity, per-conversation consent for deep dives, retention + right-to-forget, never holds raw user data). | **P1** |

## 4. The Signals model (analyze, grounded in the why)

Substrate = continuous 1:1 conversations (why) fused with behavioral triggers (when/who) — behavior +
attitude together, which neither analytics nor surveys produce alone. Three tabs (labels are **open
question §11-Q6**):

- **ISSUE** — something painful/broken users are actively telling you about (a trigger fires AND the 1:1s
  converge on a why). Metric = volume + agreement ("5 of 7 power users, high agreement").
- **INSIGHT** — a durable true thing about your users you didn't know (a mental model, a workaround, an
  unmet JTBD). *Anchor on the behavioral existence-proof, never on what users merely SAY* (e.g. upgrade
  abandoners aren't price-sensitive — they can't justify the value to teammates internally).
- **OPPORTUNITY** — a latent unmet need recurring unprompted. **Explicitly the weakest evidence class** —
  can only open a validation conversation, **never auto-open a PR.**

**The two Novus grounding fields, inverted for a why-signal:**
- **"What the data shows"** = the behavioral artifact that fired the trigger (3rd export this week; left
  upgrade page 2s after price reveal) **+ verbatim user words** (the evidence is the quote, not the metric)
  **+ the Evidence Grade** (existence-proofs vs. hypotheticals, counted/named) **+ sample-bias disclosure.**
- **"Why this surfaced"** = the convergence logic — which trigger fired, how many independent conversations
  agree across which specific people, and **an honest confidence statement that refuses to over-claim at
  low N** ("only 3 people so far; watching for more, or recruit for depth").

**Trust-contract rules:** (1) always surface, always grade, never hide below N ("Forming" not a wall of
scarlet); (2) **never recruit to pad a number** — recruit only to fill a *named* sampling gap on a
specific decision; (3) **Contradiction** (behavior says X, words say Y) is a **first-class cross-cutting
flag** — the highest-value, only-Observant-can-produce-it finding. A Signal is **proactive**: when behavior
fires a trigger but Observant lacks the why, it doesn't raise a Signal — it **opens a conversation to go
get the why,** then raises it once grounded. That auto-ask-the-next-question is what "runs itself" means.

> **Upstream dependency:** a pretty Signals tab on a lazy interviewer loses the buyer on the first
> hallucinated insight. **Conversation quality (the "concrete-behavior bar")** must be a visible, tunable
> object upstream of every Signal.

## 5. The Act loop (a learning Signal → a shipped, verified change)

Five moves (moves 1–2 already half-built in `InsightDetail`):

1. **Root cause** — "what the conversations say," grounded in named existence-proofs. Thin evidence → says
   so and routes to the Program instead of fabricating confidence.
2. **Agent-ready fix** — file-scoped step-by-step plan (the scan built the product map, so steps reference
   real paths), three exits: **Open PR** / **Hand-to-Claude** / **Copy-plan.** Open-PR **gated to the
   connected/in-product path** (off-product can't execute code) — the gate **degrades gracefully** (plan +
   Hand-to-Claude always visible; Open-PR quietly appears when the repo is connected). **Evidence-class
   gating:** an Issue with existence-proofs can drive a PR; an Opportunity never auto-opens one.
3. **Close the loop with the humans** — go back to the named people: "you mentioned the upgrade pricing
   surprised you — we changed it because of what you said." **In the product's interviewer voice, never AS
   the founder** (hard rule — see §11-Q3).
4. **Verify / re-validate** — after ship, watch whether behavior changes for those same people, then
   re-ask "did this land?" Triangulation closes (behavior moved AND humans confirm). "Still broken"
   reopens as a new Issue with stronger evidence.
5. **Tune** — the trigger self-incorporates the outcome; the question backlog regenerates.

> **Sequencing honesty:** for thin-data teams (~40 users) we sell **loop velocity** (one signal → one
> shipped fix, fast), not "we watched 10,000 sessions." The wedge is the **learning** (the moat); the
> auto-PR is the proof-point — **do not lead with code-gen and fight Cursor on its own turf.**

## 6. The feedback architecture — THREE PRODUCTS (CORE — Xuan, 2026-06-29)

> **The system, organized.** Two questions decide everything: **WHO initiates the feedback?** (passive vs.
> proactive) and **HOW DEEP?** (light vs. deep). That yields three products. The earlier Pulse / Deep-dive
> tiers map in: **Product 1 = Pulse**; **Product 3 = Deep dive**; **Product 2** is the new middle (light,
> proactive, off-product). One governing rule: **proactive = off-product** (never disturb people *inside*
> the product); off-product surfaces are **email or IM only.**

```
                              WHO INITIATES?
              ┌─────────────────────────┬───────────────────────────────────┐
              │  PASSIVE                 │  PROACTIVE                          │
              │  the product asks in the │  you reach out to specific people   │
              │  moment of use           │  with a question                    │
  ────────────┼─────────────────────────┼───────────────────────────────────┤
   WHERE      │  IN-PRODUCT (snippet)    │  OFF-PRODUCT (email / IM only)       │
   CONSENT    │  none (ambient feedback) │  required (opt-in program)           │
   WHO        │  ALL users               │  only opt-in feedback partners       │
   ACCESS     │  install SDK snippet     │  PII to email — or the client sends   │
              │  (NO code read)          │  themselves (Mailchimp model)         │
  ────────────┼─────────────────────────┼─────────────────┬─────────────────┤
              │  ▸ PRODUCT 1             │  ▸ PRODUCT 2     │  ▸ PRODUCT 3     │
              │  Standardized program    │  Light proactive │  Deep proactive  │
              │  passive · light ·       │  proactive·light │  proactive·deep  │
              │  no-consent              │  · consent       │  · consent       │
              │                          │                  │                  │
              │  • session evals (AI     │  a PM's specific │  ~10-min         │
              │    output rating)        │  question to an  │  interview to an │
              │  • onboarding survey     │  opt-in cohort   │  opt-in cohort   │
              │    (why here? + optional │  · 1–2 rounds    │  · full convo    │
              │    deeper intro convo)   │                  │                  │
              │  • key-CTA moments       │  = off-product   │  = off-product   │
              │  • satisfaction pop-up   │    LIGHT         │    DEEP (= "Deep │
              │    (optional)            │                  │    dive")        │
              │  = "PULSE" (snippet)     │                  │                  │
              └─────────────────────────┴─────────────────┴─────────────────┘
```

**Product 1 — Baseline feedback loops** *(formerly "Standardized program"; passive · light · no consent ·
all users · SNIPPET)* — **"the smallest viable feedback pipeline"** (Xuan, 2026-06-29). The thin attitudinal
layer any product can stand up, collected automatically on the installed snippet:
- **Unsolicited** — an always-available "give feedback" affordance (the user volunteers, unprompted).
- **Solicited, at touchpoints** — session-based **AI evals (ratings)**, an **exit survey** (leave / downgrade
  / cancel), **CSAT** (periodic satisfaction tap).

> **The framing (precise register):** *the baseline instrument is a thin scalar/binary attitudinal signal —
> a score with no reason attached.* It's cheap, it's everywhere, and on its own it tells you *that* someone
> is unhappy, never *why*. **Baseline stops at the score — it does NOT follow up** (Xuan, 6/29: follow-ups
> belong to *customized* loops). All text, one-round, no consent — ambient product feedback under the
> existing privacy policy. *(Honesty guard from the 6/29 critique: present these as the thin signals they
> are — never launder a bare score into a Signal/finding. To turn a weak score into a reason, the team runs
> a customized loop.)*

**Products 2 & 3 — Customized feedback loops** *(proactive · off-product · consent · opt-in)* — **you don't
craft research; you ask, Observant runs it.** Starts with a **feedback partner program**: invite users to
opt in to a growing panel. Then the team sends a **specific question about the product or its users** anytime
— they don't write the study or pick who. **Observant translates it into the right depth — light mode
(Product 2, 1–2 rounds) or deep mode (Product 3, ~10-min interview) — disseminates it, runs it, and delivers
the insight/answer.** Off-product (email / IM); voice allowed off-product. Needs PII to send — **or the
client sends the magic link themselves** (Mailchimp model, parked).

### Does this design still need the whole code scan? → **NO (for v1).**
Per-moment check of Product 1 against *snippet (client-side, codeless) vs. scan (server-side, code-read)*:

| Standardized moment | Snippet alone? | Why |
|---|---|---|
| Session / AI-output eval rating | ✅ | the output renders in the UI; the snippet injects the rating client-side |
| Onboarding context survey | ✅ | onboarding routes / first-session are client-side events |
| Key-CTA: purchase made/not, left main flow, cancel/downgrade/close (has a UI flow) | ✅ | clicks + page-abandon are client-side; the SDK auto-captures them codelessly |
| Satisfaction pop-up | ✅ | client-side injection |
| **Silent backend churn** (subscription lapsed / stopped paying, *no UI event*) | ⚠️ not the snippet | a server-side event the client SDK can't see — **but this is handled as PRODUCT 2/3 off-product** (the client already knows their churn list and emails them). So it never needs an in-product server-side trigger. |

**Conclusion:** every Product-1 moment is **snippet-only**; the one server-side case (silent churn) routes to
**off-product proactive** instead. **So we do NOT need the full codebase scan in this architecture.** The scan
was only ever required for the *advanced, auto-firing, custom/server-side in-product triggers* (e.g. "show a
form when they click X but don't reach Y," auto-detected drop-off, auto-detected resurrection) — and Xuan's
call is **we likely don't do that**; the standardized snippet program is the starting point. The scan stays a
**future / opt-in depth tier**, not the on-ramp. *(This retires the repo-scan on-ramp in §7 — see §7 note.)*

### The original two tiers (kept for reference; folded into the three products above)

> **The cut underneath it all:** **Light/Standardized** vs. **Extensive** — Product 1 is light/no-consent;
> Products 2–3 are the consent+pay program.

### Tier 1 — PULSE  (light / standardized feedback)
The **default, free, in-product** loop — and the **acute wedge** (§1.5). The thing a just-launched builder
who doesn't know where to start gets out of the box.
- **Standardized moments, shipped pre-built** (the builder does NOT design them): **onboarding · churn-risk ·
  session-end · eval · key journey steps.** *(The moment library expands from Xuan's KB — TODO §6.5.)*
- **Text only · one round · cooldown period · NO consent required · NO compensation.**
- Why no consent: lightweight, in-the-moment, non-interrupting — a tap or a sentence *while using the
  product*. This is the organic learning that makes a thin-data product alive on day one.

### Tier 2 — DEEP DIVE  (extensive feedback)
- A **~10-min conversation. Requires consent + compensation.**
- Runs on a **recruited feedback program** (§6.2).
- **Voice allowed — but ONLY off-product. In-product is NEVER voice (text only, always).**

### The two clean rules (the trust contract, operationalized)
- **CONSENT + PAY line:** consent + compensation are required for **anything EXTENSIVE** (deep ~10-min) **and
  anything OFF-PRODUCT** (interrupting someone outside your product). **Light/standardized in-product needs
  neither.**
- **VOICE line:** **in-product = text only, always.** **Off-product = text OR voice.**

### 6.1 The decision path

```
Builder installs Observant   (in-product is the default on-ramp)
│
├── IN-PRODUCT  (snippet live)
│   │
│   ├── LIGHT / Standardized          ← DEFAULT · the wedge · FREE
│   │     moments: onboarding · churn-risk · session-end · eval · key journey
│   │     text only · one round · cooldown · NO consent · NO pay
│   │
│   └── EXTENSIVE / Deep               (opt-in escalation)
│         ~10-min · TEXT ONLY (no voice in-product) · consent + pay
│         needs a recruited feedback program  ↓
│
└── OFF-PRODUCT — recruit feedback partners    ← available from DAY 1
      for: extensive/deep work · churned · never-converted · dormant · volume
      magic-link invite under the founder's brand → opt-in partners
      consent + pay ALWAYS · text OR voice
```
**Minimal path:** a builder can opt out of all recruitment/extensive and run **in-product + light only** —
*we work with that.* **Maximal path:** recruit a feedback program from day 1 to run extensive/deep work and
to reach people the in-product loop structurally can't (the churned, the never-converted).

### 6.2 Program & recruitment (the sampling lever)
**Principle:** the paid program is the **exception that fires when learning DEMAND exceeds organic SUPPLY** —
available **from day 1**, never a vanity-volume funnel. Two scopes:

- **OFF-PRODUCT (no snippet): program ON by default.** Reaching existing users over email/Telegram via magic
  link interrupts their time *outside* the product → always consent + compensated. Founder invites under
  their **own brand** (built); opt in as partners, opt out in one tap; Observant audits every minute. ~5–10%
  opt-in. The day-one fast lane for anyone who won't connect a repo — **and the home of churn /
  never-converted / dormant outreach** (Xuan, Q5: reaching people who left is *another reason to run
  off-product and recruit feedback partners* — it folds in here, not a separate edge case).
- **IN-PRODUCT (snippet live): program OFF by default.** Light/standardized flows free. The program activates
  only when a Signal needs more than the light loop can give — **Coverage** (a Signal needs N grounded
  responses but organic can't supply N in its freshness window → recruit your own opted-in users first) or
  **Cohort/Reach** (the people who can answer aren't in the product → off-product external panel). Cost shown
  **before** spend; approve a budget, not a per-message charge. External-panel insight is **hard-labeled**
  distinct from your-own-users insight.

### 6.3 What's already built vs. new
- **Built:** the off-product invite + magic link + per-minute compensation + audit; the in-product
  consent+reward escalation (`InProductIncentive`).
- **New:** the **standardized light-tier moment library** (onboarding/churn/session/eval/journey, no
  consent); the **light↔extensive escalation rule**; wiring recruitment to a Signal's evidence gap;
  day-1 recruitment for the feedback program; the in-product=text-only / off-product=voice-allowed rule.

### 6.4 Tier names — LOCKED (Xuan, 2026-06-27)
**Pulse** = the light tier (free, in-product, recurring, no-consent, one round). **Deep dive** = the
extensive tier (~10-min, consent, paid). They pair self-explainingly and the escalation reads as a verb:
**Pulse → Deep dive.**

### 6.5 The Pulse (light) standardized program — START ABSOLUTELY MINIMAL ⏳ TEMPORARY (Xuan, 2026-06-27)

> **Decision pinned as temporary — revisit 2026-06-28.** The 9-moment library below (`docs/FEEDBACK-MOMENTS.md`)
> is the **full superset / future reference, NOT v1.** The standardized program has to **fit everyone**, so
> v1 does the *least* possible.

**Guiding principle (Xuan): asking people feels heavy — not every behavioral trigger is worth a question.**
Most behavior should just be *watched* (Novus-style — it reads the code, instruments the events, and never
interrupts the user). **Observant adds a question only at the very few moments that earn the interruption.**
So the standardized Pulse is closer to Novus's "read your codebase, find the key conversion events" than to
a broad survey program — auto-discover from the code, prompt almost never. *(TODO 6/28: study exactly how
Novus picks its default/standard set and mirror that restraint.)*

**v1 Pulse = exactly two moments (temporary):**
1. **AI eval ratings** — a lightweight rate/why on AI outputs (the AI-native cut; the one place a quick
   prompt feels native, not intrusive).
2. **One key conversion-CTA follow-up** — read the codebase to find the single most important convert
   action (buy / upgrade / sign-up), and prompt only on that one (e.g. abandoned it). Not every CTA — *the*
   CTA.

Everything else in the moment library (onboarding/D0, churn-risk, session-end, key-journey, activation,
resurrection, post-purchase, feature-adoption) stays **parked** until we decide it earns the interruption.
The three governing laws (behavior-not-intent · one-round · global ceiling) and the consent boundary (§6.6)
still apply to whatever ships.

**⏳ TODO — continue 2026-06-28:** design the minimal standardized Pulse properly — how Novus handles the
default set, exactly which 1–2 moments ship, the code-read that finds the key CTA, and the "is this worth
asking?" bar that keeps it from feeling heavy.

### 6.6 The consent boundary (RESOLVED — light = product feedback; extensive = research)
**A moment runs LIGHT (free, no consent, no pay) ONLY IF all are true:** (1) in-product · (2) text only ·
(3) ≤1 round · (4) no new PII · (5) not a sensitive topic · (6) no compensation — under the existing privacy
policy, trivially ignorable, with a one-tap "what is this?" disclosure. **Break any → EXTENSIVE → consent
required; compensation whenever it's off-product, recorded, or >1 round.** The churned/never-converted are
off-product by construction → always consent+pay. **Escalation is a user-accepted offer, never automatic —
accepting the "can I ask a couple more questions? ~10 min, compensated" prompt *is* the consent gate.** This
also resolves the ethics leak (old Q8): the honest in-product disclosure is *"this product is learning from
how you use it so it can improve — your answer helps, you can ignore it."* Full lever table + "partners not
subjects" floor in `docs/FEEDBACK-MOMENTS.md`.

## 7. Onboarding → first value (REDESIGNED — Xuan, 2026-06-29)

The whole onboarding now **bifurcates early** into the two setup routes from §6, and explains *why* each
exists and *what it enables*. No repo scan anywhere. Mail send = **generate-a-magic-link, the client sends
it** (Mailchimp/ESP integration parked for later).

```
  STAGE 0 — Product context (shared, ~30s)
     name · URL · who uses it · what you'd like to learn
                          │
                          ▼
  STAGE 1 — THE FORK:  "How do you want to gather feedback?"
     two routes, explained side by side (pick one or both):

   ┌─────────────────────────────────────┐   ┌──────────────────────────────────────┐
   │ ▸ STANDARDIZED PROGRAM   (default ✓) │   │ ▸ FEEDBACK PROGRAM        (add-on)     │
   │   passive · light · all users        │   │   proactive · light OR deep · opt-in   │
   │                                       │   │                                        │
   │ "Always-on light feedback at the     │   │ "Ask your own questions, or go deep    │
   │  moments that matter — installed once,│   │  (a real ~10-min conversation). Invite │
   │  runs itself. No questions to write,  │   │  users to opt in; you or the product   │
   │  no one to recruit."                  │   │  team send questions anytime."         │
   │                                       │   │                                        │
   │ Enables → session/AI evals ·          │   │ Enables → Product 2 (light proactive)  │
   │   onboarding survey · key-CTA ·       │   │   + Product 3 (deep ~10-min interview) │
   │   satisfaction pop-up                 │   │                                        │
   │ Setup → install a code snippet (SDK)  │   │ Setup → invite + compensation +        │
   │   (no code read, no consent)          │   │   magic link YOU send (consent + pay)  │
   └─────────────────────────────────────┘   └──────────────────────────────────────┘
        the default everyone turns on              the gate for deep mode + product-team
                                                    questions ("you can't deep-interview
                                                    someone who hasn't opted in")
                          │
            ┌─────────────┴──────────────┐
            ▼                            ▼
  STAGE 2A — Standardized setup      STAGE 2B — Feedback-program setup
   • paste the snippet (one line)     • set compensation (cash/min) + perks
   • it auto-captures client-side     • write the invitation (your brand)
     behavior, codelessly             • generate the magic link → YOU send it
   • see the moments it will ask at     to your users (we don't email for you yet)
     (Pulse) + the satisfaction-popup  • choose surfaces: email or IM
     toggle                           • light vs deep is a per-question choice later
            └─────────────┬──────────────┘
                          ▼
  STAGE 3 — Launch → calm Home ("watching for these moments; opt-ins flow in")
```

**The bifurcation copy (Stage 1) — say the why plainly:**
- **Standardized program** = *what you turn on so you're never flying blind.* Light, ambient, every user,
  zero work — the snippet does it. This is the default; recommended ON.
- **Feedback program** = *what you set up when you have something specific to ask, or want to go deep.* It
  needs people who've opted in (you can't run a 10-min interview on an anonymous tap), so it carries the
  invite + consent + compensation. Add it now or anytime later.
- **The relationship between them:** standardized is the floor everyone gets; the feedback program is the
  add-on that unlocks **proactive questions (Product 2)** and **deep interviews (Product 3)**. A team that
  can't/won't install the snippet can run the feedback program alone (pure off-product).

**Notes:**
- **No "first value from a scan" anymore** — the snippet's value is that it starts gathering immediately and
  codelessly; the standardized moments are pre-built, so there's nothing to configure.
- **"Feel it"** still applies — "send a test Pulse to yourself" / "send a test loop to yourself" so the
  founder sees the user-side experience before a real user does.
- **Deep mode + ongoing product-team questions are gated on the feedback program** — surface that gate at
  Stage 1 so the choice is legible, and let them add the program later from the dashboard if they skipped it.

## 8. What ships first (v1)

- **Keep the BUILT onboarding exactly** (InProductConnect: Connect → Reasoning scan → Install PR + caveat).
  Novus vibe + demo magic + value-before-data, zero rework, honors constraint #1.
- **Relationship-first Home** with a first-class **thin-data empty state** + the docked **Ask Observant**
  rail on every surface.
- **Signals** restructured into Issues/Insights/Opportunities with the **Evidence Grade** primitive,
  sample-bias disclosure, **Contradiction** flag, and **"Forming"** for sub-threshold. (Today's Insights
  page, elevated to the center of gravity.)
- **The user-side conversation surface** (in-product prompt + async thread + consent/reward). Highest-risk
  omission — must have an owner (§11-Q7).
- **Act** as the four-state ledger (drafted → shipped → told → verified). Off-product Act = draft +
  close-the-loop only.
- **Program** wired to the Signal's evidence meter: DEPTH (built) + the new COVERAGE and COHORT/REACH
  triggers; off-product ON-by-default, in-product OFF-by-default.
- **People Memory** as a contextual drawer off any name + the roster, Program folded in.
- **Ask Observant "with a mouth"** — thin evidence → "want me to go ask?" → tracked question-in-flight.
- **Slack digest + out-of-app arrival card** (one-glance payload, one tap-through). **MCP** P1.

## 9. Risks (the session's honest list)

- **Cold-start supply:** 40 users × 5–10% = 2–4 partners — not enough to ground one Signal at honest
  confidence. Mitigation: relationship-first Home, "Forming" Signals, the proactive question backlog, the
  off-product fast lane.
- **Survivorship bias is structural:** in-product triggers only fire for people *still in* the product →
  every Signal over-weights survivors and the vocal power-user minority. Needs sample-bias disclosure +
  churn/never-converted outreach as a real motion, or it launders the loud minority into "what your users
  think."
- **Garbage-in:** a beautiful Signals tab on a lazy interviewer loses the zero-hallucination buyer on the
  first invented insight. Conversation quality must be a visible, tunable object — nobody owned it.
- **Evidence Grade needs an eval:** it's only as honest as the synthesizer's ability to classify
  past-behavior vs. hypothetical at scale. Needs a measured accuracy bar before it's promised, not a claim.
- **Async substrate in a real-time costume:** "monitoring" reads dishonestly when the dashboard is quiet
  for two days. The waiting state / notification model / question-in-flight must be designed.
- **Voice + liability:** automated branded outbound to a founder's real users can damage their
  irreplaceable relationship. Voice boundary (product-interviewer voice, never AS the founder) = hard rule.
- **Payments operational load:** real cash (Stripe Connect, payout liability, float, chargebacks, tax) is
  unscoped — an operational P0, not cosmetic.
- **Open-PR competes with Cursor/Claude Code** while the actual moat (trustworthy learning) is
  under-invested. Leading with code-gen risks winning the demo and losing the wedge.
- **"Never say research" abstraction leak:** breaks the moment a real user asks "what is this?" A learning
  product that hides what it is from the humans it learns from has an ethics/trust problem, not just copy.

## 10. Provenance

Synthesized from a 7-agent working session (2026-06-27): PM + Researcher (grounded in `~/knowledge-base/`)
+ Senior Designer each drafted an independent flow → cross-critiqued (the debate) → synthesis. Grounded in
3 Novus screen recordings (`*Observant/02-strategy/novus-by-pendo-teardown-2026-06-21.md`, incl. the 6/27
Recording-3 addendum) and the current build. The session flagged its own near-groupthink — the spine is
high-confidence; the bets in §11 are genuinely open.

## 11. Decisions

### Decided (Xuan, 2026-06-27)
- **Q1 Headline → ACUTE WEDGE.** Lead with the in-product-feedback starting point (you launched, you should
  be learning, you don't know where to start → user journey / session-level / eval feedback). Autopilot
  accrues behind it. *Framing line still to lock — candidates in §1.5.*
- **Q4 Early loop → TRIGGERS + a STANDARDIZED light program.** Keep the behavioral triggers (the Novus
  vibe), AND add the standardized light-feedback moments (onboarding/churn/session/eval/journey). Captured
  as the two-tier model (§6). *TODOs: KB moment library + the consent boundary (§6.5).*
- **Q5 Churn / never-converted → run OFF-PRODUCT + recruit.** Not a separate edge case — it's another reason
  to run off-product and recruit feedback partners; folds into §6.2.
- **Q7 User-side surface / voice → IN-PRODUCT IS TEXT-ONLY (always); voice only OFF-PRODUCT.** Light tier =
  text, no consent. Extensive = consent + pay, text in-product / text-or-voice off-product. Clients can
  recruit the feedback program from **day 1**; the minimal path (in-product + light only) is supported.
  *Ownership (you vs. Bin) still to confirm — see below.*

### Still open
- **Q2 Pricing + payments + liability.** Per-minute markup / SaaS + pass-through payouts / pre-bought
  credits — and who carries Stripe-Connect payout liability, float, chargebacks, tax. Unscoped P0.
- **Q3 Whose VOICE** carries close-the-loop & the 1:1s — product-interviewer voice (proposed hard rule) vs.
  founder brand vs. hybrid. (Distinct from text-vs-voice modality, which is decided. Miner Road precedent:
  AI never writes her personal comms.)
- **Q6 Signal labels** — Issues/Insights/Opportunities vs. Frictions/Findings/Openings.
- **Build ownership of the user-side surface** — your conversation logic vs. Bin's transport (the known
  build-split gap).

### Resolved since
- **Q8 "what is this?" ethics → RESOLVED** by the consent work (§6.6 + `docs/FEEDBACK-MOMENTS.md`): the
  in-product disclosure line + "partners not subjects" floor.
- **KB standardized-moment library + consent boundary → DONE** (§6.5–6.6, full spec in
  `docs/FEEDBACK-MOMENTS.md`).

### Locked 2026-06-27 (documented, NOT deployed)
- **Wedge line → "Feedback, from the moment you launch."** + body (§1.5). _Copy lives in the doc only —
  do NOT push to the marketing site until Xuan says go._
- **Tier names → Pulse / Deep dive** (§6.4).

### ⏳ TODO — continue 2026-06-28 (temporary decisions pinned today)
- **Minimal Pulse program (§6.5).** v1 = just **AI eval ratings + one key conversion-CTA follow-up**
  (auto-found by reading the codebase). Asking feels heavy → prompt almost never; watch (Novus-style)
  mostly. Tomorrow: study how Novus picks its default set, lock the 1–2 shipping moments + the code-read +
  the "is this worth asking?" bar. The 9-moment library (`docs/FEEDBACK-MOMENTS.md`) stays parked as the
  future superset.
