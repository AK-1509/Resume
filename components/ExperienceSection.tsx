import { ExperienceCard } from "./ExperienceCard";
import { ExperienceStub } from "./ExperienceStub";
import { FILTER_MODE, matches } from "@/lib/filter";
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
  onOpen,
  selectedSkills = [],
}: {
  id: string;
  heading: string;
  experiences: Experience[];
  columns?: 1 | 2;
  onOpen: (id: string) => void;
  selectedSkills?: string[];
}) {
  if (experiences.length === 0) return null;

  const filtering = selectedSkills.length > 0;
  const hits = experiences.filter((e) => matches(e, selectedSkills));

  // With `remove`, non-matching entries leave the page entirely and a section
  // with no hits disappears with them.
  if (filtering && FILTER_MODE === "remove" && hits.length === 0) return null;

  const visible = filtering && FILTER_MODE === "remove" ? hits : experiences;

  // Reservation follows what is actually shown as a card, so filtering down to
  // entries without thumbnails doesn't leave an empty column of slots.
  const reserveThumb = visible.some(
    (e) => e.thumbnailId !== null && (!filtering || matches(e, selectedSkills)),
  );

  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={`${id}-heading`} className="font-serif text-section font-medium text-strong">
          {heading}
        </h2>
        {filtering && (
          <p className="metadata shrink-0 text-soft">
            {hits.length} of {experiences.length}
          </p>
        )}
      </div>

      {/* Tight gap so the cards' left borders read as one near-continuous
          spine rather than as unrelated card edges. */}
      <ul
        className={`mt-6 grid gap-x-4 gap-y-2 ${columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"}`}
      >
        {visible.map((experience) => {
          const hit = !filtering || matches(experience, selectedSkills);
          return (
            <li key={experience.id} className="transition-opacity duration-200">
              {hit ? (
                <ExperienceCard
                  experience={experience}
                  reserveThumb={reserveThumb}
                  onOpen={onOpen}
                  lit={filtering}
                />
              ) : (
                <ExperienceStub experience={experience} />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
