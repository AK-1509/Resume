import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type LanguageItem = {
  /** The language's name in the page's language. */
  name: string;
  /** Set when the page can be read in this language. */
  switchTo?: { locale: Locale; href: string; endonym: string; current: boolean };
};

/**
 * The Languages card: the mauve Index material, bottom right of the page.
 *
 * It lists the languages the person speaks, named in the page's language. A
 * language the page can also be read in is a link: choosing it turns the page
 * into that language in place (a client navigation tagged "language", so the
 * page crossfades and keeps its scroll position). Under its name it carries
 * the language's own name, so a reader who cannot read the current page can
 * still find theirs. The language being read is not a link: it is marked with
 * `aria-current` and a glint bullet, so the state never rests on colour alone.
 *
 * Languages with no translation yet are plain text, out of the tab order. On a
 * fine pointer only the links lift toward the reader (`.pf-langs__link`).
 */
export function LanguagesCard({ title, languages }: { title: string; languages: LanguageItem[] }) {
  if (languages.length === 0) return null;

  return (
    <section className="druid-index pf-langs" aria-labelledby="languages-title">
      <h2 id="languages-title" className="pf-langs__title">
        {title}
      </h2>
      <ul>
        {languages.map(({ name, switchTo }) => (
          <li key={name}>
            {!switchTo ? (
              <span className="pf-langs__name">{name}</span>
            ) : switchTo.current ? (
              <span className="pf-langs__current" aria-current="true">
                <span className="pf-langs__name">{name}</span>
              </span>
            ) : (
              <Link
                className="pf-langs__link"
                href={switchTo.href}
                hrefLang={switchTo.locale}
                transitionTypes={["language"]}
                scroll={false}
              >
                <span className="pf-langs__name">{name}</span>
                {switchTo.endonym !== name && (
                  <span className="pf-langs__endonym" lang={switchTo.locale}>
                    {switchTo.endonym}
                  </span>
                )}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
