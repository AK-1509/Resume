"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ProjectCarousel } from "./ProjectCarousel";
import { ExperienceList } from "./ExperienceList";
import { PageSwitch } from "./PageSwitch";
import type { RolePage, RoleView } from "@/lib/portfolio";
import type { Experience, Skill } from "@/lib/schema";

export type RoleState = { page: RolePage; slide: number; openIds: string[] };

/** How long the track must be still before its position counts as chosen. */
const SETTLE_MS = 140;
/** Room under the pages for their drop shadow, inside the clipped track. */
const TRACK_FOOT = 40;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Arrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={flip ? "-scale-x-100" : undefined}
    >
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}

/**
 * One page of the pager. While it is the page out of view, its content is
 * inert and the dimmed sliver that shows is a pointer shortcut to it; the
 * switch above is the keyboard way there.
 */
function PageShell({
  ref,
  roleId,
  page,
  ground,
  title,
  titleRef,
  away,
  tabbed,
  onPick,
  foot,
  children,
}: {
  ref: (el: HTMLDivElement | null) => void;
  roleId: string;
  page: RolePage;
  ground: string;
  title: string;
  titleRef: (el: HTMLHeadingElement | null) => void;
  away: boolean;
  /** Whether the switch is shown, which makes this a tab panel. */
  tabbed: boolean;
  onPick: () => void;
  foot: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      ref={ref}
      id={`${roleId}-${page}`}
      role={tabbed ? "tabpanel" : undefined}
      aria-labelledby={tabbed ? `${roleId}-tab-${page}` : undefined}
      aria-hidden={away || undefined}
      className={`pf-page pf-page--${page} ${ground}`}
      data-state={away ? "away" : "here"}
      onClick={away ? onPick : undefined}
    >
      <div className="pf-page__body" inert={away}>
        <div className="pf-page__head">
          <h3 ref={titleRef} tabIndex={-1} className="pf-page__title">
            {title}
          </h3>
        </div>
        {children}
        {tabbed && <div className="pf-page__foot">{foot}</div>}
      </div>
    </div>
  );
}

/**
 * One role section: its title, then the role's two pages side by side in a
 * horizontal track — projects on a green page, experience and education
 * on a brown one — with the gold switch above them.
 *
 * One page fills the track; a sliver of the other shows at the edge, dimmed,
 * and clicking it turns to it. The track scrolls natively, so a trackpad or a
 * swipe moves between the pages as well as the switch does, and it snaps to
 * whichever page is nearer. Its height follows the page in view, blended
 * while moving, so a short page never sits above a tall empty gap.
 *
 * A role with no projects shows only its experience page, with no
 * switch; the same holds the other way round.
 */
