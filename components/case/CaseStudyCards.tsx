import Image from "next/image";
import Link from "next/link";
import { entryAnchor } from "@/lib/anchors";
import type { CaseStudy } from "@/lib/schema";

export type CaseStudyCardData = Pick<CaseStudy, "slug" | "title" | "slugLine" | "tags" | "hero" | "role">;

const RINGS = [70, 120, 170, 220, 270, 298];

/**
 * One project on the portfolio page, set straight on the canvas: its words
 * at the left and its picture fading in at the right, over a soft field of
 * colour with no edge.
 *
 * The whole entry is one link, named by its title, so it is one target with
 * one focus ring round it. On hover the picture rises and the arrow moves on.
 */
function Entry({ study, labels }: { study: CaseStudyCardData; labels: CaseStudyCardLabels }) {
  const { figure, image } = study.hero;
  const meta = [study.role.title.trim(), study.role.sprint.trim()].filter(Boolean).join(" · ");
  const titleId = `${study.slug}-entry-title`;
  return (
    <li id={entryAnchor("project", study.slug)} className="cs-entry-item">
      <Link className="cs-entry" href={`/projects/${study.slug}`} aria-labelledby={titleId}>
        <div className="cs-entry__text">
          {study.tags.length > 0 && (
            <ul className="pf-skills" aria-label={labels.about}>
              {study.tags.map((tag) => (
                <li key={tag} className="druid-tag">
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <h3 id={titleId} className="cs-entry__title">
            {study.title}
          </h3>
          <p className="cs-entry__slug">{study.slugLine}</p>
          {meta && <p className="druid-caption cs-entry__meta">{meta}</p>}
          <span className="cs-entry__cta" aria-hidden="true">
            {labels.cta}
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </span>
        </div>

        {/* The picture repeats what the link names, so it is decoration here. */}
        <div className="cs-entry__art" aria-hidden="true">
          {image ? (
            <Image src={image.src} alt="" fill sizes="(min-width: 960px) 560px, 92vw" className="cs-entry__img" />
          ) : (
            <svg className="cs-entry__rings" viewBox="0 0 600 600" fill="none">
              {RINGS.map((r) => (
                <circle key={r} cx="300" cy="300" r={r} stroke="currentColor" strokeWidth="1" />
              ))}
            </svg>
          )}
          {figure && (
            <div className="cs-entry__figure">
              <Image
                src={figure.src}
                alt=""
                width={figure.width}
                height={figure.height}
                sizes="(min-width: 960px) 220px, 46vw"
              />
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

/** The section's own words, in the page's language (see `homeCopy` in lib/copy.ts). */
export type CaseStudyCardLabels = { title: string; back: string; cta: string; about: string };

/** The projects: the work built, one large entry per project page. */
export function CaseStudyCards({ studies, labels }: { studies: CaseStudyCardData[]; labels: CaseStudyCardLabels }) {
  if (studies.length === 0) return null;
  return (
    <section id="projects" className="druid-section pf-block cs-studies" aria-labelledby="projects-title">
      <div className="druid-container">
        <div className="pf-block__head">
          <h2 id="projects-title" className="pf-block__title">
            {labels.title}
          </h2>
          <a className="pf-back" href="#top">
            {labels.back}
          </a>
        </div>
        <ul className="cs-cards">
          {studies.map((study) => (
            <Entry key={study.slug} study={study} labels={labels} />
          ))}
        </ul>
      </div>
    </section>
  );
}
