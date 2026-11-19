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

The page implements the Druid design system: a green-led light theme and a brown-led dark theme on a glassy gradient canvas built from the palette, with frosted glass containers floating on it. The portfolio is built around the projects. The hero (`Hero`) fills the first screen on its own: the name, the role line, the sub-line, the credentials, and two actions (See the projects, Get in touch). Then comes **Projects** (`CaseStudyCards`), one entry per project page, set straight on the canvas and each one link to its page; then contact and Languages. There are no role sections. The Index is a mauve card docked behind a tab on the right edge that lists the projects and scrolls to each entry (on a project page it lists the project pages); on a phone the tab sits at the foot of the screen and opens upwards. Languages is a mauve card at the bottom right. On a phone the glass header is one row, with the site links (Projects, Contact) behind a menu button. The palette is fixed. All of it lives in `app/globals.css`.

Motion stays quick: interface transitions are 300ms or less, staggers 40ms or less, no overshoot or bounce easing, and every button gives a small press (`scale(0.97)`). Hover effects are gated to fine pointers, and everything rests under reduced motion.

`docs/design/critique-and-rearrange-plan.md` holds the design critique and its phased rearrange plan. Its phase 1 shipped; its home-page plan was replaced by the structure above (no role sections, the projects as the body of the page).

## Contrast constraints

