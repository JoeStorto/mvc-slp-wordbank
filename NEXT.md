# Where the work stands

Written 2026-10-01. Companion to `LAUNCH.md`, which covers domain, hosting and analytics.
This file covers the **site features**: what is built, what is agreed, what is next.

## Nothing here is committed yet

Last commit is `36bcd4c dev site`. Everything below sits in the working tree, roughly
13,700 insertions, most of it the regenerated `data/words.txt`.

Modified: `app.js`, `spt.js`, `index.html`, `styles.css`, `data/words.txt`,
`scripts/build-data.mjs`, `README.md`, `LAUNCH.md`
New: `data/blocked.txt`, `data/core-words.txt`, `data/scripts.tsv`, `data/nouns.txt`,
`soda.js`, `ladder.js`, `scripts/blocked-source.txt`, `scripts/extra-words.tsv`,
`scripts/stress-fixes.tsv`

To review before committing:

```
python scripts/devserve.py 8800
```

then open <http://127.0.0.1:8800>. Use this rather than `python -m http.server`: it sends
no-cache headers. Without them the browser serves stale JS after an edit, and a change that
works looks broken. That cost a debugging cycle this session.

## Done and verified this session

| Item | Result |
|---|---|
| Pairs tab renamed | "Minimal Pairs & Maximal Oppositions" |
| First-visit layout shift (CLS) | 83px hero jump to **0** at every width |
| SPT syllable structure filter | V, CV, VC, CVC, CCV, CCVC, CVCC, VCC, CCVCC |
| SPT printable | matches Maggie's "Clinic print off" grid exactly |
| Age of acquisition filter | by age 4 / 6 / 8 / 10 |
| Core words category picker | 27 categories, 421 words, all resolving |
| Nonsense words simplified | consonant clusters 20% to 4% |
| Stress defects | 296 multi-primary and 19 no-primary now 0 |
| School-appropriate filter | ~240 words blocked |
| Word pool | 33,417 to **46,179** |

## Decisions already made, do not reopen

- **SODA error patterns**: fronting, stopping, gliding, vocalization, assimilation, cluster
  reduction, final consonant deletion, weak syllable deletion.
- **SODA scope**: all three parts, a reference chart, a word generator per error pattern, and
  a printable scoring sheet.
- **Conversation tasks**: build **both**, the complexity ladder first since it is generative
  and needs no new content, then the topic prompt list once Maggie writes the prompts.
- **Core words**: a category picker, not a single "core words" option. Built.
- **Articulation placement cues**: deferred by Maggie, do not start.
- **Alphabetical word lists**: already existed in the Organize dropdown, nothing to do.

## Next, in order

**Held back from shipping (decided 2026-10-01):** the conversation ladder, and the SODA
vocalization and assimilation patterns. All three are built and verified but not ready for
the live site. How to bring each back is in `docs/wip/README.md`.

### 1. Script training tab  (content ready, not blocked)

Maggie supplied the full content in chat on 2026-10-01: 19 settings (home, school,
playground, restaurant, grocery, doctor, community, transport, workplace, self-advocacy,
conflict, phone, emergency, routines, conversation, repair, breaks), each with communicative
functions, each with phrases banded by length (1-2, 3-4, 5-7, 8+ words).

**Build it to her own schema**, which she set out and which is the right one:

| Phrase | Setting | Function | Length | Skill |
|---|---|---|---|---|
| "Help please" | School | Requesting | 2 words | Request |
| "Can you say that again?" | Any | Repair | 5 words | Communication repair |

So an SLP can filter: Setting = School, Function = Requesting, Length = 3 to 5 words.
Optional extra tags she suggested: age, modality (speech / AAC), prompt level, activity.

**Her phrases are now transcribed into `data/scripts.tsv`**, so this is no longer blocked.
508 phrases, tab separated, with a header row:

```
phrase	setting	function	words	skill
Help me please	Home	Requesting	3	Request
Can you say that again?	Any	Repair	5	Communication repair
```

- 12 settings: Any, Community, Doctor, Emergency, Grocery store, Home, Phone, Playground,
  Restaurant, School, Transportation, Workplace
- 25 functions, 11 skills
- `words` is the actual word count, computed rather than hand-tallied. Band it in the UI
  (1-2, 3-4, 5-7, 8+) rather than storing the band, so exact-length filtering stays possible.
  Current spread: 170 / 144 / 150 / 44.
- `Any` as a setting means the phrase is not tied to a place, for example conversation repair.

The tab needs: setting, function and length filters, a results list, and copy / print /
CSV exports matching the other tabs. Maggie should check the transcription against what she
sent, since it came out of a chat message rather than a file she exported.

Multi-word phrases from her core word list (`all done`, `don't want`, `I need help`) are not
yet in here. They belong here rather than in `core-words.txt`, which holds single words only.

