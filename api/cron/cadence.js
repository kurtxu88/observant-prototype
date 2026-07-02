/* ============================================================
   Observant — the cadence scheduler (C6 weaver, made real).

   This is the backend orchestration C6 hands off to: it walks every active
   partner and decides whether it's TIME to reach out to that person, then weaves
   in the next queued team question — one at a time, never a burst.

   A partner is DUE when ALL of:
     1. cadence interval elapsed  — open ≈ 3d, occasional ≈ 12d, rare ≈ 30d
     2. recency respected         — enough time since their last message (P11 energy)
     3. no outstanding ask        — they have no question already 'sent' & unanswered
                                     (C6/C3: one ongoing thread, one ask at a time)

   When due, pick the highest-priority queued question for that partner (falling
   back to a program-wide question), send it on their channel, mark it 'sent',
   and write the outbound to `messages` so the thread stays whole.

   Wired as a Vercel Cron (see vercel.json "crons"). Protected by CRON_SECRET:
   Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically. If
   CRON_SECRET is unset we still run (so it degrades gracefully in dev), and if
   the DB is unconfigured we no-op cleanly.
   ============================================================ */
const db = require("../_db");

// Cadence → minimum days between loops, and a recency floor (don't pile onto a
// person we just spoke to, regardless of cadence).
const CADENCE_DAYS = { open: 3, occasional: 12, rare: 30 };
const RECENCY_FLOOR_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  // Shared-secret gate — only Vercel Cron (or someone with the secret) may run this.
  const secret = (process.env.CRON_SECRET || "").trim();
  if (secret) {
    const auth = String(req.headers.authorization || "");
    const qs = String((req.query && req.query.secret) || "");
    if (auth !== "Bearer " + secret && qs !== secret) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }
  }

  // No DB → nothing to schedule. No-op so the cron stays green.
  if (!db.dbConfigured()) {
    return res.status(200).json({ ok: true, skipped: "db-not-configured", considered: 0, sent: 0 });
  }

  const base = "https://" + (req.headers.host || process.env.VERCEL_URL || "");
  const now = Date.now();
  const summary = { considered: 0, due: 0, sent: 0, resumed: 0, held: [], errors: [] };

  try {
    // Auto-resume: a timed pause (paused_until in the past) ends on its own, so
    // 30/90-day breaks self-heal before this run considers who's due. An
    // indefinite pause ("until I turn it back on") has paused_until = null and
    // is EXCLUDED by lte (null comparisons are false in PostgREST) → it never
    // auto-resumes. Tolerates a DB without the paused_until column.
    summary.resumed = await autoResumePaused(now);

    // Programs lookup (for product_name when composing email loops).
    const programs = await safe(() => db.select("programs", "select=id,slug,product_name"), []);
    const programById = {};
    (programs || []).forEach((p) => { programById[p.id] = p; });

    // Every partner still in the program.
    const partners = await safe(
      () => db.select("partners", "status=eq.active&select=id,program_id,channel,contact,cadence&order=created_at.asc"),
      []
    );

    for (const partner of partners || []) {
      summary.considered++;
      try {
        const decision = await considerPartner(partner, now);
        if (!decision.due) { summary.held.push({ partner: partner.id, why: decision.why }); continue; }
        summary.due++;

        const q = decision.question;
        const program = programById[partner.program_id] || {};
        const productName = program.product_name || "your product";

        // Send on the partner's channel. `q` is ALWAYS a team-provided question
        // pulled from questions_queue (see pickQuestion) — the scheduler never
        // invents or generates a question of its own.
        const sent = await sendQuestion({ base, partner, productName, question: q });
        if (!sent.ok) { summary.errors.push({ partner: partner.id, question: q.id, error: sent.error }); continue; }

        // Log to loop history FIRST — every question we send MUST be documented in
        // the partner's thread (messages/conversations), even if the queue write
        // below hiccups. Order matters: record, then consume the queue row.
        await recordOutbound({ partner, question: q, channel: partner.channel });

        // Mark the queued question as sent (consumed from the always-on pool).
        await safe(() => db.update("questions_queue", "id=eq." + q.id, { status: "sent", sent_at: new Date().toISOString() }), null);

        summary.sent++;
      } catch (e) {
        summary.errors.push({ partner: partner.id, error: String((e && e.message) || e) });
      }
    }

    return res.status(200).json({ ok: true, ranAt: new Date(now).toISOString(), ...summary });
  } catch (error) {
    return res.status(200).json({ ok: false, error: String((error && error.message) || error), ...summary });
  }
};

/* ---- Auto-resume expired pauses (paused_until now past) ---- */
async function autoResumePaused(now) {
  const iso = new Date(now).toISOString();
  try {
    const resumed = await db.update(
      "partners",
      "status=eq.paused&paused_until=not.is.null&paused_until=lte." + iso,
      { status: "active", paused_until: null }
    );
    return Array.isArray(resumed) ? resumed.length : 0;
  } catch (_e) {
    // No paused_until column (or the filter isn't supported) → status-only
    // pauses stay paused until resumed by hand. Don't fail the run.
    return 0;
  }
}

