# 0.99.12 (ID-246): Shift+right-click on LOAD opens the monitor window; it fills from the once-a-second samples
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.wait_for_function("dbg.log.length >= 2", timeout=15000)
    async with pg.expect_popup() as pop:
      await pg.evaluate("$('#load').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, shiftKey: true, button: 2 }))")
    w = await pop.value; await w.wait_for_selector('#tx'); await pg.wait_for_timeout(1500)
    t = await w.inner_text('#tx'); print(t[:300]); assert 'FPS' in t and 'Decoded frames' in t and 'GIF instances' in t, t
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
