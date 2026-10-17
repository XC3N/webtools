// ---------- scenes ----------
// A set holds N_SCENES scenes; a scene is its 9 Scene pads and 6 Background slots (each a GIF instance with its own settings) plus what
// layers 1–3 hold. Overlay (layer 4) and the 9 Global pads are the set's, the same in every scene (0.88).
// The live `layers` and pad instances are the current scene; the others wait in `scenes` (null = empty). GIF files (the pool) belong to the set.
const N_SCENES = 36, SC_BANK = 9;   // 0.91: four banks of nine (numpad / and * step through them; the strip shows one bank)
let scBank = 0;
const bankScene = k => scBank * SC_BANK + k;   // numpad / Launchpad scene k (0–8) in the bank on show
const scenes = Array(N_SCENES).fill(null);
const sceneIds = Array.from({ length: N_SCENES }, (_, i) => i);   // which scene sits at each number (swapped with the scenes)
let sceneIdx = 0, pendingScene = null, liveThumb = null, liveName = '';   // liveName: the current scene's name
const emptyLayer = () => ({ on: true, opacity: 1, blend: 'source-over', clips: [], sel: null, fillOn: false, fill: '#1e2a3a', tr: 'cut', lock: false, mask: null });
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
let thumbDrawn = -1, thumbSig = '';
function refreshLiveThumb(){
  if (!layers.some(L => L.clips.length)){ if (liveThumb){ liveThumb = null; renderScenes(); } return; }
  if (drawn === thumbDrawn) return; thumbDrawn = drawn;
  // Performance (0.97): only when the scene's make-up changed (GIFs, placement, layers, colour settings), not each time a
  // GIF moves on to its next frame. Drawing the tile reads the GIFs' pictures back from the GPU, which stalled a frame or
  // more every second while anything played (it was the largest single cost in profiles)
  const sig = layers.map(L => [L.on, L.opacity, L.blend, L.fillOn && L.fill, L.mask && L.mask.mid, ...L.clips.map(c => { const g = pads[c.pad] && pads[c.pad].gif;
    return [c.id, c.pad, c.x, c.y, c.sx, c.sy, c.rot, c.flipX, c.flipY, c.tile, c.cl, c.ct, c.cr, c.cb, c.alpha, c.off, c.blend, c.mask && c.mask.on && c.mask.mid, g && g.fxVer, g && g.shadow && g.shadow.on].join(); })].join('|')).join('/');
  if (sig === thumbSig && liveThumb) return; thumbSig = sig;
  liveThumb = sceneThumb(); renderScenes(); if (++thumbTick % 20 === 1 || !thumbKeep) thumbKeep = liveThumb;
}
// a layer's settings and clip list (the clips themselves are shared, not copied)
const layerProps = L => ({ on: L.on, opacity: L.opacity, blend: L.blend, clips: L.clips.slice(), sel: L.sel, fillOn: !!L.fillOn, fill: L.fill || '#1e2a3a', tr: L.tr || 'cut', lock: !!L.lock, mask: L.mask || null });   // (a mask is never changed in place: sharing it is safe)
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
function fxScopeUI(){ const b = $('#scFx'); b.classList.toggle('on', fxLocal); b.setAttribute('aria-pressed', fxLocal); }   // (0.90: an icon toggle in the Effects editor's top row; it was a labelled button on the Scenes bar)
// (0.88: Overlay and the Global pads aren't kept per scene: they stay live, the same everywhere — a stored scene has them empty)
const sceneLayers = () => layers.map(L => L.i === GLOBAL_LAYER ? Object.assign(emptyLayer(), { i: L.i }) : layerState(L)), scenePadGifs = () => pads.map((p, k) => isGlobalPad(k) ? null : p.gif);
const captureScene = () => ({ fxOn: fxLocal ? latchedNow() : liveFxOn, layers: sceneLayers(), pads: scenePadGifs(), thumb: layers.some(L => L.clips.length) ? (!document.hidden && liveThumb) || sceneThumb() : null, name: liveName, pick: { pad: selPad, target } });
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
    if (li === GLOBAL_LAYER) return;                 // Overlay carries on as it is (the same in every scene)
    const s = sc ? sc.layers[li] : emptyLayer();
    Object.assign(L, layerProps(s));
    L.clips.forEach(c => { c.startBeat = beat; c.startTime = t0; c.env = null; c.hitBeat = undefined; });   // the scene starts from the top
  });
  pads.forEach((p, k) => { if (isGlobalPad(k)) return; p.gif = sc ? sc.pads[k] || null : null; renderPad(k); });   // each scene has its own pads (a new one starts empty), the Global ones stay
  if (!trans) dropFxCache(left);                     // (with a transition: when it ends)
  scenes[i] = null; liveThumb = sc && sc.thumb; thumbKeep = liveThumb; liveName = sc && sc.name || '';
  if (fxLocal && trans && !trans.fx) trans.fx = { cfg: fxCfg, pre: fxPre, st: fxSt.map(S => ({ ...S })) };   // Local: the scene being left keeps its own effects through the transition (they used to switch at its start)
  liveFxOn = sc && sc.fxOn || null; if (fxLocal) applyLatched(liveFxOn || [], beat);   // Local: a scene with no effects of its own yet starts with none on
  for (const k of [...pending.keys()]) if (!isGlobalPad(k)){ pending.delete(k); pads[k].el.classList.remove('wait'); }   // (a Global pad waiting for the beat still plays)
  // what's selected: as you left this scene; else the edit layer stays and the GIF panel shows that layer's selected GIF
  if (sc && sc.pick){ target = sc.pick.target; selPad = sc.pick.pad; }
  else { const c = selClip(); if (c) selPad = c.pad; }
  selectPad(selPad, true); uiLater(UI.LAYERS | UI.XF | UI.SCENES | UI.POOL); redraw.all = true;
  if (Math.floor(i / SC_BANK) !== scBank) setScBank(Math.floor(i / SC_BANK));   // the strip follows the live scene (MIDI, BRB, a drop…)
  if (hist.ready) hist.cur = histState();             // switching isn't an undo step
}
// key 1–9 / click: with Snap, waits for the next beat / bar like a pad (a hit just after one counts as on it)
function sceneKey(i){   // (an absolute scene index; the numpad and the Launchpad pass bankScene(k))
  const back = brb.on && !(prep && brb.link); if (back) brbStop();          // you're back (linked to Prep: BRB keeps the output going while you edit): a scene key takes control again (on the downbeat, whatever Snap is)
  if (i === sceneIdx){ pendingScene = null; renderScenes(); return; }
  if (prep) return gotoScene(i, clock.beat, true);   // preparing: just open that scene (the output doesn't change)
  const at = back ? barBeat(clock.beat) : snapBeat(clock.beat);
  if (at <= clock.beat) return gotoScene(i, at);
  pendingScene = { i, beat: at }; renderScenes();
}
const sceneCount = i => (i === sceneIdx ? layers : scenes[i] ? scenes[i].layers : []).reduce((a, l) => a + (l.i === GLOBAL_LAYER ? 0 : l.clips.length), 0);   // (its own GIFs: Overlay's are everywhere)
const scenePads = i => (i === sceneIdx ? scenePadGifs() : scenes[i] ? scenes[i].pads : []).filter(Boolean).length;
// which bank of nine the strip shows (0–3): numpad / and * step through them, or the 1–4 switch on the heading; it follows
// the live scene when that changes from elsewhere (MIDI, BRB)
function setScBank(b){ b = clamp(b, 0, N_SCENES / SC_BANK - 1); scBank = b;
  document.querySelectorAll('#scBankSeg button').forEach(x => x.classList.toggle('on', +x.dataset.v === b)); renderScenes(); if (typeof lpRefresh === 'function') lpRefresh(); }
