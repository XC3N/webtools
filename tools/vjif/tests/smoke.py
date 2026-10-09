import asyncio, pathlib, sys
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
F = sys.argv[1] if len(sys.argv) > 1 else DIST[len('file://'):]
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror',lambda e: errs.append(str(e)+' '+(e.stack or '')[:400]))
    pg.on('console', lambda m: m.type=='error' and errs.append('console: '+m.text))
    await pg.goto('file://'+F); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for i,f in enumerate(['red.gif','ring.gif','busy.gif']):
      await pg.evaluate(f"fileTarget={i}"); await pg.set_input_files('#fileIn',[str(S/f)]); await pg.wait_for_function(f"pads[{i}].gif")
    await pg.wait_for_timeout(300)
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(100)
    print('hit Q: clips', await pg.evaluate("layers.map(L=>L.clips.length).join()"), 'undo', await pg.evaluate("hist.undo.length"))
    await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(100)
    print('hit W: sel', await pg.evaluate("[selPad, $('#gName') ? $('#gName').value || $('#gName').textContent : '', uiDue, layers[target].clips.length, hist.undo.length]"))
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(100)
    print('re-hit Q (no new step)', await pg.evaluate("hist.undo.length"), 'touched', await pg.evaluate("touched.edit"))
    # colour cache: hue shift on pad 0
    await pg.evaluate("pads[0].gif.hsv.h = 90; applyFx(pads[0].gif); redraw.all = true"); await pg.wait_for_timeout(300)
    print('fxC entries', await pg.evaluate("pads[0].gif.fxC && pads[0].gif.fxC.list.length"))
    # scene change
    await pg.wait_for_timeout(1100)
    print('liveThumb', await pg.evaluate("!!liveThumb && liveThumb.length"))
    await pg.keyboard.press('Numpad2'); await pg.wait_for_timeout(200)
    print('scene 2', await pg.evaluate("[sceneIdx, !!scenes[0] && !!scenes[0].thumb, layers.map(L=>L.clips.length).join(), document.querySelectorAll('.scene')[0].style.backgroundImage.slice(0,30)]"))
    await pg.keyboard.press('Numpad1'); await pg.wait_for_timeout(200)
    print('back', await pg.evaluate("[sceneIdx, layers.map(L=>L.clips.length).join(), selPad]"))
    # thumb cache: renderPad twice
    print('pad thumb cached', await pg.evaluate("(()=>{ const t=pads[0].gif.thumb; renderPad(0); return t===pads[0].gif.thumb })()"))
    # effects: latch mirror & feedback & phosphor
    for code in ['F8','F12','F10']:
      await pg.keyboard.down(code); await pg.wait_for_timeout(150); await pg.keyboard.up(code)
    await pg.wait_for_timeout(300)
    print('fx sel', await pg.evaluate("[selFx, $('#fxStyle').children.length, fxTiles.length]"))
    # undo / redo
    await pg.evaluate("undo()"); await pg.evaluate("redo()")
    # drag edit -> undo step
    n0 = await pg.evaluate("hist.undo.length")
    await pg.evaluate("$('#xX').value = 100; $('#xX').dispatchEvent(new Event('input', {bubbles:true})); $('#xX').dispatchEvent(new Event('change', {bubbles:true}))")
    print('slider edit step', n0, '->', await pg.evaluate("hist.undo.length"))
    # transitions, prep
    await pg.keyboard.press('Digit2'); await pg.keyboard.press('Numpad3'); await pg.wait_for_timeout(500); await pg.keyboard.press('Numpad1'); await pg.wait_for_timeout(400)
    await pg.keyboard.press('Enter'); await pg.wait_for_timeout(300); await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(200); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(600)
    print('prep done', await pg.evaluate("[!!prep, sceneIdx]"))
    await pg.evaluate("autosave(true)"); await pg.wait_for_timeout(200)
    print('saved', await pg.evaluate("store.last.length > 100"))
    print('fps', await pg.evaluate("$('#fps').textContent"), await pg.evaluate("$('#load').textContent"))
    await pg.screenshot(path=str(OUT/'smoke.png'))
    print('ERRORS', errs)
    await b.close()
asyncio.run(main())
