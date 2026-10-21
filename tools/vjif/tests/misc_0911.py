# 0.99.11: End toggles mask editing on the edit layer (TW-051); top-bar messages queue and each stays up ~1.5 s (TW-053); an empty sound-input scan keeps the Rec list (BG-053)
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.keyboard.press('End'); on = await pg.evaluate("!!maskEd")
    await pg.keyboard.press('End'); off = await pg.evaluate("!maskEd")
    print('end', on, off); assert on and off
    await pg.evaluate("toast('first message'); toast('second message'); toast('second message'); toast2('third')")
    t0 = await pg.evaluate("[$('#toast').textContent, toastQ.length]"); assert t0 == ['first message', 2], t0
    await pg.wait_for_timeout(1800); t1 = await pg.evaluate("$('#toast').textContent"); assert t1 == 'second message', t1
    await pg.wait_for_timeout(1800); t2 = await pg.evaluate("$('#toast').textContent"); assert t2 == 'third', t2
    await pg.evaluate("""(async () => { const o = [...$('#recAudioSel').options].map(x => x.value); const sel = $('#recAudioSel'); sel.insertAdjacentHTML('beforeend', '<option value="dev1">Cam mic</option>'); sel.value = 'dev1';
      navigator.mediaDevices.enumerateDevices = async () => []; await fillRecAudio(false); })()""")
    kept = await pg.evaluate("[...$('#recAudioSel').options].some(x => x.value === 'dev1')"); print('kept', kept); assert kept
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
