import raw from "@/content/portfolio.json";
import { resume } from "./resume";
import { PortfolioSchema, portfolioIssues, type Experience, type Portfolio, type Skill } from "./schema";

/**
 * Parsed at module load, like `resume`, so a bad reference fails the build
 * rather than rendering a slide that points at nothing.
 */
export const portfolio: Portfolio = (() => {
  const parsed = PortfolioSchema.parse(raw);
  const issues = portfolioIssues(parsed, resume);
  if (issues.length) {
    throw new Error(
      `content/portfolio.json:\n${issues.map((i) => `  ${i.where}: ${i.what}`).join("\n")}`,
    );
  }
  return parsed;
})();

/** The two pages every role section turns between. */
export type RolePage = "projects" | "experience";

/**
 * One role section, resolved and split the way the page shows it: side
 * projects in the image carousel, jobs and degrees in the experience list.
 * Each keeps the order portfolio.json gives it.
 */
export type RoleView = {
  id: string;
  label: string;
  summary: string;
  projects: Experience[];
  professional: Experience[];
  academic: Experience[];
  /** Every skill the role's entries endorse, most-used first. Derived, never stored. */
  kit: Skill[];
  entryCount: number;
};

export type HeadlineView = {
  line: string;
  proof: string;
  /** "Validex Health Labs" for a project, "Title, Organization" otherwise. */
  attribution: string;
  /** Short name used in the call to action: the project title or the employer. */
  shortName: string;
  roleId: string;
  roleLabel: string;
  entryId: string;
  /** Which page of the role section holds the entry. */
  page: RolePage;
  /** Position in the carousel when `page` is "projects", otherwise -1. */
  slideIndex: number;
};

const experienceById = new Map(resume.experiences.map((e) => [e.id, e]));
const skillById = new Map(resume.skills.map((s) => [s.id, s]));

const isProject = (e: Experience) => e.type === "project";

export function roleViews(): RoleView[] {
  return portfolio.roles.map((role) => {
    const entries = role.experienceIds.map((id) => experienceById.get(id)!);
    const tally = new Map<string, number>();
    for (const e of entries) {
      for (const id of e.endorsedSkills) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    const kit = [...tally.keys()]
      .map((id) => skillById.get(id)!)
      .sort((a, b) => tally.get(b.id)! - tally.get(a.id)! || a.label.localeCompare(b.label));
    return {
      id: role.id,
      label: role.label,
      summary: role.summary,
      projects: entries.filter(isProject),
      professional: entries.filter((e) => e.type === "work"),
      academic: entries.filter((e) => e.type === "education"),
      kit,
      entryCount: entries.length,
    };
  });
}

export function headlineViews(): HeadlineView[] {
  return portfolio.headlines.map((h) => {
    const e = experienceById.get(h.experienceId)!;
    const role = portfolio.roles.find((r) => r.id === h.roleId)!;
    const project = isProject(e) || !e.organization;
    const projects = role.experienceIds.filter((id) => isProject(experienceById.get(id)!));
    return {
      line: h.line,
      proof: h.proof,
      attribution: project ? e.title : `${e.title}, ${e.organization}`,
      shortName: project ? e.title : e.organization,
      roleId: role.id,
      roleLabel: role.label,
      entryId: e.id,
      page: isProject(e) ? "projects" : "experience",
      slideIndex: projects.indexOf(e.id),
    };
  });
}

/** The value-proposition line for an entry, if the hero carries one. */
export function headlineFor(id: string): string | null {
  return portfolio.headlines.find((h) => h.experienceId === id)?.line ?? null;
}
