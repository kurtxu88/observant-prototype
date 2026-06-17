# Conversation-Logic Principles (design log)

The *why* behind the C1/C2/C3 prompts. Each principle came from a real design decision while building/tuning the test surface. The prompt files encode these; this doc records the reasoning so it isn't lost. When a prompt and this doc disagree, fix one of them — they should always match.

---

### P1 — C1 outputs the essence + a question set, NOT a study plan
The team isn't planning research. The immediate output of translating their question should be **(a) the essence of what we're really after** and **(b) the actual question(s) to launch** — something they can test in one tap. A goal/anchors/probes/success-criteria document is the wrong artifact (reads like a sit-down study). *Encoded in: C1.*

### P2 — Always in the present moment, not a retrospective
Observant is always-on and in-context — it rides along with the person. So it asks **in the moment** ("what's something you did with [product] today?"), not "tell me about the last time you ever…" over a six-month window. Still behavioral and concrete; just grounded in *now*. The continuous stream builds the longitudinal picture over time, so no single conversation has to mine distant recall. *Encoded in: C1, C2.*

### P3 — One continuous thread, on every channel
Both email and Telegram are a single ongoing async conversation — same thread over time, never a fresh thread or cold new question. A new team question continues inside the existing relationship. Email is "texting that happens to arrive as email," not formal one-off survey messages. *Encoded in: C2.*

### P4 — Lead with the most important (business-driving) question; seize the moment
When you have the person's attention, don't open with warm-up filler. Lead with the question that actually drives the team's decision. C1 orders the question set most-important-first. *Encoded in: C1, C2.*

### P5 — Turn structure depends on the channel (this is NOT just tone)
The question set is the same; how it's delivered differs because the channels have different physics:
- **Email — batch, don't drip.** Round-trips are slow and scarce, so present the whole small set in one message and let the person answer it all at once. Maximize context per exchange; follow up by email only if an answer is thin. Lead with the most important question, lay the rest out clearly (titled/numbered) so it's easy to answer point by point.
- **Telegram / IM — one at a time.** Texting cadence: most important question first, get a reply, then the next. A light "got a couple quick things" heads-up is fine; don't dump the list.
*Encoded in: C2.*

### P6 — Depth over breadth
Ask few things (a 2–4 question set, usually ~3), go deep on each. Especially async, every extra open question is another thing the person must come back to. *Encoded in: C1 (set size), C2, C3 (stop by sufficiency).*

### P7 — Capture proactive / off-guide input as signal (don't redirect)
If the user volunteers something off-topic — a bug, a frustration — that's the best signal, not an interruption. Engage it, make it concrete, route it to the team. (Inverts the old "redirect off-topic" interviewer rule.) *Encoded in: C2; routing is C5 (later).*

### P8 — Stop by sufficiency, not a clock
No timer. Keep going until there's a concrete answer to the essence (or a clearly-probed absence), then stop — without over-probing a relationship you want to keep. *Encoded in: C3.*

### P9 — Email is professional; Telegram is casual (tone, not just structure)
Both channels share the continuous-thread *model*, but tone diverges: **email** is a composed, professional note from the team (the first email opens with a short professional catch-up on the program, then the questions); **Telegram** is casual, chatty, one-at-a-time. "Continuity ≠ flippancy" — email isn't breezy texting. *Encoded in: C2, channelHint.*

### P10 — Follow-ups must ladder to PRODUCT-USEFUL, not collect detail
The difference between a researcher and a transcriptionist. When a pain surfaces, clarify its *nature in product terms* and **offer framings to react to** ("angle issue? coverage gap wanting another device? the device's job and it's failing? a general unmet need?") instead of interrogating incident trivia (what the car did). Bridge surfaced pains to the wishlist. C3's SUFFICIENT bar = a product-useful/actionable understanding, never "a vivid story that changes no decision." *Encoded in: C2, C3.* **Most important logic principle.**

### P11 — Respect the round's energy (precious attention)
Go deep *while the opening is live*, but when a round's energy is spent (shorter replies, "it's fine", wind-down), PAUSE and wait for the next fresh question — don't grind. A new question next time gets fresh attention; over-asking trains the person to ignore you. *Encoded in: C3, C2.*

