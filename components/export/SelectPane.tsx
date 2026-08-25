"use client";

import { formatDuration } from "@/lib/format";
import type { Experience, Skill } from "@/lib/schema";

const GROUPS: { type: Experience["type"]; heading: string }[] = [
  { type: "education", heading: "Education" },
  { type: "work", heading: "Experience" },
  { type: "project", heading: "Projects" },
];

function Checkbox({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-[0.2rem] h-4 w-4 shrink-0 accent-claret"
      />
      <span className="min-w-0">
        <span className="font-sans text-ui text-strong">{label}</span>
        {hint && <span className="metadata ms-2 text-soft">{hint}</span>}
      </span>
    </label>
  );
}

/** What goes on the page: which experiences, which skills, and languages. */
export function SelectPane({
  experiences,
  skills,
  selectedIds,
  selectedSkillIds,
  includeLanguages,
  hasLanguages,
  onToggleExperience,
  onToggleSkill,
  onToggleLanguages,
}: {
  experiences: Experience[];
  skills: Skill[];
  selectedIds: string[];
  selectedSkillIds: string[];
  includeLanguages: boolean;
  hasLanguages: boolean;
  onToggleExperience: (id: string, next: boolean) => void;
  onToggleSkill: (id: string, next: boolean) => void;
  onToggleLanguages: (next: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      {GROUPS.map(({ type, heading }) => {
        const entries = experiences.filter((e) => e.type === type);
        if (entries.length === 0) return null;
        return (
          <fieldset key={type}>
            <legend className="metadata mb-2 text-soft">{heading}</legend>
            {entries.map((entry) => (
              <Checkbox
                key={entry.id}
                checked={selectedIds.includes(entry.id)}
                onChange={(next) => onToggleExperience(entry.id, next)}
                label={entry.organization ? `${entry.title}, ${entry.organization}` : entry.title}
                hint={formatDuration(entry.startDate, entry.endDate)}
              />
            ))}
          </fieldset>
        );
      })}

      {skills.length > 0 && (
        <fieldset>
          <legend className="metadata mb-2 text-soft">Skills line</legend>
          <div className="grid gap-x-6 sm:grid-cols-2">
            {skills.map((skill) => (
              <Checkbox
                key={skill.id}
                checked={selectedSkillIds.includes(skill.id)}
                onChange={(next) => onToggleSkill(skill.id, next)}
                label={skill.label}
              />
            ))}
          </div>
        </fieldset>
      )}

      {hasLanguages && (
        <fieldset>
          <legend className="metadata mb-2 text-soft">Languages line</legend>
          <Checkbox
            checked={includeLanguages}
            onChange={onToggleLanguages}
            label="Include languages"
          />
        </fieldset>
      )}
    </div>
  );
}
