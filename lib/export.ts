import type { Experience, Profile, Skill } from "./schema";

/* ---------------------------------------------------------------------------
 * The print model.
 *
 * Both the on-screen preview (HTML, measured to decide the fit) and the PDF
 * (@react-pdf/renderer) read their metrics from here. Two renderers is a
 * maintenance risk, so every number they could disagree about lives in this
 * file and neither is allowed a literal of its own.
 * ------------------------------------------------------------------------- */

/** US Letter at 96dpi, which is the CSS pixel grid. */
export const PAGE = {
  widthPx: 8.5 * 96, // 816
  heightPx: 11 * 96, // 1056
  marginPx: 0.5 * 96, // 48
} as const;

export const CONTENT_HEIGHT_PX = PAGE.heightPx - PAGE.marginPx * 2; // 960
export const CONTENT_WIDTH_PX = PAGE.widthPx - PAGE.marginPx * 2; // 720

/** 1pt = 1/72in; the page is measured at 96px/in. */
export const PT_TO_PX = 96 / 72;

/**
 * The density ladder.
 *
 * Auto-fit steps down through these in order and stops. It never goes below
 * the last one, never letterspace-squeezes, and never drops content — if step
 * 3 still overflows, the export reports what to cut instead.
 */
export type Density = {
  step: number;
  /** Body copy, in points. */
  bodyPt: number;
  leading: number;
  /** Space between sections, in points. */
  sectionGapPt: number;
};

export const DENSITY_LADDER: readonly Density[] = [
  { step: 0, bodyPt: 10.5, leading: 1.45, sectionGapPt: 16 },
  { step: 1, bodyPt: 10, leading: 1.4, sectionGapPt: 14 },
  { step: 2, bodyPt: 9.5, leading: 1.35, sectionGapPt: 12 },
  { step: 3, bodyPt: 9, leading: 1.3, sectionGapPt: 10 },
] as const;

export const FLOOR = DENSITY_LADDER[DENSITY_LADDER.length - 1];

/** Sizes that scale with the body, expressed as multiples of it. */
export const SCALE = {
  name: 2.1,
  sectionHeading: 1.0,
  entryTitle: 1.1,
  meta: 0.82,
} as const;

export type ExportSelection = {
  /** Experience ids to print, in print order. */
  order: string[];
  /** Skill ids to print on the Skills line. */
  skillIds: string[];
  includeLanguages: boolean;
};

export type PrintModel = {
  profile: Profile;
  /** Grouped for printing, preserving the user's chosen order within each. */
  groups: { heading: string; entries: Experience[] }[];
  skills: Skill[];
  languages: string[];
};

const GROUP_HEADINGS: Record<Experience["type"], string> = {
  education: "Education",
  work: "Experience",
  project: "Projects",
};

const GROUP_ORDER: Experience["type"][] = ["education", "work", "project"];

/**
 * Turns a selection into the exact content the page will render. Empty groups
 * are dropped rather than printed as a bare heading with nothing under it.
 */
export function buildPrintModel(
  profile: Profile,
  experiences: Experience[],
  allSkills: Skill[],
  languages: string[],
  selection: ExportSelection,
): PrintModel {
  const byId = new Map(experiences.map((e) => [e.id, e]));
  const chosen = selection.order
    .map((id) => byId.get(id))
    .filter((e): e is Experience => Boolean(e));

  const groups = GROUP_ORDER.map((type) => ({
    heading: GROUP_HEADINGS[type],
    entries: chosen.filter((e) => e.type === type),
  })).filter((g) => g.entries.length > 0);

  return {
    profile,
    groups,
    skills: allSkills.filter((s) => selection.skillIds.includes(s.id)),
    languages: selection.includeLanguages ? languages : [],
  };
}

export type FitResult =
  | { fits: true; density: Density; heightPx: number }
  | { fits: false; density: Density; heightPx: number; overflowPx: number; advice: string };

/**
 * Turns an overflow measured at the floor density into something actionable.
 *
 * "Two bullets over" is useful; "content exceeds available height by 47px" is
 * not. The estimate is deliberately conservative — it rounds up, so following
 * the advice always clears the overflow rather than landing just short.
 */
export function overflowAdvice(
  overflowPx: number,
  density: Density,
  model: PrintModel,
): string {
  const lineHeightPx = density.bodyPt * PT_TO_PX * density.leading;
  const linesOver = Math.max(1, Math.ceil(overflowPx / lineHeightPx));

  const entries = model.groups.flatMap((g) => g.entries);
  const longest = [...entries].sort(
    (a, b) => b.responsibilities.join(" ").length - a.responsibilities.join(" ").length,
  )[0];

  const unit = linesOver === 1 ? "line" : "lines";
  const target = longest
    ? ` Deselect an experience, or shorten the bullets on ${
        longest.organization || longest.title
      }.`
    : " Deselect an experience.";

  return `About ${linesOver} ${unit} over a page at the smallest size allowed.${target}`;
}
