import { formatDuration } from "@/lib/format";
import type { Experience } from "@/lib/schema";

/**
 * A non-matching entry while a filter is active.
 *
 * It keeps its place in the date order and keeps its segment of the rail, so
 * the filtered view still reads as a timeline with the matches lit along it.
 * Not focusable: these are context, not results, and putting eight of them in
 * the tab order between the reader and the matches would be worse than useless.
 */
export function ExperienceStub({ experience }: { experience: Experience }) {
  return (
    <div className="flex min-w-0 items-baseline gap-3 border-l-2 border-rule/40 py-2 ps-5 opacity-70">
      <span className="metadata shrink-0 text-soft">
        {formatDuration(experience.startDate, experience.endDate)}
      </span>
      {/* `min-w-0` is what lets `truncate` actually take effect: a flex item
          defaults to min-width:auto and will not shrink below its content,
          so a long title pushes the whole page sideways instead of eliding. */}
      <span className="min-w-0 truncate font-sans text-ui text-soft">{experience.title}</span>
    </div>
  );
}
