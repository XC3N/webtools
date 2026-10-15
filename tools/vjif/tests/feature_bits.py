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
    print('count-in / regroup', c); assert c == [True, 'dissolve', 'tv', 8], c   # 8 types since Slide joined Wipe (0.84)
    # a click in the border on nothing deselects, and it stays deselected (it used to fall back to the last GIF)
    bd = await pg.evaluate("""(() => { const li = layers.findIndex(L => L.clips.length); if (li < 0) return 'no clips'; setTarget(li); const L = layers[li];   /* 0.88: a Scene pad plays on Midground */ L.sel = L.clips[0]; const r = pv.getBoundingClientRect();
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
    rd = await pg.evaluate("transCfg = normTrans({ type: 'wipe', style: 'push', dir: 'rand', len: 2 }); new Set(Array.from({ length: 60 }, () => makeTrans([], [], 0).cfg.dir)).size")
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
    # 0.74.1: dragging an effect tile leaves it as it was (a latched one stays on, an off one stays off)
    dg = []
    for on in (False, True):
        r = await pg.evaluate(f"(() => {{ fxCfg[0].mode = 'latch'; fxSt[0].on = {str(on).lower()}; const t = document.querySelector('#fxPads .fxp[data-i=\"0\"]').getBoundingClientRect(); return [t.left + t.width / 2, t.top + t.height / 2]; }})()")
        await pg.mouse.move(r[0], r[1]); await pg.mouse.down(); await pg.mouse.move(r[0] + 40, r[1] + 40, steps=4); await pg.mouse.move(r[0] + 80, r[1] - 200, steps=4); await pg.mouse.up()
        dg.append(await pg.evaluate("fxSt[0].on"))
    await pg.evaluate("fxSt[0].on = false; fxCfg[0].mode = 'hold'")
    print('drag keeps state', dg); assert dg == [False, True], dg
    # 0.75: Auto › Envelope (ADSR per hit: Attack / Decay play out, Sustain while held, Release); Depth scales the LFO, Only replaces it
    ev = await pg.evaluate("""(() => { const A = { ea: 1, ed: 2, es: 0.5, er: 1 }, r = v => Math.round(v * 100) / 100;
      const held = { hitBeat: 0, relBeat: null }, tap = { hitBeat: 0, relBeat: 0.2 };
      return [r(lfoEnv(A, held, 0.5)), r(lfoEnv(A, held, 2)), r(lfoEnv(A, held, 9)), r(lfoEnv(A, tap, 2)), r(lfoEnv(A, tap, 3.5)), lfoEnv(A, tap, 4.5), lfoEnv(A, {}, 1),
        r(lfoUnit({ ...A, em: 'only', shape: 'square', per: 4, ph: 0, sync: 'clock' }, held, 1, 0.5)), lfoUnit({ ...A, em: 'depth', shape: 'up', per: 4, ph: 0, sync: 'clock' }, {}, 1, 1)]; })()""")
    print('lfo env', ev); assert ev == [0.5, 0.75, 0.5, 0.75, 0.25, 0, 0, 0.5, 0], ev
    eu = await pg.evaluate("""(() => { if (!pads[0].gif) return 'no gif'; selectPad(0); $('#gTabs [data-v=auto]').click(); document.querySelector('#aEnv [data-v=only]').click();
      const A = pads[0].gif.lfo[aSel]; const r = [A.em, A.on, $('#aShape').closest('.field').classList.contains('dimmed'), $('#aEA').closest('.field').classList.contains('dimmed')];
      document.querySelector('#aEnv [data-v=off]').click(); r.push($('#aEA').closest('.field').classList.contains('dimmed')); return r; })()""")
    print('env ui', eu); assert eu == ['only', True, True, False, True], eu
    await pg.evaluate("document.querySelector('#aEnv [data-v=depth]').click()")
    await pg.evaluate("$('#aReset').click()")
    # 0.76: Claude's VJif theme (Claude's Mopho stays Bad MOPHO's), Sound in Rec ▾ drives Settings › Sound, level meters, soft shadow crop
    th = await pg.evaluate("[...document.querySelectorAll('#themeBox .thm-preset option')].map(o => o.value)")
    print('themes', th); assert "Mopho" in th and "Claude's VJif" not in th and "Claude's Mopho" not in th, th   # 0.88: Claude's VJif dropped
    sn = await pg.evaluate("""(() => { $('#recCfg').click(); const p = $('#recPopSnd'), s = $('#recAudioSel'); const o = [...p.options].map(o => o.value); const v = o.find(x => x === 'music') || o[o.length - 1];
      p.value = v; p.dispatchEvent(new Event('change')); const r = [o.length === s.options.length, s.value === v, document.querySelectorAll('.vu').length]; $('#recCfg').click(); s.value = ''; s.dispatchEvent(new Event('change')); return r; })()""")
    print('rec sound', sn); assert sn == [True, True, 2], sn
    so = await pg.evaluate("SHADOW_DEF.soft")
    print('soft default', so); assert so == 0.2, so
    # 0.77: Shift+numpad plays an effect preset (Caps Lock off), a locked layer lets the mouse through, Glitch › Corrupt (old Scramble maps to it), a tile click still plays
    sh = await pg.evaluate("""(() => { setCaps(false); dispatchEvent(new KeyboardEvent('keydown', { code: 'Numpad3', key: '3', shiftKey: true })); const a = fxSt[NFX + 2].held;
      dispatchEvent(new KeyboardEvent('keyup', { code: 'Numpad3', key: '3' })); return [a, fxSt[NFX + 2].held, heldPre]; })()""")
    print('shift+numpad', sh); assert sh == [True, False, -1], sh
    lk = await pg.evaluate("""(() => { const L = layers[1], c = newClip(0); L.clips = [c]; L.on = true; L.opacity = 1; const G = clipGeom(c); const n = hitsAt(G.cx, G.cy, false).length;
      L.lock = true; const m = hitsAt(G.cx, G.cy, false).length, k = hitsAt(G.cx, G.cy, false, true).length; L.lock = false; L.clips = []; return [n, m, k]; })()""")
    print('lock', lk); assert lk == [1, 0, 1], lk
    gc = await pg.evaluate("[FX_DEFS[FXI.glitch].styles.map(s => s[0]).includes('corrupt'), FX_DEFS[FXI.glitch].styles[styleIdx(FXI.glitch, 'scramble')][0]]")
    print('corrupt', gc); assert gc == [True, 'corrupt'], gc
    tc = []
    for _ in range(2):
        r = await pg.evaluate("(() => { fxCfg[0].mode = 'latch'; const t = document.querySelector('#fxPads .fxp[data-i=\"0\"]').getBoundingClientRect(); return [t.left + t.width / 2, t.top + t.height / 2]; })()")
        await pg.mouse.click(r[0], r[1]); tc.append(await pg.evaluate("fxSt[0].on"))
    await pg.evaluate("fxCfg[0].mode = 'hold'")
    print('tile click', tc); assert tc == [True, False], tc
    # 0.78: effect pads regrouped; an older set's effects follow their effect to its new slot
    mg = await pg.evaluate("""(() => { const on = Array(21).fill(0); on[2] = 1; on[10] = 1;
      const o = upgradeSnap({ v: 5, fx: FX_ORDER_V1.map(id => ({ tag: id })), fxPre: [{ fx: { 2: { a: 1 }, 10: { b: 1 } } }], fxOn: on.slice(), scenes: [{ fxOn: on.slice() }, null] });
      return [FX_DEFS.map(d => d.id).join(','), o.fx.every((c, i) => c.tag === FX_DEFS[i].id), Object.keys(o.fxPre[0].fx).map(Number).sort((a, b) => a - b).join(','), o.fxOn[FXI.strobe], o.fxOn[FXI.pixel], o.fxOn[2], o.scenes[0].fxOn[FXI.strobe]]; })()""")
    # 0.79: Glitch styles stack (Keyframe, Crunch), the Glitch transition's Scramble became Corrupt, × on pads / scenes / presets, Trigger inside Play
    g9 = await pg.evaluate("""[styleParts(FXI.glitch, 'corrupt+crunch').join('+'), styleParts(FXI.glitch, 'scramble').join(), normTrans({ type: 'glitch', style: 'scramble' }).style,
      document.querySelectorAll('.pad .xdel').length, document.querySelectorAll('#scenes .scene .xdel').length, document.querySelectorAll('#fxPre .fxp .xdel').length,
      !document.querySelector('#gTabs [data-v=trig]'), !!document.querySelector('[data-pane=play] #tMode'), !!document.querySelector('[data-pane=colour] #gSmooth')]""")
    print('0.79', g9); assert g9 == ['corrupt+crunch', 'corrupt', 'corrupt', 27, 36, 9, True, True, True], g9
    sw = await pg.evaluate("[hsvOn({ hsv: { h: 10, s: 1, v: 1, off: true } }), hsvOn({ hsv: { h: 10, s: 1, v: 1 } }), palOn({ pal: { i: 2, off: true } }), palOn({ pal: { i: 2 } }), swapOn({ swap: [1], swapOff: true }), swapOn({ swap: [1] }), ['fOn', 'tOn', 'hOn', 'pOn', 'swOn'].every(id => !!document.getElementById(id))]")
    print('switches', sw); assert sw == [False, True, False, True, False, True, True], sw
    print('fx order', mg); assert mg == ['mono,colour,poster,strobe,zoom,shake,wobble,mirror,pixel,glitch,rgb,feedback', True, '3,8', 1, 1, 0, 1], mg
    d82 = await pg.evaluate("""(() => { selectFx(FXI.colour); const C = fxCfg[FXI.colour], was = C.style, wp = C.pal; C.style = 'pal'; C.pal = FX_PALS.findIndex(p => p.n === 'GB'); syncFxUI();
      const a = $('#fxRateRow label').textContent + '/' + [...document.querySelectorAll('#fxDpat button')].map(b => b.title.split(':')[0]).join(',') + '/' + getComputedStyle($('#fxRate')).display;
      C.pal = 0; syncFxUI(); const a2 = $('#fxRateRow label').textContent + '/' + $('#fxRateSeg').hidden; C.style = 'flip'; syncFxUI(); C.style = was; C.pal = wp; syncFxUI();
      return [a, a2, FX_PALS.at(-1).n, FX_PALS.at(-1).c.length, 'dots' in fxEntry(FXI.colour), PAL_ORDER.map(i => FX_PALS[i].n).join(',')]; })()""")
    print('0.82', d82); assert d82 == ['Dot Matrix/LCD off,Game Boy pixels,Dot matrix/none', 'Dither/true', 'ZX Spectrum', 15, True, 'CGA 1,CGA 2,CGA 3,ZX Spectrum,C64,NES,EGA,GB,GB Pocket,GB Light'], d82   # 0.87.2: LCD icons in Dither's pattern slot for the Game Boy palettes; palettes by year
    d83 = await pg.evaluate("""(() => { const g = pads[0].gif; selectPad(0); $('#gTabs [data-v=colour]').click(); g.swap = [{ from: [1, 2, 3], to: [9, 9, 9] }]; g.swapOff = false; syncGifUI(); return [...document.querySelectorAll('#gLoop button')].map(b => b.textContent).join('/'); })()""")
    await pg.click('#swOn', force=True); await pg.wait_for_timeout(100); off = await pg.evaluate("[pads[0].gif.swapOff, $('#swOn').checked]")
    await pg.click('#swOn', force=True); await pg.wait_for_timeout(100); on = await pg.evaluate("[pads[0].gif.swapOff, $('#swOn').checked]")
    m83 = await pg.evaluate("""(() => { const g = pads[0].gif, keep = gifSettings(g); applyGifSettings(g, { ...keep, loop: 'once', trig: 'stay' }); const r = [g.loop, g.trig, g.env.len];
      applyGifSettings(g, keep); return [r, $('#tMode button').textContent, !document.querySelector('#gClear'), [...document.querySelectorAll('#aEnv button')].map(b => b.textContent).join('/'), !!$('#gSmooth').closest('[data-pane=colour]')]; })()""")
    print('0.83', d83, off, on, m83); assert d83 == 'Forward/Reverse/Ping-pong' and off == [True, False] and on == [False, True], (d83, off, on)
    assert m83 == [['loop', 'fade', 'gif'], 'Loop', True, 'Off/LFO depth/Bypass LFO', True], m83
    d86 = await pg.evaluate("""(() => { selectFx(FXI.shake); const a = [$('#fxSizeRow label').textContent, document.querySelectorAll('#fxSizeSeg button').length, !!$('#fxSizeSeg button.on')];   // 0.87.3: Shake › Edges, one icon toggle (on by default)
      const g = pads[0].gif, P = gifPalette(g); g.swap = [{ from: P[0].slice(0, 3), to: [255, 0, 0] }]; selectPad(0); syncGifUI(); const on1 = swapOn(g);
      document.querySelector('#swList i[data-t="0"]').click(); const on2 = swapOn(g), sw = fxParams(g).sw.length; document.querySelector('#swList i[data-t="0"]').click();
      return [...a, on1, on2, sw, swapOn(g), $('#gTabs [data-v=colour]').textContent, typeof pickClip]; })()""")
    print('0.86', d86); assert d86 == ['Edges', 1, True, True, False, 0, True, 'Display', 'function'], d86
    await b.close()
asyncio.run(main())
