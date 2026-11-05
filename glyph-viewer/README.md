# Glyph Viewer

Browse every glyph of unscii-8 mcr (the font Sprawler's square map tiles are drawn from) and the game's tile sheet in slot order, and swap which glyph a tile uses (Sprawler ID-087).

It runs as a claude.ai artifact with a shared database (`db` and `user` capabilities), so a swap made by anyone it's shared with shows for everyone, live. A web page can't push to GitHub, so the game doesn't read the page directly: with each Sprawler pull request Claude copies the swaps into the game's `assets/tiles/glyph_swaps.json` (the page's **Copy swaps JSON** button produces the same shape) and records the sync in `meta/info`, which the page shows as "in the game" or "not in the game yet".

## Using it

- **unscii-8 mcr**: search by name, glyph or code, filter by Unicode block (only blocks with a match are offered) and by whether the tile sheet uses the glyph. A green dot marks glyphs on the sheet.
- **Tile sheet**: click a tile for its slot, colours and the glyph it is drawn from. **Swap glyph…** jumps to the unscii list: click a glyph to try it on the tile's colours, then **Confirm swap** or **Cancel**. **Reset** puts the original back. Swapped tiles show a dot: amber until the swap is in the game, cyan after.
- Desk fronts are lines the baker draws, so they can't be swapped. Viewers without write access see swaps but can't change them; without the database the page is a plain viewer.
- A swap re-points a tile to a different unscii glyph. Editing pixels (rotate, mirror) is the planned override editor in the game's `docs/TILES.md`, not built.

## Data

- `swaps/slot-<n>`: `{slot, name, cp, was, at}`: the tile's slot and name, the unscii code point it now uses, the code point the game's sheet was baked from, and when (ISO time). Deleting the doc resets the tile.
- `meta/info`: `{syncedAt, syncedVersion}`: when the swaps were last copied into the game, and the game version that has them. A swap with `at` later than `syncedAt` shows as not in the game yet.
- `glyph_swaps.json` (in the game): `{"version": 1, "swaps": [{"slot", "name", "cp", "glyph": "U+XXXX", "was"}]}`. The baker (`tools/make_tiles.py`) is meant to draw each listed slot from `cp` instead of the glyph in `core/sprawl_map.gd`.

## Changing the page

- `src.html` is the page (an artifact fragment); `glyph-data.js` is the data, written by `python3 glyph-viewer/make_glyphs.py /path/to/Sprawler` from the game's fonts and tile sheet (rerun it when the tile table changes; never edit it by hand).
- `node glyph-viewer/build.js` inlines the data and writes `glyph-viewer/out/glyph-viewer.html` (not committed). Publish that to the artifact (read the live version first; leave `capabilities` out so it keeps `db` and `user`).

**Live:** Glyph Viewer, https://claude.ai/artifact/Q2S6ce11kjvh8WVLgHystq
