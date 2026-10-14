// ---------- output window ----------
// where the output window was last time (screen position and size); Shift+click Output forgets it
const OUT_KEY = 'vjif-outwin';
const outGeo = () => Prefs.json(OUT_KEY);
function outDefault(){ const d = devicePixelRatio || 1; return { w: Math.round(CW / 2 / d), h: Math.round(CH / 2 / d) }; }   // half the render size in screen pixels (0.89.4: an exact eighth, see eighthFit)
// the output window's canvas: windowed, the largest exact eighth of the render size that fits, one canvas pixel per screen
// pixel, centred; full screen, the render size, stretched to fill (a projector shouldn't get borders)
function sizeOutCv(){
  if (!outCtx || !outWin || outWin.closed) return;
  const w = outWin, d = w.devicePixelRatio || 1, cv = outCtx.canvas, fs = !!w.document.fullscreenElement;
  const [pw, ph] = fs ? [CW, CH] : eighthFit(w.innerWidth * d, w.innerHeight * d);
  if (cv.width !== pw || cv.height !== ph){ cv.width = pw; cv.height = ph; redraw.all = true; }
  Object.assign(cv.style, fs ? { width: '100vw', height: '100vh' } : { width: pw / d + 'px', height: ph / d + 'px' });
}
function openOutput(e){
  if (e && e.shiftKey){                              // reset: back to the default size, near the top left of this screen
    Prefs.set(OUT_KEY, null);
    const D = outDefault();
    if (outWin && !outWin.closed){ try { outWin.document.exitFullscreen && outWin.document.fullscreenElement && outWin.document.exitFullscreen(); outWin.moveTo(screen.availLeft || 0, screen.availTop || 0);
      outWin.resizeTo(D.w + outWin.outerWidth - outWin.innerWidth, D.h + outWin.outerHeight - outWin.innerHeight); } catch (err) {} outWin.focus(); }
    toast2('Output window position reset'); if (outWin && !outWin.closed) return;
  }
  if (outWin && !outWin.closed && outPip){ outWin.close(); outWin = null; outCtx = null; }   // from the always-on-top window back to a normal one
  if (outWin && !outWin.closed){ outWin.focus(); return; }
  const G = outGeo(), D = outDefault();
  const feat = G ? `popup,left=${G.x},top=${G.y},width=${G.w},height=${G.h}` : `popup,width=${D.w},height=${D.h}`;
  outWin = window.open('', 'gifvj_output', feat); outPip = false;
  if (!outWin){ toast('Popup blocked — allow popups for this page, then click Open output again'); return; }
  // Chrome counts its address bar into a reopened popup's size but not into a resize, so the picture area can come out a few
  // pixels off the size asked for (black bars): measure it once the window is up and resize by the difference
  const want = G ? { w: G.w, h: G.h } : D;
  setTimeout(() => { try { if (!outWin || outWin.closed || outPip || outWin.document.fullscreenElement) return; const dw = want.w - outWin.innerWidth, dh = want.h - outWin.innerHeight;
    if (dw || dh) outWin.resizeBy(dw, dh); } catch (e) {} }, 120);
  const d = outWin.document;
  d.open();
  d.write(`<!doctype html><meta charset="utf-8"><title>VJif — Output</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
body{display:grid;place-items:center}canvas{object-fit:contain;display:block;cursor:move}
html:fullscreen,html:fullscreen *{cursor:none}
#h{position:fixed;left:8px;top:6px;font:12px monospace;color:#888;transition:opacity 1s}</style>
<canvas width="${CW}" height="${CH}"></canvas><div id="h">drag to move · double-click: full screen on / off</div>`);
  d.close();
  outCtx = d.querySelector('canvas').getContext('2d', { alpha: false });
  sizeOutCv(); outWin.addEventListener('resize', sizeOutCv); d.addEventListener('fullscreenchange', sizeOutCv);
  setTimeout(() => { const h = d.getElementById('h'); if (h) h.style.opacity = 0; }, 2500);
  d.addEventListener('dblclick', () => d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen());
  // drag anywhere to move the window (a projector window has no use for its title bar)
  let mv = null;
  d.addEventListener('pointerdown', e => { if (e.button || d.fullscreenElement) return; mv = { x: e.screenX, y: e.screenY, wx: outWin.screenX, wy: outWin.screenY }; d.documentElement.setPointerCapture?.(e.pointerId); });
  d.addEventListener('pointermove', e => { if (mv) try { outWin.moveTo(mv.wx + e.screenX - mv.x, mv.wy + e.screenY - mv.y); } catch (err) {} });
  d.addEventListener('pointerup', () => { mv = null; saveOutGeo(); });
  outWin.addEventListener('keydown', onKey);
  outWin.addEventListener('keyup', e => { onKeyUp(e); commit(); });
  outWin.addEventListener('blur', releaseAll);
  outWin.addEventListener('pagehide', () => setTimeout(restartLoop, 0));
  d.addEventListener('visibilitychange', () => restartLoop());   // covered by another window / minimized: the loop moves
  redraw.all = true; restartLoop();
  updateOutStat();
}
// Right-click Output: the output in a Picture-in-Picture window (Chrome 116+): always on top, no address bar.
// Chrome decides where it opens and how big it can get, it can't go full screen, and it closes with this page
let outPip = false;
async function openOutputPip(){
  if (!('documentPictureInPicture' in window)) return toast('This browser has no always-on-top window (Chrome or Edge 116+ needed)');
  if (outWin && !outWin.closed){ const was = outPip; outWin.close(); outWin = null; outCtx = null; updateOutStat(); if (was) return; }   // right-click again: back to closed
  const D = outDefault(); let w;
  try { w = await documentPictureInPicture.requestWindow({ width: D.w, height: D.h }); } catch (e) { return toast('Could not open the always-on-top window'); }
  outWin = w; outPip = true; const d = w.document;
  const st = d.createElement('style'); st.textContent = 'html,body{margin:0;height:100%;background:#000;overflow:hidden}body{display:grid;place-items:center}canvas{display:block}';
  const cv = d.createElement('canvas'); cv.width = CW; cv.height = CH; d.head.append(st); d.title = 'VJif — Output'; d.body.append(cv);
  outCtx = cv.getContext('2d', { alpha: false }); sizeOutCv(); w.addEventListener('resize', sizeOutCv);
  w.addEventListener('keydown', onKey); w.addEventListener('keyup', e => { onKeyUp(e); commit(); }); w.addEventListener('blur', releaseAll);
  w.addEventListener('pagehide', () => { outPip = false; setTimeout(restartLoop, 0); });
  d.addEventListener('visibilitychange', () => restartLoop());
  redraw.all = true; restartLoop(); updateOutStat();
}
function saveOutGeo(){
  if (!outWin || outWin.closed || outPip || outWin.document.fullscreenElement) return;
  Prefs.setJson(OUT_KEY, { x: outWin.screenX, y: outWin.screenY, w: outWin.innerWidth, h: outWin.innerHeight });
}
setInterval(saveOutGeo, 2000);                       // catches moves and resizes made with the window's own frame too
function updateOutStat(){
  $('#outLed').classList.toggle('on', !!outCtx);
  $('#outBtn').title = (outCtx ? `Output ${outPip ? 'window (always on top)' : 'window'} is live (${CW}×${CH}) — click: ${outPip ? 'switch to a normal window' : 'bring it to the front'}` : 'Open the output window (it reopens where you left it)')
    + ' · Shift+click: reset its position · Right-click: always-on-top window (no address bar, no full screen)';
}
// ---------- canvas format ----------
// the drawing canvases follow the format and the render size
function sizeCanvases(){
  CW = Math.round(W * RS); CH = Math.round(H * RS);
  [master, ...lbufs.map(b => b.canvas), trA.canvas, trB.canvas, trM.canvas, pxCv, freezeCv].forEach(c => { c.width = CW; c.height = CH; });
  if (post) post.resize();
  sizeOutCv();
  if (typeof sizePreview === 'function') sizePreview();   // the preview's eighths follow the render size
}
function setRenderSize(r){
  if (r === RS) return;
  if (rec.mr || rec.wait) return toast('Stop recording before changing the render size');
  RS = r; Prefs.set('vjif-rscale', r); sizeCanvases(); live.freeze = false; live.freezeReq = false; updLiveTag(); endTrans(); redraw.all = true; updateOutStat();
  toast2(`Render size ${CW}×${CH}`);
}
function setFormat(k, { quiet = false, force = false } = {}){
  if (!FORMATS[k]) k = '16:9';
  if (k === format) return syncFormatUI();
  if (prep && !force){ toast('Go live first (Enter): the canvas format changes the output'); return syncFormatUI(); }
  if (rec.mr || rec.wait){
    if (!force){ toast('Stop recording before changing the canvas format'); return syncFormatUI(); }
    recCancelWait(); recStop(); toast('Recording stopped: the loaded set has another canvas format');   // a set's format wins (it's part of the set)
  }
  format = k; [W, H] = FORMATS[k]; retextAll();
  sizeCanvases();
  live.freeze = false; live.freezeReq = false; updLiveTag(); endTrans();
  if (outWin && !outWin.closed && !outPip && !outWin.document.fullscreenElement){ const D = outDefault();
    try { outWin.resizeTo(D.w + outWin.outerWidth - outWin.innerWidth, D.h + outWin.outerHeight - outWin.innerHeight); } catch (e) {} }
  $('#xX').min = -W; $('#xX').max = W; $('#xY').min = -H; $('#xY').max = H;
  sizePreview(); syncXfUI(); updateOutStat(); syncFormatUI(); redraw.all = true;
  if (!quiet) toast(`Canvas ${W}×${H} — ${FORMATS[k][2]}`);
}
function syncFormatUI(){
  syncRS();
  document.querySelectorAll('#fmtSeg button').forEach(b => b.classList.toggle('on', b.dataset.f === format));
  const t = $('#fmtTag'); if (t){ t.textContent = format === '16:9' ? '' : format; t.hidden = format === '16:9'; }
}
