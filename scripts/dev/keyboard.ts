/**
 * DEV ONLY — keyboard-only walkthrough of the page: the theme switch, the
 * skip link and the projects, the docked Index, the phone menu and the export
 * dialog's front door.
 *
 * Usage: npx tsx scripts/dev/keyboard.ts [baseUrl]
 *
 * Every step drives the page with the keyboard alone — no clicks anywhere.
 * The export flow itself is covered by keyboard-export.ts.
 */
import { chromium, type Page } from "@playwright/test";
import { laterProject, projects, type Project } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";

/** --color-green-pale and --color-espresso, the light and dark page grounds. */
const LIGHT_PAGE = "rgb(241, 245, 239)";
const DARK_PAGE = "rgb(33, 26, 22)";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Wait for the dock's card to finish showing or hiding. */
async function dockSettles(page: Page, visible: boolean) {
  await page
    .waitForFunction(
      (want) => (getComputedStyle(document.querySelector(".pf-dock__panel")!).visibility === "visible") === want,
      visible,
      { timeout: 2000 },
    )
    .catch(() => null);
}

/**
 * Wait for the page's smooth scroll to finish: scrollY unchanged across three
 * reads. One repeat is not enough — a long jump can stall for a frame before
 * it gets going.
 */
async function settle(page: Page) {
  await page.waitForTimeout(250);
  let last = -1;
  let still = 0;
  for (let i = 0; i < 60 && still < 3; i++) {
    const y = await page.evaluate(() => window.scrollY);
    still = y === last ? still + 1 : 0;
    last = y;
    await page.waitForTimeout(120);
  }
}

const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      name,
      href: el.getAttribute("href"),
      section: el.closest("section")?.id ?? null,
      inDock: Boolean(el.closest(".pf-dock")),
      inHeader: Boolean(el.closest("header")),
    };
  });

type Focused = NonNullable<Awaited<ReturnType<typeof active>>>;

/**
 * Tab (or Shift+Tab) until the focused element satisfies the predicate.
 * Takes a predicate rather than a substring because a container's text
 * includes everything inside it.
 */
async function tabTo(
  page: Page,
  matches: (el: Focused) => boolean,
  { back = false, limit = 60 } = {},
): Promise<boolean> {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press(back ? "Shift+Tab" : "Tab");
    const el = await active(page);
    if (el && matches(el)) return true;
  }
  return false;
}

const named = (needle: string) => (el: Focused) => el.name.startsWith(needle);

const currentIndexItems = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".druid-index a[aria-current='location']")].map(
      (a) => a.getAttribute("href") ?? "",
    ),
  );

const dock = (page: Page) =>
  page.evaluate(() => ({
    expanded: document.querySelector(".pf-dock__tab")?.getAttribute("aria-expanded"),
    open: document.querySelector(".pf-dock")?.getAttribute("data-open"),
    visible: getComputedStyle(document.querySelector(".pf-dock__panel")!).visibility === "visible",
  }));

/** Back to the top of a freshly loaded page, focus at the document start. */
async function fresh(page: Page) {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
}

async function theme(page: Page) {
  console.log("\n  Theme switch\n");
  await fresh(page);

  const reached = await tabTo(page, (el) => el.role === "switch");
  check("switch reachable by Tab", reached);
  const el = await active(page);
  check('named "Dark mode", inside the banner', el?.name === "Dark mode" && Boolean(el?.inHeader));
  const before = await page.evaluate(() => ({
    checked: document.activeElement?.getAttribute("aria-checked"),
    bg: getComputedStyle(document.documentElement).backgroundColor,
  }));
  check("starts unchecked on a light page", before.checked === "false" && before.bg === LIGHT_PAGE, before.bg);

  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  const dark = await page.evaluate(() => ({
    attr: document.documentElement.dataset.theme,
    stored: localStorage.getItem("theme"),
    bg: getComputedStyle(document.documentElement).backgroundColor,
    checked: document.activeElement?.getAttribute("aria-checked"),
  }));
  check("Space switches to dark", dark.attr === "dark" && dark.checked === "true");
  check("page ground changes to espresso", dark.bg === DARK_PAGE, dark.bg);
  check("choice is persisted", dark.stored === "dark", `localStorage.theme=${dark.stored}`);

  await page.reload({ waitUntil: "networkidle" });
  const persisted = await page.evaluate(() => ({
    attr: document.documentElement.dataset.theme,
    checked: document.querySelector("header [role=switch]")?.getAttribute("aria-checked"),
  }));
  check("survives a reload", persisted.attr === "dark" && persisted.checked === "true");

  await tabTo(page, (x) => x.role === "switch");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const light = await page.evaluate(() => document.documentElement.dataset.theme);
  check("Enter switches back to light", light === "light");
}

async function projectList(page: Page) {
  console.log("\n  Skip link and the projects\n");
  await fresh(page);

  await page.keyboard.press("Tab");
  check('"Skip to the projects" is the first Tab stop', (await active(page))?.name === "Skip to the projects");
  await page.keyboard.press("Enter");
  await settle(page);
  check("Enter lands on #projects", (await page.evaluate(() => location.hash)) === "#projects");

  const first = projects[0];
  check(
    `the next Tab stops reach the first project, "${first.title}"`,
    await tabTo(page, (el) => el.tag === "a" && el.href === first.href, { limit: 3 }),
    (await active(page))?.name.slice(0, 40) ?? "",
  );
  // One link per entry: Tab moves from one project straight to the next.
  check(
    `one Tab on is the second project, "${projects[1].title}"`,
    await tabTo(page, (el) => el.tag === "a" && el.href === projects[1].href, { limit: 1 }),
  );
  await page.keyboard.press("Enter");
  await page.waitForURL(`**${projects[1].href}`, { timeout: 5000 }).catch(() => null);
  const landed = await page.evaluate(() => ({ path: location.pathname, h1: document.querySelector("h1")?.textContent?.trim() }));
  check("Enter opens its page", landed.path === projects[1].href && landed.h1 === projects[1].title, `${landed.path}, "${landed.h1}"`);
}

