// ---------- persistence: GIF files + settings in IndexedDB (cookies cap at ~4 KB) ----------
const GIF_KEYS = ['sync', 'loop', 'speed', 'crisp', 'beats', 'subdiv', 'restart', 'inF', 'outF', 'startF', 'key', 'hsv', 'swap', 'swapMerge', 'trig', 'env', 'lfo'];
const XF_KEYS = [...Object.keys(newXf()), 'alpha'];
// IndexedDB 'kv' store:
//   'gif:<hash>' → { name, blob }               original files, stored once (content hash), shared by sets
//   'set:<id>'   → { id, name, updated, count, snap }   a saved set; snap = snapshot() JSON
//   'state'      → snapshot JSON of the working session (autosaved every second)
//   'session'    → { setId }                     which saved set the session started from
const store = {
  db: null, ready: false, last: '',
  open(){ return new Promise((res, rej) => { const r = indexedDB.open('gif-vj', 1) /* storage keeps its old name so saved sets carry over */; r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
  req(mode, fn){ return new Promise((res, rej) => { if (!this.db) return res(null); const t = this.db.transaction('kv', mode), r = fn(t.objectStore('kv')); t.oncomplete = () => res(r.result); t.onerror = t.onabort = () => rej(t.error); }); },
  get(k){ return this.req('readonly', s => s.get(k)); },
  put(k, v){ return this.req('readwrite', s => s.put(v, k)).catch(e => toast('Saving failed: ' + e.message)); },
  del(k){ return this.req('readwrite', s => s.delete(k)); },
  keys(prefix){ return this.req('readonly', s => s.getAllKeys(IDBKeyRange.bound(prefix, prefix + '￿'))); },
  all(prefix){ return this.req('readonly', s => s.getAll(IDBKeyRange.bound(prefix, prefix + '￿'))); },
};
// `pool` = every GIF of the set; `pads` + `layers` = the current scene; `scenes` = all nine as { pads, layers }
// (the current one null); `scene` = which is current; `v` = the format's step (SNAP_STEPS).
const serLayers = ls => ls.map(L => ({ on: L.on, opacity: L.opacity, blend: L.blend, sel: L.clips.indexOf(L.sel), fillOn: !!L.fillOn, fill: L.fill || '#1e2a3a', tr: L.tr || 'cut',
  clips: L.clips.map(c => ({ pad: c.pad, ...Object.fromEntries(XF_KEYS.map(k => [k, c[k]])) })) }));
const serPads = gs => gs.map(g => g ? { hash: g.hash, name: g.name, ...Object.fromEntries(GIF_KEYS.map(k => [k, g[k]])) } : null);
function snapshot(){
  return JSON.stringify({
    v: SNAP_V, format, bpm: clock.bpm, snap: snapMode, target, scene: sceneIdx, trans: { ...transCfg }, transP: trPresets.map(P => ({ ...P })), transSel: trSel, fx: fxCfg.map(c => ({ ...c })), fxPre: JSON.parse(JSON.stringify(fxPre)), fxOn: fxSt.map((S, i) => S.on && fxConf(i).mode === 'latch' ? 1 : 0),
    pool: pool.map(m => ({ hash: m.hash, name: m.name, ...(m.scale && m.scale !== 1 ? { scale: m.scale } : {}) })),
    pads: serPads(pads.map(p => p.gif)),
    layers: serLayers(layers),
    sceneName: liveName,
    scenes: scenes.map((sc, i) => i === sceneIdx || !sc ? null : { pads: serPads(sc.pads), layers: serLayers(sc.layers), name: sc.name || '' }),
    thumbs: scenes.map((sc, i) => i === sceneIdx ? thumbKeep || liveThumb || null : sc && sc.thumb || null),   // the scene tiles' pictures, so they survive a reload
  });
}
// ---- set conversions: every change to the saved format, in one numbered list. A snapshot saved at step v goes
// through the steps after it, in order. Sets from before 1.0 aren't promised to load: at 1.0 these steps go and
// the list starts again from 1.0's format.
const SNAP_STEPS = {
  // 2: GIF files moved from 'pad:<i>' to 'gif:<hash>' in storage — needs the store, so it runs in restore()
  4: o => {                                          // one set of pads for all scenes → each scene its own copy; the pool
    const ps = o.pads || [], seen = new Set();
    o.pool = []; ps.forEach(p => { if (p && !seen.has(p.hash)){ seen.add(p.hash); o.pool.push({ hash: p.hash, name: p.name }); } });
    o.scenes = Array.from({ length: N_SCENES }, (_, i) => o.scenes && o.scenes[i] ? { pads: JSON.parse(JSON.stringify(ps)), layers: o.scenes[i] } : null);
  },
  5: o => {
    const tr = P => { if (!P) return;                // transition families (0.24): Dip / Flash became Fade styles, Melt a Glitch style
      if (P.type === 'dip' || P.type === 'flash'){ P.style = P.type; P.type = 'fade'; } if (P.type === 'melt'){ P.type = 'glitch'; P.style = 'melt'; } };
    (o.transP || []).forEach(tr); tr(o.trans);
    if (!(o.transP && o.transP.length === 9) && o.trans){ const k = 1; o.transP = trDefaults().map((P, i) => i === k ? { ...P, ...o.trans } : P); o.transSel = k; }   // one transition → key 2
    const rel = c => { if (!c || c.rel !== undefined || !Object.keys(c).length) return;   // Release: a Hit faded over its whole Length — that becomes the release (held for 0)
      if (c.mode === 'hit'){ c.rel = c.len ?? 1; c.len = 0; } else c.rel = FX_REL; };
    (o.fx || []).forEach(rel); (o.fxPre || []).forEach(rel);
  },
};
const SNAP_V = Math.max(...Object.keys(SNAP_STEPS).map(Number));
function upgradeSnap(o){
  for (let v = (o.v || 1) + 1; v <= SNAP_V; v++) if (SNAP_STEPS[v]) SNAP_STEPS[v](o);
  o.v = Math.max(o.v || 1, SNAP_V); return o;
}
// what counts as "changed" for the unsaved-changes dot: everything except which layer / GIF / scene is selected
function contentSig(snap){
  if (!snap) return ''; const o = upgradeSnap(JSON.parse(snap)); o.format = o.format || '16:9';
  const all = o.scenes.slice(); all[o.scene || 0] = { pads: o.pads, layers: o.layers, name: o.sceneName || '' };
  const blank = sc => !sc || (!sc.name && !(sc.pads || []).some(Boolean) && !sc.layers.some(l => l.clips.length));
  o.scenes = all.map(sc => { if (blank(sc)) return null; sc.layers.forEach(l => delete l.sel); return sc; });   // visiting an empty scene changes nothing
  delete o.target; delete o.scene; delete o.layers; delete o.pads; delete o.sceneName; delete o.transSel; delete o.trans; delete o.thumbs; delete o.fxOn;   // which transition is armed, which effects are latched: a moment, not content
  return JSON.stringify(o);
}
// saved layers → live layer states (only GIFs that loaded; a GIF lives on one layer: the topmost wins)
function deserLayers(sls, now, gifs = pads.map(p => p.gif)){
  const out = sls.map(sl => { const clips = sl.clips.filter(c => gifs[c.pad]).map(c => Object.assign(newClip(c.pad), c, { startTime: now, startBeat: clock.beat }));
    return { on: sl.on, opacity: sl.opacity, blend: sl.blend, mode: sl.mode, clips, sel: clips[sl.sel] || null, fillOn: !!sl.fillOn, fill: sl.fill || '#1e2a3a', tr: sl.tr || 'cut' }; });
  const seen = new Set();
  for (let li = out.length - 1; li >= 0; li--){ const L = out[li]; L.clips = L.clips.filter(c => !seen.has(c.pad) && seen.add(c.pad)); if (!L.clips.includes(L.sel)) L.sel = null; }
  return out;
}

const sets = new Map();                              // id → set record
const session = { setId: null, savedSig: '' };
const curSet = () => session.setId && sets.get(session.setId);
const hasContent = () => pool.length > 0 || pads.some(p => p.gif) || layers.some(L => L.clips.length) || scenes.some(sc => sc && sc.layers.some(l => l.clips.length));
let dirty = false;
function updSetLabel(){
  const rec = curSet(), el = $('#setLabel');
  dirty = rec ? contentSig(snapshot()) !== session.savedSig : hasContent();
  el.textContent = rec ? rec.name : 'Untitled'; el.classList.toggle('dirty', dirty);
}

let saveSeen = -1, saveIdle = 0;
async function autosave(force = false){
  if (!store.ready || setsBusy) return;
  if (!force && touched.save === saveSeen && ++saveIdle < 10) return;   // nothing touched: build the snapshot only every 10 s (things that change by themselves: BRB, MIDI tempo)
  saveSeen = touched.save; saveIdle = 0;
  const snap = snapshot(); if (snap === store.last) return;
  store.last = snap; await store.put('state', snap); updSetLabel();
}

// ---- turning a snapshot into the running state ----
// Decodes what's missing while the current set keeps playing, reuses GIFs that are already decoded
// (same file), waits for the swap point, then swaps everything in one go.
let setsBusy = false;
async function applySnapshot(st, { wait = true } = {}){
  st = upgradeSnap(st);
  const scPads = [st.pads, ...st.scenes.map(sc => sc && sc.pads)].filter(Boolean);
  scPads.flat().forEach(sp => { if (sp && !st.pool.some(e => e.hash === sp.hash)) st.pool.push({ hash: sp.hash, name: sp.name }); });
  const have = new Map(pool.map(m => [m.hash, m])), got = new Map();
  const todo = st.pool.filter(e => !have.has(e.hash));
  let done = 0, missing = 0;
  const stat = () => { $('#saveStat').textContent = todo.length ? `loading ${done}/${todo.length}` : ''; };
  stat();
  await Promise.all(todo.map(async e => {
    try {
      const rec = await store.get('gif:' + e.hash);
      if (!rec){ missing++; return; }
      const m = await decodeAnim(rec.blob, rec.name, e.scale || 1); m.hash = e.hash; got.set(e.hash, m);
    } catch (err) { missing++; }
    done++; stat();
  }));
  if (wait) await swapPoint();
  setGen++;
  // swap: drop every instance of the old set (pads, scenes, undo) and the GIFs the new one doesn't use
  dropAll(hist.undo); dropAll(hist.redo); hist.undo.length = hist.redo.length = 0;
  [...insts.values()].forEach(freeGif);
  pads.forEach(p => p.gif = null);
  const keep = new Set(st.pool.map(e => e.hash));
  pool.slice().forEach(m => { if (!keep.has(m.hash)) freeMedia(m); });
  pool.length = 0; st.pool.forEach(e => { const m = have.get(e.hash) || got.get(e.hash); if (m){ pool.push(m); if ((m.scale || 1) !== (e.scale || 1)) setMediaScale(m, e.scale || 1); } });
  const byHash = new Map(pool.map(m => [m.hash, m]));
  const mk = sp => { const m = sp && byHash.get(sp.hash); if (!m) return null; const g = makeInst(m, sp); if (g.key.on || hsvOn(g)) applyFx(g); return g; };
  const curGifs = st.pads.map(mk); pads.forEach((p, i) => p.gif = curGifs[i] || null);
  setFormat(st.format || '16:9', { quiet: true, force: true });
  setBpm(st.bpm); snapMode = st.snap || 'off'; $('#snap').value = snapMode;
  const now = performance.now(), idx = st.scene || 0;
  deserLayers(st.layers, now).forEach((s, li) => Object.assign(layers[li], s));
  for (let i = 0; i < N_SCENES; i++){
    const ss = i !== idx && st.scenes[i]; if (!ss){ scenes[i] = null; continue; }
    const gs = pads.map((_, k) => mk(ss.pads[k]));
    scenes[i] = { pads: gs, layers: deserLayers(ss.layers, now, gs).map((l, li) => Object.assign(l, { i: li })), thumb: st.thumbs && st.thumbs[i] || null, name: ss.name || '' };
  }
  sceneIdx = idx; pendingScene = null; liveThumb = st.thumbs && st.thumbs[idx] || null; liveName = st.sceneName || ''; endTrans(); dropPrep(); renderScenes();
  pending.clear(); pads.forEach(p => p.el.classList.remove('wait')); heldPre = -1;
  trPresets = trDefaults(); trSel = st.transP && st.transP.length === 9 ? st.transSel ?? 1 : 1;
  if (st.transP && st.transP.length === 9) st.transP.forEach((P, k) => normTrans(Object.assign(trPresets[k], P)));
  armTrans(trSel);
  fxCfg = fxDefaults().map((d, i) => Object.assign(d, st.fx && st.fx[i] || {})); fxCfg.forEach((c, i) => { c.style = FX_MULTI[FX_DEFS[i].id] ? styleNorm(i, c.style) : FX_DEFS[i].styles[styleIdx(i, c.style)][0]; }); fxSt.forEach(S => Object.assign(S, { held: false, on: false, b0: -1e9 }));
  fxPre = fxPreDefaults().map((d, k) => Object.assign(d, st.fxPre && st.fxPre[k] || {}));   // older sets had six: they fill 1–6
  if (Array.isArray(st.fxOn)) st.fxOn.forEach((on, i) => { if (on && fxSt[i] && fxConf(i).mode === 'latch'){ const C = fxConf(i); Object.assign(fxSt[i], { on: true, t0: clock.beat - (C.att || 0) - (C.dec || 0) - 1e-6 }); } });   // latched effects come back on (at Sustain)
  syncFxUI();
  target = st.target || 0;
  pads.forEach((_, i) => renderPad(i));
  selectPad(Math.max(0, pads.findIndex(p => p.gif))); syncLayerUI(); syncXfUI(); updateMem(); renderPool();
  resetHist();   // undo doesn't reach across sets
  redraw.all = true;
  $('#saveStat').textContent = '';
  if (missing) toast(`${missing} GIF file(s) of this set are missing from storage`);
}
// swap on the next beat or bar when Snap triggers says so and something is playing (max 1 bar + slack)
function swapPoint(){
  const playing = layers.some(L => L.on && L.clips.length);
  if (!playing || snapMode === 'off') return Promise.resolve();
  const unit = snapMode === 'bar' ? 4 : 1, start = Math.floor(clock.beat / unit), t0 = performance.now();
  const limit = 4 * 60000 / clock.bpm + 300;
  return new Promise(res => { const id = setInterval(() => {
    if (Math.floor(clock.beat / unit) !== start || performance.now() - t0 > limit){ clearInterval(id); res(); }
  }, 4); });
}

// ---- set operations ----
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function uniqueName(name){ const names = new Set([...sets.values()].map(r => r.name)); let n = name, k = 2; while (names.has(n)) n = `${name} (${k++})`; return n; }
async function saveSet(asNew, name){
  const snap = snapshot();
  let rec = !asNew && curSet();
  if (!rec) rec = { id: newId(), name: uniqueName((name || '').trim() || 'Untitled set') };
  Object.assign(rec, { snap, updated: Date.now(), count: pool.length });
  await store.put('set:' + rec.id, rec); sets.set(rec.id, rec);
  session.setId = rec.id; session.savedSig = contentSig(snap); await store.put('session', { setId: rec.id });
  updSetLabel(); renderSets(); toast2(`Saved "${rec.name}"`);
  return rec;
}
function quickSave(){ if (curSet()) saveSet(false); else { openSets(); $('#setNameIn').focus(); } }
async function loadSet(id){
  const rec = sets.get(id); if (!rec || setsBusy) return;
  if (prep) return toast('Go live first (Enter): Prep keeps the output on the current set');
  setsBusy = true; closeSets();
  try {
    await applySnapshot(JSON.parse(rec.snap));
    session.setId = id; session.savedSig = contentSig(rec.snap);
    store.last = snapshot(); await store.put('state', store.last); await store.put('session', { setId: id });
  } finally { setsBusy = false; updSetLabel(); renderSets(); }
}
async function newEmptySet(){
  if (setsBusy) return;
  if (prep) return toast('Go live first (Enter): Prep keeps the output on the current set');
  setGen++;
  dropAll(hist.undo); dropAll(hist.redo); hist.undo.length = hist.redo.length = 0;
  [...insts.values()].forEach(freeGif); pool.slice().forEach(freeMedia);
  pads.forEach((p, i) => { p.gif = null; renderPad(i); }); renderPool();
  layers.forEach(L => Object.assign(L, emptyLayer()));
  scenes.fill(null); sceneIdx = 0; pendingScene = null; liveThumb = null; liveName = ''; endTrans(); dropPrep(); renderScenes();
  trPresets = trDefaults(); armTrans(1);
  fxCfg = fxDefaults(); fxPre = fxPreDefaults(); fxSt.forEach(S => Object.assign(S, { held: false, on: false, b0: -1e9 })); heldPre = -1; syncFxUI();
  pending.clear(); pads.forEach(p => p.el.classList.remove('wait'));
  session.setId = null; session.savedSig = '';
  resetHist();
  selectPad(0); syncLayerUI(); syncXfUI(); updateMem(); redraw.all = true;
  store.last = snapshot(); await store.put('state', store.last); await store.put('session', { setId: null });
  updSetLabel(); renderSets(); gcGifs();
}
async function deleteSet(id){
  await store.del('set:' + id); sets.delete(id);
  if (session.setId === id){ session.setId = null; await store.put('session', { setId: null }); }
  updSetLabel(); renderSets(); gcGifs();
}
async function renameSet(id, name){
  const rec = sets.get(id); name = (name || '').trim(); if (!rec || !name || name === rec.name) return renderSets();
  rec.name = uniqueName(name); await store.put('set:' + id, rec); updSetLabel(); renderSets();
}
// remove stored GIF files that no set and not the working session refers to
async function gcGifs(){
  const used = new Set();
  const add = snap => { try { upgradeSnap(JSON.parse(snap)).pool.forEach(e => used.add(e.hash)); } catch {} };
  sets.forEach(r => add(r.snap)); add(snapshot());
  for (const k of await store.keys('gif:')) if (!used.has(k.slice(4))) await store.del(k);
}

// ---- .vjif files: a plain ZIP (stored, no compression — GIFs are already compressed) ----
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++){ let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(u){ let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC_T[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function buildZip(files){                            // files: [{ name, data: Uint8Array }]
  const enc = new TextEncoder(), parts = [], cent = []; let off = 0;
  const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)), dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate());
  for (const f of files){
    const nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, dt, true); lh.setUint16(12, dd, true); lh.setUint32(14, crc, true); lh.setUint32(18, sz, true); lh.setUint32(22, sz, true);
    lh.setUint16(26, nm.length, true); lh.setUint16(28, 0, true);
    parts.push(lh, nm, f.data);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, dt, true); ch.setUint16(14, dd, true); ch.setUint32(16, crc, true); ch.setUint32(20, sz, true); ch.setUint32(24, sz, true);
    ch.setUint16(28, nm.length, true); ch.setUint32(42, off, true);
    cent.push(ch, nm);
    off += 30 + nm.length + sz;
  }
  const csize = cent.reduce((a, p) => a + p.byteLength, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, csize, true); end.setUint32(16, off, true);
  return new Blob([...parts, ...cent, end], { type: 'application/zip' });
}
async function readZip(blob){                        // → Map(name → Uint8Array); handles stored and deflated entries
  const buf = new Uint8Array(await blob.arrayBuffer()), dv = new DataView(buf.buffer), dec = new TextDecoder(), out = new Map();
  let e = buf.length - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('not a .vjif / zip file');
  let p = dv.getUint32(e + 16, true); const n = dv.getUint16(e + 10, true);
  for (let i = 0; i < n; i++){
    const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nl));
    const ds = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true), raw = buf.subarray(ds, ds + csz);
    if (method === 0) out.set(name, raw);
    else if (method === 8) out.set(name, new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()));
    p += 46 + nl + xl + cl;
  }
  return out;
}
const EXT = { 'image/gif': 'gif', 'image/webp': 'webp', 'image/png': 'png', 'image/apng': 'png', 'application/vnd.vjif.text+json': 'vjtext' };
async function exportSet(name, snap){
  const st = upgradeSnap(JSON.parse(snap)), files = [], byHash = new Map(), enc = new TextEncoder();
  for (const sp of st.pool){
    if (!byHash.has(sp.hash)){
      const rec = await store.get('gif:' + sp.hash); if (!rec) continue;
      const base = (rec.name || 'gif').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w.-]+/g, '_').slice(0, 60);
      const path = `gifs/${sp.hash.slice(0, 8)}-${base}.${EXT[rec.blob.type] || (rec.name.match(/\.(\w+)$/) || [, 'gif'])[1]}`;
      files.push({ name: path, data: new Uint8Array(await rec.blob.arrayBuffer()) }); byHash.set(sp.hash, path);
    }
    sp.file = byHash.get(sp.hash);
  }
  files.unshift({ name: 'set.json', data: enc.encode(JSON.stringify({ app: 'VJif', format: 1, name, exported: new Date().toISOString(), set: st }, null, 1)) });
  await saveSetFile(buildZip(files), (name || 'set').replace(/[^\w .-]+/g, '_').trim() + '.vjif');
}