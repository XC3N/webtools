# 0.99: code swallowed by a comment. A // comment put mid-line before more code hides that code (it happened four times:
# the Rate row, Posterize's uniforms, Sync on play's reload, a slider attribute), and a CSS comment left open hides the
# rules after it (the hidden-chip look). Flags a // comment whose text ends in ';' and a CSS comment containing '{'.
import re, glob, os, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src')
common = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'common')   # the shared code too (0.99.3: a comment hid two Theme rows there)
bad = []
for f in sorted(glob.glob(os.path.join(root, '*.js')) + glob.glob(os.path.join(common, '*.js'))):
  for n, l in enumerate(open(f, encoding='utf-8'), 1):
    t = re.sub(r"'(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\"|`(?:\\.|[^`\\])*`", "''", l)
    t = re.sub(r"/(?![/*])(?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n\[])+/[gimsuy]*", "''", t)   # regex literals
    i = t.find('//')
    if i > 0 and t[:i].strip() and t[i+2:].strip().endswith(';'): bad.append(f'{os.path.basename(f)}:{n}: {l.strip()[-120:]}')
for cf in [os.path.join(root, 'style.css')] + sorted(glob.glob(os.path.join(common, '*.css'))):
  css = open(cf, encoding='utf-8').read()
  for m in re.finditer(r'/\*[\s\S]*?\*/', css):
    if '{' in m.group(0): bad.append(f"{os.path.basename(cf)}:{css[:m.start()].count(chr(10)) + 1}: comment holds a rule: {m.group(0)[:100]!r}")
print('\n'.join(bad) or 'no code inside comments'); sys.exit(1 if bad else 0)
