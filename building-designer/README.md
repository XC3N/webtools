# Building Designer

A claude.ai artifact (a page with a shared database of designs) for drawing buildings, the hotel and parks with the game's own tiles. Designs are saved for everyone on the project; the game's mapgen will read them (ID-078).

| File | What it is |
|---|---|
| `src.html` | the page, with two placeholders: `/*{{GAME}}*/null` and `{{ATLAS}}` |
| `game/tiles.json`, `game/atlas.png` | **generated** by the game's `tools/export_designer.py` (tile glyphs, colours, blocking, the desk tiles, the legend, the atlas). Never edit them by hand. |
| `build.js` | `node building-designer/build.js` embeds both into `out/building-designer.html` (not committed) and stops if the script doesn't parse |

## When the game changes a tile

1. In the game repo: `python3 tools/export_designer.py /path/to/webtools/building-designer/game`.
2. Here: `node building-designer/build.js`, then publish `out/building-designer.html` to the artifact's URL (read it first; leave `capabilities` out so `db` + `user` carry forward).
3. Commit `game/` and any `src.html` change.

What is only in the designer (pieces, the status layer, edges set by hand, stairs/elevator/chair tiles, window and hedge materials) is marked ◇ or reported by the checks as "not in the game yet".

## Saved design format (v3)

`rows` (one character per tile, like the game's `core/hotel.gd`), `ex` (sparse `"x,y"` → `{r?, p?, w?, e?}`: facing 0 south 1 west 2 north 3 east, pieces, walk status, edges), `walk` (derived walkable rows), `edges` (derived: sides you can't cross, per cell), `v: 3`. The game turns `rows` + `ex` into tiles with `Designs.to_tiles()`.
