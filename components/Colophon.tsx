/**
 * The colophon — the thin closing line that states the materials.
 *
 * Deliberately not bubbles: languages are not filterable, so nothing about them
 * may imply they can be clicked. Separators are drawn as borders rather than
 * typed characters so screen readers hear a clean list.
 */
export function Colophon({ languages }: { languages: string[] }) {
  if (languages.length === 0) return null;

  return (
    <section
      aria-labelledby="languages-heading"
      className="flex flex-col gap-2 border-t border-rule pt-6 sm:flex-row sm:items-baseline sm:gap-8"
    >
      <h2 id="languages-heading" className="metadata shrink-0 text-soft">
        Languages
      </h2>
      {/* The separator hangs off the end of each item rather than the start of
          the next, so a wrapped line never opens with a stray rule. */}
      <ul className="flex flex-wrap gap-x-3 gap-y-1 font-sans text-body text-strong">
        {languages.map((language, i) => (
          <li key={language}>
            {language}
            {i < languages.length - 1 && (
              <span className="ms-3 text-rule" aria-hidden="true">
                ·
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
