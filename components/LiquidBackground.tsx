"use client";

import { useEffect, useRef } from "react";

/**
 * Three soft colour masses drifting behind a section. They move only by
 * transform, and pause whenever the section is off screen so a long page never
 * runs six animations nobody can see. Reduced motion stops them entirely (see
 * globals.css).
 */
export function LiquidBackground({ tone }: { tone: "brown" | "green" | "page" }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => el.classList.toggle("is-idle", !entry.isIntersecting),
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`pf-liquid pf-liquid--${tone}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
