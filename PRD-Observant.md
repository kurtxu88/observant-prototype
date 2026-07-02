---
title: "Observant — Product Requirements Document"
type: prd
status: canonical
last_updated: 2026-06-29 18:30
---

# Observant — Product Requirements Document

## 1. Summary

Observant puts user learning on autopilot. It holds a continuous one-on-one conversation with each of a product's real users, follows up in the moment when a user does something worth understanding, relays the team's live questions, and pipes what it learns straight into the agentic build loop. The premise: agents now handle most of the work of building, so the binding constraint has moved upstream — to knowing what to build. Learning from users is the new bottleneck, and it is the one part of the loop still done by hand, in bursts, by people who don't have time.

Observant changes the unit of learning from the study to the individual. Instead of a team planning a study, recruiting a sample, and reading findings weeks later, each consented user becomes a standing source of signal, and insight rises on its own as it accumulates. The conversations are with named users and grounded in evidence of their real behavior (connected via analytics such as PostHog, or by direct invitation), so every finding is traceable to who said it and what they did. Observant closes the loop: when a team ships a change, it goes back to the same users to confirm the change worked. Where behavioral analytics tells a team *what* users do, Observant captures *why* — continuously, without the team running research itself.

## 2. Goals & non-goals

**Goals**
- Give any team an always-on feedback loop at the moments that matter, installed once and running on its own.
- Produce findings a team can trust enough to act on, with the evidence and its limits stated plainly.
- Close the loop end to end: from a user signal, to a shipped change, to confirmation with the user that it landed.
- Work from day one for teams with a small user base, where the relationship — not data volume — is the value.

**Non-goals**
- Observant is not a survey tool, a research-ops platform, or a dashboard a team must staff and operate.
- It does not require a team to design studies, recruit participants, or interpret raw data.

## 3. ICP

**Primary ICP — growth-stage teams that already have users.** Product teams with a real user base and a metric that is slipping (activation, retention, churn) but no dedicated research function. The buyer already cares about understanding users and has no system that turns that care into continuous, reliable learning. The MVP runs on the team's own consented users, which is why "already has users" is the gate.

**Early-stage builders — an adjacent segment we've worked with.** Builders at the cold-start stage (few or no users yet) feel the pain most acutely — they don't know where to find users, what to ask, or how to read the answers — but they have the least data to learn from. We've interviewed and tested with this segment; it is served by a lighter, builder-focused path (AlphaCommons), not the core Observant motion. Observant's focus is the growth-stage team; early-stage is the adjacent on-ramp, not the wedge.

**Growth-stage splits two ways — B2C vs B2B:**
- **B2C** — many users, a small power-user core. The reflex objection is "why study the same people instead of a fresh, diverse group over time?" We win by reframing continuity as a faster, higher-signal loop and by starting with the under-mined power-user cohort. A strong, natural fit.
- **B2B** — fewer, higher-value users and an account-management instinct. The "why the same people" objection mostly disappears (they already know who matters); the real questions are buyer/budget ("who owns this?") and engagement ("will my users talk to an agent?").

**B2B itself forks — the sharpest qualifier:**
- **Low-touch, many-users B2B → our customer.** A broad, evolving product surface and a large, thinly-served user base (e.g. an AI/efficiency tool with tens of thousands of users). The automated learning loop earns its keep here.
- **High-touch, precise-pain B2B → not our customer, however warm.** A team that nailed one exact pain, ships the solution, and installs it account-by-account by hand. Their research is effectively done; the constraint is execution and recruiting, not learning — a lightweight signal channel already suffices. (Lassie is the archetype.)

**Screen before any demo:** is the product surface broad and evolving, and is the team thin-touch with a large user base? Yes → us. Did they nail one precise pain they install by hand? Then not us, however warm.

**Who not to lead with:** post-Facebook big tech (no clear buyer; in-house UXR), academia (no budget), and teams self-sufficient on organic PMF with no felt pain.

## 4. Feedback architecture

Two questions define the system: **who initiates the feedback** (the product, passively, vs. the team, proactively) and **how deep** it goes (a light touch vs. a full conversation). That yields three products.

| | Passive (the product asks in the moment) | Proactive (the team reaches specific people) |
|---|---|---|
| **Where** | In-product (snippet) | Off-product (email / IM) |
| **Consent** | None — ambient, under existing privacy policy | Required — opt-in program |
| **Who** | All users | Opted-in consented users |
| **Products** | **Product 1 — Baseline loops** (light) | **Product 2 — Targeted questions** (light) · **Product 3 — Deep interviews** (~10 min) |

