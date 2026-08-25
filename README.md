# Resume

An interactive resume. Every experience is a card you can open; every skill in the index at the foot of the page filters the sections above; a filtered view is a shareable URL; and the whole thing exports as a one-page PDF.

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

## Commands

```bash
npm run dev        # dev server on :3000
npm run validate   # schema + filesystem check on content/resume.json
npm run build      # validates first, then builds
npm run lint
```

`npm run validate` is the only safety net for remote edits, so it checks more than shape: that every endorsed skill id exists in the registry, that `thumbnailId` names an image in that entry's own gallery, that every image referenced actually exists on disk, that alt text is non-empty, and that no entry ends before it starts. Failures name the field and the fix. It also reports non-fatal notes — orphaned gallery folders, and skills nothing endorses.

## Stack

Next.js 16 (App Router) + TypeScript · Tailwind CSS v4 · Zod · `@react-pdf/renderer` · `@dnd-kit` · `next/font/google`.

The page is statically prerendered. Filter state syncs to `?skills=…` through the history API rather than the router, which keeps it that way.

## Design

Design tokens are CSS custom properties in the `@theme` block of [`app/globals.css`](app/globals.css); no component contains a hex value. [`/specimen`](app/specimen/page.tsx) renders the type scale and a contrast matrix computed live from those tokens, so the documentation cannot drift from the palette.

Two things worth knowing before changing any colour:

- **`brass` is a dark-surface colour** — 2.7:1 on `paper`, so it fails text *and* the non-text UI floor on cream.
- **Dark mode is not an inversion** — `claret` is 1.9:1 on `ink`, so `--accent` becomes `brass` there. Components use the semantic tokens (`bg-surface`, `text-strong`, `border-rule`, …), never the raw palette.

The signature element is the **evidence rail**: the left border of each card. Cards are date-ordered, so when a skill filter is active the lit segments show the stretch of a career where that skill was in play, per column.

## Verification

The checks in `scripts/dev/` are the ones that were actually run at each checkpoint, not a description of them:

```bash
npx tsx scripts/dev/audit.ts          # axe-core, landmarks, focus rings, 200% zoom, both themes
npx tsx scripts/dev/keyboard.ts       # modal + lightbox + theme, keyboard only
npx tsx scripts/dev/keyboard-export.ts# export incl. drag-reorder, keyboard only
npx tsx scripts/dev/filter.ts         # AND logic, URL sync, empty state
npx tsx scripts/dev/export-cases.ts <sparse|typical|overloaded>
npx tsx scripts/dev/cross-browser.ts  # Chromium, Firefox, WebKit
npx tsx scripts/dev/usability.ts      # the task-based runs from the brief
npx tsx scripts/dev/shoot.ts          # checkpoint screenshots
```

`export-cases.ts overloaded` needs an oversized `content/resume.json`; it proves the export refuses rather than silently spilling onto a second page.

## Deployment

Vercel project `resume`, linked to this repo and auto-deploying from `main`. A push to `main` is a deploy; there is no separate publish step.

## Seed content

`content/resume.json` currently holds **placeholder entries** — the profile block is real, but the organisations and bullets are invented scaffolding so the layout has something to render. Replace them with `/resume-add` and `/resume-delete`.
