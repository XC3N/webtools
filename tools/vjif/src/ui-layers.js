// ---------- UI: layers ----------
function buildLayers(){
  const box = $('#layers');
  for (let li = 0; li < 4; li++){
    const L = layers[li], row = document.createElement('div');
    row.className = 'layer'; row.style.setProperty('--lc', LCOL[li]);
    // a narrow card: on / name / clear — mode / blend — opacity — GIF chips
    row.innerHTML = `<div class="lhead"><button class="lon" title="On / off: Shift+${li+1} (End: the edit layer). Right-click: solo (again: back as before)">${li+1}</button>
      <span class="lname" title="Click the card, PgUp / PgDn or Alt+${li+1} to edit this layer">${LNAMES[li]}</span>
      ${li === 0 ? '<span class="lfillw" title="Background colour, under this layer\'s GIFs"><input type="checkbox" class="lfillon"><input type="color" class="lfill"></span>' : ''}
      <button class="llock iconbtn" title="Lock: the mouse can't select, move or resize this layer's GIFs in the preview (clicks go through to the layers below). The Transform panel and the arrow keys still work"><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1" fill="currentColor" stroke="none"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg></button>
      <button class="lmask iconbtn" title="Mask: paint where this layer is hidden (freehand, rectangles, ellipses; right button erases), or Invert to show only what's painted. One per layer in each scene · click again (or Esc) when you're done"><svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="2" y="2" width="12" height="12" rx="1.5"/><circle cx="8" cy="8" r="3.4" fill="currentColor" stroke="none"/></svg></button>
      <button class="lclr" title="Clear: remove all GIFs from this layer">×</button></div>
      <div class="lrow">      <select class="lbl" title="Layer blend mode. Mask: cut out — this layer's GIFs cut holes in the layers below it (they show black); Mask: keep inside — only what's under this layer's GIFs stays of the layers below">${BLENDS.map(b => `<option value="${b[0]}">${b[1]}</option>`).join('')}</select></div>
      <span class="lopw"><input class="lop" type="range" min="0" max="1" step="0.01" data-def="1" title="Layer opacity"></span>
      <div class="seg ltr" title="Turning this layer on / off (its number, Shift+${li+1}, End, MIDI): ✕ straight away, ★ with the armed transition, 1–9 always with that preset"><button data-v="cut" title="On / off: straight away (cut)">✕</button><button data-v="armed" title="On / off: with the armed transition">★</button>${[1,2,3,4,5,6,7,8,9].map(k => `<button data-v="${k - 1}" title="On / off: always with transition preset ${k}">${k}</button>`).join('')}</div>
      <div class="clips"></div>`;
    row.querySelector('.lon').addEventListener('click', () => toggleLayer(li));
    row.querySelector('.lon').addEventListener('contextmenu', e => { e.preventDefault(); soloLayer(li); });
    row.addEventListener('pointerdown', e => { if (!e.target.closest('button, select, input, .chip') && target !== li) setTarget(li); });
    row.querySelector('.lmask').addEventListener('click', () => maskOpen(li));
    row.querySelector('.llock').addEventListener('click', () => { L.lock = !L.lock; if (L.lock && drag && drag.c && L.clips.includes(drag.c)) drag = null; syncLayerUI(); redraw.all = true; toast2(`${LNAMES[li]} ${L.lock ? 'locked: the mouse goes through it' : 'unlocked'}`); });
    row.querySelector('.lclr').addEventListener('click', () => { if (li === BG_LAYER){ for (let k = BG0; k < BG0 + N_BG; k++) if (pads[k].gif) clearPad(k); return; } L.clips = []; L.sel = null; syncLayerUI(); syncXfUI(); });   // (Background: its slots empty, each undoable)
    row.querySelector('.lop').addEventListener('input', e => { L.opacity = +e.target.value; });
    if (li === 0){
      row.querySelector('.lfillon').addEventListener('change', e => { L.fillOn = e.target.checked; });
      row.querySelector('.lfill').addEventListener('input', e => { L.fill = e.target.value; L.fillOn = true; row.querySelector('.lfillon').checked = true; });
    }
    row.querySelector('.lop').addEventListener('pointerdown', () => { if (target !== li) setTarget(li); });
    row.querySelector('.lbl').addEventListener('change', e => { if (li !== BG_LAYER) L.blend = e.target.value; else if (L.sel){ L.sel.blend = e.target.value; redraw.all = true; } });   // Background: the selected GIF's own blend (0.94)
    if (li === BG_LAYER) row.querySelector('.lbl').title = "Blend of the selected Background GIF with the Background GIFs under it: each one is its own sublayer (Background itself has only black under it). Mask: cut out — it cuts holes in the ones below it; Mask: keep inside — only what's under it stays";
    onSeg(row.querySelector('.ltr'), (b, e) => { L.tr = b.dataset.v; syncLayerUI(); });
    row.querySelector('.clips').addEventListener('click', e => {
      const sl = e.target.closest('.bgslot'); if (sl){ const p = +sl.dataset.pad; selectPad(p); setTarget(BG_LAYER); if (pool.length) openPool(p); else { fileTarget = p; $('#fileIn').click(); } return; }   // an empty Background slot: fill it
      const chip = e.target.closest('.chip'); if (!chip) return;
      const c = L.clips.find(c => c.id === +chip.dataset.id); if (!c) return;
      if (e.target.tagName === 'B' || isRm(e)) removeClip(li, c);
      else { L.sel = c; selectPad(c.pad); setTarget(li); }
    });
    row.querySelector('.clips').addEventListener('contextmenu', e => {   // right-click a chip: hide / show that GIF (0.95; a Mac's Ctrl+click arrives here: delete)
      const chip = e.target.closest('.chip'); if (!chip) return; e.preventDefault();
      const c = L.clips.find(c => c.id === +chip.dataset.id); if (!c) return;
      if (e.ctrlKey) removeClip(li, c); else { c.off = !c.off; if (!c.off) delete c.off; touched.edit = true; redraw.all = true; syncLayerUI(); }
    });
    const clipsEl = row.querySelector('.clips');
    clipsEl.addEventListener('dragstart', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      e.dataTransfer.setData(CLIP_MIME, `${li}:${chip.dataset.id}`); e.dataTransfer.effectAllowed = 'copyMove'; chipDrag = { li, pad: +chip.dataset.pad };
      chip.classList.add('dragging'); e.dataTransfer.setDragImage(NO_IMG, 0, 0); ghost.chip(+chip.dataset.pad, e.clientX, e.clientY, LCOL[li]);   // in its layer's colour
    });
    clipsEl.addEventListener('dragend', e => { chipDrag = null; const chip = e.target.closest('.chip'); if (chip) chip.classList.remove('dragging');
      layers.forEach(l => { l.row.classList.remove('dropzone'); l.row.querySelectorAll('.insL,.insR').forEach(c => c.classList.remove('insL', 'insR')); }); });
    // where a dragged chip would land: a gap in the chip row (0 = far left = on top), shown as a bar
    const gapAt = e => {
      const chips = [...clipsEl.querySelectorAll('.chip')];
      let p = chips.length;
      for (let k = 0; k < chips.length; k++){ const r = chips[k].getBoundingClientRect(); if (e.clientX < r.left + r.width / 2){ p = k; break; } }
      return [p, chips];
    };
    const showGap = e => {
      const [p, chips] = e ? gapAt(e) : [-1, [...clipsEl.querySelectorAll('.chip')]];
      chips.forEach((c, k) => { c.classList.toggle('insL', k === p); c.classList.toggle('insR', p === chips.length && k === chips.length - 1); });
    };
    // a GIF dropped into a Background slot is the selected one: Background becomes the edit layer, its clip selected (0.93: it
    // showed as selected in the card, preview and GIF panel, but the edit layer stayed where it was)
    const selectBgSlot = d => { const c = layers[BG_LAYER].clips.find(c => c.pad === d); if (!c) return; layers[BG_LAYER].sel = c; if (target !== BG_LAYER) setTarget(BG_LAYER); else { syncLayerUI(); syncXfUI(); } selectPad(d); redraw.all = true; };
    if (li === BG_LAYER){                              // Background: GIFs from the pool or files dropped on its card go into its free slots (0.88)
      row.addEventListener('dragover', e => { if (!(e.dataTransfer.types.includes(POOL_MIME) || e.dataTransfer.types.includes('Files'))) return; e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; row.classList.add('dropzone'); });
      row.addEventListener('drop', e => { if (!(e.dataTransfer.types.includes(POOL_MIME) || e.dataTransfer.types.includes('Files'))) return; e.preventDefault(); e.stopPropagation(); row.classList.remove('dropzone');
        const free = () => { for (let k = BG0; k < BG0 + N_BG; k++) if (!pads[k].gif && !pads[k].loading) return k; return -1; };
        const ph = e.dataTransfer.getData(POOL_MIME); if (ph){ const m = pool.find(m => m.hash === ph), d = free(); if (!m) return; if (d < 0) return toast('Background\'s 6 slots are full'); putMedia(m, d); renderPool(); selectBgSlot(d); return; }
        const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/') || /\.(gif|webp|png|apng)$/i.test(f.name)), used = new Set();
        for (const f of files){ let d = -1; for (let k = BG0; k < BG0 + N_BG; k++) if (!pads[k].gif && !pads[k].loading && !used.has(k)){ d = k; break; } if (d < 0){ toast('Background\'s 6 slots are full'); break; } used.add(d); const dd = d; loadInto(dd, f, f.name).then(() => selectBgSlot(dd)); } });
    }
    row.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes(CLIP_MIME)) return;
      if (chipDrag && chipDrag.li !== li && !layerTakes(li, chipDrag.pad)){ e.dataTransfer.dropEffect = 'none'; row.classList.remove('dropzone'); return; }   // a layer that doesn't take it isn't a target at all (0.89)
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      layers.forEach(l => l.row.classList.toggle('dropzone', l === L));
      showGap(e);
    });
    row.addEventListener('dragleave', e => { if (!row.contains(e.relatedTarget)){ row.classList.remove('dropzone'); showGap(null); } });
    row.addEventListener('drop', e => {
      if (!e.dataTransfer.types.includes(CLIP_MIME)) return;
      e.preventDefault(); row.classList.remove('dropzone');
      const [sli, sid] = e.dataTransfer.getData(CLIP_MIME).split(':').map(Number);
      const [p] = gapAt(e); showGap(null);
      moveClip(sli, sid, li, L.clips.length - p);    // chips are shown top-first, the clip list is bottom-first
    });
    box.appendChild(row); L.row = row;
  }
}
const CLIP_MIME = 'application/x-gifvj-clip';
let chipDrag = null;   // the chip being dragged: { li, pad } (dragover can't read the drag's data)
const LROLE = ['Background: its own 6 slots in each scene, they just play (no keys)', 'Midground: the Scene pads', 'Foreground: the Scene pads', 'Overlay: the Global pads, the same in every scene'];   // (0.88)
const layerRule = (li, p) => li === GLOBAL_LAYER ? 'Overlay plays the Global pads (UIO JKL M,.) only' : li === BG_LAYER ? 'Background plays its own 6 slots: drop a GIF from the pool or a pad on its card' : isGlobalPad(p) ? 'Global pads stay on Overlay' : 'Background slots stay on Background';
function moveClip(sli, sid, dli, at){
  const S = layers[sli], D = layers[dli], clip = S.clips.find(c => c.id === sid); if (!clip) return;
  const i = S.clips.indexOf(clip);
  if (S !== D && !layerTakes(dli, clip.pad)) return toast(layerRule(dli, clip.pad));   // 0.88: Overlay = Global pads, Background = its slots, Midground / Foreground = Scene pads
  if (S !== D && D.clips.length >= MAX_CLIPS) return refuse(D);
  if (S === D && i < at) at--;                           // index shifts after removing from the same list
  S.clips.splice(i, 1); if (S.sel === clip) S.sel = null;
  {
    D.clips.splice(clamp(at, 0, D.clips.length), 0, clip);
  }
  D.sel = clip; selectPad(clip.pad);
  setTarget(dli);
}
function syncLayerUI(){
  for (const L of layers){
    const r = L.row, sel = selClip(L.i);
    r.classList.toggle('on', L.on); r.classList.toggle('tgt', L.i === target); r.querySelector('.llock').classList.toggle('on', !!L.lock);
    const mb = r.querySelector('.lmask'); mb.classList.toggle('on', !!maskEd && maskEd.li === L.i); mb.classList.toggle('has', !!(L.mask && L.mask.on !== false));
    r.querySelector('.lname').title = LROLE[L.i] + ' · ' + (L.i === target ? 'editing this layer' : `click the card or press Alt+${L.i+1} to edit this layer`);
    r.querySelector('.lop').value = L.opacity; { const s = r.querySelector('.lbl'); if (L.i === BG_LAYER){ s.value = (L.sel && L.sel.blend) || 'source-over'; s.disabled = !L.sel; } else s.value = L.blend; } r.querySelectorAll('.ltr button').forEach(b => b.classList.toggle('on', b.dataset.v === String(L.tr || 'cut')));
    if (L.i === 0){ r.querySelector('.lfillon').checked = !!L.fillOn; r.querySelector('.lfill').value = L.fill || '#1e2a3a'; }
    if (L.i === BG_LAYER && L.blend !== 'source-over') L.blend = 'source-over';   // 0.94: nothing under Background to blend with: its select sets the selected GIF's blend instead
    if (L.i === BG_LAYER) for (let p = BG0; p < BG0 + N_BG; p++) if (pads[p].gif && !L.clips.some(c => c.pad === p)) L.clips.push(newClip(p));   // a filled slot always has its chip (0.93.1: one could go missing and the card showed 5)
    const slots = L.i === BG_LAYER ? Array.from({ length: N_BG }, (_, k) => BG0 + k).filter(p => !pads[p].gif).map(p => `<span class="bgslot" data-pad="${p}" title="Empty Background slot: click to fill it from the pool (or a file), or drop a GIF from the pool or a pad on this card">+</span>`).join('') : '';
    const chipHTML = c => { const p = pads[c.pad];   // leftmost chip = drawn on top
      return `<span class="chip${c === sel ? ' sel' : ''}${c.off ? ' off' : ''}" draggable="true" data-id="${c.id}" data-pad="${c.pad}"${p.gif && p.gif.thumb ? ` style="background-image:url(${p.gif.thumb})"` : ''} title="${p.label} · ${esc(p.gif ? p.gif.name : '?')} — click to select, drag to move · right-click: hide / show (find a heavy one) · Ctrl+click to ${isBgPad(c.pad) ? 'empty the slot' : 'remove'}"><span>${p.label}</span><b title="${isBgPad(c.pad) ? 'Empty this slot' : 'Remove from layer'}">×</b></span>`; };
    setHTML(r.querySelector('.clips'), L.clips.slice().reverse().map(chipHTML).join('') + slots);
  }

  updatePadDots();
}

