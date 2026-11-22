---
name: language-checker
description: Review a machine translation of the portfolio (a DeepL catalog in content/i18n/<locale>.json) so every string reads like a fluent person talking, not like a machine, while saying exactly what the English says. Rewrites stiff, literal or over-formal translations in place, records why in the catalog's `revised` map, and reports what changed and what needs a native speaker. Use this whenever a translation has just been made or updated (after `npm run i18n:translate`), whenever someone asks whether the Hindi (or any translated) page sounds natural, human, conversational, fluent or "off", and before a translated page ships, even if nobody says "language check".
---

# Language checker

DeepL gets the meaning right far more often than it gets the voice right. Its
first pass tends to be literal: English word order carried over, formal or
bookish words where a person would use an everyday one, a noun where a button
wants a verb, the same term translated two ways on one page. A reader notices
within a line that nobody talks like that. Your job is to be the fluent reader
who fixes those lines, and to touch nothing else.

You are editing someone's own words about their own work. In this repo the
`resume-entry` skill is forbidden from polishing what the person wrote, and the
same spirit holds here: the translation should sound like the person talking in
another language, not like a better copywriter. Natural, yes. More impressive,
never.

## What you are working on

- `content/i18n/<locale>.json` — `strings` maps each English source string
  (the key, exact) to its translation. `revised` maps a source string to a short
  English note on why the check rewrote DeepL's translation. `translator` says
  where the first pass came from.
- `lib/copy.ts` — where every string is used: header and button labels
  (`chromeLabels`), the hero, project tags and one-line summaries, case-study
  key-figure labels, the Languages card. Read it so you know whether a string is
  a button, a tag, a heading or a sentence; that decides how it should sound.
- `npm run i18n -- <locale>` — what is missing, stale, or left as the English.

## How to check

1. **Run the mechanical pass first.** It catches the things a tired eye misses,
   so your reading time goes to voice:

   ```bash
   npx tsx .claude/skills/language-checker/scripts/mechanical.ts <locale>
   ```

   (For a catalog somewhere else, add `--file <path>`.) It flags numbers or names that went missing, inline marks (`==`, `**`) that
   were lost, lengths far off the English, full stops used two ways, and strings
   still in English. Each flag is a question, not a verdict: a brand name kept
   in Latin script is correct, and a flag on it just needs a glance.

2. **Read every pair as a reader would.** For each string, in page order, ask:

   - *Same meaning?* Translate it back into English in your head. If the round
     trip adds, drops or shifts anything (a claim, a number, a date, a hedge,
     who did what), it is wrong however fluent it sounds. Fidelity comes first.
   - *Would a person say it out loud?* Picture an educated speaker explaining
     their portfolio to a colleague. If they would phrase it differently, use
     their phrasing. Watch for English word order, chains of nouns, passive
     constructions English uses and the target language avoids, and formal or
     Sanskritised (or otherwise bookish) vocabulary where an everyday word exists.
   - *Right shape for where it sits?* A button is an action ("See the
     projects" is an invitation, not a noun phrase). A tag stays a tag, a few
     words. A heading is short. A one-line summary is one natural sentence and
     may be reordered freely to get there. Keep labels about as short as the
     English: they sit in fixed layouts.
   - *Consistent?* The same English term should come out the same way across
     the page (Projects in the header, the section title and the Index), and the
     form of address should not wander. Build a small term list as you go.
   - *Names and figures intact?* Product, company and brand names, acronyms and
     numbers stay exactly as written, in Latin script and Latin digits.

3. **Fix only what fails.** Most strings will be fine; leave them alone. A good
   translation rewritten into a different good translation is churn that makes
   the catalog harder to trust. When you do rewrite:

   - Edit the translation only. Never change a key: it must match the English
     on the page character for character, or the string falls back to English.
   - Add an entry to `revised` with the English source as the key and one short
     English sentence saying what was wrong ("Literal word order; reads like a
     form", "Formal coinage, people say X", "Noun phrase on a button, made it an
     invitation"). This is how the catalog tells DeepL's words from yours, and it
     protects the edit: `npm run i18n:translate` keeps revised strings unless run
     with `--all`.
   - If you are unsure whether a phrasing is natural (a regional term, a
     register question you cannot settle), do not guess. Leave DeepL's version
     and list it in the report for a native speaker.

4. **Verify.** Run `npm run i18n -- <locale>` and `npm run validate`, and if a
   dev server is up, look at `/<locale>` at phone and desktop widths: a rewrite
   that is twice as long can break a tag row or a button.

5. **Report**, in this shape, so the person can review your edits quickly:

   ```markdown
   ## Language check: <locale>
   <N> strings read, <R> rewritten, <F> flagged for a native speaker.

   ### Rewritten
   | English | DeepL | Now | Why |
   |---|---|---|---|

   ### Flagged, left as DeepL wrote them
   - "<English>" → "<translation>": <the open question>

   ### Term list
   - <English term> → <translation used everywhere>
   ```

   Keep "Why" to a few words. If nothing needed rewriting, say so plainly; that
   is a good outcome, not a failed check.

## Language notes

Read the file for the locale you are checking before you start. Each holds the
register to aim for, the common machine-translation tells in that language and
how to fix them.

- Hindi (`hi`): `references/hindi.md`

For a language with no notes yet, the method above still works. Write down the
tells you found in a new `references/<language>.md` as you go, so the next check
starts from them.
