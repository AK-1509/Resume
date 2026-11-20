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
  /** For projects: a jargon-heavy slug describing the project to people in the
   *  field. Shown on the card. Omitted for education and work entries. */
  tagline: z.string().optional(),
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
 * The portfolio layer: `content/portfolio.json`.
 *
 * resume.json says what happened; this file holds the hero's own copy: the
 * role line under the name, the sub-line and the credentials. The rest of the
 * page is the projects, one per file in content/case-studies.
 * ------------------------------------------------------------------------- */

export const PortfolioSchema = z.object({
  hero: z.object({
    role: z.string().min(1, { error: "hero.role is required." }),
    sub: z.string(),
    credentials: z.array(z.string().min(1)),
  }),
});
export type Portfolio = z.infer<typeof PortfolioSchema>;

/* ---------------------------------------------------------------------------
 * The case-study layer: `content/case-studies/<slug>.json`.
 *
 * One file per project page at /projects/<slug>. The page is a fixed template
 * (hero, role, sprint timeline, then four phases: research, goals, design,
 * results) and this schema is the template's contract. To add a project, copy
 * `content/case-studies/_template.json`, rename it to the slug, and fill it in.
 *
 * Like portfolio.json, this is presentation content and is edited directly.
 * Two rules carry over from the resume:
 *
 *   1. Nothing is invented. A field with no source stays empty, and the page
 *      drops that block (in development a labelled placeholder marks the hero
 *      picture, role, demo link or report link still to come).
 *   2. Every block is optional. An empty string or array is a normal state, so
 *      a component that looks broken without one is a component bug.
 *
 * Two inline marks are allowed in `research.problem` and in any `lead`:
 * `==text==` draws a gold highlighter over the words, `**text**` sets them bold.
 * ------------------------------------------------------------------------- */

/** A picture under `public/case-studies/<slug>/`. Width and height are the
 *  file's own pixel size, so the page can reserve its space before it loads. */
export const CaseImageSchema = z.object({
  src: z.string().startsWith("/case-studies/", {
    error: `a case-study image src must start with "/case-studies/" and point at a file under public/ (e.g. "/case-studies/tunity/hero.jpg").`,
  }),
  alt: z.string().min(1, {
    error: "a case-study image needs non-empty alt text describing what it shows.",
  }),
  width: z.number().int().positive({ error: "image width must be the file's width in pixels." }),
  height: z.number().int().positive({ error: "image height must be the file's height in pixels." }),
});
export type CaseImage = z.infer<typeof CaseImageSchema>;

const blockTitle = z.string().optional();
const blockNote = z.string().optional();

/** One party in an exchange diagram: who it is and what it gets or does. */
const PartySchema = z.object({
  name: z.string().min(1, { error: "a party in an exchange diagram needs a name." }),
  sub: z.string().optional(),
  /** Heading over the list, e.g. "They get" or "What it does". */
  listLabel: z.string().optional(),
  items: z.array(z.string().min(1)),
});
export type Party = z.infer<typeof PartySchema>;

/**
 * The exhibits a design or results phase can hold, in any order. Each is a
 * self-contained figure drawn from data, so it follows the theme and stays
 * readable by a screen reader, which a pasted screenshot would not.
 */
