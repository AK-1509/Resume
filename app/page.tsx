import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { IndexDock } from "@/components/IndexDock";
import { LanguagesCard } from "@/components/LanguagesCard";
import { LiquidBackground } from "@/components/LiquidBackground";
import { ExportHost } from "@/components/ExportHost";
import { CaseStudyCards, projectAnchor } from "@/components/case/CaseStudyCards";
import { caseStudies } from "@/lib/case-studies";
import { resume } from "@/lib/resume";
import { portfolio } from "@/lib/portfolio";

/**
 * The portfolio, on a glassy gradient canvas: the hero on the first screen,
 * then the projects (one entry per project page), then contact and
 * languages. The Index is docked on the right edge and jumps to any project.
 */
export default function Home() {
  const { profile, languages } = resume;
  const studies = caseStudies().map(({ slug, title, slugLine, tags, hero, role }) => ({
    slug,
    title,
    slugLine,
    tags,
    hero,
    role,
  }));

  return (
    <>
      <div className="druid-root">
        <div className="pf-canvas" aria-hidden="true">
          <LiquidBackground />
        </div>

        <SiteHeader name={profile.name} projects={studies.length > 0} />
        {studies.length > 0 && (
          <IndexDock
            label="Browse projects"
            items={studies.map((s) => ({ id: projectAnchor(s.slug), label: s.title }))}
          />
        )}

        <main>
          <Hero
            name={profile.name}
            role={portfolio.hero.role}
            sub={portfolio.hero.sub}
            credentials={portfolio.hero.credentials}
          />
          <CaseStudyCards studies={studies} />
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
