/**
 * `npm run i18n` — how each translation stands against the page.
 *
 *   npm run i18n                 one line per locale
 *   npm run i18n -- hi --missing the missing strings for a locale, as JSON
 *
 * Missing strings are not an error: the page shows them in English. Run
 * `npm run i18n:translate -- <locale>` to fill them through DeepL.
 */
import { TRANSLATED_LOCALES, isLocale } from "../../lib/i18n";
import { coverage } from "./strings";

const [arg, flag] = process.argv.slice(2);

if (arg) {
  if (!isLocale(arg)) {
    console.error(`  "${arg}" is not a locale. Known: ${TRANSLATED_LOCALES.join(", ")}.`);
    process.exit(1);
  }
  const c = coverage(arg);
  if (flag === "--missing") {
    console.log(JSON.stringify(c.missing, null, 2));
    process.exit(0);
  }
  print(c);
} else {
  for (const locale of TRANSLATED_LOCALES) print(coverage(locale));
}

function print(c: ReturnType<typeof coverage>) {
  const done = c.total - c.missing.length;
  console.log(`\n  ${c.locale}: ${done} of ${c.total} strings translated.`);
  if (c.missing.length) {
    console.log(`  ${c.missing.length} missing (shown in English):`);
    for (const s of c.missing) console.log(`    - ${s}`);
  }
  if (c.unchanged.length) {
    console.log(`  ${c.unchanged.length} kept as the English (fine for names, check the rest):`);
    for (const s of c.unchanged) console.log(`    - ${s}`);
  }
  if (c.stale.length) {
    console.log(`  ${c.stale.length} no longer on the page (remove with npm run i18n:translate -- ${c.locale} --prune):`);
    for (const s of c.stale) console.log(`    - ${s}`);
  }
  console.log("");
}
