# 0.99.34: Fit range on a colour palette: each channel stretched, the colour's own hue kept, vibrance (BG-069). 0.99.33: Fit range keeps the colours: brightening scales the colour (hue and saturation kept) instead of mixing in white; EGA keeps its colours
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("""(() => { const sat = c => (Math.max(...c) - Math.min(...c)) / Math.max(...c), Y = c => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      const a = fitY(0.3, 0.05, 0.05, 0, 0.4, 0, 1), w = fitY(0.4, 0.4, 0.1, 0, 0.4, 0, 1);
      return [+sat([0.3, 0.05, 0.05]).toFixed(2), +sat(a).toFixed(2), +Y(a).toFixed(3), +(Y([0.3, 0.05, 0.05]) / 0.4).toFixed(3), Math.max(...w) <= 1.0001, +Y(w).toFixed(3)]; })()""")
    print('fitY', r); assert r[1] == r[0] and abs(r[2] - r[3]) < 0.002 and r[4] and abs(r[5] - 0.914) < 0.003, r
    r = await pg.evaluate("""(() => { const src = new OffscreenCanvas(W, H), sx = src.getContext('2d');   // a dim picture, every hue
      for (let i = 0; i < 24; i++){ sx.fillStyle = `hsl(${i * 15}, 80%, ${12 + (i % 3) * 8}%)`; sx.fillRect(i * W / 24, 0, W / 24 + 1, H); }
      const dst = new OffscreenCanvas(W, H).getContext('2d'), ega = FX_PALS.findIndex(P => P.n === 'EGA');
      const run = fit => { let U; for (let k = 0; k < 6; k++){ const M = fxMix(0).get('out'), i = FXI.colour; M.lv[i] = 1; M.env[i] = 1; M.style[i] = 'pal'; M.pal = M.pal.slice(); M.pal[i] = ega; M.pfit = M.pfit.slice(); M.pfit[i] = fit ? 1 : 0; M.dith = M.dith.slice(); M.dith[i] = 0; U = fxU(0, M); post.run(U, src, dst, 31); }
        const d = dst.getImageData(0, 0, W, H).data, s = new Set(); for (let i = 0; i < d.length; i += 4 * 97) s.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return s.size; };
      return [run(0), run(1)]; })()""")
    r2 = await pg.evaluate("""(() => { const src = new OffscreenCanvas(W, H), sx = src.getContext('2d'); sx.fillStyle = 'rgb(160,24,96)'; sx.fillRect(0, 0, W, H); sx.fillStyle = '#1b1b1b'; sx.fillRect(0, 0, W * 0.1, H); sx.fillStyle = '#ababab'; sx.fillRect(W * 0.9, 0, W * 0.1, H);   // FYR's graveyard sky, with its scene's range
      const dst = new OffscreenCanvas(W, H).getContext('2d'), ega = FX_PALS.findIndex(P => P.n === 'EGA'), M = fxMix(0).get('out'), i = FXI.colour; M.lv[i] = 1; M.env[i] = 1; M.style[i] = 'pal'; M.pal = M.pal.slice(); M.pal[i] = ega; M.pfit = M.pfit.slice(); M.pfit[i] = 1;
      post.run(fxU(0, M), src, dst, 32); const g = fitCol(0.4, 0.4, 0.4, 0.1, 0.7, 0, 1, 0), c = [160 / 255, 24 / 255, 96 / 255], y = fitCol(...c, 0.106, 0.67, 0.1, 0.9, 1);
      return [[...dst.getImageData(W / 2, H / 2, 1, 1).data.slice(0, 3)].join(), g.map(v => +v.toFixed(3)).join(), y.map(v => +v.toFixed(3)).join() === fitY(...c, 0.106, 0.67, 0.1, 0.9).map(v => +v.toFixed(3)).join()]; })()""")
    print('fitCol', r2); assert r2[0] == '170,0,170' and r2[1] == '0.5,0.5,0.5' and r2[2], r2   # the pink sky matches magenta, not light red; a grey stays grey; the Game Boys keep the brightness stretch
    print('EGA colours (off, fit)', r); assert r[1] >= r[0] and r[1] >= 8, r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
