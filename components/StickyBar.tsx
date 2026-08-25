"use client";

import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Appears once the hero has scrolled past, so the export action and the theme
 * switch stay reachable from anywhere on the page — including the skills index
 * at the foot, which is a long way from the top.
 *
 * Always `ink`, matching the hero, so its controls need one set of styles in
 * both themes.
 */
export function StickyBar({ name, onExport }: { name: string; onExport: () => void }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("header");
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting),
      { rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

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
      <div className="shell flex items-center justify-between gap-4 py-3">
        <p className="truncate font-serif text-entry font-semibold text-paper">{name}</p>
        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            onClick={onExport}
            className="rounded-[2px] bg-claret px-4 py-2 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
