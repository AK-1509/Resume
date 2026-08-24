import raw from "@/content/resume.json";
import {
  ResumeSchema,
  endorsementCounts,
  type Experience,
  type ExperienceType,
  type Resume,
  type Skill,
} from "./schema";

/**
 * Sort direction for every experience list on the site.
 *
 * Reverse-chronological (most recent first) is resume convention. Flip this one
 * constant to "oldest-first" to reverse every section at once.
 */
export const SORT_DIRECTION: "newest-first" | "oldest-first" = "newest-first";

/**
 * Parsed at module load, so a malformed `resume.json` fails the build rather
 * than rendering a broken page. `npm run validate` runs the same schema.
 */
export const resume: Resume = ResumeSchema.parse(raw);

/** Sort key: ongoing entries (endDate null) rank above everything finished. */
function sortKey(exp: Experience): string {
  return exp.endDate ?? "9999-12";
}

export function sortExperiences(experiences: Experience[]): Experience[] {
  const sorted = [...experiences].sort((a, b) => {
    const byEnd = sortKey(a).localeCompare(sortKey(b));
    if (byEnd !== 0) return byEnd;
    return a.startDate.localeCompare(b.startDate);
  });
  return SORT_DIRECTION === "newest-first" ? sorted.reverse() : sorted;
}

export function experiencesOfType(type: ExperienceType): Experience[] {
  return sortExperiences(resume.experiences.filter((e) => e.type === type));
}

/**
 * Whether an entry has anything behind the click.
 *
 * The skill can legitimately produce an entry with no summary, no bullets, and
 * no images. A card that promises detail and opens onto an empty panel is worse
 * than one that visibly doesn't promise, so cards below this threshold render
 * as static records rather than buttons.
 */
export function hasDetail(experience: Experience): boolean {
  return (
    experience.summary.trim().length > 0 ||
    experience.responsibilities.length > 0 ||
    experience.gallery.length > 0
  );
}

/**
 * Skills for the index at the foot of the page, most-proved first.
 *
 * Counts are derived but never displayed — they only decide the order, so the
 * strongest claims land where the eye does. Skills that nothing endorses are
 * dropped: clicking one could only ever produce the empty state, and a control
 * that cannot do anything shouldn't be on the page. `npm run validate` reports
 * them as a note so they're never silently lost.
 */
export function indexedSkills(): Skill[] {
  const counts = endorsementCounts(resume);
  return resume.skills
    .filter((skill) => (counts.get(skill.id) ?? 0) > 0)
    .sort((a, b) => {
      const byCount = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0);
      return byCount !== 0 ? byCount : a.label.localeCompare(b.label);
    });
}
