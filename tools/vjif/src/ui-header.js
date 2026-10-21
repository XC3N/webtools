// ---------- import UI ----------
let fileTarget = -1;
// (Add… and the URL field moved to the GIF pool in 0.87: the pool's own Add… and link field do it)
$('#fileIn').addEventListener('change', e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) loadFiles(f, fileTarget); });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
  e.preventDefault();
  const f = [...(e.dataTransfer ? e.dataTransfer.files : [])].find(f => /\.vjif$/i.test(f.name));
  if (f) importVjif(f);
});
const bank = $('#bank');
bank.addEventListener('dragover', e => {
  e.preventDefault(); const T = e.dataTransfer.types;
  const bgChip = T.includes(CLIP_MIME) && chipDrag && isBgPad(chipDrag.pad);   // a Background slot's chip: onto a pad, it becomes that pad's GIF (0.89)
  const ok = !T.includes(SCENE_MIME) && (bgChip || T.includes(POOL_MIME) || T.includes('Files') || T.includes('text/uri-list') || (T.includes('text/plain') && !T.includes(CLIP_MIME)));   // GIFs, files, links: a scene tile is no GIF
  e.dataTransfer.dropEffect = ok ? 'copy' : 'none';
  const el = ok && e.target.closest('.pad'); pads.forEach(p => p.el.classList.toggle('drop', p.el === el)); $('#poolBtn').classList.toggle('drop', !!ok && !!e.target.closest('#poolBtn') && !T.includes(POOL_MIME));
});
bank.addEventListener('dragleave', e => { if (!bank.contains(e.relatedTarget)){ pads.forEach(p => p.el.classList.remove('drop')); $('#poolBtn').classList.remove('drop'); } });
bank.addEventListener('drop', e => {
  e.preventDefault(); pads.forEach(p => p.el.classList.remove('drop'));
  if (e.dataTransfer.types.includes(SCENE_MIME)) return;
  if (e.dataTransfer.types.includes(CLIP_MIME)){ const pe = e.target.closest('.pad'), cd = chipDrag; chipDrag = null;
    if (pe && cd && isBgPad(cd.pad)){ const j = +pe.dataset.i; swapPads(cd.pad, j); toast2(`Moved from Background to pad ${pads[j].label}`); } return; }
  if (e.target.closest('#poolBtn')){                // dropped on the Pool button: into the pool only (0.89)
    $('#poolBtn').classList.remove('drop');
    const fs = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/') || /\.(gif|webp|png|apng)$/i.test(f.name));
    if (fs.length){ loadFiles(fs, POOL_ONLY).then(() => { renderPool(); toast2(`${fs.length} GIF${fs.length > 1 ? 's' : ''} added to the pool`); }); return; }
    const u = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '').split(/\r?\n/).map(s => s.trim()).find(s => /^https?:\/\//.test(s));
    if (u) loadUrlInto(u, POOL_ONLY); return; }
  const padEl = e.target.closest('.pad'), start = padEl ? +padEl.dataset.i : -1;
  const ph = e.dataTransfer.getData(POOL_MIME);
  if (ph){                                           // a pool GIF dragged onto a pad: put it there (replacing — undoable)
    const m = pool.find(m => m.hash === ph), d = start >= 0 ? start : nextEmpty(selPad); if (!m) return;
    if (d < 0) return toast('All 9 Scene pads are full — drop it on a pad to replace');
    if (pads[d].loading) return;
    putMedia(m, d); renderPool(); return;
  }
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/') || /\.(gif|webp|png|apng)$/i.test(f.name));
  if (files.length) return loadFiles(files, start);
  const uri = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain') || '')
    .split(/\r?\n/).map(s => s.trim()).find(s => /^https?:\/\//.test(s));
  if (uri) loadUrlInto(uri, start >= 0 ? start : nextEmpty());
});

// ---------- header UI ----------
const bpmEl = $('#bpm');
$('#bpmRound').addEventListener('click', () => { if (clock.src !== 'internal') return; setBpm(Math.round(clock.bpm)); bpmEl.value = clock.bpm.toFixed(2); });
[['#bpmDbl', 2], ['#bpmHalf', 0.5]].forEach(([id, k]) => $(id).addEventListener('click', () => { if (clock.src !== 'internal') return; setBpm(clock.bpm * k); bpmEl.value = clock.bpm.toFixed(2); }));   // (the beat count carries on: GIFs stay in place)
function commitBpm(){
  const v = parseFloat(bpmEl.value);
  if (clock.src === 'internal' && isFinite(v)) setBpm(v);
  bpmEl.value = clock.bpm.toFixed(2); bpmEl.classList.remove('pending');
}
bpmEl.addEventListener('input', () => bpmEl.classList.toggle('pending', parseFloat(bpmEl.value) !== +clock.bpm.toFixed(2)));
bpmEl.addEventListener('keydown', e => {
  if (e.key === 'Enter'){ e.preventDefault(); commitBpm(); bpmEl.blur(); }
  else if (e.key === 'Escape'){ bpmEl.value = clock.bpm.toFixed(2); bpmEl.classList.remove('pending'); bpmEl.blur(); }
});
bpmEl.addEventListener('blur', commitBpm);
// mouse wheel over a digit of the tempo steps that digit: hundreds … hundredths (the digit is underlined)
const bpmCtx = document.createElement('canvas').getContext('2d');
function bpmDigit(e){
  const cs = getComputedStyle(bpmEl), r = bpmEl.getBoundingClientRect(), txt = bpmEl.value;
  bpmCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const cw = bpmCtx.measureText('0').width;   // (computed 'font' can be empty)
  const bl = parseFloat(cs.borderLeftWidth), pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
  const inner = r.width / uiZoom - bl * 2 - pl - pr, start = bl + pl + (inner - cw * txt.length) / 2;
  let i = clamp(Math.floor(((e.clientX - r.left) / uiZoom - start) / cw), 0, txt.length - 1);
  const dot = txt.indexOf('.') < 0 ? txt.length : txt.indexOf('.');
  if (i === dot) i = dot - 1;
  return { place: i < dot ? 10 ** (dot - 1 - i) : 10 ** -(i - dot), x: start + i * cw, w: cw };
}
const bpmMark = $('#bpmMark');
let bpmHide = null;                                  // while the wheel turns, the pointer hides (it sat on the digits); moving the mouse brings it back
bpmEl.addEventListener('mousemove', e => {
  if (bpmHide && Math.hypot(e.clientX - bpmHide[0], e.clientY - bpmHide[1]) > 3){ bpmHide = null; bpmEl.style.cursor = ''; }
  if (bpmEl.disabled || document.activeElement === bpmEl){ bpmMark.style.display = 'none'; return; }
  const d = bpmDigit(e); Object.assign(bpmMark.style, { display: 'block', left: d.x + 'px', width: d.w + 'px' });
});
// the pointer can't always be hidden (Chrome keeps it until the mouse moves): the tempo also shows under the box while the wheel turns
const bpmPeek = $('#bpmPeek'); let bpmPeekT = 0;
const peekOff = () => { clearTimeout(bpmPeekT); bpmPeek.style.display = 'none'; };
bpmEl.addEventListener('mouseleave', () => { bpmMark.style.display = 'none'; bpmHide = null; bpmEl.style.cursor = ''; peekOff(); });
bpmEl.addEventListener('wheel', e => {
  e.preventDefault();
  if (clock.src !== 'internal' || document.activeElement === bpmEl) return;
  const d = e.deltaY || e.deltaX; if (!d) return;
  if (!bpmHide){ bpmHide = [e.clientX, e.clientY]; bpmEl.style.cursor = 'none'; }
  setBpm(clock.bpm + (d < 0 ? 1 : -1) * bpmDigit(e).place);
  bpmPeek.textContent = bpmEl.value; bpmPeek.style.display = 'block'; clearTimeout(bpmPeekT); bpmPeekT = setTimeout(peekOff, 1200);
}, { passive: false });
// drag the tempo up / down: the digit under the pointer moves 1 step every 6 px (a click without dragging types instead)
{
  let d = null;
  bpmEl.addEventListener('pointerdown', e => {
    if (e.button || clock.src !== 'internal' || document.activeElement === bpmEl) return;
    e.preventDefault(); bpmEl.setPointerCapture(e.pointerId);
    d = { y: e.clientY, place: bpmDigit(e).place, bpm0: clock.bpm, moved: false };
  });
  bpmEl.addEventListener('pointermove', e => {
    if (!d) return;
    const dy = d.y - e.clientY; if (!d.moved && Math.abs(dy) < 3) return;
    d.moved = true; document.body.classList.add('bpmdrag');
    setBpm(d.bpm0 + Math.trunc(dy / 6) * d.place);
  });
  const end = () => { if (!d) return; const typed = !d.moved; d = null; document.body.classList.remove('bpmdrag'); if (typed){ bpmEl.focus(); bpmEl.select(); } };
  bpmEl.addEventListener('pointerup', end); bpmEl.addEventListener('pointercancel', end);
}
$('#tapBtn').addEventListener('click', tap);
$('#syncBtn').addEventListener('click', resync);
$('#midiClk').addEventListener('click', () => setClockSrc(clock.src === 'midi' ? 'internal' : 'midi'));
$('#midiIn').addEventListener('change', bindMidiInput);
$('#midiIn').addEventListener('pointerdown', async () => { if (midiAccess) return; try { await getMidi(); fillMidi(); } catch (e) {} });   // list the inputs before MIDI is on
$('#snap').addEventListener('change', e => snapMode = e.target.value);
$('#outBtn').addEventListener('click', openOutput);   // Shift+click: reset its position and size
$('#outBtn').addEventListener('contextmenu', e => { e.preventDefault(); openOutputPip(); });   // right-click: always on top
$('#helpBtn').addEventListener('click', () => { $('#helpPanel').hidden = false; });
$('#setBtn').addEventListener('click', () => { $('#setPanel').hidden = !$('#setPanel').hidden; if (!$('#setPanel').hidden) placeSettings(); });
// a click anywhere outside the Settings window closes it (the click still reaches what's under it)
document.addEventListener('pointerdown', e => { if (!$('#setPanel').hidden && !e.target.closest('#setPanel .modalBox, #setBtn, #cpk')) $('#setPanel').hidden = true; }, true);   // (the colour picker sits outside it)
// floating windows (Settings, Pool): drag the title bar to move them out of the way; the spot is remembered
function movable(box, key){
  const hd = box.querySelector('h2'); hd.style.cursor = 'move'; hd.title = 'Drag to move';
  box.addEventListener('pointermove', e => { if (e.target === box) box.style.cursor = 'move'; else if (box.style.cursor) box.style.cursor = ''; });
  const start = e => {
    const r = box.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const el = e.currentTarget; el.setPointerCapture(e.pointerId);
    const mv = ev => moveBox(box, ev.clientX - ox, ev.clientY - oy);
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up);
      Prefs.setJson(key, [parseFloat(box.style.left), parseFloat(box.style.top)]); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up);
  };
  hd.addEventListener('pointerdown', e => { if (e.button || e.target.closest('button')) return; start(e); });
  box.addEventListener('pointerdown', e => { if (!e.button && e.target === box) start(e); });   // 0.99.1: its empty border too (the padding around what's inside)
}
function moveBox(box, x, y){
  const w = box.offsetWidth;
  Object.assign(box.style, { position: 'fixed', margin: '0', left: clamp(x, 0, innerWidth - w * uiZoom) / uiZoom + 'px', top: clamp(y, 0, innerHeight - 48) / uiZoom + 'px' });
}
function placeMovable(box, key){ const p = Prefs.json(key); if (p) moveBox(box, p[0], p[1]); }
movable($('#setPanel .modalBox'), 'vjif-setpos');
const placeSettings = () => placeMovable($('#setPanel .modalBox'), 'vjif-setpos');
$('#setClose').addEventListener('click', () => { $('#setPanel').hidden = true; });
// open Settings at the section holding el, unfolded and scrolled to (0.99.4: right-click MIDI in the top bar → the MIDI section)
function openSetAt(el){ if ($('#setPanel').hidden) $('#setBtn').click(); let s = el.closest('.row'); while (s && !s.classList.contains('sub')) s = s.previousElementSibling;
  if (s && s.classList.contains('shut')) s.querySelector('span').click(); requestAnimationFrame(() => (s || el).scrollIntoView({ block: 'start' })); }
