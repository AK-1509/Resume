import type { CaseCategory } from "./schema";

/**
 * The id of each entry on the portfolio page, which the Index scrolls to.
 * Projects and case studies are listed in different sections, so their ids
 * carry the section.
 */
export function entryAnchor(category: CaseCategory, slug: string): string {
  return category === "case-study" ? `case-${slug}` : `project-${slug}`;
}

/** Each section's heading, as the page, the header and the Index name it. */
export const CATEGORY_LABELS: Record<CaseCategory, string> = {
  project: "Projects",
  "case-study": "Case studies",
};

/** Each section's id on the portfolio page. */
export const CATEGORY_SECTION: Record<CaseCategory, string> = {
  project: "projects",
  "case-study": "case-studies",
};
