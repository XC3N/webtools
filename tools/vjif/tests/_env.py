# shared paths for the browser tests: the built page, the test GIFs (made on first use), where pictures go
import pathlib, subprocess, sys
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]                                  # the repo
DIST = 'file://' + str(ROOT / 'dist' / 'vjif.html')     # run `node build.js` first
FIX = HERE / 'fixtures'                                 # generated GIFs (not in git)
OUT = HERE / 'out'                                      # screenshots (not in git)
OUT.mkdir(exist_ok=True)
if not (FIX / 'busy.gif').exists():
    subprocess.run([sys.executable, str(HERE / 'make_fixtures.py')], check=True)
# Chromium with a software GPU, so WebGL effects run headless
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
# every page a test opens reports its script errors here; any error makes the test exit with code 3 (run_all.py counts it)
import atexit, os
from playwright.async_api import Browser, BrowserContext
PAGE_ERRORS = []
def _watch(page):
    page.on('pageerror', lambda e: PAGE_ERRORS.append(str(e)))
    return page
for _cls in (Browser, BrowserContext):
    _orig = _cls.new_page
    async def _new_page(self, *a, _orig=_orig, **k): return _watch(await _orig(self, *a, **k))
    _cls.new_page = _new_page
@atexit.register
def _report():
    if PAGE_ERRORS:
        print('PAGE ERRORS:', *PAGE_ERRORS[:5], sep='\n  '); sys.stdout.flush(); os._exit(3)

# VJIF_COV=<file>: record which functions of the page's scripts ran (Chromium's coverage), for deps.json (see run_all.py --deps)
if os.environ.get('VJIF_COV'):
    import json
    _COV, _PAGES = [], []
    for _cls in (Browser, BrowserContext):
        _o = _cls.new_page
        async def _np(self, *a, _o=_o, **k):
            pg = await _o(self, *a, **k); c = await pg.context.new_cdp_session(pg)
            await c.send('Debugger.enable'); await c.send('Profiler.enable'); await c.send('Profiler.startPreciseCoverage', {'callCount': True, 'detailed': False}); _PAGES.append(c); return pg
        _cls.new_page = _np
    async def _grab():
        for c in list(_PAGES):
            try:
                for e in (await c.send('Profiler.takePreciseCoverage'))['result']:
                    fs = [[f['ranges'][0]['startOffset'], f['ranges'][0]['endOffset']] for f in e['functions'] if f['ranges'] and f['ranges'][0]['count'] > 0]
                    if len(fs) > 50: _COV.append({'source': (await c.send('Debugger.getScriptSource', {'scriptId': e['scriptId']}))['scriptSource'], 'functions': fs})
            except Exception as ex: print('coverage:', ex)
        _PAGES.clear()
    _oclose = Browser.close
    async def _close(self, *a, **k): await _grab(); return await _oclose(self, *a, **k)
    Browser.close = _close
    @atexit.register
    def _write_cov(): json.dump(_COV, open(os.environ['VJIF_COV'], 'w'))
