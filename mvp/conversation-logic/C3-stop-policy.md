# C3 — Stop & Follow-up Policy

**Role in the loop:** the judgment that replaces the clock. After each user reply (and during silences), C3 decides whether to follow up now, wait, gently nudge, or declare the question sufficiently answered and report it up to the team.

This is the cornerstone the old engine has no analog for. In the synchronous interviewer, "when am I done" was answered by a 10-minute timer and a fixed 5-question guide. Async deletes the timer. Sufficiency must be judged, not counted down.

> Governing idea: **follow up until something meaningful surfaces, then stop — without exhausting the person.** Under-probing yields thin data; over-probing burns a relationship you want to keep for the next question.

---

## The decision (made after every user reply)

Choose exactly one:

- **CONTINUE** — the answer is on the right track but not yet meaningful (still thin, still hypothetical, story not yet concrete). Ask one more probe now.
- **SUFFICIENT** — the success criteria from the interview plan (C1) are met. Stop probing this question, report it up to the team, and rest the thread (the relationship stays open for future questions).
- **PAUSE** — the person has given what they can right now, or is disengaging, but the question isn't fully answered. Bank what we have, stop for now; the system may revisit later.
- **NUDGE** — the person has gone silent mid-thread. Schedule a single, light re-engagement; do not pile on.

CONTINUE / SUFFICIENT / PAUSE are decided by C3 from the conversation; the *timing* of NUDGE and any revisit is executed by the backend scheduler — C3 sets the policy, the scheduler fires it.

## What "meaningful / sufficient" means
A question is sufficiently answered when we have **a concrete behavioral account that resolves the plan's goal** — actions, sequence, specifics — such that you could describe what this person actually did, in order. Equivalently sufficient:
- A **clearly-probed absence** ("they never noticed the feature at all" / "they never read the pricing page") — a real answer, worth one probe to confirm it's genuine and not avoidance.
- A **confident-but-wrong understanding**, fully surfaced — often the most valuable finding.

Two quality bars, both from the PRD:
- **Concrete-behavior bar:** if you can't yet describe what they *did* in sequential steps, you are not at SUFFICIENT — keep going (CONTINUE).
- **Joy bar:** the best exchanges make the person curious about their *own* answer. A conversation hitting that bar can earn another probe; one clearly boring the person should move toward PAUSE.

## Anti-patterns (explicit)
- **Don't fire a time-based close.** There is no clock. Never wrap because "we're almost out of time."
- **Don't stop at a thin answer** just because the user replied. A reply is not data; a concrete story is.
- **Don't over-probe past saturation.** Once the success criteria are met, stop. Squeezing two more questions out of a satisfied answer is how you train a user to stop replying.
- **Don't pester during silence.** At most one nudge per silent stretch; if still silent, PAUSE — don't chase.

## Follow-up budgeting (soft, not a counter)
There is no fixed number of turns. As rough guidance, most questions reach SUFFICIENT within a handful of exchanges; if you've probed several times and the story still isn't converging, prefer PAUSE (bank the partial, move on) over grinding. The goal is the answer, not a transcript length.

## What to hand the team on SUFFICIENT
When you report a question up, include:
- The **concrete story / answer** in the user's own words (a verbatim quote where it lands).
- A one-line **resolution of the plan's goal** (what we now know).
- Light **characterization** picked up along the way (usage pattern, attitude, use case) — feeds the user's memory (C4) and any later synthesis.
- A flag if the answer **contradicts the team's likely assumption** — that's the signal worth surfacing loudly.

## Hooks the backend must provide
- **Time since last user message** — so C3 can distinguish "still thinking" from "silent → NUDGE."
- A way to **schedule** a nudge or a later revisit (scheduler).
- A path to **report up** a SUFFICIENT result to the team UI, and to **route** a proactive/off-guide item (from C2 / C5) independently of the active question.
