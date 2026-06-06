# Observant

**An AI that learns from your users — 1:1, continuously, at scale.**

Observant runs a continuous, one-on-one learning loop with the users worth listening to: it onboards
them, watches real behavior, follows up in the moment, and surfaces insight — so a builder never
builds blind. (Formerly *AlphaCommons*, then *Edda*.)

This repo contains the **launch-ready V1 marketing site + an interactive product prototype**, built
as self-contained HTML/CSS/JS (no build step). It is the **design front end** — the real backend
(the agent, the IM/diary engine, the credit ledger) is a separate engineering track.

---

## Quick start

No build, no dependencies. Serve the folder statically:

```bash
# from the repo root
python3 -m http.server 8000
# then open:
#   http://localhost:8000/observant/Landing.html      (marketing site)
#   http://localhost:8000/app/App.html            (product prototype)
```

or `npx serve .` — or just open `observant/Landing.html` directly in a browser.

> The product app (`app/`) uses React + Babel from a CDN and is transpiled in-browser. That's fine
> for a prototype; a production build should precompile (see **Handoff notes** below).

---

## What's in here

```
observant/                         Marketing site (vanilla HTML/CSS/JS)
├─ Landing.html               Home — capacity hero, social proof, how-it-learns,
│                             capabilities, pricing teaser, FAQ, CTA
├─ How-It-Works.html          Deep mechanics — old-way compare, the loop timeline,
│                             surfaces band, animated 1:1 demo, research know-how
├─ styles.css                 Shared design system (tokens, type, components, chat mockup)
├─ how.css                    /how-it-works-specific sections
├─ app.js                     Landing interactions (reveals, animated chat, FAQ)
├─ how.js                     How-it-works interactions (reveals, rich 1:1 demo)
└─ Observant-standalone.html       GENERATED offline single-file bundle of Landing (do not hand-edit)

app/                          Product prototype (React 18 + Babel, in-browser)
├─ App.html                   Entry — loads React/Babel + the .jsx modules
├─ app.css                    Product UI design system (shell, setup, portal, IM)
├─ ui.jsx                     Shared primitives: Icon, Avatar, Wordmark, Btn  (→ window)
├─ data.jsx                   Seed data: PANEL, PROGRAMS, GOAL_CHIPS  (demo workspace "Northwind")
├─ setup.jsx                  Setup flow — brief → who → cadence → surfaces → review → launch
├─ portal.jsx                 Portal — programs, program detail, insights, panel, settings
├─ im.jsx                     1:1 IM slide-over — thread, relay a question, request live 1:1
└─ main.jsx                   Root: setup ⇄ portal routing + IM overlay
```

### How the two connect
The marketing site's **Get started / pricing / sign-in** CTAs link to `../app/App.html`.
`App.html` opens on the **setup flow** by default; `App.html?view=app` opens straight to the **portal**.

---

## Design system (locked)

- **Feel:** editorial, warm, calm, literary — the Ólafur Arnalds hush. Nordic-minimal,
  anthropologist/documentary-observer tone. Observant is personified ("Observant reached out to Dana").
- **Type:** `Spectral` (serif display — the headline voice) · `Hanken Grotesk` (sans UI/body) ·
  `IBM Plex Mono` (eyebrows/labels). Loaded from Google Fonts.
- **Color tokens** (CSS custom properties in `styles.css` / `app.css`, all in `oklch`):
  - `--canvas` warm off-white · `--surface` tint · `--panel` card white
  - `--text-primary` / `--text-secondary` / `--text-muted`
  - `--accent` terracotta/rust (used sparingly) · `--accent-soft` / `--accent-tint`
  - `--border` / `--border-strong` · `--success` · `--night` (dark band)
- **Principle:** break the template — alternating layouts, real product mockups, tinted bands,
  a timeline, varied alignments. Avoid the mono-eyebrow → serif h2 → paragraph → two-cards monotony.

---

## Status

**Built**
- [x] Landing page (hero, social proof + pedigree, stats, who-you-learn-from, how-it-learns w/ animated 1:1 chat, capabilities + synthesis snapshot, pricing teaser, FAQ, CTA)
- [x] `/how-it-works` (compare, loop timeline, surfaces, rich animated 1:1 demo, research know-how, panel-is-yours)
- [x] Product prototype: setup flow → portal → program detail → 1:1 IM (with working relay + live-1:1 request)

**Open (priority order)**
- [ ] `/mcp` page — "Ready for your agentic workflow"
- [ ] Brand identity / real logo (current wordmark is a placeholder lowercase serif `observant`)
- [ ] Real pricing tiers (current numbers are indicative placeholders)
- [ ] Real social-proof logos (currently text wordmarks) + a testimonial/quote block
- [ ] More product mockups; reconcile against the real `alphacommons-v2` tokens/components

See `CLAUDE.md` for conventions and a deeper handoff brief.

---

## Handoff notes (for a production build)

These HTML files are **design references** — the intended look and behavior. To productionize:
- Recreate them in the target stack (the existing app is **React + TypeScript + Vite + Tailwind**,
  with framer-motion for fades) using its established components and tokens.
- Map the CSS custom properties here onto the Tailwind theme (`bg-canvas`, `text-primary/-secondary/-muted`,
  `accent`, `border`, `surface`, `success`; `font-display` / `font-heading` / `font-mono`).
- The `.jsx` files are plain in-browser Babel modules sharing globals via `window` — port them to real
  ES modules / components; they're structured to map 1:1 onto React components.
```
