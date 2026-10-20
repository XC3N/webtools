# 0.94: effects regrouped (Mono into Colour's palettes, Glitch split into Glitch + Codec, Degauss in Strobe) with older sets
# migrated; an effect setting's LFO (right-click Amount / Rate / Size); LFO Cycle steps; Rec › Source
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    ids = await pg.evaluate("FX_DEFS.map(d => d.id).join(',')")
    print('order', ids); assert ids == 'colour,poster,strobe,feedback,zoom,shake,wobble,mirror,pixel,glitch,codec,rgb', ids
    # a 0.93 set: Mono (Dither) with no Colour set in a preset, Glitch with Blocks + Corrupt + Degauss
    m = await pg.evaluate("""(() => { const on = Array(21).fill(0); on[0] = 1; on[9] = 1;
      const o = upgradeSnap({ v: 7, fx: FX_ORDER_V2.map(id => ({ tag: id, style: id === 'glitch' ? 'blocks+corrupt+degauss' : 'x' })),
        fxPre: [{ fx: { 0: { style: 'dither' }, 9: { style: 'melt+crunch+degauss', pamt: { melt: 0.5, crunch: 0.3 } } } }], fxOn: on.slice() });
      const P = o.fxPre[0].fx; return [o.fx[FXI.glitch].style, o.fx[FXI.codec].style, o.fx[FXI.colour].tag, P[FXI.colour].style, FX_PALS[P[FXI.colour].pal].n, P[FXI.colour].dpat,
        P[FXI.glitch].style, JSON.stringify(P[FXI.glitch].pamt), P[FXI.codec].style, P[FXI.strobe].style, o.fxOn[FXI.colour], o.fxOn[FXI.glitch], o.fxOn[FXI.codec]]; })()""")
    print('migrate', m); assert m == ['blocks+corrupt', 'crunch', 'colour', 'pal', '1-bit', 1, 'melt', '{"melt":0.5}', 'crunch', 'degauss', 1, 1, 0], m   # (0.99.5: Corrupt moved on to Glitch, Codec left with nothing: Crunch, off)
    # the effects draw (shader compiles with Codec / Degauss) and Degauss doesn't flash with the beat
    await pg.evaluate("fileTarget = 0"); await pg.set_input_files('#fileIn', [str(FIX/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300)
    u = await pg.evaluate("""(() => { const blank = () => { const M = fxMix(0); return M.get('out'); }; const M = blank(); M.lv[FXI.strobe] = 0.8; M.env[FXI.strobe] = 1; M.style[FXI.strobe] = 'degauss';
      const U = fxU(3.3, M); const M2 = blank(); M2.lv[FXI.codec] = 0.7; M2.style[FXI.codec] = 'crunch+ring'; const U2 = fxU(3.3, M2);
      return [U.strobe, U.dgs, U2.codec, U2.cdS, U2.glitch, !!post]; })()""")
    print('uniforms', u); assert u[0] == 0 and abs(u[1] - 0.8) < 1e-6 and abs(u[2] - 0.7) < 1e-6 and u[3] == 9 and u[4] == 0 and u[5], u
    # effect LFO: right-click Amount opens it in the envelope's box, the amount then swings with the beat
    await pg.evaluate("selectFx(FXI.pixel)")
    await pg.click('#fxAmt', button='right'); await pg.wait_for_timeout(100)
    lf = await pg.evaluate("""[$('#fxEdit .envrow').classList.contains('lfo'), $('#fxLfoT').textContent, !!fxCfg[FXI.pixel].mod.amt.on, $('#fxAmt').closest('.field').classList.contains('mod'),
      Math.round(modAmt(fxCfg[FXI.pixel], 0) * 100), Math.round(modAmt(fxCfg[FXI.pixel], 2) * 100)]""")
    print('fx lfo', lf); assert lf[:4] == [True, 'LFO · Amount', True, True] and lf[4] == 5 and lf[5] == 100, lf
    await pg.evaluate("$('#fxLfoPer').value = PER_OPTS.findIndex(o => o[0] === 1); $('#fxLfoPer').dispatchEvent(new Event('input', { bubbles: true }))")
    pr = await pg.evaluate("[fxCfg[FXI.pixel].mod.amt.per, $('#fxLfoPer').nextElementSibling.textContent, JSON.parse(snapshot()).fx[FXI.pixel].mod.amt.per]")
    print('per', pr); assert pr == [1, '1/4', 1], pr
    # 0.99: Invert, Phase, Skew, Gap (as the GIF LFOs); labels inside the sliders
    await pg.click('#fxLfoInv'); i0 = await pg.evaluate("Math.round(modAmt(fxCfg[FXI.pixel], 0) * 100)")
    await pg.evaluate("$('#fxLfoPh').value = 0.5; $('#fxLfoPh').dispatchEvent(new Event('input', { bubbles: true })); $('#fxLfoGap').value = GAP_OPTS.findIndex(o => o[0] === 1); $('#fxLfoGap').dispatchEvent(new Event('input', { bubbles: true }))")
    ex = await pg.evaluate("[Math.round(modAmt(fxCfg[FXI.pixel], 0) * 100), $('#fxLfoPh').nextElementSibling.textContent, $('#fxLfoGap').nextElementSibling.textContent, JSON.parse(snapshot()).fx[FXI.pixel].mod.amt.gap, [...document.querySelectorAll('#fxLfoSl label')].map(l => l.textContent).join(',')]")
    print('invert / phase / gap', i0, ex); assert i0 == 100 and ex == [5, '180°', '1/4', 1, 'Cycle,Min value,Max value,Phase,Skew,Gap'], (i0, ex)
    await pg.evaluate("$('#fxRateRow').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))"); rr = await pg.evaluate("[fxModK, $('#fxLfoT').textContent]")   # Pixel has no Rate: refused
    await pg.click('#fxLfoBack'); bk = await pg.evaluate("$('#fxEdit .envrow').classList.contains('lfo')")
    print('rate / back', rr, bk); assert rr == ['amt', 'LFO · Amount'] and bk is False, (rr, bk)
    await pg.click('#envLfo'); ev = await pg.evaluate("[fxModK, $('#fxEdit .envrow').classList.contains('lfo')]"); await pg.click('#fxLfoBack')   # the envelope's LFO view button
    print('lfo view', ev); assert ev == ['amt', True], ev
    rt = await pg.evaluate("[FXI.glitch, FXI.shake].map(i => { selectFx(i); return getComputedStyle($('#fxRateRow')).display; })")   # (0.93 hid Rate wherever Size showed)
    print('rate rows', rt); assert 'none' not in rt, rt
    # LFO Cycle steps, Rec › Source
    misc = await pg.evaluate("[PER_OPTS.map(o => o[1]).join(' '), document.querySelectorAll('#recSrcSeg button').length, $('#recSrcSeg .on').dataset.s, !!document.querySelector('#recPopRows .seg[data-src=\"#recSrcSeg\"]')]")
    print('misc', misc); assert misc == ['1/16 1/8 1/4 3/8 1/2 3/4 1 bar 1½ bars 2 bars 3 bars 4 bars 6 bars 8 bars 12 bars 16 bars', 2, 'out', True], misc
    await b.close()
asyncio.run(main())
