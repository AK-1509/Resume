import Image from "next/image";
import { formatDuration } from "@/lib/format";
import { hasDetail } from "@/lib/resume";
import type { Experience } from "@/lib/schema";

/** 56px, matching the reserved slot width in ExperienceSection. */
const THUMB = 56;

function Thumbnail({ experience }: { experience: Experience }) {
  const item = experience.gallery.find((g) => g.id === experience.thumbnailId);
  if (!item) {
    // The slot stays reserved so titles align down the column. See
    // ExperienceSection for why reservation is decided per section.
    return <div className="hidden shrink-0 sm:block" style={{ width: THUMB }} aria-hidden="true" />;
  }

  return (
    <div
      className="hidden shrink-0 overflow-hidden rounded-[2px] bg-paper sm:block"
      style={{ width: THUMB, height: THUMB }}
    >
      <Image
        src={item.src}
        alt=""
        width={THUMB * 2}
        height={THUMB * 2}
        className="plate h-full w-full object-cover object-left-top"
      />
    </div>
  );
}

function CardBody({ experience, reserveThumb }: { experience: Experience; reserveThumb: boolean }) {
  return (
    <div className="flex gap-4">
      {reserveThumb && <Thumbnail experience={experience} />}

      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-entry font-semibold text-strong">{experience.title}</h3>

        {/* organization is "" for personal projects — the line is dropped, not
            rendered empty. */}
        {experience.organization && (
          <p className="mt-1 font-sans text-org font-medium text-soft">{experience.organization}</p>
        )}

        {/* Duration and location: stacked on mobile, opposed ends on desktop. */}
        <p className="mt-3 flex flex-col gap-y-1 sm:flex-row sm:items-baseline sm:gap-x-4">
          <span className="metadata text-soft">
            {formatDuration(experience.startDate, experience.endDate)}
          </span>
          <span className="metadata text-soft sm:ms-auto">{experience.location}</span>
        </p>
      </div>
    </div>
  );
}

/**
 * A collapsed entry: title, organization, duration, location, optional
 * thumbnail. Nothing else — the whole point is that detail is behind a click.
 *
 * The left border is this card's segment of the rail. At rest it is a quiet
 * sage hairline; Phase 5 turns matching segments claret so that a filtered
 * column reads as the span of a career where that skill was in play.
 */
export function ExperienceCard({
  experience,
  reserveThumb,
  onOpen,
}: {
  experience: Experience;
  reserveThumb: boolean;
  onOpen: (id: string) => void;
}) {
  const shared = "block h-full w-full border-l-2 border-rule p-5 text-left rounded-r-[2px]";

  // An entry with no summary, no bullets and no images has nothing behind the
  // click, so it neither behaves nor looks like a button. It drops the card
  // fill and reads as a record against the page — the absence of a surface is
  // the affordance, which avoids adding a mark to all the cards that do open.
  if (!hasDetail(experience)) {
    return (
      <article className={shared}>
        <CardBody experience={experience} reserveThumb={reserveThumb} />
      </article>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(experience.id)}
      className={`${shared} bg-panel transition-colors hover:border-accent`}
    >
      <CardBody experience={experience} reserveThumb={reserveThumb} />
    </button>
  );
}
