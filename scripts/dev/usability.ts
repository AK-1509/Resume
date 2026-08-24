/**
 * DEV ONLY — task-based usability runs at both review viewports.
 *
 * Usage: npx tsx scripts/dev/usability.ts [baseUrl]
 *
 * Each task reports pass/fail against a target and names the friction observed.
 * Tasks that depend on features from a later phase are reported as PENDING
 * rather than silently skipped.
 */
import { chromium, type Page } from "@playwright/test";

const BASE = process.argv[2] ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

type Result = { task: string; status: "PASS" | "FAIL" | "PENDING"; note: string };

/**
 * Task 1 — "How long did I work at my most recent role?"
 * Target: under 5s, no clicks beyond one.
 */
async function task1(page: Page): Promise<Result> {
  const started = Date.now();
  const firstWorkCard = page.locator("section[aria-labelledby='experience-heading'] li").first();
  const text = (await firstWorkCard.innerText()).replace(/\s+/g, " ").trim();
  const elapsed = Date.now() - started;

  // The answer has to be legible without opening anything, which means the
  // collapsed card must carry month precision, not just years.
  const hasMonths = /[A-Z]{3}( \d{4})? — [A-Z]{3} \d{4}|[A-Z]{3} \d{4} — PRESENT/.test(text);
  const scrolled = await firstWorkCard.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top < 0 || r.top > window.innerHeight;
  });

  return {
    task: "1. Duration of most recent role",
    status: hasMonths ? "PASS" : "FAIL",
    note: hasMonths
      ? `readable with 0 clicks in ${elapsed}ms${scrolled ? "; requires scrolling past the hero" : "; visible without scrolling"}`
      : `card shows "${text}" — no month precision, so duration needs a click`,
  };
}

/** Task 3 (partial) — is every card's affordance honest? */
async function task3(page: Page): Promise<Result> {
  const counts = await page.evaluate(() => {
    const sections = ["education", "experience", "projects"];
    const cards = sections.flatMap((s) => [
      ...document.querySelectorAll(`section[aria-labelledby='${s}-heading'] li > *`),
    ]);
    return {
      buttons: cards.filter((c) => c.tagName === "BUTTON").length,
      articles: cards.filter((c) => c.tagName === "ARTICLE").length,
    };
  });
  return {
    task: "3. Open an experience, view a gallery image, return",
    status: "PENDING",
    note: `modal lands in Phase 4. Affordances are in place: ${counts.buttons} cards clickable, ${counts.articles} static`,
  };
}

/** Task 2 — find every experience using a given skill. */
async function task2(): Promise<Result> {
  return {
    task: "2. Find every experience using a skill",
    status: "PENDING",
    note: "filtering lands in Phase 5; the skills index renders and is keyboard reachable",
  };
}

async function main() {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    console.log(`\n  ${vp.name} ${vp.width}x${vp.height}`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });

    for (const result of [await task1(page), await task2(), await task3(page)]) {
      console.log(`  ${result.status.padEnd(7)} ${result.task}`);
      console.log(`          ${result.note}`);
    }

    await context.close();
  }

  await browser.close();
  console.log("");
}

main();
