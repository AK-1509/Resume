/**
 * DEV ONLY — the same critical paths in Chromium, Firefox and WebKit.
 *
 * Usage: npx tsx scripts/dev/cross-browser.ts [baseUrl]
 *
 * Targets the features most likely to differ between engines rather than
 * re-running everything: web fonts, the fixed gradient canvas, color-mix()
 * and backdrop-filter on the glass, the theme switch, a project page's Content
 * Cards, the hover-opened Index dock with aria-current, and the native modal
 * <dialog>.
 */
import { chromium, firefox, webkit, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { laterProject, projects } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = resolve(import.meta.dirname, "..", "..", ".screenshots");

/** --color-espresso, the dark page ground. */
const DARK_PAGE = "rgb(33, 26, 22)";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`    ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
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
  await page.waitForTimeout(200);
}

async function run(name: string, browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page: Page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await fresh(page);
  await page.evaluate(() => document.fonts.ready);

  // --- Fonts, layout and the canvas ---------------------------------------
  const layout = await page.evaluate(() => ({
    heading: getComputedStyle(document.querySelector("h1")!).fontFamily.split(",")[0].replace(/"/g, ""),
    headingLoaded: document.fonts.check('400 32px "Schibsted Grotesk"'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    canvas: (() => {
      const c = document.querySelector(".pf-canvas");
      return c ? { position: getComputedStyle(c).position, bg: getComputedStyle(c).backgroundImage } : null;
    })(),
  }));
  check(
    "heading face is Schibsted Grotesk and loaded",
    layout.heading === "Schibsted Grotesk" && layout.headingLoaded,
    layout.heading,
  );
  check("no horizontal overflow", layout.overflow <= 0, `${layout.overflow}px`);
  check(
    "the gradient canvas is fixed and painted",
    layout.canvas?.position === "fixed" && (layout.canvas?.bg ?? "none") !== "none",
    `${layout.canvas?.position}, ${layout.canvas?.bg.slice(0, 30)}`,
  );

  // --- Glass header: color-mix() + backdrop-filter -------------------------
  const glass = await page.evaluate(() => {
    const s = getComputedStyle(document.querySelector(".pf-glass")!);
    return {
      bg: s.backgroundColor,
      blur: s.backdropFilter || (s as unknown as Record<string, string>).webkitBackdropFilter || "",
    };
  });
  check("color-mix() glass resolves to a real colour", glass.bg !== "rgba(0, 0, 0, 0)" && glass.bg !== "", glass.bg);
  check("backdrop-filter applies", glass.blur.includes("blur"), glass.blur);

  // --- Theme switch -------------------------------------------------------
  const toggle = page.getByRole("banner").getByRole("switch", { name: "Dark mode" });
  check("theme switch exposed as role=switch", (await toggle.count()) === 1);
  await toggle.click();
  await page.waitForTimeout(400);
  const dark = await page.evaluate(() => ({
    page: getComputedStyle(document.documentElement).backgroundColor,
    glass: getComputedStyle(document.querySelector(".pf-glass")!).backgroundColor,
  }));
  check("dark page ground", dark.page === DARK_PAGE, dark.page);
  check("color-mix() dark glass resolves", dark.glass !== "rgba(0, 0, 0, 0)", dark.glass);
  check("checked state reported", (await toggle.getAttribute("aria-checked")) === "true");
  await page.reload({ waitUntil: "networkidle" });
  check("dark survives a reload", (await page.evaluate(() => document.documentElement.dataset.theme)) === "dark");
  await toggle.click();
  await page.waitForTimeout(300);

  // --- Projects: one link per entry, each opening its page ----------------
  const first = projects[0];
  await page.locator(`#${first.anchor} a`).click();
  await page.waitForURL(`**${first.href}`, { timeout: 10_000 }).catch(() => undefined);
  const project = await page.evaluate(() => {
    // The card's cream face is painted in background layers built with
    // color-mix(), so it is the image, not the colour, that must resolve.
    const face = document.querySelector(".cs-sheet .cs-face");
    return {
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      card: face ? getComputedStyle(face).backgroundImage : "",
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  check("a project entry opens its page", project.h1 === first.title, project.h1);
  check("its Content Card paints its layers", project.card !== "" && project.card !== "none", project.card.slice(0, 40));
  check("no horizontal overflow on the project page", project.overflow <= 0, `${project.overflow}px`);

  // --- Index dock ----------------------------------------------------------
  await fresh(page);
  // The card shows and hides on a delayed visibility transition, so poll for
  // the expected state rather than reading it once after a fixed wait.
  const dockBecomes = (visible: boolean) =>
    page
      .waitForFunction(
        (want) => (getComputedStyle(document.querySelector(".pf-dock__panel")!).visibility === "visible") === want,
        visible,
        { timeout: 2000 },
      )
      .then(() => true)
      .catch(() => false);
  check("the Index dock starts closed", await dockBecomes(false));
  await page.locator(".pf-dock__tab").hover();
  check("hovering the tab opens it", await dockBecomes(true));
  const last = laterProject();
  await page.locator(".pf-dock__panel").getByRole("link", { name: last.title }).click();
  // WebKit can take a moment to start the smooth scroll, so a still scrollY
  // is not proof it has finished: wait for the mark itself, then read it.
  await page
    .waitForFunction(
      (href) => document.querySelector(".druid-index a[aria-current='location']")?.getAttribute("href") === href,
      `#${last.anchor}`,
      { timeout: 3000 },
    )
    .catch(() => undefined);
  await settle(page);
  await page.mouse.move(10, 450);
  const current = await page.evaluate(() =>
    [...document.querySelectorAll(".druid-index a[aria-current='location']")].map((a) => a.getAttribute("href")),
  );
  check("a link scrolls to its entry and moves aria-current", current.length === 1 && current[0] === `#${last.anchor}`, current.join(", "));
  check("the dock closes once the pointer leaves", await dockBecomes(false));

  // --- Export dialog -------------------------------------------------------
  await page.getByRole("button", { name: "Export resume" }).first().click();
  await page.waitForTimeout(600);
  const dialog = await page.evaluate(() => {
    const d = document.querySelector("dialog[aria-labelledby='export-title']") as HTMLDialogElement | null;
    return { open: Boolean(d?.open), modal: Boolean(d?.matches(":modal")) };
  });
  check("export opens a native modal dialog", dialog.open && dialog.modal);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const closed = await page.evaluate(
    () => !(document.querySelector("dialog[aria-labelledby='export-title']") as HTMLDialogElement | null)?.open,
  );
  check("Escape closes it", closed);

  check("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
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
    console.log(`\n  ${name}\n`);
    let browser: Browser | null = null;
    try {
      browser = await type.launch();
      await run(name, browser);
    } catch (error) {
      failures++;
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
