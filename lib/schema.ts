import { z } from "zod";

/* ---------------------------------------------------------------------------
 * The resume content schema.
 *
 * `content/resume.json` is the single source of truth for everything the site
 * renders. It is written ONLY by the `resume-entry` skill, which transcribes
 * the user's text verbatim and never invents values. Two consequences:
 *
 *   1. Nothing repairs content. This schema is the only thing standing between
 *      a malformed edit and a broken deploy, so error messages must name the
 *      offending field and state the fix — not just "invalid".
 *   2. Optional fields will genuinely be empty. `summary` may be "",
 *      `gallery` may be [], `thumbnailId` may be null. Components must render
 *      correctly in those cases rather than assuming population.
 * ------------------------------------------------------------------------- */

/** "YYYY-MM". Day precision is noise on a resume. */
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const monthString = (field: string) =>
  z.string().regex(MONTH_RE, {
    error: `${field} must be a month in "YYYY-MM" form (e.g. "2021-03"). Got a value that doesn't match — check for a day component, a slash separator, or a month outside 01–12.`,
  });

/** Lowercase, hyphen-separated. Used for ids so they're URL- and path-safe. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slug = (field: string) =>
  z.string().regex(SLUG_RE, {
    error: `${field} must be a lowercase slug: letters, digits, and single hyphens only (e.g. "acme-senior-pm"). No spaces, capitals, underscores, or leading/trailing hyphens.`,
  });

export const EXPERIENCE_TYPES = ["education", "work", "project"] as const;
export type ExperienceType = (typeof EXPERIENCE_TYPES)[number];

export const SKILL_CATEGORIES = ["technical", "soft", "domain"] as const;
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** One image in an experience's gallery. */
export const GalleryItemSchema = z.object({
  id: slug("gallery item id"),
  /** Public path, e.g. "/gallery/acme-senior-pm/dashboard.png". */
  src: z.string().startsWith("/gallery/", {
    error: `gallery item src must start with "/gallery/" and point at a file under public/ (e.g. "/gallery/acme-senior-pm/dashboard.png").`,
  }),
  /** Required and non-empty — this is the accessibility floor, not a nicety.
   *  The skill is forbidden from writing it, so an empty value means the user
   *  was never asked for alt text. Fail loudly. */
  alt: z.string().min(1, {
    error: `gallery item alt is required and must be non-empty. Ask the user for alt text describing the image — do not write it, and do not fall back to the filename or caption.`,
  }),
  caption: z.string().optional(),
});
export type GalleryItem = z.infer<typeof GalleryItemSchema>;

/** A skill in the canonical registry. Experiences reference these by id. */
export const SkillSchema = z.object({
  id: slug("skill id"),
  label: z.string().min(1, { error: "skill label is required and must be non-empty." }),
  category: z.enum(SKILL_CATEGORIES, {
    error: `skill category must be exactly one of "technical", "soft", or "domain". Ask the user which — never guess.`,
  }),
});
export type Skill = z.infer<typeof SkillSchema>;

/**
 * One education entry, job, or project. All three share every field and every
 * behaviour (endorse skills, gallery, detail modal, export), so they live in
 * one array and are separated into sections by `type` at render time.
 */
