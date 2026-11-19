/**
 * The first screen: the name and the role line, the sub-line and the
 * credentials, then the way into the projects. It fills the first screen on
 * its own, so the projects begin on the next.
 */
export function Hero({
  name,
  role,
  sub,
  credentials,
}: {
  name: string;
  role: string;
  sub: string;
  credentials: string[];
}) {
  return (
    <section id="top" className="druid-section pf-front" aria-labelledby="hero-title">
      {/* One column on the left; the right side of the hero stays open. */}
      <div className="druid-container">
        <div className="pf-hero__main">
          <h1 id="hero-title" className="pf-h1">
            <span className="pf-h1__name">{name}</span>
            <span className="pf-h1__role">{role}</span>
          </h1>
          {sub && <p className="pf-sub">{sub}</p>}
          {credentials.length > 0 && (
            <ul className="pf-creds">
              {credentials.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          <div className="pf-hero__actions">
            <a className="druid-button" href="#projects">
              See the projects
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
            </a>
            <a className="druid-button druid-button--quiet" href="#contact">
              Get in touch
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
