# 0.99.28: Gap at the turn too (ID-253); the level switch as icons, the effect name readable (ID-249)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("[1, 2.5, 3.5, 5.5].map(t => +lfoPosT({ per: 4, ph: 0, gap: 2, gap2: true, sk: 0.5 }, t).toFixed(3))")
    print('gap2', r); assert r == [0.25, 0.5, 0.625, 1.0], r
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""(() => { selectPad(0); $('#gTabs [data-v=auto]').click(); const g = curGif(); const el = $('#aGap'); el.value = 2; el.dispatchEvent(new Event('input', { bubbles: true }));
      $('#aGap2').click(); const A = g.lfo[aSel]; return [A.gap > 0, !!A.gap2, $('#aGap2Row').classList.contains('dimmed')]; })()""")
    print('ui', r); assert r == [True, True, False], r
    r = await pg.evaluate("(() => { selectFx(FXI.colour); const n = $('#fxName'); return [n.scrollWidth <= n.clientWidth + 1, document.querySelectorAll('#fxLvl button svg').length]; })()")
    print('name', r); assert r == [True, 3], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
