# 0.99.27: the time sliders' Even / Dotted / Triplet switch (TW-056 / TW-074); Amount follows the envelope (ID-247);
# frames: an intro before In and an outro after Out (ID-241)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.evaluate("selectPad(0); $('#gTabs [data-v=play]').click()")
    r = await pg.evaluate("""(() => { const g = curGif(); g.sync = 'stretch'; g.beats = 4; syncGifUI(); const rows = ['#gBeats', '#gSub', '#gRestart', '#tEvery', '#tA', '#tH', '#tR', '#aGap'].map(id => !!$(id).closest('.field').querySelector('.seg.pfam'));
      const seg = $('#gBeats').closest('.field').querySelector('.seg.pfam'); seg.querySelector('[data-v=d]').click(); const a = [g.beats, $('#gBeats').nextElementSibling.textContent];
      const el = $('#gBeats'); el.value = 0; el.dispatchEvent(new Event('input', { bubbles: true })); a.push(g.beats);
      seg.querySelector('[data-v=t]').click(); a.push(+g.beats.toFixed(4), $('#gBeats').nextElementSibling.textContent);
      g.env.every = 0; syncGifUI(); $('#tEvery').closest('.field').querySelector('[data-v=d]').click(); a.push(g.env.every);
      return [rows.every(Boolean), ...a]; })()""")
    print('fam', r); assert r == [True, 3, '1/2.', 0.375, 0.3333, '1/8T', 0], r   # (1/16. → the nearest triplet: 1/8T)
    # Amount follows the envelope while it moves
    r = await pg.evaluate("""(async () => { selectFx(FXI.colour); const C = fxCfg[FXI.colour]; C.mode = 'hold'; C.att = 8; C.amt = 1; syncFxUI(); fxDown(FXI.colour); await new Promise(r => setTimeout(r, 900));
      const v = +$('#fxAmt').value; fxUp(FXI.colour); C.att = 0; return [v > 0.01 && v < 0.99, C.amt]; })()""")
    print('env follow', r); assert r == [True, 1], r
    # intro and outro
    r = await pg.evaluate("""(() => { const g = curGif(); g.sync = 'step'; g.subdiv = 1; g.loop = 'loop'; g.restart = 0; g.trimOff = false; g.inF = 2; g.outF = 3; g.startF = 0; rebuildSeq(g);
      const c = { startBeat: 0, startTime: 0 }, at = k => { c.startBeat = clock.beat - k - 0.01; return frameIndex(c, g, performance.now()); };
      const intro = [0, 1, 2, 3, 4, 5].map(at);
      g.inF = 0; g.outF = 1; g.startF = 0; g.endF = 3; g.outro = true; g.trig = 'fade'; g.env = { ...g.env, gate: true }; rebuildSeq(g);
      const d = { startBeat: clock.beat - 10, startTime: 0, env: { t0: clock.beat - 10, from: 0, rel: null } }; const held = frameIndex(d, g, 0);
      d.env.rel = clock.beat - 1.5; const out1 = frameIndex(d, g, 0); d.env.rel = clock.beat - 9; const out2 = frameIndex(d, g, 0);
      g.outro = false; const off = frameIndex(d, g, 0) <= 1;
      return [intro.join(), held <= 1, out1, out2, off, !!$('#gEnd') && !!$('#gOutro')]; })()""")
    print('frames', r); assert r == ['0,1,2,3,2,3', True, 3, 3, True, True], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