export const ExhibitSchema = z.discriminatedUnion("type", [
  /** A numbered process. Use only when the order is real. */
  z.object({
    type: z.literal("steps"),
    title: blockTitle,
    items: z
      .array(z.object({ title: z.string().min(1), body: z.string() }))
      .min(1, { error: "a steps exhibit needs at least one step. Remove the exhibit instead." }),
    note: blockNote,
  }),
  /** Three parties and the four flows between them: a visual value proposition. */
  z.object({
    type: z.literal("exchange"),
    title: blockTitle,
    left: PartySchema,
    hub: PartySchema,
    right: PartySchema,
    flows: z.object({
      leftToHub: z.string().min(1),
      hubToRight: z.string().min(1),
      rightToHub: z.string().min(1),
      hubToLeft: z.string().min(1),
    }),
    /** The one-line promise under the diagram. */
    caption: z.string().optional(),
    note: blockNote,
  }),
  /** A labelled statement, clause by clause (a positioning statement). */
  z.object({
    type: z.literal("statement"),
    title: blockTitle,
    clauses: z
      .array(z.object({ label: z.string().min(1), text: z.string().min(1) }))
      .min(1, { error: "a statement exhibit needs at least one clause." }),
    note: blockNote,
  }),
  /** A short plain list. */
  z.object({
    type: z.literal("list"),
    title: blockTitle,
    items: z.array(z.string().min(1)).min(1, { error: "a list exhibit needs at least one item." }),
    note: blockNote,
  }),
  /** A picture in a Content Card frame. No caption: the block title names it
   *  and the alt text describes it. */
  z.object({
    type: z.literal("figure"),
    title: blockTitle,
    image: CaseImageSchema,
  }),
  /** Nested market sizes, widest first (TAM, SAM, SOM). */
  z.object({
    type: z.literal("sizing"),
    title: blockTitle,
    rings: z
      .array(
        z.object({
          /** Short name drawn inside the ring, e.g. "TAM". */
          name: z.string().min(1),
          value: z.string().min(1),
          label: z.string(),
          note: z.string(),
        }),
      )
      .min(2, { error: "a sizing exhibit needs two or three rings, widest first." })
      .max(3, { error: "a sizing exhibit needs two or three rings, widest first." }),
    note: blockNote,
  }),
  /**
   * A table. A cell that is exactly "yes", "partial" or "no" is drawn as a
   * full, half or empty mark, with the word kept for screen readers.
   */
  z.object({
    type: z.literal("table"),
    title: blockTitle,
    /** Header of the first column, which labels each row. */
    rowHeader: z.string(),
    columns: z
      .array(
        z.object({
          label: z.string().min(1),
          sub: z.string().optional(),
          /** Tints the column: the project's own column in a comparison. */
          highlight: z.boolean().optional(),
        }),
      )
      .min(1, { error: "a table exhibit needs at least one column." }),
    rows: z
      .array(z.object({ label: z.string().min(1), cells: z.array(z.string()) }))
      .min(1, { error: "a table exhibit needs at least one row." }),
    /** Right-aligns the cells, for money and counts. */
    numeric: z.boolean().optional(),
    note: blockNote,
  }),
  /** Horizontal bars for shares of a whole (a budget). */
  z.object({
    type: z.literal("bars"),
    title: blockTitle,
    lead: z.string().optional(),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          value: z.string().min(1),
          /** Percent of the whole, 0–100. Sets the bar's length. */
          share: z
            .number()
            .min(0, { error: "a bar's share is a percent between 0 and 100." })
            .max(100, { error: "a bar's share is a percent between 0 and 100." }),
          /** A quieter bar, for what is held back rather than spent. */
          muted: z.boolean().optional(),
        }),
      )
      .min(1, { error: "a bars exhibit needs at least one bar." }),
    note: blockNote,
  }),
]);
export type Exhibit = z.infer<typeof ExhibitSchema>;

/** The four phases, in the order the sprint timeline shows them. */
export const CASE_PHASES = ["research", "goals", "design", "results"] as const;
export type CasePhase = (typeof CASE_PHASES)[number];

export const CASE_PHASE_LABELS: Record<CasePhase, string> = {
  research: "Research & context",
  goals: "Goals & challenges",
  design: "Design & development",
  results: "Results & impact",
};

const optionalLink = z
  .url({ error: "a link must be an absolute URL including the scheme (e.g. https://example.com), or null." })
  .nullable();

/** The two kinds of page: work built (a project) and work analysed for a
 *  company (a case study). Each has its own section on the portfolio. */
export const CASE_CATEGORIES = ["project", "case-study"] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];

/** The live hero mockups that exist in code. A page names one in `hero.live`. */
export const LIVE_MOCKUPS = ["tunity-journey"] as const;
export type LiveMockup = (typeof LIVE_MOCKUPS)[number];