export function RoleSection({
  role,
  lines,
  demos,
  skillsOf,
  state,
  onChange,
}: {
  role: RoleView;
  lines: Record<string, string>;
  demos: Record<string, string>;
  skillsOf: (e: Experience) => Skill[];
  state: RoleState;
  onChange: (next: Partial<RoleState>) => void;
}) {
  const hasProjects = role.projects.length > 0;
  const hasExperience = role.professional.length + role.academic.length > 0;
  const canSwitch = hasProjects && hasExperience;

  const trackRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<RolePage, HTMLDivElement | null>>({ projects: null, experience: null });
  const [progress, setProgress] = useState(state.page === "experience" ? 1 : 0);
  const [heights, setHeights] = useState<Record<RolePage, number> | null>(null);
  const dragging = useRef(false);

  const page: RolePage = !hasProjects
    ? "experience"
    : !hasExperience
      ? "projects"
      : progress < 0.5
        ? "projects"
        : "experience";

  // Latest values for the scroll and timer callbacks.
  const latest = useRef({ statePage: state.page, onChange });
  useEffect(() => {
    latest.current = { statePage: state.page, onChange };
  });

  const scrollToPage = useCallback((target: RolePage, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    track.scrollTo({
      left: target === "experience" ? max : 0,
      behavior: smooth && !reducedMotion() ? "smooth" : "auto",
    });
  }, []);

  // Start on the page the state asks for, without animating.
  useEffect(() => {
    if (canSwitch && state.page === "experience") scrollToPage("experience", false);
    // Only on mount: later changes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The state changed from outside (a hero headline, a bottom button): go there.
  useEffect(() => {
    if (!canSwitch || dragging.current) return;
    scrollToPage(state.page);
  }, [state.page, canSwitch, scrollToPage]);

  // Track position → progress, and once the track rests, → state.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !canSwitch) return;
    let frame = 0;
    let timer = 0;
    const read = () => {
      frame = 0;
      const max = track.scrollWidth - track.clientWidth;
      const p = max > 0 ? Math.min(1, Math.max(0, track.scrollLeft / max)) : 0;
      setProgress(p);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (dragging.current) return;
        const settled: RolePage = p < 0.5 ? "projects" : "experience";
        if (settled !== latest.current.statePage) latest.current.onChange({ page: settled });
      }, SETTLE_MS);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [canSwitch]);

  // Each page's own height, kept current as rows open and fonts load.
  useEffect(() => {
    if (!canSwitch || !("ResizeObserver" in window)) return;
    const measure = () => {
      const p = pageRefs.current.projects;
      const e = pageRefs.current.experience;
      if (p && e) setHeights({ projects: p.offsetHeight, experience: e.offsetHeight });
    };
    const observer = new ResizeObserver(measure);
    for (const el of Object.values(pageRefs.current)) if (el) observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [canSwitch]);

  // After a switch from a bottom button, that button is now inert, so focus is
  // handed to the incoming page's title rather than dropping to <body>.
  const titleRefs = useRef<Record<RolePage, HTMLHeadingElement | null>>({ projects: null, experience: null });
  const focusOnArrival = useRef<RolePage | null>(null);
  useEffect(() => {
    if (focusOnArrival.current !== page) return;
    focusOnArrival.current = null;
    titleRefs.current[page]?.focus({ preventScroll: true });
  }, [page]);

  const select = (target: RolePage) => {
    scrollToPage(target);
    if (target !== state.page) onChange({ page: target });
  };

  const trackHeight =
    canSwitch && heights
      ? heights.projects + (heights.experience - heights.projects) * progress + TRACK_FOOT
      : undefined;

  const panelId = (p: RolePage) => `${role.id}-${p}`;

  return (
    <section id={role.id} className="druid-section pf-role" aria-labelledby={`${role.id}-title`}>
      <div className="druid-container">
        <div className="pf-role__head">
          <h2 id={`${role.id}-title`} className="pf-role__title">
            {role.label}
          </h2>
          <a className="pf-back" href="#top">
            Back to the top
          </a>
        </div>

        {canSwitch && (
          <PageSwitch
            id={role.id}
            options={[
              { page: "projects", label: "Projects", count: role.projects.length, panelId: panelId("projects") },
              {
                page: "experience",
                label: "Experience",
                count: role.professional.length + role.academic.length,
                panelId: panelId("experience"),
              },
            ]}
            selected={page}
            progress={progress}
            onSelect={select}
            onDrag={(p) => {
              const track = trackRef.current;
              if (!track) return;
              dragging.current = true;
              track.classList.add("is-dragging");
              track.scrollLeft = p * (track.scrollWidth - track.clientWidth);
            }}
            onDragEnd={(p) => {
              dragging.current = false;
              trackRef.current?.classList.remove("is-dragging");
              select(p < 0.5 ? "projects" : "experience");
            }}
          />
        )}

        <div
          ref={trackRef}
          className={`pf-track${canSwitch ? "" : " pf-track--single"}`}
          style={trackHeight ? { height: trackHeight } : undefined}
        >
          {hasProjects && (
            <PageShell
              ref={(el) => {
                pageRefs.current.projects = el;
              }}
              roleId={role.id}
              page="projects"
              ground="on-green"
              title="Projects"
              titleRef={(el) => {
                titleRefs.current.projects = el;
              }}
              away={canSwitch && page !== "projects"}
              tabbed={canSwitch}
              onPick={() => select("projects")}
              foot={
                <button
                  type="button"
                  className="druid-button"
                  onClick={() => {
                    focusOnArrival.current = "experience";
                    select("experience");
                  }}
                >
                  Experience and education
                  <Arrow />
                </button>
              }
            >
              <ProjectCarousel
                label={role.label}
                projects={role.projects}
                lines={lines}
                demos={demos}
                skillsOf={skillsOf}
                index={state.slide}
                onIndexChange={(slide) => onChange({ slide })}
              />
            </PageShell>
          )}

          {hasExperience && (
            <PageShell
              ref={(el) => {
                pageRefs.current.experience = el;
              }}
              roleId={role.id}
              page="experience"
              ground="on-brown"
              title="Experience and education"
              titleRef={(el) => {
                titleRefs.current.experience = el;
              }}
              away={canSwitch && page !== "experience"}
              tabbed={canSwitch}
              onPick={() => select("experience")}
              foot={
                <button
                  type="button"
                  className="druid-button"
                  onClick={() => {
                    focusOnArrival.current = "projects";
                    select("projects");
                  }}
                >
                  <Arrow flip />
                  Projects
                </button>
              }
            >
              <ExperienceList
                roleId={role.id}
                professional={role.professional}
                academic={role.academic}
                skillsOf={skillsOf}
                openIds={state.openIds}
                onToggle={(id) =>
                  onChange({
                    openIds: state.openIds.includes(id)
                      ? state.openIds.filter((x) => x !== id)
                      : [...state.openIds, id],
                  })
                }
              />
            </PageShell>
          )}
        </div>

        {(role.summary.trim() || role.kit.length > 0) && (
          <div className="pf-glass-card pf-brief">
            {role.summary.trim() && (
              <div>
                <h3 className="pf-brief__title">Executive summary</h3>
                <p className="pf-brief__body">{role.summary}</p>
              </div>
            )}
            {role.kit.length > 0 && (
              <div>
                <p className="druid-caption pf-brief__label">
                  Skills across these {role.entryCount} {role.entryCount === 1 ? "entry" : "entries"}
                </p>
                <ul className="pf-skills" aria-label={`${role.label} skills`}>
                  {role.kit.map((skill) => (
                    <li key={skill.id} className="druid-tag">
                      {skill.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
