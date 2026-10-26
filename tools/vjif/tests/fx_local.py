# 0.99.27 (ID-235): effects on three levels at once. Output carries on from scene to scene; Scene keeps its own latched
# effects with each scene; GIF is the selected GIF's own (g.gfx). The switch picks which one the F-keys / tiles / editor use.
# (Was: FX Local / Global.) Also: an older set saved with FX Local brings its latched effects back on the Scene level.
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, FIX, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    on = "[fxSt.slice(0, 3).map(S => S.on ? 1 : 0).join(''), scSt.slice(0, 3).map(S => S.on ? 1 : 0).join('')]"
    await pg.evaluate("[0,1,2].forEach(i => fxCfg[i].mode = 'latch')")
    await pg.click('#fxLvl [data-v=out]'); await pg.evaluate("fxDown(0)"); a = await pg.evaluate(on)            # Output: Colour
    await pg.click('#fxLvl [data-v=scene]'); await pg.evaluate("fxDown(1)"); c = await pg.evaluate(on)         # Scene 1: Posterize
    lv = await pg.evaluate("[fxLevel(0, clock.beat) > 0.5, fxLevel(1, clock.beat) > 0.5]")
    await pg.evaluate("gotoScene(1, clock.beat, true)"); d = await pg.evaluate(on)     # scene 2: its own none; Output's still on
    await pg.evaluate("fxDown(2)"); e = await pg.evaluate(on)                           # scene 2: Strobe
    await pg.evaluate("gotoScene(0, clock.beat, true)"); f = await pg.evaluate(on)     # back to 1: Posterize
    await pg.evaluate("gotoScene(1, clock.beat, true)"); g = await pg.evaluate(on)     # 2: Strobe
    print(a, c, lv, d, e, f, g)
    assert [a, c, d, e, f, g] == [['100', '000'], ['100', '010'], ['100', '000'], ['100', '001'], ['100', '010'], ['100', '001']] and lv == [True, True], (a, c, d, e, f, g, lv)
    # All off: only the level the switch is on
    await pg.click('#fxAllOff'); r = await pg.evaluate(on); print('alloff', r); assert r == ['100', '000'], r
    # GIF level: the key switches the selected GIF's own effect; the editor edits it
    r = await pg.evaluate("""(() => { gotoScene(0, clock.beat, true); fileTarget = 0; return 1; })()""")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.evaluate("selectPad(0)"); await pg.click('#fxLvl [data-v=gif]')
    r = await pg.evaluate("""(() => { const g = curGif(), i = FXI.pixel; fxDown(i); const on1 = !!(g.gfx && g.gfx.pixel && g.gfx.pixel.on); selectFx(i);
      const X = fxEd(), same = X === g.gfx.pixel; const el = $('#fxSize'); el.value = 6; el.dispatchEvent(new Event('input', { bubbles: true }));
      const U = gfxU(curGif(), clock.beat); return [on1, same, curGif().gfx.pixel.size, !!(U && U.pixel > 0), $('#fxEdit').classList.contains('gifl'), fxSt[i].on, scSt[i].on]; })()""")
    print('gif', r); assert r == [True, True, 16, True, True, False, False], r
    r = await pg.evaluate("(() => { fxModOpen('amt'); return fxModK; })()"); assert r is None, r   # no LFO on the GIF level
    # GIF › FX tab: every effect, folded when off
    r = await pg.evaluate("""(() => { $('#gTabs [data-v=gfx]').click(); const rows = [...document.querySelectorAll('.gfxrow')]; return [rows.length, rows.filter(x => !x.hidden).map(x => x.dataset.id).join()]; })()""")
    print('tab', r); assert r == [12, 'pixel'], r
    # an older set saved with FX Local: its latched effects come back on the Scene level
    r = await pg.evaluate("""(async () => { const st = JSON.parse(snapshot()); delete st.fxLv; st.fxLocal = true; st.fxOn = st.fxOn.map((v, i) => i === 1 ? 1 : 0); delete st.sceneFx; await applySnapshot(st); return [fxSt[1].on, scSt[1].on]; })()""")
    print('migrate', r); assert r == [False, True], r
    await pg.evaluate("fxLvl = 'out'; Prefs.set('vjif-fxlvl', 'out'); syncFxUI()")
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
