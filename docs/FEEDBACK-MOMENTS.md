# Standardized-Moment Library + Consent Boundary

> ⚠️ **This is the FULL superset / future reference — NOT v1.** Per Xuan (2026-06-27), the standardized
> **Pulse** program starts **absolutely minimal**: v1 = **AI eval ratings + one key conversion-CTA
> follow-up** only (auto-found from the codebase). *Asking feels heavy — prompt almost never; watch
> (Novus-style) mostly.* The moments below stay **parked** until each earns the interruption. The **consent
> boundary** (bottom) is locked and applies to whatever ships. Revisit which moments to add: **2026-06-28**.

_From the KB deep-dive (Researcher, 2026-06-27), grounded in `~/knowledge-base/`. Companion to
`PRD-self-evolving-flow.md` §6. Defines the **LIGHT / "Pulse" tier** (free, in-product, text-only, one
round, cooldown, no consent) and the exact line that flips a moment into **EXTENSIVE / "Deep dive"**
(consent + compensation). This is Xuan's interviewing discipline productized — not generic survey practice._

---

## Three laws that govern every standardized moment

**Law 1 — Anchor on past behavior, never intent or opinion.** Every light question asks about *what just
happened*, not what the user thinks or would do. "Would you use X?" / "would you pay Y?" are banned. A light
answer is only worth keeping if it's an **existence-proof** — a thing that actually occurred. (KB 032, 007, 027.)

**Law 2 — One round = one question + at most one reflex clarifier, then hard stop.** Unfolding a thin answer
from multiple angles is what makes a conversation *deep* — and deep = EXTENSIVE. The light tier deliberately
forgoes unfolding: one behaviorally-anchored question, maybe one clarifier if the answer is empty, then
stop. **The urge to take a second probe IS the escalation trigger** (→ consent+pay), not a license to keep
digging. (KB 008, used as the boundary.)

**Law 3 — Respect the survivorship/response-bias ceiling.** In-product triggers only fire for people still
in the product, and the loudest power users answer most. A global throttle + rotation is mandatory.
(KB 024, 009, 153.) **Global ceiling:** ≤1 light prompt per session, ≤~1–2 per user per rolling 7 days
across the whole library combined; rotate targets. (KB 051, 153.)

---

## The moment library

Five core moments (PRD), then four KB-warranted extensions. **D0/onboarding = first encounter only;
churn = an existing/active user disengaging.** Different moments, different questions, never the same trigger.

### 1. Onboarding / first-run (D0 — first encounter only)
- **Trigger:** end of the user's *first* meaningful session, or ≤24h after signup if no second session. Fires **once ever.** Timing is load-bearing — recall degrades fast. (KB 017, 174.)
- **Question (expectation→perception gap, not the UI):** "When you opened this for the first time — what were you hoping it would do for you?" / "Did this do what you came here expecting? What surprised you?"
- **Cadence:** one-time.
- **Good answer:** a specific expectation walked in with + a specific thing they did/saw that met or missed it.
- **Trap:** treating it as an onboarding-flow usability check ("was it easy?") or asking intent ("will you come back?"). D0 = the gap between expected and perceived value. (KB 017.)

### 2. Churn-risk (existing/active user disengaging — NOT D0)
- **Trigger:** enters a cancel/downgrade/delete flow (best — in the moment), OR a sharp drop vs. the user's own frequency baseline. Active users only. (KB 018.)
- **Question (anchor on the change, not solutions):** "What changed — when did this stop being worth opening?" / (cancel flow) "What were you trying to get done that this wasn't doing anymore?"
- **Cadence:** 1/episode; 30–60d cooldown.
- **Good answer:** a specific last-straw episode or unmet job; strongest when it contrasts "what it used to do" vs. "what stopped working." (KB 018, 032.)
- **Trap:** "what would make you stay?" (hypothetical). **The fully-gone (already churned, never-converted) can't be reached in-product → off-product + recruit = EXTENSIVE by construction.** (KB 018, 009; PRD §6.2.)

### 3. Session-end / session-based
- **Trigger:** a meaningful work session completes (a task boundary). **Sampled**, not every session.
- **Question:** "Did you get done what you came to do just now?" / "Anything trip you up in the last few minutes?"
- **Cadence:** ≤1/7d/user, only after a meaningful session, never two in a row.
- **Good answer:** ties to this session's goal + outcome.
- **Trap:** NPS theater ("how likely to recommend?") — measures sentiment, not behavior. (KB 032, 007.)

### 4. Eval / AI-session-level feedback (the AI-native cut)
- **Trigger:** an AI output completes — **especially** on a friction signal (retry, heavy edit, abandon, re-prompt). The behavioral retry *is* the trigger; the question goes and gets the why.
- **Question (did the output do the real job):** "Did that output actually do what you needed? What did you do with it next?" / "You re-ran that a couple times — what wasn't right the first time?"
- **Cadence:** ≤1/day/user; prefer firing on a signal over random sampling.
- **Good answer:** what they *did* with the output — accepted / edited / discarded / re-prompted — and why.
- **Trap:** thumbs-up/down + "was this helpful?" — feeling, not task-completion truth. (KB 183, 032, 050.)

### 5. Key-journey-step drop-off
- **Trigger:** reach a defined high-value step and **abandon** it (left upgrade page after price reveal; opened export modal and backed out).
- **Question:** "Looked like you were about to [X] and stopped — what got in the way?" / "What were you trying to do on that screen just now?"
- **Cadence:** per step, only on a genuine drop; ≥30d before re-asking the same step/user.
- **Good answer:** a real blocker mappable to **Knowledge / Trust / Motivation.** (KB 173, 057, 051.)
- **Trap:** leading toward your suspected cause ("was the price too high?") → false positives. Let the barrier name itself. (KB 006.)

