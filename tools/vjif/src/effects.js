// ---------- screen effects: a WebGL pass over the finished frame (output and preview) ----------
// Twelve effect slots on F1–F12, each with a few styles; nine presets (stored mixes) on the numpad with Caps Lock.
const FX_KEYS = Array.from({ length: 12 }, (_, i) => 'F' + (i + 1)), FX_LABELS = FX_KEYS;
// { id, name, title, mode (default), rate (uses Rate), styles: [[value, label, title]] }
const FX_DEFS = [
  { id: 'colour', name: 'Colour', title: 'Colour shifts', mode: 'hold', rate: true, styles: [['flip', 'Flip', 'Hue turned halfway round'], ['cycle', 'Cycle', 'Hue rotates (one turn every 16 × Rate)'], ['invert', 'Invert', 'Negative colours'], ['pal', 'Palette', 'Every colour snapped to the nearest of a palette: Grey, 1-bit (black and white; with Dither: an old Mac screen) or an old computer or console palette (pick it with Palette; the Game Boy palettes have Dots, a dot-matrix screen, in place of Dither)']] },
  { id: 'poster', name: 'Posterize', title: 'Flat colours / outlines', mode: 'hold', styles: [['bands', 'Bands', 'Fewer colours, flat bands'], ['edges', 'Edges', 'Neon outlines on black']] },
  { id: 'strobe', name: 'Strobe', title: 'Flashes on the beat grid (Rate)', mode: 'hold', rate: true, styles: [['white', 'White', 'Flashes white'], ['black', 'Black', 'Flashes black'], ['degauss', 'Degauss', 'The picture wobbles through rainbow blotches, like a tube being degaussed (best as a Hit with a long Release)']] },
  { id: 'feedback', name: 'Feedback', title: 'The picture echoes into itself', mode: 'latch', styles: [['trails', 'Trails', 'Moving things leave trails'], ['tunnel', 'Tunnel', 'Copies shrink into the centre'], ['spiral', 'Spiral', 'Copies shrink and turn']] },
  { id: 'zoom', name: 'Zoom', title: 'Zoom punch', mode: 'hit', styles: [['in', 'In', 'Punches in, around the middle of the frame'], ['out', 'Out', 'Punches out, around the middle of the frame'], ['eachin', 'Each in', 'Every GIF punches in around its own centre'], ['eachout', 'Each out', 'Every GIF punches out around its own centre']] },
  { id: 'shake', name: 'Shake', title: 'Camera shake, a new jolt every Rate', mode: 'hit', rate: true, styles: [['shake', 'Shake', 'Big jolts'], ['jitter', 'Jitter', 'Small, twice as fast']], size: true },
  { id: 'wobble', name: 'Wobble', title: 'Wavy distortion, one cycle per Rate', mode: 'hold', rate: true, styles: [['wave', 'Wave', 'Sideways waves'], ['ripple', 'Ripple', 'Rings from the centre']] },
  { id: 'mirror', name: 'Mirror', title: 'Folds the picture', mode: 'latch', styles: [['lr', 'L→R', 'Left half mirrored onto the right'], ['rl', 'R→L', 'Right half mirrored onto the left'], ['tb', 'T→B', 'Top half mirrored onto the bottom'], ['bt', 'B→T', 'Bottom half mirrored onto the top'], ['quad', 'Quad', 'Top-left quarter, four ways'], ['kal', 'Kaleido', 'Kaleidoscope: Amount sets how many slices (3 to 12), Zoom how far in']] },
  { id: 'pixel', name: 'Pixel', title: 'Pixelate', mode: 'hold', size: true, styles: [['square', 'Square', 'Square pixels'], ['wide', 'Wide', 'Wide pixels']] },
  { id: 'glitch', name: 'Glitch', title: 'The picture torn apart, re-torn every Rate (several at once)', mode: 'hold', rate: true, styles: [['slices', 'Slices', 'Torn horizontal slices (Size = slice height)'], ['blocks', 'Blocks', 'Shuffled blocks (Size = block size)'], ['melt', 'Melt', 'Columns drip down (Size = column width)']], size: true, sizeDef: 48, sizeFor: ['slices', 'blocks', 'melt'] },
  { id: 'codec', name: 'Codec', title: 'A broken video file: datamosh, a lost keyframe, a starved bit rate; re-keyed every Rate (several at once)', mode: 'hold', rate: true, styles: [['corrupt', 'Corrupt', 'A damaged video file, datamoshed: runs of blocks keep the stale picture and push it along the motion every frame (the live picture\'s own, plus a slow drift), so it streams and swells like a repeated P-frame; others break into flat, wrong-coloured blocks (Size = block size)'], ['keyfr', 'Keyframe', 'A lost keyframe: the picture freezes when it starts, then moves with the live picture\'s motion, block by block, and smears (datamosh); a few blocks catch up each Rate, more with less Amount (Size = block size)'], ['crunch', 'Crunch', 'Heavy compression, like a starved bit rate: the detail stays but in a few bands per block, the colour comes in blocks twice the size and bleeds across edges (Size = block size)']], size: true, sizeDef: 48, sizeFor: ['corrupt', 'keyfr', 'crunch'], rateFor: ['corrupt', 'keyfr'] },   // (Crunch doesn't move: no Rate)
  { id: 'rgb', name: 'CRT', title: 'Tube and tape: colour split, VHS, scanlines, phosphor glow, pay-TV and satellite scrambling (several at once)', mode: 'hit', styles: [['split', 'Split', 'Colour channels pulled apart'], ['vhs', 'VHS', 'Tape: tracking sway, a torn band rolling down, washed colour, scanlines, noise; its Amount is the wear: tracking bands, colour bleed, dropouts, a bending top and switching noise'], ['scan', 'Scanlines', 'Dark scanlines and an RGB aperture grille, like a tube up close (Size = line spacing)'], ['phos', 'Phosphor', 'Bright parts glow and linger, like phosphor'], ['paytv', 'Pay-TV', 'A scrambled cable channel (sync suppressed): the picture wraps sideways in a wobbling S with the blanking bar showing, the vertical hold drifts, the colour comes out wrong'], ['crypt', 'Crypt', 'A scrambled satellite channel: lines shuffled within blocks (Nagravision) and each cut and rotated (Videocrypt), re-keyed 4 times a second; Amount = how many lines, Size = line height']], size: true, sizeDef: 3, sizeFor: ['scan', 'crypt'] } ];
const FXI = Object.fromEntries(FX_DEFS.map((d, i) => [d.id, i]));   // an effect's slot (F key) by its id
// 0.78 put the pads in groups of four (look · movement · texture and screen); sets, defaults and MIDI maps saved before
// keep effects by their old slots, so they're moved: fxRemapIdx(old slot) → new slot (presets, past the twelve, stay)
const FX_ORDER_V1 = ['mono', 'colour', 'strobe', 'poster', 'zoom', 'shake', 'wobble', 'mirror', 'glitch', 'rgb', 'pixel', 'feedback'];
const FX_ORDER_V2 = ['mono', 'colour', 'poster', 'strobe', 'zoom', 'shake', 'wobble', 'mirror', 'pixel', 'glitch', 'rgb', 'feedback'];   // 0.78–0.93
const fxRemapIdx = j => j < FX_ORDER_V1.length ? FX_ORDER_V2.indexOf(FX_ORDER_V1[j]) : j;   // (into the 0.78 slots; fxMig3 then moves them to today's)
const fxRemapArr = a => { if (!Array.isArray(a)) return a; const o = a.slice(); a.forEach((v, j) => { o[fxRemapIdx(j)] = v; }); return o; };
const fxRemapKeys = o => o ? Object.fromEntries(Object.entries(o).map(([k, v]) => [fxRemapIdx(+k), v])) : o;
// 0.94 (ID-172): Mono went into Colour (Grey and 1-bit palettes), Glitch split into Glitch and Codec, Degauss moved to Strobe,
// and the pads regrouped: look (Colour, Posterize, Strobe, Feedback) · movement · texture (Pixel, Glitch, Codec, CRT).
// fxMig3*: a 0.78-order slot / array / preset mix → today's. A Mono pad becomes Colour's palette (unless Colour was set too).
const FX_GL3 = ['slices', 'blocks', 'melt'], FX_CD3 = ['corrupt', 'keyfr', 'crunch'];
const fxIdx3 = j => j < 12 ? FXI[FX_ORDER_V2[j] === 'mono' ? 'colour' : FX_ORDER_V2[j]] : j;
const fxParts3 = (e, keep, def) => { const P = String(e && e.style || '').split('+').map(p => p === 'scramble' ? 'corrupt' : p).filter(p => keep.includes(p));
  const pa = e && e.pamt ? Object.fromEntries(Object.entries(e.pamt).filter(([k]) => keep.includes(k))) : null;
  return P.length ? { ...e, style: P.join('+'), ...(pa ? { pamt: pa } : {}) } : def === undefined ? null : { ...e, style: def, ...(pa ? { pamt: pa } : {}) }; };
const fxMono3 = e => { const st = String(e && e.style || 'grey').split('+')[0], d = st === 'dither';
  return { ...e, style: 'pal', pal: st === 'grey' ? PAL_GREY : PAL_1BIT, dith: d ? 1 : 0, dpat: d ? 1 : 0 }; };
function fxMig3Cfg(a){
  if (!Array.isArray(a) || a.length < 12) return a; const V = id => a[FX_ORDER_V2.indexOf(id)], o = [];
  for (const d of FX_DEFS){ const id = d.id;
    o.push(id === 'glitch' ? fxParts3(V('glitch'), FX_GL3, 'slices') : id === 'codec' ? fxParts3(V('glitch'), FX_CD3, 'corrupt') : id === 'colour' && !V('colour') ? fxMono3(V('mono')) : V(id)); }
  return o.concat(a.slice(12));
}
function fxMig3Keys(m){
  if (!m) return m; const r = {}, V = id => m[FX_ORDER_V2.indexOf(id)];
  for (const [k, e] of Object.entries(m)){ const j = +k, id = FX_ORDER_V2[j];
    if (j >= 12 || !id){ r[k] = e; continue; }
    if (id === 'mono'){ if (!V('colour')) r[FXI.colour] = fxMono3(e); continue; }
    if (id === 'glitch'){ const g = fxParts3(e, FX_GL3), c = fxParts3(e, FX_CD3); if (g) r[FXI.glitch] = g; if (c) r[FXI.codec] = c;
      if (String(e.style || '').split('+').includes('degauss') && !V('strobe')){ const { pamt, ...x } = e; r[FXI.strobe] = { ...x, style: 'degauss' }; } continue; }
    r[FXI[id]] = e; }
  return r;
}
const fxMig3On = a => { if (!Array.isArray(a)) return a; const o = a.slice(), V = id => a[FX_ORDER_V2.indexOf(id)];
  FX_DEFS.forEach((d, i) => { o[i] = d.id === 'codec' ? V('glitch') : d.id === 'colour' ? (V('colour') || V('mono') || 0) : V(d.id); }); return o; };
function fxRemapDefs(d){ if (!d || d.fxOrd >= 3) return d;   // saved defaults (Settings › Defaults)
  if (!d.fxOrd){ if (d.fx) d.fx = fxRemapArr(d.fx); if (d.fxPre) d.fxPre.forEach(P => P.fx = fxRemapKeys(P.fx)); }
  if (d.fx) d.fx = fxMig3Cfg(d.fx); if (d.fxPre) d.fxPre.forEach(P => P.fx = fxMig3Keys(P.fx)); d.fxOrd = 3; return d; }
