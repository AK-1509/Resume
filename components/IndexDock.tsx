"use client";

import { useEffect, useId, useRef, useState } from "react";

/** A section counts as current once its top has scrolled this far up. */
const CURRENT_LINE = 160;

/**
 * The role index, docked out of the way: a small mauve tab on the right edge
 * that opens into the full Index card.
 *
 * A pointer opens it by hovering (pure CSS, see `.pf-dock`). The tab is also a
 * real button, so a tap or Enter opens it and moves focus to the first link;
 * Escape, or focus leaving the dock, closes it again. While closed the card is
 * `visibility: hidden`, so its links are out of the tab order.
 *
 * The current section is marked with `aria-current="location"` and a glint
 * bullet, so the state is carried by a mark as well as by colour.
 */
export function IndexDock({
  items,
  label,
}: {
  items: { id: string; label: string }[];
  label: string;
}) {
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      let active: string | undefined;
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

  // Opened by tap or keyboard: move focus into the card so Tab continues
  // through the links rather than past them.
  useEffect(() => {
    if (!open) return;
    dockRef.current?.querySelector<HTMLAnchorElement>(".druid-index a")?.focus();
  }, [open]);

  return (
    <div
      ref={dockRef}
      className="pf-dock"
      data-open={open}
      onKeyDown={(ev) => {
        if (ev.key === "Escape" && open) {
          setOpen(false);
          tabRef.current?.focus();
        }
      }}
      onBlur={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={tabRef}
        type="button"
        className="pf-dock__tab"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span aria-hidden="true" className="pf-dock__dot">
          •
        </span>
        Index
      </button>
      <nav id={panelId} className="druid-index pf-dock__panel" aria-label={label}>
        <p className="druid-caption">{label}</p>
        <ol>
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={item.id === currentId ? "location" : undefined}
                onClick={(ev) => {
                  // Drop focus as well, or `:focus-within` would hold the
                  // card open over the section the link just scrolled to.
                  ev.currentTarget.blur();
                  setOpen(false);
                }}
              >
                <span className="druid-gold-text">{item.label}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
