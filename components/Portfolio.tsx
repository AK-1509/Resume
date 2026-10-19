"use client";

import { useCallback, useState } from "react";
import { HeroHeadlines } from "./HeroHeadlines";
import { RoleSection, type RoleState } from "./RoleSection";
import type { HeadlineView, RoleView } from "@/lib/portfolio";
import type { Experience, Profile, Skill } from "@/lib/schema";

/**
 * The interactive half of the page: the hero and the role sections.
 *
 * They share one piece of state per role — which page is showing, which
 * project is at the front of the carousel, which experience rows are open —
 * because a hero headline opens a specific entry in a section further down.
 */
export function Portfolio({
  profile,
  hero,
  headlines,
  roles,
  lines,
  skills,
  demos,
}: {
  profile: Profile;
  hero: { role: string; sub: string; credentials: string[] };
  headlines: HeadlineView[];
  roles: RoleView[];
  /** Hero headline per entry id, reused as each project slide's bold line. */
  lines: Record<string, string>;
  /** Full registry, for resolving each entry's endorsed ids to labels. */
  skills: Skill[];
  demos: Record<string, string>;
}) {
  const [states, setStates] = useState<Record<string, RoleState>>({});

  const stateOf = (id: string): RoleState => states[id] ?? { page: "projects", slide: 0, openIds: [] };
  const update = (id: string, next: Partial<RoleState>) =>
    setStates((all) => ({ ...all, [id]: { ...stateOf(id), ...all[id], ...next } }));

  const skillsOf = useCallback(
    (e: Experience) =>
      e.endorsedSkills
        .map((id) => skills.find((s) => s.id === id))
        .filter((s): s is Skill => Boolean(s)),
    [skills],
  );

  return (
    <>
      <HeroHeadlines
        name={profile.name}
        role={hero.role}
        sub={hero.sub}
        credentials={hero.credentials}
        headlines={headlines}
        onOpenCard={(h) => {
          const current = stateOf(h.roleId);
          update(
            h.roleId,
            h.page === "projects"
              ? { page: "projects", slide: h.slideIndex }
              : {
                  page: "experience",
                  openIds: current.openIds.includes(h.entryId)
                    ? current.openIds
                    : [...current.openIds, h.entryId],
                },
          );
        }}
      />

      <div id="roles" className="scroll-mt-24">
        {roles.map((role) => (
          <RoleSection
            key={role.id}
            role={role}
            lines={lines}
            demos={demos}
            skillsOf={skillsOf}
            state={stateOf(role.id)}
            onChange={(next) => update(role.id, next)}
          />
        ))}
      </div>
    </>
  );
}
