import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CaseStudySchema, caseStudyIssues, type CaseStudy } from "./schema";

/**
 * Case studies are read from disk rather than imported, so a new project page
 * is one new file: drop `<slug>.json` into content/case-studies and it gets a
 * route, an Index entry and a place in `npm run validate`.
 *
 * Server only: it uses the filesystem, and every page it feeds is prerendered.
 */
const DIR = join(process.cwd(), "content", "case-studies");

/** Files starting with an underscore are templates, never published pages. */
const isTemplate = (file: string) => file.startsWith("_");

function read(file: string): CaseStudy {
  const name = file.replace(/\.json$/, "");
  const parsed = CaseStudySchema.safeParse(JSON.parse(readFileSync(join(DIR, file), "utf8")));
  if (!parsed.success) {
    throw new Error(
      `content/case-studies/${file}:\n${parsed.error.issues
        .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n")}`,
    );
  }
  const issues = caseStudyIssues(parsed.data, name);
  if (issues.length) {
    throw new Error(`content/case-studies/${file}:\n${issues.map((i) => `  ${i.where}: ${i.what}`).join("\n")}`);
  }
  return parsed.data;
}

function files(): string[] {
  return readdirSync(DIR).filter((f) => f.endsWith(".json"));
}

/** Published case studies, in Index order. */
export function caseStudies(): CaseStudy[] {
  return files()
    .filter((f) => !isTemplate(f))
    .map(read)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.title.localeCompare(b.title));
}

/**
 * Every slug that gets a route. In development the template is included too,
 * at /projects/template, so the bare page can be checked as it is edited.
 */
export function caseStudySlugs(): string[] {
  const published = caseStudies().map((s) => s.slug);
  if (process.env.NODE_ENV === "production") return published;
  return [
    ...published,
    ...files()
      .filter(isTemplate)
      .map((f) => read(f).slug),
  ];
}

export function caseStudy(slug: string): CaseStudy | null {
  const file = files().find((f) => f.replace(/^_/, "").replace(/\.json$/, "") === slug);
  if (!file) return null;
  if (isTemplate(file) && process.env.NODE_ENV === "production") return null;
  return read(file);
}
