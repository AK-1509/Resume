import { CATEGORY_LABELS, entryAnchor } from "./anchors";
import { LOCALES, endonym, isLocale, type Locale, type Translate } from "./i18n";
import type { CaseStudy, Portfolio, Resume } from "./schema";

/**
 * Every word the portfolio page shows, in the page's language.
 *
 * The page asks for its words here and nowhere else, and so does
 * `npm run i18n`: it runs these same functions with a translator that writes
 * down each English string it is handed, which is the list of strings a
 * catalog has to cover. A string that is rendered without passing through `t`
 * is a string that never gets translated, so components take their words as
 * props rather than writing them inline.
 *
 * What is left alone: the person's name, email and link labels, project and
 * company names (titles), and key figures, which are numbers.
 */

/** The header, the theme switch, the export button and the Index tab: shared by every page. */
export function chromeLabels(t: Translate) {
  return {
    skipProjects: t("Skip to the projects"),
    skipContact: t("Skip to contact"),
    skipProject: t("Skip to the project"),
    site: t("Site"),
    projects: t(CATEGORY_LABELS.project),
    caseStudies: t(CATEGORY_LABELS["case-study"]),
    contact: t("Contact"),
    menu: t("Menu"),
    darkMode: t("Dark mode"),
    dark: t("Dark"),
    light: t("Light"),
    exportShort: t("Export"),
    exportResume: t("Export resume"),
    index: t("Index"),
    browse: t("Browse the work"),
  };
}
export type ChromeLabels = ReturnType<typeof chromeLabels>;

/** The English chrome, for the pages that are not translated yet. */
export const ENGLISH_CHROME: ChromeLabels = chromeLabels((s) => s);

export type HomeSource = {
  profile: Resume["profile"];
  languages: Resume["languages"];
  portfolio: Portfolio;
  studies: CaseStudy[];
};

export function homeCopy(t: Translate, locale: Locale, { profile, languages, portfolio, studies }: HomeSource) {
  const projects = studies
    .filter((s) => s.category === "project")
    .map(({ slug, title, slugLine, tags, hero, role }) => ({
      slug,
      title,
      slugLine: tr(t, slugLine),
      tags: tags.map((tag) => t(tag)),
      hero,
      role: { ...role, title: tr(t, role.title), sprint: tr(t, role.sprint) },
    }));
  const cases = studies
    .filter((s) => s.category === "case-study")
    .map(({ slug, title, slugLine, tags, keyFigure }) => ({
      slug,
      title,
      slugLine: tr(t, slugLine),
      // Read in English, before translation: the row shows the kind of work.
      tags: tags.filter((tag) => !isTeamTag(tag)).map((tag) => t(tag)),
      keyFigure: keyFigure && { value: keyFigure.value, label: t(keyFigure.label) },
    }));

  const chrome = chromeLabels(t);

  return {
    lang: locale,
    title: `${profile.name} — ${t("Portfolio")}`,
    description: t(profile.headline),
    chrome,
    hero: {
      name: profile.name,
      role: t(portfolio.hero.role),
      sub: tr(t, portfolio.hero.sub),
      credentials: portfolio.hero.credentials.map((c) => t(c)),
      seeProjects: t("See the projects"),
      getInTouch: t("Get in touch"),
    },
    projects: {
      items: projects,
      labels: {
        title: chrome.projects,
        back: t("Back to the top"),
        cta: t("See the project"),
        about: t("About this project"),
      },
    },
    cases: {
      items: cases,
      labels: {
        title: chrome.caseStudies,
        lead: t(
          "Analysis and strategy for real companies, from pricing and valuation to launch plans and social media.",
        ),
        back: t("Back to the top"),
      },
    },
    index: [
      ...projects.map((s) => ({ id: entryAnchor("project", s.slug), label: s.title, group: chrome.projects })),
      ...cases.map((s) => ({ id: entryAnchor("case-study", s.slug), label: s.title, group: chrome.caseStudies })),
    ],
    contact: {
      title: chrome.contact,
      email: profile.email,
      links: profile.links,
      basedIn: t(`Based in ${profile.location}`),
    },
    languages: {
      title: t("Languages"),
      items: languages.map((name) => {
        const code = (Object.keys(LOCALES) as Locale[]).find((l) => LOCALES[l].name === name);
        return {
          /** In the page's language, like the rest of the list. */
          name: t(name),
          /** Set when the page can be read in this language. */
          switchTo:
            code && isLocale(code)
              ? { locale: code, href: LOCALES[code].href, endonym: endonym(code), current: code === locale }
              : undefined,
        };
      }),
    },
  };
}
export type HomeCopy = ReturnType<typeof homeCopy>;

/** "Team of five" and "Solo project" say who did it, not what kind of work it was. */
const isTeamTag = (tag: string) => /^(team of|solo)/i.test(tag);

/** Empty stays empty: an empty field is a normal state, not a string to translate. */
function tr(t: Translate, source: string): string {
  return source.trim() ? t(source) : source;
}
