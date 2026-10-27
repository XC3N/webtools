# 0.99.32 (ID-254): new transitions: Wipe › Blinds, Checker (squares / diamonds), Peel; Dissolve › Shatter
import asyncio, base64, os
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(__file__), 'out'); os.makedirs(OUT, exist_ok=True)
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("""(async () => {
      const paint = (c, a, b) => { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = a; c.fillRect(0, 0, CW, CH); c.fillStyle = b; for (let x = 0; x < CW; x += CW / 8) c.fillRect(x, 0, CW / 16, CH); c.fillStyle = '#fff'; c.font = (CH / 4 | 0) + 'px sans-serif'; c.fillText(a === '#c03030' ? 'OLD' : 'NEW', CW * 0.35, CH * 0.6); };
      const px = (x, y) => [...mctx.getImageData(x | 0, y | 0, 1, 1).data.slice(0, 3)];
      const red = q => q[0] > q[2] + 50, blue = q => q[2] > q[0] + 50;
      const shots = {}, R = {};
      const shot = async k => { const bl = await mctx.canvas.convertToBlob ? await mctx.canvas.convertToBlob() : await new Promise(r => mctx.canvas.toBlob(r)); const a = new Uint8Array(await bl.arrayBuffer()); let s = ''; for (let i = 0; i < a.length; i += 32768) s += String.fromCharCode(...a.subarray(i, i + 32768)); shots[k] = btoa(s); };
      const go = async (T, es) => { const out = []; for (const e of es){ paint(trA, '#c03030', '#802020'); paint(trB, '#3040c0', '#203080'); composeTransition(e, normTrans({ len: 2, px: 12, dir: 'left', ...T })); out.push((e === 0.5 ? Array.from({ length: 23 }, (_, i) => 0.02 + i * 0.043) : [0.1, 0.3, 0.5, 0.7, 0.9]).map(f => red(px(CW * f, CH * 0.45)) ? 'A' : blue(px(CW * f, CH * 0.45)) ? 'B' : '?').join('')); if (e === 0.5) await shot(T.style + (T.shape || '')); } return out; };
      trans = null;
      R.blinds = await go({ type: 'wipe', style: 'blinds', dir: 'right' }, [0, 0.5, 1]);
      R.checker = await go({ type: 'wipe', style: 'checker', dir: 'right' }, [0, 0.5, 1]);
      R.dia = await go({ type: 'wipe', style: 'checker', shape: 'dia', dir: 'down' }, [0, 0.5, 1]);
      R.peel = await go({ type: 'wipe', style: 'peel', dir: 'left' }, [0, 0.5, 1]);
      trans = { b0: 0, len: 2, seed: 5 };
      R.shatter = await go({ type: 'dissolve', style: 'shatter' }, [0, 0.5, 1]); trans = null;
      transCfg.type = 'wipe'; transCfg.style = 'checker'; syncTransUI(); R.ui = [$('#trPxRow label').textContent, $('#trDir').textContent, $('#trStyle').children.length, [...$('#trStyle').querySelectorAll('button')].every(b => b.scrollWidth <= b.clientWidth + 1)];
      transCfg.style = 'blinds'; syncTransUI(); R.ui.push($('#trPxRow label').textContent);
      transCfg.type = 'dissolve'; transCfg.style = 'shatter'; syncTransUI(); R.ui.push($('#trPxRow label').textContent, trLabel(transCfg));
      transCfg.type = 'wipe'; transCfg.style = 'peel'; syncTransUI();
      return [R, shots]; })()""")
    R, sh = r
    for k, v in sh.items(): open(os.path.join(OUT, f'tr0932_{k}.png'), 'wb').write(base64.b64decode(v))
    el = await pg.query_selector('#trStyleRow'); box = await el.evaluate("e => { const p = e.parentElement; p.scrollIntoView(); return 1; }")
    await (await pg.query_selector('#trStyleRow')).evaluate("e => e.parentElement.id || e.parentElement.className")
    await pg.screenshot(path=os.path.join(OUT, 'tr0932_ui.png'))
    print(R)
    for k in ['blinds', 'checker', 'dia', 'peel', 'shatter']:
      assert R[k][0] == 'AAAAA' and R[k][2] == 'BBBBB' and 'A' in R[k][1] and 'B' in R[k][1], (k, R[k])
    assert R['ui'][0] == 'Cells' and '◆' in R['ui'][1] and R['ui'][3] and R['ui'][4] == 'Slats' and R['ui'][5] == 'Pieces' and R['ui'][6] == 'Dissolve shatter', R['ui']
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
