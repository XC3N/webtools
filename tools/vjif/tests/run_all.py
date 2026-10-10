# runs every browser test against dist/vjif.html (build first: node build.js) and says which ones failed.
# A test fails when it crashes, a page throws a script error, or (golden) a render changed.
# Each test also prints what it measured: worth a glance after a change in that area.
import subprocess, sys, pathlib, time
HERE = pathlib.Path(__file__).resolve().parent
TESTS = ['smoke', 'undo', 'golden', 'render_size', 'copy_pads', 'copy_scenes_presets', 'fx_targets', 'crt_stack',
         'stick_diagonal', 'key_regions', 'slider_labels', 'midi_learn', 'launchpad', 'review_fixes', 'gif_palette', 'text_drag', 'colour_picker']
only = [a for a in sys.argv[1:] if not a.startswith('-')]   # test names to run (default: all); -v prints every test's output
bad = []
for t in TESTS:
    if only and t not in only: continue
    t0 = time.time()
    r = subprocess.run([sys.executable, str(HERE / (t + '.py'))], cwd=HERE, capture_output=True, text=True, timeout=600)
    out = '\n'.join(l for l in (r.stdout + r.stderr).splitlines() if 'agent-proxy' not in l and 'googleapis' not in l)
    ok = r.returncode == 0 and 'Traceback' not in out
    print(f"{'ok  ' if ok else 'FAIL'} {t} ({time.time() - t0:.0f} s)")
    if not ok or '-v' in sys.argv: print('    ' + out.strip().replace('\n', '\n    '))
    if not ok: bad.append(t)
print('all passed' if not bad else 'failed: ' + ', '.join(bad)); sys.exit(1 if bad else 0)
