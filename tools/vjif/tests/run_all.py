# runs every browser test against dist/vjif.html (build first: node build.js) and says which ones failed.
# A test fails when it crashes, a page throws a script error, or (golden) a render changed.
# Each test also prints what it measured: worth a glance after a change in that area.
import subprocess, sys, pathlib, time
HERE = pathlib.Path(__file__).resolve().parent
TESTS = ['smoke', 'undo', 'golden', 'render_size', 'copy_pads', 'copy_scenes_presets', 'fx_targets', 'crt_stack',
         'stick_diagonal', 'key_regions', 'slider_labels', 'midi_learn', 'launchpad', 'review_fixes', 'gif_palette', 'text_drag', 'colour_picker', 'fx_layer_keys', 'rec_sound', 'scene_drop', 'fx_local', 'scene_tools', 'ui_bits', 'feature_bits', 'mask_paint', 'ui_081', 'ui_084', 'pads_088', 'select_drag', 'pads_090', 'play_093', 'fx_094', 'ui_095', 'ui_096', 'gfx_097', 'perf_097', 'perf_098', 'queue_099', 'chip_0910', 'misc_0911', 'misc_0912', 'misc_0915', 'misc_0916', 'misc_0917', 'misc_0918', 'misc_0921', 'misc_0922', 'misc_0925', 'misc_0926', 'misc_0926b', 'misc_0927', 'misc_0927b', 'misc_0928', 'misc_0929', 'misc_0930', 'misc_0931', 'misc_0932', 'misc_0932b', 'misc_0933', 'palette_0912', 'debugmon_0912', 'lint_comments']
import os, tempfile, deps
only = [a for a in sys.argv[1:] if not a.startswith('-')]   # test names to run (default: all); -v prints every test's output
since = next((a.split('=', 1)[1] for a in sys.argv if a.startswith('--since=')), None)
if '--changed' in sys.argv:       # only the tests that run a changed source file (deps.json), plus the cheap always-on ones
    sel, why = deps.pick(TESTS, since); print(f'changed: {why}; running {len(sel)} of {len(TESTS)}'); only = sel
measure = '--deps' in sys.argv    # re-measure which source files each test runs (also runs the tests)
D = deps.load() if measure else {}
if measure:
    D.setdefault('tests', {})
    cf = tempfile.mktemp(suffix='.json'); boot = HERE / '_boot.py'
    boot.write_text("import asyncio\nfrom _env import DIST, ARGS\nfrom playwright.async_api import async_playwright\nasync def main():\n  async with async_playwright() as p:\n    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(); await pg.goto(DIST); await pg.wait_for_function('store.ready'); await pg.wait_for_timeout(1500); await b.close()\nasyncio.run(main())\n")
    subprocess.run([sys.executable, str(boot)], cwd=HERE, env={**os.environ, 'VJIF_COV': cf}, check=True); BOOT = deps.executed(cf); boot.unlink()
bad = []
for t in TESTS:
    if only and t not in only: continue
    t0 = time.time()
    r = subprocess.run([sys.executable, str(HERE / (t + '.py'))], cwd=HERE, capture_output=True, text=True, timeout=3600, env={**os.environ, **({'VJIF_COV': cf} if measure else {})})   # (golden takes 15–40 min on a software GPU, depending on the machine)
    out = '\n'.join(l for l in (r.stdout + r.stderr).splitlines() if 'agent-proxy' not in l and 'googleapis' not in l)
    ok = r.returncode == 0 and 'Traceback' not in out
    print(f"{'ok  ' if ok else 'FAIL'} {t} ({time.time() - t0:.0f} s)")
    if not ok or '-v' in sys.argv: print('    ' + out.strip().replace('\n', '\n    '))
    if not ok: bad.append(t)
    if measure and ok:
        try: D['tests'][t] = sorted({x.rsplit(':', 1)[0] for x in deps.executed(cf) - BOOT})
        except Exception as e: print('    (no coverage for', t, e, ')')
if measure: deps.save(D)
print('all passed' if not bad else 'failed: ' + ', '.join(bad)); sys.exit(1 if bad else 0)