$('#midiClk').addEventListener('contextmenu', e => { e.preventDefault(); openSetAt($('#midiIn')); });
new MutationObserver(() => $('#setBtn').classList.toggle('on', !$('#setPanel').hidden)).observe($('#setPanel'), { attributes: true, attributeFilter: ['hidden'] });   // the gear stays lit while Settings is open
$('#setPanel').addEventListener('pointerdown', e => { if (e.target.id === 'setPanel') $('#setPanel').hidden = true; });
$('#aboutVer').textContent = $('#hdrVer').textContent = 'v' + APP_VERSION;
$('#hdrVer').addEventListener('click', () => openAbout('log'));
$('#helpClose').addEventListener('click', () => { $('#helpPanel').hidden = true; });
$('#fmtSeg').innerHTML = Object.entries(FORMATS).map(([k, [w, h, d]]) => `<button data-f="${k}" title="${d} · ${w}×${h}">${k}</button>`).join('');
onSeg($('#fmtSeg'), (b, e) => { setFormat(b.dataset.f); });
syncFormatUI();
const syncRecFmt = () => {
  $('#recCodecSel').value = recCodec;
  document.querySelectorAll('#recFpsSeg button').forEach(b => b.classList.toggle('on', +b.dataset.f === recFps));
  document.querySelectorAll('#recMbpsSeg button').forEach(b => b.classList.toggle('on', +b.dataset.m === recMbps));
  document.querySelectorAll('#recACodecSeg button').forEach(b => { b.classList.toggle('on', recFmt === 'webm' ? b.dataset.a === 'opus' : b.dataset.a === recACodec); b.disabled = recFmt === 'webm'; });
};
syncRecFmt();
const syncRecSrc2 = () => document.querySelectorAll('#recSrcSeg button').forEach(b => b.classList.toggle('on', b.dataset.s === recSrc));
syncRecSrc2();
onSeg($('#recSrcSeg'), b => { recSrc = b.dataset.s; Prefs.set('vjif-recsrc', recSrc); syncRecSrc2(); });
const syncRecBars = () => document.querySelectorAll('#recBarsSeg button').forEach(b => b.classList.toggle('on', +b.dataset.b === recBars));
syncRecBars();
onSeg($('#recBarsSeg'), (b, e) => { recBars = +b.dataset.b; Prefs.set('vjif-recbars', recBars); syncRecBars(); });
const syncRecCount = () => document.querySelectorAll('#recCountSeg button').forEach(b => b.classList.toggle('on', +b.dataset.b === recCount));
syncRecCount();
onSeg($('#recCountSeg'), (b, e) => { recCount = +b.dataset.b; Prefs.set('vjif-reccount', recCount); syncRecCount(); });
// sound inputs: names only show once the browser has been allowed to use audio input (asked the first time you pick one)
async function fillRecAudio(ask = false){
  const sel = $('#recAudioSel'); if (!sel || !navigator.mediaDevices) return;
  if (ask){ try { (await navigator.mediaDevices.getUserMedia({ audio: true })).getTracks().forEach(t => t.stop()); } catch (e) { toast('Sound input access was not allowed'); } }
  let ins = []; try { ins = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput' && d.deviceId !== 'default' && d.deviceId !== 'communications'); } catch (e) {}
  const old = [...sel.options].filter(o => o.value && !SPECIAL_SND.includes(o.value) && o.value !== '?').map(o => [o.value, o.textContent]);
  if (!ins.length && old.length && !ask) return;   // 0.99.11: an empty scan (the camera was being opened) keeps the list it had
  const named = ins.some(d => d.label);
  sel.innerHTML = '<option value="">No sound</option><option value="music">Music player</option><option value="tab">Tab audio</option>' + (named ? ins.map(d => `<option value="${esc(d.deviceId)}">${esc(d.label)}</option>`).join('') : '<option value="?">Choose an input… (asks permission)</option>')
    + (recAudio && !SPECIAL_SND.includes(recAudio.id) && !ins.some(d => d.deviceId === recAudio.id) ? `<option value="${esc(recAudio.id)}">${esc(recAudio.label || 'Chosen input')} (not connected)</option>` : '');
  sel.value = recAudio ? recAudio.id : '';
}
$('#recAudioSel').addEventListener('change', async e => {
  const v = e.target.value;
  if (v === '?'){ await fillRecAudio(true); return; }
  recAudio = v ? { id: v, label: e.target.selectedOptions[0].textContent } : null;
  Prefs.setJson('vjif-recaudio', recAudio); syncRecSrc();
});
$('#setBtn').addEventListener('click', () => fillRecAudio());
const recSave = (k, v) => { Prefs.set(k, v); syncRecFmt(); recUI(); };
$('#recCodecSel').addEventListener('change', e => { recCodec = e.target.value; recFmt = recCodec.startsWith('vp') ? 'webm' : 'mp4'; recSave('vjif-reccodec', recCodec); });
onSeg($('#recFpsSeg'), (b, e) => { recFps = +b.dataset.f; recSave('vjif-recfps', recFps); });
onSeg($('#recMbpsSeg'), (b, e) => { recMbps = +b.dataset.m; recSave('vjif-recmbps', recMbps); });
onSeg($('#recACodecSeg'), (b, e) => { recACodec = b.dataset.a; recSave('vjif-recacodec', recACodec); });
// interface size
// pad sections fold away to give the space below more room; a folded one shows how many of its pads hold GIFs
var padFold = Prefs.json('vjif-padfold', {});
function syncPadFold(){ document.querySelectorAll('.padsub').forEach(h => { const g = h.dataset.g, n = (g === 'A' ? SCENE_PADS : pads.slice(9, 18).map(p => p.i)).filter(i => pads[i].gif).length;
  h.classList.toggle('fold', !!padFold[g]); h.querySelector('.cnt').textContent = `· ${n} GIF${n === 1 ? '' : 's'}`; }); }
syncPadFold();
// the Scene pads' two banks (0.90): Tab or the bank switch flips which one the grid shows; both play from the keys (Shift: bank 2)
function setPadBank(b){ padBank = b ? 1 : 0; $('#gridA').classList.toggle('b2', !!padBank); $('#bankBtn').querySelectorAll('button').forEach(x => x.classList.toggle('on', +x.dataset.v === padBank));
  if (isScenePad(selPad) && (selPad >= B2) !== !!padBank){ const j = selPad >= B2 ? selPad - B2 : selPad + B2; selectPad(j); } }
$('#bankBtn').addEventListener('click', e => { e.stopPropagation(); const b = e.target.closest('button'); if (b) setPadBank(+b.dataset.v); });
document.querySelectorAll('.padsub').forEach(h => h.addEventListener('click', () => { padFold[h.dataset.g] = !padFold[h.dataset.g]; Prefs.setJson('vjif-padfold', padFold); syncPadFold(); }));
const syncZoomUI = () => { $('#uiZoomR').value = uiZoom; $('#uiZoomV').textContent = Math.round(uiZoom * 100) + '%'; };
syncZoomUI();
let uiZoomT = 0;
let uiZoomRaf = 0;
function setUiZoom(z){ uiZoom = Math.round(clamp(z, 0.7, 1.3) * 100) / 100;
  Prefs.set('vjif-uizoom', uiZoom); syncZoomUI();
  cancelAnimationFrame(uiZoomRaf); uiZoomRaf = requestAnimationFrame(() => {   // live, once per frame
    document.documentElement.style.zoom = uiZoom === 1 ? '' : uiZoom; document.documentElement.style.setProperty('--uiz', uiZoom); sizeNotice(); sizePreview(); });
  clearTimeout(uiZoomT); uiZoomT = setTimeout(() => { fxFitGen++; syncFxUI(); }, 200); }   // names refit once it rests
// dragged by hand rather than by the browser: the slider grows and shrinks with the interface, so its own maths would chase the pointer
let uzDrag = null;
$('#uiZoomR').addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); const r = e.currentTarget.getBoundingClientRect();
  uzDrag = { x: e.clientX, z: uiZoom, w: r.width, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); });
