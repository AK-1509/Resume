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

## Contrast constraints

The palette is fixed. Two accents fail on cream and must not be reintroduced there:

- **`brass` is a dark-surface colour.** 2.7:1 on `paper`, 2.3:1 on `card` — fails text *and* the 3:1 non-text UI floor. On cream it may appear only as a 1px rule, or as a fill behind `ink`-coloured text. Never as text, never as a border or icon that carries meaning on its own.
- **`sage` is metadata scale, not body scale.** 4.1:1 on `paper` (large text only: ≥24px, or ≥19px bold) and 3.5:1 on `card` (borders and non-text UI only). Any smaller technical text uses `muted`.
- Never signal state with colour alone — pair it with weight, fill, border, or a mark.
- Focus rings: 2px `claret` on light surfaces, 2px `brass` inside `.on-ink` regions.

`/specimen` renders the live contrast matrix. Check there before placing a new colour.

## Rules for components

- No hex values in components. Style from the tokens in `app/globals.css`; the only mirror is `lib/tokens.ts`, which exists solely for `/specimen`.
- **No component may assume an optional field is populated.** `summary` is often `""`, `gallery` is often `[]`, `thumbnailId` is often `null`, `organization` is `""` for personal projects. The skill is forbidden from filling these in, so a component that looks broken when one is empty is a component bug.
- Endorsement counts are derived at render time via `endorsementCounts()`. Never store them.
- Sort direction for every experience list lives in one constant: `SORT_DIRECTION` in `lib/resume.ts`.

The annotated content schema lives in `lib/schema.ts`, next to the code that enforces it.
