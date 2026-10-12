import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS, FIX
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960})
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("setTarget(0); fileTarget = 0"); await pg.set_input_files('#fileIn', [str(FIX/'ring.gif')]); await pg.wait_for_function("pads[0].gif"); await pg.keyboard.press('KeyQ')
    await pg.evaluate("document.querySelector('#side > h2 .fname').click(); document.querySelectorAll('#gPanes [data-pane=colour] > .sub .foldable, #gPanes .sub.foldable > span')[0]")
    await pg.evaluate("$('#gTabs [data-v=colour]').click(); document.querySelectorAll('#gPanes [data-pane=colour] > .sub.foldable > span').forEach(s => s.click())")
    await pg.wait_for_timeout(500)
    r = await pg.evaluate("(() => { const r = $('#side').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()")
    await pg.screenshot(path='/tmp/claude-0/-home-claude-webtools/1b2b3a57-6428-5293-a0ca-34110d8408a2/scratchpad/side.png', clip={'x':r[0],'y':r[1],'width':r[2],'height':min(r[3],700)}, timeout=180000)
    await b.close()
asyncio.run(main())
