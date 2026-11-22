import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CatalogSchema, type Catalog } from "./schema";

/**
 * The languages the portfolio page can be read in.
 *
 * English is the source: every string on the page is written in English, and
 * a translation is a catalog in content/i18n/<locale>.json that maps each
 * English string to its translation. A locale is listed here only once it has
 * a catalog. A language the visitor can switch to is a language in
 * `resume.languages` whose English name matches one of these.
 *
 * Server only: catalogs are read from disk, and every page they feed is
 * prerendered.
 */
export const LOCALES = {
  en: { name: "English", href: "/" },
  hi: { name: "Hindi", href: "/hi" },
} as const;

export type Locale = keyof typeof LOCALES;

export const DEFAULT_LOCALE: Locale = "en";

/** The locales with a route of their own, i.e. everything but English. */
export const TRANSLATED_LOCALES: Locale[] = (Object.keys(LOCALES) as Locale[]).filter((l) => l !== DEFAULT_LOCALE);

export const isLocale = (value: string): value is Locale => Object.hasOwn(LOCALES, value);

/** Turns an English source string into the page's language. */
export type Translate = (source: string) => string;

/** English reads as written. */
export const identity: Translate = (source) => source;

/** A language's name in that language, e.g. "हिन्दी" for Hindi. From ICU, not from a catalog. */
export function endonym(locale: Locale): string {
  return new Intl.DisplayNames([locale], { type: "language" }).of(locale) ?? LOCALES[locale].name;
}

const DIR = join(process.cwd(), "content", "i18n");

export function catalogPath(locale: Locale): string {
  return join(DIR, `${locale}.json`);
}

/** The catalog for a translated locale, or an empty one if it has not been written yet. */
export function catalog(locale: Locale): Catalog {
  const file = catalogPath(locale);
  if (!existsSync(file)) return { locale, strings: {} };
  const parsed = CatalogSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    throw new Error(
      `content/i18n/${locale}.json:\n${parsed.error.issues
        .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("\n")}`,
    );
  }
  return parsed.data;
}

/**
 * The translator for a locale. A string with no translation yet reads in
 * English, so a catalog that falls behind the content leaves a phrase in
 * English rather than a hole in the page; `npm run i18n` lists what is missing.
 */
export function translator(locale: Locale): Translate {
  if (locale === DEFAULT_LOCALE) return identity;
  const { strings } = catalog(locale);
  return (source) => strings[source] || source;
}
