# Observant — PRD (positioning + messaging)

_Last updated: 2026-06-03_

Product requirements for the Observant marketing site + product framing. This is the **autopilot reposition**
(June 2026). `observant/Landing.html` is the canonical message source; this doc is supporting rationale.
Read `README.md` for repo structure.

## One-liner
**Put user learning on autopilot.**

## ICP (laser focus)
Startups, **one-person companies**, and **AI-native teams** — builders shipping fast with **no research
team and no time to chase feedback**. They ship daily but learn haphazardly: posting on X, combing
Product Hunt threads, replying to random comments, DMing users one by one, blasting the occasional
survey. Their product iteration is fast; their *learning* is not systematized.

**Sharpened (2026-06-26): target builders who don't have the research know-how *themselves*.** The wedge
isn't just "no research team" — it's "doesn't personally know how to do it." Autopilot is net-new
*capability* for them, not a faster tool for an existing practitioner. This is the screen that decides
priority among warm leads:
- **In:** Maysie/Cindy (coaching app, ~30–40 beta users — wants close user follow-up, no research muscle)
  → **first**, because the founder is the buyer, the pain is named, and she's ready. Then **MentorMates**
  (events platform — engineer literally said "our research wasn't professional, no follow-ups") once we
  reach the decision-maker (Chinat).
- **Out:** **Tote/Chris** — Chris already *has* the know-how and does it himself. Autopilot isn't for the
  person who already knows how; it's for the person who doesn't. Warm ≠ ICP.

We are **not** targeting big-company research orgs or teams that already have researchers. Those are
opportunistic at best (Wyze = replace-Centercode, support-owned — a separate motion).

## Problem
Getting user feedback is manual, scattered, and reactive. It stops the moment the founder stops doing
it, and none of it compounds. The builder is the bottleneck on their own learning.

## Value proposition
Observant takes the **entire** user-learning loop off your plate and runs it on its own:

1. **Finds your users** — your power users, or a vetted panel we recruit for you.
2. **Runs the conversations** — a private 1:1 line with each user, in context.
3. **Follows up continuously** — light periodic check-ins + behavior-triggered deep-dives.
4. **Surfaces what matters** — synthesis builds itself; ask across the panel anytime.

You **turn on learning mode once** and watch the data come in. The result: iterate at lightning speed,
never build blind, and stop spending your own time chasing feedback.

## The in-product / self-evolving experience (north star)
The off-product loop (magic link → 1:1s over email/Telegram) is the **day-one fast lane** for everyone.
The destination — and the thing that makes Observant a *self-evolving product*, not a survey tool — is the
**in-product** path: **install one snippet, and Observant watches and researches on its own.**

The full loop, builder does nothing after the snippet:
1. **Watch** — reads behavior, finds the moments worth a conversation (abandoned upgrade, repeat export,
   onboarding stall) — no study to configure.
2. **Research** — reaches the right user at the moment of use, builds per-user memory, asks the question a
   researcher would.
3. **Deliver** — feedback + grounded insight, bottom-up, continuous.
4. **Fix** — an **agent-ready fix**: root cause → file-scoped plan → **opens a PR** you review and merge.
   (Hand-to-Claude / copy-prompt for the agentic-coding crowd.)
5. **Tune** — behavioral triggers self-incorporate; the loop sharpens itself.
6. **Close the loop** — tell the humans who raised it. The part a behavior-only tool structurally can't do.

**Onboarding = the Novus-grounded import (built in the prototype, `app/selfserve.jsx` → `InProductConnect`):**
Connect GitHub → **scan with a live reasoning panel** (real tool-calls + conclusions) that surfaces the
product map *and the moments worth interviewing* → **install via a single PR** that states what it could NOT
wire and why. The one-click fix is gated to the in-product/connected path (off-product can't reliably
execute a code fix — that's exactly the in-product capability).

**Honest sequencing — velocity first, data-volume later.** The teams that will install the snippet are
thin on users (Cindy ~30–40). Behavioral triggers don't fire much at that scale, so early in-product sells
on **loop velocity** (signal → shipped fix, fast), *not* "we watched 10,000 sessions." The data-rich version
arrives when a mid-size, lower-regulatory team grants both access and volume (none in the current pipeline).
Don't promise the 10k-session version to a 40-user team.

## Messaging pillars
- **Autopilot is the headline.** "Set it once; it runs itself." End-to-end: find → run → follow up → surface.
- **Stop chasing feedback.** Name the scramble (X, Product Hunt, random DMs, cold surveys) and replace it.
- **1:1 + continuous is the engine, not the pitch.** The private 1:1 line and proactive behavior-triggered
  deep-dives are *features* of the autopilot — the "how," demoted from the old headline.
- **Built for builders without a research team.** Speaks to startups / OPC / AI-native teams directly.
- **Pedigree as trust, not as headline.** Methodology built leading 0→1 research at Robinhood / Instagram /
  Airbnb — encoded so it runs whether you have a research team or not.

## Current copy source
Use `observant/Landing.html` for exact public-facing copy. The current landing opens with:

- **Hero:** "Imagine if user learning runs itself."
- **Sub:** "Observant talks to each of your users one-on-one and keeps learning automatically — following up in
  the moment, relaying your team's questions live, so insight flows in while you ship."
- **Category:** user learning on autopilot.
- **CTA:** "Turn on learning mode."

## What changed from the prior positioning
- **Was:** "An AI that learns from your users — 1:1, continuously, at scale" (1:1/continuous/at-scale = the
  whole pitch); category "the modern user-learning pipeline"; CTA "Automate user learning now."
- **Now:** autopilot end-to-end; 1:1/proactive demoted to features; ICP narrowed to startups/OPC/AI-native;
  CTA "Turn on learning mode"; new "stop chasing feedback" contrast as a core beat.

## Don't
- Don't make 1:1 the headline again.
- Don't lead with the panel or sell the pain (sell the autopilot/capability).
- Don't add filler sections/stats. Every element earns its place.
- Don't broaden the ICP back to big-company research orgs.
