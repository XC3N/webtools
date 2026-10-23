# 0.99.17: GIF palette = Snap to slider + variants + dither pattern; Pool "Optimize"; note-family icons; boot timeline marks
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.evaluate("selectPad(0)"); await pg.click('#gTabs [data-v=colour]'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("""(() => { const g = curGif(), F = $('#gPalF'), out = [];
      const k = palFam(PAL_ORDER.find(i => PAL_FAM[palFam(i)[0]].m.length > 1))[0] + 1; F.value = k; F.dispatchEvent(new Event('input', {bubbles: true}));
      out.push(g.pal.i >= 0, !$('#gPalVarRow').classList.contains('dimmed'), $('#gPalVar').querySelectorAll('button').length > 1);
      $('#gPalVar button:nth-child(2)').click(); out.push(palFam(g.pal.i)[1]);
      $('#gPalPat button:nth-child(3)').click(); out.push(g.pal.p);
      F.value = 0; F.dispatchEvent(new Event('input', {bubbles: true})); out.push(g.pal.i, $('#gPalDRow').classList.contains('dimmed'));
      return out; })()""")
    print('gpal', r); assert r == [True, True, True, 1, 2, -1, True], r
    r = await pg.evaluate("[$('#poolOpt').textContent.trim(), document.querySelectorAll('#aPerFam svg').length, typeof bootT.marks.length, bootT.marks.length > 0]")
    print('bits', r); assert r[0] == 'Optimize' and r[1] >= 3 and r[3], r
    r = await pg.evaluate("""(() => { selectPad(0); target = 3; const L = layers[3]; if (!L.clips.length) L.clips.push(newClip(0)); L.sel = L.clips[0]; syncLayerUI(); syncXfUI();
      const s = $('#gBlend'), off = $('#gQuick').classList.contains('disabled'); s.value = 'difference'; s.dispatchEvent(new Event('change', {bubbles: true}));
      const c = L.clips[0], ser = JSON.stringify(serLayers(layers)[3].clips[0]).includes('difference'); s.value = 'source-over'; s.dispatchEvent(new Event('change', {bubbles: true}));
      return [off, c.blend === undefined, ser, $('#gOpRow').closest('#gQuick') !== null && $('#gSmooth').closest('#gQuick') !== null]; })()""")
    print('clipblend', r); assert r == [False, True, True, True], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
