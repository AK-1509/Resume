/**
 * DEV ONLY — capture checkpoint screenshots.
 *
 * Usage: npx tsx scripts/dev/shoot.ts [baseUrl]
 * Writes to .screenshots/ (git-ignored).
 */
import { chromium, devices, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

/**
 * Drives the real switch rather than poking documentElement, so the knob
 * position in the screenshot reflects what a visitor would actually see.
 */
async function setTheme(page: Page, theme: "light" | "dark") {
  const toggle = page.getByRole("banner").getByRole("switch", { name: "Dark mode" });
  const checked = (await toggle.getAttribute("aria-checked")) === "true";
  if (checked !== (theme === "dark")) await toggle.click();
  await page.waitForTimeout(250);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      ...(vp.name === "mobile" ? devices["iPhone 13"] : {}),
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    for (const theme of ["light", "dark"] as const) {
      await setTheme(page, theme);
      await page.screenshot({ path: join(OUT, `${vp.name}-${theme}.png`), fullPage: true });
    }

    // The modal and lightbox, in the theme that shows each best.
    await setTheme(page, "light");
    await page.getByRole("button", { name: /Software Engineering Intern/ }).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `${vp.name}-modal.png`) });

    await page.getByRole("button", { name: /rebuilt report builder/ }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, `${vp.name}-lightbox.png`) });
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    console.log(`  ${vp.name.padEnd(8)} ${vp.width}x${vp.height}  overflow=${overflow}px`);

    await context.close();
  }

  await browser.close();
  console.log(`\n  written to .screenshots/\n`);
}

main();
