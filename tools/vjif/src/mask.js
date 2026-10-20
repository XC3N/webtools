// ---------- painted layer masks: one per layer, per scene ----------
// L.mask = { cv, mid, url, inv, on }: a small canvas (W / MASK_DIV) whose painted (opaque) parts hide the layer, or with
// inv only those parts show. A mask is never changed in place: a stroke paints on a copy, so a scene, an undo step or a
// transition still holding the old one keeps it. url (PNG) is what's saved, made once a stroke ends.
const MASK_DIV = 5, maskReg = new Map(); let maskMid = 0;      // maskReg: masks by id, for undo (the last 80)
function maskKeep(m){ maskReg.set(m.mid, m); if (maskReg.size > 80) maskReg.delete(maskReg.keys().next().value); return m; }
function maskNew(src, props){
  const c = document.createElement('canvas'); c.width = Math.round(W / MASK_DIV); c.height = Math.round(H / MASK_DIV);
  if (src) c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
  return maskKeep({ inv: false, on: true, url: null, ...props, cv: c, mid: ++maskMid });
}
const maskWith = (m, props) => maskKeep({ ...m, ...props, mid: ++maskMid });   // Invert / on-off: the same picture
function maskFromUrl(url, inv, on){
  const m = maskNew(null, { url, inv: !!inv, on: on !== false }), im = new Image();
  im.onload = () => { m.cv.getContext('2d').drawImage(im, 0, 0, m.cv.width, m.cv.height); maskRev++; redraw.all = true; }; im.src = url;
  return m;
}
function applyMask(b, m){                            // b: a flattened layer; cut it with the mask
  b.save(); b.setTransform(1, 0, 0, 1, 0, 0); b.globalAlpha = 1; b.globalCompositeOperation = m.inv ? 'destination-in' : 'destination-out';
  b.imageSmoothingEnabled = true; b.drawImage(m.cv, 0, 0, b.canvas.width, b.canvas.height); b.restore();
}

// 0.99.4: on Background, the selected GIF has its own mask (it cuts that GIF only, so the GIFs and colour under it show);
// with no Background GIF selected, the mask is the whole layer's. maskOwner(): what the bar paints on, a layer or a clip
const maskOwner = () => { const li = maskEd.li, c = li === BG_LAYER ? selClip(li) : null; return c || layers[li]; };
const maskWho = () => { const O = maskOwner(); return O.pad != null ? `${LNAMES[maskEd.li]} · ${pads[O.pad].label}` : LNAMES[maskEd.li]; };
// ---- painting: Mask on a layer card opens the bar between the layer cards and the preview; the preview then paints instead of selecting ----
const MASK_TOOLS = [['free', 'Free', 'Brush · Alt: colour brush (sticks to the colour under it, in the layers below)'], ['rect', 'Rect', 'Rectangle: drag from corner to corner (Shift: square)'], ['ell', 'Ellipse', 'Ellipse: drag across it (Shift: circle)']];
const maskOpt = Prefs.json('vjif-maskopt', { tool: 'free', size: 80, soft: 0.4 });
let maskStroke = null, maskPtr = null;
function maskOpen(li){
  if (maskEd && maskEd.li === li) return maskClose();
  maskEd = { li }; if (target !== li) setTarget(li);
  const bar = $('#maskBar'), card = layers[li].row, top = card.querySelector('.lrow'), clips = card.querySelector('.clips');
  layers.forEach(L => L.row.classList.remove('masking'));
  const cs = getComputedStyle(top); bar.style.height = top.offsetHeight + 'px'; bar.style.marginTop = cs.marginTop; bar.style.marginBottom = cs.marginBottom;   // (and its margins: nothing below moves, 0.91)   // the blend mode's row, which it stands in for: the card keeps its height (0.90: opacity and the transition row stay)
  card.insertBefore(bar, top); card.classList.add('masking'); bar.hidden = false;
  $('#stage').classList.add('masking'); syncMaskUI(); syncLayerUI(); redraw.all = true;
}
function maskClose(){ if (maskStroke) maskUp(); maskEd = null; maskStroke = null; $('#maskBar').hidden = true; layers.forEach(L => L.row.classList.remove('masking'));
  $('#stage').classList.remove('masking'); syncLayerUI(); redraw.all = true; pv.style.cursor = ''; }