$('#scBankSeg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setScBank(+b.dataset.v); });
function renderScenes(){
  const box = $('#scenes');
  if (!box.children.length) box.innerHTML = Array.from({ length: N_SCENES }, (_, i) => `<button class="scene" data-i="${i}" data-b="${Math.floor(i / SC_BANK)}" style="order:${(2 - Math.floor(i % SC_BANK / 3)) * 3 + i % 3}"><span class="k">${i % SC_BANK + 1}</span><span class="xdel" title="Empty this scene (Ctrl+Z brings it back)">×</span><span class="nm"></span><span class="n"></span></button>`).join('');   // laid out like the numpad
  box.dataset.bank = scBank;
  [...box.children].forEach((b, i) => {
    if (Math.floor(i / SC_BANK) !== scBank && i !== sceneIdx) return;   // (another bank's tiles aren't on show: brought up to date when they are)
    const n = sceneCount(i), np = scenePads(i), th = i === sceneIdx ? liveThumb : scenes[i] && scenes[i].thumb;
    b.classList.toggle('cur', i === sceneIdx); b.classList.toggle('onair', !!prep && i === prep.scene); b.classList.toggle('wait', !!pendingScene && pendingScene.i === i); b.classList.toggle('empty', !n); b.classList.toggle('blank', !n && !np);
    const pg = !n && np ? (i === sceneIdx ? scenePadGifs() : scenes[i].pads).find(Boolean) : null;   // pads loaded but nothing playing: show the first GIF, dimmed
    const bg = n && th ? `url(${th})` : pg ? `url(${gifTile(pg)})` : ''; if (b._bg !== bg){ b._bg = bg; b.style.backgroundImage = bg; }   // (the browser rewrites url(...) with quotes: comparing with it never matched)
    b.classList.toggle('padsOnly', !!pg);
    b.querySelector('.n').textContent = n ? `${n} GIF${n > 1 ? 's' : ''}` : np ? `${np} pad${np > 1 ? 's' : ''}` : 'empty';
    const nm = sceneName(i), ne = b.querySelector('.nm'); if (ne.textContent !== nm) ne.textContent = nm;
    b.title = `Scene ${i + 1}${nm ? ' — ' + nm : ''} (bank ${Math.floor(i / SC_BANK) + 1}, numpad ${i % SC_BANK + 1}) · right-click to name it · drag onto another scene to swap them · Ctrl-drag: copy · ×: empty it`;
  });
}
$('#scenes').addEventListener('click', e => { if (e.target.closest('.nmEdit') || performance.now() - scDragEnd < 300) return; const b = e.target.closest('.scene'); if (!b) return;
  if (e.target.closest('.xdel')){ emptySceneAt(+b.dataset.i); return; }   // its ×
  if (e.altKey && !e.ctrlKey && !e.metaKey){ const i = +b.dataset.i; nameEdit(b, sceneName(i), `Scene ${i + 1}`, v => setSceneName(i, v)); return; }   // Alt+click: name it (as right-click does)
  isRm(e) ? emptySceneAt(+b.dataset.i) : isDel(e) ? null : sceneKey(+b.dataset.i); });   // Ctrl+click: empty it
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
  const ord = Array.from({ length: N_SCENES }, (_, k) => k).sort((a, b) => (Math.floor(a / SC_BANK) - Math.floor(b / SC_BANK)) || (Math.floor(b % SC_BANK / 3) - Math.floor(a % SC_BANK / 3)) || (a % 3 - b % 3)), at = ord.indexOf(brbCur());   // bank by bank, each in numpad order
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
// a name typed in place over a scene, a pad or an effect preset: Enter or a click elsewhere keeps it, Esc doesn't
function nameEdit(b, value, ph, set){
  if (b.querySelector('.nmEdit')) return; const inp = document.createElement('input'), dr = b.draggable;
  inp.className = 'nmEdit'; inp.value = value; inp.placeholder = ph; inp.spellcheck = false; b.draggable = false;
  ['pointerdown', 'pointerup', 'click', 'dblclick', 'contextmenu'].forEach(t => inp.addEventListener(t, ev => ev.stopPropagation()));   // (typing in it plays nothing)
  b.appendChild(inp); inp.focus(); inp.select();
  let done = false;
  const end = keep => { if (done) return; done = true; if (keep) set(inp.value.trim().slice(0, 40)); inp.remove(); b.draggable = dr; };
  inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') end(true); else if (ev.key === 'Escape') end(false); });
  inp.addEventListener('blur', () => end(true));
}
$('#scenes').addEventListener('contextmenu', e => {
  const b = e.target.closest('.scene'); if (!b) return; e.preventDefault(); if (b.querySelector('.nmEdit')) return;
  if (e.ctrlKey) return emptySceneAt(+b.dataset.i);   // a Mac's Ctrl+click arrives as a right-click
  const i = +b.dataset.i; nameEdit(b, sceneName(i), `Scene ${i + 1}`, v => setSceneName(i, v));
});
// drag a scene onto another: they swap places (the playing one keeps playing, under its new number); hold Ctrl (⌘)
// while dragging to copy it instead, onto an empty scene, or held over a full one until its bar fills, over it.
// 0.89: dragged like a pad (the pointer, the slanted chip, a right click cancels), with the same hold-to-replace (tiledrag.js)
const SCENE_MIME = 'application/x-vjif-scene';   // (no longer a browser drag: kept so drops elsewhere can still tell it isn't a GIF)
let scDrag = null, scDragEnd = 0;
const scTiles = () => [...document.querySelectorAll('#scenes .scene')];
const scFull = t => !!(sceneCount(t) || scenePads(t));
function scDragMark(){
  const d = scDrag; if (!d || !d.moved) return; const o = d.lastE && document.elementFromPoint(d.lastE.clientX, d.lastE.clientY), b = o && o.closest('#scenes .scene'), t = b ? +b.dataset.i : -1;
  $('#scenes').classList.toggle('copying', d.copy);
  copyHold(d, b, d.copy && b && t !== d.i && scFull(t), scDragMark);
  markTiles(scTiles(), b, d, x => +x.dataset.i !== d.i && (!d.copy || !scFull(+x.dataset.i) || d.armed));
}
$('#scenes').addEventListener('pointerdown', e => { const b = e.target.closest('.scene'); if (e.button || !b || e.altKey || e.target.closest('.xdel, .nmEdit') || isRm(e)) return;
  scDrag = { i: +b.dataset.i, x: e.clientX, y: e.clientY, moved: false, copy: isDel(e), b }; b.setPointerCapture(e.pointerId); });
$('#scenes').addEventListener('pointermove', e => { const d = scDrag; if (!d) return;
  if (!d.moved){ if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 8) return; d.moved = true; document.body.classList.add('scdragging');
    const g = document.createElement('span'); g.className = 'chip scghost'; g.innerHTML = `<span>${d.i + 1}</span>`; g.style.backgroundImage = d.b.style.backgroundImage; ghost.show(g, e.clientX, e.clientY); }
  ghost.move(e.clientX, e.clientY); d.lastE = e; d.copy = isDel(e); scDragMark(); });
