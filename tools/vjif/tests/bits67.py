# 0.68: layer solo (right-click its number), the frame loop keeps going when the windows are hidden / covered, With Sync in Rec ▾
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
    await b.close()
asyncio.run(main())
