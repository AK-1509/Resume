# Resume

An interactive resume. Every experience is a card; every skill carries the count of experiences that endorse it; filtering by skill narrows the whole page at once.

**Live:** <https://resume-phi-roan.vercel.app> · **Specimen:** <https://resume-phi-roan.vercel.app/specimen>

## How content works

All content lives in [`content/resume.json`](content/resume.json), committed to git. There is no database, no CMS, and no write path in the app — the deployed site is a read-only renderer of that one file. Git history *is* the version history of the resume, and every content change is its own commit, so `git log` reads as a changelog.

Content is edited through the `resume-entry` skill, never by hand:

```
/resume-add      # paste a filled template
/resume-edit     # change specific fields on one entry
/resume-delete   # remove an entry and its images
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

`npm run validate` is the only safety net for remote edits, so it checks more than shape: that every endorsed skill id exists in the registry, that `thumbnailId` names an image in that entry's own gallery, that every image referenced actually exists on disk, that alt text is non-empty, and that no entry ends before it starts. Failures name the field and the fix.

## Stack

Next.js (App Router) + TypeScript · Tailwind CSS v4 · Zod · `@react-pdf/renderer` · `next/font/google`.

Design tokens are CSS custom properties in the `@theme` block of [`app/globals.css`](app/globals.css); no component contains a hex value. [`/specimen`](app/specimen/page.tsx) renders the type scale and a live contrast matrix computed from those tokens, so the documentation cannot drift from the palette.

The annotated content schema is in [`lib/schema.ts`](lib/schema.ts).

## Deployment

Vercel project `resume`, linked to this repo and auto-deploying from `main`. A push to `main` is a deploy; there is no separate publish step.

## Seed content

`content/resume.json` currently holds **placeholder entries** — the profile block is real, but the organisations and bullets are invented scaffolding so the layout has something to render. Replace them with `/resume-add` and `/resume-delete`.
