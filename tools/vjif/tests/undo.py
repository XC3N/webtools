import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)+(e.stack or '')[:300]))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for i,f in enumerate(['red.gif','ring.gif']):
      await pg.evaluate(f"fileTarget={i}"); await pg.set_input_files('#fileIn',[str(S/f)]); await pg.wait_for_function(f"pads[{i}].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(100)
    ev = lambda js: pg.evaluate(js)
    print('clear', await ev("(() => { clearPad(0); const a = !pads[0].gif; undo(); const b = !!pads[0].gif && layers[0].clips.length; redo(); const c = !pads[0].gif; undo(); return [a, b, c, !!pads[0].gif] })()"))
    print('pswap', await ev("(() => { const g0 = pads[0].gif; swapPads(0, 2); const a = pads[2].gif === g0; undo(); const b = pads[0].gif === g0; redo(); const c = pads[2].gif === g0; undo(); return [a,b,c, pads[0].gif === g0] })()"))
    print('copy', await ev("(() => { copyPad(0, 3); const a = !!pads[3].gif; undo(); const b = !pads[3].gif; redo(); return [a, b, !!pads[3].gif] })()"))
    # scene 1 content; go to scene 2; empty scene 1 from there; swap scenes 1 and 3; undo should refill the scene now numbered 3
    print('scn', await ev("""(() => { gotoScene(1, clock.beat, true); emptySceneAt(0); const a = sceneCount(0); swapScenes(0, 2); const b = [sceneCount(0), sceneCount(2)];
       undo(); return [a, b, sceneCount(0), sceneCount(2), histWhat(hist.redo[hist.redo.length-1], hist.cur)] })()"""))
    print('state step across swap', await ev("""(() => { gotoScene(2, clock.beat, true); const c = selClip() || layers[0].clips[0]; layers[0].sel = c; c.x = 50; commit(); swapScenes(2, 5); gotoScene(0, clock.beat, true); undo();
       return [sceneIdx, layers[0].clips[0] && layers[0].clips[0].x] })()"""))
    print(errs); await b.close()
asyncio.run(main())
