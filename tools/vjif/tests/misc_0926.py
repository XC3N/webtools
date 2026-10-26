# 0.99.26 (ID-248): Pixel › ANSI compiles and draws: character cells (twice as tall as wide) in the 16 ANSI colours with ░▒▓ shading
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    await pg.evaluate("fileTarget=0"); await pg.set_input_files('#fileIn', [str(FIX/'busy.gif')]); await pg.wait_for_function("pads[0].gif")
    r = await pg.evaluate("FX_DEFS[FXI.pixel].styles.map(s => s[0]).join()"); print('styles', r); assert r == 'square,wide,ansi,tone', r   # (0.99.29: Halftone)
    await pg.evaluate("selectPad(0); target = 3; const L = layers[3]; if (!L.clips.length) L.clips.push(newClip(0)); L.sel = L.clips[0]; syncLayerUI(); const g = pads[0].gif; g.gfx = g.gfx || {}; g.gfx.pixel = { on: true, amt: 1, style: 'ansi', size: 12 }; redraw.all = true")
    await pg.keyboard.press('q'); await pg.wait_for_timeout(2500)
    r = await pg.evaluate("(() => { const gl = document.createElement('canvas').getContext('webgl'); return [fxU(0, (() => { const z = v => FX_DEFS.map(() => v), M = { lv: z(0), env: z(0), amt: z(1), rate: FX_DEFS.map(() => 1), style: FX_DEFS.map(d => d.styles[0][0]), size: FX_DEFS.map(d => d.sizeDef || 64), pal: z(0), kz: z(1), fbk: z(0.7), vdrop: z(1), pneg: z(1), kmir: z(1), pfit: z(0), dith: z(0), dpat: z(0), dots: z(0), ovs: z(0), pamt: [], abase: z(1) }; M.lv[FXI.pixel] = 1; M.env[FXI.pixel] = 1; M.style[FXI.pixel] = 'ansi'; M.size[FXI.pixel] = 12; return M; })()).pixS]; })()")
    print('pixS', r); assert r == [2], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
