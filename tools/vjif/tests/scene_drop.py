# GIFs dropped on a scene tile go to that scene's first empty pad; a file decoding for one scene doesn't mark pads on another
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""() => { const tile = document.querySelector('#scenes .scene[data-i="3"]'), dt = new DataTransfer(); dt.setData(POOL_MIME, pool[0].hash);
      tile.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
      const dt2 = new DataTransfer(); dt2.setData(POOL_MIME, pool[0].hash); tile.dispatchEvent(new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true }));
      return [sceneIdx, scenes[3] && scenes[3].pads.map((g, i) => g ? i : -1).filter(i => i >= 0)]; }""")
    print('drop', r); assert r == [0, [0, 1]], r
    # a slow decode for scene 1, then switch to scene 2: no pad shows "decoding" there
    st = await pg.evaluate("""async () => { let rel; const orig = mediaFor; window.mediaFor = (...a) => new Promise(res => { rel = () => res(orig(...a)); });
      const blob = await (await fetch(pool[0].url || URL.createObjectURL(new Blob()))).blob().catch(() => new Blob());
      const job = loadInto(5, new Blob([new Uint8Array(10)]), 'x.gif'); const here = pads[5].el.classList.contains('loading');
      gotoScene(1); await new Promise(r => setTimeout(r, 100)); const there = pads[5].el.classList.contains('loading') || pads[5].loading;
      gotoScene(0); await new Promise(r => setTimeout(r, 100)); const back = pads[5].loading;
      window.mediaFor = orig; rel(); await job.catch(() => {}); return [here, there, back, pads[5].loading]; }""")
    print('loading', st); assert st == [True, False, True, False], st
    await b.close()
asyncio.run(main())
