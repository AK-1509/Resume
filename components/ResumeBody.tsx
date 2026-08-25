"use client";

import { useEffect, useState } from "react";
import { onExportRequested } from "@/lib/export-event";
import { ExperienceSection } from "./ExperienceSection";
import { ExperienceModal } from "./ExperienceModal";
import { SkillIndex } from "./SkillIndex";
import { Colophon } from "./Colophon";
import { StickyBar } from "./StickyBar";
import { ExportDialog } from "./export/ExportDialog";
import type { Experience, Profile, Skill } from "@/lib/schema";

/**
 * Holds the interactive state for the page body: which entry is open, whether
 * the export dialog is showing, and (from Phase 5) which skills are selected.
 */
export function ResumeBody({
  profile,
  education,
  work,
  projects,
  skills,
  indexSkills,
  languages,
}: {
  profile: Profile;
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => onExportRequested(() => setExporting(true)), []);

  const all = [...education, ...work, ...projects];
  const open = all.find((e) => e.id === openId) ?? null;

  return (
    <>
      <StickyBar name={profile.name} onExport={() => setExporting(true)} />

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

      <ExportDialog
        open={exporting}
        onClose={() => setExporting(false)}
        profile={profile}
        experiences={all}
        skills={skills}
        languages={languages}
      />
    </>
  );
}
