# 0.99.29: new styles after shaders.com's list (our own GLSL): Colour › Duotone, Pixel › Halftone, Wobble › Swirl
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("""(() => {
      const src = new OffscreenCanvas(W, H), sx = src.getContext('2d'), g = sx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff'); sx.fillStyle = g; sx.fillRect(0, 0, W, H);
      const dst = new OffscreenCanvas(W, H).getContext('2d'), px = (x, y) => [...dst.getImageData(x, y, 1, 1).data.slice(0, 3)];
      const run = (id, st, k) => { const M = fxMix(0).get('out'); const i = FXI[id]; M.lv[i] = 1; M.env[i] = 1; M.style[i] = st; if (k) Object.assign(M, k(M, i)); const U = fxU(0, M); post.run(U, src, dst, 30); };
      run('colour', 'duo', (M, i) => { const d = M.duo.slice(); d[i] = 4; return { duo: d }; }); const dark = px(4, H / 2), light = px(W - 4, H / 2);
      run('pixel', 'tone', (M, i) => { const s = M.size.slice(); s[i] = 48; return { size: s }; }); let on = 0, off = 0; for (let x = W * 0.3 | 0; x < W * 0.3 + 96; x += 3){ const v = px(x, 300)[0]; if (v > 60) on++; else off++; }
      run('wobble', 'swirl'); const sw = px(W / 2 + 60, H / 2 - 60);
      return [dark, light, on > 2 && off > 2, FX_DEFS[FXI.wobble].styles.map(s => s[0]).join(), rateAlt(FX_DEFS[FXI.colour], 'duo', {}).label]; })()""")
    print(r)
    assert r[0][0] > r[0][2] or r[0][0] > 30, r   # Fire: shadow dark red
    assert r[1][0] > 200 and r[1][1] > 180 and r[1][2] < 120, r   # highlight gold
    assert r[2] and r[3] == 'wave,ripple,swirl' and r[4] == 'Colours', r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
