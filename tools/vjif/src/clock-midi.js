// ---------- clock ----------
function setBpm(v){
  clock.bpm = Math.round(clamp(+v || 120, 20, 300) * 100) / 100;
  if (document.activeElement !== $('#bpm')) $('#bpm').value = clock.bpm.toFixed(2);
}

function tap(){
  if (clock.src !== 'internal') return;
  const t = performance.now(), T = clock.taps;
  if (T.length && t - T[T.length-1] > 2000) T.length = 0;
  T.push(t); if (T.length > 8) T.shift();
  if (T.length === 1) clock.beat = Math.ceil(clock.beat / 4) * 4;            // first tap = downbeat
  else { setBpm(60000 / ((T[T.length-1] - T[0]) / (T.length - 1))); clock.beat = Math.round(clock.beat); }
  const b = $('#tapBtn'); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 90);
}

// global reset: now is beat 1 of bar 1 (internal clock), and every GIF on every layer restarts from its start frame
function resync(){
  const now = performance.now();
  if (clock.src === 'internal'){ clock.beat = 0; clock.taps.length = 0; }
  layers.forEach(L => L.clips.forEach(c => { c.startTime = now; c.startBeat = clock.beat; }));
  if (prep) prep.layers.forEach(L => L.clips.forEach(c => { c.startTime = now; c.startBeat = clock.beat; }));   // the output follows Sync too
  if (pendingLive !== null) pendingLive = clock.beat;
  const b = $('#syncBtn'); b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 120);
}
function updateClock(now){
  const dt = now - clock.last; clock.last = now;
  if (clock.src === 'midi'){
    if (clock.midiRunning && now - clock.lastTick > 500) clock.midiRunning = false;
    if (!clock.midiRunning) return;
    clock.beat += dt * clock.bpm / 60000;
    const err = clock.midiTicks / 24 - clock.beat;
    clock.beat = Math.abs(err) > 1 ? clock.midiTicks / 24 : clock.beat + err * 0.15;
  } else clock.beat += dt * clock.bpm / 60000;
}


// ---------- MIDI clock ----------
let midiAccess = null, midiInput = null;
async function enableMidi(){
  if (!navigator.requestMIDIAccess){ toast('Web MIDI is not available in this browser'); return setClockSrc('internal'); }
  try { await getMidi(); }
  catch { toast('MIDI access was denied'); return setClockSrc('internal'); }
  fillMidi();
}
const midiClkPick = (() => { try { return JSON.parse(localStorage.getItem('vjif-midiclk')) || {}; } catch (e) { return {}; } })();   // { id, name } of the clock input
function fillMidi(){
  const sel = $('#midiIn'), ins = [...midiAccess.inputs.values()];
  sel.innerHTML = '<option value="">— choose the clock input —</option>' + ins.map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('');
  const hit = ins.find(i => i.id === midiClkPick.id) || ins.find(i => i.name === midiClkPick.name) || (ins.length === 1 ? ins[0] : null);   // the last one used, or the only one there is
  sel.value = hit ? hit.id : ''; bindMidiInput();
}
function bindMidiInput(){
  if (midiInput) midiInput.onmidimessage = null;
  midiInput = midiAccess && $('#midiIn').value ? midiAccess.inputs.get($('#midiIn').value) : null;
  if (midiInput){ midiClkPick.id = midiInput.id; midiClkPick.name = midiInput.name; try { localStorage.setItem('vjif-midiclk', JSON.stringify(midiClkPick)); } catch (e) {} }
  if (midiInput && clock.src === 'midi') midiInput.onmidimessage = onMidi;
  midiAlert();
}
// MIDI on with no input to follow: the settings gear flashes until one is chosen
function midiAlert(){ $('#setBtn').classList.toggle('alert', clock.src === 'midi' && !midiInput); }
function onMidi(e){
  const s = e.data[0];
  if (s === 0xF8){
    const t = performance.now(), TT = clock.midiTickTimes;
    clock.midiTicks++; clock.lastTick = t; clock.midiRunning = true;
    TT.push(t); if (TT.length > 49) TT.shift();
    if (TT.length >= 13) setBpm(60000 / ((TT[TT.length-1] - TT[0]) / (TT.length - 1) * 24));
  } else if (s === 0xFA){ clock.midiTicks = 0; clock.beat = 0; clock.midiTickTimes = []; clock.lastTick = performance.now(); clock.midiRunning = true; }
  else if (s === 0xFB){ clock.lastTick = performance.now(); clock.midiRunning = true; }
  else if (s === 0xFC){ clock.midiRunning = false; }
}
function setClockSrc(v){
  clock.src = v; $('#midiClk').classList.toggle('on', v === 'midi');
  $('#bpm').disabled = v === 'midi'; $('#tapBtn').disabled = v === 'midi'; $('#bpmRound').disabled = v === 'midi';
  if (v === 'midi'){ clock.midiTicks = Math.round(clock.beat * 24); enableMidi().then(() => { if (clock.src === 'midi' && !midiInput) toast('No MIDI clock input selected: pick one in Settings › MIDI'); }); }
  else { if (midiInput) midiInput.onmidimessage = null; $('#beats').classList.remove('wait'); $('#midiLed').className = 'led'; }
  midiAlert();
}