export const CaseStudySchema = z.object({
  /** The URL segment, and the file name without ".json". */
  slug: slug("case study slug"),
  /** Which portfolio section lists it. Defaults to a project. */
  category: z.enum(CASE_CATEGORIES).default("project"),
  /** Position in the Index, lowest first. Ties fall back to the title. */
  order: z.number().optional(),
  /**
   * One figure that sums the work up, shown beside it in the Case Studies
   * list (e.g. "8,560" / "pairs a year to break even"). It must be a figure
   * the page itself states.
   */
  keyFigure: z
    .object({
      value: z.string().min(1, { error: "a key figure needs its value." }),
      label: z.string().min(1, { error: "a key figure needs a label saying what it counts." }),
    })
    .optional(),
  title: z.string().min(1, { error: "a case study needs a title." }),
  /** The descriptive line under the title, on the hero. */
  slugLine: z.string().min(1, { error: "a case study needs a slugLine: one sentence saying what the project is." }),
  /** Short gold tags under the role: the kind of work, the team size. */
  tags: z.array(z.string().min(1)),
  hero: z.object({
    /** A wide picture that fills the hero. null shows the Druid ground, and
     *  the labelled placeholder if there is no figure either. */
    image: CaseImageSchema.nullable(),
    /** An optional cut-out set over the ground at the right, e.g. a device
     *  mockup with a transparent background. */
    figure: CaseImageSchema.nullable(),
    /**
     * A live mockup drawn in code that takes the figure's place on the page:
     * a 3D device that leans toward the pointer and plays a short loop of the
     * product in use. The figure still stands for the project elsewhere (its
     * entry on the portfolio). Each id names a component in
     * `components/case/mockups`.
     */
    live: z.enum(LIVE_MOCKUPS).optional(),
  }),
  /** The author's own part. All of it empty shows the labelled placeholder. */
  role: z.object({
    title: z.string(),
    /** How long the sprint ran, e.g. "Six weeks, autumn 2026". */
    sprint: z.string(),
    summary: z.string(),
    /**
     * One sentence per move, in the author's own words: what was done, then
     * what it changed. Wrap the impact in `**double asterisks**` to set it bold.
     */
    moves: z.array(z.string().min(1, { error: "a move cannot be an empty string. Remove it instead." })),
  }),
  /** null: the project has no demo and the slot is not shown. `href: null`
   *  shows the empty slot, as a reminder that a link is still to come. */
  demo: z.object({ href: optionalLink }).nullable(),
  /** When each phase ran, shown on the sprint timeline. "" leaves it off. */
  timeline: z.object({
    research: z.string(),
    goals: z.string(),
    design: z.string(),
    results: z.string(),
  }),
  research: z.object({
    problem: z.string(),
    stakeholders: z.array(
      z.object({
        /** The part they play: "Customer", "Supplier", "Competitor". */
        kind: z.string().min(1),
        name: z.string().min(1),
        note: z.string().optional(),
      }),
    ),
    painPoints: z.array(z.object({ label: z.string().min(1), detail: z.string().min(1) })),
    headlines: z.array(
      z.object({
        /** An optional figure set large above the headline, e.g. "24%". */
        figure: z.string().optional(),
        headline: z.string().min(1),
        source: z.string().min(1, { error: "a research headline needs its source." }),
        date: z.string().optional(),
        url: z.url({ error: "a headline url must be an absolute URL including the scheme." }).optional(),
      }),
    ),
  }),
  goals: z.object({
    rows: z.array(z.object({ goal: z.string().min(1), target: z.string(), kpi: z.string() })),
    insights: z.array(z.object({ insight: z.string().min(1), evidence: z.string() })),
    /** The full report. null hides the slot; `href: null` shows it empty. */
    report: z.object({ href: optionalLink }).nullable(),
    roadmap: z.array(z.object({ when: z.string().min(1), what: z.string().min(1) })),
  }),
  design: z.object({ lead: z.string(), blocks: z.array(ExhibitSchema) }),
  results: z.object({ lead: z.string(), blocks: z.array(ExhibitSchema) }),
});
export type CaseStudy = z.infer<typeof CaseStudySchema>;

/** Every picture a case study references, wherever it sits. */
export function caseStudyImages(study: CaseStudy): CaseImage[] {
  const images: CaseImage[] = [];
  if (study.hero.image) images.push(study.hero.image);
  if (study.hero.figure) images.push(study.hero.figure);
  for (const block of [...study.design.blocks, ...study.results.blocks]) {
    if (block.type === "figure") images.push(block.image);
  }
  return images;
}

/** Whether a phase has anything to show. An empty phase is left off the page,
 *  the sprint timeline and the navigation pane alike. */
export function phaseHasContent(study: CaseStudy, phase: CasePhase): boolean {
  switch (phase) {
    case "research": {
      const r = study.research;
      return Boolean(r.problem.trim()) || r.stakeholders.length + r.painPoints.length + r.headlines.length > 0;
    }
    case "goals": {
      const g = study.goals;
      return g.rows.length + g.insights.length + g.roadmap.length > 0 || g.report !== null;
    }
    case "design":
    case "results":
      return Boolean(study[phase].lead.trim()) || study[phase].blocks.length > 0;
  }
}

/**
 * The rules a per-field schema cannot express. `file` is the file name without
 * ".json"; a leading underscore marks the template, which is never published.
 */
export function caseStudyIssues(study: CaseStudy, file: string): { where: string; what: string }[] {
  const issues: { where: string; what: string }[] = [];
  const expected = file.replace(/^_/, "");
  if (study.slug !== expected) {
    issues.push({
      where: "slug",
      what: `The slug is "${study.slug}" but the file is ${file}.json. They must match, because the slug is the page's URL. Rename one of them.`,
    });
  }
  const prefix = `/case-studies/${study.slug}/`;
  for (const image of caseStudyImages(study)) {
    if (!image.src.startsWith(prefix)) {
      issues.push({
        where: `image "${image.src}"`,
        what: `Pictures for this case study must live under "${prefix}". Move the file, or fix the path.`,
      });
    }
  }
  (["design", "results"] as const).forEach((phase) => {
    study[phase].blocks.forEach((block, i) => {
      if (block.type !== "table") return;
      block.rows.forEach((row, j) => {
        if (row.cells.length !== block.columns.length) {
          issues.push({
            where: `${phase}.blocks[${i}].rows[${j}]`,
            what: `"${row.label}" has ${row.cells.length} cells but the table has ${block.columns.length} columns. Give it one cell per column.`,
          });
        }
      });
    });
  });
  return issues;
}
