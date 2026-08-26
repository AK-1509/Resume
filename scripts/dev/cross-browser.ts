/**
 * DEV ONLY — the same critical paths in Chromium, Firefox and WebKit.
 *
 * Usage: npx tsx scripts/dev/cross-browser.ts [baseUrl]
 *
 * Targets the features most likely to differ between engines rather than
 * re-running everything: native <dialog> and its ::backdrop, nested dialog ESC
 * ordering, color-mix() in the dark theme, CSS filter duotone, the history API
 * filter sync, and clamp()/aspect-ratio layout.
 */
import { chromium, firefox, webkit, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { busiestSkill, entryWithGallery, matchCount, openableEntry } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

let failures = 0;
function check(engine: string, label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function run(name: string, browser: Browser) {
  console.log(`\n  ${name}\n`);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page: Page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // --- Fonts and layout ---------------------------------------------------
  const layout = await page.evaluate(() => {
    const h1 = document.querySelector("h1")!;
    const s = getComputedStyle(h1);
    return {
      serif: s.fontFamily.split(",")[0].replace(/"/g, ""),
      heroPx: parseFloat(s.fontSize),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check(name, "display face loads", layout.serif === "Cormorant Garamond", layout.serif);
  check(name, "clamp() hero sizing", layout.heroPx > 48, `${layout.heroPx}px`);
  check(name, "no horizontal overflow", layout.overflow <= 0, `${layout.overflow}px`);

  // --- Duotone filter -----------------------------------------------------
  // Only meaningful when the content has an image to duotone.
  if (entryWithGallery()) {
    const plate = await page.evaluate(() => {
      const img = document.querySelector("main img");
      return img ? getComputedStyle(img).filter : "none";
    });
    check(name, "duotone filter applies", plate !== "none" && plate !== "", plate.slice(0, 40));
  } else {
    console.log("    SKIP  duotone — no gallery images in content/resume.json");
  }

  // --- Native dialog + nested ESC ordering --------------------------------
  const target = entryWithGallery() ?? openableEntry();
  await page.getByRole("button", { name: target.title, exact: false }).first().click();
  await page.waitForTimeout(400);
  const modalOpen = await page.evaluate(() =>
    [...document.querySelectorAll("dialog")].some((d) => d.open && d.matches(":modal")),
  );
  check(name, "native modal dialog opens", modalOpen);

  if (target.gallery.length > 0) {
    await page.getByRole("button", { name: target.gallery[0].alt, exact: false }).click();
    await page.waitForTimeout(400);
    const both = await page.evaluate(
      () => [...document.querySelectorAll("dialog")].filter((d) => d.open).length,
    );
    check(name, "lightbox stacks", both === 2, `${both} open`);

    await page.keyboard.press("Escape");
    await page.waitForTimeout(350);
    const afterOne = await page.evaluate(
      () => [...document.querySelectorAll("dialog")].filter((d) => d.open).length,
    );
    check(name, "first Escape closes lightbox only", afterOne === 1, `${afterOne} open`);
  } else {
    console.log("    SKIP  lightbox — no entry in content/resume.json has a gallery image");
  }

  await page.keyboard.press("Escape");
  await page.waitForTimeout(350);
  const afterTwo = await page.evaluate(
    () => [...document.querySelectorAll("dialog")].filter((d) => d.open).length,
  );
  check(name, "second Escape closes modal", afterTwo === 0);

  // --- Dark theme via color-mix() -----------------------------------------
  await page.getByRole("banner").getByRole("switch", { name: "Dark mode" }).click();
  await page.waitForTimeout(400);
  const dark = await page.evaluate(() => {
    const card = document.querySelector("main li > button");
    return {
      page: getComputedStyle(document.body).backgroundColor,
      panel: card ? getComputedStyle(card).backgroundColor : "none",
    };
  });
  check(name, "dark page surface", dark.page === "rgb(23, 23, 25)", dark.page);
  // color-mix() must resolve to a real colour, not fall back to transparent.
  check(
    name,
    "color-mix() dark panel resolves",
    dark.panel !== "rgba(0, 0, 0, 0)" && dark.panel !== "none",
    dark.panel,
  );
  await page.getByRole("banner").getByRole("switch", { name: "Dark mode" }).click();
  await page.waitForTimeout(300);

  // --- Filter + history API ----------------------------------------------
  const skill = busiestSkill();
  await page.goto(`${BASE}/?skills=${skill.id}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const lit = await page.evaluate(
    () =>
      [...document.querySelectorAll("main li > button, main li > article")].filter(
        (el) => getComputedStyle(el).borderLeftColor === "rgb(114, 47, 53)",
      ).length,
  );
  check(name, "deep-linked filter lights the rail", lit === matchCount([skill.id]), `${lit} lit, expected ${matchCount([skill.id])}`);

  await page.getByRole("button", { name: `Remove ${skill.label} filter` }).click();
  await page.waitForTimeout(400);
  check(name, "history API clears the filter", !page.url().includes("skills="), page.url());

  check(name, "no uncaught page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await page.screenshot({ path: join(OUT, `cross-${name.toLowerCase()}.png`), fullPage: false });
  await context.close();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [name, type] of [
    ["Chromium", chromium],
    ["Firefox", firefox],
    ["WebKit", webkit],
  ] as const) {
    // Launch inside the try: one engine failing to start must not stop the
    // others from being tested.
    let browser: Browser | null = null;
    try {
      browser = await type.launch();
      await run(name, browser);
    } catch (error) {
      failures++;
      console.log(`\n  ${name}\n`);
      console.log(
        `    FAIL  ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`,
      );
    } finally {
      await browser?.close();
    }
  }
  console.log(failures === 0 ? "\n  cross-browser: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
