# 0.99.12 (BG-046): no Dither on Grey 6-bit / NES; a colourful pixel doesn't fall to black on CGA 3; Fit range stretches a GIF's own range; the low end of Dither on 2 colours is gentle
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    k = await pg.evaluate("pads.map((_, i) => i).find(isGlobalPad)")
    await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/'busy.gif')]); await pg.wait_for_function(f"pads[{k}].gif")
    r = await pg.evaluate(f"""(() => {{ const g = pads[{k}].gif, ix = n => FX_PALS.findIndex(P => P.n === n);
      const dd = n => {{ g.pal = {{ i: ix(n), d: 0.8 }}; return fxParams(g).palD; }};
      const px = (n, R, G, B) => {{ const P = FX_PALS[ix(n)], q = {{ palN: P.c.length, palF: Array.from(P.f), palOk: Array.from(P.ok) }}; const o = fxColor(R | (G << 8) | (B << 16), q); return [o & 255, (o >> 8) & 255, (o >> 16) & 255]; }};
      g.pal = {{ i: ix('CGA 3'), d: 0, fit: true }}; const f = fxParams(g); const gr = gifRange(g);
      return {{ grey: dd('Grey'), nes: dd('NES'), cga: dd('CGA 3'), blue: px('CGA 3', 60, 120, 200), range: gr, fitP: [f.palLo, f.palHi] }}; }})()""")
    print(r); assert r['grey'] == 0 and r['nes'] == 0 and r['cga'] == 0.8, r
    assert r['blue'] == [85, 255, 255], r['blue']   # a medium blue is light cyan (it was light red)
    assert r['range'][1] > r['range'][0] and r['fitP'][1] > r['fitP'][0], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
