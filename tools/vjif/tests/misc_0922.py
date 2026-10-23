# 0.99.22: a drop with only links (Mac Chrome, Google Images): the picture's own address inside an imgres link is fetched first
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    gif = (FIX/'bat.gif').read_bytes(); hits = []
    async def img(route): hits.append(route.request.url); await route.fulfill(body=gif, content_type='image/gif', headers={'access-control-allow-origin': '*'})
    async def page(route): hits.append(route.request.url); await route.fulfill(body='<html></html>', content_type='text/html')
    await pg.route('https://media.example.test/**', img); await pg.route('https://www.google.com/imgres**', page)
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    r = await pg.evaluate("""(() => { const dt = new DataTransfer(); dt.setData('text/uri-list', 'https://www.google.com/imgres?q=bat&imgurl=https%3A%2F%2Fmedia.example.test%2Fbat.gif&imgrefurl=https%3A%2F%2Fexample.test');
      dt.setData('text/html', '<img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:AAA">'); return dropUrls(dt); })()""")
    print('urls', r); assert r[0] == 'https://media.example.test/bat.gif' and len(r) == 3, r
    await pg.evaluate("""(() => { const dt = new DataTransfer(); dt.setData('text/uri-list', 'https://www.google.com/imgres?q=bat&imgurl=https%3A%2F%2Fmedia.example.test%2Fbat.gif');
      $('.pad[data-i="0"]').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); })()""")
    await pg.wait_for_function("pads[0].gif", timeout=20000); print('hits', hits); assert hits[0].startswith('https://media.example.test/'), hits
    await pg.evaluate("""(() => { const dt = new DataTransfer(); dt.setData('text/uri-list', 'https://www.google.com/imgres?q=bat&imgurl=https%3A%2F%2Fmedia.example.test%2Fbat.gif');
      $('#layers').children[BG_LAYER].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); })()""")
    await pg.wait_for_function("[...Array(N_BG).keys()].some(k => pads[BG0 + k].gif)", timeout=20000); print('bg slot ok')
    r = await pg.evaluate("fetchPicture(['https://nope.example.test/x.gif']).then(() => 'no', e => e.message)"); print('why', r); assert 'nope.example.test' in r, r
    r = await pg.evaluate("""(async () => { let got = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: t => { got = t; return Promise.resolve(); } }, configurable: true });
      toastQ = []; toastCur = ''; toast('Can\\'t fetch: pinterest: blocked'); await new Promise(r => setTimeout(r, 100)); const pe = getComputedStyle($('#toast')).pointerEvents; $('#toast').click(); await new Promise(r => setTimeout(r, 100)); return [got, pe, $('#toast').textContent]; })()""")
    print('copy', r); assert r == ["Can't fetch: pinterest: blocked", 'auto', 'Copied to the clipboard'], r
    assert not errs, errs; await b.close(); print('ok')
asyncio.run(main())
