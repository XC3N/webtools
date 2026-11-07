#!/usr/bin/env python3
"""Build glyph-data.js for the Glyph Viewer from the Sprawler game's own fonts and tile sheet.

Usage: python3 make_glyphs.py /path/to/Sprawler
Reads  assets/fonts/unscii-8-mcr.hex          the 8 x 8 font the square map tiles are drawn from,
       assets/tiles/unscii_mcr.png + tiles.json   the game's tile sheet and its slot names,
       tools/make_tiles.py, core/sprawl_map.gd, core/entity.gd   how each tile's picture is chosen, and its colours.
Writes glyph-data.js next to this script: two sets, each with a sprite sheet (PNG, base64) and its list of items:
  unscii  every glyph in unscii-8 mcr: [code point, name, block, tile-sheet slot or -1, [[slot, tile name], ...]]
  tiles   the tile sheet itself, in slot order: [slot, name, code point it was drawn from or -1, how, fg, bg, wanted code point,
          traditional code point or -1, extended code point or -1]
Blocks are the Unicode blocks the glyphs actually fall in (fontTools.unicodedata), so none is ever empty.
Rerun it whenever the game's tile sheet or tile table changes.
"""
import sys, re, json, base64, io, pathlib, unicodedata
from PIL import Image
from fontTools import unicodedata as ftu

game = pathlib.Path(sys.argv[1])
sys.dont_write_bytecode = True  # importing make_tiles must not leave a __pycache__ in the game's repo
sys.path.insert(0, str(game / "tools"))
import make_tiles as mt  # the game's own tile baker: its tables say which glyph each tile is drawn from


def name_of(cp):
    try:
        return unicodedata.name(chr(cp)).title()
    except ValueError:
        if cp < 0x20 or 0x7F <= cp < 0xA0:
            return "Control %02X" % cp
        if 0xE000 <= cp <= 0xF8FF:
            return "Private Use %04X" % cp
        return "(no name)"


def blocks_of(cps):
    """Unicode block names in code point order, and each character's index into them."""
    named = [ftu.block(cp) for cp in cps]
    first = {}
    for cp, b in zip(cps, named):
        first.setdefault(b, cp)
    blocks = sorted(first, key=first.get)
    index = {b: i for i, b in enumerate(blocks)}
    return blocks, [index[b] for b in named]


def b64png(img):
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


# ---- the tile sheet: which glyph (or hand drawing, or edge line) each slot's template was made from ----
names = json.loads((game / "assets/tiles/tiles.json").read_text())["names"]
wanted = mt.game_tiles() + [(n, g) for n, g, _ in mt.actors()] + [("HEARD", ord("?"))]
glyph_of = dict(wanted)
plain = {n: p for n, _, p in mt.actors()}
unscii = mt.load_hex(game / "assets/fonts/unscii-8-mcr.hex")

src = (game / "core/sprawl_map.gd").read_text()
colours = dict((n, (fg, bg)) for n, fg, bg in re.findall(r'Tile\.(\w+): \{[^}]*?"fg": "(#\w+)", "bg": "(#\w+)"', src))
ent = (game / "core/entity.gd").read_text()
for kind, body in re.findall(r'^\t"(\w+)": \{(.*?)\n\t\}', ent, re.S | re.M):
    c = re.search(r'"color": "(#\w+)"', body)
    if c:
        colours["actor:" + kind] = (c.group(1), "#0d0f14")
colours["HEARD"] = ("#ffb627", "#0d0f14")

used = {}  # code point -> [[slot, tile name], ...]
tile_items = []
for slot, n in enumerate(names):
    if n in mt.DESK:
        cp, how, want = -1, "edge", -1
    else:
        want = plain[n] if n in mt.PLAIN else glyph_of.get(n, ord("?"))
        if want in mt.HAND:
            cp, how = want, "hand"
        elif want in unscii:
            cp, how = want, "glyph"
        else:
            cp, how = mt.FALLBACK.get(want, plain.get(n, ord("?"))), "fallback"
    if how in ("glyph", "fallback"):
        used.setdefault(cp, []).append([slot, n])
    fg, bg = colours.get(n, ("#c8cbe0", "#0d0f14"))
    # the two identities the game gives a tile: traditional (plain) and extended (Settings > Extended chars); -1 = none
    trad = -1 if how == "edge" else plain.get(n, glyph_of.get(n, ord("?")))
    ext = glyph_of[n] if n in glyph_of and n in plain and glyph_of[n] != plain[n] else -1
    tile_items.append([slot, n, cp, how, fg, bg, want, trad, ext])

tile_png = (game / "assets/tiles/unscii_mcr.png").read_bytes()  # the sheet itself, as the game bakes it
ts = Image.open(io.BytesIO(tile_png)).width // mt.COLS
tiles = dict(
    id="tiles", name="Tile sheet", kind="tiles", cell=[ts, ts], cols=mt.COLS, scale=max(1, round(32 / ts)), zoom=[1, 4, .75],
    crisp=True, items=tile_items, sheet="data:image/png;base64," + base64.b64encode(tile_png).decode())

# ---- unscii-8 mcr: every glyph, 8 x 8 pixels, white on transparent ----
ucps = sorted(unscii)
ucols = 64
urows = (len(ucps) + ucols - 1) // ucols
usheet = Image.new("RGBA", (8 * ucols, 8 * urows), (255, 255, 255, 0))
for i, cp in enumerate(ucps):
    white = Image.new("RGBA", (8, 8), (255, 255, 255, 255))
    white.putalpha(mt.hex_tile(unscii, cp))
    usheet.paste(white, ((i % ucols) * 8, (i // ucols) * 8))
un_blocks, un_block_of = blocks_of(ucps)
unscii_set = dict(
    id="unscii", name="unscii-8 mcr", kind="glyphs", cell=[8, 8], cols=ucols, scale=4, zoom=[1, 4, .75],
    crisp=True, blocks=un_blocks, sheet=b64png(usheet),
    items=[[cp, name_of(cp), un_block_of[i], used[cp][0][0] if cp in used else -1, used.get(cp, [])] for i, cp in enumerate(ucps)])

out = pathlib.Path(__file__).with_name("glyph-data.js")
out.write_text("const GLYPH_DATA = " + json.dumps({"sets": [unscii_set, tiles]}, ensure_ascii=False,
                                                  separators=(",", ":")) + ";\n")
print(f"unscii-8 mcr: {len(ucps)} glyphs in {len(un_blocks)} blocks, {len(used)} used by the tile sheet")
print(f"tile sheet: {len(names)} slots at {ts} px")
print(round(out.stat().st_size / 1024), "KB")
