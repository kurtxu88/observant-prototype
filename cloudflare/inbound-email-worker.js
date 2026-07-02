/* ============================================================
   Observant — Cloudflare Email Worker for inbound feedback replies.
   Paste this into a Cloudflare Email Worker (see cloudflare/README-inbound.md).
   When a partner replies to a loop email (routed to feedback@observanthq.com),
   Cloudflare runs this: it parses the sender + plain-text body and POSTs them to
   /api/selfserve/inbound-email with the shared secret. The endpoint already
   supports this path (x-inbound-secret header + { from, text } JSON).

   Set the INBOUND_SECRET variable on this Worker to the SAME value you set for
   INBOUND_SECRET in Vercel.
   ============================================================ */
export default {
  async email(message, env) {
    const from = String(message.from || "");
    let text = "";
    try {
      const raw = await new Response(message.raw).text();
      text = extractPlainText(raw);
    } catch (_e) { text = ""; }

    try {
      await fetch("https://www.observanthq.com/api/selfserve/inbound-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-inbound-secret": String(env.INBOUND_SECRET || ""),
        },
        body: JSON.stringify({ from, text, subject: message.headers.get("subject") || "" }),
      });
    } catch (_e) { /* best-effort; Cloudflare will not retry an email() throw */ }
  },
};

/* Best-effort plain-text extraction from a raw MIME message. The server also
   strips quoted reply chains, so this only needs to surface the reply body. */
function extractPlainText(raw) {
  const boundary = (raw.match(/boundary="?([^";\r\n]+)"?/i) || [])[1];
  if (boundary) {
    const parts = raw.split("--" + boundary);
    // Prefer a text/plain part; fall back to text/html (stripped).
    let plain = "";
    let html = "";
    for (const part of parts) {
      const headEnd = part.search(/\r?\n\r?\n/);
      if (headEnd < 0) continue;
      const head = part.slice(0, headEnd).toLowerCase();
      let body = part.slice(headEnd).trim();
      if (/content-transfer-encoding:\s*quoted-printable/.test(head)) body = decodeQP(body);
      else if (/content-transfer-encoding:\s*base64/.test(head)) body = decodeB64(body);
      if (/content-type:\s*text\/plain/.test(head)) { plain = body; break; }
      if (/content-type:\s*text\/html/.test(head)) html = stripHtml(body);
    }
    return (plain || html || "").trim();
  }
  // Single-part: body is after the first blank line.
  const i = raw.search(/\r?\n\r?\n/);
  let body = i >= 0 ? raw.slice(i) : raw;
  if (/content-transfer-encoding:\s*quoted-printable/i.test(raw.slice(0, i))) body = decodeQP(body);
  else if (/content-transfer-encoding:\s*base64/i.test(raw.slice(0, i))) body = decodeB64(body);
  if (/content-type:\s*text\/html/i.test(raw.slice(0, i))) body = stripHtml(body);
  return body.trim();
}

function decodeQP(s) {
  return String(s)
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
}
function decodeB64(s) {
  try { return atob(String(s).replace(/\s+/g, "")); } catch (_e) { return s; }
}
function stripHtml(s) {
  return String(s).replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ");
}
