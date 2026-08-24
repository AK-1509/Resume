/**
 * DEV ONLY — capture checkpoint screenshots at the two review viewports.
 *
 * Usage: npx tsx scripts/dev/shoot.ts [baseUrl]
 * Writes to .screenshots/ (git-ignored).
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

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

    await page.screenshot({ path: join(OUT, `${vp.name}-full.png`), fullPage: true });
    await page.screenshot({ path: join(OUT, `${vp.name}-fold.png`) });

    // Horizontal overflow is the failure this layout is most likely to have.
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
