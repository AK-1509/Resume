"use client";

import { useEffect, useRef } from "react";
import { ContentCard } from "./ContentCard";
import { LiquidBackground } from "./LiquidBackground";
import type { Experience, Skill } from "@/lib/schema";

/** Wheel distance that counts as one step through the stack. */
const WHEEL_STEP = 40;
/** Minimum time between wheel steps, so one flick doesn't skip three cards. */
const WHEEL_LOCK_MS = 650;
/** Horizontal travel that counts as a swipe. */
const SWIPE_MIN = 48;

function slotClass(offset: number): string {
  if (offset === 0) return "pf-slot is-active";
  if (offset === 1) return "pf-slot is-behind is-d1";
  if (offset === 2) return "pf-slot is-behind is-d2";
  if (offset > 2) return "pf-slot is-behind is-far";
  return "pf-slot is-past";
}

/** "Next: Validex Health Labs" for a project, "Next: Product Leader at …" otherwise. */
function nextName(e: Experience): string {
  return e.type === "project" || !e.organization ? e.title : `${e.title} at ${e.organization}`;
}

/**
 * One role section: a depth stack of Content Cards with the executive summary
 * and the role's skill kit underneath.
 *
 * The front card is the only one in the reading and tab order. The two behind
 * it show only their frames, receding up and to the right; cards already
 * passed swing forward and out. Wheel, swipe, the arrow keys and the two
 * buttons all move through the same index, which the parent owns so a hero
 * headline can open a specific card.
 */
export function RoleSection({
  id,
  label,
  tone,
  experiences,
  summary,
  kit,
  skillsOf,
  demos,
  index,
  onIndexChange,
}: {
  id: string;
  label: string;
  tone: "green" | "brown";
  experiences: Experience[];
  summary: string;
  kit: Skill[];
  skillsOf: (e: Experience) => Skill[];
  demos: Record<string, string>;
  index: number;
  onIndexChange: (next: number) => void;
}) {
  const n = experiences.length;
  const current = Math.min(Math.max(index, 0), n - 1);
  const go = (i: number) => onIndexChange(((i % n) + n) % n);

  // Wheel over the stack moves through it; at either end the wheel goes back
  // to scrolling the page, so the stack never traps a reader. Bound natively
  // because React's onWheel is passive and cannot preventDefault.
  const stageRef = useRef<HTMLDivElement>(null);
  const latest = useRef({ current, n, onIndexChange });
  useEffect(() => {
    latest.current = { current, n, onIndexChange };
  });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let acc = 0;
    let lockUntil = 0;
    const onWheel = (ev: WheelEvent) => {
      if (ev.ctrlKey) return;
      const d = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      if (!d) return;
      const { current: cur, n: count, onIndexChange: set } = latest.current;
      const forward = d > 0;
      if ((forward && cur >= count - 1) || (!forward && cur <= 0)) {
        acc = 0;
        return;
      }
      ev.preventDefault();
      const now = Date.now();
      if (now < lockUntil) return;
      acc = acc !== 0 && acc > 0 !== forward ? d : acc + d;
      if (Math.abs(acc) < WHEEL_STEP) return;
      acc = 0;
      lockUntil = now + WHEEL_LOCK_MS;
      set(forward ? cur + 1 : cur - 1);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const swipe = useRef<{ x: number; y: number } | null>(null);

  const kitLabel = `${label} skills`;
  const next = experiences[(current + 1) % n];

  return (
    <section id={id} className={`druid-section druid-section--${tone}`} aria-labelledby={`${id}-title`}>
      <LiquidBackground tone={tone} />
      <div className="druid-container">
        <div className="pf-cat__head">
          <h2 id={`${id}-title`} className="pf-cat__title">
            {label}
          </h2>
          <a className="pf-back" href="#roles">
            Back to the role index
          </a>
        </div>

        <div
          role="region"
          aria-roledescription="carousel"
          aria-label={`${label} experiences`}
          onKeyDown={(ev) => {
            if (ev.key === "ArrowRight") {
              ev.preventDefault();
              go(current + 1);
            } else if (ev.key === "ArrowLeft") {
              ev.preventDefault();
              go(current - 1);
            }
          }}
        >
          <div className="pf-controls">
            <button type="button" className="druid-button druid-button--quiet" onClick={() => go(current - 1)}>
              Previous
            </button>
            <p className="druid-tab pf-count" aria-live="polite">
              {current + 1} of {n}
            </p>
            <button type="button" className="druid-button pf-next" onClick={() => go(current + 1)}>
              Next: {nextName(next)}
            </button>
          </div>
          <p className="druid-caption pf-hint">Scroll over the cards or swipe to move through them.</p>

          <div
            ref={stageRef}
            className="pf-stage"
            onPointerDown={(ev) => {
              if (ev.pointerType !== "mouse") swipe.current = { x: ev.clientX, y: ev.clientY };
            }}
            onPointerUp={(ev) => {
              const start = swipe.current;
              swipe.current = null;
              if (!start) return;
              const dx = ev.clientX - start.x;
              const dy = ev.clientY - start.y;
              if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.3) return;
              const target = dx < 0 ? current + 1 : current - 1;
              if (target >= 0 && target < n) onIndexChange(target);
            }}
          >
            {experiences.map((experience, i) => {
              const active = i === current;
              return (
                <div
                  key={experience.id}
                  className={slotClass(i - current)}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${i + 1} of ${n}`}
                  aria-hidden={!active}
                  inert={!active}
                >
                  <ContentCard
                    experience={experience}
                    skills={skillsOf(experience)}
                    demo={demos[experience.id] ?? null}
                    withMedia
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="pf-brief">
          {summary.trim() && (
            <div>
              <h3 className="pf-brief__title">Executive summary</h3>
              <p className="pf-brief__body">{summary}</p>
            </div>
          )}
          {kit.length > 0 && (
            <div>
              <p className="druid-caption pf-brief__label">
                Skills across these {n} {n === 1 ? "entry" : "entries"}
              </p>
              <ul className="pf-skills" aria-label={kitLabel}>
                {kit.map((skill) => (
                  <li key={skill.id} className="druid-tag">
                    {skill.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
