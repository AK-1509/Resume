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
import { headlineBehindTheFront, movableRole, roles } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");


/** "March 2024 – Present", as formatDurationLong() writes it. */
const DURATION = /[A-Z][a-z]+ \d{4} – ([A-Z][a-z]+ \d{4}|Present)/;

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

/** 1 — Who is this and what do they do? Target: answered above the fold, 0 clicks. */
async function task1(page: Page, mobile: boolean) {
  const started = Date.now();
  await fresh(page);

  const name = await visible(page, "h1");
  const headline = await visible(page, ".pf-line.is-current .pf-hl__text");
  const proof = await visible(page, ".pf-line.is-current .pf-proof");

  record(
    "1. Who is this and what do they do",
    name === 1 && (headline > 0.5 || mobile),
    started,
    `0 clicks; name and role ${name === 1 ? "in" : "NOT in"} the first viewport; current headline ${
      headline > 0.5 ? "in view" : "below the fold"
    }${proof > 0.5 ? " with its proof" : ""}${mobile && headline <= 0.5 ? " (one scroll on a phone)" : ""}`,
  );
}

/**
 * 2 — Find the evidence behind a headline, and how long it ran. Target: the
 * card lands in view with no hunting. On a phone its media sits above the
 * title, so the title itself may be one scroll further; that is reported.
 */
async function task2(page: Page) {
  const started = Date.now();
  await fresh(page);
  const target = headlineBehindTheFront();

  // The drum rolls on its own; pick the headline through its segment, which a
  // reader can see and click, then follow the call to action.
  await page.getByRole("button", { name: `Headline ${target.position}:` }).click();
  await page.getByRole("link", { name: `Open the ${target.shortName} card` }).click();
  await settle(page);

  const card = `#${target.role.id} .pf-slot.is-active`;
  const front = await page.locator(`${card} h3`).innerText();
  const cardTop = await page.evaluate((sel) => document.querySelector(sel)!.getBoundingClientRect().top, card);
  const cardInView = cardTop >= 0 && cardTop < page.viewportSize()!.height;
  const titleInView = await visible(page, `${card} h3`);
  const meta = await page.locator(`${card} .pf-meta`).innerText();

  record(
    "2. Evidence behind a headline, and its dates",
    front === target.title && cardInView && DURATION.test(meta),
    started,
    `2 clicks (segment, then the call to action); "${front}" at the front of ${target.role.label}, card ${
      cardInView ? "in view" : "NOT in view"
    }${titleInView === 1 ? " with its title" : ", title one scroll down"}; ${DURATION.test(meta) ? `dates on the card: ${meta.match(DURATION)![0]}` : "no dates on the card"}`,
  );
}

/** 3 — Browse one role from the index and come back. Target: no dead ends. */
async function task3(page: Page) {
  const started = Date.now();
  await fresh(page);
  // Not the first role: that one is already current at the top of the page,
  // so landing on it would not show the index responding.
  const role = roles.slice(1).find((r) => r.titles.length > 1) ?? movableRole();

  await page.locator(".druid-index").getByRole("link", { name: role.label }).click();
  await settle(page);
  const current = await page.evaluate(
    () => document.querySelector(".druid-index a[aria-current='location']")?.getAttribute("href") ?? "",
  );
  const headingInView = await visible(page, `#${role.id}-title`);

  const section = page.locator(`section#${role.id}`);
  await section.getByRole("button", { name: /^Next:/ }).click();
  await page.waitForTimeout(400);
  const second = await section.locator(".pf-slot.is-active h3").innerText();

  await section.getByRole("link", { name: "Back to the role index" }).click();
  await settle(page);
  const indexInView = await visible(page, ".druid-index");

  const ok = current === `#${role.id}` && headingInView === 1 && second === role.titles[1] && indexInView > 0.5;
  record(
    "3. Browse a role from the index and return",
    ok,
    started,
    `3 clicks; ${headingInView === 1 ? "heading in view" : "heading NOT in view"}, index marks ${current || "nothing"}; Next showed "${second}"; ${
      indexInView > 0.5 ? "back at the index" : "index NOT in view after Back"
    }`,
  );
}

/** 4 — Export a two-experience resume as a PDF. Target: <60s. */
async function task4(page: Page) {
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
    "4. Export a two-experience PDF",
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
  await task1(page, mobile);
  await task2(page);
  await task3(page);
  await task4(page);
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
