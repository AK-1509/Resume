import { ViewTransition } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Hero } from "@/components/Hero";
import { IndexDock } from "@/components/IndexDock";
import { LanguagesCard } from "@/components/LanguagesCard";
import { LiquidBackground } from "@/components/LiquidBackground";
import { ExportHost } from "@/components/ExportHost";
import { DocumentLang } from "@/components/DocumentLang";
import { CaseStudyCards } from "@/components/case/CaseStudyCards";
import { CaseStudyIndex } from "@/components/case/CaseStudyIndex";
import { homeCopy } from "@/lib/copy";
import { caseStudies } from "@/lib/case-studies";
import { translator, type Locale } from "@/lib/i18n";
import { resume } from "@/lib/resume";
import { portfolio } from "@/lib/portfolio";

/** The page's words for a locale. Shared by the route and its metadata. */
export function copyFor(locale: Locale) {
  return homeCopy(translator(locale), locale, {
    profile: resume.profile,
    languages: resume.languages,
    portfolio,
    studies: caseStudies(),
  });
}

/**
 * The portfolio, on a glassy gradient canvas: the hero on the first screen,
 * then the projects (the work built, one large entry each), then the case
 * studies (analysis for real companies, a ledger on a brown band), then
 * contact and languages. The Index is docked on the right edge and jumps to
 * any entry in either section.
 *
 * The same page in every language: `/` is English and `/hi` is Hindi. Every
 * word comes from `copyFor(locale)`, so the components only render what they
 * are given. Choosing a language in the Languages card is a navigation tagged
 * "language", and the page crossfades into the new words; any other
 * navigation leaves this transition alone.
 */
export function HomePage({ locale }: { locale: Locale }) {
  const copy = copyFor(locale);
  const { profile, languages } = resume;

  return (
    <>
      <DocumentLang lang={copy.lang} />
      <ViewTransition
        enter={{ language: "pf-lang-swap", default: "none" }}
        exit={{ language: "pf-lang-swap", default: "none" }}
        default="none"
      >
        <div className="druid-root" lang={copy.lang}>
          <div className="pf-canvas" aria-hidden="true">
            <LiquidBackground />
          </div>

          <SiteHeader
            name={profile.name}
            labels={copy.chrome}
            projects={copy.projects.items.length > 0}
            caseStudies={copy.cases.items.length > 0}
          />
          {copy.index.length > 0 && (
            <IndexDock label={copy.chrome.browse} tab={copy.chrome.index} items={copy.index} />
          )}

          <main>
            <Hero {...copy.hero} />
            <CaseStudyCards studies={copy.projects.items} labels={copy.projects.labels} />
            <CaseStudyIndex studies={copy.cases.items} labels={copy.cases.labels} />
          </main>

          <footer id="contact" className="druid-section pf-footer" aria-labelledby="contact-title">
            <div className="druid-container pf-footer__row">
              <div className="pf-glass-card pf-contact">
                <h2 id="contact-title">{copy.contact.title}</h2>
                <p>
                  <a href={`mailto:${copy.contact.email}`}>{copy.contact.email}</a>
                </p>
                {copy.contact.links.length > 0 && (
                  <ul className="pf-links">
                    {copy.contact.links.map((link) => (
                      <li key={link.url}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {profile.location && <p className="druid-caption text-soft">{copy.contact.basedIn}</p>}
              </div>
              <LanguagesCard title={copy.languages.title} languages={copy.languages.items} />
            </div>
          </footer>
        </div>
      </ViewTransition>

      {/* The export dialog and the PDF it makes stay in English for now. */}
      <ExportHost
        profile={profile}
        experiences={resume.experiences}
        skills={resume.skills}
        languages={languages}
      />
    </>
  );
}
