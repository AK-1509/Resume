/**
 * The Languages card: the mauve Index material, bottom right of the page.
 *
 * Each name lights up and lifts toward the reader under the pointer (see
 * `.pf-langs` in globals.css). The names are not links, so they stay out of
 * the tab order; the effect is decoration on top of a plain list.
 */
export function LanguagesCard({ languages }: { languages: string[] }) {
  if (languages.length === 0) return null;

  return (
    <section className="druid-index pf-langs" aria-labelledby="languages-title">
      <h2 id="languages-title" className="pf-langs__title">
        Languages
      </h2>
      <ul>
        {languages.map((language) => (
          <li key={language}>{language}</li>
        ))}
      </ul>
    </section>
  );
}
