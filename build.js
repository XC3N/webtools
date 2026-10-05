#!/usr/bin/env node
// Builds every tool into one standalone HTML file in dist/ (plus an index page).
//
// Each tool lives in tools/<name>/ with a tool.json: { name, entry, output, description }.
// Source files can pull in shared code from common/ with include markers, inlined recursively:
//   <!-- @include common/ui-kit.css -->     in HTML
//   /* @include common/midi.js */           inside <style> or <script>
// Paths are relative to the repo root. No dependencies: `node build.js`.
'use strict';
const fs = require('fs'), path = require('path');
const root = __dirname, out = path.join(root, 'dist');
const MARK = /<!--\s*@include\s+(\S+?)\s*-->|\/\*\s*@include\s+(\S+?)\s*\*\//g;

function inline(file, stack = []){
  if (stack.includes(file)) throw new Error('include cycle: ' + [...stack, file].map(f => path.relative(root, f)).join(' → '));
  if (!fs.existsSync(file)) throw new Error(`missing include ${path.relative(root, file)} (from ${path.relative(root, stack.at(-1) || file)})`);
  return fs.readFileSync(file, 'utf8').replace(MARK, (_, a, b) => inline(path.join(root, a || b), [...stack, file]));
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
const tools = [];
for (const dirName of fs.readdirSync(path.join(root, 'tools')).sort()){
  const dir = path.join(root, 'tools', dirName), metaFile = path.join(dir, 'tool.json');
  if (!fs.existsSync(metaFile)) continue;
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const html = inline(path.join(dir, meta.entry));
  fs.writeFileSync(path.join(out, meta.output), html);
  tools.push(meta);
  console.log(`built dist/${meta.output}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
}

// landing page for GitHub Pages
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>XC3N web tools</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;700;900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
:root{--bg:#0c0c0e;--panel:#16161a;--panel-2:#1c1c21;--edge:#2a2a31;--ink:#e9e7e0;--muted:#888892;--amber:#ffb000;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;min-height:100vh;background:var(--bg);color:var(--ink);font:15px/1.55 "Archivo",system-ui,sans-serif;padding:48px 16px}
main{max-width:760px;margin:0 auto}h1{font-weight:900;font-size:30px;margin:0 0 6px}p.sub{color:var(--muted);margin:0 0 30px}
a.tool{display:block;text-decoration:none;color:inherit;background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--edge);border-radius:10px;padding:18px 20px;margin-bottom:12px}
a.tool:hover{border-color:#a6731a}a.tool b{display:block;color:var(--amber);font-size:18px;margin-bottom:4px}
footer{margin-top:36px;color:var(--muted);font:500 12px "JetBrains Mono",monospace}footer a{color:var(--amber)}
</style></head><body><main>
<h1>XC3N web tools</h1>
<p class="sub">Single-file browser tools. Open one here, or download the .html and run it offline — everything is in the one file.</p>
${tools.map(t => `<a class="tool" href="${esc(t.output)}"><b>${esc(t.name)}</b>${esc(t.description)}</a>`).join('\n')}
<footer>Source: <a href="https://github.com/XC3N/webtools">github.com/XC3N/webtools</a></footer>
</main></body></html>
`);
console.log('built dist/index.html');
