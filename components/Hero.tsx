import type { Profile } from "@/lib/schema";

/**
 * The title page.
 *
 * Left-aligned and set on a measure, not centred and not scaled to fill the
 * viewport — that restraint is the main thing separating this from the stock
 * cream-and-serif hero. The brass rule is the only brass on the page above the
 * lightbox, and it earns its place by setting the measure every section below
 * aligns to.
 */
export function Hero({ profile }: { profile: Profile }) {
  return (
    <header className="on-ink bg-ink text-paper">
      <div className="shell py-16 md:py-20">
        <h1 className="max-w-[14ch] font-serif text-hero font-semibold">{profile.name}</h1>

        <hr className="mt-6 border-0 border-t border-brass" aria-hidden="true" />

        <p className="mt-6 max-w-[46ch] font-sans text-lead text-paper/90">{profile.headline}</p>

        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <li className="metadata text-brass">{profile.location}</li>
            {profile.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="metadata text-paper underline decoration-brass decoration-1 underline-offset-4 hover:decoration-paper"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Behaviour lands in Phase 6; the CTA is here so the layout is real. */}
          <button
            type="button"
            className="shrink-0 self-start rounded-[2px] bg-claret px-6 py-3 font-sans text-ui font-medium text-white transition-colors hover:bg-claret-dim sm:self-auto"
          >
            Export resume
          </button>
        </div>
      </div>
    </header>
  );
}
