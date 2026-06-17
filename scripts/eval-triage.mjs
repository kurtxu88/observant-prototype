/* Triage eval runner — scores C0's deep/light calls against the ground-truth set.
   Usage: node scripts/eval-triage.mjs [baseUrl]
   Default base: https://observant-prototype.vercel.app  */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const base = process.argv[2] || "https://observant-prototype.vercel.app";
const here = dirname(fileURLToPath(import.meta.url));
const set = JSON.parse(readFileSync(join(here, "..", "mvp", "conversation-logic", "triage-evalset.json"), "utf8"));

async function triage(q) {
  const r = await fetch(base + "/api/selfserve/interview", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "triage", product: set.product || "Acme", question: q }),
  });
  return r.json();
}

let pass = 0;
const fails = [];
for (const c of set.cases) {
  let got = "?", why = "";
  try { const d = await triage(c.q); got = d.mode || "?"; why = d.rationale || ""; } catch (e) { got = "ERR:" + e.message; }
  const ok = got === c.expect;
  if (ok) pass++; else fails.push({ ...c, got, why });
  console.log(`${ok ? "✓" : "✗"}  expect ${c.expect.padEnd(5)} got ${String(got).padEnd(5)}  ${c.q}`);
}
console.log(`\nScore: ${pass}/${set.cases.length}`);
if (fails.length) {
  console.log("\nMISSES:");
  for (const f of fails) console.log(`  [${f.expect}→${f.got}] ${f.q}\n     why-it-said: ${String(f.why).slice(0, 160)}`);
}
