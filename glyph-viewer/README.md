# Glyph Viewer

Browse every glyph of unscii-8 mcr (the font Sprawler's square map tiles are drawn from) and the game's tile sheet in slot order, swap which glyph a tile uses (traditional and extended separately), and tidy the glyph categories (Sprawler ID-087).

It runs as a claude.ai artifact with a shared database (`db` and `user` capabilities), so a swap made by anyone it's shared with shows for everyone, live. A web page can't push to GitHub, so the game doesn't read the page directly: with each Sprawler pull request Claude copies the swaps into the game's `assets/tiles/glyph_swaps.json` (the page's **Copy swaps JSON** button produces the same shape) and records the sync in `meta/info`, which the page shows as "in the game" or "not in the game yet".

## Using it

- **unscii-8 mcr**: search by name, glyph, code or category, filter by category (only categories with a match are offered) and by whether the tile sheet uses the glyph. A green dot marks glyphs on the sheet.
- **Tile sheet**: the **Traditional / Extended** switch picks which identity the grid shows. Each tile has two: the traditional glyph (Extended chars off in the game) and an extended one (on). Most map tiles have no extended glyph of their own and use the traditional one until you give them one.
- **Swaps panel** (its own card): for the selected tile, each identity has **Swap glyph…**, which jumps to the unscii list; click a glyph to try it on the tile's colours, then **Confirm swap** or **Cancel**. **Reset** puts the game's glyph back. Below, every swap made (click one to go to that tile) and **Copy swaps JSON**. A dot is amber until the swap is in the game, cyan after. Desk fronts can't be swapped.
- **Categories panel** (its own card, unscii-8 mcr only, for people who can edit): categories start as the Unicode blocks. Select a category in the toolbar to rename it (a block can be reset to its own name) or delete one you made; **Move to…** puts the selected glyph, or everything currently shown, in another category or a new one. Deleting a category sends its glyphs back to their blocks. Categories are only for browsing: they don't go into the game.
- Viewers without write access see swaps and categories but can't change them; without the database the page is a plain viewer.
- A swap re-points a tile to a different unscii glyph. Editing pixels (rotate, mirror) is the planned override editor in the game's `docs/TILES.md`, not built.

## Data

- `swaps/slot-<n>-<trad|ext>`: `{slot, mode, name, cp, was, at}`: the tile, which identity, the unscii code point it now uses, the game's own code point for that identity (-1: none), and when (ISO time). Deleting the doc resets that identity.
- `meta/info`: `{syncedAt, syncedVersion}`: when the swaps were last copied into the game, and the game version that has them. A swap with `at` later than `syncedAt` shows as not in the game yet.
- `cats/names`: `{<id>: name}`; ids are `b<n>` for Unicode block n (a rename) and `c<x>` for a category made on the page; an empty name removes it. `cats/assign`: `{c<HEX>: <id>}`, the category a glyph was moved to (a glyph with no entry is in its block).
- `glyph_swaps.json` (in the game): `{"version": 2, "swaps": [{"slot", "name", "mode": "trad"|"ext", "cp", "glyph": "U+XXXX", "was"}]}`. The baker (`tools/make_tiles.py`) is meant to draw each listed slot and mode from `cp` instead of its glyph in `core/sprawl_map.gd` / `core/entity.gd`.

## Changing the page

- `src.html` is the page (an artifact fragment); `glyph-data.js` is the data, written by `python3 glyph-viewer/make_glyphs.py /path/to/Sprawler` from the game's fonts and tile sheet (rerun it when the tile table changes; never edit it by hand).
- `node glyph-viewer/build.js` inlines the data and writes `glyph-viewer/out/glyph-viewer.html` (not committed). Publish that to the artifact (read the live version first; leave `capabilities` out so it keeps `db` and `user`).

**Live:** Glyph Viewer, https://claude.ai/artifact/Q2S6ce11kjvh8WVLgHystq
