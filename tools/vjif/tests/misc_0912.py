# 0.99.12: Caps Lock doesn't move the Scenes buttons (ID-213); an effect's envelope reset undoes with Ctrl+Z and by clicking reset again; a right-click on a slider doesn't start the preview
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    xs = await pg.evaluate("(() => { const r = () => [$('#scExport').getBoundingClientRect().x, $('#scImport').getBoundingClientRect().x]; const a = r(); setCaps(true); const c = r(); setCaps(false); return [a, c]; })()")
    print('caps', xs); assert xs[0] == xs[1], xs
    r = await pg.evaluate("""(() => { selectFx(0); const C = fxConf(0), D = fxDefaults()[0]; const d0 = C.att; C.att = 3; syncFxUI(); commit();
      $('#envReset').click(); const a = C.att; undo(); const b = C.att; redo(); const c = C.att; $('#envReset').click(); const d = C.att; return [d0, a, b, c, d]; })()""")
    print('env', r); assert r[2] == 3 and r[1] != 3 and r[3] == r[1] and r[4] == 3, r
    r2 = await pg.evaluate("""(() => { const C = fxConf(0); C.att = 4; syncFxUI(); commit(); $('#envReset').click(); const a = C.att; $('#envReset').click(); return [a, C.att]; })()""")
    print('twice', r2); assert r2[1] == 4 and r2[0] != 4, r2
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
