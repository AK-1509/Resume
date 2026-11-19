# Resume site: design critique and rearrange plan

19 November 2026 · Home page (`app/page.tsx`) and case-study pages (`/projects/<slug>`), checked at 1440×900 and 390×844 in light and dark.

Lenses used: Impeccable critique (Nielsen heuristics, cognitive load, detector and browser overlay), the design-critique framework, Emil Kowalski's design engineering (motion and component polish), and tasteskill (one section per screen, the work leads, no captions, one system).

**Fixed constraint:** the Druid colour scheme stays as it is: the palette, both themes, the semantic tokens and the contrast rules in `CLAUDE.md`. Everything else may change: layout, information architecture, type, components, motion and copy structure. Content still follows the repo rules: nothing invented, and `resume.json` changes only through the `resume-entry` skill.

---

## Part 1: Critique

> ⚠️ DEGRADED: single-context. Assessment A (design review) and Assessment B (detector and overlay) ran in one context, not two isolated sub-agents, because this session only spawns sub-agents on an explicit request. Assessment A was written up before the detector output was read.

### Overall impression

The Druid material is distinctive and carefully built, and the accessibility work is unusually thorough. But the page is organised around its own mechanics (a rotating headline drum, four pagers, a 3D slide stack, a docked Index) rather than around the question a recruiter brings: *who is this, what have they done, and how do I reach them?* The biggest opportunity is to collapse four repeated role sections into one body of work, so that the case studies, the strongest content on the site, sit on screen 2 instead of screen 15.

### Measured facts

| Measure | Value |
|---|---|
| Home page height | 21,902px at 1440 (≈24 screens); 20,558px at 390 (≈24 screens) |
| Hero | 1,516px (1.7 screens); the headline card is cut by the fold |
| Each role section | 2,765–3,127px (≈3.2 screens each, four of them) |
| Case studies section | 8,018px for 11 entries (≈9 screens), starting at 13,256px |
| Entry slots vs unique entries | 27 slots in the four role sections for 14 entries; both degrees appear in all four |
| Project slides with a picture | 0 of 6 (every slide shows "VVP placeholder") |
| Case studies with a hero picture | 3 of 11; role placeholder on 8 of 11; report placeholder on 11 of 11 |
| Controls on the first screen | 8 (name, Roles, Case studies, Contact, theme, Export resume, Index, headline card) plus Previous / Pause / Next / See project just below the fold |
| Hand-lettered Dekko text nodes on home | 74 (dates, counters, hints, credentials, labels) |

### Design health score

Mode: **Experience** (a portfolio: the work should lead). Heuristics 7, 9 and 10 are scored n/a: a reader's portfolio has no expert accelerators to offer, no error states and no help system.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Counters, Index marker and tab states are clear; the 7-second headline rotation gives only tiny progress ticks |
| 2 | Match system / real world | 2 | "Roles" in the nav means skill areas, not jobs held; "VVP placeholder"; "Sprint timeline" with no dates; hand-lettered meta reads informal for a PM/BD résumé |
| 3 | User control and freedom | 3 | Pause, Previous/Next, Back to the top and the theme toggle are all there; Esc and focus are handled |
| 4 | Consistency and standards | 2 | Two parallel project systems (role carousels vs case studies; Everplate is in both, unlinked); the same entry rendered 2–4 times; three navigation devices |
| 5 | Error prevention | 3 | The export refuses a PDF that would spill onto a second page; little else to prevent |
| 6 | Recognition rather than recall | 2 | The pager needs a printed instruction ("Drag the gold handle, tap a side, or swipe the pages sideways"); the Index hides behind a vertical tab; comparing a project across roles means remembering where you saw it |
| 7 | Flexibility and efficiency | n/a | Portfolio |
| 8 | Aesthetic and minimalist design | 1 | 24 screens; duplicated entries; public placeholders; cards inside cards; instruction text |
| 9 | Error recovery | n/a | No error states for a reader |
| 10 | Help and documentation | n/a | Portfolio |
| **Total** | | **16/28 (57%)** | **Acceptable**: significant improvements needed |

### Design specificity verdict