const FX_LENS = [[0, '0'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars']];
const FX_REL = 0.125;                                // default release of Hold / Latch effects (beats)
const FX_RELS = [[0, '0'], [0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars']];
const fxRelDef = mode => mode === 'hit' ? 0.5 : FX_REL;   // Hit: Gate 1/8 + Release 1/8 (a quarter note in all); Hold / Latch: a short 1/32 tail
const fxLenDef = mode => mode === 'hit' ? 0.5 : 0;
const FX_RATES = [[0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar']];
const fxFactory = () => FX_DEFS.map(d => ({ mode: d.mode, amt: 1, att: 0, dec: 0, sus: 1, len: fxLenDef(d.mode), rel: fxRelDef(d.mode), rate: d.id === 'wobble' ? 2 : d.id === 'colour' ? 1 : 0.25, style: d.styles[0][0], target: 'out', size: d.sizeDef || 64 }));
const fxDefaults = () => userDef.fx ? JSON.parse(JSON.stringify(userDef.fx)) : fxFactory();   // your own defaults (Settings › Defaults) if saved
// Colour › Palette: the old machines' colours (hex), nearest-colour match in the shader
const FX_PALS = [
  ['CGA 1', 'CGA, mode 4 palette 1 (bright): black, cyan, magenta, white', '000000 55ffff ff55ff ffffff'],
  ['CGA 2', 'CGA, mode 4 palette 0 (bright): black, green, red, yellow', '000000 55ff55 ff5555 ffff55'],
  ['CGA 3', 'CGA, mode 5: black, cyan, red, white', '000000 55ffff ff5555 ffffff'],
  ['EGA', 'EGA / CGA text, the 16 colours', '000000 0000aa 00aa00 00aaaa aa0000 aa00aa aa5500 aaaaaa 555555 5555ff 55ff55 55ffff ff5555 ff55ff ffff55 ffffff'],
  ['C64', 'Commodore 64, the 16 colours', '000000 ffffff 68372b 70a4b2 6f3d86 588d43 352879 b8c76f 6f4f25 433900 9a6759 444444 6c6c6c 9ad284 6c5eb5 959595'],
  ['NES', 'Nintendo NES, its 55 colours', '7c7c7c 0000fc 0000bc 4428bc 940084 a80020 a81000 881400 503000 007800 006800 005800 004058 000000 bcbcbc 0078f8 0058f8 6844fc d800cc e40058 f83800 e45c10 ac7c00 00b800 00a800 00a844 008888 f8f8f8 3cbcfc 6888fc 9878f8 f878f8 f85898 f87858 fca044 f8b800 b8f818 58d854 58f898 00e8d8 787878 fcfcfc a4e4fc b8b8f8 d8b8f8 f8b8f8 f8a4c0 f0d0b0 fce0a8 f8d878 d8f878 b8f8b8 b8f8d8 00fcfc f8d8f8'],
  ['GB', 'Game Boy (1989): four greens', '0f380f 306230 8bac0f 9bbc0f'],
  ['GB Pocket', 'Game Boy Pocket: four olive greys', '1f1f1f 4d533c 8b956d c4cfa1'],
  ['GB Light', 'Game Boy Light, backlight on: four blue-greens', '004f3b 00694a 009a71 00b581'],
  ['ZX Spectrum', 'Sinclair ZX Spectrum: black, then blue, red, magenta, green, cyan, yellow, white, plain and bright', '000000 0000d7 d70000 d700d7 00d700 00d7d7 d7d700 d7d7d7 0000ff ff0000 ff00ff 00ff00 00ffff ffff00 ffffff'],
  ['Grey', '6-bit grey: 64 shades', Array.from({ length: 64 }, (_, i) => Math.round(i * 255 / 63).toString(16).padStart(2, '0').repeat(3)).join(' ')],
  ['1-bit', '1-bit: black and white only, hard (Dither off) or dotted like an old Mac screen (Dither › Bayer)', '000000 ffffff'],
  // 0.99: fewer greys, so Dither shows (with 64 steps there's next to nothing between two shades to dither). Added at the end: saved palettes keep their numbers
  ['Grey 16', '4-bit grey: 16 shades, Dither shows as fine grain', Array.from({ length: 16 }, (_, i) => Math.round(i * 255 / 15).toString(16).padStart(2, '0').repeat(3)).join(' ')],
  ['Grey 4', '2-bit grey: 4 shades, like an early handheld screen; Dither shows as clear patterns', '000000 555555 aaaaaa ffffff'],
].map(([n, t, h]) => { const c = h.split(' ').map(x => [0, 2, 4].map(o => parseInt(x.substr(o, 2), 16) / 255)), ok = c.map(okLab);
  return { n, t, c, f: new Float32Array(64 * 3).fill(0).map((v, i) => i < c.length * 3 ? c[i / 3 | 0][i % 3] : 0), ok: new Float32Array(64 * 3).fill(0).map((v, i) => i < c.length * 3 ? ok[i / 3 | 0][i % 3] : 0) }; });
// Colour › Palette: how the in-between shades are drawn (the Size row stands in for it). Scatter: noise added before
// snapping (soft, many colours touch). Ordered: each pixel picks one of the two nearest palette colours by a 4×4 Bayer
// threshold, like DOS-era / 8-bit art. Checker: the two colours only ever as a 50% checkerboard (hand-pixelled look)
const FX_DPAT = [[0, 'Noise'], [1, 'Bayer'], [2, 'Check']];   // short: the name and amount share the slider's readout
// Colour › Palette's Dither row holds both: off, then each pattern from 10 to 100% (one slider, as there's room for one).
// Its value is pattern × 2 + amount (Noise 0.1–1, Bayer 2.1–3, Check 4.1–5), split back into dpat and dith.
const FX_DITH = [[0, 'off'], ...Array.from({ length: 10 }, (_, j) => [(j + 1) / 10, (j + 1) * 10 + '%'])];   // Colour › Palette's Dither amount (the pattern is its own switch)
// CRT › VHS alone (no Scanlines / Crypt, which own the Size row): the Size row sets how many dropouts the tape has
const FX_DROP = Array.from({ length: 21 }, (_, i) => [i / 10, i * 10 + '%']);   // 0–200 %
// With several CRT styles stacked, the one in focus (right-click a style, or the last one switched on) decides: VHS → Dropouts, Scanlines / Crypt → Size
const fxFocus = {};   // effect id → style in focus (editor state, not saved)
const FX_DOTS = [[0, 'Off', 'LCD off: the palette only'], [1, 'Pixels', 'Game Boy pixels: the picture in 144 rows of square pixels, like the 160 × 144 screen'], [2, 'Dots', 'Dot matrix: Game Boy pixels with thin gaps between them, in the palette\'s lightest colour (the LCD\'s own)']];   // Colour › Palette › LCD, for the Game Boy palettes (0.87.2; older 2 / 10 px sets read as Dots)
const FX_DOTS_ICON = { 0: '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" style="display:block;margin:auto"><rect x="1" y="1" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>', 1: '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" style="display:block;margin:auto"><rect x="0" y="0" width="4" height="4" opacity="1"/><rect x="4" y="0" width="4" height="4" opacity="0.45"/><rect x="8" y="0" width="4" height="4" opacity="1"/><rect x="0" y="4" width="4" height="4" opacity="0.45"/><rect x="4" y="4" width="4" height="4" opacity="1"/><rect x="8" y="4" width="4" height="4" opacity="0.45"/><rect x="0" y="8" width="4" height="4" opacity="1"/><rect x="4" y="8" width="4" height="4" opacity="0.45"/><rect x="8" y="8" width="4" height="4" opacity="1"/></svg>', 2: '<svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" style="display:block;margin:auto"><rect x="0.5" y="0.5" width="3" height="3" opacity="1"/><rect x="4.5" y="0.5" width="3" height="3" opacity="0.45"/><rect x="8.5" y="0.5" width="3" height="3" opacity="1"/><rect x="0.5" y="4.5" width="3" height="3" opacity="0.45"/><rect x="4.5" y="4.5" width="3" height="3" opacity="1"/><rect x="8.5" y="4.5" width="3" height="3" opacity="0.45"/><rect x="0.5" y="8.5" width="3" height="3" opacity="1"/><rect x="4.5" y="8.5" width="3" height="3" opacity="0.45"/><rect x="8.5" y="8.5" width="3" height="3" opacity="1"/></svg>' };
const FX_OVS = [[0, 'Off'], [2, 'On']];   // Shake › Edges (one toggle; 1 = the old Some, read as on)
// the order palettes are offered in: by year (CGA 1981, ZX Spectrum and C64 1982, NES 1983, EGA 1984, Game Boy 1989, Pocket 1996,
// Light 1998). Sets keep a palette's index in FX_PALS, which never changes, so this order is only for the menus and the slider.
{ const D = { 'Grey': 'Grey 6-bit', 'Grey 16': 'Grey 4-bit', 'Grey 4': 'Grey 2-bit', '1-bit': 'Grey 1-bit' }; FX_PALS.forEach(P => P.d = D[P.n] || P.n); }   // shown names: the greys by bits (0.99.4); n stays the key
const PAL_GREY = FX_PALS.findIndex(P => P.n === 'Grey'), PAL_1BIT = FX_PALS.findIndex(P => P.n === '1-bit');
const PAL_ORDER = ['Grey', 'Grey 16', 'Grey 4', '1-bit', 'CGA 1', 'CGA 2', 'CGA 3', 'ZX Spectrum', 'C64', 'NES', 'EGA', 'GB', 'GB Pocket', 'GB Light'].map(n => FX_PALS.findIndex(P => P.n === n));
// 0.99.3: the Palette slider steps through families; a family's variants are a switch beside Dither (saved sets keep the
// palette's own number, so nothing to convert)
const PAL_FAM = [['Grey', [['Grey', '6'], ['Grey 16', '4'], ['Grey 4', '2'], ['1-bit', '1']]], ['CGA', [['CGA 1', '1'], ['CGA 2', '2'], ['CGA 3', '3']]], ['ZX Spectrum'], ['C64'], ['NES'], ['EGA'],
  ['GB', [['GB', 'DMG'], ['GB Pocket', 'Pocket', 'Pkt'], ['GB Light', 'Light', 'Lt']]]].map(([n, m]) => ({ n, m: (m || [[n, n]]).map(([p, l, s]) => ({ i: FX_PALS.findIndex(P => P.n === p), l, s: s || l })) }));   // s: the short name, on narrow screens
const palFam = i => { const f = PAL_FAM.findIndex(F => F.m.some(x => x.i === i)); return f < 0 ? [0, 0] : [f, PAL_FAM[f].m.findIndex(x => x.i === i)]; };
const palLast = {};   // the variant picked last in each family (this session)
// (run once the palettes exist: a Mono pad's migration names them)
if (userDef && (userDef.fx || userDef.fxPre) && !(userDef.fxOrd >= 3)){ fxRemapDefs(userDef); Prefs.set('vjif-userdef', JSON.stringify(userDef)); }
{ const o = Prefs.json('vjif-midi'); if (o && !(o.fxOrd >= 3) && midiCtl.map.length){ midiCtl.map.forEach(m => { if (m.t === 'fx'){ if (!o.fxOrd) m.i = fxRemapIdx(m.i); m.i = fxIdx3(m.i); } }); saveMidiCtl(); } }   // MIDI mappings of effect pads
// one small line icon per effect (0.87.3): on the effect pads (lower right), the preset tiles (first line) and the effect editor's LCD
const FX_ICON_SVG = {
  colour: '<circle cx="7.5" cy="8" r="4"/><circle cx="12.5" cy="8" r="4"/><circle cx="10" cy="12.5" r="4"/>',
  poster: '<rect x="3" y="3" width="14" height="14" rx="1"/><path d="M3 8h14M3 12.5h14"/><path d="M3 8h14v4.5H3z" fill="currentColor" opacity=".45"/>',
  strobe: '<path d="M11 2 5 11h4.5L8 18l7-10h-4.5z"/>',
  zoom: '<rect x="6.5" y="6.5" width="7" height="7"/><path d="M2.5 6V2.5H6M14 2.5h3.5V6M17.5 14v3.5H14M6 17.5H2.5V14"/>',
  shake: '<rect x="5" y="5" width="10" height="10" rx="1"/><path d="M2 7v6M18 7v6M3.5 5v10M16.5 5v10" opacity=".7"/>',
  wobble: '<path d="M2 7c2-3 4-3 6 0s4 3 6 0 3-2 4-1M2 13c2-3 4-3 6 0s4 3 6 0 3-2 4-1"/>',
  mirror: '<path d="M10 2.5v15" stroke-dasharray="2 2"/><path d="M8 5 3 10l5 5zM12 5l5 5-5 5z"/>',
  pixel: '<path d="M3 3h5v5H3zM12 3h5v5h-5zM7.5 7.5h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z" fill="currentColor" stroke="none" opacity=".85"/>',
  glitch: '<path d="M3 4h9M6 7.5h11M2.5 11h7M8 14.5h9.5M4 17h6"/>',
  codec: '<rect x="2.5" y="2.5" width="6.5" height="6.5"/><rect x="11" y="2.5" width="6.5" height="6.5" fill="currentColor" opacity=".5"/><rect x="2.5" y="11" width="6.5" height="6.5" fill="currentColor" opacity=".5"/><rect x="11" y="11" width="6.5" height="6.5"/>',
  rgb: '<rect x="2.5" y="4" width="15" height="11" rx="2.5"/><path d="M5 8h10M5 11h10" opacity=".6"/><path d="M7 18h6"/>',
  feedback: '<rect x="2.5" y="2.5" width="15" height="15"/><rect x="5.5" y="5.5" width="9" height="9" opacity=".75"/><rect x="8.3" y="8.3" width="3.4" height="3.4" opacity=".5"/>' };
const fxIcon = id => FX_ICON_SVG[id] ? `<svg class="fxic" viewBox="0 0 20 20" aria-hidden="true">${FX_ICON_SVG[id]}</svg>` : '';
// the Game Boy's dot, in real pixels: a whole number (a fraction made dots of two widths and an uneven, tartan-like grid,
// 0.89.1) near the height / 144, one that divides the canvas when there is one so the grid lines up with the frame
function lcdDot(){ const t = CH / 144, c = [0, -1, 1, -2, 2, -3, 3].map(k => Math.max(2, Math.round(t) + k)), fits = d => CW % d === 0 && CH % d === 0;
  return c.find(d => (d === 2 || d % 4 === 0) && fits(d)) || c.find(fits) || c.find(d => CH % d === 0) || c[0]; }   // a multiple of 4 first: it lands whole in the preview's eighths
const palGB = i => /^GB/.test((FX_PALS[i] || {}).n || '');
function sizeAlt(d, style, C){
  if (d && d.id === 'shake') return { label: 'Edges', key: 'ovs', def: 2, list: FX_OVS, toggle: true, seg: true,   // one icon: zoom in enough that no frame edge ever shows, or not (0.87.3; an older Some reads as on)
    icon: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><rect x="5.5" y="5.5" width="9" height="9"/><path d="M2.5 6V2.5H6M14 2.5h3.5V6M17.5 14v3.5H14M6 17.5H2.5V14"/></svg>',
    title: () => 'Edges: while it shakes, zoom in just enough that the frame edges never show (on), or let them show (off)' };
  if (d && d.id === 'wobble') return { label: 'Edges', key: 'ovs', def: 2, list: FX_OVS, toggle: true, seg: true,   // 0.90: like Shake's
    icon: '<svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><rect x="5.5" y="5.5" width="9" height="9"/><path d="M2.5 6V2.5H6M14 2.5h3.5V6M17.5 14v3.5H14M6 17.5H2.5V14"/></svg>',
    title: () => 'Edges: while it wobbles, zoom in just enough that the frame edges never show (on), or let them show (off)' };
  if (d && d.id === 'colour') return null;   // (Colour › Palette › Dots moved to the Dither row in 0.87: Game Boy palettes only)
  if (!d || d.id !== 'rgb') return null; const P = String(style || '').split('+'), f = P.includes(fxFocus[d.id]) ? fxFocus[d.id] : null;
  if (f === 'scan' || f === 'crypt') return null;
  if (f !== 'vhs' && (!P.includes('vhs') || P.includes('scan') || P.includes('crypt'))) return null;
  return { label: 'Dropouts', key: 'vdrop', def: 1, list: FX_DROP, title: () => 'Dropouts: how often the tape loses its picture in streaks (they also grow with Wear)' };
}
// styles that use the Rate row for something else: Colour › Palette picks the palette, Mirror › Kaleido zooms in, Feedback: how long the echoes last
const FX_KZ = Array.from({ length: 101 }, (_, i) => { const v = +(1 + i * 0.05).toFixed(2); return [v, v.toFixed(2).replace(/\.?0+$/, '') + '×']; });   // 1× to 6×, fine steps
const FX_FBK = Array.from({ length: 20 }, (_, i) => [(i + 1) / 20, (i + 1) * 5 + '%']);   // no 0%: it isn't "off", only the shortest trails
function rateAlt(d, style, C){
  if (!d) return null;
  if (d.id === 'colour' && style === 'pal' && C && palGB(C.pal || 0)) return { label: 'Dither', key: 'dith', def: 0, list: FX_DITH, lcd: { key: 'dots', def: 0, list: FX_DOTS, icons: FX_DOTS_ICON },   // the Game Boy: Dither (Bayer) and, in the pattern switch's place, its screen (0.99.4)
    title: () => 'Dither: how much of the in-between shades are drawn with the four greens (Bayer pattern). The switch beside it is the LCD: Off, Pixels (144 rows of square pixels) or Dots (with the dot-matrix gaps)' };
  if (d.id === 'feedback') return { label: 'Length', key: 'fbk', def: 0.7, list: FX_FBK, title: () => 'Length: how long the trails / echoes last before they fade' };
  if (d.id === 'colour' && style === 'pal') return { label: 'Dither', key: 'dith', def: 0, list: FX_DITH, pat: true,   // the pattern: the Noise / Bayer / Check switch beside it
    title: () => 'Dither: how much of the in-between shades are drawn with the palette colours (off = flat areas). The switch beside it picks how' };
  if (d.id === 'mirror' && style === 'kal') return { label: 'Zoom', key: 'kz', def: 1, list: FX_KZ, title: () => 'Zoom: into the middle of the kaleidoscope' };
  return null;
}
const FX_SIZES = [[2, '2 px'], [3, '3 px'], [4, '4 px'], [6, '6 px'], [8, '8 px'], [12, '12 px'], [16, '16 px'], [24, '24 px'], [32, '32 px'], [48, '48 px'], [64, '64 px'], [96, '96 px'], [128, '128 px'], [192, '192 px']];
// Mirror › Kaleido: its Amount is the number of slices, 3–12 (Amount's 5–100%)
const kalSlices = amt => Math.round(3 + 9 * clamp((amt - 0.05) / 0.95, 0, 1)), kalAmt = n => 0.05 + (n - 3) / 9 * 0.95;
// a style's name on an effect tile, when the whole word doesn't fit
const STYLE_BTN = { scan: 'Scan', phos: 'Phos' };   // style buttons: short enough for one row (the tooltip has the full name)
const STYLE_SHORT = { keyfr: 'Keyfr.', thresh: 'Thresh', scan: 'Scan', phos: 'Phos', degauss: 'Degauss', eachin: 'Each in', eachout: 'Each out', kal: 'Kaleid.', square: 'Square' };
const STYLE_WAS = { scramble: 'corrupt' };   // (0.94: Glitch's Corrupt / Keyframe / Crunch went to Codec, Degauss to Strobe: fxMig3)   // renamed / replaced styles: what an older set gets instead
const styleIdx = (i, v) => { const k = String(v).split('+')[0]; return Math.max(0, FX_DEFS[i].styles.findIndex(s => s[0] === (STYLE_WAS[k] || k))); };
// CRT can stack styles ('vhs+scan'): they run as separate stages in a fixed order. Degauss stays on its own (a one-off hit)
const FX_MULTI = { rgb: true, glitch: true, codec: true }, FX_SOLO = {};   // Glitch's styles stack too (0.79), e.g. Corrupt + Crunch   // (Degauss, a one-off hit, moved to Glitch: CRT's styles all stack)
const styleParts = (i, v) => { const L = String(v || '').split('+').map(p => STYLE_WAS[p] || p).filter(p => FX_DEFS[i].styles.some(s => s[0] === p)); return L.length ? L : [FX_DEFS[i].styles[0][0]]; };
const styleNorm = (i, v) => { const P = styleParts(i, v); return FX_DEFS[i].styles.map(s => s[0]).filter(k => P.includes(k)).join('+'); };   // valid parts, in the styles' order
const styleMask = (i, v) => styleParts(i, v).reduce((m, p) => m | (1 << FX_DEFS[i].styles.findIndex(s => s[0] === p)), 0);
const styleLabel = (i, v, short) => styleParts(i, v).map(p => { const s = FX_DEFS[i].styles.find(x => x[0] === p); return short ? STYLE_SHORT[p] || s[1] : s[1]; }).join('+');
function styleToggle(i, cur, v){                // a click on a style button: the one style, or (CRT) in / out of the stack
  if (!FX_MULTI[FX_DEFS[i].id] || FX_SOLO[v]) return v;
  const P = styleParts(i, cur).filter(p => !FX_SOLO[p]), k = P.indexOf(v);
  if (k >= 0){ if (P.length > 1) P.splice(k, 1); } else P.push(v);
  return styleNorm(i, P.join('+'));
}
// style numbers by name (FXS.rgb.phos …), and the same as GLSL constants (S_rgb_phos …) for the effects shader: the shader
// tests styles by name, so adding or reordering styles in FX_DEFS can't shift the ones after them
const ONES12 = new Float32Array(12).fill(1);
const FXS = Object.fromEntries(FX_DEFS.map(d => [d.id, Object.fromEntries(d.styles.map((s, i) => [s[0], i]))]));
const FX_GLSL = Object.entries(FXS).flatMap(([id, st]) => Object.entries(st).map(([k, i]) => `#define S_${id}_${k} ${i}.0`)).join('\n') + '\n#define IS(v, s) (abs((v) - (s)) < 0.5)\n#define HAS(v, s) (mod(floor((v) / exp2(s) + 0.001), 2.0) > 0.5)';   // HAS: CRT's styles are a bit mask (several at once)
// effect presets: nine slots on the numpad while Caps Lock is on, each a stored mix of effects ({ effect index: { amt, rate, style } })
// played together with the slot's own mode / length / amount. Index 12–20 in the shared selection / state arrays.
const FXP_KEYS = Array.from({ length: 9 }, (_, i) => 'Numpad' + (i + 1)), FXP_LABELS = FXP_KEYS.map((_, i) => 'Num ' + (i + 1));
let capsOn = false;                                   // Caps Lock: the numpad plays effect presets instead of scenes
function setCaps(on){ if (on === capsOn) return; capsOn = on; $('#scenes').classList.toggle('fxmode', on); $('#fxPre').classList.toggle('armed', on); $('#capsTag').hidden = !on; $('#npTag').hidden = on; }
['keydown', 'keyup', 'pointerdown', 'pointermove'].forEach(t => addEventListener(t, e => { if (e.getModifierState) setCaps(e.getModifierState('CapsLock')); }, true));
const fxPreDefaults = () => userDef.fxPre ? JSON.parse(JSON.stringify(userDef.fxPre)) : FXP_KEYS.map(() => ({ mode: 'hold', amt: 1, att: 0, dec: 0, sus: 1, len: 0, rel: FX_REL, fx: {} }));
let fxCfg = fxDefaults(), fxPre = fxPreDefaults(), selFx = 0;
const NFX = FX_DEFS.length;
const fxSt = [...FX_DEFS, ...FXP_KEYS].map(() => ({ held: false, on: false, b0: -1e9, rel: -1e9 }));
const fxConf = i => i < NFX ? fxCfg[i] : fxPre[i - NFX];
// effect state: the editor's own, or (in Prep) the copy the output keeps playing
const fxLive = () => ({ cfg: fxCfg, pre: fxPre, st: fxSt });
// envelope: Attack rises to full, Decay falls to Sustain; a Hit stays there for Gate, Hold / Latch while on; then Release
function fxAD(C, t){
  const a = C.att || 0, dc = C.dec || 0, s = C.sus ?? 1;
  if (t < 0) return 0; if (t < a) return t / a;
  const u = t - a; return u < dc ? 1 - (1 - s) * (u / dc) : s;
}
function fxLevel(i, b, X = null){
  const C = X ? (i < NFX ? X.cfg[i] : X.pre[i - NFX]) : fxConf(i), S = (X ? X.st : fxSt)[i];
  const rel = C.rel ?? fxRelDef(C.mode);
  if ((!X || X.st === fxSt) && fxPrev && fxPrev.i === i && !fxNoPrev) return Math.max(fxPrevLevel(i, C, b), fxLevelRaw(C, S, b, rel));
  return fxLevelRaw(C, S, b, rel);
}
function fxLevelRaw(C, S, b, rel){
  if (C.mode === 'hit'){
    const t = b - S.b0; if (t < 0) return 0;
    const top = (C.att || 0) + (C.dec || 0) + (C.len || 0); if (t < top) return fxAD(C, t);
    const from = fxAD(C, top), x = rel > 0 ? (t - top) / rel : 1; return x < 1 ? from * (1 - x) * (1 - x) : 0; }
  if (C.mode === 'hold' ? S.held : S.on) return fxAD(C, b - (S.t0 ?? -1e9));
  const from = fxAD(C, (S.rel ?? b) - (S.t0 ?? -1e9)), x = rel > 0 ? (b - S.rel) / rel : 1; return x >= 0 && x < 1 ? from * (1 - x) : 0;
}
// with Snap on, a Hit waits for the next beat / bar (a hit just after one counts as on it); Hold and Latch are instant
// beats per snap step; 0 when Snap is off or a MIDI clock is stopped (nothing to wait for)
const snapUnit = () => (clock.src === 'midi' && !clock.midiRunning) ? 0 : snapMode === 'bar' ? 4 : snapMode === 'beat' ? 1 : 0;
// where a hit at beat b lands: on the step just passed (within the grace), else on the next one
// the downbeat for Prep's go-live and leaving BRB, whatever Snap is set to (none to wait for with a stopped MIDI clock)
function barBeat(b){
  if (clock.src === 'midi' && !clock.midiRunning) return b;
  const prev = Math.floor(b / 4 + 1e-9) * 4;
  return b - prev <= 4 * SNAP_GRACE ? prev : prev + 4;
}
function snapBeat(b){
  const unit = snapUnit();
  if (!unit) return b;
  const prev = Math.floor(b / unit + 1e-9) * unit;
  return b - prev <= unit * SNAP_GRACE ? prev : prev + unit;
}
// an effect played from its key or MIDI; with Trig Follow on, the editor opens it too
let fxFollow = Prefs.get('vjif-fxfollow') === '1';
function fxPlay(i){ fxDown(i); if (fxFollow && selFx !== i) selectFx(i); }
function fxDown(i){
  const C = fxConf(i), S = fxSt[i], b = clock.beat;
  if (C.mode === 'hit') S.b0 = snapBeat(b);
  else if (C.mode === 'hold'){ S.held = true; S.t0 = b; }
  else { S.on = !S.on; if (!S.on){ S.rel = b; return; } S.t0 = b; }
  // (playing an effect from its key or MIDI leaves the editor on what you were editing, unless Trig Follow: see fxPlay)
}
function fxUp(i){ const S = fxSt[i]; if (S.held){ S.held = false; S.rel = clock.beat; } }
function selectFx(i){ selFx = i; syncFxUI(); }
const fxRand = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
// Each effect plays on a target: the whole output ('out') or one layer (0–3). Per target, an effect's strength is the
// strongest of its own key and the presets playing it on that target (whose rate and style then count).
const FX_TARGETS = ['out', 0, 1, 2, 3];
const tgtKey = t => t === 'out' || t === undefined || t === null ? 'out' : +t;
// an effect's target: 'out' (the whole output, after the layers are blended), one layer (0–3), or several layers
// ([0, 2]: each of them gets the effect on its own, before blending)
const tgtList = t => Array.isArray(t) ? t : [tgtKey(t)];
const tgtLabel = t => { const L = tgtList(t); return L[0] === 'out' ? '' : 'L' + L.map(i => i + 1).join('+'); };
// All and the layer buttons are two separate modes: All on (no layer lit), or All off and a set of layers.
// All: from a set of layers → All (the set is remembered); All again → that set back
const tgtPrev = new WeakMap();
function allToggle(C){
  if (tgtList(C.target)[0] !== 'out'){ tgtPrev.set(C, C.target); C.target = 'out'; }
  else if (tgtPrev.has(C)){ C.target = tgtPrev.get(C); tgtPrev.delete(C); }
}
function tgtToggle(t, li, solo){               // a click on a layer button: in / out of the set (right-click: that layer alone)
  if (solo || tgtList(t)[0] === 'out') return li;    // from All: the set starts with this layer
  const S = new Set(tgtList(t));
  S.has(li) ? S.delete(li) : S.add(li);
  if (!S.size) return 'out';                         // the last layer taken out: back to All
  const L = [...S].sort(); return L.length === 1 ? L[0] : L;   // all four is still "each layer", which isn't the same as All (the blended picture)
}
// 0.94 (ID-185): an effect setting's own LFO (C.mod.amt / rate / size: { on, shape, per, lo, hi }); Rate and Size swing over
// their slider steps (FX_RATES / FX_SIZES indices), Amount over its value
const fxModV = (M, b) => M.lo + (M.hi - M.lo) * lfoShape({ shape: M.shape || 'sine', sk: M.sk ?? 0.5, inv: !!M.inv }, lfoPosT({ per: M.per || 4, ph: M.ph || 0, gap: M.gap || 0 }, b), 7);   // (0.99: Phase, Skew, Invert, Gap as the GIF LFOs)
const fxMod = (C, k, b) => C && C.mod && C.mod[k] && C.mod[k].on ? fxModV(C.mod[k], b) : null;
const modAmt = (C, b) => { const v = fxMod(C, 'amt', b); return v === null ? C.amt : clamp(v, 0.05, 1); };
const modRate = (C, b) => { const v = fxMod(C, 'rate', b); return v === null ? C.rate : FX_RATES[clamp(Math.round(v), 0, FX_RATES.length - 1)][0]; };
const modSize = (C, b, def) => { const v = fxMod(C, 'size', b); return v === null ? (C.size || def) : FX_SIZES[clamp(Math.round(v), 0, FX_SIZES.length - 1)][0]; };
// ---- a GIF's own effects (0.97, ID-223): GIF › FX. g.gfx = { [effect id]: { on, amt, style } }, run on that GIF alone ----
const GFX_IDS = ['colour', 'poster', 'pixel', 'wobble', 'glitch', 'codec', 'rgb'];
const GFX_STYLES = id => FX_DEFS[FXI[id]].styles.filter(s => !(id === 'colour' && s[0] === 'pal'));   // (Display has its own Palette)
var gfxReady = true;   // (ui-gif runs before this file: it waits for this)
const gfxOn = g => !!(g && g.gfx && GFX_IDS.some(id => g.gfx[id] && g.gfx[id].on && g.gfx[id].amt > 0));
function gfxU(g, b){
  const n = FX_DEFS.length, z = v => FX_DEFS.map(() => v), F = fxFactory();
  const M = { lv: z(0), env: z(0), amt: z(1), rate: F.map(c => c.rate), style: FX_DEFS.map(d => d.styles[0][0]), size: FX_DEFS.map(d => d.sizeDef || 64), pal: z(0), kz: z(1), fbk: z(0.7), vdrop: z(1), dith: z(0), dpat: z(0), dots: z(0), ovs: z(0), pamt: [], abase: z(1) };
  for (const id of GFX_IDS){ const e = g.gfx[id], i = FXI[id]; if (!e || !e.on || !(e.amt > 0)) continue;
    M.lv[i] = e.amt; M.env[i] = 1; M.amt[i] = e.amt; if (e.style) M.style[i] = e.style; if (e.size) M.size[i] = e.size; if (e.rate) M.rate[i] = e.rate; }
  return fxU(b, M);
}
function fxMix(b, X = fxLive()){
  const mk = () => ({ lv: FX_DEFS.map(() => 0), env: FX_DEFS.map(() => 0), amt: X.cfg.map(c => modAmt(c, b)), rate: X.cfg.map(c => modRate(c, b)), style: X.cfg.map(c => c.style), size: X.cfg.map((c, i) => modSize(c, b, FX_DEFS[i].sizeDef || 64)), pal: X.cfg.map(c => c.pal || 0), kz: X.cfg.map(c => c.kz || 1), fbk: X.cfg.map(c => c.fbk ?? 0.7), vdrop: X.cfg.map(c => c.vdrop ?? 1), dith: X.cfg.map(c => c.dith || 0), dpat: X.cfg.map(c => c.dpat ?? 0), ovs: X.cfg.map(c => c.ovs ?? 1), dots: X.cfg.map(c => c.dots || 0), pamt: X.cfg.map(c => c.pamt || null), abase: X.cfg.map(c => c.amt) });
  const M = new Map(FX_TARGETS.map(t => [t, mk()]));
  FX_DEFS.forEach((d, i) => { const C = X.cfg[i], l = fxLevel(i, b, X), v = l * modAmt(C, b); if (v > 0){ for (const k of tgtList(C.target)){ const m = M.get(k); m.lv[i] = v; m.env[i] = l; } } });
  X.pre.forEach((P, k) => {
    const l = fxLevel(NFX + k, b, X) * P.amt; if (!(l > 0)) return;
    for (const [i, e] of Object.entries(P.fx)){
      const v = l * modAmt(e, b);
      for (const k of tgtList(e.target)){ const m = M.get(k);
      if (v > m.lv[i]){ m.lv[i] = v; m.env[i] = l; m.amt[i] = modAmt(e, b); m.abase[i] = e.amt; m.rate[i] = modRate(e, b); if (e.style) m.style[i] = e.style; if (e.size || fxMod(e, 'size', b) !== null) m.size[i] = modSize(e, b, m.size[i]); if (e.pal != null) m.pal[i] = e.pal; if (e.kz) m.kz[i] = e.kz; if (e.fbk != null) m.fbk[i] = e.fbk; if (e.vdrop != null) m.vdrop[i] = e.vdrop; if (e.dith != null) m.dith[i] = e.dith; if (e.dpat != null) m.dpat[i] = e.dpat; if (e.ovs != null) m.ovs[i] = e.ovs; if (e.pamt) m.pamt[i] = e.pamt; if (e.dots != null) m.dots[i] = e.dots; } }
    }
  });
  return M;
}
// one target's shader settings; null when nothing plays on it
const FX_U_IDX = ['colour', 'strobe', 'poster', 'zoom', 'shake', 'wobble', 'mirror', 'glitch', 'rgb', 'pixel', 'feedback', 'codec'].map(k => FXI[k]);
function fxU(b, { lv, env, amt, rate, style, size, pal, kz, fbk, vdrop, dith, dpat, dots, ovs, pamt, abase }){
  if (!lv.some(v => v > 0.001)) return null;
  const S = i => styleIdx(i, style[i]), nm = i => FX_DEFS[i].styles[S(i)][0], st = i => Math.floor(b / rate[i]);
  const [CO, ST, PO, ZO, SH, WO, MI, GL, CR, PX, FB, CD] = FX_U_IDX, dg = nm(ST) === 'degauss';
  const U = { colr: lv[CO], colrS: S(CO), hue: b / (rate[CO] * 16) * Math.PI * 2,
    strobe: dg ? 0 : lv[ST] * ((b / rate[ST]) % 1 < 0.5 ? 1 : 0), strobeS: S(ST), dgs: dg ? Math.min(1, lv[ST]) : 0, poster: lv[PO], posterS: S(PO),   // (Strobe › Degauss: no beat gate, a swell)
    zoom: nm(ZO) === 'in' ? lv[ZO] * 0.5 : nm(ZO) === 'out' ? lv[ZO] * -0.3 : 0, zoomE: nm(ZO) === 'eachin' ? lv[ZO] * 0.5 : nm(ZO) === 'eachout' ? lv[ZO] * -0.3 : 0,   // Each: done per GIF in render()
    wob: lv[WO], wobS: S(WO), wobPh: b / rate[WO] * Math.PI * 2,
    mirror: nm(MI) === 'kal' ? env[MI] : lv[MI], mirS: S(MI), mirN: kalSlices(amt[MI]),   // kaleido: Amount = how many slices
    glitch: lv[GL], glS: styleMask(GL, style[GL]), gseed: st(GL) * 7.13 % 100, glSz: size[GL], rgb: lv[CR], rgbS: styleMask(CR, style[CR]), crtSz: size[CR], codec: lv[CD], cdS: styleMask(CD, style[CD]), cseed: st(CD) * 7.13 % 100, cdSz: size[CD],
    pixel: lv[PX], pixS: S(PX), pixSize: size[PX], fb: lv[FB], fbS: S(FB), time: performance.now() / 1000 % 1000, palI: pal ? pal[CO] : 0, palD: dith ? dith[CO] : 0, palP: palGB(pal ? pal[CO] : 0) ? 1 : dpat ? dpat[CO] : 0, palLum: palGB(pal ? pal[CO] : 0) ? 1 : 0, palDot: dots && dots[CO] && lv[CO] > 0.001 && nm(CO) === 'pal' && palGB(pal ? pal[CO] : 0) ? lcdDot() * (dots[CO] >= 2 ? 1 : -1) : 0, mirZ: kz ? kz[MI] : 1, fbK: fbk ? fbk[FB] : 0.7, vDrop: vdrop ? vdrop[CR] : 1, beat: b % 100000 };
  if (U.colrS === FXS.colour.pal) U.colr = env[CO];   // a palette follows the envelope, not Amount (Amount picks the palette): Attack / Release dissolve it in and out pixel by pixel
  const jit = nm(SH) === 'jitter', sk = Math.floor(b / (rate[SH] * (jit ? 0.5 : 1))), s = lv[SH] * (jit ? 0.35 : 1);
  U.shake = [(fxRand(sk) - 0.5) * 0.08 * s, (fxRand(sk + 0.37) - 0.5) * 0.08 * s, (fxRand(sk + 0.71) - 0.5) * 0.1 * s]; U.shakeZ = (ovs && ovs[SH] === 0 ? 0 : 0.22) * s; U.wobZ = (ovs && ovs[WO] === 0 ? 0 : (S(WO) === 0 ? 0.04 : 0.026)) * lv[WO];
  const parts = (i, id) => { const f = new Float32Array(12).fill(1), P = pamt && pamt[i], a = (abase && abase[i]) || amt[i] || 1; if (P) for (const k in P){ const ix = FXS[id][k]; if (ix != null) f[ix] = P[k] / a; } return f; };
  // (0.99.4: a stacked style's share is of the Amount as set, so an Amount LFO moves the stacked styles too; it used to divide itself out)
  U.glA = parts(GL, 'glitch'); U.rgA = parts(CR, 'rgb'); U.cdA = parts(CD, 'codec');   // a stacked style's own Amount (0.92), as a share of the effect's   // Wobble › Edges: its largest push (0.018 of the width for Wave, 0.012 for Ripple) kept inside the frame   // Overscan: off · some · full (enough for the biggest jolt and tilt)
  return U;
}
// this frame's settings for every target: { out: U | null, layers: [U | null ×4], any }
function fxFrame(b, X){
  const XX = X || fxLive();                          // nothing playing (the usual case): no mixes built, nothing allocated
  if (!FX_DEFS.some((d, i) => fxLevel(i, b, XX) * XX.cfg[i].amt > 0) && !XX.pre.some((P, k) => Object.keys(P.fx).length && fxLevel(NFX + k, b, XX) * P.amt > 0)) return NOFX;
  const M = fxMix(b, XX), out = fxU(b, M.get('out')), layers = [0, 1, 2, 3].map(t => fxU(b, M.get(t)));
  return { out, layers, any: !!out || layers.some(Boolean) };
}
const NO_LAYER_FX = [null, null, null, null];
// Effect-history slots of the GPU pass (each keeps its own Feedback / Phosphor trail): the output, its layers (+0…3),
// the scene being left during a transition (its layers, then the whole), and Prep's preview of the scene being edited.
const SLOT = { OUT: 0, LAYERS: 1, LEAVING_LAYERS: 5, PREP_LAYERS: 10, PREP_OUT: 14, ARRIVING_OUT: 14, LEAVING_OUT: 15, PV_LAYERS: 30, PV_OUT: 34 };   // PV: the editor's preview-only picture (0.95)   // going live ends Prep: the arriving scene carries on its preview's trail
const zoomEOf = U => U && U.zoomE || 0;
// ---- blackout (0, held) and freeze (Ins, held): applied to whatever is on the output, effects included ----
const live = { black: 0, blackOn: false, blackT: 0, freeze: false, freezeReq: false };
const BLACK_OPTS = [0, 60, 120, 250, 500, 1000, 2000];   // Settings › Interface › Blackout: the fade to black and back (ms)
let BLACK_MS = BLACK_OPTS.includes(+Prefs.get('vjif-blackms', 120)) ? +Prefs.get('vjif-blackms', 120) : 120;
function blackLevel(now){ const x = BLACK_MS > 0 ? Math.min(1, (now - live.blackT) / BLACK_MS) : 1; return live.blackOn ? Math.max(live.black0, x) : (1 - x) * live.black0; }
function setBlack(on){ const now = performance.now(); live.black0 = blackLevel(now); live.blackOn = on; live.blackT = now; }
live.black0 = 0; live.blackT = -1e9;
const freezeCv = mkCanvas(), freezeCtx = freezeCv.getContext('2d');
function setFreeze(on){ if (on && !live.freeze){ live.freezeReq = true; redraw.all = true; } if (!on){ live.freeze = false; live.freezeReq = false; redraw.all = true; } updLiveTag(); }
function updLiveTag(){ const t = $('#liveTag'); if (!t) return; const b = live.blackOn, f = live.freeze || live.freezeReq; t.textContent = b && f ? 'BLACK · FREEZE' : b ? 'BLACKOUT' : f ? 'FREEZE' : ''; t.hidden = !b && !f; }
// Made by makePost(); if the graphics driver resets (a lost WebGL context), effects and the Luma transition pass the
// picture through untouched until the context comes back, then everything is rebuilt.
let post = makePost();
function makePost(){
  try {
    const cv = new OffscreenCanvas(CW, CH);
    // alpha kept (straight, not premultiplied) so a layer's transparent parts stay transparent
    const gl = cv.getContext('webgl', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false });
    if (!gl) return null;
    let lost = false;
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; redraw.all = true; });
    cv.addEventListener('webglcontextrestored', () => { const p = makePost(); if (p){ post = p; redraw.all = true; } });
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x + 1.0, 1.0 - p.y) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }`));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision highp float;
${FX_GLSL}
      uniform sampler2D tex, prev; uniform vec2 res; uniform float blit, fbInit, time, beat;
      uniform float colr, colrS, hue, strobe, strobeS, poster, posterS, zoom, wob, wobS, wobPh, mirror, mirS, mirN, mirZ, palD, palP, palDot, palLum,
                    glitch, glS, gseed, glSz, codec, cdS, cseed, cdSz, dgs, rgb, rgbS, crtSz, pixel, pixS, pixSize, fb, fbS, fbK, vDrop, shakeZ, wobZ;
      uniform float glA[12], rgA[12], cdA[12];   // Glitch / CRT: each stacked style's own Amount, as a share of the effect's (0.92)
      uniform vec3 shake; uniform vec3 pal[64], palOk[64]; uniform float palN; varying vec2 uv;
      ${OKLAB_GLSL}
      float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
      float h2(vec2 v){ return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
      float bay2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }        // ordered (Bayer) dither thresholds
      float bay8(vec2 a){ return bay2(0.25 * a) * 0.0625 + bay2(0.5 * a) * 0.25 + bay2(a); }
      vec2 A(){ return vec2(res.x / res.y, 1.0); }
      vec2 geo(vec2 p){                              // zoom, shake, wobble, pixelate: where to read the frame from
        vec2 a = A(), d = (p - 0.5) * a;
        d /= (1.0 + zoom) * (1.0 + shakeZ) * (1.0 + wobZ);
        float c = cos(shake.z), s = sin(shake.z); d = mat2(c, s, -s, c) * d + shake.xy;
        p = d / a + 0.5;
        if (wob > 0.001){
          if (IS(wobS, S_wobble_wave)){ p.x += sin(p.y * 14.0 + wobPh) * 0.018 * wob; p.y += sin(p.x * 10.0 + wobPh * 1.3) * 0.012 * wob; }
          else { vec2 q = (p - 0.5) * a; float r = length(q); p += q / max(r, 1e-4) / a * sin(r * 40.0 - wobPh) * 0.012 * wob; }
        }
        if (abs(palDot) > 0.5){ vec2 cell = res / abs(palDot); p = (floor(p * cell) + 0.5) / cell; }   // Palette › LCD: Game Boy pixels (144 rows), one colour each (negative: no gaps)
        if (pixel > 0.001){ float n = res.x / mix(1.0, pixSize, pixel); vec2 cell = vec2(n, n * res.y / res.x); if (IS(pixS, S_pixel_wide)) cell.x *= 0.25; p = (floor(p * cell) + 0.5) / cell; }   // blocks of pixSize output pixels at full amount
        return p;
      }
      // VHS tracking bands roll on the beat, at random: the wide one sweeps down over 2 beats (in 7 of 10 pairs, at its own
      // speed), the thin one over 1 beat (every other beat or so, from its own start). Off-screen (-9) when not rolling
      float vhsB1(){ float k = floor(beat * 0.5), f = fract(beat * 0.5); return h1(k * 3.1 + 0.7) < 0.7 ? -0.15 + f * (1.05 + 0.5 * h1(k * 5.3 + 1.9)) : -9.0; }
      float vhsB2(){ float n = floor(beat), f = fract(beat); return h1(n * 2.3 + 4.1) < 0.5 ? -0.15 + 0.3 * h1(n * 7.7 + 0.3) + f * 1.2 : -9.0; }
      float vhsBand(float y){                       // VHS: how far inside one of the two tracking bands rolling down this line is (0 outside)
        float b1 = vhsB1(), b2 = vhsB2();
        return max(max(0.0, 1.0 - abs(y - b1) / 0.11), max(0.0, 1.0 - abs(y - b2) / 0.035));
      }
      vec2 vhsEdges(float y){                       // VHS: x = the colour trailing below the wide band (1 at its edge, fading), y = the thin magenta fringe above it
        float b1 = vhsB1(), d = y - (b1 + 0.11), u = (b1 - 0.11) - y;
        return vec2(d > 0.0 ? max(0.0, 1.0 - d / 0.14) : 0.0, step(0.0, u) * step(u, 0.008));
      }
      bool offs(vec2 p){ return p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0; }
      vec3 raw(vec2 p){ return offs(p) ? vec3(0.0) : texture2D(tex, p).rgb; }
      vec4 samp(vec2 p, float split){
        if (offs(p)) return vec4(0.0);
        vec2 o = vec2(split, 0.0);
        vec4 m = texture2D(tex, p), r = texture2D(tex, p + o), b = texture2D(tex, p - o);
        return vec4(r.r, m.g, b.b, max(m.a, max(r.a, b.a) * step(0.0001, split)));
      }
      vec2 fold(vec2 p){
        if (IS(mirS, S_mirror_bt)) return vec2(p.x, p.y > 0.5 ? p.y : 1.0 - p.y);
        if (IS(mirS, S_mirror_rl)) return vec2(p.x > 0.5 ? p.x : 1.0 - p.x, p.y);
        if (IS(mirS, S_mirror_lr)) return vec2(p.x < 0.5 ? p.x : 1.0 - p.x, p.y);
        if (IS(mirS, S_mirror_tb)) return vec2(p.x, p.y < 0.5 ? p.y : 1.0 - p.y);
        if (IS(mirS, S_mirror_quad)) return vec2(p.x < 0.5 ? p.x : 1.0 - p.x, p.y < 0.5 ? p.y : 1.0 - p.y);
        vec2 a = A(), d = (p - 0.5) * a / max(mirZ, 1.0); float r = length(d), seg = 6.2831853 / max(mirN, 2.0), an = mod(atan(d.y, d.x) + time * 0.1, seg);
        an = abs(an - seg * 0.5);
        return vec2(cos(an), sin(an)) * r / a + 0.5;
      }
      float bayer2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
      float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
      ${PALSNAP_GLSL}
      vec3 palSnap(vec3 c){ return palPick(c, palD, palP, floor(gl_FragCoord.xy / (abs(palDot) > 0.5 ? abs(palDot) : max(1.0, floor(res.y / 360.0))))); }   // dither cells: chunky dots at any output size (the Game Boy's LCD: one cell per screen pixel)
      vec3 hueRot(vec3 c, float an){                 // rotate the hue in YIQ space
        vec3 y = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312) * c;
        float cs = cos(an), sn = sin(an); y.yz = vec2(y.y * cs - y.z * sn, y.y * sn + y.z * cs);
        return mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703) * y;
      }
      vec3 look(vec3 c){                              // the picture's own look: Mono, then Colour (flip / cycle / invert / palette)
        float y = dot(c, vec3(0.299, 0.587, 0.114));
        if (colr > 0.001){ if (IS(colrS, S_colour_pal)){ if (bayer4(gl_FragCoord.xy / max(1.0, floor(res.y / 360.0)) + 7.0) < colr * 1.0001) c = palSnap(c);   // palette: pixels switch over in a dither pattern as the envelope rises / falls (no muddy mix)
            if (palDot > 0.5){ vec2 f = mod(gl_FragCoord.xy, palDot); float gw = max(1.0, floor(palDot * 0.14 + 0.5));   // Dot Matrix (0.89, after the DMG's LCD): thin gaps between the dots
              vec3 bg = pal[0]; float by = -1.0; for (int i = 0; i < 64; i++){ if (float(i) >= palN) break; float y = dot(pal[i], vec3(0.299, 0.587, 0.114)); if (y > by){ by = y; bg = pal[i]; } }
              // the gap shows the reflective backing (the palette's lightest colour) with this dot's shadow on it: the liquid crystal
              // sits above the reflector, so each dark dot casts a faint copy down and to the right
              if (f.x > palDot - gw || f.y < gw) c = mix(c, mix(bg, c, 0.45), 0.8 * colr);   // (the gaps a touch quieter: a grid, not a tartan)
              // the backing's fine grain (about ±4 %), seen in the light areas, lost in the dark ones
              float gr = fract(sin(dot(floor(gl_FragCoord.xy / max(1.0, floor(palDot * 0.4))), vec2(12.9898, 78.233))) * 43758.5453);
              c *= 1.0 + (gr - 0.5) * 0.08 * dot(c, vec3(0.299, 0.587, 0.114)) * colr; } }
          else c = mix(c, clamp(IS(colrS, S_colour_invert) ? 1.0 - c : hueRot(c, IS(colrS, S_colour_flip) ? 3.14159 : hue), 0.0, 1.0), colr); }   // flip · cycle · invert
        return c;
      }
      void main(){
        if (blit > 0.5){ gl_FragColor = texture2D(tex, vec2(uv.x, 1.0 - uv.y)); return; }
        vec2 p = uv, a = A();
        float split = rgb > 0.001 ? rgb * max(max(HAS(rgbS, S_rgb_split) ? 0.025 * rgA[int(S_rgb_split)] : 0.0, HAS(rgbS, S_rgb_vhs) ? 0.006 * rgA[int(S_rgb_vhs)] : 0.0), max(HAS(rgbS, S_rgb_scan) ? 0.0015 * rgA[int(S_rgb_scan)] : 0.0, HAS(rgbS, S_rgb_phos) ? 0.002 * rgA[int(S_rgb_phos)] : 0.0)) : 0.0;   // stacked styles: the widest colour split
        float payU = 1.0;                              // pay-TV: where this pixel falls across the line (0 = the blanking bar's edge)
        if (rgb > 0.001 && HAS(rgbS, S_rgb_crypt)){ float rq = min(1.0, rgb * rgA[int(S_rgb_crypt)]);              // crypt: lines shuffled within blocks of 32 (Nagravision Syster), then each cut at a random point and its halves swapped (Videocrypt)
          float lh = max(crtSz, 1.0) / res.y, line = floor(p.y / lh), key = floor(time * 4.0);
          if (h1(line * 0.37 + key * 1.91) < rq){
            float blk = floor(line / 32.0), idx = mod(line, 32.0), k = 1.0 + 2.0 * floor(h1(blk + key * 1.3) * 16.0), off = floor(h1(blk * 2.1 + key) * 32.0);
            p.y = min((blk * 32.0 + mod(idx * k + off, 32.0) + 0.5) * lh, 1.0 - lh * 0.5);   // odd k: a different line for every line of the block
            p.x = fract(p.x + h1(line * 1.7 + key * 3.1)); } }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_paytv)){ float rq = min(1.0, rgb * rgA[int(S_rgb_paytv)]); // pay-TV, cable-box style (sync suppressed): no horizontal sync, so every line starts late by an amount
          float y = p.y, t = time;                    // that wobbles down the picture; the picture wraps, the blanking bar shows inside it and bends
          float off = rq * (0.24 + 0.15 * sin(y * 3.2 + t * 0.9) + 0.035 * sin(y * 9.0 - t * 1.7) + 0.005 * sin(y * 61.0 + t * 11.0));
          p.y = fract(p.y + fract(t * 0.031) * rq * 0.6);   // and the vertical hold drifts
          payU = fract(p.x + off); p.x = payU; }
        if (dgs > 0.001){ float gq = dgs; // degauss: the picture ripples
          p += vec2(sin(p.y * 18.0 + time * 35.0), cos(p.x * 14.0 + time * 29.0)) * 0.006 * gq; split += 0.008 * gq; }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_vhs)){ float rq = min(1.0, rgb * rgA[int(S_rgb_vhs)]); // VHS tracking: a gentle sway and a torn band rolling down; with Wear: more of the tape's faults
          float fr = floor(time * 30.0), ln = floor(p.y * res.y / 2.0), w = rq;   // Amount is the wear
          p.x += sin(p.y * 30.0 + time * 6.0) * 0.0015 * rq;
          float ty = fract(time * 0.23); if (abs(p.y - ty) < 0.025) p.x += (h1(floor(p.y * 200.0) + fr) - 0.5) * 0.03 * rq;
          float bq = vhsBand(p.y); p.x += ((h1(ln * 0.7 + fr) - 0.5) * 0.22 + 0.035) * bq * w;   // tracking lost: bands torn hard sideways
          if (p.y < 0.09) p.x += pow(1.0 - p.y / 0.09, 2.0) * 0.03 * sin(time * 3.0) * w;          // flagging: the top of the picture bends
          if (p.y > 0.955) p.x += (0.015 + h1(ln * 0.9 + fr) * 0.03) * w;                         // head-switching noise along the bottom
          p.y += step(0.94, h1(floor(time * 6.0) + 0.3)) * 0.006 * w;                               // now and then the picture hops
        }
        if (glitch > 0.001){
          if (HAS(glS, S_glitch_slices)){ float gq = min(1.0, glitch * glA[int(S_glitch_slices)]); float nb = res.y / max(glSz, 2.0), band = floor(p.y * nb + h1(gseed) * nb), g = 0.0;
            if (h1(band + gseed) < gq * 0.55) g = (h1(band * 1.7 + gseed) - 0.5) * 0.25 * gq;
            split += abs(g) * 0.3 + gq * 0.004; p.x += g; }
          if (HAS(glS, S_glitch_blocks)){ float gq = min(1.0, glitch * glA[int(S_glitch_blocks)]); vec2 cell = floor(p * res / max(glSz, 2.0));
            if (h2(cell + gseed) < gq * 0.45){ p += (vec2(h2(cell * 1.3 + gseed), h2(cell * 2.1 + gseed)) - 0.5) * 0.15 * gq; split += 0.01 * gq; } }
          if (HAS(glS, S_glitch_melt)){ float gq = min(1.0, glitch * glA[int(S_glitch_melt)]); float col = floor(p.x * res.x / max(glSz * 0.5, 2.0)); p.y = max(0.0, p.y - h1(col * 3.7) * 0.35 * gq * smoothstep(0.0, 1.0, p.y + 0.3)); }
        }
        vec4 c4 = samp(geo(p), split);
        if (mirror > 0.001) c4 = mix(c4, samp(geo(fold(p)), split), mirror);
        vec3 c = c4.rgb; float al = c4.a;
        if (poster > 0.001){
          if (IS(posterS, S_poster_bands)){ float lv = mix(24.0, 2.0, poster); c = floor(c * lv + 0.5) / lv; }
          else { vec2 t = 1.5 / res, q = geo(p); vec3 w = vec3(0.333);
            float e = length(vec2(dot(raw(q + vec2(t.x, 0.0)), w) - dot(raw(q - vec2(t.x, 0.0)), w), dot(raw(q + vec2(0.0, t.y)), w) - dot(raw(q - vec2(0.0, t.y)), w))) * 4.0;
            vec3 neon = c / max(max(c.r, max(c.g, c.b)), 0.15) * smoothstep(0.05, 0.5, e);
            c = mix(c, neon, poster); }
        }
        // the picture's own look (mono, colour, palette) comes before the screen it's shown on (CRT): a palette or mono
        // scene still gets VHS noise, scanlines and phosphor glow on top
        if (split > 0.001 && colr > 0.001){   // colour split: each channel is taken from its own (shifted) picture
          vec2 q = geo(p), o = vec2(split, 0.0);                  // after the look, so a palette / mono picture splits into its own colours
          vec3 lr = look(raw(q + o)), lb = look(raw(q - o)); c = look(c); c = vec3(lr.r, c.g, lb.b);   // (instead of the split's fringes being snapped back)
        } else c = look(c);
        if (rgb > 0.001 && HAS(rgbS, S_rgb_scan)){ float rq = min(1.0, rgb * rgA[int(S_rgb_scan)]); // scanlines + aperture grille
          float ln = 0.5 + 0.5 * cos(gl_FragCoord.y * 6.2831853 / max(crtSz, 2.0));   // a dark line every Size px
          float col = mod(floor(gl_FragCoord.x), 3.0); vec3 tri = vec3(col < 0.5 ? 1.0 : 0.7, col > 0.5 && col < 1.5 ? 1.0 : 0.7, col > 1.5 ? 1.0 : 0.7);
          c = c * mix(vec3(1.0), tri * (0.55 + 0.45 * ln), rq) * (1.0 + 0.25 * rq); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_phos)){ float rq = min(1.0, rgb * rgA[int(S_rgb_phos)]); // phosphor: bright parts bloom and linger
          vec2 q = geo(p), t = vec2(5.0) / res; vec3 bl = vec3(0.0);
          for (int i = 0; i < 8; i++){ float an = float(i) * 0.785398; bl += raw(q + vec2(cos(an), sin(an)) * t * 1.6) + raw(q + vec2(cos(an), sin(an)) * t * 3.4); }
          bl = look(bl / 16.0); c += max(bl - 0.35, 0.0) * 1.6 * rq;
          vec4 pv = texture2D(prev, vec2(uv.x, 1.0 - uv.y)); c = max(c, pv.rgb * 0.82 * rq); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_crypt)) c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * 0.85 + 0.06, 0.45 * (rgb * rgA[int(S_rgb_crypt)]));   // crypt: colour lost, the black level lifted
        if (rgb > 0.001 && HAS(rgbS, S_rgb_paytv)){ float rq = min(1.0, rgb * rgA[int(S_rgb_paytv)]); // pay-TV picture: a smeared echo, the colour decoded wrong (hue turned round, oversaturated), now and then a negative field
          vec3 gh = look(raw(geo(vec2(fract(p.x - 0.022), p.y))));
          vec3 d = mix(c, gh, 0.38);
          d = clamp(hueRot(d, 3.14159), 0.0, 1.0); float l = dot(d, vec3(0.299, 0.587, 0.114)); d = clamp(mix(vec3(l), d, 1.7), 0.0, 1.0);
          if (h1(floor(time * 3.0) + 0.5) < 0.25) d = 1.0 - d;
          float e = payU / 0.11;                      // the blanking bar: a bright sync edge, dark purple, a pale edge where the picture starts
          if (e < 1.0) d = e < 0.12 ? mix(vec3(0.95, 0.92, 1.0), vec3(0.55, 0.35, 0.75), e / 0.12) : e > 0.88 ? mix(vec3(0.16, 0.05, 0.24), vec3(0.75, 0.62, 0.95), (e - 0.88) / 0.12) : mix(vec3(0.30, 0.12, 0.42), vec3(0.14, 0.04, 0.22), (e - 0.12) / 0.76);
          c = mix(c, d, rq); }
        if (dgs > 0.001){ float gq = dgs; // degauss: rainbow blotches swirling out
          float r = length((uv - 0.5) * a); c = mix(c, clamp(hueRot(c, sin(r * 12.0 - time * 18.0 + sin(uv.x * 7.0) * 2.0) * 3.0), 0.0, 1.0), 0.75 * gq); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_vhs)){ float rq = min(1.0, rgb * rgA[int(S_rgb_vhs)]); // VHS picture: washed colour, scanlines, noise; with Wear: colour bleeding right, dropouts
          float w = rq, fr = floor(time * 30.0), ln = floor(uv.y * res.y / 2.0);
          if (w > 0.001){                            // tape keeps colour at a fraction of the picture's sharpness: the colour smears to the right of the shapes
            vec2 q = geo(p), px1 = vec2((1.5 + 2.0 * w) / res.x, 0.0);         // softer as the tape wears
            vec3 lu = (look(raw(q - px1)) + c * 2.0 + look(raw(q + px1))) / 4.0;   // (the neighbours with the picture's look too: a palette doesn't show its original colours through)                // tape's soft picture: brightness a little blurred sideways…
            float kb = min(1.0, w * 20.0);              // the tape's softness is there at any Wear (full from 5 %): Wear adds the faults
            c = mix(c, lu + (c - lu) * 0.6, 0.7 * kb);                             // …with a faint edge ring (the sharpening VCRs added)
            vec3 sm = (raw(q - vec2(0.004, 0.0)) + raw(q - vec2(0.008, 0.0)) + raw(q - vec2(0.012, 0.0)) + raw(q - vec2(0.016, 0.0))) / 4.0;
            float yl = dot(c, vec3(0.299, 0.587, 0.114)); sm = look(sm); vec3 ch = sm - dot(sm, vec3(0.299, 0.587, 0.114));
            c = mix(c, vec3(yl) + ch, 0.8 * kb);                                    // colour at a fraction of the sharpness, smeared to the right
            c += (vec3(h1(ln * 3.7 + fr), h1(ln * 5.1 + fr * 1.7), h1(ln * 2.3 + fr * 0.7)) - 0.5) * 0.06 * w;   // chroma noise, line by line
            float bq = vhsBand(uv.y), seg = h1(ln * 1.3 + fr * 3.1);   // dropouts: where the tape lost its oxide, mostly in the bands
            if (seg < (0.004 + 0.05 * w + 0.3 * bq) * w * vDrop){   // more with Wear (more often, brighter), × Dropouts
              float x0 = h1(ln + fr * 0.3), x1 = x0 + 0.02 + h1(ln * 2.1 + fr) * 0.3;
              float k = smoothstep(x0, x0 + 0.008, uv.x) * (1.0 - smoothstep(x0 + 0.01, x1, uv.x));   // a soft head that trails off
              k *= 0.55 + 0.45 * h1(floor(uv.x * res.x / 3.0) + ln);              // grainy along its length
              c = mix(c, vec3(0.85) + (h2(gl_FragCoord.xy + fr) - 0.5) * 0.3, k * (0.5 + 0.4 * h1(ln + fr)) * (0.45 + 0.55 * w));
            }
            if (uv.y > 0.955) c = mix(c, vec3(h2(gl_FragCoord.xy + fr), h2(gl_FragCoord.xy + fr + 17.3), h2(gl_FragCoord.xy + fr + 41.9)) * 0.7 + h2(gl_FragCoord.xy + fr) * 0.3, 0.5 * w);   // the switching noise is snowy, in colour
            float wb = max(0.0, 1.0 - abs(uv.y - vhsB1()) / 0.11) * smoothstep(0.35, 1.0, w);   // heavy wear: the wide band loses the picture
            if (wb > 0.001){                         // …to a dark band of streaks: white and coloured lines of different lengths
              float seg = floor(uv.x * 24.0), s1 = h1(ln * 4.3 + seg * 13.7 + fr * 1.9), sx = (seg + h1(ln * 7.1 + seg + fr)) / 24.0, sl = 0.004 + h1(ln * 2.9 + seg + fr * 0.5) * 0.03;
              float st = step(0.6, s1) * step(sx, uv.x) * step(uv.x, sx + sl) * (0.6 + 0.4 * h2(gl_FragCoord.xy + fr));   // dense short specks, like the footage
              vec3 sc = mix(vec3(1.0), vec3(h1(ln + 3.0), h1(ln + 7.0), h1(ln + 11.0)), step(0.75, s1));
              c = mix(c, c * 0.25 + sc * st, wb * 0.85);
            }
            vec2 ed = vhsEdges(uv.y); ed.y *= w;
            c = mix(c, c * vec3(0.45, 1.2, 0.5) + vec3(0.0, 0.15, 0.03) * (0.4 + 1.2 * h2(floor(gl_FragCoord.xy / vec2(4.0, 2.0)) + fr)), sqrt(ed.x) * min(1.0, 1.3 * w));   // grainy green   // the colour lock comes back late: a green cast trails below the band
            c = mix(c, vec3(0.8, 0.15, 0.85), ed.y * 0.6);                                 // a magenta line at its top edge
          }
          c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))), 0.25 * rq);
          c *= 1.0 - 0.28 * rq * step(0.5, fract(gl_FragCoord.y / 3.0));
          c += (h2(gl_FragCoord.xy + floor(time * 60.0)) - 0.5) * 0.14 * rq;
        }
        if (codec > 0.001 && HAS(cdS, S_codec_keyfr)){ float gq = min(1.0, codec * cdA[int(S_codec_keyfr)]);   // keyframe lost: the picture as it was (the last frame out) is moved along the live picture's motion,
          // one motion vector per block, found by comparing the two around the block's centre (one step of optical flow): the old picture takes the new one's movement and smears
          float bs = max(cdSz * 0.5, 4.0); vec2 cell = floor(uv * res / bs), cc = (cell + 0.5) * bs / res, e1 = vec2(bs / res.x, 0.0), e2 = vec2(0.0, bs / res.y); vec3 L3 = vec3(0.299, 0.587, 0.114);
          float pl = dot(texture2D(prev, vec2(cc.x, 1.0 - cc.y)).rgb, L3), cl = dot(look(samp(geo(cc), 0.0).rgb), L3);
          vec2 g = vec2(dot(texture2D(prev, vec2(cc.x + e1.x, 1.0 - cc.y)).rgb - texture2D(prev, vec2(cc.x - e1.x, 1.0 - cc.y)).rgb, L3), dot(texture2D(prev, vec2(cc.x, 1.0 - cc.y - e2.y)).rgb - texture2D(prev, vec2(cc.x, 1.0 - cc.y + e2.y)).rgb, L3)) * 0.5;
          vec2 v = clamp((pl - cl) * g / (dot(g, g) + 0.004), -0.6, 0.6) * vec2(e1.x, e2.y) * gq;   // (in blocks, at most 0.6 of one per frame)
          vec4 pv = texture2D(prev, vec2(uv.x - v.x, 1.0 - uv.y + v.y)); float has = step(0.02, pv.a);
          float fresh = step(1.0 - 0.1 * (1.15 - gq), h2(cell + cseed));   // each Rate a few blocks catch up with the live picture
          c = mix(c, pv.rgb, has * (1.0 - fresh)); al = mix(al, pv.a, has * (1.0 - fresh));
        }
        if (codec > 0.001 && HAS(cdS, S_codec_corrupt)){ float gq = min(1.0, codec * cdA[int(S_codec_corrupt)]);   // corrupt (a damaged video file), on a grid of blocks re-keyed every Rate:
          float bs = max(cdSz * 0.5, 4.0); vec2 px = uv * res, cell = floor(px / bs), f = fract(px / bs);
          vec2 run = vec2(floor(cell.x / 6.0 + h1(floor(cell.y / 2.0) * 3.1 + cseed) * 6.0), floor(cell.y / 2.0));   // damage comes in runs along rows (two blocks tall), as a broken file decodes
          float q = h2(run + cseed), r = h2(run * 1.7 + cseed + 3.1);
          if (q < gq * 0.7){                      // moshed, as a duplicated P-frame does: the same motion applied to the stale picture frame after frame, so it streams and swells
            // the motion: the live picture's own (one step of optical flow per block, as Keyframe finds it), amplified, plus a slow field that drifts the same way over
            // neighbouring blocks (an object's motion, not noise); whole pixels per frame like a codec's vectors, so the copy stays sharp and blocks step against each other
            vec2 cc = (cell + 0.5) * bs / res, e1 = vec2(bs / res.x, 0.0), e2 = vec2(0.0, bs / res.y); vec3 L3 = vec3(0.299, 0.587, 0.114);
            float pl = dot(texture2D(prev, vec2(cc.x, 1.0 - cc.y)).rgb, L3), cl = dot(look(samp(geo(cc), 0.0).rgb), L3);
            vec2 g = vec2(dot(texture2D(prev, vec2(cc.x + e1.x, 1.0 - cc.y)).rgb - texture2D(prev, vec2(cc.x - e1.x, 1.0 - cc.y)).rgb, L3), dot(texture2D(prev, vec2(cc.x, 1.0 - cc.y - e2.y)).rgb - texture2D(prev, vec2(cc.x, 1.0 - cc.y + e2.y)).rgb, L3)) * 0.5;
            vec2 flow = clamp((pl - cl) * g / (dot(g, g) + 0.004), -1.0, 1.0) * bs;   // output px per frame
            vec2 big = cell / 6.0, i0 = floor(big), fr = smoothstep(0.0, 1.0, fract(big));
            vec2 n00 = vec2(h2(i0 + cseed), h2(i0 * 1.7 + cseed)) - 0.5, n10 = vec2(h2(i0 + vec2(1.0, 0.0) + cseed), h2((i0 + vec2(1.0, 0.0)) * 1.7 + cseed)) - 0.5;
            vec2 n01 = vec2(h2(i0 + vec2(0.0, 1.0) + cseed), h2((i0 + vec2(0.0, 1.0)) * 1.7 + cseed)) - 0.5, n11 = vec2(h2(i0 + 1.0 + cseed), h2((i0 + 1.0) * 1.7 + cseed)) - 0.5;
            vec2 drift = mix(mix(n00, n10, fr.x), mix(n01, n11, fr.x), fr.y) * 2.0;
            vec2 mv = floor(flow * mix(2.0, 6.0, gq) + drift * (1.0 + 5.0 * gq) + 0.5) / res;
            vec4 pv = texture2D(prev, vec2(uv.x + mv.x, 1.0 - uv.y - mv.y)); float has = step(0.02, pv.a) * step(0.06, h2(cell * 1.3 + cseed + 9.1));   // (nothing drawn there yet: the picture; and each Rate about one block in 16 decodes right again, so the mosh doesn't wear down to flat smears, 0.90)
            c = mix(c, pv.rgb, has); al = mix(al, pv.a, has);
          } else if (r < gq * 0.3){                // broken: the detail kept but coarse (a few luma steps), the colour taken from the block's centre and thrown off (green / pink), a stray cosine pattern on it
            vec2 ctr = (cell + 0.5) * bs / res; vec3 b = look(samp(geo(ctr), 0.0).rgb);   // (0.90: it was one flat colour per block, and the mosh kept copying those, so the picture went flat)
            float yb = dot(b, vec3(0.299, 0.587, 0.114)), y = dot(c, vec3(0.299, 0.587, 0.114)), u2 = (b.b - yb) * 0.565, v2 = (b.r - yb) * 0.713;
            y = yb + floor((y - yb) / 0.08 + 0.5) * 0.08;
            y += cos(f.x * 3.14159 * floor(1.0 + h2(cell + 7.7) * 3.0)) * cos(f.y * 3.14159 * floor(1.0 + h2(cell + 5.3) * 3.0)) * 0.06;
            u2 += (h2(run + cseed + 1.9) - 0.5) * 0.35; v2 += (h2(run + cseed + 4.4) - 0.5) * 0.35;
            c = vec3(y + 1.403 * v2, y - 0.344 * u2 - 0.714 * v2, y + 1.770 * u2); al = max(al, samp(geo(ctr), 0.0).a);
          }
        }
        if (codec > 0.001 && HAS(cdS, S_codec_crunch)){ float gq = min(1.0, codec * cdA[int(S_codec_crunch)]);   // crunch (a starved bit rate): per block, the detail in a few luma steps around the block's mean, the colour from its centre only
          float bs = max(cdSz, 3.0); vec2 cell = floor(uv * res / bs), cc = (cell + 0.5) * bs / res; vec3 L3 = vec3(0.299, 0.587, 0.114);
          vec3 b = look(samp(geo(cc), 0.0).rgb); float ya = dot(b, L3), y = dot(c, L3), q = mix(0.03, 0.16, gq);
          y = ya + floor((y - ya) / q + 0.5) * q;      // the detail stays, in a few steps (unlike Pixel, where a block is one flat colour)
          vec2 cc2 = (floor(uv * res / (bs * 2.0)) + 0.5) * bs * 2.0 / res; vec3 b2 = look(samp(geo(cc2), 0.0).rgb); float y2 = dot(b2, L3);   // the colour from blocks twice the size, so it bleeds across edges
          float u2 = (b2.b - y2) * 0.565, v2 = (b2.r - y2) * 0.713;
          c = mix(c, vec3(y + 1.403 * v2, y - 0.344 * u2 - 0.714 * v2, y + 1.770 * u2), min(1.0, gq * 1.5));
        }
        c = mix(c, vec3(IS(strobeS, S_strobe_white) ? 1.0 : 0.0), strobe); if (IS(strobeS, S_strobe_white)) al = mix(al, 1.0, strobe);
        if (fb > 0.001){                              // feedback: blend with the previous output (stored upside down)
          vec2 q = uv;
          if (!IS(fbS, S_feedback_trails)){ vec2 d = (q - 0.5) * a * 1.06; if (IS(fbS, S_feedback_spiral)){ float cs = cos(0.06), sn = sin(0.06); d = mat2(cs, sn, -sn, cs) * d; } q = d / a + 0.5; }
          vec4 pv = fbInit > 0.5 || offs(q) ? vec4(0.0) : texture2D(prev, vec2(q.x, 1.0 - q.y));
          float k = 0.6 + 0.38 * fbK - (IS(fbS, S_feedback_trails) ? 0.16 * (1.0 - fb) : 0.0);   // older copies fade as they repeat (Length: how slowly)
          // the history is 8-bit: × k alone gets stuck on dim values (10 × 0.98 rounds back to 10), so a faint ghost of an old
          // scene stayed for ever. Taking off 1.5 / 255 each frame as well lets every trail fade out completely
          c = mix(c, max(c, pv.rgb * k - 0.006), fb); al = mix(al, max(al, pv.a * k - 0.006), fb);
        }
        if (abs(palDot) > 0.5 && colr > 0.001 && IS(colrS, S_colour_pal)){   // Dot Matrix / Pixels: the LCD's slow dots, a change shows over a few frames (ghosting)
          vec4 pv = texture2D(prev, vec2(uv.x, 1.0 - uv.y)); if (pv.a > 0.01) c = mix(c, pv.rgb, 0.42 * colr);
        }
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), clamp(al, 0.0, 1.0));
      }`));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const mkTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v));
      return t; };
    const src = mkTex();
    // per target (output, layers 1–4): two render targets swapped each frame — one is drawn into, the other holds
    // that target's previous result (for Feedback). Made the first time a target gets an effect.
    const mkRT = () => { const t = mkTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CW, CH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f }; };
    const slots = [];
    const slotOf = n => slots[n] || (slots[n] = { rt: [mkRT(), mkRT()], cur: 0, fbWas: false });
    const PX_NAMES = new Set(['crtSz', 'pixSize', 'glSz', 'cdSz']);   // (palDot is worked out in real pixels: lcdDot)   // sizes given in canvas pixels
    const NAMES = ['colr', 'colrS', 'hue', 'strobe', 'strobeS', 'poster', 'posterS', 'zoom', 'wob', 'wobS', 'wobPh', 'mirror', 'mirS', 'mirN', 'mirZ', 'palD', 'palP', 'palDot', 'palLum',
                   'glitch', 'glS', 'gseed', 'glSz', 'codec', 'cdS', 'cseed', 'cdSz', 'dgs', 'rgb', 'rgbS', 'crtSz', 'pixel', 'pixS', 'pixSize', 'fb', 'fbS', 'fbK', 'vDrop', 'shakeZ', 'wobZ', 'time', 'beat'];
    const last = {};                                  // the uniforms' current values (a uniform keeps its value until it's set again)
    const u = {}; [...NAMES, 'glA', 'rgA', 'cdA', 'res', 'shake', 'tex', 'prev', 'blit', 'fbInit', 'pal', 'palOk', 'palN'].forEach(k => u[k] = gl.getUniformLocation(prog, k));
    gl.uniform1i(u.tex, 0); gl.uniform1i(u.prev, 1);
    gl.viewport(0, 0, CW, CH);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.clearColor(0, 0, 0, 0);
    // run(U, from, to, slot): the effects in U applied to canvas `from`, the result drawn into context `to`
    // (slot 0 = the output, 1–4 = layers; each keeps its own Feedback history)
    // Luma transition: a second small program in the same context
    const lp = gl.createProgram();
    gl.attachShader(lp, sh(gl.VERTEX_SHADER, `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x + 1.0, 1.0 - p.y) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }`));
    gl.attachShader(lp, sh(gl.FRAGMENT_SHADER, `precision mediump float; uniform sampler2D a, b, c; uniform float e, inv, sw; varying vec2 uv;
      void main(){ vec4 A = texture2D(a, uv), B = texture2D(b, uv); float l0 = dot(A.rgb, vec3(0.299, 0.587, 0.114)), t = e * (1.0 + sw);
        float l = texture2D(c, vec2((l0 * 255.0 + 0.5) / 256.0, 0.5)).a;   // brightness → its rank in this scene (0 = darkest, 1 = brightest)
        l = mix(l, 1.0 - l, inv);                     // Options › Dark: the darkest parts change first
        gl_FragColor = vec4(mix(A.rgb, B.rgb, smoothstep(1.0 - t, 1.0 + sw - t, l)), 1.0); }`));
    gl.linkProgram(lp); if (!gl.getProgramParameter(lp, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(lp));
    const lu = { a: gl.getUniformLocation(lp, 'a'), b: gl.getUniformLocation(lp, 'b'), c: gl.getUniformLocation(lp, 'c'), e: gl.getUniformLocation(lp, 'e'), inv: gl.getUniformLocation(lp, 'inv'), sw: gl.getUniformLocation(lp, 'sw') }, lpLoc = gl.getAttribLocation(lp, 'p'), texB = mkTex(), texC = mkTex();
    // Luma pacing: the edge sweeps through the old scene's brightness *ranks*, not raw brightness, so a dark or a bright
    // scene takes the same time (equal areas change per moment). The ranks come from a 64×36 copy, every 4th frame.
    const rk = document.createElement('canvas'); rk.width = 64; rk.height = 36; const rx = rk.getContext('2d', { willReadFrequently: true });
    const rank = new Uint8Array(256); let rankN = 0;
    const ranks = A => {
      rx.drawImage(A, 0, 0, 64, 36); const d = rx.getImageData(0, 0, 64, 36).data, hist = new Uint32Array(256), n = d.length / 4;
      for (let i = 0; i < d.length; i += 4) hist[Math.round(d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114)]++;
      let below = 0; for (let v = 0; v < 256; v++){ rank[v] = Math.round(255 * (below + hist[v] / 2) / n); below += hist[v]; }   // mid-rank: a flat scene sits at 0.5
      for (let v = 1; v < 256; v++) if (!hist[v] && rank[v] < rank[v - 1]) rank[v] = rank[v - 1];
    };
    // Transitions that used to be drawn bit by bit on the CPU (hundreds of drawImage / fillRect calls, or a loop over
    // every block): Dissolve, Glitch › Scramble and TV › VHS, as one shader pass over the two scenes.
    // mode 1 dissolve · 2 scramble (no transition uses it since 0.84; kept for now) · 3 vhs. Pixels: P (y down, like the canvases).
    const tp = gl.createProgram();
    gl.attachShader(tp, sh(gl.VERTEX_SHADER, `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x + 1.0, 1.0 - p.y) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }`));
    gl.attachShader(tp, sh(gl.FRAGMENT_SHADER, `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      uniform sampler2D a, b; uniform vec2 res; uniform float mode, e, bs, seed, stp, t, fr, k, nz, mixB, pr, useB; uniform vec4 bands; varying vec2 uv;
      float rnd(float n){ return fract(sin(n * 12.9898 + 78.233) * 43758.5453); }          // the same hash as fxRand
      vec3 tex(sampler2D s, vec2 P){ return texture2D(s, clamp(P, vec2(0.5), res - 0.5) / res).rgb; }
      vec3 src(vec2 P){ return useB > 0.5 ? tex(b, P) : tex(a, P); }
      // tape snow: streaky along each line (each value leans on the ones to its left), 320 × 180 cells drawn up soft
      float cellN(float ix, float iy){ float v = 0.0, w = 0.45;
        for (int j = 0; j < 6; j++){ float x = ix - float(j); if (x < 0.0){ v += w / 0.45 * 0.55 * 0.5; break; } v += w * rnd(x * 1.31 + iy * 317.7 + fr * 7.7); w *= 0.55; }
        return v; }
      float snow(vec2 P){ vec2 q = P / res * vec2(320.0, 180.0) - 0.5, i = floor(q), f = q - i; i = clamp(i, vec2(0.0), vec2(319.0, 179.0));
        vec2 j = min(i + 1.0, vec2(319.0, 179.0));
        return mix(mix(cellN(i.x, i.y), cellN(j.x, i.y), f.x), mix(cellN(i.x, j.y), cellN(j.x, j.y), f.x), f.y); }
      void main(){
        vec2 P = floor(uv * res) + 0.5; vec3 c;
        if (mode < 1.5){                                  // dissolve: each block switches to the new scene at its own random moment
          vec2 cell = stp < 0.5 ? floor(P / bs) : stp < 1.5 ? vec2(0.0, floor(P.y / bs)) : floor(vec2(P.x + P.y, P.x - P.y) / (bs * 1.4142));   // Options: squares, lines, diamonds
          c = rnd(cell.x * 1.37 + cell.y * 91.7 + seed) < e ? tex(b, P) : tex(a, P);
        } else if (mode < 2.5){                           // scramble: big blocks (a = the scenes already shrunk, one pixel per block), colours rotated / swapped / inverted
          vec2 cell = floor(P / bs); c = tex(a, cell + 0.5);
          if (bs >= 3.0){ float n = cell.y * ceil(res.x / bs) + cell.x, q = rnd(n * 0.37 + stp * 17.1);
            if (q <= pr){ float s = floor(q / pr * 4.0);
              if (s < 0.5) c = c.gbr; else if (s < 1.5) c = c.brg; else if (s < 2.5){ if (any(greaterThan(c, vec3(20.0 / 255.0)))) c = 1.0 - c; } else c = c.rbg; } }
        } else {                                          // VHS: torn lines, colour bleed, snow, dropouts, scanlines
          float y = floor(P.y / 2.0) * 2.0, tear = 0.0, st = 0.0;
          for (int i = 0; i < 2; i++){ float bc = i == 0 ? bands.x : bands.z, bh = i == 0 ? bands.y : bands.w, d = abs(y - bc);
            if (d < bh){ float q = 1.0 - d / bh; tear += (rnd(y * 0.7 + fr) - 0.5) * 300.0 * q + 50.0 * q; if (rnd(y * 1.3 + fr * 3.1) < 0.3 * q) st = 1.0; } }
          if (rnd(y * 2.9 + fr * 1.7) < 0.004) st = 1.0;
          float flag = res.y * 0.09; if (y < flag) tear += pow(1.0 - y / flag, 2.0) * 60.0 * sin(t * 3.0);
          if (y > res.y * 0.95) tear += 30.0 + rnd(y * 0.9 + fr) * 50.0;
          float ox = floor((sin(y * 0.021 + t * 9.0) * 7.0 + tear) * k + 0.5), sx = P.x - ox;
          c = sx < 0.0 || sx >= res.x ? vec3(0.0) : src(vec2(sx, P.y));
          if (k > 0.02){
            c = min(c + 0.3 * k * src(vec2(P.x - floor(14.0 * k + 0.5), P.y)) * step(floor(14.0 * k + 0.5), P.x), vec3(1.0));   // colour bleed
            float n = snow(P); c = mix(c, vec3(n), min(1.0, 0.12 * k + nz)); c = mix(c, 1.0 - (1.0 - c) * (1.0 - n), 0.18 * k);
            if (st > 0.5){ float xs = rnd(y + fr * 0.3) * res.x, w = 30.0 + rnd(y * 2.1 + fr) * res.x * 0.35, f = (P.x - xs) / w;
              if (f >= 0.0 && f < 1.0){                   // a dropout: a sharp head trailing off to the right
                float ga = f < 0.06 ? f / 0.06 * 0.95 : f < 0.35 ? mix(0.95, 0.6, (f - 0.06) / 0.29) : mix(0.6, 0.0, (f - 0.35) / 0.65);
                float gv = f < 0.35 ? mix(1.0, 235.0 / 255.0, max(0.0, f - 0.06) / 0.29) : mix(235.0, 220.0, (f - 0.35) / 0.65) / 255.0;
                c = mix(c, vec3(gv), ga * (0.35 + rnd(y + fr) * 0.6) * k); } }
            float gd = P.y - (bands.x + bands.y), gu = (bands.x - bands.y) - P.y;   // below the wide band a green cast trails off; a magenta line tops it
            if (gd > 0.0 && gd < res.y * 0.14) c = mix(c, c * vec3(0.55, 1.15, 0.6) + vec3(0.0, 0.12, 0.02) * (0.4 + 1.2 * rnd(floor(P.x / 4.0) * 1.7 + floor(P.y / 2.0) * 31.3 + fr)), (1.0 - gd / (res.y * 0.14)) * 0.7 * k);
            if (gu >= 0.0 && gu < res.y * 0.008) c = mix(c, vec3(0.8, 0.15, 0.85), 0.6 * k);
            if (mod(floor(P.y), 3.0) < 0.5) c *= 1.0 - 0.22 * k;   // scanlines
          }
        }
        gl_FragColor = vec4(c, 1.0); }`));
    gl.linkProgram(tp); if (!gl.getProgramParameter(tp, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(tp));
    const tu = {}; ['a', 'b', 'res', 'mode', 'e', 'bs', 'seed', 'stp', 't', 'fr', 'k', 'nz', 'mixB', 'pr', 'useB', 'bands'].forEach(n => tu[n] = gl.getUniformLocation(tp, n));
    const tpLoc = gl.getAttribLocation(tp, 'p');
    return { luma(A, B, e, T = {}){
      if (lost || gl.isContextLost()){                 // no GPU: a plain crossfade
        mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over';
        mctx.globalAlpha = 1; mctx.drawImage(A, 0, 0); mctx.globalAlpha = Math.min(1, Math.max(0, e)); mctx.drawImage(B, 0, 0); mctx.globalAlpha = 1; return;
      }
      gl.useProgram(lp); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(lpLoc); gl.vertexAttribPointer(lpLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(lu.a, 0); gl.uniform1i(lu.b, 1); gl.uniform1i(lu.c, 2); gl.uniform1f(lu.e, e); gl.uniform1f(lu.inv, T.inv === 'dark' ? 1 : 0); gl.uniform1f(lu.sw, T.soft ? 0.7 : 0.25);   // Soft: a wider edge
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texC);
      if (rankN++ % 4 === 0 || e < 0.02){ ranks(A); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 256, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, rank); }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, A);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, B);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(prog); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(cv, 0, 0);
    }, trans(mode, A, B, P){                        // a GPU transition onto the master; false = no GPU (the CPU version draws it)
      if (lost || gl.isContextLost()) return false;
      gl.useProgram(tp); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(tpLoc); gl.vertexAttribPointer(tpLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(tu.a, 0); gl.uniform1i(tu.b, 1); gl.uniform2f(tu.res, CW, CH); gl.uniform1f(tu.mode, mode);
      for (const k of ['e', 'bs', 'seed', 'stp', 't', 'fr', 'k', 'nz', 'mixB', 'pr', 'useB']) gl.uniform1f(tu[k], P[k] || 0);
      gl.uniform4fv(tu.bands, P.bands || [0, 0, 0, 0]);
      const needA = mode !== 3 || !P.useB, needB = mode === 1 || (mode === 3 && P.useB);
      if (needA){ gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, A); }
      if (needB){ gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, B); }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(prog); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.activeTexture(gl.TEXTURE0);
      mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(cv, 0, 0);
      return true;
    }, run(U, from = master, to = mctx, slot = 0){
      if (lost || gl.isContextLost()){                 // no GPU: the picture as it is
        if (to.canvas !== from){ to.setTransform(1, 0, 0, 1, 0, 0); to.globalAlpha = 1; to.globalCompositeOperation = 'source-over';
          if (slot === 0){ to.fillStyle = '#000'; to.fillRect(0, 0, CW, CH); } else to.clearRect(0, 0, CW, CH); to.drawImage(from, 0, 0); }
        return;
      }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, from);
      gl.uniform2f(u.res, CW, CH);
      for (const k of NAMES){ const v = (U[k] || 0) * (PX_NAMES.has(k) ? RS : 1); if (last[k] !== v){ last[k] = v; gl.uniform1f(u[k], v); } }
      for (const k of ['glA', 'rgA', 'cdA']){ const v = U[k] || ONES12, sg = v.join(); if (last[k] !== sg){ last[k] = sg; gl.uniform1fv(u[k], v); } }   // sizes in canvas pixels → real pixels; only what changed is sent
      if (String(U.shake) !== last.shake){ last.shake = String(U.shake); gl.uniform3fv(u.shake, U.shake); }
      if (U.palI !== last.palI){ last.palI = U.palI; const P = FX_PALS[U.palI] || FX_PALS[0]; gl.uniform3fv(u.pal, P.f); gl.uniform3fv(u.palOk, P.ok); gl.uniform1f(u.palN, P.c.length); }   // the 64-colour palette only when it changes
      gl.uniform1f(u.blit, 0);
      const fbOn = U.fb > 0.001, trail = fbOn || (U.rgb > 0.001 && (U.rgbS >> FXS.rgb.phos & 1)) || (U.codec > 0.001 && (U.cdS >> FXS.codec.corrupt & 1 || U.cdS >> FXS.codec.keyfr & 1)) || (Math.abs(U.palDot || 0) > 0.5 && U.colr > 0.001);   // only Feedback, Phosphor, Glitch › Corrupt / Keyframe and the Game Boy LCD read the previous frame
      if (!trail){                                   // straight onto the canvas: no render target, no second pass
        const S = slots[slot]; if (S){ S.fbWas = false; S.stale = true; }
        gl.uniform1f(u.fbInit, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {                                       // into this slot's render target (kept as the next frame's "previous"), then onto the canvas
        const S = slotOf(slot), rt = S.rt, cur = S.cur;
        const tNow = performance.now(); if (S.t && tNow - S.t > 250){ S.stale = true; S.fbWas = false; } S.t = tNow;   // a slot that sat unused (the scene being left in an earlier transition, Prep's) starts clean: no trail of what it showed back then
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src);   // (making a slot's targets binds them)
        if (S.stale){ gl.bindFramebuffer(gl.FRAMEBUFFER, rt[1 - cur].f); gl.clear(gl.COLOR_BUFFER_BIT); S.stale = false; }   // frames drawn straight left no trail
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rt[1 - cur].t);
        gl.uniform1f(u.fbInit, fbOn && !S.fbWas ? 1 : 0); S.fbWas = fbOn;
        gl.bindFramebuffer(gl.FRAMEBUFFER, rt[cur].f); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rt[cur].t);
        gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform1f(u.blit, 1); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        S.cur = 1 - cur;
      }
      to.setTransform(1, 0, 0, 1, 0, 0); to.globalAlpha = 1; to.globalCompositeOperation = 'source-over';
      if (slot === 0){ to.fillStyle = '#000'; to.fillRect(0, 0, CW, CH); } else to.clearRect(0, 0, CW, CH);   // what moved away is black / see-through
      to.drawImage(cv, 0, 0);
    }, swap(a, b){ const t = slots[a]; slots[a] = slots[b]; slots[b] = t; }, idle(slot){ const S = slots[slot]; if (S){ S.fbWas = false; S.stale = true; } },   // nothing on it: the trail starts over next time
    resize(){                                        // new canvas format: the render targets follow (feedback history starts over)
      cv.width = CW; cv.height = CH; gl.viewport(0, 0, CW, CH);
      slots.forEach(S => { if (!S) return; S.rt.forEach(r => { gl.bindTexture(gl.TEXTURE_2D, r.t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CW, CH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }); S.fbWas = false; S.stale = true; });
    } };
  } catch (e) { console.warn('screen effects unavailable:', e.message); return null; }
}
const NOFX = { out: null, layers: [null, null, null, null], any: false };
// Prep: the output keeps playing the scene that was live (its own copy of the clips, GIFs and effects), while the
// editor's picture goes to the preview only. Both are drawn every frame.
function drawPrep(now, hidden, quiet){
  const P = prep, b = clock.beat, bl = blackLevel(now), force = redraw.all;
  const oF = post ? fxFrame(b, P.fx) : NOFX;
  oF.layers.forEach((U, li) => { if (!U && post) post.idle(SLOT.LAYERS + li); });
  // each picture is redrawn only when something in it moves or changed (a still scene under Prep cost every pass, every frame)
  const oList = frameList(now, P.layers, P.gifs);
  let ptp = 1; if (P.tr){ const keep = trans; trans = P.tr; ptp = transProgress(); trans = keep; if (ptp >= 1){ endPrepTr(); redraw.all = true; } }   // BRB linked: the output's own transition
  const oMoving = oF.any || (bl > 0 && bl < 1) || !!P.tr;
  if (oMoving) prepOutSig.forget();
  if (oMoving || sceneChanged(oList, live.freeze, bl >= 1, prepOutSig) || force){ drawn++;
  if (live.freeze){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(freezeCv, 0, 0); }
  else if (P.tr){ const keep = trans; trans = P.tr;
    try { render(frameList(now, P.tr.from, P.tr.gifs), trA, SLOT.LEAVING_LAYERS, oF.layers, zoomEOf(oF.out)); render(oList, trB, SLOT.LAYERS, oF.layers, zoomEOf(oF.out)); composeTransition(trEase(ptp, P.tr.cfg), P.tr.cfg); }
    finally { trans = keep; } }
  else render(oList, mctx, SLOT.LAYERS, oF.layers, zoomEOf(oF.out));
  if (live.freezeReq){ freezeCtx.drawImage(master, 0, 0); live.freeze = true; live.freezeReq = false; updLiveTag(); }
  if (oF.out) post.run(oF.out); else if (post) post.idle(SLOT.OUT);
  drawTrOverlay();
  if (bl > 0){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = bl; mctx.fillStyle = '#000'; mctx.fillRect(0, 0, CW, CH); mctx.globalAlpha = 1; }
  blitGen++; outBlit(master);
  }
  if (hidden || quiet) return;
  const eF = post ? fxFrame(b) : NOFX, eList = frameList(now);
  eF.layers.forEach((U, li) => { if (!U && post) post.idle(SLOT.PREP_LAYERS + li); });
  if (eF.any) prepEdSig.forget();
  if (!eF.any && !sceneChanged(eList, false, false, prepEdSig) && !force) return;
  render(eList, trB, SLOT.PREP_LAYERS, eF.layers, zoomEOf(eF.out));
  if (eF.out) post.run(eF.out, trB.canvas, trB, SLOT.PREP_OUT); else if (post) post.idle(SLOT.PREP_OUT);
  pvBlit(trB.canvas);
}
// the preview and the output window show the output at an exact eighth of the render size, in screen pixels (eighthFit):
// halve it in exact steps (each averages 2×2 pixels), then one resample by a whole ratio, so a pattern that repeats every
// 8 output pixels (Dot Matrix, dither, scanlines) comes out the same in every repeat (0.89.4)
function eighthFit(aw, ah, cw = CW, ch = CH){   // available screen pixels → [w, h, eighths] (0: smaller than 1/8, fitted freely)
  const k = Math.floor(Math.min(aw / cw, ah / ch) * 8 + 1e-6), e8 = k >= 1 ? (k > 8 ? Math.floor(k / 8) * 8 : k) : 0;
  if (e8) return [Math.round(cw * e8 / 8), Math.round(ch * e8 / 8), e8];
  const f = Math.min(aw / cw, ah / ch); return [Math.max(1, Math.round(cw * f)), Math.max(1, Math.round(ch * f)), 0];
}
// Performance (0.97): the halves are shared by the preview and the output window within a frame (one chain per source
// and frame): with the output at ½ and the preview at ¼, the ½ step is made once, not twice
const halfChain = { src: null, gen: -1, n: 0, cv: [] };
let blitGen = 0;                                     // bumped once per drawn frame
function blitTo(ctx, src, cache){
  const tw = ctx.canvas.width, th = ctx.canvas.height; let s = src, k = 0;
  if (tw === src.width && th === src.height){ ctx.drawImage(src, 0, 0); return; }
  const H = halfChain; if (H.src !== src || H.gen !== blitGen){ H.src = src; H.gen = blitGen; H.n = 0; }
  while (s.width / 2 >= tw && s.height / 2 >= th && k < 3){
    if (k < H.n){ s = H.cv[k]; k++; continue; }       // made already this frame (for the other window)
    const c = H.cv[k] || (H.cv[k] = document.createElement('canvas')), w = s.width >> 1, h = s.height >> 1;
    if (c.width !== w || c.height !== h){ c.width = w; c.height = h; }
    const x = c.getContext('2d', { alpha: false }); x.imageSmoothingQuality = 'high'; x.drawImage(s, 0, 0, w, h); s = c; k++; H.n = k;
  }
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(s, 0, 0, tw, th);
}
const pvHalf = [], outHalf = [];
let pvLast = null; const pvSrc = () => pvLast || master;   // what the preview shows (the output, or Prep's scene)
const pvBlit = src => { pvLast = src; blitTo(sctx, src, pvHalf); if (pvOpt.loupe && loupeAt) drawLoupe(); };
const outBlit = src => { if (outCtx) blitTo(outCtx, src, outHalf); };
// the effect editor's preview (dragging a slider or a point) shows in the preview only, not on the output (0.95, ID-212):
// while one plays and something watches the output (its window, a recording), the output's frame is drawn without it and
// the preview gets a frame of its own with it
let fxNoPrev = false, pvCv = null;
function drawPvOnly(list, noFx){
  if (!pvCv || pvCv.width !== CW || pvCv.height !== CH){ pvCv = new OffscreenCanvas(CW, CH); }
  const x = pvCv.getContext('2d'), F = fxFrame(clock.beat);
  render(list, x, SLOT.PV_LAYERS, F.layers, zoomEOf(F.out));
  if (noFx) render(noFx, x, SLOT.PV_LAYERS, [], 0, undefined, true);
  if (F.out && post) post.run(F.out, pvCv, x, SLOT.PV_OUT);
  pvBlit(pvCv);
}
function drawFrame(now){
  if (outWin && outWin.closed){ outWin = null; outCtx = null; updateOutStat(); }
  const hidden = document.hidden, force = redraw.all, quiet = now < uiQuiet;
  if (!outCtx && hidden && !rec.mr && !rec.wc) return;   // nobody is looking (and nothing is recording)
  if (prep) drawPrep(now, hidden, quiet); else {
  const full = frameList(now), [list, noFx] = splitNoFx(full);
  let tp = 1;
  if (trans){ tp = transProgress(); if (tp >= 1){ if (trans.sideFx && post) post.swap(SLOT.OUT, SLOT.ARRIVING_OUT); endTrans(); redraw.all = true; } }   // the arriving scene's trail carries on
  const pvOnly = !!(fxPrev && post && (outCtx || rec.mr) && !trans && !live.freeze);   // (one picture for both when nothing else watches)
  fxNoPrev = pvOnly; const fxF = post ? fxFrame(clock.beat) : NOFX, fxU = fxF.out, bl = blackLevel(now); fxNoPrev = false;
  const LUs = fxF.layers, zE = zoomEOf(fxU); LUs.forEach((U, li) => { if ((!U || !layers[li].on) && post) post.idle(SLOT.LAYERS + li); });   // off: its trail starts over when it comes back
  // a running transition / effect / blackout fade redraws every frame; a frozen output only when that changes
  const moving = (trans && !live.freeze) || fxF.any || (bl > 0 && bl < 1) || (noFx && live.freeze) || pvOnly;   // (Bypass FX GIFs keep playing over a frozen picture)
  if (moving) sceneSig.forget();
  if (moving || sceneChanged(full, live.freeze, bl >= 1) || force){
    drawn++; let sideFx = false;
    if (live.freeze){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(freezeCv, 0, 0); }
    else if (trans && trans.still){                   // from a still of the interrupted transition
      trA.setTransform(1, 0, 0, 1, 0, 0); trA.globalAlpha = 1; trA.globalCompositeOperation = 'source-over'; trA.drawImage(trans.still, 0, 0); render(list, trB, SLOT.LAYERS, LUs, zE);
      if (fxU && post){ post.run(fxU, trB.canvas, trB, SLOT.ARRIVING_OUT); sideFx = trans.sideFx = true; }   // the still has its effects already: only the arriving scene gets them, so the transition's own picture (snow, number) keeps its colours
      composeTransition(trEase(tp, trans.cfg), trans.cfg);
    }
    else if (trans && trans.fx && post){                 // going live from Prep: each side with its own effects, then combined
      const aF = fxFrame(clock.beat, trans.fx);
      render(frameList(now, trans.from, trans.gifs), trA, SLOT.LEAVING_LAYERS, aF.layers, zoomEOf(aF.out)); if (aF.out) post.run(aF.out, trA.canvas, trA, SLOT.LEAVING_OUT); else post.idle(SLOT.LEAVING_OUT);
      render(list, trB, SLOT.LAYERS, LUs, zE); if (fxU) post.run(fxU, trB.canvas, trB, SLOT.ARRIVING_OUT); else post.idle(SLOT.ARRIVING_OUT);
      composeTransition(trEase(tp, trans.cfg), trans.cfg); sideFx = trans.sideFx = true;
    }
    else if (trans){
      render(frameList(now, trans.from, trans.gifs), trA, SLOT.LEAVING_LAYERS, LUs, zE); render(list, trB, SLOT.LAYERS, LUs, zE);
      if (fxU && post){                              // the screen effects on each scene before they're combined: the transition's own picture
        post.run(fxU, trA.canvas, trA, SLOT.LEAVING_OUT); post.run(fxU, trB.canvas, trB, SLOT.ARRIVING_OUT); sideFx = trans.sideFx = true; }   // (snow, tears, OSD) keeps its colours
      composeTransition(trEase(tp, trans.cfg), trans.cfg);
    } else render(list, mctx, SLOT.LAYERS, LUs, zE);
    if (live.freezeReq){ freezeCtx.drawImage(master, 0, 0); live.freeze = true; live.freezeReq = false; updLiveTag(); }   // the clean frame, before effects
    if (noFx) render(noFx, mctx, SLOT.LAYERS, [], 0, undefined, true);   // Bypass FX: over the layers and their effects, under the effects on All (0.95)
    if (fxU && !sideFx) post.run(fxU); else if (post && !sideFx) post.idle(SLOT.OUT);
    drawTrOverlay();
    if (bl > 0){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = bl; mctx.fillStyle = '#000'; mctx.fillRect(0, 0, CW, CH); mctx.globalAlpha = 1; }
    blitGen++; outBlit(master);
    if (!hidden && !quiet){ if (pvOnly && bl <= 0) drawPvOnly(list, noFx); else pvBlit(master); }
  }
  }
  if (hidden || quiet) return;                     // quiet: the control window is being restyled — the output keeps going
  paintFxPads(clock.beat);
  const L = layers[target], sel = selClip(), gh = ghostList();
  const O = overlaySig, Gd = pvOpt.guides; O.start();
  [format, pvOpt.gcol, pvOpt.gx, pvOpt.gy, drag && drag.snapRot ? drag.snapRot.a : null, drag && drag.snap && drag.snap.p ? drag.snap.p.join() : null, drag && drag.snap ? drag.snap.x : null, drag && drag.snap ? drag.snap.y : null, drag && drag.snap && drag.snap.line ? drag.snap.line.join() : null, target, sel && sel.id, view.w, view.h].forEach(O.add);
  for (const k of GUIDE_KEYS) O.add(!!Gd[k]); O.add(!!pvOpt.gHide);
  for (const c of L.clips){ const G = clipGeom(c); O.add('|'); if (G){ O.add(G.cx); O.add(G.cy); O.add(G.hw); O.add(G.hh); O.add(G.a); } }
  O.add('hov'); O.add(pvHover ? pvHover[1].id : -1); if (pvHover && !drag){ const G = clipGeom(liveClip(pvHover[1])); if (G){ O.add(G.cx); O.add(G.cy); } }
  { const c = selClip(), e = c && liveClip(c), G = e && e !== c && clipGeom(e); O.add('live'); if (G){ O.add(G.cx); O.add(G.cy); O.add(G.hw); O.add(G.hh); O.add(G.a); } }   // Auto moving the selected GIF: its live outline follows
  if (maskEd){ O.add('m'); O.add(maskEd.li); O.add(maskRev); O.add(maskOwner().mask && maskOwner().mask.mid); O.add(maskPtr ? maskPtr[0] : -1); O.add(maskPtr ? maskPtr[1] : -1); O.add(maskOpt.size); O.add(maskOpt.tool); }
  for (const [c, g] of gh){ const G = clipGeom(c); O.add(';'); [c.id, G.cx, G.cy, G.hw, G.hh, G.a, c.flipX, c.flipY, c.tile, c.cl, c.ct, c.cr, c.cb, g.fxVer, g.startF, g.crisp].forEach(O.add); }
  if (O.changed() || force) drawOverlay(gh);
  redraw.all = false;
}
function drawOverlay(gh = ghostList()){
  const dpr = devicePixelRatio || 1;
  pctx.clearRect(0, 0, pv.width, pv.height);
  const k = view.w * dpr / W, L = layers[target], sel = selClip();
  if (gh.length) drawGhosts(gh, k, dpr);
  if (anyGuide()){                                      // guide lines (preview only)
    const G = pvOpt.guides, [xs, ys] = guideLines(), P = (fx, fy) => [(view.x + fx * view.w) * dpr, (view.y + fy * view.h) * dpr];
    pctx.save(); pctx.strokeStyle = pvOpt.gcol + '80'; pctx.lineWidth = dpr; pctx.setLineDash([4 * dpr, 4 * dpr]); pctx.beginPath();
    xs.forEach(x => { const X = Math.round((view.x + x * view.w / W) * dpr) + 0.5; pctx.moveTo(X, view.y * dpr); pctx.lineTo(X, (view.y + view.h) * dpr); });
    ys.forEach(y => { const Y = Math.round((view.y + y * view.h / H) * dpr) + 0.5; pctx.moveTo(view.x * dpr, Y); pctx.lineTo((view.x + view.w) * dpr, Y); });
    if (G.diag){ pctx.moveTo(...P(0, 0)); pctx.lineTo(...P(1, 1)); pctx.moveTo(...P(1, 0)); pctx.lineTo(...P(0, 1)); }
    if (G.persp){ const c = P(0.5, 0.5);   // one-point perspective: rays from the middle to points along the edges
      for (let k = 0; k <= 4; k++){ const f = k / 4; for (const p of [P(f, 0), P(f, 1), P(0, f), P(1, f)]){ pctx.moveTo(...c); pctx.lineTo(...p); } } }
    pctx.stroke();
    if (G.safe && format !== '9:16'){                   // action safe 93% and title safe 90% (SMPTE ST 2046-1)
      pctx.setLineDash([6 * dpr, 4 * dpr]); pctx.font = `${10 * dpr}px ui-monospace, monospace`; pctx.fillStyle = pvOpt.gcol + 'aa';
      for (const [m, t] of [[0.035, 'action safe'], [0.05, 'title safe']]){ const [x0, y0] = P(m, m), [x1, y1] = P(1 - m, 1 - m); pctx.strokeRect(x0, y0, x1 - x0, y1 - y0); pctx.fillText(t, x0 + 4 * dpr, y0 + (m < 0.04 ? -4 : 13) * dpr); }
    }
    pctx.restore();
  }
  if (drag && drag.snap){                               // the line a dragged GIF sticks to
    pctx.save(); pctx.strokeStyle = '#ff5bb0'; pctx.lineWidth = dpr; pctx.beginPath();
    if (drag.snap.x != null){ const X = Math.round((view.x + drag.snap.x * view.w / W) * dpr) + 0.5; pctx.moveTo(X, view.y * dpr); pctx.lineTo(X, (view.y + view.h) * dpr); }
    if (drag.snap.y != null){ const Y = Math.round((view.y + drag.snap.y * view.h / H) * dpr) + 0.5; pctx.moveTo(view.x * dpr, Y); pctx.lineTo((view.x + view.w) * dpr, Y); }
    if (drag.snap.line){ const [x0, y0, x1, y1] = drag.snap.line, Q = (x, y) => [(view.x + x * view.w / W) * dpr, (view.y + y * view.h / H) * dpr]; pctx.moveTo(...Q(x0, y0)); pctx.lineTo(...Q(x1, y1)); }
    pctx.stroke();
    pctx.restore();
  }
  if (drag && drag.type === 'rot' && drag.snapRot){         // turning, caught: the line(s) at that angle in pink (the knob turns yellow, below)
    const S = drag.snapRot, Q = (x, y) => [(view.x + x * view.w / W) * dpr, (view.y + y * view.h / H) * dpr], c = drag.c, G = clipGeom(c);
    pctx.save(); pctx.strokeStyle = '#ff5bb0'; pctx.lineWidth = dpr; pctx.beginPath();
    if (S.lines.length) for (const [x0, y0, x1, y1] of S.lines){ pctx.moveTo(...Q(x0, y0)); pctx.lineTo(...Q(x1, y1)); }
    else if (G){ const a = S.a * Math.PI / 180, R = W + H; pctx.moveTo(...Q(G.cx - Math.cos(a) * R, G.cy - Math.sin(a) * R)); pctx.lineTo(...Q(G.cx + Math.cos(a) * R, G.cy + Math.sin(a) * R)); }
    pctx.stroke();
    pctx.restore();
  }
  if (format === '9:16' && pvOpt.guides.safe && !pvOpt.gHide){                // where Reels / TikTok / Shorts put their own buttons and captions (approximate)
    const x0 = (view.x + view.w * 0.06) * dpr, y0 = (view.y + view.h * 0.14) * dpr, x1 = (view.x + view.w * 0.86) * dpr, y1 = (view.y + view.h * 0.78) * dpr;
    pctx.save(); pctx.fillStyle = '#ffffff10';
    pctx.fillRect(view.x * dpr, view.y * dpr, view.w * dpr, y0 - view.y * dpr); pctx.fillRect(view.x * dpr, y1, view.w * dpr, (view.y + view.h) * dpr - y1);
    pctx.fillRect(x1, y0, (view.x + view.w) * dpr - x1, y1 - y0);
    pctx.strokeStyle = '#ffffff55'; pctx.lineWidth = dpr; pctx.setLineDash([6 * dpr, 5 * dpr]); pctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    pctx.fillStyle = '#ffffff88'; pctx.font = `${10 * dpr}px ui-monospace, monospace`; pctx.fillText('safe zone', x0 + 4 * dpr, y0 + 13 * dpr);
    pctx.restore();
  }
  pctx.save(); pctx.translate(view.x * dpr, view.y * dpr); pctx.strokeStyle = LCOL[target];
  for (const c of L.clips){
    const G = clipGeom(c); if (!G) continue;
    pctx.lineWidth = (c === sel ? 1.5 : 1) * dpr; pctx.setLineDash(c === sel ? [] : [5*dpr, 4*dpr]);
    pctx.globalAlpha = c === sel ? 1 : 0.6; outline(G, k);
    if (c === sel){ const e = liveClip(c), GE = e !== c && clipGeom(e);   // Auto moves it: a dotted outline where it shows now (the box is where you edit it)
      if (GE && (Math.abs(GE.cx - G.cx) + Math.abs(GE.cy - G.cy) + Math.abs(GE.hw - G.hw) + Math.abs(GE.hh - G.hh) + Math.abs(GE.a - G.a) > 0.5)){
        pctx.save(); pctx.lineWidth = dpr; pctx.setLineDash([2 * dpr, 3 * dpr]); pctx.globalAlpha = 0.7; outline(GE, k); pctx.restore(); } }
    if (c === sel && !L.lock && !maskEd){   // (painting a mask: no handles)                       // (a locked layer: its frame, no handles)
      // stuck to a guide while moving: the handles (and the centre) lying on the lit line fill in the guides' colour; turning, caught: the knob
      const HK = pvOpt.gcol || '#ffd400', sn = drag && drag.c === c && drag.snap, on = (x, y) => { if (!sn) return false; const e = 0.75;
        if (sn.x != null && Math.abs(x - sn.x) < e) return true; if (sn.y != null && Math.abs(y - sn.y) < e) return true;
        if (sn.line){ const [x0, y0, x1, y1] = sn.line, dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, t = clamp(((x - x0) * dx + (y - y0) * dy) / L2, 0, 1); if (Math.hypot(x0 + t * dx - x, y0 + t * dy - y) < e) return true; }
        return false; };
      const s = 4 * dpr;
      for (const h of HANDLES){ const [x, y] = toWorld(G, h[0]*G.hw, h[1]*G.hh); pctx.fillStyle = on(x, y) ? HK : '#000'; pctx.fillRect(x*k - s, y*k - s, 2*s, 2*s); pctx.strokeRect(x*k - s, y*k - s, 2*s, 2*s); }
      const [tx, ty] = toWorld(G, 0, -G.hh), [kx, ky] = knobPos(G);
      pctx.beginPath(); pctx.moveTo(tx*k, ty*k); pctx.lineTo(kx*k, ky*k); pctx.stroke();
      pctx.beginPath(); pctx.arc(kx*k, ky*k, 5*dpr, 0, Math.PI*2); pctx.fillStyle = drag && drag.c === c && drag.type === 'rot' && drag.snapRot ? HK : LCOL[target]; pctx.fill();
      const cs = 5 * dpr, ch = on(G.cx, G.cy); pctx.save(); if (ch){ pctx.strokeStyle = HK; pctx.lineWidth = 2 * dpr; }
      pctx.beginPath(); pctx.moveTo(G.cx*k - cs, G.cy*k); pctx.lineTo(G.cx*k + cs, G.cy*k); pctx.moveTo(G.cx*k, G.cy*k - cs); pctx.lineTo(G.cx*k, G.cy*k + cs); pctx.stroke(); pctx.restore();   // its centre (what sticks to slanted guides)
    }
  }
  pctx.restore();
  if (pvHover && !drag && !maskEd && !picking){ const [hl, hc] = pvHover, G = clipGeom(liveClip(hc));   // what a press would take: its outline where it shows now
    if (G){ pctx.save(); pctx.translate(view.x * dpr, view.y * dpr); pctx.strokeStyle = LCOL[hl]; pctx.lineWidth = 1.5 * dpr; pctx.globalAlpha = 0.9; outline(G, k); pctx.restore(); } }
  if (maskEd) drawMaskOverlay(dpr);
}
$('#fxFollow').classList.toggle('on', fxFollow);
$('#fxFollow').addEventListener('click', () => { fxFollow = !fxFollow; Prefs.set('vjif-fxfollow', fxFollow ? '1' : '0'); $('#fxFollow').classList.toggle('on', fxFollow); });
