/**
 * DEV ONLY — keyboard-only walkthrough of the page: the theme switch, the
 * hero headline drum, the role carousels, the role index and the export
 * dialog's front door.
 *
 * Usage: npx tsx scripts/dev/keyboard.ts [baseUrl]
 *
 * Every step drives the page with the keyboard alone — no clicks anywhere.
 * The export flow itself is covered by keyboard-export.ts.
 */
import { chromium, type Page } from "@playwright/test";
import { headlineBehindTheFront, headlines, roles, type Role } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";

/** --color-green-pale and --color-espresso, the light and dark page grounds. */
const LIGHT_PAGE = "rgb(241, 245, 239)";
const DARK_PAGE = "rgb(33, 26, 22)";


let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
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
      inStage: Boolean(el.closest(".pf-stage")),
      inFrontCard: Boolean(el.closest(".pf-slot.is-active")),
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

const stack = (page: Page, role: Role) =>
  page.evaluate((id) => {
    const section = document.getElementById(id)!;
    const slots = [...section.querySelectorAll(".pf-slot")];
    return {
      count: section.querySelector(".pf-count")?.textContent?.trim() ?? "",
      front: section.querySelector(".pf-slot.is-active h3")?.textContent?.trim() ?? "",
      next: section.querySelector(".pf-next")?.textContent?.trim() ?? "",
      inertBehind: slots.filter((s) => !s.classList.contains("is-active") && s.hasAttribute("inert")).length,
      frontInert: Boolean(section.querySelector(".pf-slot.is-active[inert]")),
      slots: slots.length,
    };
  }, role.id);

