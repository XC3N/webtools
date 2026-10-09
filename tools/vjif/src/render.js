// ---------- geometry ----------
function baseSize(g, fit){
  if (fit === 'auto' && g.media && g.media.text) return [g.w, g.h];   // lettering is drawn at output size
  if (fit === 'auto'){
    // native pixels; big GIFs shrink to fit the frame, small sprites grow by a whole factor up to ~1/3 frame height
    if (g.w > W || g.h > H){ const s = Math.min(W / g.w, H / g.h); return [g.w * s, g.h * s]; }
    const s = Math.max(1, Math.min(Math.floor(H / 3 / g.h), Math.floor(W / 2 / g.w)));
    return [g.w * s, g.h * s];
  }
  if (fit === 'stretch') return [W, H];
  if (fit === 'native')  return [g.w, g.h];
  const s = (fit === 'cover' ? Math.max : Math.min)(W / g.w, H / g.h);
  return [g.w * s, g.h * s];
}
function applyXf(ctx, c, k = 1){
  ctx.translate((W/2 + c.x) * k, (H/2 + c.y) * k);
  ctx.rotate(c.rot * Math.PI / 180);
  ctx.scale(c.sx * k * (c.flipX ? -1 : 1), c.sy * k * (c.flipY ? -1 : 1));
}
// visible (cropped) box in output pixels: center, half extents, angle; bw/bh = visible base size,
// fbw/fbh = uncropped base size, ox/oy = offset of the visible center from the clip origin (local, scaled)
function clipGeom(c, g = pads[c.pad] && pads[c.pad].gif){
  if (!g) return null;
  const [fbw, fbh] = baseSize(g, c.fit);
  const a = c.rot * Math.PI / 180, co = Math.cos(a), si = Math.sin(a);
  const bw = fbw * (1 - c.cl - c.cr), bh = fbh * (1 - c.ct - c.cb);
  const ox = (c.cl - c.cr) / 2 * fbw * c.sx * (c.flipX ? -1 : 1), oy = (c.ct - c.cb) / 2 * fbh * c.sy * (c.flipY ? -1 : 1);
  return { cx: W/2 + c.x + ox*co - oy*si, cy: H/2 + c.y + ox*si + oy*co, hw: bw * c.sx / 2, hh: bh * c.sy / 2, a, bw, bh, fbw, fbh, ox, oy };
}
// move the clip so its visible (cropped) center lands on world point (wx, wy)
function placeVisible(c, wx, wy){
  const G = clipGeom(c), co = Math.cos(G.a), si = Math.sin(G.a);
  c.x = wx - W/2 - (G.ox*co - G.oy*si); c.y = wy - H/2 - (G.ox*si + G.oy*co);
}
function fitScreen(c, fit){
  Object.assign(c, { fit, rot: 0, flipX: false, flipY: false, tile: false, sx: 1, sy: 1 });
  const G = clipGeom(c); if (!G) return;
  if (fit === 'stretch'){ c.sx = W / G.bw; c.sy = H / G.bh; }
  else c.sx = c.sy = (fit === 'cover' ? Math.max : Math.min)(W / G.bw, H / G.bh);
  placeVisible(c, W/2, H/2);
}
function toLocal(G, px, py){ const dx = px - G.cx, dy = py - G.cy, co = Math.cos(G.a), si = Math.sin(G.a); return [dx*co + dy*si, -dx*si + dy*co]; }
function toWorld(G, lx, ly){ const co = Math.cos(G.a), si = Math.sin(G.a); return [G.cx + lx*co - ly*si, G.cy + lx*si + ly*co]; }
function inClip(c, px, py){ const G = clipGeom(c); if (!G) return false; const [lx, ly] = toLocal(G, px, py); return Math.abs(lx) <= G.hw && Math.abs(ly) <= G.hh; }
// RGBA of the clip's current frame under an output-space point (src = before colour key)
const probe = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
function sampleClip(c, px, py, src = false){
  const g = pads[c.pad].gif, G = clipGeom(c), [lx, ly] = toLocal(G, px, py);
  const u = (lx + G.ox) / (c.sx * (c.flipX ? -1 : 1) * G.fbw) + 0.5, v = (ly + G.oy) / (c.sy * (c.flipY ? -1 : 1) * G.fbh) + 0.5;
  const fi = frameIndex(c, g, performance.now()), img = (src ? g.src : g.frames)[fi];
  const ix = clamp(Math.floor(u * img.width), 0, img.width - 1), iy = clamp(Math.floor(v * img.height), 0, img.height - 1);
  probe.clearRect(0, 0, 1, 1);
  probe.drawImage(img, -ix, -iy);
  const d = probe.getImageData(0, 0, 1, 1).data;
  if (!src && liveFx() && g.frames === g.src && g.key.on && d[3]){   // apply the key to this one pixel
    const f = g.key.region !== 'all' ? (g.masks ? g.masks[fi][iy * img.width + ix] : 255) : (fxColor(d[0] | (d[1] << 8) | (d[2] << 16), fxParams(g)) / 16777216) | 0;
    d[3] = (d[3] * f / 255) | 0;
  }
  d.u = clamp(u, 0, 1); d.v = clamp(v, 0, 1);         // where in the frame (0..1), for the key's seed point
  return d;
}
// everything under the point, in visual order (topmost first); transparent pixels don't count
function hitsAt(px, py, opaqueOnly = true){
  const out = [];
  for (let li = 3; li >= 0; li--){
    const L = layers[li]; if (!L.on || L.opacity <= 0) continue;
    for (let k = L.clips.length - 1; k >= 0; k--){
      const c = L.clips[k];
      if (inClip(c, px, py) && (!opaqueOnly || sampleClip(c, px, py)[3] > 16)) out.push([li, c]);
    }
  }
  return out;
}
function hitAny(px, py){ return hitsAt(px, py)[0] || null; }
const KNOB = 26;    // rotate knob distance above the box, preview px
function knobPos(G){ return toWorld(G, 0, -G.hh - KNOB * W / view.w); }
function hitHandle(c, px, py){
  const G = c && clipGeom(c); if (!G) return null;
  const tol = 9 * W / view.w, [kx, ky] = knobPos(G);
  if (Math.hypot(kx - px, ky - py) < tol) return 'rot';
  for (const h of HANDLES){ const [wx, wy] = toWorld(G, h[0]*G.hw, h[1]*G.hh); if (Math.abs(wx - px) < tol && Math.abs(wy - py) < tol) return h; }
  return null;
}

