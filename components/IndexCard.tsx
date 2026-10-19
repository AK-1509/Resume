"use client";

import { useEffect, useRef, useState } from "react";

/** A section counts as current once its top has scrolled this far up. */
const CURRENT_LINE = 160;
/** Maximum pointer tilt, in degrees either way. */
const TILT = 3;

/**
 * The role index: a fixed mauve card with metallic gold labels, right-aligned
 * at every width.
 *
 * The current section is marked with `aria-current="location"` and a glint
 * bullet, so the state is carried by a mark as well as by the reader's
 * position. The card leans gently toward a fine pointer; touch and reduced
 * motion get a still card.
 */
export function IndexCard({
  items,
  label,
}: {
  items: { id: string; label: string }[];
  label: string;
}) {
  const [currentId, setCurrentId] = useState(items[0]?.id);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let active = items[0]?.id;
      for (const item of items) {
        const section = document.getElementById(item.id);
        if (section && section.getBoundingClientRect().top <= CURRENT_LINE) active = item.id;
      }
      setCurrentId(active);
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
  }, [items]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const clear = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      pointer = null;
      nav.style.removeProperty("--tilt-x");
      nav.style.removeProperty("--tilt-y");
    };
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches || event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pointer) return;
        const box = nav.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const x = Math.min(0.5, Math.max(-0.5, (pointer.x - box.left) / box.width - 0.5));
        const y = Math.min(0.5, Math.max(-0.5, (pointer.y - box.top) / box.height - 0.5));
        nav.style.setProperty("--tilt-x", `${(-y * TILT * 2).toFixed(2)}deg`);
        nav.style.setProperty("--tilt-y", `${(x * TILT * 2).toFixed(2)}deg`);
      });
    };
    nav.addEventListener("pointermove", move);
    nav.addEventListener("pointerleave", clear);
    return () => {
      nav.removeEventListener("pointermove", move);
      nav.removeEventListener("pointerleave", clear);
      clear();
    };
  }, []);

  return (
    <nav ref={navRef} className="druid-index" aria-label={label}>
      <p className="druid-caption">{label}</p>
      <ol>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={item.id === currentId ? "location" : undefined}
            >
              <span className="druid-gold-text">{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
