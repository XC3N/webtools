# 0.64: Ctrl+drag a scene onto the empty scene you're on; Prep goes live on the downbeat with Snap off; Channel number modes;
# a click outside the canvas deselects even over a GIF that sticks out
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(200)
    # copy scene 1 (index 0) onto scene 3 (index 2) while on scene 3, empty
    r = await pg.evaluate("""() => { gotoScene(2, clock.beat, true); const tile = document.querySelector('#scenes .scene[data-i="2"]'), dt = new DataTransfer(); dt.setData('application/x-vjif-scene', '0');
      tile.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, ctrlKey: true }));
      return [sceneIdx, layers.reduce((a, L) => a + L.clips.length, 0), pads.filter(p => p.gif).length]; }""")
    print('copy', r); assert r == [2, 1, 1], r
    # Prep → go live with Snap off: waits for the downbeat
    g = await pg.evaluate("snapMode = 'off'; startPrep(); clock.beat = 5.5; goLive(); [pendingLive, !!prep]")
    print('golive', g); assert g == [8, True], g
    await pg.evaluate("clock.beat = 8.01; doGoLive(8)")
    # Channel modes
    ch = await pg.evaluate("""() => { liveName = 'Intro'; const out = []; for (const m of ['rand', 'scene', 'num']){ transCfg = normTrans({ type: 'tv', style: 'channel', ch: m, len: 2, dir: 'left', px: 12 }); trans = makeTrans([], [], 0); trans.b0 = clock.beat - 0.5; composeTransition(0.5, transCfg); out.push(trans.ch); } trans = null; return out; }""")
    print('channel', ch); assert len(ch[0]) == 2 and ch[1] == 'INTRO' and ch[2] == '03', ch
    # Options row shows the channel modes for Channel, arrows for Slide
    o = await pg.evaluate("transCfg = normTrans({ type: 'tv', style: 'channel', len: 2, dir: 'left', px: 12 }); syncTransUI(); const a = [...document.querySelectorAll('#trDir button')].map(b => b.textContent).join(','); transCfg = normTrans({ type: 'slide', len: 2, dir: 'left', px: 12 }); syncTransUI(); [a, [...document.querySelectorAll('#trDir button')].length]")
    print('options', o); assert o == ['Random,Scene,Scene #', 4], o
    await b.close()
asyncio.run(main())
