/**
 * DEV ONLY — keyboard-only walkthrough of the page: the theme switch, the
 * hero headline drum, each role's project carousel and experience pager, the
 * docked role index and the export dialog's front door.
 *
 * Usage: npx tsx scripts/dev/keyboard.ts [baseUrl]
 *
 * Every step drives the page with the keyboard alone — no clicks anywhere.
 * The export flow itself is covered by keyboard-export.ts.
 */
import { chromium, type Page } from "@playwright/test";
import {
  experienceHeadline,
  experienceOnlyRole,
  headlines,
  movableRole,
  projectHeadline,
  roles,
  type Headline,
  type Role,
} from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";

/** --color-green-pale and --color-espresso, the light and dark page grounds. */
const LIGHT_PAGE = "rgb(241, 245, 239)";
const DARK_PAGE = "rgb(33, 26, 22)";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Wait until a role's given page is the one in view (the track scrolls there). */
async function arrive(page: Page, role: Role, kind: "projects" | "experience") {
  await page
    .waitForFunction(
      ([id, k]) => document.querySelector(`#${id} .pf-page--${k}`)?.getAttribute("data-state") === "here",
      [role.id, kind] as const,
      { timeout: 3000 },
    )
    .catch(() => null);
  await page.waitForTimeout(200);
}

/** Wait for the dock's card to finish showing or hiding (it fades over 420ms). */
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
      section: el.closest("section")?.id ?? null,
      inDock: Boolean(el.closest(".pf-dock")),
      inStage: Boolean(el.closest(".pf-stage")),
      inFrontSlot: Boolean(el.closest(".pf-slot.is-active")),
      inAwayPage: Boolean(el.closest(".pf-page[data-state='away']")),
      inClosedRow: Boolean(el.closest(".pf-xp__body[data-open='false']")),
      inInert: Boolean(el.closest("[inert]")),
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

const heroCount = (page: Page) =>
  page.evaluate(() => {
    const m = /(\d+) of (\d+)/.exec(document.querySelector(".pf-hero__count")?.textContent ?? "");
    return m ? Number(m[1]) : 0;
  });

/** Everything a check needs to know about one role section, in one read. */
const roleState = (page: Page, role: Role) =>
  page.evaluate((id) => {
    const section = document.getElementById(id)!;
    // No named helpers in here: tsx's keepNames would inject `__name`.
    const [projects, experience] = ["projects", "experience"].map((kind) => {
      const el = section.querySelector(`.pf-page--${kind}`);
      return el
        ? {
            state: el.getAttribute("data-state"),
            // The page out of view stays visible as a dimmed sliver; it is
            // its content that goes inert.
            inert: Boolean(el.querySelector(".pf-page__body")?.hasAttribute("inert")),
            hidden: el.getAttribute("aria-hidden") === "true",
          }
        : null;
    });
    const slots = [...section.querySelectorAll(".pf-slot")];
    return {
      projects,
      experience,
      count: section.querySelector(".pf-count")?.textContent?.trim() ?? "",
      front: section.querySelector(".pf-detail__title")?.textContent?.trim() ?? "",
      next: section.querySelector(".pf-next")?.textContent?.trim() ?? "",
      slots: slots.length,
      inertBehind: slots.filter((s) => !s.classList.contains("is-active") && s.hasAttribute("inert")).length,
      frontInert: Boolean(section.querySelector(".pf-slot.is-active[inert]")),
      switches: [...section.querySelectorAll(".pf-page__foot button")].map((b) => b.textContent?.trim() ?? ""),
      rows: [...section.querySelectorAll(".pf-xp > li")].map((li) => {
        const body = li.querySelector(".pf-xp__body");
        return {
          id: li.id,
          expanded: li.querySelector(".pf-xp__toggle")?.getAttribute("aria-expanded") ?? null,
          open: body?.getAttribute("data-open") === "true",
          bodyInert: Boolean(body?.hasAttribute("inert")),
        };
      }),
    };
  }, role.id);

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

/** Pause the drum from the keyboard, so it cannot roll on under a check. */
async function pauseDrum(page: Page) {
  const reached = await tabTo(page, named("Pause headlines"));
  if (reached) await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  return reached;
}

/** Open the docked index from the keyboard and follow one role's link. */
async function viaIndex(page: Page, role: Role) {
  const tab = await tabTo(page, (el) => el.tag === "button" && el.name.endsWith("Index") && el.inDock);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  // Opening the dock focuses its first link, which may already be the one.
  const isLink = (el: Focused | null) => el?.tag === "a" && el.name === role.label;
  const link = isLink(await active(page)) || (await tabTo(page, isLink, { limit: roles.length + 1 }));
  await page.keyboard.press("Enter");
  await settle(page);
  return tab && link;
}

