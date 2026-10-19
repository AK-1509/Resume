/**
 * DEV ONLY — test targets derived from the live content.
 *
 * The check scripts used to hardcode entry titles and labels from the seed
 * data, so replacing the placeholder content broke every one of them at once.
 * Everything they need to aim at is read from content/resume.json and
 * content/portfolio.json instead, which means they keep working as the resume
 * and its presentation change.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");

const read = <T>(file: string): T => JSON.parse(readFileSync(join(ROOT, "content", file), "utf8"));

type Entry = { id: string; title: string; type: string; organization: string };

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

export type Role = { id: string; label: string; titles: string[] };

/** The role sections, in page order, with the card titles each one stacks. */
export const roles: Role[] = portfolio.roles.map((r) => ({
  id: r.id,
  label: r.label,
  titles: r.experienceIds.map((id) => entry(id).title),
}));

export type Headline = {
  /** 1-based position on the drum, as the segment buttons and counter show it. */
  position: number;
  /** The name used in "Open the X card" — mirrors headlineViews() in lib/portfolio.ts. */
  shortName: string;
  role: Role;
  /** Where the headline's card sits in its role's stack, 0-based. */
  cardIndex: number;
  title: string;
};

export const headlines: Headline[] = portfolio.headlines.map((h, i) => {
  const e = entry(h.experienceId);
  const raw = portfolio.roles.find((r) => r.id === h.roleId)!;
  return {
    position: i + 1,
    shortName: e.type === "project" || !e.organization ? e.title : e.organization,
    role: roles.find((r) => r.id === h.roleId)!,
    cardIndex: raw.experienceIds.indexOf(h.experienceId),
    title: e.title,
  };
});

/**
 * A headline whose card is not already at the front of its stack, so opening
 * it has a visible effect. Falls back to the first headline.
 */
export function headlineBehindTheFront(): Headline {
  const found = headlines.find((h) => h.cardIndex > 0) ?? headlines[0];
  if (!found) throw new Error("content/portfolio.json has no headlines");
  return found;
}

/** A role with at least two cards, so its carousel can actually move. */
export function movableRole(): Role {
  const found = roles.find((r) => r.titles.length > 1);
  if (!found) throw new Error("no role in content/portfolio.json stacks more than one card");
  return found;
}