// ---------- UI: transform (selected GIF in the edited layer) ----------
const XF = [['#xX','x',v => v.toFixed(0)],['#xY','y',v => v.toFixed(0)],['#xSX','sx',v => v.toFixed(2)+'×'],['#xSY','sy',v => v.toFixed(2)+'×'],['#xR','rot',v => v.toFixed(0)+'°'],['#xO','alpha',v => Math.round(v*100)+'%']];
const XF_LFO = { '#xX': ['x'], '#xY': ['y'], '#xSX': ['zoom', 'sx'], '#xSY': ['zoom', 'sy'], '#xR': ['rot'], '#xO': ['op'] };
XF.forEach(([id, key, fmt]) => $(id).addEventListener('input', e => { const c = selClip(); if (!c) return;
  const v = +e.target.value;
  if (pvOpt.link && (key === 'sx' || key === 'sy')){ const o = key === 'sx' ? 'sy' : 'sx', r = c[key] > 0 ? v / c[key] : 1; c[o] = clamp(c[o] * r, 0.02, 20); }   // linked: the other one follows, keeping the shape
  c[key] = v; if (pvOpt.link && (key === 'sx' || key === 'sy')) syncXfUI(); else e.target.nextElementSibling.textContent = fmt(v); }));
$('#xLink').addEventListener('change', e => { pvOpt.link = e.target.checked; pvSave(); });
$('#xFromC').addEventListener('change', e => { pvOpt.fromC = e.target.checked; pvSave(); });
// right-click a transform or colour setting → its LFO opens in GIF › Auto
const AUTO_OF = { '#xX': 'x', '#xY': 'y', '#xSX': 'sx', '#xSY': 'sy', '#xR': 'rot', '#xO': 'op', '#hH': 'h', '#hS': 's', '#hV': 'v' };
Object.entries(AUTO_OF).forEach(([id, k]) => {
  const f = $(id).closest('.field'), lb = f; lb.title = 'Right-click: automate this (GIF › Auto)';
  f.addEventListener('contextmenu', e => { e.preventDefault(); showAuto(k); });
});
function showAuto(k){
  const c = selClip(); if (c && c.pad !== selPad) selectPad(c.pad);
  const g = curGif(); if (!g) return;
  if ((k === 'sx' || k === 'sy') && g.lfo.zoom && g.lfo.zoom.on && !(g.lfo[k] && g.lfo[k].on)) k = 'zoom';   // the scale is moved by Zoom
  aSel = k; $('#gTabs [data-v=auto]').click(); syncAutoUI(g);
  const row = $('#aTitle').parentElement; row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  row.classList.remove('hl'); void row.offsetWidth; row.classList.add('hl');
}
onSeg($('#xFitSeg'), b => { const c = selClip(); if (!c) return; const v = b.dataset.v, keep = { rot: c.rot, flipX: c.flipX, flipY: c.flipY, tile: c.tile };   // Base size (0.88: one switch, was a menu + three buttons)
  if (v === 'auto' || v === 'native'){ Object.assign(c, { fit: v, sx: 1, sy: 1 }); placeVisible(c, W / 2, H / 2); }
  else fitScreen(c, v);                                // Fit / Fill / Stretch: its cropped part sized to the frame, centred
  Object.assign(c, keep); syncXfUI(); });
