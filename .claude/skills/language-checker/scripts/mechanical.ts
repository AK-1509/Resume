/**
 * The language check's mechanical pass: what a script can see in a catalog
 * before anyone reads it for voice.
 *
 *   npx tsx .claude/skills/language-checker/scripts/mechanical.ts <locale>
 *   npx tsx .claude/skills/language-checker/scripts/mechanical.ts <locale> --file path/to/catalog.json
 *
 * Every flag is a question for the reader, not a verdict, so this always exits
 * 0 unless the catalog cannot be read.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [locale, flag, path] = process.argv.slice(2);
if (!locale) {
  console.error("  Usage: mechanical.ts <locale> [--file catalog.json]");
  process.exit(1);
}
const file = flag === "--file" && path ? path : join(process.cwd(), "content", "i18n", `${locale}.json`);
const catalog = JSON.parse(readFileSync(file, "utf8")) as { strings: Record<string, string>; revised?: Record<string, string> };
const entries = Object.entries(catalog.strings);

type Flag = { source: string; target: string; why: string };
const flags: Flag[] = [];
const add = (source: string, target: string, why: string) => flags.push({ source, target, why });

/** Numbers, as written: 3, 12.8%, $5,200, 2022. */
const numbers = (s: string) => s.match(/\d[\d.,]*/g) ?? [];
/**
 * Words that look like names: anything with a capital after its first letter
 * (GoodRx, aerieREAL, MagSafe), all-caps acronyms (AI, USC, OCS-01), and
 * capitalised words that are not the first word of the string.
 */
function names(s: string): string[] {
  const words = s.match(/[A-Za-z][A-Za-z0-9’'&-]*/g) ?? [];
  return words.filter((w, i) => /[A-Z]/.test(w.slice(1)) || (i > 0 && /^[A-Z]/.test(w) && w.length > 1));
}
const latinShare = (s: string) => {
  const letters = s.match(/\p{L}/gu) ?? [];
  return letters.length ? letters.filter((c) => /[A-Za-z]/.test(c)).length / letters.length : 0;
};
const endsWithStop = (s: string) => /[.।]$/.test(s.trim());

const stops = { danda: 0, latin: 0 };

for (const [source, target] of entries) {
  if (!target.trim()) {
    add(source, target, "empty translation (reads as English on the page)");
    continue;
  }

  for (const n of numbers(source)) {
    if (!target.includes(n)) add(source, target, `number "${n}" is missing or rewritten (keep Latin digits as written)`);
  }
  for (const name of names(source)) {
    if (!target.includes(name)) add(source, target, `"${name}" looks like a name or acronym and is not in the translation`);
  }
  for (const mark of ["==", "**"]) {
    if (source.split(mark).length !== target.split(mark).length) add(source, target, `inline mark ${mark} count differs`);
  }

  if (source.length >= 12) {
    const ratio = target.length / source.length;
    if (ratio > 1.8) add(source, target, `about ${ratio.toFixed(1)}× the English length; check it still fits and is not padded`);
    if (ratio < 0.45) add(source, target, `about ${ratio.toFixed(1)}× the English length; check nothing was dropped`);
  }

  if (target === source && /[a-z]{3,}/.test(source) && names(source).length === 0) {
    add(source, target, "left in English");
  } else if (source.split(/\s+/).length > 3 && latinShare(target) > 0.6) {
    add(source, target, "mostly Latin letters; is this English left untranslated?");
  }

  if (endsWithStop(source) !== endsWithStop(target)) {
    add(source, target, endsWithStop(source) ? "the English ends a sentence; the translation has no full stop" : "full stop added to a label");
  }
  if (target.trim().endsWith("।")) stops.danda++;
  else if (target.trim().endsWith(".")) stops.latin++;
}

console.log(`\n  ${file}: ${entries.length} strings, ${Object.keys(catalog.revised ?? {}).length} already revised.`);
if (stops.danda && stops.latin) {
  console.log(`  Full stops are mixed: ${stops.danda} end with "।" and ${stops.latin} with ".". Pick one for the page.`);
}
if (!flags.length) {
  console.log("  No mechanical flags. Read for voice next.\n");
} else {
  console.log(`  ${flags.length} flag${flags.length === 1 ? "" : "s"}:\n`);
  for (const f of flags) {
    console.log(`  - ${f.source}`);
    console.log(`    → ${f.target}`);
    console.log(`    ${f.why}\n`);
  }
}
