# CLAUDE.md — working notes for Observant

Context for Claude Code (or any dev) continuing this project. Read `README.md` first for structure
and quick start.

## What Observant is
An AI that puts user learning **on autopilot** for builders. Turn it on and Observant runs the whole
user-research loop for you: it **finds your users** (bring your own or it recruits a vetted panel),
onboards each one on a private line, watches behavior, follows up in the moment, and synthesizes
insight — continuously, 1:1, at scale. The continuous 1:1 relationship (≈ a rolling diary study) is the
**engine** that makes the loop work, not the whole pitch.

## Audience (LOCKED)
Laser-focused on **startups, solo founders / one-person companies, and small AI-native teams** shipping
fast — people who have no time or headcount for a research function. "No research team required."

## Positioning (LOCKED — do not drift)
- **Hero:** "Now you can put user learning on autopilot."
- **Sub:** "Observant finds your users, onboards them, follows up in the moment, and keeps learning — 1:1, continuously, at scale. You turn it on. The insight comes to you."
- **Frame:** turn on **learning mode** and watch insight come in — the systematized alternative to chasing
  feedback in scraps (polling X, refreshing Product Hunt, DMing power users, guessing). Iterate as fast as you ship.
- **CTA:** "Turn on learning mode."
- **The loop (what Observant does):** Finds your users · Onboards & manages · Follows up in the moment · Learns continuously.
- **Differentiator:** the entire loop, run for you, continuously — vs. surveys / one-off studies / rented panels.
- **1:1 + proactive learning is a FEATURE** ("the engine under the hood"), not the headline.
- **Rule still in force:** lead with the **capability** ("put it on autopilot"), not the pain. The
  "stop chasing feedback" contrast is a supporting beat, never the lead.
- Observant is **personified** ("Observant reached out to Dana"). Voice: calm, literary, Nordic-minimal, documentary-observer.

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
- Each user gets a **private 1:1 line** — in your product · a browser companion · email · the Observant app (their pick).
  Never a noisy shared channel.
- The agent runs it continuously: light periodic Q&As + **behavior-triggered** deep-dives.
- The product team can **relay a question** through Observant and **request a live 1:1**. Backend ≈ a diary study.
- Demo workspace in the prototype is **"Northwind"**; demo users incl. Dana K. (power user, the export/dashboard
  storyline that also appears on the landing).

## Next tasks (priority)
0. **Repivot landed (Jun 2026):** Landing, How-It-Works, MCP, and app surfaces reframed to "user learning
   on autopilot" for the startup / solo / AI-native audience. Landing has new **The loop** (4 jobs) and
   **Stop chasing feedback** (versus) sections; 1:1 demoted to "the engine." Old hero saved at
   `Landing-v1-panel.html`. Keep all four surfaces in sync on this frame.
1. **`/mcp` page** — built (`MCP.html`): "Ready for your agentic workflow," MCP server + Claude Code / Cursor
   loop. Iterate as needed; keep matching the site system.
2. **Brand identity / logo** — wordmark is a placeholder lowercase serif `observant` with a dot. Develop a real mark
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
