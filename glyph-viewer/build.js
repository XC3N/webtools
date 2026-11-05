#!/usr/bin/env node
// Builds the Glyph Viewer page: src.html (an artifact fragment) + glyph-data.js -> out/glyph-viewer.html.
// glyph-data.js is written by make_glyphs.py from the game's own fonts and tile sheet; never edit it by hand.
// src.html pulls it in with the marker /* @include glyph-data.js */ inside its script.
// No dependencies: `node glyph-viewer/build.js`. out/ is not committed; publish out/glyph-viewer.html to the artifact.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const dir = __dirname, out = path.join(dir, 'out');
const MARK = '/* @include glyph-data.js */';
const src = fs.readFileSync(path.join(dir, 'src.html'), 'utf8');
if (!src.includes(MARK)) throw new Error(`src.html has no ${MARK}`);
const data = fs.readFileSync(path.join(dir, 'glyph-data.js'), 'utf8');
if (!/^const GLYPH_DATA = /.test(data)) throw new Error('glyph-data.js does not start with "const GLYPH_DATA = "');
const html = src.replace(MARK, () => data.replace(/<\/script/gi, '<\\/script'));
if (!/^<title>[^<]+<\/title>/.test(html)) throw new Error('the page must start with its <title>');
if (/<!doctype|<html|<head|<body/i.test(html)) throw new Error('src.html must be a fragment: no doctype, html, head or body');
[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach((m, n) => {
  try { new vm.Script(m[1], { filename: `glyph viewer script ${n + 1}` }); } catch (e) { throw new Error(`script ${n + 1} doesn't parse: ${e.message}`); } });
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
fs.writeFileSync(path.join(out, 'glyph-viewer.html'), html);
console.log(`built glyph-viewer/out/glyph-viewer.html (${(html.length / 1024).toFixed(0)} KB)`);