async function index(page: Page) {
  console.log("\n  Docked Index\n");
  await fresh(page);

  check("no project is current at the very top", (await currentIndexItems(page)).length === 0);
  check(
    "the Index tab is reachable by Tab",
    await tabTo(page, (el) => el.tag === "button" && el.name.endsWith("Index") && el.inDock),
  );
  let d = await dock(page);
  check("closed: aria-expanded=false and the card hidden", d.expanded === "false" && !d.visible);

  await page.keyboard.press("Enter");
  await dockSettles(page, true);
  d = await dock(page);
  let el = await active(page);
  check("Enter opens it", d.expanded === "true" && d.visible);
  check("and focuses the first project link", el?.tag === "a" && el.name === projects[0].title, el?.name ?? "");

  await page.keyboard.press("Escape");
  await dockSettles(page, false);
  d = await dock(page);
  el = await active(page);
  check("Escape closes it", d.expanded === "false" && !d.visible);
  check("and returns focus to the tab", el?.tag === "button" && el.name.endsWith("Index"), el?.name ?? "");

  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await dockSettles(page, false);
  d = await dock(page);
  check("focus leaving the dock closes it", d.open === "false" && !d.visible, `focus on "${(await active(page))?.name}"`);

  const target: Project = laterProject();
  // Focus is on the control before the dock; one Tab is the dock's tab again.
  await page.keyboard.press("Tab");
  const onTab = (await active(page))?.name.endsWith("Index");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const isLink = (x: Focused | null) => x?.tag === "a" && x.name === target.title;
  const reached = isLink(await active(page)) || (await tabTo(page, isLink, { limit: projects.length + 1 }));
  check(`"${target.title}" reachable through the reopened dock`, Boolean(onTab) && reached);
  await page.keyboard.press("Enter");
  await settle(page);

  const after = await currentIndexItems(page);
  check('Enter scrolls to its entry and marks it aria-current="location"', after.length === 1 && after[0] === `#${target.anchor}`, after.join(", "));
  check("the dock closes behind it", (await dock(page)).open === "false");
  const land = await page.evaluate((id) => {
    const s = document.getElementById(id)!;
    return { top: s.getBoundingClientRect().top, margin: parseFloat(getComputedStyle(s).scrollMarginTop) || 0 };
  }, target.anchor);
  check("the entry lands at its scroll margin", Math.abs(land.top - land.margin) <= 4, `${Math.round(land.top)}px, margin ${land.margin}px`);
  check(
    "the next Tab is that project's link",
    await tabTo(page, (x) => x.tag === "a" && x.href === target.href, { limit: 2 }),
    (await active(page))?.name.slice(0, 40) ?? "",
  );
}

async function phoneMenu(page: Page) {
  console.log("\n  Phone menu (390 wide)\n");
  await page.setViewportSize({ width: 390, height: 844 });
  await fresh(page);

  const linksShown = () =>
    page.evaluate(() => getComputedStyle(document.querySelector(".pf-nav")!).display !== "none");
  check("the site links are folded away", !(await linksShown()));
  check("the menu button is reachable by Tab", await tabTo(page, (el) => el.tag === "button" && el.name === "Menu"));
  check("closed: aria-expanded=false", (await page.evaluate(() => document.activeElement?.getAttribute("aria-expanded"))) === "false");

  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check("Enter opens the links", await linksShown());
  check("and reports aria-expanded=true", (await page.evaluate(() => document.activeElement?.getAttribute("aria-expanded"))) === "true");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const el = await active(page);
  check("Escape folds them away again", !(await linksShown()));
  check("and keeps focus on the menu button", el?.name === "Menu", el?.name ?? "");

  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  check('Tab reaches "Projects" in the open menu', await tabTo(page, (x) => x.tag === "a" && x.name === "Projects" && x.inHeader, { back: true, limit: 6 }));
  await page.keyboard.press("Enter");
  await settle(page);
  check("following it closes the menu and lands on #projects", !(await linksShown()) && (await page.evaluate(() => location.hash)) === "#projects");

  await page.setViewportSize({ width: 1440, height: 900 });
}

async function exportDoor(page: Page) {
  console.log("\n  Export resume\n");
  await fresh(page);

  check("Export resume reachable by Tab", await tabTo(page, named("Export resume")));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(500);
  const open = await page.evaluate(() => {
    const d = document.querySelector("dialog[aria-labelledby='export-title']") as HTMLDialogElement | null;
    return { open: Boolean(d?.open), modal: Boolean(d?.matches(":modal")), focusInside: Boolean(d?.contains(document.activeElement)) };
  });
  check("Enter opens the export dialog as a modal", open.open && open.modal);
  check("focus moves into the dialog", open.focusInside);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const closed = await page.evaluate(
    () => !(document.querySelector("dialog[aria-labelledby='export-title']") as HTMLDialogElement | null)?.open,
  );
  check("Escape closes it", closed);
  const el = await active(page);
  check("focus returns to Export resume", el?.name === "Export resume", el?.name ?? "body");
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await theme(page);
  await projectList(page);
  await index(page);
  await phoneMenu(page);
  await exportDoor(page);

  console.log("");
  check("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await browser.close();
  console.log(failures === 0 ? "\n  keyboard walkthrough: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
