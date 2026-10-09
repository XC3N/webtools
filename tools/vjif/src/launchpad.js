// ---------- controller lights: Novation Launchpads (Pro MK3, X, Mini MK3) show VJif's state on their pads ----------
// Every mapped control lights up in its region's colour (pads amber, scenes blue, effects pink…): bright while it
// plays / is on, half-lit when loaded, faint when empty. Launchpad map shows what is where.
// Mechanically: the Launchpad is put in Programmer mode (a SysEx message), where each pad / button is one note or CC
// whose number is also its LED's number; colours go out as RGB SysEx (0–127 per channel), only for LEDs that changed.
const LP_MODELS = [[/LPProMK3|Launchpad Pro MK3/i, 0x0E, 'Launchpad Pro MK3'], [/LPX|Launchpad X/i, 0x0C, 'Launchpad X'], [/LPMiniMK3|Launchpad Mini MK3/i, 0x0D, 'Launchpad Mini MK3']];
const lp = { on: Prefs.get('vjif-lights') === '1', out: null, dev: 0, name: '', sent: new Map(), timer: 0, access: null };
const lpSys = (...b) => { if (lp.out) try { lp.out.send([0xF0, 0x00, 0x20, 0x29, 0x02, lp.dev, ...b, 0xF7]); } catch (e) {} };
// the Launchpad's own MIDI port (not its DIN or DAW ports)
function lpFind(acc){
  for (const o of acc.outputs.values()){
    if (/DAW|DIN/i.test(o.name)) continue;
    const m = LP_MODELS.find(M => M[0].test(o.name)); if (m) return { out: o, dev: m[1], name: m[2] };
  }
  return null;
}
async function lpStart(){
  if (!navigator.requestMIDIAccess) return toast('Web MIDI is not available in this browser');
  try { lp.access = lp.access || await navigator.requestMIDIAccess({ sysex: true }); }   // colours need SysEx: Chrome asks once
  catch (e) { lpSetOn(false); return toast('Lights need MIDI SysEx access, which was not allowed'); }
  lp.access.onstatechange = () => { if (lp.on && !(lp.out && lp.out.state === 'connected')) lpConnect(); };
  lpConnect();
}
function lpConnect(){
  const f = lp.access && lpFind(lp.access);
  lp.out = f ? f.out : null; lp.dev = f ? f.dev : 0; lp.name = f ? f.name : ''; lp.sent.clear();
  if (lp.out){ lpSys(0x0E, 0x01); lpAllOff(); }        // Programmer mode: every pad and button is ours
  lpUI();
}
function lpAllOff(){ const s = []; for (let i = 1; i <= 108; i++) s.push(3, i, 0, 0, 0); lpSys(0x03, ...s); lp.sent.clear(); }
function lpStop(){ if (lp.out){ lpAllOff(); lpSys(0x0E, 0x00); } lp.out = null; lpUI(); }   // back to the Launchpad's own Live mode
function lpSetOn(on){
  lp.on = on; Prefs.set('vjif-lights', on ? '1' : '0');
  clearInterval(lp.timer); lp.timer = 0;
  if (on){ lpStart(); lp.timer = setInterval(lpTick, 50); } else lpStop();
  lpUI();
}
function lpUI(){
  const c = $('#lpOn'); if (!c) return; c.checked = lp.on;
  $('#lpStat').textContent = !lp.on ? '' : lp.out ? lp.name : 'no Launchpad found (plug it in)';
}
// every kind of control has its own solid colour, so the grid reads as regions; brightness says the state:
// full = playing / on / live, LP_MID = loaded / has something, LP_LOW = empty (still shows where the region is)
const LP_MID = 0.35, LP_LOW = 0.1;
const LP_REG = { pad: [255, 160, 0], scene: [0, 110, 255], trans: [0, 220, 190], fx: [255, 30, 170], pre: [150, 60, 255],
  black: [255, 0, 0], freeze: [190, 225, 255], tap: [255, 255, 255], sync: [255, 90, 0], brb: [255, 220, 0], opacity: [120, 120, 120], amount: [120, 120, 120] };
