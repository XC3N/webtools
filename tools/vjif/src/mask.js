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

// ---- painting: Mask on a layer card opens the bar over the preview; the preview then paints instead of selecting ----
const MASK_TOOLS = [['free', 'Free', 'Freehand brush'], ['rect', 'Rect', 'Rectangle: drag from corner to corner (Shift: square)'], ['ell', 'Ellipse', 'Ellipse: drag across it (Shift: circle)']];
const maskOpt = Prefs.json('vjif-maskopt', { tool: 'free', size: 80, soft: 0.4 });
let maskStroke = null, maskPtr = null;
function maskOpen(li){
  if (maskEd && maskEd.li === li) return maskClose();
  maskEd = { li }; if (target !== li) setTarget(li);
  $('#maskBar').hidden = false; syncMaskUI(); syncLayerUI(); redraw.all = true;
}
function maskClose(){ maskEd = null; maskStroke = null; $('#maskBar').hidden = true; syncLayerUI(); redraw.all = true; pv.style.cursor = ''; }
function syncMaskUI(){
  if (!maskEd) return; const L = layers[maskEd.li], m = L.mask;
  $('#maskName').textContent = `Mask · ${LNAMES[maskEd.li]}`;
  segSet('#maskTool', maskOpt.tool);
  $('#maskSize').value = maskOpt.size; $('#maskSize').nextElementSibling.textContent = Math.round(maskOpt.size) + ' px';
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
function maskDraw(fn){
  const S = maskStroke, x = S.m.cv.getContext('2d'), k = S.m.cv.width / W;
  x.save(); x.setTransform(k, 0, 0, k, 0, 0); x.globalCompositeOperation = S.erase ? 'destination-out' : 'source-over'; fn(x); x.restore();
  maskRev++; redraw.all = true;
}
function maskDown(e){
  if (e.button) return;
  const [px, py] = evtToOut(e), L = layers[maskEd.li], base = L.mask;
  pv.setPointerCapture(e.pointerId);
  const m = maskNew(base && base.cv, { inv: base ? base.inv : false, on: base ? base.on : true });   // paint on a copy
  L.mask = m;
  maskStroke = { m, base, tool: maskOpt.tool, erase: isDel(e), x0: px, y0: py, last: [px, py] };
  if (maskStroke.tool === 'free') maskDraw(x => maskDab(x, px, py, maskOpt.size / 2, maskOpt.soft));
  syncMaskUI();
}
function maskMove(e){
  const [px, py] = evtToOut(e); maskPtr = [px, py];
  const S = maskStroke; if (!S){ redraw.all = true; return; }
  if (S.tool === 'free'){
    const [lx, ly] = S.last, d = Math.hypot(px - lx, py - ly), r = maskOpt.size / 2, step = Math.max(1, r * 0.25), n = Math.floor(d / step);
    if (!n) return;
    maskDraw(x => { for (let i = 1; i <= n; i++){ const t = i * step / d; maskDab(x, lx + (px - lx) * t, ly + (py - ly) * t, r, maskOpt.soft); } });
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
pv.addEventListener('pointerleave', () => { if (maskEd && !maskStroke){ maskPtr = null; redraw.all = true; } });
// the bar
$('#maskTool').innerHTML = MASK_TOOLS.map(([v, l, t]) => `<button data-v="${v}" title="${t}">${l}</button>`).join('');
onSeg($('#maskTool'), b => { maskOpt.tool = b.dataset.v; maskSave(); syncMaskUI(); });
$('#maskSize').addEventListener('input', e => { maskOpt.size = +e.target.value; maskSave(); syncMaskUI(); redraw.all = true; });
$('#maskSoft').addEventListener('input', e => { maskOpt.soft = +e.target.value; maskSave(); syncMaskUI(); });
$('#maskInv').addEventListener('change', e => { const L = layers[maskEd.li]; if (L.mask) L.mask = maskWith(L.mask, { inv: e.target.checked }); else { const m = maskNew(null, { inv: e.target.checked }); m.url = m.cv.toDataURL('image/png'); L.mask = m; } maskRev++; redraw.all = true; syncLayerUI(); });
$('#maskOn').addEventListener('change', e => { const L = layers[maskEd.li]; if (L.mask){ L.mask = maskWith(L.mask, { on: e.target.checked }); maskRev++; redraw.all = true; syncLayerUI(); } });
$('#maskClear').addEventListener('click', () => { const L = layers[maskEd.li]; if (!L.mask) return; L.mask = null; maskRev++; redraw.all = true; syncMaskUI(); syncLayerUI(); toast2(`${LNAMES[maskEd.li]}: mask cleared — Ctrl+Z brings it back`); });
$('#maskDone').addEventListener('click', maskClose);
// the preview while painting: the mask tinted in the layer's colour, and the brush
const maskTint = document.createElement('canvas'), maskTx = maskTint.getContext('2d');
function drawMaskOverlay(dpr){
  const L = layers[maskEd.li], m = L.mask, X = view.x * dpr, Y = view.y * dpr, VW = view.w * dpr, VH = view.h * dpr;
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
// the bar moves (drag its title), within the preview, so it's never in the way of what you paint
{
  const bar = $('#maskBar'), hd = $('#maskName'), place = (x, y) => { const P = bar.parentElement, mx = Math.max(0, P.clientWidth - bar.offsetWidth), my = Math.max(0, P.clientHeight - bar.offsetHeight);
    bar.style.left = clamp(x, 0, mx) + 'px'; bar.style.top = clamp(y, 0, my) + 'px'; };
  const at = Prefs.json('vjif-maskbar', null); if (at) place(at[0], at[1]);
  hd.style.cursor = 'move'; hd.title = 'Drag to move the bar';
  hd.addEventListener('pointerdown', e => { if (e.button) return; const ox = e.clientX - bar.offsetLeft, oy = e.clientY - bar.offsetTop; hd.setPointerCapture(e.pointerId);
    const mv = ev => place(ev.clientX - ox, ev.clientY - oy), up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); Prefs.setJson('vjif-maskbar', [bar.offsetLeft, bar.offsetTop]); };
    hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up); });
}
