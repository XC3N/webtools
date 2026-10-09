// ---------- output window ----------
// where the output window was last time (screen position and size); Shift+click Output forgets it
const OUT_KEY = 'vjif-outwin';
const outGeo = () => Prefs.json(OUT_KEY);
function outDefault(){ const k = 960 / Math.max(W, H); return { w: Math.round(W * k), h: Math.round(H * k) }; }
function openOutput(e){
  if (e && e.shiftKey){                              // reset: back to the default size, near the top left of this screen
    Prefs.set(OUT_KEY, null);
    const D = outDefault();
    if (outWin && !outWin.closed){ try { outWin.document.exitFullscreen && outWin.document.fullscreenElement && outWin.document.exitFullscreen(); outWin.moveTo(screen.availLeft || 0, screen.availTop || 0);
      outWin.resizeTo(D.w + outWin.outerWidth - outWin.innerWidth, D.h + outWin.outerHeight - outWin.innerHeight); } catch (err) {} outWin.focus(); }
    toast2('Output window position reset'); if (outWin && !outWin.closed) return;
  }
  if (outWin && !outWin.closed){ outWin.focus(); return; }
  const G = outGeo(), D = outDefault();
  const feat = G ? `popup,left=${G.x},top=${G.y},width=${G.w},height=${G.h}` : `popup,width=${D.w},height=${D.h}`;
  outWin = window.open('', 'gifvj_output', feat);
  if (!outWin){ toast('Popup blocked — allow popups for this page, then click Open output again'); return; }
  const d = outWin.document;
  d.open();
  d.write(`<!doctype html><meta charset="utf-8"><title>VJif — Output</title>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}
canvas{width:100vw;height:100vh;object-fit:contain;display:block;cursor:move}
html:fullscreen,html:fullscreen *{cursor:none}
#h{position:fixed;left:8px;top:6px;font:12px monospace;color:#888;transition:opacity 1s}</style>
<canvas width="${CW}" height="${CH}"></canvas><div id="h">drag to move · double-click: full screen on / off</div>`);
  d.close();
  outCtx = d.querySelector('canvas').getContext('2d', { alpha: false });
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
  redraw.all = true; restartLoop();
  updateOutStat();
}
function saveOutGeo(){
  if (!outWin || outWin.closed || outWin.document.fullscreenElement) return;
  Prefs.setJson(OUT_KEY, { x: outWin.screenX, y: outWin.screenY, w: outWin.innerWidth, h: outWin.innerHeight });
}
setInterval(saveOutGeo, 2000);                       // catches moves and resizes made with the window's own frame too
function updateOutStat(){
  $('#outLed').classList.toggle('on', !!outCtx);
  $('#outBtn').title = outCtx ? `Output window is live (${CW}×${CH}) — click to bring it to the front · Shift+click: reset its position` : 'Open the output window (it reopens where you left it) · Shift+click: reset its position';
}
// ---------- canvas format ----------
// the drawing canvases follow the format and the render size
function sizeCanvases(){
  CW = Math.round(W * RS); CH = Math.round(H * RS);
  [master, ...lbufs.map(b => b.canvas), trA.canvas, trB.canvas, trM.canvas, pxCv, freezeCv].forEach(c => { c.width = CW; c.height = CH; });
  if (post) post.resize();
  if (outCtx){ outCtx.canvas.width = CW; outCtx.canvas.height = CH; }
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
  if (outWin && !outWin.closed && !outWin.document.fullscreenElement){ const k2 = 960 / Math.max(W, H);
    try { outWin.resizeTo(Math.round(W * k2) + outWin.outerWidth - outWin.innerWidth, Math.round(H * k2) + outWin.outerHeight - outWin.innerHeight); } catch (e) {} }
  $('#xX').min = -W; $('#xX').max = W; $('#xY').min = -H; $('#xY').max = H;
  sizePreview(); syncXfUI(); updateOutStat(); syncFormatUI(); redraw.all = true;
  if (!quiet) toast(`Canvas ${W}×${H} — ${FORMATS[k][2]}`);
}
function syncFormatUI(){
  syncRS();
  document.querySelectorAll('#fmtSeg button').forEach(b => b.classList.toggle('on', b.dataset.f === format));
  const t = $('#fmtTag'); if (t){ t.textContent = format === '16:9' ? '' : format; t.hidden = format === '16:9'; }
}