// once it really moves, Settings steps aside: only this row stays, the interface shows through (a click or double-click doesn't flash it)
$('#uiZoomR').addEventListener('pointermove', e => { if (!uzDrag) return; if (!uzDrag.moved && Math.abs(e.clientX - uzDrag.x) > 3){ uzDrag.moved = true; $('#setPanel').classList.add('peek'); }
  if (uzDrag.moved) setUiZoom(uzDrag.z + (e.clientX - uzDrag.x) / uzDrag.w * 0.6); });
const uzEnd = () => { uzDrag = null; $('#setPanel').classList.remove('peek'); };
$('#uiZoomR').addEventListener('pointerup', uzEnd); $('#uiZoomR').addEventListener('pointercancel', uzEnd);
$('#uiZoomR').addEventListener('input', e => { if (!uzDrag) setUiZoom(+e.target.value); });   // keyboard arrows
$('#uiZoomR').addEventListener('dblclick', () => setUiZoom(1));
// screens below 1280×720: a note, until it's big enough (or the interface is made smaller)
function sizeNotice(){
  let n = $('#sizeNote'); const small = innerWidth / uiZoom < 1260 || innerHeight / uiZoom < 690;
  if (!small){ if (n) n.hidden = true; return; }
  if (!n){ n = document.createElement('div'); n.id = 'sizeNote'; document.body.appendChild(n);
    n.innerHTML = `VJif is made for 1280×720 or more — some controls are squeezed. Try Settings › Interface › Size 90% or 80%. <button class="iconbtn" title="Hide">×</button>`;
    n.querySelector('button').addEventListener('click', () => { n.hidden = true; n.dataset.off = 1; }); }
  n.hidden = !!n.dataset.off;
}
addEventListener('resize', sizeNotice); sizeNotice();
// your defaults
const DEF_KEYS = ['fx', 'fxPre', 'tr'];
function defNote(){ const ks = DEF_KEYS.filter(k => userDef[k] !== undefined); $('#defHead').title = ks.length ? `Your defaults (saved ${new Date(userDef.saved).toLocaleDateString()}): new sets start with your ${ks.map(k => DEF_NAMES[k]).join(', ')}; resets go back to them.` : "Using VJif's own defaults. Set effects and presets the way you like them, then Save current settings: every new set starts like that."; }
function setUserDef(d){ userDef = d || {}; Prefs.set('vjif-userdef', d ? JSON.stringify(d) : null); defNote(); }
// the ticked parts: Save, Reset, Export and Import only touch those
const DEF_NAMES = { fx: 'effects', fxPre: 'effect presets', tr: 'transitions' };
const defParts = () => [...document.querySelectorAll('#defParts input:checked')].map(i => i.dataset.k);
const partsTxt = ks => ks.length === 3 ? 'all' : ks.map(k => DEF_NAMES[k]).join(' + ');
$('#defSave').addEventListener('click', () => { const ks = defParts(); if (!ks.length) return toast('Tick at least one part');
  const cur = { fx: () => JSON.parse(JSON.stringify(fxCfg)), fxPre: () => JSON.parse(JSON.stringify(fxPre)), tr: () => trPresets.map(P => ({ ...P })) };
  const o = { ...userDef, v: 1, fxOrd: 4, saved: Date.now() }; ks.forEach(k => o[k] = cur[k]()); setUserDef(o); toast2(`Saved as your defaults (${partsTxt(ks)})`); });
