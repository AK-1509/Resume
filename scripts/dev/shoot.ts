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
 * Drives the real switch rather than poking documentElement, so the switch
 * label in the screenshot reflects what a visitor would actually see.
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

      // One viewport-sized frame per section, so the depth stacks can be read
      // at their real size rather than shrunk inside a full-page image.
      for (const id of ["top", "product-management", "operations-and-process-improvement", "contact"]) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await page.evaluate((target) => {
          document.getElementById(target)?.scrollIntoView({ block: "start", behavior: "instant" });
        }, id);
        await page.waitForTimeout(250);
        await page.screenshot({ path: join(OUT, `${vp.name}-${theme}-${id}.png`) });
      }
      // The other page of a role, and the index dock opened.
      const role = page.locator("#product-management");
      await role.getByRole("button", { name: /Experience and education/ }).click();
      await role.getByRole("button", { name: /Product Leader/ }).click();
      await page.waitForTimeout(700);
      await page.evaluate(() =>
        document.getElementById("product-management")?.scrollIntoView({ block: "start", behavior: "instant" }),
      );
      await page.waitForTimeout(250);
      await page.screenshot({ path: join(OUT, `${vp.name}-${theme}-experience.png`) });
      await role.getByRole("button", { name: /Side projects/ }).click();
      // Opened from the keyboard: a pointer opens it on hover, which slides
      // the card over the tab, so a click would land on the card.
      await page.getByRole("button", { name: "Index", exact: true }).focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, `${vp.name}-${theme}-index.png`) });
      await page.keyboard.press("Escape");

      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    }

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
