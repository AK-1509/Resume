/**
 * DEV ONLY — test targets derived from the live content.
 *
 * The check scripts never hardcode titles: everything they aim at is read from
 * content/case-studies, so they keep working as projects are added, renamed or
 * reordered.
 *
 * The order mirrors lib/case-studies.ts: published files only (a leading
 * underscore marks a template), sorted by `order`, then by title.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const DIR = join(ROOT, "content", "case-studies");

type Raw = { slug: string; title: string; order?: number };

export type Project = {
  slug: string;
  title: string;
  /** The id of its entry on the portfolio, which the Index scrolls to. */
  anchor: string;
  /** Its page. */
  href: string;
};

export const projects: Project[] = readdirSync(DIR)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as Raw)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title))
  .map(({ slug, title }) => ({ slug, title, anchor: `project-${slug}`, href: `/projects/${slug}` }));

if (projects.length < 2) throw new Error("the checks need at least two published projects in content/case-studies");

/** A project well down the list, so reaching it shows the page actually moved. */
export const laterProject = (): Project => projects[Math.min(projects.length - 1, 4)];
