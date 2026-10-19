/**
 * DEV ONLY — test targets derived from the live content.
 *
 * The check scripts used to hardcode entry titles and labels from the seed
 * data, so replacing the placeholder content broke every one of them at once.
 * Everything they need to aim at is read from content/resume.json and
 * content/portfolio.json instead, which means they keep working as the resume
 * and its presentation change.
 *
 * The split mirrors lib/portfolio.ts: a role's `project` entries are its
 * carousel slides, its `work` then `education` entries its experience list.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");

const read = <T>(file: string): T => JSON.parse(readFileSync(join(ROOT, "content", file), "utf8"));

type Entry = { id: string; title: string; type: "project" | "work" | "education"; organization: string };

const resume = read<{ experiences: Entry[] }>("resume.json");
const portfolio = read<{
  roles: { id: string; label: string; experienceIds: string[] }[];
  headlines: { experienceId: string; roleId: string }[];
}>("portfolio.json");

const entry = (id: string) => {
  const found = resume.experiences.find((e) => e.id === id);
  if (!found) throw new Error(`portfolio.json references ${id}, which is not in resume.json`);
  return found;
};

export type Row = { id: string; title: string; organization: string; type: Entry["type"] };

export type Role = {
  id: string;
  label: string;
  /** Carousel slides, in order. */
  projects: { id: string; title: string }[];
  /** Experience-page rows, jobs then degrees, as ExperienceList renders them. */
  rows: Row[];
  /** Both pages exist, so each carries a switch to the other. */
  hasSwitch: boolean;
};

export const roles: Role[] = portfolio.roles.map((r) => {
  const entries = r.experienceIds.map(entry);
  const rows = [...entries.filter((e) => e.type === "work"), ...entries.filter((e) => e.type === "education")];
  const projects = entries.filter((e) => e.type === "project");
  return {
    id: r.id,
    label: r.label,
    projects: projects.map(({ id, title }) => ({ id, title })),
    rows: rows.map(({ id, title, organization, type }) => ({ id, title, organization, type })),
    hasSwitch: projects.length > 0 && rows.length > 0,
  };
});

export type Headline = {
  /** 1-based position on the drum, as the segment buttons and counter show it. */
  position: number;
  role: Role;
  page: "projects" | "experience";
  entryId: string;
  title: string;
  /** Position in the role's carousel, 0-based; -1 on the experience page. */
  slideIndex: number;
  /** The hero's call to action for this headline — mirrors HeroHeadlines. */
  cta: string;
  /** Where the call to action links. */
  href: string;
};

export const headlines: Headline[] = portfolio.headlines.map((h, i) => {
  const e = entry(h.experienceId);
  const role = roles.find((r) => r.id === h.roleId)!;
  const project = e.type === "project";
  const shortName = project || !e.organization ? e.title : e.organization;
  return {
    position: i + 1,
    role,
    page: project ? "projects" : "experience",
    entryId: e.id,
    title: e.title,
    slideIndex: role.projects.findIndex((p) => p.id === e.id),
    cta: project ? `See the ${shortName} project` : `See my role at ${shortName}`,
    href: project ? `#${role.id}` : `#${role.id}--${e.id}`,
  };
});

/**
 * A project headline whose slide is not already at the front of its
 * carousel, so following it has a visible effect.
 */
export function projectHeadline(): Headline {
  const found =
    headlines.find((h) => h.page === "projects" && h.slideIndex > 0) ??
    headlines.find((h) => h.page === "projects");
  if (!found) throw new Error("content/portfolio.json has no headline for a side project");
  return found;
}

/** A headline that lands on an experience row, in a role that opens on its projects. */
export function experienceHeadline(): Headline {
  const found =
    headlines.find((h) => h.page === "experience" && h.role.hasSwitch) ??
    headlines.find((h) => h.page === "experience");
  if (!found) throw new Error("content/portfolio.json has no headline for a job or degree");
  return found;
}

/** A role with both pages and at least two slides, so its carousel and pager can both move. */
export function movableRole(): Role {
  const found = roles.find((r) => r.hasSwitch && r.projects.length > 1);
  if (!found) throw new Error("no role in content/portfolio.json has two projects and an experience page");
  return found;
}

/** A role with no projects, which opens on its experience page with no switch. */
export function experienceOnlyRole(): Role | null {
  return roles.find((r) => r.projects.length === 0) ?? null;
}
