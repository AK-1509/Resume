import type { Skill } from "@/lib/schema";

/**
 * The index, at the back of the book.
 *
 * Skills carry no visible endorsement count — the count exists only to order
 * this list, most-proved first, so the strongest claims land where the eye
 * does. Selecting a bubble filters the sections above; the × is the second,
 * non-colour signal for the active state, and filtering itself lands in Phase 5.
 */
export function SkillIndex({ skills }: { skills: Skill[] }) {
  if (skills.length === 0) return null;

  return (
    <section aria-labelledby="skills-heading">
      <h2 id="skills-heading" className="font-serif text-section font-medium text-strong">
        Skills
      </h2>
      <p className="mt-2 max-w-[60ch] font-sans text-body text-soft">
        Select a skill to see only the experiences that prove it.
      </p>

      <ul className="mt-6 flex flex-wrap gap-2">
        {skills.map((skill) => (
          <li key={skill.id}>
            <button
              type="button"
              aria-pressed={false}
              className="rounded-[2px] border border-rule px-3 py-2 font-mono text-bubble font-medium uppercase text-strong transition-colors hover:border-strong"
            >
              {skill.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
