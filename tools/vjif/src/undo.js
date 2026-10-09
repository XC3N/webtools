// ---------- undo / redo: layer contents, placement, crop and per-GIF settings (not layer on/off; a hit only makes a step when it adds a GIF to a layer) ----------
const hist = { ready: false, cur: '', undo: [], redo: [] };
function histState(){
  return JSON.stringify({
    scene: sceneIdx,
    layers: layers.map(L => ({ opacity: L.opacity, blend: L.blend, fillOn: !!L.fillOn, fill: L.fill,
      clips: L.clips.map(c => ({ id: c.id, pad: c.pad, ...Object.fromEntries(XF_KEYS.map(k => [k, c[k]])) })) })),
    gifs: pads.map(p => p.gif ? Object.fromEntries(GIF_KEYS.map(k => [k, p.gif[k]])) : null),
  });
}
function commit(){
  if (!hist.ready || drag) return;
  const s = histState(); if (s === hist.cur) return;
  hist.undo.push(hist.cur); trimHist();
  dropAll(hist.redo); hist.redo.length = 0; hist.cur = s; updHistUI();
}
// undo entries are state strings, or { clear } (a cleared pad, holding its GIF) / { reclear } (redo of that)
// GIF instances an undo entry holds off the pads (freed when the entry goes)
const entryInsts = e => !e || typeof e === 'string' ? [] : e.clear ? [e.clear.g] : e.swap ? [e.swap.g] : e.scn ? e.scn.data.pads : [];
function dropEntry(e){ const on = padInsts(); entryInsts(e).forEach(g => { if (g && !on.has(g)) freeGif(g); }); }
// swap entries: applying one swaps what it holds with what's live, so undo and redo are the same move
function applySwap(E){
  if (E.scene !== sceneIdx) gotoScene(E.scene, clock.beat, true);
  const cur = pads[E.pad].gif; pads[E.pad].gif = E.g; E.g = cur; afterPadChange(E.pad);
}
function applyScn(E){
  if (E.scene !== sceneIdx){                         // another scene: swap its contents back in place, without going there
    const sc = scenes[E.scene] || Object.assign(emptyScene(), { name: '' });
    const cur = { layers: sc.layers, pads: sc.pads };
    scenes[E.scene] = Object.assign({}, sc, { layers: E.data.layers.map((l, li) => Object.assign({}, l, { i: li })), pads: E.data.pads, thumb: null });
    E.data = cur; if (pendingScene && pendingScene.i === E.scene) pendingScene = null;
    renderScenes(); updateMem(); renderPool(); toast2(`Scene ${E.scene + 1} changed back`); return;
  }
  const cur = { layers: layers.map(layerState), pads: pads.map(p => p.gif) };
  layers.forEach((L, li) => { const d = E.data.layers[li]; Object.assign(L, layerProps(d)); });
  pads.forEach((p, k) => { p.gif = E.data.pads[k]; renderPad(k); });
  E.data = cur; pending.clear();
  selectPad(selPad); syncLayerUI(); syncXfUI(); renderScenes(); updateMem(); renderPool(); redraw.all = true;
}
// what a step changes, in words, for the undo / redo toast
const XF_WORDS = { x: 'position', y: 'position', sx: 'scale', sy: 'scale', rot: 'rotation', fit: 'fit', flipX: 'flip', flipY: 'flip', tile: 'tile', cl: 'crop', ct: 'crop', cr: 'crop', cb: 'crop', alpha: 'opacity' };
const GIF_WORDS = { sync: 'timing', loop: 'loop', speed: 'speed', crisp: 'smoothing', beats: 'loop length', subdiv: 'loop length', restart: 'restart', inF: 'frames', outF: 'frames', startF: 'frames', key: 'key colour', hsv: 'colour', swap: 'colour swap', swapMerge: 'colour merge', trig: 'trigger', env: 'envelope', lfo: 'auto' };
function histWhat(e, cur){
  if (!e) return '';
  if (e.clear) return `cleared pad ${pads[e.clear.pad] ? pads[e.clear.pad].label : ''}`;
  if (e.reclear !== undefined) return `cleared pad ${pads[e.reclear.pad] ? pads[e.reclear.pad].label : ''}`;
  if (e.swap) return `GIF on pad ${pads[e.swap.pad] ? pads[e.swap.pad].label : ''}`;
  if (e.pswap) return 'pads swapped';
  if (e.scn) return `scene ${e.scn.scene + 1}`;
  if (typeof e !== 'string' || typeof cur !== 'string') return '';
  let a, b; try { a = JSON.parse(e); b = JSON.parse(cur); } catch (err) { return ''; }
  const out = new Set(), same = (x, y) => JSON.stringify(x) === JSON.stringify(y), pl = k => pads[k] ? pads[k].label : '?';
  a.layers.forEach((la, li) => { const lb = b.layers[li]; if (!lb) return; const n = LNAMES[li];
    if (la.opacity !== lb.opacity) out.add(`${n} opacity`); if (la.blend !== lb.blend) out.add(`${n} blend`);
    if (la.fillOn !== lb.fillOn || la.fill !== lb.fill) out.add(`${n} fill`);
    const ib = new Map(lb.clips.map(c => [c.id, c])), ia = new Set(la.clips.map(c => c.id));
    la.clips.forEach(c => { const d = ib.get(c.id); if (!d) { out.add(`${pl(c.pad)} on ${n}`); return; }
      Object.keys(XF_WORDS).forEach(k => { if (!same(c[k], d[k])) out.add(`${pl(c.pad)} ${XF_WORDS[k]}`); }); });
    lb.clips.forEach(c => { if (!ia.has(c.id)) out.add(`${pl(c.pad)} on ${n}`); });
    if (la.clips.length === lb.clips.length && !same(la.clips.map(c => c.id), lb.clips.map(c => c.id))) out.add(`${n} order`); });
  (a.gifs || []).forEach((g, k) => { const h = b.gifs[k]; if (!g || !h) return; Object.keys(GIF_WORDS).forEach(key => { if (!same(g[key], h[key])) out.add(`${pl(k)} ${GIF_WORDS[key]}`); }); });
  if (a.scene !== b.scene && !out.size) out.add(`scene ${a.scene + 1}`);
  const l = [...out]; return l.length > 3 ? l.slice(0, 3).join(', ') + '…' : l.join(', ');
}
let undoToast = (() => { try { return localStorage.getItem('vjif-undotoast') !== '0'; } catch (e) { return true; } })();
const histToast = (verb, what) => { if (undoToast) toast2(what ? `${verb}: ${what}` : verb); };
$('#undoToastChk').checked = undoToast;
$('#undoToastChk').addEventListener('change', e => { undoToast = e.target.checked; try { localStorage.setItem('vjif-undotoast', undoToast ? '1' : '0'); } catch (err) {} });
function dropAll(list){ list.forEach(dropEntry); }
function trimHist(){ while (hist.undo.length > 100) dropEntry(hist.undo.shift()); }
function resetHist(){ dropAll(hist.undo); dropAll(hist.redo); hist.undo.length = hist.redo.length = 0; hist.cur = histState(); updHistUI(); }
// after applying, re-read the live state: GIFs loaded/cleared since a step was recorded aren't part of history
function undo(){
  if (!hist.ready || drag) return; commit(); if (!hist.undo.length) return;
  const e = hist.undo.pop(), what = histWhat(e, hist.cur);
  if (e && e.clear){ if (restoreClear(e.clear)) hist.redo.push({ reclear: { pad: e.clear.pad, scene: e.clear.scene } }); else dropEntry(e); }
  else if (e && e.swap){ applySwap(e.swap); hist.redo.push(e); }
  else if (e && e.pswap){ applyPswap(e.pswap); hist.redo.push(e); }
  else if (e && e.scn){ applyScn(e.scn); hist.redo.push(e); }
  else { hist.redo.push(hist.cur); applyHist(e); }
  hist.cur = histState(); updHistUI(); histToast('Undo', what);
}
function redo(){
  if (!hist.ready || drag) return; commit(); if (!hist.redo.length) return;
  const e = hist.redo.pop(), what = histWhat(e, hist.cur);
  if (e && e.reclear !== undefined){ if (e.reclear.scene !== sceneIdx) gotoScene(e.reclear.scene, clock.beat, true); clearPad(e.reclear.pad, true); }
  else if (e && e.swap){ applySwap(e.swap); hist.undo.push(e); }
  else if (e && e.pswap){ applyPswap(e.pswap); hist.undo.push(e); }
  else if (e && e.scn){ applyScn(e.scn); hist.undo.push(e); }
  else { hist.undo.push(hist.cur); applyHist(e); }
  hist.cur = histState(); updHistUI(); histToast('Redo', what);
}
function applyHist(s){
  const st = JSON.parse(s);
  if (st.scene !== undefined && st.scene !== sceneIdx) gotoScene(st.scene, clock.beat, true);   // a step from another scene: go there first
  const byId = new Map(), now = performance.now();
  layers.forEach(L => L.clips.forEach(c => byId.set(c.id, c)));      // reuse live clips so playback doesn't restart
  st.layers.forEach((sl, li) => {
    const L = layers[li], prevSel = L.sel;
    Object.assign(L, { opacity: sl.opacity, blend: sl.blend, mode: sl.mode, fillOn: !!sl.fillOn, fill: sl.fill || L.fill });
    L.clips = sl.clips.filter(c => pads[c.pad] && pads[c.pad].gif)
      .map(c => Object.assign(byId.get(c.id) || Object.assign(newClip(c.pad), { startTime: now, startBeat: clock.beat }), c));
    L.sel = L.clips.includes(prevSel) ? prevSel : null;
  });
  st.gifs.forEach((sg, i) => {
    const g = pads[i].gif; if (!g || !sg) return;
    const fx0 = JSON.stringify([g.key, g.hsv]), { key, hsv, ...rest } = sg;
    Object.assign(g, rest); Object.assign(g.key, key); Object.assign(g.hsv, hsv); rebuildSeq(g);
    if (JSON.stringify([g.key, g.hsv]) !== fx0) scheduleFx(g, 0);
  });
  syncLayerUI(); syncXfUI(); syncGifUI(); pads.forEach((p, i) => p.gif && renderPad(i)); updHistUI();
}
function updHistUI(){ $('#undoBtn').disabled = !hist.undo.length; $('#redoBtn').disabled = !hist.redo.length; }
// a gesture is finished on these events: record it as one undo step
// window, bubbling phase: runs right after the element's own handlers, so the change is already applied
['pointerup', 'click', 'change', 'keyup', 'drop', 'dragend'].forEach(t => window.addEventListener(t, commit));
$('#undoBtn').addEventListener('click', undo);
$('#redoBtn').addEventListener('click', redo);
window.addEventListener('pagehide', autosave);