**LLM assessment.** The *visual language* is authored: a green-led light theme and a brown-led dark theme, metallic gold, the mauve Index and the hatched espresso shadows could not be lifted onto another site unchanged. The *structure* is not: a rotating hero headline, tabbed pagers and a 3D card stack are generic showcase mechanics, and here they frame nothing. Every project slide is an empty placeholder, so the most elaborate component on the page displays the absence of the work. The missed opportunity is to let your actual artefacts (the Tunity phone mock-up, the Dock+Puck render, the ChiMED band, the Everplate app screen, the case-study exhibits) carry the page.

**Deterministic scan** (`impeccable detect`, app + components): 3 findings, all in `app/globals.css`.
- `gradient-text` ×2 (lines 473, 476): the Druid metallic gold text. **False positive by brief**: it is part of the fixed colour scheme.
- `bounce-easing` (line 914): the switch thumb's `cubic-bezier(0.34, 1.56, 0.64, 1)`. **Real.**

**Browser overlay** (injected on `/` and `/projects/chimed`; `/` reported 6 anti-patterns, `/projects/chimed` 9):
- `nested-cards` ×3 on home (the project page card inside the track inside the section; the summary card). **Real.**
- `low-contrast` 3.7:1: gold `#d8b96e` "VVP placeholder" label on the dark-green slide gradient. **Real**, and it disappears once placeholders stop shipping.
- `edge-flush-cards`: the pager track. **Intended** by the current design, and removed by this plan anyway.
- `repeating-stripes-gradient`: the Druid hatched shadow. **Kept**: part of the material.
- `low-contrast` 1.0:1 on case-study Content Cards: **false positive**. The detector sampled the espresso hatched shadow under the cream card; axe-core passes those pages in both themes.
- `straggler` ×3 on ChiMED ("automation.", "media.", "(2024–2032)."). **Real**, minor.

### What's working

1. **The Druid material is coherent and specific.** Dark mode is a re-lighting, not an inversion. Gold is used as metal, and mauve is reserved for the Index and Languages, so each colour carries a meaning.
2. **Accessibility and rigour are well above average.** axe is clean in both themes at both widths, focus rings are 3px with offsets, off-screen content is `inert`, reduced motion is honoured, and every number on the page traces to validated content.
3. **The case-study template is the best thing on the site.** It has a clear four-phase story, exhibits drawn from data, cream Content Cards that read as objects, and a rail with an on-this-page list.

### Priority issues

**[P1] The page is organised by four "roles", so it repeats itself for 24 screens.**
*Why it matters:* a recruiter scanning for 30–60 seconds sees the same degrees four times and an executive summary four times, and never reaches the case studies, which start 13,256px down (screen 15). Duplication also makes every entry feel less important.
*Fix:* make every entry appear exactly once. Turn the four roles into **lenses** (filter chips over one body of work, plus a 2×2 capabilities block) instead of sections.
*Commands:* `/impeccable distill`, `/impeccable layout`.

**[P1] The work has no pictures, and the placeholders ship to the public.**
*Why it matters:* the 3D slide stack exists to show images and shows "VVP placeholder" six times. On 8 of 11 case studies, the first thing under the title is "Placeholder for the role"; on all 11, "Placeholder for the report link". At the exact moment a reader is judging the work, the page says it is unfinished.
*Fix:* placeholders render only in development. In production a missing slot drops out, and a project without a picture gets a type-led card (its headline proof set large on a Druid ground) instead of an empty frame.
*Commands:* `/impeccable harden`, `/impeccable clarify`.

**[P1] Two project systems that don't know about each other.**
*Why it matters:* role carousels hold Validex, Symptom Visualizer, Market Distance Matrix, Game Night Studios, Nexus Group and Everplate; the Case studies section holds Tunity, Everplate, ChiMED and eight more. Everplate is in both and the two are not linked. A reader can't tell which list is "the work".
*Fix:* one **Work** index. Every project is one card, and a card with a case study links to it.
*Command:* `/impeccable layout`.

**[P1] The first screen inverts its own hierarchy.**
*Why it matters:* the name appears twice (header and eyebrow). The H1 role line is 40px at weight 400, while the rotating card under it is 40px at weight 700, so the carousel outweighs the headline. About 55% of the first screen (the right half) is empty canvas. The hero's only actions sit in a 12-item auto-rotating card with Previous / Pause / Next / See project, cut by the fold. The strongest button on the screen is "Export resume", in the header.
*Fix:* a static hero. The name is the H1; one positioning line; three proof figures; two actions (*See the work*, *Download résumé*); and a featured artefact on the right. No rotation.
*Commands:* `/impeccable layout`, `/impeccable typeset`.

