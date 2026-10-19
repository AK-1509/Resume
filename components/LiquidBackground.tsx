"use client";

import { useEffect, useRef } from "react";

/**
 * Three soft colour masses drifting across the canvas, behind every glass
 * surface. They move only by transform and pause whenever they are off
 * screen; reduced motion stops them entirely (see globals.css).
 */
export function LiquidBackground() {
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
    <div ref={ref} className="pf-liquid" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}
