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
Is the answer something the person already has ready and can just state (a fact, a rating, a quick recent action), or is it a "why" / a story / a motivation that only surfaces by probing past the first thin answer ("it's fine") from several angles? → *Must-be-unfolded leans DEEP.*

**4. Context load — self-contained vs. needs setup.**
Can it be asked cold and answered cleanly, or does it need back-and-forth first — to establish shared context, clarify what we mean, or understand the person's situation before the real question even lands? → *Needs-setup leans DEEP.*

## Integrating into a call
- **Lean LIGHT** when the question is tactical, single-construct, recallable, and self-contained — you can clearly picture the 1–3 questions and a satisfying answer arriving in a reply or two.
- **Lean DEEP** when two or more dimensions point deep, **or** when the *core* of the question is a single strongly-deep thing (e.g. it's fundamentally a "why does this happen" that no rating can answer).
- **When genuinely on the fence, choose LIGHT.** Deep mode asks more of the user (a real 10 minutes), so don't impose it unless the question truly won't yield in two text rounds. Light can always escalate later; a needless deep ask burns goodwill. (Respect-attention, same as C3's energy rule.)

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

**Tactical → LIGHT.** *"Did people notice the new one-tap export, and are they using it?"* — single behavior, recallable, self-contained. High confidence two text questions get it. `mode: light`.

**Strategic / why → DEEP.** *"Why do power users still export to a spreadsheet instead of using our dashboards?"* — strategic, a motivation that must be unfolded (the first answer will be "habit, I guess"), multiple interacting constructs (trust, workflow, what the dashboard lacks). Two rounds won't reach the real reason. `mode: deep`, with a light fallback ("When you needed those numbers today, where did you actually go to get them — and why there?").

**Borderline → LIGHT (default).** *"How do people feel about the new pricing page?"* — leans strategic and feeling-based, but it's a single construct and a recent, recallable reaction; a good open question plus one probe can land it in text. On the fence → `mode: light` (escalate later if answers come back thin).