**[P2] Three navigation devices, and an interaction that needs instructions.**
*Why it matters:* the header nav, the vertical mauve Index dock and, on case studies, an on-this-page rail plus a "Sprint timeline" that only repeats the rail's four links (no page has dates for it). On a phone the Index tab overlaps the H1 ("Product management an|d"), and the two-row sticky header takes about 14% of the screen. The pager must print "Drag the gold handle, tap a side, or swipe the pages sideways" to be understood.
*Fix:* one header with section anchors and a one-row phone header with a menu; one on-this-page rail on case studies; drop the sprint timeline unless dates exist; replace the drag pager with nothing (see the plan).
*Commands:* `/impeccable distill`, `/impeccable adapt`.

### Persona red flags

**Jordan (first-time visitor, a recruiter):** reads "Roles" in the nav and expects jobs, but gets skill areas. Meets "VVP placeholder" on the first project. Sees "Executive summary" four times. Doesn't know whether to press "See the Validex Health Labs project" in the hero or scroll; the hero says both.

**Casey (on a phone):** 24 screens to the contact card. The two-row sticky header takes ~120px of 844. The Index tab covers the end of the H1. Swipe-to-switch pages competes with vertical scrolling inside every role section, and the case studies start around screen 15.

**Sam (keyboard and screen reader):** well served: a skip link, `inert` hidden pages, visible rings and a pausable rotation. The red flag is volume. The duplicated entries put four copies of the same degrees in the tab order and heading outline, and the headline drum holds 12 items.

### Cognitive load

5 of 8 checks fail, so the load is **high**:
- **Single focus:** fails. The hero has a name, H1, sub-line and credentials, then a rotating card.
- **Visual hierarchy:** fails. The card outweighs the H1.
- **One thing at a time:** fails. Rotation plus controls compete with the H1.
- **Minimal choices:** fails. The first screen has 8 controls, and the hero card adds 4 more.
- **Working memory:** fails. The same projects sit in two systems and four sections.
- Chunking, grouping and progressive disclosure pass.

### Emotional journey

The peak (case studies) comes after four repetitive valleys. The end is a small Contact card beside the Languages card, with no closing statement and no action. Peak–end says the last screen should be strong. Today the strongest screen is buried and the last one is the quietest.

### Motion and component polish (Emil Kowalski lens)

