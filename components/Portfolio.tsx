"use client";

import { useCallback, useState } from "react";
import { HeroHeadlines } from "./HeroHeadlines";
import { IndexCard } from "./IndexCard";
import { RoleSection } from "./RoleSection";
import type { HeadlineView, RoleView } from "@/lib/portfolio";
import type { Experience, Profile, Skill } from "@/lib/schema";

/**
 * The interactive half of the page: the hero and the role sections.
 *
 * They share one piece of state — which card is at the front of each role's
 * stack — because a hero headline opens a specific card in a section further
 * down. Sections alternate green and brown, so neighbouring stacks never sit
 * on the same ground.
 */
export function Portfolio({
  profile,
  hero,
  headlines,
  roles,
  skills,
  demos,
}: {
  profile: Profile;
  hero: { role: string; sub: string; credentials: string[] };
  headlines: HeadlineView[];
  roles: RoleView[];
  /** Full registry, for resolving each entry's endorsed ids to labels. */
  skills: Skill[];
  demos: Record<string, string>;
}) {
  const [front, setFront] = useState<Record<string, number>>({});

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
        onOpenCard={(h) => setFront((f) => ({ ...f, [h.roleId]: h.cardIndex }))}
        browseHref={roles.length ? `#${roles[0].id}` : "#education"}
        index={
          roles.length > 0 && (
            <IndexCard label="Browse by role" items={roles.map((r) => ({ id: r.id, label: r.label }))} />
          )
        }
      />

      {roles.map((role, i) => (
        <RoleSection
          key={role.id}
          id={role.id}
          label={role.label}
          tone={i % 2 === 0 ? "green" : "brown"}
          experiences={role.experiences}
          summary={role.summary}
          kit={role.kit}
          skillsOf={skillsOf}
          demos={demos}
          index={front[role.id] ?? 0}
          onIndexChange={(next) => setFront((f) => ({ ...f, [role.id]: next }))}
        />
      ))}
    </>
  );
}
