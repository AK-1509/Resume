import { SiteHeader } from "@/components/SiteHeader";
import { Portfolio } from "@/components/Portfolio";
import { ContentCard } from "@/components/ContentCard";
import { LiquidBackground } from "@/components/LiquidBackground";
import { ExportHost } from "@/components/ExportHost";
import { resume, experiencesOfType } from "@/lib/resume";
import { headlineViews, portfolio, roleViews } from "@/lib/portfolio";
import type { Experience } from "@/lib/schema";

const skillsOf = (e: Experience) =>
  e.endorsedSkills.map((id) => resume.skills.find((s) => s.id === id)!).filter(Boolean);

/**
 * The portfolio: a brown hero with rotating headlines and the role index, one
 * depth stack of Content Cards per role, then education and contact.
 */
export default function Home() {
  const { profile, languages } = resume;
  const education = experiencesOfType("education");

  return (
    <>
      <div className="druid-root">
        <SiteHeader name={profile.name} />

        <main>
          <Portfolio
            profile={profile}
            hero={portfolio.hero}
            headlines={headlineViews()}
            roles={roleViews()}
            skills={resume.skills}
            demos={portfolio.demos}
          />

          {education.length > 0 && (
            <section id="education" className="druid-section" aria-labelledby="edu-title">
              <LiquidBackground tone="page" />
              <div className="druid-container">
                <h2 id="edu-title">Education</h2>
                <div className="pf-edu">
                  {education.map((e) => (
                    <div key={e.id}>
                      <ContentCard experience={e} skills={skillsOf(e)} />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>

        <footer
          id="contact"
          className="druid-section druid-section--green pf-footer"
          aria-labelledby="contact-title"
        >
          <LiquidBackground tone="green" />
          <div className="druid-container pf-contact">
            <div>
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
            </div>
            <div>
              {languages.length > 0 && (
                <>
                  <p className="druid-caption">Languages</p>
                  <p>{languages.join(", ")}</p>
                </>
              )}
              <p className="druid-caption">Based in {profile.location}</p>
            </div>
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