export const ExperienceSchema = z.object({
  id: slug("experience id"),
  type: z.enum(EXPERIENCE_TYPES, {
    error: `experience type must be exactly one of "education", "work", or "project".`,
  }),
  /** Position | degree | project name. */
  title: z.string().min(1, { error: "experience title is required and must be non-empty." }),
  /** Company | institution | client. Empty string for personal projects with
   *  no client — the card omits the line entirely rather than showing a gap. */
  organization: z.string(),
  /** "Los Angeles, CA" | "Remote". */
  location: z.string().min(1, {
    error: `location is required. Use "Remote" if there is no physical location — do not leave it empty.`,
  }),
  /**
   * Optional live link — a project's site, a shipped product, a paper.
   * Omitted entirely rather than stored as "" when there isn't one, so the
   * detail view can test for its presence.
   */
  url: z
    .url({
      error: `url must be an absolute URL including the scheme (e.g. https://example.com). Omit the field entirely if there is no link.`,
    })
    .optional(),
  startDate: monthString("startDate"),
  /** null means "present". */
  endDate: monthString("endDate").nullable(),
  /** 1–3 sentences shown in the detail modal. May be "" — the modal drops the
   *  paragraph and its spacing rather than rendering an empty block. */
  summary: z.string(),
  responsibilities: z.array(z.string().min(1, { error: "a responsibility bullet cannot be an empty string. Remove it instead." })),
  /** Skill ids. Referential integrity against `skills` is checked below. */
  endorsedSkills: z.array(slug("endorsedSkills entry")),
  gallery: z.array(GalleryItemSchema),
  /** id of an item in THIS experience's gallery, or null for no thumbnail. */
  thumbnailId: slug("thumbnailId").nullable(),
  featured: z.boolean().optional(),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const ProfileSchema = z.object({
  name: z.string().min(1, { error: "profile.name is required." }),
  headline: z.string().min(1, { error: "profile.headline is required." }),
  location: z.string().min(1, { error: "profile.location is required." }),
  email: z.email({ error: "profile.email must be a valid email address." }),
  links: z.array(
    z.object({
      label: z.string().min(1, { error: "a profile link label cannot be empty." }),
      url: z.url({ error: "a profile link url must be an absolute URL including the scheme (e.g. https://…)." }),
    }),
  ),
});
export type Profile = z.infer<typeof ProfileSchema>;

/**
 * The whole document, plus the cross-field rules that a per-field schema
 * cannot express. These are the errors a remote content edit actually makes,
 * so each one names the field, the bad value, and the specific fix.
 */
export const ResumeSchema = z
  .object({
    profile: ProfileSchema,
    /** Canonical skill registry. Endorsement counts are NOT stored here — they
     *  are derived from `experiences[].endorsedSkills` so the JSON cannot
     *  desync from itself. Counts are not displayed in the UI; they exist only
     *  to order the index. */
    skills: z.array(SkillSchema),
    /**
     * Spoken languages, as free strings, in the user's own order.
     *
     * Deliberately NOT `{ name, level }`. A proficiency field is something the
     * `resume-entry` skill would have to infer, and inferring is exactly what
     * it is forbidden to do. If a level belongs on a language, the user types
     * it as part of the string ("German (B2)") and it is transcribed verbatim.
     * Order is meaningful and must never be sorted.
     */
    languages: z.array(
      z.string().min(1, {
        error: "a language cannot be an empty string. Remove the entry instead.",
      }),
    ),
    experiences: z.array(ExperienceSchema),
  })
  .superRefine((resume, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });

    // --- Unique skill ids ------------------------------------------------
    const skillIds = new Set<string>();
    resume.skills.forEach((skill, i) => {
      if (skillIds.has(skill.id)) {
        issue(
          ["skills", i, "id"],
          `Duplicate skill id "${skill.id}". Each skill appears once in the registry; delete this entry and point experiences at the existing one.`,
        );
      }
      skillIds.add(skill.id);
    });

    // --- Languages are distinct ------------------------------------------
    const seenLanguages = new Set<string>();
    resume.languages.forEach((language, i) => {
      const key = language.toLowerCase();
      if (seenLanguages.has(key)) {
        issue(["languages", i], `"${language}" is listed twice. Remove the duplicate.`);
      }
      seenLanguages.add(key);
    });

    // --- Unique experience ids -------------------------------------------
    const experienceIds = new Set<string>();
    resume.experiences.forEach((exp, i) => {
      if (experienceIds.has(exp.id)) {
        issue(
          ["experiences", i, "id"],
          `Duplicate experience id "${exp.id}". Ids must be unique — append "-2" to this one and rename its folder under public/gallery/ to match.`,
        );
      }
      experienceIds.add(exp.id);
    });

    resume.experiences.forEach((exp, i) => {
      const where = `experiences[${i}] ("${exp.id}")`;

      // --- endorsedSkills referential integrity --------------------------
      // The single most likely error when content is edited remotely.
      exp.endorsedSkills.forEach((skillId, j) => {
        if (!skillIds.has(skillId)) {
          issue(
            ["experiences", i, "endorsedSkills", j],
            `${where} endorses "${skillId}", which is not in the skills registry. Either correct the id, or add { "id": "${skillId}", "label": "…", "category": "technical" | "soft" | "domain" } to skills[] — ask the user for the exact label and category rather than inventing them.`,
          );
        }
      });

      // --- No duplicate endorsements -------------------------------------
      const seenEndorsements = new Set<string>();
      exp.endorsedSkills.forEach((skillId, j) => {
        if (seenEndorsements.has(skillId)) {
          issue(
            ["experiences", i, "endorsedSkills", j],
            `${where} lists "${skillId}" twice. Endorsement counts are derived by counting experiences, so a duplicate here silently does nothing — remove it.`,
          );
        }
        seenEndorsements.add(skillId);
      });

      // --- Gallery item ids unique within the experience -----------------
      const galleryIds = new Set<string>();
      exp.gallery.forEach((item, j) => {
        if (galleryIds.has(item.id)) {
          issue(
            ["experiences", i, "gallery", j, "id"],
            `${where} has two gallery items with id "${item.id}". Gallery ids must be unique within an experience so thumbnailId is unambiguous.`,
          );
        }
        galleryIds.add(item.id);

        // --- src must live under this experience's own folder ------------
        const expectedPrefix = `/gallery/${exp.id}/`;
        if (!item.src.startsWith(expectedPrefix)) {
          issue(
            ["experiences", i, "gallery", j, "src"],
            `${where} has a gallery image at "${item.src}", but images for this experience must live under "${expectedPrefix}". Move the file, or fix the path.`,
          );
        }
      });

      // --- thumbnailId must name an item in this gallery -----------------
      if (exp.thumbnailId !== null && !galleryIds.has(exp.thumbnailId)) {
        issue(
          ["experiences", i, "thumbnailId"],
          `${where} sets thumbnailId to "${exp.thumbnailId}", which is not an id in its own gallery. Available ids: ${
            exp.gallery.length ? exp.gallery.map((g) => `"${g.id}"`).join(", ") : "(gallery is empty)"
          }. Set it to one of those, or to null.`,
        );
      }

      // --- endDate must be after startDate -------------------------------
      if (exp.endDate !== null && exp.endDate < exp.startDate) {
        issue(
          ["experiences", i, "endDate"],
          `${where} ends "${exp.endDate}" before it starts "${exp.startDate}". Swap them, or set endDate to null if the role is ongoing.`,
        );
      }
    });
  });

export type Resume = z.infer<typeof ResumeSchema>;

/* ---------------------------------------------------------------------------
 * Derived values. Never stored in JSON.
 * ------------------------------------------------------------------------- */

/**
 * A skill's endorsement count is the number of experiences that endorse it.
 * Computed on every render so the JSON is structurally incapable of desyncing.
 */
export function endorsementCounts(resume: Resume): Map<string, number> {
  const counts = new Map<string, number>();
  for (const skill of resume.skills) counts.set(skill.id, 0);
  for (const exp of resume.experiences) {
    for (const skillId of exp.endorsedSkills) {
      counts.set(skillId, (counts.get(skillId) ?? 0) + 1);
    }
  }
  return counts;
}
