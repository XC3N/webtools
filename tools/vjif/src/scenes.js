// ---------- scenes ----------
// A set holds N_SCENES scenes; a scene is its 18 pads (each a GIF instance with its own settings) plus what the 4 layers hold.
// The live `layers` and pad instances are the current scene; the others wait in `scenes` (null = empty). GIF files (the pool) belong to the set.
const N_SCENES = 9;
const scenes = Array(N_SCENES).fill(null);
const sceneIds = Array.from({ length: N_SCENES }, (_, i) => i);   // which scene sits at each number (swapped with the scenes)
let sceneIdx = 0, pendingScene = null, liveThumb = null, liveName = '';   // liveName: the current scene's name
const emptyLayer = () => ({ on: true, opacity: 1, blend: 'source-over', clips: [], sel: null, fillOn: false, fill: '#1e2a3a', tr: 'cut' });
const emptyScene = () => ({ layers: [0, 1, 2, 3].map(i => Object.assign(emptyLayer(), { i })), pads: pads.map(() => null), thumb: null });
function sceneThumb(){
  if (!layers.some(L => L.clips.length)) return null;
  // the scene itself, drawn apart from the output (no screen or layer effects, transition, blackout or freeze), straight at tile size
  const c = document.createElement('canvas'); c.width = 96; c.height = 54; const x = c.getContext('2d'), k = Math.min(96 / W, 54 / H);
  x.imageSmoothingQuality = 'high'; x.fillStyle = '#000'; x.fillRect(0, 0, 96, 54);
  const xf = [k, 0, 0, k, (96 - W * k) / 2, (54 - H * k) / 2];   // other formats letterboxed
  x.setTransform(...xf); x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
  render(frameList(performance.now()), x, null, NO_LAYER_FX, 0, xf); x.restore();
  return c.toDataURL('image/jpeg', 0.7);
}
// a layer's settings and clip list (the clips themselves are shared, not copied)
const layerProps = L => ({ on: L.on, opacity: L.opacity, blend: L.blend, clips: L.clips.slice(), sel: L.sel, fillOn: !!L.fillOn, fill: L.fill || '#1e2a3a', tr: L.tr || 'cut' });
const layerState = L => ({ i: L.i, ...layerProps(L) });
// the tile keeps the live picture made in the last second (drawing a new one here would stall the scene change);
// with the control window hidden that picture isn't refreshed, so then it's drawn
const captureScene = () => ({ layers: layers.map(layerState), pads: pads.map(p => p.gif), thumb: layers.some(L => L.clips.length) ? (!document.hidden && liveThumb) || sceneThumb() : null, name: liveName, pick: { pad: selPad, target } });
function gotoScene(i, beat = clock.beat, instant = false){
  if (i === sceneIdx) return;
  if (hist.ready) commit();                          // an edit still waiting for its undo step gets it now, in its own scene
  // keep what's on screen for the transition (its clips keep playing while it fades / slides out)
  // changing again mid-transition: the new one starts from what's on screen right now (a still of it), so nothing jumps
  let still = null;
  if (!instant && trans && transProgress() < 1 && transCfg.type !== 'cut'){ still = stillOf(); }
  endTrans(); if (!instant){ trans = makeTrans(layers.map(layerState), pads.map(p => p.gif), beat); if (trans && still) trans.still = still; }
  const left = pads.map(p => p.gif); scenes[sceneIdx] = captureScene(); sceneIdx = i;
  const sc = scenes[i], t0 = beatTime(beat);
  layers.forEach((L, li) => {
    const s = sc ? sc.layers[li] : emptyLayer();
    Object.assign(L, layerProps(s));
    L.clips.forEach(c => { c.startBeat = beat; c.startTime = t0; c.env = null; });   // the scene starts from the top
  });
  pads.forEach((p, k) => { p.gif = sc ? sc.pads[k] : null; renderPad(k); });   // each scene has its own pads (a new one starts empty)
  if (!trans) dropFxCache(left);                     // (with a transition: when it ends)
  scenes[i] = null; liveThumb = sc && sc.thumb; thumbKeep = liveThumb; liveName = sc && sc.name || '';
  pending.clear(); pads.forEach(p => p.el.classList.remove('wait'));
  // what's selected: as you left this scene; else the edit layer stays and the GIF panel shows that layer's selected GIF
  if (sc && sc.pick){ target = sc.pick.target; selPad = sc.pick.pad; }
  else { const c = selClip(); if (c) selPad = c.pad; }
  selectPad(selPad, true); uiLater(UI.LAYERS | UI.XF | UI.SCENES | UI.POOL); redraw.all = true;
  if (hist.ready) hist.cur = histState();             // switching isn't an undo step
}
// key 1–9 / click: with Snap, waits for the next beat / bar like a pad (a hit just after one counts as on it)
function sceneKey(i){
  if (brb.on) brbStop();                             // you're back: a scene key takes control again
  if (i === sceneIdx){ pendingScene = null; renderScenes(); return; }
  if (prep) return gotoScene(i, clock.beat, true);   // preparing: just open that scene (the output doesn't change)
  const at = snapBeat(clock.beat);
  if (at <= clock.beat) return gotoScene(i, at);
  pendingScene = { i, beat: at }; renderScenes();
}
const sceneCount = i => (i === sceneIdx ? layers : scenes[i] ? scenes[i].layers : []).reduce((a, l) => a + l.clips.length, 0);
const scenePads = i => (i === sceneIdx ? pads.map(p => p.gif) : scenes[i] ? scenes[i].pads : []).filter(Boolean).length;
function renderScenes(){
  const box = $('#scenes');
  if (!box.children.length) box.innerHTML = Array.from({ length: N_SCENES }, (_, i) => `<button class="scene" data-i="${i}" style="order:${(2 - Math.floor(i / 3)) * 3 + i % 3}" draggable="true"><span class="k">${i + 1}</span><span class="nm"></span><span class="n"></span></button>`).join('');   // laid out like the numpad
  [...box.children].forEach((b, i) => {
    const n = sceneCount(i), np = scenePads(i), th = i === sceneIdx ? liveThumb : scenes[i] && scenes[i].thumb;
    b.classList.toggle('cur', i === sceneIdx); b.classList.toggle('onair', !!prep && i === prep.scene); b.classList.toggle('wait', !!pendingScene && pendingScene.i === i); b.classList.toggle('empty', !n);
    const pg = !n && np ? (i === sceneIdx ? pads.map(p => p.gif) : scenes[i].pads).find(Boolean) : null;   // pads loaded but nothing playing: show the first GIF, dimmed
    const bg = n && th ? `url(${th})` : pg ? `url(${gifTile(pg)})` : ''; if (b._bg !== bg){ b._bg = bg; b.style.backgroundImage = bg; }   // (the browser rewrites url(...) with quotes: comparing with it never matched)
    b.classList.toggle('padsOnly', !!pg);
    b.querySelector('.n').textContent = n ? `${n} GIF${n > 1 ? 's' : ''}` : np ? `${np} pad${np > 1 ? 's' : ''}` : 'empty';
    const nm = sceneName(i), ne = b.querySelector('.nm'); if (ne.textContent !== nm) ne.textContent = nm;
    b.title = `Scene ${i + 1}${nm ? ' — ' + nm : ''} (numpad ${i + 1}) · right-click to name it · drag onto another scene to swap them`;
  });
}
$('#scenes').addEventListener('click', e => { if (e.target.closest('.nmEdit')) return; const b = e.target.closest('.scene'); if (!b) return; isDel(e) ? emptySceneAt(+b.dataset.i) : sceneKey(+b.dataset.i); });   // Ctrl+click: empty it
// ---- BRB: scene changes by themselves every few bars, on the bar, while you step away ----
const brb = (() => { const s = Prefs.json('vjif-brb', {});
  return { on: false, next: 0, bars: [4, 8, 16, 32].includes(s.bars) ? s.bars : 8, scn: s.scn === 'rand' ? 'rand' : 'order', tr: s.tr === 'rand' ? 'rand' : 'armed', lastTr: -1 }; })();