| Before | After | Why |
| --- | --- | --- |
| Hero headline drum: `.pf-line` `transform 900ms` 3D roll, auto-advancing every 7 s | A static hero; if anything enters, one 300ms `opacity` + `translateY(8px)` with `cubic-bezier(0.23, 1, 0.32, 1)`, once on load | UI motion under 300ms; a timed carousel steals attention from the H1 |
| Switch thumb `scale 380ms cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot) | Remove the switch; any remaining toggle at 200ms `cubic-bezier(0.23, 1, 0.32, 1)` | Bounce reads playful and the control is used often |
| Case-study reveals: `cs-rise 800ms`, bars `900ms` with 70ms stagger, pulses staggered 620ms, all triggered on scroll (`DrawOnView`) | Content static on arrival; at most a one-time draw of ≤400ms with a ≤40ms stagger | Scroll-triggered reveals delay reading; long staggers feel slow |
| 3D slide stack with hatched shadows around an empty image | A flat card; hover lift `translateY(-2px)`, picture `scale(1.02)` inside its frame | Depth promises a picture behind; empty depth is noise |
| Press feedback only on case-study buttons (`.cs .druid-button:active`) | `transform: scale(0.97)` on `:active` for every pressable, with `transition: transform 160ms ease-out` | The home page's buttons don't answer a press |
| Glass cards inside glass cards (role page → project page → detail) | One level of Content Card; text, lists and statements on the canvas | Nested cards flatten hierarchy; the detector flags three |
| Hover effects already gated by `(hover: hover) and (pointer: fine)` | Keep | Correct |

### Minor observations

- Dates, counters, hints and credentials use Dekko, a hand-lettered face with Comic Sans as fallback, in 74 places on the home page. It undercuts a PM/BD résumé, and Dekko at 15–16px is the hardest text on the page to read.
- Headings and body share Schibsted Grotesk, which is fine, but the scale has no clear step between the 40px H1 line and the 40px card line.
- Case-study figures carry captions ("Dock+Puck concept photo.") that repeat the alt text.
- Widows in long paragraphs: add `text-wrap: pretty` to paragraphs and `text-wrap: balance` to headings.
- "Highlights" under each project is a collapsed disclosure whose summary reads as a plain small label, so the bullets inside (often the strongest proof) are easy to miss.
- "Back to the top" is repeated on every section header.
- The footer email is the only contact action, set in body size.

### Questions to consider

- What if the first screen showed one piece of finished work instead of describing four kinds of work?
- Does a recruiter need to switch between "Projects" and "Experience" at all, or just scroll past both?
- If a slot is empty today, would the page be stronger without it?

---

## Part 2: Rearrange plan

### Principles

1. **Each thing once.** One card per project, one row per job or degree. Roles become lenses, not containers.
2. **The work leads.** Artefacts from the case studies are the pictures. A project without a picture gets a type-led card, never an empty frame.
3. **One section per screen.** Each home section is one or two screens at 1440×900. The target is ≤9 screens at 1440 and ≤14 at 390, down from 24 and 24.
4. **One system.** One card style, one button pair, one radius scale, one navigation, one heading scale, and Content Cards one level deep.
5. **The palette is untouched.** Grounds are reassigned only within the existing Druid rules: green for work, brown for experience, mauve for languages and the project index, gold for tags and actions on dark grounds.

### New home page (top to bottom)

| # | Section | Height | Ground (existing tokens) | What it holds | Replaces |
|---|---|---|---|---|---|
| 1 | **Hero** | 1 screen | Canvas, green-led | **Left:** name as the H1 (one appearance only); one positioning line (the existing `hero.role`); three proof figures, each a verbatim responsibility bullet, as headlines are today (e.g. *3.4% traffic conversion from 2,000+ impressions*, *94-drug FDA label dataset*, *break-even within eight quarters*); credentials as one quiet line; two actions, **See the work** (primary) and **Download résumé (PDF)** (secondary; it opens the existing export). **Right:** one featured artefact at full height (the Tunity phone mock-up or the Dock+Puck render), linking to its case study | `HeroHeadlines` (drum, 12 headlines, 5 controls) |
| 2 | **Selected work** | 2 screens | `on-green` | One grid of every project. Three **featured** cards (large, with artefact) followed by compact cards for the rest. Filter chips: **All · Product management · Design thinking · Operations · Business development** (5 options). Each card has its title, a one-line slug, gold tags, your role, and a link: to the case study when one exists, otherwise to the demo or GitHub. Picture-less cards are type-led: the headline proof set large on a Druid ground. Validex, Symptom Visualizer, Market Distance Matrix, Game Night, Nexus and Everplate join the 11 case studies; Everplate appears once | The four role pagers, `ProjectCarousel`, the Case studies section |
| 3 | **What I do** | 1 screen | Canvas | A 2×2 of the four capabilities. Each has its executive summary cut to two or three sentences (the full text stays available behind "Read more"), its top skills as gold tags, and "See 5 projects", which sets the Work filter | Four "Executive summary" cards |
| 4 | **Experience and education** | 1–2 screens | `on-brown` | One chronological list (the existing `ExperienceList` disclosure rows) with each job or degree once. Professional first, academic second, full date ranges, endorsed skills inside the opened row | Four experience pages |
| 5 | **Skills and languages** | ≤1 screen | Canvas + mauve card | Skills grouped as technical / domain / soft, with endorsement counts derived at render time; the Languages card (mauve) beside them | The skills strip in each summary; the footer's Languages card |
| 6 | **Close** | 1 screen | Brown (dark) / green (light) | A large-type closing line from your own copy, email as a large link, LinkedIn and GitHub, Download résumé, Based in Los Angeles | Contact card |

**Header (every page):** your name as the home link; then **Work · Experience · About · Contact**; the theme toggle as a labelled icon button; **Download résumé** as the one primary action. Phones get a one-row header with a full-screen menu. The **Index dock is retired** on the home page, because the header anchors do its job and it no longer covers the H1 on phones.

### Case-study pages

| Change | From | To |
|---|---|---|
| Hero | Title, slug line, rings; "Hero picture placeholder" on 8 of 11 | Title, slug line, a meta line (role · team · duration when known) and the artefact large. Without one, a **type-led hero**: the result's lead figure set large (e.g. *Break-even April 2028*), never a placeholder box |
| At a glance | None; the reader must scroll to Results for the outcome | A three-part block under the hero: **Problem** (one sentence), **What I did** (role moves, or omitted), **Outcome** (up to three figures from Results) |
| Role | Placeholder card when empty | Omitted in production when empty; `npm run validate` warns, so you know which pages still need your words |
| Navigation | Rail + sprint timeline (no dates anywhere) + mauve project Index | The rail only ("On this page"), collapsible on phones; the sprint timeline appears only when a page has dates; the mauve card becomes the **project index at the foot**: previous / next with titles, plus "All work" |
| Figures | Content Card + caption | Content Card, no caption (the alt carries the description) |
| Report / demo slots | Labelled empty slots | Shown only with a link |
| Motion | Scroll-triggered draws (800–900ms) | Static content, with at most one ≤400ms draw on first view |

### Type

- Keep **Schibsted Grotesk** for everything (Frutiger stays out of the public repo).
- **Retire Dekko.** Dates, counters and meta become Schibsted 14px, weight 500, `font-variant-numeric: tabular-nums`, with slight tracking.
- One scale, five steps: **64 / 40 / 28 / 20 / 17** (body 17–18, meta 14). The H1 (the name) is the only 64; section heads 40; card titles 28.
- `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs.