// ---------- MIDI control: notes / CCs from a controller drive VJif (MIDI learn) ----------
// A mapping is { key: 'n<ch>.<note>' | 'c<ch>.<cc>', t: target kind, i: index }. Buttons (pads, scenes, transition
// presets, effects, layers, blackout, freeze, tap, sync) react to notes, or to a CC crossing 64; faders (layer opacity,
// effect amount) follow a CC. Mappings belong to this browser (they describe the controller, not the set).
const midiCtl = { map: [], input: 'all', learning: false, target: null, inputs: [], cc: {} };
try { const o = JSON.parse(localStorage.getItem('vjif-midi')); if (o){ midiCtl.map = o.map || []; midiCtl.input = o.input || 'all'; midiCtl.inputName = o.inputName || ''; } } catch (e) {}
const saveMidiCtl = () => { try { localStorage.setItem('vjif-midi', JSON.stringify({ map: midiCtl.map, input: midiCtl.input, inputName: midiCtl.inputName || '' })); } catch (e) {} };
async function getMidi(){
  if (midiAccess) return midiAccess;
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is not available in this browser');
  midiAccess = await navigator.requestMIDIAccess();
  midiAccess.onstatechange = () => { fillMidi(); bindCtlInputs(); };
  return midiAccess;
}
function bindCtlInputs(){
  midiCtl.inputs.forEach(i => i.removeEventListener('midimessage', onCtl)); midiCtl.inputs = [];
  if (!midiAccess) return;
  const all = [...midiAccess.inputs.values()];
  midiCtl.inputs = midiCtl.input === 'all' ? all : all.filter(i => i.id === midiCtl.input);
  midiCtl.inputs.forEach(i => i.addEventListener('midimessage', onCtl));
  renderMidiCtl();
}
const FADERS = new Set(['opacity', 'amount']);
const ctlName = k => { const [ty, rest] = [k[0], k.slice(1)], [ch, n] = rest.split('.').map(Number); return `${ty === 'n' ? 'Note ' + n : 'CC ' + n} · ch ${ch + 1}`; };
function targetName(T){
  switch (T.t){
    case 'pad': return `Pad ${PAD_LABELS[T.i]}`;
    case 'scene': return `Scene ${T.i + 1}`;
    case 'trans': return `Transition ${T.i + 1}`;
    case 'fx': return T.i < NFX ? `Effect ${FX_LABELS[T.i]} ${FX_DEFS[T.i].name}` : `Effect preset ${T.i - NFX + 1}`;
    case 'layer': return `Layer ${T.i + 1} on / off`;
    case 'opacity': return `Layer ${T.i + 1} opacity`;
    case 'amount': return T.i < NFX ? `${FX_DEFS[T.i].name} amount` : `Preset ${T.i - NFX + 1} amount`;
    case 'black': return 'Blackout'; case 'freeze': return 'Freeze'; case 'tap': return 'Tap tempo'; case 'sync': return 'Sync'; case 'brb': return 'BRB';
  }
  return '?';
}
function onCtl(e){
  const [st, d1, d2 = 0] = e.data; if (st >= 0xF0) return;
  const ty = st & 0xF0, ch = st & 15;
  let key, val, kind;
  if (ty === 0x90 || ty === 0x80){ key = `n${ch}.${d1}`; kind = 'note'; val = ty === 0x90 && d2 > 0 ? d2 : 0; }
  else if (ty === 0xB0){ key = `c${ch}.${d1}`; kind = 'cc'; val = d2; }
  else return;
  if (midiCtl.learning){
    if (!midiCtl.target || (kind === 'note' && val === 0)) return;   // note-offs don't assign
    const T = midiCtl.target;
    if (FADERS.has(T.t) && kind !== 'cc') return toast2('Faders need a knob or fader (a CC), not a key');
    midiCtl.map = midiCtl.map.filter(m => m.key !== key);              // one job per control
    midiCtl.map.push({ key, t: T.t, i: T.i ?? 0 }); saveMidiCtl();
    toast2(`${ctlName(key)} → ${targetName(T)}`);
    midiCtl.target = null; markLearn(); renderMidiCtl(); return;
  }
  for (const m of midiCtl.map) if (m.key === key) ctlApply(m, kind, val, key);
}
// buttons fire on press and release (a CC counts as pressed above 63); faders follow the value
function ctlApply(m, kind, val, key){
  if (FADERS.has(m.t)){
    if (kind !== 'cc') return;
    const v = val / 127;
    if (m.t === 'opacity'){ layers[m.i].opacity = v; syncLayerUI(); }
    else { fxConf(m.i).amt = v; if (selFx === m.i) syncFxUI(); }
    return;
  }
  const down = kind === 'note' ? val > 0 : val > 63, was = !!midiCtl.cc[key];
  if (down === was && kind === 'cc') return;               // a CC only acts when it crosses the middle
  midiCtl.cc[key] = down;
  const i = m.i;
  switch (m.t){
    case 'pad': down ? trigger(i) : release(i); break;
    case 'scene': if (down) sceneKey(i); break;
    case 'trans': if (down) armTrans(i); break;
    case 'fx': down ? fxDown(i) : fxUp(i); break;
    case 'layer': if (down) toggleLayer(i); break;
    case 'black': setBlack(down); updLiveTag(); break;
    case 'freeze': setFreeze(down); break;
    case 'tap': if (down) tap(); break;
    case 'sync': if (down) resync(); break;
    case 'brb': if (down) brb.on ? brbStop() : brbStart(); break;
  }
}
// ---- learn mode: click a target, then press / move the control ----
function learnTargetAt(el){
  if (!el || !el.closest) return null;
  let x;
  if ((x = el.closest('.pad'))) return { t: 'pad', i: +x.dataset.i };
  if ((x = el.closest('#scenes .scene'))) return { t: 'scene', i: +x.dataset.i };
  if ((x = el.closest('#trPre button'))) return { t: 'trans', i: +x.dataset.v };
  if ((x = el.closest('#fxStrip .fxp'))) return { t: 'fx', i: +x.dataset.i };
  if ((x = el.closest('#fxAmt, #fxAmt + output'))) return { t: 'amount', i: selFx };
  if ((x = el.closest('.layer'))){
    const li = [...$('#layers').children].indexOf(x);
    if (el.closest('.lop')) return { t: 'opacity', i: li };
    if (el.closest('.lon')) return { t: 'layer', i: li };
    return null;
  }
  if ((x = el.closest('[data-learn]'))) return { t: x.dataset.learn };
  if (el.closest('#tapBtn')) return { t: 'tap' };
  if (el.closest('#syncBtn')) return { t: 'sync' };
  if (el.closest('#brbBtn')) return { t: 'brb' };
  return null;
}
async function startLearn(){
  try { await getMidi(); } catch (e) { return toast(e.message === 'Web MIDI is not available in this browser' ? e.message : 'MIDI access was denied'); }
  bindCtlInputs();
  midiCtl.learning = true; midiCtl.target = null; $('#setPanel').hidden = true;
  document.body.classList.add('learning'); $('#learnBar').hidden = false; markLearn();
}
function endLearn(){ midiCtl.learning = false; midiCtl.target = null; document.body.classList.remove('learning'); $('#learnBar').hidden = true; markLearn(); renderMidiCtl(); }
function elFor(T){
  switch (T.t){
    case 'pad': return pads[T.i] && pads[T.i].el;
    case 'scene': return $(`#scenes .scene[data-i="${T.i}"]`);
    case 'trans': return $(`#trPre button[data-v="${T.i}"]`);
    case 'fx': return $(`#fxStrip .fxp[data-i="${T.i}"]`);
    case 'layer': return $('#layers').children[T.i] && $('#layers').children[T.i].querySelector('.lon');
    case 'opacity': return $('#layers').children[T.i] && $('#layers').children[T.i].querySelector('.lop');
    case 'amount': return selFx === T.i ? $('#fxAmt') : null;
    case 'tap': return $('#tapBtn'); case 'sync': return $('#syncBtn'); case 'brb': return $('#brbBtn');
    default: return $(`#learnBar [data-learn="${T.t}"]`);
  }
}
// while learning: mapped targets are outlined, the one waiting for a control is lit
function markLearn(){
  document.querySelectorAll('.learnMapped, .learnSel').forEach(x => x.classList.remove('learnMapped', 'learnSel'));
  if (!midiCtl.learning) return;
  midiCtl.map.forEach(m => { const el = elFor(m); if (el) el.classList.add('learnMapped'); });
  const s = midiCtl.target && elFor(midiCtl.target); if (s) s.classList.add('learnSel');
  $('#learnMsg').textContent = midiCtl.target ? `${targetName(midiCtl.target)}: now press or move a control on your controller` : 'Click what you want to control (pad, scene, transition, effect, layer button or opacity, effect amount…)';
}
document.addEventListener('pointerdown', e => {
  if (!midiCtl.learning || e.target.closest('#learnDone, #setPanel')) return;
  const T = learnTargetAt(e.target);
  e.preventDefault(); e.stopPropagation();
  if (!T) return;
  midiCtl.target = T; markLearn();
}, true);
['click', 'dblclick', 'contextmenu', 'dragstart'].forEach(t => document.addEventListener(t, e => { if (midiCtl.learning && !e.target.closest('#learnDone, #setPanel')){ e.preventDefault(); e.stopPropagation(); } }, true));
function renderMidiCtl(){
  const box = $('#midiMap'); if (!box) return;
  const sel = $('#midiCtlIn'), ins = midiAccess ? [...midiAccess.inputs.values()] : [];
  const gone = midiCtl.input !== 'all' && !ins.some(i => i.id === midiCtl.input);   // the chosen input isn't plugged in: say so (and let All be picked)
  sel.innerHTML = '<option value="all">All MIDI inputs</option>' + ins.map(i => `<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('')
    + (gone ? `<option value="${esc(midiCtl.input)}">${esc(midiCtl.inputName || 'Chosen input')} (not connected)</option>` : '');
  sel.value = midiCtl.input;
  box.innerHTML = midiCtl.map.length ? midiCtl.map.map((m, k) => `<div class="mrow"><span class="mk">${ctlName(m.key)}</span><span class="mt">${targetName(m)}</span><button data-k="${k}" class="iconbtn" title="Remove this mapping">×</button></div>`).join('')
    : '<p class="note" style="margin:0">Nothing mapped yet — press Learn.</p>';
}
