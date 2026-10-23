// ---------- UI: pads ----------
function buildPads(){
  pads.forEach((p, i) => {
    const el = document.createElement('div');
    el.className = 'pad empty'; el.dataset.i = i;
    el.innerHTML = `<canvas width="96" height="64"></canvas><span class="phd"><span class="key">${p.label}</span><span class="dots"></span></span><span class="xdel" title="Clear this pad (Ctrl+Z brings it back)">×</span><span class="nm"></span>`;
    // hit on press (and release on let go, for Gate); an empty pad opens the file browser on click
    el.addEventListener('pointerdown', e => { if (e.button || !p.gif) return;
      if (e.target.closest('.xdel')){ e.stopPropagation(); el._x = true; return; }   // its ×: cleared on the click (below), nothing played
      el.setPointerCapture(e.pointerId);
      if (isDel(e)){ padDrag = { i, x: e.clientX, y: e.clientY, moved: false, copy: true, had: true, on: layers.map(L => L.on) }; el._shift = true; return; }   // Ctrl+click: clear · Ctrl+drag: copy (decided on let go)
      padDrag = { i, x: e.clientX, y: e.clientY, moved: false, had: layers.some(L => L.clips.some(c => c.pad === i)), wasPending: pending.has(i), on: layers.map(L => L.on) };
      if (e.altKey){ padDrag = null; e.preventDefault(); setTimeout(() => renamePad(i)); return; }   // Alt+click: rename its GIF (after the press, which would take the focus back)
      clickFocus = i; trigger(i); });   // (a click: the edit layer follows the pad, so Transform edits what the GIF panel shows; keys don't move it)
    el.addEventListener('contextmenu', e => { if (el.querySelector('.nmEdit')) return e.preventDefault(); e.preventDefault(); if (el._shift){ el._shift = false; return; } focusPad(i); if (placeUnseen(i)) toast2(`${pads[i].label} placed on ${LNAMES[padLayer(i, target === 1 || target === 2 ? target : sceneLayer)]} (not played)`); });   // right-click: select without playing (after a Mac's Ctrl+click delete: nothing)
    el.addEventListener('pointermove', e => padDragMove(e, i));
    el.addEventListener('click', e => { if (!e.target.closest('.xdel') || !el._x) return; el._x = false; e.stopPropagation(); el._shift = true; clearPad(i); toast2(`Pad ${p.label} cleared — Ctrl+Z brings it back`); }, true);
    el.addEventListener('pointerup', e => { if (el._x) return; const d = padDrag; if (d && d.copy && d.i === i && !d.moved){ padDragEnd(e, i); if (delHush) return; clearPad(i); toast2(`Pad ${p.label} cleared — Ctrl+Z brings it back`); return; } if (!padDragEnd(e, i)) release(i); });
    el.addEventListener('pointercancel', () => { padDragEnd(null, i); release(i); });
    el.addEventListener('click', e => { if (el._shift || isDel(e)){ el._shift = false; return; } if (!p.gif && !p.loading){ selectPad(i); if (pool.length) openPool(i); else { fileTarget = i; $('#fileIn').click(); } } });
    if (isScenePad(i)){ el.dataset.b = i >= B2 ? 2 : 1; $('#gridA').appendChild(el); } else if (i < N_KEYPADS) $('#gridB').appendChild(el);   // (a Background slot's tile isn't shown: its chip on the layer card stands for it)
    p.el = el;
  });
}
// ---- dragging a pad: onto another pad swaps them (an empty one: moves there), onto a layer puts the GIF on it ----
// Holding Ctrl (⌘) while dragging makes it a copy instead: the empty pads show a + and only they take the drop.
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
  d.lastE = e; padCopyMode(isDel(e));
  // held over another scene's tile for half a second: that scene opens, and the GIF can be dropped on one of its pads (a copy)
  const t = document.elementFromPoint(e.clientX, e.clientY), sc = t && t.closest('#scenes .scene'), si = sc ? +sc.dataset.i : -1;
  document.querySelectorAll('#scenes .scene').forEach(x => x.classList.toggle('drop', x === sc && si !== sceneIdx));
  if (si !== d.hoverSc){ d.hoverSc = si; clearTimeout(d.scT);
    if (si >= 0 && si !== sceneIdx) d.scT = setTimeout(() => { if (padDrag !== d) return;
      if (!d.carry) d.carry = pads[d.i].gif;            // what you're carrying, from the scene you started in
      pads[d.i].el.classList.remove('lifted'); gotoScene(si, clock.beat, true); d.hoverSc = -1;
      document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop')); toast2(`Scene ${si + 1}: drop it on a pad`); }, 500); }
}
// what the drop would do now: Ctrl held = copy (empty pads only), otherwise move / swap / onto a layer
function padCopyMode(on){
  const d = padDrag; if (!d || !d.moved) return;
  d.copyNow = on; document.body.classList.toggle('padcopy', on); pads[d.i].el.classList.toggle('lifted', !on && !d.copy);   // a copy leaves the original where it is
  const o = d.lastE ? padDropAt(d.lastE) : null, i = d.i;
  // Ctrl over a pad that isn't empty: held there COPY_HOLD ms (the red bar fills), the drop replaces it (as with scenes and presets)
  const full = on && o && o.classList.contains('pad') && +o.dataset.i !== i && !!pads[+o.dataset.i].gif;
  const armed = copyHold(d, o, full, () => padCopyMode(d.copyNow));
  markTiles(pads.map(p => p.el), o, d, x => { const p = pads[+x.dataset.i]; return p.i !== i && (!on || !p.gif || armed); });
  layers.forEach(L => L.row.classList.toggle('dropzone', !on && L.row === o)); $('#pvWrap').classList.toggle('dropzone', !on && !!o && o.id === 'pvWrap');
}
addEventListener('keydown', e => { if (padDrag && DEL_KEYS.includes(e.key)) padCopyMode(true); });
addEventListener('keyup', e => { if (padDrag && DEL_KEYS.includes(e.key)) padCopyMode(false); });
function padDragEnd(e, i){
  const d = padDrag; padDrag = null; if (d) clearTimeout(d.scT); document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop'));
  if (d && d.ghost){ ghost.hide(); pads[d.i].el.classList.remove('lifted'); }
  copyHoldEnd(d);
  unmarkTiles(pads.map(p => p.el)); layers.forEach(L => L.row.classList.remove('dropzone')); $('#pvWrap').classList.remove('dropzone'); document.body.classList.remove('paddragging', 'padcopy');
  if (!d || d.i !== i || !d.moved) return false;
  pads[i].el._shift = true;                          // the click that follows the drag isn't a click on the pad
  const tt = e && document.elementFromPoint(e.clientX, e.clientY), sct = tt && tt.closest('#scenes .scene');
  if (sct){                                          // let go on a scene tile: a copy onto that scene's first empty pad (you stay where you are)
    const si = +sct.dataset.i, g = d.carry || pads[i].gif; if (!g || (si === sceneIdx && !d.carry)) return true;
    const j = nextEmptyIn(si); if (j < 0) return toast(`Scene ${si + 1}'s 9 Scene pads are full`), true;
    if (si === sceneIdx){ commit(); pads[j].gif = cloneInst(g); pushStep({ kind: 'swap', pad: j, g: null, sid: sidNow() }); hist.cur = histState(); updHistUI(); afterPadChange(j); }
    else { const sc = scenes[si] || (scenes[si] = emptyScene()); sc.pads[j] = cloneInst(g); renderScenes(); updateMem(); }
    toast2(`Copied to scene ${si + 1}, pad ${PAD_LABELS[j]}`); return true;
  }
  const o = e && padDropAt(e); if (!o) return true;
  if (d.carry){                                      // carried into another scene: a copy onto an empty pad there
    if (!o.classList.contains('pad')) return toast('Drop it on an empty pad to copy it into this scene'), true;
    const j = +o.dataset.i; if (pads[j].gif || pads[j].loading) return toast('Drop it on an empty pad to copy it into this scene'), true;
    commit(); pads[j].gif = cloneInst(d.carry); pushStep({ kind: 'swap', pad: j, g: null, sid: sidNow() }); hist.cur = histState(); updHistUI();
    afterPadChange(j); toast2(`Copied to scene ${sceneIdx + 1}, pad ${pads[j].label}`); if (isDel(e)) hushDel(); return true;
  }
  if (d.copyNow ?? d.copy){ if (o.classList.contains('pad')) copyPad(i, +o.dataset.i, !!d.armed && d.hold && d.hold.o === o); hushDel(); return true; }   // Ctrl held at the drop: a copy
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
function copyPad(a, b, over = false){
  if (a === b || !pads[a].gif || pads[b].loading) return;
  if (pads[b].gif && !over) return toast('Ctrl+drag onto an empty pad to copy (or hold over a full one until the red bar fills, to replace it)');
  commit(); const old = pads[b].gif; pads[b].gif = cloneInst(pads[a].gif);
  pushStep({ kind: 'swap', pad: b, g: old, sid: sidNow() }); hist.cur = histState(); updHistUI();   // (undo puts back what was there)
  afterPadChange(b); toast2(old ? `Pad ${pads[a].label} copied over ${pads[b].label} — Ctrl+Z brings it back` : `Pad ${pads[a].label} copied to ${pads[b].label} (same frames, its own settings)`);
}
function swapPads(a, b, record = true){
  if (a === b || pads[a].loading || pads[b].loading) return;
  if (record) commit();
  const map = k => k === a ? b : k === b ? a : k;
  [pads[a].gif, pads[b].gif] = [pads[b].gif, pads[a].gif];
  layers.forEach(L => L.clips.forEach(c => c.pad = map(c.pad)));
  layers.forEach(L => { L.clips = L.clips.filter(c => layerTakes(L.i, c.pad)); if (!L.clips.includes(L.sel)) L.sel = null; });   // (0.88 groups: a GIF that changed group leaves a layer that doesn't take it)
  bgSync(a); bgSync(b);                                // a Background slot plays when it has a GIF
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
  if (li === BG_LAYER && !isBgPad(p)){                 // onto Background: a copy into its first free slot (0.88)
    let d = -1; for (let k = BG0; k < BG0 + N_BG; k++) if (!pads[k].gif && !pads[k].loading){ d = k; break; }
    if (d < 0) return toast('Background\'s 6 slots are full');
    commit(); pads[d].gif = cloneInst(pads[p].gif); const c = newClip(d); c.startBeat = clock.beat; c.startTime = performance.now(); layers[BG_LAYER].clips.push(c);
    pushStep({ kind: 'swap', pad: d, g: null, sid: sidNow() }); hist.cur = histState(); updHistUI(); afterPadChange(d); toast2(`Pad ${pads[p].label} copied to Background`); return; }
  if (!layerTakes(li, p)) return toast(layerRule(li, p));
  const S = layers.findIndex(L => L.clips.some(c => c.pad === p));
  if (S === li){ setTarget(li); return; }
  if (S >= 0){ const c = layers[S].clips.find(c => c.pad === p); moveClip(S, c.id, li, layers[li].clips.length); }
  else { if (layers[li].clips.length >= MAX_CLIPS && !makeRoom(layers[li])) return refuse(layers[li]); setTarget(li); fire(p, clock.beat); }
  syncLayerUI(); syncXfUI(); redraw.all = true; commit();
}
// a scene-tile-shaped picture of a GIF's first frame, fitted whole like a scene thumbnail (pads loaded, nothing playing)
function gifTile(g){
  if (g.tileThumb && g.tileFmt === format) return g.tileThumb;
  const [c, x] = cpuCanvas(96, 54), f = fxImage(g, g.startF);
  const k = Math.min(96 / W, 54 / H), fw = W * k, fh = H * k, s = Math.min(fw / f.width, fh / f.height);   // the canvas frame, then the GIF inside it
  x.fillStyle = '#000'; x.fillRect(0, 0, 96, 54); x.imageSmoothingEnabled = !g.crisp;
  x.drawImage(f, (96 - f.width * s) / 2, (54 - f.height * s) / 2, f.width * s, f.height * s);
  g.tileFmt = format; return g.tileThumb = c.toDataURL('image/jpeg', 0.8);
}
// small cover-cropped copy for the layer chips and scene tiles (made on demand for GIFs of scenes not on screen)
function gifThumb(g, f = fxImage(g, g.startF)){
  if (g.thumb) return g.thumb;
  const [t, tx] = cpuCanvas(52, 48), k = Math.max(t.width / f.width, t.height / f.height);
  tx.imageSmoothingEnabled = !g.crisp; tx.drawImage(f, (t.width - f.width*k)/2, (t.height - f.height*k)/2, f.width*k, f.height*k);
  { const d = tx.getImageData(0, 0, t.width, t.height).data, W = t.width, H = t.height; let s = 0, e = 0, ne = 0;   // dark: its edge (what meets the dark card) or the whole of it (0.99.5: the edge counts, a black GIF with a bright middle had no outline)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){ const i = (y * W + x) * 4, v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) * d[i + 3] / 255; s += v; if (x < 3 || y < 3 || x >= W - 3 || y >= H - 3){ e += v; ne++; } }
    g.thumbDark = s / (W * H) < 32 || e / ne < 40; }
  return g.thumb = t.toDataURL();
}
function renderPad(i){
  if (padFold) queueMicrotask(syncPadFold);   // the folded sections' GIF counts
  const p = pads[i], el = p.el, c = el.querySelector('canvas'), g = p.gif;
  el.classList.toggle('loading', !!p.loading);   // a file decoding for another scene doesn't show here
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
  if (i === selPad) drawGifThumb();   // its colour / start frame / key changed
}
// later: the GIF panel is brought up to date after the frame is drawn (a pad hit or scene change inside the frame)
function selectPad(i, later = false){ selPad = i; noSel = false; pads.forEach(p => { if (p.el.classList.contains('sel') !== (p.i === i)) p.el.classList.toggle('sel', p.i === i); }); if (later) uiLater(UI.GIF); else { uiDue &= ~UI.GIF; syncGifUI(); } }
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
  const sig = layers.map(L => (L.on ? 1 : 0) + ':' + L.clips.map(c => c.pad + (unseenClip(c) ? 'u' : '')).join('.')).join(',');
  if (sig === padSig) return; padSig = sig;
  pads.forEach((p, i) => {
    p.el.querySelector('.dots').innerHTML = layers.filter(L => L.on && L.clips.some(c => c.pad === i))
      .map(L => `<b class="${L.clips.some(c => c.pad === i && unseenClip(c)) ? 'unseen' : ''}" style="background:${LCOL[L.i]}">${L.i+1}</b>`).join('');
  });
}
// 4 times a second: remember when each clip was last on screen, and dim the chips and pad dots of the ones that aren't
setInterval(() => { const now = performance.now();
  for (const L of layers){ const chips = L.row && L.row.querySelectorAll('.chip');
    for (const c of L.clips){ const un = unseenClip(c); if (!un) c.lastSeen = now; }
    if (chips) chips.forEach(ch => { const c = L.clips.find(x => x.id === +ch.dataset.id); if (c) ch.classList.toggle('unseen', unseenClip(c)); }); }
  updatePadDots(); }, 250);

// Alt+click (or Alt + its key): rename this pad's GIF (its name here; the file in the pool keeps its own)
function renamePad(i){ const g = pads[i].gif; if (!g) return; focusPad(i);
  nameEdit(pads[i].el, g.name || '', 'GIF name', v => { if (!v || v === g.name) return; g.name = v; touched.edit = true; renderPad(i); syncGifUI(); }); }