- **Gold is metallic, and mostly a dark-surface colour.** `gold-light` and `gold-glint` carry text only on `espresso`, `brown-rich`, `green-dark`, `walnut` and `mauve-index`. On pale grounds the readable gold is `gold-shadow`. `gold-base` is a gradient stop and never carries text.
- **Tags are gold.** Small container fills (`.druid-tag`) are `gold-light` with `walnut` text (7.1:1). `mauve-soft` is allowed only on brown grounds (`.on-brown`), never on green pages, glass or cards. `mauve-accent` is decorative only, and so are the wire greens (1.5:1).
- Never signal state with colour alone. Pair it with weight, fill, border, or a mark (the Index's current entry gets a glint bullet).
- Focus rings: 3px, offset 5px. `green-deep` on light grounds, `gold-light` on brown and dark grounds, `mauve-ink` inside cards, `gold-glint` on the Index.
- **Dark mode is not an inversion.** Links and muted text move from `green-deep` to `green-sage`, and actions flip from a `brown-rich` fill with white text to a `green-sage` fill with `ink` text.
- **Fonts.** Frutiger is Druid's heading face, but its licence does not cover this public repo. Headings run on Schibsted Grotesk, the system's own fallback. Do not commit Frutiger files.

## Theming

Components style themselves from the **semantic** tokens: `bg-surface`, `bg-panel`, `text-strong`, `text-soft`, `border-rule`, `text-accent`, `bg-action`, `text-on-action`. Raw palette names (`bg-cream`, `text-gold-light`, ...) are correct only inside the fixed materials: the mauve Index and Languages cards, the cream Content Cards on project pages, and tags. A coloured ground is applied with `.on-green` or `.on-brown`, which also re-point the link, button, focus and soft-text colours for everything inside.

The page's Druid material is the `druid-*` and `pf-*` classes in the components layer of `globals.css`. It is scoped to `.druid-root`, so the export dialog renders outside that wrapper and keeps its own Tailwind styling.

The applied theme lives on `<html data-theme>`, set by an inline script in `app/layout.tsx` before first paint, so a dark-mode visitor never sees a light flash. That element is the source of truth; `ThemeToggle` subscribes to it with `useSyncExternalStore` rather than mirroring it into React state.

`/specimen` renders the live contrast matrix. Check there before placing a new colour.

## Presentation content

`content/portfolio.json` holds the hero's own copy: the role line under the name, the sub-line and the credentials. It is not resume content and is edited directly; `PortfolioSchema` in `lib/schema.ts` checks it at build and in `npm run validate`.

`content/resume.json` no longer renders on the portfolio page itself. It feeds the profile (name, email, links, location), the Languages card and the PDF export.

## Projects

The site calls them **Projects**; the code and the content folder still call them case studies. `content/case-studies/<slug>.json` is one project page at `/projects/<slug>`, an entry in the portfolio's Projects section, and a line in the Index. It is presentation content, edited directly, and checked by `CaseStudySchema` and `caseStudyIssues()` in `lib/schema.ts` at build and in `npm run validate`.

- To add a project, copy `_template.json`, rename it to the slug and set `slug` to match. A leading underscore marks a template: it is never published, and in dev it previews at `/projects/template`.
- The page is fixed: hero, role, the demo link and navigation pane in a rail, the sprint timeline (only when at least one phase has a date in `timeline`; otherwise it would just repeat the pane), then four phases (research, goals, design, results). Its words sit straight on the canvas, and each phase takes its colour from a soft field behind it, green and warm gold in turn, with page tokens for its text. Tables, charts and diagrams (the goals table, the roadmap, and the `exchange`, `sizing`, `table` and `bars` exhibits) sit on cream Content Cards (`Sheet` in `components/case/Exhibits.tsx`), which re-point the tokens to walnut and mauve-ink. Steps, statements and lists stay on the canvas. A phase with nothing in it drops out of the page, the timeline and the pane.
- A `figure` exhibit keeps the Content Card frame too, with no caption under it: its block title names the picture and its alt text describes it. A project's entry on the portfolio is set on the canvas, one link round its words and picture, with the id `project-<slug>` that the Index scrolls to.
- Design and results are lists of exhibits (`steps`, `exchange`, `statement`, `list`, `figure`, `sizing`, `table`, `bars`), drawn from data so they theme and read aloud. A table cell of `yes`, `partial` or `no` becomes a mark.
- Inline marks in the problem statement, any `lead` and the role's moves: `==text==` is the gold highlighter, `**text**` is bold.
- Pictures live in `public/case-studies/<slug>/` with their pixel width and height. Nothing is invented: in development an empty role, demo, report or hero picture shows a labelled placeholder; on the live site it drops out (an empty role leaves only the tags, a hero without a picture keeps the rings on wide screens). The switch is `SHOW_PLACEHOLDERS` in `lib/placeholders.ts`.

## Rules for components

- No hex values in components. Style from the tokens in `app/globals.css`; the only mirror is `lib/tokens.ts`, which exists solely for `/specimen`.
- **No component may assume an optional field is populated.** In `resume.json`, `summary` is often `""`, `gallery` is often `[]`, `thumbnailId` is often `null`, and `organization` is `""` for personal projects; in a project file, any block may be empty. The skill is forbidden from filling these in, so a component that looks broken when one is empty is a component bug. Placeholders never reach the live site: gate them on `SHOW_PLACEHOLDERS` from `lib/placeholders.ts`.
- Only what is on screen is in the reading and tab order: a closed Index card, a closed phone menu and a hidden dialog take no focus.

- The export dialog is lazily loaded (`next/dynamic`) because it pulls in `@dnd-kit` and, through it, `@react-pdf/renderer` — about 1.2 MB that a reader never needs. Keep heavy imports behind that boundary; a static import of `./export/ExportDialog` anywhere would undo it.

The annotated content schema lives in `lib/schema.ts`, next to the code that enforces it.

## Verifying a change

`scripts/dev/` holds the checks used at each checkpoint: `audit.ts` (axe, landmarks, focus rings, 200% zoom, both themes; pass a `/projects/<slug>` URL to audit a project page), `keyboard.ts` (theme switch, skip link and projects, Index, phone menu, export dialog, keyboard only), `keyboard-export.ts`, `cross-browser.ts` (Chromium, Firefox, WebKit), `usability.ts` (timed reader tasks at both viewports), `export-cases.ts` and `shoot.ts`. Run the relevant ones rather than describing the behaviour; to check what ships, run them against the `resume-prod` preview (a production build on port 3100), where placeholders are off. Their targets come from `content/case-studies` through `scripts/dev/fixtures.ts`, never hardcoded titles.

Two environment notes that will otherwise cost time:

- Next 16 caches optimised images at `.next/dev/cache/images`, not `.next/cache/images`. Swapping an image without changing its filename needs that cleared.
- `tsx` compiles with esbuild's `keepNames`, which injects a `__name` helper. Any named function inside a `page.evaluate()` body will throw `__name is not defined` in the browser — inline the logic instead.
