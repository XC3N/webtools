import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    async def box(i): bb=await pg.locator(f'.pad[data-i="{i}"]').bounding_box(); return bb['x']+bb['width']/2, bb['y']+bb['height']/2
    x0,y0=await box(0); x1,y1=await box(1); x2,y2=await box(2)
    m=pg.mouse
    await m.move(x0,y0); await m.down(); await m.move(x0+20,y0,steps=3); await m.move(x1,y1,steps=5)
    await pg.keyboard.down('Control'); await pg.wait_for_timeout(100)
    st=await pg.evaluate("[document.body.classList.contains('padcopy'), pads[1].el.classList.contains('drop')]")
    await pg.screenshot(path=str(OUT/'cpy.png'), clip={'x':0,'y':90,'width':300,'height':200})
    await m.up(); await pg.keyboard.up('Control'); await pg.wait_for_timeout(200)
    print('copy mode',st,'after',await pg.evaluate("[!!pads[0].gif,!!pads[1].gif, pads[0].gif.media===pads[1].gif.media]"))
    # ctrl at start, release mid drag -> move
    await m.move(x1,y1); await pg.keyboard.down('Control'); await m.down(); await m.move(x1+20,y1,steps=3); await m.move(x2,y2,steps=5)
    await pg.keyboard.up('Control'); await pg.wait_for_timeout(50); await m.move(x2+1,y2)
    await m.up(); await pg.wait_for_timeout(200)
    print('move',await pg.evaluate("[!!pads[0].gif,!!pads[1].gif,!!pads[2].gif]"))
    # ctrl+click clears
    await pg.keyboard.down('Control'); await m.click(x2,y2); await pg.keyboard.up('Control'); await pg.wait_for_timeout(200)
    print('clear',await pg.evaluate("!!pads[2].gif"), errs)
    await b.close()
asyncio.run(main())
