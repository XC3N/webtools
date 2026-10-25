# Which source files does each test actually run? (found with Chromium's code coverage; stored in deps.json)
#   python3 run_all.py --deps [test…]   re-measure (all tests, or the named ones); it also runs them
#   python3 run_all.py --changed        run only the tests that touch a changed file (git: uncommitted + since --since REF)
import json, pathlib, subprocess
HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SRC = [p for p in sorted((ROOT / 'tools' / 'vjif' / 'src').glob('*.js'))] + [p for p in sorted((ROOT / 'common').glob('*.js'))]
DEPS = HERE / 'deps.json'
ALWAYS = {'smoke', 'undo', 'lint_comments'}          # cheap, and they catch what everything else misses
def rel(p): return str(p.relative_to(ROOT))
def executed(cov_file):
    """{'src/x.js:offset'} of every function that ran, from a VJIF_COV dump"""
    out = set()
    for e in json.load(open(cov_file)):
        s = e['source']; spans = []
        for p in SRC:
            t = p.read_text(); i = s.find(t)
            if i >= 0: spans.append((i, i + len(t), rel(p)))
        for a, b in e['functions']:
            if a == 0 and b >= len(s) - 1: continue     # the script itself
            for lo, hi, n in spans:
                if lo <= a < hi: out.add(f'{n}:{a - lo}'); break
    return out
def save(d): DEPS.write_text(json.dumps(d, indent=1, sort_keys=True))
def load(): return json.loads(DEPS.read_text()) if DEPS.exists() else {}
def changed(since=None):
    cmds = [['git', 'diff', '--name-only'] + ([since] if since else ['HEAD']), ['git', 'ls-files', '--others', '--exclude-standard']]
    files = set()
    for c in cmds: files |= set(subprocess.run(c, cwd=ROOT, capture_output=True, text=True).stdout.split())
    return files
# Coverage can't tell what the always-running render loop matters to (it runs in every test), so two lists stand in:
BROAD = {'tools/vjif/src/core.js', 'tools/vjif/src/main-loop.js', 'tools/vjif/src/persist.js', 'tools/vjif/src/record.js', 'tools/vjif/src/undo.js', 'tools/vjif/src/types.js', 'common/util.js', 'common/controls.js', 'common/theme.js'}   # a change here: every test but golden
RENDER = {'tools/vjif/src/effects.js', 'tools/vjif/src/render.js', 'tools/vjif/src/colour.js', 'tools/vjif/src/transitions.js', 'tools/vjif/src/output.js', 'tools/vjif/src/preview.js', 'tools/vjif/src/prep.js', 'tools/vjif/src/lettering.js'}   # a change here: golden and the tests that read pixels
PIXEL_TESTS = {'golden', 'render_size', 'fx_targets', 'crt_stack', 'gfx_097', 'gif_palette', 'palette_0912', 'perf_097', 'perf_098', 'fx_094', 'fx_local', 'mask_paint', 'misc_0916', 'misc_0917', 'misc_0921', 'misc_0925', 'rec_sound', 'chip_0910'}
def pick(tests, since=None):
    """tests to run for the current changes, and why not the others"""
    d = load(); ch = changed(since)
    if not d: return list(tests), 'no deps.json yet: everything'
    src = {f for f in ch if f.endswith('.js') and (f.startswith('tools/vjif/src/') or f.startswith('common/'))}
    broad = any(f.endswith(('.css', 'vjif.html', 'build.js')) or f.startswith('common/') and not f.endswith('.js') for f in ch)   # styles / page / build: any UI could change
    mine = {pathlib.Path(f).stem for f in ch if f.startswith('tools/vjif/tests/') and f.endswith('.py')}
    run = []
    for t in tests:
        if t in ALWAYS or t in mine or t not in d['tests'] or (t != 'golden' and (broad or src & BROAD)) or (t in PIXEL_TESTS and src & RENDER) or src & set(d['tests'][t]): run.append(t)
    return run, f'{len(src)} changed source file(s)' + (', page/style change' if broad else '')
