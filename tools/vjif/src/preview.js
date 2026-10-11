// ---------- preview overlays: ghosts of invisible clips, guides, safe areas, the selection outline ----------
// fade one-shot clips that are currently invisible: shown in the preview only, as a dotted ghost of their start frame
const pvOpt = (() => { const o = Prefs.json('vjif-pvopt', {}), r = { guides: o.guides, gHide: !!o.gHide, stick: o.stick !== false, ghosts: o.ghosts !== false, gx: o.gx || 4, gy: o.gy || 4, link: !!o.link, fromC: !!o.fromC, gcol: o.gcol || '#ffffff' };
  if (r.guides === 'thirds'){ r.guides = 'grid'; r.gx = r.gy = 3; } else if (r.guides === 'centre'){ r.guides = 'grid'; r.gx = r.gy = 2; }   // thirds = grid 3×3, centre = 2×2
  if (typeof r.guides !== 'object' || !r.guides){ const g = r.guides; r.guides = {}; if (g) r.guides[g] = true;   // one guide at a time before 0.31; they combine now
  }
  if (r.gx === 1 && r.gy === 1) r.gx = r.gy = 2; return r; })();
// guide lines in output pixels: [xs, ys]
function guideLines(G = pvOpt.guides){   // the straight guides (golden, grid): what a dragged GIF can stick to
  if (pvOpt.gHide) return [[], []];                  // hidden guides aren't stuck to either
  const div = n => Array.from({ length: Math.max(0, n - 1) }, (_, i) => (i + 1) / n), xs = [], ys = [];
  if (G.grid){ xs.push(...div(pvOpt.gx)); ys.push(...div(pvOpt.gy)); }
  if (G.golden){ xs.push(0.382, 0.618); ys.push(0.382, 0.618); }
  return [xs.map(v => v * W), ys.map(v => v * H)];
}
// the slanted guides (diagonals, perspective rays) as segments in output pixels: a dragged GIF's centre sticks to them
function guideSlants(G = pvOpt.guides){
  if (pvOpt.gHide) return [];
  const out = [];
  if (G.diag) out.push([0, 0, W, H], [W, 0, 0, H]);
  if (G.persp) for (let k = 0; k <= 4; k++){ const f = k / 4; for (const [x, y] of [[f, 0], [f, 1], [0, f], [1, f]]) out.push([W / 2, H / 2, x * W, y * H]); }
  return out;
}
// the safe-area frames as straight lines (x, y in output pixels)
const safeLines = () => pvOpt.gHide || !pvOpt.guides.safe || format === '9:16' ? [[], []] : [[0.035, 0.05, 0.95, 0.965].map(v => v * W), [0.035, 0.05, 0.95, 0.965].map(v => v * H)];
const anyGuide = () => !pvOpt.gHide && Object.values(pvOpt.guides).some(Boolean);
function ghostList(){
  const out = []; if (!pvOpt.ghosts) return out;
  for (const L of layers){ if (!L.on) continue; for (const c of L.clips){ const g = pads[c.pad].gif; if (g && g.trig === 'fade' && !(envLevel(c, g, clock.beat) > 0)) out.push([c, g]); } }
  return out;
}
const ghostCv = document.createElement('canvas'), gctx = ghostCv.getContext('2d');
const dither = (() => { const c = new OffscreenCanvas(2, 2), x = c.getContext('2d'); x.fillRect(0, 0, 1, 1); x.fillRect(1, 1, 1, 1); return gctx.createPattern(c, 'repeat'); })();
function drawGhosts(gh, k, dpr){
  if (ghostCv.width !== pv.width || ghostCv.height !== pv.height){ ghostCv.width = pv.width; ghostCv.height = pv.height; }
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalCompositeOperation = 'source-over'; gctx.globalAlpha = 1;
  gctx.clearRect(0, 0, ghostCv.width, ghostCv.height);
  gctx.setTransform(k, 0, 0, k, view.x * dpr, view.y * dpr);
  for (const [c, g] of gh) drawClip(gctx, Object.assign({}, c, { alpha: 1 }), g, fxImage(g, g.startF));
  gctx.setTransform(1, 0, 0, 1, 0, 0); gctx.globalCompositeOperation = 'destination-in';
  gctx.fillStyle = dither; gctx.fillRect(0, 0, ghostCv.width, ghostCv.height);
  pctx.globalAlpha = 0.75; pctx.drawImage(ghostCv, 0, 0); pctx.globalAlpha = 1;
}
function outline(G, k){
  pctx.beginPath();
  [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([a, b], j) => { const [x, y] = toWorld(G, a*G.hw, b*G.hh); j ? pctx.lineTo(x*k, y*k) : pctx.moveTo(x*k, y*k); });
  pctx.closePath(); pctx.stroke();
}
const redraw = { all: true };
const GUIDE_KEYS = ['golden', 'grid', 'safe', 'diag', 'persp'];
// While theme colours are being dragged, the control window skips its preview, overlay, scopes and scene thumbnails
// (every colour change restyles the whole page; those redraws would compete with it). The output is unaffected.
let uiQuiet = 0, quietT = 0;
function quietUI(ms = 250){ uiQuiet = performance.now() + ms; clearTimeout(quietT); quietT = setTimeout(() => { redraw.all = true; }, ms + 20); }
