"use client";

import { formatDurationLong } from "@/lib/format";
import type { Experience, Skill } from "@/lib/schema";

/** The id a hero headline links to, so it can land on a specific row. */
export const rowId = (roleId: string, entryId: string) => `${roleId}--${entryId}`;

function Row({
  roleId,
  entry,
  skills,
  open,
  onToggle,
}: {
  roleId: string;
  entry: Experience;
  skills: Skill[];
  open: boolean;
  onToggle: () => void;
}) {
  const id = rowId(roleId, entry.id);
  const bodyId = `${id}-body`;
  const hasBody =
    entry.summary.trim().length > 0 || entry.responsibilities.length > 0 || skills.length > 0;

  return (
    <li id={id} className="scroll-mt-32">
      <button
        type="button"
        className="pf-xp__toggle"
        aria-expanded={hasBody ? open : undefined}
        aria-controls={hasBody ? bodyId : undefined}
        onClick={hasBody ? onToggle : undefined}
        disabled={!hasBody}
      >
        <span>
          <span className="pf-xp__title">{entry.title}</span>
          {entry.organization && <span className="pf-xp__org">{entry.organization}</span>}
        </span>
        <span className="pf-xp__when">{formatDurationLong(entry.startDate, entry.endDate)}</span>
        {hasBody ? (
          <svg
            className="pf-xp__chevron"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 8l5 5 5-5" />
          </svg>
        ) : (
          <span aria-hidden="true" />
        )}
      </button>
      {hasBody && (
        <div id={bodyId} className="pf-xp__body" data-open={open} inert={!open}>
          <div className="pf-xp__inner">
            <div className="pf-xp__content">
              <p className="druid-caption pf-meta">{entry.location}</p>
              {entry.summary.trim() && <p className="pf-summary">{entry.summary}</p>}
              {entry.responsibilities.length > 0 && (
                <ul className="pf-list">
                  {entry.responsibilities.map((text) => (
                    <li key={text}>{text}</li>
                  ))}
                </ul>
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
      )}
    </li>
  );
}

/**
 * The experience page: jobs, then degrees, as a plain disclosure list. Each
 * row shows title, employer and dates; opening it shows the location,
 * summary, bullets and skills. No pictures and no demo links — those belong
 * to the projects.
 *
 * A row with nothing behind it renders as a disabled button rather than a
 * toggle that opens onto nothing.
 */
export function ExperienceList({
  roleId,
  professional,
  academic,
  skillsOf,
  openIds,
  onToggle,
}: {
  roleId: string;
  professional: Experience[];
  academic: Experience[];
  skillsOf: (e: Experience) => Skill[];
  openIds: string[];
  onToggle: (entryId: string) => void;
}) {
  const groups = [
    { key: "professional", title: "Professional", entries: professional },
    { key: "academic", title: "Academic", entries: academic },
  ].filter((g) => g.entries.length > 0);

  return (
    <>
      {groups.map((group) => (
        <div key={group.key} className="pf-xp-group">
          <h4 className="pf-xp-group__title" id={`${roleId}-${group.key}`}>
            {group.title}
          </h4>
          <ul className="pf-xp" aria-labelledby={`${roleId}-${group.key}`}>
            {group.entries.map((entry) => (
              <Row
                key={entry.id}
                roleId={roleId}
                entry={entry}
                skills={skillsOf(entry)}
                open={openIds.includes(entry.id)}
                onToggle={() => onToggle(entry.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}
