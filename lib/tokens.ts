/**
 * The palette, mirrored from the `@theme` block in app/globals.css.
 *
 * This is the ONLY place in the codebase outside globals.css that may contain a
 * hex value, and it exists for exactly one consumer: the /specimen page, which
 * computes and displays contrast ratios. Components style themselves with the
 * Tailwind classes the tokens generate (bg-cream, text-walnut, …) and must never
 * import from here.
 */
export const TOKENS = {
  "green-pale": "#F1F5EF",
  "green-soft": "#DFE9DC",
  "green-sage": "#B8CEB2",
  "green-deep": "#375C48",
  "green-dark": "#1E352B",
  espresso: "#211A16",
  walnut: "#30251E",
  "brown-rich": "#49372A",
  "gold-shadow": "#765728",
  "gold-base": "#B7924B",
  "gold-light": "#D8B96E",
  "gold-glint": "#F4E4BA",
  ink: "#141613",
  white: "#FFFFFF",
  cream: "#F5EFDF",
  "mauve-soft": "#C7A7B7",
  "mauve-accent": "#8D6E82",
  "mauve-ink": "#624557",
  "mauve-index": "#5E4054",
  error: "#8A3638",
  "error-light": "#F0BBB7",
} as const;

export type TokenName = keyof typeof TOKENS;

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 relative luminance. */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = channel((n >> 16) & 0xff);
  const g = channel((n >> 8) & 0xff);
  const b = channel(n & 0xff);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export type Verdict = {
  /** ≥ 4.5:1 — body text at any size. */
  bodyText: boolean;
  /** ≥ 3:1 — text at 24px, or 19px bold. */
  largeText: boolean;
  /** ≥ 3:1 — borders, icons, and other non-text UI that carries meaning. */
  ui: boolean;
};

export function verdict(ratio: number): Verdict {
  return { bodyText: ratio >= 4.5, largeText: ratio >= 3, ui: ratio >= 3 };
}
