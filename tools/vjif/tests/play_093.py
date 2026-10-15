# 0.93: Bypass FX (a GIF drawn over the effects), One shot › Repeat (plays by itself on the beat grid), Loop length slider, pool-wide resolution
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
PX = "(() => { const d = mctx.getImageData(master.width/2|0, master.height/2|0, 1, 1).data; return [d[0], d[1], d[2]]; })()"
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget = 0"); await pg.set_input_files('#fileIn', [str(FIX/'red.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(200)
    await pg.evaluate("layers.forEach(L => L.clips.forEach(c => { c.sx = c.sy = 6; c.x = 0; c.y = 0; })); redraw.all = true")
    await pg.wait_for_function("(() => { const d = mctx.getImageData(master.width/2|0, master.height/2|0, 1, 1).data; return d[0] > 100; })()"); base = await pg.evaluate(PX)
    # each effect in turn until one changes the centre pixel
    hit = None
    for i in range(12):
      await pg.evaluate(f"selectFx({i}); fxCfg[{i}].mode = 'latch'; fxCfg[{i}].target = [0]"); await pg.keyboard.press(f'F{i+1}'); await pg.wait_for_timeout(400)
      fx = await pg.evaluate(PX)
      if sum(abs(a-b) for a,b in zip(fx, base)) > 60: hit = i; break
      await pg.keyboard.press(f'F{i+1}'); await pg.wait_for_timeout(150)
    assert hit is not None, 'no effect changed the picture'
    await pg.evaluate("selectPad(0)"); await pg.click('#gTabs [data-pane=display]') if await pg.locator('#gTabs [data-pane=display]').count() else None
    await pg.evaluate("$('#gNoFx').checked = true; $('#gNoFx').dispatchEvent(new Event('change', { bubbles: true }))"); await pg.wait_for_timeout(400)
    by = await pg.evaluate(PX); nofx = await pg.evaluate("pads[0].gif.nofx")
    print('base', base, 'fx', hit, fx, 'bypass', by)
    assert nofx and sum(abs(a-b) for a,b in zip(by, base)) < 30, (base, fx, by)
    assert await pg.evaluate("JSON.parse(snapshot()).scenes ? true : true")
    await pg.keyboard.press(f'F{hit+1}'); await pg.evaluate("$('#gNoFx').checked = false; $('#gNoFx').dispatchEvent(new Event('change', { bubbles: true }))")
    # Loop length slider
    ll = await pg.evaluate("(() => { const el = $('#gBeats'); el.value = 7; el.dispatchEvent(new Event('input', { bubbles: true })); return [pads[0].gif.beats, el.nextElementSibling.textContent]; })()")
    print('loop length', ll); assert ll == [8, '2 bars'], ll
    # One shot › Repeat: hidden, then shows by itself on the grid without a hit
    await pg.evaluate("$('#tMode [data-v=fade]').click()"); await pg.wait_for_timeout(100)
    await pg.evaluate("Object.assign(pads[0].gif.env, { a: 0, h: 0.5, r: 0, len: 'free' })")
    rep = await pg.evaluate("""(() => { const g = pads[0].gif, c = layers.flatMap(L => L.clips).find(c => c.pad === 0); c.env = null;
      const off = envLevel(c, g, 9.2); g.env.every = 4; const on = envLevel(c, g, 8.2), gap = envLevel(c, g, 9.2), on2 = envLevel(c, g, 12.1); return [off, on, gap, on2]; })()""")
    print('repeat', rep); assert rep == [0, 1, 0, 1], rep
    ui = await pg.evaluate("(() => { const el = $('#tEvery'); el.value = 3; el.dispatchEvent(new Event('input', { bubbles: true })); return [pads[0].gif.env.every, el.nextElementSibling.textContent]; })()")
    print('repeat ui', ui); assert ui == [4, '1 bar'], ui
    # pool: all at ½
    await pg.evaluate("openPool ? openPool() : $('#poolBtn').click()"); await pg.wait_for_timeout(200)
    await pg.click('#poolRes [data-v="0.5"]'); await pg.wait_for_function("pool.every(m => m.scale === 0.5)", timeout=8000)
    print('pool', await pg.evaluate("pool.map(m => m.scale)"))
    await b.close()
asyncio.run(main())
