# 0.68 / 0.69 (BRB linked to Prep, count-in, transitions regrouped): layer solo (right-click its number), the frame loop keeps going when the windows are hidden / covered, With Sync in Rec ▾
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
    await pg.click('#brbLink'); await pg.evaluate("transCfg = trPresets[1]; startPrep()")
    lk = await pg.evaluate("[brb.link, brb.on, prep.scene]"); print('linked', lk); assert lk == [True, True, 0], lk
    await pg.evaluate("sceneKey(2)"); await pg.wait_for_timeout(100)
    await pg.evaluate("brb.next = clock.beat - 0.01"); await pg.wait_for_timeout(300)
    sw = await pg.evaluate("[prep.scene, sceneIdx, !!prep.tr, brb.on]"); print('switched', sw); assert sw == [1, 2, True, True], sw
    await pg.wait_for_timeout(300)
    await pg.evaluate("doGoLive()"); gl = await pg.evaluate("[!!prep, brb.on]"); print('live', gl); assert gl == [False, False], gl
    # count-in in Rec ▾, transitions regrouped
    c = await pg.evaluate("[!!document.querySelector('#recPopRows .seg[data-src=\"#recCountSeg\"]'), normTrans({ type: 'glitch', style: 'melt' }).type, normTrans({ type: 'glitch', style: 'channel' }).type, TR_TYPES.length]")
    print('count-in / regroup', c); assert c == [True, 'dissolve', 'tv', 9], c
    await b.close()
asyncio.run(main())
