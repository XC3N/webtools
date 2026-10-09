// ---------- main loop ----------
let lastBeatIdx = -1, fpsN = 0, fpsT = performance.now();
const dots = [...document.querySelectorAll('#beats i')];
// The loop runs on the output window's requestAnimationFrame while it's open, so the output keeps
// playing when this control window is minimized or hidden (a hidden window's own rAF stops).
// A watchdog restarts the loop on this window if the output closes mid-frame.
let loopGen = 0, lastFrame = 0, driver = 'control', drawn = 0, scopeT = 0;
function schedule(){
  const g = loopGen, w = (outWin && !outWin.closed) ? outWin : window;
  driver = w === window ? 'control' : 'output';
  w.requestAnimationFrame(() => frame(g));
}
function restartLoop(){ loopGen++; schedule(); }
setInterval(() => { if (performance.now() - lastFrame > 400) restartLoop(); }, 250);
// ---------- load meter: how much of each second VJif's frame work takes, plus missed screen refreshes and stalls ----------
const meter = { busy: 0, peak: 0, drops: 0, gaps: [], longN: 0, longMs: 0 };
try { new PerformanceObserver(l => l.getEntries().forEach(en => { meter.longN++; meter.longMs += en.duration; })).observe({ type: 'longtask', buffered: false }); } catch (e) {}
let prevFrameT = 0, brbUIt = 0;
function frame(gen){
  if (gen !== loopGen) return;                       // a stale loop: drop it
  step();
  schedule();
}
// Recording with no output window while this tab is hidden: the browser stops requestAnimationFrame and slows timers
// to about once a second, so a worker's timer (not slowed) drives the frames instead, at the recording's frame rate.
let bgTick = null;
function bgTickSet(on){
  if (on && !bgTick){
    try {
      const url = URL.createObjectURL(new Blob(['let t; onmessage = e => { clearInterval(t); if (e.data) t = setInterval(() => postMessage(0), e.data); };'], { type: 'text/javascript' }));
      bgTick = new Worker(url); URL.revokeObjectURL(url);
      bgTick.onmessage = () => { if (document.hidden && !(outWin && !outWin.closed) && rec.mr) step(); };
      bgTick.postMessage(1000 / recFps);
    } catch (e) { bgTick = null; }
  } else if (!on && bgTick){ bgTick.terminate(); bgTick = null; }
}
// one frame of work: clock, triggers, drawing, recording, UI
function step(){
  const now = performance.now();                     // own clock (the output window's rAF time has another origin)
  if (prevFrameT){ const gap = now - prevFrameT; meter.gaps.push(gap); }
  prevFrameT = now;
  lastFrame = now;
  updateClock(now);
  if (pending.size || pendingScene || pendingLive !== null) firePending();
  if (rec.wait || rec.stopAt) recTick();
  if (brb.on){ brbTick(); if (now - brbUIt > 100){ brbUIt = now; brbUI(); } }
  drawFrame(now);
  if (rec.wc) wcCapture(now);
  if (!document.hidden && now >= uiQuiet && now - scopeT > 33){ scopeT = now; drawScopes(); }
  const bi = Math.floor(clock.beat);
  if (bi !== lastBeatIdx){
    lastBeatIdx = bi; const k = mod(bi, 4);
    dots.forEach((d, j) => d.classList.toggle('on', j === k));
    if (clock.src === 'midi') setBpm(clock.bpm);
  }
  if (clock.src === 'midi'){ const w = !clock.midiRunning, t = midiInput ? 'no clock' : 'no input', B = $('#beats');   // waiting: a word where the beat dots were
    if (B.classList.contains('wait') !== w) B.classList.toggle('wait', w); if (w && $('#midiStat').textContent !== t) $('#midiStat').textContent = t;
    const lc = 'led ' + (w ? 'wait' : 'on'); if ($('#midiLed').className !== lc) $('#midiLed').className = lc; }
  fpsN++;
  const work = performance.now() - now; meter.busy += work; if (work > meter.peak) meter.peak = work;
  if (now - fpsT > 1000){
    const s = (now - fpsT) / 1000, el = $('#fps');
    // a refresh counts as missed when its gap is over 1.5× the usual one (the screen's own rate)
    const g = meter.gaps.slice().sort((a, b) => a - b), typical = g.length ? g[Math.floor(g.length * 0.25)] : 16.7;
    const slot = Math.max(typical, 1000 / 60);         // judged against 60 fps: on a faster screen, 60 is still smooth
    meter.drops = g.filter(x => x > slot * 1.5).reduce((a, x) => a + Math.round(x / slot) - 1, 0);
    const load = Math.round(meter.busy / (s * 1000) * 100), heap = performance.memory ? (performance.memory.usedJSHeapSize / 1048576).toFixed(0) + ' MB JS heap' : '';
    // the screen's own rate: the shortest gaps seen (remembered — a busy second can't lower it)
    // the screen's own rate: the median gap of a full second (one odd short gap can't fake it), snapped to the usual refresh rates and remembered (a busy second can't lower it)
    if (g.length > 20){ const hz = 1000 / g[Math.floor(g.length * 0.5)], R = [30, 48, 50, 60, 72, 75, 85, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 360];
      const near = R.reduce((a, r) => Math.abs(r - hz) < Math.abs(a - hz) ? r : a); if (Math.abs(near - hz) / near < 0.08) meter.hz = Math.max(meter.hz || 0, near); }
    meter.hz = meter.hz || 60;
    const fps = Math.round(fpsN / s), hz = meter.hz, lo = $('#load');
    el.innerHTML = `<i>FPS</i>${fps}/${hz}`;
    const goal = Math.min(hz, 60);                     // smooth enough = 60 fps (or the screen's rate if lower)
    el.classList.toggle('bad', fps < goal * 0.6); el.classList.toggle('warn', fps >= goal * 0.6 && fps < goal * 0.9);
    lo.innerHTML = `<i>LOAD</i>${load}%`;
    lo.classList.toggle('bad', load > 70); lo.classList.toggle('warn', load > 40 && load <= 70);
    setTip(el, [`FPS ${fps}/${hz}: frames VJif managed this second / the screen's refresh rate. It turns amber below ${Math.round(goal * 0.9)} and red below ${Math.round(goal * 0.6)} (judged against ${goal} fps — smooth enough even on a faster screen).`,
      `${Math.round(drawn / s)} of them were redrawn (frames where nothing changed are skipped — that's normal).`,
      `Late frames (slower than 60 fps): ${meter.drops} — each one is visible as a small stutter.`,
      `Stalls over 50 ms: ${meter.longN}${meter.longN ? ` (${meter.longMs.toFixed(0)} ms) — anything on the page, e.g. decoding or saving` : ''}`].join('\n'));
    setTip(lo, [`LOAD ${load}%: how much of each second VJif's drawing takes on the main thread.`,
      `Average ${(meter.busy / Math.max(1, fpsN)).toFixed(1)} ms, worst ${meter.peak.toFixed(1)} ms per frame — one screen refresh lasts ${(1000 / hz).toFixed(1)} ms.`,
      `Near 100% the frame rate drops. GPU work (effects, compositing) isn't counted here: it shows up as a lower FPS instead.`, heap].filter(Boolean).join('\n'));
    Object.assign(meter, { busy: 0, peak: 0, gaps: [], longN: 0, longMs: 0 });
    fpsN = 0; drawn = 0; fpsT = now;
  }
}
