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

What is only in the designer (pieces, the status layer, edges set by hand, stairs/elevator/chair tiles, window and hedge materials) is marked ◇ or reported by the checks as "not in the game yet".

## Counters

A counter is a **counter front** (`{ _ }`, the walkable cells customers stand on, with a line on the side the staff are on) and a **staff row** behind it: a solid counter block `c` at each end, `@` where the clerk stands, `K` the clerk's terminal, as in the hotel (`{__}` over `c@Kc`). The **Counter** tool (`C`) lays all of it in one drag (the loose pieces are folded under Counter parts in the palette): drag along the customer side, the brush facing (`Q` / `E`) says which side the staff stand on, and the Staff row button turns the row behind it off. Needs 3 cells or more for the staff row.

## Saved design format (v3)

`rows` (one character per tile, like the game's `core/hotel.gd`), `ex` (sparse `"x,y"` → `{r?, p?, w?, e?}`: facing 0 south 1 west 2 north 3 east, pieces, walk status, edges), `walk` (derived walkable rows), `edges` (derived: sides you can't cross, per cell), `v: 3`. The game turns `rows` + `ex` into tiles with `Designs.to_tiles()`.

## Versions

The version shows next to the title (`DESIGNER_VERSION` in `src.html`); hover it for the game version the tiles come from. Bump it with every push.

- v6: the Building sizes panel and its size check are gone (mapgen's lot sizes are being redone).
- v5: unscii mcr square tiles (ID-087), the Counter tool and folded Counter parts (TW-091).
- v4: drawn from the game's tile data and atlas (TW-090).
