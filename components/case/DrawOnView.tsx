"use client";

import { useEffect } from "react";

/**
 * Plays each `[data-draw]` figure once, when it scrolls into view: the
 * highlighter over the problem statement, the roadmap's line, the exchange's
 * flows, the sizing rings and the budget bars.
 *
 * The page is complete without this. Server markup carries `data-draw=""` and
 * every figure's finished state is its default style; the undrawn state only
 * exists once this has set `data-draw-ready` on the root. Anything already on
 * screen or above it at that moment is marked "done" first, so nothing the
 * reader can see blinks out and back.
 */
export function DrawOnView({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || !("IntersectionObserver" in window)) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-draw]"));
    const fold = window.innerHeight * 0.92;
    for (const el of targets) {
      if (el.dataset.draw === "" && el.getBoundingClientRect().top < fold) el.dataset.draw = "done";
    }
    root.setAttribute("data-draw-ready", "");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.draw = "in";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -14% 0px", threshold: 0.15 },
    );
    for (const el of targets) if (el.dataset.draw === "") observer.observe(el);

    return () => observer.disconnect();
  }, [rootId]);

  return null;
}
