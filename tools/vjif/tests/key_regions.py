import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'key-regions.gif')]); await pg.wait_for_function("pads[0].gif")
    for reg in ['all','edges','point']:
      await pg.evaluate(f"(() => {{ const g=pads[0].gif; g.key.on=true; g.key.color=[255,255,255]; g.key.region='{reg}'; g.key.seed=[100/320,100/200]; scheduleFx(g,0); }})()")
      await pg.wait_for_timeout(1500)
      r=await pg.evaluate("""(() => { const g=pads[0].gif, f=fxImage(g,0), c=new OffscreenCanvas(320,200), x=c.getContext('2d'); x.drawImage(f,0,0,320,200);
        return [[5,5],[100,100],[227,77],[262,122]].map(([a,b2])=>x.getImageData(a,b2,1,1).data[3]); })()""")
      print(reg, 'alpha bg/ringhole/win1/win2', r)
    print(errs); await b.close()
asyncio.run(main())
