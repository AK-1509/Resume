"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExperienceSection } from "./ExperienceSection";
import { ExperienceModal } from "./ExperienceModal";
import { SkillIndex } from "./SkillIndex";
import { Colophon } from "./Colophon";
import dynamic from "next/dynamic";
import { StickyBar } from "./StickyBar";
import { EmptyState } from "./EmptyState";
import { onExportRequested } from "@/lib/export-event";
import { bestRelaxation, countMatches, parseSkillsParam, skillsHref } from "@/lib/filter";
import type { Experience, Profile, Skill } from "@/lib/schema";

/**
 * The export dialog pulls in @dnd-kit and the print layout, and from there the
 * PDF renderer. None of it is needed to read a resume, so it loads on first
 * use instead of being shipped to every visitor.
 */
const ExportDialog = dynamic(
  () => import("./export/ExportDialog").then((m) => m.ExportDialog),
  { ssr: false },
);

/**
 * Holds the interactive state for the page body: which entry is open, which
 * skills are selected, and whether the export dialog is showing.
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
  // Once mounted the dialog stays mounted, so closing it does not discard the
  // selection and ordering the user has already set up.
  const [exportMounted, setExportMounted] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const topRef = useRef<HTMLDivElement>(null);

  const all = [...education, ...work, ...projects];
  const open = all.find((e) => e.id === openId) ?? null;

  const openExport = useCallback(() => {
    setExportMounted(true);
    setExporting(true);
  }, []);

  useEffect(() => onExportRequested(openExport), [openExport]);

  /* --- URL sync -----------------------------------------------------------
   * Uses the history API rather than the Next router, so the page stays
   * statically prerendered and `?skills=react,figma` is still a shareable URL.
   * pushState (not replace) is what makes Back step through filter changes. */

  useEffect(() => {
    const read = () => setSelected(parseSkillsParam(window.location.search, skills));
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [skills]);

  const apply = useCallback((next: string[]) => {
    setSelected(next);
    window.history.pushState(null, "", skillsHref(next));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      apply(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
    },
    [apply, selected],
  );

  const clear = useCallback(() => apply([]), [apply]);

  const viewResults = useCallback(() => {
    topRef.current?.scrollIntoView({
      // The global reduced-motion rule forces `scroll-behavior: auto`, but
      // scrollIntoView takes its own argument, so it is honoured explicitly.
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const filtering = selected.length > 0;
  const matchCount = countMatches(all, selected);
  const relaxation = bestRelaxation(all, selected, skills);

  return (
    <>
      <StickyBar
        name={profile.name}
        selected={selected}
        skills={skills}
        matchCount={matchCount}
        onToggle={toggle}
        onClear={clear}
        onExport={openExport}
      />

      <div ref={topRef} className="scroll-mt-24" />

      {/* One announcement for the whole page rather than one per section. */}
      <p aria-live="polite" className="sr-only">
        {filtering
          ? `${matchCount} experience${matchCount === 1 ? "" : "s"} match ${selected.length} selected skill${
              selected.length === 1 ? "" : "s"
            }.`
          : ""}
      </p>

      {filtering && matchCount === 0 ? (
        <EmptyState
          relaxation={relaxation}
          onRelax={(id) => apply(selected.filter((s) => s !== id))}
          onClear={clear}
        />
      ) : (
        <>
          <ExperienceSection
            id="education"
            heading="Education"
            experiences={education}
            columns={2}
            onOpen={setOpenId}
            selectedSkills={selected}
          />

          <div className="grid gap-14 md:grid-cols-2 md:gap-10">
            <ExperienceSection
              id="experience"
              heading="Experience"
              experiences={work}
              onOpen={setOpenId}
              selectedSkills={selected}
            />
            <ExperienceSection
              id="projects"
              heading="Projects"
              experiences={projects}
              onOpen={setOpenId}
              selectedSkills={selected}
            />
          </div>
        </>
      )}

      {/* Back matter: the index, then the colophon. */}
      <div className="flex flex-col gap-10 border-t border-rule pt-12">
        <SkillIndex
          skills={indexSkills}
          selected={selected}
          matchCount={matchCount}
          onToggle={toggle}
          onClear={clear}
          onViewResults={viewResults}
        />
        <Colophon languages={languages} />
      </div>

      <ExperienceModal
        experience={open}
        skills={skills}
        onClose={() => setOpenId(null)}
        onSelectSkill={(id) => {
          // Selecting a skill in the modal closes it and applies that skill as
          // a filter, then brings the reader to the results it just changed.
          setOpenId(null);
          apply(selected.includes(id) ? selected : [...selected, id]);
          requestAnimationFrame(viewResults);
        }}
      />

      {exportMounted && (
        <ExportDialog
          open={exporting}
          onClose={() => setExporting(false)}
          profile={profile}
          experiences={all}
          skills={skills}
          languages={languages}
        />
      )}
    </>
  );
}
