# CLAUDE.md — working notes for Edda

Context for Claude Code (or any dev) continuing this project. Read `README.md` first for structure
and quick start.

## What Edda is
An AI that learns from a builder's users **1:1, continuously, at scale**. It runs a rolling-research
loop (≈ a diary study) over the builder's own panel: onboards each user on a private line, watches
behavior, follows up in the moment, lets the product team relay questions / request live 1:1s, and
synthesizes insight bottom-up or on demand.

## Positioning (LOCKED — do not drift)
- **Hero:** "Let Edda learn from your users — 1:1, continuously, at scale."
- **Sub:** "Whether you have a million users or your first ten, Edda automates how you learn from your power users — so you never build blind."
- **Category:** the modern user-learning pipeline.
- **CTA:** "Automate user learning now."
- **Differentiator:** 1:1 **and** at scale, continuous & in-context — what surveys / one-off studies / rented panels can't do.
- **Rule learned the hard way:** sell the **capability**, not the pain. Lead with the capacity; "who you learn from" (the panel) follows — never lead with the panel.
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
