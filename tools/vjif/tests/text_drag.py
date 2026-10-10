# Text window: the text chip dragged onto pad 8 lands there (the window steps aside while dragging)
import asyncio
from _env import DIST, ARGS, OUT
from playwright.async_api import async_playwright
async def m():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width': 1600, 'height': 960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.click('#textBtn'); await pg.fill('#txText', 'HELLO'); await pg.wait_for_timeout(300)
    r = await pg.evaluate("""(async () => { const ch = $('#txDrag'), r = ch.getBoundingClientRect(), t = pads[7].el.getBoundingClientRect();
      const ev = (type, x, y) => ch.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1, button: 0 }));
      try { ev('pointerdown', r.x + 10, r.y + 10); } catch (e) {}
      ev('pointermove', r.x + 30, r.y + 30); const vis = getComputedStyle($('#textPanel')).visibility;
      ev('pointermove', t.x + t.width / 2, t.y + t.height / 2); const lit = pads[7].el.classList.contains('drop');
      ev('pointerup', t.x + t.width / 2, t.y + t.height / 2); await new Promise(r => setTimeout(r, 800));
      return [vis, lit, pads.map((p, i) => p.gif && p.gif.media.text ? i : -1).filter(i => i >= 0), $('#textPanel').hidden] })()""")
    print(r); await b.close()
    if r != ['hidden', True, [7], True]: raise SystemExit('FAILED')
asyncio.run(m())
