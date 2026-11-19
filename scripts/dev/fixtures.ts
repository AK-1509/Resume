/**
 * DEV ONLY — test targets derived from the live content.
 *
 * The check scripts never hardcode titles: everything they aim at is read from
 * content/case-studies, so they keep working as pages are added, renamed,
 * reordered or moved between the two categories.
 *
 * The order mirrors lib/case-studies.ts: published files only (a leading
 * underscore marks a template), sorted by `order`, then by title. Each file is
 * a project (the default) or a case study, per its `category`.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const DIR = join(ROOT, "content", "case-studies");

type Category = "project" | "case-study";
type Raw = { slug: string; title: string; order?: number; category?: Category };

export type Project = {
  slug: string;
  title: string;
  category: Category;
  /** The id of its entry on the portfolio, which the Index scrolls to. */
  anchor: string;
  /** Its page. */
  href: string;
};

/** Every published page, projects and case studies alike. */
export const pages: Project[] = readdirSync(DIR)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .map((f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as Raw)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title))
  .map(({ slug, title, category = "project" }) => ({
    slug,
    title,
    category,
    anchor: `${category === "case-study" ? "case" : "project"}-${slug}`,
    href: `/projects/${slug}`,
  }));

/** The projects section, in page order. */
export const projects: Project[] = pages.filter((p) => p.category === "project");

/** The case-studies ledger, in page order. */
export const caseStudies: Project[] = pages.filter((p) => p.category === "case-study");

if (projects.length < 2) throw new Error("the checks need at least two published projects in content/case-studies");

/** A project well down the list, so reaching it shows the page actually moved. */
export const laterProject = (): Project => projects[Math.min(projects.length - 1, 4)];

/** A case study partway down the ledger, or undefined when there are none. */
export const laterCaseStudy = (): Project | undefined => caseStudies[Math.min(caseStudies.length - 1, 3)];
