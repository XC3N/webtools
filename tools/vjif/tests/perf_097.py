# 0.97: performance — a coloured GIF's frames are worked out once per loop and then reused, and the live scene tile is
# only redrawn when the scene's make-up changes (not as the GIFs play)
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('busy.gif','KeyQ'),('red.gif','KeyW')]):
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(200)
    await pg.evaluate("""window.__n = 0; window.__t = 0; const r = fxGL.render; fxGL.render = (...a) => { __n++; return r(...a); };
      const s = sceneThumb; sceneThumb = (...a) => { __t++; return s(...a); };
      pads.forEach(p => { if (p.gif){ p.gif.pal = { i: 3, d: 0.5 }; scheduleFx(p.gif, 0); } })""")
    await pg.wait_for_function("pads[0].gif.fxC && pads[0].gif.fxC.map.size === pads[0].gif.src.length", timeout=60000)
    await pg.wait_for_timeout(1500)
    a = await pg.evaluate("[__n, __t, drawn]"); await pg.wait_for_timeout(4000); bb = await pg.evaluate("[__n, __t, drawn, pads[0].gif.src.length]")
    print('before', a, 'after', bb)
    assert bb[0] == a[0], ('colour shader ran again for cached frames', a, bb)
    assert bb[1] == a[1], ('scene tile redrawn while nothing changed', a, bb)
    await pg.evaluate("layers.forEach(L => L.clips.forEach(c => { c.x += 40; })); redraw.all = true"); await pg.wait_for_timeout(2500)
    c = await pg.evaluate("__t"); print('after a move', c); assert c > bb[1], 'scene tile not redrawn after a change'
    await b.close()
asyncio.run(main())
