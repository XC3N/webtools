# 0.99.16: Repeat switch keeps its count; Background slots grey the Trigger section; GIF FX stacks: a click on a lit style selects it, the next takes it out
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    k = await pg.evaluate("pads.map((_, i) => i).find(isGlobalPad)")
    await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function(f"pads[{k}].gif")
    await pg.evaluate(f"selectPad({k})")
    r = await pg.evaluate("""(() => { const g = curGif(); g.env.every = 8; syncGifUI(); const on0 = $('#tEveryOn').checked;
      $('#tEveryOn').click(); const a = g.env.every, on1 = $('#tEveryOn').checked; $('#tEveryOn').click(); return [on0, a, on1, g.env.every]; })()""")
    print('rep', r); assert r == [True, 0, False, 8], r
    r = await pg.evaluate("[$('#tEveryRow').classList.contains('everyoff'), (() => { const g = curGif(); g.env.every = 0; syncGifUI(); return $('#tEveryRow').classList.contains('everyoff'); })()]")
    assert r == [False, True], r
    bg = await pg.evaluate("pads.findIndex(p => p.bg)")
    await pg.evaluate(f"fileTarget = {bg}"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function(f"pads[{bg}].gif")
    await pg.evaluate(f"selectPad({bg})")
    r = await pg.evaluate("[...document.querySelectorAll('[data-pane=play] .trig')].map(e => e.classList.contains('dimmed'))"); print('bg', r); assert r and all(r), r
    await pg.evaluate(f"selectPad({k})")
    r = await pg.evaluate("[...document.querySelectorAll('[data-pane=play] .trig')].map(e => e.classList.contains('dimmed'))"); assert not any(r), r
    # GIF FX stack
    await pg.click('#gTabs [data-v=gfx]'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("""(() => { const row = document.querySelector('[data-gst=glitch]'), bs = [...row.querySelectorAll('button')]; const on = () => bs.filter(b => b.classList.contains('on')).map(b => b.dataset.v);
      bs[0].click(); bs[1].click(); const a = on(); bs[0].click(); const b1 = on(), foc = bs.filter(b => b.classList.contains('focus')).map(b => b.dataset.v); bs[0].click(); const c = on(); return [a, b1, foc, c]; })()""")
    print('stack', r); assert len(r[0]) == 2 and len(r[1]) == 2 and len(r[2]) == 1 and len(r[3]) == 1, r
    r = await pg.evaluate("(() => { maskOpen(3); const b = $('#maskShowBtn'); b.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, button: 0, pointerId: 1})); const a = maskAdj; document.dispatchEvent(new PointerEvent('pointerup', {bubbles: true})); const s = $('#maskShow'); s.value = 0.8; s.dispatchEvent(new Event('input', {bubbles: true})); return [a, maskAdj, maskOpt.show]; })()")
    print('mask', r); assert r == [True, False, 0.8], r
    r = await pg.evaluate(f"""(async () => {{ maskClose(); selectPad({k}); fire({k}, clock.beat); await new Promise(r => setTimeout(r, 800)); const g = curGif(); g.shadow = {{ ...SHADOW_DEF, on: true, x: 0, y: 0, blur: 0, op: 1, col: '#ff0000' }}; syncShadowUI(g); redraw.all = true; await new Promise(r => setTimeout(r, 600));
      const red = () => {{ const c = $('#pv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i+1] < 60 && d[i+2] < 60) n++; return n; }};
      const a = red(); const el = $('#shZ'); el.value = 2; el.dispatchEvent(new Event('input', {{bubbles: true}})); await new Promise(r => setTimeout(r, 600)); const b = red(); return [a, b, g.shadow.scale]; }})()""")
    print('shadow', r); assert r[2] == 2, r   # (the picture itself: looked at by eye, TS-254)
    r = await pg.evaluate("(() => { const i = FXI.rgb; selectFx(i); const C = fxConf(i); C.style = 'paytv'; syncFxUI(); const a = sizeAlt(FX_DEFS[i], 'paytv', C); const lab = $('#fxSizeRow label').textContent; const seg = [...$('#fxSizeSeg').querySelectorAll('button')].map(b => b.dataset.v); return [a && a.key, lab, seg, C.pneg ?? 'unset']; })()")
    print('paytv', r); assert r[0] == 'pneg' and r[1] == 'Invert', r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
