# TESTS.md ← the test bench's ticks. Usage: sync_ticks.py <folder of bench items saved as JSON (ArtifactData query out_dir)> tools/vjif/TESTS.md
# each "- {id} ..." line becomes "- [x] {id}" (done on the bench) or "- [ ] {id}" (still to check)
import json, glob, os, re, sys
bench, path = sys.argv[1], sys.argv[2]
docs = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(bench + '/items/*.json')}
txt = open(path).read(); n = [0, 0]
def rep(m):
  i = m.group(2); d = docs.get(i); done = bool(d and d.get('done')); n[done] += 1
  return f"{m.group(1)}- [{'x' if done else ' '}] {{{i}}}"
txt = re.sub(r'(^|\n)- (?:\[[ x]\] )?\{([a-z0-9]+)\}', rep, txt)
open(path, 'w').write(txt); print('open', n[0], 'done', n[1])
