#!/usr/bin/env python3
"""Build glyph-data.js for the Glyph Viewer from the Sprawler game's own font and atlas.

Usage: python3 make_glyphs.py /path/to/Sprawler
Reads  assets/fonts/DejaVuSansMono.ttf and core/cp437.gd (the atlas's code points).
Writes glyph-data.js next to this script: a sprite sheet (PNG, base64) with every drawable
character in the font at the game's cell size, and a list of [code point, name, block, atlas slot].
Rerun it whenever the game's font or atlas changes.
"""
import sys, re, json, base64, io, pathlib, unicodedata
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

game = pathlib.Path(sys.argv[1])
font_path = game / "assets/fonts/DejaVuSansMono.ttf"
size = 20  # the game's atlas size (tools/make_atlas.py)
cols = 64

BLOCKS = [
    ("Basic Latin", 0x20, 0x7F), ("Latin-1 Supplement", 0x80, 0xFF), ("Latin Extended", 0x100, 0x24F),
    ("IPA and Modifiers", 0x250, 0x36F), ("Greek", 0x370, 0x3FF), ("Cyrillic", 0x400, 0x52F),
    ("Hebrew", 0x590, 0x5FF), ("Punctuation", 0x2000, 0x206F), ("Super/Subscripts", 0x2070, 0x209F),
    ("Currency", 0x20A0, 0x20CF), ("Letterlike", 0x2100, 0x214F), ("Number Forms", 0x2150, 0x218F),
    ("Arrows", 0x2190, 0x21FF), ("Math Operators", 0x2200, 0x22FF), ("Technical", 0x2300, 0x23FF),
    ("Control Pictures", 0x2400, 0x243F), ("Enclosed Alphanumerics", 0x2460, 0x24FF),
    ("Box Drawing", 0x2500, 0x257F), ("Block Elements", 0x2580, 0x259F), ("Geometric Shapes", 0x25A0, 0x25FF),
    ("Misc Symbols", 0x2600, 0x26FF), ("Dingbats", 0x2700, 0x27BF), ("Misc Math A", 0x27C0, 0x27EF),
    ("Supp Arrows A", 0x27F0, 0x27FF), ("Braille", 0x2800, 0x28FF), ("Supp Arrows B", 0x2900, 0x297F),
    ("Misc Math B", 0x2980, 0x29FF), ("Supp Math Operators", 0x2A00, 0x2AFF), ("Misc Symbols and Arrows", 0x2B00, 0x2BFF),
    ("Latin Extended Additional", 0x1E00, 0x1EFF), ("Greek Extended", 0x1F00, 0x1FFF),
    ("Latin Extended C-E", 0x2C60, 0xA7FF), ("Alphabetic Presentation", 0xFB00, 0xFB4F),
    ("Specials and Misc", 0xFE00, 0x1FFFF),
]


def block_of(cp):
    for i, (_, a, b) in enumerate(BLOCKS):
        if a <= cp <= b:
            return i
    return len(BLOCKS) - 1


gd = (game / "core/cp437.gd").read_text()
atlas = [int(x) for x in re.search(r"CODEPOINTS := \[([^\]]*)\]", gd).group(1).split(",")]
slot_of = {}
for slot, cp in enumerate(atlas):
    slot_of.setdefault(cp, slot)

cmap = TTFont(str(font_path)).getBestCmap()
cps = []
for cp in sorted(cmap):
    ch = chr(cp)
    cat = unicodedata.category(ch)
    if cat[0] in "MC" or cat in ("Zs", "Zl", "Zp") and cp != 0x20:
        continue
    cps.append(cp)
for cp in atlas:  # the atlas always shows, even blanks
    if cp not in cps and cp in cmap:
        cps.append(cp)
cps = sorted(set(cps))

font = ImageFont.truetype(str(font_path), size)
asc, desc = font.getmetrics()
cw, ch = round(font.getlength("M")), asc + desc
rows = (len(cps) + cols - 1) // cols
sheet = Image.new("RGBA", (cw * cols, ch * rows), (255, 255, 255, 0))
for i, cp in enumerate(cps):
    cell = Image.new("L", (cw, ch), 0)
    ImageDraw.Draw(cell).text((0, 0), chr(cp), fill=255, font=font)
    white = Image.new("RGBA", (cw, ch), (255, 255, 255, 255))
    white.putalpha(cell)
    sheet.paste(white, ((i % cols) * cw, (i // cols) * ch))
buf = io.BytesIO()
sheet.save(buf, "PNG", optimize=True)

items = []
for cp in cps:
    try:
        name = unicodedata.name(chr(cp))
    except ValueError:
        name = "(no name)"
    items.append([cp, name.title(), block_of(cp), slot_of.get(cp, -1)])

out = pathlib.Path(__file__).with_name("glyph-data.js")
out.write_text("const GLYPH_DATA = " + json.dumps({
    "cell": [cw, ch], "cols": cols, "blocks": [b[0] for b in BLOCKS], "items": items,
    "sheet": "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode(),
}, ensure_ascii=False, separators=(",", ":")) + ";\n")
print(len(cps), "glyphs,", len(atlas), "in the atlas,", round(out.stat().st_size / 1024), "KB")
