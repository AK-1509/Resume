/**
 * Standalone content validation. Run with `npm run validate`.
 *
 * `content/resume.json` is written only by the `resume-entry` skill, which is
 * forbidden from inventing or repairing values. That makes this script the only
 * safety net between a bad remote edit and a broken deploy, so every failure
 * here must say which field is wrong and what to do about it.
 *
 * Two layers:
 *   1. The Zod schema in lib/schema.ts — shape and cross-field integrity.
 *   2. Filesystem checks below — things the schema cannot see, chiefly whether
 *      the images referenced in JSON actually exist on disk.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  CatalogSchema,
  CaseStudySchema,
  PortfolioSchema,
  ResumeSchema,
  caseStudyImages,
  caseStudyIssues,
  type Resume,
} from "../lib/schema";

const ROOT = resolve(import.meta.dirname, "..");
const CONTENT = join(ROOT, "content", "resume.json");
const PORTFOLIO = join(ROOT, "content", "portfolio.json");
const CASE_STUDIES = join(ROOT, "content", "case-studies");
const I18N = join(ROOT, "content", "i18n");
const GALLERY_ROOT = join(ROOT, "public", "gallery");

type Problem = { where: string; what: string };

const problems: Problem[] = [];
const notes: string[] = [];

function fail(where: string, what: string) {
  problems.push({ where, what });
}

/** Print everything collected so far and exit non-zero. */
function report(): never {
  console.error(
    `\n  content/resume.json — ${problems.length} problem${problems.length === 1 ? "" : "s"}:\n`,
  );
  for (const { where, what } of problems) {
    console.error(`  ${where}`);
    console.error(`    ${what}\n`);
  }
  process.exit(1);
}

// --- Layer 0: the file parses as JSON at all -------------------------------
let parsedJson: unknown;
try {
  parsedJson = JSON.parse(readFileSync(CONTENT, "utf8"));
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\n  content/resume.json is not valid JSON.\n  ${message}\n`);
  console.error("  A trailing comma or an unescaped quote in user-supplied text is the usual cause.\n");
  process.exit(1);
}

// --- Layer 1: schema -------------------------------------------------------
const result = ResumeSchema.safeParse(parsedJson);

if (!result.success) {
  // Path checks on malformed data are noise, so stop here rather than piling
  // filesystem complaints on top of a shape error.
  for (const issue of result.error.issues) {
    fail(issue.path.length ? issue.path.join(".") : "(root)", issue.message);
  }
  report();
}

const resume: Resume = result.data;

// --- Layer 2: filesystem ---------------------------------------------------
{
  // A skill nothing endorses is attached to no entry. Surface it here so it is
  // never silently lost.
  const endorsed = new Set(resume.experiences.flatMap((e) => e.endorsedSkills));
  for (const skill of resume.skills) {
    if (!endorsed.has(skill.id)) {
      notes.push(
        `skill "${skill.id}" (${skill.label}) is in the registry but no experience endorses it. Endorse it somewhere, or remove it from skills[].`,
      );
    }
  }

  const referenced = new Set<string>();

  for (const exp of resume.experiences) {
    const folder = join(GALLERY_ROOT, exp.id);

    for (const item of exp.gallery) {
      // src is "/gallery/<id>/<file>"; the schema already checked the prefix.
      const segments = item.src.replace(/^\//, "").split("/");
      const onDisk = join(ROOT, "public", ...segments);
      referenced.add(onDisk);

      if (existsSync(onDisk)) continue;

      const available = existsSync(folder)
        ? readdirSync(folder).filter((f) => statSync(join(folder, f)).isFile())
        : [];

      fail(
        `experiences["${exp.id}"].gallery["${item.id}"].src`,
        available.length
          ? `"${item.src}" does not exist. Files actually in public/gallery/${exp.id}/: ${available
              .map((f) => `"${f}"`)
              .join(", ")}. Use one of those exactly — do not correct a near-match.`
          : `"${item.src}" does not exist, and public/gallery/${exp.id}/ ${
              existsSync(folder) ? "is empty" : "does not exist"
            }. Add the image file before referencing it.`,
      );
    }
  }

  // Orphaned image files are not an error — they may be staged for a future
  // entry — but they are worth surfacing, since the usual cause is a typo in a
  // filename that the skill correctly refused to guess at.
  if (existsSync(GALLERY_ROOT)) {
    for (const dir of readdirSync(GALLERY_ROOT)) {
      const folder = join(GALLERY_ROOT, dir);
      if (!statSync(folder).isDirectory()) continue;

      if (!resume.experiences.some((e) => e.id === dir)) {
        notes.push(
          `public/gallery/${dir}/ has no matching experience id. Rename it, or delete it if the entry is gone.`,
        );
        continue;
      }

      for (const file of readdirSync(folder)) {
        const full = join(folder, file);
        if (!statSync(full).isFile()) continue;
        if (!referenced.has(full)) {
          notes.push(`public/gallery/${dir}/${file} is on disk but not referenced in resume.json.`);
        }
      }
    }
  }
}

// --- Layer 3: content/portfolio.json --------------------------------------
// The hero's copy: the role line, the sub-line and the credentials.
{
  let portfolioJson: unknown;
  try {
    portfolioJson = JSON.parse(readFileSync(PORTFOLIO, "utf8"));
  } catch (err) {
    fail("content/portfolio.json", `is not valid JSON. ${err instanceof Error ? err.message : String(err)}`);
  }
  if (portfolioJson !== undefined) {
    const parsed = PortfolioSchema.safeParse(portfolioJson);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        fail(`portfolio.json ${issue.path.join(".") || "(root)"}`, issue.message);
      }
    }
  }
}

// --- Layer 4: content/case-studies/*.json ---------------------------------
// One project page per file, the template (a leading underscore) included, so
// a broken template is caught before it is copied.
const caseStudyCount = (() => {
  if (!existsSync(CASE_STUDIES)) return 0;
  const files = readdirSync(CASE_STUDIES).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const where = `case-studies/${file}`;
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(join(CASE_STUDIES, file), "utf8"));
    } catch (err) {
      fail(where, `is not valid JSON. ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const parsed = CaseStudySchema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fail(`${where} ${issue.path.join(".") || "(root)"}`, issue.message);
      continue;
    }
    for (const { where: at, what } of caseStudyIssues(parsed.data, file.replace(/\.json$/, ""))) {
      fail(`${where} ${at}`, what);
    }
    for (const image of caseStudyImages(parsed.data)) {
      const onDisk = join(ROOT, "public", ...image.src.replace(/^\//, "").split("/"));
      if (!existsSync(onDisk)) fail(`${where} image`, `"${image.src}" does not exist under public/. Add the file, or fix the path.`);
    }
  }
  return files.filter((f) => !f.startsWith("_")).length;
})();

