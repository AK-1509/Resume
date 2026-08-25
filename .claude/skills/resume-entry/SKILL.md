---
name: resume-entry
description: Add, edit, or delete an entry in content/resume.json. Transcribes the user's exact words verbatim — never rewrites, expands, polishes, or infers content. Use whenever the user wants to change resume content, including adding experiences, education, projects, skills, or gallery images.
---

# Resume entry

You are a form, not a writer. Your job is to move the user's exact text into `content/resume.json` and commit it. Nothing else.

## The one rule

Every character of user-facing content in `resume.json` must be a character the user typed. If you find yourself deciding how to word something, stop and ask instead.

### Prohibited — never do these, even if the result would be better

- Fix spelling, grammar, capitalization, or punctuation
- Add or remove a trailing period on a bullet
- Expand or contract acronyms ("PM" stays "PM"; "Product Manager" stays "Product Manager")
- Strengthen, tighten, or add action verbs to bullets
- Merge, split, reorder, or deduplicate bullets
- Write a summary the user didn't provide — leave it `""`
- Infer `endorsedSkills` from the summary or bullets
- Write alt text or captions
- Substitute a synonym for any word
- Reformat a bullet into parallel structure with its siblings

If content looks wrong, you may say so in one sentence after committing it as given. Do not withhold the commit.

### Permitted — mechanical transforms only

- Trim leading/trailing whitespace
- Normalize dates to `YYYY-MM` (`March 2021` → `2021-03`, `3/2021` → `2021-03`, `present` → `null`)
- Generate `id` deterministically: `slug(organization) + "-" + slug(title)`, where `slug()` = lowercase, non-alphanumerics → `-`, collapse repeats, strip leading/trailing `-`. For entries with no organization, use `slug(title)` alone. On collision, append `-2`.
- Generate each `GalleryItem.id` as `slug(filename without its extension)` — `ingestion-pipeline.png` → `ingestion-pipeline`. On collision within one entry, append `-2`.
- JSON-escape characters as required

New entries are appended to the end of `experiences[]`. Display order is derived from the dates at render time, so position in the array carries no meaning and reordering it only creates diff noise.

## Token discipline

Read only `content/resume.json`. Read `lib/schema.ts` only if validation fails. Do not read components, do not start the dev server, do not screenshot, do not browse the repo.

Edit by targeted insertion or replacement of the affected object. Do not rewrite the whole file.

Collect all missing fields in one message. Never ask field-by-field.

Reply with one line after committing. No summary of what you added, no restating the content back, no next-step suggestions.

## Commands

### `/resume-add`

The user pastes a filled template. Write it, validate, commit.

```
type:             work | education | project
title:            <position | degree | project name>
organization:     <company | institution | client>   (omit if none)
location:         <city, region | Remote>
start:            <YYYY-MM or "March 2021">
end:              <YYYY-MM or "present">
summary:          <one paragraph, or omit>
responsibilities:
- <bullet>
- <bullet>
skills:           <comma-separated skill ids or labels>
images:
- <filename> | <alt text>
- <filename> | <alt text>
thumbnail:        <filename, or omit>
```

Missing `type`, `title`, `location`, or `start` → ask. Everything else may be omitted; write the empty value, don't invent one.

### `/resume-edit <id>`

User supplies only the fields to change. Touch only those fields; leave every other field byte-identical.

- Any field given → replaces that field entirely
- `responsibilities+:` → append the given bullets, leave existing ones untouched
- `responsibilities-: 2, 4` → remove bullets at those 1-indexed positions
- `skills+:` / `skills-:` → same append/remove semantics

### `/resume-profile`

Edits the `profile` block — `name`, `headline`, `location`, `email`, and `links`. Only the fields given change.

```
name:      <full name>
headline:  <one line>
location:  <city, region>
email:     <address>
links:
- <label> | <url>
```

Transcribe exactly as typed. Never correct an address, never normalise capitalisation in a name, never rewrite a headline, and never reorder `links`. If a value looks like a mistake, commit it as given and say so in one sentence afterwards.

### `/resume-languages`

Edits the `languages` array. Same verbatim rule as everything else.

```
languages:   English, Hindi, Marathi, German, Japanese   # replaces the whole list
languages+:  Spanish                                     # appends
languages-:  German                                      # removes
```

Write each language exactly as typed. Never translate a language name, never add or remove a proficiency level, never expand "German (B2)" into anything else, and **never sort the list** — the order the user gives is the order that ships.

### `/resume-delete <id>`

Show the entry's `title`, `organization`, and `id`. Wait for explicit confirmation. Then remove the object and delete `public/gallery/<id>/` if it exists.

## Skills registry

`endorsedSkills` accepts only ids present in `resume.json` → `skills[]`.

Match the user's input against existing `label` values case-insensitively first. If a skill isn't in the registry, stop and ask for its exact label and category (`technical` | `soft` | `domain`). Never guess a category. Never invent a label. Never auto-add.

Ask about all unknown skills at once, in the same message as any other missing fields.

## Gallery images

Images live in `public/gallery/<id>/`.

1. Run `ls public/gallery/<id>/` before writing any image path
2. Link only filenames that appear in that listing
3. If a named file isn't there, stop and list the files that are — do not guess at a near-match, do not correct a typo in the filename

`alt` is required and must be non-empty — the build validation rejects empty alt text. If the user omits alt text for an image, ask for it. Do not write it yourself, and do not fall back to the filename or the caption.

`thumbnail:` must name a file in that same entry's gallery. If omitted, set `thumbnailId: null`.

## After writing

```
npm run validate
```

If it fails, fix only the structural error and re-run. Never resolve a validation error by altering user-supplied text.

Then commit — one content change, one commit:

```
git add content/resume.json public/gallery
git commit -m "content: add <organization> — <title>"
git push
```

`git add public/gallery` stages deletions as well as additions, so a `/resume-delete` that removed a gallery folder is committed by the same two commands.

Use `content: add`, `content: edit`, or `content: remove`. The subject is the entry, not the file.

Reply with exactly one line: the action, the entry, and the short commit hash.
