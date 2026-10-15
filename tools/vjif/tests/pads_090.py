# 0.90: the Scene pads' second bank (Shift + QWE… plays it, Tab shows it, MIDI plays the bank on show), the Global pads on
# UIO / JKL / M,.; an older scene without bank 2 loads
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k, f in [(0, 'busy.gif'), (24, 'ring.gif'), (9, 'grad.gif')]:
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
    on = "layers.map(L => L.clips.map(c => c.pad).join(',')).join('|')"
    await pg.keyboard.down('Shift'); await pg.keyboard.down('KeyQ'); await pg.keyboard.up('Shift'); await pg.wait_for_timeout(100)
    a = await pg.evaluate(on); await pg.keyboard.up('KeyQ')
    await pg.keyboard.press('KeyU'); await pg.wait_for_timeout(100); u = await pg.evaluate(on)
    lbl = await pg.evaluate("[pads[9].label, pads[17].label, pads[24].label, pads[24].el.parentElement.id, getComputedStyle(pads[24].el).display]")
    await pg.evaluate("document.body.focus()"); await pg.keyboard.press('Tab'); await pg.wait_for_timeout(50)
    t = await pg.evaluate("[padBank, $('#gridA').classList.contains('b2'), getComputedStyle(pads[24].el).display, getComputedStyle(pads[0].el).display]")
    await pg.keyboard.press('Tab'); t2 = await pg.evaluate("padBank")
    print('bank2', a, u, lbl, t, t2, errs)
    assert '24' in a.split('|')[1] and '9' in u.split('|')[3], (a, u)
    assert lbl[:3] == ['U', '.', 'R'] and lbl[3] == 'gridA' and lbl[4] == 'none', lbl
    assert t == [1, True, 'block', 'none'] and t2 == 0, (t, t2)
    # an older scene (pads up to 23): going there and back keeps working, bank 2 empty there
    old = await pg.evaluate("(() => { scenes[2] = { layers: [0,1,2,3].map(i => Object.assign(emptyLayer(), { i })), pads: new Array(24).fill(null), thumb: null }; gotoScene(2, clock.beat, true); const r = pads.slice(24).every(p => p.gif === null); gotoScene(0, clock.beat, true); return [r, !!pads[24].gif]; })()")
    print('old scene', old, errs); assert old == [True, True] and not errs, (old, errs)
    await b.close()
asyncio.run(main())