$('#defReset').addEventListener('click', () => { const ks = defParts(); if (!ks.length) return toast('Tick at least one part');
  const o = { ...userDef }; ks.forEach(k => delete o[k]); setUserDef(DEF_KEYS.some(k => o[k] !== undefined) ? o : null);
  toast2(`Back to VJif's defaults (${partsTxt(ks)}; for new sets and resets, this set is unchanged)`); });
$('#defExport').addEventListener('click', () => { const ks = defParts().filter(k => userDef[k] !== undefined); if (!ks.length) return toast('Save your defaults first (for the ticked parts)');
  const out = { app: 'VJif', kind: 'defaults', v: 1, fxOrd: 4, saved: userDef.saved }; ks.forEach(k => out[k] = userDef[k]);
  saveFile(JSON.stringify(out, null, 1), ks.length === 3 ? 'vjif-defaults.json' : `vjif-defaults-${ks.join('-').toLowerCase()}.json`, 'application/json'); });
$('#defImport').addEventListener('click', () => $('#defFile').click());
$('#defFile').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const d = JSON.parse(await f.text()); if (d.app !== 'VJif' || d.kind !== 'defaults') throw new Error('not a VJif defaults file'); fxRemapDefs(d);
    const ks = defParts().filter(k => d[k] !== undefined); if (!ks.length) throw new Error('it has none of the ticked parts');
    const o = { ...userDef, v: 1, fxOrd: 4, saved: Date.now() }; ks.forEach(k => o[k] = d[k]); setUserDef(o);
    if (ks.includes('fx')) fxCfg = fxDefaults(); if (ks.includes('fxPre')){ fxPre = fxPreDefaults(); heldPre = -1; } if (ks.includes('tr')){ trPresets = trDefaults(); armTrans(trSel); }   // 0.99.7: the open set takes them too
    syncFxUI(); toast2(`Defaults loaded (${partsTxt(ks)}): in this set, new sets and resets`);
  } catch (err) { toast("Couldn't load those defaults: " + err.message); } });
