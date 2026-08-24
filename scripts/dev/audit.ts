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
  // Count only real, visible controls inside the page's own landmarks —
  // axe-core and the dev overlay both inject transient focusable nodes, and
  // counting those makes this check flaky.
  const count = await page.evaluate(
    () =>
      [...document.querySelectorAll("a, button, [tabindex]:not([tabindex='-1'])")].filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width > 0 && r.height > 0 && s.visibility !== "hidden" && el.closest("main,header,footer")
        );
      }).length,
  );

  let reached = 0;
  const ringless: string[] = [];
  await page.evaluate(() => document.body.focus());

  for (let i = 0; i < count + 5; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const s = getComputedStyle(el);
      const width = parseFloat(s.outlineWidth) || 0;
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.textContent ?? "").trim().slice(0, 28),
        hasRing: width >= 2 && s.outlineStyle !== "none",
      };
    });
    if (!info) break;
    reached++;
    if (!info.hasRing) ringless.push(`${info.tag} "${info.label}"`);
    if (reached >= count) break;
  }

  check("every control is keyboard reachable", reached >= count, `${reached}/${count}`);
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
    console.log(`\n  ${vp.name} ${vp.width}x${vp.height}`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    check(
      "axe-core clean",
      results.violations.length === 0,
      results.violations.map((v) => `${v.id} (${v.nodes.length})`).join(", "),
    );
    for (const v of results.violations) {
      console.log(`        ${v.id}: ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) console.log(`          ${node.target.join(" ")}`);
    }

    if (vp.name === "desktop") {
      await landmarks(page);
      await focusRings(page);
      await zoom200(page);
    }

    await context.close();
  }

  await browser.close();
  console.log(failures === 0 ? "\n  accessibility floor: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