const brbSave = () => Prefs.setJson('vjif-brb', { bars: brb.bars, scn: brb.scn, tr: brb.tr });
const brbFirst = () => (Math.floor(clock.beat / 4 + 1e-9) + 1) * 4 + (brb.bars - 1) * 4;   // counted from the next bar
function brbStart(){ brb.on = true; brb.next = brbFirst(); brbUI(); }
function brbStop(){ brb.on = false; brbUI(); }
// scenes it can go to: those with GIFs playing, other than the current one
const brbChoices = () => Array.from({ length: N_SCENES }, (_, i) => i).filter(i => i !== sceneIdx && sceneCount(i) > 0);
function brbPick(){
  const c = brbChoices(); if (!c.length) return -1;
  if (brb.scn === 'rand') return c[Math.floor(Math.random() * c.length)];
  // in order = the numpad's reading order: 7 8 9, 4 5 6, 1 2 3
  const ord = Array.from({ length: N_SCENES }, (_, k) => k).sort((a, b) => (Math.floor(b / 3) - Math.floor(a / 3)) || (a % 3 - b % 3)), at = ord.indexOf(sceneIdx);
  for (let k = 1; k <= N_SCENES; k++){ const i = ord[(at + k) % N_SCENES]; if (c.includes(i)) return i; }
  return -1;
}
function brbTick(){
  const b = clock.beat;
  if (b < brb.next - brb.bars * 4 - 4) brb.next = brbFirst();   // the beat count jumped back (Sync, MIDI Start): count again
  if (prep || b < brb.next - 1e-9) return;           // Prep holds the output still: BRB waits for go-live
  const at = brb.next; while (brb.next <= b + 1e-9) brb.next += brb.bars * 4;   // after a long Prep hold / a jump: one change, then back on the grid (not one per tick)
  const i = brbPick(); if (i < 0) return;            // nothing else to play: stay
  if (brb.tr === 'rand'){                            // a random preset (not the same twice in a row), without re-arming it
    const all = trPresets.map((_, k) => k).filter(k => k !== brb.lastTr && trPresets[k].type !== 'cut');
    const k = all.length ? all[Math.floor(Math.random() * all.length)] : trSel; brb.lastTr = k;
    const keep = transCfg; transCfg = trPresets[k]; try { gotoScene(i, at); } finally { transCfg = keep; }
  } else gotoScene(i, at);
}
// called every 100 ms while BRB runs: the elements are kept, and touched only when what they show changes
const brbEl = { led: $('#brbLed'), btn: $('#brbBtn'), txt: $('#brbTxt'), segs: ['#brbBars', '#brbScn', '#brbTr'].map(q => [...document.querySelectorAll(q + ' button')]), shown: '' };
function brbUI(){
  const left = brb.on ? Math.max(1, Math.ceil((brb.next - clock.beat) / 4 - 1e-9)) : 0, E = brbEl;
  const sig = `${brb.on}|${left}|${brb.bars}|${brb.scn}|${brb.tr}`; if (sig === E.shown) return; E.shown = sig;
  E.led.classList.toggle('on', brb.on); E.led.classList.toggle('wait', brb.on && left <= 1);
  E.btn.classList.toggle('on', brb.on);
  E.txt.textContent = brb.on ? `${left} bar${left > 1 ? 's' : ''}` : 'BRB';
  [brb.bars, brb.scn, brb.tr].forEach((v, k) => E.segs[k].forEach(x => x.classList.toggle('on', x.dataset.v === String(v))));
}
$('#brbBtn').addEventListener('click', () => brb.on ? brbStop() : brbStart());
$('#brbCfg').addEventListener('click', e => { e.stopPropagation(); $('#brbPop').hidden = !$('#brbPop').hidden; });
document.addEventListener('pointerdown', e => { if (!$('#brbPop').hidden && !e.target.closest('#brbWrap')) $('#brbPop').hidden = true; });
[['#brbBars', v => { brb.bars = +v; if (brb.on) brb.next = brbFirst(); }], ['#brbScn', v => { brb.scn = v; }], ['#brbTr', v => { brb.tr = v; }]].forEach(([q, f]) =>
  onSeg($(q), (b, e) => { f(b.dataset.v); brbSave(); brbUI(); }));
brbUI();
// scene names: right-click a tile to type one (a click would go to the scene) (Enter or clicking away keeps it, Esc cancels, empty = no name)
const sceneName = i => i === sceneIdx ? liveName : scenes[i] && scenes[i].name || '';
function setSceneName(i, name){
  name = name.trim().slice(0, 40);
  if (i === sceneIdx) liveName = name;
  else { if (!scenes[i]) scenes[i] = emptyScene(); scenes[i].name = name; }
  renderScenes();
}
$('#scenes').addEventListener('contextmenu', e => {
  const b = e.target.closest('.scene'); if (!b) return; e.preventDefault(); if (b.querySelector('.nmEdit')) return;
  if (e.ctrlKey) return emptySceneAt(+b.dataset.i);   // a Mac's Ctrl+click arrives as a right-click
  const i = +b.dataset.i, inp = document.createElement('input');
  inp.className = 'nmEdit'; inp.value = sceneName(i); inp.placeholder = `Scene ${i + 1}`; inp.spellcheck = false; b.draggable = false;
  b.appendChild(inp); inp.focus(); inp.select();
  let done = false;
  const end = keep => { if (done) return; done = true; if (keep) setSceneName(i, inp.value); inp.remove(); b.draggable = true; };
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') end(true); else if (ev.key === 'Escape') end(false); });
  inp.addEventListener('blur', () => end(true));
});
// drag a scene onto another: they swap places (the playing one keeps playing, under its new number); hold Ctrl (⌘)
// while dragging to copy it instead, onto an empty scene (the empty ones show a +)
const SCENE_MIME = 'application/x-vjif-scene';
$('#scenes').addEventListener('dragstart', e => { const b = e.target.closest('.scene'); if (!b) return; e.dataTransfer.setData(SCENE_MIME, b.dataset.i); e.dataTransfer.effectAllowed = 'copyMove';
  e.dataTransfer.setDragImage(NO_IMG, 0, 0);
  const g = document.createElement('span'); g.className = 'chip scghost'; g.innerHTML = `<span>${+b.dataset.i + 1}</span>`; g.style.backgroundImage = b.style.backgroundImage;
  ghost.show(g, e.clientX, e.clientY); });