function syncMaskUI(){
  if (!maskEd) return; const L = maskOwner(), m = L.mask;
  $('#maskName').textContent = `Mask · ${maskWho()}`; $('#maskPaste').classList.toggle('empty', !maskClip); $('#maskCopy').disabled = !L.mask;
  segSet('#maskTool', maskOpt.tool);
  $('#maskSize').value = maskOpt.size; $('#maskSize').nextElementSibling.textContent = Math.round(maskOpt.size) + ' px';
  $('#maskSizeBtn').title = `Size: ${Math.round(maskOpt.size)} px · drag up / down or click`; $('#maskSoftBtn').title = `Soft: ${Math.round(maskOpt.soft * 100)}% · drag up / down or click`;
  $('#maskSoft').value = maskOpt.soft; $('#maskSoft').nextElementSibling.textContent = Math.round(maskOpt.soft * 100) + '%';
  $('#maskInv').checked = !!(m && m.inv); $('#maskOn').checked = !m || m.on !== false;
}
const maskSave = () => Prefs.setJson('vjif-maskopt', maskOpt);
// a soft round dab (the brush): a radial gradient, solid to (1 − Soft) of its radius
function maskDab(x, px, py, r, soft){
  const g = x.createRadialGradient(px, py, r * (1 - soft) * 0.999, px, py, r); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
}
function maskShape(x, S, px, py, shift){
  let w = px - S.x0, h = py - S.y0; if (shift){ const d = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * d; h = Math.sign(h || 1) * d; }
  const blur = maskOpt.soft * maskOpt.size * 0.5;
  x.filter = blur > 0.5 ? `blur(${blur * x.getTransform().a}px)` : 'none'; x.fillStyle = '#fff'; x.beginPath();
  if (S.tool === 'rect') x.rect(Math.min(S.x0, S.x0 + w), Math.min(S.y0, S.y0 + h), Math.abs(w), Math.abs(h));
  else x.ellipse(S.x0 + w / 2, S.y0 + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
  x.fill(); x.filter = 'none';
}
// draw on the stroke's canvas, in canvas pixels (W × H)
// Alt + the brush: a colour brush. The layer being masked is drawn alone (its GIFs as they are now, at the mask's size); the
// colour under the stroke's start is the one it looks for; each dab covers only the mask pixels whose colour is within
// Soft (here: how far a colour may be, 0–100 %) of it, so blades of grass get masked and what's between them doesn't
function colourBrushStart(S, px, py){
  const w = S.m.cv.width, h = S.m.cv.height, k = w / W, ref = document.createElement('canvas'); ref.width = w; ref.height = h;
  const x = ref.getContext('2d', { willReadFrequently: true }), O = maskOwner(), li = maskEd.li, all = frameList(performance.now()), bare = it => ({ L: { ...it.L, mask: null }, items: it.items.map(q => ({ ...q, e: { ...q.e, mask: null } })) });
  // 0.99.5: the colours come from what's under the masked thing (the layers below it; on Background, the GIFs under the selected one), so
  // Alt+brush on the Foreground masks it where the Background tree is; with nothing under it, from the masked thing itself as before
  const ids = O.pad != null ? layers[li].clips.slice(0, layers[li].clips.indexOf(O)).map(c => c.id) : null;
  let list = ids ? all.filter(it => it.L.i === li).map(it => ({ ...bare(it), items: bare(it).items.filter(q => ids.includes(q.e.id)) })) : all.filter(it => it.L.i < li).map(bare);
  if (!list.some(it => it.items.length || (it.L.i === 0 && it.L.fillOn))) list = all.filter(it => it.L.i === li).map(it => ({ ...bare(it), items: bare(it).items.filter(q => O.pad == null || q.e.id === O.id) }));
  render(list, x, 0, [], 0, [k, 0, 0, k, 0, 0]);
  const d = x.getImageData(0, 0, w, h).data, ix = clamp(Math.floor(px * k), 0, w - 1), iy = clamp(Math.floor(py * k), 0, h - 1), o = (iy * w + ix) * 4;
  S.col = { d, w, h, k, c: [d[o], d[o + 1], d[o + 2]], tol: (0.06 + 0.2 * maskOpt.soft) * 441.7,   /* 0.99.6: at most a quarter of the colour range (Soft at 100% let almost every colour through) */ stamp: document.createElement('canvas') };
}
function colourDab(x, px, py){
  const C = maskStroke.col, r = maskOpt.size / 2 * C.k, cx = px * C.k, cy = py * C.k, x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r)), x1 = Math.min(C.w, Math.ceil(cx + r)), y1 = Math.min(C.h, Math.ceil(cy + r));
  if (x1 <= x0 || y1 <= y0) return;
  const sw = x1 - x0, sh = y1 - y0, st = C.stamp; st.width = sw; st.height = sh; const sx = st.getContext('2d'), im = sx.createImageData(sw, sh);
  for (let j = 0; j < sh; j++) for (let i = 0; i < sw; i++){
    const dd = Math.hypot(x0 + i + 0.5 - cx, y0 + j + 0.5 - cy); if (dd > r) continue;
    const o = ((y0 + j) * C.w + x0 + i) * 4, dc = Math.hypot(C.d[o] - C.c[0], C.d[o + 1] - C.c[1], C.d[o + 2] - C.c[2]);
    const a = clamp(1 - (dc - C.tol * 0.7) / (C.tol * 0.3 + 1e-6), 0, 1) * clamp((r - dd) / Math.max(1, r * 0.25), 0, 1);   // in range (soft at its edge), and the brush's own soft rim
    const q = (j * sw + i) * 4; im.data[q] = im.data[q + 1] = im.data[q + 2] = 255; im.data[q + 3] = Math.round(a * 255);
  }
  sx.putImageData(im, 0, 0);
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = maskStroke.erase ? 'destination-out' : 'source-over'; x.drawImage(st, x0, y0); x.restore();
}
function maskDraw(fn){
  const S = maskStroke, x = S.m.cv.getContext('2d'), k = S.m.cv.width / W;
  x.save(); x.setTransform(k, 0, 0, k, 0, 0); x.globalCompositeOperation = S.erase ? 'destination-out' : 'source-over'; fn(x); x.restore();
  maskRev++; redraw.all = true;
}
function maskDown(e){
  if (e.button !== 0 && e.button !== 2) return;     // left paints, right erases
  const [px, py] = evtToOut(e), L = maskOwner(), base = L.mask;
  pv.setPointerCapture(e.pointerId);
  const m = maskNew(base && base.cv, { inv: base ? base.inv : false, on: base ? base.on : true });   // paint on a copy
  L.mask = m;
  maskStroke = { m, base, tool: maskOpt.tool, erase: e.button === 2 || isDel(e), x0: px, y0: py, last: [px, py] };
  if (maskStroke.tool === 'free' && e.altKey) colourBrushStart(maskStroke, px, py);   // Alt: the brush sticks to the colour under where the stroke starts (0.93)
  if (maskStroke.tool === 'free') maskDraw(x => maskStroke.col ? colourDab(x, px, py) : maskDab(x, px, py, maskOpt.size / 2, maskOpt.soft));
  syncMaskUI();
}
function maskMove(e){
  const [px, py] = evtToOut(e); maskPtr = [px, py];
  const S = maskStroke; if (!S){ redraw.all = true; return; }
  if (S.tool === 'free'){
    const [lx, ly] = S.last, d = Math.hypot(px - lx, py - ly), r = maskOpt.size / 2, step = Math.max(1, r * 0.25), n = Math.floor(d / step);
    if (!n) return;
    maskDraw(x => { for (let i = 1; i <= n; i++){ const t = i * step / d, qx = lx + (px - lx) * t, qy = ly + (py - ly) * t; S.col ? colourDab(x, qx, qy) : maskDab(x, qx, qy, r, maskOpt.soft); } });
    S.last = [lx + (px - lx) * n * step / d, ly + (py - ly) * n * step / d];
  } else {                                           // a shape: the mask as it was, plus the shape as dragged so far
    const x = S.m.cv.getContext('2d'); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, S.m.cv.width, S.m.cv.height);
    if (S.base) x.drawImage(S.base.cv, 0, 0, S.m.cv.width, S.m.cv.height); x.restore();
    maskDraw(x => maskShape(x, S, px, py, e.shiftKey));
  }
}
function maskUp(){
  const S = maskStroke; if (!S) return; maskStroke = null;
  S.m.url = S.m.cv.toDataURL('image/png');           // what the set saves (once per stroke)
  touched.edit = true;                               // an undo step
}
pv.addEventListener('pointermove', e => { if (maskEd) maskMove(e); });
pv.addEventListener('pointerup', () => { if (maskEd) maskUp(); });
pv.addEventListener('pointercancel', () => { if (maskEd) maskUp(); });
pv.addEventListener('contextmenu', e => { if (maskEd) e.preventDefault(); });   // (right button erases)
pv.addEventListener('pointerleave', () => { if (maskEd && !maskStroke){ maskPtr = null; redraw.all = true; } });
// the bar
const MASK_IC = { free: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M2 13C3.5 6 5.5 2.5 7.5 4s-2 7 .5 8 3.5-6 6-10"/></svg>', rect: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><rect x="2.5" y="2.5" width="11" height="11" rx="1"/></svg>', ell: '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><circle cx="8" cy="8" r="5.8"/></svg>' };   // (0.93: each fills the same 11–12 px box as the other mask icons)
$('#maskTool').innerHTML = MASK_TOOLS.map(([v, l, t]) => `<button data-v="${v}" title="${l}: ${t}">${MASK_IC[v]}</button>`).join('');
// Size / Soft: an icon each, its slider pops up upright (like the music player's volume)
// Size / Soft: press the button and drag up / down to set it straight away (the pop-up shows the value, then closes);
// a click without dragging opens the pop-up as before, click again to close (0.90)
document.querySelectorAll('#maskBar .mpopbtn').forEach(b => {
  const p = b.nextElementSibling, inp = p.querySelector('input'); let d = null;
  b.addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); e.stopPropagation(); const was = !p.hidden; document.querySelectorAll('#maskBar .mpop').forEach(q => q.hidden = true); p.hidden = false;
    d = { y: e.clientY, v: +inp.value, moved: false, was }; b.setPointerCapture(e.pointerId); });
  b.addEventListener('pointermove', e => { if (!d) return; const dy = d.y - e.clientY; if (!d.moved && Math.abs(dy) < 3) return; d.moved = true;
    const lo = +inp.min, hi = +inp.max, st = +inp.step || 1, v = clamp(Math.round((d.v + dy / 110 * (hi - lo)) / st) * st, lo, hi);   // the pop-up's slider is 110 px tall: the same feel as dragging it
    if (+inp.value !== v){ inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
  const end = () => { if (!d) return; if (d.moved || d.was) p.hidden = true; d = null; };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
});
document.addEventListener('pointerdown', e => { if (!e.target.closest('#maskBar .volwrap')) document.querySelectorAll('#maskBar .mpop').forEach(q => q.hidden = true); });
onSeg($('#maskTool'), b => { maskOpt.tool = b.dataset.v; maskSave(); syncMaskUI(); });
$('#maskSize').addEventListener('input', e => { maskOpt.size = +e.target.value; maskSave(); syncMaskUI(); redraw.all = true; });
$('#maskSoft').addEventListener('input', e => { maskOpt.soft = +e.target.value; maskSave(); syncMaskUI(); });
$('#maskInv').addEventListener('change', e => { const L = maskOwner(); if (L.mask) L.mask = maskWith(L.mask, { inv: e.target.checked }); else { const m = maskNew(null, { inv: e.target.checked }); m.url = m.cv.toDataURL('image/png'); L.mask = m; } maskRev++; redraw.all = true; syncLayerUI(); });
$('#maskOn').addEventListener('change', e => { const L = maskOwner(); if (L.mask){ L.mask = maskWith(L.mask, { on: e.target.checked }); maskRev++; redraw.all = true; syncLayerUI(); } });
// copy / paste a mask between layers and scenes (0.93): masks are never changed in place, so the copy is the mask itself
let maskClip = null;
$('#maskCopy').addEventListener('click', () => { const L = maskOwner(); if (!L.mask) return toast('No mask to copy here'); maskClip = L.mask; syncMaskUI(); toast2(`${maskWho()}: mask copied`); });
$('#maskPaste').addEventListener('click', () => { if (!maskClip) return toast('Copy a mask first'); const L = maskOwner(); L.mask = maskWith(maskClip, {}); maskRev++; redraw.all = true; syncMaskUI(); syncLayerUI(); commit(); toast2(`Mask pasted on ${maskWho()} — Ctrl+Z undoes`); });
$('#maskClear').addEventListener('click', () => { const L = maskOwner(); if (!L.mask) return; L.mask = null; maskRev++; redraw.all = true; syncMaskUI(); syncLayerUI(); toast2(`${maskWho()}: mask cleared — Ctrl+Z brings it back`); });
// (0.89: no Done button: the layer's mask button again, or Esc, ends painting)
// the preview while painting: the mask tinted in the layer's colour, and the brush
const maskTint = document.createElement('canvas'), maskTx = maskTint.getContext('2d');
function drawMaskOverlay(dpr){
  const L = maskOwner(), m = L.mask, X = view.x * dpr, Y = view.y * dpr, VW = view.w * dpr, VH = view.h * dpr;
  if (m){
    if (maskTint.width !== m.cv.width || maskTint.height !== m.cv.height){ maskTint.width = m.cv.width; maskTint.height = m.cv.height; }
    maskTx.globalCompositeOperation = 'copy'; maskTx.drawImage(m.cv, 0, 0); maskTx.globalCompositeOperation = 'source-in'; maskTx.fillStyle = LCOL[maskEd.li]; maskTx.fillRect(0, 0, maskTint.width, maskTint.height);
    pctx.save(); pctx.globalAlpha = m.on === false ? 0.15 : 0.45; pctx.imageSmoothingEnabled = true; pctx.drawImage(maskTint, X, Y, VW, VH); pctx.restore();
  }
  pctx.save(); pctx.strokeStyle = LCOL[maskEd.li]; pctx.lineWidth = 2 * dpr; pctx.strokeRect(X + dpr, Y + dpr, VW - 2 * dpr, VH - 2 * dpr);   // painting: the frame in the layer's colour
  if (maskPtr && maskOpt.tool === 'free'){ const k = VW / W, r = maskOpt.size / 2 * k;
    pctx.lineWidth = dpr; pctx.strokeStyle = '#fff'; pctx.setLineDash([3 * dpr, 3 * dpr]); pctx.beginPath(); pctx.arc(X + maskPtr[0] * k, Y + maskPtr[1] * k, r, 0, Math.PI * 2); pctx.stroke(); }
  pctx.restore();
}
