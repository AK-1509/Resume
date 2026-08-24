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
import { ResumeSchema, type Resume } from "../lib/schema";

const ROOT = resolve(import.meta.dirname, "..");
const CONTENT = join(ROOT, "content", "resume.json");
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
  // A skill nothing endorses can never filter to anything, so the index at the
  // foot of the page drops it rather than rendering a dead control. Surface it
  // here so it is never silently lost.
  const endorsed = new Set(resume.experiences.flatMap((e) => e.endorsedSkills));
  for (const skill of resume.skills) {
    if (!endorsed.has(skill.id)) {
      notes.push(
        `skill "${skill.id}" (${skill.label}) is in the registry but no experience endorses it, so it is hidden from the skills index. Endorse it somewhere, or remove it from skills[].`,
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

// --- Report ----------------------------------------------------------------
if (problems.length) report();

console.log(
  `\n  content/resume.json is valid — ${resume.experiences.length} experiences, ${resume.skills.length} skills, ${resume.languages.length} languages.\n`,
);

if (notes.length) {
  console.log(`  ${notes.length} note${notes.length === 1 ? "" : "s"} (not failures):\n`);
  for (const note of notes) console.log(`    - ${note}`);
  console.log("");
}
