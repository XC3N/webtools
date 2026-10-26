# 0.99.25 (ID-185): the settings that take over the Rate / Size slider (Length, Zoom, Dither, Dropouts) have their own LFO
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()"); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(400)   # (under load the first editor sync could land mid-test)
    r = await pg.evaluate("""(() => { const out = {}, T = FX_TARGETS[0];
      const go = (id, style, key, cfg) => { selectFx(FXI[id]); const C = fxEd(); C.style = style; Object.assign(C, cfg || {}); syncFxUI();
        const slot = key === 'vdrop' ? 'size' : 'rate', rowEl = $(slot === 'rate' ? '#fxRateRow' : '#fxSizeRow').closest('.field');
        rowEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
        const X = fxEd(), M = X.mod && X.mod[key]; if (!M) return ['no mod', fxModK];
        M.lo = 0; M.hi = FXM[key].max; M.per = 4; M.shape = 'tri';
        const vals = [0, 0.5, 1, 1.5, 2, 3].map(bt => fxMix(bt).get(T)[key][FXI[id]]);
        const ok = fxModK === key && $('#fxLfoT').textContent === 'LFO on ' + FXM[key].name && rowEl.classList.contains('mod');
        fxModK = null; syncFxMod(); return [ok, new Set(vals).size]; };
      out.fbk = go('feedback', FX_DEFS[FXI.feedback].styles[0][0], 'fbk');
      out.kz = go('mirror', 'kal', 'kz');
      out.dith = go('colour', 'pal', 'dith', { pal: 4 });
      out.vdrop = go('rgb', 'vhs', 'vdrop');
      return out; })()""")
    print(r)
    for k, v in r.items(): assert v[0] is True and v[1] > 2, (k, v)
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
