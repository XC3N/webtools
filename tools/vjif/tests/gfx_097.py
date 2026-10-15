# 0.97: GIF › FX — a GIF's own effects run on that GIF alone (the GIF next to it is untouched), saved with it, Reset all clears them
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('red.gif','KeyQ'),('red.gif','KeyW')]):
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(250)
    await pg.evaluate("layers.forEach(L => L.clips.forEach(c => { Object.assign(c, { sx: 1, sy: 1, x: c.pad === 0 ? -480 : 480, y: 0 }); })); [0, 1].forEach(k => { Object.assign(pads[k].gif, { inF: 0, outF: 0, startF: 0 }); rebuildSeq(pads[k].gif); }); selectPad(0); redraw.all = true")
    PX = """(() => { const k = master.width / W, at = x => [...mctx.getImageData(Math.round((W / 2 + x + 60) * k), Math.round(H / 2 * k), 1, 1).data].slice(0, 3); return [at(-480), at(480)]; })()"""
    await pg.wait_for_function(PX.replace('return [at(-480), at(480)];', 'return at(-480)[0] > 150 && at(480)[0] > 150;'), timeout=20000); a = await pg.evaluate(PX)
    await pg.evaluate("$('#gTabs [data-v=gfx]').click(); document.querySelector('[data-gst=colour] [data-v=invert]').click()"); await pg.wait_for_timeout(1500)
    bb = await pg.evaluate(PX)
    st = await pg.evaluate("[JSON.stringify(pads[0].gif.gfx.colour), !!JSON.parse(snapshot()).pads[0].gfx, $('#gTabs [data-v=gfx]').classList.contains('act'), document.querySelector('[data-gon=colour]').checked, !pads[1].gif.gfx]")
    print('before', a, 'after', bb, st)
    assert a[0] == a[1] and abs(bb[0][1] - (0.2 * a[0][1] + 0.8 * (255 - a[0][1]))) < 12 and bb[1] == a[1], (a, bb)   # (Invert at 80 %)
    assert st == ['{"on":true,"amt":0.8,"style":"invert"}', True, True, True, True], st
    await pg.evaluate("$('#gfxReset').click()"); await pg.wait_for_timeout(1200); c = await pg.evaluate(PX)
    print('reset', c); assert c == a and await pg.evaluate("!pads[0].gif.gfx"), c
    await b.close()
asyncio.run(main())
