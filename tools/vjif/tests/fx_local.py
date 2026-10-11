# FX Local: each scene keeps its own latched effects (and Global → Local brings the scene's back); effect tiles show the layer mask;
# Colour › Palette: Dither amount with its own pattern switch
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    on = "fxSt.slice(0, 3).map(S => S.on ? 1 : 0).join('')"
    await pg.evaluate("[0,1,2].forEach(i => fxCfg[i].mode = 'latch')")
    await pg.click('#scFx'); txt = await pg.evaluate("$('#scFx').textContent")
    await pg.evaluate("fxDown(0)"); a = await pg.evaluate(on)                       # scene 1: Mono
    await pg.evaluate("gotoScene(1, clock.beat, true)"); b1 = await pg.evaluate(on)    # scene 2 (new, Local): starts with none on
    await pg.evaluate("fxDown(1)"); c = await pg.evaluate(on)            # scene 2: Colour only
    await pg.evaluate("gotoScene(0, clock.beat, true)"); d = await pg.evaluate(on)     # back to 1: Mono
    await pg.evaluate("gotoScene(1, clock.beat, true)"); e = await pg.evaluate(on)     # 2: Colour
    await pg.click('#scFx'); await pg.evaluate("gotoScene(0, clock.beat, true)"); f = await pg.evaluate(on)   # Global: stays Colour
    await pg.click('#scFx'); g = await pg.evaluate(on)                                # Local again: scene 1's Mono back
    print(txt, a, b1, c, d, e, f, g)
    assert txt == 'FX Local' and [a, b1, c, d, e, f, g] == ['100', '000', '010', '100', '010', '010', '100'], (a, b1, c, d, e, f, g)
    # tile mask line
    m = await pg.evaluate("fxCfg[3].target = [0, 2]; syncFxUI(); [document.querySelector('#fxPads .fxp[data-i=\"3\"] .mk').querySelectorAll('i.on').length, document.querySelector('#fxPads .fxp[data-i=\"4\"] .mk').querySelectorAll('i.on').length]")
    print('mask', m); assert m == [2, 4], m
    # dither pattern switch
    r = await pg.evaluate("selectFx(1); fxCfg[1].style = 'pal'; syncFxUI(); const vis = !$('#fxDpat').hidden; document.querySelector('#fxDpat [data-v=\"1\"]').click(); [vis, fxCfg[1].dpat, $('#fxRateRow label').textContent]")
    print('dpat', r); assert r == [True, 1, 'Dither'], r
    await b.close()
asyncio.run(main())
