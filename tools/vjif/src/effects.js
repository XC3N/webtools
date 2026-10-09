// ---------- screen effects: a WebGL pass over the finished frame (output and preview) ----------
// Twelve effect slots on F1–F12, each with a few styles; nine presets (stored mixes) on the numpad with Caps Lock.
const FX_KEYS = Array.from({ length: 12 }, (_, i) => 'F' + (i + 1)), FX_LABELS = FX_KEYS;
// { id, name, title, mode (default), rate (uses Rate), styles: [[value, label, title]] }
const FX_DEFS = [
  { id: 'mono', name: 'Mono', title: 'Black and white', mode: 'hold', styles: [['grey', 'Grey', 'Shades of grey'], ['thresh', 'Threshold', 'Hard black and white'], ['dither', 'Dither', 'Black and white dots, ordered dither (1-bit, like an old Mac screen); Size = dot size']], size: true, sizeDef: 2, sizeFor: ['dither'] },
  { id: 'colour', name: 'Colour', title: 'Colour shifts', mode: 'hold', rate: true, styles: [['flip', 'Flip', 'Hue turned halfway round'], ['cycle', 'Cycle', 'Hue rotates (one turn every 16 × Rate)'], ['invert', 'Invert', 'Negative colours'], ['pal', 'Palette', 'Every colour snapped to the nearest of an old computer or console palette (pick it with Palette)']] },
  { id: 'strobe', name: 'Strobe', title: 'Flashes on the beat grid (Rate)', mode: 'hold', rate: true, styles: [['white', 'White', 'Flashes white'], ['black', 'Black', 'Flashes black']] },
  { id: 'poster', name: 'Posterize', title: 'Flat colours / outlines', mode: 'hold', styles: [['bands', 'Bands', 'Fewer colours, flat bands'], ['edges', 'Edges', 'Neon outlines on black']] },
  { id: 'zoom', name: 'Zoom', title: 'Zoom punch', mode: 'hit', styles: [['in', 'In', 'Punches in, around the middle of the frame'], ['out', 'Out', 'Punches out, around the middle of the frame'], ['eachin', 'Each in', 'Every GIF punches in around its own centre'], ['eachout', 'Each out', 'Every GIF punches out around its own centre']] },
  { id: 'shake', name: 'Shake', title: 'Camera shake, a new jolt every Rate', mode: 'hit', rate: true, styles: [['shake', 'Shake', 'Big jolts'], ['jitter', 'Jitter', 'Small, twice as fast']] },
  { id: 'wobble', name: 'Wobble', title: 'Wavy distortion, one cycle per Rate', mode: 'hold', rate: true, styles: [['wave', 'Wave', 'Sideways waves'], ['ripple', 'Ripple', 'Rings from the centre']] },
  { id: 'mirror', name: 'Mirror', title: 'Folds the picture', mode: 'latch', styles: [['lr', 'L→R', 'Left half mirrored onto the right'], ['rl', 'R→L', 'Right half mirrored onto the left'], ['tb', 'T→B', 'Top half mirrored onto the bottom'], ['bt', 'B→T', 'Bottom half mirrored onto the top'], ['quad', 'Quad', 'Top-left quarter, four ways'], ['kal', 'Kaleido', 'Kaleidoscope: Amount sets how many slices (3 to 12), Zoom how far in']] },
  { id: 'glitch', name: 'Glitch', title: 'Digital damage, re-torn every Rate', mode: 'hold', rate: true, styles: [['slices', 'Slices', 'Torn horizontal slices (Size = slice height)'], ['blocks', 'Blocks', 'Shuffled blocks (Size = block size)'], ['melt', 'Melt', 'Columns drip down (Size = column width)'], ['scramble', 'Scramble', 'Pixelated blocks with their colours scrambled (Size = biggest block)']], size: true, sizeDef: 48, sizeFor: ['slices', 'blocks', 'melt', 'scramble'] },
  { id: 'rgb', name: 'CRT', title: 'Tube and tape: colour split, VHS, scanlines, phosphor glow, degauss', mode: 'hit', styles: [['split', 'Split', 'Colour channels pulled apart'], ['vhs', 'VHS', 'Tape: tracking sway, a torn band rolling down, washed colour, scanlines, noise; its Amount is the wear: tracking bands, colour bleed, dropouts, a bending top and switching noise'], ['scan', 'Scanlines', 'Dark scanlines and an RGB aperture grille, like a tube up close (Size = line spacing)'], ['phos', 'Phosphor', 'Bright parts glow and linger, like phosphor'], ['degauss', 'Degauss', 'The picture wobbles through rainbow blotches (best as a Hit with a long Release)'], ['paytv', 'Pay-TV', 'A scrambled cable channel (sync suppressed): the picture wraps sideways in a wobbling S with the blanking bar showing, the vertical hold drifts, the colour comes out wrong'], ['crypt', 'Crypt', 'A scrambled satellite channel: lines shuffled within blocks (Nagravision) and each cut and rotated (Videocrypt), re-keyed 4 times a second; Amount = how many lines, Size = line height']], size: true, sizeDef: 3, sizeFor: ['scan', 'crypt'] },

  { id: 'pixel', name: 'Pixel', title: 'Pixelate', mode: 'hold', size: true, styles: [['square', 'Square', 'Square pixels'], ['wide', 'Wide', 'Wide pixels']] },
  { id: 'feedback', name: 'Feedback', title: 'The picture echoes into itself', mode: 'latch', styles: [['trails', 'Trails', 'Moving things leave trails'], ['tunnel', 'Tunnel', 'Copies shrink into the centre'], ['spiral', 'Spiral', 'Copies shrink and turn']] }];
