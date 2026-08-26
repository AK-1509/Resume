/**
 * DEV ONLY — the accessibility floor, checked rather than assumed.
 *
 * Usage: npx tsx scripts/dev/audit.ts [baseUrl]
 *
 * Runs axe-core at both review viewports, then checks the things axe cannot
 * see: landmark structure, heading order, whether every interactive element is
 * reachable and shows a visible focus ring, and whether the page survives a
 * 200% zoom without horizontal scroll.
 */
import { chromium, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openableEntry } from "./fixtures";

/** Entry titles come from user content and may contain regex metacharacters. */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const BASE = process.argv[2] ?? "http://localhost:3000";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const;

let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

async function landmarks(page: Page) {
  const found = await page.evaluate(() => ({
    header: document.querySelectorAll("header").length,
    main: document.querySelectorAll("main").length,
    footer: document.querySelectorAll("footer").length,
    unlabelledSections: [...document.querySelectorAll("section")].filter(
      (s) => !s.getAttribute("aria-labelledby") && !s.getAttribute("aria-label"),
    ).length,
    h1: document.querySelectorAll("h1").length,
    headingOrder: [...document.querySelectorAll("h1,h2,h3")].map((h) => Number(h.tagName[1])),
  }));

  check("one <main>", found.main === 1, `found ${found.main}`);
  check("one <h1>", found.h1 === 1, `found ${found.h1}`);
  check("<header> and <footer> present", found.header >= 1 && found.footer >= 1);
  check(
    "every <section> is labelled",
    found.unlabelledSections === 0,
    `${found.unlabelledSections} unlabelled`,
  );

  let skipped = "";
  for (let i = 1; i < found.headingOrder.length; i++) {
    if (found.headingOrder[i] - found.headingOrder[i - 1] > 1) {
      skipped = `h${found.headingOrder[i - 1]} → h${found.headingOrder[i]}`;
    }
  }
  check("no skipped heading levels", skipped === "", skipped);
}

async function focusRings(page: Page) {
  // Reload first, then count. Earlier checks scroll the page (Playwright
  // scrolls an element into view before clicking it), which reveals the sticky
  // bar — counting in one scroll state and tabbing in another would report
  // controls as unreachable when they are simply not present.
  // Chromium restores the previous scroll offset across a reload, so reset it
  // explicitly — otherwise the sticky bar is still on screen and gets counted.
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  // Count only real, visible controls inside the page's own landmarks —
  // axe-core and the dev overlay both inject transient focusable nodes, and
  // counting those makes this check flaky.
  const expected: string[] = await page.evaluate(
    () =>
      [...document.querySelectorAll("a, button, [tabindex]:not([tabindex='-1'])")].filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== "hidden" &&
          // The sticky bar is inert while scrolled out of view; its controls
          // are correctly not tabbable and must not be counted as missing.
          !el.closest("[inert]") &&
          el.closest("main,header,footer")
        );
      }).map((el) => {
        const alt = [...el.querySelectorAll("img")].map((im) => im.alt).join(" ");
        return `${el.tagName}:${(el.textContent ?? "").trim()}${alt}`.slice(0, 80);
      }),
  );
  const count = expected.length;

  const seen = new Set<string>();
  const ringless: string[] = [];

  // Tabbing off the last control parks focus on <body> before wrapping, so a
  // body reading is skipped rather than treated as the end of the sequence.
  for (let i = 0; i < count * 2 + 10; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const alt = [...el.querySelectorAll("img")].map((im) => im.alt).join(" ");
      return {
        key: `${el.tagName}:${(el.textContent ?? "").trim()}${alt}`.slice(0, 80),
        tag: el.tagName.toLowerCase(),
        label: (el.getAttribute("aria-label") ?? (el.textContent ?? "") + alt).trim().slice(0, 28),
        hasRing: (parseFloat(s.outlineWidth) || 0) >= 2 && s.outlineStyle !== "none",
      };
    });
    if (!info) continue;
    // Deliberately no early break on a repeat: two controls can share a key
    // (the theme switch is icon-only, so its text content is empty in both
    // places it appears). The loop is bounded instead.
    seen.add(info.key);
    if (!info.hasRing) ringless.push(`${info.tag} "${info.label}"`);
  }

  // Tabbing scrolls the page, which can reveal the sticky bar part-way through
  // the sequence — so more controls may be reached than were present at the
  // top. What matters is that none of the ones counted were missed.
  const missed = expected.filter((k) => !seen.has(k));
  if (missed.length) console.log(`        never reached: ${missed.join(" | ")}`);

  check(
    "every control is keyboard reachable",
    missed.length === 0,
    `${count - missed.length}/${count} reached`,
  );
  check(
    "every focused control shows a ≥2px ring",
    ringless.length === 0,
    ringless.slice(0, 3).join(", "),
  );
}

async function zoom200(page: Page) {
  await page.setViewportSize({ width: 720, height: 900 }); // 1440 at 200%
  await page.waitForTimeout(200);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check("no horizontal scroll at 200% zoom", overflow <= 0, `${overflow}px`);
}

async function main() {
  const browser = await chromium.launch();

  for (const vp of VIEWPORTS) {
    for (const theme of ["light", "dark"] as const) {
      console.log(`\n  ${vp.name} ${vp.width}x${vp.height} — ${theme}`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        colorScheme: theme,
      });
      const page = await context.newPage();
      await page.goto(BASE, { waitUntil: "networkidle" });

      const applied = await page.evaluate(() => document.documentElement.dataset.theme);
      check(`theme follows the OS preference`, applied === theme, `applied ${applied}`);

      // Modal content is only in the DOM while open, so audit it open too.
      await page
        .getByRole("button", { name: new RegExp(escapeRe(openableEntry().title)) })
        .first()
        .click();
      await page.waitForTimeout(250);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      check(
        "axe-core clean (page + open modal)",
        results.violations.length === 0,
        results.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", "),
      );
      for (const v of results.violations) {
        console.log(`        ${v.id}: ${v.help}`);
        for (const node of v.nodes.slice(0, 3)) console.log(`          ${node.target.join(" ")}`);
      }

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);

      if (vp.name === "desktop" && theme === "light") {
        await landmarks(page);
        await focusRings(page);
        await zoom200(page);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log(failures === 0 ? "\n  accessibility floor: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
