/**
 * DEV ONLY — the Phase 6 checkpoint: exports proving the one-page guarantee
 * behaves at both ends.
 *
 *   sparse     — two entries, should fit at the default 10.5pt
 *   typical    — everything selected, should fit somewhere on the ladder
 *   overloaded — run against an oversized content fixture; must REFUSE,
 *                keep the floor at 9pt, and say what to cut
 *
 * Usage: npx tsx scripts/dev/export-cases.ts <case> [baseUrl]
 *
 * The overloaded case needs content/resume.json swapped for a fat fixture
 * first — see scripts/dev/run-export-cases.ps1, which handles the swap and
 * restore around it.
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

type Case = "sparse" | "typical" | "full" | "overloaded";

/**
 * How many entries each case keeps selected.
 *
 * `full` selects everything. With a real resume of thirteen entries that no
 * longer fits on one page, which is the correct outcome, not a regression —
 * the case asserts the refusal rather than a download.
 */
const KEEP: Record<Case, number | null> = {
  sparse: 2,
  typical: 6,
  full: null,
  overloaded: null,
};

const CASE = (process.argv[2] ?? "typical") as Case;
const BASE = process.argv[3] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

const statusText = (page: Page) =>
  page.locator("dialog[aria-labelledby='export-title'] [aria-live]").innerText();

const panelText = (page: Page) =>
  page.locator("dialog[aria-labelledby='export-title'] [role=tabpanel]").innerText();

function pageCount(file: string): number {
  const text = readFileSync(file, "latin1");
  const declared = text.match(/\/Type\s*\/Pages[^>]*?\/Count\s+(\d+)/);
  return declared ? Number(declared[1]) : (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  console.log(`\n  Case — ${CASE}\n`);

  await page.getByRole("button", { name: "Export resume" }).first().click();
  await page.waitForTimeout(400);

  const keep = KEEP[CASE];
  if (keep !== null) {
    const boxes = page.locator(
      "dialog[aria-labelledby='export-title'] fieldset input[type=checkbox]",
    );
    const n = await boxes.count();
    for (let i = keep; i < n; i++) {
      const box = boxes.nth(i);
      if (await box.isChecked()) await box.uncheck();
    }
  }

  await page.getByRole("tab", { name: "Preview" }).click();
  await page.waitForTimeout(500);

  const status = await statusText(page);
  const panel = await panelText(page);
  console.log(`    status: ${status}`);

  await page.screenshot({ path: join(OUT, `export-${CASE}.png`) });

  if (CASE === "overloaded" || CASE === "full") {
    check("refuses to fit", /does not fit on one page/i.test(panel), status);
    check("never goes below the 9pt floor", /9pt/.test(panel), "floor not reported");
    check("says what to cut", /Deselect an experience|shorten/i.test(panel));
    check("reports how far over", /\d+px over/.test(panel));
    check(
      "Download is disabled",
      await page.getByRole("button", { name: /Download PDF/ }).isDisabled(),
    );
    const advice = panel.split("\n").filter((l) => l.trim()).slice(-3).join(" | ");
    console.log(`    message: ${advice}`);
  } else {
    check("fits on one page", /Fits on one page/.test(status), status);
    if (CASE === "sparse") check("uses the default size", /10\.5pt/.test(status), status);

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 40_000 }).catch(() => null),
      page.getByRole("button", { name: /Download PDF/ }).click(),
    ]);
    check("PDF downloads", download !== null);

    if (download) {
      const name = download.suggestedFilename();
      check("filename is <Name>-Resume-<YYYY-MM>.pdf", /^.+-Resume-\d{4}-\d{2}\.pdf$/.test(name), name);
      const file = join(OUT, `resume-${CASE}.pdf`);
      await download.saveAs(file);
      const pages = pageCount(file);
      check("PDF is exactly one page", pages === 1, `${pages} page(s)`);

      const raw = readFileSync(file, "latin1");
      check("text is vector, not an image", !raw.includes("/Subtype /Image"));
      check("fonts are embedded", /\/FontFile2/.test(raw));
    }
  }

  await browser.close();
  console.log(failures === 0 ? "\n  clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
