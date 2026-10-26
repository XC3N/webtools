# 0.99.21: brush ring follows the pointer while Size / Soft is held; the pop-up slider follows movement; sets read after start; GIF palette variant row stays
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("[bootT.marks.map(m => m[0]).join(','), sets instanceof Map]"); print('boot', r); assert 'all sets' in r[0] or True
    await pg.wait_for_function("bootT.marks.some(m => m[0] === 'all sets')"); 
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.evaluate("selectPad(0); target = 3; const L = layers[3]; L.clips = [newClip(0)]; L.sel = L.clips[0]; syncLayerUI(); maskOpen(3)"); await pg.wait_for_timeout(300)
    box = await pg.locator('#maskSizeBtn').bounding_box(); x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
    await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x + 300, y + 400, steps=4)
    r = await pg.evaluate("[!$('#brushRing').hidden, document.body.classList.contains('brushing'), Math.round($('#brushRing').getBoundingClientRect().width)]"); print('ring', r)
    assert r[0] and r[1] and r[2] >= 4, r
    await pg.mouse.up(); r = await pg.evaluate("[$('#brushRing').hidden, document.body.classList.contains('brushing')]"); assert r == [True, False], r
    # pop-up slider: click, then move far away sideways + down: it follows the movement, clamped
    await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.up()
    sl = await pg.locator('#maskSize').bounding_box(); v0 = await pg.evaluate("+$('#maskSize').value")
    sx, sy = sl['x'] + sl['width']/2, sl['y'] + sl['height']/2
    await pg.mouse.move(sx, sy); await pg.mouse.down(); v1 = await pg.evaluate("+$('#maskSize').value"); await pg.mouse.move(sx + 500, sy + 300, steps=5); v2 = await pg.evaluate("+$('#maskSize').value"); await pg.mouse.up()
    print('slider', v0, v1, v2); assert v2 < v1 or v1 == float(await pg.evaluate("+$('#maskSize').min")), (v1, v2)
    r = await pg.evaluate("""(async () => { selectFx(FXI.colour); const C = fxConf(FXI.colour); C.style = 'pal'; C.pal = 2; syncFxUI(); const lab = $('#fxSizeRow label').textContent, seg = !$('#fxSizeSeg').hidden;
      $('#fxSizeSeg button').click(); const on = fxConf(FXI.colour).pfit; await new Promise(r => setTimeout(r, 1500)); const e = fxEntry(FXI.colour).pfit; $('#fxSizeSeg button').click(); return [lab, seg, on, e, fxConf(FXI.colour).pfit]; })()""")
    print('fit', r); assert r == ['Fit range', True, 1, 1, 0], r
    vis = await pg.evaluate("(() => { selectFx(FXI.colour); const C = fxEd(); C.style = 'pal'; syncFxUI(); const b = $('#fxSizeSeg').getBoundingClientRect(); return [b.width > 20, b.height > 8, getComputedStyle($('#fxSizeRow')).display]; })()"); print('fit visible', vis); assert vis[0] and vis[1] and vis[2] != 'none', vis
    r = await pg.evaluate("""(() => { selectFx(FXI.mirror); const C = fxConf(FXI.mirror); C.style = 'kal'; syncFxUI(); const lab = $('#fxSizeRow label').textContent; $('#fxSizeSeg button').click(); const a = fxConf(FXI.mirror).kmir; $('#fxSizeSeg button').click(); return [lab, a, fxConf(FXI.mirror).kmir]; })()""")
    print('mirror', r); assert r == ['Angle', 0, 1], r   # 0.99.27: the row is Angle, the Mirror switch beside it
    vis = await pg.evaluate("(() => { selectFx(FXI.mirror); const C = fxEd(); C.style = 'kal'; syncFxUI(); const b = $('#fxSizeSeg').getBoundingClientRect(); return [b.width > 14, b.height > 8, getComputedStyle($('#fxSizeRow')).display]; })()"); print('mirror visible', vis); assert vis[0] and vis[1] and vis[2] != 'none', vis
    r = await pg.evaluate("pvOpt.loupe = true; pvUI(); 1"); pv = await pg.locator('#pv').bounding_box()
    ax, ay = pv['x'] + pv['width']*0.4, pv['y'] + pv['height']*0.4
    await pg.mouse.move(ax, ay); await pg.wait_for_timeout(300); await pg.mouse.click(ax, ay, button='right'); await pg.wait_for_timeout(200); a = await pg.evaluate("[loupeAt.slice(), $('#loupe').classList.contains('pin')]")
    await pg.mouse.move(pv['x'] + pv['width']*0.9, pv['y'] + pv['height']*0.9, steps=3); await pg.wait_for_timeout(200)
    b2 = await pg.evaluate("loupeAt.slice()"); print('loupe lock', a, b2); assert a[1] and abs(a[0][0] - b2[0]) < 3 and abs(a[0][1] - b2[1]) < 3, (a, b2)
    await pg.mouse.click(pv['x'] + pv['width']*0.9, pv['y'] + pv['height']*0.9, button='right'); await pg.wait_for_timeout(200); c = await pg.evaluate("[$('#loupe').classList.contains('pin'), loupeAt.slice()]")
    await pg.mouse.move(pv['x'] + pv['width']*0.2, pv['y'] + pv['height']*0.2, steps=3); await pg.wait_for_timeout(200); d = await pg.evaluate("loupeAt.slice()"); print('unlocked', c, d); assert not c[0] and abs(d[0] - c[1][0]) > 10, (c, d)
    await pg.evaluate("pvOpt.loupe = false; pvUI()")
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
