# 0.99.31: Fit range stretches brightness only, to the palette's own darkest..lightest (BG-046), and holds steady;
# Shadow › Cut on the Floor takes away the far end (TW-072)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("""(() => { const gb = FX_PALS.findIndex(p => p.n === 'GB'), P = FX_PALS[gb];
      const a = fitY(0.2, 0.2, 0.2, 0.2, 0.6, P.ylo, P.yhi), z = fitY(0.6, 0.6, 0.6, 0.2, 0.6, P.ylo, P.yhi), s = fitY(0.4, 0.1, 0.1, 0, 1, 0, 1);
      return [+a[0].toFixed(3), +P.ylo.toFixed(3), +z[0].toFixed(3), +P.yhi.toFixed(3), s.map(v => +v.toFixed(3)).join()]; })()""")
    print('fitY', r); assert r[0] == r[1] and r[2] == r[3] and r[4] == '0.4,0.1,0.1', r
    # a range that jumps frame to frame: the stretch moves slowly (the widest of the last few seconds)
    r = await pg.evaluate("""(() => { const cv = new OffscreenCanvas(48, 27), x = cv.getContext('2d'); const out = [];
      for (let k = 0; k < 120; k++){ x.fillStyle = k % 12 < 6 ? '#202020' : '#e0e0e0'; x.fillRect(0, 0, 48, 27); x.fillStyle = '#808080'; x.fillRect(0, 0, 24, 27); const R = fitRangeOf(cv, 77); out.push(R.palHi - R.palLo); }
      const tail = out.slice(60); return [+(Math.max(...tail) - Math.min(...tail)).toFixed(3)]; })()""")
    print('steady', r); assert r[0] < 0.05, r
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""(() => { const g = pads[0].gif, c = newClip(0); c.y = -330; c.sx = c.sy = 1.6; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      const red = () => { const d = x.getImageData(0, 0, W, H).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] > 150 && d[i + 1] < 80) n++; return n; };
      const go = cut => { g.shadow = { ...g.shadow, on: true, floor: true, cut, soft: 0, op: 1, blur: 0, x: 30, y: 30, col: '#ff0000', turn: false }; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); drawClip(x, c, g, g.src[0]); return red(); };
      return [go(0), go(0.5), go(0.95)]; })()""")
    print('floor cut', r); assert r[0] > r[1] > r[2], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
