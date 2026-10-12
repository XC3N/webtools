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
    await pg.evaluate("selectPad(0); $('#gTabs [data-v=play]').click()"); await pg.wait_for_timeout(300); await shot(pg, '#side', 'ui_side')
    # corrupt transition stills
    out = await pg.evaluate("""(() => { const res = []; transCfg = normTrans({ type: 'glitch', style: 'corrupt', len: 2, px: 12 }); trans = makeTrans([], [], 0);
      for (const e of [0.2, 0.35, 0.5, 0.65, 0.8]){ trA.setTransform(1,0,0,1,0,0); trB.setTransform(1,0,0,1,0,0); trA.fillStyle = '#c33'; trA.fillRect(0,0,CW,CH); trA.fillStyle='#fff'; trA.fillRect(CW*0.3,CH*0.3,CW*0.4,CH*0.4); trB.fillStyle = '#33c'; trB.fillRect(0,0,CW,CH); trB.fillStyle='#ff0'; trB.beginPath(); trB.arc(CW*0.5,CH*0.5,CH*0.3,0,7); trB.fill(); composeTransition(e, transCfg); const c = document.createElement('canvas'); c.width = 320; c.height = 180; c.getContext('2d').drawImage(mctx.canvas, 0, 0, 320, 180); res.push(c.toDataURL()); }
      trans = null; return res; })()""")
    import base64
    for i,u in enumerate(out): open(f'{SP}/trc{i}.png','wb').write(base64.b64decode(u.split(',')[1]))
    print(errs[:3])
    await b.close()
asyncio.run(main())