// ---------- rendering ----------
function drawClip(ctx, c, g, img){
  const [bw, bh] = baseSize(g, c.fit), base = c.tile ? ctx.getTransform() : null;
  ctx.save(); ctx.globalAlpha *= (c.alpha ?? 1); applyXf(ctx, c);
  ctx.imageSmoothingEnabled = !g.crisp;
  if (c.tile){
    // fill exactly the frame, with the clip's whole transform folded into the pattern
    const pat = ctx.createPattern(img, 'repeat');
    pat.setTransform(new DOMMatrix().translate(W/2 + c.x, H/2 + c.y).rotate(c.rot)
      .scale(c.sx * (c.flipX ? -1 : 1), c.sy * (c.flipY ? -1 : 1)).translate(-bw/2, -bh/2).scale(bw / img.width, bh / img.height));
    ctx.fillStyle = pat; ctx.setTransform(base);
    ctx.fillRect(0, 0, W, H);
  } else if (c.cl || c.ct || c.cr || c.cb){
    const sw = 1 - c.cl - c.cr, sh = 1 - c.ct - c.cb;
    ctx.drawImage(img, c.cl * img.width, c.ct * img.height, sw * img.width, sh * img.height, -bw/2 + c.cl*bw, -bh/2 + c.ct*bh, sw*bw, sh*bh);
  } else {
    ctx.drawImage(img, -bw/2, -bh/2, bw, bh);
    const T = g.media && g.media.text;
    if (T && T.cut && T.marquee){                     // a scrolling cut-out: the matte carries on past the letters, to the frame's edges and beyond
      ctx.fillStyle = T.color || '#000'; ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 2e5); ctx.rect(-bw/2 + 0.5, -bh/2 + 0.5, bw - 1, bh - 1); ctx.fill('evenodd'); }
  }
  ctx.restore();
}
// false only when the clip's (rotated) box is certainly outside the frame; tiled clips always draw
function onScreen(c, g){
  if (c.tile) return true;
  const T = g && g.media && g.media.text; if (T && T.cut && T.marquee) return true;   // its matte reaches past its box
  const G = clipGeom(c, g); if (!G) return false;
  const r = Math.abs(G.hw * Math.cos(G.a)) + Math.abs(G.hh * Math.sin(G.a)), q = Math.abs(G.hw * Math.sin(G.a)) + Math.abs(G.hh * Math.cos(G.a));
  return G.cx + r > 0 && G.cx - r < W && G.cy + q > 0 && G.cy - q < H;
}
// what each visible layer draws this frame: clips as drawn (automation + fade applied), invisible ones dropped
function frameList(now, ls = layers, gifs = null){
  const out = [];
  for (const L of ls){
    if (!L.on || L.opacity <= 0) continue;
    const items = [];
    for (const c of L.clips){
      const g = gifs ? gifs[c.pad] : pads[c.pad].gif; if (!g) continue;
      const e = effClip(c, g); if (!(e.alpha > 0)) continue;
      items.push({ g, e, fi: frameIndex(c, g, now) });
    }
    out.push({ L, items });
  }
  return out;
}
// "did anything that changes the picture change since last frame?": the values are compared one by one with last
// frame's (two arrays, reused), so the per-frame check builds no string
function sigTracker(){
  let prev = [], cur = [], n = 0;
  return {
    start(){ n = 0; },
    add(x){ cur[n++] = x; },
    forget(){ prev.length = 0; },                    // the next check reports a change
    changed(){
      cur.length = n; let same = n === prev.length;
      for (let i = 0; same && i < n; i++){ const a = cur[i], b = prev[i]; if (a !== b && !(a !== a && b !== b)) same = false; }   // (NaN counts as equal)
      const t = prev; prev = cur; cur = t; return !same;
    },
  };
}
const sceneSig = sigTracker(), overlaySig = sigTracker();
// the picture: frozen / black, and each visible layer and GIF as drawn
function sceneChanged(list, frozen, black){
  const S = sceneSig; S.start(); S.add(frozen); S.add(black);
  if (!frozen) for (const { L, items } of list){
    S.add('|'); S.add(L.i); S.add(L.opacity); S.add(L.blend); S.add(L.fillOn && L.fill);
    for (const { g, e, fi } of items){ S.add(';'); S.add(e.id); S.add(fi); S.add(g.fxVer); S.add(g.crisp); S.add(e.x); S.add(e.y); S.add(e.sx); S.add(e.sy); S.add(e.rot); S.add(e.fit);
      S.add(e.flipX); S.add(e.flipY); S.add(e.tile); S.add(e.cl); S.add(e.ct); S.add(e.cr); S.add(e.cb); S.add(e.alpha); S.add(e.H); S.add(e.S); S.add(e.V); }
  }
  return S.changed();
}
function render(list, ctx, slot0, LUs, zoomE = 0){
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  for (let { L, items } of list){
    const LU = post && LUs[L.i];
    const ek = (1 + zoomE) * (1 + (LU && LU.zoomE || 0));   // Zoom › Each: every GIF scaled around its own centre
    if (Math.abs(ek - 1) > 1e-4) items = items.map(it => ({ ...it, e: { ...it.e, sx: it.e.sx * ek, sy: it.e.sy * ek } }));
    if (L.i === 0 && L.fillOn && L.fill && !LU){       // the Background layer's colour, under its GIFs
      ctx.globalAlpha = L.opacity; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    if (LU){                                         // effects on this layer: flatten it (its colour too), run them, then blend
      const b = lbufs[L.i]; b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
      if (L.i === 0 && L.fillOn && L.fill){ b.fillStyle = L.fill; b.fillRect(0, 0, W, H); }
      for (const { g, e, fi } of items) drawClip(b, e, g, fxImage(g, fi, e));
      post.run(LU, b.canvas, b, slot0 + L.i);   // the scene being left (and Prep's preview) keep their own Feedback history
      ctx.save(); ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend; ctx.drawImage(b.canvas, 0, 0); ctx.restore();
      continue;
    }
    const vis = items.filter(it => onScreen(it.e, it.g));
    if (!vis.length) continue;
    ctx.save(); ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend;
    if (vis.length === 1 || (L.blend === 'source-over' && L.opacity >= 1)){
      // one GIF, or Normal at full opacity: identical result drawn straight onto the target (no buffer clear + composite)
      for (const { g, e, fi } of vis) drawClip(ctx, e, g, fxImage(g, fi, e));
    } else {                                       // several: flatten into the layer buffer, then blend once
      const b = lbufs[L.i]; b.clearRect(0, 0, W, H);
      for (const { g, e, fi } of vis) drawClip(b, e, g, fxImage(g, fi, e));
      ctx.drawImage(b.canvas, 0, 0);
    }
    ctx.restore();
  }
}
// ---------- scene transitions: the scene being left and the new one are each drawn whole, then combined ----------
// transition families, each with its styles (like the effects); a preset = family + style + its settings
const TR_TYPES = [['cut', 'Cut'], ['fade', 'Fade'], ['slide', 'Slide'], ['wipe', 'Wipe'], ['zoom', 'Zoom'], ['dissolve', 'Dissolve'], ['glitch', 'Glitch'], ['stutter', 'Stutter']];
const TR_STYLES = {
  stutter: [['ramp', 'Ramp', 'Cuts back and forth between the scenes on the beat grid, faster and faster (1/8, 1/16, 1/32), landing on the new one'], ['even', 'Even', 'Cuts back and forth every 1/16 note, landing on the new one']],
  fade: [['cross', 'Cross', 'One scene fades into the other'], ['dip', 'Dip', 'Through black'], ['flash', 'Flash', 'Through white'], ['luma', 'Luma', 'The new scene shows through the brightest parts first']],
  wipe: [['line', 'Line', 'A straight edge sweeps across (Direction)'], ['iris', 'Iris', 'A circle opens from the centre']],
  dissolve: [['blocks', 'Blocks', 'Blocks of the new scene appear in random order (Pixel = block size)'], ['pixelate', 'Pixelate', 'The old scene breaks into blocks, the new one resolves out of them (Pixel = biggest block)']],
  glitch: [['slices', 'Slices', 'Torn horizontal slices from both scenes, settling on the new one (Pixel = slice height)'], ['blocks', 'Blocks', 'Shuffled, displaced blocks of both scenes, settling on the new one (Pixel = block size)'],
           ['melt', 'Melt', 'The old scene drips down in columns, as in Doom (Pixel = column width)'], ['scramble', 'Scramble', 'Pixelates, scrambles the colours into the new scene, then resolves (Pixel = biggest block)'],
           ['vhs', 'VHS', 'A tape switching channels: the picture tears up and dissolves into snow, the new scene comes out of it']] };
const trStyleOf = T => { const st = TR_STYLES[T.type]; return st ? (st.some(x => x[0] === T.style) ? T.style : st[0][0]) : ''; };
// a preset made valid: a known type and style, a block size
function normTrans(P){
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
  { type: 'glitch', style: 'slices', len: 1 }, { type: 'glitch', style: 'melt', len: 4, smooth: false }].map(P => normTrans({ dir: 'left', len: 2, smooth: true, px: 12, ...P }));
let trPresets = trDefaults(), trSel = 1, transCfg = trPresets[trSel];
function armTrans(i){ trSel = i; transCfg = trPresets[i]; syncTransUI(); }
let trans = null;   // { cfg, from: layer states, gifs: their pads, b0: start beat, len, melt, free: GIF copies to let go after }
function makeTrans(from, gifs, beat, free = null){
  if (transCfg.type === 'cut') return null;
  return { cfg: { ...transCfg }, from, gifs, b0: beat, len: transCfg.len, free, melt: transCfg.type === 'glitch' && trStyleOf(transCfg) === 'melt' ? meltTable(transCfg.px) : null, dis: transCfg.type === 'dissolve' ? dissolveGrid(transCfg.px || 12) : null };
}
function endTrans(){ if (trans && trans.free) trans.free.forEach(freeGif); if (trans && trans.gifs) dropFxCache(trans.gifs); trans = null; }
// GIFs no longer on screen let go of their kept coloured frames (fxImage)
function dropFxCache(gifs){ gifs.forEach(g => { if (g && g.fxC && !pads.some(p => p.gif === g)) g.fxC = null; }); }
// ---------- Prep: the output keeps playing what's live while you work on any scene ----------
// prep = { layers, gifs, free, fx, scene }: copies of the live scene's layers and clips, of the GIFs they play
// (own settings, same frames) and of the effects' state. Nothing the editor does reaches them.
let prep = null, pendingLive = null;
function startPrep(){
  if (prep) return;
  if (trans){ toast('Wait for the transition to finish'); return; }
  if (hist.ready) commit();
  pendingScene = null;
  const gifs = pads.map(() => null), free = [];
  const used = new Set(layers.flatMap(L => L.clips.map(c => c.pad)));
  pads.forEach((p, k) => { if (p.gif && used.has(k)){ gifs[k] = cloneInst(p.gif); free.push(gifs[k]); } });
  const now = clock.beat, cp = o => JSON.parse(JSON.stringify(o));
  const st = fxSt.map(S => ({ ...S }));
  st.forEach(S => { if (S.held){ S.held = false; S.rel = now; } });   // a key held right now would never be let go on the output
  // a gated fade held open right now (pad still down) is let go on the copy: the editor's release never reaches it
  const gated = c => { const g = pads[c.pad].gif; return c.env && c.env.rel === null && g && g.trig === 'fade' && g.env.gate && !c.env.noGate; };
  prep = { layers: layers.map(L => ({ ...layerState(L), clips: L.clips.map(c => ({ ...c, env: c.env && { ...c.env, rel: gated(c) ? Math.max(now, c.env.t0) : c.env.rel } })) })), gifs, free,
           fx: { cfg: cp(fxCfg), pre: cp(fxPre), st }, scene: sceneIdx };
  syncPrepUI(); renderScenes(); redraw.all = true;
}
// Go live: the scene you're on goes out with the armed transition (on the next beat / bar with Snap)
function goLive(){
  if (!prep) return;
  updateClock(performance.now());                    // the beat right now, not as of the last frame
  const at = snapBeat(clock.beat);
  if (at > clock.beat){ pendingLive = at; syncPrepUI(); return; }
  doGoLive(at);
}
function doGoLive(beat = clock.beat){
  const P = prep; pendingLive = null; if (!P) return;
  prep = null; endTrans();
  const t0 = beatTime(beat);
  if (P.scene !== sceneIdx) layers.forEach(L => L.clips.forEach(c => { c.startBeat = beat; c.startTime = t0; if (c.env) c.env = { ...c.env, t0: beat, from: 0, rel: null }; }));   // another scene starts from the top (fades too)
  trans = makeTrans(P.layers, P.gifs, beat, P.free); if (trans) trans.fx = P.fx;   // the leaving scene keeps the output's own effects while it fades out
  if (!trans) P.free.forEach(freeGif);
  syncPrepUI(); renderScenes(); redraw.all = true;
}
function dropPrep(){ if (!prep) return; prep.free.forEach(freeGif); prep = null; pendingLive = null; syncPrepUI(); }
function syncPrepUI(){
  const b = $('#prepBtn'); if (!b) return;
  b.classList.toggle('on', !!prep); $('#prepLed').classList.toggle('on', !!prep); $('#prepLed').classList.toggle('wait', pendingLive !== null);   // blinks until the beat it goes live on
  $('#prepTag').hidden = !prep;
  document.body.classList.toggle('prepping', !!prep);
}
const trA = mkCanvas().getContext('2d', { alpha: false }), trB = mkCanvas().getContext('2d', { alpha: false }), trM = mkCanvas().getContext('2d');
const TR_PX = [[2, '2 px'], [4, '4 px'], [6, '6 px'], [8, '8 px'], [12, '12 px'], [16, '16 px'], [24, '24 px'], [32, '32 px'], [48, '48 px'], [64, '64 px'], [96, '96 px']];
// Dissolve: a random order for blocks of `px` pixels, made when the transition starts
const pxCv = new OffscreenCanvas(W, H), pxCtx = pxCv.getContext('2d');   // Pixelate: the scene shrunk, then drawn back up blocky
function dissolveGrid(px){
  const w = Math.ceil(W / px), h = Math.ceil(H / px), cv = new OffscreenCanvas(w, h), ctx = cv.getContext('2d');
  return { cv, ctx, img: ctx.createImageData(w, h), noise: new Float32Array(w * h).map(() => Math.random()) };
}
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
const vhsN = {};                                     // the VHS transition's noise canvas
// what each transition type draws into the master canvas: e = progress 0…1 (eased if Smooth), T = the preset,
// A / B = the scene being left / arriving (drawn whole into trA / trB), [dx, dy] = the direction
const TR_DRAW = {
  fade(m, A, B, e, T, dx, dy){ const st = trStyleOf(T);
    if (st === 'dip' || st === 'flash'){          // through black (dip) or white (flash): out, then in
      m.drawImage(e < 0.5 ? A : B, 0, 0); m.fillStyle = st === 'dip' ? '#000' : '#fff';
      m.globalAlpha = e < 0.5 ? e * 2 : (1 - e) * 2; m.fillRect(0, 0, W, H); return; }
    if (st === 'luma' && post){ post.luma(A, B, e); return; }   // the brightest parts of the old scene give way first
    m.drawImage(A, 0, 0); m.globalAlpha = e; m.drawImage(B, 0, 0);
  },
  slide(m, A, B, e, T, dx, dy){ // the new scene pushes the old one out
    m.drawImage(A, dx * e * W, dy * e * H); m.drawImage(B, dx * (e - 1) * W, dy * (e - 1) * H);
  },
  wipe(m, A, B, e, T, dx, dy){ // an edge sweeps across (or a circle opens), revealing the new scene
    m.drawImage(A, 0, 0); m.save(); m.beginPath();
    if (trStyleOf(T) === 'iris') m.arc(W / 2, H / 2, e * Math.hypot(W, H) / 2, 0, Math.PI * 2);
    else if (dx) m.rect(dx < 0 ? W * (1 - e) : 0, 0, W * e, H); else m.rect(0, dy < 0 ? H * (1 - e) : 0, W, H * e);
    m.clip(); m.drawImage(B, 0, 0); m.restore();
  },
  stutter(m, A, B, e, T, dx, dy){ // hard cuts between the two scenes on the beat grid, ending on the new one
    const L = trans ? trans.len : 4, t = e * L, ramp = trStyleOf(T) !== 'even';
    let step = 0.25, t0 = 0;                         // beats per cut (0.25 = a 1/16 note)
    if (ramp){ if (t < L / 2){ step = 0.5; } else if (t < L * 0.75){ step = 0.25; t0 = L / 2; } else { step = 0.125; t0 = L * 0.75; } }
    const k = Math.floor((t - t0) / step + 1e-6), last = e >= 1 - step / L / 2;
    m.drawImage(last || k % 2 ? B : A, 0, 0);
  },
  zoom(m, A, B, e, T, dx, dy){ // the old scene grows and fades; the new one grows in from smaller
    m.fillStyle = '#000'; m.fillRect(0, 0, W, H);
    const z = (img, k, a) => { m.globalAlpha = a; m.drawImage(img, W / 2 - W * k / 2, H / 2 - H * k / 2, W * k, H * k); };
    z(A, 1 + 0.8 * e, 1 - e); z(B, 0.6 + 0.4 * e, e);
  },
  dissolve(m, A, B, e, T, dx, dy){ // blocks of the new scene appear in random order
    if (trStyleOf(T) === 'pixelate'){              // the old scene breaks into ever bigger blocks, the new one resolves out of them
      const big = Math.max(2, T.px || 48), k = e < 0.5 ? e * 2 : (1 - e) * 2, bs = Math.max(1, Math.round(1 + (big - 1) * k * k));
      const w = Math.ceil(W / bs), h = Math.ceil(H / bs);
      pxCtx.imageSmoothingEnabled = true; pxCtx.clearRect(0, 0, w, h); pxCtx.drawImage(e < 0.5 ? A : B, 0, 0, w, h);
      m.imageSmoothingEnabled = false; m.drawImage(pxCv, 0, 0, w, h, 0, 0, w * bs, h * bs); m.imageSmoothingEnabled = true; return;
    }
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
      return; }
    if (gst === 'scramble'){                       // pixelate up, colours scrambled block by block while the scenes swap, then resolve
      const big = Math.max(4, (T.px || 12) * 4), k = e < 0.5 ? e * 2 : (1 - e) * 2, bs = Math.max(1, Math.round(1 + (big - 1) * k * k));
      const w = Math.ceil(W / bs), h = Math.ceil(H / bs), mixB = Math.min(1, Math.max(0, (e - 0.35) / 0.3));
      pxCtx.imageSmoothingEnabled = true; pxCtx.globalAlpha = 1; pxCtx.clearRect(0, 0, w, h); pxCtx.drawImage(A, 0, 0, w, h);
      if (mixB > 0){ pxCtx.globalAlpha = mixB; pxCtx.drawImage(B, 0, 0, w, h); pxCtx.globalAlpha = 1; }
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
    if (gst === 'vhs'){                            // a tape switching channels: the picture tears up, dissolves into snow, and the new one comes out of it
      const k = Math.sin(Math.PI * e), src = e < 0.5 ? A : B, t = performance.now() / 1000;
      const nz = Math.min(1, Math.max(0, 1 - Math.abs(e - 0.5) / 0.3)) ** 1.5;   // snow: none at the ends, all of it around the middle
      // tracking lost: two bands rolling down at different speeds, torn sideways, where most dropouts happen
      const bands = [[((t * 0.35 + e * 0.8) % 1.3 - 0.15) * H, H * 0.16], [((t * 0.61 + 0.5 + e * 1.3) % 1.3 - 0.15) * H, H * 0.05]];
      const fr = Math.floor(t * 30), flag = H * 0.09, head = H * 0.95;
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
  },
  cut(m, A, B, e, T, dx, dy){ m.drawImage(B, 0, 0);
  },
};
function composeTransition(e, T){
  const m = mctx; m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
  const A = trA.canvas, B = trB.canvas, [dx, dy] = TR_DIRS[T.dir] || TR_DIRS.left;
  (TR_DRAW[T.type] || TR_DRAW.cut)(m, A, B, e, T, dx, dy);
  m.globalAlpha = 1;
}
// fade one-shot clips that are currently invisible: shown in the preview only, as a dotted ghost of their start frame
const pvOpt = (() => { const o = Prefs.json('vjif-pvopt', {}), r = { guides: o.guides, stick: o.stick !== false, ghosts: o.ghosts !== false, gx: o.gx || 4, gy: o.gy || 4, link: !!o.link, fromC: !!o.fromC, gcol: o.gcol || '#ffffff' };
  if (r.guides === 'thirds'){ r.guides = 'grid'; r.gx = r.gy = 3; } else if (r.guides === 'centre'){ r.guides = 'grid'; r.gx = r.gy = 2; }   // thirds = grid 3×3, centre = 2×2
  if (typeof r.guides !== 'object' || !r.guides){ const g = r.guides; r.guides = {}; if (g) r.guides[g] = true;   // one guide at a time before 0.31; they combine now
  }
  if (r.gx === 1 && r.gy === 1) r.gx = r.gy = 2; return r; })();
// guide lines in output pixels: [xs, ys]
function guideLines(G = pvOpt.guides){   // the straight guides (golden, grid): what a dragged GIF can stick to
  const div = n => Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / n), xs = [], ys = [];
  if (G.grid){ xs.push(...div(pvOpt.gx)); ys.push(...div(pvOpt.gy)); }
  if (G.golden){ xs.push(0.382, 0.618); ys.push(0.382, 0.618); }
  return [xs.map(v => v * W), ys.map(v => v * H)];
}
const anyGuide = () => Object.values(pvOpt.guides).some(Boolean);
function ghostList(){
  const out = []; if (!pvOpt.ghosts) return out;
  for (const L of layers){ if (!L.on) continue; for (const c of L.clips){ const g = pads[c.pad].gif; if (g && g.trig === 'fade' && !(envLevel(c, g, clock.beat) > 0)) out.push([c, g]); } }
  return out;
}
const ghostCv = document.createElement('canvas'), gctx = ghostCv.getContext('2d');
const dither = (() => { const c = new OffscreenCanvas(2, 2), x = c.getContext('2d'); x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1); return gctx.createPattern(c, 'repeat'); })();
function drawGhosts(gh, k, dpr){
  if (ghostCv.width !== pv.width || ghostCv.height !== pv.height){ ghostCv.width = pv.width; ghostCv.height = pv.height; }
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalCompositeOperation = 'source-over'; gctx.globalAlpha = 1;
  gctx.clearRect(0, 0, ghostCv.width, ghostCv.height);
  gctx.setTransform(k, 0, 0, k, view.x * dpr, view.y * dpr);
  for (const [c, g] of gh) drawClip(gctx, Object.assign({}, c, { alpha: 1 }), g, fxImage(g, g.startF));
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalCompositeOperation = 'destination-in';
  gctx.fillStyle = dither; gctx.fillRect(0, 0, ghostCv.width, ghostCv.height);
  pctx.globalAlpha = 0.75; pctx.drawImage(ghostCv, 0, 0); pctx.globalAlpha = 1;
}
function outline(G, k){
  pctx.beginPath();
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a, b], j) => { const [x, y] = toWorld(G, a*G.hw, b*G.hh); j ? pctx.lineTo(x*k, y*k) : pctx.moveTo(x*k, y*k); });
  pctx.closePath(); pctx.stroke();
}
const redraw = { all: true };
const GUIDE_KEYS = ['golden', 'grid', 'safe', 'diag', 'persp'];
// While theme colours are being dragged, the control window skips its preview, overlay, scopes and scene thumbnails
// (every colour change restyles the whole page; those redraws would compete with it). The output is unaffected.
let uiQuiet = 0, quietT = 0;
function quietUI(ms = 250){ uiQuiet = performance.now() + ms; clearTimeout(quietT); quietT = setTimeout(() => { redraw.all = true; }, ms + 20); }