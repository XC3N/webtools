# 0.81: mask bar in its own line, right button erases, another layer closes it; transition slider row (Hold, Repeats); Hit › Hold;
# preset tiles say what they do; right-click solos a stacked style; Settings sections fold; all-layers pip colour live
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX, OUT
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('grad.gif','KeyQ'),('red.gif','KeyW')]):
      await pg.evaluate(f"setTarget({k}); fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(200)
    await pg.evaluate("layers.forEach(L => L.clips.forEach(c => { c.sx = c.sy = 6; c.x = 0; c.y = 0; })); redraw.all = true")
    pv0 = await pg.evaluate("[...['#layers','#pvWrap'].map(s => $(s).getBoundingClientRect().top)]")
    await pg.click('.layer:nth-child(2) .lmask'); await pg.wait_for_timeout(300)
    # 0.84: the bar takes the guides' place under the picture: the preview doesn't move or shrink, the picture isn't covered
    geo = await pg.evaluate("(() => { const M = $('#maskBar').getBoundingClientRect(), r = pv.getBoundingClientRect(); return [[...['#layers','#pvWrap'].map(s => $(s).getBoundingClientRect().top)], M.top >= r.y + view.y + view.h - 1, Math.round(M.height), M.width > 300, getComputedStyle($('#guideGrp')).display]; })()")
    print('bar', pv0, geo); assert geo[0] == pv0 and geo[1] and geo[2] < 40 and geo[3] and geo[4] == 'none', geo
    await pg.screenshot(path=str(OUT/'mask_bar.png'), clip={'x':0,'y':0,'width':1600,'height':520})
    r = await pg.evaluate("(() => { const r = pv.getBoundingClientRect(); return [r.x + view.x, r.y + view.y, view.w, view.h]; })()")
    x0,y0,w,h = r
    await pg.mouse.move(x0+w*0.3, y0+h*0.5); await pg.mouse.down(); await pg.mouse.move(x0+w*0.7, y0+h*0.5, steps=10); await pg.mouse.up()
    a1 = await pg.evaluate("(() => { const c = layers[1].mask.cv, x = c.getContext('2d'); return x.getImageData(c.width/2|0, c.height/2|0, 1, 1).data[3]; })()")
    await pg.mouse.move(x0+w*0.3, y0+h*0.5); await pg.mouse.down(button='right'); await pg.mouse.move(x0+w*0.7, y0+h*0.5, steps=10); await pg.mouse.up(button='right')
    a2 = await pg.evaluate("(() => { const c = layers[1].mask.cv, x = c.getContext('2d'); return x.getImageData(c.width/2|0, c.height/2|0, 1, 1).data[3]; })()")
    print('paint / erase alpha', a1, a2); assert a1 > 200 and a2 < 30, (a1, a2)
    await pg.click('.layer:nth-child(1) .lname'); await pg.wait_for_timeout(200)
    cl = await pg.evaluate("[maskEd, $('#maskBar').hidden, $('#stage').classList.contains('masking'), target]")
    print('other layer', cl); assert cl[0] is None and cl[1] and not cl[2], cl
    # transitions: the slider row
    tr = await pg.evaluate("""(() => { const o = []; for (const [t, s] of [['fade','dip'],['stutter','ramp'],['glitch','corrupt'],['wipe','line'],['tv','channel']]){ transCfg.type = t; transCfg.style = s; syncTransUI();
      o.push([$('#trPxRow label').textContent, $('#trPxRow').classList.contains('dimmed'), $('#trPx').nextElementSibling.textContent]); } return o; })()""")
    print('slider row', tr); assert [x[0] for x in tr] == ['Hold','Repeats','Pixel','Pixel','Number'] and tr[3][1] and not tr[0][1] and tr[1][2] == '8' and tr[4][2] == '0.8 s', tr
    # Ramp: count the switches to the new scene over the transition
    rp = await pg.evaluate("""(() => { const out = []; for (const [len, reps] of [[2, 8], [1, 8], [4, 4]]){ const T = { type: 'stutter', style: 'ramp', reps, len, px: 12 }; trans = { len, cfg: T };
      let last = null, n = 0; for (let e = 0; e <= 1.0001; e += 0.0005){ trA.fillStyle = '#f00'; trA.fillRect(0,0,CW,CH); trB.fillStyle = '#00f'; trB.fillRect(0,0,CW,CH); composeTransition(e, T);
        const v = mctx.getImageData(1,1,1,1).data[2] > 128; if (v && last === false) n++; last = v; } out.push(n); } trans = null; return out; })()""")
    print('ramp news', rp); assert rp == [8, 8, 4], rp
    dp = await pg.evaluate("""(() => { const T = { type: 'fade', style: 'dip', hold: 0.5, len: 2 }; trans = { len: 2, cfg: T }; const o = [];
      for (const e of [0.2, 0.3, 0.5, 0.7, 0.8]){ trA.fillStyle = '#fff'; trA.fillRect(0,0,CW,CH); trB.fillStyle = '#fff'; trB.fillRect(0,0,CW,CH); composeTransition(e, T); o.push(mctx.getImageData(1,1,1,1).data[0]); } trans = null; return o; })()""")
    print('dip hold', dp); assert dp[1] < 5 and dp[2] < 5 and dp[3] < 5 and dp[0] > 40 and dp[4] > 40, dp
    # Hit › Hold
    await pg.evaluate("selectPad(0); $('#gTabs [data-v=play]').click()"); await pg.wait_for_timeout(100)
    hm = await pg.evaluate("[...'stay hold fade'.split(' ')].map(v => { $(`#tMode [data-v=${v}]`).click(); const g = pads[0].gif; return [g.trig, g.env.gate, $('#tMode button.on').dataset.v]; })")
    print('hit modes', hm); assert hm == [['stay', False, 'stay'], ['fade', True, 'hold'], ['fade', False, 'fade']], hm
    # preset tile: palette name
    pt = await pg.evaluate("""(() => { fxPre[0].fx = { [FXI.colour]: { ...fxEntry(FXI.colour), style: 'pal', pal: 2 } }; fxPre[1].fx = { [FXI.colour]: { ...fxEntry(FXI.colour), style: 'flip' }, [FXI.pixel]: fxEntry(FXI.pixel) }; syncFxUI();
      const t = k => { const el = document.querySelector(`#fxPre .fxp[data-i="${NFX + k}"]`); return [el.querySelector('.n').textContent, el.querySelector('.s').textContent]; }; return [t(0), t(1)]; })()""")
    print('preset tiles', pt); assert pt[0] == ['Colour', 'CGA 3'] and 'Flip' in pt[1][1], pt
    # solo
    await pg.evaluate("selectFx(FXI.rgb); fxCfg[FXI.rgb].style = 'vhs+scan+phos'; syncFxUI()")
    await pg.click('#fxStyle [data-v="scan"]', button='right', force=True); s1 = await pg.evaluate("fxCfg[FXI.rgb].style")
    await pg.click('#fxStyle [data-v="scan"]', button='right', force=True); s2 = await pg.evaluate("fxCfg[FXI.rgb].style")
    await pg.click('#fxStyle [data-v="vhs"]', force=True); s3 = await pg.evaluate("[fxCfg[FXI.rgb].style, fxFocus.rgb]")
    await pg.click('#fxStyle [data-v="vhs"]', force=True); s4 = await pg.evaluate("fxCfg[FXI.rgb].style")
    print('solo', s1, s2, s3, s4); assert s1 == 'scan' and s2 == 'vhs+scan+phos' and s3 == ['vhs+scan+phos', 'vhs'] and s4 == 'scan+phos', (s1, s2, s3, s4)
    # settings: folds, and the pip colour picker doesn't close it
    await pg.click('#setBtn'); await pg.wait_for_timeout(200)
    await pg.click('#setPanel .sub:has-text("Recording") > span'); f1 = await pg.evaluate("[$('#recCodecSel').closest('.row').classList.contains('foldhid'), $('#fmtSeg').closest('.row').classList.contains('foldhid')]")
    await pg.click('#setPanel .sub:has-text("Recording") > span')
    await pg.click('#allPipC'); await pg.wait_for_timeout(100)
    bx = await pg.locator('#cpk .cpkSV').bounding_box(); await pg.mouse.click(bx['x']+bx['width']*0.9, bx['y']+5); await pg.wait_for_timeout(100)
    f2 = await pg.evaluate("[$('#setPanel').hidden, allPipCol, getComputedStyle(document.querySelector(`#fxStrip .fxp[data-i='${FXI.rgb}'] .mk i`)).getPropertyValue('--c').trim() === allPipCol]")
    print('settings', f1, f2); assert f1 == [True, False] and f2[0] is False and f2[2], (f1, f2)
    print(errs[:3]); assert not errs
    await b.close()
asyncio.run(main())
