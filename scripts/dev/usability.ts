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
import {
  experienceHeadline,
  movableRole,
  projectHeadline,
  roles,
  type Headline,
} from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

/** "Started March 2024", as formatStartMonth() writes a project's date. */
const STARTED = /Started [A-Z][a-z]+ \d{4}/;

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

/** Where an element's top sits in the viewport, as a fraction of its height (0 = top edge). */
const topIn = (page: Page, selector: string) =>
  page.evaluate((sel) => {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    return r ? { top: r.top, inView: r.top >= 0 && r.top < window.innerHeight } : { top: NaN, inView: false };
  }, selector);

/** The drum rolls on its own; pick a headline through its segment, then follow its call to action. */
async function followHeadline(page: Page, h: Headline) {
  await page.getByRole("button", { name: `Headline ${h.position}:` }).click();
  await page.getByRole("link", { name: h.cta }).click();
  await settle(page);
  // Pages and rows open on short transitions; let them finish before measuring.
  await page.waitForTimeout(700);
}

/**
 * 2 — See the project behind a headline, and when it started. Target: the
 * slide lands in view with no hunting. Below the slide sit its title and
 * dates; if those need a scroll, that is reported as friction.
 */
async function task2(page: Page) {
  const started = Date.now();
  await fresh(page);
  const h = projectHeadline();
  await followHeadline(page, h);

  const scope = `#${h.role.id}`;
  const front = await page.locator(`${scope} .pf-detail__title`).innerText();
  const slide = await topIn(page, `${scope} .pf-slot.is-active`);
  const titleInView = await visible(page, `${scope} .pf-detail__title`);
  const meta = await page.locator(`${scope} .pf-detail .pf-meta`).innerText();

  record(
    "2. The project behind a headline, and its start",
    front === h.title && slide.inView && STARTED.test(meta),
    started,
    `2 clicks (segment, then "${h.cta}"); "${front}" at the front of ${h.role.label}, slide ${
      slide.inView ? "in view" : "NOT in view"
    }${titleInView === 1 ? " with its title" : ", title and dates one scroll down"}; ${
      STARTED.test(meta) ? meta.match(STARTED)![0] : "no start month shown"
    }`,
  );
}

/** 3 — See the job behind a headline, and how long it ran. Target: the open row lands in view. */
async function task3(page: Page) {
  const started = Date.now();
  await fresh(page);
  const h = experienceHeadline();
  await followHeadline(page, h);

  const row = h.href;
  const expanded = await page.locator(`${row} .pf-xp__toggle`).getAttribute("aria-expanded");
  const at = await topIn(page, row);
  const when = await page.locator(`${row} .pf-xp__when`).innerText();
  const pageShown = await page
    .locator(`#${h.role.id} .pf-page--experience`)
    .getAttribute("data-state");

  record(
    "3. The job behind a headline, and how long it ran",
    pageShown === "here" && expanded === "true" && at.inView && DURATION.test(when),
    started,
    `2 clicks (segment, then "${h.cta}"); experience page ${pageShown === "here" ? "showing" : "NOT showing"}, row ${
      expanded === "true" ? "open" : "closed"
    } and ${at.inView ? "in view" : `NOT in view (${Math.round(at.top)}px)`}; ${
      DURATION.test(when) ? when : "no dates on the row"
    }`,
  );
}

/**
 * 4 — Browse one role from the Index: a second project, then its experience
 * page, then back to the top. Target: no dead ends.
 */
async function task4(page: Page) {
  const started = Date.now();
  await fresh(page);
  // Not the first role: arriving there would not show the Index responding
  // to anything but the first scroll.
  const role = roles.slice(1).find((r) => r.hasSwitch && r.projects.length > 1) ?? movableRole();

  // A tap or click on the tab opens the dock on any device; hover is a bonus.
  await page.locator(".pf-dock__tab").click();
  await page.locator(".pf-dock__panel").getByRole("link", { name: role.label }).click();
  await settle(page);
  const current = await page.evaluate(
    () => document.querySelector(".druid-index a[aria-current='location']")?.getAttribute("href") ?? "",
  );
  const headingInView = await visible(page, `#${role.id}-title`);

  const section = page.locator(`section#${role.id}`);
  await section.getByRole("button", { name: "Next project" }).click();
  await page.waitForTimeout(400);
  const second = await section.locator(".pf-detail__title").innerText();

  await section.getByRole("button", { name: "Experience and education" }).click();
  await page.waitForTimeout(700);
  const firstRow = section.locator(".pf-xp > li").first();
  await firstRow.locator(".pf-xp__toggle").click();
  await page.waitForTimeout(500);
  const opened = (await firstRow.locator(".pf-xp__toggle").getAttribute("aria-expanded")) === "true";

  await section.getByRole("link", { name: "Back to the top" }).click();
  await settle(page);
  const heroInView = await visible(page, "h1");

  const ok =
    current === `#${role.id}` &&
    headingInView === 1 &&
    second === role.projects[1].title &&
    opened &&
    heroInView === 1;
  record(
    "4. Browse a role from the Index and return",
    ok,
    started,
    `6 clicks; Index marks ${current || "nothing"}, heading ${headingInView === 1 ? "in view" : "NOT in view"}; Next showed "${second}"; experience row ${
      opened ? "opened" : "did NOT open"
    }; ${heroInView === 1 ? "back at the top" : "hero NOT in view after Back to the top"}`,
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
  await task1(page, mobile);
  await task2(page);
  await task3(page);
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
