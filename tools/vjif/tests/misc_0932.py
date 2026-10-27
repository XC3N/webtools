# 0.99.32 (ID-254): more styles after shaders.com's list (our own GLSL): Glitch › Sort, CRT › Film, Zoom › Bulge / Pinch, Strobe › Rays
import asyncio, base64, os
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(__file__), 'out'); os.makedirs(OUT, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("""(async () => {
      const src = new OffscreenCanvas(W, H), sx = src.getContext('2d'); sx.fillStyle = '#102030'; sx.fillRect(0, 0, W, H);
      sx.fillStyle = '#fff'; sx.beginPath(); sx.arc(W * 0.3, H * 0.3, H * 0.12, 0, 7); sx.fill();
      for (let i = 0; i < 12; i++){ sx.fillStyle = i % 2 ? '#f0e040' : '#203040'; sx.fillRect(W * 0.55 + i * W * 0.03, H * 0.2, W * 0.03, H * 0.4); }
      sx.strokeStyle = '#8cf'; sx.lineWidth = 4; for (let x = 0; x <= W; x += W / 16){ sx.beginPath(); sx.moveTo(x, 0); sx.lineTo(x, H); sx.stroke(); } for (let y = 0; y <= H; y += H / 9){ sx.beginPath(); sx.moveTo(0, y); sx.lineTo(W, y); sx.stroke(); }
      const dst = new OffscreenCanvas(W, H).getContext('2d'), base = src.getContext('2d'), px = (c, x, y) => [...c.getImageData(x | 0, y | 0, 1, 1).data.slice(0, 3)];
      const run = (id, st, k) => { const M = fxMix(0).get('out'); const i = FXI[id]; M.lv[i] = 1; M.env[i] = 1; M.style[i] = st; if (k) Object.assign(M, k(M, i)); const U = fxU(0, M); post.run(U, src, dst, 30); return U; };
      const shot = async () => { const bl = await dst.canvas.convertToBlob(); const a = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); return btoa(s); };
      const R = {}, sh = {};
      const diff = (x0, y0, x1, y1) => { let n = 0, d = 0; for (let x = x0; x < x1; x += 7) for (let y = y0; y < y1; y += 7){ const a = px(dst, x, y), c = px(base, x, y); d += Math.abs(a[0] - c[0]) + Math.abs(a[1] - c[1]) + Math.abs(a[2] - c[2]); n++; } return d / n; };
      run('glitch', 'sort', (M, i) => { const s = M.size.slice(); s[i] = 200; return { size: s }; }); R.sort = [px(dst, W * 0.3, H * 0.3 + H * 0.12 + 20), px(base, W * 0.3, H * 0.3 + H * 0.12 + 20), diff(0, 0, W, H)]; sh.sort = await shot();
      run('rgb', 'film'); R.film = diff(0, 0, W, H); sh.film = await shot();
      run('zoom', 'bulge'); R.bulge = [px(dst, W * 0.5 + 40, H * 0.5), diff(W * 0.3, H * 0.3, W * 0.7, H * 0.7), diff(0, 0, 40, 40)]; sh.bulge = await shot();
      run('zoom', 'pinch'); R.pinch = diff(W * 0.3, H * 0.3, W * 0.7, H * 0.7); sh.pinch = await shot();
      const U = run('strobe', 'rays'); R.rays = [U.strobe, U.rays, px(dst, W * 0.4, H * 0.4), px(base, W * 0.4, H * 0.4)]; sh.rays = await shot();
      { const f = document.createElement('canvas'); f.width = 104; f.height = 96; const fx = f.getContext('2d'); fx.fillStyle = '#000'; fx.beginPath(); fx.arc(52, 48, 30, 0, 7); fx.fill();   // TW-034: a black subject on see-through
        const g = { crisp: false }, u = gifThumb(g, f), im = new Image(); im.src = u; await im.decode(); const c = document.createElement('canvas'); c.width = 52; c.height = 48; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const at = (a, b) => [...x.getImageData(a, b, 1, 1).data]; R.line = [g.thumbDark, g.thumbLine, at(26, 24 - 15 - 1), at(2, 2)[3], at(26, 24)]; }
      R.names = ['zoom', 'glitch', 'rgb', 'strobe'].map(id => FX_DEFS[FXI[id]].styles.map(s => s[0]).slice(-2).join());
      return [R, sh]; })()""")
    R, sh = r
    for k, v in sh.items(): open(os.path.join(OUT, f'fx0932_{k}.png'), 'wb').write(base64.b64decode(v))
    print(R)
    assert R['sort'][2] > 8, R   # runs re-ordered
    assert R['film'] > 6, R
    assert R['bulge'][1] > 10 and R['bulge'][2] < 3, R   # middle moved, the corner not
    assert R['pinch'] > 10, R
    assert R['rays'][0] == 0 and R['rays'][1] > 0.9 and sum(R['rays'][2]) > sum(R['rays'][3]) + 15, R   # light between the disc and the middle
    assert R['names'] == ['bulge,pinch', 'keyfr,sort', 'crypt,film', 'degauss,rays'], R
    assert R['line'][0] and R['line'][1] and R['line'][2][0] > 60 and R['line'][2][3] > 100 and R['line'][3] == 0 and R['line'][4][0] < 20, R['line']   # grey ring outside the disc, corners still clear, the disc black
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
