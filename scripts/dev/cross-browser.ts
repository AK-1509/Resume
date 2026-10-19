/**
 * DEV ONLY — the same critical paths in Chromium, Firefox and WebKit.
 *
 * Usage: npx tsx scripts/dev/cross-browser.ts [baseUrl]
 *
 * Targets the features most likely to differ between engines rather than
 * re-running everything: web fonts, the fixed gradient canvas, color-mix()
 * and backdrop-filter on the glass, the `inert` attribute on off-drum
 * headlines, slides behind the front, the page not showing and closed rows,
 * 3D transforms on the stack, the native wheel handler, CSS animation
 * play-state on the headline timer, the grid-template-rows disclosure, the
 * hover-opened Index dock with aria-current, and the native modal <dialog>.
 */
import { chromium, firefox, webkit, type Browser, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { experienceHeadline, headlines, movableRole, projectHeadline, roles, type Role } from "./fixtures";

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

const roleState = (page: Page, role: Role) =>
  page.evaluate((id) => {
    const section = document.getElementById(id)!;
    return {
      projects: section.querySelector(".pf-page--projects")?.getAttribute("data-state") ?? null,
      experience: section.querySelector(".pf-page--experience")?.getAttribute("data-state") ?? null,
      count: section.querySelector(".pf-count")?.textContent?.trim() ?? "",
      front: section.querySelector(".pf-detail__title")?.textContent?.trim() ?? "",
    };
  }, role.id);

/**
 * Wait for every CSS transition inside a role section to finish. The away page
 * hides on a delayed visibility transition, and engines start it at slightly
 * different times, so a fixed wait races it.
 */
const transitionsDone = (page: Page, role: Role) =>
  page
    .waitForFunction(
      (id) =>
        document
          .getElementById(id)!
          .getAnimations({ subtree: true })
          .every((a) => !(a instanceof CSSTransition) || a.playState === "finished"),
      role.id,
      { timeout: 3000 },
    )
    .catch(() => undefined);

const heroCount = (page: Page) =>
  page.evaluate(() => /(\d+) of/.exec(document.querySelector(".pf-hero__count")?.textContent ?? "")?.[1] ?? "");

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

  // inert must keep off-drum headlines out of focus, not just out of sight.
  const drumInert = await page.evaluate(() => {
    const hidden = document.querySelector(".pf-line[inert] a") as HTMLElement | null;
    hidden?.focus();
    return { tried: Boolean(hidden), took: hidden !== null && document.activeElement === hidden };
  });
  check("inert headline refuses focus", drumInert.tried && !drumInert.took);

  // --- Hero → project ------------------------------------------------------
  const ph = projectHeadline();
  await page.getByRole("button", { name: `Headline ${ph.position}:` }).click();
  await page.waitForTimeout(300);
  await page.getByRole("link", { name: ph.cta }).click();
  await settle(page);
  const opened = await roleState(page, ph.role);
  check(
    `"${ph.cta}" brings it to the front`,
    opened.projects === "here" && opened.front === ph.title && opened.count.startsWith(`${ph.slideIndex + 1} of`),
    `${opened.front} (${opened.count})`,
  );

  // --- Hero → experience row ----------------------------------------------
  const eh = experienceHeadline();
  await fresh(page);
  await page.getByRole("button", { name: "Pause headlines" }).click();
  await page.getByRole("button", { name: `Headline ${eh.position}:` }).click();
  await page.waitForTimeout(300);
  await page.getByRole("link", { name: eh.cta }).click();
  await settle(page);
  await transitionsDone(page, eh.role);
  const rowId = eh.href.slice(1);
  const landed = await page.evaluate((id) => {
    const li = document.getElementById(id)!;
    const body = li.querySelector(".pf-xp__body") as HTMLElement | null;
    const r = li.getBoundingClientRect();
    return {
      expanded: li.querySelector(".pf-xp__toggle")?.getAttribute("aria-expanded"),
      bodyHeight: body ? body.getBoundingClientRect().height : 0,
      inView: r.top >= 0 && r.top < window.innerHeight - 60,
    };
  }, rowId);
  const es = await roleState(page, eh.role);
  check(`"${eh.cta}" turns to the experience page`, es.experience === "here", `${es.experience}`);
  check("and opens its row, in view", landed.expanded === "true" && landed.bodyHeight > 0 && landed.inView, JSON.stringify(landed));

  // --- Role carousel -------------------------------------------------------
  // Reload so every role starts on its projects page at the first slide: the
  // wheel only steps forward when there is a slide left to step to.
  await fresh(page);
  const role = movableRole();
  const section = page.locator(`section#${role.id}`);
  await section.locator(".pf-stage").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const start = await roleState(page, role);
  await section.getByRole("button", { name: /^Next:/ }).click();
  await page.waitForTimeout(500);
  const moved = await roleState(page, role);
  check(`${role.label}: Next moves the stack`, moved.front !== start.front && moved.count !== start.count, `${start.count} → ${moved.count}`);

  await section.getByRole("button", { name: "Previous", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(500);
  const arrowed = await roleState(page, role);
  check("ArrowRight on the region moves the stack", arrowed.count !== moved.count, `${moved.count} → ${arrowed.count}`);
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(500);
  check("ArrowLeft moves it back", (await roleState(page, role)).count === start.count);

  const stage = await page.evaluate((id) => {
    const s = document.getElementById(id)!;
    const behind = s.querySelector(".pf-slot.is-d1") as HTMLElement | null;
    const slots = [...s.querySelectorAll(".pf-slot")];
    return {
      behindTransform: behind ? getComputedStyle(behind).transform : "none",
      inertSupported: "inert" in HTMLElement.prototype,
      inertBehind: slots.filter((x) => !x.classList.contains("is-active") && (x as HTMLElement).inert).length,
      slots: slots.length,
    };
  }, role.id);
  check("slides behind the front are 3D-transformed", stage.behindTransform !== "none", stage.behindTransform.slice(0, 40));
  check(
    "the engine supports inert, and every slide behind is inert",
    stage.inertSupported && stage.inertBehind === stage.slots - 1,
    `${stage.inertBehind}/${stage.slots - 1}`,
  );

  // The wheel handler is bound natively with passive: false; each engine must
  // let it take the event and step the stack. Measured here, not earlier:
  // focusing the buttons above can scroll the page.
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
  const wheeled = await roleState(page, role);
  check("wheel over the stack steps it", wheeled.count !== start.count, `${start.count} → ${wheeled.count}`);

  // --- Pager and disclosure ------------------------------------------------
  await section.getByRole("button", { name: "Experience and education" }).click();
  await page.waitForTimeout(100);
  await transitionsDone(page, role);
  const paged = await page.evaluate((id) => {
    const s = document.getElementById(id)!;
    const away = s.querySelector(".pf-page[data-state='away']") as HTMLElement | null;
    const button = away?.querySelector("button, a") as HTMLElement | null;
    button?.focus();
    return {
      experience: s.querySelector(".pf-page--experience")?.getAttribute("data-state"),
      awayVisibility: away ? getComputedStyle(away).visibility : "",
      awayTookFocus: button !== null && document.activeElement === button,
      focus: document.activeElement?.textContent?.trim(),
    };
  }, role.id);
  check("the switch turns to the experience page", paged.experience === "here");
  check("the away page is hidden and refuses focus", paged.awayVisibility === "hidden" && !paged.awayTookFocus, paged.awayVisibility);

  const first = section.locator(".pf-xp > li").first();
  const toggleRow = first.locator(".pf-xp__toggle");
  const bodyHeight = () => first.locator(".pf-xp__body").evaluate((b) => b.getBoundingClientRect().height);
  const closedHeight = await bodyHeight();
  await toggleRow.click();
  await page.waitForTimeout(600);
  const openHeight = await bodyHeight();
  check(
    "a row opens: aria-expanded and the grid-rows transition",
    (await toggleRow.getAttribute("aria-expanded")) === "true" && closedHeight < 1 && openHeight > 20,
    `${Math.round(closedHeight)}px → ${Math.round(openHeight)}px`,
  );
  await toggleRow.click();
  await page.waitForTimeout(600);
  check("and closes again", (await toggleRow.getAttribute("aria-expanded")) === "false" && (await bodyHeight()) < 1);

  await section.getByRole("button", { name: "Side projects" }).click();
  await page.waitForTimeout(100);
  await transitionsDone(page, role);
  check("the switch turns back to the projects page", (await roleState(page, role)).projects === "here");

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
  const last = roles[roles.length - 1];
  await page.locator(".pf-dock__panel").getByRole("link", { name: last.label }).click();
  // WebKit can take a moment to start the smooth scroll, so a still scrollY
  // is not proof it has finished: wait for the mark itself, then read it.
  await page
    .waitForFunction(
      (href) => document.querySelector(".druid-index a[aria-current='location']")?.getAttribute("href") === href,
      `#${last.id}`,
      { timeout: 3000 },
    )
    .catch(() => undefined);
  await settle(page);
  await page.mouse.move(10, 450);
  const current = await page.evaluate(() =>
    [...document.querySelectorAll(".druid-index a[aria-current='location']")].map((a) => a.getAttribute("href")),
  );
  check("a link scrolls there and moves aria-current", current.length === 1 && current[0] === `#${last.id}`, current.join(", "));
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
