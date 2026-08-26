/**
 * DEV ONLY — test targets derived from the live content.
 *
 * The check scripts used to hardcode entry titles and skill labels from the
 * seed data, so replacing the placeholder content broke every one of them at
 * once. Everything they need to aim at is now read from content/resume.json,
 * which means they keep working as the resume changes.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");

export type Fixture = {
  id: string;
  title: string;
  type: "education" | "work" | "project";
  endorsedSkills: string[];
  gallery: { id: string; alt: string }[];
  summary: string;
  responsibilities: string[];
};

export type Content = {
  profile: { name: string };
  skills: { id: string; label: string }[];
  experiences: Fixture[];
};

export const content: Content = JSON.parse(
  readFileSync(join(ROOT, "content", "resume.json"), "utf8"),
);

const hasDetail = (e: Fixture) =>
  e.summary.trim().length > 0 || e.responsibilities.length > 0 || e.gallery.length > 0;

/** An entry that opens a modal — i.e. renders as a button, not a static record. */
export function openableEntry(type?: Fixture["type"]): Fixture {
  const found = content.experiences.find((e) => hasDetail(e) && (!type || e.type === type));
  if (!found) throw new Error(`no openable entry${type ? ` of type ${type}` : ""} in resume.json`);
  return found;
}

/** An entry with at least one gallery image, or null if none has one. */
export function entryWithGallery(): Fixture | null {
  return content.experiences.find((e) => e.gallery.length > 0) ?? null;
}

/** The skill endorsed by the most entries — the most useful thing to filter on. */
export function busiestSkill(): { id: string; label: string; count: number } {
  const counts = new Map<string, number>();
  for (const e of content.experiences) {
    for (const id of e.endorsedSkills) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const [id, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const skill = content.skills.find((s) => s.id === id);
  if (!skill) throw new Error("no endorsed skills in resume.json");
  return { ...skill, count };
}

/** Two skills that no single entry endorses together, for the empty state. */
export function conflictingSkills(): [string, string] | null {
  const ids = content.skills.map((s) => s.id);
  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      const both = content.experiences.filter(
        (e) => e.endorsedSkills.includes(a) && e.endorsedSkills.includes(b),
      ).length;
      const eachAlone =
        content.experiences.some((e) => e.endorsedSkills.includes(a)) &&
        content.experiences.some((e) => e.endorsedSkills.includes(b));
      if (both === 0 && eachAlone) return [a, b];
    }
  }
  return null;
}

export function matchCount(ids: string[]): number {
  return content.experiences.filter((e) => ids.every((id) => e.endorsedSkills.includes(id))).length;
}
