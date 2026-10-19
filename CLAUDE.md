@AGENTS.md

# Resume

All resume content changes go through the `resume-entry` skill. Do not edit `content/resume.json` directly.

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS v4 · Zod · `@react-pdf/renderer` · `next/font/google`.
No database, no CMS, no auth, no write path in the app — the site is a read-only renderer of `content/resume.json`.

```
npm run dev        # local dev server
npm run validate   # schema + filesystem check on content/resume.json
npm run build      # validates first, then builds
npm run lint
```

## Design system: Druid

The page implements the Druid design system: a green-led light theme and a brown-led dark theme; cream Content Cards with a gradient frame and a hatched cast shadow; a mauve, right-aligned Index with metallic gold labels; shallow 3D motion. The palette is fixed. All of it lives in `app/globals.css`.

## Contrast constraints

- **Gold is metallic, and mostly a dark-surface colour.** `gold-light` and `gold-glint` carry text only on `espresso`, `brown-rich`, `green-dark`, `walnut` and `mauve-index`. On pale grounds the readable gold is `gold-shadow`. `gold-base` is a gradient stop and never carries text.
- **The Content Card is fixed in both themes.** Cream face, `walnut` text, `mauve-ink` for card metadata and focus. `mauve-accent` is 3.9:1 on cream, so it is for markers and decoration only. The wire greens are decorative (1.5:1).
- Never signal state with colour alone. Pair it with weight, fill, border, or a mark (the Index's current entry gets a glint bullet).
- Focus rings: 3px, offset 5px. `green-deep` on light grounds, `gold-light` on brown and dark grounds, `mauve-ink` inside cards, `gold-glint` on the Index.
- **Dark mode is not an inversion.** Links and muted text move from `green-deep` to `green-sage`, and actions flip from a `brown-rich` fill with white text to a `green-sage` fill with `ink` text.
- **Fonts.** Frutiger is Druid's heading face, but its licence does not cover this public repo. Headings run on Schibsted Grotesk, the system's own fallback. Do not commit Frutiger files.

## Theming

Components style themselves from the **semantic** tokens: `bg-surface`, `bg-panel`, `text-strong`, `text-soft`, `border-rule`, `text-accent`, `bg-action`, `text-on-action`. Raw palette names (`bg-cream`, `text-gold-light`, ...) are correct only inside the fixed-material classes: Content Cards, the Index, and brown sections.

The page's Druid material is the `druid-*` and `pf-*` classes in the components layer of `globals.css`. It is scoped to `.druid-root`, so the export dialog renders outside that wrapper and keeps its own Tailwind styling.

The applied theme lives on `<html data-theme>`, set by an inline script in `app/layout.tsx` before first paint, so a dark-mode visitor never sees a light flash. That element is the source of truth; `ThemeToggle` subscribes to it with `useSyncExternalStore` rather than mirroring it into React state.

`/specimen` renders the live contrast matrix. Check there before placing a new colour.

## Presentation content

`content/portfolio.json` holds what the page says *about* the resume: the role sections and the entries each one stacks, the executive summaries, the hero copy, the rotating headlines, and live-demo links. It is not resume content and is edited directly. Its rules are checked by `portfolioIssues()` in `lib/schema.ts`, at build and in `npm run validate`:

- Every id must exist in `resume.json`.
- A headline's role must stack its entry.
- A headline's `proof` must be a responsibility bullet copied word for word.

## Rules for components

- No hex values in components. Style from the tokens in `app/globals.css`; the only mirror is `lib/tokens.ts`, which exists solely for `/specimen`.
- **No component may assume an optional field is populated.** `summary` is often `""`, `gallery` is often `[]`, `thumbnailId` is often `null`, `organization` is `""` for personal projects. The skill is forbidden from filling these in, so a component that looks broken when one is empty is a component bug. A card with no thumbnail shows the labelled VVP placeholder; a card with no demo link shows the empty demo slot.
- Only the front card of a role stack is in the reading and tab order. Cards behind it, and headlines not on the drum, are `inert`.
- Endorsement counts are derived at render time via `endorsementCounts()`. Never store them.
- Sort direction for every experience list lives in one constant: `SORT_DIRECTION` in `lib/resume.ts`.

- The export dialog is lazily loaded (`next/dynamic`) because it pulls in `@dnd-kit` and, through it, `@react-pdf/renderer` — about 1.2 MB that a reader never needs. Keep heavy imports behind that boundary; a static import of `./export/ExportDialog` anywhere would undo it.

The annotated content schema lives in `lib/schema.ts`, next to the code that enforces it.

## Verifying a change

`scripts/dev/` holds the checks used at each checkpoint: `audit.ts` (axe, landmarks, focus rings, 200% zoom, both themes), `keyboard.ts` (theme switch, headline drum, role carousels, Index, export dialog, keyboard only), `keyboard-export.ts`, `cross-browser.ts` (Chromium, Firefox, WebKit), `usability.ts` (timed reader tasks at both viewports), `export-cases.ts` and `shoot.ts`. Run the relevant ones rather than describing the behaviour. Their targets come from `content/resume.json` and `content/portfolio.json` through `scripts/dev/fixtures.ts`, never hardcoded titles.

Two environment notes that will otherwise cost time:

- Next 16 caches optimised images at `.next/dev/cache/images`, not `.next/cache/images`. Swapping an image without changing its filename needs that cleared.
- `tsx` compiles with esbuild's `keepNames`, which injects a `__name` helper. Any named function inside a `page.evaluate()` body will throw `__name is not defined` in the browser — inline the logic instead.