$('#xFx').addEventListener('change', e => { const c = selClip(); if (c) c.flipX = e.target.checked; });
$('#xFy').addEventListener('change', e => { const c = selClip(); if (c) c.flipY = e.target.checked; });
$('#xT').addEventListener('change', e => { const c = selClip(); if (c) c.tile = e.target.checked; });
$('#xReset').addEventListener('click', () => { const c = selClip(); if (c){ Object.assign(c, newXf()); syncXfUI(); } });

// the bounds of the non-transparent pixels over all frames, as crop fractions (kept on the frame list)
function contentCrop(src){
  if (src._cc) return src._cc;
  const w = src[0].width, h = src[0].height, cv = new OffscreenCanvas(w, h), x = cv.getContext('2d', { willReadFrequently: true });
  let l = w, t = h, r = -1, b = -1;
  for (const f of src){ x.clearRect(0, 0, w, h); x.drawImage(f, 0, 0); const d = x.getImageData(0, 0, w, h).data;
    for (let y = 0; y < h; y++){ const row = y * w * 4; for (let i = 0; i < w; i++) if (d[row + i*4 + 3] > 8){ if (i < l) l = i; if (i > r) r = i; if (y < t) t = y; if (y > b) b = y; } } }
  return src._cc = r < 0 ? null : { cl: l / w, ct: t / h, cr: (w - 1 - r) / w, cb: (h - 1 - b) / h };
}
$('#xCropAuto').addEventListener('click', () => {
  const c = selClip(), g = c && pads[c.pad].gif; if (!g) return;
  const k = contentCrop(g.src); if (!k) return toast('This GIF is fully transparent');
  if (!(k.cl || k.ct || k.cr || k.cb)) return toast2('No see-through border to crop');
  Object.assign(c, k); syncXfUI(); commit();
});
$('#xCropReset').addEventListener('click', () => {
  const c = selClip(); if (!c) return;
  const G = clipGeom(c); Object.assign(c, { cl: 0, ct: 0, cr: 0, cb: 0 }); placeVisible(c, G.cx, G.cy); syncXfUI();
});
// Transform's heading arrow in the signal colour when the selected GIF's placement is away from the defaults (as the GIF sections do)
const XF_MARK = ['fit', 'flipX', 'flipY', 'tile'];   // only what the preview can't show you're changing (move, size, turn and crop happen right there)
function markXf(c = selClip()){ const d = newXf(), m = !!c && (XF_MARK.some(k => (c[k] ?? d[k]) !== d[k]) || (c.alpha ?? 1) !== 1); $('#xfHead').classList.toggle('mod', m); $('#gTabs [data-v=xf]').classList.toggle('act', m); }   // (0.88: on the Transform tab, like Auto's)
function syncXfUI(){
  const c = selClip();
  $('#xfPanel').classList.toggle('disabled', !c);
  $('#xfTag').textContent = c ? `${LNAMES[target]} · ${pads[c.pad].label}` : `${LNAMES[target]} · nothing selected`; $('#xfTag').title = c && pads[c.pad].gif ? pads[c.pad].gif.name : '';
  if (!c){ markXf(null);                           // nothing selected: show neutral values, not the last GIF's
    XF.forEach(([id]) => { const el = $(id); el.value = el.dataset.def ?? 0; el.nextElementSibling.textContent = '—'; el.nextElementSibling.classList.remove('mod'); });
    segSet('#xFitSeg', 'auto'); $('#xFx').checked = $('#xFy').checked = $('#xT').checked = false; $('#xCrop').textContent = 'none';
    return;
  }
  XF.forEach(([id, key, fmt]) => { $(id).value = c[key]; $(id).nextElementSibling.textContent = fmt(c[key]); });
  const g = pads[c.pad].gif;                         // automated values: readout tinted blue (it shows the base value)
  Object.entries(XF_LFO).forEach(([id, ks]) => { const o = $(id).nextElementSibling, m = !!g && ks.some(k => g.lfo[k] && g.lfo[k].on);
    o.classList.toggle('mod', m); o.title = m ? 'Automated (GIF › Auto) — this is the base value' : ''; });
  segSet('#xFitSeg', c.fit || 'auto'); $('#xFx').checked = c.flipX; $('#xFy').checked = c.flipY; $('#xT').checked = c.tile;
  const pc = v => Math.round(v * 100);
  $('#xCrop').textContent = (c.cl || c.ct || c.cr || c.cb) ? `L${pc(c.cl)} T${pc(c.ct)} R${pc(c.cr)} B${pc(c.cb)}%${c.tile ? ' (tiled)' : ''}` : 'none';
  markXf(c);
}