const FX_LENS = [[0, '0'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars']];
const FX_REL = 0.125;                                // default release of Hold / Latch effects (beats)
const FX_RELS = [[0, '0'], [0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars']];
const fxRelDef = mode => mode === 'hit' ? 1 : FX_REL;
const FX_RATES = [[0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar']];
const fxFactory = () => FX_DEFS.map(d => ({ mode: d.mode, amt: 1, att: 0, dec: 0, sus: 1, len: 0, rel: fxRelDef(d.mode), rate: d.id === 'wobble' ? 2 : d.id === 'colour' ? 1 : 0.25, style: d.styles[0][0], target: 'out', size: d.sizeDef || 64 }));
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
].map(([n, t, h]) => { const c = h.split(' ').map(x => [0, 2, 4].map(o => parseInt(x.substr(o, 2), 16) / 255)); return { n, t, c, f: new Float32Array(64 * 3).fill(0).map((v, i) => i < c.length * 3 ? c[i / 3 | 0][i % 3] : 0) }; });
const FX_DITH = Array.from({ length: 21 }, (_, i) => [i / 20, i ? i * 5 + '%' : 'off']);
// Colour › Palette: how the in-between shades are drawn (the Size row stands in for it). Scatter: noise added before
// snapping (soft, many colours touch). Ordered: each pixel picks one of the two nearest palette colours by a 4×4 Bayer
// threshold, like DOS-era / 8-bit art. Checker: the two colours only ever as a 50% checkerboard (hand-pixelled look)
const FX_DPAT = [[0, 'Scatter'], [1, 'Ordered'], [2, 'Checker']];
function sizeAlt(d, style){ return d && d.id === 'colour' && style === 'pal' ? { label: 'Pattern', key: 'dpat', def: 0, list: FX_DPAT, title: () => 'Pattern: how in-between shades are drawn with the palette (Scatter: soft noise · Ordered: two colours in a Bayer pattern, DOS / 8-bit style · Checker: two colours as a 50% checkerboard)' } : null; }
// styles that use the Rate row for something else: Colour › Palette picks the palette, Mirror › Kaleido zooms in, Feedback: how long the echoes last
const FX_KZ = Array.from({ length: 101 }, (_, i) => { const v = +(1 + i * 0.05).toFixed(2); return [v, v.toFixed(2).replace(/\.?0+$/, '') + '×']; });   // 1× to 6×, fine steps
const FX_FBK = Array.from({ length: 20 }, (_, i) => [(i + 1) / 20, (i + 1) * 5 + '%']);   // no 0%: it isn't "off", only the shortest trails
function rateAlt(d, style){
  if (!d) return null;
  if (d.id === 'feedback') return { label: 'Length', key: 'fbk', def: 0.7, list: FX_FBK, title: () => 'Length: how long the trails / echoes last before they fade' };
  if (d.id === 'colour' && style === 'pal') return { label: 'Dither', key: 'dith', def: 0, list: FX_DITH, title: () => 'Dither: ordered dots between the palette colours, for in-between shades (off = flat areas)' };
  if (d.id === 'mirror' && style === 'kal') return { label: 'Zoom', key: 'kz', def: 1, list: FX_KZ, title: () => 'Zoom: into the middle of the kaleidoscope' };
  return null;
}
const FX_SIZES = [[2, '2 px'], [3, '3 px'], [4, '4 px'], [6, '6 px'], [8, '8 px'], [12, '12 px'], [16, '16 px'], [24, '24 px'], [32, '32 px'], [48, '48 px'], [64, '64 px'], [96, '96 px'], [128, '128 px'], [192, '192 px']];
// Mirror › Kaleido: its Amount is the number of slices, 3–12 (Amount's 5–100%)
const kalSlices = amt => Math.round(3 + 9 * clamp((amt - 0.05) / 0.95, 0, 1)), kalAmt = n => 0.05 + (n - 3) / 9 * 0.95;
// a style's name on an effect tile, when the whole word doesn't fit
const STYLE_SHORT = { thresh: 'Thresh', scan: 'Scan', phos: 'Phos', degauss: 'Degauss', eachin: 'Each in', eachout: 'Each out', scramble: 'Scramb.', kal: 'Kaleid.', square: 'Square' };
const styleIdx = (i, v) => Math.max(0, FX_DEFS[i].styles.findIndex(s => s[0] === String(v).split('+')[0]));
// CRT can stack styles ('vhs+scan'): they run as separate stages in a fixed order. Degauss stays on its own (a one-off hit)
const FX_MULTI = { rgb: true }, FX_SOLO = { degauss: true };
const styleParts = (i, v) => { const L = String(v || '').split('+').filter(p => FX_DEFS[i].styles.some(s => s[0] === p)); return L.length ? L : [FX_DEFS[i].styles[0][0]]; };
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
  if ((!X || X.st === fxSt) && fxPrev && fxPrev.i === i) return Math.max(fxPrevLevel(i, C, b), fxLevelRaw(C, S, b, rel));
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
function snapBeat(b){
  const unit = snapUnit();
  if (!unit) return b;
  const prev = Math.floor(b / unit + 1e-9) * unit;
  return b - prev <= unit * SNAP_GRACE ? prev : prev + unit;
}
function fxDown(i){
  const C = fxConf(i), S = fxSt[i], b = clock.beat;
  if (C.mode === 'hit') S.b0 = snapBeat(b);
  else if (C.mode === 'hold'){ S.held = true; S.t0 = b; }
  else { S.on = !S.on; if (!S.on){ S.rel = b; return; } S.t0 = b; }   // switching a Latch off leaves the editor where it is
  if (selFx !== i){ selFx = i; syncFxUI(); }
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
function tgtToggle(t, li, solo){               // a click on a layer button: in / out of the mask (right-click: that layer alone)
  if (solo) return li;
  const S = new Set(tgtList(t)[0] === 'out' ? [0, 1, 2, 3] : tgtList(t));
  S.has(li) ? S.delete(li) : S.add(li);
  if (!S.size || S.size === 4) return 'out';
  const L = [...S].sort(); return L.length === 1 ? L[0] : L;
}
function fxMix(b, X = fxLive()){
  const mk = () => ({ lv: FX_DEFS.map(() => 0), env: FX_DEFS.map(() => 0), amt: X.cfg.map(c => c.amt), rate: X.cfg.map(c => c.rate), style: X.cfg.map(c => c.style), size: X.cfg.map((c, i) => c.size || FX_DEFS[i].sizeDef || 64), pal: X.cfg.map(c => c.pal || 0), kz: X.cfg.map(c => c.kz || 1), fbk: X.cfg.map(c => c.fbk ?? 0.7), dith: X.cfg.map(c => c.dith || 0), dpat: X.cfg.map(c => c.dpat ?? 0) });
  const M = new Map(FX_TARGETS.map(t => [t, mk()]));
  FX_DEFS.forEach((d, i) => { const C = X.cfg[i], l = fxLevel(i, b, X), v = l * C.amt; if (v > 0){ for (const k of tgtList(C.target)){ const m = M.get(k); m.lv[i] = v; m.env[i] = l; } } });
  X.pre.forEach((P, k) => {
    const l = fxLevel(NFX + k, b, X) * P.amt; if (!(l > 0)) return;
    for (const [i, e] of Object.entries(P.fx)){
      const v = l * e.amt;
      for (const k of tgtList(e.target)){ const m = M.get(k);
      if (v > m.lv[i]){ m.lv[i] = v; m.env[i] = l; m.amt[i] = e.amt; m.rate[i] = e.rate; if (e.style) m.style[i] = e.style; if (e.size) m.size[i] = e.size; if (e.pal != null) m.pal[i] = e.pal; if (e.kz) m.kz[i] = e.kz; if (e.fbk != null) m.fbk[i] = e.fbk; if (e.dith != null) m.dith[i] = e.dith; if (e.dpat != null) m.dpat[i] = e.dpat; } }
    }
  });
  return M;
}
// one target's shader settings; null when nothing plays on it
function fxU(b, { lv, env, amt, rate, style, size, pal, kz, fbk, dith, dpat }){
  if (!lv.some(v => v > 0.001)) return null;
  const S = i => styleIdx(i, style[i]), nm = i => FX_DEFS[i].styles[S(i)][0], st = i => Math.floor(b / rate[i]);
  const U = { mono: lv[0], monoS: S(0), colr: lv[1], colrS: S(1), hue: b / (rate[1] * 16) * Math.PI * 2,
    strobe: lv[2] * ((b / rate[2]) % 1 < 0.5 ? 1 : 0), strobeS: S(2), poster: lv[3], posterS: S(3),
    zoom: nm(4) === 'in' ? lv[4] * 0.5 : nm(4) === 'out' ? lv[4] * -0.3 : 0, zoomE: nm(4) === 'eachin' ? lv[4] * 0.5 : nm(4) === 'eachout' ? lv[4] * -0.3 : 0,   // Each: done per GIF in render()
    wob: lv[6], wobS: S(6), wobPh: b / rate[6] * Math.PI * 2,
    mirror: nm(7) === 'kal' ? env[7] : lv[7], mirS: S(7), mirN: kalSlices(amt[7]),   // kaleido: Amount = how many slices
    glitch: lv[8], glS: S(8), gseed: st(8) * 7.13 % 100, glSz: size[8], rgb: lv[9], rgbS: styleMask(9, style[9]), crtSz: size[9], monoSz: size[0],
    pixel: lv[10], pixS: S(10), pixSize: size[10], fb: lv[11], fbS: S(11), time: performance.now() / 1000 % 1000, palI: pal ? pal[1] : 0, palD: dith ? dith[1] : 0, palP: dpat ? dpat[1] : 0, mirZ: kz ? kz[7] : 1, fbK: fbk ? fbk[11] : 0.7 };
  if (U.colrS === FXS.colour.pal) U.colr = env[1];   // a palette follows the envelope, not Amount (Amount picks the palette): Attack / Release dissolve it in and out pixel by pixel
  const jit = nm(5) === 'jitter', sk = Math.floor(b / (rate[5] * (jit ? 0.5 : 1))), s = lv[5] * (jit ? 0.35 : 1);
  U.shake = [(fxRand(sk) - 0.5) * 0.08 * s, (fxRand(sk + 0.37) - 0.5) * 0.08 * s, (fxRand(sk + 0.71) - 0.5) * 0.1 * s]; U.shakeZ = 0.1 * s;
  return U;
}
// this frame's settings for every target: { out: U | null, layers: [U | null ×4], any }
function fxFrame(b, X){
  const M = fxMix(b, X), out = fxU(b, M.get('out')), layers = [0, 1, 2, 3].map(t => fxU(b, M.get(t)));
  return { out, layers, any: !!out || layers.some(Boolean) };
}
const NO_LAYER_FX = [null, null, null, null];
// Effect-history slots of the GPU pass (each keeps its own Feedback / Phosphor trail): the output, its layers (+0…3),
// the scene being left during a transition (its layers, then the whole), and Prep's preview of the scene being edited.
const SLOT = { OUT: 0, LAYERS: 1, LEAVING_LAYERS: 5, PREP_LAYERS: 10, PREP_OUT: 14, ARRIVING_OUT: 14, LEAVING_OUT: 15 };   // going live ends Prep: the arriving scene carries on its preview's trail
const zoomEOf = U => U && U.zoomE || 0;
// ---- blackout (0, held) and freeze (Ins, held): applied to whatever is on the output, effects included ----
const live = { black: 0, blackOn: false, blackT: 0, freeze: false, freezeReq: false };
const BLACK_MS = 120;
function blackLevel(now){ const x = Math.min(1, (now - live.blackT) / BLACK_MS); return live.blackOn ? Math.max(live.black0, x) : (1 - x) * live.black0; }
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
      uniform sampler2D tex, prev; uniform vec2 res; uniform float blit, fbInit, time;
      uniform float mono, monoS, colr, colrS, hue, strobe, strobeS, poster, posterS, zoom, wob, wobS, wobPh, mirror, mirS, mirN, mirZ, palD, palP,
                    glitch, glS, gseed, glSz, rgb, rgbS, crtSz, monoSz, pixel, pixS, pixSize, fb, fbS, fbK, shakeZ;
      uniform vec3 shake; uniform vec3 pal[64]; uniform float palN; varying vec2 uv;
      float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
      float h2(vec2 v){ return fract(sin(dot(v, vec2(12.9898, 78.233))) * 43758.5453); }
      float bay2(vec2 a){ a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }        // ordered (Bayer) dither thresholds
      float bay8(vec2 a){ return bay2(0.25 * a) * 0.0625 + bay2(0.5 * a) * 0.25 + bay2(a); }
      vec2 A(){ return vec2(res.x / res.y, 1.0); }
      vec2 geo(vec2 p){                              // zoom, shake, wobble, pixelate: where to read the frame from
        vec2 a = A(), d = (p - 0.5) * a;
        d /= (1.0 + zoom) * (1.0 + shakeZ);
        float c = cos(shake.z), s = sin(shake.z); d = mat2(c, s, -s, c) * d + shake.xy;
        p = d / a + 0.5;
        if (wob > 0.001){
          if (IS(wobS, S_wobble_wave)){ p.x += sin(p.y * 14.0 + wobPh) * 0.018 * wob; p.y += sin(p.x * 10.0 + wobPh * 1.3) * 0.012 * wob; }
          else { vec2 q = (p - 0.5) * a; float r = length(q); p += q / max(r, 1e-4) / a * sin(r * 40.0 - wobPh) * 0.012 * wob; }
        }
        if (pixel > 0.001){ float n = res.x / mix(1.0, pixSize, pixel); vec2 cell = vec2(n, n * res.y / res.x); if (IS(pixS, S_pixel_wide)) cell.x *= 0.25; p = (floor(p * cell) + 0.5) / cell; }   // blocks of pixSize output pixels at full amount
        return p;
      }
      float vhsBand(float y){                       // VHS: how far inside one of the two tracking bands rolling down this line is (0 outside)
        float b1 = fract(time * 0.35) * 1.3 - 0.15, b2 = fract(time * 0.61 + 0.5) * 1.3 - 0.15;
        return max(max(0.0, 1.0 - abs(y - b1) / 0.11), max(0.0, 1.0 - abs(y - b2) / 0.035));
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
      vec3 palSnap(vec3 c){                          // nearest palette colour, weighted like the eye (green counts most)
        vec2 q = floor(gl_FragCoord.xy / max(1.0, floor(res.y / 360.0)));   // dither cells: chunky dots at any output size
        if (palD > 0.001 && palP < 0.5) c += (bayer4(q) - 0.47) * palD * 0.9 / pow(palN, 0.333);   // Scatter: noise, then the nearest colour
        vec3 W = vec3(0.55, 0.75, 0.35), best = pal[0], sec = pal[0]; float bd = 1e9, sd = 1e9;
        for (int i = 0; i < 64; i++){ if (float(i) >= palN) break; vec3 d = (c - pal[i]) * W; float e = dot(d, d);
          if (e < bd){ sd = bd; sec = best; bd = e; best = pal[i]; } else if (e < sd){ sd = e; sec = pal[i]; } }
        if (palD < 0.001 || palP < 0.5 || palN < 1.5) return best;
        vec3 ab = (sec - best) * W; float t = clamp(dot((c - best) * W, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);   // how far c sits from the nearest towards the second
        t = clamp((t - 0.5) / palD + 0.5, 0.0, 1.0) * step(0.001, t);   // less Dither: the pattern only where c is near halfway
        if (palP > 1.5) t = t < 0.25 ? 0.0 : t > 0.75 ? 1.0 : 0.5 + 0.01;   // Checker: flat, or exactly half and half
        float th = palP > 1.5 ? mod(q.x + q.y, 2.0) * 0.5 + 0.25 : bayer4(q) + 0.03125;
        return th < t ? sec : best; }
      vec3 hueRot(vec3 c, float an){                 // rotate the hue in YIQ space
        vec3 y = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312) * c;
        float cs = cos(an), sn = sin(an); y.yz = vec2(y.y * cs - y.z * sn, y.y * sn + y.z * cs);
        return mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703) * y;
      }
      void main(){
        if (blit > 0.5){ gl_FragColor = texture2D(tex, vec2(uv.x, 1.0 - uv.y)); return; }
        vec2 p = uv, a = A(), scell = vec2(0.0); float scr = 0.0;
        float split = rgb > 0.001 ? rgb * max(max(HAS(rgbS, S_rgb_split) ? 0.025 : 0.0, HAS(rgbS, S_rgb_vhs) ? 0.006 : 0.0), max(max(HAS(rgbS, S_rgb_scan) ? 0.0015 : 0.0, HAS(rgbS, S_rgb_phos) ? 0.002 : 0.0), HAS(rgbS, S_rgb_degauss) ? 0.008 : 0.0)) : 0.0;   // stacked styles: the widest colour split
        float payU = 1.0;                              // pay-TV: where this pixel falls across the line (0 = the blanking bar's edge)
        if (rgb > 0.001 && HAS(rgbS, S_rgb_crypt)){              // crypt: lines shuffled within blocks of 32 (Nagravision Syster), then each cut at a random point and its halves swapped (Videocrypt)
          float lh = max(crtSz, 1.0) / res.y, line = floor(p.y / lh), key = floor(time * 4.0);
          if (h1(line * 0.37 + key * 1.91) < rgb){
            float blk = floor(line / 32.0), idx = mod(line, 32.0), k = 1.0 + 2.0 * floor(h1(blk + key * 1.3) * 16.0), off = floor(h1(blk * 2.1 + key) * 32.0);
            p.y = min((blk * 32.0 + mod(idx * k + off, 32.0) + 0.5) * lh, 1.0 - lh * 0.5);   // odd k: a different line for every line of the block
            p.x = fract(p.x + h1(line * 1.7 + key * 3.1)); } }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_paytv)){ // pay-TV, cable-box style (sync suppressed): no horizontal sync, so every line starts late by an amount
          float y = p.y, t = time;                    // that wobbles down the picture; the picture wraps, the blanking bar shows inside it and bends
          float off = rgb * (0.24 + 0.15 * sin(y * 3.2 + t * 0.9) + 0.035 * sin(y * 9.0 - t * 1.7) + 0.005 * sin(y * 61.0 + t * 11.0));
          p.y = fract(p.y + fract(t * 0.031) * rgb * 0.6);   // and the vertical hold drifts
          payU = fract(p.x + off); p.x = payU; }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_degauss)){ // degauss: the picture ripples
          p += vec2(sin(p.y * 18.0 + time * 35.0), cos(p.x * 14.0 + time * 29.0)) * 0.006 * rgb; }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_vhs)){ // VHS tracking: a gentle sway and a torn band rolling down; with Wear: more of the tape's faults
          float fr = floor(time * 30.0), ln = floor(p.y * res.y / 2.0), w = rgb;   // Amount is the wear
          p.x += sin(p.y * 30.0 + time * 6.0) * 0.0015 * rgb;
          float ty = fract(time * 0.23); if (abs(p.y - ty) < 0.025) p.x += (h1(floor(p.y * 200.0) + fr) - 0.5) * 0.03 * rgb;
          float bq = vhsBand(p.y); p.x += ((h1(ln * 0.7 + fr) - 0.5) * 0.22 + 0.035) * bq * w;   // tracking lost: bands torn hard sideways
          if (p.y < 0.09) p.x += pow(1.0 - p.y / 0.09, 2.0) * 0.03 * sin(time * 3.0) * w;          // flagging: the top of the picture bends
          if (p.y > 0.955) p.x += (0.015 + h1(ln * 0.9 + fr) * 0.03) * w;                         // head-switching noise along the bottom
          p.y += step(0.94, h1(floor(time * 6.0) + 0.3)) * 0.006 * w;                               // now and then the picture hops
        }
        if (glitch > 0.001){
          if (IS(glS, S_glitch_slices)){ float nb = res.y / max(glSz, 2.0), band = floor(p.y * nb + h1(gseed) * nb), g = 0.0;
            if (h1(band + gseed) < glitch * 0.55) g = (h1(band * 1.7 + gseed) - 0.5) * 0.25 * glitch;
            split += abs(g) * 0.3 + glitch * 0.004; p.x += g; }
          else if (IS(glS, S_glitch_blocks)){ vec2 cell = floor(p * res / max(glSz, 2.0));
            if (h2(cell + gseed) < glitch * 0.45){ p += (vec2(h2(cell * 1.3 + gseed), h2(cell * 2.1 + gseed)) - 0.5) * 0.15 * glitch; split += 0.01 * glitch; } }
          else if (IS(glS, S_glitch_melt)){ float col = floor(p.x * res.x / max(glSz * 0.5, 2.0)); p.y = max(0.0, p.y - h1(col * 3.7) * 0.35 * glitch * smoothstep(0.0, 1.0, p.y + 0.3)); }
          else if (IS(glS, S_glitch_scramble)){ vec2 bsz = vec2(max(2.0, glSz * (0.15 + 0.85 * glitch))) / res; scell = floor(p / bsz); p = (scell + 0.5) * bsz; scr = glitch; }
        }
        vec4 c4 = samp(geo(p), split);
        if (scr > 0.0){ float q = h2(scell + gseed);   // scramble: some blocks get their channels rotated, swapped or inverted
          if (q < scr * 0.8){ float s4 = floor(q / (scr * 0.8) * 4.0);
            c4.rgb = s4 < 0.5 ? c4.gbr : s4 < 1.5 ? c4.brg : s4 < 2.5 ? mix(c4.rgb, 1.0 - c4.rgb, step(0.08, max(c4.r, max(c4.g, c4.b)))) : c4.rbg; } }   // (black stays black)
        if (mirror > 0.001) c4 = mix(c4, samp(geo(fold(p)), split), mirror);
        vec3 c = c4.rgb; float al = c4.a;
        if (poster > 0.001){
          if (IS(posterS, S_poster_bands)){ float lv = mix(24.0, 2.0, poster); c = floor(c * lv + 0.5) / lv; }
          else { vec2 t = 1.5 / res, q = geo(p); vec3 w = vec3(0.333);
            float e = length(vec2(dot(raw(q + vec2(t.x, 0.0)), w) - dot(raw(q - vec2(t.x, 0.0)), w), dot(raw(q + vec2(0.0, t.y)), w) - dot(raw(q - vec2(0.0, t.y)), w))) * 4.0;
            vec3 neon = c / max(max(c.r, max(c.g, c.b)), 0.15) * smoothstep(0.05, 0.5, e);
            c = mix(c, neon, poster); }
        }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_scan)){ // scanlines + aperture grille
          float ln = 0.5 + 0.5 * cos(gl_FragCoord.y * 6.2831853 / max(crtSz, 2.0));   // a dark line every Size px
          float col = mod(floor(gl_FragCoord.x), 3.0); vec3 tri = vec3(col < 0.5 ? 1.0 : 0.7, col > 0.5 && col < 1.5 ? 1.0 : 0.7, col > 1.5 ? 1.0 : 0.7);
          c = c * mix(vec3(1.0), tri * (0.55 + 0.45 * ln), rgb) * (1.0 + 0.25 * rgb); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_phos)){ // phosphor: bright parts bloom and linger
          vec2 q = geo(p), t = vec2(5.0) / res; vec3 bl = vec3(0.0);
          for (int i = 0; i < 8; i++){ float an = float(i) * 0.785398; bl += raw(q + vec2(cos(an), sin(an)) * t * 1.6) + raw(q + vec2(cos(an), sin(an)) * t * 3.4); }
          bl /= 16.0; c += max(bl - 0.35, 0.0) * 1.6 * rgb;
          vec4 pv = texture2D(prev, vec2(uv.x, 1.0 - uv.y)); c = max(c, pv.rgb * 0.82 * rgb); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_crypt)) c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))) * 0.85 + 0.06, 0.45 * rgb);   // crypt: colour lost, the black level lifted
        if (rgb > 0.001 && HAS(rgbS, S_rgb_paytv)){ // pay-TV picture: a smeared echo, the colour decoded wrong (hue turned round, oversaturated), now and then a negative field
          vec3 gh = raw(geo(vec2(fract(p.x - 0.022), p.y)));
          vec3 d = mix(c, gh, 0.38);
          d = clamp(hueRot(d, 3.14159), 0.0, 1.0); float l = dot(d, vec3(0.299, 0.587, 0.114)); d = clamp(mix(vec3(l), d, 1.7), 0.0, 1.0);
          if (h1(floor(time * 3.0) + 0.5) < 0.25) d = 1.0 - d;
          float e = payU / 0.11;                      // the blanking bar: a bright sync edge, dark purple, a pale edge where the picture starts
          if (e < 1.0) d = e < 0.12 ? mix(vec3(0.95, 0.92, 1.0), vec3(0.55, 0.35, 0.75), e / 0.12) : e > 0.88 ? mix(vec3(0.16, 0.05, 0.24), vec3(0.75, 0.62, 0.95), (e - 0.88) / 0.12) : mix(vec3(0.30, 0.12, 0.42), vec3(0.14, 0.04, 0.22), (e - 0.12) / 0.76);
          c = mix(c, d, rgb); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_degauss)){ // degauss: rainbow blotches swirling out
          float r = length((uv - 0.5) * a); c = mix(c, clamp(hueRot(c, sin(r * 12.0 - time * 18.0 + sin(uv.x * 7.0) * 2.0) * 3.0), 0.0, 1.0), 0.75 * rgb); }
        if (rgb > 0.001 && HAS(rgbS, S_rgb_vhs)){ // VHS picture: washed colour, scanlines, noise; with Wear: colour bleeding right, dropouts
          float w = rgb, fr = floor(time * 30.0), ln = floor(uv.y * res.y / 2.0);
          if (w > 0.001){                            // tape keeps colour at a fraction of the picture's sharpness: the colour smears to the right of the shapes
            vec2 q = geo(p), px1 = vec2(1.5 / res.x, 0.0);
            vec3 lu = (raw(q - px1) + c * 2.0 + raw(q + px1)) / 4.0;                // tape's soft picture: brightness a little blurred sideways…
            c = mix(c, lu + (c - lu) * 0.6, 0.7 * w);                              // …with a faint edge ring (the sharpening VCRs added)
            vec3 sm = (raw(q - vec2(0.004, 0.0)) + raw(q - vec2(0.008, 0.0)) + raw(q - vec2(0.012, 0.0)) + raw(q - vec2(0.016, 0.0))) / 4.0;
            float yl = dot(c, vec3(0.299, 0.587, 0.114)); vec3 ch = sm - dot(sm, vec3(0.299, 0.587, 0.114));
            c = mix(c, vec3(yl) + ch, 0.8 * w);                                     // colour at a fraction of the sharpness, smeared to the right
            c += (vec3(h1(ln * 3.7 + fr), h1(ln * 5.1 + fr * 1.7), h1(ln * 2.3 + fr * 0.7)) - 0.5) * 0.06 * w;   // chroma noise, line by line
            float bq = vhsBand(uv.y), seg = h1(ln * 1.3 + fr * 3.1);   // dropouts: where the tape lost its oxide, mostly in the bands
            if (seg < (0.02 + 0.3 * bq) * w){
              float x0 = h1(ln + fr * 0.3), x1 = x0 + 0.02 + h1(ln * 2.1 + fr) * 0.3;
              float k = smoothstep(x0, x0 + 0.008, uv.x) * (1.0 - smoothstep(x0 + 0.01, x1, uv.x));   // a soft head that trails off
              k *= 0.55 + 0.45 * h1(floor(uv.x * res.x / 3.0) + ln);              // grainy along its length
              c = mix(c, vec3(0.85) + (h2(gl_FragCoord.xy + fr) - 0.5) * 0.3, k * (0.5 + 0.4 * h1(ln + fr)));
            }
            if (uv.y > 0.955) c = mix(c, vec3(h2(gl_FragCoord.xy + fr)), 0.5 * w);   // the switching noise is snowy
          }
          c = mix(c, vec3(dot(c, vec3(0.299, 0.587, 0.114))), 0.25 * rgb);
          c *= 1.0 - 0.28 * rgb * step(0.5, fract(gl_FragCoord.y / 3.0));
          c += (h2(gl_FragCoord.xy + floor(time * 60.0)) - 0.5) * 0.14 * rgb;
        }
        float y = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(c, IS(monoS, S_mono_grey) ? vec3(y) : IS(monoS, S_mono_thresh) ? vec3(step(0.5, y)) : vec3(step(bay8(gl_FragCoord.xy / max(monoSz, 1.0)) + 0.0078, y)), mono);   // dither: Size-px dots, 8×8 pattern
        if (colr > 0.001){ if (IS(colrS, S_colour_pal)){ if (bayer4(gl_FragCoord.xy / max(1.0, floor(res.y / 360.0)) + 7.0) < colr * 1.0001) c = palSnap(c); }   // palette: pixels switch over in a dither pattern as the envelope rises / falls (no muddy mix)
          else c = mix(c, clamp(IS(colrS, S_colour_invert) ? 1.0 - c : hueRot(c, IS(colrS, S_colour_flip) ? 3.14159 : hue), 0.0, 1.0), colr); }   // flip · cycle · invert
        c = mix(c, vec3(IS(strobeS, S_strobe_white) ? 1.0 : 0.0), strobe); if (IS(strobeS, S_strobe_white)) al = mix(al, 1.0, strobe);
        if (fb > 0.001){                              // feedback: blend with the previous output (stored upside down)
          vec2 q = uv;
          if (!IS(fbS, S_feedback_trails)){ vec2 d = (q - 0.5) * a * 1.06; if (IS(fbS, S_feedback_spiral)){ float cs = cos(0.06), sn = sin(0.06); d = mat2(cs, sn, -sn, cs) * d; } q = d / a + 0.5; }
          vec4 pv = fbInit > 0.5 || offs(q) ? vec4(0.0) : texture2D(prev, vec2(q.x, 1.0 - q.y));
          float k = 0.6 + 0.38 * fbK - (IS(fbS, S_feedback_trails) ? 0.16 * (1.0 - fb) : 0.0);   // older copies fade as they repeat (Length: how slowly)
          c = mix(c, max(c, pv.rgb * k), fb); al = mix(al, max(al, pv.a * k), fb);
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
    const PX_NAMES = new Set(['crtSz', 'monoSz', 'pixSize', 'glSz']);   // sizes given in canvas pixels
    const NAMES = ['mono', 'monoS', 'colr', 'colrS', 'hue', 'strobe', 'strobeS', 'poster', 'posterS', 'zoom', 'wob', 'wobS', 'wobPh', 'mirror', 'mirS', 'mirN', 'mirZ', 'palD', 'palP',
                   'glitch', 'glS', 'gseed', 'glSz', 'rgb', 'rgbS', 'crtSz', 'monoSz', 'pixel', 'pixS', 'pixSize', 'fb', 'fbS', 'fbK', 'shakeZ', 'time'];
    const u = {}; [...NAMES, 'res', 'shake', 'tex', 'prev', 'blit', 'fbInit', 'pal', 'palN'].forEach(k => u[k] = gl.getUniformLocation(prog, k));
    gl.uniform1i(u.tex, 0); gl.uniform1i(u.prev, 1);
    gl.viewport(0, 0, CW, CH);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.clearColor(0, 0, 0, 0);
    // run(U, from, to, slot): the effects in U applied to canvas `from`, the result drawn into context `to`
    // (slot 0 = the output, 1–4 = layers; each keeps its own Feedback history)
    // Luma transition: a second small program in the same context
    const lp = gl.createProgram();
    gl.attachShader(lp, sh(gl.VERTEX_SHADER, `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x + 1.0, 1.0 - p.y) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }`));
    gl.attachShader(lp, sh(gl.FRAGMENT_SHADER, `precision mediump float; uniform sampler2D a, b, c; uniform float e; varying vec2 uv;
      void main(){ vec4 A = texture2D(a, uv), B = texture2D(b, uv); float l0 = dot(A.rgb, vec3(0.299, 0.587, 0.114)), t = e * 1.25;
        float l = texture2D(c, vec2((l0 * 255.0 + 0.5) / 256.0, 0.5)).a;   // brightness → its rank in this scene (0 = darkest, 1 = brightest)
        gl_FragColor = vec4(mix(A.rgb, B.rgb, smoothstep(1.0 - t, 1.25 - t, l)), 1.0); }`));
    gl.linkProgram(lp); if (!gl.getProgramParameter(lp, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(lp));
    const lu = { a: gl.getUniformLocation(lp, 'a'), b: gl.getUniformLocation(lp, 'b'), c: gl.getUniformLocation(lp, 'c'), e: gl.getUniformLocation(lp, 'e') }, lpLoc = gl.getAttribLocation(lp, 'p'), texB = mkTex(), texC = mkTex();
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
    return { luma(A, B, e){
      if (lost || gl.isContextLost()){                 // no GPU: a plain crossfade
        mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over';
        mctx.globalAlpha = 1; mctx.drawImage(A, 0, 0); mctx.globalAlpha = Math.min(1, Math.max(0, e)); mctx.drawImage(B, 0, 0); mctx.globalAlpha = 1; return;
      }
      gl.useProgram(lp); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(lpLoc); gl.vertexAttribPointer(lpLoc, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1i(lu.a, 0); gl.uniform1i(lu.b, 1); gl.uniform1i(lu.c, 2); gl.uniform1f(lu.e, e);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, texC);
      if (rankN++ % 4 === 0 || e < 0.02){ ranks(A); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 256, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, rank); }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, A);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texB); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, B);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.useProgram(prog); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(cv, 0, 0);
    }, run(U, from = master, to = mctx, slot = 0){
      if (lost || gl.isContextLost()){                 // no GPU: the picture as it is
        if (to.canvas !== from){ to.setTransform(1, 0, 0, 1, 0, 0); to.globalAlpha = 1; to.globalCompositeOperation = 'source-over';
          if (slot === 0){ to.fillStyle = '#000'; to.fillRect(0, 0, CW, CH); } else to.clearRect(0, 0, CW, CH); to.drawImage(from, 0, 0); }
        return;
      }
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, from);
      gl.uniform2f(u.res, CW, CH);
      for (const k of NAMES) gl.uniform1f(u[k], (U[k] || 0) * (PX_NAMES.has(k) ? RS : 1));   // sizes in canvas pixels → real pixels
      gl.uniform3fv(u.shake, U.shake);
      { const P = FX_PALS[U.palI] || FX_PALS[0]; gl.uniform3fv(u.pal, P.f); gl.uniform1f(u.palN, P.c.length); }
      gl.uniform1f(u.blit, 0);
      const fbOn = U.fb > 0.001, trail = fbOn || (U.rgb > 0.001 && (U.rgbS >> FXS.rgb.phos & 1));   // only Feedback and Phosphor read the previous frame
      if (!trail){                                   // straight onto the canvas: no render target, no second pass
        const S = slots[slot]; if (S){ S.fbWas = false; S.stale = true; }
        gl.uniform1f(u.fbInit, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {                                       // into this slot's render target (kept as the next frame's "previous"), then onto the canvas
        const S = slotOf(slot), rt = S.rt, cur = S.cur;
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
    }, idle(slot){ const S = slots[slot]; if (S){ S.fbWas = false; S.stale = true; } },   // nothing on it: the trail starts over next time
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
  const P = prep, b = clock.beat, bl = blackLevel(now); drawn++;
  const oF = post ? fxFrame(b, P.fx) : NOFX;
  oF.layers.forEach((U, li) => { if (!U && post) post.idle(SLOT.LAYERS + li); });
  if (live.freeze){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(freezeCv, 0, 0); }
  else render(frameList(now, P.layers, P.gifs), mctx, SLOT.LAYERS, oF.layers, zoomEOf(oF.out));
  if (live.freezeReq){ freezeCtx.drawImage(master, 0, 0); live.freeze = true; live.freezeReq = false; updLiveTag(); }
  if (oF.out) post.run(oF.out); else if (post) post.idle(SLOT.OUT);
  if (bl > 0){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = bl; mctx.fillStyle = '#000'; mctx.fillRect(0, 0, CW, CH); mctx.globalAlpha = 1; }
  if (outCtx) outCtx.drawImage(master, 0, 0);
  if (hidden || quiet) return;
  const eF = post ? fxFrame(b) : NOFX;
  eF.layers.forEach((U, li) => { if (!U && post) post.idle(SLOT.PREP_LAYERS + li); });
  render(frameList(now), trB, SLOT.PREP_LAYERS, eF.layers, zoomEOf(eF.out));
  if (eF.out) post.run(eF.out, trB.canvas, trB, SLOT.PREP_OUT); else if (post) post.idle(SLOT.PREP_OUT);
  sctx.drawImage(trB.canvas, 0, 0, pvScene.width, pvScene.height);
}
function drawFrame(now){
  if (outWin && outWin.closed){ outWin = null; outCtx = null; updateOutStat(); }
  const hidden = document.hidden, force = redraw.all, quiet = now < uiQuiet;
  if (!outCtx && hidden && !rec.mr && !rec.wc) return;   // nobody is looking (and nothing is recording)
  if (prep) drawPrep(now, hidden, quiet); else {
  const list = frameList(now);
  let tp = 1;
  if (trans){ tp = transProgress(); if (tp >= 1){ endTrans(); redraw.all = true; } }
  const fxF = post ? fxFrame(clock.beat) : NOFX, fxU = fxF.out, bl = blackLevel(now);
  const LUs = fxF.layers, zE = zoomEOf(fxU); LUs.forEach((U, li) => { if ((!U || !layers[li].on) && post) post.idle(SLOT.LAYERS + li); });   // off: its trail starts over when it comes back
  // a running transition / effect / blackout fade redraws every frame; a frozen output only when that changes
  const moving = (trans && !live.freeze) || fxF.any || (bl > 0 && bl < 1);
  if (moving) sceneSig.forget();
  if (moving || sceneChanged(list, live.freeze, bl >= 1) || force){
    drawn++; let sideFx = false;
    if (live.freeze){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(freezeCv, 0, 0); }
    else if (trans && trans.still){                   // from a still of the interrupted transition
      trA.setTransform(1, 0, 0, 1, 0, 0); trA.globalAlpha = 1; trA.globalCompositeOperation = 'source-over'; trA.drawImage(trans.still, 0, 0); render(list, trB, SLOT.LAYERS, LUs, zE);
      composeTransition(trEase(tp, trans.cfg), trans.cfg);
    }
    else if (trans && trans.fx && post){                 // going live from Prep: each side with its own effects, then combined
      const aF = fxFrame(clock.beat, trans.fx);
      render(frameList(now, trans.from, trans.gifs), trA, SLOT.LEAVING_LAYERS, aF.layers, zoomEOf(aF.out)); if (aF.out) post.run(aF.out, trA.canvas, trA, SLOT.LEAVING_OUT); else post.idle(SLOT.LEAVING_OUT);
      render(list, trB, SLOT.LAYERS, LUs, zE); if (fxU) post.run(fxU, trB.canvas, trB, SLOT.ARRIVING_OUT); else post.idle(SLOT.ARRIVING_OUT);
      composeTransition(trEase(tp, trans.cfg), trans.cfg); sideFx = true;
    }
    else if (trans){
      render(frameList(now, trans.from, trans.gifs), trA, SLOT.LEAVING_LAYERS, LUs, zE); render(list, trB, SLOT.LAYERS, LUs, zE);
      composeTransition(trEase(tp, trans.cfg), trans.cfg);
    } else render(list, mctx, SLOT.LAYERS, LUs, zE);
    if (live.freezeReq){ freezeCtx.drawImage(master, 0, 0); live.freeze = true; live.freezeReq = false; updLiveTag(); }   // the clean frame, before effects
    if (fxU && !sideFx) post.run(fxU); else if (post && !sideFx) post.idle(SLOT.OUT);
    if (bl > 0){ mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = bl; mctx.fillStyle = '#000'; mctx.fillRect(0, 0, CW, CH); mctx.globalAlpha = 1; }
    if (outCtx) outCtx.drawImage(master, 0, 0);
    if (!hidden && !quiet) sctx.drawImage(master, 0, 0, pvScene.width, pvScene.height);
  }
  }
  if (hidden || quiet) return;                     // quiet: the control window is being restyled — the output keeps going
  paintFxPads(clock.beat);
  const L = layers[target], sel = selClip(), gh = ghostList();
  const O = overlaySig, Gd = pvOpt.guides; O.start();
  [format, pvOpt.gcol, pvOpt.gx, pvOpt.gy, drag && drag.snap ? drag.snap.x : null, drag && drag.snap ? drag.snap.y : null, drag && drag.snap && drag.snap.line ? drag.snap.line.join() : null, target, sel && sel.id, view.w, view.h].forEach(O.add);
  for (const k of GUIDE_KEYS) O.add(!!Gd[k]); O.add(!!pvOpt.gHide);
  for (const c of L.clips){ const G = clipGeom(c); O.add('|'); if (G){ O.add(G.cx); O.add(G.cy); O.add(G.hw); O.add(G.hh); O.add(G.a); } }
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
    pctx.stroke(); pctx.restore();
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
    if (c === sel){
      pctx.fillStyle = '#000'; const s = 4 * dpr;
      for (const h of HANDLES){ const [x, y] = toWorld(G, h[0]*G.hw, h[1]*G.hh); pctx.fillRect(x*k - s, y*k - s, 2*s, 2*s); pctx.strokeRect(x*k - s, y*k - s, 2*s, 2*s); }
      const [tx, ty] = toWorld(G, 0, -G.hh), [kx, ky] = knobPos(G);
      pctx.beginPath(); pctx.moveTo(tx*k, ty*k); pctx.lineTo(kx*k, ky*k); pctx.stroke();
      pctx.beginPath(); pctx.arc(kx*k, ky*k, 5*dpr, 0, Math.PI*2); pctx.fillStyle = LCOL[target]; pctx.fill();
    }
  }
  pctx.restore();
}
