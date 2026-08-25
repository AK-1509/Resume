/**
 * DEV ONLY — usability task 5: export a two-experience resume as a PDF using
 * the keyboard alone. No mouse events are dispatched anywhere in this script.
 *
 * Usage: npx tsx scripts/dev/keyboard-export.ts [baseUrl]
 */
import { chromium, type Page } from "@playwright/test";
import { join, resolve } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const alt = [...el.querySelectorAll("img")].map((i) => i.alt).join(" ");
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      name: (el.getAttribute("aria-label") ?? (el.textContent ?? "") + alt).replace(/\s+/g, " ").trim().slice(0, 40),
      type: el.getAttribute("type"),
    };
  });

type Focused = NonNullable<Awaited<ReturnType<typeof focused>>>;

/**
 * Tab until the focused element satisfies the predicate.
 *
 * Takes a predicate rather than a substring because container elements inherit
 * the text of everything inside them — matching loosely on "reorder" lands on
 * the instructions paragraph's scroll container, not on a drag handle.
 */
async function tabUntil(
  page: Page,
  matches: (el: Focused) => boolean,
  limit = 60,
): Promise<boolean> {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const el = await focused(page);
    if (el && matches(el)) return true;
  }
  return false;
}

const named = (needle: string) => (el: Focused) =>
  el.tag === "button" && el.name.toLowerCase().includes(needle.toLowerCase());

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  console.log("\n  Task 5 — export two experiences, keyboard only\n");
  const started = Date.now();

  check("export button reachable by Tab", await tabUntil(page, named("Export resume")));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("dialog opened", await page.locator("dialog[aria-labelledby='export-title']").isVisible());

  // Uncheck everything past the first two, using Space on each checkbox.
  let unchecked = 0;
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    const el = await focused(page);
    if (el?.type !== "checkbox") continue;
    const state = await page.evaluate(() => (document.activeElement as HTMLInputElement).checked);
    const index = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll("dialog fieldset input[type=checkbox]")];
      return boxes.indexOf(document.activeElement as HTMLInputElement);
    });
    if (index >= 2 && state) {
      await page.keyboard.press("Space");
      unchecked++;
    }
    if (index === -1) break;
  }
  check("checkboxes toggle with Space", unchecked > 0, `${unchecked} unchecked`);

  const selected = await page.evaluate(
    () =>
      [...document.querySelectorAll("dialog fieldset input[type=checkbox]")].filter(
        (b) => (b as HTMLInputElement).checked,
      ).length,
  );
  console.log(`          ${selected} item(s) still selected`);

  // --- Reorder with the keyboard -----------------------------------------
  const orderTab = page.getByRole("tab", { name: "Order" });
  await orderTab.focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);

  const before = await page.evaluate(() =>
    [...document.querySelectorAll("dialog [role=tabpanel] li p")].map((p) => p.textContent).slice(0, 4),
  );

  const grabbed = await tabUntil(page, (el) => el.tag === "button" && el.name.startsWith("Reorder "), 20);
  check("drag handle reachable by Tab", grabbed);
  console.log(`          rows: ${JSON.stringify(before)}`);
  console.log(`          grabbed: ${(await focused(page))?.name}`);
  if (grabbed) {
    // dnd-kit's keyboard sensor measures and announces between key presses;
    // driving it faster than that silently drops the move.
    await page.keyboard.press("Space"); // lift
    await page.waitForTimeout(500);
    await page.keyboard.press("ArrowDown"); // move
    await page.waitForTimeout(500);
    await page.keyboard.press("Space"); // drop
    await page.waitForTimeout(600);

    const after = await page.evaluate(() =>
      [...document.querySelectorAll("dialog [role=tabpanel] li p")].map((p) => p.textContent).slice(0, 4),
    );
    check("order changes with keyboard alone", JSON.stringify(before) !== JSON.stringify(after));
    console.log(`          before: ${before[0]}`);
    console.log(`          after:  ${after[0]}`);
  }

  // --- Preview and download ----------------------------------------------
  await page.getByRole("tab", { name: "Preview" }).focus();
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);

  const status = await page.locator("dialog[aria-labelledby='export-title'] [aria-live]").innerText();
  check("fit is reported", /Fits on one page/.test(status), status);

  const reachedDownload = await tabUntil(page, named("Download PDF"), 30);
  check("download button reachable by Tab", reachedDownload);

  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 40_000 }).catch(() => null),
    page.keyboard.press("Enter"),
  ]);
  check("Enter downloads the PDF", download !== null);
  if (download) await download.saveAs(join(OUT, "resume-keyboard.pdf"));

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n  completed in ${elapsed}s (target: completable)`);

  await browser.close();
  console.log(failures === 0 ? "\n  keyboard export: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
