"use client";

import { useEffect, useRef, useState } from "react";

type Headline = { figure?: string; headline: string; source: string; date?: string; url?: string };

function Chevron({ back = false }: { back?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={back ? "M12 5l-5 5 5 5" : "M8 5l5 5-5 5"} />
    </svg>
  );
}

/**
 * The research headlines: columns of figures and their sources, split by
 * hairlines, in a row that scrolls sideways.
 *
 * The row is a native scroller, so a trackpad or a swipe moves it and a
 * vertical wheel still moves the page. The buttons at either end step it one
 * clipping at a time and go quiet at the ends; they are marked disabled rather
 * than disabled outright, so keyboard focus is not dropped when the row runs
 * out. A column with a source link is one link, and only those lift.
 */
export function HeadlineRail({ items, label }: { items: Headline[]; label: string }) {
  const viewRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const max = view.scrollWidth - view.clientWidth;
      setEdge({ start: view.scrollLeft <= 2, end: view.scrollLeft >= max - 2 });
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    view.addEventListener("scroll", queue, { passive: true });
    const observer = "ResizeObserver" in window ? new ResizeObserver(queue) : null;
    observer?.observe(view);
    queue();
    return () => {
      view.removeEventListener("scroll", queue);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const step = (direction: 1 | -1) => {
    const view = viewRef.current;
    const column = view?.querySelector<HTMLElement>(".cs-clip");
    if (!view || !column) return;
    // One column is its width plus the space after its hairline.
    const space = parseFloat(getComputedStyle(column).marginRight) || 0;
    view.scrollBy({
      left: direction * (column.offsetWidth + space),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="cs-heads" role="group" aria-roledescription="carousel" aria-label={label}>
      <button
        type="button"
        className="cs-heads__btn"
        aria-label="Earlier headlines"
        aria-disabled={edge.start}
        onClick={() => !edge.start && step(-1)}
      >
        <Chevron back />
      </button>

      <div ref={viewRef} className="cs-heads__view" tabIndex={0} role="group" aria-label={`${label}, scrolls sideways`}>
        <ul className="cs-heads__track">
          {items.map((item) => (
            <li key={item.headline} className="cs-clip">
              <article className={`cs-clip__item${item.url ? " is-link" : ""}`}>
                <h4 className={`cs-clip__headline${item.figure ? "" : " is-lead"}`}>
                  {item.figure && <span className="cs-clip__fig">{item.figure}</span>}
                  {item.figure && " "}
                  {item.headline}
                </h4>
                <p className="cs-clip__src">
                  {item.url ? (
                    <a className="cs-clip__link" href={item.url} target="_blank" rel="noopener noreferrer">
                      {item.source}
                      <span className="sr-only"> (opens in a new tab)</span>
                      <svg
                        viewBox="0 0 14 14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 10l6-6M5 4h5v5" />
                      </svg>
                    </a>
                  ) : (
                    <span className="cs-clip__date">{item.source}</span>
                  )}
                  {item.date && <span className="cs-clip__date">{item.date}</span>}
                </p>
              </article>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        className="cs-heads__btn"
        aria-label="Later headlines"
        aria-disabled={edge.end}
        onClick={() => !edge.end && step(1)}
      >
        <Chevron />
      </button>
    </div>
  );
}
