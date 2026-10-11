# 0.68–0.74 features: Trig Follow, the Credits window, CPU thumbnails; layer solo, the frame loop with hidden / covered windows, Rec ▾ items, BRB linked to Prep, count-in, transition regroup and options, border deselect, Ctrl hush, folding sections, Swap › Pick, LFO gap, mask modes, shadow crop
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("layers.forEach((L, k) => L.on = k !== 2); syncLayerUI()")
    await pg.click('.layer:nth-child(2) .lon', button='right')
    s1 = await pg.evaluate("layers.map(L => +L.on).join('')")
    await pg.click('.layer:nth-child(2) .lon', button='right')
    s2 = await pg.evaluate("layers.map(L => +L.on).join('')")
    print('solo', s1, s2); assert (s1, s2) == ('0100', '1101'), (s1, s2)
    # the control window hidden, no output window: a worker timer drives the frames
    d = await pg.evaluate("""new Promise(res => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); restartLoop();
      const f0 = lastFrame; setTimeout(() => res([driver, lastFrame > f0]), 400); })""")
    print('hidden', d); assert d == ['timer', True], d
    d2 = await pg.evaluate("""new Promise(res => { delete document.hidden; restartLoop(); setTimeout(() => res(driver), 200); })""")
    print('shown', d2); assert d2 == 'control', d2
    m = await pg.evaluate("!!document.querySelector('#recPop #musSync') && !document.querySelector('#setPanel #musSync')")
    print('musSync in Rec', m); assert m
    # BRB linked to Prep: the output changes scenes on its own, the editor stays
    from _env import FIX as S
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'ring.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(200)
    await pg.evaluate("gotoScene(1, clock.beat, true)"); await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'ring.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(200)
    await pg.evaluate("gotoScene(2, clock.beat, true)"); await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(S/'ring.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(200)
    await pg.evaluate("gotoScene(0, clock.beat, true)")
    r = await pg.evaluate("[sceneCount(0), sceneCount(1), sceneCount(2)]"); print('scenes', r)
    await pg.click("#brbLink"); await pg.evaluate("transCfg = trPresets[1]; transCfg.len = 16; startPrep()")
    lk = await pg.evaluate("[brb.link, brb.on, prep.scene]"); print('linked', lk); assert lk == [True, True, 0], lk
    await pg.evaluate("sceneKey(2)"); await pg.wait_for_timeout(100)
    await pg.evaluate("brb.next = clock.beat - 0.01"); await pg.wait_for_function("prep.scene !== 0", timeout=20000)   # the next frame runs BRB (slow machines: wait for it)
    sw = await pg.evaluate("[prep.scene, sceneIdx, !!prep.tr, brb.on]"); print('switched', sw); assert sw == [1, 2, True, True], sw
    await pg.wait_for_timeout(300)
    await pg.evaluate("doGoLive()"); gl = await pg.evaluate("[!!prep, brb.on]"); print('live', gl); assert gl == [False, False], gl
    # count-in in Rec ▾, transitions regrouped
    c = await pg.evaluate("[!!document.querySelector('#recPopRows .seg[data-src=\"#recCountSeg\"]'), normTrans({ type: 'glitch', style: 'melt' }).type, normTrans({ type: 'glitch', style: 'channel' }).type, TR_TYPES.length]")
    print('count-in / regroup', c); assert c == [True, 'dissolve', 'tv', 9], c
    # a click in the border on nothing deselects, and it stays deselected (it used to fall back to the last GIF)
    bd = await pg.evaluate("""(() => { const L = layers[target]; if (!L.clips.length) return 'no clips'; L.sel = L.clips[0]; const r = pv.getBoundingClientRect();
      pv.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + 3, clientY: r.top + 3, pointerId: 1, bubbles: true })); pv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
      return [L.sel, selClip()]; })()""")
    print('border', bd); assert bd == [False, None], bd
    # after a Ctrl+drag copy, Ctrl+click doesn't remove until Ctrl is pressed again
    h = await pg.evaluate("hushDel(); const a = isRm({ ctrlKey: true }); dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' })); [a, isRm({ ctrlKey: true })]")
    print('hush', h); assert h == [False, True], h
    # 0.72: GIF sections fold, Swap › Pick arms, Options › Rnd picks a direction each time
    fo = await pg.evaluate("(() => { const s = [...document.querySelectorAll('#gPanes [data-pane=colour] .sub.foldable')].find(x => x.textContent.includes('Shadow')); s.querySelector('span').click(); const a = s.nextElementSibling.classList.contains('foldhid'); s.querySelector('span').click(); return [a, s.nextElementSibling.classList.contains('foldhid')]; })()")
    print('fold', fo); assert fo == [True, False], fo
    pk = await pg.evaluate("$('#swPick').click(); const a = picking; $('#swPick').click(); [a, picking]")
    print('pick', pk); assert pk == ['swap', False], pk
    rd = await pg.evaluate("transCfg = normTrans({ type: 'slide', dir: 'rand', len: 2 }); new Set(Array.from({ length: 60 }, () => makeTrans([], [], 0).cfg.dir)).size")
    print('rand dirs', rd); assert rd == 4, rd
    # 0.73: LFO gap holds, mask blend modes, transition options, shadow crop draws
    gp = await pg.evaluate("const A = { per: 4, ph: 0, gap: 4, shape: 'up' }; [lfoPosT(A, 2), lfoPosT(A, 6), lfoPosT(A, 9)].map(v => Math.round(v * 100) / 100)")
    print('gap', gp); assert gp == [0.5, 1.0, 1.25], gp
    mk = await pg.evaluate("[BLENDS.some(b => b[0] === 'destination-out'), MASK_BLENDS.has('destination-in')]")
    print('masks', mk); assert mk == [True, True], mk
    op = await pg.evaluate("transCfg = normTrans({ type: 'wipe', style: 'line', dir: 'left', len: 2 }); syncTransUI(); const s = document.querySelector('#trDir [data-k=soft]'); s.click(); const a = transCfg.soft; transCfg = normTrans({ type: 'zoom', len: 2 }); syncTransUI(); document.querySelector('#trDir [data-v=thru]').click(); [a, transCfg.zoom, document.querySelectorAll('#trDir button').length]")
    print('options', op); assert op == [True, 'thru', 3], op
    sc = await pg.evaluate("(() => { const g = pads[0].gif; if (!g) return 'no gif'; g.shadow = { ...SHADOW_DEF, on: true, cut: 0.6 }; const c = layers.flatMap(L => L.clips).find(c => c.pad === 0); const cv = document.createElement('canvas'); cv.width = 320; cv.height = 180; const x = cv.getContext('2d'); x.scale(320 / W, 180 / H); drawClip(x, effClip(c, g), g, fxImage(g, 0, c)); return 'ok'; })()")
    print('shadow crop', sc); assert sc == 'ok', sc
    # 0.74: Trig Follow, Credits over About, thumbnails without a GPU read-back
    tf = await pg.evaluate("selectFx(0); fxPlay(5); fxUp(5); const a = selFx; $('#fxFollow').click(); fxPlay(5); fxUp(5); const r = [a, selFx, fxFollow]; $('#fxFollow').click(); r")
    print('follow', tf); assert tf == [0, 5, True], tf
    cr = await pg.evaluate("$('#aboutPanel').hidden = false; $('#credBtn').click(); const a = !$('#credPanel').hidden && $('#credPanel .credBody').textContent.includes('VCR OSD Mono'); a")
    await pg.keyboard.press('Escape')
    cr2 = await pg.evaluate("[$('#credPanel').hidden, $('#aboutPanel').hidden]"); await pg.evaluate("closeAbout()")
    print('credits', cr, cr2); assert cr and cr2 == [True, False], (cr, cr2)
    th = await pg.evaluate("(() => { const t = performance.now(); const u = sceneThumb(); return [typeof u === 'string' && u.startsWith('data:image/jpeg'), performance.now() - t < 100]; })()")
    print('thumb', th); assert th == [True, True], th
    await b.close()
asyncio.run(main())