**Product 1 — Baseline feedback loops** *(passive · in-product · no consent · all users).* The smallest viable feedback pipeline, collected automatically once the snippet is installed: an always-available "give feedback" affordance, session-level evaluations of AI outputs, an exit signal on leave/downgrade/cancel, and periodic satisfaction. These are thin attitudinal signals — a score, not a reason — and are presented as exactly that; a bare score is never laundered into a finding.

**Products 2 & 3 — Customized feedback loops** *(proactive · off-product · consent · opt-in).* The team does not design research. It asks a question about its product or its users, and Observant runs it: translating it into the right depth — light (1–2 rounds) or a deep ~10-minute interview — selecting and reaching consented users, conducting the conversations, and delivering the answer. These run on a standing panel of consented users who opt in.

**Two governing rules:**
- **Consent and compensation** are required for anything that is off-product or extensive (a deep interview, a recorded session, more than one round). Light, in-the-moment, in-product feedback requires neither.
- **Voice** is allowed off-product only. In-product feedback is always text.

## 5. Integration & access model

- **In-product** is a single installed snippet. It captures client-side product behavior and renders feedback prompts. It does **not** read the codebase. (A full codebase scan remains an optional, advanced capability, not part of the standard product.)
- **Off-product** reaches users over email or IM through a magic-link invitation under the team's own brand. Users opt in to the standing panel and can opt out in one tap.
- **Consent boundary.** A feedback moment runs light (free, no consent) only if it is in-product, text-only, a single round, introduces no new personal data, is not a sensitive topic, and carries no compensation — presented with a one-tap "what is this?" disclosure. Anything beyond that is treated as research: consent required, compensation whenever it is off-product, recorded, or multi-round. Escalation to a deeper conversation is always a user-accepted offer, never automatic.
- **Reaching users outside the product** — churned, never-converted, or dormant users — is by definition off-product and always runs through the consented, compensated program.

## 6. Product surfaces

Three layers, not a wall of tabs. One overarching **Insights** layer sits above up to two gated gathering surfaces; **Home** and **Settings** are always on; an **Ask** assistant is docked everywhere. The nav is a function of which products the team turned on (`setup.products`):

- **baseline only:** Home · Insights · Standardized pipeline · Settings
- **customized only:** Home · Insights · Feedback program · Settings
- **both:** Home · Insights · Standardized pipeline · Feedback program · Settings

**Always on**
- **Home** — a mode-adaptive, relationship-first overview (never "triggers fired: 0"): the thin-signal pulse strip and/or an ask box, questions in flight, replies this week, the 2–3 trending problems, loops closed. The low-data state is a deliberately designed screen ("watching for these moments"), since for a small account the first two weeks are the product.
- **Insights** — the overarching analysis layer and center of gravity. Ask-anything (the docked Ask assistant lives here), the analysis itself (Issues / Insights / Opportunities, see §7), and the **one-click fix + close-the-loop ledger** — drafted → shipped → told → verified — folded in (this absorbs the former standalone "Act").
- **Settings** — install / identify status, the product-context brain, the consent and data-handling layer (hashed identity, per-conversation consent for deep work, retention and right-to-forget; Observant does not hold raw user data), program terms, a "preview the user view" utility, and **integrations** (Slack + MCP live here as an integrations row, not their own surface).

**Gated gathering surfaces** (each shown only when that product is on)
- **Standardized pipeline** (baseline / in-product) — the honest baseline: score cards for CSAT, AI/session eval, and exit survey. A score, no follow-up, with a survivorship disclosure.
- **Feedback program** (customized / off-product) — the proactive program, in three tabs: **Partners** (the roster, each a living file of who they are, what they did, and what they said over time), **Conversations** (the searchable 1:1 + voice-transcript record), and **Send a question** (compose a question to the standing panel).

**Docked Ask assistant** — on every surface: grounded answers citing named users and verbatim quotes; when evidence is thin it offers to go ask, turning the question into a tracked request that returns an answer when replies land.

> **Build status (2026-06-29):** the model above is the agreed redesign currently being rebuilt. The shipped build today is **Home · Insights · Loop history · Feedback partners · Settings**.

## 7. The Signals model

A signal fuses behavior (when and who) with conversation (why) — together, something neither analytics nor surveys produce alone. Three types:

- **Issue** — something painful or broken that users are actively reporting. Measured by volume and agreement.
- **Insight** — a durable, previously unknown truth about users (a mental model, a workaround, an unmet need), anchored on evidence of behavior rather than on what users merely say.
- **Opportunity** — a latent need recurring unprompted. The weakest evidence class: it can open a validation conversation, never an automatic change.

Each signal presents the behavioral artifact that triggered it, the verbatim user evidence, and a sample disclosure — plus the convergence logic (which behavior fired, how many independent conversations agree, across which specific people) with an honest confidence statement that refuses to overclaim at low volume. Findings distinguish proven past behavior from hypothetical intent, and an emerging pattern is shown as *Forming* rather than hidden or inflated.

