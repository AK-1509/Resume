"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

/** A section counts as current once its top has scrolled this far up. */
const CURRENT_LINE = 160;

export type IndexItem = {
  id: string;
  label: string;
  /** A page to go to. Without one, the entry is a section on this page. */
  href?: string;
  /** For page entries: this is the page being read. */
  current?: boolean;
  /** A heading the entry is listed under, e.g. "Projects". Entries keep
   *  their order; a new group starts wherever the heading changes. */
  group?: string;
};

/** Runs of consecutive entries that share a group heading. */
function grouped(items: IndexItem[]): { group?: string; items: IndexItem[] }[] {
  const runs: { group?: string; items: IndexItem[] }[] = [];
  for (const item of items) {
    const last = runs[runs.length - 1];
    if (last && last.group === item.group) last.items.push(item);
    else runs.push({ group: item.group, items: [item] });
  }
  return runs;
}

/**
 * The Index, docked out of the way: a small mauve tab on the right edge
 * that opens into the full Index card.
 *
 * On the portfolio it lists every entry on the page, the projects and then the
 * case studies, each under its own heading; on a project or case-study page it
 * lists the pages the same way and ends with the way home.
 *
 * A pointer opens it by hovering (pure CSS, see `.pf-dock`). The tab is also a
 * real button, so a tap or Enter opens it and moves focus to the first link;
 * Escape, or focus leaving the dock, closes it again. While closed the card is
 * `visibility: hidden`, so its links are out of the tab order.
 *
 * The current entry is marked with `aria-current` and a glint bullet, so the
 * state is carried by a mark as well as by colour.
 */
export function IndexDock({
  items,
  label,
  tab,
  home,
}: {
  items: IndexItem[];
  label: string;
  /** The tab's word, in the page's language. */
  tab: string;
  /** A closing link under the list, back to the portfolio. */
  home?: { href: string; label: string };
}) {
  const [currentId, setCurrentId] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    const sections = items.filter((item) => !item.href);
    if (sections.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      let active: string | undefined;
      for (const item of sections) {
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
        {tab}
      </button>
      <nav id={panelId} className="druid-index pf-dock__panel" aria-label={label}>
        <p className="druid-caption">{label}</p>
        {grouped(items).map((run, r) => {
          const headingId = run.group ? `${panelId}-g${r}` : undefined;
          return (
            <div key={run.group ?? r} className="pf-dock__group">
              {run.group && (
                <p id={headingId} className="pf-dock__group-title">
                  {run.group}
                </p>
              )}
              <ol aria-labelledby={headingId}>
                {run.items.map((item) => (
                  <li key={item.id}>
                    {item.href ? (
                      <Link
                        href={item.href}
                        aria-current={item.current ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <span className="druid-gold-text">{item.label}</span>
                      </Link>
                    ) : (
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
                    )}
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
        {home && (
          <p className="pf-dock__home">
            <Link href={home.href} onClick={() => setOpen(false)}>
              {home.label}
            </Link>
          </p>
        )}
      </nav>
    </div>
  );
}
