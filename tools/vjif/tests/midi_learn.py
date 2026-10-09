import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1280,'height':720})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script("navigator.requestMIDIAccess=async()=>({inputs:new Map([['i',{id:'i',name:'LPProMK3 MIDI',state:'connected',onmidimessage:null,addEventListener(){}}]]),outputs:new Map(),onstatechange:null,addEventListener(){}})")
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("midiCtl.map.push({key:'c0.7',t:'opacity',i:1},{key:'n0.36',t:'layer',i:0})")
    await pg.click('#learnBtn'); await pg.wait_for_timeout(300)
    await pg.screenshot(path=str(OUT/'learn2.png'), clip={'x':280,'y':0,'width':720,'height':330})
    await pg.evaluate("setClockSrc('midi')"); await pg.wait_for_timeout(500); await pg.evaluate('resync()'); await pg.wait_for_timeout(50); print(await pg.evaluate("[clock.src, document.body.innerText.includes('lined up')]"))
    print(await pg.evaluate("document.body.innerText.includes('lined up')"), errs)
    await b.close()
asyncio.run(main())
