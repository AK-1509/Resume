import type { Metadata } from "next";
import { TOKENS, contrast, verdict, type TokenName } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Specimen — type and colour",
  robots: { index: false, follow: false },
};

const SURFACES: TokenName[] = [
  "green-pale",
  "green-soft",
  "cream",
  "brown-rich",
  "green-dark",
  "walnut",
  "espresso",
  "mauve-index",
];
const FOREGROUNDS: TokenName[] = [
  "ink",
  "white",
  "walnut",
  "green-deep",
  "green-sage",
  "gold-shadow",
  "gold-light",
  "gold-glint",
  "mauve-ink",
  "mauve-accent",
  "error",
  "error-light",
];

const TYPE_SPECIMENS = [
  { role: "Role title", cls: "font-heading text-[clamp(40px,4.4vw,56px)] leading-[1.12] tracking-[-0.02em]", sample: "Product management" },
  { role: "Headline", cls: "font-heading text-[clamp(28px,3vw,42px)] font-bold leading-[1.1] tracking-[-0.022em]", sample: "A map that places every competitor at its measured distance." },
  { role: "Card heading", cls: "font-heading text-[26px] leading-[1.25] tracking-[-0.02em]", sample: "Symptom Visualizer" },
  { role: "Index label", cls: "font-heading text-[28px] font-bold leading-[1.2]", sample: "Design thinking" },
  {
    role: "Body",
    cls: "font-sans text-[18px] leading-[1.6] max-w-[65ch]",
    sample:
      "I take health-tech and AI products from idea to tested prototype and build the business case around them.",
  },
  { role: "Caption, dates", cls: "metadata", sample: "January 2026 – Present   Los Angeles, CA" },
  { role: "Tab, counter", cls: "font-note text-[18px] leading-[1.2]", sample: "2 of 5" },
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
    <td className="border border-rule/30 p-0 align-top">
      <div
        className="flex h-full flex-col gap-1 p-3"
        style={{ backgroundColor: TOKENS[bg], color: TOKENS[fg] }}
      >
        <span className="font-sans text-ui font-medium">Ag</span>
        <span className="font-sans text-[13px] tabular-nums" title={title}>
          {ratio.toFixed(1)}:1 {label}
        </span>
      </div>
    </td>
  );
}

export default function SpecimenPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <header className="mb-16 border-b border-rule/40 pb-8">
        <p className="metadata text-soft">Druid design system</p>
        <h1 className="mt-3 font-heading text-section">Type and colour specimen</h1>
        <p className="mt-4 max-w-[65ch] font-sans text-body text-soft">
          Every value here is generated from the tokens in <code>app/globals.css</code>.
          Contrast ratios are computed at render time, so this page cannot drift from the palette it documents.
        </p>
      </header>

      {/* ---- Type scale ---- */}
      <section aria-labelledby="type-heading" className="mb-20">
        <h2 id="type-heading" className="mb-8 font-heading text-section">
          Type scale
        </h2>
        <dl className="flex flex-col gap-10">
          {TYPE_SPECIMENS.map(({ role, cls, sample }) => (
            <div key={role} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <dt className="metadata pt-2 text-soft">{role}</dt>
              <dd className={cls}>{sample}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ---- Palette ---- */}
      <section aria-labelledby="palette-heading" className="mb-20">
        <h2 id="palette-heading" className="mb-8 font-heading text-section">
          Palette
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(TOKENS) as TokenName[]).map((name) => (
            <li key={name} className="border border-rule/30">
              <div className="h-20 w-full" style={{ backgroundColor: TOKENS[name] }} />
              <div className="p-3">
                <p className="font-sans text-ui font-medium">{name}</p>
                <p className="font-sans text-[13px] text-soft">{TOKENS[name]}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Contrast matrix ---- */}
      <section aria-labelledby="contrast-heading" className="mb-20">
        <h2 id="contrast-heading" className="mb-3 font-heading text-section">
          Contrast matrix
        </h2>
        <p className="mb-8 max-w-[65ch] font-sans text-body text-soft">
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
                <th scope="col" className="metadata p-3 text-left text-soft">
                  on →
                </th>
                {SURFACES.map((bg) => (
                  <th key={bg} scope="col" className="metadata p-3 text-left text-soft">
                    {bg}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FOREGROUNDS.map((fg) => (
                <tr key={fg}>
                  <th scope="row" className="metadata p-3 text-left text-soft">
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
        <h2 id="rules-heading" className="mb-8 font-heading text-section">
          Placement rules
        </h2>
        <ul className="flex max-w-[70ch] flex-col gap-5 font-sans text-body">
          <li>
            <strong className="font-semibold">Gold is metallic, and mostly dark-surface.</strong>{" "}
            <span className="text-soft">
              gold-light and gold-glint carry text only on espresso, brown-rich, green-dark and the mauve
              Index. On pale grounds the readable gold is gold-shadow (6.0:1). gold-base is a gradient stop
              and never carries text.
            </span>
          </li>
          <li>
            <strong className="font-semibold">The Content Card is fixed in both themes.</strong>{" "}
            <span className="text-soft">
              Cream face, walnut text (13.0:1), mauve-ink for card metadata and focus (7.3:1). mauve-accent is
              3.9:1 on cream: list markers and decoration only.
            </span>
          </li>
          <li>
            <strong className="font-semibold">Never signal state with colour alone.</strong>{" "}
            <span className="text-soft">
              The current Index entry gets a glint bullet, the theme switch shows its icon and word, and the
              headline timer fills by length as well as colour.
            </span>
          </li>
          <li>
            <strong className="font-semibold">Focus rings.</strong>{" "}
            <span className="text-soft">
              3px, offset 5px: green-deep on light grounds, gold-light on brown and dark grounds, mauve-ink
              inside cards, gold-glint on the Index.
            </span>
          </li>
          <li>
            <strong className="font-semibold">Dark mode is not an inversion.</strong>{" "}
            <span className="text-soft">
              The page turns from green-led to brown-led. Links and muted text move from green-deep to
              green-sage, and actions flip from a brown-rich fill with white text to a sage fill with ink
              text.
            </span>
          </li>
        </ul>
      </section>

      {/* Focus-ring proof on both surfaces. */}
      <section aria-labelledby="focus-heading" className="mt-16 border-t border-rule/40 pt-10">
        <h2 id="focus-heading" className="mb-6 font-heading text-entry">
          Focus rings — tab through these
        </h2>
        <div className="druid-root flex flex-wrap items-start gap-6 bg-transparent">
          <button type="button" className="druid-button">
            On the page
          </button>
          <div className="druid-section--brown rounded-[20px] p-6">
            <button type="button" className="druid-button">
              On brown
            </button>
          </div>
          <div className="druid-index">
            <ol>
              <li>
                <a href="#focus-heading">
                  <span className="druid-gold-text">On the Index</span>
                </a>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
