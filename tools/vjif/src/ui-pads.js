// ---------- UI: pads ----------
function buildPads(){
  pads.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'pad empty'; el.dataset.i = i;
    el.innerHTML = `<canvas width="96" height="64"></canvas><span class="key">${p.label}</span><span class="dots"></span><span class="nm"></span>`;
    // hit on press (and release on let go, for Gate); an empty pad opens the file browser on click
    el.addEventListener('pointerdown', e => { if (e.button || !p.gif) return;
      el.setPointerCapture(e.pointerId);
      if (isDel(e)){ padDrag = { i, x: e.clientX, y: e.clientY, moved: false, copy: true, had: true, on: layers.map(L => L.on) }; el._shift = true; return; }   // Ctrl+click: clear · Ctrl+drag: copy (decided on let go)
      padDrag = { i, x: e.clientX, y: e.clientY, moved: false, had: layers.some(L => L.clips.some(c => c.pad === i)), wasPending: pending.has(i), on: layers.map(L => L.on) };
      trigger(i, e.altKey); });   // Alt+click: swap
    el.addEventListener('contextmenu', e => { e.preventDefault(); if (el._shift){ el._shift = false; return; } focusPad(i); });   // right-click: select without playing (after a Mac's Ctrl+click delete: nothing)
    el.addEventListener('pointermove', e => padDragMove(e, i));
    el.addEventListener('pointerup', e => { const d = padDrag; if (d && d.copy && d.i === i && !d.moved){ padDragEnd(e, i); clearPad(i); toast2(`Pad ${p.label} cleared — Ctrl+Z brings it back`); return; } if (!padDragEnd(e, i)) release(i); });
    el.addEventListener('pointercancel', () => { padDragEnd(null, i); release(i); });
    el.addEventListener('click', e => { if (el._shift || isDel(e)){ el._shift = false; return; } if (!p.gif && !p.loading){ selectPad(i); if (pool.length) openPool(i); else { fileTarget = i; $('#fileIn').click(); } } });
    (i < 9 ? $('#gridA') : $('#gridB')).appendChild(el);
    p.el = el;
  });
}
// ---- dragging a pad: onto another pad swaps them (an empty one: moves there), onto a layer puts the GIF on it ----
// The press already hit the pad; once the pointer leaves it that hit is taken back (a GIF it added to a layer goes,
// a snapped hit waiting for the beat is cancelled), so dragging only rearranges.
let padDrag = null;
// the thing being dragged, slanted under the pointer (pads, layer chips, effects all use it)
const ghost = {
  el: null,
  show(el, x, y){ this.hide(); el.classList.add('ghost'); document.body.appendChild(el); this.el = el; if (x !== undefined) this.move(x, y); },
  chip(pad, x, y, col){ const g = pads[pad].gif, el = document.createElement('span'); el.className = 'chip'; if (col) el.style.setProperty('--gc', col);
    el.innerHTML = `<span>${pads[pad].label}</span>`; if (g) el.style.backgroundImage = `url(${gifThumb(g)})`; this.show(el, x, y); },
  move(x, y){ if (this.el && (x || y)){ this.el.style.left = x / uiZoom + 'px'; this.el.style.top = y / uiZoom + 'px'; } },
  hide(){ if (this.el){ this.el.remove(); this.el = null; } },
};
const NO_IMG = (() => { const c = document.createElement('canvas'); c.width = c.height = 1; return c; })();   // hides the browser's own drag picture
document.addEventListener('dragover', e => ghost.move(e.clientX, e.clientY), true);
document.addEventListener('dragend', () => ghost.hide(), true);
document.addEventListener('drop', () => ghost.hide(), true);
const padDropAt = e => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && (t.closest('.pad') || t.closest('.layer') || t.closest('#pvWrap')); };
function padDragMove(e, i){
  const d = padDrag; if (!d || d.i !== i) return;
  if (!d.moved){
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return;
    d.moved = true;
    if (d.copy){ document.body.classList.add('paddragging'); ghost.chip(i); d.ghost = true; }   // a copy: nothing was hit, nothing to take back
    else { release(i);
    if (!d.wasPending && pending.has(i)){ pending.delete(i); pads[i].el.classList.remove('wait'); }
    if (!d.had) layers.forEach((L, li) => { L.clips = L.clips.filter(c => c.pad !== i); if (!L.clips.includes(L.sel)) L.sel = null; L.on = d.on[li]; });
    syncLayerUI(); redraw.all = true; document.body.classList.add('paddragging');
    ghost.chip(i); d.ghost = true; pads[i].el.classList.add('lifted'); }     // the chip you're carrying
  }
  if (d.ghost) ghost.move(e.clientX, e.clientY);
  const o = padDropAt(e);
  pads.forEach(p => p.el.classList.toggle('drop', p.el === o && p.i !== i));
  layers.forEach(L => L.row.classList.toggle('dropzone', L.row === o)); $('#pvWrap').classList.toggle('dropzone', o && o.id === 'pvWrap');
}
function padDragEnd(e, i){
  const d = padDrag; padDrag = null;
  if (d && d.ghost){ ghost.hide(); pads[d.i].el.classList.remove('lifted'); }
  pads.forEach(p => p.el.classList.remove('drop')); layers.forEach(L => L.row.classList.remove('dropzone')); $('#pvWrap').classList.remove('dropzone'); document.body.classList.remove('paddragging');
  if (!d || d.i !== i || !d.moved) return false;
  pads[i].el._shift = true;                          // the click that follows the drag isn't a click on the pad
  const o = e && padDropAt(e); if (!o) return true;
  if (d.copy){ if (o.classList.contains('pad')) copyPad(i, +o.dataset.i); return true; }   // Ctrl+drag onto a pad: a copy
  if (o.classList.contains('pad')){ const j = +o.dataset.i; if (j !== i) swapPads(i, j); }
  else if (o.id === 'pvWrap'){                       // dropped on the preview: onto the edit layer, centred where it was dropped
    const [px, py] = evtToOut(e); padToLayer(i, target);
    const c = layers[target].clips.find(c => c.pad === i);
    if (c && px > -W * 0.25 && px < W * 1.25 && py > -H * 0.25 && py < H * 1.25){ placeVisible(c, px, py); layers[target].sel = c; selectPad(i); syncXfUI(); redraw.all = true; commit(); }
  }
  else padToLayer(i, layers.findIndex(L => L.row === o));
  return true;
}
// a copy of a pad's GIF onto an empty pad: its own settings, the same decoded frames (no extra memory for the picture)
function copyPad(a, b){
  if (a === b || !pads[a].gif) return;
  if (pads[b].gif || pads[b].loading) return toast('Ctrl+drag onto an empty pad to copy');
  commit(); pads[b].gif = cloneInst(pads[a].gif);
  pushStep({ kind: 'swap', pad: b, g: null, sid: sidNow() }); hist.cur = histState(); updHistUI();
  afterPadChange(b); toast2(`Pad ${pads[a].label} copied to ${pads[b].label} (same frames, its own settings)`);
}
function swapPads(a, b, record = true){
  if (a === b || pads[a].loading || pads[b].loading) return;
  if (record) commit();
  const map = k => k === a ? b : k === b ? a : k;
  [pads[a].gif, pads[b].gif] = [pads[b].gif, pads[a].gif];
  layers.forEach(L => L.clips.forEach(c => c.pad = map(c.pad)));
  const pend = [...pending]; pending.clear(); pend.forEach(([k, q]) => pending.set(map(k), q));
  pads.forEach(p => p.el.classList.toggle('wait', pending.has(p.i)));
  if (record){ pushStep({ kind: 'pswap', a, b, sid: sidNow() }); hist.cur = histState(); updHistUI();
    toast2(pads[a].gif ? `Pads ${pads[a].label} and ${pads[b].label} swapped` : `Moved to pad ${pads[b].label}`); }
  renderPad(a); renderPad(b); selectPad(map(selPad)); syncLayerUI(); syncXfUI(); renderPool(); renderScenes(); redraw.all = true;
}
function applyPswap(E){ toScene(E.sid); swapPads(E.a, E.b, false); }
// a pad dropped on a layer: its GIF moves there (on top), or starts there if it wasn't playing
function padToLayer(p, li){
  if (li < 0 || !pads[p].gif) return;
  const S = layers.findIndex(L => L.clips.some(c => c.pad === p));
  if (S === li){ setTarget(li); return; }
  if (S >= 0){ const c = layers[S].clips.find(c => c.pad === p); moveClip(S, c.id, li, layers[li].clips.length); }
  else { if (layers[li].clips.length >= MAX_CLIPS) return refuse(layers[li]); setTarget(li); fire(p, clock.beat); }
  syncLayerUI(); syncXfUI(); redraw.all = true; commit();
}
// a scene-tile-shaped picture of a GIF's first frame, fitted whole like a scene thumbnail (pads loaded, nothing playing)
function gifTile(g){
  if (g.tileThumb && g.tileFmt === format) return g.tileThumb;
  const c = document.createElement('canvas'); c.width = 96; c.height = 54; const x = c.getContext('2d'), f = fxImage(g, g.startF);
  const k = Math.min(96 / W, 54 / H), fw = W * k, fh = H * k, s = Math.min(fw / f.width, fh / f.height);   // the canvas frame, then the GIF inside it
  x.fillStyle = '#000'; x.fillRect(0, 0, 96, 54); x.imageSmoothingEnabled = !g.crisp;
  x.drawImage(f, (96 - f.width * s) / 2, (54 - f.height * s) / 2, f.width * s, f.height * s);
  g.tileFmt = format; return g.tileThumb = c.toDataURL('image/jpeg', 0.8);
}
// small cover-cropped copy for the layer chips and scene tiles (made on demand for GIFs of scenes not on screen)
function gifThumb(g, f = fxImage(g, g.startF)){
  if (g.thumb) return g.thumb;
  const t = document.createElement('canvas'); t.width = 52; t.height = 48;
  const tx = t.getContext('2d'), k = Math.max(t.width / f.width, t.height / f.height);
  tx.imageSmoothingEnabled = !g.crisp; tx.drawImage(f, (t.width - f.width*k)/2, (t.height - f.height*k)/2, f.width*k, f.height*k);
  return g.thumb = t.toDataURL();
}
function renderPad(i){
  if (padFold) queueMicrotask(syncPadFold);   // the folded sections' GIF counts
  const p = pads[i], el = p.el, c = el.querySelector('canvas'), g = p.gif;
  // the picture only changes with the GIF, its colour version, start frame, smoothing, key or the theme: otherwise keep it (scene changes redo all 18 pads)
  const sig = g ? `${g.fxVer}|${g.startF}|${g.crisp}|${g.key.on}|${g.name}|${TC.track}|${TC.edge2}|${c.width}x${c.height}` : `-|${TC.track}`;
  if (el._g === g && el._sig === sig && (!g || g.thumb)) return;
  el._g = g; el._sig = sig;
  const x = c.getContext('2d');
  x.fillStyle = TC.track; x.fillRect(0, 0, c.width, c.height);
  el.classList.toggle('empty', !p.gif);
  el.querySelector('.nm').textContent = p.gif ? p.gif.name : '';
  if (!p.gif) return;
  if (p.gif.key.on){                                // checkerboard shows keyed transparency
    x.fillStyle = TC.edge2;
    for (let yy = 0; yy < c.height; yy += 8) for (let xx = (yy / 8) % 2 * 8; xx < c.width; xx += 16) x.fillRect(xx, yy, 8, 8);
  }
  x.imageSmoothingEnabled = !p.gif.crisp;
  const f = fxImage(p.gif, p.gif.startF), s = Math.min(c.width / f.width, c.height / f.height);
  x.drawImage(f, (c.width - f.width*s)/2, (c.height - f.height*s)/2, f.width*s, f.height*s);
  p.gif.thumb = p.gif.tileThumb = null; gifThumb(p.gif, f);
  document.querySelectorAll(`.chip[data-pad="${i}"]`).forEach(ch => ch.style.backgroundImage = `url(${p.gif.thumb})`);
}
// later: the GIF panel is brought up to date after the frame is drawn (a pad hit or scene change inside the frame)
function selectPad(i, later = false){ selPad = i; pads.forEach(p => { if (p.el.classList.contains('sel') !== (p.i === i)) p.el.classList.toggle('sel', p.i === i); }); if (later) uiLater(UI.GIF); else { uiDue &= ~UI.GIF; syncGifUI(); } }
// ---- panel updates wanted by something that happened inside a frame: done once, after drawing ----
const UI = { GIF: 1, LAYERS: 2, XF: 4, SCENES: 8, POOL: 16 };
let uiDue = 0;
const uiLater = f => { uiDue |= f; };
function flushUI(){
  const f = uiDue; if (!f) return; uiDue = 0;
  if (f & UI.GIF) syncGifUI(); if (f & UI.LAYERS) syncLayerUI(); if (f & UI.XF) syncXfUI(); if (f & UI.SCENES) renderScenes(); if (f & UI.POOL) renderPool();
}
// select a pad to edit it, without playing it: its GIF settings, and its sprite in Transform if it's on a layer
function focusPad(i){
  selectPad(i);
  const li = layers.findIndex(L => L.clips.some(c => c.pad === i));
  if (li >= 0){ layers[li].sel = layers[li].clips.find(c => c.pad === i); setTarget(li); }
}
function updateMem(){
  // decoded GIFs count once (the pool); each instance adds only its own processed frames / key masks
  const base = pool.reduce((a, m) => a + m.srcBytes, 0) / 1048576;
  let extra = 0; insts.forEach(g => { extra += g.bytes - g.srcBytes + (g.maskBytes || 0); }); extra /= 1048576;
  const mb = base + extra, el = $('#mem'); el.innerHTML = `<i>MEM</i>${mb.toFixed(0)} MB`;
  setTip(el, `Decoded frames: ${pool.length} GIF${pool.length === 1 ? '' : 's'} in the pool, ~${base.toFixed(0)} MB` + (extra >= 0.5 ? ` + ~${extra.toFixed(0)} MB of colour-processed copies / key masks` : ''));
  el.classList.toggle('bad', mb > MEM_WARN_MB);
  if (mb > MEM_WARN_MB) toast(`The set is using ~${mb.toFixed(0)} MB of decoded frames — remove unused GIFs from the pool if playback stutters`);
  const pb = $('#poolBtn'); if (pb) pb.textContent = `Pool ${pool.length}`;
}
let padSig = '';
function updatePadDots(){
  const sig = layers.map(L => (L.on ? 1 : 0) + ':' + L.clips.map(c => c.pad).join('.')).join(',');
  if (sig === padSig) return; padSig = sig;
  pads.forEach((p, i) => {
    p.el.querySelector('.dots').innerHTML = layers.filter(L => L.on && L.clips.some(c => c.pad === i))
      .map(L => `<b style="background:${LCOL[L.i]}">${L.i+1}</b>`).join('');
  });
}
