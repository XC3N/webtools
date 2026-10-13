# 0.88: Scene / Global pads, Overlay the same in every scene, Background's slots, layer rules, the set conversion,
# Transform as a GIF tab with one Base size switch, LFO Skew / Hold / Shift-drag, Pulse → Square at 25%
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k,f in [(0,'busy.gif'),(9,'ring.gif'),(18,'grad.gif')]:
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/f)]); await pg.wait_for_function(f"pads[{k}].gif")
    await pg.keyboard.press('KeyQ'); await pg.keyboard.press('KeyR'); await pg.wait_for_timeout(300)
    lay = "layers.map(L => L.clips.map(c => c.pad).join(',')).join('|')"
    a = await pg.evaluate(lay)
    await pg.evaluate("gotoScene(1, clock.beat, true)"); b1 = await pg.evaluate(lay); g1 = await pg.evaluate("[!!pads[9].gif, !!pads[0].gif, !!pads[18].gif]")
    await pg.evaluate("moveClip(3, layers[3].clips[0].id, 1, 0)"); mv = await pg.evaluate(lay)
    await pg.evaluate("gotoScene(0, clock.beat, true)"); back = await pg.evaluate(lay)
    print('layers', a, b1, g1, mv, back, errs)
    assert a == '18|0||9' and b1 == '|||9' and g1 == [True, False, False] and mv == '|||9' and back == '18|0||9', (a, b1, g1, mv, back)
    # a slot's × empties it; undo puts it back, playing
    sl = await pg.evaluate("(() => { removeClip(0, layers[0].clips[0]); const a = !!pads[18].gif + ':' + layers[0].clips.length; undo(); return [a, !!pads[18].gif + ':' + layers[0].clips.length]; })()")
    print('slot', sl); assert sl == ['false:0', 'true:1'], sl
    # an older set: Background → slots, Overlay → Global pads only, other scenes' second group → their Scene pads
    old = {"v":6,"scene":0,"pool":[],"pads":[None]*18,"layers":[{"clips":[{"pad":3}],"sel":0},{"clips":[{"pad":10}],"sel":0},{"clips":[]},{"clips":[{"pad":2}],"sel":0}],
      "scenes":[None,{"pads":[None]*12+[{"hash":"x"}]+[None]*5,"layers":[{"clips":[]},{"clips":[{"pad":12}]},{"clips":[]},{"clips":[]}]}]+[None]*7}
    for k in (2,3,10): old['pads'][k] = {"hash":"h%d" % k}
    mg = await pg.evaluate("o => { const u = upgradeSnap(o); return [u.pads.map((p,i)=>p?i+':'+p.hash:'').filter(Boolean).join(' '), u.layers.map(L=>L.clips.map(c=>c.pad).join(',')).join('|'), u.scenes[1].pads.map((p,i)=>p?i:-1).filter(x=>x>=0).join(','), u.scenes[1].layers.map(L=>L.clips.map(c=>c.pad).join(',')).join('|')]; }", old)
    print('migrated', mg); assert mg == ['2:h2 10:h10 18:h3', '18||2|10', '0', '|0||'], mg
    # Transform tab, Base size switch; Skew / Hold; Pulse converts
    xf = await pg.evaluate("""(() => { selectPad(0); setTarget(1); layers[1].sel = layers[1].clips[0]; syncXfUI(); $('#gTabs [data-v=xf]').click(); const vis = !$('[data-pane=xf]').classList.contains('off');
      document.querySelector('#xFitSeg [data-v=cover]').click(); const c = layers[1].clips[0]; return [vis, c.fit, Math.abs(c.sx - 1) < 1e-6, $('#xFit') === null]; })()   /* uncropped: Fill as the base size already covers, so scale stays 1× */""")
    print('transform', xf); assert xf == [True, 'cover', True, True], xf
    lf = await pg.evaluate("""(() => { const A = { shape: 'square', sk: 0.25, per: 1, ph: 0, gap: 0 }; const v = [0.1, 0.3, 0.6].map(p => lfoShape(A, p, 1));
      const g = pads[0].gif; const s = { lfo: { x: { shape: 'pulse', on: true } } }; return [v.join(','), SHAPES.some(x => x[0] === 'pulse'), !!$('#aSk'), !!$('#aHold')]; })()""")
    print('lfo', lf); assert lf == ['1,0,0', False, True, True], lf
    assert not errs, errs
    await b.close()
asyncio.run(main())
