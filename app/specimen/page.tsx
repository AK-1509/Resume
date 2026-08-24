import type { Metadata } from "next";
import { TOKENS, contrast, verdict, type TokenName } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Specimen — type and colour",
  robots: { index: false, follow: false },
};

const SURFACES: TokenName[] = ["paper", "card", "ink", "claret"];
const FOREGROUNDS: TokenName[] = [
  "ink",
  "muted",
  "claret",
  "claret-dim",
  "brass",
  "sage",
  "paper",
  "card",
  "white",
];

const TYPE_SPECIMENS = [
  { role: "Hero name", cls: "font-serif text-hero font-semibold", sample: "Adheesh Kale" },
  { role: "Section heading", cls: "font-serif text-section font-medium", sample: "Experience" },
  { role: "Experience title", cls: "font-serif text-entry font-semibold", sample: "Software Engineering Intern" },
  { role: "Organization", cls: "font-sans text-org font-medium", sample: "Northwind Analytics" },
  {
    role: "Body / summary",
    cls: "font-sans text-body font-normal max-w-[65ch]",
    sample:
      "Worked on the customer-facing reporting product, focused on making large result sets fast to read and possible to act on.",
  },
  { role: "Buttons / nav", cls: "font-sans text-ui font-medium", sample: "Export resume" },
  { role: "Dates, location", cls: "metadata", sample: "2025-05 — 2025-08   Seattle, WA" },
  { role: "Skill bubbles", cls: "font-mono text-bubble font-medium tracking-[0.03em]", sample: "TypeScript" },
  {
    role: "Endorsement counts",
    cls: "font-mono text-bubble font-medium tabular-nums",
    sample: "12  7  3  1",
  },
];

function Ratio({ fg, bg }: { fg: TokenName; bg: TokenName }) {
  const ratio = contrast(TOKENS[fg], TOKENS[bg]);
  const v = verdict(ratio);

  // The specimen is itself a legibility test, so the cell reports its own
  // status in text and shape, never in colour alone.
  const label = v.bodyText ? "AA" : v.largeText ? "LG" : "✕";
  const title = v.bodyText
    ? "Passes AA for text at any size"
    : v.largeText
      ? "Large text (≥24px, or ≥19px bold) and non-text UI only"
      : "Fails everything — decorative use only";

  return (
    <td className="border border-sage/40 p-0 align-top">
      <div
        className="flex h-full flex-col gap-1 p-3"
        style={{ backgroundColor: TOKENS[bg], color: TOKENS[fg] }}
      >
        <span className="font-sans text-ui font-medium">Ag</span>
        <span className="font-mono text-bubble tabular-nums" title={title}>
          {ratio.toFixed(1)}:1 {label}
        </span>
      </div>
    </td>
  );
}

export default function SpecimenPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="mb-16 border-b border-sage/50 pb-8">
        <p className="metadata text-muted">Design system</p>
        <h1 className="mt-3 font-serif text-section font-medium">Type and colour specimen</h1>
        <p className="mt-4 max-w-[65ch] font-sans text-body text-muted">
          Every value here is generated from the tokens in <code className="font-mono">app/globals.css</code>.
          Contrast ratios are computed at render time, so this page cannot drift from the palette it documents.
        </p>
      </header>

      {/* ---- Type scale ---- */}
      <section aria-labelledby="type-heading" className="mb-20">
        <h2 id="type-heading" className="mb-8 font-serif text-section font-medium">
          Type scale
        </h2>
        <dl className="flex flex-col gap-10">
          {TYPE_SPECIMENS.map(({ role, cls, sample }) => (
            <div key={role} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <dt className="metadata pt-2 text-muted">{role}</dt>
              <dd className={cls}>{sample}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---- Palette ---- */}
      <section aria-labelledby="palette-heading" className="mb-20">
        <h2 id="palette-heading" className="mb-8 font-serif text-section font-medium">
          Palette
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(TOKENS) as TokenName[]).map((name) => (
            <li key={name} className="border border-sage/40">
              <div className="h-20 w-full" style={{ backgroundColor: TOKENS[name] }} />
              <div className="p-3">
                <p className="font-sans text-ui font-medium">{name}</p>
                <p className="font-mono text-bubble uppercase text-muted">{TOKENS[name]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Contrast matrix ---- */}
      <section aria-labelledby="contrast-heading" className="mb-20">
        <h2 id="contrast-heading" className="mb-3 font-serif text-section font-medium">
          Contrast matrix
        </h2>
        <p className="mb-8 max-w-[65ch] font-sans text-body text-muted">
          Foreground down the side, surface across the top.{" "}
          <strong className="font-semibold">AA</strong> passes for text at any size,{" "}
          <strong className="font-semibold">LG</strong> is large text and non-text UI only, and{" "}
          <strong className="font-semibold">✕</strong> fails everything.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse">
            <caption className="sr-only">
              WCAG 2.1 contrast ratios for every foreground and surface token pairing
            </caption>
            <thead>
              <tr>
                <th scope="col" className="metadata p-3 text-left text-muted">
                  on →
                </th>
                {SURFACES.map((bg) => (
                  <th key={bg} scope="col" className="metadata p-3 text-left text-muted">
                    {bg}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FOREGROUNDS.map((fg) => (
                <tr key={fg}>
                  <th scope="row" className="metadata p-3 text-left text-muted">
                    {fg}
                  </th>
                  {SURFACES.map((bg) => (
                    <Ratio key={bg} fg={fg} bg={bg} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Placement rules ---- */}
      <section aria-labelledby="rules-heading">
        <h2 id="rules-heading" className="mb-8 font-serif text-section font-medium">
          Placement rules
        </h2>
        <ul className="flex max-w-[70ch] flex-col gap-5 font-sans text-body">
          <li>
            <strong className="font-semibold">Brass is a dark-surface colour.</strong>{" "}
            <span className="text-muted">
              2.7:1 on paper and 2.3:1 on card — it fails text and non-text UI on both. Use it on ink for hero
              detailing, eyebrows, and hairline rules. On cream it may appear only as a 1px rule or as a fill
              behind ink-coloured text.
            </span>
          </li>
          <li>
            <strong className="font-semibold">Sage is metadata scale, not body scale.</strong>{" "}
            <span className="text-muted">
              4.1:1 on paper clears large text only. Use it for borders and for mono metadata at ≥19px bold.
              Anything smaller uses muted.
            </span>
          </li>
          <li>
            <strong className="font-semibold">Never signal state with colour alone.</strong>{" "}
            <span className="text-muted">
              Active filters, endorsed skills, and selection states pair colour with weight, fill, border, or a
              mark.
            </span>
          </li>
          <li>
            <strong className="font-semibold">Focus rings.</strong>{" "}
            <span className="text-muted">
              2px claret on light surfaces (8.1:1), 2px brass inside any region carrying{" "}
              <code className="font-mono">.on-ink</code> (5.6:1).
            </span>
          </li>
        </ul>
      </section>

      {/* Focus-ring proof on both surfaces. */}
      <section aria-labelledby="focus-heading" className="mt-16 border-t border-sage/50 pt-10">
        <h2 id="focus-heading" className="mb-6 font-serif text-entry font-semibold">
          Focus rings — tab through these
        </h2>
        <div className="flex flex-wrap items-start gap-6">
          <button
            type="button"
            className="bg-claret px-5 py-3 font-sans text-ui font-medium text-white hover:bg-claret-dim"
          >
            On paper
          </button>
          <div className="on-ink bg-ink p-6">
            <button
              type="button"
              className="border border-brass px-5 py-3 font-sans text-ui font-medium text-paper"
            >
              On ink
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
