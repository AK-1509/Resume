"use client";

import { useEffect, useRef } from "react";
import { ProjectCarousel } from "./ProjectCarousel";
import { ExperienceList } from "./ExperienceList";
import type { RolePage, RoleView } from "@/lib/portfolio";
import type { Experience, Skill } from "@/lib/schema";

export type RoleState = { page: RolePage; slide: number; openIds: string[] };

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
 * One role section. Under its title sits a two-page pager in the centre of
 * the canvas: side projects on a green page, experience and education on a
 * brown one. One page shows at a time — projects first — and a call to action
 * in the page's bottom corner turns to the other.
 *
 * A role with no side projects opens on its experience page and offers no
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
  const page: RolePage = !hasProjects ? "experience" : !hasExperience ? "projects" : state.page;

  // After a switch from the keyboard, the button pressed is now inert, so
  // focus is handed to the incoming page's title instead of dropping to
  // <body>.
  const titleRefs = useRef<Record<RolePage, HTMLHeadingElement | null>>({ projects: null, experience: null });
  const focusOnSwitch = useRef(false);
  useEffect(() => {
    if (!focusOnSwitch.current) return;
    focusOnSwitch.current = false;
    titleRefs.current[page]?.focus();
  }, [page]);

  const switchTo = (next: RolePage) => {
    focusOnSwitch.current = true;
    onChange({ page: next });
  };

  const stateOf = (p: RolePage) => (p === page ? "here" : "away");

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

        <div className="pf-pager">
          {hasProjects && (
            <div
              className="pf-page pf-page--projects on-green"
              data-state={stateOf("projects")}
              aria-hidden={page !== "projects"}
              inert={page !== "projects"}
            >
              <div className="pf-page__head">
                <h3
                  ref={(el) => {
                    titleRefs.current.projects = el;
                  }}
                  tabIndex={-1}
                  className="pf-page__title"
                >
                  Side projects
                </h3>
              </div>
              <ProjectCarousel
                label={role.label}
                projects={role.projects}
                lines={lines}
                demos={demos}
                skillsOf={skillsOf}
                index={state.slide}
                onIndexChange={(slide) => onChange({ slide })}
              />
              {canSwitch && (
                <div className="pf-page__foot">
                  <button type="button" className="druid-button" onClick={() => switchTo("experience")}>
                    Experience and education
                    <Arrow />
                  </button>
                </div>
              )}
            </div>
          )}

          {hasExperience && (
            <div
              className="pf-page pf-page--experience on-brown"
              data-state={stateOf("experience")}
              aria-hidden={page !== "experience"}
              inert={page !== "experience"}
            >
              <div className="pf-page__head">
                <h3
                  ref={(el) => {
                    titleRefs.current.experience = el;
                  }}
                  tabIndex={-1}
                  className="pf-page__title"
                >
                  Experience and education
                </h3>
              </div>
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
              {canSwitch && (
                <div className="pf-page__foot">
                  <button type="button" className="druid-button" onClick={() => switchTo("projects")}>
                    <Arrow flip />
                    Side projects
                  </button>
                </div>
              )}
            </div>
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
