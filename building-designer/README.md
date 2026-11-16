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

There is no Counter tool: lay the counter (`{ _ }` cells you can stand on, with a line on the clerk's side) with the pencil and Shift+click, turn it with Select + Q / E, and close the row behind it with solid counter blocks `c`, the clerk's spot `@` (Actors & spawns) and the clerk's terminal `K` (Devices).

## Saved design format (v3)

`rows` (one character per tile, like the game's `core/hotel.gd`), `ex` (sparse `"x,y"` → `{r?, p?, w?, e?}`: facing 0 south 1 west 2 north 3 east, pieces, walk status, edges), `walk` (derived walkable rows), `edges` (derived: sides you can't cross, per cell), `v: 3`. The game turns `rows` + `ex` into tiles with `Designs.to_tiles()`.

## Versions

The version shows next to the title (`DESIGNER_VERSION` in `src.html`); hover it for the game version the tiles come from. Bump it with every push.

- v9: game 0.17.30 tiles (dumpster `D`); "Building Blocks" heading; two boxes show the glyph each mouse button holds; counter tiles renamed (no "counter block" / "staff row"); an empty floor cell on the outline that no inside floor touches counts as open ground, not a gap.
- v25: with an odd number of columns or rows the middle one is tinted instead of drawing a line.
- v24: a Grid button (and G) shows grid lines between cells with the middle axes in amber; the choice is remembered in the browser.
- v23: the middle button drags the view (right-drag paints again, as before). v22 had right-drag panning, which is gone.
- v21: the mouse wheel over the view zooms in and out around the pointer (it turns Fit off).
- v20: drag the view to pan it when it is bigger than the window (zoom Fit off): the middle button anywhere, or the right button with the Select tool; with the pencil the right button still paints the second tile.
- v19: a Clear button empties the grid back to a plain outline of the same size (undoable).
- v18: the left side holds only the design view; the design picker, name, save, tools and view buttons moved into the right panel (the zoom Fit follows the panel width).
- v17: the design view fits the whole building in the window with no scroll bar: a Fit box picks the biggest whole-number zoom that shows it all (turn it off, or move the zoom slider, to choose yourself; zoom goes up to 8).
- v16: drag the bar beside the Building Blocks panel to resize it (double click resets; the width is remembered in the browser).
- v15: the Building Blocks panel is wider (560 px) with the categories in columns; the left/right boxes are small and sit at the top right.
- v14: the Building Blocks panel scrolls on its own and stays in view; the page no longer scrolls with it.
- v13: street exit removed from the palette (legacy only); the popup asks Save yes/no before opening another design; Pieces folded into the Tiles palette as "Half & quarter tiles" (modes are now Tiles and Status); wider Building Blocks panel.
- v12: tiles re-exported from game 0.18.6 main (glyph swaps, empty floor and street, locked door); the dumpster and counters draw the game's own tile for their side or run; only half tiles (counter fronts, the dumpster) and pieces have a side; Save as; the Select tool drags a cell to move it (overwrites, Ctrl+Z undoes); a click-and-drag size grid in New and Resize (up to 40 × 32), the old preset sizes are gone.
- v11: toilet (U+1F68D) in Furniture, designer-only for now (ID-106).
- v10: every tile can face a direction; window W (the game's Tile.WINDOW), stairs up/down, elevator and a new escalator back in the palette (ID-100).
- v8: the description block under the title is gone.
- v7: layout (type + building dropdowns and New on one line, no side panel); toolbar of icons with only Pencil (Shift+click a straight line, Shift+right click picks) and Select (Q / E turn the selected tile); Counter, line, box, fill, pick and rotate tools gone; Resize beside Zoom; every palette group collapsible and regrouped by what things are; stairs, elevator, chair, window and hedge no longer offered; a cell can't be painted past what the game can draw; unreachable cells are an info line.
- v6: the Building sizes panel and its size check are gone (mapgen's lot sizes are being redone).
- v5: unscii mcr square tiles (ID-087), the Counter tool and folded Counter parts (TW-091).
- v4: drawn from the game's tile data and atlas (TW-090).
