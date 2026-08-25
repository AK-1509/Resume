/**
 * DEV ONLY — how much JavaScript a reader downloads, and how much waits until
 * it is actually needed.
 *
 * Usage: npx tsx scripts/dev/bundle.ts [baseUrl]
 *
 * Run against a production deployment; dev-server numbers include the devtools
 * bundle and unminified sources, so they mean nothing.
 */
import { chromium } from "@playwright/test";

const BASE = process.argv[2] ?? "https://resume-phi-roan.vercel.app";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const files: { name: string; bytes: number }[] = [];

  page.on("response", async (r) => {
    if (!r.url().endsWith(".js")) return;
    try {
      const body = await r.body();
      files.push({ name: r.url().split("/").pop() ?? r.url(), bytes: body.length });
    } catch {
      /* redirects and cached responses have no body */
    }
  });

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const initial = files.reduce((n, f) => n + f.bytes, 0);
  const initialCount = files.length;
  console.log(`\n  initial JS   ${(initial / 1024).toFixed(0).padStart(5)} KiB  (${initialCount} files)`);
  for (const f of [...files].sort((a, b) => b.bytes - a.bytes).slice(0, 4)) {
    console.log(`    ${(f.bytes / 1024).toFixed(0).padStart(5)} KiB  ${f.name}`);
  }

  await page.getByRole("button", { name: "Export resume" }).first().click();
  await page.waitForTimeout(2000);
  const afterDialog = files.reduce((n, f) => n + f.bytes, 0);
  console.log(
    `\n  + export dialog ${((afterDialog - initial) / 1024).toFixed(0).padStart(4)} KiB  (${files.length - initialCount} files)`,
  );

  await page.getByRole("tab", { name: "Preview" }).click();
  await page.waitForTimeout(800);
  const before = files.length;
  const afterPreview = files.reduce((n, f) => n + f.bytes, 0);

  await Promise.all([
    page.waitForEvent("download", { timeout: 45_000 }).catch(() => null),
    page.getByRole("button", { name: /Download PDF/ }).click(),
  ]);
  await page.waitForTimeout(1500);
  const afterPdf = files.reduce((n, f) => n + f.bytes, 0);
  console.log(
    `  + PDF renderer  ${((afterPdf - afterPreview) / 1024).toFixed(0).padStart(4)} KiB  (${files.length - before} files, only on download)`,
  );
  console.log(`\n  total if you export: ${(afterPdf / 1024).toFixed(0)} KiB\n`);

  await browser.close();
}

main();
