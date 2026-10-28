# Test bench

One page, many benches. The test bench is the checklist FYR and Claude work through for a project: Backlog → Queued → Review → Done, each item with a ref (BG / ID / TW / TS / QA / CR), an area, and a thread of notes. Every bench is a claude.ai artifact with its own database, and every bench runs the same page.

This folder is not part of the GitHub Pages build (`build.js` only builds `tools/`). The page only works inside claude.ai, where its database lives.

| File | What it is |
|---|---|
| `bench.html` | the shared page, with `{{…}}` placeholders |
| `benches.json` | one entry per bench: artifact URL, title, name, git link, people, areas |
| `build.js` | `node bench/build.js` → `bench/out/<id>.html` per bench (not committed) |

## Changing the bench

1. Edit `bench.html`. A change made for one project reaches every bench, so keep project-specific wording out of it; that goes in `benches.json`.
2. `node bench/build.js`. It stops if a built page's script doesn't parse.
3. Publish each `bench/out/<id>.html` to its `url` with the Artifact tool. Read the artifact first. Leave `capabilities` out so each bench keeps its `db` and `user` declaration.
4. Commit `bench.html` / `benches.json` with the change.

## Adding a bench

Publish `bench/out/<id>.html` once without a `url` (with `capabilities: {db: {}, user: {}}`), put the new artifact's URL in its `benches.json` entry, then seed `meta/info` (`{version}`) and its first items through the artifact's database.

## Data, per bench

- `meta/info`: `{ version }`, shown at the top.
- `items/<id>`: `{ ref, text, detail?, area, sec: backlog|planned|review|done, done, tag?, plan?, parent?, kind?: bug|tweak, idea?, author?, order?, created, thread: [{ by: you|claude, who?, text, at, edited? }] }`.
- `people` in `benches.json`: with two or more names, a switch in the header picks who is using the page on that browser. Notes get `who`, new items get `author`, and "Yours" shows only what waits on that person. With one name the switch is hidden and the page reads as before.