const currentIndexItems = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".druid-index a[aria-current='location']")].map(
      (a) => a.getAttribute("href") ?? "",
    ),
  );

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
  check("named \"Dark mode\", inside the banner", el?.name === "Dark mode" &&
    (await page.evaluate(() => Boolean(document.activeElement?.closest("header")))));
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

  // Pause first, so the drum cannot roll on under the checks that follow.
  check("Pause reachable by Tab", await tabTo(page, named("Pause headlines")));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const paused = await page.evaluate(() => ({
    pressed: document.activeElement?.getAttribute("aria-pressed"),
    label: document.activeElement?.textContent?.trim(),
    play: getComputedStyle(document.querySelector(".pf-seg.is-active .pf-seg__fill")!).animationPlayState,
  }));
  check("Enter pauses: aria-pressed and the label flip", paused.pressed === "true" && paused.label === "Resume headlines", `${paused.pressed}, "${paused.label}"`);
  check("the timer animation is paused", paused.play === "paused", paused.play);

  const start = await heroCount(page);
  await page.waitForTimeout(1500);
  check("the drum holds while paused", (await heroCount(page)) === start, `${start} → ${await heroCount(page)}`);

  check("Next reachable by Tab", await tabTo(page, named("Next headline"), { limit: 3 }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const afterNext = await heroCount(page);
  const expected = (start % n) + 1;
  check("Enter on Next advances one headline", afterNext === expected, `${start} → ${afterNext}`);

  const view = await page.evaluate(() => ({
    live: [...document.querySelectorAll(".pf-line")].filter((l) => !l.hasAttribute("inert")).length,
    seg: document.querySelector(".pf-seg[aria-current='true']")?.getAttribute("aria-label") ?? "",
    open: document.querySelector(".pf-hero__controls a")?.textContent?.replace("↘", "").trim() ?? "",
  }));
  const shown = headlines[afterNext - 1];
  check("only the headline on the drum is outside inert", view.live === 1, `${view.live} live`);
  check("its segment carries aria-current", view.seg.startsWith(`Headline ${afterNext}:`), view.seg);
  check("the call to action names it", view.open === `Open the ${shown.shortName} card`, view.open);

  check("Previous reachable by Shift+Tab", await tabTo(page, named("Previous headline"), { back: true, limit: 3 }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("Enter on Previous goes back", (await heroCount(page)) === start);

  // Jump to a headline whose card is not already at the front of its stack,
  // through its segment button, then open the card.
  const target = headlineBehindTheFront();
  check(
    `segment "Headline ${target.position}" reachable by Shift+Tab`,
    await tabTo(page, named(`Headline ${target.position}:`), { back: true, limit: n + 6 }),
  );
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  check("Enter on a segment jumps to it", (await heroCount(page)) === target.position, `${await heroCount(page)}`);

  const opener = `Open the ${target.shortName} card`;
  check(`"${opener}" reachable by Tab`, await tabTo(page, named(opener), { limit: n + 6 }));
  await page.keyboard.press("Enter");
  await settle(page);

  const role = target.role;
  const s = await stack(page, role);
  check("the link lands on the role section", (await page.evaluate(() => location.hash)) === `#${role.id}`);
  check(
    `"${target.title}" is now the front card of ${role.label}`,
    s.front === target.title && s.count === `${target.cardIndex + 1} of ${role.titles.length}`,
    `${s.front} (${s.count})`,
  );
  check("every card behind it is inert", s.inertBehind === s.slots - 1 && !s.frontInert, `${s.inertBehind}/${s.slots - 1}`);

  // The fragment moves the sequential focus starting point, so the next Tab
  // continues inside the section rather than back in the hero.
  check(
    "the next Tab continues inside that section",
    await tabTo(page, (el) => el.section === role.id, { limit: 2 }),
    (await active(page))?.name.slice(0, 40) ?? "",
  );

  return target;
}

async function carousel(page: Page, role: Role) {
  console.log(`\n  ${role.label} carousel\n`);
  const n = role.titles.length;

  // Bring the stack back to its first card with ArrowLeft before measuring.
  const inSection = (el: Focused) => el.section === role.id;
  check("Next reachable by Tab", await tabTo(page, (el) => inSection(el) && el.name.startsWith("Next:"), { limit: 6 }));
  for (let i = 0; i < n; i++) {
    if ((await stack(page, role)).count.startsWith("1 of")) break;
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(150);
  }
  let s = await stack(page, role);
  check("ArrowLeft walks back to the first card", s.count === `1 of ${n}` && s.front === role.titles[0], s.count);
  check("Next names the card behind", s.next.includes(role.titles[1 % n]), s.next);

  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  s = await stack(page, role);
  check("Enter on Next brings the second card forward", s.front === role.titles[1 % n] && s.count === `2 of ${n}`, s.count);

  check("Previous reachable by Shift+Tab", await tabTo(page, (el) => inSection(el) && el.name === "Previous", { back: true, limit: 3 }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  s = await stack(page, role);
  check("Enter on Previous goes back", s.front === role.titles[0], s.count);

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  s = await stack(page, role);
  check("ArrowRight on the region advances", s.front === role.titles[1 % n], s.count);

  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(400);
  s = await stack(page, role);
  check("ArrowLeft past the first card wraps to the last", s.front === role.titles[n - 1] && s.count === `${n} of ${n}`, s.count);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  check("ArrowRight past the last wraps to the first", (await stack(page, role)).front === role.titles[0]);

  s = await stack(page, role);
  check("only the front card is outside inert", s.inertBehind === n - 1 && !s.frontInert, `${s.inertBehind}/${n - 1} inert`);

  // Tab through everything in the section: nothing behind the front card may
  // take focus.
  const strays: string[] = [];
  let inFront = 0;
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const el = await active(page);
    if (!el || el.section !== role.id) break;
    if (el.inStage && !el.inFrontCard) strays.push(el.name.slice(0, 30));
    if (el.inInert) strays.push(`inert: ${el.name.slice(0, 30)}`);
    if (el.inFrontCard) inFront++;
  }
  check("Tab never reaches a card behind the front", strays.length === 0, strays.slice(0, 3).join(", "));
  console.log(`          ${inFront} control(s) in the front card took focus`);
}

async function index(page: Page) {
  console.log("\n  Role index\n");
  await fresh(page);

  const first = `#${roles[0].id}`;
  const current = await currentIndexItems(page);
  check("at the top, the first role is current", current.length === 1 && current[0] === first, current.join(", "));

  const target = roles[roles.length - 1];
  check(
    `"${target.label}" reachable by Tab`,
    await tabTo(page, (el) => el.tag === "a" && el.name === target.label && el.section === "top"),
  );
  await page.keyboard.press("Enter");
  await settle(page);
  const after = await currentIndexItems(page);
  check("Enter scrolls there and moves aria-current=\"location\"", after.length === 1 && after[0] === `#${target.id}`, after.join(", "));
  const land = await page.evaluate((id) => {
    const el = document.getElementById(id)!;
    return { top: el.getBoundingClientRect().top, margin: parseFloat(getComputedStyle(el).scrollMarginTop) || 0 };
  }, target.id);
  check(
    "the section lands under the header, at its scroll margin",
    Math.abs(land.top - land.margin) <= 4,
    `${Math.round(land.top)}px, margin ${land.margin}px`,
  );

  check(
    "\"Back to the role index\" is the next Tab stop",
    await tabTo(page, (el) => el.name === "Back to the role index", { limit: 2 }),
  );
  await page.keyboard.press("Enter");
  await settle(page);
  const back = await currentIndexItems(page);
  check("Enter returns to the index, first role current again", back.length === 1 && back[0] === first, back.join(", "));
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
  const opened = await drum(page);
  await carousel(page, opened.role);
  await index(page);
  await exportDoor(page);

  console.log("");
  check("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join("; "));

  await browser.close();
  console.log(failures === 0 ? "\n  keyboard walkthrough: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
