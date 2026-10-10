import asyncio, pathlib
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(args=ARGS); pg=await b.new_page(viewport={'width':1600,'height':960})
    errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn',[str(S/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    await pg.keyboard.press('KeyQ'); await pg.wait_for_timeout(300); await pg.evaluate("selectFx(9); fxCfg[9].mode='latch'; pvOpt.gHide=true; layers[0].sel=null")
    out=[]
    for v in ['scan','phos','vhs','paytv','split','split']:
      await pg.click(f'#fxStyle [data-v="{v}"]'); await pg.wait_for_timeout(50); out.append(await pg.evaluate("fxCfg[9].style"))
    await pg.evaluate("fxCfg[9].style='vhs+scan+phos'; syncFxUI()")
    await pg.keyboard.press('F10'); await pg.wait_for_timeout(1200)
    bb=await pg.locator('#pv').bounding_box(); await pg.screenshot(path=str(OUT/'crt_stack.png'), clip=bb)
    t=await pg.evaluate("[$('#fxStrip .fxp[data-i=\"9\"] .s').textContent, [...document.querySelectorAll('#fxStyle button.on')].map(b=>b.dataset.v)]")
    print(out, t, errs)
    # stacked: right-click a style that's on shows its settings without switching it; one row of styles for every effect
    await pg.evaluate("fxCfg[9].style='vhs+scan'; delete fxFocus.rgb; syncFxUI()")
    lab=lambda: pg.evaluate("[$('#fxSizeRow label').textContent, fxCfg[9].style, $('#fxSizeRow').classList.contains('dimmed'), [...document.querySelectorAll('#fxStyle button.focus')].map(b=>b.dataset.v)]")
    r0=await lab(); await pg.click('#fxStyle [data-v="vhs"]', button='right'); r1=await lab()
    await pg.click('#fxStyle [data-v="split"]', button='right'); r2=await lab()
    await pg.click('#fxStyle [data-v="scan"]', button='right'); r3=await lab()
    print(r0, r1, r2, r3)
    assert r0[:3]==['Size','vhs+scan',False], r0
    assert r1==['Dropouts','vhs+scan',False,['vhs']], r1
    assert r2==r1, r2
    assert r3==['Size','vhs+scan',False,['scan']], r3
    rows=await pg.evaluate("FX_DEFS.map((d,i)=>{ selectFx(i); const t=[...document.querySelectorAll('#fxStyle button')].map(b=>b.getBoundingClientRect().top); return [d.id, new Set(t).size, [...document.querySelectorAll('#fxStyle button')].some(b=>b.scrollWidth>b.clientWidth+1)]; })")
    print(rows)
    assert all(r[1]<=1 and not r[2] for r in rows), rows
    assert not errs, errs
    await b.close()
asyncio.run(main())