$('#scenes').addEventListener('dragover', e => {
  if (!e.dataTransfer.types.includes(SCENE_MIME)) return;
  e.preventDefault(); e.stopPropagation(); const cp = isDel(e); e.dataTransfer.dropEffect = cp ? 'copy' : 'move'; $('#scenes').classList.toggle('copying', cp);
  const b = e.target.closest('.scene'); document.querySelectorAll('#scenes .scene').forEach(x => x.classList.toggle('drop', x === b && (!cp || x.classList.contains('empty'))));
});
$('#scenes').addEventListener('dragleave', e => { if (!$('#scenes').contains(e.relatedTarget)){ document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop')); $('#scenes').classList.remove('copying'); } });
$('#scenes').addEventListener('drop', e => {
  if (!e.dataTransfer.types.includes(SCENE_MIME)) return;
  e.preventDefault(); e.stopPropagation(); document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop')); $('#scenes').classList.remove('copying');
  const b = e.target.closest('.scene'); if (!b) return;
  const a = +e.dataTransfer.getData(SCENE_MIME), t = +b.dataset.i;
  if (isDel(e)){ if (a === t) return; if (!sceneCount(a) && !scenePads(a)) return toast('That scene is empty: nothing to copy'); if (sceneCount(t) || scenePads(t)) return toast('Ctrl+drag onto an empty scene to copy'); scenes[t] = sceneCopy(a); renderScenes(); toast2(`Scene ${a + 1} copied to ${t + 1}`); return; }
  swapScenes(a, t);
});
$('#scenes').addEventListener('dragend', () => { document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop')); $('#scenes').classList.remove('copying'); });
function swapScenes(a, b){
  if (a === b || !(a >= 0 && b >= 0)) return;
  const map = i => i === a ? b : i === b ? a : i;
  if (a === sceneIdx || b === sceneIdx){                  // the live scene just changes number
    const other = a === sceneIdx ? b : a;
    scenes[sceneIdx] = scenes[other]; scenes[other] = null; sceneIdx = other;
  } else [scenes[a], scenes[b]] = [scenes[b], scenes[a]];
  pendingScene = null; [sceneIds[a], sceneIds[b]] = [sceneIds[b], sceneIds[a]]; if (prep) prep.scene = map(prep.scene);
  // (undo steps name their scene by its id, which moved with it)
  renderScenes(); toast2(`Scenes ${a + 1} and ${b + 1} swapped`);
}
function syncTransUI(){
  if (!$('#trType').children.length){ $('#trType').innerHTML = TR_TYPES.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join(''); $('#trLen').max = TR_LENS.length - 1; $('#trPx').max = TR_PX.length - 1; }
  const T = transCfg, cut = T.type === 'cut';
  $('#trPre').innerHTML = trPresets.map((P, k) => `<button data-v="${k}" class="${k === trSel ? 'on' : ''}" title="Key ${k + 1}: ${trLabel(P)}${P.type === 'cut' ? '' : ' · ' + TR_LENS[optIdx(TR_LENS, P.len)][1]}">${k + 1}</button>`).join('');
  segSet('#trType', T.type); segSet('#trDir', T.dir); segSet('#trCurve', T.smooth ? 1 : 0);
  const sts = TR_STYLES[T.type] || [], stl = trStyleOf(T);
  $('#trStyle').innerHTML = sts.length ? sts.map(x => `<button data-v="${x[0]}" class="${x[0] === stl ? 'on' : ''}" title="${x[2]}">${x[1]}</button>`).join('') : '<button disabled>—</button>';
  $('#trStyle').classList.toggle('wrap3', sts.length > 4);   // five styles: two rows, so none is squeezed out
  $('#trStyleRow').classList.toggle('dimmed', !sts.length);
  const pi = optIdx(TR_PX, T.px || 12); $('#trPx').value = pi; $('#trPx').nextElementSibling.textContent = TR_PX[pi][1];
  $('#trPxRow').classList.toggle('dimmed', !(T.type === 'dissolve' || T.type === 'glitch') || (T.type === 'glitch' && trStyleOf(T) === 'vhs'));   // VHS has no block size
  const i = optIdx(TR_LENS, T.len); $('#trLen').value = i; $('#trLen').nextElementSibling.textContent = TR_LENS[i][1];
  $('#trDirRow').classList.toggle('dimmed', !(T.type === 'slide' || (T.type === 'wipe' && stl === 'line')));
  $('#trLenRow').classList.toggle('dimmed', cut); $('#trCurveRow').classList.toggle('dimmed', cut || (T.type === 'glitch' && trStyleOf(T) === 'melt'));   // the melt keeps Doom's own timing
  $('#trTag').textContent = `${trSel + 1} · ` + (cut ? 'cut' : `${trLabel(T).toLowerCase()} · ${TR_LENS[i][1]}`);
}
onSeg($('#trPre'), (b, e) => { const k = +b.dataset.v;
  if (isDel(e)){ trPresets[k] = trDefaults()[k]; toast2(`Transition ${k + 1} back to its default`); } armTrans(k); });   // Ctrl+click: reset it
$('#trPre').addEventListener('contextmenu', e => { const b = e.target.closest('button'); if (!b || !e.ctrlKey) return; e.preventDefault(); const k = +b.dataset.v; trPresets[k] = trDefaults()[k]; toast2(`Transition ${k + 1} back to its default`); armTrans(k); });
onSeg($('#trType'), (b, e) => { transCfg.type = b.dataset.v; transCfg.style = trStyleOf(transCfg); syncTransUI(); });
onSeg($('#trStyle'), (b, e) => {
  transCfg.style = b.dataset.v; if (b.dataset.v === 'pixelate' && (transCfg.px || 12) < 32) transCfg.px = 48;   // pixelate wants big blocks
  syncTransUI(); });
onSeg($('#trDir'), (b, e) => { transCfg.dir = b.dataset.v; syncTransUI(); });
onSeg($('#trCurve'), (b, e) => { transCfg.smooth = b.dataset.v === '1'; syncTransUI(); });
$('#trLen').addEventListener('input', e => { transCfg.len = TR_LENS[+e.target.value][0]; syncTransUI(); });
$('#trPx').addEventListener('input', e => { transCfg.px = TR_PX[+e.target.value][0]; syncTransUI(); });
// a stored copy of scene i (the live one or a stored one): its own copy of every pad's settings, new clip ids, same placement
function sceneCopy(i){
  const live = i === sceneIdx, sc = live ? null : scenes[i];
  if (!live && !sc) return emptyScene();             // never opened: a copy of nothing is an empty scene (not a shell without layers)
  const P = live ? pads.map(p => p.gif) : (sc && sc.pads) || [], Ls = live ? layers : (sc && sc.layers) || [];
  return { thumb: live ? sceneThumb() : sc && sc.thumb, name: live ? liveName : sc && sc.name, pads: P.map(g => g && cloneInst(g)),
    layers: Ls.map(L => { const clips = L.clips.map(c => Object.assign(newClip(c.pad), Object.fromEntries(XF_KEYS.map(k => [k, c[k]]))));
      return { i: L.i, on: L.on, opacity: L.opacity, blend: L.blend, clips, sel: clips[L.clips.indexOf(L.sel)] || null, fillOn: !!L.fillOn, fill: L.fill }; }) };
}
// copy the current scene into the next empty one (new clip ids, same placement) and go there
$('#scDup').addEventListener('click', () => {
  let t = -1; for (let k = 1; k < N_SCENES && t < 0; k++){ const i = (sceneIdx + k) % N_SCENES; if (!sceneCount(i) && !scenePads(i)) t = i; }
  if (t < 0) return toast('No empty scene to copy into — clear one first');
  scenes[t] = sceneCopy(sceneIdx);
  gotoScene(t, clock.beat, !!prep); toast2(`Copied to scene ${t + 1}`);
});
// ---- screen effect pads + editor ----
const NP_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2];           // preset tiles laid out like the numpad (7 8 9 on top)
function fxTileHTML(i, key){ return `<div class="fxp" data-i="${i}"><span class="lv"></span><span class="hd"><span class="k">${key}</span><span class="md"></span></span><span class="t"><span class="n"></span><span class="s"></span></span></div>`; }
// Filling presets: drag an effect tile onto a preset tile, or hold a preset (Caps Lock + its numpad key) and
// click / press effects — each one toggles in or out of that preset. The preset editor lists them with ×.
let heldPre = -1, fxDrag = null;
const fxEntry = i => ({ amt: fxCfg[i].amt, rate: fxCfg[i].rate, style: fxCfg[i].style, target: fxCfg[i].target, size: fxCfg[i].size, pal: fxCfg[i].pal || 0, kz: fxCfg[i].kz || 1, fbk: fxCfg[i].fbk ?? 0.7, vdrop: fxCfg[i].vdrop ?? 1, dith: fxCfg[i].dith || 0, dpat: fxCfg[i].dpat ?? 0 });   // an effect as a preset holds it
function togglePreFx(k, i){
  const P = fxPre[k];
  if (P.fx[i]) delete P.fx[i]; else P.fx[i] = fxEntry(i);
  syncFxUI(); toast2(`${FXP_LABELS[k]}: ${fxPreName(P)}`);
}
// dragging a preset tile onto another: they swap; Ctrl (⌘) held at the drop: a copy, onto an empty preset only
const preEmpty = k => !Object.keys(fxPre[k].fx).length;
function fxDropMark(cp){
  const d = fxDrag; if (!d || !d.moved) return; const pre = d.i >= NFX; d.copy = pre && cp; document.body.classList.toggle('precopy', d.copy);
  const t = d.lastE && document.elementFromPoint(d.lastE.clientX, d.lastE.clientY), o = t && t.closest('#fxPre .fxp');
  document.querySelectorAll('#fxPre .fxp').forEach(x => x.classList.toggle('drop', x === o && (!pre || (+x.dataset.i !== d.i && (!d.copy || preEmpty(+x.dataset.i - NFX))))));
}
addEventListener('keydown', e => { if (fxDrag && DEL_KEYS.includes(e.key)) fxDropMark(true); });
addEventListener('keyup', e => { if (fxDrag && DEL_KEYS.includes(e.key)) fxDropMark(false); });
function movePre(a, b, copy){
  if (copy){ if (!preEmpty(b)) return toast('Ctrl+drag onto an empty preset to copy'); fxPre[b] = JSON.parse(JSON.stringify(fxPre[a])); toast2(`Preset ${a + 1} copied to ${b + 1}`); }
  else { [fxPre[a], fxPre[b]] = [fxPre[b], fxPre[a]]; toast2(`Presets ${a + 1} and ${b + 1} swapped`); }
  selFx = NFX + b; syncFxUI();
}
function addPreFx(k, i){ fxPre[k].fx[i] = fxEntry(i); selFx = NFX + k; syncFxUI(); toast2(`${FXP_LABELS[k]}: ${fxPreName(fxPre[k])}`); }
function fxGhost(i){ const el = document.createElement('span'); el.className = 'fxghost'; el.textContent = i < NFX ? FX_DEFS[i].name : 'Preset ' + (i - NFX + 1); ghost.show(el); }
function wireFxTile(el){
  const i = +el.dataset.i;
  el.addEventListener('pointerdown', e => {
    if (e.button) return;
    if (isDel(e) && heldPre < 0){ el._edit = true;                        // Ctrl+click: reset an effect / empty a preset
      if (i < NFX){ fxUp(i); fxCfg[i] = fxDefaults()[i]; toast2(`${FX_DEFS[i].name} back to its defaults`); }
      else { fxPre[i - NFX].fx = {}; toast2(`Preset ${i - NFX + 1} emptied`); }
      selFx = i; syncFxUI(); return; }
    if (i < NFX && heldPre >= 0){ togglePreFx(heldPre, i); el._edit = true; return; }     // a preset is held: this click edits it
    el.setPointerCapture(e.pointerId); fxDown(i);
    fxDrag = { i, x: e.clientX, y: e.clientY, moved: false }; if (i >= NFX) heldPre = i - NFX;   // holding a preset tile: F keys edit it; dragging it moves / copies it
  });
  el.addEventListener('pointermove', e => {
    if (!fxDrag || fxDrag.i !== i) return;
    if (!fxDrag.moved && Math.hypot(e.clientX - fxDrag.x, e.clientY - fxDrag.y) > 6){ fxDrag.moved = true; fxUp(i); if (i >= NFX) heldPre = -1; document.body.classList.add('fxdragging'); fxGhost(i); }
    if (fxDrag.moved){ ghost.move(e.clientX, e.clientY); fxDrag.lastE = e; fxDropMark(isDel(e)); }
  });
  const end = e => {
    if (el._edit){ el._edit = false; return; }       // that click edited a preset: nothing was started
    fxUp(i); if (i >= NFX && heldPre === i - NFX) heldPre = -1;
    if (fxDrag && fxDrag.i === i && fxDrag.moved){
      const t = document.elementFromPoint(e.clientX, e.clientY), d = t && t.closest('#fxPre .fxp'), cp = fxDrag.copy;
      if (d && i < NFX) addPreFx(+d.dataset.i - NFX, i);
      else if (d && +d.dataset.i !== i) movePre(i - NFX, +d.dataset.i - NFX, cp);
      document.querySelectorAll('#fxPre .fxp').forEach(x => x.classList.remove('drop')); document.body.classList.remove('fxdragging', 'precopy');
    }
    if (fxDrag && fxDrag.moved) ghost.hide();
    fxDrag = null;
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('contextmenu', e => { e.preventDefault(); selectFx(i); });
}
// the effect's name chip in the editor drags too (closer to the presets than its tile)
{
  const chip = $('#fxName'); let d = null;
  const over = e => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && t.closest('#fxPre .fxp'); };
  chip.addEventListener('pointerdown', e => { if (e.button || selFx >= NFX) return; chip.setPointerCapture(e.pointerId); d = { i: selFx, x: e.clientX, y: e.clientY, moved: false }; });
  chip.addEventListener('pointermove', e => {
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4){ d.moved = true; document.body.classList.add('fxdragging'); fxGhost(d.i); }
    if (d.moved){ ghost.move(e.clientX, e.clientY); const o = over(e); document.querySelectorAll('#fxPre .fxp').forEach(x => x.classList.toggle('drop', x === o)); }
  });
  const end = e => { if (!d) return; if (d.moved){ const o = over(e); if (o) addPreFx(+o.dataset.i - NFX, d.i); }
    document.querySelectorAll('#fxPre .fxp').forEach(x => x.classList.remove('drop')); document.body.classList.remove('fxdragging'); if (d.moved) ghost.hide(); d = null; };
  chip.addEventListener('pointerup', end); chip.addEventListener('pointercancel', end);
}
let fxTiles = [], fxFitGen = 0;                      // the effect / preset tiles; fxFitGen: bumped when names must be measured again
function buildFx(){
  $('#fxPads').innerHTML = FX_DEFS.map((d, i) => fxTileHTML(i, FX_LABELS[i])).join('');
  $('#fxPre').innerHTML = NP_ORDER.map(k => fxTileHTML(NFX + k, k + 1)).join('');
  fxTiles = [...document.querySelectorAll('#fxStrip .fxp')]; fxTiles.forEach(wireFxTile);
  $('#fxRate').max = FX_RATES.length - 1; $('#fxSize').max = FX_SIZES.length - 1;
  document.querySelectorAll('#fxTgt button').forEach(b => { if (b.dataset.v !== 'out') b.style.setProperty('--lc', LCOL[+b.dataset.v]); });
}
const fxPreName = P => { const ks = Object.keys(P.fx); return ks.length ? ks.map(i => FX_DEFS[i].name).join(' + ') : 'empty'; };
// short names, for when the full one doesn't fit on a pad
const FX_SHORT = { mono: 'MN', colour: 'CLR', strobe: 'STRB', poster: 'PSTR', zoom: 'ZM', shake: 'SHK', wobble: 'WBL', mirror: 'MIR', glitch: 'GLT', rgb: 'CRT', pixel: 'PIX', feedback: 'FDBK' };
// the full text, else the short one, else (for style names) its first letters: whichever fits first
function fitText(el, full, short, tiny){ el.textContent = full; for (const t of [short, tiny]) if (t && el.scrollWidth > el.clientWidth + 1) el.textContent = t; }
const fxPreLong = P => { const ks = Object.keys(P.fx); return ks.length ? ks.map(i => `${FX_DEFS[i].name} (${styleLabel(i, P.fx[i].style)}, ${Math.round(P.fx[i].amt * 100)}%)`).join(' + ') : 'empty'; };
// store the effects that are on right now (from their own keys) into preset slot k
function storeFxPre(k){
  const b = clock.beat, fx = {};
  FX_DEFS.forEach((d, i) => { if (fxLevel(i, b) > 0.05) fx[i] = fxEntry(i); });
  if (!Object.keys(fx).length) return toast('Nothing to store — switch on the effects you want first (hold their F keys, or set them to Latch), then store');
  fxPre[k].fx = fx; selFx = NFX + k; syncFxUI(); toast2(`${FXP_LABELS[k]}: ${fxPreName(fxPre[k])}`);
}
const fxPadLv = [];
function paintFxPads(b){
  fxTiles.forEach(el => { const i = +el.dataset.i;
    const v = Math.round(fxLevel(i, b) * 100); if (fxPadLv[i] === v) return; fxPadLv[i] = v;
    el.firstChild.style.height = v + '%'; el.classList.toggle('on', v > 50);
  });
}
let preEd = null, preEdOf = -1;                      // an effect inside the selected preset being edited (its index), or null
function syncFxUI(){
  if (selFx !== preEdOf){ preEd = null; preEdOf = selFx; }
  const pre = selFx >= NFX, C = fxConf(selFx);
  if (pre && preEd != null && !C.fx[preEd]) preEd = null;
  const E = pre && preEd != null ? C.fx[preEd] : null, d = pre ? (E ? FX_DEFS[preEd] : null) : FX_DEFS[selFx];
  fxTiles.forEach(el => {
    const i = +el.dataset.i, c = fxConf(i);
    if (el.classList.contains('sel') !== (i === selFx)) el.classList.toggle('sel', i === selFx);
    // names are measured (forces a layout) only when what the tile shows changed: pressing an effect key just moves the highlight
    const sig = i < NFX ? `${c.mode}|${c.target}|${c.style}|${fxFitGen}` : `${c.mode}|${JSON.stringify(fxPre[i - NFX].fx)}|${fxFitGen}`;
    if (el._sig === sig) return; el._sig = sig;
    el.querySelector('.md').textContent = (i < NFX && tgtLabel(c.target) ? tgtLabel(c.target) + ' ' : '') + c.mode;
    if (i < NFX){ const D = FX_DEFS[i], st = D.styles[styleIdx(i, c.style)];
      fitText(el.querySelector('.n'), D.name, FX_SHORT[D.id]); const many = styleParts(i, c.style).length > 1; fitText(el.querySelector('.s'), D.styles.length > 1 ? (many ? styleLabel(i, c.style) : st[1]) : '', many ? styleLabel(i, c.style, true) : STYLE_SHORT[st[0]], D.styles.length > 1 && st[1].length > 4 ? (many ? styleParts(i, c.style).length + ' styles' : st[1].slice(0, 3) + '.') : null);
      el.title = `${D.name} — ${st[2]} (${FX_LABELS[i]} · Shift+${FX_LABELS[i]} or right-click: edit)`; }
    else { const k = i - NFX, P = fxPre[k], e = !Object.keys(P.fx).length;
      if (e){ el.querySelector('.n').textContent = 'empty'; el.querySelector('.s').textContent = ''; }
      else { const ks = Object.keys(P.fx), nm = ks.map(i => FX_DEFS[i].name);   // two lines of names; short ones when they don't fit
        const n = el.querySelector('.n'), s2 = el.querySelector('.s'); fitText(n, nm.join(' + '), null);
        if (n.scrollWidth > n.clientWidth + 1){ const h = Math.ceil(ks.length / 2), sh = k => FX_SHORT[FX_DEFS[k].id];
          n.textContent = nm.slice(0, h).join(' + ') + ' +'; s2.textContent = nm.slice(h).join(' + ');
          if (n.scrollWidth > n.clientWidth + 1 || s2.scrollWidth > s2.clientWidth + 1){ n.textContent = ks.slice(0, h).map(sh).join('+') + (h < ks.length ? '+' : ''); s2.textContent = ks.slice(h).map(sh).join('+'); } }
        else s2.textContent = ''; }
      el.classList.toggle('empty', e);
      el.title = `${FXP_LABELS[k]} with Caps Lock: ${fxPreLong(P)} — Caps+Shift+${FXP_LABELS[k]} stores the effects that are on now · right-click: edit`; }
  });
  $('#fxEdit').classList.toggle('pre', pre); $('#fxEdit').classList.toggle('ent', !!E); $('#fxEdit').classList.toggle('sized', !!d && !!d.size); $('#fxEdit').classList.toggle('rated', !!d && !!d.rate);
  $('#fxName').textContent = E ? d.name : pre ? FXP_LABELS[selFx - NFX] : d.name;
  $('#fxName').title = E ? `${d.name} as ${FXP_LABELS[selFx - NFX]} plays it — click to go back to the preset` : pre ? 'Effect preset' : `${d.title} — drag onto a preset to add it there`;
  $('#fxName').classList.toggle('grab', !pre); $('#fxName').classList.toggle('back', !!E);
  if (E){                                              // one effect of the preset: its own style, layer, amount, rate / size
    setHTML($('#fxStyle'), d.styles.map(s => `<button data-v="${s[0]}" title="${s[1]}: ${s[2]}${FX_MULTI[d.id] ? ' (right-click when on: its settings, without switching it off)' : ''}">${STYLE_BTN[s[0]] || s[1]}</button>`).join(''));
    styleSet(FX_DEFS.indexOf(d), E.style || d.styles[0][0]); $('#fxStyle').classList.toggle('dimmed', d.styles.length < 2);
    tgtSet(E.target);
  }
  else if (pre){
    const ks = Object.keys(C.fx);
    setHTML($('#fxPreList'), ks.length ? ks.map(i => `<span class="pchip" data-e="${i}" title="${FX_DEFS[i].name} · ${styleLabel(i, C.fx[i].style)} · ${Math.round(C.fx[i].amt * 100)}% — click to adjust it in this preset">${FX_DEFS[i].name}${tgtLabel(C.fx[i].target) ? ` <small>${tgtLabel(C.fx[i].target)}</small>` : ''}<button data-i="${i}" title="Take it out of this preset">×</button></span>`).join('')
      : '<span class="pempty">empty — drag effects here, or hold Caps + this numpad key and click them</span>');
  }
  else {
    setHTML($('#fxStyle'), d.styles.map(s => `<button data-v="${s[0]}" title="${s[1]}: ${s[2]}${FX_MULTI[d.id] ? ' (right-click when on: its settings, without switching it off)' : ''}">${STYLE_BTN[s[0]] || s[1]}</button>`).join(''));
    styleSet(FX_DEFS.indexOf(d), C.style); $('#fxStyle').classList.toggle('dimmed', d.styles.length < 2);
      // styles always in two even rows (CRT 4 + 3, Strobe 1 + 1): the editor keeps the same height for every effect
    tgtSet(C.target);
  }
  segSet('#fxMode', C.mode);
  const A = E || C, am = $('#fxAmt'), dd = E ? FX_DEFS[preEd] : selFx < NFX ? FX_DEFS[selFx] : null;
  const palAmt = !!dd && dd.id === 'colour' && (A.style || dd.styles[0][0]) === 'pal';   // Colour › Palette: the Amount slider picks the palette
  const kal = !!dd && dd.id === 'mirror' && (A.style || dd.styles[0][0]) === 'kal';        // Mirror › Kaleido: it sets the number of slices
  const wear = !!dd && dd.id === 'rgb' && styleParts(9, A.style).includes('vhs') && (styleParts(9, A.style).length === 1 || fxFocus.rgb === 'vhs');   // CRT › VHS (alone, or in focus in a stack): Amount is how worn the tape is
  am.closest('.field').querySelector('label').textContent = palAmt ? 'Palette' : kal ? 'Slices' : wear ? 'Wear' : 'Amount'; am.dataset.palAmt = palAmt ? '1' : ''; am.dataset.kal = kal ? '1' : '';
  if (palAmt){ const pi = A.pal || 0; Object.assign(am, { min: 0, max: FX_PALS.length - 1, step: 1 }); am.value = pi; am.dataset.def = 0; delete am.dataset.pct;
    am.nextElementSibling.textContent = FX_PALS[pi].n; am.closest('.field').title = 'Palette: ' + FX_PALS[pi].t; }
  else if (kal){ const n = kalSlices(A.amt); Object.assign(am, { min: 3, max: 12, step: 1 }); am.value = n; am.dataset.def = 12; delete am.dataset.pct;
    am.nextElementSibling.textContent = n; am.closest('.field').title = 'Slices: how many wedges the kaleidoscope has'; }
  else { Object.assign(am, { min: 0.05, max: 1, step: 0.01 }); am.value = A.amt; am.dataset.def = 1; am.dataset.pct = ''; am.nextElementSibling.textContent = Math.round(A.amt * 100) + '%'; am.closest('.field').title = wear ? 'Wear: how worn the tape is (tracking, colour bleed, dropouts, noise)' : 'Amount: how strong'; }
  drawFxEnv(); syncEnvSl();
  if (!pre || E){
    const C = E || fxConf(selFx), di = E ? preEd : selFx;
    const alt = rateAlt(d, C.style || d.styles[0][0]); $('#fxRateRow').classList.toggle('altrow', !!alt);
    $('#fxRateRow label').textContent = alt ? alt.label : 'Rate';
    if (alt){ const L = alt.list, ai = optIdx(L, alt.get ? alt.get(C) : C[alt.key] ?? alt.def); $('#fxRate').max = L.length - 1; $('#fxRate').value = ai; $('#fxRate').nextElementSibling.textContent = L[ai][1]; $('#fxRate').dataset.def = optIdx(L, alt.def);
      $('#fxRateRow').title = alt.title(ai); $('#fxRateRow').classList.remove('dimmed'); }
    else { $('#fxRate').max = FX_RATES.length - 1; $('#fxRateRow').title = 'Rate: how fast it moves (beats)';
    const ri = optIdx(FX_RATES, C.rate); $('#fxRate').value = ri; $('#fxRate').nextElementSibling.textContent = FX_RATES[ri][1];
    $('#fxRateRow').classList.toggle('dimmed', !d.rate); $('#fxRate').dataset.def = optIdx(FX_RATES, fxDefaults()[di].rate); }
    const za = sizeAlt(d, C.style || d.styles[0][0]); $('#fxSizeRow label').textContent = za ? za.label : 'Size';
    if (za){ const L = za.list, ai = optIdx(L, C[za.key] ?? za.def); $('#fxSize').max = L.length - 1; $('#fxSize').value = ai; $('#fxSize').nextElementSibling.textContent = L[ai][1];
      $('#fxSize').dataset.def = optIdx(L, za.def); $('#fxSizeRow').title = za.title(); $('#fxSizeRow').classList.remove('dimmed'); }
    else { $('#fxSize').max = FX_SIZES.length - 1; $('#fxSizeRow').title = 'Size: the pixel block size at full amount';
    const zi = optIdx(FX_SIZES, C.size || d.sizeDef || 64); $('#fxSize').value = zi; $('#fxSize').nextElementSibling.textContent = FX_SIZES[zi][1];
    $('#fxSize').dataset.def = optIdx(FX_SIZES, d.sizeDef || 64);
    $('#fxSizeRow').classList.toggle('dimmed', !!d.sizeFor && !styleParts(di, C.style).some(p => d.sizeFor.includes(p))); }
  }
}
// effect names refit (full or short) when the window changes, and are measured again once the fonts are in
let fxFitT = 0; addEventListener('resize', () => { clearTimeout(fxFitT); fxFitT = setTimeout(() => { fxFitGen++; syncFxUI(); }, 150); });
if (document.fonts) document.fonts.ready.then(() => setTimeout(() => { fxFitGen++; syncFxUI(); }, 50));
onSeg($('#fxMode'), (b, e) => {
  const S = fxSt[selFx], C = fxConf(selFx), now = clock.beat, playing = fxLevel(selFx, now) > 0.001, v = b.dataset.v;
  const ad = (C.att || 0) + (C.dec || 0);
  S.held = false; S.on = false; S.b0 = -1e9; C.mode = v;
  if (v === 'latch'){ S.on = true; S.t0 = now - ad - 1e-6; }               // Latch starts on, straight at Sustain (no Attack: it was a mode change, not a hit)
  else if (playing){                                                       // Hold / Hit: what was playing fades out over Release
    if (v === 'hit') S.b0 = now - ad - (C.len || 0) - 1e-6; else { S.t0 = now - ad - 1e-6; S.rel = now; } }
  syncFxUI(); });
const fxEd = () => selFx < NFX ? fxCfg[selFx] : preEd != null ? fxPre[selFx - NFX].fx[preEd] : null;   // what the effect-level controls change
// target buttons: All = the whole output (alone); or a set of layers: a layer button takes its layer in or out (from All:
// just that one), right-click = that layer alone. Lit layer buttons take their layer's colour
const tgtSet = t => { const L = tgtList(t); $('#fxTgt').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === 'out' ? L[0] === 'out' : L.includes(+b.dataset.v))); };
onSeg($('#fxTgt'), (b, e) => { const X = fxEd(); if (X){ X.target = b.dataset.v === 'out' ? 'out' : tgtToggle(X.target, +b.dataset.v, false); syncFxUI(); } });
$('#fxTgt').addEventListener('contextmenu', e => { const b = e.target.closest('button'); if (!b || b.dataset.v === 'out') return; e.preventDefault(); const X = fxEd(); if (X){ X.target = +b.dataset.v; syncFxUI(); } });
const styleSet = (i, v) => { const P = styleParts(i, v), f = fxFocus[FX_DEFS[i].id], multi = FX_MULTI[FX_DEFS[i].id] && P.length > 1;
  $('#fxStyle').querySelectorAll('button').forEach(b => { b.classList.toggle('on', P.includes(b.dataset.v)); b.classList.toggle('focus', !!multi && b.dataset.v === f && P.includes(f)); }); };
onSeg($('#fxStyle'), (b, e) => { const X = fxEd(); if (!X) return; const i = selFx < NFX ? selFx : preEd, id = FX_DEFS[i].id;
  X.style = styleToggle(i, X.style || FX_DEFS[i].styles[0][0], b.dataset.v);
  if (FX_MULTI[id]) fxFocus[id] = styleParts(i, X.style).includes(b.dataset.v) ? b.dataset.v : undefined;   // switched on: its settings show
  syncFxUI(); });
$('#fxStyle').addEventListener('contextmenu', e => { const b = e.target.closest('button'), X = fxEd(); if (!b || !X) return; e.preventDefault();   // right-click: that style's settings, without switching it
  const i = selFx < NFX ? selFx : preEd, id = FX_DEFS[i].id; if (!FX_MULTI[id] || !styleParts(i, X.style).includes(b.dataset.v)) return; fxFocus[id] = b.dataset.v; syncFxUI(); });
$('#fxAmt').addEventListener('input', e => { const X = fxEd() || fxConf(selFx); if (e.target.dataset.palAmt) X.pal = +e.target.value; else if (e.target.dataset.kal) X.amt = kalAmt(+e.target.value); else X.amt = +e.target.value; syncFxUI(); });
$('#fxName').addEventListener('click', () => { if (preEd != null){ preEd = null; syncFxUI(); } });
// ---- the effect envelope editor: points dragged along fixed steps (like the sliders were), so it reads at a glance ----
const FX_ATTS = [[0, '0'], [0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars']];
const ENV_TIPS = { a: 'Attack: how long it takes to rise to full. Drag sideways · double-click: 0',
  d: 'Decay: how long it takes to fall to Sustain (sideways); Sustain: the level it rests at (up / down) · double-click: 0 and 100%',
  l: 'Gate (Hit only): how long it stays at Sustain, as if the key were held · double-click: 0',
  r: 'Release: the fade out after the Gate, or after letting go of Hold / switching off Latch · double-click: its default' };
const envZoom = new WeakMap();   // per envelope: how many steps the graph's width shows
const envGeo = (C, w, h, d) => {
  const ia = optIdx(FX_ATTS, C.att || 0), id = optIdx(FX_ATTS, C.dec || 0), il = optIdx(FX_LENS, C.len || 0), ir = optIdx(FX_RELS, C.rel ?? fxRelDef(C.mode));
  const hit = C.mode === 'hit', sus = C.sus ?? 1, base = 7 * d, n = ia + id + (hit ? il : 3) + ir;
  // the zoom only moves when it has to (the envelope outgrows it, or uses under half of it), so letting go of a point doesn't shift the graph
  let z = envZoom.get(C) || 0; if (!z || n + 2 > z || (n + 6 < z / 2 && z > 8)) envZoom.set(C, z = Math.max(8, n + 6));
  const u = fxEnvDrag && fxEnvDrag.u ? fxEnvDrag.u : (w - 7 * d - 4 * base - 4 * d) / z;
  const top = 7 * d, bot = h - 4 * d, ys = bot - (bot - top) * sus;   // clear of the top edge by as much as the start is from the left
  const x0 = 7 * d, xA = x0 + (ia ? base + ia * u : 0), xD = xA + base + id * u, xL = xD + (hit ? base + il * u : base + 6 * u * 0.5), xR = xL + base + ir * u;
  return { ia, id, il, ir, base, u, top, bot, ys, x0, xA, xD, xL, xR, hit, sus };
};
let fxEnvDrag = null, fxEnvHover = null;
function drawFxEnv(){
  const cv = $('#fxEnv'); if (!cv) return; const S = scopeCtx(cv); if (!S) return; const [x, w, h, d] = S;
  const C = fxEnvConf(); if (!C) return;
  const G = envGeo(C, w, h, d);
  x.fillStyle = `rgba(${TC.envRgb},.12)`; x.strokeStyle = TC.env; x.lineWidth = 1.5 * d;
  x.beginPath(); x.moveTo(G.x0, G.bot); x.lineTo(G.xA, G.top); x.lineTo(G.xD, G.ys); x.lineTo(G.xL, G.ys);
  if (G.hit){ for (let k = 1; k <= 12; k++){ const q = k / 12; x.lineTo(G.xL + (G.xR - G.xL) * q, G.bot - (G.bot - G.ys) * (1 - q) * (1 - q)); } }
  else x.lineTo(G.xR, G.bot);
  x.lineTo(G.x0, G.bot); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(G.x0, G.bot); x.lineTo(G.xA, G.top); x.lineTo(G.xD, G.ys);
  if (!G.hit){ x.stroke(); x.setLineDash([3 * d, 3 * d]); x.beginPath(); x.moveTo(G.xD, G.ys); x.lineTo(G.xL, G.ys); x.stroke(); x.setLineDash([]); x.beginPath(); x.moveTo(G.xL, G.ys); x.lineTo(G.xR, G.bot); }
  else { x.lineTo(G.xL, G.ys); for (let k = 1; k <= 12; k++){ const q = k / 12; x.lineTo(G.xL + (G.xR - G.xL) * q, G.bot - (G.bot - G.ys) * (1 - q) * (1 - q)); } }
  x.stroke();
  const pts = [['a', G.xA, G.top], ['d', G.xD, G.ys], ...(G.hit ? [['l', G.xL, G.ys]] : []), ['r', G.xR, G.bot]];
  for (const [k, px, py] of pts){ x.fillStyle = fxEnvDrag && fxEnvDrag.k === k ? '#fff' : TC.env; x.beginPath(); x.arc(px, py, 3.2 * d, 0, Math.PI * 2); x.fill(); }
  const lab = `A ${FX_ATTS[G.ia][1]} · D ${FX_ATTS[G.id][1]} · S ${Math.round(G.sus * 100)}%${G.hit ? ' · G ' + FX_LENS[G.il][1] : ''} · R ${FX_RELS[G.ir][1]}`;
  const k = fxEnvDrag ? fxEnvDrag.k : fxEnvHover;      // the value of the point under the pointer, next to it
  if (k){ const P = pts.find(p => p[0] === k); if (P){
    const t = k === 'a' ? `Attack ${FX_ATTS[G.ia][1]}` : k === 'd' ? `Decay ${FX_ATTS[G.id][1]} · Sustain ${Math.round(G.sus * 100)}%` : k === 'l' ? `Gate ${FX_LENS[G.il][1]}` : `Release ${FX_RELS[G.ir][1]}`;
    x.font = `600 ${10 * d}px ui-monospace, monospace`; const tw = x.measureText(t).width + 8 * d, tx = clamp(P[1] + 6 * d, 2 * d, w - tw - 2 * d), ty = 3 * d;
    x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(tx, ty, tw, 13 * d); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText(t, tx + 4 * d, ty + 10 * d); } }
  const tip = !k ? 'Drag a point · double-click: its default' : ENV_TIPS[k];   // the hovered point's own explanation
  if (cv.title !== tip) cv.title = tip;
  const lv = selFx < NFX || preEd == null ? fxLevel(selFx, clock.beat) : 0;   // where it is now
  if (lv > 0.001){ x.fillStyle = '#fff'; x.fillRect(w - 5 * d, G.bot - (G.bot - G.top) * lv, 3 * d, (G.bot - G.top) * lv); }
}
const fxEnvConf = () => fxConf(selFx);              // the envelope belongs to the effect / preset (not to one effect inside a preset)
$('#fxEnv').addEventListener('pointerdown', e => {
  const C = fxEnvConf(); if (!C) return; const cv = e.currentTarget, r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  const px = (e.clientX - r.left) / r.width * cv.width, py = (e.clientY - r.top) / r.height * cv.height, G = envGeo(C, cv.width, cv.height, d);
  const pts = [['a', G.xA, G.top], ['d', G.xD, G.ys], ...(G.hit ? [['l', G.xL, G.ys]] : []), ['r', G.xR, G.bot]];
  let best = null; for (const p of pts){ const dd = Math.abs(p[1] - px) + Math.abs(p[2] - py) * 0.3; if (!best || dd < best.dd) best = { k: p[0], dd }; }
  fxEnvDrag = { k: best.k, u: G.u }; cv.setPointerCapture(e.pointerId); envPrevStart(); fxEnvMove(e);
});
function fxEnvMove(e){
  if (!fxEnvDrag) return; const C = fxEnvConf(); if (!C) return; const cv = $('#fxEnv'), r = cv.getBoundingClientRect(), d = devicePixelRatio || 1;
  const px = (e.clientX - r.left) / r.width * cv.width, py = (e.clientY - r.top) / r.height * cv.height, G = envGeo(C, cv.width, cv.height, d);
  const idx = (from, n) => clamp(Math.round((px - from - G.base) / G.u), 0, n);
  if (fxEnvDrag.k === 'a') C.att = FX_ATTS[px - G.x0 < G.base / 2 ? 0 : idx(G.x0, FX_ATTS.length - 1)][0];
  else if (fxEnvDrag.k === 'd'){ C.dec = FX_ATTS[idx(G.xA, FX_ATTS.length - 1)][0]; C.sus = Math.round(clamp((G.bot - py) / (G.bot - G.top), 0, 1) * 20) / 20; }
  else if (fxEnvDrag.k === 'l') C.len = FX_LENS[idx(G.xD, FX_LENS.length - 1)][0];
  else C.rel = FX_RELS[idx(G.xL, FX_RELS.length - 1)][0];
  // the dragged point would leave the box: zoom out now (not on letting go), keeping the steps steady from here on
  const G2 = envGeo(C, cv.width, cv.height, d), xk = { a: G2.xA, d: G2.xD, l: G2.xL, r: G2.xR }[fxEnvDrag.k];
  if (G2.xR > cv.width - 6 * d || xk > cv.width - 6 * d){ fxEnvDrag.u = 0; envZoom.delete(C); fxEnvDrag.u = envGeo(C, cv.width, cv.height, d).u; }
  envPrevChanged(C); drawFxEnv(); paintFxPads(clock.beat);
}
$('#fxEnv').addEventListener('pointermove', e => { if (fxEnvDrag) return fxEnvMove(e);
  const C = fxEnvConf(); if (!C) return; const cv = e.currentTarget, r = cv.getBoundingClientRect(), d = devicePixelRatio || 1, px = (e.clientX - r.left) / r.width * cv.width, G = envGeo(C, cv.width, cv.height, d);
  const k = [['a', G.xA], ['d', G.xD], ...(G.hit ? [['l', G.xL]] : []), ['r', G.xR]].reduce((a, b) => Math.abs(b[1] - px) < Math.abs(a[1] - px) ? b : a)[0];
  if (k !== fxEnvHover){ fxEnvHover = k; drawFxEnv(); } });
$('#fxEnv').addEventListener('pointerleave', () => { fxEnvHover = null; drawFxEnv(); });
$('#fxEnv').addEventListener('pointerup', () => { fxEnvDrag = null; envPrevStop(); drawFxEnv(); });
// preview while editing: the envelope plays as a hit, over and over, restarting when a value changes
let envPrevOn = Prefs.get('vjif-envprev') !== '0';
let envSliders = Prefs.get('vjif-envview') === 'sl';
let fxPrev = null, fxPrevSig = '';
// drawn on the pixel grid at 1:1 (14 px, half-pixel lines) so they stay sharp
const ENV_IC_SL = '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1" shape-rendering="crispEdges" style="display:block;margin:auto"><path d="M1 3.5h12M1 7.5h12M1 11.5h12"/><rect x="3" y="2" width="3" height="3" fill="currentColor" stroke="none"/><rect x="8" y="6" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="10" width="3" height="3" fill="currentColor" stroke="none"/></svg>';
const ENV_IC_GRAPH = '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" style="display:block;margin:auto"><path d="M1.5 12.5L3.5 2.5l3 5h3.5l2.5 5"/></svg>';
function envPrevStart(){ if (envPrevOn && selFx < NFX) fxPrev = { i: selFx, b0: clock.beat, loop: true }; }
function envPrevChanged(C){ const sg = [C.att, C.dec, C.sus, C.len, C.rel].join(); if (fxPrev && sg !== fxPrevSig) fxPrev.b0 = clock.beat; fxPrevSig = sg; }
function envPrevStop(){ if (fxPrev) fxPrev.loop = false; }
// the preview's level: a hit (Hold / Latch get a 1-beat length so Sustain shows), looping with a short gap
function fxPrevLevel(i, C, b){
  if (!fxPrev || fxPrev.i !== i) return 0;
  const len = C.mode === 'hit' ? (C.len || 0) : 1, rel = C.rel ?? fxRelDef(C.mode), top = (C.att || 0) + (C.dec || 0) + len, end = top + Math.max(rel, 0.01);
  let t = b - fxPrev.b0; if (t > end + 0.5){ if (fxPrev.loop){ fxPrev.b0 = b; t = 0; } else { fxPrev = null; return 0; } }
  if (t < top) return fxAD(C, t); const x = rel > 0 ? (t - top) / rel : 1; return x < 1 ? fxAD(C, top) * (1 - x) * (1 - x) : 0;
}
const syncEnvTg = () => { $('#envPrev').classList.toggle('on', envPrevOn); $('#fxEnvRow').classList.toggle('sliders', envSliders); $('#envView').innerHTML = envSliders ? ENV_IC_GRAPH : ENV_IC_SL; $('#envView').title = envSliders ? 'Show the envelope as a graph' : 'Show the envelope as sliders'; };
$('#envPrev').addEventListener('click', () => { envPrevOn = !envPrevOn; Prefs.set('vjif-envprev', envPrevOn ? '1' : '0'); syncEnvTg(); });
$('#envView').addEventListener('click', () => { envSliders = !envSliders; Prefs.set('vjif-envview', envSliders ? 'sl' : 'g'); syncEnvTg(); syncEnvSl(); drawFxEnv(); });
const ENV_SL = { a: [() => FX_ATTS, 'att'], d: [() => FX_ATTS, 'dec'], l: [() => FX_LENS, 'len'], r: [() => FX_RELS, 'rel'] };
function syncEnvSl(){
  const C = fxEnvConf(); if (!C || !envSliders) return;
  document.querySelectorAll('#fxEnvSl input').forEach(el => { const k = el.dataset.k, o = el.nextElementSibling;
    if (k === 's'){ el.value = Math.round((C.sus ?? 1) * 20); o.textContent = Math.round((C.sus ?? 1) * 100) + '%'; return; }
    const [L, f] = ENV_SL[k], list = L(), v = k === 'r' ? (C.rel ?? fxRelDef(C.mode)) : (C[f] || 0), ix = optIdx(list, v); el.max = list.length - 1; el.value = ix; o.textContent = list[ix][1];
    el.closest('.sl').classList.toggle('dimmed', k === 'l' && C.mode !== 'hit'); });
}
$('#fxEnvSl').addEventListener('input', e => { const el = e.target, C = fxEnvConf(); if (!C || !el.dataset.k) return; const k = el.dataset.k;
  if (!fxPrev || !fxPrev.loop) envPrevStart();
  if (k === 's') C.sus = +el.value / 20; else { const [L, f] = ENV_SL[k]; C[f] = L()[+el.value][0]; }
  envPrevChanged(C); syncEnvSl(); drawFxEnv(); paintFxPads(clock.beat); });
$('#fxEnvSl').addEventListener('change', envPrevStop);
syncEnvTg();
document.querySelectorAll('#fxEnvSl input').forEach(el => { el.closest('.sl').title = { a: 'Attack: how long it takes to rise to full', d: 'Decay: how long it takes to fall to Sustain', s: 'Sustain: the level it rests at after Decay', l: 'Gate (Hit only): how long it stays at Sustain', r: 'Release: the fade out at the end' }[el.dataset.k]; });
$('#fxEnv').addEventListener('dblclick', e => {   // a point back to its default
  const C = fxEnvConf(); if (!C) return; const cv = e.currentTarget, r = cv.getBoundingClientRect(), d = devicePixelRatio || 1, px = (e.clientX - r.left) / r.width * cv.width, G = envGeo(C, cv.width, cv.height, d);
  const near = [['a', G.xA], ['d', G.xD], ...(G.hit ? [['l', G.xL]] : []), ['r', G.xR]].reduce((a, b) => Math.abs(b[1] - px) < Math.abs(a[1] - px) ? b : a)[0];
  if (near === 'a') C.att = 0; else if (near === 'd'){ C.dec = 0; C.sus = 1; } else if (near === 'l') C.len = 0; else C.rel = fxRelDef(C.mode);
  drawFxEnv(); });
$('#fxSize').addEventListener('input', e => { const X = fxEd(); if (!X) return; const za = sizeAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style); if (za) X[za.key] = za.list[+e.target.value][0]; else X.size = FX_SIZES[+e.target.value][0]; syncFxUI(); });
$('#fxRate').addEventListener('input', e => { const X = fxEd(); if (!X) return; const alt = rateAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style); if (alt){ const v = alt.list[+e.target.value][0]; if (alt.set) alt.set(X, v); else X[alt.key] = v; } else X.rate = FX_RATES[+e.target.value][0]; syncFxUI(); });
$('#fxPreList').addEventListener('click', e => { if (selFx < NFX) return; const b = e.target.closest('button');
  if (b){ delete fxPre[selFx - NFX].fx[b.dataset.i]; syncFxUI(); return; }
  const ch = e.target.closest('.pchip'); if (ch){ preEd = +ch.dataset.e; syncFxUI(); } });
$('#fxStore').addEventListener('click', () => { if (selFx >= NFX) storeFxPre(selFx - NFX); });
$('#fxClear').addEventListener('click', () => { if (selFx >= NFX){ fxPre[selFx - NFX].fx = {}; syncFxUI(); } });


// empty a scene (its name stays) — undoable; another scene is emptied where it is, without going there
function emptySceneAt(i){
  if (!sceneCount(i) && !scenePads(i)) return;
  commit();
  const blank = { layers: layers.map(L => Object.assign(emptyLayer(), { i: L.i })), pads: pads.map(() => null) };
  let E;
  if (i === sceneIdx){ E = { kind: 'scn', sid: sceneIds[i], data: blank }; applyScn(E); liveThumb = null; }
  else { const sc = scenes[i]; E = { kind: 'scn', sid: sceneIds[i], data: { layers: sc.layers, pads: sc.pads } };   // undo swaps these back in (and goes there)
    scenes[i] = Object.assign(emptyScene(), { name: sc.name || '' }); if (pendingScene && pendingScene.i === i) pendingScene = null; renderScenes(); renderPool(); updateMem(); }
  pushStep(E); hist.cur = histState(); updHistUI();
  toast2(`Scene ${i + 1} emptied — Ctrl+Z brings it back`);
}
$('#scEmpty').addEventListener('click', () => emptySceneAt(sceneIdx));
let thumbKeep = null, thumbTick = 0;                 // the live tile's picture as saved: refreshed every 20 s (not every second), so autosave doesn't rewrite the set constantly
setInterval(() => { if (!document.hidden && performance.now() >= uiQuiet){ liveThumb = sceneThumb(); renderScenes(); if (++thumbTick % 20 === 1 || !thumbKeep) thumbKeep = liveThumb; } }, 1000);
// a layer on / off can play a transition: the picture before the change is the leaving side, like a scene change
function toggleLayer(li){
  const lt = layers[li].tr || 'cut', P = lt === 'cut' ? null : lt === 'armed' ? transCfg : trPresets[+lt];   // each layer's own on / off transition (its card)
  if (P && P.type !== 'cut' && !prep && layers[li].clips.length){
    let still = null;
    if (trans && transProgress() < 1) still = stillOf();
    const from = layers.map(layerState), keep = transCfg; endTrans();
    transCfg = P; try { trans = makeTrans(from, pads.map(p => p.gif), clock.beat); } finally { transCfg = keep; }
    if (trans && still) trans.still = still;
  }
  layers[li].on = !layers[li].on; syncLayerUI(); redraw.all = true;
}

function setTarget(li){ target = li; syncLayerUI(); syncXfUI(); }
document.addEventListener('visibilitychange', () => { redraw.all = true; });
