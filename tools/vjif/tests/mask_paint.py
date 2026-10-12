# painted layer masks (0.78): freehand and ellipse strokes on layer 2's mask, saved in the set, undone stroke by stroke, read back
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('grad.gif','KeyQ'),('red.gif','KeyW')]):
      await pg.evaluate(f"setTarget({k}); fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(200)
    await pg.evaluate("layers.forEach(L => L.clips.forEach(c => { c.sx = c.sy = 6; c.x = 0; c.y = 0; })); redraw.all = true")
    await pg.click('.layer:nth-child(2) .lmask'); await pg.wait_for_timeout(200)
    r = await pg.evaluate("(() => { const r = pv.getBoundingClientRect(); return [r.x + view.x, r.y + view.y, view.w, view.h]; })()")
    x0,y0,w,h = r
    await pg.mouse.move(x0+w*0.35, y0+h*0.45); await pg.mouse.down(); await pg.mouse.move(x0+w*0.5, y0+h*0.35, steps=8); await pg.mouse.move(x0+w*0.6, y0+h*0.6, steps=8); await pg.mouse.up()
    await pg.click('#maskTool [data-v=ell]')
    await pg.mouse.move(x0+w*0.65, y0+h*0.65); await pg.mouse.down(); await pg.mouse.move(x0+w*0.9, y0+h*0.9, steps=5); await pg.mouse.up()
    await pg.wait_for_timeout(500)
    st = await pg.evaluate("[!!layers[1].mask, !!layers[1].mask.url, hist.undo.length, maskEd && maskEd.li]")
    print('mask', st); assert st[:2] == [True, True] and st[3] == 1, st
    snap = await pg.evaluate("JSON.parse(snapshot()).layers[1].mask ? 'saved' : 'missing'")
    await pg.keyboard.press('Escape'); 
    u = await pg.evaluate("const m0 = layers[1].mask.mid; undo(); [m0, layers[1].mask && layers[1].mask.mid]")
    print('snap', snap, 'undo', u, errs[:3]); assert snap == 'saved' and u[1] != u[0] and u[1] is not None and not errs, (snap, u, errs)
    rt = await pg.evaluate("(() => { const s = JSON.parse(snapshot()).layers[1]; const L = deserLayers([s], performance.now())[0]; return [!!L.mask, L.mask.url === s.mask.url, L.lock]; })()")
    print('round trip', rt); assert rt == [True, True, False], rt
    await b.close()
asyncio.run(main())
