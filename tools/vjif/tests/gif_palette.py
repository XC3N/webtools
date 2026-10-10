# GIF › Colour › Palette: snaps to the palette's colours, saved with the set; Smoothing lives in GIF › Play
import asyncio
from _env import DIST, FIX as S, ARGS, OUT
from playwright.async_api import async_playwright
async def m():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'grad.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300)
    await pg.evaluate("$('#gTabs [data-v=colour]').click()")
    await pg.select_option('#gPal', '2'); await pg.wait_for_timeout(200)
    await pg.evaluate("$('#gPalD').value = 1; $('#gPalD').dispatchEvent(new Event('input'))"); await pg.wait_for_timeout(400)
    # count distinct colours in the processed frame
    r = await pg.evaluate("""(() => { const g = pads[0].gif, im = fxImage(g, 0), c = new OffscreenCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, im.width, im.height).data, s = new Set(); for (let i = 0; i < d.length; i += 4) s.add(d[i] + ',' + d[i+1] + ',' + d[i+2]); return [s.size, FX_PALS[2].c.length, JSON.stringify(g.pal)] })()""")
    bb = await pg.locator('#gifSettings').bounding_box(); await pg.screenshot(path=str(OUT/'gpal_ui.png'), clip=bb)
    pv = await pg.locator('#pv').bounding_box(); await pg.screenshot(path=str(OUT/'gpal_pv.png'), clip=pv)
    # saved + reloaded with the set
    await pg.evaluate("touched.save = true"); await pg.wait_for_timeout(2500)
    await pg.reload(); await pg.wait_for_function("store.ready"); await pg.wait_for_timeout(1500)
    r2 = await pg.evaluate("pads[0].gif && JSON.stringify(pads[0].gif.pal)")
    # smoothing now in GIF panel
    r3 = await pg.evaluate("[!!$('#gSmooth').closest('[data-pane=play]'), (() => { selectPad(0); $('#gSmooth').checked = true; $('#gSmooth').dispatchEvent(new Event('change')); return pads[0].gif && pads[0].gif.crisp })()]")
    print('colours', r, '| after reload', r2, '| smoothing', r3)
    ok = r[0] <= r[1] and r2 == '{"i":2,"d":1}' and r3 == [True, False]
    await b.close()
    if not ok: raise SystemExit('FAILED')
    return
    await b.close()
asyncio.run(m())
