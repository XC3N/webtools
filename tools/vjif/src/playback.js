// ---------- playback ----------
function idxAt(g, t){ const c = g.cum; let lo = 0, hi = c.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (c[m] <= t) lo = m; else hi = m - 1; } return lo; }
function timeToIdx(g, t){
  const D = g.total; let tt;
  if (g.loop === 'loop') tt = mod(t, D);
  else if (g.loop === 'pingpong'){ const c = mod(t, 2*D); tt = c < D ? c : Math.max(0, 2*D - c - 1e-6); }
  else tt = clamp(t, 0, D - 1e-6);
  return idxAt(g, tt);
}
function stepToIdx(g, s){
  const F = g.seq.length;
  if (g.loop === 'loop') return mod(s, F);
  if (g.loop === 'pingpong'){ const P = Math.max(1, 2*F - 2), c = mod(s, P); return c < F ? c : P - c; }
  return clamp(s, 0, F - 1);
}
function frameIndex(c, g, now){ return g.seq[seqIndex(c, g, now)]; }
// Timing maps time since trigger to a position; Loop (inside timeToIdx/stepToIdx) handles the end;
// Restart (any timing) jumps back to the start every N beats.
function seqIndex(c, g, now){
  let b = clock.beat - c.startBeat;
  if (g.restart) b = mod(b, g.restart);
  switch (g.sync){
    case 'stretch':                                  // Fit: one cycle = loop length (ping-pong: the round trip)
      return timeToIdx(g, b / g.beats * g.total * (g.loop === 'pingpong' ? 2 : 1));
    case 'step':                                     // Step: every frame lasts `subdiv` frames per beat
      return stepToIdx(g, Math.floor(b * g.subdiv + 1e-6));
    default:                                         // Free: own timing × speed (beat-based while restarting)
      return timeToIdx(g, (g.restart ? b * 60000 / clock.bpm : now - c.startTime) * g.speed);
  }
}
// one cycle in beats (null = free-running, tempo-independent)
function cycleBeats(g){
  const pp = g.loop === 'pingpong';
  if (g.sync === 'stretch') return g.beats;
  if (g.sync === 'step'){ const F = g.seq.length; return (pp ? Math.max(1, 2*F - 2) : F) / g.subdiv; }
  return null;
}

// Snap quantizes forward: a hit waits for the next beat / bar. A hit up to SNAP_GRACE of the unit late counts as on it
// (it starts that far in, so it stays in time).
const SNAP_GRACE = 0.125;
const pending = new Map();                           // pad → { beat, released }
// swap (Alt held): the GIF takes the layer for itself — the others on it go (it takes over the placement of the selected one)
function trigger(p, swap = false){
  if (!pads[p].gif) return;
  const el = pads[p].el; el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  const at = snapBeat(clock.beat);
  if (at <= clock.beat) return fire(p, at, false, swap);
  pending.set(p, { beat: at, released: false, swap });
  el.classList.add('wait');
}
function firePending(){
  if (pendingLive !== null && clock.beat >= pendingLive - 1e-9) doGoLive(pendingLive);
  if (pendingScene && clock.beat >= pendingScene.beat - 1e-9){ const q = pendingScene; pendingScene = null; gotoScene(q.i, q.beat); }
  for (const [p, q] of pending) if (clock.beat >= q.beat - 1e-9 || !pads[p].gif){
    pending.delete(p); pads[p].el.classList.remove('wait'); fire(p, q.beat, q.released, q.swap);
  }
}
function fire(p, beat, released = false, swap = false){
  const g = pads[p].gif; if (!g) return;
  // a GIF lives on one layer at most: if it's on any layer, restart it there; otherwise add it to the edited layer
  let L = layers.find(L => L.clips.some(c => c.pad === p)) || layers[target];
  let c = L.clips.find(c => c.pad === p); const n0 = L.clips.length;
  if (swap){                                         // alone on the layer, where the selected GIF was
    if (!c){ c = selClip(L.i) || L.clips[0] || newClip(p); c.pad = p; c.env = null; }
    L.clips = [c];
  } else if (!c){
    if (L.clips.length >= MAX_CLIPS) return refuse(L);
    c = newClip(p); L.clips.push(c);
  }
  if (swap || L.clips.length !== n0) touched.edit = true;   // a GIF added to a layer (or taking it over) is an undo step
  c.startBeat = beat; c.startTime = beatTime(beat);
  // fade one-shot: start from wherever the last fade is now, so a fast retrigger doesn't flicker
  if (g.trig === 'fade') c.env = { t0: beat, from: envLevel(c, g, clock.beat), rel: null, noGate: released };
  L.sel = c; L.on = true;
  selectPad(p, true); uiLater(UI.LAYERS | UI.XF);   // the panels follow after the frame is drawn
}
// pad / key released: ends a gated fade (a release before a snapped hit fires turns that hit into a plain one-shot)
function release(p){
  const q = pending.get(p); if (q){ q.released = true; return; }
  const g = pads[p].gif; if (!g || g.trig !== 'fade' || !g.env.gate) return;
  for (const L of layers) for (const c of L.clips) if (c.pad === p && c.env && c.env.rel === null) c.env.rel = Math.max(clock.beat, c.env.t0);
}
// Ctrl (⌘ on a Mac) held: what a click would delete or reset is marked
const DEL_KEYS = ['Control', 'Meta'];   // Ctrl (⌘ on a Mac) + click deletes
addEventListener('keydown', e => { if (DEL_KEYS.includes(e.key)) document.body.classList.add('del'); if (e.key === 'Alt'){ e.preventDefault(); document.body.classList.add('alt'); } });
addEventListener('keyup', e => { if (DEL_KEYS.includes(e.key)) document.body.classList.remove('del'); if (e.key === 'Alt'){ e.preventDefault(); document.body.classList.remove('alt'); } });   // (no browser menu on Alt)
function releaseAll(){ document.body.classList.remove('del', 'alt'); heldPre = -1; pads.forEach((_, i) => release(i)); fxSt.forEach((_, i) => fxUp(i)); if (live.blackOn){ setBlack(false); updLiveTag(); } setFreeze(false); }
window.addEventListener('blur', releaseAll);         // keys held while switching windows would otherwise stay down

