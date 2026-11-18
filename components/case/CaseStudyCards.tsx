import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@/lib/schema";

export type CaseStudyCardData = Pick<CaseStudy, "slug" | "title" | "slugLine" | "tags" | "hero" | "role">;

const RINGS = [70, 120, 170, 220, 270, 298];

/**
 * The portfolio's way into the project pages: one cream Content Card per case
 * study, its picture framed on the same dark ground as the page's hero.
 *
 * The whole face is one link, named by its title, so the card is one target
 * with one focus ring round it. Because it goes somewhere it lifts on hover
 * and on focus, and its hatch falls further.
 */
function Card({ study }: { study: CaseStudyCardData }) {
  const { figure, image } = study.hero;
  const meta = [study.role.title.trim(), study.role.sprint.trim()].filter(Boolean).join(" · ");
  const titleId = `${study.slug}-card-title`;
  return (
    <li>
      <article className="druid-card cs-card">
        <Link className="cs-card__link" href={`/projects/${study.slug}`} aria-labelledby={titleId}>
          <div className="cs-face cs-card__face">
            <div className="cs-card__body">
              {study.tags.length > 0 && (
                <ul className="pf-skills" aria-label="About this project">
                  {study.tags.map((tag) => (
                    <li key={tag} className="druid-tag">
                      {tag}
                    </li>
                  ))}
                </ul>
              )}
              <h3 id={titleId} className="cs-card__title">
                {study.title}
                <span className="sr-only"> case study</span>
              </h3>
              <p className="cs-card__slug">{study.slugLine}</p>
              {meta && <p className="druid-caption cs-card__meta">{meta}</p>}
              <span className="cs-card__cta" aria-hidden="true">
                Read the case study
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
            <div className="cs-card__media" aria-hidden="true">
              {image ? (
                <Image src={image.src} alt="" fill sizes="(min-width: 960px) 560px, 92vw" className="cs-hero__img" />
              ) : (
                <>
                  <div className="cs-hero__ground" />
                  <svg className="cs-card__rings" viewBox="0 0 600 600" fill="none">
                    {RINGS.map((r) => (
                      <circle key={r} cx="300" cy="300" r={r} stroke="currentColor" strokeWidth="1" />
                    ))}
                  </svg>
                </>
              )}
              {figure && (
                <div className="cs-card__figure">
                  <Image
                    src={figure.src}
                    alt=""
                    width={figure.width}
                    height={figure.height}
                    sizes="(min-width: 960px) 240px, 50vw"
                  />
                </div>
              )}
            </div>
          </div>
        </Link>
      </article>
    </li>
  );
}

export function CaseStudyCards({ studies }: { studies: CaseStudyCardData[] }) {
  if (studies.length === 0) return null;
  return (
    <section id="case-studies" className="druid-section pf-role" aria-labelledby="case-studies-title">
      <div className="druid-container">
        <div className="pf-role__head">
          <h2 id="case-studies-title" className="pf-role__title">
            Case studies
          </h2>
          <a className="pf-back" href="#top">
            Back to the top
          </a>
        </div>
        <ul className="cs-cards">
          {studies.map((study) => (
            <Card key={study.slug} study={study} />
          ))}
        </ul>
      </div>
    </section>
  );
}
