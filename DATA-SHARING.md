# Data sharing & identity — what Observant needs from a partner

This is the framing for the **data-sharing ask** in a design-partner conversation. The short version:
Observant needs as little as possible to start, and the one genuinely hard piece —
a stable user identity — **only applies to the in-product surface**. Email, Slack, and Discord
need none of it, which is why they're the fastest way to launch.

---

## The principle

We ask for the **minimum** required to hold a continuous one-on-one line with each user — and never
for raw PII we don't need. You stay in control: you send the invite, your users opt in, and they can
opt out at any time.

| Surface | What we need from you | Identity work |
|---|---|---|
| **Email** | A way to reach opted-in users (an address, or you forward our invite) | **None** |
| **Slack** | Our bot in your shared customer Slack | **None** — Slack identity is the handle |
| **Discord** | Our bot in your community Discord | **None** — Discord identity is the handle |
| **In-product** | A stable identifier passed when our snippet loads | **The hashed Observant ID** (below) |

For email / Slack / Discord, the person is talking to *us* on a channel where they're already
identified, so "who is this?" is answered for free. **In-product is the only place that needs the
identity mechanism** — and it's the one unresolved technical knot worth being honest about with partners.

---

## The in-product identity mechanism (the hard part)

When Observant lives **inside your product**, we can't ask each user "who are you?" again — and we
shouldn't hold your real user IDs. So the partner passes us a **stable, unique, non-reversible
identifier** when our agent loads: the **Observant ID**.

This is the same pattern Sprig uses with `setUserIdentifier`. Their guidance maps to exactly what we need:

- **Unique** — two users must never share an ID.
- **Static** — once assigned, it doesn't change (so memory persists across sessions).
- **Mappable, but not reversible by us** — it maps back to your internal user ID *on your side*. You can
  run it through a hash / anonymizing function so we never see the real one.

```js
// On your side, when Observant loads in-product:
Observant.setUserIdentifier(hash(yourInternalUserId))
//                          └─ stable, unique, one-way. We store this; we can't reverse it.
```

**What this costs the partner:** a little integration work — generate the hashed ID and maintain the
mapping (real ID ↔ hashed ID) on their side. That's the friction. It's why we don't lead with in-product.

**What we deliberately do *not* ask for:** names, emails, or any real PII tied to the hashed ID — unless
the user consents to share it in their own 1:1. The hashed ID + the conversation is enough to learn.

---

## How to position it with a design partner

1. **Lead with email or Slack/Discord.** "We can be live this week — no SDK, no identity work. Just a
   way to reach the users who opt in."
2. **Treat in-product as the next step,** once they've seen value: "When you want it inside the product,
   there's a one-time setup — you pass us a hashed ID so we always know who we're talking to, and you
   never hand us your real user data."
3. **Name the trade honestly.** In-product is the richest surface (behavior in context) but carries the
   only real integration cost. Email/Slack/Discord get you 80% of the value with none of it.

---

*Companion to the product framing in `app/SelfServe.html`. The portal intentionally does **not** surface
this — it lives here, in the docs, where the data-sharing conversation actually happens.*
