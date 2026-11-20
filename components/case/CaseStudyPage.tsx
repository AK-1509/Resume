import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { IndexDock } from "@/components/IndexDock";
import { LiquidBackground } from "@/components/LiquidBackground";
import { CATEGORY_LABELS } from "@/lib/anchors";
import { SHOW_PLACEHOLDERS } from "@/lib/placeholders";
import {
  CASE_PHASES,
  CASE_PHASE_LABELS,
  phaseHasContent,
  type CaseCategory,
  type CasePhase,
  type CaseStudy,
} from "@/lib/schema";
import { CaseNav, type NavSection } from "./CaseNav";
import { DrawOnView } from "./DrawOnView";
import { ExhibitBlock, Sheet } from "./Exhibits";
import { HeadlineRail } from "./HeadlineRail";
import { LIVE_MOCKUPS } from "./mockups";
import { PainPoints } from "./PainPoints";
import { rich } from "./rich";

const ROOT_ID = "case-study";

/** The colour field behind each phase: green for the relationships, warm gold for the numbers. */
const GROUND: Record<CasePhase, string> = {
  research: "cs-phase--green",
  goals: "cs-phase--warm",
  design: "cs-phase--green",
  results: "cs-phase--warm",
};

function ArrowDown() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 4v12M5 11l5 5 5-5" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
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
  );
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

/** A link slot: live when it has an address, a labelled empty slot until then. */
function Slot({ href, title, emptyNote }: { href: string | null; title: string; emptyNote: string }) {
  return href ? (
    <a className="pf-demo is-live" href={href} target="_blank" rel="noopener noreferrer">
      <PlayIcon />
      <span>
        <span className="pf-demo__title">{title}</span>
        <span className="pf-demo__note">Opens in a new tab</span>
      </span>
    </a>
  ) : (
    <div className="pf-demo is-empty">
      <PlayIcon />
      <span>
        <span className="pf-demo__title">{title}</span>
        <span className="pf-demo__note">{emptyNote}</span>
      </span>
    </div>
  );
}

/** The tab that opens a phase, or a part of one. */
function Tag({
  id,
  level,
  number,
  variant,
  children,
}: {
  id?: string;
  level: 2 | 3;
  number?: number;
  variant?: "sub" | "inset";
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  const classes = ["cs-tag", variant && "cs-tag--sub", variant === "inset" && "cs-tag--inset"]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={classes}>
      {number !== undefined && (
        <span className="cs-disc" aria-hidden="true">
          {number}
        </span>
      )}
      <Heading id={id} className="cs-tag__title">
        {children}
      </Heading>
    </div>
  );
}

