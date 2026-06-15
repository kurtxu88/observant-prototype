# Observant MVP — Conversation Logic

This folder holds the **conversation logic** for the Observant MVP: the prompts and policies that decide *what the agent says, when, and when to stop* in an asynchronous, continuous 1:1 with a user over email or IM (Telegram first).

It is deliberately separate from the backend. **Xuan owns this folder** (conversation design); **Bin owns the backend** (channels, scheduler, memory store, team UI, payments).

## The one architectural contract
**The runtime service must *load* these files as its source of truth — do not re-hardcode the prompts in application code.**

This is not a style preference. The existing Codified `interview-app` hardcoded a condensed copy of the interviewer prompt in `lib/study.ts` instead of reading `agents/interviewer.md`, and the two silently drifted — the deployed app stopped reflecting the canonical prompt. We are not repeating that. These markdown files are the canonical prompts; the service reads them at runtime.

## Why these prompts are new (not edits to the old interviewer)
The Codified interviewer is excellent but built for the **opposite shape**: one timeboxed, synchronous, in-person sitting, driven by a pre-typed study plan, ending with a transcript. The MVP conversation is **continuous, async (replies arrive over days), driven by a raw team question, and bounded by *sufficiency* rather than a clock.**

The probing *craft* (anchor on past behavior, unfold thin answers, behavioral translation) transfers directly and is lifted into C2. The async + continuous + stop-rule layer is net-new.

> Reframe that drives the whole design: the old conversation was **bounded by time and scripted by a plan**; this one is **bounded by sufficiency and steered by memory.**

## The components

| ID | File | What it does | Status |
|----|------|--------------|--------|
| **C1** | `C1-question-translator.md` | Turns a raw team/PM question into an interview plan (behavioral anchors + probe strategy + success criteria) | draft v1 |
| **C2** | `C2-continuous-interviewer.md` | The async, continuous interviewer system prompt (probing craft + re-entry + memory framing, no timer) | draft v1 |
| **C3** | `C3-stop-policy.md` | The saturation policy that replaces the clock — continue / pause / nudge / sufficient, and what to report up | draft v1 |
| C4 | _(later)_ | Per-person memory logic (what to remember, how to carry it forward) | not started |
| C5 | _(later)_ | Proactive / off-guide user input handler (capture as signal, not redirect) | not started |
| C6 | _(later)_ | Multi-question weaver (one relationship, not a queue of surveys) | not started |
| C7 | _(later)_ | Channel-tone adaptation (email vs IM) | not started |

C1–C3 are the structural cornerstones: most absent in the current engine, and pure prompt/policy so they can be iterated immediately with no backend.

## Runtime inputs these prompts expect (the service must supply)
- **The interview plan** for the active team question (output of C1).
- **This user's memory/profile** (prior threads, characterization) — see C4.
- **The conversation so far** in the current thread.
- **Channel** (email | telegram) and **time since the user's last message** (for C3's nudge/pause timing).

## How to iterate
Use a thin prompt harness — feed a constructed conversation state to the model and read its next turn — decoupled from the full backend. Reference scenarios (async gap / raw question / no-clock stop / proactive input) live in the Codified repo at `interview-app/_convo-gap-test/`.
