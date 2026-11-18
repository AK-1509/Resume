import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { ExportButton } from "./ExportButton";

/**
 * The glass header. It sits on a zero-height sticky rail, so the hero runs
 * underneath it and every section scrolls behind the frosted bar.
 *
 * On a project page ("case") the links lead back to the portfolio rather than
 * around it, and there is no export button: the export dialog lives on the
 * portfolio page only.
 */
export function SiteHeader({
  name,
  variant = "home",
  caseStudies = true,
}: {
  name: string;
  variant?: "home" | "case";
  /** Whether the portfolio has a case-studies section to link to. */
  caseStudies?: boolean;
}) {
  const home = variant === "home";
  return (
    <>
      <a className="druid-skip druid-button" href={home ? "#roles" : "#case"}>
        {home ? "Skip to the roles" : "Skip to the project"}
      </a>
      <div className="pf-header-wrap">
        <header className="pf-header">
          <div className="druid-container">
            <div className="pf-glass">
              {home ? (
                <a className="pf-brand" href="#top">
                  {name}
                </a>
              ) : (
                <Link className="pf-brand" href="/">
                  {name}
                </Link>
              )}
              <nav className="pf-nav" aria-label="Site">
                {home ? (
                  <>
                    <a href="#roles">Roles</a>
                    {caseStudies && <a href="#case-studies">Case studies</a>}
                    <a href="#contact">Contact</a>
                  </>
                ) : (
                  <>
                    <Link href="/#roles">Roles</Link>
                    <Link href="/#case-studies">Case studies</Link>
                    <Link href="/#contact">Contact</Link>
                  </>
                )}
              </nav>
              <div className="pf-actions">
                <ThemeToggle />
                {home && <ExportButton className="druid-button shrink-0 max-sm:px-3.5" compact />}
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