function Hero({ study }: { study: CaseStudy }) {
  const { image, figure, live } = study.hero;
  const Live = live ? LIVE_MOCKUPS[live] : null;
  // With no picture on the live site, the art column is rings alone.
  const bare = !image && !figure && !Live && !SHOW_PLACEHOLDERS;
  return (
    <header className={`cs-hero${image ? " cs-hero--image" : ""}`}>
      {image && (
        <div className="cs-hero__bleed">
          <Image src={image.src} alt={image.alt} fill priority sizes="100vw" />
        </div>
      )}
      <div className="druid-container cs-hero__inner">
        <div className="cs-hero__text">
          <h1 className="cs-hero__title">{study.title}</h1>
          <p className="cs-hero__slug">{study.slugLine}</p>
        </div>
        <div className={`cs-hero__art${bare ? " cs-hero__art--bare" : ""}`}>
          {!image && (
            <svg className="cs-hero__rings" viewBox="0 0 600 600" fill="none" aria-hidden="true">
              {[70, 120, 170, 220, 270, 298].map((r) => (
                <circle key={r} cx="300" cy="300" r={r} stroke="currentColor" strokeWidth="1" />
              ))}
            </svg>
          )}
          {Live && <Live />}
          {figure && !Live && (
            <div className="cs-hero__figure">
              <Image
                src={figure.src}
                alt={figure.alt}
                width={figure.width}
                height={figure.height}
                priority
                sizes="(min-width: 640px) 290px, 54vw"
              />
            </div>
          )}
          {!image && !figure && !Live && SHOW_PLACEHOLDERS && (
            <div
              className="cs-ph cs-hero__ph"
              role="img"
              aria-label={`Placeholder for the ${study.title} hero picture`}
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
              <p>Hero picture placeholder</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Role({ study }: { study: CaseStudy }) {
  const { role, tags } = study;
  const empty = !role.title.trim() && !role.sprint.trim() && !role.summary.trim() && role.moves.length === 0;
  // On the live site an empty role leaves only the tags; the heading stays for
  // screen readers and the "Overview" link in the pane.
  const quiet = empty && !SHOW_PLACEHOLDERS;
  return (
    <section id="overview" className="cs-role" aria-labelledby="overview-title">
      <div className="cs-role__head">
        <h2 id="overview-title" className={quiet ? "sr-only" : "cs-role__title"}>
          {role.title.trim() || (quiet ? "Overview" : "Role")}
        </h2>
        {role.sprint.trim() && <p className="druid-caption cs-role__sprint">Sprint time: {role.sprint}</p>}
      </div>
      {tags.length > 0 && (
        <ul className="pf-skills" aria-label="About this project">
          {tags.map((tag) => (
            <li key={tag} className="druid-tag">
              {tag}
            </li>
          ))}
        </ul>
      )}
      {empty ? (
        SHOW_PLACEHOLDERS && (
          <div className="cs-ph">
            <p>Placeholder for the role.</p>
            <p>Role title, sprint time and a short summary, then each action and the impact it had.</p>
          </div>
        )
      ) : (
        <>
          {role.summary.trim() && <p className="cs-role__summary">{role.summary}</p>}
          {role.moves.length > 0 && (
            <ul className="cs-moves">
              {role.moves.map((move) => (
                <li key={move} className="cs-move">
                  <ArrowRight />
                  <span>{rich(move)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Research({ study, number }: { study: CaseStudy; number: number }) {
  const { problem, stakeholders, painPoints, headlines } = study.research;
  return (
    <section id="research" className={`cs-phase ${GROUND.research}`} aria-labelledby="research-title">
      <Tag id="research-title" level={2} number={number}>
        {CASE_PHASE_LABELS.research}
      </Tag>

      {problem.trim() && (
        <div id="research-problem" className="cs-block">
          <h3 className="cs-h3">Problem statement</h3>
          <p className="cs-problem" data-draw="">
            {rich(problem)}
          </p>
        </div>
      )}

      {stakeholders.length > 0 && (
        <div id="research-stakeholders" className="cs-block">
          <h3 className="cs-h3">Key stakeholders</h3>
          <ul className="cs-stake">
            {stakeholders.map((s) => (
              <li key={s.kind + s.name}>
                <span className="cs-stake__kind">{s.kind}</span>
                <span className="cs-stake__name">{s.name}</span>
                {s.note && <span className="cs-stake__note">{s.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {painPoints.length > 0 && (
        <div id="research-pain" className="cs-block">
          <h3 className="cs-h3">Pain points</h3>
          <PainPoints items={painPoints} />
        </div>
      )}

      {headlines.length > 0 && (
        <div id="research-headlines" className="cs-block">
          <h3 className="cs-h3">Research headlines</h3>
          <HeadlineRail items={headlines} label="Research headlines" />
        </div>
      )}
    </section>
  );
}

function Goals({ study, number }: { study: CaseStudy; number: number }) {
  const { rows, insights, report, roadmap } = study.goals;
  const reportSlot = report && (report.href || SHOW_PLACEHOLDERS) ? report : null;
  return (
    <section id="goals" className={`cs-phase ${GROUND.goals}`} aria-labelledby="goals-title">
      <div className="cs-goals">
        <div>
          <Tag id="goals-title" level={2} number={number}>
            {CASE_PHASE_LABELS.goals}
          </Tag>
          {rows.length > 0 && (
            <Sheet>
              <div className="cs-table-wrap">
                {/* The roles are spelled out because a phone lays each row out as a
                  block, which would otherwise cost the table its semantics. */}
                <table className="cs-table cs-table--goals" role="table" aria-label="Goals, targets and KPIs">
                  <thead role="rowgroup">
                    <tr role="row">
                      <th role="columnheader" scope="col">
                        Goals
                      </th>
                      <th role="columnheader" scope="col">
                        Targets
                      </th>
                      <th role="columnheader" scope="col">
                        KPIs
                      </th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {rows.map((row) => (
                      <tr key={row.goal} role="row">
                        <th role="rowheader" scope="row">
                          {row.goal}
                        </th>
                        {/* A blank cell renders truly empty, so a phone can drop it. */}
                        <td role="cell" data-label="Target">
                          {row.target.trim() ? row.target : null}
                        </td>
                        <td role="cell" data-label="KPI">
                          {row.kpi.trim() ? row.kpi : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Sheet>
          )}
        </div>

        {(insights.length > 0 || reportSlot) && (
          <div id="goals-insights" className="cs-block">
            {insights.length > 0 && (
              <>
                <Tag level={3} variant="inset">
                  Key insights
                </Tag>
                <ol className="cs-insights">
                  {insights.map((item) => (
                    <li key={item.insight}>
                      <h4 className="cs-insight__title">{item.insight}</h4>
                      {item.evidence && <p className="cs-insight__evidence">{item.evidence}</p>}
                    </li>
                  ))}
                </ol>
              </>
            )}
            {reportSlot && (
              <div className="cs-report">
                <Slot
                  href={reportSlot.href}
                  title="See the full strategic report"
                  emptyNote="Placeholder for the report link"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {roadmap.length > 0 && (
        <div id="goals-roadmap" className="cs-block">
          <Tag level={3} variant="sub">
            Strategic roadmap
          </Tag>
          <Sheet>
            <ol className="cs-road" data-draw="">
              {roadmap.map((stop, i) => (
                <li key={stop.when + stop.what} style={{ "--i": i } as CSSProperties}>
                  <span className="cs-road__when">{stop.when}</span>
                  <span className="cs-road__node" aria-hidden="true" />
                  <p className="cs-road__what">{stop.what}</p>
                </li>
              ))}
            </ol>
          </Sheet>
        </div>
      )}
    </section>
  );
}

function ExhibitPhase({ study, phase, number }: { study: CaseStudy; phase: "design" | "results"; number: number }) {
  const { lead, blocks } = study[phase];
  return (
    <section id={phase} className={`cs-phase ${GROUND[phase]}`} aria-labelledby={`${phase}-title`}>
      <Tag id={`${phase}-title`} level={2} number={number}>
        {CASE_PHASE_LABELS[phase]}
      </Tag>
      {lead.trim() && (
        <div className="cs-block">
          <p className="cs-lead" data-draw="">
            {rich(lead)}
          </p>
        </div>
      )}
      {blocks.map((block, i) => (
        <ExhibitBlock key={i} block={block} id={`${phase}-${i}`} />
      ))}
    </section>
  );
}

/** The parts of a phase the navigation pane lists, in page order. */
function partsOf(study: CaseStudy, phase: CasePhase): { id: string; label: string }[] {
  if (phase === "research") {
    const r = study.research;
    return [
      r.problem.trim() && { id: "research-problem", label: "Problem statement" },
      r.stakeholders.length > 0 && { id: "research-stakeholders", label: "Key stakeholders" },
      r.painPoints.length > 0 && { id: "research-pain", label: "Pain points" },
      r.headlines.length > 0 && { id: "research-headlines", label: "Research headlines" },
    ].filter((part): part is { id: string; label: string } => Boolean(part));
  }
  if (phase === "goals") {
    const g = study.goals;
    return [
      g.insights.length > 0 && { id: "goals-insights", label: "Key insights" },
      g.roadmap.length > 0 && { id: "goals-roadmap", label: "Strategic roadmap" },
    ].filter((part): part is { id: string; label: string } => Boolean(part));
  }
  return study[phase].blocks.flatMap((block, i) => (block.title ? [{ id: `${phase}-${i}`, label: block.title }] : []));
}

/**
 * One project page, built from a case-study file.
 *
 * The page follows the template's wireframe: the title and its picture, the
 * Index docked on the right edge, the role beside a rail that holds the demo
 * link and the navigation pane, a sprint timeline whose stops jump to their
 * phase, then the phases themselves. Words sit straight on the canvas, and each
 * phase takes its colour from a soft field behind it, green and warm gold in
 * turn. Tables, charts and diagrams sit on cream Content Cards (`Sheet`). A
 * phase with nothing in it is left out of the page, the timeline and the pane.
 */
export function CaseStudyPage({
  study,
  all,
  name,
  email,
}: {
  study: CaseStudy;
  /** Every published page, projects and case studies, for the Index. */
  all: { slug: string; title: string; category: CaseCategory }[];
  /** The site owner's name, for the header. */
  name: string;
  /** The contact address, for the footer. */
  email: string;
}) {
  const phases = CASE_PHASES.filter((phase) => phaseHasContent(study, phase));
  const numberOf = (phase: CasePhase) => phases.indexOf(phase) + 1;
  // Without a date on any stop, the timeline would only repeat the pane's links.
  const dated = phases.some((phase) => study.timeline[phase].trim());

  const sections: NavSection[] = [
    { id: "overview", label: "Overview" },
    ...phases.map((phase) => ({
      id: phase,
      label: CASE_PHASE_LABELS[phase],
      index: numberOf(phase),
      children: partsOf(study, phase),
    })),
  ];

  // "Next" stays within the page's own section: project to project, case
  // study to case study.
  const kin = all.filter((s) => s.category === study.category);
  const here = kin.findIndex((s) => s.slug === study.slug);
  const next = kin.length > 1 && here >= 0 ? kin[(here + 1) % kin.length] : null;
  const kindOne = study.category === "case-study" ? "case study" : "project";
  const kindMany = CATEGORY_LABELS[study.category];

  return (
    <div id={ROOT_ID} className="druid-root cs">
      <div className="pf-canvas" aria-hidden="true">
        <LiquidBackground />
      </div>

      <SiteHeader name={name} variant="case" />
      <IndexDock
        label="Browse the work"
        items={[...all.filter((s) => s.category === "project"), ...all.filter((s) => s.category === "case-study")].map(
          (s) => ({
            id: s.slug,
            label: s.title,
            href: `/projects/${s.slug}`,
            current: s.slug === study.slug,
            group: CATEGORY_LABELS[s.category],
          }),
        )}
        home={{ href: "/", label: "Home" }}
      />

      <main id="case">
        <article>
          <Hero study={study} />

          <div className="druid-container cs-layout">
            <Role study={study} />

            <aside className="cs-rail" aria-label="Demo and page navigation">
              <div className="cs-rail__stick">
                {study.demo && (study.demo.href || SHOW_PLACEHOLDERS) && (
                  <Slot href={study.demo.href} title="Live demo" emptyNote="Placeholder for the demo link" />
                )}
                <CaseNav sections={sections} />
              </div>
            </aside>

            {phases.length > 0 && dated && (
              <section id="timeline" className="cs-timeline" aria-labelledby="timeline-title">
                <h2 id="timeline-title" className="cs-timeline__title">
                  Sprint timeline
                </h2>
                <p className="druid-caption cs-timeline__hint">Each stop jumps to its part of the page.</p>
                <ol className="cs-stops" style={{ "--n": phases.length } as CSSProperties}>
                  {phases.map((phase) => (
                    <li key={phase}>
                      <a className="cs-stop" href={`#${phase}`}>
                        <span className="cs-disc" aria-hidden="true">
                          {numberOf(phase)}
                        </span>
                        <span className="cs-stop__name">{CASE_PHASE_LABELS[phase]}</span>
                        <span className="cs-stop__foot">
                          {study.timeline[phase].trim() && (
                            <span className="druid-caption">{study.timeline[phase]}</span>
                          )}
                          <ArrowDown />
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {phases.includes("research") && <Research study={study} number={numberOf("research")} />}
            {phases.includes("goals") && <Goals study={study} number={numberOf("goals")} />}
            {phases.includes("design") && <ExhibitPhase study={study} phase="design" number={numberOf("design")} />}
            {phases.includes("results") && <ExhibitPhase study={study} phase="results" number={numberOf("results")} />}
          </div>
        </article>
      </main>

      <footer className="druid-container cs-foot" aria-labelledby="more-work-title">
        <div className="cs-end">
          <div>
            <h2 id="more-work-title">More {kindMany.toLowerCase()}</h2>
            <p>Every {kindOne} is on the main page.</p>
            <p className="cs-end__contact">
              <a href={`mailto:${email}`}>{email}</a>
            </p>
          </div>
          <div className="cs-end__actions">
            {next && (
              <Link className="druid-button druid-button--quiet" href={`/projects/${next.slug}`}>
                Next {kindOne}: {next.title}
              </Link>
            )}
            <Link className="druid-button" href="/">
              Back to the portfolio
            </Link>
          </div>
        </div>
      </footer>

      <DrawOnView rootId={ROOT_ID} />
    </div>
  );
}
