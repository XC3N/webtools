import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
SP='/tmp/claude-0/-home-claude-webtools/1b2b3a57-6428-5293-a0ca-34110d8408a2/scratchpad'
async def shot(pg, sel, name):
    bb = await pg.evaluate(f"(() => {{ const r = document.querySelector('{sel}').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; }})()")
    await pg.screenshot(path=f'{SP}/{name}.png', clip={'x':bb[0],'y':bb[1],'width':bb[2],'height':bb[3]}, timeout=180000)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('busy.gif','KeyQ'),('grad.gif','KeyW')]):
      await pg.evaluate(f"setTarget({k}); fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(200)
    await pg.hover('.pad[data-i="0"]'); await pg.wait_for_timeout(200); await shot(pg, '#bank', 'ui_bank')
    await pg.evaluate("selectPad(0); $('#gTabs [data-v=colour]').click()"); await pg.wait_for_timeout(300); await shot(pg, '#side', 'ui_side')
    print(errs[:3])
    await b.close()
asyncio.run(main())
