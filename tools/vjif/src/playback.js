// ---------- playback ----------
function idxAt(g, t){ const c = g.cum; let lo = 0, hi = c.length - 1; while (lo < hi){ const m = (lo + hi + 1) >> 1; if (c[m] <= t) lo = m; else hi = m - 1; } return lo; }
function timeToIdx(g, t){
  const D = g.total; let tt;
  if (g.loop === 'loop') tt = mod(t, D);
  else if (g.loop === 'reverse') tt = D - 1e-6 - mod(t, D);   // end to start, then wrap back to the end (0.87.3)
  else if (g.loop === 'pingpong'){ const c = mod(t, 2*D); tt = c < D ? c : Math.max(0, 2*D - c - 1e-6); }
  else tt = clamp(t, 0, D - 1e-6);
  return idxAt(g, tt);
}
function stepToIdx(g, s){
  const F = g.seq.length;
  if (g.loop === 'loop') return mod(s, F);
  if (g.loop === 'reverse') return F - 1 - mod(s, F);
  if (g.loop === 'pingpong'){ const P = Math.max(1, 2*F - 2), c = mod(s, P); return c < F ? c : P - c; }
  return clamp(s, 0, F - 1);
}
function frameIndex(c, g, now){
  const O = g.outro && g.outroP && g.trig === 'fade' && c.env, rb = O ? (g.env.gate ? c.env.rel : (envOf(c, g, clock.beat) || c.env).t0 + (T => T.a + T.h)(envTimes(g))) : null;
  if (O && rb != null && clock.beat >= rb){   // Outro (0.99.29): from the let-go (Hold) or the fade out (One shot), the frames after Out once, then the last one stays
    const tb = clock.beat - rb, P = g.outroP;
    if (g.sync === 'step'){ const s = Math.floor(tb * g.subdiv + 1e-6); return P.seq[Math.min(s, P.seq.length - 1)]; }
    const t = g.sync === 'stretch' ? tb / g.beats * g.total : tb * 60000 / clock.bpm * g.speed;
    return P.seq[idxAt(P, Math.min(t, P.total - 1e-6))]; }
  const k = seqIndex(c, g, now); return k < 0 ? g.intro.seq[-1 - k] : g.seq[k];   // (negative: a frame of the intro)
}
// Timing maps time since trigger to a position; Loop (inside timeToIdx/stepToIdx) handles the end;
// Restart (any timing) jumps back to the start every N beats.
// One shot › Repeat: it plays again by itself on every N-beat grid line; the hit or the latest grid line, whichever is later, counts
function envOf(c, g, beat){
  const E = c.env, N = g.trig === 'fade' && !g.env.gate && g.env.every; if (!N) return E;
  const t = Math.floor(beat / N + 1e-9) * N;
  if (E && t <= E.t0 + 1e-9) return E;
  // 0.99.7 (BG-054): a repeat that comes before the fade-out is over carries on from the level it's at (Retrigger › Continue), as a hit does,
  // instead of dropping to 0; Retrigger › Restart starts each repeat from 0. The level comes from the previous repeats, a few back at most.
  let from = 0;
  if (!g.env.restart){ const T = envTimes(g), K = Math.min(8, Math.ceil((T.a + T.h + T.r) / N)); let f = 0;
    for (let j = K; j >= 1; j--) f = envLevelE({ t0: t - j * N, from: f, rel: null, noGate: true }, g, t - (j - 1) * N); from = f; }
  return { t0: t, from, rel: null, noGate: true, auto: true };
}
function seqIndex(c, g, now){
  const AE = g.trig === 'fade' && g.env.every ? envOf(c, g, clock.beat) : null, auto = AE && AE.auto;
  let b = clock.beat - (auto ? AE.t0 : c.startBeat);
  if (g.restart) b = mod(b, g.restart);
  const I = g.intro;                                 // an intro (Start before In, 0.99.29): played once from the hit (and each restart), at the loop's pace, then the loop
  switch (g.sync){
    case 'stretch': {                                // Fit: one cycle = loop length (ping-pong: the round trip)
      let t = b / g.beats * g.total; if (I){ if (t < I.total) return -1 - idxAt(I, t); t -= I.total; }
      return timeToIdx(g, t * (g.loop === 'pingpong' ? 2 : 1)); }
    case 'step': {                                   // Step: every frame lasts `subdiv` frames per beat
      let s = Math.floor(b * g.subdiv + 1e-6); if (I){ if (s < I.seq.length) return -1 - Math.max(0, s); s -= I.seq.length; }
      return stepToIdx(g, s); }
    default: {                                       // Free: own timing × speed (beat-based while restarting)
      let t = (g.restart || auto ? b * 60000 / clock.bpm : now - c.startTime) * g.speed; if (I){ if (t < I.total) return -1 - idxAt(I, Math.max(0, t)); t -= I.total; }
      return timeToIdx(g, t); }
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
let clickFocus = -1, sceneLayer = 1;   // clickFocus: the pad last clicked (0.99.5); sceneLayer: where Scene pads go when the edit layer is Background / Overlay
function fire(p, beat, released = false, swap = false){
  const g = pads[p].gif; if (!g) return;
  // a GIF lives on one layer at most: if it's on any layer, restart it there; otherwise add it to its layer (0.88: Global pads
  // Overlay, Background slots Background, Scene pads the edited layer when it's Midground / Foreground, else Midground)
  let L = layers.find(L => L.clips.some(c => c.pad === p)) || layers[padLayer(p, target === 1 || target === 2 ? target : sceneLayer)];
  let c = L.clips.find(c => c.pad === p); const n0 = L.clips.length;
  if (swap && L.i !== BG_LAYER){                     // alone on the layer, where the selected GIF was (Background keeps its slots: 0.93.1)
    if (!c){ c = selClip(L.i) || L.clips[0] || newClip(p); c.pad = p; c.env = null; }
    L.clips = [c];
  } else if (!c){
    roomAt = -1; if (L.clips.length >= MAX_CLIPS && !makeRoom(L)) return refuse(L);
    c = newClip(p); if (roomAt >= 0 && roomAt <= L.clips.length) L.clips.splice(roomAt, 0, c); else L.clips.push(c); roomAt = -1;
  }
  if (swap || L.clips.length !== n0) touched.edit = true;   // a GIF added to a layer (or taking it over) is an undo step
  c.startBeat = beat; c.startTime = beatTime(beat);
  c.hitBeat = beat; c.relBeat = released ? beat : null;   // Auto › Envelope: this hit, held until the pad is let go (null)
  // fade one-shot: start from wherever the last fade is now, so a fast retrigger doesn't flicker
  // (a hit just after a snapped beat counts as on it, so the GIF stays in step, but its fade starts now: from the beat, a
  // short Fade in was already over before the GIF showed, and at Bar snap even long ones lost up to half a beat)
  if (g.trig === 'fade') c.env = { t0: Math.max(beat, clock.beat), from: g.env.restart ? 0 : envLevel(c, g, clock.beat), rel: null, noGate: released };
  L.sel = c; L.on = true;
  if (clickFocus === p){ clickFocus = -1; if (L.i !== target){ target = L.i; if (L.i === 1 || L.i === 2) sceneLayer = L.i; if (maskEd && maskEd.li !== L.i) maskClose(); } }
  selectPad(p, true); uiLater(UI.LAYERS | UI.XF);   // the panels follow after the frame is drawn
}
// 0.99.7 (QA-028): a clip is "not seen" when its GIF fades in and out on hits and is at nothing now (finished, or placed but not hit yet).
// A full layer makes room for a new GIF by sending off the one that has been unseen longest; right-clicking its pad puts it back unplayed.
const unseenClip = c => { const g = pads[c.pad] && pads[c.pad].gif; return !!g && !c.off && g.trig === 'fade' && !(c.env && clock.beat < c.env.t0) && !(envLevel(c, g, clock.beat) > 0.001); };
let roomAt = -1;   // 0.99.12 (BG: overlay stacking): the GIF that takes a sent-off GIF's place sits at the same height in the stack
function makeRoom(L){
  if (L.i === BG_LAYER) return false;
  const v = L.clips.filter(unseenClip).sort((a, b) => (a.lastSeen || 0) - (b.lastSeen || 0))[0]; if (!v) return false;
  const at = L.clips.indexOf(v); L.clips = L.clips.filter(x => x !== v); if (L.sel === v) L.sel = null; touched.edit = true;
  roomAt = at; return true;   // (0.99.12: no message: the dimmed chips say what is not showing)
}
function placeUnseen(p){   // right-click on a pad: its GIF onto its layer, not played
  const g = pads[p].gif; if (!g || isBgPad(p) || layers.some(L => L.clips.some(c => c.pad === p))) return false;
  const L = layers[padLayer(p, target === 1 || target === 2 ? target : sceneLayer)];
  if (L.clips.length >= MAX_CLIPS && !makeRoom(L)){ refuse(L); return false; }
  const c = newClip(p); c.lastSeen = performance.now(); L.clips.push(c); L.sel = c; touched.edit = true; uiLater(UI.LAYERS | UI.XF); return true;
}
// pad / key released: ends a gated fade (a release before a snapped hit fires turns that hit into a plain one-shot)
function release(p){
  const q = pending.get(p); if (q){ q.released = true; return; }
  for (const L of layers) for (const c of L.clips) if (c.pad === p && c.relBeat === null) c.relBeat = Math.max(clock.beat, c.hitBeat);
  const g = pads[p].gif; if (!g || g.trig !== 'fade' || !g.env.gate) return;
  for (const L of layers) for (const c of L.clips) if (c.pad === p && c.env && c.env.rel === null) c.env.rel = Math.max(clock.beat, c.env.t0);
}
// Ctrl (⌘ on a Mac) held: what a click would delete or reset is marked
const DEL_KEYS = ['Control', 'Meta'];   // Ctrl (⌘ on a Mac) + click deletes
// after a Ctrl+drag copy, the red "Ctrl+click removes" outline stays off until Ctrl is let go (you were copying, not deleting)
let delHush = false; const hushDel = () => { delHush = true; document.body.classList.remove('del'); };
const isRm = e => isDel(e) && !delHush;   // Ctrl+click removes / resets, but not with the Ctrl still held from a copy: only after Ctrl is let go and pressed again
addEventListener('keydown', e => { if (DEL_KEYS.includes(e.key) && !delHush) document.body.classList.add('del'); if (e.key === 'Alt'){ e.preventDefault(); document.body.classList.add('alt'); } });
addEventListener('keyup', e => { if (DEL_KEYS.includes(e.key)){ document.body.classList.remove('del'); delHush = false; } if (e.key === 'Alt'){ e.preventDefault(); document.body.classList.remove('alt'); } });   // (no browser menu on Alt)
function releaseAll(){ document.body.classList.remove('del', 'alt'); heldPre = -1;  heldFxKey = -1; pads.forEach((_, i) => release(i)); fxSt.forEach((_, i) => fxUp(i)); if (live.blackOn){ setBlack(false); updLiveTag(); } setFreeze(false); }
window.addEventListener('blur', releaseAll);         // keys held while switching windows would otherwise stay down

// ---------- fade one-shot envelope ----------
const ease = (g, t) => g.env.curve === 'smooth' ? t * t * (3 - 2 * t) : t;
// opacity factor 0..1 of a fade one-shot clip at `beat`. Fade in starts from E.from; fade out from wherever it is then.
// fade lengths in beats. Length "One play": the whole fade lasts exactly one cycle of the GIF (hold fills the gap;
// if fade in + out are longer than the cycle, both shrink in proportion)
function envTimes(g){
  const S = g.env; let { a, h, r } = S;
  if (S.len === 'gif' && !S.gate){
    const T = g.media && g.media.text, mq = T && T.marquee && g.lfo.x && g.lfo.x.on ? g.lfo.x.per : 0;   // a marquee: one play = once across the screen
    let cyc = mq || cycleBeats(g);
    if (cyc === null) cyc = g.total * (g.loop === 'pingpong' ? 2 : 1) / g.speed * clock.bpm / 60000;
    if (g.restart) cyc = Math.min(cyc, g.restart);
    if (a + r > cyc){ const k = cyc / (a + r); a *= k; r *= k; }
    h = cyc - a - r;
  }
  return { a, h, r };
}
function envLevel(c, g, beat){ return envLevelE(envOf(c, g, beat), g, beat); }
function envLevelE(E, g, beat){
  if (!E) return 0;
  const S = g.env, T = envTimes(g), gate = S.gate && !E.noGate;
  // a retrigger mid-fade (from > 0) carries on along the same fade-in curve from the point that's at that level (0.99.3: Smooth
  // used to start a new S-curve there): u0 is where on the curve that is, found once per hit
  if (E.from > 0 && E.u0 === undefined){ let lo = 0, hi = 1; for (let k = 0; k < 20; k++){ const m = (lo + hi) / 2; if (ease(g, m) < E.from) lo = m; else hi = m; } E.u0 = lo; }
  const u0 = E.from > 0 ? E.u0 : 0, aDur = T.a * (1 - u0);
  const att = x => x < 0 ? E.from : (aDur > 0 && x < aDur) ? ease(g, u0 + x / T.a) : 1;
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
const lfoDef = k => { const t = LFO_T.find(t => t[0] === k); return { on: false, min: t[7], max: t[8], shape: t[9] === 'down' ? 'up' : t[9], per: t[10], ph: 0, sk: 0.5, hold: false, inv: t[9] === 'down', sync: 'clock', gap: 0, em: 'off', ea: 0, ed: 4, es: 0, er: 1 }; };
function rnd(seed, n){ let h = Math.imul(seed ^ Math.imul(n | 0, 0x9E3779B1), 0x85EBCA6B); h ^= h >>> 13; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
// position in cycles (whole part = cycle number)
function lfoPos(A, c){ return lfoPosT(A, A.sync === 'trig' ? clock.beat - c.startBeat : clock.beat); }
// Gap: after each cycle the LFO waits (holding where the cycle ended) before the next one starts
function lfoPosT(A, t){
  const g = A.gap || 0; if (!g) return t / A.per + A.ph;
  const L = A.per + g, u = t + A.ph * A.per, n = Math.floor(u / L), r = u - n * L;
  return n + (r < A.per ? r / A.per : 0.999999);
}
function lfoShape(A, pos, seed){ const v = lfoShape0(A, pos, seed); return A.inv ? 1 - v : v; }   // Invert (0.89): upside down
function lfoShape0(A, pos, seed){
  const n = Math.floor(pos), k = A.sk ?? 0.5, f0 = pos - n, f = k === 0.5 ? f0 : f0 < k ? 0.5 * f0 / k : 0.5 + 0.5 * (f0 - k) / (1 - k);   // Skew (0.88): the cycle's first half squeezed into Skew of it (a Square at 25% = the old Pulse; a Tri peaks at Skew)
  switch (A.shape){
    case 'tri': return f < 0.5 ? 2 * f : 2 - 2 * f;
    case 'up': return f;
    case 'square': return f < 0.5 ? 1 : 0;
    case 'sh': return rnd(seed, n);
    case 'drift': { const a = rnd(seed, n), b = rnd(seed, n + 1); return a + (b - a) * (1 - Math.cos(Math.PI * f)) / 2; }
    default: return 0.5 - 0.5 * Math.cos(2 * Math.PI * f);        // sine, starting at Min
  }
}
// Auto › Envelope, run by each pad hit: Attack and Decay always play out (a quick tap gets them whole), then Sustain while
// the pad is held, then Release. Before the first hit (or after a scene starts) it rests at 0.
function lfoEnv(A, c, beat){
  if (c.hitBeat === undefined) return 0;
  const a = A.ea ?? 0, d = A.ed ?? 4, s = A.es ?? 0, r = A.er ?? 1, x = beat - c.hitBeat;
  if (x < 0) return 0;
  const L = A.eloop ? a + d + r : 0;   // Loop (0.90): Attack, Decay, then down to 0 over Release, over and over while held
  const ad = !L || L <= 1e-6 ? t => t < a ? t / a : t < a + d ? 1 - (1 - s) * (t - a) / d : s
    : t => { t %= L; return t < a ? t / a : t < a + d ? 1 - (1 - s) * (t - a) / d : r > 0 ? s * (1 - (t - a - d) / r) : 0; };
  if (c.relBeat === null) return ad(x);
  const rs = L ? Math.max(0, (c.relBeat ?? c.hitBeat) - c.hitBeat) : Math.max(a + d, (c.relBeat ?? c.hitBeat) - c.hitBeat);   // (looping: let go fades from wherever it is)
  if (x < rs) return ad(x);
  const top = ad(rs); return r > 0 && x - rs < r ? top * (1 - (x - rs) / r) : 0;
}
// an LFO's value from Min (0) to Max (1): its shape; Envelope › Depth scales the swing (resting at Min); Only: the envelope alone
function lfoUnit(A, c, seed, beat){
  const m = A.em || 'off';
  if (m === 'only') return lfoEnv(A, c, beat);
  const g = A.hold && pads[c.pad] && pads[c.pad].gif, RE = g && g.trig === 'fade' && g.env.every && !g.env.gate ? envOf(c, g, beat) : null;   // 0.99.20: a One shot Repeat is a hit of its own: Hold samples again at each repeat
  const w = lfoShape(A, A.hold ? lfoPosT(A, RE && RE.auto ? RE.t0 : c.hitBeat ?? c.startBeat ?? 0) : lfoPos(A, c), seed);   // Hold: the value the LFO had at the last pad hit, kept until the next one (on the bar's clock, so each hit lands somewhere new)
  return m === 'depth' ? w * lfoEnv(A, c, beat) : w;
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
    const v = pk ? A[pk] : A.min + (A.max - A.min) * lfoUnit(A, c, lfoSeed(g, i), clock.beat);
    switch (k){
      case 'x': e.x += v; break;          case 'y': e.y += v; break;
      case 'zoom': e.sx *= v; e.sy *= v; break;
      case 'sx': e.sx *= v; break;        case 'sy': e.sy *= v; break;
      case 'rot': e.rot += v; break;      case 'op': e.alpha *= v; break;
      case 'h': e.H = v; break;           case 's': e.S = v; break;         case 'v': e.V = v; break;
      case 'fx': if (v > 0.5) e.flipX = !e.flipX; break;   case 'fy': if (v > 0.5) e.flipY = !e.flipY; break;
    }
  }
  if (g.trig === 'fade'){ if (!e) e = Object.assign({}, c); e.alpha *= envLevel(c, g, clock.beat); }
  if (c.off){ if (!e) e = Object.assign({}, c); e.alpha = 0; }   // hidden from its chip (0.95): not drawn, not picked
  return e || c;
}
function refuse(L){ const r = L.row; r.classList.remove('refused'); void r.offsetWidth; r.classList.add('refused'); }
function removeClip(li, c){
  const L = layers[li]; if (!c) return;
  if (isBgPad(c.pad)) return clearPad(c.pad);         // a Background slot: its × empties the slot (Ctrl+Z brings it back)
  L.clips = L.clips.filter(x => x !== c); if (L.sel === c) L.sel = null;
  syncLayerUI(); syncXfUI();
}