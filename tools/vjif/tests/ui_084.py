# 0.84: Alt+click renames (pad GIF, effect preset), pad copy-over with hold, emptied scene loses its name (undo brings it
# back), help search, blank slider rows, TV › Channel Number row, Slide → Wipe migration, Blackout fade setting
import asyncio
from _env import DIST, FIX, ARGS, OUT
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('grad.gif','KeyQ'),('red.gif','KeyW')]):
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
    # Alt+click a pad: rename its GIF
    await pg.keyboard.down('Alt'); await pg.click('.pad[data-i="0"]'); await pg.keyboard.up('Alt'); await pg.wait_for_timeout(200)
    await pg.keyboard.type('Sky'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
    r1 = await pg.evaluate("[pads[0].gif.name, layers.some(L => L.clips.some(c => c.pad === 0))]")
    # Alt+click a preset: name it
    await pg.evaluate("fxPre[0].fx = { [FXI.mono]: fxEntry(FXI.mono) }; syncFxUI()"); n0 = await pg.evaluate("NFX")
    await pg.keyboard.down('Alt'); await pg.click(f'#fxPre .fxp[data-i="{n0}"]'); await pg.keyboard.up('Alt'); await pg.wait_for_timeout(200)
    await pg.keyboard.type('Noir'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(200)
    r2 = await pg.evaluate("[fxPre[0].name, [...document.querySelectorAll('#fxPre .fxp')].find(x => +x.dataset.i === NFX).querySelector('.n').textContent, fxPreName(fxPre[0])]")
    # copy over a full pad: refused at once, replaced after the hold (undo brings it back)
    r3 = await pg.evaluate("""(() => { const a = pads[1].gif; copyPad(0, 1); const kept = pads[1].gif === a; copyPad(0, 1, true); const rep = pads[1].gif !== a && pads[1].gif.name === 'Sky'; undo(); return [kept, rep, pads[1].gif === a]; })()""")
    # emptied scene: its name goes, undo brings it back
    r4 = await pg.evaluate("""(() => { setSceneName(sceneIdx, 'Intro'); pads[0].gif && padToLayer(0, 0); emptySceneAt(sceneIdx); const a = sceneName(sceneIdx); undo(); return [a, sceneName(sceneIdx)]; })()""")
    # help search
    await pg.keyboard.press('Shift+Slash'); await pg.wait_for_timeout(200)
    await pg.keyboard.type('blackout'); await pg.wait_for_timeout(200)
    r5 = await pg.evaluate("[document.activeElement.id, [...document.querySelectorAll('#helpPanel dt')].filter(d => !d.hidden).map(d => d.textContent), [...document.querySelectorAll('#helpPanel .khead')].filter(h => !h.hidden).length]")
    await pg.keyboard.press('Escape')
    # blank rows, Number row, Slide → Wipe, Blackout fade
    r6 = await pg.evaluate("""(() => { selectFx(FXI.mono); const a = $('#fxRateRow').classList.contains('dimmed') && getComputedStyle($('#fxRateRow label')).visibility;
      transCfg = normTrans({ type: 'tv', style: 'channel', len: 2 }); syncTransUI(); const n = [$('#trPxRow label').textContent, $('#trPx').nextElementSibling.textContent];
      const w = normTrans({ type: 'slide', style: 'bands' }), w2 = normTrans({ type: 'wipe' }), w3 = normTrans({ type: 'glitch', style: 'scramble' });
      $('#blackMsR').value = 5; $('#blackMsR').dispatchEvent(new Event('input'));
      return [a, n, [w.type, w.style, w2.style, w3.style], TR_TYPES.length, BLACK_MS, $('#blackMsV').textContent, !!$('#allPipC').closest('.row').previousElementSibling.matches('#themeBox')]; })()""")
    # the swap row is revealed clear of the column's bottom edge
    await pg.evaluate("selectPad(0); $('#gTabs [data-v=colour]').click(); $('#side').scrollTop = 0"); await pg.wait_for_timeout(300)
    await pg.evaluate("document.querySelector('#swPal button').click()"); await pg.wait_for_timeout(1200)
    r7 = await pg.evaluate("(() => { const r = document.querySelector('#swList .swr.sel').getBoundingClientRect(), s = $('#side').getBoundingClientRect(); return [r.bottom <= s.bottom + 1, r.top >= s.top]; })()")
    print('rename pad', r1, '| preset', r2, '| copy over', r3, '| scene name', r4, '| help', r5, '| rows', r6, '| reveal', r7, errs)
    assert r1 == ['Sky', False], r1
    assert r2 == ['Noir', 'Noir', 'Noir'], r2
    assert r3 == [True, True, True], r3
    assert r4 == ['', 'Intro'], r4
    assert r5[0] == 'helpQ' and r5[1] and all('0' in t or 'Settings' in t or True for t in r5[1]) and r5[2] >= 1, r5
    assert r6 == ['hidden', ['Number', '0.8 s'], ['wipe', 'bands', 'line', 'corrupt'], 8, 1000, '1 s', True], r6
    assert r7 == [True, True], r7
    assert not errs, errs
    await b.close()
asyncio.run(main())
