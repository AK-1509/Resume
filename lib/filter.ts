import type { Experience, Skill } from "./schema";

/**
 * How non-matching entries behave when a filter is active.
 *
 * `collapse` keeps them on the page as one-line stubs. That matters for more
 * than tidiness: the cards are date-ordered, so their left borders form a
 * timeline, and the filtered view reads as the span of a career where a skill
 * was in play. Removing them destroys that reading — and because the skills
 * index sits at the foot of the page, removal also reflows the whole document
 * underneath the reader while they are standing at the bottom of it.
 *
 * Flip to `remove` for the brief's original behaviour; nothing else changes.
 */
export const FILTER_MODE: "collapse" | "remove" = "collapse";

/**
 * AND logic: an entry must endorse *every* selected skill.
 *
 * This is what "prove you have done X and Y together" needs. OR is a one-line
 * change to `.some(...)`.
 */
export function matches(experience: Experience, selected: string[]): boolean {
  return selected.every((id) => experience.endorsedSkills.includes(id));
}

export function countMatches(experiences: Experience[], selected: string[]): number {
  return experiences.filter((e) => matches(e, selected)).length;
}

/* ---------------------------------------------------------------------------
 * URL sync — ?skills=react,figma
 *
 * Read and written with the plain history API rather than the Next router, so
 * the page stays statically prerendered and a filtered view is still a
 * shareable URL.
 * ------------------------------------------------------------------------- */

export function parseSkillsParam(search: string, valid: Skill[]): string[] {
  const raw = new URLSearchParams(search).get("skills");
  if (!raw) return [];
  const known = new Set(valid.map((s) => s.id));
  // Unknown ids are dropped rather than kept — a stale or hand-edited link
  // should show a valid view, not filter everything to nothing.
  return [...new Set(raw.split(",").map((s) => s.trim()).filter((s) => known.has(s)))];
}

export function skillsHref(selected: string[]): string {
  const params = new URLSearchParams(window.location.search);
  if (selected.length === 0) params.delete("skills");
  else params.set("skills", selected.join(","));
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}`;
}

/**
 * When nothing matches, name the one skill whose removal helps most.
 *
 * "No experiences match all selected skills" is a dead end. "Removing Figma
 * would show 3" is an instruction. Returns null when dropping any single skill
 * still yields nothing, in which case the generic message is the honest one.
 */
export function bestRelaxation(
  experiences: Experience[],
  selected: string[],
  skills: Skill[],
): { skill: Skill; count: number } | null {
  if (selected.length < 2) return null;

  let best: { skill: Skill; count: number } | null = null;
  for (const id of selected) {
    const without = selected.filter((s) => s !== id);
    const count = countMatches(experiences, without);
    if (count === 0) continue;
    const skill = skills.find((s) => s.id === id);
    if (!skill) continue;
    if (!best || count > best.count) best = { skill, count };
  }
  return best;
}