/* ---- Per-partner DUE decision (cadence + recency + one-at-a-time) ---- */
async function considerPartner(partner, now) {
  // (3) one-at-a-time: an already-'sent' (unanswered) ask blocks a new one.
  const outstanding = await safe(
    () => db.select("questions_queue", "partner_id=eq." + partner.id + "&status=eq.sent&select=id&limit=1"),
    []
  );
  if (outstanding && outstanding.length) return { due: false, why: "outstanding-ask" };

  // (1)+(2) cadence interval + recency floor, measured from the last thread activity.
  const lastActive = await lastActivityMs(partner.id);
  const intervalDays = CADENCE_DAYS[partner.cadence] || CADENCE_DAYS.occasional;
  if (lastActive != null) {
    const sinceDays = (now - lastActive) / DAY_MS;
    if (sinceDays < RECENCY_FLOOR_DAYS) return { due: false, why: "too-recent" };
    if (sinceDays < intervalDays) return { due: false, why: "cadence-not-elapsed" };
  }

  // Pick what to send: highest-priority queued question for THIS partner,
  // else a program-wide queued question.
  const question = await pickQuestion(partner);
  if (!question) return { due: false, why: "no-queued-question" };
  return { due: true, question };
}

// Most-recent thread activity for a partner (last_active_at across their convos).
async function lastActivityMs(partnerId) {
  const convos = await safe(
    () => db.select("conversations", "partner_id=eq." + partnerId + "&select=last_active_at&order=last_active_at.desc&limit=1"),
    []
  );
  if (convos && convos.length && convos[0].last_active_at) {
    const t = Date.parse(convos[0].last_active_at);
    return isNaN(t) ? null : t;
  }
  return null; // never contacted → not blocked by recency
}

// Partner-specific first, then program-wide; order by priority desc, oldest first.
async function pickQuestion(partner) {
  const order = "&order=priority.desc,created_at.asc&limit=1";
  const mine = await safe(
    () => db.select("questions_queue", "partner_id=eq." + partner.id + "&status=eq.queued&select=*" + order),
    []
  );
  if (mine && mine.length) return mine[0];
  const programWide = await safe(
    () => db.select("questions_queue", "program_id=eq." + partner.program_id + "&partner_id=is.null&status=eq.queued&select=*" + order),
    []
  );
  return (programWide && programWide.length) ? programWide[0] : null;
}

/* ---- Channel send ---- */
async function sendQuestion({ base, partner, productName, question }) {
  if (partner.channel === "email") {
    // Reuse the real send-email loop (C1 translate → Resend, with manage links).
    try {
      const r = await fetch(base + "/api/selfserve/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: productName,
          question: question.question,
          toEmail: partner.contact,
          channel: "email",
          mode: question.mode || "light",
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (data && data.ok) return { ok: true };
      if (data && data.needKey) return { ok: false, error: "RESEND_API_KEY not set" };
      return { ok: false, error: (data && data.error) || ("send-email " + r.status) };
    } catch (e) {
      return { ok: false, error: String((e && e.message) || e) };
    }
  }

  if (partner.channel === "telegram") {
    // POST to a telegram sender if one exists; tolerate its absence.
    try {
      const r = await fetch(base + "/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId: partner.contact, text: question.question, product: productName }),
      });
      if (r.ok) return { ok: true };
      return { ok: false, error: "telegram/send " + r.status };
    } catch (e) {
      return { ok: false, error: "telegram channel unavailable: " + String((e && e.message) || e) };
    }
  }

  // inproduct (or unknown) — no push channel from the scheduler; the question
  // waits to be surfaced in-product. Treat as "held," not an error.
  return { ok: false, error: "no-push-channel:" + partner.channel };
}

/* ---- Thread bookkeeping (one ongoing thread per person) ---- */
async function recordOutbound({ partner, question, channel }) {
  const convo = await findOrCreateConversation(partner, question);
  if (!convo) return;
  const nowIso = new Date().toISOString();
  await safe(() => db.insert("messages", {
    conversation_id: convo.id,
    sender: "observant",
    body: question.question,
    meta: { source: "cadence", question_id: question.id, channel },
    minutes: 0,
  }), null);
  await safe(() => db.update("conversations", "id=eq." + convo.id, { last_active_at: nowIso }), null);
}

async function findOrCreateConversation(partner, question) {
  const open = await safe(
    () => db.select("conversations", "partner_id=eq." + partner.id + "&status=eq.open&select=id&order=last_active_at.desc&limit=1"),
    []
  );
  if (open && open.length) return open[0];
  return safe(() => db.insert("conversations", {
    partner_id: partner.id,
    subject: "Your ongoing thread",
    mode: question.mode === "deep" ? "deep" : "light",
    status: "open",
  }), null);
}

/* ---- helpers ---- */
// Run a DB call, swallow errors into a fallback so one bad row never kills the run.
async function safe(fn, fallback) {
  try { return await fn(); } catch (_e) { return fallback; }
}