### Extensions (add as the library matures)
- **6. Activation / aha-moment** — first time completing the core value action. "What finally got you to [X] just now?" Pattern: *external trigger + reduced barrier.* Don't conflate with D0. (KB 086, 173.)
- **7. Resurrection / dormant-reactivation** — a dormant user returns (the highest-signal churn moment). "What brought you back today?" Keep "why I left" and "what brought me back" as two distinct stories. (KB 018.)
- **8. Post-purchase / upgrade** — "What tipped you into upgrading? What almost made you pick something else?" Trap: hypothetical willingness-to-pay. (KB 027.)
- **9. Feature-adoption** — first/repeat use of a watched feature. "What were you trying to do with [feature]?" Trap: "do you like it?" (KB 007, 131.)

### Quick-reference matrix
| Moment | Trigger | Fires | Question anchors on | Primary trap |
|---|---|---|---|---|
| Onboarding/D0 | end of 1st session / ≤24h | once ever | expectation vs. perceived value | usability-check; intent |
| Churn-risk | cancel/downgrade flow OR decay | 1/episode, 30–60d cd | the change / last-straw episode | "what would make you stay?" |
| Session-end | meaningful session completes | ≤1/7d | did this session's job get done | NPS theater |
| Eval/AI | output done, esp. retry/edit/abandon | ≤1/day | what they did with the output | thumbs / "was this helpful?" |
| Key-journey drop-off | reach + abandon a defined step | ≥30d/step | what they were doing + blocker | leading toward your guess |
| Activation | first core-value action | once ever | what broke through now | conflating with D0 |
| Resurrection | dormant user returns | 1/event | what pulled them back | blurring left/returned |
| Post-purchase | upgrade/convert | 1/event | real driver + alternative | hypothetical WTP |
| Feature-adoption | 1st/repeat feature use | tight cd | job they hired it for | "do you like it?" |

---

## The consent boundary — light is product feedback; extensive is research

A product asking its own **active user** a **single, in-the-moment, text** question **while they're using
it** is *product feedback* — governed by the ToS/privacy policy they already accepted. Safe with **no
separate consent, no compensation.** The moment any of six things changes, it becomes **human-subjects
research** → informed consent + (where applicable) compensation. (KB 153, 072.)

### The flip rule (a buildable boolean)
A moment may run **LIGHT (no consent, no pay) ONLY IF ALL are true:**
1. **In-product** (not interrupting over email/Telegram/SMS)
2. **Text only** (no voice, no audio/video recording)
3. **≤1 round** (one question + at most one reflex clarifier, hard stop)
4. **No new PII solicited** (nothing beyond what the product already holds)
5. **Not a sensitive topic** (financial/medical/emotional hardship)
6. **No compensation attached**
7. *(plus)* cooldown + global ceiling satisfied, a one-tap "what is this?" disclosure available, and the prompt is trivially ignorable with zero penalty.

**Break ANY of 1–6 → EXTENSIVE → informed consent; compensation whenever it's off-product, recorded, or >1 round.**

| Lever | LIGHT (no consent) | Flips to EXTENSIVE | KB |
|---|---|---|---|
| Channel | in-product, here now | off-product (email/Telegram/SMS) | 018, 072 |
| Depth/rounds | 1 Q + 1 clarifier | unfolds into a ~10-min convo | 008, 007 |
| Modality | text | voice / any recording | 153 |
| PII | nothing new | solicits/links/retains PII | 153 |
| Topic | neutral, in-flow | sensitive (hardship/health/money) | 153, 072 |
| Compensation | none | paid → research relationship | 153 |
| Persistence | ephemeral/aggregated under ToS | linked research record w/ retention | 153, 072 |

### "Partners, not subjects" floor (even light must clear this)
- **Voluntary & ignorable** — dismissible, zero penalty, never blocks the product.
- **Legible** — clearly from the product, with a one-tap *"why am I seeing this / what happens to my answer?"*
  Disclosure line: *"this product is learning from how you use it so it can improve — your answer helps, you
  can ignore it."* (This answers PRD open-Q8 / the "what is this?" ethics leak.)
- **Benefit & close-the-loop** — the user can see their answer mattered (also Observant's moat). (KB 072.)

### The escalation hook (light → Deep dive is a user-accepted offer, never automatic)
A light answer that lands as a **strong existence-proof on a hot decision** triggers an *offer* (never
forced): "That's really useful — can I ask a couple more questions? ~10 min, and we'll [compensate]."
**Accepting that offer IS the consent gate** — it flips channel/depth/pay onto the recruited program
(PRD §6.2). Until accepted, stay at one round. A graceful user-controlled upgrade, not a wall.

### One-paragraph version (for the PRD body)
> **Light is product feedback; extensive is research.** A moment runs free, in-product, text-only,
> one-round, no-consent **only if** it stays in-product, stays text, stops after one question (+one
> clarifier), solicits no new PII, avoids sensitive topics, and pays nothing — under the existing privacy
> policy, trivially ignorable, with a "what is this?" disclosure. Break **any** of those and it becomes
> human-subjects research: consent required, compensation whenever off-product, recorded, or extended. The
> churned/never-converted are off-product by construction → always consent+pay. Escalation is a user-accepted
> offer; accepting *is* the consent.

---

_KB cited: 006, 007, 008, 009, 017, 018, 019, 024, 027, 032, 050, 051, 057, 072, 086, 131, 153, 173, 174, 183, 185._
_Build watch-outs: (1) Law 2 is the hardest to engineer — the interviewer's instinct is to unfold (KB 008); cap it, and treat the urge as the escalation trigger. (2) The library is structurally survivorship-biased; the consent boundary is what makes off-product churn/never-converted outreach mandatory, not optional._
