#!/usr/bin/env node
// Builds one page per bench from the shared source: bench/bench.html + bench/benches.json -> bench/out/<id>.html.
// Placeholders in bench.html: {{TITLE}} {{NAME}} {{NAME_A}} {{NAME_B}} {{LINK}} {{LINK_LABEL}} (HTML-escaped)
// and {{CONFIG}} (the bench's entry as a JS object). Every built page's script must parse, or the build stops.
// No dependencies: `node bench/build.js`. bench/out/ is not committed.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname, out = path.join(dir, 'out');
const src = fs.readFileSync(path.join(dir, 'bench.html'), 'utf8');
const benches = JSON.parse(fs.readFileSync(path.join(dir, 'benches.json'), 'utf8'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
const ids = new Set();
for (const b of benches){
  for (const k of ['id', 'url', 'title', 'name', 'link', 'linkLabel', 'people', 'areas'])
    if (b[k] == null) throw new Error(`benches.json: "${b.id || '?'}" has no ${k}`);
  if (ids.has(b.id)) throw new Error(`benches.json: id "${b.id}" is used twice`);
  ids.add(b.id);
  if (!b.people.length) throw new Error(`benches.json: "${b.id}" needs at least one person`);
  const config = { areas: b.areas, areaOld: b.areaOld || {}, people: b.people };
  const vals = { TITLE: b.title, NAME: b.name.join(''), NAME_A: b.name[0], NAME_B: b.name[1] || '', LINK: b.link, LINK_LABEL: b.linkLabel };
  const html = src
    .replace('{{CONFIG}}', () => JSON.stringify(config).replace(/</g, '\\u003c'))
    .replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => { if (!(k in vals)) throw new Error(`bench.html: unknown placeholder ${m}`); return esc(vals[k]); });
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  scripts.forEach((m, n) => { try { new vm.Script(m[1], { filename: `${b.id} script ${n + 1}` }); }
    catch (e){ throw new Error(`${b.id}: script ${n + 1} doesn't parse: ${e.message}`); } });
  fs.writeFileSync(path.join(out, b.id + '.html'), html);
  console.log(`built bench/out/${b.id}.html  → ${b.url}`);
}
