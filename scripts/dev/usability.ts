/**
 * DEV ONLY — task-based usability runs at both review viewports.
 *
 * Usage: npx tsx scripts/dev/usability.ts [baseUrl]
 *
 * Each task reports pass/fail against its target, plus the friction observed —
 * the timing alone doesn't say whether the path was pleasant.
 */
import { chromium, devices, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { caseStudies, laterCaseStudy, laterProject, projects } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

type Result = { task: string; ok: boolean; took: string; note: string };
const results: Result[] = [];

function record(task: string, ok: boolean, started: number, note: string) {
  results.push({ task, ok, took: `${((Date.now() - started) / 1000).toFixed(1)}s`, note });
}

/** Wait for the page's smooth scroll to finish: scrollY unchanged across two reads. */
async function settle(page: Page) {
  await page.waitForTimeout(200);
  let last = -1;
  for (let i = 0; i < 40; i++) {
    const y = await page.evaluate(() => window.scrollY);
    if (y === last) return;
    last = y;
    await page.waitForTimeout(120);
  }
}

async function fresh(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

/** How much of an element is inside the viewport, 0–1. */
const visible = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const shown = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
    return r.height > 0 ? Math.max(0, shown) / r.height : 0;
  }, selector);

const heading = (page: Page) => page.evaluate(() => document.querySelector("h1")?.textContent?.trim() ?? "");

/** 1 — Who is this and what do they do? Target: answered on the first screen, 0 clicks. */
async function task1(page: Page) {
  const started = Date.now();
  await fresh(page);

  const name = await visible(page, "h1");
  const sub = await visible(page, ".pf-sub");
  const action = await visible(page, ".pf-hero__actions .druid-button");

  record(
    "1. Who is this and what do they do",
    name === 1 && action === 1,
    started,
    `0 clicks; name and role ${name === 1 ? "in" : "NOT in"} the first viewport${sub === 1 ? " with the sub-line" : ""}; "See the projects" ${
      action === 1 ? "in view" : "below the fold"
    }`,
  );
}

/** 2 — Open a project from the first screen. Target: two clicks. */
async function task2(page: Page) {
  const started = Date.now();
  await fresh(page);
  const first = projects[0];

  await page.getByRole("link", { name: "See the projects" }).click();
  await settle(page);
  const entryInView = await visible(page, `#${first.anchor}`);
  await page.locator(`#${first.anchor} a`).click();
  await page.waitForURL(`**${first.href}`, { timeout: 10_000 }).catch(() => null);
  const h1 = await heading(page);

  record(
    "2. Open a project from the first screen",
    h1 === first.title,
    started,
    `2 clicks ("See the projects", then "${first.title}"); entry ${entryInView > 0.5 ? "in view" : "NOT in view"} after the first; landed on "${h1}"`,
  );
}

/** 3 — Reach a project well down the list through the Index. Target: no hunting. */
async function task3(page: Page) {
  const started = Date.now();
  await fresh(page);
  const target = laterProject();

  // A tap or click on the tab opens the dock on any device; hover is a bonus.
  await page.locator(".pf-dock__tab").click();
  await page.locator(".pf-dock__panel").getByRole("link", { name: target.title }).click();
  await settle(page);
  const current = await page.evaluate(
    () => document.querySelector(".druid-index a[aria-current='location']")?.getAttribute("href") ?? "",
  );
  const titleInView = await visible(page, `#${target.slug}-entry-title`);
  await page.locator(`#${target.anchor} a`).click();
  await page.waitForURL(`**${target.href}`, { timeout: 10_000 }).catch(() => null);
  const h1 = await heading(page);

  record(
    "3. Reach a later project through the Index",
    current === `#${target.anchor}` && titleInView === 1 && h1 === target.title,
    started,
    `3 clicks; Index marks ${current || "nothing"}, title ${titleInView === 1 ? "in view" : "NOT in view"}; landed on "${h1}"`,
  );
}

