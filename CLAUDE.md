# CLAUDE.md — working notes for Edda

Context for Claude Code (or any dev) continuing this project. Read `README.md` first for structure
and quick start.

## What Edda is
**User learning on autopilot.** Edda automates the *entire* user-learning loop for a builder:
**finds the users, runs the conversations, follows up continuously, and surfaces what matters** —
so insight flows in while they ship. Under the hood it runs a rolling-research loop (≈ a diary study)
over the builder's panel: onboards each user on a private 1:1 line, watches behavior, follows up in
the moment, lets the team relay questions / request live 1:1s, and synthesizes bottom-up or on demand.
The 1:1 line and proactive behavior-triggered deep-dives are the **engine** — they are features of
the autopilot, no longer the headline.

## ICP (LOCKED — who this is for)
Laser focus on **startups, one-person companies, and AI-native teams** — builders shipping fast with
**no research team and no time to chase feedback**. Today they post on X / Product Hunt, reply to
random comments, and DM users one by one. Edda replaces that scramble with a system you turn on once.

## Positioning (LOCKED — do not drift)
- **Hero:** "Put user learning on autopilot."
- **Sub:** "Edda finds your users, runs the conversations, and follows up continuously — so insight flows in while you ship. Built for startups and AI-native teams with no research team and no time to chase feedback."
- **Category:** user learning on autopilot.
- **CTA:** "Turn on learning mode."
- **The contrast (sell this):** stop chasing feedback — no more posting on X and hoping, combing Product Hunt threads, DMing users one by one, or blasting surveys that go cold. Turn it on; watch the data come in; iterate at lightning speed.
- **Differentiator:** end-to-end **autopilot** (find → run → follow up → surface) — manual feedback is scattered and stops when you stop; surveys/one-off studies go cold; rented panels aren't your users. Edda keeps learning on its own, 1:1 and at scale.
- **Rule learned the hard way:** sell the **capability/autopilot**, not the pain. Lead with the capacity; "who you learn from" (the panel) follows — never lead with the panel. 1:1/continuous are the *how*, not the headline.
- Edda is **personified** ("Edda reached out to Dana"). Voice: calm, literary, Nordic-minimal, documentary-observer.

## Conventions in this repo
- **No build step.** Marketing site is vanilla HTML/CSS/JS. Product app is React 18 via CDN + in-browser Babel.
- **Each `.jsx` is its own Babel scope.** Components are shared by assigning to `window` at the end of each
  file (`Object.assign(window, { ... })`). Load order matters — see `app/App.html`.
- **Never name a styles object `styles`** across babel files (collision). Use inline styles or component-scoped names.
- **Design tokens** live as CSS custom properties at the top of `styles.css` and `app/app.css`. Reuse them;
  don't introduce new hex colors. Accent (terracotta) is used sparingly.
- **Reveals** use a robust pattern (IntersectionObserver + scroll fallback + a final `setTimeout` safety) so
  content is never left hidden. Keep that pattern if you add sections.
- Canonical HTML (explicit closing tags, quoted attributes) so it stays directly editable.

## The product mechanic (for the app surfaces)
- Each user gets a **private 1:1 line** — in your product · a browser companion · email · the Edda app (their pick).
  Never a noisy shared channel.
- The agent runs it continuously: light periodic Q&As + **behavior-triggered** deep-dives.
- The product team can **relay a question** through Edda and **request a live 1:1**. Backend ≈ a diary study.
- Demo workspace in the prototype is **"Northwind"**; demo users incl. Dana K. (power user, the export/dashboard
  storyline that also appears on the landing).

## Next tasks (priority)
1. **`/mcp` page** — "Ready for your agentic workflow." Edda installs as an MCP server; a coding agent
   (Claude Code / Cursor) pulls user insight into the dev flow. Match the site's system.
2. **Brand identity / logo** — wordmark is a placeholder lowercase serif `edda` with a dot. Develop a real mark
   + the literary/Nordic visual language; refine color.
3. **Real pricing** — replace indicative numbers in `Landing.html` (#pricing).
4. **Social proof** — real logos (currently text); add a testimonial/quote block.
5. **Concrete numbers** woven into copy (e.g. "1:1 with 500 users at once").
6. **More mockups** — panel/dashboard, synthesis view variants.
7. Reconcile against the real `alphacommons-v2` repo (branch `repivot-home`) tokens & components when porting.

## Don't
- Don't re-introduce template monotony (mono eyebrow → serif h2 → paragraph → two bordered cards repeated).
- Don't add filler sections/stats/icons. Every element earns its place. Ask before adding net-new content.
- Don't lead with the panel or sell the pain.
