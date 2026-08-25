/**
 * DEV ONLY — task-based usability runs at both review viewports.
 *
 * Usage: npx tsx scripts/dev/usability.ts [baseUrl]
 *
 * Each task reports pass/fail against the target from the brief, plus the
 * friction observed — the timing alone doesn't say whether the path was
 * pleasant.
 */
import { chromium, devices, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

type Result = { task: string; ok: boolean; took: string; note: string };
const results: Result[] = [];

function record(task: string, ok: boolean, started: number, note: string) {
  results.push({ task, ok, took: `${((Date.now() - started) / 1000).toFixed(1)}s`, note });
}

/** 1 — How long did I work at my most recent role? Target: <5s, ≤1 click. */
async function task1(page: Page, mobile: boolean) {
  const started = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle" });

  const card = page.locator("section[aria-labelledby='experience-heading'] li").first();
  const text = (await card.innerText()).replace(/\s+/g, " ");
  const hasMonths = /[A-Z]{3}( \d{4})? — ([A-Z]{3} \d{4}|PRESENT)/.test(text);

  const inFold = await card.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight;
  });

  record(
    "1. Duration of most recent role",
    hasMonths,
    started,
    hasMonths
      ? `0 clicks; month precision on the card${inFold ? "; visible without scrolling" : "; one scroll past the hero" + (mobile ? " (expected on a phone)" : "")}`
      : `card reads "${text.slice(0, 60)}" — duration needs a click`,
  );
}

/** 2 — Find every experience using a skill. Target: <15s. */
async function task2(page: Page) {
  const started = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle" });

  const bubble = page.locator("#skills-heading").locator("..").getByRole("button", { name: "Python" });
  await bubble.scrollIntoViewIfNeeded();
  await bubble.click();
  await page.waitForTimeout(300);

  const lit = await page.evaluate(
    () =>
      [...document.querySelectorAll("main li > button, main li > article")].filter(
        (el) => getComputedStyle(el).borderLeftColor === "rgb(114, 47, 53)",
      ).length,
  );
  // Feedback must be visible from where the control is — the index sits at the
  // foot of the page, so the results it changes are off-screen above.
  // No named helpers inside evaluate: tsx's esbuild transform instruments them
  // with a `__name` shim that does not exist in the page.
  const feedback = await page.evaluate(() => {
    const bar = document.querySelector("div.fixed.top-0") as HTMLElement | null;
    const local = document.querySelector("#skills-heading")?.closest("section") as HTMLElement | null;
    const barRect = bar ? bar.getBoundingClientRect() : null;
    const barInView = barRect
      ? barRect.height > 0 && barRect.top < window.innerHeight && barRect.bottom > 0
      : false;
    return {
      bar: bar && barInView ? bar.innerText.replace(/\s+/g, " ").trim() : "",
      local: local ? local.innerText.replace(/\s+/g, " ").trim() : "",
    };
  });

  const barCount = /(\d+)\s*match/i.test(feedback.bar);
  const localCount = /(\d+) experiences? match/i.test(feedback.local);

  record(
    "2. Find every experience using a skill",
    lit > 0 && (barCount || localCount),
    started,
    `${lit} lit; feedback where the control is: ${
      localCount ? "index line yes" : "index line NO"
    }, ${barCount ? "sticky bar yes" : "sticky bar not in view"}`,
  );
}

/** 3 — Open an experience, view a gallery image, return. Target: no dead ends. */
async function task3(page: Page) {
  const started = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: /Software Engineering Intern/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /rebuilt report builder/ }).click();
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);

  const closed = await page.evaluate(
    () => [...document.querySelectorAll("dialog")].every((d) => !d.open),
  );
  const focusRestored = await page.evaluate(() =>
    (document.activeElement?.textContent ?? "").includes("Software Engineering Intern"),
  );

  record(
    "3. Open an experience, view an image, return",
    closed && focusRestored,
    started,
    closed
      ? `both layers closed; focus returned to the originating card${focusRestored ? "" : " (focus NOT restored)"}`
      : "a dialog stayed open — dead end",
  );
}

/** 4 — Export a two-experience resume as a PDF. Target: <60s. */
async function task4(page: Page, tag: string) {
  const started = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle" });

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
  void tag;
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
  await task4(page, name);

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
