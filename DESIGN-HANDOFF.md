# Observant — Design Handoff

_For a designer picking up the visual design. Read `README.md` for structure, then use
`observant/Landing.html` as the canonical messaging source. `PRD.md` explains positioning rationale;
this doc captures design context and historical notes._

---

## TL;DR — what needs design love
1. **Hero headline treatment** — current live copy is in `observant/Landing.html`; keep future design work anchored there.
2. **Hero layout** — currently a split hero with copy left and live-conversation screenshot right, with metrics below. If revisiting, keep the page compact and demo-forward.
3. **Reconcile the brand tension**: the system is warm / serif / literary (Spectral, terracotta), but recent direction pulls toward a **modern bold-sans hero** (à la the "Meet Jack" landing). Pick a lane and make it cohesive across all pages.
4. Polish the hero "screenshot" — it's a hand-built CSS/JS mock, not a real product shot.

---

## Run it (no build step)
```bash
cd ~/observant
python3 -m http.server 8000
# Marketing:  http://localhost:8000/observant/Landing.html  ·  How-It-Works.html  ·  MCP.html
# Prototype:  http://localhost:8000/app/App.html  (App.html?view=app opens the portal)
```
Repo: `https://github.com/xualaya/observant` (private, branch `main`).

## File map
```
observant/        marketing site (vanilla HTML/CSS/JS, no framework)
  Landing.html · How-It-Works.html · MCP.html
  styles.css (design system + Landing)  how.css  mcp.css
  app.js (reveals, animated chat, count-up)  how.js  mcp.js
  Observant-standalone.html  ← GENERATED bundle of Landing, STALE, do not hand-edit
app/         product prototype (React 18 via CDN + in-browser Babel)
  App.html  ui.jsx  data.jsx  setup.jsx  portal.jsx  im.jsx  main.jsx  app.css
brand/       brand explorations
```

## Design system (current)
- **Type:** `Spectral` (serif display) · `Hanken Grotesk` (sans body/UI) · `IBM Plex Mono` (eyebrows/labels). Google Fonts, imported at top of `styles.css`.
- **Color tokens** (oklch CSS custom properties, top of `styles.css` / `app/app.css`): `--canvas` (warm off-white), `--surface`, `--panel`, `--text-primary` `--text-secondary` `--text-muted`, `--accent` (terracotta, used sparingly), `--accent-soft` `--accent-tint`, `--border` `--border-strong`, `--success`, `--night` (dark band). **Reuse tokens — no new hex.**
- **Voice/feel:** editorial, warm, calm, literary, Nordic-minimal. Observant is personified ("Observant reached out to Dana").
- **Reveal pattern:** `.reveal` + `.d1/.d2/.d3` stagger, driven by `app.js` (IntersectionObserver + scroll fallback + setTimeout safety). Keep this if adding sections.

---

## Page jobs (information architecture — settled, don't merge)
- **Landing = the pitch.** hero → (screenshot + metrics) → "Stop chasing feedback" contrast (scattered icon chips: X / Product Hunt / DM / survey) → "Who you learn from" (bring-your-own vs recruit) → "how it learns" teaser → outcomes ("What you get") → pricing → FAQ → CTA.
- **How It Works = the mechanism.** hero → the 5-step loop → "Where it lives" (in product / browser / email) → CTA.
- **MCP = the dev-flow integration.** hero → terminal demo → "signal → fix" loop → install (PostHog-style one-prompt) + "Read the docs" → integrations → CTA.

---

## The hero, in detail (primary work)

**Copy (locked):**
- Line 1: **Meet Observant**
- Line 2: **Put user learning on autopilot.**
- Sub: _Observant talks to each of your users one-on-one and keeps learning from them automatically, following up the moment something happens, so insight flows in while you ship. Built for startups and AI-native teams with no research team and no time to chase feedback._
- CTAs: **Turn on learning mode** (primary) · **See how it works** (ghost)
- Social line: **Join 1,248 builders today →** (animated count-up; `1,248` is a PLACEHOLDER)

**Reference the founder likes:** the "Meet Jack" hero (jackandjill-style) — bold **sans**, "Meet Jack" near-black + descriptor in gray (same size/weight), a quiet sub, then "Join 230,001 professionals today →". Also: Wispr Flow (compact, demo-first IA), Rally MCP ("Read the docs" CTA), PostHog ("Install in one prompt").

**Headline treatments explored (none final — designer to decide & unify):**
1. Solid sans, one color, two lines (most unified)
2. "MEET OBSERVANT" mono kicker + big sans headline
3. Kicker + sans headline with terracotta accent on "on autopilot"
4. Kicker + serif (Spectral) headline with accent — closest to current brand
5. Jack-faithful: small grey "MEET OBSERVANT" label above a big sans line
6. Serif, two lines, accent on "on autopilot", drop "Meet"

Open decisions: **serif vs sans** · **single-color vs two-tone** · **kicker vs same-size** · **keep/drop the terracotta accent** on "on autopilot".

**Layout request (not yet built):** copy block on its own; beneath it a **2-column row — screenshot left, the 3 metrics right** (metrics stacked vertically). The screenshot is `.hero-visual > .panel > .hero-stream` (3 `.mini` conversation cards). Metrics are `.stats > .stat` (currently a 3-across row in its own `.section-sm`).

---

## Key component classes
`.hero` `.hero-text` `.hero-desc` `.hero-join` · `.hero-visual` `.panel` `.hero-stream` `.mini` (`.mini-top/-ava/-id/-name/-ctx/-tag/-msg/-typing/-reply`) · `.stats` `.stat` · `.scramble` `.scrap` · `.caps` `.cap` · `.cohort-card` `.cohort` · `.synth` · `.chat` (animated, `data-animate` in `app.js`) · `.tl` (How-It-Works timeline) · `.surfaces` `.surface-card` · `.install-box` (MCP) · `.btn`/`.btn-primary`/`.btn-ghost`/`.btn-arrow`.

## Content notes & placeholders (don't treat as final)
- **Builder count `1,248`** — placeholder; `TODO` comments in `Landing.html` mark the `data-count` + visible number.
- **"Read the docs"** → `https://api.usercodified.com/docs` — currently behind an invite-only login wall; no public docs page yet.
- **Pricing** + **FAQ** copy/structure are ON HOLD (founder hasn't finalized) — safe to restyle, but don't rewrite content.
- **`Observant-standalone.html`** is a stale generated bundle — ignore/regenerate, don't hand-edit.
- **Brand/logo:** wordmark is a placeholder lowercase serif `observant` + dot — needs a real mark and visual language.
- App prototype surfaces dropped the "Observant app" channel (keep product / browser / email).

## Founder's style preferences (from prior feedback)
- Wants the hero to feel **strong/confident**, not delicate.
- Open to a more **modern, builder-friendly** look (sans, bold) even though the base system is literary/serif — reconcile thoughtfully.
- Avoid jargon in copy (no "synthesis / cohort / diary study / panel" in user-facing text).
- Keep it **compact** — every section earns its place; no filler.

---

_Last updated: 2026-06-03. Current `main` head reflects the Jack-style hero attempt (bold sans, "Meet Observant" + grey descriptor, screenshot stacked below, metrics row beneath)._
