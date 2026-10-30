#!/usr/bin/env node
// Builds every tool into one standalone HTML file in dist/ (plus an index page).
//
// Each tool lives in tools/<name>/ with a tool.json: { name, entry, output, description }.
// Source files can pull in shared code from common/ with include markers, inlined recursively:
//   <!-- @include common/ui-kit.css -->     in HTML
//   /* @include common/midi.js */           inside <style> or <script>
//   <!-- @markdown tools/x/NOTES.md -->     a Markdown file turned into HTML (headings, lists, paragraphs, `code`, **bold**, links)
// Paths are relative to the repo root. No dependencies: `node build.js`.
'use strict';
const fs = require('fs'), path = require('path');
const root = __dirname, out = path.join(root, 'dist');
const MARK = /<!--\s*@include\s+(\S+?)\s*-->|\/\*\s*@include\s+(\S+?)\s*\*\//g, MD = /<!--\s*@markdown\s+(\S+?)\s*-->/g;

function inline(file, stack = []){
  if (stack.includes(file)) throw new Error('include cycle: ' + [...stack, file].map(f => path.relative(root, f)).join(' → '));
  if (!fs.existsSync(file)) throw new Error(`missing include ${path.relative(root, file)} (from ${path.relative(root, stack.at(-1) || file)})`);
  return fs.readFileSync(file, 'utf8').replace(MD, (_, f) => markdown(path.join(root, f), file))
    .replace(MARK, (_, a, b) => inline(path.join(root, a || b), [...stack, file]));
}
// just enough Markdown for changelogs and notes
function markdown(file, from){
  if (!fs.existsSync(file)) throw new Error(`missing markdown ${path.relative(root, file)} (from ${path.relative(root, from)})`);
  const span = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const html = [], para = [];
  let list = false;
  const flush = () => { if (para.length){ html.push(`<p>${span(para.join(' '))}</p>`); para.length = 0; } if (list){ html.push('</ul>'); list = false; } };
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)){
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))){ flush(); const n = m[1].length; html.push(`<h${n + 2}>${span(m[2])}</h${n + 2}>`); }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))){ if (para.length) flush(); if (!list){ html.push('<ul>'); list = true; } html.push(`<li>${span(m[1])}</li>`); }
    else if (!line.trim()) flush();
    else if (list && /^\s+/.test(line)) html[html.length - 1] = html.at(-1).replace(/<\/li>$/, ' ' + span(line.trim()) + '</li>');
    else { if (list) flush(); para.push(line.trim()); }
  }
  flush(); return html.join('\n');
}
// every inline <script> must at least parse: a syntax error would otherwise only show up in the browser, as a blank tool
function checkScripts(html, name){
  const vm = require('vm'), re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g; let m, n = 0;
  while ((m = re.exec(html))){ n++; if (/type="(?!text\/javascript|module)/.test(m[0].slice(0, 60))) continue;
    try { new vm.Script(m[1], { filename: `${name} script ${n}` }); }
    catch (e){ const ln = (e.stack.match(/:(\d+)\n/) || [])[1]; throw new Error(`${name}: script ${n} doesn't parse: ${e.message}${ln ? ` (line ${ln} of that script)` : ''}`); } }
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
// every built file carries the licence's Required Notice lines (LICENSE.md) and its URL, so a copy passed on keeps them
const NOTICES = fs.readFileSync(path.join(root, 'LICENSE.md'), 'utf8').split('\n').filter(l => /^(Required Notice|Licensor Line of Business):/.test(l));
const withNotices = html => html.replace(/^(<!doctype html>\s*)/i, `$1<!--\n${NOTICES.join('\n')}\nLicence: PolyForm Shield 1.0.0, https://polyformproject.org/licenses/shield/1.0.0\n-->\n`);
const tools = [];
for (const dirName of fs.readdirSync(path.join(root, 'tools')).sort()){
  const dir = path.join(root, 'tools', dirName), metaFile = path.join(dir, 'tool.json');
  if (!fs.existsSync(metaFile)) continue;
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const html = inline(path.join(dir, meta.entry));
  checkScripts(html, meta.output);
  fs.writeFileSync(path.join(out, meta.output), withNotices(html));
  tools.push(meta);
  console.log(`built dist/${meta.output}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
}

// tools that moved to their own repositories (moved.json): the index links to them, and their old file names
// here redirect, so old links and bookmarks keep working
const moved = JSON.parse(fs.readFileSync(path.join(root, 'moved.json'), 'utf8'));
for (const m of moved){
  fs.writeFileSync(path.join(out, m.output), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(m.name)} has moved</title>
<meta http-equiv="refresh" content="0; url=${esc(m.url)}"><link rel="canonical" href="${esc(m.url)}">
<script>location.replace(${JSON.stringify(m.url)} + location.search + location.hash)</script></head>
<body style="background:#0c0c0e;color:#e9e7e0;font:15px system-ui,sans-serif;padding:48px 16px">${esc(m.name)} has moved to <a style="color:#ffb000" href="${esc(m.url)}">${esc(m.url)}</a>.</body></html>
`);
  console.log(`built dist/${m.output}  (redirect → ${m.url})`);
}
const listed = [...tools.map(t => ({ ...t, href: t.output })), ...moved.map(m => ({ ...m, href: m.url }))].sort((a, b) => a.name.localeCompare(b.name));

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
${listed.map(t => `<a class="tool" href="${esc(t.href)}"><b>${esc(t.name)}</b>${esc(t.description)}</a>`).join('\n')}
<footer>Source: <a href="https://github.com/XC3N/webtools">github.com/XC3N/webtools</a></footer>
</main></body></html>
`);
console.log('built dist/index.html');
