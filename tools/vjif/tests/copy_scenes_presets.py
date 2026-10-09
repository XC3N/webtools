import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300)
    # presets: put Mirror in preset 1 (index NFX+0)
    await pg.evaluate("addPreFx(0, 7); renderScenes(); syncFxUI()")
    async def c(sel): bb=await pg.locator(sel).bounding_box(); return bb['x']+bb['width']/2, bb['y']+bb['height']/2
    a=await c('#fxPre .fxp[data-i="%d"]' % await pg.evaluate("NFX")); t=await c('#fxPre .fxp[data-i="%d"]' % await pg.evaluate("NFX+1"))
    m=pg.mouse
    await m.move(*a); await m.down(); await m.move(a[0]+15,a[1],steps=3); await m.move(*t,steps=5); await pg.keyboard.down('Control'); await pg.wait_for_timeout(100)
    st=await pg.evaluate("[document.body.classList.contains('precopy'), $('#fxPre .fxp[data-i=\"'+(NFX+1)+'\"]').classList.contains('drop')]")
    await pg.screenshot(path=str(OUT/'cpy2.png'), clip={'x':a[0]-150,'y':a[1]-120,'width':300,'height':200})
    await m.up(); await pg.keyboard.up('Control'); await pg.wait_for_timeout(100)
    r1=await pg.evaluate("[Object.keys(fxPre[0].fx), Object.keys(fxPre[1].fx)]")
    # swap preset 2 with 3 (no ctrl)
    t3=await c('#fxPre .fxp[data-i="%d"]' % await pg.evaluate("NFX+2"))
    await m.move(*t); await m.down(); await m.move(t[0]+15,t[1],steps=3); await m.move(*t3,steps=5); await m.up(); await pg.wait_for_timeout(100)
    r2=await pg.evaluate("[Object.keys(fxPre[1].fx), Object.keys(fxPre[2].fx)]")
    # scenes: synthetic drag scene 0 (live) to scene 1 with ctrl
    r3=await pg.evaluate("""(() => { const s0=$('#scenes .scene[data-i="0"]'), s1=$('#scenes .scene[data-i="1"]'); const dt=new DataTransfer();
      s0.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:dt}));
      s1.dispatchEvent(new DragEvent('dragover',{bubbles:true,cancelable:true,dataTransfer:dt,ctrlKey:true}));
      const cls=$('#scenes').classList.contains('copying');
      s1.dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:dt,ctrlKey:true}));
      return [cls, sceneCount(1), scenePads(1), sceneIdx]; })()""")
    print(st, r1, r2, r3, errs)
    await b.close()
asyncio.run(main())
