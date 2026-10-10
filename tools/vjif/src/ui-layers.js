// ---------- UI: layers ----------
function buildLayers(){
  const box = $('#layers');
  for (let li = 0; li < 4; li++){
    const L = layers[li], row = document.createElement('div');
    row.className = 'layer'; row.style.setProperty('--lc', LCOL[li]);
    // a narrow card: on / name / clear — mode / blend — opacity — GIF chips
    row.innerHTML = `<div class="lhead"><button class="lon" title="On / off: Shift+${li+1} (End: the edit layer)">${li+1}</button>
      <span class="lname" title="Click the card, PgUp / PgDn or Alt+${li+1} to edit this layer">${LNAMES[li]}</span>
      ${li === 0 ? '<span class="lfillw" title="Background colour, under this layer\'s GIFs"><input type="checkbox" class="lfillon"><input type="color" class="lfill"></span>' : ''}
      <button class="lclr" title="Clear: remove all GIFs from this layer">×</button></div>
      <div class="lrow">      <select class="lbl" title="Layer blend mode">${BLENDS.map(b => `<option value="${b[0]}">${b[1]}</option>`).join('')}</select></div>
      <span class="lopw"><input class="lop" type="range" min="0" max="1" step="0.01" data-def="1" title="Layer opacity"></span>
      <div class="seg ltr" title="Turning this layer on / off (its number, Shift+${li+1}, End, MIDI): ✕ straight away, ★ with the armed transition, 1–9 always with that preset"><button data-v="cut" title="On / off: straight away (cut)">✕</button><button data-v="armed" title="On / off: with the armed transition">★</button>${[1,2,3,4,5,6,7,8,9].map(k => `<button data-v="${k - 1}" title="On / off: always with transition preset ${k}">${k}</button>`).join('')}</div>
      <div class="clips"></div>`;
    row.querySelector('.lon').addEventListener('click', () => toggleLayer(li));
    row.addEventListener('pointerdown', e => { if (!e.target.closest('button, select, input, .chip') && target !== li) setTarget(li); });
    row.querySelector('.lclr').addEventListener('click', () => { L.clips = []; L.sel = null; syncLayerUI(); syncXfUI(); });
    row.querySelector('.lop').addEventListener('input', e => { L.opacity = +e.target.value; });
    if (li === 0){
      row.querySelector('.lfillon').addEventListener('change', e => { L.fillOn = e.target.checked; });
      row.querySelector('.lfill').addEventListener('input', e => { L.fill = e.target.value; L.fillOn = true; row.querySelector('.lfillon').checked = true; });
    }
    row.querySelector('.lop').addEventListener('pointerdown', () => { if (target !== li) setTarget(li); });
    row.querySelector('.lbl').addEventListener('change', e => { L.blend = e.target.value; });
    onSeg(row.querySelector('.ltr'), (b, e) => { L.tr = b.dataset.v; syncLayerUI(); });
    row.querySelector('.clips').addEventListener('click', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      const c = L.clips.find(c => c.id === +chip.dataset.id); if (!c) return;
      if (e.target.tagName === 'B' || isDel(e)) removeClip(li, c);
      else { L.sel = c; selectPad(c.pad); setTarget(li); }
    });
    row.querySelector('.clips').addEventListener('contextmenu', e => {   // right-click a chip: select it (a Mac's Ctrl+click arrives here: delete)
      const chip = e.target.closest('.chip'); if (!chip) return; e.preventDefault();
      const c = L.clips.find(c => c.id === +chip.dataset.id); if (!c) return;
      if (e.ctrlKey) removeClip(li, c); else { L.sel = c; selectPad(c.pad); setTarget(li); }
    });
    const clipsEl = row.querySelector('.clips');
    clipsEl.addEventListener('dragstart', e => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      e.dataTransfer.setData(CLIP_MIME, `${li}:${chip.dataset.id}`); e.dataTransfer.effectAllowed = 'copyMove';
      chip.classList.add('dragging'); e.dataTransfer.setDragImage(NO_IMG, 0, 0); ghost.chip(+chip.dataset.pad, e.clientX, e.clientY, LCOL[li]);   // in its layer's colour
    });
    clipsEl.addEventListener('dragend', e => { const chip = e.target.closest('.chip'); if (chip) chip.classList.remove('dragging');
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
    row.addEventListener('dragover', e => {
      if (!e.dataTransfer.types.includes(CLIP_MIME)) return;
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
function moveClip(sli, sid, dli, at){
  const S = layers[sli], D = layers[dli], clip = S.clips.find(c => c.id === sid); if (!clip) return;
  const i = S.clips.indexOf(clip);
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
    r.classList.toggle('on', L.on); r.classList.toggle('tgt', L.i === target);
    r.querySelector('.lname').title = L.i === target ? 'Editing this layer' : `Click the card or press Alt+${L.i+1} to edit this layer`;
    r.querySelector('.lop').value = L.opacity; r.querySelector('.lbl').value = L.blend; r.querySelectorAll('.ltr button').forEach(b => b.classList.toggle('on', b.dataset.v === String(L.tr || 'cut')));
    if (L.i === 0){ r.querySelector('.lfillon').checked = !!L.fillOn; r.querySelector('.lfill').value = L.fill || '#1e2a3a'; }
    setHTML(r.querySelector('.clips'), L.clips.slice().reverse().map(c => {   // leftmost chip = drawn on top
      const p = pads[c.pad];
      return `<span class="chip${c === sel ? ' sel' : ''}" draggable="true" data-id="${c.id}" data-pad="${c.pad}"${p.gif && p.gif.thumb ? ` style="background-image:url(${p.gif.thumb})"` : ''} title="${p.label} · ${esc(p.gif ? p.gif.name : '?')} — click to select, drag to move · Ctrl+click to remove"><span>${p.label}</span><b title="Remove from layer">×</b></span>`;
    }).join(''));
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
$('#xFit').addEventListener('change', e => { const c = selClip(); if (c) c.fit = e.target.value; });
$('#xFx').addEventListener('change', e => { const c = selClip(); if (c) c.flipX = e.target.checked; });
$('#xFy').addEventListener('change', e => { const c = selClip(); if (c) c.flipY = e.target.checked; });
$('#xT').addEventListener('change', e => { const c = selClip(); if (c) c.tile = e.target.checked; });
$('#xReset').addEventListener('click', () => { const c = selClip(); if (c){ Object.assign(c, newXf()); syncXfUI(); } });
[['#xFitS', 'contain'], ['#xFill', 'cover'], ['#xStr', 'stretch']].forEach(([id, fit]) =>
  $(id).addEventListener('click', () => { const c = selClip(); if (c){ fitScreen(c, fit); syncXfUI(); } }));   // fits the cropped part
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
function syncXfUI(){
  const c = selClip();
  $('#xfPanel').classList.toggle('disabled', !c);
  $('#xfTitle').textContent = c ? `${LNAMES[target]} · ${pads[c.pad].label} · ${pads[c.pad].gif ? pads[c.pad].gif.name : ''}` : `${LNAMES[target]} · no GIF selected`;
  if (!c){                                          // nothing selected: show neutral values, not the last GIF's
    XF.forEach(([id]) => { const el = $(id); el.value = el.dataset.def ?? 0; el.nextElementSibling.textContent = '—'; el.nextElementSibling.classList.remove('mod'); });
    $('#xFit').value = 'auto'; $('#xFx').checked = $('#xFy').checked = $('#xT').checked = false; $('#xCrop').textContent = 'none';
    return;
  }
  XF.forEach(([id, key, fmt]) => { $(id).value = c[key]; $(id).nextElementSibling.textContent = fmt(c[key]); });
  const g = pads[c.pad].gif;                         // automated values: readout tinted blue (it shows the base value)
  Object.entries(XF_LFO).forEach(([id, ks]) => { const o = $(id).nextElementSibling, m = !!g && ks.some(k => g.lfo[k] && g.lfo[k].on);
    o.classList.toggle('mod', m); o.title = m ? 'Automated (GIF › Auto) — this is the base value' : ''; });
  $('#xFit').value = c.fit; $('#xFx').checked = c.flipX; $('#xFy').checked = c.flipY; $('#xT').checked = c.tile;
  const pc = v => Math.round(v * 100);
  $('#xCrop').textContent = (c.cl || c.ct || c.cr || c.cb) ? `L${pc(c.cl)} T${pc(c.ct)} R${pc(c.cr)} B${pc(c.cb)}%${c.tile ? ' (ignored when tiled)' : ''}` : 'none';
}

// ---------- preview mouse: select, move, resize handles ----------
let drag = null, wheelT = 0;
function evtToOut(e){ const r = pv.getBoundingClientRect(), z = r.width / (pv.clientWidth || r.width); return [((e.clientX - r.left) / z - view.x) * W / view.w, ((e.clientY - r.top) / z - view.y) * H / view.h]; }
function cursorFor(h, shift){ if (!h) return ''; if (h === 'rot') return 'grab'; if (shift) return 'crosshair'; if (h[0] && h[1]) return h[0] * h[1] > 0 ? 'nwse-resize' : 'nesw-resize'; return h[0] ? 'ew-resize' : 'ns-resize'; }

pv.addEventListener('pointerdown', e => {
  const [px, py] = evtToOut(e);
  if (picking){ pickAt(px, py); return; }
  pv.setPointerCapture(e.pointerId);
  let c = selClip(); const h = hitHandle(c, px, py);
  if (h === 'rot'){ const G = clipGeom(c); drag = { type: 'rot', c, cx: G.cx, cy: G.cy, a0: Math.atan2(py - G.cy, px - G.cx), r0: c.rot }; pv.style.cursor = 'grabbing'; return; }
  if (h){ drag = { type: e.shiftKey ? 'crop' : 'resize', h, c, G0: clipGeom(c), sx0: c.sx, sy0: c.sy }; return; }
  let hit;
  if (e.altKey){                                         // Alt+click: cycle down through what's under the cursor
    const all = hitsAt(px, py, false), i = all.findIndex(h => h[1] === c);
    hit = all.length ? all[(i + 1) % all.length] : null;
  } else hit = hitAny(px, py);
  if (hit){ layers[hit[0]].sel = hit[1]; if (hit[0] !== target) setTarget(hit[0]); else { syncLayerUI(); syncXfUI(); } selectPad(hit[1].pad); c = hit[1]; }
  if (!hit && (px < 0 || px > W || py < 0 || py > H)){   // a click in the border around the canvas, on nothing: no GIF selected (its frame and handles go)
    if (layers[target].sel){ layers[target].sel = null; syncLayerUI(); syncXfUI(); redraw.all = true; } return; }
  if (c) drag = { type: 'move', c, px, py, x0: c.x, y0: c.y };
});
pv.addEventListener('pointermove', e => {
  const [px, py] = evtToOut(e);
  if (!drag){ if (!picking) pv.style.cursor = cursorFor(hitHandle(selClip(), px, py), e.shiftKey) || (hitsAt(px, py, false).length ? 'move' : 'default'); return; }
  const c = drag.c;
  if (drag.type === 'rot'){
    let r = drag.r0 + (Math.atan2(py - drag.cy, px - drag.cx) - drag.a0) * 180 / Math.PI;
    if (e.shiftKey) r = Math.round(r / 15) * 15;
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
    const fx = clamp(drag.x0 + px - drag.px, -W, W), fy = clamp(drag.y0 + py - drag.py, -H, H);   // where the pointer alone puts it
    if (e.shiftKey && drag.lock){                       // Shift on a lit guide: the GIF slides along that line only
      const L = drag.lock; c.x = fx; c.y = fy;
      if (L.line){ const G = clipGeom(c), [x0, y0, x1, y1] = L.line, dx = x1 - x0, dy = y1 - y0, t = clamp(((G.cx - x0) * dx + (G.cy - y0) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        c.x += x0 + t * dx - G.cx; c.y += y0 + t * dy - G.cy; }
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
        const best = (pts, lines) => { let b = null; for (const p of pts) for (const l of lines){ const d = l - p; if (Math.abs(d) <= tol && (!b || Math.abs(d) < Math.abs(b.d))) b = { d, l }; } return b; };
        const bx = best([G.cx - rx, G.cx, G.cx + rx], LX), by = best([G.cy - ry, G.cy, G.cy + ry], LY);
        // slanted guides: the centre slides onto the nearest diagonal / perspective ray (closest point on it)
        let sl = null; for (const [x0, y0, x1, y1] of guideSlants()){ const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy; if (!L2) continue;
          const t = clamp(((G.cx - x0) * dx + (G.cy - y0) * dy) / L2, 0, 1), qx = x0 + t * dx, qy = y0 + t * dy, d = Math.hypot(qx - G.cx, qy - G.cy);
          if (d <= tol && (!sl || d < sl.d)) sl = { d, mx: qx - G.cx, my: qy - G.cy, line: [x0, y0, x1, y1] }; }
        const sd = Math.min(bx ? Math.abs(bx.d) : Infinity, by ? Math.abs(by.d) : Infinity);
        if (sl && sl.d < sd){ drag.snap = { x: null, y: null, line: sl.line }; c.x += sl.mx; c.y += sl.my; }
        else if (bx || by){ drag.snap = { x: bx ? bx.l : null, y: by ? by.l : null }; if (bx) c.x += bx.d; if (by) c.y += by.d; } }
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
pv.addEventListener('pointerup', () => { if (drag && drag.type === 'rot') pv.style.cursor = 'grab'; drag = null; commit(); });
// preview tools: guides, stick, ghosts (per browser)
const pvSave = () => { Prefs.setJson('vjif-pvopt', pvOpt); redraw.all = true; };
const pvUI = () => { document.querySelectorAll('#guideGrp [data-g]').forEach(b => b.classList.toggle('on', !!pvOpt.guides[b.dataset.g])); $('#guideGrp').classList.toggle('ghidden', !!pvOpt.gHide); $('#guideEye').classList.toggle('on', !pvOpt.gHide && anyGuide());
  $('#stickBtn').classList.toggle('on', pvOpt.stick); $('#ghostBtn').classList.toggle('on', pvOpt.ghosts); $('#gridX').value = pvOpt.gx; $('#gridY').value = pvOpt.gy; $('#guideCol').value = pvOpt.gcol; $('#xLink').checked = pvOpt.link; $('#xFromC').checked = pvOpt.fromC; };
pvUI();
$('#guideEye').addEventListener('click', () => { pvOpt.gHide = !pvOpt.gHide; pvUI(); pvSave(); });
$('#guideGrp').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; const k = b.dataset.g; if (pvOpt.gHide){ pvOpt.gHide = false; if (pvOpt.guides[k]){ pvUI(); pvSave(); return; } } pvOpt.guides[k] = !pvOpt.guides[k]; if (!pvOpt.guides[k]) delete pvOpt.guides[k]; pvUI(); pvSave(); });
$('#stickBtn').addEventListener('click', () => { pvOpt.stick = !pvOpt.stick; pvUI(); pvSave(); });
$('#ghostBtn').addEventListener('click', () => { pvOpt.ghosts = !pvOpt.ghosts; pvUI(); pvSave(); });
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
pv.addEventListener('wheel', e => {
  e.preventDefault();
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
  view.w = Math.max(160 * Math.min(1, W / H), Math.min(aw - 2*M, (ah - 2*M) * W / H)); view.h = view.w * H / W;
  view.x = (aw - view.w) / 2; view.y = (ah - view.h) / 2;
  Object.assign(pvScene.style, { left: view.x + 'px', top: view.y + 'px', width: view.w + 'px', height: view.h + 'px' });
  pvScene.width = Math.round(view.w * dpr); pvScene.height = Math.round(view.h * dpr);
  const bar = $('#pvBar'); if (bar){ if (bar.parentElement !== wrap) wrap.appendChild(bar);   // the guides bar: halfway between the picture and the panel below
    const bh = bar.offsetHeight || 32, below = ah - (view.y + view.h); bar.style.top = Math.max(view.y + view.h + 2, Math.min(ah - bh - 2, view.y + view.h + (below - bh) / 2)) + 'px'; }
  redraw.all = true;
}
new ResizeObserver(sizePreview).observe($('#pvWrap'));
