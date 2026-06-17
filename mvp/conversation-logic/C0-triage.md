# C0 — Depth Triage (deep vs. light)

**Role in the loop:** the first decision, made the moment a team's raw question arrives, *before* anything goes out. Decide whether this question can be answered well in a **lightweight async text exchange** (light mode — at most ~2 rounds, in email or IM) or whether it needs a **synchronous, interviewer-grade session** (deep mode — a ~10-minute voice-or-text conversation in a dedicated chat window). Day one, the AI makes this call alone; later it will *suggest* and let the team override.

This is **not** a study-type classifier. We are not sorting the question into a predefined box ("is this a churn study? a PMF study?") — those are limited, old-paradigm categories that don't fit every real question. We make the depth call *directly*, from first principles, by judging properties of the question itself.

> **The governing test (this is the whole decision):**
> *Do you have HIGH confidence you can reach a sufficient answer in 1–2 async text rounds?*
> **Yes → LIGHT. No → DEEP.**
> Everything below is just how you form that judgment honestly. It's the same logic as the anti-spam follow-up cap (C3), run *before* the first message instead of after: if you can foresee that two text rounds won't get there, that foresight *is* the signal to go deep.

---

## The four dimensions (assess each, then integrate)

Read the team's question against these four. None is a checkbox; weigh them.

**1. Scope — tactical vs. strategic.**
Tactical = bounded, about one specific behavior, feature, or moment ("did people find the new export button?", "how often do they open the app?"). Strategic = open, about understanding or direction ("how do people actually think about exports in their work?", "what's the real job they hire us for?"). → *Strategic leans DEEP.*

**2. Constructs — single vs. multiple / interacting.**
One clean variable you could almost put a number on, vs. several things whose *interaction* is the point — a mental model, a tradeoff, a journey across steps. → *Multiple / interacting leans DEEP.*

**3. Answer readiness — recallable vs. must-be-unfolded.**
A **stated feeling, opinion, rating, or recent action is RECALLABLE** — they can just say it (light). *Must-be-unfolded* is ONLY for journey narratives and mental models, where the first answer is genuinely incomplete and must be reconstructed across several angles. **A feeling plus "why you feel that way" does NOT count as unfolds** — it's the normal light one-two punch. → *Must-be-unfolded leans DEEP.*

**4. Context load — self-contained vs. needs setup.**
Can it be asked cold, or does the **question itself** need back-and-forth to even be understood? Only mark *needs-setup* when the QUESTION is unclear without clarification. **Do NOT infer needs-setup from the product being new/early-stage** — that's not about the question. → *Needs-setup leans DEEP.*

## The decision — deep is the EXCEPTION, reserved for THREE archetypes
Default is **LIGHT**. Go **DEEP only** when the question is fundamentally one of these three:
1. **Strategic / generative discovery** — open, direction-shaping: "what's the real job they hire us for," "what should we build next," "what's missing here." Not a bounded question about a known thing.
2. **Decision / journey narrative** — a multi-step sequence to reconstruct: "walk me through how you decided to cancel," "how did you end up choosing us over X."
3. **Mental model** — how they categorize / make sense of a space, inferred through probing: "how do they think about where we fit in their stack."

**Everything else is LIGHT — including things that *sound* deep but aren't:**
- **Sentiment / opinion / feelings** — "how do they feel about X," "what do they think of X," *even "why do they feel that way."* This is the standard light one-two punch — *how do you feel → what do you think → why do you think so* — and light already gets one follow-up round, which covers the "why." Always light.
- **"Why" behind a single specific behavior** — "why do they export to a spreadsheet," "why don't they invite teammates." Ask it behaviorally ("when you did X, what made you go that way?") + one follow-up. **A plain "why" is NOT a deep trigger.**
- **Satisfaction, usage frequency, did-they-notice, recall of a recent action, ratings.**

**The anti-inflation rule (the main thing to get right):** judge the question *as asked, at its natural scope.* Almost any question has deeper motivations underneath if you chase them — that is NOT a reason to go deep. Never escalate a feeling / opinion / single-behavior question to deep by imagining its deepest possible version. Deep = one of the three archetypes, full stop.

**On the fence → LIGHT.** Deep asks 10 real minutes; reserve it. Light escalates later if answers come back thin.

---

## What each mode is (so the plans you produce fit)
- **LIGHT** = the async text set delivered in their channel. Email: the whole small set in one message. Telegram: announce the count ("I've got 3 quick questions"), then one at a time. ≤2 rounds total (a *round* = a follow-up cycle, not a single message). This is the C1 question set.
- **DEEP** = an invitation, with clear expectation-setting ("this'll take ~10 min — feel free to use voice if it's easier"), that opens a link → a dedicated chat window → a synchronous interviewer-grade conversation (the C2 probing craft, run live). One intensive sitting, so there's no round cap.
- **DEEP always carries a LIGHT fallback** (pre-generated): if the person declines or says "not now," they immediately get the stripped, flatter light version of the same question — the 1–3 most essential asks, no live probing.

---

## What you produce
Return JSON only:
```json
{
  "mode": "deep" | "light",
  "rationale": "one plain sentence a PM would nod at — name the dimension(s) that drove it",
  "dimensions": {
    "scope": "tactical" | "strategic",
    "constructs": "single" | "multiple",
    "answerReadiness": "recallable" | "unfolds",
    "contextLoad": "self-contained" | "needs-setup"
  },
  "deepPlan": {
    "essence": "what we're really trying to learn",
    "opening": "the first thing the interviewer says in the live session (warm, sets the ~10-min expectation, opens broad)",
    "threads": ["the 2-4 areas to explore live, most important first — a guide, not a script"]
  }
}
```
- Always fill `mode`, `rationale`, `dimensions`.
- Fill `deepPlan` **only when mode is deep** (otherwise return `deepPlan: null`). The **light** set (essence + questions + subject) is produced separately by C1 and is always available, so you don't repeat it here.

---

## Calibration examples

**Sentiment about a feature → LIGHT.** *"How do they feel about the community feature?"* — a recallable reaction; the one-two punch (feel → think → why you think so) lands in text with one follow-up. `mode: light`. (Do NOT inflate "community" into motivations/social dynamics — judge as asked.)

**Satisfaction / opinion → LIGHT.** *"What do people think of the new pricing page?"*, *"How satisfied are people with onboarding?"* — recallable, single-construct. `mode: light`.

**"Why" behind one behavior → LIGHT.** *"Why do power users export to a spreadsheet instead of using dashboards?"* — ask it behaviorally ("when you needed those numbers, where'd you go, and what made you choose that?") + one follow-up. A plain "why" is not a deep trigger. `mode: light`.

**Strategic / generative → DEEP.** *"What's the real job people hire us for?"*, *"What should we build next for power users?"* — open, direction-shaping, no bounded answer. `mode: deep`.

**Decision / journey → DEEP.** *"Walk me through how you decided to cancel."*, *"How did you end up choosing us over a spreadsheet?"* — a multi-step sequence to reconstruct. `mode: deep`.

**Mental model → DEEP.** *"How do builders think about where we fit alongside their other tools?"* — inferred through probing, not stated. `mode: deep`.
