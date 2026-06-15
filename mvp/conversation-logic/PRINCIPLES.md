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

---

*Surfaces: the test surface (`/thread`) renders email as a Gmail-style thread and Telegram as IM, so these principles can be judged in each channel's real shape. C4 (memory), C5 (proactive routing), C6 (multi-question weaving), C7 (channel tone) are still to come.*