async function theme(page: Page) {
  console.log("\n  Theme switch\n");
  await fresh(page);

  const reached = await tabTo(page, (el) => el.role === "switch");
  check("switch reachable by Tab", reached);
  const el = await active(page);
  check(
    'named "Dark mode", inside the banner',
    el?.name === "Dark mode" && (await page.evaluate(() => Boolean(document.activeElement?.closest("header")))),
  );
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

async function drum(page: Page) {
  console.log("\n  Hero headline drum\n");
  await fresh(page);
  const n = headlines.length;

  check("Pause reachable by Tab", await pauseDrum(page));
  const paused = await page.evaluate(() => ({
    pressed: document.activeElement?.getAttribute("aria-pressed"),
    label: document.activeElement?.textContent?.trim(),
    play: getComputedStyle(document.querySelector(".pf-seg.is-active .pf-seg__fill")!).animationPlayState,
  }));
  check(
    "Enter pauses: aria-pressed and the label flip",
    paused.pressed === "true" && paused.label === "Resume headlines",
    `${paused.pressed}, "${paused.label}"`,
  );
  check("the timer animation is paused", paused.play === "paused", paused.play);

  const start = await heroCount(page);
  await page.waitForTimeout(1500);
  check("the drum holds while paused", (await heroCount(page)) === start, `${start} → ${await heroCount(page)}`);

  check("Next reachable by Tab", await tabTo(page, named("Next headline"), { limit: 3 }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const afterNext = await heroCount(page);
  check("Enter on Next advances one headline", afterNext === (start % n) + 1, `${start} → ${afterNext}`);

  const view = await page.evaluate(() => ({
    live: [...document.querySelectorAll(".pf-line")].filter((l) => !l.hasAttribute("inert")).length,
    seg: document.querySelector(".pf-seg[aria-current='true']")?.getAttribute("aria-label") ?? "",
    cta: document.querySelector(".pf-hero__controls a")?.textContent?.trim() ?? "",
  }));
  const shown = headlines[afterNext - 1];
  check("only the headline on the drum is outside inert", view.live === 1, `${view.live} live`);
  check("its segment carries aria-current", view.seg.startsWith(`Headline ${afterNext}:`), view.seg);
  check("the call to action names it", view.cta === shown.cta, view.cta);

  check("Previous reachable by Shift+Tab", await tabTo(page, named("Previous headline"), { back: true, limit: 3 }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("Enter on Previous goes back", (await heroCount(page)) === start);
}

/** Jump the drum to a headline through its segment, then follow its call to action. */
async function follow(page: Page, h: Headline) {
  await fresh(page);
  await pauseDrum(page);
  const seg = await tabTo(page, named(`Headline ${h.position}:`), { back: true, limit: headlines.length + 6 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check(`segment "Headline ${h.position}" reachable and jumps there`, seg && (await heroCount(page)) === h.position);

  check(`"${h.cta}" reachable by Tab`, await tabTo(page, named(h.cta), { limit: headlines.length + 6 }));
  await page.keyboard.press("Enter");
  await settle(page);
  check("it lands on its target", (await page.evaluate(() => location.hash)) === h.href, h.href);
}

async function projectCta(page: Page) {
  const h = projectHeadline();
  console.log(`\n  Hero → project: ${h.title}\n`);
  await follow(page, h);

  const s = await roleState(page, h.role);
  const n = h.role.projects.length;
  check("the projects page is showing", s.projects?.state === "here" && !s.projects.inert);
  check(
    `"${h.title}" is now the front project of ${h.role.label}`,
    s.front === h.title && s.count === `${h.slideIndex + 1} of ${n}`,
    `${s.front} (${s.count})`,
  );
  check("every slide behind it is inert", s.inertBehind === s.slots - 1 && !s.frontInert, `${s.inertBehind}/${s.slots - 1}`);

  // The fragment moves the sequential focus starting point, so the next Tab
  // continues inside the section rather than back in the hero.
  check(
    "the next Tab continues inside that section",
    await tabTo(page, (el) => el.section === h.role.id, { limit: 2 }),
    (await active(page))?.name.slice(0, 40) ?? "",
  );
}

async function experienceCta(page: Page) {
  const h = experienceHeadline();
  console.log(`\n  Hero → experience row: ${h.title}\n`);
  await follow(page, h);

  const s = await roleState(page, h.role);
  const row = s.rows.find((r) => r.id === h.href.slice(1));
  check("the experience page is showing", s.experience?.state === "here" && !s.experience.inert);
  if (s.projects) {
    check(
      "the projects page is away, inert and hidden",
      s.projects.state === "away" && s.projects.inert && s.projects.hidden,
    );
  }
  check("its row is expanded and open", row?.expanded === "true" && row.open && !row.bodyInert, JSON.stringify(row));
  const top = await page.evaluate((id) => document.getElementById(id)!.getBoundingClientRect().top, h.href.slice(1));
  check("the row is in view", top >= 0 && top < 900 - 80, `${Math.round(top)}px`);

  const next = await tabTo(page, (el) => el.section === h.role.id, { limit: 2 });
  const el = await active(page);
  check("the next Tab continues inside that section", next && !el?.inAwayPage, el?.name.slice(0, 40) ?? "");
}

async function carousel(page: Page, role: Role) {
  console.log(`\n  ${role.label}: project carousel\n`);
  await fresh(page);
  check("reached through the Index", await viaIndex(page, role));
  const n = role.projects.length;
  const titles = role.projects.map((p) => p.title);

  const inSection = (el: Focused) => el.section === role.id;
  check("Next reachable by Tab", await tabTo(page, (el) => inSection(el) && el.name.startsWith("Next:"), { limit: 6 }));
  let s = await roleState(page, role);
  check("starts on the first project", s.count === `1 of ${n}` && s.front === titles[0], s.count);
  check("Next names the project behind", s.next === `Next: ${titles[1 % n]}`, s.next);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  s = await roleState(page, role);
  check("Enter on Next brings the second project forward", s.front === titles[1 % n] && s.count === `2 of ${n}`, s.count);

  check(
    "Previous reachable by Shift+Tab",
    await tabTo(page, (el) => inSection(el) && el.name === "Previous", { back: true, limit: 3 }),
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("Enter on Previous goes back", (await roleState(page, role)).front === titles[0]);

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  check("ArrowRight on the region advances", (await roleState(page, role)).front === titles[1 % n]);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(400);
  s = await roleState(page, role);
  check("ArrowLeft past the first wraps to the last", s.front === titles[n - 1] && s.count === `${n} of ${n}`, s.count);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  s = await roleState(page, role);
  check("ArrowRight past the last wraps to the first", s.front === titles[0]);
  check("only the front slide is outside inert", s.inertBehind === n - 1 && !s.frontInert, `${s.inertBehind}/${n - 1} inert`);

  // Tab through the projects page: nothing behind the front slide may take
  // focus, and nothing on the experience page while it is away.
  const strays: string[] = [];
  let reachedSwitch = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const el = await active(page);
    if (!el || el.section !== role.id) break;
    if ((el.inStage && !el.inFrontSlot) || el.inInert || el.inAwayPage) strays.push(el.name.slice(0, 30));
    if (el.name.startsWith("Experience and education")) {
      reachedSwitch = true;
      break;
    }
  }
  check("Tab never reaches a slide behind the front or the away page", strays.length === 0, strays.slice(0, 3).join(", "));
  check('Tab reaches "Experience and education"', reachedSwitch);
}

async function pager(page: Page, role: Role) {
  console.log(`\n  ${role.label}: pager and experience list\n`);
  // Continues from carousel(): focus is on the "Experience and education" switch.
  await page.keyboard.press("Enter");
  await arrive(page, role, "experience");
  let s = await roleState(page, role);
  let el = await active(page);
  check("Enter turns to the experience page", s.experience?.state === "here" && !s.experience.inert);
  check(
    "the projects page goes away, inert and hidden",
    s.projects?.state === "away" && s.projects.inert && s.projects.hidden,
  );
  check(
    'focus moves to its "Experience and education" heading',
    el?.tag === "h3" && el.name === "Experience and education",
    `${el?.tag} "${el?.name}"`,
  );

  const first = role.rows[0];
  check(`first row "${first.title}" reachable by Tab`, await tabTo(page, (x) => x.name.startsWith(first.title), { limit: 3 }));
  let row = (await roleState(page, role)).rows[0];
  check("closed: aria-expanded=false and its body inert", row.expanded === "false" && !row.open && row.bodyInert);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  row = (await roleState(page, role)).rows[0];
  check("Enter opens it", row.expanded === "true" && row.open && !row.bodyInert);
  await page.keyboard.press("Space");
  await page.waitForTimeout(400);
  row = (await roleState(page, role)).rows[0];
  check("Space closes it again", row.expanded === "false" && !row.open && row.bodyInert);

  // Every row is closed now; Tab must walk the toggles only, then the switch.
  const strays: string[] = [];
  let toggles = 1;
  let reachedSwitch = false;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    el = await active(page);
    if (!el || el.section !== role.id) break;
    if (el.inClosedRow || el.inAwayPage || el.inInert) strays.push(el.name.slice(0, 30));
    if (el.name.startsWith("Side projects")) {
      reachedSwitch = true;
      break;
    }
    toggles++;
  }
  check("Tab never enters a closed row or the away page", strays.length === 0, strays.slice(0, 3).join(", "));
  check('Tab walks the rows to "Side projects"', reachedSwitch, `${toggles} stop(s) on the way`);

  await page.keyboard.press("Enter");
  await arrive(page, role, "projects");
  s = await roleState(page, role);
  el = await active(page);
  check("Enter turns back to the projects page", s.projects?.state === "here" && s.experience?.state === "away");
  check('focus moves to its "Side projects" heading', el?.tag === "h3" && el.name === "Side projects", `${el?.tag} "${el?.name}"`);
}

async function experienceOnly(page: Page) {
  const role = experienceOnlyRole();
  if (!role) {
    console.log("\n  SKIP  every role has side projects; the experience-only layout is not exercised");
    return;
  }
  console.log(`\n  ${role.label}: no side projects\n`);
  await fresh(page);
  check("reached through the Index", await viaIndex(page, role));
  const s = await roleState(page, role);
  check("only the experience page exists, and it is showing", !s.projects && s.experience?.state === "here" && !s.experience.inert);
  check("no page switch is offered", s.switches.length === 0, s.switches.join(", "));
  check(
    "Tab reaches its first row",
    await tabTo(page, (el) => el.section === role.id && el.name.startsWith(role.rows[0].title), { limit: 4 }),
  );
}

async function index(page: Page) {
  console.log("\n  Skip link and docked Index\n");
  await fresh(page);

  check("no role is current at the very top", (await currentIndexItems(page)).length === 0);

  await page.keyboard.press("Tab");
  check('"Skip to the roles" is the first Tab stop', (await active(page))?.name === "Skip to the roles");
  await page.keyboard.press("Enter");
  await settle(page);
  check("Enter lands on #roles", (await page.evaluate(() => location.hash)) === "#roles");
  check(
    "the next Tab continues in the first role",
    await tabTo(page, (el) => el.section === roles[0].id, { limit: 2 }),
    (await active(page))?.name.slice(0, 40) ?? "",
  );

  await fresh(page);
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
  check("and focuses the first role link", el?.tag === "a" && el.name === roles[0].label, el?.name ?? "");

  await page.keyboard.press("Escape");
  await dockSettles(page, false);
  d = await dock(page);
  el = await active(page);
  check("Escape closes it", d.expanded === "false" && !d.visible);
  check("and returns focus to the tab", el?.tag === "button" && el.name.endsWith("Index"), el?.name ?? "");

  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await dockSettles(page, false);
  d = await dock(page);
  check("focus leaving the dock closes it", d.open === "false" && !d.visible, `focus on "${(await active(page))?.name}"`);

  const target = roles[roles.length - 1];
  // Focus is on the control before the dock; one Tab is the dock's tab again.
  await page.keyboard.press("Tab");
  check(`"${target.label}" reachable through the reopened dock`, await viaIndexFromTab(page, target));
  const after = await currentIndexItems(page);
  check('Enter scrolls there and marks it aria-current="location"', after.length === 1 && after[0] === `#${target.id}`, after.join(", "));
  check("the dock closes behind it", (await dock(page)).open === "false");
  const land = await page.evaluate((id) => {
    const s = document.getElementById(id)!;
    return { top: s.getBoundingClientRect().top, margin: parseFloat(getComputedStyle(s).scrollMarginTop) || 0 };
  }, target.id);
  check("the section lands at its scroll margin", Math.abs(land.top - land.margin) <= 4, `${Math.round(land.top)}px, margin ${land.margin}px`);

  check('"Back to the top" is the next Tab stop', await tabTo(page, (x) => x.name === "Back to the top", { limit: 2 }));
  await page.keyboard.press("Enter");
  await settle(page);
  check("Enter returns to the top, no role current", (await page.evaluate(() => location.hash)) === "#top" && (await currentIndexItems(page)).length === 0);
}

/** With focus on the dock's tab: open it, walk to a role's link and follow it. */
async function viaIndexFromTab(page: Page, role: Role) {
  const onTab = (await active(page))?.name.endsWith("Index");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  // Opening the dock focuses its first link, which may already be the one.
  const isLink = (el: Focused | null) => el?.tag === "a" && el.name === role.label;
  const link = isLink(await active(page)) || (await tabTo(page, isLink, { limit: roles.length + 1 }));
  await page.keyboard.press("Enter");
  await settle(page);
  return Boolean(onTab) && link;
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
  await drum(page);
  await projectCta(page);
  await experienceCta(page);
  const role = movableRole();
  await carousel(page, role);
  await pager(page, role);
  await experienceOnly(page);
  await index(page);
  await exportDoor(page);

  console.log("");
  check("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await browser.close();
  console.log(failures === 0 ? "\n  keyboard walkthrough: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
