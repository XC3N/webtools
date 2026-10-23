# 0.99.10 (TW-034): a mostly black GIF (black bat on see-through) is detected as dark; its chip has the light grey outline, selected or not
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    k = await pg.evaluate("pads.map((_, i) => i).find(isGlobalPad)")
    await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function(f"pads[{k}].gif")
    await pg.evaluate(f"fire({k}, clock.beat)"); await pg.wait_for_function("layers[3].row.querySelector('.chip')", timeout=20000); await pg.wait_for_timeout(600)
    r = await pg.evaluate("[...layers[3].row.querySelectorAll('.chip')].map(c => [c.classList.contains('dk'), getComputedStyle(c).boxShadow])")
    print(r); assert r and r[0][0] and '184, 184, 184' in r[0][1], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
