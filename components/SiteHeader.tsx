import { ThemeToggle } from "./ThemeToggle";
import { ExportButton } from "./ExportButton";

/**
 * The glass header. It sits on a zero-height sticky rail, so the hero runs
 * underneath it and every section scrolls behind the frosted bar.
 */
export function SiteHeader({ name }: { name: string }) {
  return (
    <>
      <a className="druid-skip druid-button" href="#roles">
        Skip to the role index
      </a>
      <div className="pf-header-wrap">
        <header className="pf-header">
          <div className="druid-container">
            <div className="pf-glass">
              <a className="pf-brand" href="#top">
                {name}
              </a>
              <nav className="pf-nav" aria-label="Site">
                <a href="#roles">Roles</a>
                <a href="#education">Education</a>
                <a href="#contact">Contact</a>
              </nav>
              <div className="pf-actions">
                <ThemeToggle />
                <ExportButton className="druid-button shrink-0 max-sm:px-3.5" compact />
              </div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
