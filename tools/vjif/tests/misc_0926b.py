# 0.99.26: a lone GIF's own blend mode blends with what's under its layer (it did nothing before)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""(() => { const g = pads[0].gif, c = newClip(0), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      const L0 = { ...layers[0], on: true, fillOn: true, fill: '#ffffff', opacity: 1, blend: 'source-over' }, L3 = { ...layers[3], on: true, opacity: 1, blend: 'source-over' };
      const sum = () => { const d = x.getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i+1] + d[i+2]; return s; };
      const go = bl => { c.blend = bl; render([{ L: L0, items: [] }, { L: L3, items: [{ g, e: c, fi: 0 }] }], x, 0, [], 0, [1, 0, 0, 1, 0, 0]); return sum(); };
      const a = go('source-over'), d = go('difference'); return [a, d]; })()""")
    print('blend', r); assert r[0] != r[1], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
