# 0.99.19: Play › Trigger graph with Repeat: its points sit on the curve; one the curve never reaches (Repeat shorter) is left out
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'bat.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("""(() => { selectPad(0); const g = curGif(); g.trig = 'fade'; g.env.a = 2; g.env.h = 4; g.env.r = 4; const out = [];
      for (const ev of [0, 8, 4, 1]){ g.env.every = ev; drawEnvScope(g); out.push(tEnvPts().map(p => p[0]).join('')); }
      drawEnvScope(g); g.env.every = 8; drawEnvScope(g); const pr = tEnvPts().find(p => p[0] === 'h'); out.push(Math.abs(pr[2] - tEnvGeo.top) < 0.5); return out; })()""")
    print(r); assert r == ['ahr', 'ah', 'a', '', True], r
    r = await pg.evaluate("""(() => { const g = curGif(), c = clipOf(selPad) || { pad: 0 }; c.pad = 0; g.trig = 'fade'; g.env.gate = false; g.env.every = 1; c.hitBeat = 0; c.env = { t0: 0, from: 0, rel: null, noGate: false };
      const A = { ...lfoDef('x'), on: true, shape: 'sh', hold: true, per: 0.25, sync: 'clock' }, v = b => lfoUnit(A, c, 7, b);
      const rep = [v(0.5), v(1.5), v(2.5)]; g.env.every = 0; const off = [v(0.5), v(1.5), v(2.5)];
      return [new Set(rep).size === 3, new Set(off).size === 1]; })()""")
    print('S&H hold + Repeat', r); assert r == [True, True], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
