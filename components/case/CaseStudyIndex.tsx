import Link from "next/link";
import { entryAnchor } from "@/lib/anchors";
import type { CaseStudy } from "@/lib/schema";

export type CaseStudyRowData = Pick<CaseStudy, "slug" | "title" | "slugLine" | "tags" | "keyFigure">;

/**
 * The case studies: analysis and strategy done for real companies. Where the
 * projects are big entries with pictures, these are a ledger on a brown band,
 * one row per company. Each row reads across: the company and the kind of
 * work, the one-line summary, and the figure the work turned on.
 *
 * Each row is one link, named by the company, so it is one target with one
 * focus ring. On a fine pointer the row warms, the name underlines and the
 * arrow moves on; on press it gives a little.
 */
export function CaseStudyIndex({
  studies,
  labels,
}: {
  studies: CaseStudyRowData[];
  /** The section's own words, in the page's language (see `homeCopy` in lib/copy.ts). */
  labels: { title: string; lead: string; back: string };
}) {
  if (studies.length === 0) return null;
  return (
    <section
      id="case-studies"
      className="druid-section on-brown pf-block cs-index"
      aria-labelledby="case-studies-title"
    >
      <div className="druid-container">
        <div className="pf-block__head">
          <div className="cs-index__intro">
            <h2 id="case-studies-title" className="pf-block__title">
              {labels.title}
            </h2>
            {labels.lead && <p className="cs-index__lead">{labels.lead}</p>}
          </div>
          <a className="pf-back" href="#top">
            {labels.back}
          </a>
        </div>

        <ul className="cs-index__list">
          {studies.map((study) => {
            const titleId = `${study.slug}-row-title`;
            // The tags arrive without the team tag (see `homeCopy`), so they say
            // what kind of work it was, not who did it.
            const kind = study.tags;
            return (
              <li key={study.slug} id={entryAnchor("case-study", study.slug)} className="cs-index__item">
                <Link className="cs-row" href={`/projects/${study.slug}`} aria-labelledby={titleId}>
                  <div className="cs-row__name">
                    <h3 id={titleId} className="cs-row__title">
                      <span className="cs-row__title-text">{study.title}</span>
                    </h3>
                    {kind.length > 0 && (
                      <span className="cs-row__kind">
                        {kind.map((tag, i) => (
                          <span key={tag}>
                            {i > 0 && " · "}
                            <span className="cs-row__tag">{tag}</span>
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <span className="cs-row__slug">{study.slugLine}</span>
                  {study.keyFigure && (
                    <span className="cs-row__figure">
                      <span className="cs-row__value">{study.keyFigure.value}</span>
                      <span className="cs-row__label">{study.keyFigure.label}</span>
                    </span>
                  )}
                  <svg
                    className="cs-row__arrow"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M4 10h12M11 5l5 5-5 5" />
                  </svg>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
