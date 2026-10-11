// ---------- scenes ----------
// A set holds N_SCENES scenes; a scene is its 18 pads (each a GIF instance with its own settings) plus what the 4 layers hold.
// The live `layers` and pad instances are the current scene; the others wait in `scenes` (null = empty). GIF files (the pool) belong to the set.
const N_SCENES = 9;
const scenes = Array(N_SCENES).fill(null);
const sceneIds = Array.from({ length: N_SCENES }, (_, i) => i);   // which scene sits at each number (swapped with the scenes)
let sceneIdx = 0, pendingScene = null, liveThumb = null, liveName = '';   // liveName: the current scene's name
const emptyLayer = () => ({ on: true, opacity: 1, blend: 'source-over', clips: [], sel: null, fillOn: false, fill: '#1e2a3a', tr: 'cut' });
const emptyScene = () => ({ layers: [0, 1, 2, 3].map(i => Object.assign(emptyLayer(), { i })), pads: pads.map(() => null), thumb: null });
// the scene itself, drawn apart from the output (no screen or layer effects, transition, blackout or freeze), straight at tile size
function drawThumb(x){
  const k = Math.min(96 / W, 54 / H);
  x.imageSmoothingQuality = 'high'; x.fillStyle = '#000'; x.fillRect(0, 0, 96, 54);
  const xf = [k, 0, 0, k, (96 - W * k) / 2, (54 - H * k) / 2];   // other formats letterboxed
  x.setTransform(...xf); x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
  render(frameList(performance.now()), x, null, NO_LAYER_FX, 0, xf); x.restore();
}
// Thumbnails are drawn on CPU canvases (willReadFrequently): reading back a GPU canvas (toDataURL) waited for the
// whole GPU queue, the effects included: 0.2–0.5 s per picture in tests, a dropped frame or more each second live
function sceneThumb(){
  if (!layers.some(L => L.clips.length)) return null;
  const [c, x] = cpuCanvas(96, 54); drawThumb(x);
  return c.toDataURL('image/jpeg', 0.7);
}
// the live tile, once a second, only when the picture was redrawn since the last one
let thumbDrawn = -1;
function refreshLiveThumb(){
  if (!layers.some(L => L.clips.length)){ if (liveThumb){ liveThumb = null; renderScenes(); } return; }
  if (drawn === thumbDrawn) return; thumbDrawn = drawn;
  liveThumb = sceneThumb(); renderScenes(); if (++thumbTick % 20 === 1 || !thumbKeep) thumbKeep = liveThumb;
}
// a layer's settings and clip list (the clips themselves are shared, not copied)
const layerProps = L => ({ on: L.on, opacity: L.opacity, blend: L.blend, clips: L.clips.slice(), sel: L.sel, fillOn: !!L.fillOn, fill: L.fill || '#1e2a3a', tr: L.tr || 'cut' });
const layerState = L => ({ i: L.i, ...layerProps(L) });
// the tile keeps the live picture made in the last second (drawing a new one here would stall the scene change);
// with the control window hidden that picture isn't refreshed, so then it's drawn
// FX Local / Global (scenes toolbar). Global: latched effects stay as they are from scene to scene. Local: each scene
// remembers which latched effects were on, and going to it switches those on and the rest off (with their own attack /
// release, so they ease in and out with the transition). Switching back to Local brings the scene's own effects back.
let fxLocal = false, liveFxOn = null;               // liveFxOn: the current scene's remembered effects (scenes[] hold the others')
const latchedNow = () => fxSt.map((S, i) => S.on && fxConf(i).mode === 'latch' ? 1 : 0);
function applyLatched(list, b = clock.beat){
  fxSt.forEach((S, i) => { if (fxConf(i).mode !== 'latch') return; const want = !!list[i];
    if (want && !S.on){ S.on = true; S.t0 = b; } else if (!want && S.on){ S.on = false; S.rel = b; } });
  syncFxUI();
}
function setFxLocal(on){
  if (on === fxLocal) return; fxLocal = on;
  if (on){ if (liveFxOn) applyLatched(liveFxOn); else liveFxOn = latchedNow(); } else liveFxOn = latchedNow();   // (the scene you're on keeps what's on)
  fxScopeUI(); toast2(on ? 'FX Local: each scene keeps its own latched effects' : 'FX Global: latched effects stay on from scene to scene');
}
function fxScopeUI(){ const b = $('#scFx'); b.textContent = fxLocal ? 'FX Local' : 'FX Global'; b.classList.toggle('on', fxLocal); }
const captureScene = () => ({ fxOn: fxLocal ? latchedNow() : liveFxOn, layers: layers.map(layerState), pads: pads.map(p => p.gif), thumb: layers.some(L => L.clips.length) ? (!document.hidden && liveThumb) || sceneThumb() : null, name: liveName, pick: { pad: selPad, target } });
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
    L.clips.forEach(c => { c.startBeat = beat; c.startTime = t0; c.env = null; c.hitBeat = undefined; });   // the scene starts from the top
  });
  pads.forEach((p, k) => { p.gif = sc ? sc.pads[k] : null; renderPad(k); });   // each scene has its own pads (a new one starts empty)
  if (!trans) dropFxCache(left);                     // (with a transition: when it ends)
  scenes[i] = null; liveThumb = sc && sc.thumb; thumbKeep = liveThumb; liveName = sc && sc.name || '';
  liveFxOn = sc && sc.fxOn || null; if (fxLocal) applyLatched(liveFxOn || [], beat);   // Local: a scene with no effects of its own yet starts with none on
  pending.clear(); pads.forEach(p => p.el.classList.remove('wait'));
  // what's selected: as you left this scene; else the edit layer stays and the GIF panel shows that layer's selected GIF
  if (sc && sc.pick){ target = sc.pick.target; selPad = sc.pick.pad; }
  else { const c = selClip(); if (c) selPad = c.pad; }
  selectPad(selPad, true); uiLater(UI.LAYERS | UI.XF | UI.SCENES | UI.POOL); redraw.all = true;
  if (hist.ready) hist.cur = histState();             // switching isn't an undo step
}
// key 1–9 / click: with Snap, waits for the next beat / bar like a pad (a hit just after one counts as on it)
function sceneKey(i){
  const back = brb.on && !(prep && brb.link); if (back) brbStop();          // you're back (linked to Prep: BRB keeps the output going while you edit): a scene key takes control again (on the downbeat, whatever Snap is)
  if (i === sceneIdx){ pendingScene = null; renderScenes(); return; }
  if (prep) return gotoScene(i, clock.beat, true);   // preparing: just open that scene (the output doesn't change)
  const at = back ? barBeat(clock.beat) : snapBeat(clock.beat);
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
$('#scenes').addEventListener('click', e => { if (e.target.closest('.nmEdit')) return; const b = e.target.closest('.scene'); if (!b) return; isRm(e) ? emptySceneAt(+b.dataset.i) : isDel(e) ? null : sceneKey(+b.dataset.i); });   // Ctrl+click: empty it
// ---- BRB: scene changes by themselves every few bars, on the bar, while you step away ----
const brb = (() => { const s = Prefs.json('vjif-brb', {});
  return { on: false, next: 0, bars: [4, 8, 16, 32].includes(s.bars) ? s.bars : 8, scn: s.scn === 'rand' ? 'rand' : 'order', tr: s.tr === 'rand' ? 'rand' : 'armed', lastTr: -1, link: !!s.link }; })();
const brbSave = () => Prefs.setJson('vjif-brb', { bars: brb.bars, scn: brb.scn, tr: brb.tr, link: brb.link });
const brbFirst = () => (Math.floor(clock.beat / 4 + 1e-9) + 1) * 4 + (brb.bars - 1) * 4;   // counted from the next bar
function brbStart(){ brb.on = true; brb.next = brbFirst(); brbUI(); }
function brbStop(){ brb.on = false; brbUI(); }
// scenes it can go to: those with GIFs playing, other than the current one (linked to Prep: other than the one on the output and the one being edited)
const brbCur = () => prep && brb.link ? prep.scene : sceneIdx;
const brbChoices = () => Array.from({ length: N_SCENES }, (_, i) => i).filter(i => i !== sceneIdx && i !== brbCur() && sceneCount(i) > 0);
function brbPick(){
  const c = brbChoices(); if (!c.length) return -1;
  if (brb.scn === 'rand') return c[Math.floor(Math.random() * c.length)];
  // in order = the numpad's reading order: 7 8 9, 4 5 6, 1 2 3
  const ord = Array.from({ length: N_SCENES }, (_, k) => k).sort((a, b) => (Math.floor(b / 3) - Math.floor(a / 3)) || (a % 3 - b % 3)), at = ord.indexOf(brbCur());
  for (let k = 1; k <= N_SCENES; k++){ const i = ord[(at + k) % N_SCENES]; if (c.includes(i)) return i; }
  return -1;
}
const brbGo = (i, at) => prep ? prepSwitchTo(i, at) : gotoScene(i, at);
function brbTick(){
  const b = clock.beat;
  if (b < brb.next - brb.bars * 4 - 4) brb.next = brbFirst();   // the beat count jumped back (Sync, MIDI Start): count again
  if ((prep && !brb.link) || b < brb.next - 1e-9) return;   // Prep holds the output still: BRB waits for go-live (unless linked: then BRB changes the output)
  const at = brb.next; while (brb.next <= b + 1e-9) brb.next += brb.bars * 4;   // after a long Prep hold / a jump: one change, then back on the grid (not one per tick)
  const i = brbPick(); if (i < 0) return;            // nothing else to play: stay
  if (brb.tr === 'rand'){                            // a random preset (not the same twice in a row), without re-arming it
    const all = trPresets.map((_, k) => k).filter(k => k !== brb.lastTr && trPresets[k].type !== 'cut');
    const k = all.length ? all[Math.floor(Math.random() * all.length)] : trSel; brb.lastTr = k;
    const keep = transCfg; transCfg = trPresets[k]; try { brbGo(i, at); } finally { transCfg = keep; }
  } else brbGo(i, at);
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
const brbLinkUI = () => $('#brbLink').classList.toggle('on', brb.link);
brbLinkUI();
$('#brbLink').addEventListener('click', () => { brb.link = !brb.link; brbSave(); brbLinkUI(); if (prep && brb.link && !brb.on) brbStart(); });
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
const gifDrag = e => e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes(POOL_MIME);   // a file, or a GIF from the pool
$('#scenes').addEventListener('dragover', e => {
  if (gifDrag(e) && !e.dataTransfer.types.includes(SCENE_MIME)){ const b = e.target.closest('.scene'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy';
    document.querySelectorAll('#scenes .scene').forEach(x => x.classList.toggle('drop', x === b)); return; }
  if (!e.dataTransfer.types.includes(SCENE_MIME)) return;
  e.preventDefault(); e.stopPropagation(); const cp = isDel(e); e.dataTransfer.dropEffect = cp ? 'copy' : 'move'; $('#scenes').classList.toggle('copying', cp);
  const b = e.target.closest('.scene'); document.querySelectorAll('#scenes .scene').forEach(x => x.classList.toggle('drop', x === b && (!cp || x.classList.contains('empty'))));
});
$('#scenes').addEventListener('dragleave', e => { if (!$('#scenes').contains(e.relatedTarget)){ document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop')); $('#scenes').classList.remove('copying'); } });
$('#scenes').addEventListener('drop', e => {
  if (gifDrag(e) && !e.dataTransfer.types.includes(SCENE_MIME)){   // GIFs dropped on a scene: onto its first empty pads
    const b = e.target.closest('.scene'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop'));
    const si = +b.dataset.i, ph = e.dataTransfer.getData(POOL_MIME);
    if (ph){ const m = pool.find(m => m.hash === ph), d = nextEmptyIn(si); if (!m) return; if (d < 0) return toast(`Scene ${si + 1}'s 18 pads are full`);
      putMedia(m, d, si); renderPool(); if (si !== sceneIdx) toast2(`${m.name} → scene ${si + 1}, pad ${PAD_LABELS[d]}`); return; }
    const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/') || /\.(gif|webp|png|apng)$/i.test(f.name));
    if (files.length) loadFilesToScene(files, si); return;
  }
  if (!e.dataTransfer.types.includes(SCENE_MIME)) return;
  e.preventDefault(); e.stopPropagation(); document.querySelectorAll('#scenes .scene').forEach(x => x.classList.remove('drop')); $('#scenes').classList.remove('copying');
  const b = e.target.closest('.scene'); if (!b) return;
  const a = +e.dataTransfer.getData(SCENE_MIME), t = +b.dataset.i;
  if (isDel(e)){ hushDel(); if (a === t) return; if (!sceneCount(a) && !scenePads(a)) return toast('That scene is empty: nothing to copy'); if (sceneCount(t) || scenePads(t)) return toast('Ctrl+drag onto an empty scene to copy'); if (t === sceneIdx){ const cp = sceneCopy(a), E = { kind: 'scn', sid: sceneIds[t], data: { layers: cp.layers, pads: cp.pads } };   // into the scene you're on: it fills in place (one undo step)
      commit(); applyScn(E); pushStep(E); hist.cur = histState(); updHistUI(); }
    else scenes[t] = sceneCopy(a);
    renderScenes(); toast2(`Scene ${a + 1} copied to ${t + 1}`); return; }
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
// a stored copy of scene i (the live one or a stored one): its own copy of every pad's settings, new clip ids, same placement
function sceneCopy(i){
  const live = i === sceneIdx, sc = live ? null : scenes[i];
  if (!live && !sc) return emptyScene();             // never opened: a copy of nothing is an empty scene (not a shell without layers)
  const P = live ? pads.map(p => p.gif) : (sc && sc.pads) || [], Ls = live ? layers : (sc && sc.layers) || [];
  return { thumb: live ? sceneThumb() : sc && sc.thumb, name: live ? liveName : sc && sc.name, fxOn: live ? (fxLocal ? latchedNow() : liveFxOn) : sc && sc.fxOn || null, pads: P.map(g => g && cloneInst(g)),
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
$('#scFx').addEventListener('click', () => setFxLocal(!fxLocal));
$('#fxAllOff').addEventListener('click', () => { const n = latchedNow().filter(Boolean).length; applyLatched([]); toast2(n ? `All effects off (${n})` : 'No effects on'); });
let thumbKeep = null, thumbTick = 0;                 // the live tile's picture as saved: refreshed every 20 s (not every second), so autosave doesn't rewrite the set constantly
setInterval(() => { if (!document.hidden && performance.now() >= uiQuiet) refreshLiveThumb(); }, 1000);
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

// right-click a layer's number: only that layer on; right-click it again while it's still soloed: the others as they were
let soloPrev = null;
function soloLayer(li){
  const isSolo = layers.every((L, k) => L.on === (k === li));
  if (isSolo && soloPrev && soloPrev.li === li){ layers.forEach((L, k) => L.on = soloPrev.on[k]); soloPrev = null; }
  else { soloPrev = { li, on: layers.map(L => L.on) }; layers.forEach((L, k) => L.on = k === li); }
  syncLayerUI(); redraw.all = true;
}
function setTarget(li){ target = li; syncLayerUI(); syncXfUI(); }
document.addEventListener('visibilitychange', () => { redraw.all = true; });
