# Not shipped yet

Built and verified on 2026-10-01, held back from the live site until they are ready.
`docs/` is in `.assetsignore`, so nothing here is uploaded.

## Conversation ladder

- `ladder.js`: move back to the repo root.
- `ladder-markup.html`: four snippets, each headed with where it goes in `index.html`
  (board section, tab button, panel, script tag).
- `.assetsignore`: remove the `data/nouns.txt` line so the noun list deploys again.

The ladder's CSS (`.ladder__*`) and `window.SLP.coreGroups` were left in place; nothing
else uses them, and they cost nothing while the tab is absent. `scripts/build-data.mjs`
still writes `data/nouns.txt` on every rebuild.

## SODA: vocalization and assimilation

Both patterns are fully written in `soda.js`. The `RELEASED` list near the top of the file
leaves them out. To ship them, add `"vocalization"` and `"assimilation"` to that list
(after `"gliding"`), then in `index.html` change "six" to "eight" in three places (the
SODA board text, the screener option and the About text) and set the SODA word count
default to 16 so the screener gets two words per pattern.
