# 0.96: Shadow › Skew, Rec count-in › Play (the take waits for the music player), Background folds in Theme, × in the corner
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget = 0"); await pg.set_input_files('#fileIn', [str(FIX/'red.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300)
    # skew: the shadow's top leans right, its bottom stays
    PX = "(x, y) => { const d = mctx.getImageData(x, y, 1, 1).data; return d[2] > 200 && d[0] < 100; }"
    sk = await pg.evaluate(f"""(async () => {{ const g = pads[0].gif, c = layers.flatMap(L => L.clips).find(c => c.pad === 0); Object.assign(c, {{ sx: 1, sy: 1, x: 0, y: 0 }});
      const blue = {PX}, G = clipGeom(c), k = master.width / W, R = Math.round((G.cx + G.hw + 40) * k), T = Math.round((G.cy - G.hh + 45) * k), B = Math.round((G.cy + G.hh + 20) * k);
      const shot = async s => {{ g.shadow = {{ ...SHADOW_DEF, on: true, col: '#30d0ff', op: 1, blur: 0, x: 0, y: 30, skew: s }}; redraw.all = true; await new Promise(r => setTimeout(r, 300)); return [blue(R, T), blue(Math.round(G.cx * k), B)]; }};
      selectPad(0); const ui = [document.querySelector('#shK') !== null]; await shot(0); const z = await shot(0), a = await shot(1); return [...ui, ...z.slice(0, 2), ...a.slice(0, 2)]; }})()""")
    print('skew', sk); assert sk == [True, False, True, True, True], sk
    # count-in Play
    cp = await pg.evaluate("""(() => { $('#recCountSeg [data-b="-1"]').click(); const a = recCount; rec.wait = { beat: Infinity, play: true, mime: 'x' }; recUI(); const t = $('#recTxt').textContent;
      let started = null; const o = recStart; recStart = (m, bt) => { started = [m, bt]; rec.wait = null; }; recTick(); const before = started; musPlay(); recStart = o; rec.wait = null; recUI();
      $('#recCountSeg [data-b="0"]').click(); return [a, t, before, !!started, document.querySelectorAll('#recCountSeg button').length]; })()""")
    print('count-in play', cp); assert cp == [-1, 'Play…', None, True, 5], cp
    # Theme: Background folds; the × sits in the corner
    await pg.click('#setBtn'); await pg.wait_for_timeout(200)
    th = await pg.evaluate("""(() => { $('.thm-bg label').click(); const a = [...document.querySelectorAll('.thm-bg .thm-row')].map(r => getComputedStyle(r).display); $('.thm-bg label').click();
      const X = $('#setClose').getBoundingClientRect(), B = $('#setPanel .modalBox').getBoundingClientRect(); return [a.join(), Math.round(B.right - X.right), Math.round(X.top - B.top)]; })()""")
    print('theme', th); assert th[0] == 'grid,none,none' and th[1] <= 4 and th[2] <= 6, th
    await b.close()
asyncio.run(main())
