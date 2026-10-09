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
    await pg.evaluate("pvOpt.guides={diag:true}; pvOpt.stick=true; const c=layers[0].clips[0]; c.sx=c.sy=0.25; c.x=0; c.y=0; layers[0].sel=c; redraw.all=true")
    # clip centre at canvas centre (on both diagonals). drag it to a point near the diagonal
    bb=await pg.locator('#pv').bounding_box()
    vw=await pg.evaluate("[view.x,view.y,view.w,view.h,W,H]")
    vx,vy,vwid,vh,W,H=vw
    def scr(x,y): return bb['x']+vx+x*vwid/W, bb['y']+vy+y*vh/H
    m=pg.mouse
    await m.move(*scr(W/2,H/2)); await m.down()
    await m.move(*scr(W*0.3, H*0.3+10), steps=8); await pg.wait_for_timeout(100)
    r=await pg.evaluate("(()=>{const G=clipGeom(layers[0].clips[0]); return [G.cx/W, G.cy/H, drag && drag.snap && drag.snap.line]})()")
    await pg.screenshot(path=str(OUT/'diag.png'), clip={'x':bb['x']+vx,'y':bb['y']+vy,'width':vwid,'height':vh})
    await m.up()
    print(r, errs)
    await b.close()
asyncio.run(main())
