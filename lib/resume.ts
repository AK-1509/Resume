import raw from "@/content/resume.json";
import { ResumeSchema, type Experience, type ExperienceType, type Resume } from "./schema";

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
