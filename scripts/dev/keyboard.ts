/**
 * DEV ONLY — keyboard-only walkthrough of the detail modal and gallery
 * lightbox. This is the Phase 4 checkpoint, run rather than described.
 *
 * Usage: npx tsx scripts/dev/keyboard.ts [baseUrl]
 *
 * Every step drives the page with the keyboard alone — no clicks anywhere.
 */
import { chromium, type Page } from "@playwright/test";
import { entryWithGallery, openableEntry } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

const active = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    // A control whose only content is an image takes its accessible name from
    // that image's alt text, so text content alone is not enough to identify it.
    const alt = [...el.querySelectorAll("img")].map((i) => i.alt).join(" ");
    const name =
      el.getAttribute("aria-label") ??
      `${(el.textContent ?? "").replace(/\s+/g, " ").trim()} ${alt}`.trim();
    return {
      tag: el.tagName.toLowerCase(),
      text: name.slice(0, 48),
      isBody: el === document.body,
      inDialog: Boolean(el.closest("dialog")),
    };
  });

const dialogs = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("dialog")].map((d) => ({
      open: d.open,
      label: d.getAttribute("aria-label") ?? d.getAttribute("aria-labelledby"),
    })),
  );

/** Tab until the accessible name of the focused element matches. */
async function tabTo(page: Page, needle: string, limit = 40): Promise<boolean> {
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press("Tab");
    const el = await active(page);
    if (el && el.text.toLowerCase().includes(needle.toLowerCase())) return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });

  console.log("\n  Detail modal — keyboard only\n");

  // --- Open a card that has a gallery -------------------------------------
  const target = openableEntry();
  const reached = await tabTo(page, target.title);
  check("card reachable by Tab", reached);

  const opener = await active(page);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);

  const afterOpen = await dialogs(page);
  check("Enter opens the modal", afterOpen.some((d) => d.open));

  const modalAria = await page.evaluate(() => {
    const d = [...document.querySelectorAll("dialog")].find((x) => x.open);
    if (!d) return null;
    const labelledby = d.getAttribute("aria-labelledby");
    return {
      role: d.getAttribute("role") ?? "dialog (implicit)",
      labelledby,
      labelText: labelledby ? (document.getElementById(labelledby)?.textContent ?? "") : "",
      modal: d.matches(":modal"),
    };
  });
  check("dialog is modal", Boolean(modalAria?.modal));
  check(
    "aria-labelledby points at the title",
    modalAria?.labelText.includes(target.title) ?? false,
    modalAria?.labelText ?? "",
  );

  // --- Focus is trapped ----------------------------------------------------
  // Tabbing past the last control in a modal dialog momentarily parks focus on
  // <body> before Chromium wraps it back, so a single body reading is not an
  // escape. What matters is that focus never lands on a control outside.
  let escapedTo: string | null = null;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    const el = await active(page);
    if (el && !el.inDialog && !el.isBody) {
      escapedTo = `${el.tag} "${el.text}"`;
      break;
    }
  }
  check("focus is trapped inside the modal", escapedTo === null, escapedTo ?? "");

  // --- Background scroll is locked ----------------------------------------
  const locked = await page.evaluate(() => getComputedStyle(document.body).overflow === "hidden");
  check("background scroll is locked", locked);

  // --- Open the lightbox from the gallery, keyboard only -------------------
  console.log("\n  Gallery lightbox — keyboard only\n");

  // The lightbox can only be exercised when the content has an image. Reported
  // as skipped rather than passed, so an empty gallery never looks like a green
  // run of checks that never executed.
  const galleryEntry = entryWithGallery();
  if (!galleryEntry) {
    console.log("  SKIP  no entry in content/resume.json has a gallery image");
    console.log("        (add one and re-run to cover the lightbox and ESC ordering)");
    await browser.close();
    console.log(failures === 0 ? "\n  keyboard walkthrough: clean\n" : `\n  ${failures} failure(s)\n`);
    process.exit(failures === 0 ? 0 : 1);
  }

  // Gallery buttons are labelled by their image alt text. Open the entry that
  // actually has one, in case it is not the entry opened above.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  await page.getByRole("button", { name: galleryEntry.title, exact: false }).first().click();
  await page.waitForTimeout(300);

  const foundImage = await tabTo(page, galleryEntry.gallery[0].alt, 40);
  check("gallery image reachable by Tab", foundImage);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);

  const stacked = await dialogs(page);
  check("lightbox stacks above the modal", stacked.filter((d) => d.open).length === 2);

  const counterBefore = await page.evaluate(
    () => document.querySelector("dialog[aria-label='Gallery'] [aria-live]")?.textContent?.trim(),
  );
  check("counter is shown", /^\d+ \/ \d+$/.test(counterBefore ?? ""), counterBefore ?? "");

  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(200);
  const counterAfter = await page.evaluate(
    () => document.querySelector("dialog[aria-label='Gallery'] [aria-live]")?.textContent?.trim(),
  );
  check("ArrowRight advances", counterBefore !== counterAfter, `${counterBefore} → ${counterAfter}`);

  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(200);
  const counterBack = await page.evaluate(
    () => document.querySelector("dialog[aria-label='Gallery'] [aria-live]")?.textContent?.trim(),
  );
  check("ArrowLeft goes back", counterBack === counterBefore, `${counterAfter} → ${counterBack}`);

  const fullColour = await page.evaluate(() => {
    const img = document.querySelector("dialog[aria-label='Gallery'] img");
    return img ? getComputedStyle(img).filter : null;
  });
  check("lightbox image is full colour", fullColour === "none", `filter: ${fullColour}`);

  // --- ESC ordering: lightbox first, then the modal ------------------------
  console.log("\n  Escape ordering\n");

  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const afterFirstEsc = await dialogs(page);
  check(
    "first Escape closes the lightbox only",
    afterFirstEsc.filter((d) => d.open).length === 1,
    `${afterFirstEsc.filter((d) => d.open).length} dialog(s) still open`,
  );

  await page.keyboard.press("Escape");
  await page.waitForTimeout(250);
  const afterSecondEsc = await dialogs(page);
  check("second Escape closes the modal", afterSecondEsc.every((d) => !d.open));

  const restored = await active(page);
  check(
    "focus returns to the originating card",
    restored?.text === opener?.text,
    `focus on "${restored?.text}"`,
  );

  const unlocked = await page.evaluate(() => getComputedStyle(document.body).overflow !== "hidden");
  check("scroll lock released", unlocked);

  // --- Click-outside -------------------------------------------------------
  console.log("\n  Pointer behaviour\n");
  await page.getByRole("button", { name: openableEntry().title, exact: false }).first().click();
  await page.waitForTimeout(250);
  const box = await page.evaluate(() => {
    const d = [...document.querySelectorAll("dialog")].find((x) => x.open);
    return d ? JSON.parse(JSON.stringify(d.getBoundingClientRect())) : null;
  });
  if (box) await page.mouse.click(box.x / 2, box.y / 2);
  await page.waitForTimeout(250);
  const afterOutside = await dialogs(page);
  check("click outside closes the modal", afterOutside.every((d) => !d.open));

  // --- Theme toggle --------------------------------------------------------
  console.log("\n  Theme\n");
  const toggle = page.getByRole("banner").getByRole("switch", { name: "Dark mode" });
  check("toggle exposes role=switch", (await toggle.count()) === 1);
  check("starts unchecked in light", (await toggle.getAttribute("aria-checked")) === "false");

  await toggle.press("Enter");
  await page.waitForTimeout(250);
  const dark = await page.evaluate(() => ({
    attr: document.documentElement.dataset.theme,
    stored: localStorage.getItem("theme"),
    bg: getComputedStyle(document.body).backgroundColor,
    checked: document.querySelector("[role=switch]")?.getAttribute("aria-checked"),
  }));
  check("Enter switches to dark", dark.attr === "dark" && dark.checked === "true");
  check("choice is persisted", dark.stored === "dark", `localStorage.theme=${dark.stored}`);
  check("page surface actually changes", dark.bg === "rgb(23, 23, 25)", dark.bg);

  await page.reload({ waitUntil: "networkidle" });
  const persisted = await page.evaluate(() => document.documentElement.dataset.theme);
  check("survives a reload without flashing light", persisted === "dark");

  await browser.close();
  console.log(failures === 0 ? "\n  keyboard walkthrough: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
