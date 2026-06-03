/* ============================================================
   EDDA app — shared UI primitives + icons
   Exposed on window for cross-file use (Babel scopes per script)
   ============================================================ */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- icons (simple line set) ---------- */
function Icon({ name, size = 18, sw = 1.8 }) {
  const p = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round",
  };
  const paths = {
    arrow:   <path d="M5 12h14M13 6l6 6-6 6" />,
    back:    <path d="M19 12H5M11 18l-6-6 6-6" />,
    check:   <path d="M20 6 9 17l-5-5" />,
    plus:    <g><path d="M12 5v14M5 12h14" /></g>,
    x:       <path d="M18 6 6 18M6 6l12 12" />,
    grid:    <g><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></g>,
    spark:   <g><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 8a4 4 0 0 0 0 8 4 4 0 0 0 0-8Z"/></g>,
    users:   <g><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.2"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></g>,
    chat:    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />,
    relay:   <g><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="m22 7-10 5L2 7l10-5 10 5Z"/></g>,
    settings:<g><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></g>,
    link:    <g><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></g>,
    globe:   <g><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></g>,
    mail:    <g><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></g>,
    phone:   <g><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></g>,
    bolt:    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
    clock:   <g><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g>,
    calendar:<g><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></g>,
    video:   <g><path d="m23 7-7 5 7 5V7Z"/><rect x="1" y="5" width="15" height="14" rx="2"/></g>,
    search:  <g><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></g>,
    book:    <g><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></g>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}

/* ---------- avatar ---------- */
const AVA_COLORS = {
  rust: "oklch(0.60 0.11 30)", green: "oklch(0.55 0.09 150)", blue: "oklch(0.54 0.10 260)",
  plum: "oklch(0.52 0.10 330)", gold: "oklch(0.62 0.10 75)", teal: "oklch(0.55 0.08 200)",
};
function Avatar({ name, color = "rust", cls = "conv-ava", style = {} }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  return <span className={cls} style={{ background: AVA_COLORS[color] || color, ...style }}>{initials}</span>;
}

/* ---------- wordmark ---------- */
function Wordmark({ size }) {
  return (
    <span className="wordmark" style={size ? { fontSize: size } : null}>
      edda<span className="dot" />
    </span>
  );
}

/* ---------- button ---------- */
function Btn({ variant = "primary", size, children, className = "", ...rest }) {
  const sz = size === "sm" ? " btn-sm" : size === "lg" ? " btn-lg" : "";
  return <button className={`btn btn-${variant}${sz} ${className}`} {...rest}>{children}</button>;
}

Object.assign(window, { Icon, Avatar, Wordmark, Btn, AVA_COLORS });
