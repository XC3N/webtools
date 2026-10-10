// ---------- lettering: text drawn into a one-frame "GIF" (the file is a small JSON description) ----------
const TEXT_MIME = 'application/vnd.vjif.text+json';
const isTextBlob = (blob, name) => blob.type === TEXT_MIME || /\.vjtext$/i.test(name || '');
const textName = sp => (sp.text || 'text').replace(/\|/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) + '.vjtext';
const TEXT_DEF = { v: 1, text: 'VJif', font: 'Russo One', bold: false, ital: false, size: 0.2, track: 0, cut: false, color: '#ffffff', marquee: 0, fill: 'solid', line: 'none', shadow: 'none', glow: 'none', box: 'none', col2: '#ff5bb0', acc: 2, sk: 0, cs: 'none' };
// Logo Lab's treatments, drawn on a canvas: one choice per layer (Letters only; a cut-out is a plain matte)
const TX_LOOKS = [['fill', 'Fill', [['solid', 'Solid'], ['chrome', 'Chrome'], ['gradient', 'Gradient'], ['stripes', 'Stripes'], ['hollow', 'Hollow']]],
  ['line', 'Outline', [['none', 'None'], ['thin', 'Thin'], ['thick', 'Thick']]], ['shadow', 'Shadow', [['none', 'None'], ['drop', 'Drop'], ['long', 'Long'], ['lift', 'Lift']]],
  ['glow', 'Glow', [['none', 'None'], ['soft', 'Soft'], ['neon', 'Neon']]], ['box', 'Box', [['none', 'None'], ['badge', 'Badge'], ['split', 'Split'], ['lcd', 'LCD'], ['frame', 'Frame']]]];