function scDragStop(drop){
  const d = scDrag; scDrag = null; if (!d) return; copyHoldEnd(d); unmarkTiles(scTiles()); $('#scenes').classList.remove('copying'); document.body.classList.remove('scdragging');
  if (!d.moved) return; ghost.hide(); scDragEnd = performance.now();   // (the click that follows isn't a click on the scene)
  if (!drop) return; const o = document.elementFromPoint(drop.clientX, drop.clientY), b = o && o.closest('#scenes .scene'); if (!b) return;
  sceneDrop(d.i, +b.dataset.i, isDel(drop), !!d.armed);
}
$('#scenes').addEventListener('pointerup', e => scDragStop(e));
$('#scenes').addEventListener('pointercancel', () => scDragStop(null));
addEventListener('keydown', e => { if (scDrag && DEL_KEYS.includes(e.key)){ scDrag.copy = true; scDragMark(); } });
addEventListener('keyup', e => { if (scDrag && DEL_KEYS.includes(e.key)){ scDrag.copy = false; scDragMark(); } });
function sceneDrop(a, t, copy, armed){
  if (copy){ hushDel(); if (a === t) return; if (!sceneCount(a) && !scenePads(a)) return toast('That scene is empty: nothing to copy');
    if (scFull(t)){                                     // onto a scene with something in it: only after holding there (one undo step)
      if (!armed) return toast(`Scene ${t + 1} isn't empty: hold over it until the bar fills, then drop, to replace it`);
      const cp = sceneCopy(a), E = { kind: 'scn', sid: sceneIds[t], data: { layers: cp.layers, pads: cp.pads, thumb: cp.thumb } };
      commit(); applyScn(E); pushStep(E); hist.cur = histState(); updHistUI(); renderScenes(); toast2(`Scene ${a + 1} copied over ${t + 1} — Ctrl+Z brings it back`); return; }
    if (t === sceneIdx){ const cp = sceneCopy(a), E = { kind: 'scn', sid: sceneIds[t], data: { layers: cp.layers, pads: cp.pads } };   // into the scene you're on: it fills in place (one undo step)
      commit(); applyScn(E); pushStep(E); hist.cur = histState(); updHistUI(); }
    else scenes[t] = sceneCopy(a);
    renderScenes(); toast2(`Scene ${a + 1} copied to ${t + 1}`); return; }
  if (a !== t) swapScenes(a, t);
}
// GIFs from the pool or files dropped on a scene tile (a browser drag): onto that scene's first empty pads
const gifDrag = e => e.dataTransfer.types.includes('Files') || e.dataTransfer.types.includes(POOL_MIME);   // a file, or a GIF from the pool
$('#scenes').addEventListener('dragover', e => {
  if (!gifDrag(e)) return; const b = e.target.closest('.scene'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy';
  scTiles().forEach(x => x.classList.toggle('drop', x === b)); });
$('#scenes').addEventListener('dragleave', e => { if (!$('#scenes').contains(e.relatedTarget)) scTiles().forEach(x => x.classList.remove('drop')); });
$('#scenes').addEventListener('drop', e => {
  if (!gifDrag(e)) return; const b = e.target.closest('.scene'); if (!b) return;
  e.preventDefault(); e.stopPropagation(); scTiles().forEach(x => x.classList.remove('drop'));
  const si = +b.dataset.i, ph = e.dataTransfer.getData(POOL_MIME);
  if (ph){ const m = pool.find(m => m.hash === ph), d = nextEmptyIn(si); if (!m) return; if (d < 0) return toast(`Scene ${si + 1}'s 9 Scene pads are full`);
    putMedia(m, d, si); renderPool(); if (si !== sceneIdx) toast2(`${m.name} → scene ${si + 1}, pad ${PAD_LABELS[d]}`); return; }
  const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/') || /\.(gif|webp|png|apng)$/i.test(f.name));
  if (files.length) loadFilesToScene(files, si);
});
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
  const P = live ? scenePadGifs() : (sc && sc.pads) || [], Ls = (live ? layers : (sc && sc.layers) || []).map(L => L.i === GLOBAL_LAYER ? Object.assign(emptyLayer(), { i: L.i }) : L);   // (Overlay and the Global pads aren't the scene's)
  return { thumb: live ? sceneThumb() : sc && sc.thumb, name: live ? liveName : sc && sc.name, fxOn: live ? (fxLocal ? latchedNow() : liveFxOn) : sc && sc.fxOn || null, pads: P.map(g => g && cloneInst(g)),
    layers: Ls.map(L => { const clips = L.clips.map(c => Object.assign(newClip(c.pad), Object.fromEntries(XF_KEYS.map(k => [k, c[k]])), c.blend ? { blend: c.blend } : {}, c.off ? { off: true } : {}, c.mask ? { mask: c.mask } : {}));
      return { ...layerProps(L), i: L.i, clips, sel: clips[L.clips.indexOf(L.sel)] || null }; }) };   // (0.95: its mask, lock and transition too: they were dropped)
}
// empty a scene (its name stays) — undoable; another scene is emptied where it is, without going there
function emptySceneAt(i){
  if (!sceneCount(i) && !scenePads(i) && (keepSceneNames || !sceneName(i))) return;
  commit();
  const blank = { layers: layers.map(L => L.i === GLOBAL_LAYER ? layerState(L) : Object.assign(emptyLayer(), { i: L.i })), pads: pads.map((p, k) => isGlobalPad(k) ? p.gif : null), ...(keepSceneNames ? {} : { name: '' }) };   // (Overlay and the Global pads stay: they aren't the scene's) · emptied: its name goes too (Ctrl+Z brings it back), unless Settings › Permanent scene names
  let E;
  if (i === sceneIdx){ E = { kind: 'scn', sid: sceneIds[i], data: blank }; applyScn(E); liveThumb = null; }
  else { const sc = scenes[i]; E = { kind: 'scn', sid: sceneIds[i], data: { layers: sc.layers, pads: sc.pads, thumb: sc.thumb, ...(keepSceneNames ? {} : { name: sc.name || '' }) } };   // undo swaps these back in (its picture too)
    scenes[i] = Object.assign(emptyScene(), { name: keepSceneNames ? sc.name || '' : '' }); if (pendingScene && pendingScene.i === i) pendingScene = null; renderScenes(); renderPool(); updateMem(); }
  pushStep(E); hist.cur = histState(); updHistUI();
  toast2(`Scene ${i + 1} emptied — Ctrl+Z brings it back`);
}
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
function setTarget(li){ target = li; if (maskEd && maskEd.li !== li) maskClose(); syncLayerUI(); syncXfUI(); }   // another layer: mask painting ends
document.addEventListener('visibilitychange', () => { redraw.all = true; });

