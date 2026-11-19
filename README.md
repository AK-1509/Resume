# Resume

A project portfolio built on the Druid design system, set on a glassy gradient canvas. The hero fills the first screen: the name, the role line and the way into the work. Then come the **Projects**, one entry per project page at `/projects/<slug>`, each with its research, goals, design and results. A mauve Index is docked on the right edge and jumps to any project, and a mauve Languages card sits at the bottom right. The whole resume still exports as a one-page PDF.

**Live:** <https://resume-phi-roan.vercel.app> · **Specimen:** <https://resume-phi-roan.vercel.app/specimen>

## How content works

All content lives in [`content/resume.json`](content/resume.json), committed to git. There is no database, no CMS, and no write path in the app — the deployed site is a read-only renderer of that one file. Git history *is* the version history of the resume, and every content change is its own commit, so `git log` reads as a changelog.

Content is edited through the `resume-entry` skill, never by hand:

```
/resume-add        # paste a filled template
/resume-edit <id>  # change specific fields on one entry
/resume-delete <id>
/resume-languages
/resume-profile
```

The skill transcribes verbatim — it will not fix a typo, rewrite a bullet, invent alt text, or guess at a filename. Anything it cannot produce, it asks for.

Images live in `public/gallery/<experience-id>/` and are referenced by path from the JSON.

The hero's copy lives in [`content/portfolio.json`](content/portfolio.json), and each project is one file in [`content/case-studies/`](content/case-studies) (copy `_template.json` to add one). Both are edited directly and checked by `npm run validate`.

## Commands

```bash
npm run dev        # dev server on :3000
npm run validate   # schema + filesystem check on resume.json, and portfolio.json against it
npm run build      # validates first, then builds
npm run lint
```

`npm run validate` is the only safety net for remote edits, so it checks more than shape: that every endorsed skill id exists in the registry, that `thumbnailId` names an image in that entry's own gallery, that every image referenced actually exists on disk, that alt text is non-empty, and that no entry ends before it starts. Failures name the field and the fix. It also reports non-fatal notes — orphaned gallery folders, and skills nothing endorses.

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind CSS v4 · Zod · `@react-pdf/renderer` · `@dnd-kit` · `next/font/google`.

The page is statically prerendered.

## Design

Design tokens are CSS custom properties in the `@theme` block of [`app/globals.css`](app/globals.css); no component contains a hex value. [`/specimen`](app/specimen/page.tsx) renders the type scale and a contrast matrix computed live from those tokens, so the documentation cannot drift from the palette.

Two things worth knowing before changing any colour:

- **The mauve cards and the Content Cards are fixed materials.** They look the same in both themes. The Index and Languages cards are mauve with metallic gold labels; the cream Content Cards on project pages carry tables, charts and diagrams over a hatched brown shadow. Tags are gold, and mauve only on brown grounds.
- **Dark mode is not an inversion.** Light is green-led and dark is brown-led. Links move from `green-deep` to `green-sage`, and actions flip from a brown fill to a sage fill. Components use the semantic tokens (`bg-surface`, `text-strong`, `bg-action`, ...), never the raw palette.

Frutiger, Druid's heading face, is not committed because its licence doesn't cover a public repo. Headings use Schibsted Grotesk; captions and dates use Dekko.

## Verification

The checks in `scripts/dev/` are the ones that were actually run at each checkpoint, not a description of them:

```bash
npx tsx scripts/dev/audit.ts          # axe-core, landmarks, focus rings, 200% zoom, both themes
npx tsx scripts/dev/keyboard.ts       # theme switch, skip link and projects, Index dock, phone menu, export dialog, keyboard only
npx tsx scripts/dev/keyboard-export.ts# export incl. drag-reorder, keyboard only
npx tsx scripts/dev/cross-browser.ts  # the engine-sensitive paths in Chromium, Firefox and WebKit
npx tsx scripts/dev/usability.ts      # timed reader tasks, desktop and mobile
npx tsx scripts/dev/export-cases.ts <sparse|typical|overloaded>
npx tsx scripts/dev/shoot.ts          # full-page and per-section screenshots, both themes
```

`export-cases.ts overloaded` needs an oversized `content/resume.json`; it proves the export refuses rather than silently spilling onto a second page.

## Deployment

Vercel project `resume`, linked to this repo and auto-deploying from `main`. A push to `main` is a deploy; there is no separate publish step.

## Seed content

`content/resume.json` currently holds **placeholder entries** — the profile block is real, but the organisations and bullets are invented scaffolding so the layout has something to render. Replace them with `/resume-add` and `/resume-delete`.
