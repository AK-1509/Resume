"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { rowId } from "./ExperienceList";
import type { HeadlineView } from "@/lib/portfolio";

/** Seconds each headline stays up before the next rolls in. */
const HEADLINE_SECONDS = 7;

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * The hero: name, role statement and credentials, then a panel of rotating
 * headlines — one value proposition per entry, each with a bullet quoted
 * verbatim from the resume as its proof.
 *
 * Headlines roll on a drum. The segmented bar under them is both the timer and
 * the way to jump to any one. Rotation pauses on hover, on keyboard focus,
 * while the hero is off screen or the tab is hidden, and on request; reduced
 * motion turns it off entirely and leaves the Previous and Next buttons.
 */
export function HeroHeadlines({
  name,
  role,
  sub,
  credentials,
  headlines,
  onOpenCard,
}: {
  name: string;
  role: string;
  sub: string;
  credentials: string[];
  headlines: HeadlineView[];
  /** Brings the headline's entry forward: its slide to the front of the
   *  carousel, or its row open on the experience page. */
  onOpenCard: (h: HeadlineView) => void;
}) {
  const n = headlines.length;
  const [h, setH] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [heroHidden, setHeroHidden] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );

  const heroRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => setHeroHidden(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (n === 0) return null;

  // A project opens in its role's carousel; a job lands on its own row.
  const targetOf = (hl: HeadlineView) =>
    hl.page === "projects" ? `#${hl.roleId}` : `#${rowId(hl.roleId, hl.entryId)}`;

  const go = (i: number) => setH(((i % n) + n) % n);
  const above = (h - 1 + n) % n;
  const paused = userPaused || hover || focus || heroHidden || docHidden;
  const current = headlines[h];

  return (
    <section
      id="top"
      ref={heroRef}
      className={`druid-section pf-front${paused ? " is-paused" : ""}`}
      aria-labelledby="hero-title"
    >
      {/* One column on the left; the right side of the hero stays open. */}
      <div className="druid-container">
        <div className="pf-hero__main">
          <h1 id="hero-title" className="pf-h1">
            <span className="pf-h1__name">{name}</span>
            <span className="pf-h1__role">{role}</span>
          </h1>
          {sub && <p className="pf-sub">{sub}</p>}
          {credentials.length > 0 && (
            <ul className="pf-creds">
              {credentials.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}

          <div className="pf-glass-card pf-panel">
            <div
              className="pf-drum"
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              onFocus={(ev) => {
                // Only keyboard focus pauses; a mouse click on a headline is
                // already covered by hover.
                if (ev.target.matches(":focus-visible")) setFocus(true);
              }}
              onBlur={(ev) => {
                if (!ev.currentTarget.contains(ev.relatedTarget)) setFocus(false);
              }}
            >
              {headlines.map((hl, i) => {
                const cls =
                  i === h ? "pf-line is-current" : i === above ? "pf-line is-above" : "pf-line is-below";
                return (
                  <div key={i} className={cls} aria-hidden={i !== h} inert={i !== h}>
                    <a className="pf-hl" href={targetOf(hl)} onClick={() => onOpenCard(hl)}>
                      <span className="pf-hl__text">{hl.line}</span>
                      <span className="pf-attr">
                        <span className="pf-attr__title">{hl.attribution}</span>
                        <span className="druid-tag">{hl.roleLabel}</span>
                      </span>
                    </a>
                    <p className="pf-proof">{hl.proof}</p>
                  </div>
                );
              })}
            </div>

            <ol className="pf-segs" aria-label="All headlines">
              {headlines.map((hl, i) => (
                <li key={i}>
                  <button
                    type="button"
                    className={`pf-seg${i < h ? " is-done" : ""}${i === h ? " is-active" : ""}`}
                    aria-label={`Headline ${i + 1}: ${hl.shortName}`}
                    aria-current={i === h ? "true" : undefined}
                    onClick={() => go(i)}
                  >
                    <span className="pf-seg__bar">
                      <span
                        className="pf-seg__fill"
                        style={{ animationDuration: `${HEADLINE_SECONDS}s` }}
                        onAnimationEnd={() => {
                          if (!reduced && i === h) go(i + 1);
                        }}
                      />
                    </span>
                  </button>
                </li>
              ))}
            </ol>

            <div className="pf-hero__controls">
              <a className="druid-button" href={targetOf(current)} onClick={() => onOpenCard(current)}>
                {current.page === "projects"
                  ? `See the ${current.shortName} project`
                  : `See my role at ${current.shortName}`}
              </a>
              <div className="pf-hero__nav">
                <button
                  type="button"
                  className="druid-button druid-button--quiet"
                  aria-label="Previous headline"
                  onClick={() => go(h - 1)}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="druid-button druid-button--quiet"
                  aria-pressed={userPaused}
                  disabled={reduced}
                  onClick={() => setUserPaused((p) => !p)}
                >
                  {reduced ? "Auto-advance off" : userPaused ? "Resume headlines" : "Pause headlines"}
                </button>
                <button
                  type="button"
                  className="druid-button druid-button--quiet"
                  aria-label="Next headline"
                  onClick={() => go(h + 1)}
                >
                  Next
                </button>
                <p className="druid-tab pf-hero__count">
                  {h + 1} of {n}
                </p>
              </div>
            </div>

            <a className="pf-scroll" href="#roles">
              <span>Scroll down to browse the projects</span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14" />
                <path d="M6 13l6 6 6-6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
