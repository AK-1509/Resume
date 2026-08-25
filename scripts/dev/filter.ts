/**
 * DEV ONLY — the Phase 5 checkpoint: skills filter behaviour.
 *
 * Usage: npx tsx scripts/dev/filter.ts [baseUrl]
 */
import { chromium, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");
const ROOT = resolve(import.meta.dirname, "..", "..");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

type Resume = {
  skills: { id: string; label: string }[];
  experiences: { id: string; endorsedSkills: string[] }[];
};

const resume: Resume = JSON.parse(readFileSync(join(ROOT, "content", "resume.json"), "utf8"));

/** Independent expectation, computed from the JSON rather than from the page. */
function expectedMatches(ids: string[]): number {
  return resume.experiences.filter((e) => ids.every((id) => e.endorsedSkills.includes(id))).length;
}

const bubble = (page: Page, label: string) =>
  page.locator("#skills-heading").locator("..").getByRole("button", { name: label, exact: false });

async function counts(page: Page) {
  return page.evaluate(() => ({
    cards: document.querySelectorAll("main li > button, main li > article").length,
    stubs: document.querySelectorAll("main li > div").length,
    lit: [...document.querySelectorAll("main li > button, main li > article")].filter((el) => {
      const c = getComputedStyle(el).borderLeftColor;
      return c === "rgb(114, 47, 53)"; // claret
    }).length,
  }));
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  // ---------------------------------------------------------------- basics
  console.log("\n  Filtering\n");
  await page.goto(BASE, { waitUntil: "networkidle" });

  const atRest = await counts(page);
  check("nothing is lit at rest", atRest.lit === 0, `${atRest.lit} lit`);
  check("no stubs at rest", atRest.stubs === 0, `${atRest.stubs} stubs`);

  await bubble(page, "PYTHON").click();
  await page.waitForTimeout(400);

  const expectedPython = expectedMatches(["python"]);
  const afterPython = await counts(page);
  check(
    "matching cards are lit",
    afterPython.lit === expectedPython,
    `${afterPython.lit} lit, expected ${expectedPython}`,
  );
  check(
    "non-matching entries collapse to stubs",
    afterPython.stubs === resume.experiences.length - expectedPython,
    `${afterPython.stubs} stubs`,
  );
  check(
    "every entry is still on the page",
    afterPython.lit + afterPython.stubs === resume.experiences.length,
    `${afterPython.lit + afterPython.stubs} of ${resume.experiences.length}`,
  );

  // ------------------------------------------------------------- URL sync
  console.log("\n  URL and history\n");
  check("URL carries the filter", page.url().includes("skills=python"), page.url());

  await bubble(page, "DATA VISUALIZATION").click();
  await page.waitForTimeout(400);
  const expectedBoth = expectedMatches(["python", "data-visualization"]);
  const afterBoth = await counts(page);
  check(
    "AND logic — both skills required",
    afterBoth.lit === expectedBoth,
    `${afterBoth.lit} lit, expected ${expectedBoth}`,
  );
  check("URL carries both", /skills=python%2Cdata-visualization|skills=python,data-visualization/.test(page.url()), page.url());

  await page.goBack();
  await page.waitForTimeout(400);
  const afterBack = await counts(page);
  check("Back restores the previous filter", afterBack.lit === expectedPython, `${afterBack.lit} lit`);

  // --------------------------------------------------- shareable deep link
  await page.goto(`${BASE}/?skills=react,typescript`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const deep = await counts(page);
  check(
    "a shared URL loads filtered",
    deep.lit === expectedMatches(["react", "typescript"]),
    `${deep.lit} lit, expected ${expectedMatches(["react", "typescript"])}`,
  );

  const pressed = await page.evaluate(
    () => document.querySelectorAll("[aria-pressed='true']").length,
  );
  check("bubbles reflect the URL state", pressed === 2, `${pressed} pressed`);

  // --------------------------------------------------------- garbage input
  await page.goto(`${BASE}/?skills=not-a-skill`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const garbage = await counts(page);
  check("unknown skill ids are ignored", garbage.lit === 0 && garbage.stubs === 0, JSON.stringify(garbage));

  // ------------------------------------------------------------ empty state
  console.log("\n  Empty state\n");
  await page.goto(`${BASE}/?skills=figma,mentorship`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const emptyVisible = await page.getByText("No experiences match all selected skills.").isVisible();
  check("empty state shows", emptyVisible);

  const advice = await page.locator("main").innerText();
  const relaxMatch = advice.match(/Removing (.+?) would show (\d+) experiences?\./);
  check("names a skill to drop and the count", relaxMatch !== null, relaxMatch?.[0] ?? "no advice found");
  if (relaxMatch) {
    console.log(`          "${relaxMatch[0]}"`);
    const skill = resume.skills.find((s) => s.label === relaxMatch[1]);
    const remaining = ["figma", "mentorship"].filter((id) => id !== skill?.id);
    check(
      "the promised count is correct",
      Number(relaxMatch[2]) === expectedMatches(remaining),
      `promised ${relaxMatch[2]}, actual ${expectedMatches(remaining)}`,
    );
  }

  await page.screenshot({ path: join(OUT, "filter-empty.png") });

  // Acting on the advice must actually work. Exact match, because the sticky
  // bar's chips are also called "Remove <skill> filter".
  const relaxButton = page.getByRole("button", {
    name: `Remove ${relaxMatch?.[1] ?? ""}`,
    exact: true,
  });
  if (await relaxButton.count()) {
    await relaxButton.click();
    await page.waitForTimeout(400);
    const afterRelax = await counts(page);
    check("acting on the advice produces results", afterRelax.lit > 0, `${afterRelax.lit} lit`);
  }

  // ---------------------------------------------------------- announcement
  console.log("\n  Announcement and sticky bar\n");
  await page.goto(`${BASE}/?skills=python`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const live = await page.locator("[aria-live=polite]").first().innerText();
  check("filter change is announced", /\d+ experiences? match/.test(live), live.trim());

  const barVisible = await page.evaluate(() => {
    const bar = document.querySelector("div.fixed.top-0");
    if (!bar) return false;
    return !bar.hasAttribute("inert");
  });
  check("sticky bar shows while filtering, unscrolled", barVisible);

  await page.screenshot({ path: join(OUT, "filter-active.png") });

  // Removing via the sticky bar chip.
  await page.getByRole("button", { name: /Remove Python filter/ }).click();
  await page.waitForTimeout(400);
  const cleared = await counts(page);
  check("chip × clears the filter", cleared.lit === 0 && cleared.stubs === 0, JSON.stringify(cleared));
  check("URL is cleaned up", !page.url().includes("skills="), page.url());

  await browser.close();
  console.log(failures === 0 ? "\n  filter: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
