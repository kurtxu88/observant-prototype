/* ============================================================
   Observant — thread-routing for inbound email replies.
   Every outbound loop email sets reply_to to a thread-encoding
   sub-address: reply+<token>@<RESEND_INBOUND_DOMAIN>. The <token>
   is the base64url-encoded conversation state (the same payload
   that rides in the hosted Answer.html link) — so a mail-client
   reply can be routed back to the right conversation WITHOUT a
   database. inbound.js parses the sub-address and decodes <token>.

   No DB yet: this keeps the demo stateless. The real build moves
   thread state to KV/DB and the token becomes a short id.

   Env:
     RESEND_INBOUND_DOMAIN — the MX/inbound domain Resend forwards
       to (e.g. "reply.observant.ai"). When unset, no thread reply_to
       is produced and callers fall back to RESEND_REPLY_TO.
   ============================================================ */

// Sub-address local part has practical length limits; tokens longer than this
// fall back to the static RESEND_REPLY_TO so we never emit a broken address.
const MAX_TOKEN_LEN = 480;

function encodeState(obj) {
  try { return Buffer.from(JSON.stringify(obj)).toString("base64url"); } catch (e) { return ""; }
}
function decodeState(s) {
  try { return JSON.parse(Buffer.from(String(s || ""), "base64url").toString("utf8")); } catch (e) { return null; }
}

function inboundDomain() {
  return String(process.env.RESEND_INBOUND_DOMAIN || "").trim().replace(/^@/, "");
}

/* Build the thread-encoding reply_to for an outbound email.
   Returns "" when no inbound domain is configured or the token is too long,
   so callers can fall back to RESEND_REPLY_TO. */
function threadReplyTo(state) {
  const domain = inboundDomain();
  if (!domain) return "";
  const token = encodeState(state);
  if (!token || token.length > MAX_TOKEN_LEN) return "";
  return "reply+" + token + "@" + domain;
}

/* Choose the reply_to for an outbound email: prefer the thread-encoding address
   (so replies route back here); otherwise the static RESEND_REPLY_TO. */
function outboundReplyTo(state) {
  return threadReplyTo(state) || String(process.env.RESEND_REPLY_TO || "").trim();
}

/* Recover the conversation state from an inbound "to"/"recipient" address.
   Accepts a raw address or a list/string of addresses; finds the reply+<token>
   sub-address on the inbound domain and decodes the token. Returns null if none. */
function stateFromInboundAddress(addresses) {
  const domain = inboundDomain();
  const list = Array.isArray(addresses) ? addresses : String(addresses || "").split(/[,\s;]+/);
  for (const raw of list) {
    if (!raw) continue;
    // pull the bare address out of "Name <addr>" if present. Keep ORIGINAL case:
    // the base64url token is case-sensitive, so we must not lowercase it.
    const m = String(raw).match(/<([^>]+)>/);
    const addr = (m ? m[1] : String(raw)).trim();
    const sub = addr.match(/^reply\+([^@]+)@(.+)$/i);
    if (!sub) continue;
    if (domain && sub[2].toLowerCase() !== domain.toLowerCase()) continue; // wrong inbound domain (compare case-insensitively)
    const state = decodeState(sub[1]); // token kept in original case
    if (state && Array.isArray(state.messages)) return state;
  }
  return null;
}

module.exports = { encodeState, decodeState, inboundDomain, threadReplyTo, outboundReplyTo, stateFromInboundAddress, MAX_TOKEN_LEN };
