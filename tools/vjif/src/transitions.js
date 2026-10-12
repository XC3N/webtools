// ---------- scene transitions: the scene being left and the new one are each drawn whole, then combined ----------
// transition families, each with its styles (like the effects); a preset = family + style + its settings
const TR_TYPES = [['cut', 'Cut'], ['fade', 'Fade'], ['slide', 'Slide'], ['wipe', 'Wipe'], ['zoom', 'Zoom'], ['dissolve', 'Dissolve'], ['glitch', 'Glitch'], ['tv', 'TV'], ['stutter', 'Stutter']];
const TR_STYLES = {
  stutter: [['ramp', 'Ramp', 'Cuts back and forth between the scenes, 8 shots, faster and faster (on the 1/32 grid), landing on the new one'], ['even', 'Even', 'Cuts back and forth every 1/16 note, landing on the new one']],
  slide: [['push', 'Push', 'The new scene pushes the old one out (Direction)'], ['bands', 'Bands', "The frame splits into horizontal bands: the new scene's slide in one after another, from the left and the right in turn (Options: how many)"]],
  fade: [['cross', 'Cross', 'One scene fades into the other'], ['dip', 'Dip', 'Through black'], ['flash', 'Flash', 'Through white'], ['luma', 'Luma', 'The new scene shows through the brightest parts first']],
  wipe: [['line', 'Line', 'A straight edge sweeps across (Direction)'], ['iris', 'Iris', 'A circle opens from the centre']],
  dissolve: [['blocks', 'Blocks', 'Blocks of the new scene appear in random order (Pixel = block size)'], ['pixelate', 'Pixelate', 'The old scene breaks into blocks, the new one resolves out of them (Pixel = biggest block)'],
             ['melt', 'Melt', 'The old scene drips down in columns, as in Doom (Pixel = column width)']],
  glitch: [['slices', 'Slices', 'Torn horizontal slices from both scenes, settling on the new one (Pixel = slice height)'], ['blocks', 'Blocks', 'Shuffled, displaced blocks of both scenes, settling on the new one (Pixel = block size)'],
           ['scramble', 'Scramble', 'Pixelates, scrambles the colours into the new scene, then resolves (Pixel = biggest block)']],
  tv: [['vhs', 'VHS', 'A tape switching channels: the picture tears up and dissolves into snow, the new scene comes out of it'],
           ['channel', 'Channel', 'A TV changing channels: a flick of snow, then the new scene rolls into place, with a green channel number in the top right corner']] };