// Logo Lab's presets, for Letters: they set the font and the look (the text, size and marquee stay)
const TX_PRESETS = [
  ['Chrome + neon', { font: 'Orbitron', bold: true, fill: 'chrome', line: 'thin', glow: 'soft', color: '#3ad1ff', col2: '#3ad1ff', track: 0.03 }],
  ['Retro stack', { font: 'Righteous', fill: 'stripes', shadow: 'long', color: '#ff7a1a', col2: '#ff3b30', sk: -8 }],
  ['Framed', { font: 'Orbitron', box: 'frame', cs: 'upper', track: 0.08, color: '#ffffff', col2: '#b6ff3d' }],
  ['Lifted badge', { font: 'Rubik Mono One', box: 'badge', shadow: 'lift', col2: '#ff5bb0' }],
  ['Neon sign', { font: 'Righteous', glow: 'neon', color: '#ffffff', col2: '#ff5bb0', track: 0.02 }],
  ['LCD', { font: 'Press Start 2P', box: 'lcd', col2: '#b6ff3d', track: 0.04 }],
  ['Synthwave', { font: 'Orbitron', bold: true, fill: 'stripes', glow: 'soft', cs: 'upper', color: '#ff5bb0', col2: '#8f7bff', track: 0.04, sk: -10 }],
  ['Split block', { font: 'Russo One', box: 'split', color: '#ffffff', col2: '#2ee6c4' }],
  ['Drop shadow', { font: 'Righteous', shadow: 'drop', color: '#ffe14d', col2: '#ff3b30' }],
  ['Outline', { font: 'Bungee', fill: 'hollow', color: '#ffffff' }],
  ['Arcade', { font: 'Press Start 2P', shadow: 'drop', color: '#3ad1ff', col2: '#ff5bb0' }],
  ['Gradient', { font: 'Russo One', fill: 'gradient', color: '#8f7bff', col2: '#3ad1ff' }],
  ['Condensed italic', { font: 'Anton', fill: 'chrome', cs: 'upper', track: 0.02, sk: -12, color: '#ffb000' }],
];
const TX_LOOK0 = { fill: 'solid', line: 'none', shadow: 'none', glow: 'none', box: 'none', sk: 0, cs: 'none', bold: false, ital: false, track: 0, color: '#ffffff', col2: '#ff5bb0' };
const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => Math.round(v + (B[i] - v) * t))); };
// one frame at the current canvas size. Letters: tight around the text. Cut-out: a matte the size of the output
// (wider when it scrolls, so it always covers the screen) with the letters punched through.
async function renderText(spec, OW = W, OH = H){   // OW × OH: the frame it's drawn for (the Text window's preview draws it small)
  const S = { ...TEXT_DEF, ...spec }, px = Math.max(4, Math.round(S.size * OH));
  const font = `${S.ital ? 'italic ' : ''}${S.bold ? 700 : 400} ${px}px "${S.font.replace(/"/g, '')}", sans-serif`;
  let txt = String(S.text); if (S.cs === 'upper') txt = txt.toUpperCase();
  try { await document.fonts.load(font, txt.replace(/\|/g, '') || 'x'); } catch (e) {}
  // each line in up to two parts: before and after the first "|" (the accent; the bar itself isn't drawn)
  const raw = S.marquee ? [txt.replace(/\s*\n\s*/g, '   ')] : txt.split('\n');
  const L = raw.map(l => { const i = l.indexOf('|'); return i < 0 ? [l] : [l.slice(0, i), l.slice(i + 1).replace(/\|/g, '')]; });
  const cv = document.createElement('canvas'), x = cv.getContext('2d');
  const setup = () => { x.font = font; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; try { x.letterSpacing = (S.track * px).toFixed(1) + 'px'; } catch (e) {} };
  setup();
  const ls = x.letterSpacing ? S.track * px : 0;   // letter spacing also follows the last letter: left out, so the text stays centred
  const fancy = !S.cut, box = fancy ? S.box || 'none' : 'none', sk = Math.tan((S.sk || 0) * Math.PI / 180);
  const extra = fancy ? (S.glow === 'neon' ? 0.3 : S.glow === 'soft' ? 0.18 : 0) + (S.shadow === 'none' ? 0 : 0.15) + (S.line === 'thick' ? 0.06 : S.line === 'thin' ? 0.03 : 0) + (box !== 'none' ? 0.4 : 0) : 0;   // room for glow, shadow, outline, a box
  const lh = px * 1.15, segs = L.map(parts => parts.map(t => ({ t, w: x.measureText(t).width }))), ms = L.map(parts => x.measureText(parts.join('') || ' '));
  segs.forEach(ss => { const lw = ss.reduce((a, q) => a + q.w, 0) - (ss.some(q => q.t) ? ls : 0); ss.lw = Math.max(1, lw); });
  // centred on the ink, not on the font's em box: the tallest letter's top to the lowest letter's bottom
  const asc = Math.max(px * 0.2, ...ms.map(m => m.actualBoundingBoxAscent || px * 0.7)), dsc = Math.max(0, ...ms.map(m => m.actualBoundingBoxDescent || 0));
  const slant = Math.abs(sk) * Math.max(asc, dsc);
  const pad = Math.ceil(px * ((S.ital ? 0.35 : 0.15) + extra) + slant);
  const tw = Math.ceil(Math.max(1, ...segs.map(ss => ss.lw))), th = Math.ceil((L.length - 1) * lh + asc + dsc);
  let w, h;
  if (S.cut){ w = Math.min(16000, S.marquee ? tw + 2 * pad : Math.max(OW, tw + 2 * pad)); h = Math.max(OH, th + 2 * pad); }   // the matte grows when the text is bigger than the frame; a scrolling one is only as wide as the text (drawClip fills the rest)
  else { w = Math.min(16000, tw + 2 * pad); h = th + 2 * pad; }
  cv.width = w; cv.height = h; setup();
  const y0 = h / 2 - ((L.length - 1) * lh + dsc - asc) / 2;
  const G = { x, S, segs, cx: w / 2, y0, lh, px, asc, dsc, w, h, ls, sk, box, tw };
  if (S.cut){ x.fillStyle = S.color; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-out'; eachSeg(G, (t, sx, y) => { x.fillStyle = '#000'; x.fillText(t, sx, y); }); }
  else drawLook(G);
  const bmp = await createImageBitmap(cv);
  return { src: [bmp], durs: [1000], w, h, srcBytes: w * h * 4, textW: tw + 2 * pad, inkW: tw + 2 * Math.ceil(slant), inkH: th };   // ink: the letters alone (no room for glow / shadow)
}
// every part of every line, in place: fn(text, x, y, isAccent, line, part); slant is a shear around the baseline
function eachSeg(G, fn, dx = 0, dy = 0){
  const { x, segs, cx, y0, lh, sk, S } = G;
  segs.forEach((ss, i) => {
    let sx = cx - ss.lw / 2; const y = y0 + i * lh;
    ss.forEach((q, k) => { const acc = ss.length > 1 && S.acc && k === S.acc - 1;
      if (q.t){ if (sk){ x.save(); x.translate(sx + dx, y + dy); x.transform(1, 0, sk, 1, 0, 0); fn(q.t, 0, 0, acc, i, sx + dx); x.restore(); } else fn(q.t, sx + dx, y + dy, acc, i, 0); }
      sx += q.w; });
  });
}
const onColor = hex => { const [r, g, b] = hexRgb(hex); return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111111' : '#ffffff'; };
// the Letters look: a box behind, glow and shadow, then the outline, then the fill (like paint-order: stroke fill)
function drawLook(G){
  const { x, S, segs, cx, y0, lh, px: em, asc, dsc, box, sk } = G;
  const c2 = S.col2 || '#ff5bb0';
  let col = S.color, accCol = c2;                     // letters, and the accent part
  if (box === 'badge'){ col = onColor(c2); accCol = mixHex(col, c2, 0.35); }
  else if (box === 'lcd'){ col = mixHex(c2, '#000000', 0.45); accCol = c2; }
  else if (box === 'split'){ accCol = onColor(c2); }
  const fill = box === 'split' || box === 'lcd' ? 'solid' : S.fill;   // those boxes set the colours
  const lw = S.line === 'thick' ? 0.055 : S.line === 'thin' ? 0.028 : fill === 'hollow' ? 0.035 : 0;
  const fxCol = acc => acc ? mixHex(col, '#000000', 0.2) : c2;   // outline / shadow / glow: the second colour (the accent part takes the letters' colour)
  const rr = (a, b, c, d, r) => { x.beginPath(); x.roundRect(a, b, c - a, d - b, r); };
  x.save();
  // the box, around all the lines (split: one block per part)
  const top = y0 - asc - 0.14 * em, bot = y0 + (segs.length - 1) * lh + dsc + 0.12 * em, half = G.tw / 2 + 0.3 * em + Math.abs(sk) * asc;
  if (box === 'badge'){ x.fillStyle = c2; rr(cx - half, top, cx + half, bot, 0.16 * em); x.fill(); }
  else if (box === 'lcd'){ x.fillStyle = mixHex(c2, '#000000', 0.91); rr(cx - half, top, cx + half, bot, 0.12 * em); x.fill(); x.strokeStyle = c2 + '66'; x.lineWidth = 0.03 * em; x.stroke();
    x.save(); x.clip(); x.fillStyle = 'rgba(0,0,0,.25)'; for (let yy = top; yy < bot; yy += Math.max(2, 0.06 * em)) x.fillRect(cx - half, yy, 2 * half, Math.max(1, 0.025 * em)); x.restore(); }
  else if (box === 'frame'){ x.strokeStyle = c2; x.lineWidth = 0.06 * em; rr(cx - half, top, cx + half, bot, 0.14 * em); x.stroke(); }
  else if (box === 'split') segs.forEach((ss, i) => { let sx = cx - ss.lw / 2; const y = y0 + i * lh, t = y - asc - 0.14 * em, b = y + dsc + 0.12 * em;
    ss.forEach((q, k) => { const acc = ss.length > 1 && S.acc && k === S.acc - 1, a = sx - (k === 0 ? 0.3 : 0.1) * em, e = sx + q.w + (k === ss.length - 1 ? 0.3 : 0.1) * em;
      x.fillStyle = acc ? c2 : '#121212'; rr(a, t, e, b, 0.16 * em); x.fill(); if (!acc){ x.strokeStyle = c2; x.lineWidth = 0.03 * em; x.stroke(); } sx += q.w; }); });
  const paint = (style, dx = 0, dy = 0, accStyle = style) => eachSeg(G, (t, sx, y, acc) => { const st = acc ? accStyle : style; x.fillStyle = st; x.fillText(t, sx, y);
    if (lw){ x.strokeStyle = st; x.lineWidth = 2 * lw * em; x.lineJoin = 'round'; x.strokeText(t, sx, y); } }, dx, dy);
  if (S.glow !== 'none'){                              // a blurred copy in the second colour, under everything
    const passes = S.glow === 'neon' ? [[0.04, 1], [0.22, 1], [0.22, 0.8]] : [[0.12, 0.55]];
    for (const [r, a] of passes){ x.shadowColor = c2; x.shadowBlur = r * em * 2; x.globalAlpha = a; paint(c2); }
    x.shadowBlur = 0; x.globalAlpha = 1; }
  const sc = mixHex(c2, '#000000', 0.25), scA = mixHex(col, '#000000', 0.55);
  if (S.shadow === 'drop') paint(sc, 0.07 * em, 0.07 * em, scA);
  else if (S.shadow === 'long') for (let k = 6; k >= 1; k--) paint(sc, 0.02 * k * em, 0.02 * k * em, scA);
  else if (S.shadow === 'lift'){ x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowOffsetY = 0.08 * em; x.shadowBlur = 0.2 * em; paint(fill === 'hollow' ? 'rgba(0,0,0,0)' : col, 0, 0, accCol); x.shadowColor = 'transparent'; x.shadowOffsetY = 0; x.shadowBlur = 0; }
  if (lw) eachSeg(G, (t, sx, y, acc) => { x.strokeStyle = fill === 'hollow' && S.line === 'none' ? (acc ? accCol : col) : fxCol(acc); x.lineWidth = 2 * lw * em; x.lineJoin = 'round'; x.strokeText(t, sx, y); });
  if (fill !== 'hollow') eachSeg(G, (t, sx, y, acc, i, ox) => {
    const c = acc ? accCol : col, yl = sk ? 0 : y, gx = (cx - G.tw / 2) - ox;   // inside a slant the part's origin is (0, 0); ox = where that is
    let st = c;
    if (fill === 'chrome'){ st = x.createLinearGradient(0, yl - asc, 0, yl + dsc);   // light top, a hard horizon, dark below rising back to light
      st.addColorStop(0, mixHex(c, '#ffffff', 0.75)); st.addColorStop(0.48, c); st.addColorStop(0.5, mixHex(c, '#000000', 0.45)); st.addColorStop(1, mixHex(c, '#ffffff', 0.35)); }
    else if (fill === 'gradient'){ st = x.createLinearGradient(gx, 0, gx + G.tw, 0); st.addColorStop(0, col); st.addColorStop(1, c2); }   // across the whole text
    else if (fill === 'stripes'){ const p = Math.max(3, Math.round(0.13 * em)), tc = new OffscreenCanvas(1, p), tx = tc.getContext('2d');
      tx.fillStyle = c; tx.fillRect(0, 0, 1, Math.max(2, Math.round(0.085 * em))); st = x.createPattern(tc, 'repeat'); st.setTransform(new DOMMatrix().translate(0, yl - asc)); }
    x.fillStyle = st; x.fillText(t, sx, y); });
  x.restore();
}
// a new text instance: scrolling text gets X automation (right to left, one pass per N bars, from the hit)
function textDefaults(g){
  const m = g.media, T = m.text; g.sync = 'free'; g.crisp = false;
  if (T.marquee){ const span = Math.round((W + m.textW) / 2);
    g.lfo.x = { on: true, min: span, max: -span, shape: 'up', per: T.marquee * 4, ph: 0, sync: 'trig' }; }
}
// the canvas format changed: every text is redrawn for it (its file stays the same)
async function retextAll(){
  for (const m of pool.filter(m => m.text)){
    const old = m.src, r = await renderText(m.text);
    Object.assign(m, r);
    insts.forEach(g => { if (g.media !== m) return;
      // as in setMediaScale: frames pre-processed for colour (worker path) are freed, and masks / colour params are redone
      const fx = g.frames !== g.src; if (fx) g.frames.forEach(f => f.close());
      Object.assign(g, { src: m.src, frames: m.src, w: m.w, h: m.h, srcBytes: m.srcBytes, bytes: m.srcBytes, masks: null, thumb: null, tileThumb: null, fxP: null });
      if (m.text.marquee && g.lfo.x && g.lfo.x.on){ const sp = Math.round((W + m.textW) / 2); g.lfo.x.min = sp; g.lfo.x.max = -sp; }
      rebuildSeq(g); if (fx || g.key.on || hsvOn(g) || (g.swap && g.swap.length)) applyFx(g); });
    old.forEach(f => f.close());
  }
  pads.forEach(p => p.gif && p.gif.media && p.gif.media.text && renderPad(p.i)); renderPool(); redraw.all = true;
}
// the Text window: new text onto a pad, or changing the text of the selected pad
let txEdit = -1, txSpec = { ...TEXT_DEF }, txT = 0, txPrevN = 0;
function openText(edit = -1){
  txEdit = edit;
  const g = edit >= 0 && pads[edit].gif;
  txSpec = { ...TEXT_DEF, ...(g && g.media.text ? g.media.text : {}) };   // a new text starts from the defaults
  if (!g) txSpec.text = '';
  $('#txText').value = txSpec.text; txFontSet(txSpec.font); $('#txBold').checked = txSpec.bold; $('#txItal').checked = txSpec.ital;
  $('#txSize').value = txSpec.size; $('#txTrack').value = txSpec.track; $('#txCol').value = txSpec.color; $('#txCol2').value = txSpec.col2 || TEXT_DEF.col2;
  const d = edit >= 0 ? edit : nextEmpty(selPad);
  $('#txTo').textContent = edit >= 0 ? `pad ${pads[edit].label}` : d >= 0 ? `→ pad ${pads[d].label}` : 'all pads full: pool only';
  $('#txOk').textContent = edit >= 0 ? 'Update' : 'Add to pool'; $('#txOk').hidden = edit < 0 && d >= 0; $('#txDrag').hidden = edit >= 0;   // new text: dragged onto a pad (or Enter / a click: the next empty one)
  txFontStyle(); $('#textPanel').hidden = false; txUI(); $('#txText').focus();
}
function closeText(){ $('#textPanel').hidden = true; }
function txRead(){
  Object.assign(txSpec, { text: $('#txText').value, font: $('#txFont').value === '?local' ? txSpec.font : $('#txFont').value || 'Russo One', bold: $('#txBold').checked, ital: $('#txItal').checked,
    size: +$('#txSize').value, track: +$('#txTrack').value, color: $('#txCol').value, col2: $('#txCol2').value, cs: $('#txUpper').checked ? 'upper' : 'none', sk: +$('#txSlant').value });
}
function txUI(){
  $('#txSize').nextElementSibling.textContent = Math.round(txSpec.size * 100) + '% of height';
  $('#txTrack').nextElementSibling.textContent = (txSpec.track >= 0 ? '+' : '') + Math.round(txSpec.track * 100) + '%';
  document.querySelectorAll('#txCut button').forEach(b => b.classList.toggle('on', +b.dataset.v === +txSpec.cut));
  document.querySelectorAll('#txMarq button').forEach(b => b.classList.toggle('on', +b.dataset.v === txSpec.marquee));
  document.querySelectorAll('#txLooks .seg').forEach(sg => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(txSpec[sg.dataset.k] ?? TEXT_DEF[sg.dataset.k]))));
  $('#txUpper').checked = txSpec.cs === 'upper'; $('#txSlant').value = txSpec.sk || 0; $('#txSlant').nextElementSibling.textContent = (txSpec.sk || 0) + '°';
  document.querySelectorAll('#txLooks .txlook').forEach(f => { const keep = f.querySelector('#txSlant, #txUpper'); f.classList.toggle('dimmed', !!txSpec.cut && !keep); });
  $('#txLooks').title = txSpec.cut ? 'The looks are for Letters (a cut-out is a plain matte); slant and UPPER work for both' : '';
  clearTimeout(txT); txT = setTimeout(txPreview, 60);
}
async function txPreview(){
  const c = $('#txPrev'), x = c.getContext('2d'), q = Math.min(1, 2 * c.width / W), FW = Math.round(W * q), FH = Math.round(H * q);   // drawn for a small frame: quick while dragging Size
  const spec = { ...txSpec, text: txSpec.text || 'VJif' }, my = ++txPrevN, r = await renderText({ ...spec, marquee: 0 }, FW, FH);   // the still picture (a marquee scrolls it)
  const f = r.src[0]; if (my !== txPrevN){ f.close(); return; }   // a newer one is on its way
  c.height = Math.round(c.width * H / W);
  // the frame, zoomed out when the text (or a cut-out's grown matte) is bigger than it, so the whole text shows
  const zw = Math.max(FW, spec.cut ? f.width : r.inkW * 1.04), zh = Math.max(FH, spec.cut ? f.height : r.inkH * 1.04), k = Math.min(c.width / zw, c.height / zh);   // by the letters, so a bigger glow doesn't zoom out
  const fx = (c.width - FW * k) / 2, fy = (c.height - FH * k) / 2;
  x.clearRect(0, 0, c.width, c.height);
  if (spec.cut){ x.fillStyle = '#3a6'; x.fillRect((c.width - f.width * k) / 2, (c.height - f.height * k) / 2, f.width * k, f.height * k); }   // what shows through the letters
  x.drawImage(f, (c.width - f.width * k) / 2, (c.height - f.height * k) / 2, f.width * k, f.height * k);
  if (k < c.width / FW - 1e-6){ x.strokeStyle = '#ff5bb0'; x.setLineDash([4, 3]); x.strokeRect(fx + 0.5, fy + 0.5, FW * k - 1, FH * k - 1); x.setLineDash([]); }   // the output frame
  f.close();
}
async function textOk(target = -1){   // target: the pad it was dragged onto (-1: the next empty one)
  txRead(); if (!txSpec.text.trim()) return toast('Type a text first');
  const spec = { ...txSpec, v: 1 };
  const blob = new Blob([JSON.stringify(spec)], { type: TEXT_MIME }), name = textName(spec), edit = txEdit;
  closeText();
  try {
    const m = await mediaFor(blob, name);
    if (edit >= 0 && pads[edit].gif){                // keep the pad's settings, with the new text
      const old = pads[edit].gif, keep = gifSettings(old), g = putMedia(m, edit);
      if (g){ delete keep.lfo; applyGifSettings(g, keep); g.lfo = JSON.parse(JSON.stringify(old.lfo)); if (g.lfo.x) delete g.lfo.x; textDefaults(g);
        if (!spec.marquee && old.lfo.x && !old.media.text.marquee) g.lfo.x = JSON.parse(JSON.stringify(old.lfo.x));
        if (g.key.on || hsvOn(g)) applyFx(g); syncGifUI(); }
    } else { const d = target >= 0 ? target : nextEmpty(selPad); if (d >= 0){ putMedia(m, d); pads[d].el.classList.remove('hit'); void pads[d].el.offsetWidth; pads[d].el.classList.add('hit'); } else toast('All pads are full: the text is in the pool'); }
  } catch (err) { toast("Couldn't make the text: " + err.message); }
}
// the font list: a font not listed (a set from another computer) is added so it stays selected
const txFontStyle = () => document.querySelectorAll('#txFont option').forEach(o => { if (o.value !== '?local' && !o.style.fontFamily) o.style.fontFamily = `"${o.value}", sans-serif`; });
function txFontSet(f){ const sel = $('#txFont'); if (![...sel.options].some(o => o.value === f)){ const o = document.createElement('option'); o.textContent = f; $('#txLocal').prepend(o); } sel.value = f; }
$('#txFont').addEventListener('change', async e => {
  if (e.target.value !== '?local') return;
  e.target.value = txSpec.font;
  if (!window.queryLocalFonts) return toast("This browser can't list installed fonts (Chrome can)");
  try { const fams = [...new Set((await queryLocalFonts()).map(f => f.family))].sort((a, b) => a.localeCompare(b));
    const g = $('#txLocal'), have = new Set([...$('#txFont').options].map(o => o.value));
    fams.forEach(f => { if (!have.has(f)){ const o = document.createElement('option'); o.textContent = f; g.appendChild(o); } });
    txFontStyle(); g.querySelector('option[value="?local"]').textContent = `This computer: ${fams.length} fonts`; toast2(`${fams.length} fonts listed under “This computer”`);
  } catch (err) { toast('Installed fonts were not shared'); }
});
$('#textBtn').addEventListener('click', () => openText(-1));
$('#gText').addEventListener('click', () => openText(selPad));
$('#txClose').addEventListener('click', closeText);
$('#txOk').addEventListener('click', () => textOk());
// a new text: drag the chip onto any pad (the window steps aside while dragging); a click puts it on the next empty pad
{ const chip = $('#txDrag'); let d = null;
  chip.addEventListener('pointerdown', e => { if (e.button) return; chip.setPointerCapture(e.pointerId); d = { x: e.clientX, y: e.clientY, moved: false }; });
  chip.addEventListener('pointermove', e => { if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5){ d.moved = true; $('#textPanel').classList.add('dragging'); const g = document.createElement('span'); g.className = 'chip'; g.innerHTML = `<span>${esc((txSpec.text || 'Text').slice(0, 10))}</span>`; ghost.show(g); }
    if (d.moved){ ghost.move(e.clientX, e.clientY); const t = document.elementFromPoint(e.clientX, e.clientY), p = t && t.closest('.pad'); pads.forEach(q => q.el.classList.toggle('drop', q.el === p)); } });
  const end = e => { if (!d) return; const was = d; d = null;
    const t = was.moved && e && document.elementFromPoint(e.clientX, e.clientY), p = t && t.closest('.pad');   // (while the window is still out of the way)
    ghost.hide(); pads.forEach(q => q.el.classList.remove('drop')); $('#textPanel').classList.remove('dragging');
    if (!was.moved) textOk(); else if (p) textOk(+p.dataset.i); };
  chip.addEventListener('pointerup', end); chip.addEventListener('pointercancel', () => end(null)); }
