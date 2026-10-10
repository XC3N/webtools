# effect layers from the keyboard: hold an F-key + 1–4 (layers in / out), + 5 (All, then back); the All button remembers the set
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fxCfg[0].target='out'; fxCfg[0].mode='hold'; armTrans(1)")
    tr0 = await pg.evaluate("trSel")
    await pg.keyboard.down('F1')
    for k in ['Digit1', 'Digit3']: await pg.keyboard.press(k)
    a = await pg.evaluate("JSON.stringify(fxCfg[0].target)")
    await pg.keyboard.press('Digit5'); b5 = await pg.evaluate("JSON.stringify(fxCfg[0].target)")
    await pg.keyboard.press('Digit5'); c5 = await pg.evaluate("JSON.stringify(fxCfg[0].target)")
    await pg.keyboard.up('F1')
    tr1 = await pg.evaluate("trSel")
    await pg.keyboard.press('Digit1'); d = await pg.evaluate("JSON.stringify(fxCfg[0].target)")   # released: 1 arms a transition again, the layers stay
    # the All button: from a set → All → the set back
    await pg.evaluate("selectFx(0)"); await pg.click('#fxTgt [data-v=out]'); e1 = await pg.evaluate("JSON.stringify(fxCfg[0].target)")
    await pg.click('#fxTgt [data-v=out]'); e2 = await pg.evaluate("JSON.stringify(fxCfg[0].target)")
    print(a, b5, c5, d, e1, e2, tr0, tr1)
    assert a == '[0,2]' and b5 == '"out"' and c5 == '[0,2]' and d == '[0,2]' and e1 == '"out"' and e2 == '[0,2]', (a, b5, c5, d, e1, e2)
    assert tr0 == tr1 == 1, (tr0, tr1)
    await b.close()
asyncio.run(main())