### 2. SODA tab: built 2026-10-01 (`soda.js`)

All three parts. Each pattern defines which words can show it and a transform that computes
the likely error form; the reference chart runs its examples through the same transforms, so
the chart and the generator cannot disagree.

- Pick one pattern (with sound and position where they apply) or "All eight patterns", a
  screener that draws evenly across them.
- Sheet columns: word, target IPA (changed sounds highlighted), likely error IPA, what you
  heard, S / O / D / A boxes, totals row, correct ___ / N.
- Fronting is /k/ and /ɡ/ only. /ŋ/ was dropped because it turned every "-ing" word into a
  "probe" for ordinary casual speech (`joining` as /ˈdʒɔ͡ɪ.nɪn/).
- Gliding is /ɹ/ and /l/ before a vowel only; final /l/ and /ɹ/ are not gliding.
- Cluster reduction keeps the least sonorous consonant (/sp/ to /p/, /sn/ to /s/).
  Syllable-initial clusters only; /Cj/ as in `cute` is not counted.
- FCD: words ending in a single consonant other than /ɹ/, /h/, /w/, /j/.
- WSD: the first unstressed syllable that is not the last (`banana`, `elephant`, `about`).
- Vocalization and assimilation are **not shipped**: written in `soda.js`, left out by its
  `RELEASED` list.
- Vocalization (added 2026-10-01): /l/, /ɹ/ or /ɚ not followed by a vowel becomes a vowel.
  /əl/ and /ɚ/ become /oʊ/ (`apple` "appo", `ladder` "laddo"), other /l/ becomes /ʊ/, /ɹ/
  becomes /ə/. Before a vowel, /ɹ/ and /l/ start the next syllable (`carrion`), so that is
  gliding, not vocalization. Stressed /ɝ/ (`bird`) is not included.
- Assimilation (added 2026-10-01): the first consonant takes the place of articulation of
  the consonant after the first vowel, keeping its own voicing and manner (`dog` "gog",
  `top` "pop", `nap` "map"). Stops and nasals only, regressive only. Filter by velar,
  labial or alveolar harmony.
- The screener draws evenly across the released patterns; the default of 12 words gives two
  each of the six. Raise it to 16 when the other two ship.
- Verified on 1,800 generated rows: every prediction differs from its target, every row has
  a highlighted change, and every WSD row loses exactly one syllable.

### 3. Conversation ladder: built 2026-10-01, **not shipped** (`docs/wip/ladder.js`)

Each row is one target noun at four levels: word, phrase ("find the sun"), sentence
("My friend has the sun outside."), conversation prompt. Frames come from her
"Sentence building" categories, filtered to verbs that take any object
(want, like, see, have, get, find) and places that fit after a noun.

Target words are real nouns, from `data/nouns.txt`, which the build writes from the
part-of-speech column of the AoA source. Plurals are dropped when their singular is in the
dictionary. The four conversation prompts are generic placeholders; the topic prompt list
is still to come from Maggie.

## Open questions for Maggie

- Her core word list and scripts were transcribed from a chat message. Worth her checking
  `data/core-words.txt` (421 words) and `data/scripts.tsv` (508 phrases) against what she sent.
- Inflected forms inherit their base word's age of acquisition, so `rainiest` and `reddest`
  appear in the age-4 band via `rain` and `red`. Fine, or filter them out?
- The SPT sheet prints the cueing hierarchy above the table. Her document does not have it.
  Keep or drop?
- SODA: please review the wording of the reference chart (definitions and examples), and say
  whether /ŋ/ to /n/ should count as fronting. Age norms per pattern were left out on
  purpose; add them if she wants them, with her source.
- Ladder: the four conversation prompts are placeholders. Replace with her topic prompts.
- Tabs: the tool buttons live on the chalkboard, at every width (decided 2026-10-01). The
  board's title, IPA and description change with the selected tool. Each tool has a
  `.board__section` with `data-panel` naming its panel. All six are stacked in one grid
  cell, so the board is always as tall as the tallest and does not jump when switching.
  A new tool needs a tab button and a board section; keep its description to three lines
  so it does not set a new height. Board IPA lines come from the site's own dictionary.
- Print: small-screen rules must be `@media screen and (max-width: …)`. A portrait page is
  about 720px wide, so a bare `max-width: 900px` rule also applies on paper. That is what
  dropped the five cue columns from the SPT printout. The SPT sheet now prints with the
  site's look and fits 10 words on one Letter page.

## Working practice that paid off

Measure before and after, in the browser, and print the numbers. Nearly every defect this
session was found by counting rather than looking: the 83px hero shift, the 20% cluster rate,
the 296 multi-primary stresses, the 13,108 words the Moby gate was eating, and the profanity
that reappeared after a rebuild. Screenshots confirmed; they did not detect.
