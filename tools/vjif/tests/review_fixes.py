# regressions from the 0.52 code review: copying an empty scene, a URL name with %, the same file loading twice at
# once, BRB catching up after a hold, Smooth not bending Stutter / Melt timing
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width': 1600, 'height': 960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    bad = []
    r = await pg.evaluate("""(() => { const s0 = $('#scenes .scene[data-i="4"]'), s1 = $('#scenes .scene[data-i="5"]'), dt = new DataTransfer();
      s0.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt })); s1.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt, ctrlKey: true }));
      try { gotoScene(5, clock.beat, true); gotoScene(0, clock.beat, true); return sceneIdx === 0 } catch (e) { return String(e) } })()""")
    if r is not True: bad.append(f'empty scene copy: {r}')
    r = await pg.evaluate("(async () => { try { await loadUrlInto('http://127.0.0.1:9/100%.gif', 3); return true } catch (e) { return String(e) } })()")
    if r is not True: bad.append(f'url name with %: {r}')
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""(async () => { const bl = (await store.get('gif:' + pool[0].hash)).blob; const n0 = pool.length;
      await Promise.all([loadInto(5, bl, 'a.gif'), loadInto(6, bl, 'b.gif')]); return pool.length === n0 && pads[5].gif.media === pads[6].gif.media })()""")
    if r is not True: bad.append(f'same file twice at once: {r}')
    r = await pg.evaluate("""(() => { let n = 0; const g = gotoScene; scenes[3] = scenes[3] || emptyScene(); window.brbPick = () => 3; window.gotoScene = () => { n++ };
      brb.on = true; brb.bars = 4; brb.next = clock.beat - 64; for (let k = 0; k < 5; k++) brbTick(); window.gotoScene = g; brb.on = false; return n })()""")
    if r != 1: bad.append(f'BRB after a hold changed scene {r} times (want 1)')
    r = await pg.evaluate("[trEase(0.3, {smooth: true, type: 'stutter'}), trEase(0.3, {smooth: true, type: 'glitch', style: 'melt'}), trEase(0.3, {smooth: true, type: 'fade'})]")
    if r[0] != 0.3 or r[1] != 0.3 or r[2] == 0.3: bad.append(f'easing: {r}')
    # Prep on a still scene: nothing is redrawn frame after frame (it used to run every pass every frame)
    await pg.evaluate("fileTarget=7"); await pg.set_input_files('#fileIn', [str(S/'grad.gif')]); await pg.wait_for_function("pads[7].gif")
    r = await pg.evaluate("""(async () => { layers.forEach(L => L.clips = []); padToLayer(7, 0); startPrep(); const w = () => new Promise(r => setTimeout(r, 400)); await w();
      const d0 = drawn; await w(); await w(); const d = drawn - d0; dropPrep(); return d })()""")
    if r > 2: bad.append(f'Prep on a still scene redrew {r} times in 0.8 s')
    # no effect playing: no effect mix is built
    r = await pg.evaluate("fxFrame(clock.beat) === NOFX")
    if r is not True: bad.append('fxFrame built mixes with no effect playing')
    print('review fixes: all good' if not bad else 'FAILED: ' + '; '.join(bad))
    await b.close()
    if bad: raise SystemExit(1)
asyncio.run(main())