const lpCx = new OffscreenCanvas(1, 1).getContext('2d');
const hexRgb3 = css => { lpCx.fillStyle = '#000'; lpCx.fillStyle = css; const h = lpCx.fillStyle; return h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : [255, 255, 255]; };   // any CSS colour → r, g, b
const lpRegion = m => m.t === 'layer' ? hexRgb3(LCOL[m.i]) : m.t === 'fx' && m.i >= NFX ? LP_REG.pre : LP_REG[m.t] || [120, 120, 120];
const lpDim = (c, k) => c.map(v => v * k);
// what one mapped control should show now (r, g, b 0–255)
function lpColour(m, t){
  const blink = (t / 250 | 0) % 2 === 0, R = lpRegion(m), at = k => lpDim(R, k);
  switch (m.t){
    case 'pad': { const g = pads[m.i] && pads[m.i].gif; if (!g) return at(LP_LOW);
      if (pending.has(m.i)) return blink ? [255, 255, 255] : at(LP_MID);
      return layers.some(L => L.on && L.clips.some(c => c.pad === m.i)) ? R : at(LP_MID); }
    case 'scene': if (pendingScene && pendingScene.i === m.i) return blink ? [255, 255, 255] : at(LP_MID);
      if (m.i === sceneIdx) return R;
      return sceneCount(m.i) || scenePads(m.i) ? at(LP_MID) : at(LP_LOW);
    case 'trans': return m.i === trSel ? R : at(LP_MID);
    case 'fx': return fxLevel(m.i, clock.beat) > 0.05 ? R : at(LP_MID);
    case 'layer': return layers[m.i].on ? R : at(LP_MID);
    case 'black': return live.blackOn ? R : at(LP_MID);
    case 'freeze': return live.freeze || live.freezeReq ? R : at(LP_MID);
    case 'tap': return (clock.beat % 1) < 0.15 ? R : at(LP_MID);     // the beat
    case 'sync': return (clock.beat % 4) < 0.15 ? R : at(LP_MID);    // the downbeat
    case 'brb': return brb.on ? (blink ? R : at(LP_MID)) : at(LP_MID);
    default: return null;                             // faders: nothing to light
  }
}
function lpTick(){
  if (!lp.on || !lp.out) return;
  const t = performance.now(), want = new Map();
  for (const m of midiCtl.map){
    const n = +m.key.split('.')[1]; if (!(n >= 1 && n <= 108)) continue;   // the LED with the control's number
    const c = lpColour(m, t); if (c) want.set(n, c.map(v => Math.max(0, Math.min(127, Math.round(v / 2)))));
  }
  const s = [];
  for (const [n, c] of want){ const k = c.join(); if (lp.sent.get(n) !== k){ lp.sent.set(n, k); s.push(3, n, ...c); } }
  for (const n of [...lp.sent.keys()]) if (!want.has(n)){ lp.sent.delete(n); s.push(3, n, 0, 0, 0); }   // a mapping went: its light too
  for (let i = 0; i < s.length; i += 400) lpSys(0x03, ...s.slice(i, i + 400));
}
// ---- a ready-made layout for the 8×8 grid (Programmer mode: the pad in row r (1 = bottom), column c is note r·10 + c) ----
//   rows 8–6: the 18 GIF pads, laid out like the keyboard (QWE ASD ZXC | RTY FGH VBN), then layers 1–4, Blackout, Freeze
//   rows 5–3: scenes as on the numpad (7 8 9 / 4 5 6 / 1 2 3), effects F1–F12 in 3 rows of 4, then Tap, Sync, BRB
//   row 2: transition presets 1–8 (9 on the right-hand button) · row 1: effect presets 1–8 (9 on the right-hand button)
function lpLayout(){
  const map = [], note = (r, c) => `n0.${r * 10 + c}`, cc = n => `c0.${n}`;
  for (let k = 0; k < 18; k++){ const blk = k < 9 ? 0 : 1, j = k % 9; map.push({ key: note(8 - Math.floor(j / 3), 1 + blk * 3 + j % 3), t: 'pad', i: k }); }
  [[8, 7, 'layer', 0], [8, 8, 'layer', 1], [7, 7, 'layer', 2], [7, 8, 'layer', 3], [6, 7, 'black', 0], [6, 8, 'freeze', 0]].forEach(([r, c, t, i]) => map.push({ key: note(r, c), t, i }));
  for (let s = 0; s < 9; s++) map.push({ key: note(3 + Math.floor(s / 3), 1 + s % 3), t: 'scene', i: s });   // scene 1 bottom left, like the numpad
  for (let f = 0; f < 12; f++) map.push({ key: note(5 - Math.floor(f / 4), 4 + f % 4), t: 'fx', i: f });
  [[5, 8, 'tap'], [4, 8, 'sync'], [3, 8, 'brb']].forEach(([r, c, t]) => map.push({ key: note(r, c), t, i: 0 }));
  for (let k = 0; k < 8; k++){ map.push({ key: note(2, 1 + k), t: 'trans', i: k }); map.push({ key: note(1, 1 + k), t: 'fx', i: NFX + k }); }
  map.push({ key: cc(29), t: 'trans', i: 8 }, { key: cc(19), t: 'fx', i: NFX + 8 });
  const keys = new Set(map.map(m => m.key));
  midiCtl.map = midiCtl.map.filter(m => !keys.has(m.key)).concat(map); saveMidiCtl(); renderMidiCtl(); markLearn();
  if (!midiAccess) getMidi().then(() => { bindCtlInputs(); fillMidi(); renderMidiCtl(); }).catch(() => {});
  toast2(`Launchpad layout loaded: ${map.length} pads and buttons mapped (your other mappings are kept)`);
}
// ---- Launchpad map: the Pro MK3's pads and buttons in Programmer mode, with what each one is mapped to ----
// grid pads send notes 11–88 (row·10 + column, row 1 at the bottom); the buttons around it send CCs: top row 91–98,
// left 10–80, right 19–89, the two bottom rows 101–108 and 1–8 (the X and the Mini have only the top row and the right column)
function lpShort(m){
  switch (m.t){
    case 'pad': return PAD_LABELS[m.i]; case 'scene': return 'S' + (m.i + 1); case 'trans': return 'T' + (m.i + 1);
    case 'fx': return m.i < NFX ? FX_LABELS[m.i] : 'P' + (m.i - NFX + 1); case 'layer': return 'L' + (m.i + 1);
    case 'opacity': return 'L' + (m.i + 1) + '%'; case 'amount': return 'amt';
    case 'black': return 'BLK'; case 'freeze': return 'FRZ'; case 'tap': return 'TAP'; case 'sync': return 'SYNC'; case 'brb': return 'BRB';
  }
  return '?';
}
function lpMapHTML(){
  const find = (kind, n) => midiCtl.map.filter(m => { const [k, v] = m.key.split('.'); return k[0] === kind && +v === n; });
  const css = c => `rgb(${c.map(v => v | 0).join()})`;
  const cell = (kind, n, btn) => { if (n == null) return '<i class="lpx none"></i>';
    const ms = find(kind, n), m = ms[0];
    if (!m) return `<i class="lpx${btn ? ' btn' : ''}" title="${kind === 'n' ? 'Note' : 'CC'} ${n}: not mapped"></i>`;
    const c = lpRegion(m), lab = ms.map(lpShort).join(' ');
    return `<i class="lpx on${btn ? ' btn' : ''}" style="--c:${css(c)}" title="${ms.map(targetName).join(' · ')} (${kind === 'n' ? 'note' : 'CC'} ${n})">${lab}</i>`; };
  let h = '<div class="lpgrid">';
  h += cell('c', null) + [1, 2, 3, 4, 5, 6, 7, 8].map(c => cell('c', 90 + c, 1)).join('') + cell('c', null);
  for (let r = 8; r >= 1; r--) h += cell('c', r * 10, 1) + [1, 2, 3, 4, 5, 6, 7, 8].map(c => cell('n', r * 10 + c)).join('') + cell('c', r * 10 + 9, 1);
  h += cell('c', null) + [1, 2, 3, 4, 5, 6, 7, 8].map(c => cell('c', 100 + c, 1)).join('') + cell('c', null);
  h += cell('c', null) + [1, 2, 3, 4, 5, 6, 7, 8].map(c => cell('c', c, 1)).join('') + cell('c', null);
  h += '</div><div class="lpleg">' + [['pad', 'GIF pads'], ['scene', 'Scenes'], ['fx', 'Effects'], ['pre', 'Effect presets'], ['trans', 'Transitions'], ['black', 'Blackout'], ['freeze', 'Freeze'], ['tap', 'Tap'], ['sync', 'Sync'], ['brb', 'BRB']]
    .map(([k, n]) => `<span><i style="background:${css(LP_REG[k])}"></i>${n}</span>`).join('') + '<span><i style="background:linear-gradient(90deg,' + LCOL.join(',') + ')"></i>Layers</span></div>';
  return h;
}
function lpMapOpen(){ $('#lpMapBody').innerHTML = lpMapHTML(); document.body.appendChild($('#lpMapPanel')); $('#lpMapPanel').hidden = false; }   // last in the page: over Settings or Help, whichever opened it
$('#lpMapClose').addEventListener('click', () => { $('#lpMapPanel').hidden = true; });
$('#lpMapPanel').addEventListener('pointerdown', e => { if (e.target.id === 'lpMapPanel') $('#lpMapPanel').hidden = true; });
document.querySelectorAll('.lpMapBtn').forEach(b => b.addEventListener('click', lpMapOpen));
$('#lpOn').addEventListener('change', e => lpSetOn(e.target.checked));
$('#lpLayout').addEventListener('click', lpLayout);
if (lp.on){ lp.on = false; setTimeout(() => lpSetOn(true), 500); }   // lights were on last time: back on once VJif is up
