/* ============================================================
   Observant — shared branded HTML email layout.
   `_`-prefixed so Vercel does NOT expose it as a route.

   Every transactional feedback email (loop opener, follow-ups,
   welcome/sign-in) renders through emailLayout() so they read as
   one designed product email — a centered ~600px white card on a
   warm cream background, an Observant wordmark header, a heading,
   a readable body block, an optional bold Squarespace-style CTA
   button, and a footer. Inline styles + table layout only, so it
   survives real email clients; mobile-friendly widths.

   Palette: rust #b4532a · cream #faf8f5 · ink #24221e · muted #8a857c
   ============================================================ */

const RUST = "#b4532a";
const BG = "#faf8f5";
const INK = "#24221e";
const MUTED = "#8a857c";
const CARD_BORDER = "#efe7db";
const FONT = "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plain text (with \n / \n\n) → readable HTML paragraphs. Escapes content.
function paragraphs(text) {
  const t = String(text == null ? "" : text).trim();
  if (!t) return "";
  return '<p style="margin:0 0 14px">' +
    esc(t).replace(/\n\n+/g, '</p><p style="margin:0 0 14px">').replace(/\n/g, "<br>") +
    "</p>";
}

// A numbered question list, rendered as a tinted/bordered card — one question per row.
function questionBlock(questions) {
  const qs = (Array.isArray(questions) ? questions : []).map((q) => String(q == null ? "" : q).trim()).filter(Boolean);
  if (!qs.length) return "";
  const rows = qs.map(function (q, i) {
    const last = i === qs.length - 1;
    const cell = "padding:11px 0;font-family:" + FONT + ";" + (last ? "" : "border-bottom:1px solid #efe6d5;");
    return '<tr>' +
      '<td valign="top" style="' + cell + 'width:24px;font-size:14px;font-weight:700;color:' + RUST + '">' + (i + 1) + '</td>' +
      '<td valign="top" style="' + cell + 'padding-left:12px;font-size:15px;line-height:1.55;color:' + INK + '">' + esc(q) + '</td>' +
    '</tr>';
  }).join("");
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;background:#faf7f1;border:1px solid #ece3d3;border-radius:12px">' +
      '<tr><td style="padding:4px 18px">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rows + '</table>' +
      '</td></tr>' +
    '</table>';
}

// A soft tinted callout (used for the "just reply to this email" note). innerHtml is trusted HTML.
function calloutBox(innerHtml) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0 4px"><tr>' +
      '<td style="background:#f4efe6;border:1px solid #e6ddcb;border-radius:12px;padding:15px 18px;font-family:' + FONT + ';font-size:14px;line-height:1.55;color:#5a5347">' + (innerHtml || "") + '</td>' +
    '</tr></table>';
}

/* The full branded email.
   heading   — bold title (plain text, escaped)
   bodyHtml  — the main content block (trusted HTML; use paragraphs()/questionBlock()/calloutBox())
   ctaLabel  — optional bold button label; letter-spaced, uppercased by style
   ctaUrl    — optional; the button only renders when both label + url are present
   footerHtml— optional footer block (trusted HTML; e.g. reward + log-in/opt-out)
   preheader — optional hidden inbox-preview line */
function emailLayout(opts) {
  const o = opts || {};
  const heading = o.heading;
  const bodyHtml = o.bodyHtml || "";
  const ctaLabel = o.ctaLabel;
  const ctaUrl = o.ctaUrl;
  const footerHtml = o.footerHtml || "";
  const preheader = o.preheader;

  const wordmark =
    '<a href="https://www.observanthq.com" style="text-decoration:none">' +
      '<span style="font-family:' + FONT + ';font-size:19px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:' + RUST + '">Observant</span>' +
    '</a>';

  const head = heading
    ? '<h1 style="margin:0 0 16px;font-family:' + FONT + ';font-size:22px;line-height:1.3;font-weight:700;color:' + INK + '">' + esc(heading) + '</h1>'
    : "";

  const cta = (ctaUrl && ctaLabel)
    ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 6px"><tr>' +
        '<td align="center" bgcolor="' + RUST + '" style="border-radius:8px">' +
          '<a href="' + esc(ctaUrl) + '" style="display:inline-block;padding:15px 34px;font-family:' + FONT + ';font-size:13px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:8px">' + esc(ctaLabel) + '</a>' +
        '</td>' +
      '</tr></table>'
    : "";

  const foot = footerHtml
    ? '<div style="margin-top:22px">' + footerHtml + '</div>'
    : "";

  const pre = preheader
    ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">' + esc(preheader) + '</div>'
    : "";

  return '<!doctype html><html><head>' +
      '<meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="color-scheme" content="light only">' +
    '</head>' +
    '<body style="margin:0;padding:0;background:' + BG + '">' + pre +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + BG + ';margin:0;padding:0">' +
        '<tr><td align="center" style="padding:30px 16px">' +
          '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto">' +
            '<tr><td style="padding:2px 6px 18px 6px">' + wordmark + '</td></tr>' +
            '<tr><td style="background:#ffffff;border:1px solid ' + CARD_BORDER + ';border-radius:14px;padding:34px 34px 30px 34px">' +
              head +
              '<div style="font-family:' + FONT + ';font-size:15px;line-height:1.62;color:' + INK + '">' + bodyHtml + '</div>' +
              cta +
              foot +
            '</td></tr>' +
            '<tr><td style="padding:16px 6px 4px 6px;font-family:' + FONT + ';font-size:11px;line-height:1.5;color:' + MUTED + '">Observant — user learning on autopilot</td></tr>' +
          '</table>' +
        '</td></tr>' +
      '</table>' +
    '</body></html>';
}

module.exports = { emailLayout, questionBlock, calloutBox, paragraphs, esc };
