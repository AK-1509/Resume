"use client";

import { useEffect, useMemo, useState } from "react";

export type NavSection = {
  id: string;
  label: string;
  /** The phase number, shown on its gold disc. Sections without one get a dot. */
  index?: number;
  children?: { id: string; label: string }[];
};

/** A heading counts as current once its top has scrolled this far up. */
const CURRENT_LINE = 180;

/**
 * The navigation pane: every part of the page, with the one being read marked
 * by `aria-current="location"`, a heavier weight and a bar at its edge, so the
 * state never rests on colour.
 *
 * Only the phase being read lists its parts, which keeps the pane short enough
 * to ride in the rail. The parts of the other phases are inert as well as
 * hidden, so Tab never lands on a link that cannot be seen.
 */
export function CaseNav({ sections }: { sections: NavSection[] }) {
  const [current, setCurrent] = useState<string | undefined>(undefined);
  const ids = useMemo(() => sections.flatMap((s) => [s.id, ...(s.children ?? []).map((c) => c.id)]), [sections]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let active: string | undefined;
      let nearest = -Infinity;
      for (const id of ids) {
        const top = document.getElementById(id)?.getBoundingClientRect().top;
        if (top !== undefined && top <= CURRENT_LINE && top >= nearest) {
          nearest = top;
          active = id;
        }
      }
      // The last part may be too short to ever reach the line.
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      setCurrent(atEnd && active ? ids[ids.length - 1] : active);
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    queue();
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ids]);

  return (
    <nav className="cs-nav" aria-label="On this page">
      <p className="druid-caption cs-nav__title">On this page</p>
      <ol>
        {sections.map((section) => {
          const parts = section.children ?? [];
          const open = section.id === current || parts.some((c) => c.id === current);
          return (
            <li key={section.id}>
              <a
                className="cs-nav__link"
                href={`#${section.id}`}
                aria-current={section.id === current ? "location" : undefined}
              >
                {section.index ? (
                  <span className="cs-disc cs-disc--sm" aria-hidden="true">
                    {section.index}
                  </span>
                ) : (
                  <span className="cs-nav__dot" aria-hidden="true" />
                )}
                {section.label}
              </a>
              {parts.length > 0 && (
                <div className="cs-nav__sub" data-open={open}>
                  <ol inert={!open}>
                    {parts.map((part) => (
                      <li key={part.id}>
                        <a
                          className="cs-nav__link cs-nav__link--sub"
                          href={`#${part.id}`}
                          aria-current={part.id === current ? "location" : undefined}
                        >
                          {part.label}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
