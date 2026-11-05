# Building Designer

A claude.ai artifact (a page with a shared database of designs) for drawing buildings, the hotel and parks with the game's own tiles. Designs are saved for everyone on the project; the game's mapgen will read them (ID-078).

| File | What it is |
|---|---|
| `src.html` | the page, with two placeholders: `/*{{GAME}}*/null` and `{{ATLAS}}` (the tile sheet) |
| `game/tiles.json`, `game/tiles.png` | **generated** by the game's `tools/export_designer.py` (tile colours, blocking, the desk tiles, the legend, the unscii mcr tile sheet and the sheet's tile names). Never edit them by hand. |
| `build.js` | `node building-designer/build.js` embeds both into `out/building-designer.html` (not committed) and stops if the script doesn't parse |

## When the game changes a tile

1. In the game repo: `python3 tools/export_designer.py /path/to/webtools/building-designer/game`.
2. Here: `node building-designer/build.js`, then publish `out/building-designer.html` to the artifact's URL (read it first; leave `capabilities` out so `db` + `user` carry forward).
3. Commit `game/` and any `src.html` change.

The designer offers only what the game has. Pieces, the status layer and edges set by hand are designer-side (the game ignores them for now). Older designs may still hold stairs, elevator, chair, window or hedge: they open, the checks list them, and they are no longer in the palette.

## Counters

There is no Counter tool: lay the counter front (`{ _ }`, walkable cells with a line on the staff side) with the pencil and Shift+click, turn it with Select + Q / E, and close the staff row behind it with counter blocks `c`, the staff spot `@` (Actors & spawns) and the clerk's terminal `K` (Devices).

## Saved design format (v3)

`rows` (one character per tile, like the game's `core/hotel.gd`), `ex` (sparse `"x,y"` → `{r?, p?, w?, e?}`: facing 0 south 1 west 2 north 3 east, pieces, walk status, edges), `walk` (derived walkable rows), `edges` (derived: sides you can't cross, per cell), `v: 3`. The game turns `rows` + `ex` into tiles with `Designs.to_tiles()`.

## Versions

The version shows next to the title (`DESIGNER_VERSION` in `src.html`); hover it for the game version the tiles come from. Bump it with every push.

- v7: layout (type + building dropdowns and New on one line, no side panel); toolbar of icons with only Pencil (Shift+click a straight line, Shift+right click picks) and Select (Q / E turn the selected tile); Counter, line, box, fill, pick and rotate tools gone; Resize beside Zoom; every palette group collapsible and regrouped by what things are; stairs, elevator, chair, window and hedge no longer offered; a cell can't be painted past what the game can draw; unreachable cells are an info line.
- v6: the Building sizes panel and its size check are gone (mapgen's lot sizes are being redone).
- v5: unscii mcr square tiles (ID-087), the Counter tool and folded Counter parts (TW-091).
- v4: drawn from the game's tile data and atlas (TW-090).
