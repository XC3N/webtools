#!/usr/bin/env node
// Builds the Building Designer page: src.html + game/tiles.json + game/tiles.png -> out/building-designer.html.
// game/ is written by the game's tools/export_designer.py (see the game's README); never edit it by hand.
// Placeholders in src.html: /*{{GAME}}*/null (the tile table as JSON) and {{ATLAS}} (the tile sheet as a data URI).
// No dependencies: `node building-designer/build.js`. out/ is not committed.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname, out = path.join(dir, 'out');
const src = fs.readFileSync(path.join(dir, 'src.html'), 'utf8');
const game = JSON.parse(fs.readFileSync(path.join(dir, 'game', 'tiles.json'), 'utf8'));
const atlas = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, 'game', 'tiles.png')).toString('base64');
for (const k of ['tiles', 'legend', 'desk', 'sheet', 'glyphs', 'curb']) if (!game[k]) throw new Error(`game/tiles.json has no ${k}`);
for (const ph of ['/*{{GAME}}*/null', '{{ATLAS}}']) if (!src.includes(ph)) throw new Error(`src.html has no ${ph}`);
const html = src.replace('/*{{GAME}}*/null', () => JSON.stringify(game).replace(/</g, '\\u003c')).replace('{{ATLAS}}', () => atlas);
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, n) => {
  try { new vm.Script(m[1], { filename: `designer script ${n + 1}` }); } catch (e){ throw new Error(`script ${n + 1} doesn't parse: ${e.message}`); } });
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'building-designer.html'), html);
console.log(`built building-designer/out/building-designer.html (${(html.length / 1024).toFixed(0)} KB), tiles from game ${game.version} ${game.commit}`);
