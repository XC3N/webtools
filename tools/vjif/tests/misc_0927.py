# 0.99.27: small fixes from the bench (NES Dither shows none, shadow Cut greyed on Floor, Shift+Home, loupe anywhere,
# Resolution in the GIF header, GIF Loop's Timing as header icons, all LFOs off, physical blend, Kaleido Angle, Optimize floor,
# a GIF's own Strobe keeps its transparency)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""(() => { selectFx(FXI.colour); const C = fxEd(); C.style = 'pal'; C.dith = 0.6; C.pal = FX_PALS.findIndex(p => p.n === 'NES'); syncFxUI(); const a = [$('#fxRate').nextElementSibling.textContent, +$('#fxRate').value];
      C.pal = FX_PALS.findIndex(p => p.n === 'EGA'); syncFxUI(); a.push($('#fxRate').nextElementSibling.textContent); return a; })()""")
    print('nes', r); assert r == ['–', 0, '60%'], r
    r = await pg.evaluate("""(() => { selectPad(0); const g = curGif(); g.shadow = { ...g.shadow, on: true, floor: true, cut: 0.3 }; syncShadowUI(g); const a = $('#shC').closest('.field').classList.contains('dimmed');
      g.shadow = { ...g.shadow, floor: false }; syncShadowUI(g); return [a, $('#shC').closest('.field').classList.contains('dimmed'), +$('#shY').max]; })()""")
    print('shadow', r); assert r == [True, False, 160], r
    await pg.evaluate("selectPad(0); target = 3; const L = layers[3]; if (!L.clips.length) L.clips.push(newClip(0)); L.sel = L.clips[0]; syncLayerUI(); syncXfUI()"); await pg.wait_for_timeout(300)
    r = await pg.evaluate("""(() => { const c = selClip(); c.x = 50; document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Home', key: 'Home', bubbles: true })); const a = c.x;
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Home', key: 'Home', shiftKey: true, bubbles: true })); return [a, selClip().x]; })()""")
    print('home', r); assert r == [50, 0], r
    r = await pg.evaluate("""[!!$('#side > h2 #gRes'), $('#gRes').querySelectorAll('button').length, !!$('.sub.loophd #gSync'), $('#gSync').querySelectorAll('button svg').length, $('#gLoop').querySelectorAll('button svg').length]""")
    print('header', r); assert r == [True, 3, True, 3, 3], r
    lb = await pg.evaluate("pvOpt.loupe = true; pvUI(); pvOpt.lpos = [0.05, 0.05]; loupeAt = [100, 100]; drawLoupe(); loupePlace(); const r = $('#loupe').getBoundingClientRect(); [getComputedStyle($('#loupe')).position, Math.round(r.left), Math.round(r.top)]")
    print('loupe', lb); assert lb[0] == 'fixed' and lb[1] == 80 and lb[2] == 48, lb
    await pg.evaluate("pvOpt.loupe = false; pvOpt.lpos = null; pvUI(); loupePlace()")
    r = await pg.evaluate("""(() => { selectFx(FXI.feedback); const X = fxEd(); X.mod = { amt: { on: true, shape: 'sine', per: 4, lo: 0.1, hi: 1 }, fbk: { on: true, shape: 'sine', per: 4, lo: 0, hi: 5 } }; syncFxUI();
      const lit = !$('#envLfoOff').classList.contains('dimmed'); $('#envLfoOff').click(); return [lit, X.mod.amt.on, X.mod.fbk.on, $('#envLfoOff').classList.contains('dimmed')]; })()""")
    print('lfo off', r); assert r == [True, False, False, True], r
    r = await pg.evaluate("""(() => { selectFx(FXI.mirror); const X = fxEd(); X.style = 'kal'; syncFxUI(); const el = $('#fxSize'); el.value = 7; el.dispatchEvent(new Event('input', { bubbles: true }));
      const lab = $('#fxSizeRow label').textContent, a = X.kang; $('#fxSizeSeg button').click(); const m = X.kmir;
      const U = fxU(clock.beat, (() => { const M = fxMix(clock.beat).get('out'); M.lv[FXI.mirror] = 1; return M; })()); fxModOpen('kang'); const k = fxModK; X.mod.kang.on = false; fxModK = null; syncFxMod(); return [lab, a, m, k, U.mirA]; })()""")
    print('kal', r); assert r == ['Angle', 90, 0, 'kang', 90], r
    # physical blend: two GIFs on a plain layer over a coloured background; the top one in Difference blends with the background too
    r = await pg.evaluate("""(() => { const g = pads[0].gif, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      const a = newClip(0), c = newClip(0); a.x = -400; const L0 = { ...layers[0], on: true, fillOn: true, fill: '#ffffff', opacity: 1, blend: 'source-over', clips: [] }, L1 = { ...layers[1], on: true, opacity: 1, blend: 'source-over' };
      const px = () => { const d = x.getImageData(W / 2 | 0, H / 2 | 0, 1, 1).data; return d[0] + d[1] + d[2]; };
      const go = bl => { c.blend = bl; render([{ L: L0, items: [] }, { L: L1, items: [{ g, e: a, fi: 0 }, { g, e: c, fi: 0 }] }], x, 0, [], 0, [1, 0, 0, 1, 0, 0]); return px(); };
      return [go('source-over'), go('difference')]; })()""")
    print('blend', r); assert r[0] != r[1], r
    # Optimize: a small GIF keeps its full resolution
    await pg.evaluate("$('#poolOpt').click()"); await pg.wait_for_timeout(800)
    r = await pg.evaluate("pads[0].gif.media.scale || 1"); print('opt', r); assert r == 1, r
    # a GIF's own Strobe: alpha kept (keepA)
    r = await pg.evaluate("(() => { const g = pads[0].gif; g.gfx = {}; const x = gfxEntry(FXI.strobe, g); x.on = true; x.amt = 1; gfxTouch(g); const U = gfxU(g, 0); return U && U.keepA; })()"); assert r == 1, r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