/** 3b — Reach a case study through the Index, open it, and find the next one. Target: no hunting. */
async function task3b(page: Page) {
  const target = laterCaseStudy();
  if (!target) return;
  const started = Date.now();
  await fresh(page);

  await page.locator(".pf-dock__tab").click();
  await page.locator(".pf-dock__panel").getByRole("link", { name: target.title }).click();
  await settle(page);
  const current = await page.evaluate(
    () => document.querySelector(".druid-index a[aria-current='location']")?.getAttribute("href") ?? "",
  );
  const rowInView = await visible(page, `#${target.anchor}`);
  await page.getByRole("link", { name: target.title, exact: true }).and(page.locator(".cs-row")).click();
  await page.waitForURL(`**${target.href}`, { timeout: 10_000 }).catch(() => null);
  const h1 = await heading(page);
  const i = caseStudies.indexOf(target);
  const next = caseStudies[(i + 1) % caseStudies.length];
  const nextLink = await page.getByRole("link", { name: `Next case study: ${next.title}` }).count();

  record(
    "3b. Reach a case study through the Index",
    current === `#${target.anchor}` && rowInView === 1 && h1 === target.title && nextLink === 1,
    started,
    `3 clicks; Index marks ${current || "nothing"}, row ${rowInView === 1 ? "in view" : "NOT in view"}; landed on "${h1}"; "Next case study" ${
      nextLink === 1 ? `leads to "${next.title}"` : "NOT found"
    }`,
  );
}

/** 4 — From one project to the next, then back to the portfolio. Target: no dead ends. */
async function task4(page: Page) {
  const started = Date.now();
  const [a, b] = projects;
  await page.goto(`${BASE}${a.href}`, { waitUntil: "networkidle" });

  await page.getByRole("link", { name: `Next project: ${b.title}` }).click();
  await page.waitForURL(`**${b.href}`, { timeout: 10_000 }).catch(() => null);
  const second = await heading(page);

  await page.getByRole("link", { name: "Back to the portfolio" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 10_000 }).catch(() => null);
  await page.waitForLoadState("networkidle");
  const home = await page.evaluate(() => location.pathname === "/" && Boolean(document.getElementById("projects")));

  record(
    "4. Next project, then back to the portfolio",
    second === b.title && home,
    started,
    `2 clicks; "Next project" showed "${second}"; ${home ? "back on the portfolio" : "did NOT get back to the portfolio"}`,
  );
}

/** 5 — Export a two-experience resume as a PDF. Target: <60s. */
async function task5(page: Page) {
  const started = Date.now();
  await fresh(page);

  await page.getByRole("button", { name: "Export resume" }).first().click();
  await page.waitForTimeout(500);

  const boxes = page.locator("dialog[aria-labelledby='export-title'] fieldset input[type=checkbox]");
  const n = await boxes.count();
  for (let i = 2; i < n; i++) {
    const box = boxes.nth(i);
    if (await box.isChecked()) await box.uncheck();
  }

  await page.getByRole("tab", { name: "Preview" }).click();
  await page.waitForTimeout(600);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 45_000 }).catch(() => null),
    page.getByRole("button", { name: /Download PDF/ }).click(),
  ]);

  const took = (Date.now() - started) / 1000;
  record(
    "5. Export a two-experience PDF",
    download !== null && took < 60,
    started,
    download
      ? `${download.suggestedFilename()}; renderer loaded on demand at this point`
      : "no download produced",
  );
}

async function run(browser: Browser, name: string, mobile: boolean) {
  const context = await browser.newContext({
    ...(mobile ? devices["iPhone 13"] : {}),
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    acceptDownloads: true,
  });
  const page = await context.newPage();

  results.length = 0;
  await task1(page);
  await task2(page);
  await task3(page);
  await task3b(page);
  await task4(page);
  await task5(page);
  await fresh(page);
  await page.screenshot({ path: join(OUT, `usability-${mobile ? "mobile" : "desktop"}.png`) });

  console.log(`\n  ${name}\n`);
  for (const r of results) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.took.padStart(6)}  ${r.task}`);
    console.log(`                 ${r.note}`);
  }
  const failed = results.filter((r) => !r.ok).length;

  await context.close();
  return failed;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let failures = 0;
  failures += await run(browser, "desktop 1440x900", false);
  failures += await run(browser, "mobile 390x844", true);
  await browser.close();
  console.log(failures === 0 ? "\n  usability: all tasks pass\n" : `\n  ${failures} task(s) failed\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
