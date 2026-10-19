/**
 * DEV ONLY — the same critical paths in Chromium, Firefox and WebKit.
 *
 * Usage: npx tsx scripts/dev/cross-browser.ts [baseUrl]
 *
 * Targets the features most likely to differ between engines rather than
 * re-running everything: web fonts, color-mix() and backdrop-filter on the
 * glass header, the `inert` attribute on the stacked cards and off-drum
 * headlines, 3D transforms on the stack, the native wheel handler, CSS
 * animation play-state on the headline timer, smooth in-page scrolling with
 * the index's aria-current, and the native modal <dialog>.
 */
import { chromium, firefox, webkit, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { headlineBehindTheFront, headlines, movableRole, roles, type Role } from "./fixtures";

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

const stack = (page: Page, role: Role) =>
  page.evaluate((id) => {
    const section = document.getElementById(id)!;
    return {
      count: section.querySelector(".pf-count")?.textContent?.trim() ?? "",
      front: section.querySelector(".pf-slot.is-active h3")?.textContent?.trim() ?? "",
    };
  }, role.id);

const heroCount = (page: Page) =>
  page.evaluate(() => /(\d+) of/.exec(document.querySelector(".pf-hero__count")?.textContent ?? "")?.[1] ?? "");

async function run(name: string, browser: Browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  const page: Page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  // --- Fonts and layout ---------------------------------------------------
  const layout = await page.evaluate(() => ({
    heading: getComputedStyle(document.querySelector("h1")!).fontFamily.split(",")[0].replace(/"/g, ""),
    headingLoaded: document.fonts.check('400 32px "Schibsted Grotesk"'),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check("heading face is Schibsted Grotesk and loaded", layout.heading === "Schibsted Grotesk" && layout.headingLoaded, layout.heading);
  check("no horizontal overflow", layout.overflow <= 0, `${layout.overflow}px`);

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

  // --- Headline drum -------------------------------------------------------
  await page.getByRole("button", { name: "Pause headlines" }).click();
  await page.waitForTimeout(200);
  const play = await page.evaluate(
    () => getComputedStyle(document.querySelector(".pf-seg.is-active .pf-seg__fill")!).animationPlayState,
  );
  check("Pause stops the timer animation", play === "paused", play);

  const before = await heroCount(page);
  await page.getByRole("button", { name: "Next headline" }).click();
  await page.waitForTimeout(400);
  const after = await heroCount(page);
  check("Next headline advances", Number(after) === (Number(before) % headlines.length) + 1, `${before} → ${after}`);
  await page.getByRole("button", { name: "Previous headline" }).click();
  await page.waitForTimeout(400);
  check("Previous headline goes back", (await heroCount(page)) === before);

  const target = headlineBehindTheFront();
  await page.getByRole("button", { name: `Headline ${target.position}:` }).click();
  await page.waitForTimeout(400);
  check("segment button jumps", (await heroCount(page)) === String(target.position));

  // inert must keep off-drum headlines out of focus, not just out of sight.
  const drumInert = await page.evaluate(() => {
    const hidden = document.querySelector(".pf-line[inert] a") as HTMLElement | null;
    hidden?.focus();
    return { tried: Boolean(hidden), took: hidden !== null && document.activeElement === hidden };
  });
  check("inert headline refuses focus", drumInert.tried && !drumInert.took);

  await page.getByRole("link", { name: `Open the ${target.shortName} card` }).click();
  await settle(page);
  const opened = await stack(page, target.role);
  check(
    `Open the card brings "${target.title}" to the front`,
    opened.front === target.title && opened.count.startsWith(`${target.cardIndex + 1} of`),
    opened.count,
  );
  const inView = await page.evaluate((id) => {
    const r = document.getElementById(id)!.getBoundingClientRect();
    return r.top < window.innerHeight / 2 && r.bottom > 0;
  }, target.role.id);
  check("and scrolls its section into view", inView);

  // --- Role carousel -------------------------------------------------------
  // Reload so every stack starts at its first card: the wheel only steps
  // forward when there is a card left to step to.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const role = movableRole();
  const section = page.locator(`section#${role.id}`);
  await section.locator(".pf-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const start = await stack(page, role);
  await section.getByRole("button", { name: /^Next:/ }).click();
  await page.waitForTimeout(500);
  const moved = await stack(page, role);
  check(`${role.label}: Next moves the stack`, moved.front !== start.front && moved.count !== start.count, `${start.count} → ${moved.count}`);

  await section.getByRole("button", { name: "Previous", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  const arrowed = await stack(page, role);
  check("ArrowRight on the region moves the stack", arrowed.count !== moved.count, `${moved.count} → ${arrowed.count}`);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(500);
  check("ArrowLeft moves it back", (await stack(page, role)).count === start.count);

  const stage = await page.evaluate((id) => {
    const section = document.getElementById(id)!;
    const behind = section.querySelector(".pf-slot.is-d1") as HTMLElement | null;
    const link = section.querySelector(".pf-slot[inert] a, .pf-slot[inert] button") as HTMLElement | null;
    link?.focus();
    return {
      behindTransform: behind ? getComputedStyle(behind).transform : "none",
      inertTried: Boolean(link),
      inertTook: link !== null && document.activeElement === link,
    };
  }, role.id);
  check("cards behind the front are 3D-transformed", stage.behindTransform !== "none", stage.behindTransform.slice(0, 40));
  check(
    "inert cards refuse focus",
    !stage.inertTook,
    stage.inertTried ? "" : "no focusable control behind the front to try",
  );

  // The wheel handler is bound natively with passive: false; each engine must
  // let it take the event and step the stack.
  // Measured here, not earlier: focusing the buttons above can scroll the
  // page. The stage can be taller than the viewport, so aim inside both.
  await section.locator(".pf-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await section.locator(".pf-stage").boundingBox();
  if (box) {
    const top = Math.max(box.y, 0);
    const bottom = Math.min(box.y + box.height, 900);
    await page.mouse.move(box.x + box.width / 2, (top + bottom) / 2);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(800);
  }
  const wheeled = await stack(page, role);
  check("wheel over the stack steps it", wheeled.count !== start.count, `${start.count} → ${wheeled.count}`);

  // --- Index ---------------------------------------------------------------
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  const last = roles[roles.length - 1];
  await page.locator(".druid-index").getByRole("link", { name: last.label }).click();
  await settle(page);
  const current = await page.evaluate(() =>
    [...document.querySelectorAll(".druid-index a[aria-current='location']")].map((a) => a.getAttribute("href")),
  );
  check("index link scrolls and moves aria-current", current.length === 1 && current[0] === `#${last.id}`, current.join(", "));

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
