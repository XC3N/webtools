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
function hitsAt(px, py, opaqueOnly = true, locked = false){   // locked: a locked layer's GIFs count too (the colour picker); else the mouse goes through them
  const out = [];
  for (let li = 3; li >= 0; li--){
    const L = layers[li]; if (!L.on || L.opacity <= 0 || (L.lock && !locked)) continue;
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
function drawClip(ctx, c, g, img){
  const [bw, bh] = baseSize(g, c.fit), T0 = ctx.getTransform(), base = c.tile ? T0 : null, dk = Math.hypot(T0.a, T0.b) || 1;   // dk: canvas units → device pixels
  ctx.save(); ctx.globalAlpha *= (c.alpha ?? 1); applyXf(ctx, c);
  ctx.imageSmoothingEnabled = !g.crisp;
  const S = g.shadow, shOn = S && S.on && !c.tile && S.op > 0;   // drop shadow: offsets are in output pixels (the light doesn't turn with the GIF)
  if (shOn && S.cut > 0){                            // cropped: the shadow alone first (its GIF drawn far off, the offset bringing the shadow back), clipped, then the GIF without one
    const M = ctx.getTransform(), I = M.inverse(), vx = S.x * dk, vy = S.y * dk, ly = I.b * vx + I.d * vy, OFF = 1e5, y0 = -bh/2 + S.cut * bh + ly, sb = (S.soft ?? 0) * bh;
    const shadowOnly = x => { x.shadowColor = hexA(S.col, S.op); x.shadowBlur = S.blur * dk; x.shadowOffsetX = vx - M.a * OFF; x.shadowOffsetY = vy - M.b * OFF; x.translate(OFF, 0); drawPlain(x, c, img, bw, bh); };
    if (sb > 0){                                     // soft: drawn apart, faded in across the cut line (in the GIF's own up / down), then put down like the shadow would be
      const { c: shCv, x: shX } = shadowScratch(ctx), cw = shCv.width, ch = shCv.height;
      shX.save(); shX.setTransform(1, 0, 0, 1, 0, 0); shX.globalCompositeOperation = 'source-over'; shX.globalAlpha = 1; shX.clearRect(0, 0, cw, ch);
      shX.setTransform(M); shX.imageSmoothingEnabled = !g.crisp; shX.save(); shadowOnly(shX); shX.restore();
      const gr = shX.createLinearGradient(0, y0 - sb / 2, 0, y0 + sb / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, '#000');
      shX.globalCompositeOperation = 'destination-in'; shX.fillStyle = gr; shX.fillRect(-OFF, -OFF, 2 * OFF, 2 * OFF); shX.restore();
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(shCv, 0, 0); ctx.restore();
    } else { ctx.save(); ctx.beginPath(); ctx.rect(-OFF, y0, 2 * OFF, 2 * OFF); ctx.clip(); shadowOnly(ctx); ctx.restore(); }
  } else if (shOn){ ctx.shadowColor = hexA(S.col, S.op); ctx.shadowBlur = S.blur * dk; ctx.shadowOffsetX = S.x * dk; ctx.shadowOffsetY = S.y * dk; }
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
const sceneSig = sigTracker(), overlaySig = sigTracker(), prepOutSig = sigTracker(), prepEdSig = sigTracker();   // (Prep: the output and the editor's picture, each its own)
// the picture: frozen / black, and each visible layer and GIF as drawn
function sceneChanged(list, frozen, black, S = sceneSig){
  S.start(); S.add(frozen); S.add(black);
  if (!frozen) for (const { L, items } of list){
    S.add('|'); S.add(L.i); S.add(L.opacity); S.add(L.blend); S.add(L.fillOn && L.fill);
    for (const { g, e, fi } of items){ S.add(';'); S.add(e.id); S.add(fi); S.add(g.fxVer); S.add(g.crisp); S.add(e.x); S.add(e.y); S.add(e.sx); S.add(e.sy); S.add(e.rot); S.add(e.fit); if (g.shadow && g.shadow.on) S.add(JSON.stringify(g.shadow));
      S.add(e.flipX); S.add(e.flipY); S.add(e.tile); S.add(e.cl); S.add(e.ct); S.add(e.cr); S.add(e.cb); S.add(e.alpha); S.add(e.H); S.add(e.S); S.add(e.V); }
  }
  return S.changed();
}
// xf: the context's transform from canvas pixels (W×H) to its real pixels (default: the render size)
function render(list, ctx, slot0, LUs, zoomE = 0, xf = [RS, 0, 0, RS, 0, 0]){
  ctx.setTransform(...xf); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let masked = false;
  for (let { L, items } of list){
    if (MASK_BLENDS.has(L.blend)) masked = true;
    const LU = post && LUs[L.i];
    const ek = (1 + zoomE) * (1 + (LU && LU.zoomE || 0));   // Zoom › Each: every GIF scaled around its own centre
    if (Math.abs(ek - 1) > 1e-4) items = items.map(it => ({ ...it, e: { ...it.e, sx: it.e.sx * ek, sy: it.e.sy * ek } }));
    if (L.i === 0 && L.fillOn && L.fill && !LU){       // the Background layer's colour, under its GIFs
      ctx.globalAlpha = L.opacity; ctx.fillStyle = L.fill; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
    }
    if (LU){                                         // effects on this layer: flatten it (its colour too), run them, then blend
      const b = lbufs[L.i]; b.setTransform(RS, 0, 0, RS, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
      if (L.i === 0 && L.fillOn && L.fill){ b.fillStyle = L.fill; b.fillRect(0, 0, W, H); }
      for (const { g, e, fi } of items) drawClip(b, e, g, fxImage(g, fi, e));
      post.run(LU, b.canvas, b, slot0 + L.i);   // the scene being left (and Prep's preview) keep their own Feedback history
      ctx.save(); ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend; ctx.drawImage(b.canvas, 0, 0, W, H); ctx.restore();
      continue;
    }
    const vis = items.filter(it => onScreen(it.e, it.g));
    if (!vis.length) continue;
    ctx.save(); ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = L.blend;
    if ((vis.length === 1 && !MASK_BLENDS.has(L.blend)) || (L.blend === 'source-over' && L.opacity >= 1)){   // (a mask is always flattened first: each draw of a GIF, its shadow, its tiles, would cut on its own)
      // one GIF, or Normal at full opacity: identical result drawn straight onto the target (no buffer clear + composite)
      for (const { g, e, fi } of vis) drawClip(ctx, e, g, fxImage(g, fi, e));
    } else {                                       // several: flatten into the layer buffer, then blend once
      const b = lbufs[L.i]; b.setTransform(RS, 0, 0, RS, 0, 0); b.clearRect(0, 0, W, H);
      for (const { g, e, fi } of vis) drawClip(b, e, g, fxImage(g, fi, e));
      ctx.drawImage(b.canvas, 0, 0, W, H);
    }
    ctx.restore();
  }
  if (masked){ ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); }   // the holes a mask cut show black
}
