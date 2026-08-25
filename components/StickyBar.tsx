"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import type { Skill } from "@/lib/schema";

/**
 * Appears once the hero has scrolled past, or whenever a filter is active.
 *
 * The second condition is load-bearing: the skills index sits at the foot of
 * the page, so the state it sets is a long way from where it is set. This bar
 * is where that state lives and where it can be undone from anywhere.
 *
 * Always `ink`, matching the hero, so its controls need one set of styles in
 * both themes.
 */
export function StickyBar({
  name,
  selected,
  skills,
  matchCount,
  onToggle,
  onClear,
  onExport,
}: {
  name: string;
  selected: string[];
  skills: Skill[];
  matchCount: number;
  onToggle: (id: string) => void;
  onClear: () => void;
  onExport: () => void;
}) {
  const [scrolledPast, setScrolledPast] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("header");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolledPast(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const filtering = selected.length > 0;
  const shown = scrolledPast || filtering;

  const active = selected
    .map((id) => skills.find((s) => s.id === id))
    .filter((s): s is Skill => Boolean(s));

  return (
    <div
      className={`on-ink fixed inset-x-0 top-0 z-40 border-b border-brass/40 bg-ink transition-transform duration-200 ${
        shown ? "translate-y-0" : "-translate-y-full"
      }`}
      // Hidden from assistive tech and from tab order while off-screen, so it
      // never becomes an invisible focus stop above the page.
      aria-hidden={!shown}
      inert={!shown}
    >
      {/* Deliberately one line at every width. A wrapping bar grows tall
          enough on a phone to clip the top of the hero beneath it. */}
      <div className="shell flex items-center gap-x-4 py-3">
        {/* The name is context, not function — it yields first when a filter
            needs the width. */}
        <p
          className={`truncate font-serif text-entry font-semibold text-paper ${
            filtering ? "hidden sm:block" : ""
          }`}
        >
          {name}
        </p>

        {filtering && (
          <>
            {/* Below `sm` there is not room for more than one chip, and a chip
                clipped mid-word reads as broken rather than scrollable — so a
                count stands in. Individual filters stay removable from the
                index at the foot of the page. */}
            {active.length > 1 && (
              <p className="metadata shrink-0 text-paper sm:hidden">
                {active.length} filters
              </p>
            )}
            <ul
              className={`min-w-0 items-center gap-2 ${
                active.length > 1 ? "hidden sm:flex" : "flex"
              }`}
            >
              {active.map((skill) => (
                <li key={skill.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggle(skill.id)}
                    aria-label={`Remove ${skill.label} filter`}
                    className="flex items-center gap-2 rounded-[2px] border border-brass px-2 py-1 font-mono text-bubble font-medium uppercase text-paper transition-colors hover:bg-brass hover:text-ink"
                  >
                    {skill.label}
                    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" aria-hidden="true">
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
            <p className="metadata shrink-0 text-brass">
              {matchCount} match{matchCount === 1 ? "" : "es"}
            </p>
            <button
              type="button"
              onClick={onClear}
              className="shrink-0 font-sans text-ui font-medium text-paper underline decoration-brass underline-offset-4 hover:decoration-paper"
            >
              Clear
            </button>
          </>
        )}

        {/* The theme switch and export action only appear once the hero's own
            copies have scrolled away. When the bar is showing purely because a
            filter is active, duplicating them would put two identical switches
            on screen at the same time. */}
        {scrolledPast && (
          <div className="ms-auto flex shrink-0 items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={onExport}
              className="rounded-[2px] bg-claret px-4 py-2 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim"
            >
              Export
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
