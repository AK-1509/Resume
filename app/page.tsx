import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { IndexDock } from "@/components/IndexDock";
import { LanguagesCard } from "@/components/LanguagesCard";
import { LiquidBackground } from "@/components/LiquidBackground";
import { ExportHost } from "@/components/ExportHost";
import { CaseStudyCards } from "@/components/case/CaseStudyCards";
import { CaseStudyIndex } from "@/components/case/CaseStudyIndex";
import { CATEGORY_LABELS, entryAnchor } from "@/lib/anchors";
import { caseStudies } from "@/lib/case-studies";
import { resume } from "@/lib/resume";
import { portfolio } from "@/lib/portfolio";

/**
 * The portfolio, on a glassy gradient canvas: the hero on the first screen,
 * then the projects (the work built, one large entry each), then the case
 * studies (analysis for real companies, a ledger on a brown band), then
 * contact and languages. The Index is docked on the right edge and jumps to
 * any entry in either section.
 */
export default function Home() {
  const { profile, languages } = resume;
  const all = caseStudies();
  const projects = all
    .filter((s) => s.category === "project")
    .map(({ slug, title, slugLine, tags, hero, role }) => ({ slug, title, slugLine, tags, hero, role }));
  const studies = all
    .filter((s) => s.category === "case-study")
    .map(({ slug, title, slugLine, tags, keyFigure }) => ({ slug, title, slugLine, tags, keyFigure }));

  const index = [
    ...projects.map((s) => ({ id: entryAnchor("project", s.slug), label: s.title, group: CATEGORY_LABELS.project })),
    ...studies.map((s) => ({
      id: entryAnchor("case-study", s.slug),
      label: s.title,
      group: CATEGORY_LABELS["case-study"],
    })),
  ];

  return (
    <>
      <div className="druid-root">
        <div className="pf-canvas" aria-hidden="true">
          <LiquidBackground />
        </div>

        <SiteHeader name={profile.name} projects={projects.length > 0} caseStudies={studies.length > 0} />
        {index.length > 0 && <IndexDock label="Browse the work" items={index} />}

        <main>
          <Hero
            name={profile.name}
            role={portfolio.hero.role}
            sub={portfolio.hero.sub}
            credentials={portfolio.hero.credentials}
          />
          <CaseStudyCards studies={projects} />
          <CaseStudyIndex studies={studies} />
        </main>

        <footer id="contact" className="druid-section pf-footer" aria-labelledby="contact-title">
          <div className="druid-container pf-footer__row">
            <div className="pf-glass-card pf-contact">
              <h2 id="contact-title">Contact</h2>
              <p>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </p>
              {profile.links.length > 0 && (
                <ul className="pf-links">
                  {profile.links.map((link) => (
                    <li key={link.url}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <p className="druid-caption text-soft">Based in {profile.location}</p>
            </div>
            <LanguagesCard languages={languages} />
          </div>
        </footer>
      </div>

      <ExportHost
        profile={profile}
        experiences={resume.experiences}
        skills={resume.skills}
        languages={languages}
      />
    </>
  );
}