$('#textPanel').addEventListener('input', () => { txRead(); txUI(); });
$('#textPanel').addEventListener('change', () => { txRead(); txUI(); });
onSeg($('#txCut'), (b, e) => {
  const cut = b.dataset.v === '1'; if (cut !== txSpec.cut){ const c = txSpec.color.toLowerCase();   // white letters ↔ a black matte, the usual pairs
    if (cut && c === '#ffffff') txSpec.color = '#000000'; else if (!cut && c === '#000000') txSpec.color = '#ffffff'; $('#txCol').value = txSpec.color; }
  txSpec.cut = cut; txUI(); });
// the Logo Lab rows (Letters only) and the second colour
$('#txLooks').innerHTML = `<div class="field txlook"><label>Preset</label><div class="txRow"><select id="txPreset" title="Logo Lab's looks: font, fill, outline, shadow, glow, box and colours in one go"><option value="">Choose a look…</option>${TX_PRESETS.map(([n], i) => `<option value="${i}">${n}</option>`).join('')}</select></div></div>` + TX_LOOKS.map(([k, n, opts]) => `<div class="field txlook"><label>${n}</label><div class="txRow"><div class="seg" data-k="${k}">${opts.map(([v, t]) => `<button data-v="${v}">${t}</button>`).join('')}</div>${k === 'fill' ? '<input type="color" id="txCol2" value="#ff5bb0" title="Second colour: gradient end, outline, shadow and glow">' : ''}</div></div>`).join('');
$('#txLooks').insertAdjacentHTML('beforeend', `<div class="field txlook"><label>Accent</label><div class="txRow"><div class="seg" data-k="acc" title="Split the text with | (VJ|if): one part gets the second colour"><button data-v="0">None</button><button data-v="1">Before |</button><button data-v="2">After |</button></div>
  <label class="tog" title="Capital letters"><input type="checkbox" id="txUpper">UPPER</label></div></div>
  <div class="field txlook"><label for="txSlant">Slant</label><input type="range" id="txSlant" min="-20" max="20" step="1" value="0" data-def="0"><output></output></div>`);
$('#txLooks').addEventListener('click', e => { const b = e.target.closest('.seg button'); if (!b) return; const k = b.closest('.seg').dataset.k; txSpec[k] = k === 'acc' ? +b.dataset.v : b.dataset.v; txUI(); });
$('#txPreset').addEventListener('change', e => { const p = TX_PRESETS[+e.target.value]; if (!p) return;
  Object.assign(txSpec, TX_LOOK0, p[1], { cut: false }); txFontSet(txSpec.font); $('#txBold').checked = txSpec.bold; $('#txItal').checked = txSpec.ital; $('#txTrack').value = txSpec.track;
  $('#txCol').value = txSpec.color; $('#txCol2').value = txSpec.col2; e.target.value = ''; txUI(); });
onSeg($('#txMarq'), (b, e) => { txSpec.marquee = +b.dataset.v; txUI(); });
$('#textPanel').addEventListener('pointerdown', e => { if (e.target.id === 'textPanel') closeText(); });
