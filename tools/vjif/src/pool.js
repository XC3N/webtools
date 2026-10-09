// ---------- the GIF pool ----------
// Each file of the set is decoded once (a "media": its frames and timing). Pads hold *instances*: a media plus
// that pad's own settings (timing, colour, trigger, automation) and any processed frames. Every scene has its
// own 18 pads, so the same GIF can be set up differently in each scene while its frames stay shared.
const pool = [];                                     // media: { hash, name, blob, type, src, durs, w, h, srcBytes }
const insts = new Map();                             // uid → every instance alive (on a pad in any scene, or held by undo)
// At most 3 files decode at once: loading a big set or many files doesn't hold every file's bytes and decoder in
// memory at the same moment.
const decodeQ = { n: 0, wait: [] };
async function decodeAnim(...a){
  while (decodeQ.n >= 3) await new Promise(r => decodeQ.wait.push(r));
  decodeQ.n++;
  try { return await decodeOne(...a); } finally { decodeQ.n--; const r = decodeQ.wait.shift(); if (r) r(); }
}
async function decodeOne(blob, name, scale = 1){
  if (isTextBlob(blob, name)){                       // lettering: a small text description, drawn into one frame
    const spec = JSON.parse(await blob.text()), r = await renderText(spec);
    return { name: name || textName(spec), blob, type: TEXT_MIME, text: spec, ...r };
  }
  if (!('ImageDecoder' in window)) throw new Error('this browser has no ImageDecoder (use Chrome)');
  const type = (blob.type && blob.type.startsWith('image/')) ? blob.type : guessType(name);
  if (!(await ImageDecoder.isTypeSupported(type))) throw new Error('unsupported type ' + type);
  const dec = new ImageDecoder({ data: await blob.arrayBuffer(), type }), frames = [], durs = []; let w = 0, h = 0, px = null;
  try {                                               // a broken file: the decoder and the frames done so far are let go
  await dec.tracks.ready; await dec.completed;
  const n = Math.min(dec.tracks.selectedTrack.frameCount || 1, MAX_FRAMES);
  px = await pixelGrid(dec, n);               // pixel art blown up by a whole factor: kept at its real pixels
  for (let i = 0; i < n; i++){
    const { image } = await dec.decode({ frameIndex: i });
    w = image.displayWidth; h = image.displayHeight;
    const nw = px ? w / px[0] : w, nh = px ? h / px[1] : h;
    const sc = Math.min(1, MAX_DIM / Math.max(nw, nh)) * scale;   // scale: the GIF's Resolution setting (less memory)
    const opts = px || sc < 1 ? { resizeWidth: Math.max(1, Math.round(nw * sc)), resizeHeight: Math.max(1, Math.round(nh * sc)), resizeQuality: px ? 'pixelated' : 'high' } : {};
    frames.push(await createImageBitmap(image, opts));
    let d = (image.duration ?? 100000) / 1000;      // µs → ms
    if (!(d > 10)) d = 100;                          // browsers treat 0–10 ms GIF delays as 100 ms
    durs.push(d); image.close();
  }
  } catch (err){ frames.forEach(f => f.close()); throw err; }
  finally { dec.close(); }
  const srcBytes = frames.reduce((a, f) => a + f.width * f.height * 4, 0);
  return { name: name || 'untitled', blob, type, src: frames, durs, w, h, srcBytes, scale, px };
}
// Pixel art saved blown up (each real pixel drawn as an N×N block) wastes N² times the memory. This finds the block
// size from where the colour changes: in true blown-up pixel art every change falls on a multiple of N, across and
// down. Up to 8 frames spread through the GIF are checked; a single change off the grid in any of them, or a size that
// isn't a whole number of blocks, means it's kept as it is. Returns [Nx, Ny] or null. The GIF still shows at the same size.
async function pixelGrid(dec, n){
  let nx = 0, ny = 0, fw = 0, fh = 0;
  for (const i of [...new Set([...Array(Math.min(8, n))].map((_, k) => Math.round(k * (n - 1) / Math.max(1, Math.min(8, n) - 1))))]){
    const { image } = await dec.decode({ frameIndex: i });
    const w = fw = image.displayWidth, h = fh = image.displayHeight;
    if (w < 32 || h < 32 || w * h > 4096 * 4096){ image.close(); return null; }
    const cv = new OffscreenCanvas(w, h), x = cv.getContext('2d', { willReadFrequently: true });
    x.drawImage(image, 0, 0); image.close();
    const u = new Uint32Array(x.getImageData(0, 0, w, h).data.buffer);
    for (let k = 0; k < u.length; k++) if (!(u[k] >>> 24)) u[k] = 0;   // every see-through pixel counts as the same colour
    const cols = new Uint32Array(w), rows = new Uint32Array(h);       // how many colour changes start at each column / row
    for (let y = 0; y < h; y++){ const r = y * w;
      for (let xx = 1; xx < w; xx++) if (u[r + xx] !== u[r + xx - 1]) cols[xx]++;
      if (y) for (let xx = 0; xx < w; xx++) if (u[r + xx] !== u[r - w + xx]) rows[y]++; }
    const fx = gridOf(cols, w), fy = gridOf(rows, h);
    if (fx === 1 || fy === 1) return null;
    if (fx) nx = nx ? gcd(nx, fx) : fx;
    if (fy) ny = ny ? gcd(ny, fy) : fy;
  }
  if (!nx && !ny) return null;
  nx = nx || ny; ny = ny || nx;                      // one direction had no changes at all: assume square pixels
  return nx * ny > 1 && !(fw % nx) && !(fh % ny) ? [nx, ny] : null;
}
const gcd = (a, b) => b ? gcd(b, a % b) : a;
// the biggest block size N (2–32, a divisor of the size) that every colour change sits on (so nothing is lost); 1 when there's no grid,
// 0 when there are too few changes to tell (a flat frame says nothing: it doesn't count either way)
function gridOf(hist, len){
  let total = 0; for (const c of hist) total += c;
  if (total < 64) return 0;
  for (let N = Math.min(32, len >> 3); N >= 2; N--){
    if (len % N) continue;
    let on = 0; for (let i = 0; i < len; i += N) on += hist[i];
    if (on === total) return N;
  }
  return 1;
}
// a GIF's frames kept at ½ or ¼ of their pixels: same size on screen (drawn scaled up), a quarter / a sixteenth of the memory
async function setMediaScale(m, sc){
  if (m.text || (m.scale || 1) === sc) return;
  const r = await decodeAnim(m.blob, m.name, sc), old = m.src;
  Object.assign(m, { src: r.src, srcBytes: r.srcBytes, scale: sc });
  insts.forEach(g => { if (g.media !== m) return;
    const fx = g.frames !== g.src; if (fx) g.frames.forEach(f => f.close());
    Object.assign(g, { src: m.src, frames: m.src, srcBytes: m.srcBytes, bytes: m.srcBytes, masks: null, thumb: null, tileThumb: null, fxP: null });
    if (fx || g.key.on || hsvOn(g) || (g.swap && g.swap.length)) applyFx(g); });
  old.forEach(f => f.close());
  pads.forEach(p => p.gif && p.gif.media === m && renderPad(p.i)); updateMem(); renderPool(); syncGifUI(); redraw.all = true;
}
// a new instance of a media; `saved` = settings to apply, else a fresh one fitted to the tempo
function makeInst(m, saved = null){
  const n = m.src.length;
  const g = { uid: ++gifSeq, fxWaits: [], media: m, hash: m.hash, name: m.name, blob: m.blob, type: m.type, src: m.src, frames: m.src, durs: m.durs,
           w: m.w, h: m.h, srcBytes: m.srcBytes, bytes: m.srcBytes,
           sync: 'free', loop: 'loop', speed: 1, beats: 4, subdiv: 1, restart: 0, crisp: true, inF: 0, outF: n - 1, startF: 0,
           key: { on: false, color: [0, 255, 0], tol: 0, soft: 0, region: 'all', seed: null }, hsv: { h: 0, s: 1, v: 1 }, swap: [], swapMerge: 10, fxVer: 0, keyGen: 0, keyT: 0, keyMsg: '',
           masks: null, maskGen: 0, maskT: 0,
           trig: 'stay', env: { a: 0.5, h: 1, r: 2, curve: 'lin', gate: false, len: 'free' }, lfo: {} };
  insts.set(g.uid, g); rebuildSeq(g);
  if (saved) applyGifSettings(g, saved); else { autoFit(g); if (m.text) textDefaults(g); }
  return g;
}
const gifSettings = g => JSON.parse(JSON.stringify(Object.fromEntries(GIF_KEYS.map(k => [k, g[k]]))));
// an independent copy (same frames, own settings), with its colour work started
function cloneInst(g){ const c = makeInst(g.media, gifSettings(g)); c.seed = g.seed ?? g.uid; if (g.masks) c.masks = g.masks; if (c.key.on || hsvOn(c)) applyFx(c); return c; }
function freeMedia(m){ const i = pool.indexOf(m); if (i >= 0) pool.splice(i, 1); m.src.forEach(f => f.close()); }
// a GIF file → its media in the pool (decoded and stored the first time it's seen)
const decoding = new Map();                           // hash → the decode in progress (the same file dropped twice decodes once)
async function mediaFor(blob, name, gen = setGen){
  const hash = await hashBlob(blob);
  let m = pool.find(m => m.hash === hash); if (m) return m;
  if (decoding.has(hash)){ await decoding.get(hash).catch(() => {}); return mediaFor(blob, name, gen); }   // wait for that one, then take it from the pool (or decode again if it was dropped)
  const p = (async () => { try { return await decodeAnim(blob, name); } finally { decoding.delete(hash); } })(); decoding.set(hash, p);
  m = await p; m.hash = hash;
  if (gen !== setGen){ m.src.forEach(f => f.close()); throw new Error('another set was loaded meanwhile'); }   // the set it was for is gone: not into the new one's pool
  if (pool.find(x => x.hash === hash)){ m.src.forEach(f => f.close()); return pool.find(x => x.hash === hash); }   // decoded twice at once
  pool.push(m); store.put('gif:' + hash, { name: m.name, blob }); renderPool();
  return m;
}
// playback order: frames in..out, rotated so the loop begins at startF
function rebuildSeq(g){
  const F = g.src.length;
  g.inF = clamp(g.inF | 0, 0, F - 1); g.outF = clamp(g.outF | 0, g.inF, F - 1); g.startF = clamp(g.startF | 0, g.inF, g.outF);
  const n = g.outF - g.inF + 1; g.seq = []; g.cum = []; let t = 0;
  for (let k = 0; k < n; k++){ const f = g.inF + mod(g.startF - g.inF + k, n); g.seq.push(f); g.cum.push(t); t += g.durs[f]; }
  g.total = t;
}

