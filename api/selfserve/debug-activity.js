/* TEMPORARY read-only diagnostic for the live-sync gap: given ?slug=, report
   the counts at each step of the workspace→program→partners→conversations chain
   so we can see exactly where it breaks. Counts + ids + masked contacts only —
   no message bodies. Remove after debugging. */
const db = require("../_db");

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!db.dbConfigured()) return res.status(200).json({ ok: true, dbConfigured: false });
    const url = new URL(req.url, "http://x");
    const slug = String(url.searchParams.get("slug") || "").trim().toLowerCase();
    const out = { ok: true, slug };

    const ws = slug ? await db.select("workspaces", "slug=eq." + encodeURIComponent(slug) + "&select=id,slug,account_id,product_name") : [];
    out.workspaces = (ws || []).map((w) => ({ id: w.id, slug: w.slug, account_id: w.account_id, product: w.product_name }));

    const progs = slug ? await db.select("programs", "slug=eq." + encodeURIComponent(slug) + "&select=id,slug,product_name") : [];
    out.programs = (progs || []).map((p) => ({ id: p.id, slug: p.slug, product: p.product_name }));

    const progIds = (progs || []).map((p) => p.id).filter(Boolean);
    let partners = [];
    if (progIds.length) partners = await db.select("partners", "program_id=in.(" + progIds.join(",") + ")&select=id,program_id,channel,status,contact");
    out.partners = (partners || []).map((p) => ({ id: p.id, program_id: p.program_id, channel: p.channel, status: p.status, contact: mask(p.contact) }));

    const partIds = (partners || []).map((p) => p.id).filter(Boolean);
    let convs = [];
    if (partIds.length) convs = await db.select("conversations", "partner_id=in.(" + partIds.join(",") + ")&select=id,partner_id,status");
    out.conversationCount = (convs || []).length;

    const convIds = (convs || []).map((c) => c.id).filter(Boolean);
    if (convIds.length) {
      const msgs = await db.select("messages", "conversation_id=in.(" + convIds.join(",") + ")&select=id");
      out.messageCount = (msgs || []).length;
    } else out.messageCount = 0;

    // also: total counts, to see if ANY data exists regardless of slug
    out.totals = {
      workspaces: ((await db.select("workspaces", "select=id&limit=200")) || []).length,
      programs: ((await db.select("programs", "select=id,slug&limit=200")) || []).length,
      partners: ((await db.select("partners", "select=id&limit=200")) || []).length,
    };
    out.allProgramSlugs = ((await db.select("programs", "select=slug&limit=50")) || []).map((p) => p.slug);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
};

function mask(s) {
  s = String(s || "");
  const i = s.indexOf("@");
  return i > 1 ? s.slice(0, 2) + "***" + s.slice(i) : (s.length > 4 ? s.slice(0, 2) + "***" : s);
}