const trStyleOf = T => { const st = TR_STYLES[T.type]; return st ? (st.some(x => x[0] === T.style) ? T.style : st[0][0]) : ''; };
// a preset made valid: a known type and style, a block size
function normTrans(P){
  if (P.type === 'glitch' && P.style === 'melt') P.type = 'dissolve';                          // 0.69: Melt moved to Dissolve,
  if (P.type === 'glitch' && (P.style === 'vhs' || P.style === 'channel')) P.type = 'tv';      // VHS and Channel to TV
  if (!TR_TYPES.some(t => t[0] === P.type)) P.type = 'cut';
  P.style = trStyleOf(P); if (!P.px) P.px = 12;
  return P;
}
const trLabel = P => P.type === 'cut' ? 'Cut' : TR_TYPES.find(t => t[0] === P.type)[1] + (TR_STYLES[P.type] ? ' ' + TR_STYLES[P.type].find(x => x[0] === trStyleOf(P))[1].toLowerCase() : '');
const TR_LENS = [[0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars'], [16, '4 bars']];
const TR_DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
// nine transition presets on the number row; pressing one arms it for the next scene change (the panel edits the armed one)
const TR_KEYS = Array.from({ length: 9 }, (_, i) => 'Digit' + (i + 1));
const trDefaults = () => userDef.tr ? userDef.tr.map(P => normTrans({ ...P })) : trFactory();
const trFactory = () => [{ type: 'cut' }, { type: 'fade', style: 'cross', len: 2 }, { type: 'fade', style: 'cross', len: 4 }, { type: 'fade', style: 'dip', len: 2 },
  { type: 'slide', dir: 'left', len: 2 }, { type: 'slide', dir: 'right', len: 2 }, { type: 'wipe', style: 'iris', len: 2 },
  { type: 'glitch', style: 'slices', len: 1 }, { type: 'dissolve', style: 'melt', len: 4, smooth: false }].map(P => normTrans({ dir: 'left', len: 2, smooth: true, px: 12, ...P }));
let trPresets = trDefaults(), trSel = 1, transCfg = trPresets[trSel];
function armTrans(i){ trSel = i; transCfg = trPresets[i]; syncTransUI(); }
let trans = null;   // { cfg, from: layer states, gifs: their pads, b0: start beat, len, melt, free: GIF copies to let go after }
function makeTrans(from, gifs, beat, free = null){
  chOsd = null;                                      // a new transition: the last channel number goes
  if (transCfg.type === 'cut') return null;
  const cfg = { ...transCfg }; if (cfg.dir === 'rand') cfg.dir = ['left', 'right', 'up', 'down'][Math.floor(Math.random() * 4)];   // Options › Rnd: a direction picked each time
  return { cfg, from, gifs, b0: beat, len: transCfg.len, free, melt: isMelt(transCfg) ? meltTable(transCfg.px) : null, dis: null };   // (Dissolve's CPU grid is made when it's first needed: only without WebGL)
}
function endTrans(){ if (trans && trans.free) trans.free.forEach(freeGif); if (trans && trans.gifs) dropFxCache(trans.gifs); trans = null; }
// GIFs no longer on screen let go of their kept coloured frames (fxImage)
function dropFxCache(gifs){ gifs.forEach(g => { if (g && g.fxC && !pads.some(p => p.gif === g)) g.fxC = null; }); }
const trA = mkCanvas().getContext('2d', { alpha: false }), trB = mkCanvas().getContext('2d', { alpha: false }), trM = mkCanvas().getContext('2d');
const TR_PX = [[2, '2 px'], [4, '4 px'], [6, '6 px'], [8, '8 px'], [12, '12 px'], [16, '16 px'], [24, '24 px'], [32, '32 px'], [48, '48 px'], [64, '64 px'], [96, '96 px']];
// Dissolve: a random order for blocks of `px` pixels, made when the transition starts
const pxCv = new OffscreenCanvas(CW, CH), pxCtx = pxCv.getContext('2d');   // Pixelate: the scene shrunk, then drawn back up blocky
function dissolveGrid(px){
  const w = Math.ceil(W / px), h = Math.ceil(H / px), cv = new OffscreenCanvas(w, h), ctx = cv.getContext('2d');
  return { cv, ctx, img: ctx.createImageData(w, h), noise: new Float32Array(w * h).map(() => Math.random()) };
}
// Smooth eases the progress, except for the transitions with their own timing: Stutter's beat grid and Doom's melt
const isMelt = T => T.type === 'dissolve' && trStyleOf(T) === 'melt';
const trEase = (p, T) => T.smooth && T.type !== 'stutter' && !isMelt(T) ? p * p * (3 - 2 * p) : p;
function transProgress(){ if (!trans) return 1; const p = (clock.beat - trans.b0) / trans.len; return p < 0 ? 0 : p > 1 ? 1 : p; }
// combine trA (leaving) and trB (arriving) on the master at progress e (0 → 1)
// The screen melt from Doom (1993), same rules: 160 columns, each starting up to 15 ticks late (neighbours differ by
// at most one), falling 1, 2, 4, 8, 16 px per tick as it speeds up, then 8 px per tick, down a 200 px screen.
// The table holds every column's drop per tick; the transition length stretches the ticks.
function meltTable(px = 12){
  const N = Math.max(8, Math.round(W / px)), y = new Int32Array(N); y[0] = -((Math.random() * 16) | 0);
  for (let i = 1; i < N; i++){ y[i] = y[i - 1] + ((Math.random() * 3) | 0) - 1; if (y[i] > 0) y[i] = 0; else if (y[i] === -16) y[i] = -15; }
  const ticks = [Float32Array.from(y, v => Math.max(0, v))];
  for (let busy = true; busy;){
    busy = false;
    for (let i = 0; i < N; i++){
      if (y[i] < 0){ y[i]++; busy = true; }
      else if (y[i] < 200){ let dy = y[i] < 16 ? y[i] + 1 : 8; if (y[i] + dy > 200) dy = 200 - y[i]; y[i] += dy; busy = true; }
    }
    ticks.push(Float32Array.from(y, v => Math.max(0, v)));
  }
  return ticks;
}
// the on-screen-display font: VCR OSD Mono (by Riciery Leal, free for any use) as a 12 × 14 bitmap
// (the bitmap from frisnit/bitmap-OSD-font; '-' added). Each glyph: 14 rows of 12 bits, as 3 hex digits per row.
const OSD_GLYPHS = {'.': '000000000000000000060060000000000000000000', '0': '1f83fc70e60661e63e6766e67c678660670e3fc1f8', '1': '0600e01e01e00600600600600600600600601f81f8', '2': '1f83fc70e60600600e1fc3f87006006006007fe7fe', '3': '1f83fc70e60600600e07c07c00e00660670e3fc1f8', '4': '0180380780f81d83987186187fe7fe018018018018', '5': '7fe7fe6006007f87fc00e00600600660670e3fc1f8', '6': '1f83fc70e6066006007f87fc60e60660670e3fc1f8', '7': '7fe7fe00600600e01c038070060060060060060060', '8': '1f83fc70e60660670e3fc3fc70e60660670e3fc1f8', '9': '1f83fc70e6066067063fe1fe00600660670e3fc1f8', ':': '000000060060000000000000000000060060000000', 'A': '0600f01f839c70e6066066067fe7fe606606606606', 'B': '7f87fc60e60660660e7fc7fc60e60660660e7fc7f8', 'C': '1f83fc70e60660060060060060060060670e3fc1f8', 'D': '7f87fc60e60660660660660660660660660e7fc7f8', 'E': '7fe7fe6006006006007f87f86006006006007fe7fe', 'F': '7fe7fe6006006006007f87f8600600600600600600', 'G': '1f83fc70e60660060063e63e60660660670e3fc1f8', 'H': '6066066066066066067fe7fe606606606606606606', 'I': '1f81f80600600600600600600600600600601f81f8', 'J': '07e07e0180180180180180180180186187383f01e0', 'K': '60660e61c6386706e07c07c06e067063861c60e606', 'L': '6006006006006006006006006006006006007fe7fe', 'M': '60660670e79e7fe6f6666666606606606606606606', 'N': '6066066067067867c66e667663e61e60e606606606', 'O': '1f83fc70e60660660660660660660660670e3fc1f8', 'P': '7f87fc60e60660660e7fc7f8600600600600600600', 'Q': '1f83fc70e60660660660660666667663e71c3fe1e6', 'R': '7f87fc60e60660660e7fc7f86e067063861c60e606', 'S': '1f83fc70e6066007003f81fc00e00660670e3fc1f8', 'T': '7fe7fe060060060060060060060060060060060060', 'U': '60660660660660660660660660660660670e3fc1f8', 'V': '60660660660660660660660660670e39c1f80f0060', 'W': '6066066066066066066666666666666667fe3fc198', 'X': '60660660670e39c1f80f00f01f839c70e606606606', 'Y': '60660660660660670e39c1f80f0060060060060060', 'Z': '7fe7fe00600e01c0380700e01c03807006007fe7fe', '-': '0000000000000000003fc3fc000000000000000000'};
// p: the size of a pixel of the old 5 × 7 layout (a glyph stays 6 p wide and 7 p tall), so a VCR pixel is p / 2
function osdText(m, txt, x, y, p, col){ m.fillStyle = col; const q = p / 2;
  [...txt].forEach((c, k) => { const g = OSD_GLYPHS[c]; if (!g) return;
    for (let r = 0; r < 14; r++){ const row = parseInt(g.slice(r * 3, r * 3 + 3), 16); if (!row) continue;
      for (let b = 0; b < 12; b++) if (row >> (11 - b) & 1) m.fillRect(x + k * 6 * p + b * q, y + r * q, q, q); } }); }
// the number soft like an analog TV: a blurred shadow, a green glow, then the digits slightly out of focus (made once, kept)
const osdCache = { key: '', cv: null };
function osdImage(txt, p){
  const key = txt + '/' + p; if (osdCache.key === key) return osdCache.cv;
  const cv = document.createElement('canvas'); cv.width = (txt.length * 6 + 4) * p; cv.height = 12 * p; const x = cv.getContext('2d'), o = 2 * p;
  x.filter = `blur(${(p * 0.5).toFixed(1)}px)`; osdText(x, txt, o + p, o + p, p, 'rgba(0,0,0,.7)');
  x.filter = `blur(${(p * 1.1).toFixed(1)}px)`; x.globalAlpha = 0.7; osdText(x, txt, o, o, p, '#3cff4e'); x.globalAlpha = 1;
  x.filter = `blur(${(p * 0.28).toFixed(1)}px)`; osdText(x, txt, o, o, p, '#5dff6c'); x.filter = 'none';
  osdCache.key = key; osdCache.cv = cv; return cv;
}
const vhsN = {}, chN = {};   // the VHS / Channel transitions' noise canvases
// what each transition type draws into the master canvas: e = progress 0…1 (eased if Smooth), T = the preset,
// A / B = the scene being left / arriving (drawn whole into trA / trB), [dx, dy] = the direction
const TR_DRAW = {
  fade(m, A, B, e, T, dx, dy){ const st = trStyleOf(T);
    if (st === 'dip' || st === 'flash'){          // through black (dip) or white (flash): out, then in
      m.drawImage(e < 0.5 ? A : B, 0, 0); m.fillStyle = st === 'dip' ? '#000' : '#fff';
      m.globalAlpha = e < 0.5 ? e * 2 : (1 - e) * 2; m.fillRect(0, 0, W, H); return; }
    if (st === 'luma' && post){ post.luma(A, B, e, T); return; }   // the brightest parts of the old scene give way first
    m.drawImage(A, 0, 0); m.globalAlpha = e; m.drawImage(B, 0, 0);
  },
  slide(m, A, B, e, T, dx, dy){ // the new scene pushes the old one out
    if (trStyleOf(T) === 'bands'){                   // Bands: one after another, each from the other side, overlapping a little
      const n = +(T.bands || 6), bh = H / n, lag = 0.55 / Math.max(1, n - 1), dur = 0.45;
      m.drawImage(A, 0, 0);
      for (let i = 0; i < n; i++){ const q = clamp((e - i * lag) / dur, 0, 1); if (q <= 0) continue;
        const k = 1 - (1 - q) ** 3, x = (i % 2 ? 1 : -1) * (1 - k) * W, y0 = Math.floor(i * bh), y1 = Math.ceil((i + 1) * bh);
        m.drawImage(B, 0, y0 * B.height / H, B.width, (y1 - y0) * B.height / H, x, y0, W, y1 - y0); }
      return;
    }
    m.drawImage(A, dx * e * W, dy * e * H); m.drawImage(B, dx * (e - 1) * W, dy * (e - 1) * H);
  },
  wipe(m, A, B, e, T, dx, dy){ // an edge sweeps across (or a circle opens), revealing the new scene
    m.drawImage(A, 0, 0);
    const iris = trStyleOf(T) === 'iris', [cx, cy] = iris && T.from === 'gif' && trans && trans.ctr ? [trans.ctr[0] * W, trans.ctr[1] * H] : [W / 2, H / 2];
    if (T.soft){                                     // Options › Soft: a feathered edge (the new scene through a gradient mask)
      const sw = Math.max(W, H) * 0.18, x = trM; x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, W, H); x.drawImage(B, 0, 0);
      let g;
      if (iris){ const R = e * (Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + sw); g = x.createRadialGradient(cx, cy, Math.max(0, R - sw), cx, cy, Math.max(1e-3, R)); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); }
      else { const L = dx ? W : H, p = e * (L + sw) - sw, a = dx < 0 || dy < 0 ? L - p : p, b = dx < 0 || dy < 0 ? a - sw : a + sw;
        g = dx ? x.createLinearGradient(a, 0, b, 0) : x.createLinearGradient(0, a, 0, b); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)'); }   // (towards left / up: the new scene enters from the far edge)
      x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
      m.drawImage(x.canvas, 0, 0); return;
    }
    m.save(); m.beginPath();
    if (iris) m.arc(cx, cy, e * Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)), 0, Math.PI * 2);
    else if (dx) m.rect(dx < 0 ? W * (1 - e) : 0, 0, W * e, H); else m.rect(0, dy < 0 ? H * (1 - e) : 0, W, H * e);
    m.clip(); m.drawImage(B, 0, 0); m.restore();
  },
  stutter(m, A, B, e, T, dx, dy){ // hard cuts between the two scenes on the beat grid, ending on the new one
    const L = trans ? trans.len : 4, t = e * L, ramp = trStyleOf(T) !== 'even';
    let step = +(T.grid || 0.25), t0 = 0;            // beats per cut (0.25 = a 1/16 note; Even: Options picks it)
    if (ramp){                                       // Ramp: 8 shots, each shorter than the one before, cut on the 1/32 grid, the last one the new scene
      let k = 0, at = 0, w = 0; for (let i = 1; i < 8; i++){ w += 12 - i; at = Math.max(at + 0.125, Math.round(w / 60 * L * 8) / 8); if (t >= at - 1e-6) k = i; }   // shots 11 : 10 : … : 4 of the length
      m.drawImage(k % 2 ? B : A, 0, 0); return;
    }
    let k = Math.floor((t - t0) / step + 1e-6);
    if (T.swing){ const pr = 2 * step, n = Math.floor((t - t0) / pr + 1e-6), r = t - t0 - n * pr; k = 2 * n + (r < pr * 0.62 ? 0 : 1); }   // Swing: long-short pairs (62 / 38)
    const last = e >= 1 - step / L / 2;
    m.drawImage(last || k % 2 ? B : A, 0, 0);
  },
  zoom(m, A, B, e, T, dx, dy){ // the old scene grows and fades; the new one grows in from smaller
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    const z = (img, k, a) => { m.globalAlpha = a; m.drawImage(img, W / 2 - W * k / 2, H / 2 - H * k / 2, W * k, H * k); };
    if (T.zoom === 'out'){ z(A, 1 - 0.4 * e, 1 - e); z(B, 1.8 - 0.8 * e, e); }                 // Out: the old scene backs away, the new one comes down from close up
    else if (T.zoom === 'thru'){ z(B, 0.3 + 0.7 * e, Math.min(1, e * 1.6)); z(A, 1 + 3 * e * e, Math.max(0, 1 - e * 1.8)); }   // Through: the old scene flies past the camera
    else { z(A, 1 + 0.8 * e, 1 - e); z(B, 0.6 + 0.4 * e, e); }
  },
  dissolve(m, A, B, e, T, dx, dy){ // blocks of the new scene appear in random order
    if (trStyleOf(T) === 'melt') return TR_DRAW.glitch(m, A, B, e, T, dx, dy);   // (Melt is drawn with the glitch family's code)
    if (trStyleOf(T) === 'pixelate'){              // the old scene breaks into ever bigger blocks, the new one resolves out of them
      const big = Math.max(2, T.px || 48), k = e < 0.5 ? e * 2 : (1 - e) * 2, bs = Math.max(1, Math.round(1 + (big - 1) * k * k));
      const w = Math.ceil(W / bs), h = Math.ceil(H / bs);
      pxCtx.imageSmoothingEnabled = true; pxCtx.clearRect(0, 0, w, h); pxCtx.drawImage(e < 0.5 ? A : B, 0, 0, w, h);
      m.imageSmoothingEnabled = false; m.drawImage(pxCv, 0, 0, w, h, 0, 0, w * bs, h * bs); m.imageSmoothingEnabled = true; return;
    }
    const seed = trans ? (trans.seed ?? (trans.seed = Math.random() * 1000)) : 0;
    if (post && post.trans(1, A, B, { e, bs: Math.max(1, T.px || 12), seed, stp: { lines: 1, dia: 2 }[T.shape] || 0 })) return;   // on the GPU (below: the CPU version, without WebGL)
    const D = trans && trans.dis || (trans && (trans.dis = dissolveGrid(T.px || 12))); if (!D){ m.drawImage(B, 0, 0); return; }
    const d = D.img.data; for (let i = 0; i < D.noise.length; i++) d[i * 4 + 3] = D.noise[i] < e ? 255 : 0;
    D.ctx.putImageData(D.img, 0, 0);
    m.drawImage(A, 0, 0);
    trM.globalCompositeOperation = 'source-over'; trM.clearRect(0, 0, W, H); trM.drawImage(B, 0, 0);
    trM.globalCompositeOperation = 'destination-in'; trM.imageSmoothingEnabled = false; trM.drawImage(D.cv, 0, 0, W, H);
    m.drawImage(trM.canvas, 0, 0);
  },
  glitch(m, A, B, e, T, dx, dy){ const gst = trStyleOf(T);
    if (gst === 'melt'){                           // the old scene's columns slide down, revealing the new one
      const tk = trans && trans.melt; if (!tk){ m.drawImage(B, 0, 0); return; }
      const t = transProgress() * (tk.length - 1), t0 = Math.floor(t), t1 = Math.min(tk.length - 1, t0 + 1), f = t - t0, N = tk[0].length;
      m.drawImage(B, 0, 0); m.imageSmoothingEnabled = false;
      for (let i = 0; i < N; i++){
        const x0 = Math.round(i * W / N), cw = Math.round((i + 1) * W / N) - x0;
        const oy = Math.round((tk[t0][i] * (1 - f) + tk[t1][i] * f) / 200 * H); if (oy >= H) continue;
        m.drawImage(A, x0, 0, cw, H - oy, x0, oy, cw, H - oy);
      }
      m.imageSmoothingEnabled = true; return; }
    if (gst === 'blocks'){                         // blocks of both scenes, shuffled and displaced, re-torn ~20 times, settling on the new one
      const bs = Math.max(24, (T.px || 12) * 6), cols = Math.ceil(W / bs), rows = Math.ceil(H / bs), step = Math.floor(e * 20), tear = Math.sin(Math.PI * e);
      const seed = trans ? (trans.seed ?? (trans.seed = Math.random() * 1000)) : 0;
      m.drawImage(e < 0.5 ? A : B, 0, 0);
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
        const k = r * cols + c, src = fxRand(k * 1.7 + seed) < e ? B : A;
        if (fxRand(k * 3.1 + step * 11.3 + seed) > 0.25 + 0.6 * tear){ if (src !== (e < 0.5 ? A : B)) m.drawImage(src, c * bs, r * bs, bs, bs, c * bs, r * bs, bs, bs); continue; }
        const sc = Math.floor(fxRand(k * 5.3 + step + seed) * cols), sr = Math.floor(fxRand(k * 7.9 + step + seed) * rows);   // a block from somewhere else
        const ox = Math.round((fxRand(k * 2.3 + step) - 0.5) * bs * tear);
        m.drawImage(src, sc * bs, sr * bs, bs, bs, c * bs + ox, r * bs, bs, bs);
      }
      trSplit(m, T, tear); return; }
    if (gst === 'scramble'){                       // pixelate up, colours scrambled block by block while the scenes swap, then resolve
      const big = Math.max(4, (T.px || 12) * 4), k = e < 0.5 ? e * 2 : (1 - e) * 2, bs = Math.max(1, Math.round(1 + (big - 1) * k * k));
      const w = Math.ceil(W / bs), h = Math.ceil(H / bs), mixB = Math.min(1, Math.max(0, (e - 0.35) / 0.3));
      pxCtx.imageSmoothingEnabled = true; pxCtx.globalAlpha = 1; pxCtx.clearRect(0, 0, w, h); pxCtx.drawImage(A, 0, 0, w, h);
      if (mixB > 0){ pxCtx.globalAlpha = mixB; pxCtx.drawImage(B, 0, 0, w, h); pxCtx.globalAlpha = 1; }
      if (post && post.trans(2, pxCv, null, { e, bs, stp: Math.floor(e * 30), pr: k * 0.9 })) return;   // the scramble and blow-up on the GPU (the shrinking stays a drawImage)
      if (bs >= 3){                                // the scramble: each block's channels rotated / swapped / inverted, re-rolled ~30 times
        const im = pxCtx.getImageData(0, 0, w, h), d = im.data, step = Math.floor(e * 30), pr = k * 0.9;
        for (let i = 0, n = 0; i < d.length; i += 4, n++){
          const q = fxRand(n * 0.37 + step * 17.1); if (q > pr) continue;
          const r = d[i], g = d[i + 1], b = d[i + 2], s = (q / pr * 4) | 0;
          if (s === 0){ d[i] = g; d[i + 1] = b; d[i + 2] = r; } else if (s === 1){ d[i] = b; d[i + 1] = r; d[i + 2] = g; }
          else if (s === 2){ if (r > 20 || g > 20 || b > 20){ d[i] = 255 - r; d[i + 1] = 255 - g; d[i + 2] = 255 - b; } } else { d[i] = r; d[i + 1] = b; d[i + 2] = g; }
        }
        pxCtx.putImageData(im, 0, 0);
      }
      m.imageSmoothingEnabled = false; m.drawImage(pxCv, 0, 0, w, h, 0, 0, w * bs, h * bs); m.imageSmoothingEnabled = true; return; }
    if (gst === 'channel'){                        // a TV changing channels: the old picture collapses into snow, the new one rolls in, the channel number shows
      if (trans && trans.ch == null){                // what the number shows (Options): random, the new scene's name, or its number
        const m = T.ch || 'rand', nm = (liveName || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').trim().slice(0, 10);
        trans.ch = m === 'num' ? String(sceneIdx + 1).padStart(2, '0') : m === 'scene' ? (nm || String(sceneIdx + 1)) : String(2 + Math.floor(Math.random() * 98)).padStart(2, '0'); }
      const ch = trans ? trans.ch : '12', inA = 0.12, outB = 0.5;                  // snow from 12 % to 50 % of the way
      if (!chN.cv){ chN.cv = document.createElement('canvas'); chN.cv.width = 240; chN.cv.height = 135; chN.x = chN.cv.getContext('2d'); chN.img = chN.x.createImageData(240, 135); }
      const d = chN.img.data;                       // TV snow: fine grey speckle, new every frame
      for (let i = 0; i < d.length; i += 4){ const v = Math.random() ** 1.6 * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      chN.x.putImageData(chN.img, 0, 0);
      if (e < inA){                                 // the old picture: a quick squash and brighten as the tuner lets go
        const q = e / inA, sq = 1 - 0.35 * q * q; m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
        m.filter = `brightness(${1 + q})`; m.drawImage(A, 0, (H - H * sq) / 2, W, H * sq); m.filter = 'none';
        m.globalAlpha = q * q; m.drawImage(chN.cv, 0, 0, W, H); m.globalAlpha = 1;
      } else if (e < outB){                         // snow, with the hum bar drifting through it
        m.imageSmoothingEnabled = false; m.drawImage(chN.cv, 0, 0, W, H); m.imageSmoothingEnabled = true;
        const hy = ((e - inA) / (outB - inA) * 1.4 - 0.2) * H; m.fillStyle = 'rgba(0,0,0,.35)'; m.fillRect(0, hy, W, H * 0.12);
      } else {                                      // the new picture rolls down into place (vertical hold catching), snow fading out
        const q = (e - outB) / (1 - outB), roll = Math.round((1 - q) ** 3 * H * 1.2) % H;
        m.drawImage(B, 0, roll - H); m.drawImage(B, 0, roll);
        if (roll > 0){ m.fillStyle = '#000'; m.fillRect(0, roll - H * 0.03, W, H * 0.03); }   // the blanking bar between two frames
        m.globalAlpha = (1 - q) ** 2 * 0.8; m.drawImage(chN.cv, 0, 0, W, H); m.globalAlpha = 1;
      }
      if (e >= inA){                                // the channel number, OSD green, top right (it stays until the transition ends)
        const txt = String(ch), p = Math.max(2, Math.round(H * 0.013)), cw = 6 * p, x0 = Math.round(W - H * 0.06 - txt.length * cw + p), y0 = Math.round(H * 0.06);
        trOverlay = [osdImage(txt, p), x0 - 2 * p, y0 - 2 * p];   // drawn once per number and size; put on after the screen effects (a TV's own text: no palette, no glitch on it)
        chOsd = { o: trOverlay, until: performance.now() + CH_OSD_HOLD };   // and it stays a little after the picture is back
      }
      return; }
    if (gst === 'vhs'){                            // a tape switching channels: the picture tears up, dissolves into snow, and the new one comes out of it
      const k = Math.sin(Math.PI * e), src = e < 0.5 ? A : B, t = performance.now() / 1000;
      const nz = Math.min(1, Math.max(0, 1 - Math.abs(e - 0.5) / 0.3)) ** 1.5;   // snow: none at the ends, all of it around the middle
      // tracking lost: two bands rolling down at different speeds, torn sideways, where most dropouts happen
      // the bands roll on the beat, at random (as in CRT › VHS): the wide one over 2 beats, the thin one over 1; off-screen when not rolling
      const bt = clock.beat, k2 = Math.floor(bt / 2), f2 = bt / 2 - k2, n1 = Math.floor(bt), f1 = bt - n1, hr = x => { const v = Math.sin(x * 12.9898) * 43758.5453; return v - Math.floor(v); };
      const y1 = hr(k2 * 3.1 + 0.7) < 0.7 ? -0.15 + f2 * (1.05 + 0.5 * hr(k2 * 5.3 + 1.9)) : -9, y2 = hr(n1 * 2.3 + 4.1) < 0.5 ? -0.15 + 0.3 * hr(n1 * 7.7 + 0.3) + f1 * 1.2 : -9;
      const bands = [[y1 * H, H * 0.16], [y2 * H, H * 0.05]];
      const fr = Math.floor(t * 30), flag = H * 0.09, head = H * 0.95;
      const wr = { light: 0.6, chewed: 1.5 }[T.wear] || 1;   // Options › wear: how hard the tape tears and snows
      if (post && post.trans(3, A, B, { e, t: t % 1000, fr: fr % 100000, k: Math.min(1.5, k * wr), nz: Math.min(1, nz * wr), useB: e < 0.5 ? 0 : 1, bands: [bands[0][0], bands[0][1], bands[1][0], bands[1][1]] })) return;
      m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
      const sh = 2, streaks = [];
      for (let y = 0; y < H; y += sh){
        let tear = 0;
        for (const [bc, bh] of bands){ const d = Math.abs(y - bc); if (d < bh){ const q = 1 - d / bh; tear += (fxRand(y * 0.7 + fr) - 0.5) * 300 * q + 50 * q;
          if (fxRand(y * 1.3 + fr * 3.1) < 0.3 * q) streaks.push(y); } }
        if (fxRand(y * 2.9 + fr * 1.7) < 0.004) streaks.push(y);                 // a few anywhere
        if (y < flag) tear += (1 - y / flag) ** 2 * 60 * Math.sin(t * 3);        // flagging: the top of the picture bends
        if (y > head) tear += 30 + fxRand(y * 0.9 + fr) * 50;                   // head-switching noise along the bottom
        const ox = Math.round((Math.sin(y * 0.021 + t * 9) * 7 + tear) * k);
        m.drawImage(src, 0, y, W, Math.min(sh, H - y), ox, y, W, Math.min(sh, H - y));
      }
      if (k > 0.02){
        m.globalCompositeOperation = 'lighter'; m.globalAlpha = 0.3 * k; m.drawImage(src, Math.round(14 * k), 0); m.globalAlpha = 1;   // colour bleed
        m.globalCompositeOperation = 'source-over';
        // snow: streaky (each value leans on the one to its left, like tape noise), drawn up soft so it isn't a pixel grid
        if (!vhsN.cv){ vhsN.cv = document.createElement('canvas'); vhsN.cv.width = 320; vhsN.cv.height = 180; vhsN.x = vhsN.cv.getContext('2d'); vhsN.img = vhsN.x.createImageData(320, 180);
          const g = document.createElement('canvas'); g.width = 96; g.height = 1; const gx = g.getContext('2d'), gr = gx.createLinearGradient(0, 0, 96, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.06, 'rgba(255,255,255,.95)'); gr.addColorStop(0.35, 'rgba(235,235,235,.6)'); gr.addColorStop(1, 'rgba(220,220,220,0)');
          gx.fillStyle = gr; gx.fillRect(0, 0, 96, 1); vhsN.dash = g; }                // a dropout: a sharp head trailing off to the right
        const d = vhsN.img.data; let prev = 128;
        for (let i = 0; i < d.length; i += 4){ if ((i >> 2) % 320 === 0) prev = 128; const v = prev = prev * 0.55 + Math.random() * 255 * 0.45; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
        vhsN.x.putImageData(vhsN.img, 0, 0);
        m.imageSmoothingEnabled = true;
        m.globalAlpha = Math.min(1, 0.12 * k + nz); m.drawImage(vhsN.cv, 0, 0, W, H);
        m.globalCompositeOperation = 'screen'; m.globalAlpha = 0.18 * k; m.drawImage(vhsN.cv, 0, 0, W, H); m.globalCompositeOperation = 'source-over';
        streaks.forEach((y, i) => { m.globalAlpha = (0.35 + fxRand(i + fr) * 0.6) * k; const x = fxRand(y + fr * 0.3) * W, w = 30 + fxRand(y * 2.1 + fr) * W * 0.35; m.drawImage(vhsN.dash, x, y, w, sh); });
        m.globalAlpha = 0.22 * k; m.fillStyle = '#000';
        for (let y = 0; y < H; y += 3) m.fillRect(0, y, W, 1);   // scanlines
        m.globalAlpha = 1;
      }
      return; }
    // slices: torn horizontal slices from both scenes, settling on the new one
    const G = trans && (trans.gl || (trans.gl = Array.from({ length: Math.max(4, Math.min(120, Math.round(H / ((T.px || 12) * 4)))) }, () => [Math.random(), Math.random(), Math.random()])));   // Pixel = slice height ÷ 4
    if (!G){ m.drawImage(B, 0, 0); return; }
    const tear = Math.sin(Math.PI * e), step = Math.floor(e * 24);   // re-torn a couple dozen times over the transition
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    G.forEach(([r, o, j], i) => {
      const y = Math.round(i * H / G.length), h = Math.round((i + 1) * H / G.length) - y;
      const src = r < e ? B : A, jit = fxRand(i * 7.1 + step) - 0.5, ox = Math.round(((o - 0.5) * 0.3 + jit * 0.12) * W * tear);
      m.drawImage(src, 0, y, W, h, ox, y, W, h); m.drawImage(src, 0, y, W, h, ox - Math.sign(ox || 1) * W, y, W, h);
      if (j < 0.25 * tear){ m.globalCompositeOperation = 'lighter'; m.globalAlpha = 0.5; m.drawImage(src, 0, y, W, h, ox + 14, y, W, h); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; }
    });
    trSplit(m, T, tear);
  },
  tv(m, A, B, e, T, dx, dy){ return TR_DRAW.glitch(m, A, B, e, T, dx, dy); },   // VHS, Channel (drawn with the glitch family's code)
  cut(m, A, B, e, T, dx, dy){ m.drawImage(B, 0, 0);
  },
};
// Transitions combine whole pictures, so they work in real pixels: W / H stand for the canvases' real size while they
// draw (block / slice sizes shrink with the render size so they look the same)
// Glitch › Options › Split: the red channel pulled sideways from the rest, as hard as the tear (Wide: further)
function trSplit(m, T, tear){
  const d = Math.round((T.split === 'wide' ? 0.02 : T.split === 'on' ? 0.008 : 0) * W * tear); if (d < 1) return;
  const x = trM; x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.drawImage(m.canvas, 0, 0);
  x.globalCompositeOperation = 'multiply'; x.fillStyle = '#f00'; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';   // the red alone
  m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'multiply'; m.fillStyle = '#0ff'; m.fillRect(0, 0, W, H);   // the rest without its red
  m.globalCompositeOperation = 'lighter'; m.drawImage(x.canvas, d, 0); m.restore();
}
// what a transition puts on top of everything, after the screen effects (Channel's number)
let trOverlay = null, chOsd = null;
const CH_OSD_HOLD = 1600;                            // ms the channel number stays on after a TV › Channel transition (its last 300 fade)
function drawTrOverlay(){
  let o = trOverlay, a = 1; trOverlay = null;
  if (!o && chOsd){ const left = chOsd.until - performance.now(); if (left <= 0) chOsd = null; else { o = chOsd.o; a = Math.min(1, left / 300); } sceneSig.forget(); prepOutSig.forget(); }   // (the next frame is drawn again, until it's gone)
  if (!o) return; const [im, x, y] = o; mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = a; mctx.globalCompositeOperation = 'source-over'; mctx.drawImage(im, x, y); mctx.globalAlpha = 1; }
function composeTransition(e, T){
  trOverlay = null;
  const m = mctx; m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
  const A = trA.canvas, B = trB.canvas, [dx, dy] = TR_DIRS[T.dir] || TR_DIRS.left, w0 = W, h0 = H;
  const T2 = RS === 1 ? T : { ...T, px: Math.max(1, Math.round((T.px || 12) * RS)) };
  if (trans && T.from === 'gif' && !trans.ctr){ const c = selClip(), G = c && clipGeom(c); trans.ctr = G ? [Math.min(1, Math.max(0, G.cx / W)), Math.min(1, Math.max(0, G.cy / H))] : [0.5, 0.5]; }   // Iris from the selected GIF: its centre (0–1 of the frame)
  W = CW; H = CH;
  try { (TR_DRAW[T.type] || TR_DRAW.cut)(m, A, B, e, T2, dx, dy); } finally { W = w0; H = h0; }
  m.globalAlpha = 1;
}
