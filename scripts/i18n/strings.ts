/**
 * The English strings the portfolio page shows, and how a catalog stands
 * against them.
 *
 * Nothing here keeps a list by hand. The page's words come from `homeCopy` in
 * lib/copy.ts, and this runs that same function with a translator that writes
 * down every string it is handed. Add a project, change a tag, reword a
 * button: the list follows.
 */
import { caseStudies } from "../../lib/case-studies";
import { homeCopy } from "../../lib/copy";
import { catalog, type Locale } from "../../lib/i18n";
import { portfolio } from "../../lib/portfolio";
import { resume } from "../../lib/resume";

/** Every English string on the portfolio page, once each, in page order. */
export function pageStrings(): string[] {
  const seen = new Set<string>();
  homeCopy(
    (source) => {
      seen.add(source);
      return source;
    },
    "en",
    { profile: resume.profile, languages: resume.languages, portfolio, studies: caseStudies() },
  );
  return [...seen];
}

export type Coverage = {
  locale: Locale;
  total: number;
  /** On the page, not yet in the catalog: these read in English. */
  missing: string[];
  /** In the catalog, no longer on the page. Harmless, but dead weight. */
  stale: string[];
  /** Translated to exactly the English, which is right for a name and a slip anywhere else. */
  unchanged: string[];
};

export function coverage(locale: Locale): Coverage {
  const sources = pageStrings();
  const { strings } = catalog(locale);
  const onPage = new Set(sources);
  return {
    locale,
    total: sources.length,
    missing: sources.filter((s) => !strings[s]),
    stale: Object.keys(strings).filter((s) => !onPage.has(s)),
    unchanged: sources.filter((s) => strings[s] === s),
  };
}
