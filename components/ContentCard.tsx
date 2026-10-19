import Image from "next/image";
import { formatDurationLong } from "@/lib/format";
import type { Experience, Skill } from "@/lib/schema";

const KIND: Record<Experience["type"], string> = {
  education: "Education",
  work: "Role",
  project: "Project",
};

/** "Visit everplate.me", or "View on GitHub" for a repository. */
function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "github.com" ? "View on GitHub" : `Visit ${host}`;
  } catch {
    return "Visit site";
  }
}

function PlayIcon() {
  return (
    <span className="pf-demo__icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="currentColor">
        <path d="M5 3.5v9l7-4.5z" />
      </svg>
    </span>
  );
}

/**
 * The picture column: the entry's thumbnail when it has one, otherwise a
 * labelled slot for its visual value proposition. Under it, the live demo —
 * a link when portfolio.json supplies one, an empty slot when it doesn't.
 */
function Media({ experience, demo }: { experience: Experience; demo: string | null }) {
  const thumb = experience.gallery.find((g) => g.id === experience.thumbnailId);

  return (
    <div className="pf-media">
      {thumb ? (
        <Image
          src={thumb.src}
          alt={thumb.alt}
          width={720}
          height={480}
          sizes="(min-width: 960px) 320px, 90vw"
          className="pf-picture"
        />
      ) : (
        <div
          className="pf-vvp"
          role="img"
          aria-label={`Placeholder for the ${experience.title} visual value proposition`}
        >
          <svg
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="6" y="9" width="36" height="30" rx="4" />
            <circle cx="17" cy="19" r="3.5" />
            <path d="M6 33l11-10 9 8 6-5 10 9" />
          </svg>
          <p className="pf-vvp__label">VVP placeholder</p>
          <p className="pf-vvp__title">{experience.title}</p>
        </div>
      )}

      {demo ? (
        <a className="pf-demo is-live" href={demo} target="_blank" rel="noopener noreferrer">
          <PlayIcon />
          <span>
            <span className="pf-demo__title">Live demo</span>
            <span className="pf-demo__note">Opens in a new tab</span>
          </span>
        </a>
      ) : (
        <div className="pf-demo is-empty">
          <PlayIcon />
          <span>
            <span className="pf-demo__title">Live demo</span>
            <span className="pf-demo__note">Placeholder for the demo link</span>
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * A Druid Content Card for one resume entry: cream face, gradient frame and
 * the hatched cast shadow.
 *
 * Every optional field degrades by omission. No organization means no line, an
 * empty summary means no paragraph, no endorsed skills means no tag row, and
 * no url means no button.
 */
export function ContentCard({
  experience,
  skills,
  demo = null,
  withMedia = false,
}: {
  experience: Experience;
  /** The entry's endorsed skills, already resolved to labels. */
  skills: Skill[];
  demo?: string | null;
  withMedia?: boolean;
}) {
  return (
    <article className="druid-card pf-card">
      <div className={`druid-card__face ${withMedia ? "pf-face" : ""}`}>
        {withMedia && <Media experience={experience} demo={demo} />}

        <div className="druid-card__content pf-content">
          <span className="druid-tag">{KIND[experience.type]}</span>
          <h3>{experience.title}</h3>
          {experience.organization && <p className="pf-org">{experience.organization}</p>}
          <p className="druid-caption druid-card__meta pf-meta">
            <span>{formatDurationLong(experience.startDate, experience.endDate)}</span>
            <span>{experience.location}</span>
          </p>
          {experience.tagline && <p className="pf-tagline">{experience.tagline}</p>}
          {experience.summary.trim() && <p className="pf-summary">{experience.summary}</p>}
          {experience.responsibilities.length > 0 && (
            <ul className="pf-list">
              {experience.responsibilities.map((text) => (
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
          {experience.url && (
            <a
              className="druid-button pf-visit"
              href={experience.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {linkLabel(experience.url)}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
