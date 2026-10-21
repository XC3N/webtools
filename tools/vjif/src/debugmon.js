// ---------- debug monitor (ID-246): Shift+right-click on LOAD opens a small window that VJif feeds once a second ----------
// One sample a second, kept for an hour. The window shows three graphs (load, FPS, JS heap) and what the memory is made of,
// so something left running next to your normal work tells a leak (the heap or the decoded frames keep rising) from a slow PC
// (flat memory, load or FPS wandering). It is only drawn while the window is open; the samples are kept either way (tiny).
const dbg = { win: null, log: [], t0: Date.now() };
function dbgSample(s){
  let base = 0, extra = 0, cached = 0; pool.forEach(m => { base += m.srcBytes || 0; }); insts.forEach(g => { extra += g.bytes - g.srcBytes + (g.maskBytes || 0); if (g.fxP) cached++; });
  dbg.log.push({ t: Date.now(), fps: s.fps, hz: s.hz, load: s.load, peak: s.peak, drops: s.drops, stalls: s.stalls, stallMs: s.stallMs,
    heap: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null, pool: base / 1048576, extra: extra / 1048576, gifs: pool.length, insts: insts.size, cached });
  if (dbg.log.length > 3600) dbg.log.shift();
  if (dbg.win){ if (dbg.win.closed) dbg.win = null; else try { dbgDraw(); } catch (e) {} }
}
function dbgOpen(){
  if (dbg.win && !dbg.win.closed){ dbg.win.focus(); dbgDraw(); return; }
  const w = window.open('', 'vjifmonitor', 'popup,width=560,height=560'); if (!w){ toast('The monitor window was blocked: allow pop-ups for this page'); return; }
  w.document.open(); w.document.write('<!doctype html><meta charset="utf-8"><title>VJif monitor</title><style>body{margin:0;background:#16181b;color:#d6d9de;font:12px/1.5 ui-monospace,Consolas,monospace;padding:10px}canvas{display:block;width:100%;height:330px;background:#0f1113;border:1px solid #2a2e33}pre{margin:10px 0 0;white-space:pre-wrap}.w{color:#e0a73a}</style><canvas id="cv" width="1080" height="660"></canvas><pre id="tx"></pre>'); w.document.close();
  dbg.win = w; dbgDraw();
}
function dbgDraw(){
  const w = dbg.win, d = w.document, cv = d.getElementById('cv'), tx = d.getElementById('tx'), L = dbg.log; if (!cv || !L.length) return;
  const x = cv.getContext('2d'), W = cv.width, H = cv.height; x.clearRect(0, 0, W, H);
  const panels = [['LOAD %', s => s.load, 0, 100, '#e0a73a'], ['FPS', s => s.fps, 0, Math.max(60, ...L.map(s => s.hz || 60)), '#6ec6a0'], ['JS heap MB', s => s.heap, null, null, '#7aa7e8']], ph = H / panels.length;
  panels.forEach(([name, f, lo, hi, col], k) => {
    const vals = L.map(f).filter(v => v !== null && v !== undefined); const y0 = k * ph + 6, h = ph - 22;
    let a = lo, b = hi; if (a === null){ if (!vals.length){ x.fillStyle = '#6b7178'; x.font = '22px monospace'; x.fillText(name + ': not available in this browser', 10, y0 + 30); return; } a = Math.min(...vals); b = Math.max(...vals); if (b - a < 8){ const m = (a + b) / 2; a = m - 4; b = m + 4; } }
    x.strokeStyle = '#23272c'; x.lineWidth = 1; x.strokeRect(0.5, y0 + 0.5, W - 1, h);
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); L.forEach((s, i) => { const v = f(s); if (v === null || v === undefined) return; const px = L.length > 1 ? i / (L.length - 1) * (W - 4) + 2 : 2, py = y0 + h - (Math.min(Math.max(v, a), b) - a) / (b - a) * h; i ? x.lineTo(px, py) : x.moveTo(px, py); }); x.stroke();
    x.fillStyle = '#9aa1a9'; x.font = '20px monospace'; x.fillText(`${name}  ${a.toFixed(0)}–${b.toFixed(0)}`, 8, y0 + 20);
  });
  const last = L[L.length - 1], m1 = L.slice(-60), mx = (k, g) => Math.max(...g.map(s => s[k] || 0)), sum = (k, g) => g.reduce((a, s) => a + (s[k] || 0), 0);
  const ten = L.filter(s => s.heap !== null && s.t >= last.t - 600000); let slope = null;   // MB / min over the last 10 minutes (least squares)
  if (ten.length > 60){ const n = ten.length, mt = ten.reduce((a, s) => a + s.t, 0) / n, mh = ten.reduce((a, s) => a + s.heap, 0) / n; let nu = 0, de = 0; ten.forEach(s => { nu += (s.t - mt) * (s.heap - mh); de += (s.t - mt) ** 2; }); slope = de ? nu / de * 60000 : 0; }
  const up = ((Date.now() - dbg.t0) / 60000).toFixed(0), span = ((last.t - L[0].t) / 60000).toFixed(0);
  tx.textContent = [`Running ${up} min · graphs: the last ${span} min, one point a second`, '',
    `FPS ${last.fps}/${last.hz} · LOAD ${last.load}% · worst frame in the last minute ${mx('peak', m1).toFixed(1)} ms`,
    `Late frames in the last minute: ${sum('drops', m1)} · stalls over 50 ms: ${sum('stalls', m1)} (${sum('stallMs', m1).toFixed(0)} ms)`, '',
    last.heap !== null ? `JS heap ${last.heap.toFixed(0)} MB` + (slope === null ? ' (the trend shows after a minute)' : ` · last 10 min: ${slope >= 0 ? '+' : ''}${slope.toFixed(2)} MB/min` + (slope > 1 ? ' — rising' : ' — flat')) : 'JS heap: only Chrome / Edge report it',
    `Decoded frames ${last.pool.toFixed(0)} MB (${last.gifs} GIFs in the pool) + processed copies / key masks ${last.extra.toFixed(0)} MB`,
    `GIF instances alive: ${last.insts} · with processed frames cached: ${last.cached}`, '',
    'A line that keeps climbing (heap or decoded frames) points at VJif; flat memory with a wandering load or FPS points at the PC.'].join('\n');
}
$('#load').addEventListener('contextmenu', e => { if (!e.shiftKey) return; e.preventDefault(); dbgOpen(); });
