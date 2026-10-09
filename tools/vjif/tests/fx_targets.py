import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.evaluate("selectFx(0); fxCfg[0].mode='latch'")
    T="JSON.stringify(fxCfg[0].target)"
    out=[]
    await pg.click('#fxTgt [data-v="1"]'); await pg.wait_for_timeout(100); out.append(await pg.evaluate(T+"+' '+$('#fxStrip .fxp[data-i=\"0\"] .md').textContent"))
    await pg.click('#fxTgt [data-v="3"]'); out.append(await pg.evaluate(T))
    await pg.click('#fxTgt [data-v="1"]', button='right'); out.append(await pg.evaluate(T))
    await pg.click('#fxTgt [data-v="2"]'); out.append(await pg.evaluate(T))
    bb=await pg.locator('#fxTgt').bounding_box(); await pg.screenshot(path=str(OUT/'tgt.png'), clip={'x':bb['x']-4,'y':bb['y']-4,'width':bb['width']+8,'height':bb['height']+8})
    await pg.click('#fxTgt [data-v="1"]'); await pg.wait_for_timeout(100); out.append(await pg.evaluate(T+"+' '+$('#fxStrip .fxp[data-i=\"0\"] .md').textContent"))
    await pg.click('#fxTgt [data-v="2"]'); out.append(await pg.evaluate(T))
    await pg.evaluate("fxCfg[0].target=[0,2]"); await pg.keyboard.press('F1'); await pg.wait_for_timeout(300)
    lv=await pg.evaluate("(()=>{const M=fxMix(clock.beat); return [...M.entries()].map(([k,m])=>k+':'+m.lv[0].toFixed(2))})()")
    md=await pg.evaluate("$('#fxStrip .fxp[data-i=\"0\"] .md').textContent")
    print(out, lv, md, errs)
    await b.close()
asyncio.run(main())
