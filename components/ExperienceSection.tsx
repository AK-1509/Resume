import { ExperienceCard } from "./ExperienceCard";
import type { Experience } from "@/lib/schema";

/**
 * One titled run of cards.
 *
 * Thumbnail slot reservation is decided here, per section, from whether any
 * card in this section has a thumbnail. All-or-nothing per column means a
 * ragged left edge is impossible, and dead space only appears when a section is
 * genuinely mixed — so `thumbnailId: null` never leaves a hole.
 */
export function ExperienceSection({
  id,
  heading,
  experiences,
  columns = 1,
}: {
  id: string;
  heading: string;
  experiences: Experience[];
  columns?: 1 | 2;
}) {
  if (experiences.length === 0) return null;

  const reserveThumb = experiences.some((e) => e.thumbnailId !== null);

  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="font-serif text-section font-medium text-ink">
        {heading}
      </h2>

      {/* Tight gap so the cards' left borders read as one near-continuous
          spine rather than as unrelated card edges. */}
      <ul
        className={`mt-6 grid gap-x-4 gap-y-2 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}
      >
        {experiences.map((experience) => (
          <li key={experience.id}>
            <ExperienceCard experience={experience} reserveThumb={reserveThumb} />
          </li>
        ))}
      </ul>
    </section>
  );
}
