# 0.98: hovering the preview reads nothing back from the GPU once each GIF's frames have been seen (small per-frame copies
# kept with the frame), and the full-size copies kept for clicks stay under their budget
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('busy.gif','KeyQ'),('grad.gif','KeyW'),('red.gif','KeyE')]):
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(200)
    await pg.evaluate("layers.forEach(L => L.clips.forEach((c, j) => { c.sx = c.sy = 2; c.x = (c.pad - 1) * 400; c.y = 0; })); redraw.all = true; [0, 1, 2].forEach(k => { pads[k].gif.speed = 4; })")
    await pg.evaluate("""window.__r = 0; for (const P of [OffscreenCanvasRenderingContext2D.prototype, CanvasRenderingContext2D.prototype]){ const o = P.getImageData; P.getImageData = function(...a){ __r++; return o.apply(this, a); }; } 0""")
    box = await pg.evaluate("(() => { const r = pv.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()")
    async def sweep():
      for k in range(40):
        await pg.mouse.move(box[0] + box[2] * (0.15 + 0.7 * ((k * 7) % 40) / 40), box[1] + box[3] * (0.35 + 0.3 * (k % 5) / 5)); await pg.wait_for_timeout(60)
      return await pg.evaluate("__r")
    n = [await sweep() for _ in range(7)]   # (0.99.5: 7 sweeps; with the heavier shader each GIF's frames take a few more sweeps to have all been seen); print('readbacks after each sweep', n)
    assert n[-1] == n[-2], ('hover still reads back', n)
    st = await pg.evaluate("[framePxBytes <= FRAMEPX_BYTES, typeof pickClip(0, 0)]"); print(st); assert st[0], st
    await b.close()
asyncio.run(main())