### Motion

- **Kept:** one hero entrance on load (≤300ms, strong ease-out), card hover lift of 2px, picture zoom of 1.02 inside its frame, `scale(0.97)` press on every pressable, and a full stop under reduced motion.
- **Removed:** the headline rotation, the 3D slide stack, the drag pager and its bounce, scroll-triggered reveals, and stagger longer than 40ms.

### What this retires in code

`HeroHeadlines`, `RoleSection`, `PageSwitch`, `ProjectCarousel` and the home `IndexDock` go. `ExperienceList`, `LanguagesCard`, `CaseStudyPage`, `Exhibits`, `ThemeToggle` and the export dialog stay and are restyled.

New components: `Hero`, `WorkGrid` (with `WorkCard` in featured, compact and type-led variants), `Capabilities`, `SkillsBlock`, `Close`, `ProjectFooter`.

`content/portfolio.json` changes shape: `roles[]` keeps its id, label and summary, and gains `skills`; `experienceIds` becomes the role → entry mapping that the filters use; `headlines` becomes `proof` (three verbatim bullets) plus `featured` (three project or case-study ids). `portfolioIssues()` and the dev scripts follow: `pager.ts` is retired, and `keyboard.ts`, `usability.ts` and `fixtures.ts` are updated.

### Phases

| Phase | Scope | Ships as |
|---|---|---|
| **0. Brief** | `/impeccable init`: write `PRODUCT.md` (who reads this: recruiters and hiring managers for PM / BD roles in health tech and AI; the main action is contact or download). `/impeccable document`: write `DESIGN.md` with the Druid palette marked fixed | Docs only |
| **1. Quick wins** (no IA change) | Hide placeholders in production; drop the sprint timeline when there are no dates; remove figure captions; fix the Index overlap and the two-row header on phones; add `:active` press states; cut motion to ≤300ms and remove the bounce; add `text-wrap` | One PR |
| **2. Home rebuild** | Hero, Selected work with filters, What I do, the single Experience list, Skills and languages, Close; the new header; the `portfolio.json` schema and validator; dev scripts updated | One PR, behind a preview deploy |
| **3. Case-study revision** | Type-led hero fallback, At a glance, one rail, the project footer, static exhibits | One PR |
| **4. Finish** | Type scale and Dekko removal everywhere; `/impeccable polish`; `audit.ts`, `keyboard.ts`, `cross-browser.ts`, `usability.ts`; re-run `/impeccable critique` | One PR |

### How we'll know it worked

- Home ≤9 screens at 1440 and ≤14 at 390 (from 24 and 24).
- Every entry renders exactly once on the home page.
- Zero placeholders in a production build.
- The first case study is reachable in one scroll from the hero; the `usability.ts` timed task "open a case study" gets faster.
- axe clean in both themes at both widths (as today); the heuristic score rises from 16/28 on a re-run.

### Questions that change the plan

1. **Home structure:** one long page as above (recommended) · a short home plus a separate `/work` page · keep the four role sections, de-duplicated.
2. **Roles:** filter chips over one Work grid plus the 2×2 (recommended) · four short sections without projects · drop roles from the page entirely.
3. **Empty slots:** hidden in production with type-led fallbacks (recommended) · kept as visible reminders · kept only on case studies.
