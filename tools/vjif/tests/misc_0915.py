# 0.99.15: Esc deselects every GIF; Step mode has a slider (not buttons); Fit + Ping-pong doubles the loop length (and back)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    k = await pg.evaluate("pads.map((_, i) => i).find(isGlobalPad)")
    await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function(f"pads[{k}].gif")
    await pg.evaluate(f"selectPad({k})")
    # slider for step mode
    r = await pg.evaluate("""(() => { const g = curGif(); g.sync = 'step'; syncGifUI(); const el = $('#gSub'); el.value = 2; el.dispatchEvent(new Event('input', {bubbles: true}));
      return [el.tagName, el.type, g.subdiv, el.nextElementSibling.textContent]; })()""")
    print('step', r); assert r[1] == 'range' and abs(r[2] - 4) < 1e-6 and r[3] == '1/16', r
    # ping-pong length
    r = await pg.evaluate("""(() => { const g = curGif(); g.sync = 'stretch'; g.beats = 4; g.loop = 'loop'; syncGifUI();
      $('#gLoop [data-v=pingpong]').click(); const a = g.beats; $('#gLoop [data-v=loop]').click(); return [a, g.beats]; })()""")
    print('pp', r); assert r == [8, 4], r
    # Esc
    await pg.keyboard.press('Escape'); await pg.wait_for_function("$('#gifSettings').classList.contains('disabled')", timeout=15000)
    r = await pg.evaluate("[noSel, curGif(), $('#gifSettings').classList.contains('disabled')]")
    print('esc', r); assert r == [True, None, True], r
    await pg.evaluate(f"selectPad({k})")
    r = await pg.evaluate("[noSel, !!curGif()]"); assert r == [False, True], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
