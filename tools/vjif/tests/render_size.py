import asyncio, pathlib, sys
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def run(p, rs):
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)+(e.stack or '')[:300]))
    await pg.add_init_script(f"localStorage.setItem('vjif-rscale', '{rs}')")
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for i,f in enumerate(['ring.gif','busy.gif']):
      await pg.evaluate(f"fileTarget={i}"); await pg.set_input_files('#fileIn',[str(S/f)]); await pg.wait_for_function(f"pads[{i}].gif")
    await pg.keyboard.press('KeyQ'); await pg.evaluate("setTarget(1)"); await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(300)
    await pg.evaluate("layers[1].clips[0].x = 300; layers[1].clips[0].sx = layers[1].clips[0].sy = 0.6; fxCfg[9].style='scan'; fxCfg[9].mode='latch'; fxCfg[2].target=1;")
    await pg.keyboard.press('F10'); await pg.wait_for_timeout(400)
    print(rs, 'canvas', await pg.evaluate("[master.width, master.height, CW, CH, W, H]"))
    t = await pg.evaluate("""async () => { let s = 0; for (let i = 0; i < 40; i++){ await new Promise(r => requestAnimationFrame(r)); redraw.all = true; const a = performance.now(); drawFrame(performance.now()); s += performance.now() - a; } return (s / 40).toFixed(1); }""")
    print(rs, 'drawFrame ms', t)
    bb = await pg.locator('#pv').bounding_box()
    await pg.screenshot(path=str(OUT/f'rs{rs}.png'), clip=bb)
    # transition + scene thumb + freeze + still
    await pg.keyboard.press('Digit2'); await pg.keyboard.press('Numpad2'); await pg.wait_for_timeout(500); await pg.keyboard.press('Numpad1'); await pg.wait_for_timeout(700)
    await pg.keyboard.down('Insert'); await pg.wait_for_timeout(200); await pg.keyboard.up('Insert')
    print(rs, 'tile', await pg.evaluate("!!liveThumb"))
    print(errs); await b.close()
async def main():
  async with async_playwright() as p:
    for rs in sys.argv[1:] or ['1', '0.5']: await run(p, rs)   # render scales to try (default: Full and 1/2)
asyncio.run(main())
