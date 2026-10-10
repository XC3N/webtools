# a short MP4 take with sound (a test tone as the input): the sound chunks must form one unbroken stream
import asyncio
from playwright.async_api import async_playwright
from _env import DIST, ARGS
JS = r"""
async () => {
  const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); await ac.resume();
  const chunks = [];
  const M = Mp4Muxer.Muxer.prototype, orig = M.addAudioChunkRaw;
  M.addAudioChunkRaw = function(b, type, t, dur, meta){ chunks.push([t, dur]); return orig.apply(this, arguments); };
  if (!(await VideoEncoder.isConfigSupported({ codec: 'avc1.640028', width: 640, height: 360 })).supported) wcCodecs = ['vp09.00.40.08', 'av01.0.08M.08'];
  rec.writer = null; rec.name = 'test.mp4'; rec.audio = d.stream;
  await wcStart(clock.beat);
  if (!rec.wc) return { skipped: 'no WebCodecs video encoder' };
  const t0 = performance.now(); while (performance.now() - t0 < 2500){ wcCapture(performance.now()); await new Promise(r => setTimeout(r, 30)); }
  const C = rec.wc; let saved = null; window.saveFile = (blob) => { saved = blob.size; };
  await wcStop(C); rec.mr = null;
  let gaps = 0; for (let i = 1; i < chunks.length; i++) if (Math.abs(chunks[i][0] - (chunks[i-1][0] + chunks[i-1][1])) > 1) gaps++;
  return { n: chunks.length, gaps, saved, sr: C.aenc ? 'ok' : 'none' };
}"""
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS + ['--autoplay-policy=no-user-gesture-required']); pg = await b.new_page(viewport={'width':1280,'height':800})
    await pg.goto(DIST); await pg.wait_for_function("store.ready")
    r = await pg.evaluate(JS); print(r)
    if 'skipped' not in r:
      assert r['n'] > 20 and r['gaps'] == 0 and r['saved'], r
    await b.close()
asyncio.run(main())
