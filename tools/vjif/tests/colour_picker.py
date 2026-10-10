# VJif's own colour picker: a colour swatch opens it (not the browser's), its sliders and hex field set the colour,
# 'input' fires while changing and 'change' on close; also: LFO Min / Max preview, Sync keeps effects on, empty scenes' layers on
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("window._ev=[]; const i=document.querySelector('.lfill'); i.addEventListener('input',()=>_ev.push('i')); i.addEventListener('change',()=>_ev.push('c'))")
    await pg.click('.lfill'); await pg.wait_for_timeout(100)
    vis = await pg.evaluate("!$('#cpk').hidden")
    await pg.fill('#cpk .cpkHex', '#ff0000'); await pg.press('#cpk .cpkHex', 'Enter')
    r1 = await pg.evaluate("[document.querySelector('.lfill').value, layers[0].fill, [...document.querySelectorAll('#cpk input[type=range]')].map(s=>+s.value)]")
    # hue slider: set via keyboard-free path (value + input event, like a drag)
    await pg.evaluate("const s=document.querySelector('#cpk [data-k=h]'); s.value=120; s.dispatchEvent(new Event('input',{bubbles:true}))")
    r2 = await pg.evaluate("document.querySelector('.lfill').value")
    await pg.keyboard.press('Escape'); await pg.wait_for_timeout(50)
    r3 = await pg.evaluate("[!$('#cpk').hidden, _ev.includes('i'), _ev[_ev.length-1]]")
    print(vis, r1, r2, r3)
    assert vis and r1[0] == '#ff0000' and r1[1] == '#ff0000' and r1[2] == [0, 100, 100, 255, 0, 0], r1
    assert r2 == '#00ff00', r2
    assert r3 == [False, True, 'c'], r3
    # Sync keeps a latched effect on
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300)
    await pg.evaluate("fxCfg[0].mode='latch'; fxDown(0)"); await pg.wait_for_timeout(1500)
    l0 = await pg.evaluate("fxLevel(0, clock.beat)")
    l1 = await pg.evaluate("const b=clock.beat; $('#syncBtn').click(); [fxLevel(0, clock.beat), clock.beat, b]")
    print('sync', l0, l1)
    assert l0 > 0.5 and l1[0] > 0.5 and l1[1] < 0.1 < l1[2], (l0, l1)
    # LFO Min / Max: while set, the GIF shows that end
    await pg.evaluate("selectPad(0); const g=curGif(); g.lfo.rot={on:true,min:-10,max:10,shape:'sine',per:8,ph:0,sync:'clock'}; aSel='rot'; syncAutoUI(g)")
    v = await pg.evaluate("const s=$('#aMax'); s.value=90; s.dispatchEvent(new Event('input',{bubbles:true})); const L=layers.find(L=>L.clips.length), c=L.clips[0]; effClip(c, pads[c.pad].gif).rot - c.rot")
    await pg.wait_for_timeout(900)
    v2 = await pg.evaluate("const L=layers.find(L=>L.clips.length), c=L.clips[0]; effClip(c, pads[c.pad].gif).rot - c.rot")
    print('peek', v, v2)
    assert abs(v - 90) < 1e-6 and abs(v2 - 90) > 1e-6, (v, v2)
    # an emptied scene's layers are on
    await pg.evaluate("emptySceneAt(sceneIdx)")
    on = await pg.evaluate("layers.map(L=>L.on)")
    print('layers', on); assert all(on), on
    await b.close()
asyncio.run(main())