// theme: saved per browser (not part of sets); canvases read the colours from TC
const TC = {};
// Reading computed colours and redrawing 18 pad thumbnails is slow, so during a drag it waits until the colour settles.
let tcT = 0;
function readThemeColours(){
  Object.assign(TC, { track: Theme.color('--track'), edge2: Theme.color('--edge-2'), env: Theme.color('--env'), faint: Theme.color('--faint'), envRgb: Theme.color('--env-rgb') });
  if (pads[0].el) pads.forEach((_, i) => renderPad(i));
  redraw.all = true;
}
Theme.onApply(() => { if (!pads[0].el) return readThemeColours(); clearTimeout(tcT); tcT = setTimeout(readThemeColours, 180); });
{ let saved = null; try { saved = Theme.parse(JSON.parse(localStorage.getItem('vjif-theme2'))); } catch (e) {}
  Theme.apply(saved || Theme.PRESETS['Matte']); }
buildPads(); pads.forEach((_, i) => renderPad(i));
buildFx(); syncFxUI(); if (!post) $('#fxPads').title = 'Screen effects need WebGL, which this browser has turned off';
buildLayers(); renderScenes(); syncTransUI(); syncLayerUI(); syncXfUI(); selectPad(0); updateMem(); sizePreview();
// typing into readouts: musical lengths accept a label ("1/8", "2 bars") or a number of beats; phase is in degrees
const lenParse = opts => t => { const l = t.toLowerCase().replace(/\s+/g, ' '), i = opts.findIndex(o => o[1].toLowerCase() === l || o[1].toLowerCase() === l + 's');
  if (i >= 0) return i; const n = parseFloat(t); return isFinite(n) ? optIdx(opts, n) : null; };
['#tA', '#tH', '#tR'].forEach(id => $(id).ctlParse = lenParse(ENV_OPTS));
$('#aPer').ctlParse = lenParse(PER_OPTS);
$('#aPh').ctlParse = t => { const n = parseFloat(t); return isFinite(n) ? mod(n, 360) / 360 : null; };
$('#themeBox').addEventListener('input', () => quietUI());
Theme.mount($('#themeBox'), { app: 'vjif', toast: toast2,
  roles: [['hCtrl', 'Signal', 'What is selected or on: chosen buttons, switches, the selected pad and scene', true], ['hLcd', 'LCD', 'Readouts, the tempo, the cycle display', true],
          ['hEnv', 'Graphs', 'Fade and automation graphs; automated values in Transform']],
  onChange: t => { try { localStorage.setItem('vjif-theme2', JSON.stringify(t)); } catch (e) {} } });
Controls.init();
restore();
if (!('ImageDecoder' in window)) toast('This browser has no ImageDecoder — use desktop Chrome');
restartLoop();