// --- Layer 5: content/i18n/*.json -----------------------------------------
// Translation catalogs. A broken file fails; a string the catalog has not
// caught up with is only a note, because the page shows it in English. Run
// `npm run i18n` for the full list.
if (existsSync(I18N)) {
  for (const file of readdirSync(I18N).filter((f) => f.endsWith(".json"))) {
    const where = `i18n/${file}`;
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(join(I18N, file), "utf8"));
    } catch (err) {
      fail(where, `is not valid JSON. ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const parsed = CatalogSchema.safeParse(json);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) fail(`${where} ${issue.path.join(".") || "(root)"}`, issue.message);
      continue;
    }
    const locale = file.replace(/\.json$/, "");
    if (parsed.data.locale !== locale) {
      fail(`${where} locale`, `is "${parsed.data.locale}" but the file is ${file}. Make them match.`);
    }
    for (const source of Object.keys(parsed.data.revised ?? {})) {
      if (!(source in parsed.data.strings)) {
        fail(`${where} revised`, `notes a rewrite of "${source}", which is not in strings. Remove the note or restore the string.`);
      }
    }
  }
  // Loaded only here: it parses resume.json at import, and a broken file has
  // already been reported above with a better message than the import's.
  if (!problems.length) try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { coverage } = require("./i18n/strings") as typeof import("./i18n/strings");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TRANSLATED_LOCALES } = require("../lib/i18n") as typeof import("../lib/i18n");
    for (const locale of TRANSLATED_LOCALES) {
      const { missing, total } = coverage(locale);
      if (missing.length) {
        notes.push(`${locale}: ${missing.length} of ${total} page strings have no translation yet and read in English. Run npm run i18n -- ${locale}.`);
      }
    }
  } catch (err) {
    fail("i18n coverage", err instanceof Error ? err.message : String(err));
  }
}

// --- Report ----------------------------------------------------------------
if (problems.length) report();

console.log(
  `\n  content/resume.json is valid — ${resume.experiences.length} experiences, ${resume.skills.length} skills, ${resume.languages.length} languages, ${caseStudyCount} case ${caseStudyCount === 1 ? "study" : "studies"}.\n`,
);

if (notes.length) {
  console.log(`  ${notes.length} note${notes.length === 1 ? "" : "s"} (not failures):\n`);
  for (const note of notes) console.log(`    - ${note}`);
  console.log("");
}
