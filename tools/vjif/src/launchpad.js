// ---------- controller lights: Novation Launchpads (Pro MK3, X, Mini MK3) show VJif's state on their pads ----------
// Every mapped control lights up for what it does: a pad in its GIF's colour (bright while it plays, dim when loaded,
// off when empty), the live scene white, the armed transition, effects that are on, layers in their colours…
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
// a GIF's own colour: the average of its first frame's thumbnail, lifted so dark GIFs still light up
function lpGifCol(g){
  if (g.ledCol && g.ledFx === g.fxVer) return g.ledCol;
  let r = 0, gr = 0, b = 0;
  try { const f = fxImage(g, g.startF), c = new OffscreenCanvas(8, 8), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(f, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 32){ r += d[i]; gr += d[i + 1]; b += d[i + 2]; n++; }
    if (n){ r /= n; gr /= n; b /= n; } } catch (e) {}
  const mx = Math.max(r, gr, b, 1), k = 255 / mx;    // full brightness, same hue
  g.ledFx = g.fxVer; return g.ledCol = mx < 8 ? [255, 255, 255] : [r * k, gr * k, b * k];
}
const lpCx = new OffscreenCanvas(1, 1).getContext('2d');
const hexRgb3 = css => { lpCx.fillStyle = '#000'; lpCx.fillStyle = css; const h = lpCx.fillStyle; return h[0] === '#' ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : [255, 255, 255]; };   // any CSS colour → r, g, b
const lpDim = (c, k) => c.map(v => v * k);
// what one mapped control should show now (r, g, b 0–255)
function lpColour(m, t){
  const blink = (t / 250 | 0) % 2 === 0, OFF = [0, 0, 0], SIG = lp.sig;
  switch (m.t){
    case 'pad': { const g = pads[m.i] && pads[m.i].gif; if (!g) return OFF;
      if (pending.has(m.i)) return blink ? [255, 255, 255] : lpDim(lpGifCol(g), 0.3);
      const live = layers.some(L => L.on && L.clips.some(c => c.pad === m.i));
      return live ? lpGifCol(g) : lpDim(lpGifCol(g), 0.15); }
    case 'scene': if (pendingScene && pendingScene.i === m.i) return blink ? [255, 255, 255] : OFF;
      if (m.i === sceneIdx) return [255, 255, 255];
      return sceneCount(m.i) || scenePads(m.i) ? [40, 70, 110] : OFF;
    case 'trans': return m.i === trSel ? SIG : [30, 30, 30];
    case 'fx': return fxLevel(m.i, clock.beat) > 0.05 ? (m.i < NFX ? SIG : [255, 60, 200]) : (m.i < NFX ? lpDim(SIG, 0.12) : [40, 8, 30]);
    case 'layer': { const c = hexRgb3(LCOL[m.i]); return layers[m.i].on ? c : lpDim(c, 0.12); }
    case 'black': return live.blackOn ? [255, 0, 0] : [40, 0, 0];
    case 'freeze': return live.freeze || live.freezeReq ? [80, 160, 255] : [10, 20, 40];
    case 'tap': return (clock.beat % 1) < 0.15 ? [255, 255, 255] : [30, 30, 30];   // the beat
    case 'sync': return (clock.beat % 4) < 0.15 ? [255, 160, 0] : [40, 25, 0];      // the downbeat
    case 'brb': return brb.on ? (blink ? [255, 160, 0] : [60, 40, 0]) : [30, 20, 0];
    default: return null;                             // faders: nothing to light
  }
}
function lpTick(){
  if (!lp.on || !lp.out) return;
  const t = performance.now(), want = new Map();
  if (!lp.sig || t - lp.sigT > 1000){ lp.sig = hexRgb3(Theme.color('--sig') || '#5fd3b0'); lp.sigT = t; }   // the theme's signal colour
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
$('#lpOn').addEventListener('change', e => lpSetOn(e.target.checked));
$('#lpLayout').addEventListener('click', lpLayout);
if (lp.on){ lp.on = false; setTimeout(() => lpSetOn(true), 500); }   // lights were on last time: back on once VJif is up
