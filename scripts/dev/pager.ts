/**
 * DEV ONLY — the side-by-side pager in each role section, and the gold switch
 * above it: tabs, arrow keys, dragging the handle, sideways scrolling, and
 * that only the page in view is outside inert.
 *
 * Usage: npx tsx scripts/dev/pager.ts [baseUrl]
 */
import { chromium, type Page } from "@playwright/test";
import { roles } from "./fixtures";

const BASE = process.argv[2] ?? "http://localhost:3000";

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

/** Wait until the track has stopped moving and the switch has caught up. */
async function settle(page: Page, roleId: string) {
  let last = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(120);
    const x = await page.evaluate((id) => document.querySelector(`#${id} .pf-track`)?.scrollLeft ?? 0, roleId);
    if (x === last) break;
    last = x;
  }
  await page.waitForTimeout(250);
}

const view = (page: Page, roleId: string) =>
  page.evaluate((id) => {
    const s = document.getElementById(id)!;
    const track = s.querySelector(".pf-track") as HTMLElement;
    const max = track.scrollWidth - track.clientWidth;
    const pages = [...s.querySelectorAll(".pf-page")] as HTMLElement[];
    return {
      selected: s.querySelector("[role=tab][aria-selected=true]")?.id.split("-tab-")[1] ?? "",
      here: pages.find((p) => p.dataset.state === "here")?.classList.contains("pf-page--projects") ? "projects" : "experience",
      at: max > 0 ? Math.round((track.scrollLeft / max) * 100) / 100 : 0,
      inertAway: pages.filter((p) => p.dataset.state === "away").every((p) => p.querySelector(".pf-page__body")?.hasAttribute("inert")),
      heightMatches:
        Math.abs(track.offsetHeight - 40 - (pages.find((p) => p.dataset.state === "here")?.offsetHeight ?? 0)) <= 2,
    };
  }, roleId);

async function main() {
  const role = roles.find((r) => r.hasSwitch);
  if (!role) throw new Error("no role in content/portfolio.json has both side projects and experience");

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: "networkidle" });

  const section = page.locator(`#${role.id}`);
  await section.locator(".pf-switch").scrollIntoViewIfNeeded();
  console.log(`\n  ${role.label}\n`);

  let v = await view(page, role.id);
  check("starts on side projects", v.selected === "projects" && v.here === "projects" && v.at === 0, JSON.stringify(v));
  check("the experience page waits beside it, inert", v.inertAway);
  check("the track is as tall as the page in view", v.heightMatches);

  // Tabs
  await section.getByRole("tab", { name: /Experience/ }).click();
  await settle(page, role.id);
  v = await view(page, role.id);
  check("clicking Experience slides to it", v.selected === "experience" && v.here === "experience" && v.at === 1, JSON.stringify(v));
  check("…and the track follows its height", v.heightMatches);

  await page.keyboard.press("ArrowLeft");
  await settle(page, role.id);
  v = await view(page, role.id);
  check("ArrowLeft on the tabs goes back", v.selected === "projects" && v.at === 0, JSON.stringify(v));
  const focused = await page.evaluate(() => document.activeElement?.getAttribute("role"));
  check("focus stays on the switch", focused === "tab", String(focused));

  await page.keyboard.press("End");
  await settle(page, role.id);
  check("End jumps to the last page", (await view(page, role.id)).selected === "experience");
  await page.keyboard.press("Home");
  await settle(page, role.id);
  check("Home jumps to the first page", (await view(page, role.id)).selected === "projects");

  // Dragging the handle: the pages follow live, then settle on release.
  const thumb = await section.locator(".pf-switch__thumb").boundingBox();
  const rail = await section.locator(".pf-switch__rail").boundingBox();
  if (!thumb || !rail) throw new Error("switch not rendered");
  const y = thumb.y + thumb.height / 2;
  await page.mouse.move(thumb.x + thumb.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(thumb.x + thumb.width / 2 + rail.width * 0.2, y, { steps: 8 });
  const mid = await view(page, role.id);
  check("mid-drag the pages move with the handle", mid.at > 0.2 && mid.at < 0.6, `at ${mid.at}`);
  await page.mouse.move(thumb.x + thumb.width / 2 + rail.width * 0.35, y, { steps: 6 });
  await page.mouse.up();
  await settle(page, role.id);
  v = await view(page, role.id);
  check("released past halfway, it settles on Experience", v.selected === "experience" && v.at === 1, JSON.stringify(v));

  const back = await section.locator(".pf-switch__thumb").boundingBox();
  await page.mouse.move(back!.x + back!.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(back!.x + back!.width / 2 - rail.width * 0.12, y, { steps: 6 });
  await page.mouse.up();
  await settle(page, role.id);
  v = await view(page, role.id);
  check("released short of halfway, it springs back", v.selected === "experience" && v.at === 1, JSON.stringify(v));

  // Sideways scrolling on the pages themselves.
  const head = await section.locator(".pf-page--experience .pf-page__head").boundingBox();
  await page.mouse.move(head!.x + 40, head!.y + 10);
  await page.mouse.wheel(-600, 0);
  await settle(page, role.id);
  v = await view(page, role.id);
  check("a sideways scroll on the pages turns back to projects", v.selected === "projects" && v.at === 0, JSON.stringify(v));

  // The dimmed sliver is a shortcut.
  const sliver = await section.locator(".pf-page--experience").boundingBox();
  await page.mouse.click(sliver!.x + 12, sliver!.y + 120);
  await settle(page, role.id);
  check("clicking the other page's sliver turns to it", (await view(page, role.id)).selected === "experience");

  // A role with only one kind of entry shows one page and no switch.
  const single = roles.find((r) => !r.hasSwitch);
  if (single) {
    const s = await page.evaluate(
      (id) => ({
        switches: document.querySelectorAll(`#${id} .pf-switch`).length,
        pages: document.querySelectorAll(`#${id} .pf-page`).length,
      }),
      single.id,
    );
    check(`${single.label}: one page, no switch`, s.switches === 0 && s.pages === 1, JSON.stringify(s));
  }

  console.log("");
  check("no uncaught page errors", errors.length === 0, errors.slice(0, 2).join("; "));
  await browser.close();
  console.log(failures === 0 ? "\n  pager: clean\n" : `\n  ${failures} failure(s)\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
