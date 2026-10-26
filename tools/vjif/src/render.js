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
// a frame's pixels, read back once and kept (a GIF frame lives on the GPU: each read is a full stall, so reading one pixel at a
// time froze the UI when a click tested dozens of points over overlapping GIFs; 0.87.1)
const framePx = new Map(), probe = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
// 0.98: kept up to FRAMEPX_BYTES, oldest read dropped first (before, every frame ever clicked on kept its full-size copy
// for as long as its GIF was loaded: a few clicks around a big GIF could hold hundreds of MB)
const FRAMEPX_BYTES = 96 * 1048576; let framePxBytes = 0;
function framePixels(img){
  let d = framePx.get(img); if (d){ framePx.delete(img); framePx.set(img, d); return d; }   // (moved to the end: most recent)
  const w = img.width, h = img.height; if (probe.canvas.width !== w || probe.canvas.height !== h){ probe.canvas.width = w; probe.canvas.height = h; } else probe.clearRect(0, 0, w, h);
  probe.drawImage(img, 0, 0); d = probe.getImageData(0, 0, w, h).data; framePx.set(img, d); framePxBytes += d.length;
  for (const [k, v] of framePx) if (k !== img && (!k.width || framePxBytes > FRAMEPX_BYTES)){ framePx.delete(k); framePxBytes -= v.length; }   // (a closed frame reads 0 wide: its GIF was replaced)
  if (w * h > 4e6){ probe.canvas.width = probe.canvas.height = 1; }   // don't keep a huge scratch canvas around
  return d;
}
// picking and hovering: a small copy of each frame (at most PICK_PX on its long side), read back once and kept with the
// frame, so once a GIF has played a loop under the pointer, hovering reads nothing back from the GPU (0.98; before, the
// whole frame was read again every 250 ms while the pointer moved). A GIF's frame not read yet: at most one read per
// 250 ms per GIF, the last copy standing in meanwhile
const PICK_PX = 160, pickPx = new WeakMap(), pickLast = new WeakMap(), pickCv = new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
function pickPixels(g, img){
  let P = pickPx.get(img); if (P) return P;
  const L = pickLast.get(g), now = performance.now();
  if (L && now - L.t < 250) return L.P;
  const k = Math.min(1, PICK_PX / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  if (pickCv.canvas.width !== w || pickCv.canvas.height !== h){ pickCv.canvas.width = w; pickCv.canvas.height = h; } else pickCv.clearRect(0, 0, w, h);
  pickCv.drawImage(img, 0, 0, w, h); P = { d: pickCv.getImageData(0, 0, w, h).data, w, h };
  pickPx.set(img, P); pickLast.set(g, { P, t: now }); return P;
}
function sampleClip(c, px, py, src = false, pick = false){
  const g = pads[c.pad].gif, G = clipGeom(c), [lx, ly] = toLocal(G, px, py);
  const u = (lx + G.ox) / (c.sx * (c.flipX ? -1 : 1) * G.fbw) + 0.5, v = (ly + G.oy) / (c.sy * (c.flipY ? -1 : 1) * G.fbh) + 0.5;
  const fi = frameIndex(c, g, performance.now()), img = (src ? g.src : g.frames)[fi];
  const P = pick ? pickPixels(g, img) : { d: framePixels(img), w: img.width, h: img.height };
  const ix = clamp(Math.floor(u * P.w), 0, P.w - 1), iy = clamp(Math.floor(v * P.h), 0, P.h - 1), o = (iy * P.w + ix) * 4, d = P.d.slice(o, o + 4);
  if (!src && liveFx() && g.frames === g.src && g.key.on && d[3]){   // apply the key to this one pixel
    const mi = clamp(Math.floor(v * img.height), 0, img.height - 1) * img.width + clamp(Math.floor(u * img.width), 0, img.width - 1);
    const f = g.key.region !== 'all' ? (g.masks ? g.masks[fi][mi] : 255) : (fxColor(d[0] | (d[1] << 8) | (d[2] << 16), fxParams(g)) / 16777216) | 0;
    d[3] = (d[3] * f / 255) | 0;
  }
  d.u = clamp(u, 0, 1); d.v = clamp(v, 0, 1);         // where in the frame (0..1), for the key's seed point
  return d;
}
// everything under the point, in visual order (topmost first); transparent pixels don't count
function hitsAt(px, py, opaqueOnly = true, locked = false){   // locked: a locked layer's GIFs count too (the colour picker); else the mouse goes through them
  const out = [];
  for (let li = 3; li >= 0; li--){
    const L = layers[li]; if (!L.on || L.opacity <= 0 || (L.lock && !locked)) continue;
    for (let k = L.clips.length - 1; k >= 0; k--){
      const c = L.clips[k], e = liveClip(c);   // its box where you edit it, or the picture where automation shows it now
      if ((inClip(c, px, py) || (e !== c && inClip(e, px, py))) && (!opaqueOnly || sampleClip(e, px, py)[3] > 16)) out.push([li, c]);
    }
  }
  return out;
}
// the clip as it shows this moment: Auto's position / size / turn applied (the same as frameList draws it); c itself when nothing moves it
function liveClip(c){ const g = pads[c.pad] && pads[c.pad].gif; return g ? effClip(c, g) : c; }
function hitAny(px, py){ return hitsAt(px, py)[0] || null; }
// ---- picking a GIF in the preview (0.89.5) ----
// how much of the GIF shows at this point, 0..1: its pixel's alpha × its opacity now (Auto, fade) × its layer's opacity,
// and for a lightening / darkening blend how much it changes what's below (black adds nothing to Add or Screen); a mask
// layer's GIFs show nothing themselves
function visAt(li, c, px, py){
  const e = liveClip(c), L = layers[li]; if (!inClip(e, px, py) || MASK_BLENDS.has(L.blend)) return 0;
  const d = sampleClip(e, px, py, false, true); let v = d[3] / 255 * clamp(e.alpha ?? 1, 0, 1) * L.opacity;
  const hi = Math.max(d[0], d[1], d[2]) / 255, lo = Math.min(d[0], d[1], d[2]) / 255;
  if (L.blend === 'lighter' || L.blend === 'screen' || L.blend === 'lighten') v *= hi; else if (L.blend === 'multiply' || L.blend === 'darken') v *= 1 - lo;
  return v;
}
// every GIF under the pointer (its box, or where Auto shows it), best first: the one you see there (most of the colour at
// that point, counting what covers it), else the one whose visible pixels are closest (rings out to 64 screen px)
function rankAt(px, py){
  const all = hitsAt(px, py, false).filter(h => !pvOpt.pickLayer || h[0] === target); if (!all.length) return [];   // This layer only (the preview bar's toggle)
  let left = 1; const T = 0.06;
  const rows = all.map(([li, c], i) => { const v = visAt(li, c, px, py), own = v * left; if (v > 0 && !MASK_BLENDS.has(layers[li].blend) && ['source-over', 'overlay', 'difference', 'exclusion'].includes(layers[li].blend)) left *= 1 - v;
    let r = v > T ? 0 : 1e3;
    if (r){ outer: for (const q of [4, 8, 16, 32, 64]){ const R = q * W / view.w; for (let k = 0; k < 12; k++){ const a = k * Math.PI / 6; if (visAt(li, c, px + Math.cos(a) * R, py + Math.sin(a) * R) > T){ r = q; break outer; } } } }
    return { h: [li, c], r, own, i }; });
  return rows.sort((a, b) => a.r - b.r || b.own - a.own || a.i - b.i).map(x => x.h);
}
// what a press takes: the selected GIF while the pointer is on it (its box or its picture), else the best under the pointer
function pickClip(px, py){
  const c = editSel(); if (c && (inClip(c, px, py) || inClip(liveClip(c), px, py))) return [target, c];
  return rankAt(px, py)[0] || null;
}
// a click without moving on the selected GIF: the next one under the pointer
function nextPick(px, py, c){ const R = rankAt(px, py); if (R.length < 2) return null; const i = R.findIndex(h => h[1] === c); return R[(i + 1) % R.length]; }
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
const tileCv = document.createElement('canvas'), tileX = tileCv.getContext('2d');   // a cropped GIF's tile
// a soft-cropped shadow is drawn apart first, then faded in at its top: one scratch canvas per target canvas, of the same kind
// (a CPU canvas for the CPU thumbnails: drawing a GPU canvas into one would wait for a read-back)
const shScratch = new WeakMap();
function shadowScratch(ctx){
  const t = ctx.canvas, cw = t.width, ch = t.height; let s = shScratch.get(t);
  if (!s){ const cpu = ctx.getContextAttributes && ctx.getContextAttributes().willReadFrequently;
    if (cpu) { const [c, x] = cpuCanvas(cw, ch); s = { c, x }; } else { const c = document.createElement('canvas'); c.width = cw; c.height = ch; s = { c, x: c.getContext('2d') }; }
    shScratch.set(t, s); }
  if (s.c.width !== cw || s.c.height !== ch){ s.c.width = cw; s.c.height = ch; }
  return s;
}
const hexA = (h, a) => `rgba(${hex2rgb(h).join(',')},${a})`;
// a GIF with its own effects (GIF › FX, 0.97): drawn alone into a scratch buffer, the effects run on that, then the buffer is
// drawn where the GIF would have been (with the target's opacity / blend state, as drawClip would). One history slot per
// GIF on screen this frame (Codec / Phosphor keep a trail).
let gfxSlot = 0; const gfxBufs = [];
function drawClipFx(ctx, c, g, img){
  if (!post || !gfxOn(g)){ drawClip(ctx, c, g, img); return; }
  let U = gfxU(g, clock.beat); if (!U){ drawClip(ctx, c, g, img); return; }
  if (U.zoom || U.zoomE){ const k = Math.max(0.05, 1 + U.zoom + U.zoomE); c = { ...c, sx: c.sx * k, sy: c.sy * k }; U = { ...U, zoom: 0, zoomE: 0 }; }   // Zoom on a GIF: around its own centre (0.99.27)
  const k = gfxSlot++, b = gfxBufs[k] || (gfxBufs[k] = mkCanvas().getContext('2d'));
  if (b.canvas.width !== CW || b.canvas.height !== CH){ b.canvas.width = CW; b.canvas.height = CH; }
  b.setTransform(RS, 0, 0, RS, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
  drawClip(b, c, g, img); post.run(U, b.canvas, b, 40 + (k % 24));
  ctx.drawImage(b.canvas, 0, 0, W, H);             // (the target's transform maps the canvas, as for a layer buffer)
}
function drawClip(ctx, c, g, img){
  const [bw, bh] = baseSize(g, c.fit), T0 = ctx.getTransform(), base = c.tile ? T0 : null, dk = Math.hypot(T0.a, T0.b) || 1;   // dk: canvas units → device pixels
  ctx.save(); ctx.globalAlpha *= (c.alpha ?? 1); applyXf(ctx, c);
  ctx.imageSmoothingEnabled = !g.crisp;
  const S = g.shadow, shOn = S && S.on && !c.tile && S.op > 0;
  let ox = S ? S.x : 0, oy = S ? S.y : 0; if (shOn && S.turn && c.rot){ const r = c.rot * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r); [ox, oy] = [ox * cs - oy * sn, ox * sn + oy * cs]; }   // Turn: the offset turns with the GIF   // drop shadow: offsets are in output pixels (the light doesn't turn with the GIF)
  const sk = shOn ? S.skew || 0 : 0;   // Skew (0.96): the shadow slanted from the GIF's bottom edge
  const fl = shOn && !!S.floor, sc = shOn ? S.scale ?? 1 : 1;   // Scale (0.99.16): the shadow grown / shrunk around the GIF's centre   // Floor (0.99.5): flipped down from the bottom edge, onto the ground in front
  if (shOn && (S.cut > 0 || sk || fl || sc !== 1)){                            // cropped: the shadow alone first (its GIF drawn far off, the offset bringing the shadow back), clipped, then the GIF without one
    const M = ctx.getTransform(), I = M.inverse(), vx = ox * dk, vy = oy * dk, OFF = 1e5;
    // where the cut runs: Turn on, across the GIF's own up / down; Turn off, level on screen across the GIF's outline as it stands
    // (so a turned GIF's shadow still only shows at its bottom: it sits on the layer)
    let y0, sb, scr = !S.turn;
    if (scr){ const ys = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => M.b * u * bw / 2 + M.d * v * bh / 2 + M.f), top = Math.min(...ys), hh = Math.max(...ys) - top;
      y0 = top + S.cut * hh + vy; sb = (S.soft ?? 0) * hh; }
    else { const ly = I.b * vx + I.d * vy; y0 = -bh/2 + S.cut * bh + ly; sb = (S.soft ?? 0) * bh; }
    const shadowOnly = x => { x.shadowColor = hexA(S.col, S.op); x.shadowBlur = S.blur * dk; x.shadowOffsetX = vx - M.a * OFF * sc; x.shadowOffsetY = vy - M.b * OFF * sc;
      if (sc !== 1) x.scale(sc, sc);
      if (sk || fl){ x.translate(0, bh / 2); if (sk) x.transform(1, 0, -sk, 1, 0, 0); if (fl) x.scale(1, -1); x.translate(0, -bh / 2); }   // (a shear keeps the first column: the far-off trick's offset still lands)
      x.translate(OFF, 0); drawPlain(x, c, img, bw, bh); };
    if (!(S.cut > 0)){ ctx.save(); shadowOnly(ctx); ctx.restore(); }   // skewed or on the floor, not cropped
    else if (sb > 0){                                     // soft: drawn apart, faded in across the cut line, then put down like the shadow would be
      const { c: shCv, x: shX } = shadowScratch(ctx), cw = shCv.width, ch = shCv.height;
      shX.save(); shX.setTransform(1, 0, 0, 1, 0, 0); shX.globalCompositeOperation = 'source-over'; shX.globalAlpha = 1; shX.clearRect(0, 0, cw, ch);
      shX.setTransform(M); shX.imageSmoothingEnabled = !g.crisp; shX.save(); shadowOnly(shX); shX.restore();
      if (scr) shX.setTransform(1, 0, 0, 1, 0, 0);
      const gr = shX.createLinearGradient(0, y0 - sb / 2, 0, y0 + sb / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000');
      shX.globalCompositeOperation = 'destination-in'; shX.fillStyle = gr; shX.fillRect(-OFF, -OFF, 2 * OFF, 2 * OFF); shX.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(shCv, 0, 0); ctx.restore();
    } else { ctx.save(); if (scr) ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(-OFF, y0, 2 * OFF, 2 * OFF); ctx.clip(); ctx.setTransform(M); shadowOnly(ctx); ctx.restore(); }
  } else if (shOn){ ctx.shadowColor = hexA(S.col, S.op); ctx.shadowBlur = S.blur * dk; ctx.shadowOffsetX = ox * dk; ctx.shadowOffsetY = oy * dk; }
  if (c.tile){
    // fill exactly the frame, with the clip's whole transform folded into the pattern; a crop tiles the cropped part
    const cr = c.cl || c.ct || c.cr || c.cb, sw = 1 - c.cl - c.cr, sh = 1 - c.ct - c.cb;
    let src = img; if (cr){ const w = Math.max(1, Math.round(sw * img.width)), h = Math.max(1, Math.round(sh * img.height));
      if (tileCv.width !== w || tileCv.height !== h){ tileCv.width = w; tileCv.height = h; } tileX.clearRect(0, 0, w, h); tileX.imageSmoothingEnabled = !g.crisp;
      tileX.drawImage(img, c.cl * img.width, c.ct * img.height, sw * img.width, sh * img.height, 0, 0, w, h); src = tileCv; }
    const pat = ctx.createPattern(src, 'repeat');
    pat.setTransform(new DOMMatrix().translate(W/2 + c.x, H/2 + c.y).rotate(c.rot)
      .scale(c.sx * (c.flipX ? -1 : 1), c.sy * (c.flipY ? -1 : 1)).translate(-bw/2 + (cr ? c.cl * bw : 0), -bh/2 + (cr ? c.ct * bh : 0)).scale((cr ? sw * bw : bw) / src.width, (cr ? sh * bh : bh) / src.height));
    ctx.fillStyle = pat; ctx.setTransform(base);
    ctx.fillRect(0, 0, W, H);
  } else {
    drawPlain(ctx, c, img, bw, bh);
    const T = g.media && g.media.text;
    if (T && T.cut && T.marquee){                     // a scrolling cut-out: the matte carries on past the letters, to the frame's edges and beyond
      ctx.fillStyle = T.color || '#000'; ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 2e5); ctx.rect(-bw/2 + 0.5, -bh/2 + 0.5, bw - 1, bh - 1); ctx.fill('evenodd'); }
  }
  ctx.restore();
}
// the GIF in its own box (with its crop), in the clip's local coordinates
function drawPlain(ctx, c, img, bw, bh){
  if (c.cl || c.ct || c.cr || c.cb){ const sw = 1 - c.cl - c.cr, sh = 1 - c.ct - c.cb;
    ctx.drawImage(img, c.cl * img.width, c.ct * img.height, sw * img.width, sh * img.height, -bw/2 + c.cl*bw, -bh/2 + c.ct*bh, sw*bw, sh*bh); }
  else ctx.drawImage(img, -bw/2, -bh/2, bw, bh);
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
// Bypass FX GIFs, drawn after the effects: each layer's are cut where the layers above it cover them (0.99.5: a Foreground GIF
// with Bypass FX was drawn over Overlay). The cover is the upper layers' GIFs as plain shapes (no effects, blends as Normal;
// mask layers don't cover), so it's close, not exact, where an upper layer blends or has effects that move it
function drawBypass(noFx, main, ctx){
  const XF = [RS, 0, 0, RS, 0, 0];
  for (const B of noFx){
    const up = main.filter(it => it.L.i > B.L.i && it.items.length && !MASK_BLENDS.has(it.L.blend)).map(it => ({ L: { ...it.L, blend: 'source-over', fillOn: false }, items: it.items }));
    if (!up.length){ render([B], ctx, SLOT.LAYERS, [], 0, XF, true); continue; }
    const b = byBuf, o = occBuf; for (const x of [b, o]){ x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, x.canvas.width, x.canvas.height); }
    render([B], b, SLOT.LAYERS, [], 0, XF, true); render(up, o, SLOT.LAYERS, [], 0, XF, true);
    b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'destination-out'; b.drawImage(o.canvas, 0, 0); b.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(b.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore();
  }
}
// Bypass FX: those GIFs leave the list (and its effects); they're drawn afterwards on top, layer by layer (no fill)
function splitNoFx(list){
  let by = null;
  for (const it of list) if (it.items.some(x => x.g.nofx)){ by = []; break; }
  if (!by) return [list, null];
  const main = list.map(({ L, items }) => { const b = items.filter(x => x.g.nofx); if (b.length) by.push({ L, items: b }); return { L, items: items.filter(x => !x.g.nofx) }; });
  return [main, by];
}
const sceneSig = sigTracker(), overlaySig = sigTracker(), prepOutSig = sigTracker(), prepEdSig = sigTracker();   // (Prep: the output and the editor's picture, each its own)
// the picture: frozen / black, and each visible layer and GIF as drawn
// an object's settings as one string, made once per object (0.97: shadows and GIF effects are replaced, never edited in place,
// so a new setting is a new object; the string was rebuilt for every GIF on every frame)
const objSigs = new WeakMap(), objSig = o => { let s = objSigs.get(o); if (s === undefined){ s = JSON.stringify(o); objSigs.set(o, s); } return s; };
function sceneChanged(list, frozen, black, S = sceneSig){
  S.start(); S.add(frozen); S.add(black);
  if (!frozen) for (const { L, items } of list){
    S.add('|'); S.add(L.i); S.add(L.opacity); S.add(L.blend); S.add(L.fillOn && L.fill); S.add(L.mask && L.mask.on ? L.mask.mid + (L.mask.inv ? 'i' : '') : 0); S.add(maskRev);
    for (const { g, e, fi } of items){ S.add(';'); S.add(e.id); S.add(fi); S.add(g.fxVer); S.add(g.crisp); S.add(!!g.nofx); if (g.gfx) S.add(objSig(g.gfx)); S.add(e.x); S.add(e.y); S.add(e.sx); S.add(e.sy); S.add(e.rot); S.add(e.fit); if (g.shadow && g.shadow.on) S.add(objSig(g.shadow));
      S.add(e.flipX); S.add(e.flipY); S.add(e.tile); S.add(e.cl); S.add(e.ct); S.add(e.cr); S.add(e.cb); S.add(e.alpha); S.add(e.blend); S.add(e.mask && e.mask.on ? e.mask.mid + (e.mask.inv ? 'i' : '') : 0); S.add(e.H); S.add(e.S); S.add(e.V); }
  }
  return S.changed();
}
// xf: the context's transform from canvas pixels (W×H) to its real pixels (default: the render size)
function render(list, ctx, slot0, LUs, zoomE = 0, xf = [RS, 0, 0, RS, 0, 0], over = false){   // over: drawn on top of what's there (Bypass FX)
  if (!over) gfxSlot = 0;
  ctx.setTransform(...xf); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  if (!over){ ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
  let masked = false;
  for (let { L, items } of list){
    if (MASK_BLENDS.has(L.blend)) masked = true;
    const sub = items.some(it => (it.e.blend && it.e.blend !== 'source-over') || (L.i === BG_LAYER && it.e.mask && it.e.mask.on));   // Background's GIFs as sublayers, each with its own blend (0.94) and mask (0.99.4)
    const drawAll = (t, its) => { for (const { g, e, fi } of its){ if (sub) t.globalCompositeOperation = e.blend || 'source-over';
        if (sub && e.mask && e.mask.on){ const m = cmbuf; m.setTransform(RS, 0, 0, RS, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);   // its own mask: cut alone, so what's under it shows through
          drawClipFx(m, e, g, fxImage(g, fi, e)); applyMask(m, e.mask); t.save(); t.setTransform(1, 0, 0, 1, 0, 0); t.drawImage(m.canvas, 0, 0); t.restore(); }
        else drawClipFx(t, e, g, fxImage(g, fi, e)); } if (sub) t.globalCompositeOperation = 'source-over'; };
    const LU = post && LUs[L.i];
    const ek = (1 + zoomE) * (1 + (LU && LU.zoomE || 0));   // Zoom › Each: every GIF scaled around its own centre
    if (Math.abs(ek - 1) > 1e-4) items = items.map(it => ({ ...it, e: { ...it.e, sx: it.e.sx * ek, sy: it.e.sy * ek } }));
    const MK = L.mask && L.mask.on ? L.mask : null;   // a painted mask: the layer is flattened first, then the mask cuts it
    if (L.i === 0 && L.fillOn && L.fill && !LU && !MK && !over && !sub){   // the Background layer's colour, under its GIFs
      ctx.globalAlpha = L.opacity; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    if (LU){                                         // effects on this layer: flatten it (its colour too), run them, then blend
      const b = lbufs[L.i]; b.setTransform(RS, 0, 0, RS, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
      if (L.i === 0 && L.fillOn && L.fill){ b.fillStyle = L.fill; b.fillRect(0, 0, W, H); }
      drawAll(b, items);
      post.run(LU, b.canvas, b, slot0 + L.i);   // the scene being left (and Prep's preview) keep their own Feedback history
      if (MK) applyMask(b, MK);
      ctx.save(); ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend; ctx.drawImage(b.canvas, 0, 0, W, H); ctx.restore();
      continue;
    }
    const vis = items.filter(it => onScreen(it.e, it.g));
    if (!vis.length && sub && L.i === BG_LAYER && L.fillOn && L.fill && !over && !MK){ ctx.globalAlpha = L.opacity; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; continue; }
    if (!vis.length && !(MK && L.i === 0 && L.fillOn && L.fill && !over)) continue;
    ctx.save(); ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend;
    if (MK){                                       // masked: flatten (the Background's colour too), cut, then blend once
      const b = lbufs[L.i]; b.setTransform(RS, 0, 0, RS, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
      if (L.i === 0 && L.fillOn && L.fill && !over){ b.fillStyle = L.fill; b.fillRect(0, 0, W, H); }
      drawAll(b, vis);
      applyMask(b, MK); ctx.drawImage(b.canvas, 0, 0, W, H);
    } else if (sub && L.blend === 'source-over' && (L.opacity >= 1 || vis.length === 1) && !vis.some(it => it.e.mask && it.e.mask.on) && !(L.i === BG_LAYER && L.fillOn && L.fill && !over)){
      // GIFs with their own blend on a plain layer (Normal, full opacity): each blends with everything under it on screen,
      // the GIFs below it on its layer and the layers below (0.99.26 did it for a lone GIF; 0.99.27 for all, BG-059)
      for (const { g, e, fi } of vis){ ctx.globalCompositeOperation = e.blend || 'source-over'; drawClipFx(ctx, e, g, fxImage(g, fi, e)); }
    } else if (!sub && ((vis.length === 1 && !MASK_BLENDS.has(L.blend)) || (L.blend === 'source-over' && L.opacity >= 1))){   // (a mask is always flattened first: each draw of a GIF, its shadow, its tiles, would cut on its own)
      // one GIF, or Normal at full opacity: identical result drawn straight onto the target (no buffer clear + composite)
      for (const { g, e, fi } of vis) drawClipFx(ctx, e, g, fxImage(g, fi, e));
    } else {                                       // several: flatten into the layer buffer, then blend once
      const b = lbufs[L.i]; b.setTransform(RS, 0, 0, RS, 0, 0); b.clearRect(0, 0, W, H);
      if (sub && L.i === BG_LAYER && L.fillOn && L.fill && !over){ b.fillStyle = L.fill; b.fillRect(0, 0, W, H); }   // the GIFs blend with the colour too
      drawAll(b, vis);
      ctx.drawImage(b.canvas, 0, 0, W, H);
    }
    ctx.restore();
  }
  if (masked && !over){ ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); }   // the holes a mask cut show black
}
