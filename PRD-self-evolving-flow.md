# Observant — Self-Evolving Product: Comprehensive Flow Redesign (PRD)

_Draft 2026-06-27 · from the PM + Researcher + Designer working session (7-agent debate + synthesis)._
_Canonical build spec. `PRD.md` = positioning; this = the end-to-end flow. Obsidian mirror in `*Observant/03-product/`._

> **Status: core model LOCKED (Xuan, 2026-06-27); some forks still open (§11).** Decided: acute wedge,
> triggers + a standardized light tier, the two-tier feedback model + decision path (§6), in-product=text-
> only, churn→off-product+recruit. Still open: pricing/payments, whose voice, signal labels, the
> "what-is-this" ethics — plus TODOs to lock the wedge line, name the tiers, and mine the KB moment library.

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

**Framing candidates** (need Xuan's pick — must be legible to *any* builder/startup founder, "acute"):
- **A.** "You launched. Are you learning from your users? Observant installs the feedback loop you know you
  need but don't know how to start — at onboarding, at churn, after every session."
- **B.** "The feedback layer for your product, in one PR. Start with your user journey; for AI apps,
  session-level feedback and evals from real users."
- **C.** "Stop guessing why users drop off. Observant watches your user journey and asks the right user the
  right question — at onboarding, at churn, every session."
- **D (AI-native cut):** "Turn every user session into product feedback and evals — automatically."

> _Recommendation: a blend of B + C — name the concrete starting point (user journey / session-level) AND
> the acute pain (you don't know where to start / you're guessing). **Open: Xuan to lock the line + the
> label (see §6).**_

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

## 6. The two feedback tiers + the decision path (CORE — Xuan, 2026-06-27)

> **The most important design decision in this PRD.** Everything about consent, compensation, voice, and
> recruitment derives from one cut: **Light/Standardized** vs. **Extensive.**

### Tier 1 — LIGHT / "Standardized" feedback  *(label TBD — §6.4)*
The **default, free, in-product** loop — and the **acute wedge** (§1.5). The thing a just-launched builder
who doesn't know where to start gets out of the box.
- **Standardized moments, shipped pre-built** (the builder does NOT design them): **onboarding · churn-risk ·
  session-end · eval · key journey steps.** *(The moment library expands from Xuan's KB — TODO §6.5.)*
- **Text only · one round · cooldown period · NO consent required · NO compensation.**
- Why no consent: lightweight, in-the-moment, non-interrupting — a tap or a sentence *while using the
  product*. This is the organic learning that makes a thin-data product alive on day one.

### Tier 2 — EXTENSIVE / "Deep" feedback
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

### 6.4 Label — TODO (Xuan to pick)
"Standardized/Light" needs a real name. Candidates: **Pulse** · **Quick loop** · **Moment** · **Tap** ·
**Check-in**. Extensive tier: **Deep dive** · **Deep 1:1** · **Sit-down**.

### 6.5 TODO — dig the standardized-moment library from the KB
The standardized program (onboarding · churn · session-based · eval · key-journey) should be grounded in
Xuan's `~/knowledge-base/` — the right question, cadence, cooldown, and "concrete-behavior bar" for each
moment. Related TODO: **precisely define the consent boundary** (exactly what flips light → extensive →
consent). These two are one decision.

## 7. Onboarding → first value

1. **Land** — same Novus vibe, zero data required: "Connect your repo and Observant watches + researches on
   its own." Only opt-out (can't/won't connect code) = the off-product fast lane, right here.
2. **Sign in with GitHub** → read-only clone + permission to open ONE PR.
3. **Watch the live Reasoning panel** — real Bash/Grep/Read calls + conclusions building your product map
   (visibly working, not a spinner; the same component reused later for "why this surfaced").
4. **First value, before any user replies** — the scan returns three things: (1) a pre-filled **Product
   Memory** (personas, flows, JTBD); (2) **3 proposed "moments worth interviewing"** (keep/edit → live
   triggers); (3) a drafted **starter question backlog** ("the 6 things I'd ask your users first, and who
   I'd ask each") — a research plan a no-muscle founder could never write, at minute five.
5. **Install via a single PR** that honestly states what it could NOT wire and why → review → merge → live.
6. **See the incentive model** (small feedback free; deep 1:1s ask consent + reward) — cost clear before
   any user is touched.
7. **Feel it** — "send a test loop to yourself"; optional "want a reply today? send your first off-product
   loop" to existing users via magic link.
8. **Land on the calm thin-data Home** — "watching for these 3 moments; the first 1:1s open as your users
   hit them." Alive and watching, honest about velocity-now / volume-later.

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
- **Q8 "Never say research"** when a real end-user (or Slack/MCP answer) asks "what is this?" — the ethics
  of what we tell the humans being learned from.
- **Build ownership of the user-side surface** — your conversation logic vs. Bin's transport (the known
  build-split gap).

### Open TODOs created by the 6/27 decisions
1. **Lock the acute-wedge framing line** (§1.5 candidates).
2. **Name the light tier** (§6.4: Pulse / Quick loop / Moment / Tap…) and the extensive tier (Deep dive…).
3. **Mine the KB for the standardized-moment library** + **define the exact consent boundary** (§6.5) —
   one decision.
