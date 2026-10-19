import raw from "@/content/portfolio.json";
import { resume } from "./resume";
import { PortfolioSchema, portfolioIssues, type Experience, type Portfolio, type Skill } from "./schema";

/**
 * Parsed at module load, like `resume`, so a bad reference fails the build
 * rather than rendering a card that points at nothing.
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

/** One role section, resolved to the experiences it stacks. */
export type RoleView = {
  id: string;
  label: string;
  summary: string;
  experiences: Experience[];
  /** Every skill the stacked entries endorse, most-used first. Derived, never stored. */
  kit: Skill[];
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
  /** Position of the entry inside its role's stack. */
  cardIndex: number;
};

const experienceById = new Map(resume.experiences.map((e) => [e.id, e]));
const skillById = new Map(resume.skills.map((s) => [s.id, s]));

export function roleViews(): RoleView[] {
  return portfolio.roles.map((role) => {
    const experiences = role.experienceIds.map((id) => experienceById.get(id)!);
    const tally = new Map<string, number>();
    for (const e of experiences) {
      for (const id of e.endorsedSkills) tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    const kit = [...tally.keys()]
      .map((id) => skillById.get(id)!)
      .sort((a, b) => tally.get(b.id)! - tally.get(a.id)! || a.label.localeCompare(b.label));
    return { id: role.id, label: role.label, summary: role.summary, experiences, kit };
  });
}

export function headlineViews(): HeadlineView[] {
  return portfolio.headlines.map((h) => {
    const e = experienceById.get(h.experienceId)!;
    const role = portfolio.roles.find((r) => r.id === h.roleId)!;
    const project = e.type === "project" || !e.organization;
    return {
      line: h.line,
      proof: h.proof,
      attribution: project ? e.title : `${e.title}, ${e.organization}`,
      shortName: project ? e.title : e.organization,
      roleId: role.id,
      roleLabel: role.label,
      cardIndex: role.experienceIds.indexOf(h.experienceId),
    };
  });
}

export function demoFor(id: string): string | null {
  return portfolio.demos[id] ?? null;
}
