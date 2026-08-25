"use client";

import type { Skill } from "@/lib/schema";

/**
 * The index, at the back of the book.
 *
 * Skills carry no visible endorsement count — the count exists only to order
 * this list, most-proved first, so the strongest claims land where the eye
 * does. Selecting a bubble filters the sections above.
 *
 * The active state is carried by fill, text contrast *and* the ×, never by
 * colour alone, and `aria-pressed` exposes it to assistive tech.
 */
export function SkillIndex({
  skills,
  selected,
  matchCount,
  onToggle,
  onClear,
  onViewResults,
}: {
  skills: Skill[];
  selected: string[];
  matchCount: number;
  onToggle: (id: string) => void;
  onClear: () => void;
  onViewResults: () => void;
}) {
  if (skills.length === 0) return null;

  const filtering = selected.length > 0;

  return (
    <section aria-labelledby="skills-heading">
      <h2 id="skills-heading" className="font-serif text-section font-medium text-strong">
        Skills
      </h2>
      <p className="mt-2 max-w-[60ch] font-sans text-body text-soft">
        Select a skill to see only the experiences that prove it. Selecting more than one shows
        only the experiences that prove all of them.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {skills.map((skill) => {
          const on = selected.includes(skill.id);
          return (
            <li key={skill.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(skill.id)}
                className={`flex items-center gap-2 rounded-[2px] border px-3 py-2 font-mono text-bubble font-medium uppercase transition-colors ${
                  on
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-strong hover:border-strong"
                }`}
              >
                {skill.label}
                {on && (
                  <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" aria-hidden="true">
                    <path
                      d="M4 4l8 8M12 4l-8 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Feedback stays local to the control. The index is at the foot of the
          page, so the results it changes are off-screen above — telling the
          reader what happened here beats silently changing something they
          cannot see. */}
      {filtering && (
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-rule pt-4">
          {/* Deliberately terse when nothing matches: the empty state above
              already carries the full sentence and the advice, and repeating
              it here would say the same thing twice on one screen. */}
          <p className="font-sans text-body text-strong">
            {matchCount === 0
              ? "No matches."
              : `${matchCount} experience${matchCount === 1 ? "" : "s"} match${
                  matchCount === 1 ? "es" : ""
                }.`}
          </p>
          {matchCount > 0 && (
            <button
              type="button"
              onClick={onViewResults}
              className="font-sans text-ui font-medium text-accent underline underline-offset-4"
            >
              View results
            </button>
          )}
          <button
            type="button"
            onClick={onClear}
            className="font-sans text-ui font-medium text-accent underline underline-offset-4"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
