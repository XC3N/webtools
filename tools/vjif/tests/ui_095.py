# 0.95: chips hide their GIF (right-click), scene export / import (.vjscene), Flip LFOs, Skew around 0, Launchpad arrows,
# scene copies keep masks, Bypass FX under the effects on All, Reset / Clear switch off, the panel picture stays on frame 0
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,(f,key) in enumerate([('grad.gif','KeyQ'),('red.gif','KeyW')]):
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.keyboard.press(key); await pg.wait_for_timeout(250)
    # hide a GIF from its chip
    li = await pg.evaluate("layers.findIndex(L => L.clips.length)")
    await pg.click(f'.layer:nth-child({li+1}) .chip', button='right'); await pg.wait_for_timeout(100)
    h = await pg.evaluate(f"(() => {{ const c = layers[{li}].clips.at(-1); return [!!c.off, document.querySelector('.layer:nth-child({li+1}) .chip').classList.contains('off'), frameList(performance.now()).find(x => x.L.i === {li}).items.length, layers[{li}].clips.length, JSON.parse(snapshot()).layers[{li}].clips.some(c => c.off)]; }})()")
    print('hide', h); assert h[0] and h[1] and h[2] == h[3] - 1 and h[4], h
    await pg.click(f'.layer:nth-child({li+1}) .chip', button='right')
    # Flip LFO and Skew readout
    fl = await pg.evaluate("""(() => { const g = pads[0].gif; selectPad(0); g.lfo.fx = { ...lfoDef('fx'), on: true, shape: 'square', per: 4 }; const c = layers.flatMap(L => L.clips).find(c => c.pad === 0);
      const a = effClip(c, g).flipX; return [a, document.querySelectorAll('#aTgt button').length, skFmt(0.5), skFmt(0.25), skFmt(0.8)]; })()""")
    print('flip / skew', fl); assert fl[1] == 12 and fl[2:] == ['0%', '-50%', '+60%'], fl
    # Launchpad arrows
    lpm = await pg.evaluate("""(() => { midiCtl.map.push({ key: 'c0.93', t: 'padbank', i: 0 }); lpLayout(); const m = k => midiCtl.map.find(x => x.key === k), f = x => x ? x.t + x.i : '-'; const r = ['c0.91', 'c0.92', 'c0.80', 'c0.70', 'c0.93', 'c0.94'].map(k => f(m(k)));
      onCtl({ data: [0xB0, 70, 127] }); const pb = padBank; onCtl({ data: [0xB0, 70, 0] }); onCtl({ data: [0xB0, 92, 127] }); const sb = scBank; onCtl({ data: [0xB0, 92, 0] }); onCtl({ data: [0xB0, 91, 127] }); onCtl({ data: [0xB0, 91, 0] });
      onCtl({ data: [0xB0, 80, 127] }); onCtl({ data: [0xB0, 80, 0] }); return [r.join(','), pb, sb, scBank, padBank]; })()""")   # (0.99: the Pro MK3: ◀ ▶ 91 / 92 scene banks, ▲ ▼ 80 / 70 pad banks; Session / Note cleared)
    print('launchpad', lpm); assert lpm == ['scbank-1,scbank1,padbank0,padbank1,-,-', 1, 1, 0, 0], lpm
    # Reset / Clear switch the feature off; Shadow has a Reset
    rs = await pg.evaluate("""(() => { selectPad(0); const g = pads[0].gif; g.hsv = { h: 30, s: 1, v: 1 }; g.shadow = { ...g.shadow, on: true, blur: 40 }; syncGifUI();
      $('#hReset').click(); $('#shReset').click(); return [g.hsv.off, g.hsv.h, g.shadow.on, g.shadow.blur]; })()""")
    print('reset', rs); assert rs == [True, 0, False, 12], rs
    # scene copy keeps the mask; scene export / import round trip
    await pg.click(f'.layer:nth-child({li+1}) .lmask'); await pg.wait_for_timeout(200)
    r = await pg.evaluate("(() => { const r = pv.getBoundingClientRect(); return [r.x + view.x, r.y + view.y, view.w, view.h]; })()")
    await pg.mouse.move(r[0]+r[2]*0.3, r[1]+r[3]*0.3); await pg.mouse.down(); await pg.mouse.move(r[0]+r[2]*0.6, r[1]+r[3]*0.6, steps=6); await pg.mouse.up(); await pg.keyboard.press('Escape'); await pg.wait_for_timeout(300)
    cp = await pg.evaluate(f"[!!layers[{li}].mask, !!sceneCopy(sceneIdx).layers[{li}].mask]")
    print('copy mask', cp); assert cp == [True, True], cp
    ex = await pg.evaluate("""(async () => { window.showSaveFilePicker = undefined; let got = null; const o = saveFile; saveFile = (bl, n) => { got = [bl, n]; }; await exportScene(); saveFile = o;
      const f = new File([got[0]], got[1]); const n0 = sceneCount(1); await importScene(f); const k = [...Array(N_SCENES).keys()].find(k => k !== sceneIdx && sceneCount(k));
      const sc = scenes[k]; const r = [got[1].endsWith('.vjscene'), n0, k, sc.layers.reduce((a, L) => a + L.clips.length, 0), sc.pads.filter(Boolean).length, sc.layers.some(L => !!L.mask)];
      undo(); r.push(sceneCount(k));
      const s0 = sceneIdx, e = [...Array(N_SCENES).keys()].find(k => k !== sceneIdx && !sceneCount(k) && !scenePads(k)); gotoScene(e, clock.beat, true); await importScene(f);   // 0.99: into the scene you're on when it's empty
      r.push(sceneIdx === e, layers.reduce((a, L) => a + L.clips.length, 0), liveName, got[1]); undo(); r.push(layers.reduce((a, L) => a + L.clips.length, 0)); gotoScene(s0, clock.beat, true); return r; })()""")
    print('scene file', ex); assert ex[0] and ex[1] == 0 and ex[2] >= 0 and ex[3] == 2 and ex[4] == 2 and ex[6] == 0 and ex[7:10] == [True, 2, ''] and ex[10].startswith('scene-') and ex[11] == 0, ex
    # the panel picture: frame 0 whatever the sliders say
    pp = await pg.evaluate("""(() => { selectPad(1); const g = pads[1].gif; const sig = () => $('#gPrev').toDataURL().length; const a = sig(); $('#gStart').value = Math.min(3, g.src.length - 1); $('#gStart').dispatchEvent(new Event('input', { bubbles: true })); return [a === sig(), g.startF > 0]; })()""")
    print('panel picture', pp); assert pp == [True, True], pp
    await b.close()
asyncio.run(main())
