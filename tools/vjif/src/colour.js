// ---------- colour key and adjustments: live in a WebGL shader at draw time (fallback: a worker pre-processes a second frame set) ----------
// Live colour (key + HSV): each frame goes through a small WebGL shader right when it's drawn, so changes
// show instantly and no second set of frames is kept. Same maths as fxColor/hsvShift below. Falls back to
// pre-processing in the worker when WebGL isn't available.
const fxGL = (() => {
  try {
    const cv = new OffscreenCanvas(1, 1);
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true, depth: false });
    if (!gl) return null;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, `attribute vec2 p; varying vec2 uv; void main(){ uv = vec2(p.x + 1.0, 1.0 - p.y) * 0.5; gl_Position = vec4(p, 0.0, 1.0); }`));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision highp float;
      uniform sampler2D tex, mtex; uniform vec3 key; uniform float t0, t1sq, span, H, S, V; uniform bool doKey, doHsv, useMask; uniform vec3 pal[64]; uniform float palN, palD; uniform vec3 swF[8], swT[8]; uniform float swR[8], swK[8]; uniform int swN; varying vec2 uv;
      void main(){
        vec4 px = texture2D(tex, uv);
        if (px.a == 0.0){ gl_FragColor = vec4(0.0); return; }
        vec3 c = floor(px.rgb * 255.0 + 0.5); float f = 1.0;
        if (doKey && useMask) f = texture2D(mtex, uv).a;          // connected key: per-frame mask from the flood fill
        else if (doKey){ vec3 d = c - key; float dsq = dot(d, d);
          if (dsq < t1sq){ float dist = sqrt(dsq); f = dist <= t0 ? 0.0 : floor((dist - t0) / span * 255.0 + 0.5) / 255.0; } }
        vec3 cs = c;                                   // colour swaps: an exact palette colour becomes another (the key still sees the original)
        for (int i = 0; i < 8; i++){ if (i >= swN) break; vec3 e = abs(c - swF[i]); if (e.r < swR[i] && e.g < swR[i] && e.b < swR[i]){ cs = swT[i]; if (swK[i] > 0.5) f = 0.0; break; } }   // swK: this colour becomes transparent
        vec3 o = cs / 255.0;
        if (doHsv){
          vec3 c = cs;
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b)), d = mx - mn, h = 0.0;
          if (d > 0.0){ h = mx == c.r ? mod((c.g - c.b) / d, 6.0) : mx == c.g ? (c.b - c.r) / d + 2.0 : (c.r - c.g) / d + 4.0; h *= 60.0; }
          h = mod(h + H, 360.0);
          float s = min(1.0, (mx > 0.0 ? d / mx : 0.0) * S), v = min(1.0, mx / 255.0 * V);
          float C = v * s, X = C * (1.0 - abs(mod(h / 60.0, 2.0) - 1.0)), m = v - C;
          vec3 r = h < 60.0 ? vec3(C, X, 0.0) : h < 120.0 ? vec3(X, C, 0.0) : h < 180.0 ? vec3(0.0, C, X) : h < 240.0 ? vec3(0.0, X, C) : h < 300.0 ? vec3(X, 0.0, C) : vec3(C, 0.0, X);
          o = floor((r + m) * 255.0 + 0.5) / 255.0;
        }
        if (palN > 0.5){                               // palette: the nearest of its colours (weighted like the eye); Dither mixes the two nearest in a 4×4 Bayer pattern, on the GIF's own pixels
          vec3 W = vec3(0.55, 0.75, 0.35), best = pal[0], sec = pal[0]; float bd = 1e9, sd = 1e9;
          for (int i = 0; i < 64; i++){ if (float(i) >= palN) break; vec3 d = (o - pal[i]) * W; float e = dot(d, d);
            if (e < bd){ sd = bd; sec = best; bd = e; best = pal[i]; } else if (e < sd){ sd = e; sec = pal[i]; } }
          if (palD > 0.001 && palN > 1.5){ vec3 ab = (sec - best) * W; float t = clamp(dot((o - best) * W, ab) / max(dot(ab, ab), 1e-6), 0.0, 1.0);
            t = clamp((t - 0.5) / palD + 0.5, 0.0, 1.0) * step(0.001, t);
            vec2 q = floor(gl_FragCoord.xy); float b2 = fract(q.x / 2.0 + q.y * q.y * 0.75), b4 = fract(floor(q.x / 2.0) / 2.0 + floor(q.y / 2.0) * floor(q.y / 2.0) * 0.75) * 0.25 + b2;
            o = b4 + 0.03125 < t ? sec : best; } else o = best;
        }
        float a = px.a * f;
        gl_FragColor = vec4(o * a, a);
      }`));
    gl.linkProgram(prog); if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const mkTex = unit => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
      [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]].forEach(([k, v]) => gl.texParameteri(gl.TEXTURE_2D, k, v)); };
    mkTex(1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, 1, 1, 0, gl.ALPHA, gl.UNSIGNED_BYTE, new Uint8Array([255]));
    mkTex(0);                                          // unit 0 (frames) stays active
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);            // mask rows are 1 byte per pixel, any width
    const U = {}; ['key', 't0', 't1sq', 'span', 'H', 'S', 'V', 'doKey', 'doHsv', 'useMask', 'tex', 'mtex', 'swF', 'swT', 'swR', 'swK', 'swN', 'pal', 'palN', 'palD'].forEach(n => U[n] = gl.getUniformLocation(prog, n));
    const swF = new Float32Array(24), swT = new Float32Array(24), swR = new Float32Array(8), swK = new Float32Array(8);
    gl.uniform1i(U.tex, 0); gl.uniform1i(U.mtex, 1);
    let lost = false;
    cv.addEventListener('webglcontextlost', () => { lost = true; });
    return {
      get ok(){ return !lost; },
      // returns a canvas holding the processed frame (valid until the next call)
      render(img, p, mask = null){
        if (cv.width !== img.width || cv.height !== img.height){ cv.width = img.width; cv.height = img.height; }
        gl.viewport(0, 0, cv.width, cv.height);
        if (mask){ gl.activeTexture(gl.TEXTURE1); gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, img.width, img.height, 0, gl.ALPHA, gl.UNSIGNED_BYTE, mask); gl.activeTexture(gl.TEXTURE0); }
        gl.uniform1i(U.useMask, !!mask);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.uniform3f(U.key, p.kr, p.kg, p.kb); gl.uniform1f(U.t0, p.t0); gl.uniform1f(U.t1sq, p.t1sq); gl.uniform1f(U.span, p.span);
        gl.uniform1f(U.H, p.H); gl.uniform1f(U.S, p.S); gl.uniform1f(U.V, p.V); gl.uniform1i(U.doKey, p.doKey); gl.uniform1i(U.doHsv, p.doHsv);
        const sw = p.sw || []; swF.fill(0); swT.fill(0); swR.fill(1.5); swK.fill(0); sw.forEach((x, i) => { swF.set(x.slice(0, 3), i * 3); swT.set(x.slice(3, 6), i * 3); swR[i] = x[6] || 1.5; swK[i] = x[7] ? 1 : 0; });
        if (p.palF){ gl.uniform3fv(U.pal, p.palF); gl.uniform1f(U.palN, p.palN); gl.uniform1f(U.palD, p.palD); } else gl.uniform1f(U.palN, 0);
        gl.uniform3fv(U.swF, swF); gl.uniform3fv(U.swT, swT); gl.uniform1fv(U.swR, swR); gl.uniform1fv(U.swK, swK); gl.uniform1i(U.swN, sw.length);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        return cv;
      },
    };
  } catch (e) { console.warn('live colour (WebGL) unavailable, using pre-processing:', e.message); return null; }
})();
const liveFx = () => fxGL && fxGL.ok;
const SWAP_MAX = 8;                                 // colour swaps per GIF: { from: [r,g,b], to: [r,g,b] }
const fxActive = g => g.key.on || hsvOn(g) || !!(g.swap && g.swap.length) || palOn(g);
const palOn = g => !!g.pal && g.pal.i >= 0 && !!FX_PALS[g.pal.i];   // GIF › Colour › Palette: its colours snapped to an old computer's / console's
// the image to draw for frame `fi` of GIF `g`: run through the colour shader when live colour is on.
// e = the clip as drawn this frame; its H/S/V (from automation) shift the GIF's own colour settings.
// Connected key: the frame's mask (from the flood fill) replaces the per-pixel colour test.
// The result is kept per GIF (two frames' worth: the playing one and the preview / ghost's) until its frame or colour changes: a 10 fps GIF on a 60 Hz screen
// goes through the shader (and is copied back from the GPU) 10 times a second, not 60.
function fxImage(g, fi, e){
  const img = g.frames[fi];
  if (!liveFx() || g.frames !== g.src) return img;
  const auto = e && (e.H !== undefined || e.S !== undefined || e.V !== undefined);
  if (!auto && !fxActive(g)) return img;
  const base = g.fxP || (g.fxP = fxParams(g)), mask = g.key.on && g.key.region !== 'all' && g.masks ? g.masks[fi] : null;
  if (auto){                                         // automated colour changes every frame: nothing worth keeping
    const h = g.hsv.h + (e.H ?? 0), s = g.hsv.s * (e.S ?? 1), v = g.hsv.v * (e.V ?? 1);
    return fxGL.render(img, Object.assign({}, base, { doHsv: h !== 0 || s !== 1 || v !== 1, H: h, S: s, V: v }), mask);
  }
  let C = g.fxC; if (!C || C.p !== base || C.m !== g.masks) C = g.fxC = { p: base, m: g.masks, list: [] };   // new colour settings or masks: start over
  const hit = C.list.find(x => x.k === fi); if (hit) return hit.cv;
  const out = fxGL.render(img, base, mask);
  const ent = C.list.length >= 2 ? C.list.shift() : { cv: new OffscreenCanvas(1, 1) };   // the older slot is reused
  if (!ent.x) ent.x = ent.cv.getContext('2d');
  if (ent.cv.width !== out.width || ent.cv.height !== out.height){ ent.cv.width = out.width; ent.cv.height = out.height; } else ent.x.clearRect(0, 0, out.width, out.height);
  ent.x.drawImage(out, 0, 0); ent.k = fi; C.list.push(ent);
  return ent.cv;
}
function scheduleFx(g, ms){
  if (liveFx()){ applyFx(g); return; }               // live: nothing to wait for
  clearTimeout(g.keyT); g.keyT = setTimeout(() => applyFx(g), ms);
}

const hsvOn = g => g.hsv.h !== 0 || g.hsv.s !== 1 || g.hsv.v !== 1;
// shift a colour in HSV space; returns packed 0xRRGGBB
function hsvShift(r, gr, b, H, S, V){
  const mx = Math.max(r, gr, b), mn = Math.min(r, gr, b), d = mx - mn;
  let h = 0;
  if (d){ h = mx === r ? ((gr - b) / d) % 6 : mx === gr ? (b - r) / d + 2 : (r - gr) / d + 4; h *= 60; }
  h = mod(h + H, 360);
  const s = Math.min(1, (mx ? d / mx : 0) * S), v = Math.min(1, mx / 255 * V);
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
  const [rr, gg, bb] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return (Math.round((rr + m) * 255) << 16) | (Math.round((gg + m) * 255) << 8) | Math.round((bb + m) * 255);
}
const yieldNow = () => (window.scheduler && scheduler.yield) ? scheduler.yield() : new Promise(r => setTimeout(r, 0));
// result for one source colour (0xBBGGRR): alpha factor 0..255 in the top byte, new colour below (same byte order)
function fxColor(c, p){
  const r = c & 255, gr = (c >> 8) & 255, b = c >> 16;
  let f = 255;
  if (p.doKey){ const dr = r - p.kr, dg = gr - p.kg, db = b - p.kb, dsq = dr*dr + dg*dg + db*db;
    if (dsq < p.t1sq){ const dist = Math.sqrt(dsq); f = dist <= p.t0 ? 0 : Math.round(255 * (dist - p.t0) / p.span); } }
  let rgb = c & 0xffffff, sr = r, sg = gr, sb = b;
  if (p.sw) for (const x of p.sw){ const t = x[6] || 1.5; if (Math.abs(r - x[0]) < t && Math.abs(gr - x[1]) < t && Math.abs(b - x[2]) < t){ sr = x[3]; sg = x[4]; sb = x[5]; rgb = sr | (sg << 8) | (sb << 16); if (x[7]) f = 0; break; } }
  if (p.doHsv){ const o = hsvShift(sr, sg, sb, p.H, p.S, p.V); rgb = ((o & 255) << 16) | (o & 0xff00) | (o >> 16); }   // RRGGBB → BBGGRR
  if (p.palN){ const R = (rgb & 255) / 255, G = ((rgb >> 8) & 255) / 255, B = ((rgb >> 16) & 255) / 255; let bd = 1e9, bi = 0;   // palette: the nearest colour (no dither on this path)
    for (let i = 0; i < p.palN; i++){ const dr = (R - p.palF[i * 3]) * 0.55, dg = (G - p.palF[i * 3 + 1]) * 0.75, db = (B - p.palF[i * 3 + 2]) * 0.35, e = dr * dr + dg * dg + db * db; if (e < bd){ bd = e; bi = i; } }
    rgb = Math.round(p.palF[bi * 3] * 255) | (Math.round(p.palF[bi * 3 + 1] * 255) << 8) | (Math.round(p.palF[bi * 3 + 2] * 255) << 16); }
  return f * 16777216 + rgb;
}
// one frame in place: u = Uint32 view of RGBA pixels (0xAABBGGRR). GIFs have few distinct colors and long runs
// of the same one, so each colour is worked out once (cache) and repeats are copied.
// Connected key ("magic wand"): only key-coloured pixels joined to the seed are removed — the frame edges
// (region 'edges') or the picked point (region 'point'). 4-way flood fill through pixels within tolerance + softness
// (and through already-transparent ones). Returns one byte per pixel: 0 = removed … 255 = kept.
function keyMask(u, w, h, p){
  const n = w * h, m = new Uint8Array(n).fill(255), seen = new Uint8Array(n), st = new Int32Array(n);
  const { kr, kg, kb, t0, t1sq, span } = p; let sp = 0;
  const dsq = i => { const px = u[i], r = (px & 255) - kr, g = ((px >> 8) & 255) - kg, b = ((px >> 16) & 255) - kb; return r*r + g*g + b*b; };
  const pass = i => (u[i] >>> 24) === 0 || dsq(i) < t1sq;
  const push = i => { if (!seen[i]){ seen[i] = 1; if (pass(i)) st[sp++] = i; } };
  if (p.region === 'point' && p.seed){
    // the picked point, or the nearest matching pixel within a few px (the subject moves between frames)
    const sx = Math.min(w - 1, Math.max(0, Math.floor(p.seed[0] * w))), sy = Math.min(h - 1, Math.max(0, Math.floor(p.seed[1] * h)));
    for (let r = 0; r <= 6 && !sp; r++) for (let y = Math.max(0, sy - r); y <= Math.min(h - 1, sy + r) && !sp; y++)
      for (let x = Math.max(0, sx - r); x <= Math.min(w - 1, sx + r) && !sp; x++){ const i = y * w + x; if (pass(i)){ seen[i] = 1; st[sp++] = i; } }
  } else {
    for (let x = 0; x < w; x++){ push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++){ push(y * w); push(y * w + w - 1); }
  }
  while (sp){
    const i = st[--sp], x = i % w;
    if (u[i] >>> 24){ const d = Math.sqrt(dsq(i)); m[i] = d <= t0 ? 0 : Math.round(255 * (d - t0) / span); }
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < n - w) push(i + w);
  }
  return m;
}
function fxPixels(u, p, cache, mask = null){
  if (mask) p = Object.assign({}, p, { doKey: false });   // the mask decides alpha; colours still go through HSV
  let lastC = -1, lastV = 0;
  for (let i = 0; i < u.length; i++){
    const px = u[i], al = px >>> 24; if (!al) continue;
    const c = px & 0xffffff;
    if (c !== lastC){ lastC = c; lastV = cache.get(c); if (lastV === undefined){ lastV = fxColor(c, p); cache.set(c, lastV); } }
    const f = mask ? mask[i] : (lastV / 16777216) | 0, na = f === 255 ? al : (al * f / 255) | 0;
    u[i] = (na << 24) | (lastV & 0xffffff);
  }
}
function fxParams(g, hsv = g.hsv){
  const t0 = g.key.tol * KEY_MAX, t1 = t0 + g.key.soft * KEY_MAX + 0.5;
  return { doKey: g.key.on, doHsv: hsv.h !== 0 || hsv.s !== 1 || hsv.v !== 1, kr: g.key.color[0], kg: g.key.color[1], kb: g.key.color[2],
           region: g.key.region || 'all', seed: g.key.seed || null,
           t0, t1sq: t1 * t1, span: t1 - t0, H: hsv.h, S: hsv.s, V: hsv.v, ...(palOn(g) ? { palF: Array.from(FX_PALS[g.pal.i].f), palN: FX_PALS[g.pal.i].c.length, palD: g.pal.d || 0 } : {}), sw: (g.swap || []).slice(0, SWAP_MAX).map(x => [...x.from, ...x.to, x.tol || 1.5, x.clear ? 1 : 0]) };   // tol: how close a pixel must be (covers near-identical colours)
}
// The worker gets the same functions as source text, so both paths run identical code.
const FX_WORKER_SRC = 'const mod = ' + mod.toString() + '\n' + [hsvShift, fxColor, keyMask, fxPixels].map(f => f.toString()).join('\n') + `
const latest = new Map(), pause = () => new Promise(r => setTimeout(r, 0));
// The worker decodes its own copy from the original file, so the main thread never copies frames across.
onmessage = async e => {
  const m = e.data;
  if (m.drop){ latest.delete(m.id); return; }              // the instance is gone: forget it
  latest.set(m.id, m.gen);
  if (!m.blob) return;                                     // a cancel
  const { id, gen, blob, type, n, w, h, p } = m, maskOnly = m.kind === 'mask';
  let dec = null; const out = [];
  try {
    dec = new ImageDecoder({ data: await blob.arrayBuffer(), type });
    await dec.tracks.ready;
    const x = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
    const cache = new Map(); let t = performance.now();
    for (let i = 0; i < n; i++){
      if (latest.get(id) !== gen){ if (!maskOnly) out.forEach(b => b.close()); dec.close(); return; }   // superseded
      const { image } = await dec.decode({ frameIndex: i });
      const resize = image.displayWidth !== w ? { resizeWidth: w, resizeHeight: h, resizeQuality: m.q || 'high' } : {};
      const bm = await createImageBitmap(image, resize); image.close();   // same scaling as the main decode
      x.clearRect(0, 0, w, h); x.drawImage(bm, 0, 0); bm.close();
      const img = x.getImageData(0, 0, w, h), u = new Uint32Array(img.data.buffer);
      const mask = p.doKey && p.region !== 'all' ? keyMask(u, w, h, p) : null;
      if (maskOnly) out.push(mask.buffer);
      else { fxPixels(u, p, cache, mask); out.push(await createImageBitmap(img)); }
      if (performance.now() - t > 50){ postMessage({ id, gen, kind: m.kind, progress: i + 1, total: n }); await pause(); t = performance.now(); }
    }
    dec.close();
    if (maskOnly) postMessage({ id, gen, kind: 'mask', masks: out }, out);
    else postMessage({ id, gen, frames: out }, out);
  } catch (err) {
    if (!maskOnly) out.forEach(b => b.close()); if (dec) dec.close();
    postMessage({ id, gen, kind: m.kind, error: String(err && err.message || err) });
  }
};`;
let fxWorker = null;
try {
  const url = URL.createObjectURL(new Blob([FX_WORKER_SRC], { type: 'text/javascript' }));
  fxWorker = new Worker(url); URL.revokeObjectURL(url);   // the worker has its script once it's made
  fxWorker.onmessage = e => {
    if (e.data.kind === 'mask') return maskMsg(e.data);
    const m = e.data, g = insts.get(m.id);
    if (!g || m.gen !== g.keyGen){ if (m.frames) m.frames.forEach(f => f.close()); return; }   // stale or cleared
    if (m.frames) fxDone(g, m.frames);
    else if (m.error){ console.warn('color worker:', m.error, '— using main thread'); fxMain(g, m.gen, fxParams(g)); }
    else { g.keyMsg = `processing ${m.progress}/${m.total}…`; if (pads[selPad].gif === g) $('#gInfo').textContent = g.keyMsg; }
  };
  fxWorker.onerror = e => {                          // worker unusable: redo pending work on this thread
    console.warn('color worker failed, using main thread', e.message); fxWorker = null;
    insts.forEach(g => g.fxWaits.length && applyFx(g));
  };
} catch (e) { fxWorker = null; }

function fxDone(g, frames){
  const old = g.frames; g.frames = frames; g.fxP = null; g.tileThumb = null;
  if (old !== g.src && old !== frames) old.forEach(f => f.close());
  g.bytes = g.srcBytes * (frames === g.src ? 1 : 2); g.keyMsg = ''; g.fxVer++;
  const pi = pads.findIndex(p => p.gif === g); if (pi >= 0) renderPad(pi);
  updateMem(); if (pads[selPad].gif === g) syncGifUI();
  g.fxWaits.splice(0).forEach(r => r());
}
// returns a promise that settles when this (or a newer) setting has been applied
function applyFx(g){
  const gen = ++g.keyGen, p = fxParams(g);
  const wait = new Promise(r => g.fxWaits.push(r));
  if (liveFx()){                                     // live: just new parameters (drop any pre-processed frames)
    if (fxWorker) fxWorker.postMessage({ id: g.uid, gen });
    if (p.doKey && p.region !== 'all') requestMasks(g); else dropMasks(g);
    g.fxP = null; fxDone(g, g.src); return wait;
  }
  if (!p.doKey && !p.doHsv && !(p.sw && p.sw.length) && !p.palN){ if (fxWorker) fxWorker.postMessage({ id: g.uid, gen }); fxDone(g, g.src); }
  else if (fxWorker) fxWorker.postMessage({ id: g.uid, gen, blob: g.blob, type: g.type, n: g.src.length, w: g.src[0].width, h: g.src[0].height, q: g.media && g.media.px ? 'pixelated' : 'high', p });
  else fxMain(g, gen, p);
  return wait;
}
// ---- connected key masks (live colour path): worked out in the worker, one byte per pixel per frame ----
// The previous masks stay in use until the new ones are ready, so dragging Tolerance never flashes.
function dropMasks(g){ g.maskGen++; clearTimeout(g.maskT); if (g.masks){ g.masks = null; g.maskBytes = 0; g.fxVer++; updateMem(); } }
function requestMasks(g){
  clearTimeout(g.maskT);
  g.maskT = setTimeout(() => {
    const gen = ++g.maskGen, p = fxParams(g), w = g.src[0].width, h = g.src[0].height;
    if (p.region === 'point' && !p.seed){ g.keyMsg = 'Region "From pick": click Pick, then the GIF'; if (pads[selPad].gif === g) $('#gInfo').textContent = g.keyMsg; return; }
    if (fxWorker) fxWorker.postMessage({ kind: 'mask', id: 'm' + g.uid, gen, blob: g.blob, type: g.type, n: g.src.length, w, h, q: g.media && g.media.px ? 'pixelated' : 'high', p });
    else masksMain(g, gen, p, w, h);
  }, 120);
}
function maskMsg(m){
  const g = insts.get(+String(m.id).slice(1));
  if (!g || m.gen !== g.maskGen) return;
  if (m.masks) masksDone(g, m.masks.map(b => new Uint8Array(b)));
  else if (m.error){ console.warn('mask worker:', m.error); masksMain(g, m.gen, fxParams(g), g.src[0].width, g.src[0].height); }
  else { g.keyMsg = `finding edges ${m.progress}/${m.total}…`; if (pads[selPad].gif === g) $('#gInfo').textContent = g.keyMsg; }
}
function masksDone(g, masks){
  g.masks = masks; g.maskBytes = masks.reduce((a, m) => a + m.length, 0); g.keyMsg = ''; g.fxVer++;
  const pi = pads.findIndex(p => p.gif === g); if (pi >= 0) renderPad(pi);
  updateMem(); if (pads[selPad].gif === g) syncGifUI();
}
async function masksMain(g, gen, p, w, h){            // no worker: same work on this thread, in slices
  const x = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true }), out = []; let slice = performance.now();
  for (let i = 0; i < g.src.length; i++){
    if (gen !== g.maskGen) return;
    x.clearRect(0, 0, w, h); x.drawImage(g.src[i], 0, 0);
    out.push(keyMask(new Uint32Array(x.getImageData(0, 0, w, h).data.buffer), w, h, p));
    if (performance.now() - slice > 12){ await yieldNow(); slice = performance.now(); }
  }
  if (gen === g.maskGen) masksDone(g, out);
}
async function fxMain(g, gen, p){                    // fallback when workers aren't available
  const w = g.src[0].width, h = g.src[0].height;
  const x = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
  const cache = new Map(), out = []; let slice = performance.now();
  for (let i = 0; i < g.src.length; i++){
    if (gen !== g.keyGen){ out.forEach(f => f.close()); return; }
    x.clearRect(0, 0, w, h); x.drawImage(g.src[i], 0, 0);
    const img = x.getImageData(0, 0, w, h), u = new Uint32Array(img.data.buffer);
    fxPixels(u, p, cache, p.doKey && p.region !== 'all' ? keyMask(u, w, h, p) : null);
    out.push(await createImageBitmap(img));
    if (performance.now() - slice > 12){
      g.keyMsg = `processing ${i+1}/${g.src.length}…`;
      if (pads[selPad].gif === g) $('#gInfo').textContent = g.keyMsg;
      await yieldNow(); slice = performance.now();
    }
  }
  if (gen !== g.keyGen){ out.forEach(f => f.close()); return; }
  fxDone(g, out);
}
