import asyncio, pathlib, json
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
MOCK = """
window.__sent=[];
const mkOut=(name)=>({name, state:'connected', send:(d)=>window.__sent.push([name,Array.from(d)])});
const outs=new Map([['a',mkOut('LPProMK3 DAW')],['b',mkOut('LPProMK3 MIDI')]]);
const ins=new Map([['c',{name:'LPProMK3 MIDI',state:'connected',onmidimessage:null,addEventListener(){} }]]);
navigator.requestMIDIAccess=async(o)=>({outputs:outs,inputs:ins,sysexEnabled:!!(o&&o.sysex),onstatechange:null,addEventListener(){}});
"""
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.add_init_script(MOCK)
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.evaluate("lpLayout()"); await pg.wait_for_timeout(300)
    n = await pg.evaluate("midiCtl.map.length")
    await pg.evaluate("lpSetOn(true)"); await pg.wait_for_timeout(400)
    st = await pg.evaluate("[$('#lpStat').textContent, lp.name]")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(500)
    sent = await pg.evaluate("window.__sent")
    print('map',n,'stat',st,'msgs',len(sent),'ports',set(s[0] for s in sent))
    print('first',sent[0][1][:10])
    # colour for note 81 (pad 0)
    leds={}
    for nm,d in sent:
      if d[6]==3:
        body=d[7:-1]
        for i in range(0,len(body),5): leds[body[i+1]]=body[i+2:i+5]
    print('81',leds.get(81),'11',leds.get(11),'31',leds.get(31))
    await pg.evaluate("lpSetOn(false)"); await pg.wait_for_timeout(100)
    print('last',(await pg.evaluate("window.__sent.at(-1)"))[1])
    print('errs',errs)
    await b.close()
asyncio.run(main())
