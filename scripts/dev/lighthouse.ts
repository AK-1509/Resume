/**
 * DEV ONLY — summarise a Lighthouse JSON report.
 *
 * The run itself goes through the Lighthouse CLI rather than its node API,
 * because tsx's esbuild transform injects a `__name` helper into functions
 * Lighthouse stringifies and evaluates inside the page, which fails there:
 *
 *   CHROME_PATH="...chrome.exe" npx lighthouse <url> --preset=desktop --quiet \
 *     --chrome-flags="--headless=new" --output=json --output=html \
 *     --output-path=.screenshots/lighthouse-desktop
 *
 * Then: npx tsx scripts/dev/lighthouse.ts .screenshots/lighthouse-desktop.report.json
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Audit = {
  id: string;
  title: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue?: string;
};

type Report = {
  requestedUrl: string;
  categories: Record<string, { title: string; score: number | null }>;
  audits: Record<string, Audit>;
};

const file = resolve(process.argv[2] ?? ".screenshots/lighthouse-desktop.report.json");
const lhr: Report = JSON.parse(readFileSync(file, "utf8"));

console.log(`\n  ${lhr.requestedUrl}\n`);

for (const cat of Object.values(lhr.categories)) {
  const score = Math.round((cat.score ?? 0) * 100);
  console.log(`  ${String(score).padStart(3)}  ${cat.title}`);
}

console.log("");
for (const id of [
  "first-contentful-paint",
  "largest-contentful-paint",
  "cumulative-layout-shift",
  "total-blocking-time",
  "speed-index",
]) {
  const audit = lhr.audits[id];
  if (audit) console.log(`  ${audit.title.padEnd(32)} ${audit.displayValue ?? ""}`);
}

// Name every audit that scored below full marks — a category score of 100 can
// still hide a rounded-up failure.
const failed = Object.values(lhr.audits).filter(
  (a) => a.score !== null && a.score < 1 && a.scoreDisplayMode !== "informative",
);

if (failed.length === 0) {
  console.log("\n  every scored audit is at 100.\n");
} else {
  console.log(`\n  ${failed.length} audit(s) below 100:\n`);
  for (const a of failed) {
    console.log(`    ${a.title}${a.displayValue ? ` — ${a.displayValue}` : ""}`);
  }
  console.log("");
}