// ---- one scene to a file and back (0.95, ID-213): a .vjscene is a ZIP like a .vjif: scene.json + the GIF files it uses ----
// The scene part is what a set stores for a scene (pads, layers with masks, name, its latched effects); Global pads and
// Overlay stay out. Import: into the first empty scene from the bank on show (or the one dropped on); its GIFs join the pool.
async function exportScene(i = sceneIdx){
  const live = i === sceneIdx, sc = live ? null : scenes[i];
  if (!live && !sc) return toast(`Scene ${i + 1} is empty`);
  const P = (live ? scenePadGifs() : sc.pads).map((g, k) => isGlobalPad(k) ? null : g), Ls = (live ? layers : sc.layers).map(L => L.i === GLOBAL_LAYER ? Object.assign(emptyLayer(), { i: L.i }) : L);
  if (!P.some(Boolean)) return toast(`Scene ${i + 1} has no GIFs`);
  const name = (live ? liveName : sc.name) || '', files = []   /* (0.99: an unnamed scene stays unnamed: only the file gets a number) */, pl = [], enc = new TextEncoder();
  for (const m of new Set(P.filter(Boolean).map(g => g.media))){
    const rec = await store.get('gif:' + m.hash); if (!rec) continue;
    const base = (rec.name || 'gif').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w.-]+/g, '_').slice(0, 60);
    const path = `gifs/${m.hash.slice(0, 8)}-${base}.${EXT[rec.blob.type] || (rec.name.match(/\.(\w+)$/) || [, 'gif'])[1]}`;
    files.push({ name: path, data: new Uint8Array(await rec.blob.arrayBuffer()) }); pl.push({ hash: m.hash, name: rec.name, file: path, scale: m.scale || 1 });
  }
  const ss = { pads: serPads(P), layers: serLayers(Ls), name, fxOn: live ? (fxLocal ? latchedNow() : null) : sc.fxOn || null };
  files.unshift({ name: 'scene.json', data: enc.encode(JSON.stringify({ app: 'VJif', kind: 'scene', format: 1, v: SNAP_V, exported: new Date().toISOString(), pool: pl, scene: ss }, null, 1)) });
  const blob = buildZip(files), fn = (name.replace(/[^\w .-]+/g, '_').trim() || `scene-${i + 1}`) + '.vjscene';
  if (window.showSaveFilePicker){
    try { const h = await showSaveFilePicker({ suggestedName: fn, types: [{ description: 'VJif scene', accept: { 'application/zip': ['.vjscene'] } }] });
      const w = await h.createWritable(); await w.write(blob); await w.close(); return toast2(`Exported ${h.name}`); }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  saveFile(blob, fn); toast2(`Exported ${fn} (downloads folder)`);
}
async function importScene(file, at = -1){
  if (prep) return toast('Go live first (Enter): Prep keeps the output on the current set');
  try {
    const zf = await readZip(file), meta = zf.get('scene.json'); if (!meta) throw new Error('no scene.json inside');
    const info = JSON.parse(new TextDecoder().decode(meta)); if (info.app !== 'VJif' || info.kind !== 'scene') throw new Error('not a VJif scene');
    const o = upgradeSnap({ v: info.v || SNAP_V, scenes: [info.scene], pool: info.pool || [] }), ss = o.scenes[0];
    if (/^Scene \d+$/.test(ss.name || '')) ss.name = '';   // (0.95 files named an unnamed scene after its number)
    let i = at;
    const liveEmpty = !layers.some(L => L.i !== GLOBAL_LAYER && L.clips.length) && !scenePadGifs().some(Boolean);
    if (i < 0 && liveEmpty) i = sceneIdx;            // 0.99: the scene you're on, when it's empty
    if (i < 0){ const b0 = scBank * SC_BANK; i = [...Array(N_SCENES).keys()].map(k => (b0 + k) % N_SCENES).find(k => k !== sceneIdx && !sceneCount(k) && !scenePads(k)) ?? -1; }
    if (i < 0) return toast('No empty scene to import into');
    if (i === sceneIdx ? !liveEmpty : sceneCount(i) || scenePads(i)) return toast(`Scene ${i + 1} isn't empty`);
    const gen = setGen, byHash = new Map(); let missing = 0;
    for (const e of o.pool){
      const data = e.file && zf.get(e.file); if (!data){ missing++; continue; }
      const ext = (e.file.match(/\.(\w+)$/) || [, 'gif'])[1].toLowerCase();
      const blob = new Blob([data], { type: ext === 'vjtext' ? TEXT_MIME : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/gif' });
      const m = await mediaFor(blob, e.name, gen); if ((m.scale || 1) !== (e.scale || 1)) await setMediaScale(m, e.scale || 1); byHash.set(e.hash, m);
    }
    const mk = sp => { const m = sp && byHash.get(sp.hash); if (!m) return null; const g = makeInst(m, sp); if (g.key.on || hsvOn(g)) applyFx(g); return g; };
    const gs = pads.map((_, k) => isGlobalPad(k) ? null : mk(ss.pads[k])), now = performance.now();
    const Ls = deserLayers(ss.layers, now, gs).map((l, li) => Object.assign(l, { i: li }));
    commit();
    if (i === sceneIdx){                             // into the live scene: the same swap as an undo step (Overlay and the Global pads stay)
      const E = { kind: 'scn', sid: sceneIds[i], data: { layers: Ls, pads: gs, thumb: null, name: ss.name || liveName || '' } };
      applyScn(E); liveThumb = null; liveFxOn = ss.fxOn || null; if (fxLocal) applyLatched(liveFxOn || []);
      layers.forEach(L => L.clips.forEach(c => { c.startBeat = clock.beat; c.startTime = now; }));
      pushStep(E);
    } else {
      const old = scenes[i] || Object.assign(emptyScene(), { name: '' });
      const E = { kind: 'scn', sid: sceneIds[i], data: { layers: old.layers, pads: old.pads, thumb: old.thumb || null, name: old.name || '' } };
      scenes[i] = { pads: gs, layers: Ls, thumb: null, name: ss.name || old.name || '', fxOn: ss.fxOn || null };
      pushStep(E);
    }
    hist.cur = histState(); updHistUI();
    if (Math.floor(i / SC_BANK) !== scBank) setScBank(Math.floor(i / SC_BANK));
    renderScenes(); renderPool(); updateMem();
    toast2(`Imported "${ss.name || file.name}" into scene ${i + 1}${missing ? ` (${missing} GIF file(s) missing)` : ''} — Ctrl+Z takes it back`);
  } catch (e) { toast(`Couldn't import ${file.name}: ${e.message}`); }
}
$('#scExport').addEventListener('click', () => exportScene());
$('#scImport').addEventListener('click', () => $('#scFile').click());
$('#scFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importScene(f); });
// a .vjscene dropped on the scenes: into that tile if it's empty, else the first empty one (before the GIF drop handlers see it)
$('#scenes').addEventListener('dragover', e => { if ([...e.dataTransfer.items].some(it => it.kind === 'file') && e.dataTransfer.types.includes('Files')) e.preventDefault(); }, true);
$('#scenes').addEventListener('drop', e => { const f = [...(e.dataTransfer ? e.dataTransfer.files : [])].find(f => /\.vjscene$/i.test(f.name)); if (!f) return;
  e.preventDefault(); e.stopPropagation(); const t = e.target.closest('.scene'), k = t ? +t.dataset.i : -1;
  importScene(f, k >= 0 && k !== sceneIdx && !sceneCount(k) && !scenePads(k) ? k : -1); }, true);   // (dropped on the live tile: -1 picks it when it's empty)
