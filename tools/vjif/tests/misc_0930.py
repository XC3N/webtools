# 0.99.30 (BG-067 / BG-068): on the GIF level, holding a slider previews the selected GIF's own effect, not the output's
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.evaluate("selectPad(0); fxLvl = 'gif'; selectFx(FXI.colour); const X = fxEd(); X.style = 'duo'; X.on = false; syncFxUI()")
    box = await pg.locator('#fxAmt').bounding_box()
    await pg.mouse.move(box['x'] + box['width'] * 0.5, box['y'] + box['height'] / 2); await pg.mouse.down(); await pg.wait_for_timeout(200)
    held = await pg.evaluate("[fxPrev, gfxPrevId, gfxOn(curGif()), fxLevel(FXI.colour, clock.beat)]")
    await pg.mouse.up(); await pg.wait_for_timeout(200)
    after = await pg.evaluate("[fxPrev, gfxPrevId, gfxOn(curGif())]")
    print(held, after); assert held == [None, 'colour', True, 0] and after == [None, None, False], (held, after)
    await pg.evaluate("fxLvl = 'out'; syncFxUI()")
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