// an instance goes away: its processed frames are freed; the decoded GIF stays in the pool
function freeGif(g){
  g.keyGen++; g.maskGen++; clearTimeout(g.keyT); clearTimeout(g.maskT);
  if (fxWorker){ fxWorker.postMessage({ id: g.uid, gen: g.keyGen }); fxWorker.postMessage({ id: 'm' + g.uid, gen: g.maskGen });   // stop any work on it…
    fxWorker.postMessage({ id: g.uid, drop: true }); fxWorker.postMessage({ id: 'm' + g.uid, drop: true }); }   // …and forget it
  if (g.frames !== g.src) g.frames.forEach(f => f.close());
  g.frames = g.src; g.masks = null; g.fxC = null; insts.delete(g.uid);
}
// instances on a pad somewhere: the live pads and every stored scene's
function padInsts(){ const u = new Set(); pads.forEach(p => p.gif && u.add(p.gif)); scenes.forEach(sc => sc && sc.pads.forEach(g => g && u.add(g))); return u; }

function autoFit(g){                               // new imports: Fit, with the loop length nearest the GIF's natural length
  const natBeats = g.total / (60000 / clock.bpm);
  g.sync = 'stretch';
  g.beats = BEAT_OPTS.reduce((a, b) => Math.abs(Math.log2(b / natBeats)) < Math.abs(Math.log2(a / natBeats)) ? b : a);
}
function applyGifSettings(g, saved){
  const { key, hsv, env, lfo, swap, hash, name, file, ...rest } = saved;
  g.swap = Array.isArray(swap) ? JSON.parse(JSON.stringify(swap)).slice(0, SWAP_MAX) : [];
  Object.assign(g, Object.fromEntries(Object.entries(rest).filter(([k]) => GIF_KEYS.includes(k))));
  if (key) Object.assign(g.key, key); if (hsv) Object.assign(g.hsv, hsv); if (env) Object.assign(g.env, env);
  if (lfo) g.lfo = JSON.parse(JSON.stringify(lfo));
  if (g.sync === 'restart'){ g.sync = 'free'; g.restart = g.beats; }   // pre-v0.9 sets
  if (g.restart === undefined) g.restart = 0;
  rebuildSeq(g);
}
// content hash of a file: the same GIF is stored once however many sets use it
async function hashBlob(blob){
  const buf = await blob.arrayBuffer();
  if (window.crypto && crypto.subtle){
    const d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
    return [...d.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const u = new Uint8Array(buf); let a = 0x811c9dc5, b = 0x01000193;            // fallback: two FNV-1a variants + length
  for (let i = 0; i < u.length; i++){ a = Math.imul(a ^ u[i], 0x01000193) >>> 0; b = Math.imul(b ^ u[i], 0x811c9dc5) >>> 0; }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0') + u.length.toString(16);
}
let setGen = 0;                                       // bumped when a set is loaded / emptied: loads still decoding for the old one are dropped
async function loadInto(p, blob, name){
  const pad = pads[p], gen = setGen, tag = sceneIds[sceneIdx];   // the scene's identity survives renumbering (drag-swap)
  pad.loading = true; pad.el.classList.add('loading');
  try { const m = await mediaFor(blob, name, gen); if (gen === setGen) putMedia(m, p, sceneIds.indexOf(tag)); }
  catch (err) { if (gen === setGen) toast(`Couldn't load ${name}: ${err.message}`); }   // (a load for a set that was replaced just stops)
  finally { pad.loading = false; pad.el.classList.remove('loading'); }
}
// a pool GIF onto pad p of scene `si` (default: the current one), as a fresh instance; replaces what was there
function putMedia(m, p, si = sceneIdx){
  if (si < 0) return null;                           // that scene is gone
  const g = makeInst(m);
  if (si !== sceneIdx){                              // the scene was left while the file decoded: fill its pad only if still empty
    const sc = scenes[si] || (scenes[si] = emptyScene());
    if (sc.pads[p]){ freeGif(g); return null; } sc.pads[p] = g; renderScenes(); updateMem(); renderPool(); return g;
  }
  const pad = pads[p];
  if (pad.gif){                                      // replacing: one undo step that swaps the old one back
    if (hist.ready){ commit(); pushStep({ kind: 'swap', pad: p, sid: sidNow(), g: pad.gif }); }
    else freeGif(pad.gif);
  }
  pad.gif = g; renderPad(p); selectPad(p); updateMem(); syncLayerUI(); renderScenes(); renderPool(); redraw.all = true;
  if (hist.ready){                                   // fold the new GIF's settings into undo's current state (loading isn't an undo step)
    const st = JSON.parse(hist.cur); st.gifs[p] = Object.fromEntries(GIF_KEYS.map(k => [k, g[k]])); hist.cur = JSON.stringify(st);
  }
  return g;
}

async function loadUrlInto(url, p){
  if (p < 0 && p !== POOL_ONLY) return toast('All 18 pads are full — clear one first');
  const raw = url.split(/[?#]/)[0].split('/').pop() || 'url.gif';
  let name = raw; try { name = decodeURIComponent(raw); } catch (e) {}   // a name like 100%.gif isn't valid escaping: keep it as it is
  let blob;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    blob = await r.blob();
  } catch (err) {
    return toast(`Can't fetch that URL (${err.message}). The site probably blocks cross-origin access — download the file and drag it in instead.`);
  }
  if (p === POOL_ONLY){ try { await mediaFor(blob, name); } catch (err) { toast(`Couldn't load ${name}: ${err.message}`); } return; }
  await loadInto(p, blob, name);
}

function nextEmpty(from = 0, exclude = new Set()){
  for (let k = 0; k < pads.length; k++){
    const i = (from + k) % pads.length;
    if (!pads[i].gif && !pads[i].loading && !exclude.has(i)) return i;
  }
  return -1;
}

function loadFiles(files, start = -1){
  if (start === POOL_ONLY) return Promise.all(files.map(f => mediaFor(f, f.name).catch(err => toast(`Couldn't load ${f.name}: ${err.message}`))));
  const used = new Set(), jobs = [];
  for (let k = 0; k < files.length; k++){
    const p = (k === 0 && start >= 0) ? start : nextEmpty(start >= 0 ? start : 0, used);
    if (p < 0){ toast(`All 18 pads are full — ${files.length - k} file(s) skipped`); break; }
    used.add(p); jobs.push(loadInto(p, files[k], files[k].name));
  }
  return Promise.all(jobs);
}

// ---------- pool window ----------
let poolTarget = -1;                                 // the pad the next pick goes to (-1: next empty from the selected pad)
const poolDest = () => poolTarget >= 0 && !pads[poolTarget].gif && !pads[poolTarget].loading ? poolTarget : nextEmpty(poolTarget >= 0 ? poolTarget : selPad);
const POOL_MIME = 'application/x-vjif-pool', POOL_ONLY = -2;
function openPool(i = -1){ poolTarget = i; const was = $('#poolPanel').hidden; $('#poolPanel').hidden = false; if (was) placeMovable($('#poolPanel .modalBox'), 'vjif-poolpos'); renderPool(); }
function closePool(){ $('#poolPanel').hidden = true; }
// where each GIF is used: scenes (1-based) and this scene's pad keys
function poolUse(m){
  const sc = [], here = [];
  for (let s = 0; s < N_SCENES; s++){
    const gs = s === sceneIdx ? pads.map(p => p.gif) : scenes[s] ? scenes[s].pads : [];
    gs.forEach((g, k) => { if (g && g.media === m){ if (!sc.includes(s + 1)) sc.push(s + 1); if (s === sceneIdx) here.push(pads[k].label); } });
  }
  const air = [...(prep ? prep.gifs : []), ...(trans && trans.free ? trans.gifs : [])].some(g => g && g.media === m);
  return { sc, here, air };   // air: the output is playing a copy of it (Prep or a go-live transition)
}
function renderPool(){
  const pb = $('#poolBtn'); if (pb) pb.textContent = `Pool ${pool.length}`;
  if (!pb || $('#poolPanel').hidden) return;
  const d = poolDest();
  $('#poolTo').textContent = d >= 0 ? `→ pad ${pads[d].label}` : 'all pads of this scene are full';
  const grid = $('#poolGrid'); grid.textContent = '';
  pool.forEach(m => {
    const u = poolUse(m), t = document.createElement('div');
    t.className = 'ptile' + (u.sc.length ? '' : ' unused'); t.title = m.name + ' — click: next empty pad · drag onto a pad: put it there'; t.draggable = true;
    t.addEventListener('dragstart', e => { e.dataTransfer.setData(POOL_MIME, m.hash); e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setDragImage(NO_IMG, 0, 0);
      const gh = document.createElement('span'); gh.className = 'chip'; gh.style.backgroundImage = `url(${t.querySelector('canvas').toDataURL()})`; ghost.show(gh, e.clientX, e.clientY); });
    t.innerHTML = `<canvas width="120" height="80"></canvas><span class="pn"></span><span class="pm">${m.w}×${m.h} · ${m.src.length} fr · ${(m.srcBytes / 1048576).toFixed(m.srcBytes < 10485760 ? 1 : 0)} MB</span>`
      + `<span class="pm use${u.here.length ? ' here' : ''}"></span><button class="px iconbtn" title="${u.sc.length ? 'Hold to remove it from the pool and from every pad it is on' : 'Remove from the pool'}">×</button><span class="hold"></span>`;
    t.querySelector('.pn').textContent = m.name;
    t.querySelector('.use').textContent = (u.here.length ? `pad ${u.here.join(' ')} here` + (u.sc.length > 1 ? ` · scenes ${u.sc.join(' ')}` : '') : u.sc.length ? `scene${u.sc.length > 1 ? 's' : ''} ${u.sc.join(' ')}` : 'unused');
    const c = t.querySelector('canvas'), x = c.getContext('2d'), f = m.src[0], k = Math.min(c.width / f.width, c.height / f.height);
    x.imageSmoothingEnabled = false; x.drawImage(f, (c.width - f.width * k) / 2, (c.height - f.height * k) / 2, f.width * k, f.height * k);
    // × or Ctrl+click removes: at once when no pad uses it, after a held press when one does (see poolHold)
    t.addEventListener('pointerdown', e => { if (e.button === 0 && (e.target.closest('.px') || isDel(e)) && poolUse(m).sc.length) poolHold(t, m, e); });
    t.addEventListener('click', e => { if (t._held){ t._held = false; return; }   // the end of a held press, not a click
      if (e.target.closest('.px') || isDel(e)){ if (!poolUse(m).sc.length) removeMedia(m); return; } pickPool(m); });
    t.addEventListener('contextmenu', e => { if (!e.ctrlKey) return; e.preventDefault(); if (!poolUse(m).sc.length) removeMedia(m); });   // (a Mac's Ctrl+click)
    grid.appendChild(t);
  });
}
// removing a GIF that's still on pads: hold the press while the bar sweeps across; letting go early says where it is
const POOL_HOLD = 900;
function poolHold(t, m, e){
  const u = poolUse(m);
  if (u.air) return toast('That GIF is on the output — go live first');
  t._held = true; t.style.setProperty('--holdT', POOL_HOLD + 'ms');
  void t.offsetWidth; t.classList.add('holding');      // (the bar starts from empty)
  const end = () => { clearTimeout(T); t.classList.remove('holding'); removeEventListener('pointerup', cancel); removeEventListener('pointercancel', cancel); };
  const cancel = () => { end(); toast(`Hold to remove it — it's on ${u.here.length ? `pad ${u.here.join(' ')} here` : ''}${u.here.length && u.sc.length > 1 ? ', ' : ''}${u.sc.length > 1 || !u.here.length ? `scene${u.sc.length > 1 ? 's' : ''} ${u.sc.join(' ')}` : ''}`); };
  const T = setTimeout(() => { end(); const name = m.name; unplaceMedia(m); removeMedia(m); toast2(`Removed ${name} from the pool and its pads`); }, POOL_HOLD);
  addEventListener('pointerup', cancel); addEventListener('pointercancel', cancel);
}
// take a GIF off every pad and layer, in every scene
function unplaceMedia(m){
  pads.forEach((p, k) => { if (p.gif && p.gif.media === m) clearPad(k); });
  scenes.forEach(sc => { if (!sc || !sc.pads) return;
    sc.pads.forEach((g, k) => { if (!g || g.media !== m) return; sc.pads[k] = null;
      sc.layers.forEach(L => { L.clips = L.clips.filter(c => c.pad !== k); if (L.sel && !L.clips.includes(L.sel)) L.sel = null; }); }); });
  renderScenes();
}
function pickPool(m){
  const d = poolDest(); if (d < 0) return toast('All 18 pads of this scene are full — clear one first');
  putMedia(m, d); poolTarget = -1;
  pads[d].el.classList.remove('hit'); void pads[d].el.offsetWidth; pads[d].el.classList.add('hit');
  renderPool();
}
// drop a GIF from the pool (only when no pad uses it); undo steps that could bring it back go too
function removeMedia(m){
  if (!pool.includes(m)) return;                     // already gone (a click after a held removal)
  const u = poolUse(m); if (u.sc.length) return;
  if (u.air){ toast('That GIF is on the output — go live first'); return; }
  const keep = e => !entryInsts(e).some(g => g && g.media === m);
  [...hist.undo, ...hist.redo].filter(e => !keep(e)).forEach(dropEntry);
  hist.undo = hist.undo.filter(keep); hist.redo = hist.redo.filter(keep);
  [...insts.values()].forEach(g => { if (g.media === m) freeGif(g); });
  freeMedia(m); updateMem(); updHistUI(); renderPool(); gcGifs();
}
$('#poolBtn').addEventListener('click', () => $('#poolPanel').hidden ? openPool(-1) : closePool());
// a click anywhere outside the pool window closes it (the Pool button toggles it; drags onto pads still work)
document.addEventListener('pointerdown', e => { if ($('#poolPanel').hidden || e.button !== 0) return;
  if (e.target.closest('#poolPanel .modalBox, #poolBtn, .modal:not(#poolPanel)')) return; closePool(); }, true);
$('#poolClose').addEventListener('click', closePool);
$('#poolAdd').addEventListener('click', () => { fileTarget = POOL_ONLY; $('#fileIn').click(); });
$('#poolUrlBtn').addEventListener('click', () => { const u = $('#poolUrl').value.trim(); if (u){ loadUrlInto(u, POOL_ONLY); $('#poolUrl').value = ''; } });
$('#poolUrl').addEventListener('keydown', e => { if (e.key === 'Enter') $('#poolUrlBtn').click(); });
// files / links dropped on the pool window (or the Pool button) only join the pool
const poolFiles = dt => [...dt.files].filter(f => f.type.startsWith('image/') || /\.(gif|webp|png|apng)$/i.test(f.name));
const dtLink = dt => (dt.getData('text/uri-list') || dt.getData('text/plain') || '').split(/\r?\n/).map(s => s.trim()).find(s => /^https?:\/\//.test(s));
[$('#poolPanel .modalBox'), $('#poolBtn')].forEach(el => {
  el.addEventListener('dragover', e => { if (e.dataTransfer.types.includes(POOL_MIME)) return; e.preventDefault(); e.stopPropagation(); $('#poolPanel').classList.add('dropping'); });
  el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) $('#poolPanel').classList.remove('dropping'); });
  el.addEventListener('drop', e => {
    if (e.dataTransfer.types.includes(POOL_MIME)) return;
    e.preventDefault(); e.stopPropagation(); $('#poolPanel').classList.remove('dropping');
    const f = poolFiles(e.dataTransfer); if (f.length) return loadFiles(f, POOL_ONLY);
    const u = dtLink(e.dataTransfer); if (u) loadUrlInto(u, POOL_ONLY);
  });
});
movable($('#poolPanel .modalBox'), 'vjif-poolpos');
$('#poolPrune').addEventListener('click', () => { pool.filter(m => { const u = poolUse(m); return !u.sc.length && !u.air; }).forEach(removeMedia); toast2('Unused GIFs removed'); });
