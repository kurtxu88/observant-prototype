/* ============================================================
   Observant — Cloudflare Email Worker (true inbound email, #4).
   Catches a partner's email REPLY (via Cloudflare Email Routing),
   pulls out the freshly-typed plain text, and POSTs it to the
   Observant inbound endpoint, which continues the 1:1 loop.

   This is a self-contained Worker — NO npm imports — so you can paste
   it straight into the Cloudflare dashboard (Workers & Pages → Create →
   "Hello World" Worker → replace the code). See cloudflare/README.md.

   Cloudflare → Email Routing → route your inbound address
   (e.g. feedback@observanthq.com, or a catch-all) → "Send to a Worker"
   → select this Worker.

   Optional env var on the Worker: INBOUND_SECRET (set the SAME value in
   Vercel) — adds a shared-secret header so only this Worker can post.
   ============================================================ */
const ENDPOINT = "https://observant-prototype.vercel.app/api/selfserve/inbound-email";

export default {
  async email(message, env, ctx) {
    try {
      const raw = await streamToString(message.raw);
      const text = extractPlainText(raw);
      const subject = (message.headers && message.headers.get && message.headers.get("subject")) || "";
      const headers = { "Content-Type": "application/json" };
      if (env && env.INBOUND_SECRET) headers["x-inbound-secret"] = env.INBOUND_SECRET;
      await fetch(ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({ from: message.from, to: message.to, subject, text }),
      });
    } catch (e) {
      // Never bounce the email on our error — just log.
      console.error("observant email-worker:", e && e.message);
    }
  },
};

async function streamToString(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

// Minimal MIME: pull the text/plain part (decoding its transfer-encoding),
// fall back to a stripped text/html part, then to the raw body.
function extractPlainText(raw) {
  const norm = String(raw || "").replace(/\r\n/g, "\n");
  const sep = norm.indexOf("\n\n");
  const headers = sep >= 0 ? norm.slice(0, sep) : norm;
  const body = sep >= 0 ? norm.slice(sep + 2) : "";
  const ctype = (headers.match(/^content-type:\s*([^\n]+)/im) || [])[1] || "";
  const boundary = (ctype.match(/boundary="?([^";\n]+)"?/i) || [])[1];

  if (boundary) {
    const parts = body.split("--" + boundary);
    let htmlFallback = "";
    for (const part of parts) {
      const pSep = part.indexOf("\n\n");
      if (pSep < 0) continue;
      const pHead = part.slice(0, pSep);
      const pBody = part.slice(pSep + 2);
      // nested multipart (e.g. multipart/alternative) → recurse
      if (/content-type:\s*multipart\//i.test(pHead)) {
        const inner = extractPlainText(part);
        if (inner) return inner;
        continue;
      }
      if (/content-type:\s*text\/plain/i.test(pHead)) return decodeCTE(pBody, pHead);
      if (/content-type:\s*text\/html/i.test(pHead) && !htmlFallback) htmlFallback = stripHtml(decodeCTE(pBody, pHead));
    }
    if (htmlFallback) return htmlFallback;
    return "";
  }
  // single-part
  if (/text\/html/i.test(ctype)) return stripHtml(decodeCTE(body, headers));
  return decodeCTE(body, headers);
}

function decodeCTE(body, head) {
  const cte = ((head.match(/content-transfer-encoding:\s*([^\n;]+)/i) || [])[1] || "").trim().toLowerCase();
  let s = String(body || "");
  if (cte === "base64") {
    try { s = decodeURIComponent(escape(atob(s.replace(/\s+/g, "")))); } catch (_e) { try { s = atob(s.replace(/\s+/g, "")); } catch (_e2) {} }
  } else if (cte === "quoted-printable") {
    s = s.replace(/=\n/g, "").replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));
  }
  return s.trim();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|br|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
