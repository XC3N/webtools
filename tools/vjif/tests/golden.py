# golden renders: every effect style through post.run (twice, for history), every transition at several points
import asyncio, sys, json
from playwright.async_api import async_playwright
from _env import DIST, FIX as S, OUT, ARGS
SEED = """(() => { let s = 12345; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; const t0 = 1000; performance.now = (() => { let t = t0; return () => t; })(); })();"""
JS = r"""
() => {
  const hash = ctx => { const d = ctx.getImageData(0, 0, W, H).data; let h = 2166136261; for (let i = 0; i < d.length; i += 97){ h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  const pat = (ctx, k) => { ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, k ? '#f80' : '#08f'); g.addColorStop(0.5, k ? '#2a2' : '#e2e'); g.addColorStop(1, k ? '#fff' : '#111');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.fillStyle = k ? '#000' : '#ff0';
    for (let i = 0; i < 12; i++){ ctx.beginPath(); ctx.arc((i * 173) % W, (i * 311) % H, 40 + i * 9, 0, 7); ctx.fill(); } };
  const out = {};
  const src = new OffscreenCanvas(W, H), sx = src.getContext('2d'); pat(sx, 0);
  const dst = new OffscreenCanvas(W, H).getContext('2d');
  const blank = () => ({ lv: FX_DEFS.map(() => 0), env: FX_DEFS.map(() => 0), amt: FX_DEFS.map(() => 0.8), rate: FX_DEFS.map(() => 0.5), style: FX_DEFS.map(d => d.styles[0][0]), size: FX_DEFS.map(d => d.sizeDef || 16), pal: FX_DEFS.map(() => 4), kz: FX_DEFS.map(() => 1.5), dith: FX_DEFS.map(() => 0.3) });
  let slot = 20;
  FX_DEFS.forEach((d, i) => d.styles.forEach(s => {
    const M = blank(); M.lv[i] = 0.8; M.env[i] = 1; M.style[i] = s[0];
    const U = fxU(3.3, M); U.time = 12.3; const sl = slot++;
    post.run(U, src, dst, sl); const a = hash(dst); post.run(U, src, dst, sl); out['fx:' + d.id + ':' + s[0]] = a + '/' + hash(dst);
  }));
  // feedback after a frame without it, and phosphor after direct frames (history switching)
  { const M = blank(); M.lv[11] = 0.8; M.env[11] = 1; const U = fxU(3.3, M); U.time = 12.3; const M0 = blank(); M0.lv[0] = 0.8; M0.env[0] = 1; const U0 = fxU(3.3, M0); U0.time = 12.3;
    post.run(U0, src, dst, 60); post.run(U, src, dst, 60); out['fx:switch:fb'] = hash(dst);
    const M2 = blank(); M2.lv[9] = 0.8; M2.env[9] = 1; M2.style[9] = 'phos'; const U2 = fxU(3.3, M2); U2.time = 12.3;
    post.run(U0, src, dst, 61); post.run(U0, src, dst, 61); post.run(U2, src, dst, 61); out['fx:switch:phos'] = hash(dst); }
  // transitions
  pat(trA, 0); pat(trB, 1);
  for (const [ty] of TR_TYPES){ const sts = TR_STYLES[ty] ? TR_STYLES[ty].map(s => s[0]) : [''];
    for (const st of sts) for (const dir of (ty === 'slide' || ty === 'wipe' ? ['left', 'up'] : ['left'])){
      transCfg = normTrans({ type: ty, style: st, dir, len: 2, smooth: false, px: 12 });
      trans = makeTrans([], [], 0); const hs = [];
      for (const e of [0.1, 0.37, 0.5, 0.73, 0.9]){ if (trans) trans.b0 = clock.beat - e * trans.len; pat(trA, 0); pat(trB, 1); composeTransition(e, transCfg); hs.push(hash(mctx)); }
      out['tr:' + ty + ':' + st + ':' + dir] = hs.join(',');
    } }
  trans = null;
  return out;
}
"""
async def main(f, outp):
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS)
    pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]
    pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script(SEED)
    await pg.goto('file://' + f); await pg.wait_for_function("typeof post !== 'undefined' && post")
    r = await pg.evaluate(JS)
    json.dump(r, open(outp, 'w'), indent=0, sort_keys=True)
    print(len(r), 'entries', errs)
    if errs: sys.exit(2)
    await b.close()
# usage: golden.py            → compare with golden_ref.json (exit 1 on a difference)
#        golden.py --update   → make the current build the reference (after a deliberate change in a render)
import pathlib
REF = pathlib.Path(__file__).resolve().parent / 'golden_ref.json'
new = OUT / 'golden_new.json'
asyncio.run(main(DIST[len('file://'):], str(new)))
if '--update' in sys.argv: REF.write_text(new.read_text()); print('reference updated')
else:
    a, b = json.loads(REF.read_text()), json.loads(new.read_text())
    diff = sorted(k for k in set(a) | set(b) if a.get(k) != b.get(k))
    print('golden: same as the reference' if not diff else 'golden: DIFFERENT: ' + ', '.join(diff)); sys.exit(1 if diff else 0)