**Rules:** always surface and grade, never hide below threshold; never recruit to inflate a number, only to fill a named gap on a specific decision; treat a **contradiction** (behavior says one thing, words another) as a first-class, high-value finding. When behavior fires but the *why* is missing, Observant opens a conversation to go get it, then raises the signal once grounded. That automatic next question is what "runs itself" means.

Conversation quality is a visible, tunable object upstream of every signal — a strong analysis surface on a weak interviewer fails on the first unreliable finding.

## 8. The Act loop

From a learning signal to a shipped, verified change:

1. **Root cause** — what the conversations say, grounded in named evidence. Thin evidence routes to the program for more rather than fabricating confidence.
2. **Recommended fix** — a file-scoped, step-by-step plan with three exits: open a PR, hand to an AI coding tool, or copy the plan. Opening a PR is available on the connected/in-product path and degrades gracefully otherwise. Evidence-class gating applies: an Issue with proven behavior can drive a change; an Opportunity cannot.
3. **Close the loop** — go back to the named users: "you mentioned the upgrade pricing surprised you — we changed it because of what you said." Always in the product's own interviewer voice, never as the founder.
4. **Verify** — after shipping, watch whether behavior changes for those users and re-ask whether it landed. The loop closes only on both. "Still broken" reopens as a stronger Issue.
5. **Tune** — the triggering logic incorporates the outcome and the question backlog regenerates.

For teams with a small user base, the value is loop velocity — one signal to one shipped fix, fast — not volume.

## 9. Onboarding

- **Stage 0 — Product context** (~30s): name, URL, who uses it, what the team wants to learn.
- **Stage 1 — Choose how to gather feedback** (one or both, explained side by side):
  - *Baseline program* (default) — always-on light feedback at the moments that matter; installed once, runs itself. Setup: paste the snippet. No questions to write, no one to recruit, no consent.
  - *Feedback program* (add-on) — ask your own questions or run deep interviews. Setup: set compensation, write the invitation, generate a magic link to send to users. Carries consent and compensation; required for deep interviews and proactive team questions.
- **Stage 2 — Setup** for whichever routes are chosen.
- **Stage 3 — Launch** to a calm Home that begins watching for moments and receiving opt-ins.

The team can send a test loop to themselves to experience the user side before any real user does.

## 10. Success metrics

- A design partner runs a live loop and receives a usable insight (the core activation event).
- Loop completion: signal → shipped change → confirmed-with-users, end to end.
- Panel participation and retention (do consented users keep answering).
- Response rate on the user-side surface.
- Team-reported trust in findings (do they act on them).

## 11. v1 scope

- Snippet-based onboarding (connect → install → live).
- Relationship-first Home with a designed low-data state and the docked Ask Observant assistant on every surface.
- Signals structured into Issues / Insights / Opportunities with a sample disclosure, the proven-vs-hypothetical distinction, contradiction flag, and the *Forming* state for sub-threshold patterns.
- The user-side conversation surface (prompt, async thread, consent and reward).
- Act as the four-state ledger (off-product Act is draft + close-the-loop only).
- The standing panel wired to a signal's evidence gaps (depth, coverage, reach).
- People as a living-file roster with the program managed inline.
- Ask Observant able to go ask when evidence is thin.
- Slack digest and arrival card; MCP endpoint as a fast-follow.

## 12. Risks

- **Cold start.** A small user base yields few consented users — not always enough to ground a finding at honest confidence. Mitigated by the relationship-first Home, *Forming* signals, a proactive question backlog, and the off-product fast lane.
- **Survivorship bias.** In-product prompts reach only users still in the product, over-weighting survivors and the vocal minority. Mitigated by sample disclosure and active churned / never-converted outreach.
- **Conversation quality.** A strong analysis surface on a weak interviewer fails on the first unreliable finding; conversation quality must be a measured, tunable object.
- **Asynchronous reality.** "Monitoring" reads poorly when the surface is quiet for days; the waiting and notification model must be designed for an async substrate.
- **Brand and voice.** Automated outreach to a team's real users touches an irreplaceable relationship; the product speaks in its own interviewer voice, never as the founder.
- **Payments.** Real compensation (payouts, float, chargebacks, tax) is an operational requirement, not a cosmetic one.

## 13. Open questions

- **Pricing & payments** — model and the handling of payout liability.
- **Voice of the close-the-loop message** — product-interviewer voice vs. brand vs. hybrid (current direction: product-interviewer voice).
- **Signal terminology** — Issues / Insights / Opportunities vs. alternatives.
- **Ownership of the user-side conversation surface** across the team.
