import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
JS="""(() => { const out=[]; document.querySelectorAll('.field').forEach(f => { const r=f.querySelector(':scope>input[type=range]'), l=f.querySelector(':scope>label'); if(!r||!l||!l.offsetWidth) return;
  const o=r.nextElementSibling; const lb=l.getBoundingClientRect(), ob=o&&o.tagName==='OUTPUT'?o.getBoundingClientRect():null;
  if (l.scrollWidth>l.clientWidth+1) out.push('cut:'+l.textContent);
  if (ob && ob.width && lb.left+l.scrollWidth+8 > ob.left+7) out.push('overlap:'+l.textContent+'|'+o.textContent); }); return out; })()"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS)
    for w,h in [(1600,960),(1280,720)]:
      pg=await b.new_page(viewport={'width':w,'height':h}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
      await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
      await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
      await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300); await pg.evaluate("selectFx(9)")
      res=set(await pg.evaluate(JS))
      for tab in ['gTabs [data-v=colour]','gTabs [data-v=auto]','gTabs [data-v=time]']:
        if await pg.locator('#'+tab).count(): await pg.click('#'+tab); await pg.wait_for_timeout(150); res|=set(await pg.evaluate(JS))
      await pg.screenshot(path=str(OUT/f'inl_{w}.png'))
      print(w, sorted(res), errs); await pg.close()
    await b.close()
asyncio.run(main())