defNote();

$('#midiLearn').addEventListener('click', startLearn);
$('#learnDone').addEventListener('click', endLearn);
$('#midiClear').addEventListener('click', () => { midiCtl.map = []; saveMidiCtl(); renderMidiCtl(); });
onSeg($('#midiMap'), b => { midiCtl.map.splice(+b.dataset.k, 1); saveMidiCtl(); renderMidiCtl(); });
$('#midiCtlIn').addEventListener('change', e => { midiCtl.input = e.target.value; midiCtl.inputName = e.target.selectedOptions[0].textContent.replace(/ \(not connected\)$/, ''); saveMidiCtl(); bindCtlInputs(); });
renderMidiCtl();
if (midiCtl.map.length && navigator.requestMIDIAccess) getMidi().then(() => { bindCtlInputs(); fillMidi(); }).catch(() => {});   // mappings exist: listen from the start
// About & getting started: opens by itself the first time (and every start while its box is ticked)
const TAGLINES = ["actually, it's pronounced vjif", 'Vanks Jod It\'s Friday', 'VJing, with a hard G'];
function openAbout(tab = 'start'){ $('#tagline').textContent = TAGLINES[Math.floor(Math.random() * TAGLINES.length)]; $('#helpPanel').hidden = true; $('#aboutPanel').hidden = false; aboutTab(tab); }
function aboutTab(v){ $('#aboutTabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('#aboutStart').hidden = v !== 'start'; $('#aboutLog').hidden = v !== 'log'; $(v === 'log' ? '#aboutLog' : '#aboutStart').scrollTop = 0; }
onSeg($('#aboutTabs'), b => aboutTab(b.dataset.v));
$('#aboutVer').addEventListener('click', e => { e.preventDefault(); aboutTab('log'); });
function closeAbout(){ $('#aboutPanel').hidden = true; Prefs.set('vjif-about', $('#aboutAgain').checked ? 'show' : 'seen'); }
$('.brand').addEventListener('click', () => openAbout());
$('#helpAbout').addEventListener('click', () => openAbout());
// Credits: over About (last in the page, so it sits on top)
$('#credBtn').addEventListener('click', () => { document.body.appendChild($('#credPanel')); $('#credPanel').hidden = false; });
$('#credClose').addEventListener('click', () => { $('#credPanel').hidden = true; });
$('#credPanel').addEventListener('pointerdown', e => { if (e.target.id === 'credPanel') $('#credPanel').hidden = true; });
$('#aboutClose').addEventListener('click', closeAbout); $('#aboutGo').addEventListener('click', closeAbout);
$('#aboutPanel').addEventListener('pointerdown', e => { if (e.target.id === 'aboutPanel') closeAbout(); });
{ const a = Prefs.get('vjif-about'), v = Prefs.get('vjif-ver'); Prefs.set('vjif-ver', APP_VERSION);
  $('#aboutAgain').checked = a === 'show';
  if (a !== 'seen') openAbout(v && v !== APP_VERSION ? 'log' : 'start');
  else if (v && v !== APP_VERSION) openAbout('log'); }   // updated since last time: show what's new once
$('#helpPanel').addEventListener('pointerdown', e => { if (e.target.id === 'helpPanel') $('#helpPanel').hidden = true; });
// GIF tabs: all panes share one grid cell (rule 3), so switching never moves anything below
onSeg($('#gTabs'), b => {
  segSet('#gTabs', b.dataset.v); gTab = b.dataset.v;
  document.querySelectorAll('#gPanes > [data-pane]').forEach(p => p.classList.toggle('off', p.dataset.pane !== b.dataset.v));
  if (gTab === 'colour') syncSwapUI(curGif());   // the palette is worked out when the tab is first opened
});
// key reset
$('#kReset').addEventListener('click', () => { const g = curGif(); if (!g) return; Object.assign(g.key, { on: false, color: [0, 255, 0], tol: 0.15, soft: 0.08, region: 'all', seed: null }); scheduleFx(g, 0); syncGifUI(); });


// render size (Settings › Interface)
function syncRS(){ document.querySelectorAll('#rsSeg button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - RS) < 0.01)); $('#rsInfo').textContent = `${CW}×${CH}`; }
onSeg($('#rsSeg'), b => { setRenderSize(+b.dataset.v > 0.6 && +b.dataset.v < 0.7 ? 2 / 3 : +b.dataset.v); syncRS(); });
syncRS();
// no browser menu on right-click anywhere in VJif (right-click means "select / edit" here); text boxes keep theirs (copy / paste)
document.addEventListener('contextmenu', e => { if (!e.target.closest('textarea, input:not([type]), input[type=text], input[type=search], input[type=url], [contenteditable]')) e.preventDefault(); });

// notes (toasts) show in the gap between the layer cards and the preview, centred over the preview
function placeToast(){ const r = $('#pvWrap').getBoundingClientRect(), z = uiZoom || 1, L = $('#layers').getBoundingClientRect();
  const st = document.documentElement.style; st.setProperty('--toastX', (r.left + r.width / 2) / z + 'px'); st.setProperty('--toastY', Math.max(L.bottom, r.top) / z + 4 + 'px'); }
addEventListener('resize', placeToast); new ResizeObserver(placeToast).observe($('#pvWrap')); placeToast();

// the × on pads, scenes and presets (Settings › Interface › Ctrl+click to delete only hides them)
{ const on = Prefs.get('vjif-noxdel') === '1'; $('#noXdelChk').checked = on; document.body.classList.toggle('noxdel', on);
  $('#noXdelChk').addEventListener('change', e => { document.body.classList.toggle('noxdel', e.target.checked); Prefs.set('vjif-noxdel', e.target.checked ? '1' : '0'); }); }

// Settings › Interface › Permanent scene names: emptying a scene keeps its name
let keepSceneNames = Prefs.get('vjif-keepnames') === '1'; $('#keepNamesChk').checked = keepSceneNames;
$('#keepNamesChk').addEventListener('change', e => { keepSceneNames = e.target.checked; Prefs.set('vjif-keepnames', keepSceneNames ? '1' : '0'); });
