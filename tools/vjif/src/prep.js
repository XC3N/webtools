// ---------- Prep: the output keeps playing what's live while you work on any scene ----------
// prep = { layers, gifs, free, fx, scene }: copies of the live scene's layers and clips, of the GIFs they play
// (own settings, same frames) and of the effects' state. Nothing the editor does reaches them.
let prep = null, pendingLive = null;
function startPrep(){
  if (prep) return;
  if (trans){ toast('Wait for the transition to finish'); return; }
  if (hist.ready) commit();
  pendingScene = null;
  const gifs = pads.map(() => null), free = [];
  const used = new Set(layers.flatMap(L => L.clips.map(c => c.pad)));
  pads.forEach((p, k) => { if (p.gif && used.has(k)){ gifs[k] = cloneInst(p.gif); free.push(gifs[k]); } });
  const now = clock.beat, cp = o => JSON.parse(JSON.stringify(o));
  const st = fxSt.map(S => ({ ...S }));
  st.forEach(S => { if (S.held){ S.held = false; S.rel = now; } });   // a key held right now would never be let go on the output
  // a gated fade held open right now (pad still down) is let go on the copy: the editor's release never reaches it
  const gated = c => { const g = pads[c.pad].gif; return c.env && c.env.rel === null && g && g.trig === 'fade' && g.env.gate && !c.env.noGate; };
  prep = { layers: layers.map(L => ({ ...layerState(L), clips: L.clips.map(c => ({ ...c, relBeat: c.relBeat === null ? now : c.relBeat, env: c.env && { ...c.env, rel: gated(c) ? Math.max(now, c.env.t0) : c.env.rel } })) })), gifs, free,
           fx: { cfg: cp(fxCfg), pre: cp(fxPre), st }, scene: sceneIdx };
  if (brb.link && !brb.on) brbStart();                // linked: BRB keeps the output changing while you prep
  syncPrepUI(); renderScenes(); redraw.all = true;
}
// Go live: the scene you're on goes out with the armed transition (on the next beat / bar with Snap)
function goLive(){
  if (!prep) return;
  updateClock(performance.now());                    // the beat right now, not as of the last frame
  const at = barBeat(clock.beat);                    // always on the downbeat, whatever Snap is
  if (at > clock.beat){ pendingLive = at; syncPrepUI(); return; }
  doGoLive(at);
}
function doGoLive(beat = clock.beat){
  const P = prep; pendingLive = null; if (!P) return;
  endPrepTr(); if (brb.link && brb.on) brbStop();   // linked BRB ends with Prep
  prep = null; endTrans();
  const t0 = beatTime(beat);
  if (P.scene !== sceneIdx) layers.forEach(L => L.clips.forEach(c => { c.startBeat = beat; c.startTime = t0; if (c.env) c.env = { ...c.env, t0: beat, from: 0, rel: null }; }));   // another scene starts from the top (fades too)
  trans = makeTrans(P.layers, P.gifs, beat, P.free); if (trans) trans.fx = P.fx;   // the leaving scene keeps the output's own effects while it fades out
  if (!trans) P.free.forEach(freeGif);
  syncPrepUI(); renderScenes(); redraw.all = true;
}
function dropPrep(){ if (!prep) return; endPrepTr(); if (brb.link && brb.on) brbStop(); prep.free.forEach(freeGif); prep = null; pendingLive = null; syncPrepUI(); }
// BRB linked to Prep: the output itself changes to scene i (a stored scene, with the armed / BRB transition), the editor stays where it is
function prepSwitchTo(i, beat){
  const P = prep, sc = scenes[i]; if (!P || !sc) return;
  const t0 = beatTime(beat), gifs = pads.map(() => null), free = [], used = new Set(sc.layers.flatMap(L => L.clips.map(c => c.pad)));
  sc.pads.forEach((g, k) => { if (g && used.has(k)){ gifs[k] = cloneInst(g); free.push(gifs[k]); } });
  const ov = layers[GLOBAL_LAYER];                   // Overlay isn't the scene's: the output keeps the live one (copies of its Global GIFs)
  ov.clips.forEach(c => { const g = pads[c.pad].gif; if (g && !gifs[c.pad]){ gifs[c.pad] = cloneInst(g); free.push(gifs[c.pad]); } });
  endPrepTr();
  const T = makeTrans(P.layers, P.gifs, beat, P.free);   // the old output picture fades / slides out (its GIF copies go when it ends)
  if (T) P.tr = T; else P.free.forEach(freeGif);
  P.layers = sc.layers.map((L, li) => li === GLOBAL_LAYER ? { ...layerState(ov), clips: ov.clips.map(c => ({ ...c })) } : ({ ...L, clips: L.clips.map(c => ({ ...c, startBeat: beat, startTime: t0, env: null, hitBeat: undefined })) }));
  P.gifs = gifs; P.free = free; P.scene = i;
  redraw.all = true; renderScenes();
}
function endPrepTr(){ const T = prep && prep.tr; if (!T) return; prep.tr = null; if (T.free) T.free.forEach(freeGif); if (T.gifs) dropFxCache(T.gifs); }
function syncPrepUI(){
  const b = $('#prepBtn'); if (!b) return;
  b.classList.toggle('on', !!prep); $('#prepLed').classList.toggle('on', !!prep); $('#prepLed').classList.toggle('wait', pendingLive !== null);   // blinks until the beat it goes live on
  $('#prepTag').hidden = !prep;
  document.body.classList.toggle('prepping', !!prep);
}
