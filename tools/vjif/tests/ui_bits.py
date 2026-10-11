# 0.65: F-keys don't move the effect editor; F-key + Ins / Home / PgUp sets the mode; envelope reset; Rec ▾ mirrors Settings
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("selectFx(4)")
    await pg.keyboard.down('F2'); await pg.keyboard.press('PageUp'); await pg.keyboard.up('F2')
    r = await pg.evaluate("[selFx, fxCfg[1].mode]"); print('focus/mode', r); assert r == [4, 'latch'], r
    await pg.keyboard.down('F2'); await pg.keyboard.press('Home'); await pg.keyboard.up('F2')
    r2 = await pg.evaluate("[fxCfg[1].mode, live.freeze || false]"); print('hit', r2); assert r2[0] == 'hit', r2
    e = await pg.evaluate("selectFx(1); fxCfg[1].att = 2; fxCfg[1].rel = 3; $('#envReset').click(); const D = fxDefaults()[1]; [fxCfg[1].att === D.att, fxCfg[1].rel === D.rel]")
    print('env', e); assert e == [True, True], e
    await pg.click('#recCfg'); await pg.click('#recPopRows .seg[data-src="#recBarsSeg"] button:nth-child(3)')
    rb = await pg.evaluate("[recBars, $('#recBarsSeg button.on').dataset.b]"); print('rec', rb); assert rb == [8, '8'], rb
    # drop shadow and a cropped tile draw (and the shadow survives a copy of the GIF)
    from _env import FIX as S
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'ring.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(200)
    sh = await pg.evaluate("const g = pads[0].gif; selectPad(0); $('#shX').value = 30; $('#shX').dispatchEvent(new Event('input', { bubbles: true })); const c = layers[0].clips[0]; c.tile = true; c.cl = 0.25; c.cr = 0.25; redraw.all = true; [g.shadow.on, g.shadow.x, cloneInst(g).shadow.x]")
    await pg.wait_for_timeout(600)
    print('shadow', sh); assert sh == [True, 30, 30], sh
    await b.close()
asyncio.run(main())
