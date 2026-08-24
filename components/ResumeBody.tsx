"use client";

import { useState } from "react";
import { ExperienceSection } from "./ExperienceSection";
import { ExperienceModal } from "./ExperienceModal";
import { SkillIndex } from "./SkillIndex";
import { Colophon } from "./Colophon";
import type { Experience, Skill } from "@/lib/schema";

/**
 * Holds the interactive state for the page body: which entry is open, and
 * (from Phase 5) which skills are selected.
 */
export function ResumeBody({
  education,
  work,
  projects,
  skills,
  indexSkills,
  languages,
}: {
  education: Experience[];
  work: Experience[];
  projects: Experience[];
  /** Full registry, for resolving endorsed ids to labels in the modal. */
  skills: Skill[];
  /** Endorsed-only, ordered, for the index at the foot of the page. */
  indexSkills: Skill[];
  languages: string[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  const all = [...education, ...work, ...projects];
  const open = all.find((e) => e.id === openId) ?? null;

  return (
    <>
      <ExperienceSection
        id="education"
        heading="Education"
        experiences={education}
        columns={2}
        onOpen={setOpenId}
      />

      <div className="grid gap-14 md:grid-cols-2 md:gap-10">
        <ExperienceSection id="experience" heading="Experience" experiences={work} onOpen={setOpenId} />
        <ExperienceSection id="projects" heading="Projects" experiences={projects} onOpen={setOpenId} />
      </div>

      {/* Back matter: the index, then the colophon. */}
      <div className="flex flex-col gap-10 border-t border-rule pt-12">
        <SkillIndex skills={indexSkills} />
        <Colophon languages={languages} />
      </div>

      <ExperienceModal
        experience={open}
        skills={skills}
        onClose={() => setOpenId(null)}
        onSelectSkill={() => {
          // Selecting a skill closes the modal and applies it as a filter.
          // The filter itself lands in Phase 5; closing is already correct.
          setOpenId(null);
        }}
      />
    </>
  );
}
