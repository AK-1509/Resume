"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatDurationLong } from "@/lib/format";
import type { Experience, Skill } from "@/lib/schema";
import { Lightbox } from "./Lightbox";

/**
 * The detail view for one entry.
 *
 * A native <dialog> opened with showModal() supplies the focus trap, the inert
 * background, ESC-to-close, and focus return to the card that opened it.
 *
 * Every optional field degrades by omission, not by rendering an empty block:
 * no summary means no paragraph, no gallery means no grid, no organization
 * means no line. The skill can produce all of those.
 */
export function ExperienceModal({
  experience,
  skills,
  onClose,
  onSelectSkill,
}: {
  experience: Experience | null;
  skills: Skill[];
  onClose: () => void;
  onSelectSkill: (skillId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const open = experience !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Background scroll lock. showModal() makes the background inert but does not
  // stop the page behind from scrolling.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Reset the lightbox whenever the modal switches entries or closes. Adjusting
  // state during render is React's sanctioned pattern for deriving from a
  // changed prop — an effect here would cause a cascading re-render.
  const [shownId, setShownId] = useState<string | null>(null);
  const currentId = experience?.id ?? null;
  if (currentId !== shownId) {
    setShownId(currentId);
    setLightboxIndex(null);
  }

  const labelled = experience ? `modal-title-${experience.id}` : undefined;
  const endorsed = experience
    ? experience.endorsedSkills
        .map((id) => skills.find((s) => s.id === id))
        .filter((s): s is Skill => Boolean(s))
    : [];

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelled}
      onClose={(event) => {
        // Only react to this dialog closing, never to the nested lightbox's
        // close event arriving via React's simulated bubbling.
        if (event.target !== ref.current) return;
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="m-auto w-[min(52rem,calc(100vw-2rem))] max-w-none rounded-[2px] bg-surface p-0 text-strong backdrop:bg-ink/70"
    >
      {experience && (
        <div className="max-h-[min(85vh,52rem)] overflow-y-auto p-6 sm:p-8">
          <div className="relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute end-0 top-0 rounded-[2px] border border-rule p-2 text-strong transition-colors hover:border-accent"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path
                  d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Title opposite duration, organization opposite location. Stacks
                in reading order on mobile. */}
            <div className="pe-12">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <h2
                  id={labelled}
                  className="font-serif text-section font-medium leading-tight text-strong"
                >
                  {experience.title}
                </h2>
                <span className="metadata shrink-0 text-soft">
                  {formatDurationLong(experience.startDate, experience.endDate)}
                </span>
              </div>

              <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                {/* organization is "" for personal projects — the span is
                    dropped but the row still carries the location. */}
                {experience.organization ? (
                  <p className="font-sans text-org font-medium text-soft">
                    {experience.organization}
                    {/* The live link rides with the organization line so an
                        entry without one loses nothing but the link itself. */}
                    {experience.url && (
                      <>
                        {" · "}
                        <a
                          href={experience.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-accent underline underline-offset-4"
                        >
                          {experience.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                        </a>
                      </>
                    )}
                  </p>
                ) : experience.url ? (
                  <p className="font-sans text-org font-medium">
                    <a
                      href={experience.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-accent underline underline-offset-4"
                    >
                      {experience.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                    </a>
                  </p>
                ) : (
                  <span />
                )}
                <span className="metadata shrink-0 text-soft">{experience.location}</span>
              </div>
            </div>
          </div>

          {/* The one brass rule sanctioned on a light surface: 1px, no text. */}
          <hr className="mt-5 border-0 border-t border-brass" aria-hidden="true" />

          {experience.summary && (
            <p className="mt-6 max-w-[65ch] font-sans text-body text-strong">
              {experience.summary}
            </p>
          )}

          {experience.responsibilities.length > 0 && (
            <ul className="mt-6 flex max-w-[65ch] list-disc flex-col gap-2 ps-5 font-sans text-body text-strong marker:text-rule">
              {experience.responsibilities.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}

          {endorsed.length > 0 && (
            <>
              <h3 className="sr-only">Skills proved by this experience</h3>
              <ul className="mt-7 flex flex-wrap gap-2">
                {endorsed.map((skill) => (
                  <li key={skill.id}>
                    <button
                      type="button"
                      onClick={() => onSelectSkill(skill.id)}
                      className="rounded-[2px] border border-rule px-3 py-2 font-mono text-bubble font-medium uppercase text-strong transition-colors hover:border-accent"
                    >
                      {skill.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {experience.gallery.length > 0 && (
            <>
              <h3 className="sr-only">Gallery</h3>
              <ul className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {experience.gallery.map((item, i) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="group block w-full overflow-hidden rounded-[2px] border border-rule transition-colors hover:border-accent"
                    >
                      <Image
                        src={item.src}
                        alt={item.alt}
                        width={480}
                        height={320}
                        className="plate aspect-[3/2] w-full object-cover object-left-top"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <Lightbox
            items={experience.gallery}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
          />
        </div>
      )}
    </dialog>
  );
}
