"use client";

import Image from "next/image";
import { formatStartMonth } from "@/lib/format";
import type { Experience, Skill } from "@/lib/schema";

function slotClass(offset: number): string {
  if (offset === 0) return "pf-slot is-active";
  if (offset === 1) return "pf-slot is-behind is-d1";
  if (offset === 2) return "pf-slot is-behind is-d2";
  if (offset > 2) return "pf-slot is-behind is-far";
  return "pf-slot is-past";
}

/** "Visit everplate.me", or "View on GitHub" for a repository. */
function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "github.com" ? "View on GitHub" : `Visit ${host}`;
  } catch {
    return "Visit site";
  }
}

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

function PlayIcon() {
  return (
    <span className="pf-demo__icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M5 3.5v9l7-4.5z" />
      </svg>
    </span>
  );
}

/**
 * One slide: the project's VVP filling the frame — its gallery thumbnail once
 * added, a labelled placeholder until then — with a bold headline set on a
 * scrim along the bottom edge.
 */
function Slide({ project, line }: { project: Experience; line: string | null }) {
  const thumb = project.gallery.find((g) => g.id === project.thumbnailId);

  return (
    <div className="druid-card">
      <div className="pf-slide__face">
        {thumb ? (
          <Image
            src={thumb.src}
            alt={thumb.alt}
            fill
            sizes="(min-width: 1280px) 900px, 90vw"
            className="pf-slide__img"
          />
        ) : (
          <div
            className="pf-slide__ph"
            role="img"
            aria-label={`Placeholder for the ${project.title} visual value proposition`}
          >
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="6" y="9" width="36" height="30" rx="4" />
              <circle cx="17" cy="19" r="3.5" />
              <path d="M6 33l11-10 9 8 6-5 10 9" />
            </svg>
            <p>VVP placeholder</p>
          </div>
        )}
        <div className="pf-slide__scrim" aria-hidden="true" />
        <div className="pf-slide__text">
          {line && <p className="pf-slide__label">{project.title}</p>}
          <p className="pf-slide__headline">{line ?? project.title}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * The projects carousel: a depth stack of image slides, then the front
 * project's details — start month, summary, live demo, link and skills.
 *
 * The stack moves only with its Previous and Next buttons, or the arrow keys
 * while focus is inside it. Wheel and swipe are deliberately left alone, so
 * scrolling over the pictures always moves the page — down the page, or
 * sideways to the experience page. Only the front slide is in the reading
 * and tab order. The index lives in the parent, so a hero headline can bring
 * a specific project forward.
 */
export function ProjectCarousel({
  label,
  projects,
  lines,
  demos,
  skillsOf,
  index,
  onIndexChange,
}: {
  label: string;
  projects: Experience[];
  /** Hero headline per entry id, used as the slide's bold line. */
  lines: Record<string, string>;
  demos: Record<string, string>;
  skillsOf: (e: Experience) => Skill[];
  index: number;
  onIndexChange: (next: number) => void;
}) {
  const n = projects.length;
  const current = Math.min(Math.max(index, 0), n - 1);
  const go = (i: number) => onIndexChange(((i % n) + n) % n);

  if (n === 0) return null;

  const front = projects[current];
  const demo = demos[front.id];
  const skills = skillsOf(front);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${label} projects`}
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
      {n > 1 && (
        <>
          <div className="pf-controls">
            <button type="button" className="druid-button druid-button--quiet" onClick={() => go(current - 1)}>
              <Chevron back />
              Previous<span className="sr-only"> project</span>
            </button>
            <p className="druid-tab pf-count" aria-live="polite">
              {current + 1} of {n}
            </p>
            <button type="button" className="druid-button" onClick={() => go(current + 1)}>
              Next<span className="sr-only"> project</span>
              <Chevron />
            </button>
          </div>
        </>
      )}

      <div className="pf-stage">
        {projects.map((project, i) => {
          const active = i === current;
          return (
            <div
              key={project.id}
              className={slotClass(i - current)}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}: ${project.title}`}
              aria-hidden={!active}
              inert={!active}
            >
              <Slide project={project} line={lines[project.id] ?? null} />
            </div>
          );
        })}
      </div>

      {/* Keyed so an opened "Highlights" closes again when the project changes. */}
      <div className="pf-detail" key={front.id}>
        <div>
          <h4 className="pf-detail__title">{front.title}</h4>
          <p className="druid-caption pf-meta">
            <span>{formatStartMonth(front.startDate)}</span>
            <span>{front.location}</span>
          </p>
          {front.tagline && <p className="pf-tagline">{front.tagline}</p>}
          {front.summary.trim() && <p className="pf-summary">{front.summary}</p>}
          {front.responsibilities.length > 0 && (
            <details className="pf-more">
              <summary>Highlights</summary>
              <ul className="pf-list">
                {front.responsibilities.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="pf-detail__side">
          {demo ? (
            <a className="pf-demo is-live" href={demo} target="_blank" rel="noopener noreferrer">
              <PlayIcon />
              <span>
                <span className="pf-demo__title">Live demo</span>
                <span className="pf-demo__note">Opens in a new tab</span>
              </span>
            </a>
          ) : (
            <div className="pf-demo is-empty">
              <PlayIcon />
              <span>
                <span className="pf-demo__title">Live demo</span>
                <span className="pf-demo__note">Placeholder for the demo link</span>
              </span>
            </div>
          )}
          {front.url && (
            <a className="druid-button" href={front.url} target="_blank" rel="noopener noreferrer">
              {linkLabel(front.url)}
            </a>
          )}
          {skills.length > 0 && (
            <ul className="pf-skills" aria-label="Skills">
              {skills.map((skill) => (
                <li key={skill.id} className="druid-tag">
                  {skill.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