// ---------- fade one-shot envelope ----------
const ease = (g, t) => g.env.curve === 'smooth' ? t * t * (3 - 2 * t) : t;
// opacity factor 0..1 of a fade one-shot clip at `beat`. Fade in starts from E.from; fade out from wherever it is then.
// fade lengths in beats. Length "One play": the whole fade lasts exactly one cycle of the GIF (hold fills the gap;
// if fade in + out are longer than the cycle, both shrink in proportion)
function envTimes(g){
  const S = g.env; let { a, h, r } = S;
  if (S.len === 'gif' && !S.gate){
    let cyc = cycleBeats(g);
    if (cyc === null) cyc = g.total * (g.loop === 'pingpong' ? 2 : 1) / g.speed * clock.bpm / 60000;
    if (g.restart) cyc = Math.min(cyc, g.restart);
    if (a + r > cyc){ const k = cyc / (a + r); a *= k; r *= k; }
    h = cyc - a - r;
  }
  return { a, h, r };
}
function envLevel(c, g, beat){
  const E = c.env; if (!E) return 0;
  const S = g.env, T = envTimes(g), gate = S.gate && !E.noGate, aDur = T.a * (1 - E.from);
  const att = x => x < 0 ? E.from : (aDur > 0 && x < aDur) ? E.from + (1 - E.from) * ease(g, x / aDur) : 1;
  const x = beat - E.t0;
  let rs;                                            // release start, beats after t0
  if (gate){ if (E.rel === null) return att(x); rs = E.rel - E.t0; }
  else rs = aDur + T.h;
  if (x < rs) return att(x);
  const top = att(rs), rDur = T.r * top;
  if (rDur <= 0) return 0;
  const q = (x - rs) / rDur;
  return q >= 1 ? 0 : top * (1 - ease(g, q));
}

// ---------- automation (LFOs) ----------
const lfoDef = k => { const t = LFO_T.find(t => t[0] === k); return { on: false, min: t[7], max: t[8], shape: t[9], per: t[10], ph: 0, sync: 'clock' }; };
function rnd(seed, n){ let h = Math.imul(seed ^ Math.imul(n | 0, 0x9E3779B1), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
// position in cycles (whole part = cycle number)
function lfoPos(A, c){ return (A.sync === 'trig' ? clock.beat - c.startBeat : clock.beat) / A.per + A.ph; }
function lfoShape(A, pos, seed){
  const n = Math.floor(pos), f = pos - n;
  switch (A.shape){
    case 'tri': return f < 0.5 ? 2 * f : 2 - 2 * f;
    case 'up': return f;
    case 'down': return 1 - f;
    case 'square': return f < 0.5 ? 1 : 0;
    case 'pulse': return f < 0.25 ? 1 : 0;
    case 'sh': return rnd(seed, n);
    case 'drift': { const a = rnd(seed, n), b = rnd(seed, n + 1); return a + (b - a) * (1 - Math.cos(Math.PI * f)) / 2; }
    default: return 0.5 - 0.5 * Math.cos(2 * Math.PI * f);        // sine, starting at Min
  }
}
let lfoPeek = null;   // { g, k, end: 'min' | 'max', t }: set while Min / Max are dragged in GIF › Auto
const lfoSeed = (g, i) => (g.seed ?? g.uid) * 16 + i;   // a copy keeps its original's random automation
const lfoAny = g => LFO_T.some(t => g.lfo[t[0]] && g.lfo[t[0]].on);
// the clip as drawn right now: automation and the fade envelope applied on a copy (the clip itself keeps its settings)
function effClip(c, g){
  let e = null;
  for (let i = 0; i < LFO_T.length; i++){
    const k = LFO_T[i][0], A = g.lfo[k]; if (!A || !A.on) continue;
    if (!e) e = Object.assign({}, c);
    const pk = lfoPeek && lfoPeek.g === g && lfoPeek.k === k && performance.now() - lfoPeek.t < 700 ? lfoPeek.end : null;   // Min / Max being set: show that end, wherever the cycle is
    const v = pk ? A[pk] : A.min + (A.max - A.min) * lfoShape(A, lfoPos(A, c), lfoSeed(g, i));
    switch (k){
      case 'x': e.x += v; break;          case 'y': e.y += v; break;
      case 'zoom': e.sx *= v; e.sy *= v; break;
      case 'sx': e.sx *= v; break;        case 'sy': e.sy *= v; break;
      case 'rot': e.rot += v; break;      case 'op': e.alpha *= v; break;
      case 'h': e.H = v; break;           case 's': e.S = v; break;         case 'v': e.V = v; break;
    }
  }
  if (g.trig === 'fade'){ if (!e) e = Object.assign({}, c); e.alpha *= envLevel(c, g, clock.beat); }
  return e || c;
}
function refuse(L){ const r = L.row; r.classList.remove('refused'); void r.offsetWidth; r.classList.add('refused'); }
function removeClip(li, c){
  const L = layers[li]; if (!c) return;
  L.clips = L.clips.filter(x => x !== c); if (L.sel === c) L.sel = null;
  syncLayerUI(); syncXfUI();
}