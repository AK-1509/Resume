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

The page implements the Druid design system: a green-led light theme and a brown-led dark theme on a glassy gradient canvas built from the palette, with frosted glass containers floating on it. The portfolio is built around the projects. The hero (`Hero`) fills the first screen on its own: the name, the role line, the sub-line, the credentials, and two actions (See the projects, Get in touch). Then comes **Projects** (`CaseStudyCards`), one entry per project page, set straight on the canvas and each one link to its page; then **Case studies** (`CaseStudyIndex`), a ledger on a brown band (`.on-brown`), one row per company with its kind of work, summary and key figure, each row one link to its page; then contact and Languages. There are no role sections. The Index is a mauve card docked behind a tab on the right edge that lists the projects and then the case studies, each under its own heading, and scrolls to each entry (on a project or case-study page it lists the pages the same way); on a phone the tab sits at the foot of the screen and opens upwards. Languages is a mauve card at the bottom right. On a phone the glass header is one row, with the site links (Projects, Case studies, Contact) behind a menu button. The palette is fixed. All of it lives in `app/globals.css`.

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

## Languages

The portfolio page can be read in more than one language: `/` is English, the source, and `/hi` is Hindi. A language in `resume.languages` whose English name matches a locale in `LOCALES` (`lib/i18n.ts`) becomes a link in the Languages card; choosing it is a client navigation tagged `language`, so the page crossfades into the new words in place and keeps its scroll position. The language being read is marked with `aria-current` and a glint bullet; a link also carries the language's own name (from `Intl.DisplayNames`) in the note hand. Languages without a translation stay plain text.

- Every word on the portfolio page comes from `homeCopy()` / `chromeLabels()` in `lib/copy.ts`, through a translator. Components take their words as props; a string written inline in a component is a string that never gets translated. Names, emails, link labels, titles and key-figure values are left alone.
- A translation is a catalog, `content/i18n/<locale>.json`: English source string → translation, checked by `CatalogSchema` and in `npm run validate`. A missing string reads in English. `revised` records each string the language check rewrote after DeepL, and why.
- `npm run i18n` lists what each catalog is missing; it runs `homeCopy()` with a recording translator, so the list follows the content. `npm run i18n:translate -- <locale>` fills the gaps through DeepL's MCP server (`deepl-mcp-server`, pinned, run on stdio), with `DEEPL_API_KEY` set (in a cloud session whose proxy injects the key, a placeholder: `proxy-injected:fx` for a Free key). The hosted server at mcp.deepl.com takes only its OAuth login, not an API key.
- After every translation run, use the `language-checker` skill: it reads the catalog as a fluent person would, rewrites what sounds machine-made without changing the meaning, and records each rewrite in `revised`.
- To add a language: add it to `LOCALES`, run the translate script and the language check, then look at `/<locale>` in both themes and at phone width. Devanagari is drawn by Noto Sans Devanagari and Dekko's own Devanagari, as non-preloaded partners in the font stacks; a new script needs its partner the same way.
- Project pages, the export dialog and the PDF are English only for now.

## Projects and case studies

The site has two kinds of page: **Projects** (the work built: Tunity, ChiMed, Everplate, ...) and **Case studies** (analysis and strategy for real companies: OcuDrop, GoodRx, ...). The code and the content folder call both case studies. `content/case-studies/<slug>.json` is one page at `/projects/<slug>`, an entry on the portfolio, and a line in the Index. Its `category` (`project`, the default, or `case-study`) says which section it joins; `order` sorts within each. It is presentation content, edited directly, and checked by `CaseStudySchema` and `caseStudyIssues()` in `lib/schema.ts` at build and in `npm run validate`.

- Entry ids come from `entryAnchor()` in `lib/anchors.ts`: `project-<slug>` for a project, `case-<slug>` for a case study. The section titles come from `CATEGORY_LABELS` there.
- A case study's row on the portfolio shows its title, its tags (less the team tag), its `slugLine` and, when set, its `keyFigure` (`value` and `label`): a figure taken from the work itself, never invented. A row without one simply has no figure.
- Both kinds use the same page template. A page's footer and "Next" link stay within its own category.
- A page that is taken down gets a redirect in `next.config.ts` (`/projects/the-doghouse` goes to the portfolio).

- To add a project, copy `_template.json`, rename it to the slug and set `slug` to match. A leading underscore marks a template: it is never published, and in dev it previews at `/projects/template`.
- The page is fixed: hero, role, the demo link and navigation pane in a rail, the sprint timeline (only when at least one phase has a date in `timeline`; otherwise it would just repeat the pane), then four phases (research, goals, design, results). Its words sit straight on the canvas, and each phase takes its colour from a soft field behind it, green and warm gold in turn, with page tokens for its text. Tables, charts and diagrams (the goals table, the roadmap, and the `exchange`, `sizing`, `table` and `bars` exhibits) sit on cream Content Cards (`Sheet` in `components/case/Exhibits.tsx`), which re-point the tokens to walnut and mauve-ink. Steps, statements and lists stay on the canvas. A phase with nothing in it drops out of the page, the timeline and the pane.
- A `figure` exhibit keeps the Content Card frame too, with no caption under it: its block title names the picture and its alt text describes it. A project's entry on the portfolio is set on the canvas, one link round its words and picture, with the id `project-<slug>` that the Index scrolls to; a case study's row has the id `case-<slug>`.
- Design and results are lists of exhibits (`steps`, `exchange`, `statement`, `list`, `figure`, `sizing`, `table`, `bars`), drawn from data so they theme and read aloud. A table cell of `yes`, `partial` or `no` becomes a mark.
- Inline marks in the problem statement, any `lead` and the role's moves: `==text==` is the gold highlighter, `**text**` is bold.
- A page may set `hero.live` to a mockup drawn in code (`components/case/mockups`, ids in `LIVE_MOCKUPS` in `lib/schema.ts`), which takes the hero figure's place: Tunity's phone leans toward a mouse and loops the product's four steps. The figure still stands for the project on the portfolio. A live mockup's screen is `aria-hidden` with a figcaption telling the same story, its only control is a Pause button, and it rests off screen, in a hidden tab, and until Play under reduced motion. Its screen keeps the depicted app's own colours (`--tj-*`, scoped to `.tj`).
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