### P12 — Exploration dial (per-program control)
A setup dial sets how far the agent roams: **low** = protocol-tight (stick to the client's questions); **high** = explore freely (chase interesting tangents, reframe). It governs *roaming breadth* — never the ladder-to-useful rule (P10), which always holds. *Encoded in: interview.js (explorationHint) → C2; UI dial in the team seat.*

### P13 — Reward visibility every batch (channel respect)
Because the whole relationship lives in one thread, each batch must *give back*: show the person their **participated minutes + reward earned** and a **"track & redeem on Observant"** CTA, constantly. This motivates continued participation and keeps the channel from feeling like spam. *Encoded in: the test surface's reward strip; the real product surfaces it per message/batch.*

### P14b — Restraint beats coverage (anti-spam, added 2026-06-16)
Up to **3** questions per email, but **fewer is better and never pad** — if there isn't a genuinely interesting/important question, don't ask it. In the real email cadence, an inquiry gets the initial batch **+ at most ONE follow-up**, and the follow-up only fires if the answers opened something genuinely worth probing (else stop). The bar: would a thoughtful researcher actually need to know this? This is hard-capped in `reply.js`, not just a prompt nudge. *(Tempers P14 — the live test felt spammy because the cap wasn't enforced.)*

### P14 — Every email is a batch (~3 questions), never one-then-wait
On email, *every* message — first and follow-ups — carries a small batch of ~3 questions, so we extract as much as possible per reply. Follow-up batches mix one or two deeper probes (on what was thin/interesting) with one new question advancing the essence. Relying on people to keep returning for one-question-at-a-time exchanges is impractical and disrespectful of their time. (Telegram stays one-at-a-time — its cadence makes round-trips cheap.) *Encoded in: C2, channelHint.*

### P15 — Knowing when to end (three levels)
"Done" is decided at three levels: (1) the turn always ends after the batch (async); (2) the **round** ends by a *marginal-value test* — send another batch only if real value remains, else wind down; (3) the **engagement** never hard-ends — it goes **dormant** and re-engages on new value (new question / behavior trigger), winding down only on disengagement, diminishing returns, or opt-out (honored immediately). Every round ends with a graceful wind-down + the participation/reward summary, never on an interrogation. *Encoded in: C3.*

### P16 — Methodical follow-up (classify → probe → select-one), added 2026-06-17
Follow-ups are not improvised. Every reply runs through one procedure: **read → classify the gap → fire the single probe that fits.** The gap taxonomy (thin/evaluative, hypothetical, concrete-but-not-actionable, concrete+actionable, idea-jump, off-guide) and the named probe toolkit (step-by-step, what-prompted/what-after, compare-states, teach-someone, concrete-example, specific-commitment, ladder-to-framing) are harvested from the Codified methodology book (Ch 5 "How to Ask Questions" + Ch 6 fixed/dynamic) and `agents/interviewer.md`. Because email allows only ONE follow-up (P14b), the discipline is selecting the *highest-value* probe, not stacking several — and firing nothing when no gap would change a decision. C2 and C3 share the gap vocabulary so the probe choice and the CONTINUE/SUFFICIENT call never disagree. **Fixed + dynamic mapping:** C1's question set is the *fixed anchor* (kept phrased consistently across people, so answers stay comparable for synthesis); C2's probing is the *dynamic* depth layer that branches per reply. *Encoded in: C2 (the follow-up method), C3 (decide-from-the-gap).*

### P17 — Depth gate before delivery (deep vs. light), dimension-based, added 2026-06-17
Before anything goes out, **C0 decides depth**: can this question be answered well in a lightweight async text exchange (**light** — ≤2 rounds, email/IM) or does it need a synchronous interviewer-grade session (**deep** — ~10-min voice/text in a dedicated chat window)? The call is made **directly from first principles, NOT by matching to a study type** (those are limited old-paradigm boxes). Judge four properties of the question — *scope* (tactical↔strategic), *constructs* (single↔multiple/interacting), *answer readiness* (recallable↔must-be-unfolded), *context load* (self-contained↔needs-setup) — integrated by one test: **do you have high confidence of a sufficient answer in 1–2 text rounds?** Yes → light, no → deep. This is the same logic as the C3 follow-up cap, run *before* the first message. On the fence → **light** (deep asks more of the user; don't impose it needlessly). The Codified methodology (study-type skills, `interviewer.md`, the book) informs the *judgment* and powers deep-mode probing — it is read for principles, never used as a classifier. **Deep always carries a pre-generated light fallback** (the stripped 1–3 essential asks) so a declined invite degrades instantly. Day one the AI decides alone; later it suggests + the team can override. *Encoded in: C0-triage.md; interview.js `triage` action (C0 + C1).*

### P18 — Channel is delivery, not content (minimal per-channel customization), added 2026-06-17
Depth decides everything; the channel only decides *how the same content is delivered*. **Email** = the whole light set as one blob (intro + numbered set), think-time. **Telegram/IM** = announce the count ("I've got 3 quick questions") then ask one at a time. We do **not** change the questions or their substance by channel in v1. Critically, a **"round" = a follow-up cycle, not a single message** — Telegram asking 3 questions one-by-one is still the *initial* round, so it never violates the one-follow-up cap (P14b). Deep mode is channel-agnostic: whatever the channel, the invite opens a link → a dedicated synchronous chat window. *(Supersedes the harder email/Telegram divergence in P5/P9.)* *Encoded in: C2, channelHint, C0-triage.md.*

### P12 addendum — temperature × company context
The exploration temperature also governs how much the agent draws on the **company's context / uploaded materials** to open new angles: high = use it to roam; low = stick to the client's explicit questions. (Forward-looking — depends on the context/docs layer, C4-adjacent.)

### Email specifics (composed of the above)
Generic, personal, relationship-level **subject** (rides the whole thread, never round-specific, never a "program" label); **first email** = professional catch-up + numbered set; **follow-ups** = recap paragraph, then the **bolded** new question in its own space; **embedded per-question survey fields** so replying is low-friction (real email needs AMP/hosted-form; mocked in the prototype).

---

*Surfaces: the test surface (`/thread`) renders email as a Gmail-style thread (with embedded survey + reward strip) and Telegram as IM, so these principles can be judged in each channel's real shape. C4 (memory), C5 (proactive routing), C6 (multi-question weaving) are still to come.*