// ---------- preview mouse: select, move, resize handles ----------
let drag = null, wheelT = 0, pvHover = null;   // pvHover: [layer, clip] a press would take, when it isn't the selected one
const editSel = () => layers[target].lock ? null : selClip();   // what the mouse may change: nothing on a locked layer
function evtToOut(e){ const r = pv.getBoundingClientRect(), z = r.width / (pv.clientWidth || r.width); return [((e.clientX - r.left) / z - view.x) * W / view.w, ((e.clientY - r.top) / z - view.y) * H / view.h]; }
function cursorFor(h, shift){ if (!h) return ''; if (h === 'rot') return 'grab'; if (shift) return 'crosshair'; if (h[0] && h[1]) return h[0] * h[1] > 0 ? 'nwse-resize' : 'nesw-resize'; return h[0] ? 'ew-resize' : 'ns-resize'; }

pv.addEventListener('pointerdown', e => {
  if (maskEd){ maskDown(e); return; }               // painting a mask: the preview is the canvas
  const [px, py] = evtToOut(e);
  if (picking){ pickAt(px, py); return; }
  pv.setPointerCapture(e.pointerId);
  let c = editSel(); const h = hitHandle(c, px, py);
  if (h === 'rot'){ const G = clipGeom(c); drag = { type: 'rot', c, cx: G.cx, cy: G.cy, a0: Math.atan2(py - G.cy, px - G.cx), r0: c.rot }; pv.style.cursor = 'grabbing'; return; }
  if (h){ drag = { type: e.shiftKey ? 'crop' : 'resize', h, c, G0: clipGeom(c), sx0: c.sx, sy0: c.sy }; return; }
  let hit, cyc = false; const outside = px < 0 || px > W || py < 0 || py > H;   // outside the canvas nothing shows, so only a handle counts there
  if (outside) hit = null;
  else if (e.altKey){                                         // Alt+click: cycle down through what's under the cursor
    const all = hitsAt(px, py, false).filter(h => !pvOpt.pickLayer || h[0] === target), i = all.findIndex(h => h[1] === c);
    hit = all.length ? all[(i + 1) % all.length] : null;
  } else { hit = pickClip(px, py); cyc = !!hit && hit[1] === c; }   // what the hover outline shows: the selected GIF while on it (a click without moving then steps to the next), else the one you see there
  if (hit){ layers[hit[0]].sel = hit[1]; if (hit[0] !== target) setTarget(hit[0]); else { syncLayerUI(); syncXfUI(); } selectPad(hit[1].pad); c = hit[1]; }
  if (!hit && outside){   // a click in the border around the canvas, on nothing: no GIF selected (its frame and handles go)
    if (layers[target].sel !== false){ layers[target].sel = false; syncLayerUI(); syncXfUI(); redraw.all = true; } return; }
  if (c) drag = { type: 'move', c, px, py, x0: c.x, y0: c.y, cyc };
});
pv.addEventListener('pointermove', e => {
  const [px, py] = evtToOut(e);
  if (maskEd){ pv.style.cursor = maskOpt.tool === 'free' ? 'none' : 'crosshair'; return; }
  if (!drag){ if (picking) return; const hh = hitHandle(editSel(), px, py), out = px < 0 || px > W || py < 0 || py > H, hp = hh || out || e.altKey ? null : pickClip(px, py);
    pv.style.cursor = cursorFor(hh, e.shiftKey) || (hp ? 'move' : 'default');
    const hc = hp && hp[1] !== editSel() ? hp : null; if ((hc && hc[1]) !== (pvHover && pvHover[1])){ pvHover = hc; redraw.all = true; }   // the outline of what a press would take
    return; }
  const c = drag.c;
  if (drag.type === 'rot'){
    let r = drag.r0 + (Math.atan2(py - drag.cy, px - drag.cx) - drag.a0) * 180 / Math.PI;
    drag.snapRot = null;
    if (e.shiftKey) r = Math.round(r / 15) * 15;
    else if (pvOpt.stick && !e.altKey){                // Stick: straight (0 / 90 / 180°), 45°, and the angle of any slanted guide on show pull the angle in within 4°
      const cand = [0, 45, 90, 135].map(a => ({ a, lines: [] }));
      for (const L of guideSlants()){ const a = mod(Math.atan2(L[3] - L[1], L[2] - L[0]) * 180 / Math.PI, 180), o = cand.find(c => Math.abs(c.a - a) < 0.05); if (o) o.lines.push(L); else cand.push({ a, lines: [L] }); }
      let best = null; for (const c of cand){ const d = mod(r - c.a + 90, 180) - 90; if (Math.abs(d) < 4 && (!best || Math.abs(d) < Math.abs(best.d))) best = { ...c, d }; }
      if (best){ r -= best.d; drag.snapRot = best; }
    }
    c.rot = mod(r + 180, 360) - 180;
    placeVisible(c, drag.cx, drag.cy);                   // spin around the visible center
  } else if (drag.type === 'crop'){
    // pointer → position across the uncropped image, in screen orientation (0 = screen-left / top edge)
    const { G0, h } = drag, [lx, ly] = toLocal(G0, px, py), MIN = 0.02;
    if (h[0]){
      const us = clamp((lx + G0.ox) / (c.sx * G0.fbw) + 0.5, 0, 1);
      const [L, R] = c.flipX ? ['cr', 'cl'] : ['cl', 'cr'];   // which source edge sits on screen-left / right
      if (h[0] > 0) c[R] = clamp(1 - us, 0, 1 - c[L] - MIN); else c[L] = clamp(us, 0, 1 - c[R] - MIN);
    }
    if (h[1]){
      const vs = clamp((ly + G0.oy) / (c.sy * G0.fbh) + 0.5, 0, 1);
      const [T, B] = c.flipY ? ['cb', 'ct'] : ['ct', 'cb'];
      if (h[1] > 0) c[B] = clamp(1 - vs, 0, 1 - c[T] - MIN); else c[T] = clamp(vs, 0, 1 - c[B] - MIN);
    }
  } else if (drag.type === 'move'){
    if (!drag.moved && Math.hypot(px - drag.px, py - drag.py) < 3 * W / view.w) return;   // a click, not a drag yet (a hand's jitter doesn't nudge it)
    drag.moved = true;
    const fx = clamp(drag.x0 + px - drag.px, -W, W), fy = clamp(drag.y0 + py - drag.py, -H, H);   // where the pointer alone puts it
    if (e.shiftKey && drag.lock){                       // Shift on a lit guide: the GIF slides along that line only
      const L = drag.lock; c.x = fx; c.y = fy;
      if (L.line){ const G = clipGeom(c), ax = G.cx + (L.ox || 0), ay = G.cy + (L.oy || 0), [x0, y0, x1, y1] = L.line, dx = x1 - x0, dy = y1 - y0, t = clamp(((ax - x0) * dx + (ay - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);   // the hooked point (centre or a handle) slides on the line
        c.x += x0 + t * dx - ax; c.y += y0 + t * dy - ay; }
      else if (L.x != null && (L.y == null || Math.abs(fy - L.cy) >= Math.abs(fx - L.cx))) c.x = L.cx;   // on a vertical line (both lit: the way the pointer goes most)
      else c.y = L.cy;
      drag.snap = L; return;
    }
    if (!e.shiftKey) drag.lock = null;
    c.x = fx; c.y = fy; drag.snap = null;
    if ((pvOpt.stick || e.shiftKey) && !e.altKey){       // stick: the GIF's edges or centre onto a guide, the centre or an edge, within ~8 screen px
      const G = clipGeom(c);
      if (G){ const tol = 8 * W / view.w, rx = Math.abs(G.hw * Math.cos(G.a)) + Math.abs(G.hh * Math.sin(G.a)), ry = Math.abs(G.hw * Math.sin(G.a)) + Math.abs(G.hh * Math.cos(G.a));
        const [gx, gy] = guideLines(), [sx, sy] = safeLines(), LX = [0, W / 2, W, ...gx, ...sx], LY = [0, H / 2, H, ...gy, ...sy];
        const best = (pts, lines) => { let b = null; for (const p of pts) for (const l of lines){ const d = l - p; if (Math.abs(d) <= tol && (!b || Math.abs(d) < Math.abs(b.d))) b = { d, l, p }; } return b; };
        const bx = best([G.cx - rx, G.cx, G.cx + rx], LX), by = best([G.cy - ry, G.cy, G.cy + ry], LY);
        // slanted guides: the centre slides onto the nearest diagonal / perspective ray (closest point on it)
        // (0.87.3: its corners and edge middles too, so a box edge can sit on a vanishing-point ray)
        const anc = [[G.cx, G.cy], ...HANDLES.map(h => toWorld(G, h[0] * G.hw, h[1] * G.hh))];
        let sl = null; for (const [x0, y0, x1, y1] of guideSlants()){ const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy; if (!L2) continue;
          for (const [ax, ay] of anc){ const t = clamp(((ax - x0) * dx + (ay - y0) * dy) / L2, 0, 1), qx = x0 + t * dx, qy = y0 + t * dy, d = Math.hypot(qx - ax, qy - ay);
            if (d <= tol && (!sl || d < sl.d)) sl = { d, mx: qx - ax, my: qy - ay, line: [x0, y0, x1, y1], ax: qx, ay: qy }; } }
        const sd = Math.min(bx ? Math.abs(bx.d) : Infinity, by ? Math.abs(by.d) : Infinity);
        if (sl && sl.d < sd){ drag.snap = { x: null, y: null, line: sl.line, p: [sl.ax, sl.ay], ox: sl.ax - (G.cx + sl.mx), oy: sl.ay - (G.cy + sl.my) }; c.x += sl.mx; c.y += sl.my; }
        else if (bx || by){ drag.snap = { x: bx ? bx.l : null, y: by ? by.l : null, p: [bx ? bx.l : (by ? G.cx : 0), by ? by.l : G.cy] }; if (bx) c.x += bx.d; if (by) c.y += by.d; } }   // p: the hooked point (an edge or the centre)
    }
    if (e.shiftKey && drag.snap) drag.lock = { ...drag.snap, cx: c.x, cy: c.y };   // Shift while a guide is lit: from now on, along that guide
  } else {
    const { G0, h } = drag, [lx, ly] = toLocal(G0, px, py), center = e.altKey !== !!pvOpt.fromC;
    let ncx = 0, ncy = 0;
    if (h[0] && h[1]){                                   // corner: uniform zoom, opposite corner anchored
      const ax = center ? 0 : -h[0]*G0.hw, ay = center ? 0 : -h[1]*G0.hh;
      const dx = h[0]*G0.hw - ax, dy = h[1]*G0.hh - ay;
      const k = Math.max(0.02 / Math.min(drag.sx0, drag.sy0), ((lx - ax)*dx + (ly - ay)*dy) / (dx*dx + dy*dy));
      c.sx = clamp(drag.sx0 * k, 0.02, 20); c.sy = clamp(drag.sy0 * k, 0.02, 20);
      if (!center){ ncx = ax + dx * k / 2; ncy = ay + dy * k / 2; }
    } else if (h[0]){                                    // left/right side: stretch X
      const ax = center ? 0 : -h[0]*G0.hw;
      const w = Math.max(4, center ? 2 * h[0] * lx : h[0] * (lx - ax));
      c.sx = clamp(w / G0.bw, 0.02, 20); if (pvOpt.link) c.sy = clamp(drag.sy0 * c.sx / drag.sx0, 0.02, 20);
      if (!center) ncx = ax + h[0] * c.sx * G0.bw / 2;
    } else {                                             // top/bottom side: stretch Y
      const ay = center ? 0 : -h[1]*G0.hh;
      const hh = Math.max(4, center ? 2 * h[1] * ly : h[1] * (ly - ay));
      c.sy = clamp(hh / G0.bh, 0.02, 20); if (pvOpt.link) c.sx = clamp(drag.sx0 * c.sy / drag.sy0, 0.02, 20);
      if (!center) ncy = ay + h[1] * c.sy * G0.bh / 2;
    }
    const [wx, wy] = toWorld(G0, ncx, ncy);
    placeVisible(c, wx, wy);
  }
  syncXfUI();
});
pv.addEventListener('pointerup', e => {
  if (drag && drag.type === 'rot') pv.style.cursor = 'grab';
  // a click (no drag) on the GIF that was already selected: the next GIF under the pointer (no timing: the outline shows it
  // at once); pressing on it and dragging moves it (0.89.5: a click within 1.5 s used to cycle, even one meant as a drag)
  if (drag && drag.type === 'move' && drag.cyc && !drag.moved){ const [px, py] = evtToOut(e), hit = nextPick(px, py, drag.c);
    if (hit && hit[1] !== drag.c){ layers[hit[0]].sel = hit[1]; if (hit[0] !== target) setTarget(hit[0]); else { syncLayerUI(); syncXfUI(); } selectPad(hit[1].pad); redraw.all = true; } }
  drag = null; commit();
});
// a right click during a drag cancels it (0.89): the preview's move / size / turn / crop put back as they were, a carried pad dropped nowhere
pv.addEventListener('pointerdown', () => { if (drag && !drag.orig && drag.c) drag.orig = Object.fromEntries(XF_KEYS.map(k => [k, drag.c[k]])); });   // (after the handler above made the drag)
let dragCancelT = 0;
function cancelDrags(){
  let any = false;
  if (drag && drag.c){ if (drag.orig) Object.assign(drag.c, drag.orig); drag = null; pv.style.cursor = ''; syncXfUI(); redraw.all = true; any = true; }
  if (padDrag && padDrag.moved){ const i = padDrag.i; padDragEnd(null, i); any = true; }
  if (scDrag && scDrag.moved){ scDragStop(null); any = true; }
  if (typeof trDrag !== 'undefined' && trDrag && trDrag.moved){ trDragStop(null); any = true; }
  if (fxDrag && fxDrag.moved && !fxDrag.cancel){ fxDrag.cancel = true; copyHoldEnd(fxDrag); unmarkTiles(document.querySelectorAll('#fxPre .fxp')); ghost.hide(); any = true; }
  if (any){ dragCancelT = performance.now(); toast2('Cancelled'); }
  return any;
}
addEventListener('pointermove', e => { if (e.buttons & 2) cancelDrags(); }, true);   // the right button pressed while the left one is held arrives as a move
addEventListener('pointerdown', e => { if (e.button === 2 && cancelDrags()) e.stopPropagation(); }, true);
addEventListener('contextmenu', e => { if (performance.now() - dragCancelT < 800 || cancelDrags()){ e.preventDefault(); e.stopPropagation(); } }, true);
// preview tools: guides, stick, ghosts (per browser)
const pvSave = () => { Prefs.setJson('vjif-pvopt', pvOpt); redraw.all = true; };
const pvUI = () => { document.querySelectorAll('#guideGrp [data-g]').forEach(b => b.classList.toggle('on', !!pvOpt.guides[b.dataset.g])); $('#guideGrp').classList.toggle('ghidden', !!pvOpt.gHide); $('#guideEye').classList.toggle('on', !pvOpt.gHide && anyGuide());
  $('#stickBtn').classList.toggle('on', pvOpt.stick); $('#ghostBtn').classList.toggle('on', pvOpt.ghosts); $('#pickLayerBtn').classList.toggle('on', pvOpt.pickLayer); $('#loupeBtn').classList.toggle('on', pvOpt.loupe); $('#gridX').value = pvOpt.gx; $('#gridY').value = pvOpt.gy; $('#guideCol').value = pvOpt.gcol; $('#xLink').checked = pvOpt.link; $('#xFromC').checked = pvOpt.fromC; };
pvUI();
$('#guideEye').addEventListener('click', () => { pvOpt.gHide = !pvOpt.gHide; pvUI(); pvSave(); });
$('#guideGrp').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; const k = b.dataset.g; if (pvOpt.gHide){ pvOpt.gHide = false; if (pvOpt.guides[k]){ pvUI(); pvSave(); return; } } pvOpt.guides[k] = !pvOpt.guides[k]; if (!pvOpt.guides[k]) delete pvOpt.guides[k]; pvUI(); pvSave(); });
$('#stickBtn').addEventListener('click', () => { pvOpt.stick = !pvOpt.stick; pvUI(); pvSave(); });
$('#ghostBtn').addEventListener('click', () => { pvOpt.ghosts = !pvOpt.ghosts; pvUI(); pvSave(); });
$('#loupeBtn').addEventListener('click', () => { pvOpt.loupe = !pvOpt.loupe; pvUI(); pvSave(); if (!pvOpt.loupe){ $('#loupe').hidden = true; loupePin = false; $('#loupe').classList.remove('pin'); } });
// the loupe (0.93): 4× the preview around the pointer, the picture and what's drawn over it (handles, mask tint), crisp pixels
let loupeAt = null;
function drawLoupe(){
  const L = $('#loupe'); if (!pvOpt.loupe || !loupeAt){ if (!L.hidden) L.hidden = true; return; }
  const dpr = devicePixelRatio || 1, Z = 4, n = L.width / dpr, [px, py] = loupeAt, sx = pvScene.width / CW;   // device px per render px in the preview
  if (L.hidden){ L.hidden = false; L.style.width = L.style.height = n + 'px'; loupePlace(); }
  const x = L.getContext('2d'), src = L.width / (sx * Z), mx = px * CW / W - src / 2, my = py * CH / H - src / 2;
  x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, L.width, L.height);
  x.drawImage(pvSrc(), mx, my, src, src, 0, 0, L.width, L.height);
  const ox = (view.x + px * view.w / W) * dpr - L.width / Z / 2, oy = (view.y + py * view.h / H) * dpr - L.height / Z / 2;
  x.drawImage(pv, ox, oy, L.width / Z, L.height / Z, 0, 0, L.width, L.height);
  x.strokeStyle = '#fff8'; x.lineWidth = 1; x.beginPath(); x.moveTo(L.width / 2, L.height / 2 - 8 * dpr); x.lineTo(L.width / 2, L.height / 2 + 8 * dpr); x.moveTo(L.width / 2 - 8 * dpr, L.height / 2); x.lineTo(L.width / 2 + 8 * dpr, L.height / 2); x.stroke();
}
// 0.99: drag the loupe where it doesn't cover what you're looking at (remembered); right-click pins it: it stays on screen,
// fixed on the spot it shows (border in amber), the picture still live; right-click again: it follows the pointer again
let loupePin = false;
pv.addEventListener('pointermove', e => { if (!pvOpt.loupe || loupePin) return; loupeAt = evtToOut(e); drawLoupe(); });
pv.addEventListener('pointerleave', e => { if (loupePin || e.relatedTarget === $('#loupe')) return; loupeAt = null; drawLoupe(); });
const loupePlace = () => { const L = $('#loupe'), P = L.offsetParent; if (!P || !pvOpt.lpos){ L.style.left = L.style.top = ''; return; }
  const w = L.offsetWidth || 240, h = L.offsetHeight || 240, x = clamp(pvOpt.lpos[0] * P.clientWidth, 0, Math.max(0, P.clientWidth - w)), y = clamp(pvOpt.lpos[1] * P.clientHeight, 0, Math.max(0, P.clientHeight - h));
  Object.assign(L.style, { left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto' }); };
addEventListener('resize', loupePlace);
$('#loupe').addEventListener('pointerdown', e => { if (e.button) return; const L = $('#loupe'), P = L.offsetParent; if (!P) return; e.preventDefault(); L.setPointerCapture(e.pointerId);
  const r = L.getBoundingClientRect(), pr = P.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top; L.classList.add('drag');
  const mv = ev => { pvOpt.lpos = [(ev.clientX - dx - pr.left) / P.clientWidth, (ev.clientY - dy - pr.top) / P.clientHeight]; loupePlace(); };
  const up = () => { L.removeEventListener('pointermove', mv); L.removeEventListener('pointerup', up); L.classList.remove('drag'); pvSave(); };
  L.addEventListener('pointermove', mv); L.addEventListener('pointerup', up); });
$('#loupe').addEventListener('dblclick', () => { pvOpt.lpos = null; loupePlace(); pvSave(); });   // back to the corner
$('#loupe').addEventListener('contextmenu', e => { e.preventDefault(); loupePin = !loupePin; $('#loupe').classList.toggle('pin', loupePin); if (!loupePin){ loupeAt = null; drawLoupe(); } });
$('#loupe').title = 'Loupe: drag to move it (double-click: back to the corner) · right-click: pin it on the spot it shows, so it stays while you work elsewhere (right-click again to let go)';
loupePlace();
$('#pickLayerBtn').addEventListener('click', () => { pvOpt.pickLayer = !pvOpt.pickLayer; pvUI(); pvSave(); toast2(pvOpt.pickLayer ? 'Current layer only: picking on the selected layer' : 'Picking on any layer'); });
const setGrid = (k, v) => { v = clamp(Math.round(v), 1, 24); pvOpt[k] = v; const o = k === 'gx' ? 'gy' : 'gx'; if (v === 1 && pvOpt[o] === 1) pvOpt[o] = 2;   // 1×1 draws nothing
  pvOpt.guides.grid = true; pvUI(); pvSave(); };
[['#gridX', 'gx'], ['#gridY', 'gy']].forEach(([id, k]) => { const el = $(id);
  el.addEventListener('input', e => { const v = +e.target.value; if (v >= 1 && v <= 24) setGrid(k, v); });
  let dg = null;   // drag up / down to change, like the tempo; a click without moving types
  el.addEventListener('pointerdown', e => { if (e.button) return; dg = { y: e.clientY, v: pvOpt[k], moved: false }; el.setPointerCapture(e.pointerId); e.preventDefault(); });
  el.addEventListener('pointermove', e => { if (!dg) return; const dy = dg.y - e.clientY; if (Math.abs(dy) > 3) dg.moved = true; if (dg.moved) setGrid(k, dg.v + dy / 8); });
  el.addEventListener('pointerup', () => { if (dg && !dg.moved){ el.focus(); el.select(); } dg = null; }); });
$('#guideCol').addEventListener('input', e => { pvOpt.gcol = e.target.value; pvSave(); });
[['#gridX', 'gx'], ['#gridY', 'gy']].forEach(([id, k]) => $(id).addEventListener('wheel', e => { e.preventDefault(); setGrid(k, pvOpt[k] + (e.deltaY < 0 ? 1 : -1)); }, { passive: false }));
pv.addEventListener('pointercancel', () => drag = null);
pv.addEventListener('pointerleave', () => { if (pvHover){ pvHover = null; redraw.all = true; } });
pv.addEventListener('wheel', e => {
  e.preventDefault();
  if (maskEd && (e.ctrlKey || e.metaKey)){ const d = e.deltaY || e.deltaX, el = $('#maskSize'); el.value = clamp(Math.round(maskOpt.size * (d < 0 ? 1.12 : 1 / 1.12)), +el.min, +el.max); el.dispatchEvent(new Event('input')); toast2(`Brush ${el.value} px`); return; }   // painting a mask: Ctrl+wheel sizes the brush (0.93)
  const c = selClip(); if (!c) return;
  const d = e.deltaY || e.deltaX;
  if (e.shiftKey || e.altKey) c.rot = mod(c.rot + Math.sign(d) * 5 + 180, 360) - 180;
  else { const f = Math.exp(-d * 0.0015); c.sx = clamp(c.sx * f, 0.02, 20); c.sy = clamp(c.sy * f, 0.02, 20); }
  syncXfUI(); clearTimeout(wheelT); wheelT = setTimeout(commit, 400);   // one undo step per wheel gesture
}, { passive: false });
pv.addEventListener('dblclick', e => {
  const [px, py] = evtToOut(e), c = selClip();
  if (c && inClip(c, px, py)){ Object.assign(c, newXf()); syncXfUI(); }
});
function sizePreview(){
  const wrap = $('#pvWrap'), aw = wrap.clientWidth, ah = wrap.clientHeight, dpr = devicePixelRatio || 1, M = 40;
  pv.width = Math.round(aw * dpr); pv.height = Math.round(ah * dpr);
  // the picture is the output at a whole number of eighths, counted in screen pixels (so the OS / browser scaling is included):
  // anything that repeats every 1, 2, 4 or 8 output pixels (Dot Matrix, dither, scanlines) lands the same way in every repeat
  // (0.89.4; the output window's reset size, half, is one of them). The largest eighth that fits; only a box smaller than
  // 1/8 of the output scales freely
  const fit = Math.min(aw - 2*M, (ah - 2*M) * W / H), [ew, eh, e8] = eighthFit(fit * dpr, fit * H / W * dpr + 1e-6);
  let pw, ph;
  if (e8){ pw = ew; ph = eh; view.w = pw / dpr; view.h = ph / dpr; }
  else { view.w = Math.max(160 * Math.min(1, W / H), fit); view.h = view.w * H / W; pw = Math.round(view.w * dpr); ph = Math.round(view.h * dpr); }
  view.x = Math.round((aw - view.w) / 2 * dpr) / dpr; view.y = Math.round((ah - view.h) / 2 * dpr) / dpr;   // on a screen pixel
  view.e8 = e8;
  Object.assign(pvScene.style, { left: view.x + 'px', top: view.y + 'px', width: view.w + 'px', height: view.h + 'px' });
  if (pvScene.width !== pw || pvScene.height !== ph){ pvScene.width = pw; pvScene.height = ph; }   // one canvas pixel per screen pixel
  const bar = $('#pvBar'); if (bar){ if (bar.parentElement !== wrap) wrap.appendChild(bar);   // the guides bar: halfway between the picture and the panel below
    const bh = bar.offsetHeight || 32, below = ah - (view.y + view.h); bar.style.top = Math.max(view.y + view.h + 2, Math.min(ah - bh - 2, view.y + view.h + (below - bh) / 2)) + 'px'; }
  redraw.all = true;
}
new ResizeObserver(sizePreview).observe($('#pvWrap'));
(function watchDpr(){ matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener('change', () => { sizePreview(); watchDpr(); }, { once: true }); })();   // browser zoom / moved to another screen
