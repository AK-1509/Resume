import { SiteHeader } from "@/components/SiteHeader";
import { Portfolio } from "@/components/Portfolio";
import { IndexDock } from "@/components/IndexDock";
import { LanguagesCard } from "@/components/LanguagesCard";
import { LiquidBackground } from "@/components/LiquidBackground";
import { ExportHost } from "@/components/ExportHost";
import { resume } from "@/lib/resume";
import { headlineViews, portfolio, roleViews } from "@/lib/portfolio";

/**
 * The portfolio, on a glassy gradient canvas: the hero with rotating
 * headlines, then one section per role — each a two-page pager of side
 * projects and experience — then contact and languages. The role index is
 * docked on the right edge.
 */
export default function Home() {
  const { profile, languages } = resume;
  const roles = roleViews();
  const lines = Object.fromEntries(portfolio.headlines.map((h) => [h.experienceId, h.line]));

  return (
    <>
      <div className="druid-root">
        <div className="pf-canvas" aria-hidden="true">
          <LiquidBackground />
        </div>

        <SiteHeader name={profile.name} />
        {roles.length > 0 && (
          <IndexDock label="Browse by role" items={roles.map((r) => ({ id: r.id, label: r.label }))} />
        )}

        <main>
          <Portfolio
            profile={profile}
            hero={portfolio.hero}
            headlines={headlineViews()}
            roles={roles}
            lines={lines}
            skills={resume.skills}
            demos={portfolio.demos}
          />
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
