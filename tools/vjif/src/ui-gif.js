// ---------- UI: gif settings ----------
const segHTML = opts => opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('');
$('#gBeats').max = LOOP_OPTS.length - 1;
$('#gBeats').addEventListener('input', e => { const g = curGif(); if (!g) return; g.beats = LOOP_OPTS[+e.target.value][0]; e.target.nextElementSibling.textContent = lenLabel(g.beats); syncGifUI(); });
$('#gSub').innerHTML = segHTML(FRAME_OPTS.map(([b, l]) => [1 / b, l]));   // stored as frames per beat
$('#gRestart').innerHTML = segHTML(RESTART_OPTS);
const segSet = (id, v) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - v) < 1e-6 || b.dataset.v === v));
// one handler per button group: sets the GIF's field from the clicked button
[['#gSync', 'sync', false], ['#gLoop', 'loop', false], ['#gSub', 'subdiv', true], ['#gRestart', 'restart', true]].forEach(([id, key, num]) =>
  onSeg($(id), (b, e) => { const g = curGif(); if (!g) return;
    g[key] = num ? +b.dataset.v : b.dataset.v; syncGifUI();
  }));
// two fixed lines: what one cycle is, and what to watch out for (blank when nothing)
function cycleText(g){
  const cb = cycleBeats(g), sec = g.total / 1000 / g.speed;
  const beatsTxt = b => { const l = lenLabel(b); return /beats$/.test(l) ? l : `${l} · ${+b.toFixed(2)} beat${b === 1 ? '' : 's'}`; };
  const l1 = cb === null ? `CYCLE ${sec.toFixed(2)} s · own timing` : `CYCLE ${beatsTxt(cb)}`;
  const warn = [];
  if (g.sync === 'step' && Math.abs(cb / 4 - Math.round(cb / 4)) > 1e-6 && Math.abs(4 / cb - Math.round(4 / cb)) > 1e-6) warn.push('drifts against the bar');
  if (g.restart) warn.push(`restart ${lenLabel(g.restart)}` + (cb !== null && cb > g.restart + 1e-6 ? ', end never plays' : ''));
  return [l1, warn.join(' · ') || (cb === null ? 'not tied to tempo' : 'on the grid')];
}
function showCycle(g){ const [a, b] = cycleText(g), el = $('#gCycle'); el.querySelector('.l1').textContent = a; el.querySelector('.l2').textContent = b; el.title = a + ' — ' + b; }
// the panel's picture of the selected GIF (its first frame; the In / Out / Start sliders show theirs while touched); empty pad: blank
function drawGifThumb(){ const g = pads[selPad] && pads[selPad].gif; if (g) drawPrev(g, g.startF); else for (const c of [$('#gPrev'), $('#gPrevPlay')]) c.getContext('2d').clearRect(0, 0, c.width, c.height); }
function syncGifUI(){
  drawGifThumb();
  queueMicrotask(markFolds);                         // (once the panel shows this GIF's values)
  const p = pads[selPad], g = p.gif; syncSwitches(g);
  $('#gifSettings').classList.toggle('disabled', !g);
  $('#gifName').textContent = `${p.label}${g ? (g.keyMsg ? ' · ' + g.keyMsg : '') : ' · empty'}`; $('#gifName').title = '';
  $('#gText').hidden = !(g && g.media && g.media.text);
  if (!g){ document.querySelector('[data-pane=play]').classList.remove('textpad'); document.querySelectorAll('#gifSettings [data-for]').forEach(f => f.hidden = f.dataset.for !== 'stretch'); return; }   // empty pad: one of the stacked fields, not all three on top of each other
  $('#gSmooth').checked = !g.crisp; $('#gNoFx').checked = !!g.nofx;
  document.querySelector('[data-pane=play]').classList.toggle('textpad', !!(g.media && g.media.text));   // lettering: the GIF-only settings are dimmed
  if (!$('#gPal').options.length) $('#gPal').innerHTML = '<option value="-1">None</option>' + PAL_ORDER.map(i => FX_PALS[i]).map((P, k) => `<option value="${PAL_ORDER[k]}" title="${esc(P.t)}">${esc(P.d)}</option>`).join('');   // by year
  $('#gPal').value = String(g.pal ? g.pal.i : -1); $('#gPalD').value = g.pal ? g.pal.d : 0; $('#gPalD').nextElementSibling.textContent = Math.round((g.pal ? g.pal.d : 0) * 100) + '%';
  $('#gPalD').closest('.field').classList.toggle('dimmed', !(g.pal && g.pal.i >= 0));
  syncShadowUI(g);
  segSet('#gSync', g.sync); segSet('#gLoop', g.loop); segSet('#gRes', String(g.media.scale || 1)); $('#gRes').classList.toggle('dimmed', !!g.media.text);
  $('#gSpeed').value = g.speed; $('#gSpeed').nextElementSibling.textContent = g.speed.toFixed(2) + '×';
  { const el = $('#gBeats'); el.value = optIdx(LOOP_OPTS, g.beats); el.nextElementSibling.textContent = lenLabel(g.beats); } segSet('#gSub', g.subdiv); segSet('#gRestart', g.restart);
  showCycle(g);
  document.querySelectorAll('#gifSettings [data-for]').forEach(f => f.hidden = !f.dataset.for.split(' ').includes(g.sync));
  $('#kOn').checked = g.key.on; $('#kCol').value = rgb2hex(g.key.color); segSet('#kRegion', g.key.region || 'all');
  $('#kTol').value = g.key.tol; $('#kTol').nextElementSibling.textContent = (g.key.tol * 100).toFixed(0) + '%';
  $('#kSoft').value = g.key.soft; $('#kSoft').nextElementSibling.textContent = (g.key.soft * 100).toFixed(0) + '%';
  syncRangeUI(g); drawPrev(g, g.startF);
  HSV_UI.forEach(([id, k, fmt]) => { $(id).value = g.hsv[k]; $(id).nextElementSibling.textContent = fmt(g.hsv[k]); });
  if (!$('#gPanes [data-pane="colour"]').classList.contains('off')) syncSwapUI(g);
  segSet('#tMode', g.trig === 'fade' && g.env.gate ? 'hold' : g.trig); segSet('#tCurve', g.env.curve);
  ENV_UI.forEach(([id, k]) => { const i = optIdx(ENV_OPTS, g.env[k]); $(id).value = i; $(id).nextElementSibling.textContent = ENV_OPTS[i][1]; });
  segSet('#tLen', g.env.len || 'free');
  $('#tEnv').classList.toggle('dimmed', g.trig !== 'fade'); $('#tHoldRow').classList.toggle('dimmed', g.env.gate || g.env.len === 'gif');
  $('#tLenRow').classList.toggle('dimmed', g.env.gate); $('#tEveryRow').classList.toggle('dimmed', g.env.gate);
  { const i = optIdx(EVERY_OPTS, g.env.every || 0); $('#tEvery').value = i; $('#tEvery').nextElementSibling.textContent = EVERY_OPTS[i][1]; }
  syncAutoUI(g);
  const trimmed = g.seq.length < g.src.length ? ` (playing ${g.seq.length})` : '';
  $('#gifName').title = `${g.name} — ${g.src.length} frames${trimmed} · ${g.w}×${g.h}${g.media && g.media.px ? ` (pixel art ×${g.media.px[0]}${g.media.px[1] !== g.media.px[0] ? '×' + g.media.px[1] : ''}, kept at ${g.w / g.media.px[0]}×${g.h / g.media.px[1]})` : ''} · ${(g.total/1000).toFixed(2)} s · ~${(g.bytes/1048576).toFixed(0)} MB`;
}
const curGif = () => pads[selPad].gif;
// a GIF's processing message (key, edges…) shows in the GIF heading, after its pad letter
const gifMsg = g => { if (pads[selPad].gif === g) $('#gifName').textContent = `${pads[selPad].label}${g.keyMsg ? ' · ' + g.keyMsg : ''}`; };
// readouts too narrow for their text: hovering shows all of it
document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest('.lcd, .tag, output, .seg button, .fxp .t>span');
  if (el && el.scrollWidth > el.clientWidth + 1 && (!el.title || el.dataset.autoTip)){ el.title = el.textContent.trim(); el.dataset.autoTip = 1; } });
onSeg($('#gRes'), (b, e) => { const g = curGif(); if (!g || g.media.text) return;
  const sc = +b.dataset.v, m = g.media, was = m.srcBytes; segSet('#gRes', b.dataset.v);
  setMediaScale(m, sc).then(() => toast2(`${m.name}: ${(was / 1048576).toFixed(0)} → ${(m.srcBytes / 1048576).toFixed(0)} MB`)); });
onSeg($('#poolRes'), async b => { const sc = +b.dataset.v, was = pool.reduce((t, m) => t + (m.srcBytes || 0), 0);
  for (const m of pool.slice()) await setMediaScale(m, sc);
  const now = pool.reduce((t, m) => t + (m.srcBytes || 0), 0); syncGifUI();
  toast2(`Pool: ${(was / 1048576).toFixed(0)} → ${(now / 1048576).toFixed(0)} MB`); });
// ---- colour swaps: the GIF's palette (most used colours first), each swap = one palette colour → another ----
function gifPalette(g){
  const m = g.media, CL = g.swapMerge ?? 0; m.palettes = m.palettes || {}; if (m.palettes[CL]) return m.palettes[CL];
  const cnt = new Map(), step = Math.max(1, Math.floor(m.src.length / 8));
  const cv = new OffscreenCanvas(m.w, m.h), x = cv.getContext('2d', { willReadFrequently: true });
  for (let i = 0; i < m.src.length; i += step){
    x.clearRect(0, 0, m.w, m.h); x.drawImage(m.src[i], 0, 0);
    const d = x.getImageData(0, 0, m.w, m.h).data;
    for (let k = 0; k < d.length; k += 4) if (d[k + 3] > 127){ const c = (d[k] << 16) | (d[k + 1] << 8) | d[k + 2]; cnt.set(c, (cnt.get(c) || 0) + 1); }
  }
  // colours the eye can't tell apart (a GIF with ten slightly different blacks) count as one swatch: the most used one, with a radius that its swap covers
  const cl = [];
  for (const [c, n] of [...cnt].sort((a, b) => b[1] - a[1]).slice(0, 4000)){
    const r = c >> 16, gg = (c >> 8) & 255, b = c & 255;
    const k = cl.find(q => Math.abs(q.c[0] - r) <= CL && Math.abs(q.c[1] - gg) <= CL && Math.abs(q.c[2] - b) <= CL);
    if (k){ k.n += n; k.rad = Math.max(k.rad, Math.abs(k.c[0] - r), Math.abs(k.c[1] - gg), Math.abs(k.c[2] - b)); } else cl.push({ c: [r, gg, b], n, rad: 0 });
  }
  const top = cl.sort((a, b) => b.n - a.n).slice(0, 36).map(q => Object.assign(q.c, { rad: q.rad }));
  const hsl = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, d = mx - mn; let h = 0;
    if (d){ h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; } return [h, d / 255, l]; };
  return m.palettes[CL] = top.sort((a, b) => { const A = hsl(a), B = hsl(b), ga = A[1] < 0.12, gb = B[1] < 0.12;   // spectrum order: greys first (dark → light), then by hue
    return ga !== gb ? (ga ? -1 : 1) : ga ? A[2] - B[2] : A[0] - B[0] || A[2] - B[2]; });
}
const sameRgb = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
let swSel = null;                                     // the palette colour picked ([r,g,b]) or null; not yet swapped = a waiting row at the end
function syncSwapUI(g){
  if (!g) return;
  $('#swMerge').value = g.swapMerge ?? 0; $('#swMerge').nextElementSibling.textContent = (g.swapMerge ?? 0) ? (g.swapMerge ?? 0) + '' : 'off';
  const pal = gifPalette(g);
  if (swSel && !pal.some(c => sameRgb(c, swSel))) swSel = null;
  $('#swPal').innerHTML = pal.map((c, i) => `<button data-i="${i}" class="${g.swap.some(x => sameRgb(x.from, c)) ? 'on' : ''}${swSel && sameRgb(swSel, c) ? ' sel' : ''}" style="background:${rgb2hex(c)}" title="${rgb2hex(c)}"></button>`).join('');
  const ae = document.activeElement; if ((ae && ae.type === 'color' && $('#swList').contains(ae)) || (cpk.target && $('#swList').contains(cpk.target))) return;   // a colour picker is open in the list: leave it alone (a clicked × or ∅ still has focus: not that)
  const row = (from, to, i, pend, clr = pend ? false : !!(g.swap[i] && g.swap[i].clear)) => `<div class="swr${pend ? ' pending' : ''}${swSel && sameRgb(swSel, from) ? ' sel' : ''}${!pend && g.swap[i] && g.swap[i].off ? ' off' : ''}" data-r="${i}"><i data-t="${i}" style="background:${rgb2hex(from)}" title="${pend ? '' : 'Click: this swap off / on (it stays in the list)'}"></i>→<label class="swTo${clr ? ' clear' : ''}" style="background:${clr ? '' : rgb2hex(to)}" title="${pend ? 'Click: pick what this colour becomes' : 'Click to change'}"><input type="color" data-i="${i}" value="${rgb2hex(to)}"></label><button class="iconbtn${clr ? ' on' : ''}" data-k="${i}" title="Transparent: this colour disappears (click again to bring it back)">∅</button>${pend ? '' : `<button class="iconbtn" data-x="${i}" title="Remove this swap">×</button>`}</div>`;
  const pend = swSel && !g.swap.some(x => sameRgb(x.from, swSel));
  $('#swList').innerHTML = g.swap.map((x, i) => row(x.from, x.to, i, false)).join('') + (pend ? row(swSel, swSel, 'new', true) : '');
}
onSeg($('#swPal'), (b, e) => { const g = curGif(); if (!g) return;
  const c = gifPalette(g)[+b.dataset.i];
  if (swSel && sameRgb(swSel, c)) swSel = null;      // again: deselect
  else { if (!g.swap.some(x => sameRgb(x.from, c)) && g.swap.length >= SWAP_MAX) return toast(`Up to ${SWAP_MAX} swaps per GIF`); swSel = c.slice(); }
  syncSwapUI(g); if (swSel) revealSoon('#swList .swr.sel');
});
$('#swList').addEventListener('input', e => {
  const g = curGif(); if (!g || !e.target.matches('input[type=color]')) return;
  let x;
  if (e.target.dataset.i === 'new'){ if (!swSel) return; const pc = gifPalette(g).find(c => sameRgb(c, swSel)); x = { from: swSel.slice(), to: swSel.slice(), tol: pc && pc.rad ? pc.rad + 1.5 : undefined }; g.swap.push(x); g.swapOff = false; e.target.dataset.i = g.swap.length - 1; e.target.closest('.swr').classList.remove('pending'); }
  else x = g.swap[+e.target.dataset.i];
  if (!x) return; x.to = hex2rgb(e.target.value); e.target.parentElement.style.background = e.target.value; scheduleFx(g, 60);
});
$('#swList').addEventListener('change', e => { const g = curGif(); if (!g) return; e.target.blur(); scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); });
$('#swList').addEventListener('click', e => {
  const g = curGif(); if (!g) return;
  const k = e.target.closest('[data-k]'); if (k){   // transparent: on a pending row it creates the swap first
    let x; if (k.dataset.k === 'new'){ if (!swSel || g.swap.length >= SWAP_MAX) return; const pc = gifPalette(g).find(c => sameRgb(c, swSel)); x = { from: swSel.slice(), to: swSel.slice(), tol: pc && pc.rad ? pc.rad + 1.5 : undefined }; g.swap.push(x); g.swapOff = false; }
    else x = g.swap[+k.dataset.k];
    if (x){ x.clear = !x.clear; scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); commit(); } return; }
  const t = e.target.closest('i[data-t]'); if (t && t.dataset.t !== 'new'){ const x = g.swap[+t.dataset.t]; if (x){ x.off = !x.off; if (!x.off) delete x.off; scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); commit(); } return; }   // its original colour: this swap off / on
  const b = e.target.closest('[data-x]'); if (b){ const x = g.swap[+b.dataset.x]; if (x && swSel && sameRgb(x.from, swSel)) swSel = null; g.swap.splice(+b.dataset.x, 1); scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); }
});
$('#swMerge').addEventListener('input', e => { const g = curGif(); if (!g) return; g.swapMerge = +e.target.value;
  const pal = gifPalette(g); g.swap.forEach(x => { const c = pal.find(c => sameRgb(c, x.from)); if (c) x.tol = c.rad + 1.5; });   // existing swaps follow their new swatch
  scheduleFx(g, 150); syncSwapUI(g); clearTimeout(e.target._t); e.target._t = setTimeout(commit, 400); });
$('#swClear').addEventListener('click', () => { const g = curGif(); if (!g) return; swSel = null; if (picking === 'swap') stopPick(); if (g.swap.length){ g.swap = []; scheduleFx(g, 0); renderPad(selPad); } g.swapOff = true; syncSwitches(g); syncSwapUI(g); markFolds(); });   // (0.95: and off)

$('#gNoFx').addEventListener('change', e => { const g = curGif(); if (g){ g.nofx = e.target.checked; redraw.all = true; } });
$('#gSmooth').addEventListener('change', e => { const g = curGif(); if (g){ g.crisp = !e.target.checked; renderPad(selPad); redraw.all = true; } });   // a setting of the GIF (in GIF › Play), not of where it's placed
$('#gSpeed').addEventListener('input', e => { const g = curGif(); if (g){ g.speed = +e.target.value; e.target.nextElementSibling.textContent = g.speed.toFixed(2) + '×'; showCycle(g); } });
const HSV_UI = [['#hH', 'h', v => (v > 0 ? '+' : '') + v + '°'], ['#hS', 's', v => (+v).toFixed(2) + '×'], ['#hV', 'v', v => (+v).toFixed(2) + '×']];
HSV_UI.forEach(([id, k, fmt]) => $(id).addEventListener('input', e => {
  const g = curGif(); if (!g) return;
  g.hsv[k] = +e.target.value; g.hsv.off = false; e.target.nextElementSibling.textContent = fmt(g.hsv[k]); syncSwitches(g);   // (touching it switches Adjust on)
  scheduleFx(g, 150);
}));
$('#gPal').addEventListener('change', e => { const g = curGif(); if (!g) return; g.pal = { ...(g.pal || { d: 0 }), i: +e.target.value, off: false }; e.target.blur(); scheduleFx(g, 0); syncGifUI(); renderPad(selPad); });
$('#gPalD').addEventListener('input', e => { const g = curGif(); if (!g) return; g.pal = { ...(g.pal || { i: -1 }), d: +e.target.value }; e.target.nextElementSibling.textContent = Math.round(g.pal.d * 100) + '%'; scheduleFx(g, 100); });
$('#hReset').addEventListener('click', () => { const g = curGif(); if (!g) return; Object.assign(g.hsv, { h: 0, s: 1, v: 1, off: true }); scheduleFx(g, 0); syncGifUI(); });   // (0.95: Reset also switches it off, like Key's Clear)

// ---- trigger tab: Stay / Fade one-shot ----
const ENV_UI = [['#tA', 'a'], ['#tH', 'h'], ['#tR', 'r']];
ENV_UI.forEach(([id, k]) => { const el = $(id); el.max = ENV_OPTS.length - 1;
  el.addEventListener('input', e => { const g = curGif(); if (!g) return; const o = ENV_OPTS[+e.target.value]; g.env[k] = o[0]; e.target.nextElementSibling.textContent = o[1]; }); });
onSeg($('#tMode'), (b, e) => { const g = curGif(); if (!g) return;
  const v = b.dataset.v; g.trig = v === 'stay' ? 'stay' : 'fade'; if (v !== 'stay') g.env.gate = v === 'hold'; layers.forEach(L => L.clips.forEach(c => { if (c.pad === selPad) c.env = null; }));   // switching hides / shows it at once
  syncGifUI(); redraw.all = true;
});
$('#tEvery').max = EVERY_OPTS.length - 1;
$('#tEvery').addEventListener('input', e => { const g = curGif(); if (!g) return; const o = EVERY_OPTS[+e.target.value]; g.env.every = o[0]; e.target.nextElementSibling.textContent = o[1]; redraw.all = true; });
onSeg($('#tLen'), (b, e) => { const g = curGif(); if (g){ g.env.len = b.dataset.v; syncGifUI(); } });
onSeg($('#tCurve'), (b, e) => { const g = curGif(); if (g){ g.env.curve = b.dataset.v; syncGifUI(); } });

// ---- auto tab: one LFO per target ----
let aSel = 'x';
$('#aTgt').innerHTML = LFO_T.map(t => `<button data-v="${t[0]}" title="${t[2]}">${t[1]}</button>`).join('');
$('#aShape').innerHTML = SHAPES.map(([v, l, ic]) => `<button data-v="${v}" title="${l}">${ic}</button>`).join('');   // (0.89: drawn, named in the tooltip)
$('#aPer').max = PER_FAM.e.length - 1;
const skFmt = v => { const p = Math.round((v - 0.5) * 200); return (p > 0 ? '+' : '') + p + '%'; };   // Skew shown around the middle (0.95): 0 % even, − a quick rise, + a quick fall
const lfoFmt = (t, v) => t[6] === '%' ? Math.round(v * 100) + '%' : t[6] === '×' ? (+v).toFixed(2) + '×' : (v > 0 ? '+' : '') + Math.round(v) + (t[6] === '°' ? '°' : '');
const A_ENV = [['#aEA', 'ea', 0], ['#aED', 'ed', 4], ['#aER', 'er', 1]];   // Envelope times (ENV_OPTS), with their defaults
function syncAutoUI(g){
  const t = LFO_T.find(t => t[0] === aSel), A = g.lfo[aSel] || lfoDef(aSel);
  $('#aTgt').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.v === aSel); b.classList.toggle('act', !!(g.lfo[b.dataset.v] && g.lfo[b.dataset.v].on)); });
  $('#aTitle').textContent = t[2] + (['h', 's', 'v'].includes(aSel) && !liveFx() ? ' — needs WebGL' : '');
  $('#aOn').checked = A.on; segSet('#aShape', A.shape); segSet('#aSync', A.sync);
  const D = lfoDef(aSel);                            // double-click resets to this target's defaults
  [['#aMin', 'min'], ['#aMax', 'max']].forEach(([id, k]) => { const el = $(id); el.min = aSel === 'x' ? -W : aSel === 'y' ? -H : t[3]; el.max = aSel === 'x' ? W : aSel === 'y' ? H : t[4]; el.step = t[5];   // positions follow the canvas format
    el.value = A[k]; el.dataset.def = D[k];
    el.nextElementSibling.textContent = lfoFmt(t, A[k]); if (t[6] === '%') el.dataset.pct = ''; else delete el.dataset.pct; });
  { const f = perFam(A.per), L = PER_FAM[f], pi = optIdx(L, A.per); $('#aPer').max = L.length - 1; $('#aPer').value = pi; $('#aPer').dataset.def = optIdx(L, D.per); $('#aPer').nextElementSibling.textContent = L[pi][1]; segSet('#aPerFam', f); }
  const gi = optIdx(GAP_OPTS, A.gap || 0); $('#aGap').value = gi; $('#aGap').nextElementSibling.textContent = GAP_OPTS[gi][1];
  $('#aPh').value = A.ph; $('#aPh').nextElementSibling.textContent = Math.round(A.ph * 360) + '°';
  $('#aSk').value = A.sk ?? 0.5; $('#aSk').nextElementSibling.textContent = skFmt(A.sk ?? 0.5); $('#aHoldBtn').classList.toggle('on', !!A.hold); $('#aInv').classList.toggle('on', !!A.inv);
  const em = A.em || 'off'; segSet('#aEnv', em);
  A_ENV.forEach(([id, k, def]) => { const i = optIdx(ENV_OPTS, A[k] ?? def); $(id).value = i; $(id).nextElementSibling.textContent = ENV_OPTS[i][1]; });
  $('#aEnvLoop').classList.toggle('on', !!A.eloop);
  $('#aES').value = A.es ?? 0; $('#aES').nextElementSibling.textContent = Math.round((A.es ?? 0) * 100) + '%';
  document.querySelectorAll('#gPanes .aEnvF').forEach(f => f.classList.toggle('dimmed', em === 'off'));
  ['#aShape', '#aPer', '#aGap', '#aPh', '#aSk', '#aSync'].forEach(id => $(id).closest('.field').classList.toggle('dimmed', em === 'only'));   // Only: the envelope alone
  $('#gTabs [data-v=auto]').classList.toggle('act', lfoAny(g)); syncGfxUI(g);
}
// change the edited LFO; touching any setting switches it on
let aShift = false;   // Shift held while dragging an Auto slider: the change goes to every running LFO of this GIF (0.88)
$('[data-pane=auto]').addEventListener('pointerdown', e => { aShift = e.shiftKey; addEventListener('pointerup', () => { aShift = false; }, { once: true }); }, true);
function editLfo(fn, turnOn = true, shared = false, sh = aShift){
  const g = curGif(); if (!g) return;
  const A = g.lfo[aSel] || (g.lfo[aSel] = lfoDef(aSel));
  fn(A); if (turnOn) A.on = true;
  if (shared && sh) for (const k in g.lfo) if (k !== aSel && g.lfo[k] && g.lfo[k].on) fn(g.lfo[k]);   // (Min / Max aren't shared: each target has its own units)
  syncAutoUI(g); syncXfUI();
}
onSeg($('#aTgt'), (b, e) => { const g = curGif(); aSel = b.dataset.v; if (g) syncAutoUI(g); });
$('#aOn').addEventListener('change', e => editLfo(A => A.on = e.target.checked, false));
onSeg($('#aShape'), (b, e) => { editLfo(A => A.shape = b.dataset.v); });
onSeg($('#aSync'), (b, e) => { editLfo(A => A.sync = b.dataset.v); });
const peek = end => { const g = curGif(); lfoPeek = g ? { g, k: aSel, end, t: performance.now() } : null; };
$('#aMin').addEventListener('input', e => { editLfo(A => A.min = +e.target.value); peek('min'); });
$('#aMax').addEventListener('input', e => { editLfo(A => A.max = +e.target.value); peek('max'); });
['#aMin', '#aMax'].forEach(id => $(id).addEventListener('pointerdown', () => { peek(id === '#aMin' ? 'min' : 'max'); const hold = setInterval(() => lfoPeek && (lfoPeek.t = performance.now()), 200);   // held: keep showing it
  addEventListener('pointerup', () => clearInterval(hold), { once: true }); }));
$('#aPer').addEventListener('input', e => { const g = curGif(); if (!g) return; const v = PER_FAM[perFam((g.lfo[aSel] || lfoDef(aSel)).per)][+e.target.value][0]; editLfo(A => A.per = v, true, true); });
onSeg($('#aPerFam'), b => editLfo(A => A.per = perNear(b.dataset.v, A.per), true, false));   // Even / Dotted / Triplet: the nearest Cycle in that family
$('#aPh').addEventListener('input', e => editLfo(A => A.ph = +e.target.value, true, true));
$('#aSk').addEventListener('input', e => { editLfo(A => A.sk = +e.target.value, true, true); e.target.nextElementSibling.textContent = skFmt(+e.target.value); });
[['#aHoldBtn', 'hold'], ['#aInv', 'inv']].forEach(([q, k]) => $(q).addEventListener('click', e => { const g = curGif(), A = g && (g.lfo[aSel] || lfoDef(aSel)); if (!A) return; const v = !A[k]; editLfo(B => B[k] = v, true, true, e.shiftKey); }));   // toggles; Shift+click: every running LFO of this GIF (the click's own Shift: the pointerup before it already cleared aShift, 0.89.0's bug)
$('#aGap').addEventListener('input', e => editLfo(A => A.gap = GAP_OPTS[+e.target.value][0], true, true));
A_ENV.forEach(([id, k]) => { $(id).max = ENV_OPTS.length - 1; $(id).addEventListener('input', e => editLfo(A => A[k] = ENV_OPTS[+e.target.value][0], true, true)); });
$('#aES').addEventListener('input', e => editLfo(A => A.es = +e.target.value, true, true));
onSeg($('#aEnv'), b => editLfo(A => A.em = b.dataset.v));
// Envelope: reset, and graph or sliders (the same choice as the effect envelope's). As a graph, the scope's points drag:
// Attack (across), Decay (across) with Sustain (up / down), Release (across), on the same steps as the sliders
$('#aEnvReset').addEventListener('click', () => editLfo(A => { A.ea = 0; A.ed = 4; A.es = 0; A.er = 1; }));
$('#aEnvLoop').addEventListener('click', e => { const g = curGif(), A = g && (g.lfo[aSel] || lfoDef(aSel)); if (!A) return; const v = !A.eloop; editLfo(B => B.eloop = v, true, true, e.shiftKey); });
$('#aEnvView').addEventListener('click', () => $('#envView').click());
function syncAEnvView(){ $('#aEnvView').innerHTML = envSliders ? ENV_IC_GRAPH : ENV_IC_SL; $('#aEnvView').title = envSliders ? 'Show the envelope as a graph (drag its points)' : 'Show the envelope as sliders';
  $('#gPanes [data-pane=auto]').classList.toggle('envgraph', !envSliders); }
syncAEnvView();
let aEnvDrag = null;
const aEnvGeo = (A, cv, span) => { const d = devicePixelRatio || 1, w = cv.width, h = cv.height, pad = 5 * d, a = A.ea ?? 0, dd = A.ed ?? 4, r = A.er ?? 1, s = A.es ?? 0, rs = Math.max(a + dd, 1);
  span = span || Math.max(a + dd + 1 + r, 1) * 1.1; const X = b => b / span * w, Y = v => h - pad - v * (h - 2 * pad);
  return { span, d, w, h, pad, rs, pts: [['a', X(a), Y(1)], ['d', X(a + dd), Y(s)], ['r', X(rs + r), Y(0)]], segs: [['s', X(a + dd), X(rs), Y(s)]] }; };
const aEnvOn = () => { const g = curGif(), A = g && g.lfo[aSel]; return !envSliders && A && (A.em || 'off') !== 'off' ? A : null; };
const AENV_SCOPE_TIP = $('#aScope').title;
const envNear = t => ENV_OPTS.reduce((p, o) => Math.abs(o[0] - t) < Math.abs(p[0] - t) ? o : p)[0];   // a time in beats, on the envelope steps
const envName = v => ENV_OPTS[optIdx(ENV_OPTS, v)][1];
const aEnvEd = envEditor($('#aScope'), {   // GIF › Auto › Envelope as a graph (0.89: the shared editor)
  on: () => !!aEnvOn(),
  pts: () => aEnvGeo(aEnvOn(), $('#aScope'), aEnvDrag && aEnvDrag.span).pts,
  segs: () => aEnvGeo(aEnvOn(), $('#aScope'), aEnvDrag && aEnvDrag.span).segs,
  reach: () => 14 * (devicePixelRatio || 1),
  begin: k => { aEnvDrag = { k, span: aEnvGeo(aEnvOn(), $('#aScope')).span }; },
  move: (k, px, py) => { const G = aEnvGeo(aEnvOn(), $('#aScope'), aEnvDrag.span), b = px / G.w * G.span, v = clamp(1 - (py - G.pad) / (G.h - 2 * G.pad), 0, 1);
    editLfo(A => { if (k === 's') A.es = Math.round(v * 20) / 20; else if (k === 'a') A.ea = envNear(b); else if (k === 'd'){ A.ed = envNear(b - (A.ea ?? 0)); A.es = Math.round(v * 20) / 20; } else A.er = envNear(b - G.rs); }); },
  end: () => { aEnvDrag = null; },
  reset: k => editLfo(B => { if (k === 's') B.es = 0; else if (k === 'a') B.ea = 0; else if (k === 'd'){ B.ed = 4; B.es = 0; } else B.er = 1; }),
  tip: { a: envTip('a', ', on each pad hit'), d: envTip('d', ' while the pad is held'), r: envTip('r', ', once the pad is let go'), s: 'Sustain: drag the line up or down (held while the pad is held) · double-click: 0' },
  label: k => { const A = aEnvOn(); return k === 's' ? `Sustain ${Math.round((A.es ?? 0) * 100)}%` : k === 'a' ? `Attack ${envName(A.ea ?? 0)}` : k === 'd' ? `Decay ${envName(A.ed ?? 4)} · Sustain ${Math.round((A.es ?? 0) * 100)}%` : `Release ${envName(A.er ?? 1)}`; },
  idle: () => AENV_SCOPE_TIP,
  redraw: () => { const g = curGif(); if (g) drawLfoScope(g); },
});
[['#aEA', 'a'], ['#aED', 'd'], ['#aER', 'r']].forEach(([q, k]) => { $(q).closest('.field').title = ENV_WORDS[k]; });
$('#aES').closest('.field').title = 'Sustain: the level it rests at while the pad is held, after Decay';
$('#aResetAll').addEventListener('click', () => { const g = curGif(); if (!g) return; const n = LFO_T.filter(t => g.lfo[t[0]] && g.lfo[t[0]].on).length; g.lfo = {}; syncAutoUI(g); syncXfUI(); toast2(n ? `Automation off (${n} LFO${n > 1 ? 's' : ''} reset)` : 'No automation to reset'); });
$('#aReset').addEventListener('click', () => { const g = curGif(); if (!g) return; delete g.lfo[aSel]; syncAutoUI(g); syncXfUI(); });

// ---- scopes (drawn by the main loop while their tab is showing) ----
let gTab = 'play';
function scopeCtx(cv){
  const d = devicePixelRatio || 1, w = Math.round(cv.clientWidth * d), h = Math.round(cv.clientHeight * d);
  if (!w || !h) return null;
  if (cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const x = cv.getContext('2d'); x.clearRect(0, 0, w, h); return [x, w, h, d];
}
const clipOf = p => { for (const L of layers){ const c = L.clips.find(c => c.pad === p); if (c) return c; } return null; };
function drawScopes(){
  if (fxSt.some((S, i) => fxLevel(i, clock.beat) > 0) || fxEnvDrag) drawFxEnv();
  liveMods();
  const g = curGif(); if (!g) return;
  if (gTab === 'auto') drawLfoScope(g); else if (gTab === 'play') drawEnvScope(g);
}
// 0.99.4: a slider under an LFO shows the value it has right now (effect Amount / Rate / Size; a GIF's Transform, Opacity and
// Colour Adjust under GIF › Auto). Not while it's being dragged; when the LFO stops, the slider goes back to the value as set.
let liveWas = new Set();
function liveMods(){
  const now = new Set(), b = clock.beat, put = (id, v, txt) => { const el = $(id); if (!el || el.matches(':active')) return; now.add(id); el.value = v; el.nextElementSibling.textContent = txt; };
  const X = typeof fxEd === 'function' ? fxEd() : null, d = FX_DEFS[selFx < NFX ? selFx : preEd];
  if (X && X.mod && d && !fxModK) for (const k of ['amt', 'rate', 'size']){ const M = X.mod[k]; if (!M || !M.on || !fxModPlain(k)) continue;
    if (k === 'amt'){ const pp = amtPart(d, X), v = modAmt(X, b) * (pp ? (X.pamt?.[pp] ?? X.amt) / (X.amt || 1) : 1); put('#fxAmt', v, Math.round(v * 100) + '%'); }
    else { const L = k === 'rate' ? FX_RATES : FX_SIZES, i = clamp(Math.round(fxModV(M, b)), 0, L.length - 1); put(k === 'rate' ? '#fxRate' : '#fxSize', i, L[i][1]); } }
  const c = selClip(), g = c && pads[c.pad] && pads[c.pad].gif;
  if (g && g.lfo){ const on = k => g.lfo[k] && g.lfo[k].on, e = effClip(c, g);
    XF.forEach(([id, key, fmt]) => { if (XF_LFO[id].some(on)) put(id, e[key], fmt(e[key])); });
    for (const [id, k, key] of [['#xFx', 'fx', 'flipX'], ['#xFy', 'fy', 'flipY']]) if (on(k) && !$(id).matches(':active')){ now.add(id); $(id).checked = !!e[key]; }   // (0.99.5: the flips too)
    if (!g.hsv.off) HSV_UI.forEach(([id, k, fmt]) => { if (on(k)){ const v = k === 'h' ? Math.round(mod(g.hsv.h + e.H + 180, 360) - 180) : +(g.hsv[k] * e[k.toUpperCase()]).toFixed(2); put(id, v, fmt(v)); } }); }
  for (const id of liveWas) if (!now.has(id)){ if (id.startsWith('#fx')) syncFxUI(); else if (id.startsWith('#x')) syncXfUI(); else syncGifUI(); break; }
  liveWas = now;
}
function scopeTrace(x, w, h, d, fn, on){                 // fn: 0..1 across → 0..1 up
  const pad = 5 * d, y = v => h - pad - v * (h - 2 * pad);
  x.strokeStyle = `rgba(${TC.envRgb},.2)`; x.lineWidth = d; x.beginPath(); x.moveTo(0, y(0.5)); x.lineTo(w, y(0.5)); x.stroke();
  x.strokeStyle = on ? TC.env : TC.faint; x.lineWidth = 1.5 * d; x.beginPath();
  for (let px = 0; px <= w; px += d){ const v = fn(px / w); px ? x.lineTo(px, y(v)) : x.moveTo(px, y(v)); }
  x.stroke(); return y;
}
function scopeDot(x, px, py, d){ x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 3 * d, 0, Math.PI * 2); x.fill(); }
function drawLfoScope(g){
  const S = scopeCtx($('#aScope')); if (!S) return; const [x, w, h, d] = S;
  const A = g.lfo[aSel] || lfoDef(aSel), i = LFO_T.findIndex(t => t[0] === aSel), c = clipOf(selPad) || { startBeat: 0 };
  const t = A.sync === 'trig' ? clock.beat - c.startBeat : clock.beat, L = A.per + (A.gap || 0), seed = lfoSeed(g, i);
  if ((A.em || 'off') !== 'off'){                    // with an envelope: one hit held for a beat, the dot where the last hit is now
    const a = A.ea ?? 0, dd = A.ed ?? 4, r = A.er ?? 1, span = aEnvDrag ? aEnvDrag.span : Math.max(a + dd + 1 + r, 1) * 1.1, sh = { hitBeat: 0, relBeat: 1 };
    const val = (u, cl) => A.em === 'only' ? lfoEnv(A, cl, u) : lfoShape(A, lfoPosT(A, u), seed) * lfoEnv(A, cl, u);
    const y = scopeTrace(x, w, h, d, u => val(u * span, sh), A.on);
    const hit = c.hitBeat !== undefined ? clock.beat - c.hitBeat : -1;
    const P = aEnvOn(); if (P){ const G = aEnvGeo(A, $('#aScope'), aEnvDrag && aEnvDrag.span);
      if (A.em === 'depth'){ x.save(); x.strokeStyle = TC.env; x.globalAlpha = 0.45; x.setLineDash([3 * d, 3 * d]); x.lineWidth = d; x.beginPath();   // LFO depth: the envelope itself, dashed, so its points sit on a line (the solid trace is the LFO it scales)
        for (let i = 0; i <= 160; i++){ const u = i / 160 * G.span, px = u / G.span * G.w, py = G.h - G.pad - lfoEnv(A, sh, u) * (G.h - 2 * G.pad); i ? x.lineTo(px, py) : x.moveTo(px, py); }
        x.stroke(); x.restore(); } aEnvEd.draw(x, d); }   // graph: its points (the shared editor)
    if (hit >= 0 && hit < span) scopeDot(x, hit / span * w, y(val(hit, { hitBeat: 0, relBeat: c.relBeat === null ? null : (c.relBeat ?? c.hitBeat) - c.hitBeat })), d);
    return;
  }
  const y = scopeTrace(x, w, h, d, u => lfoShape(A, lfoPosT(A, t + (u - 0.75) * 2 * L), seed), A.on);   // two cycles (with their gaps), now at 3/4
  scopeDot(x, w * 0.75, y(lfoShape(A, lfoPosT(A, t), seed)), d);
  if (aSel === 'fx' || aSel === 'fy'){                // the flips (0.99.5): flipped where Min → Max puts the LFO past 50%; shaded, with that line dashed
    const sp = A.max - A.min, vt = Math.abs(sp) < 1e-6 ? (A.min > 0.5 ? -1 : 2) : (0.5 - A.min) / sp, up = sp >= 0, fn = u => lfoShape(A, lfoPosT(A, t + (u - 0.75) * 2 * L), seed);
    x.save(); x.fillStyle = `rgba(${TC.envRgb},.18)`;
    for (let px = 0; px < w; px += d){ const v = fn(px / w); if (up ? v > vt : v < vt) x.fillRect(px, 0, d, h); }
    if (vt > 0 && vt < 1){ x.strokeStyle = `rgba(${TC.envRgb},.6)`; x.lineWidth = d; x.setLineDash([3 * d, 3 * d]); x.beginPath(); x.moveTo(0, y(vt)); x.lineTo(w, y(vt)); x.stroke(); }
    x.restore(); }
}
// GIF › Play › Trigger's graph: Fade in, Hold (when it's a time) and Fade out drag like an effect's envelope points (0.89)
let tEnvGeo = null, tEnvDrag = null;
const T_ENV_WORDS = { a: 'Fade in: how long the GIF takes to appear on a hit', h: 'Hold: how long it stays fully on', r: 'Fade out: how long it takes to disappear' };
const tEnvEd = envEditor($('#tScope'), {
  on: () => { const g = curGif(); return !!(g && g.trig === 'fade' && tEnvGeo && tEnvGeo.g === g); },
  pts: () => { const G = tEnvGeo, X = b => b / G.span * G.w; return [['a', X(G.a), G.top], ...(G.editH ? [['h', X(G.a + G.hold), G.top]] : []), ['r', X(G.a + G.hold + G.r), G.bot]]; },
  reach: () => 14 * (devicePixelRatio || 1),
  begin: k => { tEnvDrag = { k, span: tEnvGeo.span }; },
  move: (k, px) => { const g = curGif(), G = tEnvGeo; if (!g || !G) return; const b = px / G.w * G.span;
    if (k === 'a') g.env.a = envNear(b); else if (k === 'h') g.env.h = envNear(b - G.a); else g.env.r = envNear(b - G.a - G.hold);
    syncTrigSliders(g); },
  end: () => { tEnvDrag = null; commit(); },
  reset: k => { const g = curGif(); if (!g) return; const D = { a: 3, h: 4, r: 5 }; g.env[k] = ENV_OPTS[D[k]][0]; syncTrigSliders(g); commit(); },   // (the sliders' own defaults)
  tip: { a: T_ENV_WORDS.a + ' · drag · double-click: its default', h: T_ENV_WORDS.h + ' · drag · double-click: its default', r: T_ENV_WORDS.r + ' · drag · double-click: its default' },
  label: k => { const g = curGif(); return k === 'a' ? `Fade in ${envName(g.env.a)}` : k === 'h' ? `Hold ${envName(g.env.h)}` : `Fade out ${envName(g.env.r)}`; },
  idle: () => 'Envelope: fade in, hold, fade out — the dot follows the last hit',
  redraw: () => { const g = curGif(); if (g) drawEnvScope(g); },
});
function syncTrigSliders(g){ ENV_UI.forEach(([id, k]) => { const i = optIdx(ENV_OPTS, g.env[k]); $(id).value = i; $(id).nextElementSibling.textContent = ENV_OPTS[i][1]; }); }
function drawEnvScope(g){
  const S = scopeCtx($('#tScope')); if (!S) return; const [x, w, h, d] = S;
  const E = g.env, T = envTimes(g), c = clipOf(selPad), hold = E.gate ? Math.max(E.h, 1) : T.h, span = tEnvDrag ? tEnvDrag.span : Math.max(T.a + hold + T.r, 0.5) * 1.1;   // (held steady while a point is dragged)
  const ce0 = c && g.trig === 'fade' && !tEnvDrag ? envOf(c, g, clock.beat) : null, live0 = ce0 && envLevel(c, g, clock.beat) > 0;
  const shape = { env: { t0: 0, from: 0, rel: E.gate ? T.a + hold : null, noGate: false } };   // the envelope as set (T: the times as played, One play shrinks the fades)
  // 0.99.3: a retrigger mid-fade starts from where it was, and runs the rest of this same curve (the fade in keeps its speed), so the
  // graph stays put and the dot starts further along it, where the fade in reaches that level (0.95 redrew the curve from that level,
  // which tilted the fade in on every retrigger)
  const from = live0 ? ce0.from || 0 : 0; let skip = 0;
  if (from > 0 && T.a > 0){ let lo = 0, hi = 1; for (let k = 0; k < 20; k++){ const m = (lo + hi) / 2; if (ease(g, m) < from) lo = m; else hi = m; } skip = lo * T.a; }
  const y = scopeTrace(x, w, h, d, u => envLevel(shape, g, u * span), g.trig === 'fade');
  tEnvGeo = { g, span, w, a: T.a, hold, r: T.r, top: y(1), bot: y(0), editH: !E.gate && E.len !== 'gif' };   // for the points (0.89: they drag, like the other envelopes)
  tEnvEd.draw(x, d);
  const ce = c && envOf(c, g, clock.beat);
  if (g.trig === 'fade' && ce){
    const lv = envLevel(c, g, clock.beat); let t = clock.beat - ce.t0 + (ce === ce0 ? skip : 0);
    if (E.gate && !c.env.noGate){ const rs = T.a + hold;   // Hit › Hold: the graph keeps its shape; while the pad is held the dot waits where the fade out starts,
      t = c.env.rel === null ? Math.min(t, rs) : rs + Math.max(0, clock.beat - c.env.rel); }   // and once let go it runs down the fade out from there
    if (lv > 0) scopeDot(x, Math.min(w - 3 * d, t / span * w), y(lv), d);
  }
}
function syncRangeUI(g){
  const F = g.src.length;
  [['#gIn', 'inF'], ['#gOut', 'outF'], ['#gStart', 'startF']].forEach(([id, k]) => { const el = $(id); el.max = F - 1; el.value = g[k]; el.nextElementSibling.textContent = g[k]; });
}
// the panel's picture: as it's drawn (its key, colour, palette, swaps) or, right-click (0.99), as loaded; remembered
let gPrevRaw = Prefs.get('vjif-gprevraw') === '1';
const gPrevUI = () => { const c = $('#gPrev'); c.classList.toggle('raw', gPrevRaw); c.title = (gPrevRaw ? 'The selected GIF as loaded (its first frame, no key, colour or palette)' : 'The selected GIF as drawn: its first frame with its key, colour, palette and swaps (not its GIF effects)') + ' · right-click: ' + (gPrevRaw ? 'as drawn' : 'as loaded'); };
$('#gPrev').addEventListener('contextmenu', e => { e.preventDefault(); gPrevRaw = !gPrevRaw; Prefs.set('vjif-gprevraw', gPrevRaw ? '1' : '0'); gPrevUI(); drawGifThumb(); });
gPrevUI();
function drawPrev(g, f, top = true){   // Play › Frames' picture: frame f; the panel's picture at the top right: always the first frame (0.95: the sliders don't move it)
  for (const c of top ? [$('#gPrev'), $('#gPrevPlay')] : [$('#gPrevPlay')]){ const img = c.id === 'gPrev' && gPrevRaw ? g.src[0] : fxImage(g, c.id === 'gPrev' ? 0 : f), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    const s = Math.min(c.width / img.width, c.height / img.height); x.drawImage(img, (c.width - img.width*s)/2, (c.height - img.height*s)/2, img.width*s, img.height*s); }
}
[['#gIn', 'inF'], ['#gOut', 'outF'], ['#gStart', 'startF']].forEach(([id, k]) => {
  $(id).addEventListener('input', e => {
    const g = curGif(); if (!g) return;
    const v = +e.target.value; g[k] = v; g.trimOff = false; syncSwitches(g);   // (touching it switches Frames on)
    if (k === 'inF' && g.outF < v) g.outF = v;          // dragging in past out pushes out along (and vice versa)
    if (k === 'outF' && g.inF > v) g.inF = v;
    rebuildSeq(g); syncRangeUI(g); drawPrev(g, g[k], false); showCycle(g);
  });
  $(id).addEventListener('change', () => { const g = curGif(); if (g){ syncGifUI(); renderPad(selPad); } });
});
onSeg($('#kRegion'), (b, e) => { const g = curGif(); if (!g) return;
  g.key.region = b.dataset.v; if (g.key.region !== 'all') g.key.on = true; syncGifUI(); scheduleFx(g, 0); });
$('#kOn').addEventListener('change', e => { const g = curGif(); if (g){ g.key.on = e.target.checked; scheduleFx(g, 0); } });
$('#kCol').addEventListener('input', e => { const g = curGif(); if (g){ g.key.color = hex2rgb(e.target.value); if (g.key.on) scheduleFx(g, 200); } });
['kTol', 'kSoft'].forEach(id => $('#' + id).addEventListener('input', e => {
  const g = curGif(); if (!g) return;
  g.key[id === 'kTol' ? 'tol' : 'soft'] = +e.target.value;
  e.target.nextElementSibling.textContent = (+e.target.value * 100).toFixed(0) + '%';
  if (g.key.on) scheduleFx(g, 250);
}));
// Pick (Key, Swap): the next click in the preview samples the GIF there. picking: false | 'key' | 'swap'
const PICK_BTN = { key: '#kPick', swap: '#swPick' };
$('#kPick').addEventListener('click', () => picking === 'key' ? stopPick() : startPick('key'));
$('#swPick').addEventListener('click', () => picking === 'swap' ? stopPick() : startPick('swap'));
function startPick(k){ stopPick(); picking = k; $(PICK_BTN[k]).classList.add('armed'); pv.style.cursor = 'crosshair'; }
function stopPick(){ picking = false; Object.values(PICK_BTN).forEach(q => { $(q).classList.remove('armed'); }); pv.style.cursor = ''; }
function pickAt(px, py){
  const kind = picking; stopPick();
  // the eyedropper reads the GIF this panel edits, under the cursor, even where another GIF covers it, and the selection
  // stays as it is (0.91: it took whatever was on top, and selected it)
  const g = curGif(); if (!g) return toast('Select a GIF first');
  const mine = layers.flatMap(L => L.clips).filter(c => pads[c.pad].gif === g), on = mine.filter(c => inClip(liveClip(c), px, py));
  const c0 = on.find(c => sampleClip(liveClip(c), px, py, true)[3] > 16) || on[0]; if (!c0) return toast(`Click on ${g.name} in the preview`);
  const c = c0, d = sampleClip(liveClip(c), px, py, true);
  if (kind === 'swap'){                              // the swatch nearest that colour (the GIF's own colours, before its swaps)
    const pal = gifPalette(g), dist = q => Math.abs(q[0] - d[0]) + Math.abs(q[1] - d[1]) + Math.abs(q[2] - d[2]);
    const best = pal.reduce((a, q) => !a || dist(q) < dist(a) ? q : a, null); if (!best) return;
    swSel = best.slice(); syncSwapUI(g); revealSoon('#swList .swr.sel'); return;
  }
  g.key.color = [d[0], d[1], d[2]]; g.key.seed = [d.u, d.v]; g.key.on = true;
  syncGifUI(); scheduleFx(g, 0);
}
// what a click just opened further down (a swap's editor row): scrolled into view if it's below the panel's edge
// a row that just appeared, scrolled into view in its column (clear of the faded edges); done by hand: a smooth
// scrollIntoView could be cut short by the next redraw and leave it out of sight
function revealSoon(q){ requestAnimationFrame(() => { const el = typeof q === 'string' ? document.querySelector(q) : q; if (!el) return;
  el.scrollIntoView({ block: 'nearest', behavior: 'instant' }); }); }   // the browser does the maths (UI zoom included); scroll-margin keeps it clear of the column's edges (0.87.3)
// Clearing a pad (in this scene) is undoable: its GIF instance and its sprites are kept in the undo entry,
// and only freed when that entry leaves the history. The decoded GIF stays in the pool either way.
function clearPad(i, fromRedo = false){
  const p = pads[i]; if (!p.gif) return;
  if (!fromRedo) commit();                           // whatever was pending becomes its own step first
  const g = p.gif, removed = [];                     // [layer, position, clip, was selected]
  layers.forEach((l, li) => { for (let k = l.clips.length - 1; k >= 0; k--) if (l.clips[k].pad === i){ removed.push([li, k, l.clips[k], l.sel === l.clips[k]]); l.clips.splice(k, 1); }
    if (!l.clips.includes(l.sel)) l.sel = null; });
  p.gif = null; pending.delete(i); p.el.classList.remove('wait');
  pushStep({ kind: 'clear', pad: i, g, removed: removed.reverse(), sid: sidNow() }, fromRedo);
  afterPadChange(i); hist.cur = histState(); updHistUI();
}
function restoreClear(E){
  toScene(E.sid);
  const p = pads[E.pad]; if (p.gif) return false;    // the pad was refilled since: nothing to put back
  p.gif = E.g;
  for (const [li, k, c, sel] of E.removed){ const L = layers[li]; L.clips.splice(Math.min(k, L.clips.length), 0, c); if (sel) L.sel = c; }
  afterPadChange(E.pad); return true;
}
// a Background slot plays exactly when it holds a GIF (undo / redo of a replaced GIF lands here too)
function bgSync(i){ if (!isBgPad(i)) return; const L = layers[BG_LAYER], c = L.clips.find(c => c.pad === i);
  if (pads[i].gif && !c){ const n = newClip(i); n.startBeat = clock.beat; n.startTime = performance.now(); L.clips.push(n); }
  else if (!pads[i].gif && c){ L.clips = L.clips.filter(x => x !== c); if (L.sel === c) L.sel = null; } }
function afterPadChange(i){ bgSync(i); renderScenes(); renderPad(i); selectPad(i); syncLayerUI(); syncXfUI(); updateMem(); renderPool(); redraw.all = true; }

// ---- drop shadow (GIF › Display › Shadow): moving a setting switches it on ----
const SH_F = [['#shX', 'x', v => (v > 0 ? '+' : '') + v + ' px'], ['#shY', 'y', v => (v > 0 ? '+' : '') + v + ' px'], ['#shB', 'blur', v => v + ' px'], ['#shO', 'op', v => Math.round(v * 100) + '%'], ['#shC', 'cut', v => v > 0 ? Math.round(v * 100) + '%' : 'off'], ['#shS', 'soft', v => v > 0 ? Math.round(v * 100) + '%' : 'hard'], ['#shK', 'skew', v => v ? (v > 0 ? '+' : '') + Math.round(v * 45) + '°' : '0°']];   // (Skew 0.96: the slant, as the angle at ±1)
function syncShadowUI(g){
  const S = g.shadow || (g.shadow = { ...SHADOW_DEF });
  $('#shOn').checked = !!S.on; $('#shCol').value = S.col; $('#shTurn').checked = !!S.turn; $('#shFloor').checked = !!S.floor; $('#shTurn').closest('.field').classList.toggle('dimmed', !S.on);
  SH_F.forEach(([id, k, f]) => { $(id).value = S[k]; $(id).nextElementSibling.textContent = f(S[k]); $(id).value = S[k] ?? 0; $(id).nextElementSibling.textContent = f(S[k] ?? 0); $(id).closest('.field').classList.toggle('dimmed', !S.on || (k === 'soft' && !(S.cut > 0))); });
}
SH_F.forEach(([id, k, f]) => $(id).addEventListener('input', e => { const g = curGif(); if (!g) return; g.shadow = { ...g.shadow, [k]: +e.target.value, on: true }; syncShadowUI(g); redraw.all = true; }));
$('#shTurn').addEventListener('change', e => { const g = curGif(); if (!g) return; g.shadow = { ...g.shadow, turn: e.target.checked, on: true }; syncShadowUI(g); redraw.all = true; });
$('#shFloor').addEventListener('change', e => { const g = curGif(); if (!g) return; g.shadow = { ...g.shadow, floor: e.target.checked, on: true }; syncShadowUI(g); redraw.all = true; });   // 0.99.5: a floor shadow
$('#shReset').addEventListener('click', () => { const g = curGif(); if (!g) return; g.shadow = { ...SHADOW_DEF }; syncShadowUI(g); redraw.all = true; });
$('#shOn').addEventListener('change', e => { const g = curGif(); if (!g) return; g.shadow = { ...g.shadow, on: e.target.checked }; syncShadowUI(g); redraw.all = true; });
$('#shCol').addEventListener('input', e => { const g = curGif(); if (!g) return; g.shadow = { ...g.shadow, col: e.target.value, on: true }; syncShadowUI(g); redraw.all = true; });

// GIF › Play / Colour / Auto sections: headings only (0.99.5: they no longer fold; a changed one is marked by markFolds)
const gFold = new Set();
document.querySelectorAll('#gPanes [data-pane=play] > .sub, #gPanes [data-pane=colour] > .sub, #gPanes [data-pane=auto] > .sub[data-fold]').forEach(s => s.classList.add('gsec'));
// Settings' sections fold the same way (remembered on their own)
{ const sFold = new Set(Prefs.json('vjif-setfold', []));
  document.querySelectorAll('#setPanel .setBody > .sub').forEach(s => {
    const t = s.querySelector('span'), name = t.textContent.trim(); s.classList.add('foldable');
    const apply = () => { const shut = sFold.has(name); s.classList.toggle('shut', shut); for (let n = s.nextElementSibling; n && !n.classList.contains('sub'); n = n.nextElementSibling) n.classList.toggle('foldhid', shut); };
    t.addEventListener('click', () => { sFold.has(name) ? sFold.delete(name) : sFold.add(name); Prefs.setJson('vjif-setfold', [...sFold]); apply(); });
    apply(); }); }
// a section that differs from its defaults: its fold arrow in the signal colour (readable at a glance, folded or not)
['input', 'change', 'click'].forEach(t => $('#gPanes').addEventListener(t, () => queueMicrotask(markFolds)));
// each section's own switch (off: skipped, its settings kept); Key and Shadow have theirs elsewhere
function syncSwitches(g){ if (!g) return; $('#fOn').checked = !g.trimOff; $('#tOn').checked = g.trig === 'fade'; $('#hOn').checked = !g.hsv.off && !(g.hsv.off === undefined && !hsvOn(g)); $('#pOn').checked = palOn(g); $('#swOn').checked = !g.swapOff; }
const swFx = fn => e => { const g = curGif(); if (!g) return; fn(g, e.target.checked); scheduleFx(g, 0); renderPad(selPad); syncGifUI(); redraw.all = true; };
$('#fOn').addEventListener('change', e => { const g = curGif(); if (!g) return; g.trimOff = !e.target.checked; rebuildSeq(g); syncGifUI(); redraw.all = true; });
$('#tOn').addEventListener('change', e => { const b = $(`#tMode [data-v=${e.target.checked ? 'fade' : 'stay'}]`); if (b) b.click(); });
$('#hOn').addEventListener('change', swFx((g, on) => { g.hsv.off = !on; }));
$('#pOn').addEventListener('change', swFx((g, on) => { if (on && !(g.pal.i >= 0)) g.pal.i = 0; g.pal.off = !on; }));
$('#swOn').addEventListener('change', swFx((g, on) => { g.swapOff = !on; }));
function markFolds(){                                // (not the switches: on a click this runs before the switch's own change event, and would undo it)
  document.querySelectorAll('#gPanes .sub.gsec').forEach(s => {
    let mod = [...s.querySelectorAll('input[type=checkbox]')].some(c => c.checked !== (c.dataset.def === '1'));   // its own switch away from its default (Key, Shadow on; Adjust off…)
    for (let n = s.nextElementSibling; n && !n.classList.contains('sub'); n = n.nextElementSibling){
      n.querySelectorAll('input[type=range][data-def]').forEach(r => { const d = r.dataset.def, v = d === 'min' ? +r.min : d === 'max' ? +r.max : +d; if (Math.abs(+r.value - v) > 1e-6) mod = true; });
      n.querySelectorAll('select').forEach(q => { if (q.selectedIndex > 0) mod = true; });
      n.querySelectorAll('input[type=checkbox][data-def]').forEach(c => { if (c.checked !== (c.dataset.def === '1')) mod = true; });
      if (n.id === 'swList' && n.children.length) mod = true;
    }
    s.classList.toggle('mod', mod);
  });
}
// the right column's own sections (Transform, GIF) fold too: click the heading's name
document.querySelectorAll('#side > h2').forEach(h => { if (h.firstChild.textContent.trim() === 'GIF'){ gFold.delete('h2:GIF'); return; }   // (0.90: GIF is the whole panel, not a fold)
  const name = 'h2:' + h.firstChild.textContent.trim(); h.classList.add('foldable');
  const apply = () => { const shut = gFold.has(name); h.classList.toggle('shut', shut); for (let n = h.nextElementSibling; n && n.tagName !== 'H2' && !n.classList.contains('gfoot'); n = n.nextElementSibling) n.classList.toggle('foldhid', shut); };
  const lab = document.createElement('span'); lab.className = 'fname'; lab.textContent = h.firstChild.textContent; h.firstChild.replaceWith(lab);
  lab.addEventListener('click', () => { gFold.has(name) ? gFold.delete(name) : gFold.add(name); Prefs.setJson('vjif-gfold', [...gFold]); apply(); });
  apply();
});

// ---- GIF › FX (0.97, ID-223): this GIF's own effects, each on / off with a style and an Amount ----
let gfxBuilt = false;
const gfxDef = id => ({ on: false, amt: 0.8, style: GFX_STYLES(id)[0][0] });
function buildGfx(){
  gfxBuilt = true;
  $('#gfxList').innerHTML = GFX_IDS.map(id => { const d = FX_DEFS[FXI[id]];
    return `<div class="sub gfxh" data-id="${id}"><span title="${esc(d.title)}">${esc(d.name)}${fxIcon(id)}</span><span class="line"></span><label class="tog" title="${esc(d.name)} on / off"><input type="checkbox" data-gon="${id}"></label></div>
      <div class="gfxrow" data-id="${id}"><div class="seg" data-gst="${id}">${GFX_STYLES(id).map(s => `<button data-v="${s[0]}" title="${esc(s[1])}: ${esc(s[2])}">${esc(STYLE_BTN[s[0]] || STYLE_SHORT[s[0]] || s[1])}</button>`).join('')}</div>
      <input type="range" min="0.05" max="1" step="0.01" data-def="0.8" data-gamt="${id}" title="Amount"><output></output></div>`; }).join('');
  const edit = (id, f) => { const g = curGif(); if (!g) return; const x = { ...gfxDef(id), ...((g.gfx && g.gfx[id]) || {}) }; f(x); g.gfx = { ...(g.gfx || {}), [id]: x };   /* a new object each time: the redraw check keys on it */ redraw.all = true; syncGfxUI(g); };
  $('#gfxList').addEventListener('change', e => { const id = e.target.dataset.gon; if (id) edit(id, x => x.on = e.target.checked); });
  $('#gfxList').addEventListener('input', e => { const id = e.target.dataset.gamt; if (id) edit(id, x => { x.amt = +e.target.value; x.on = true; }); });
  // a style: switches the effect on with it (0.99: the row of an effect that was off ignored clicks). Glitch, Codec and CRT
  // stack like the effect pads: a click takes a style in or out, right-click solos it, right-click again brings the stack back
  const soloWas = {};
  $('#gfxList').addEventListener('click', e => { const b = e.target.closest('[data-gst] button'); if (!b) return; const id = b.closest('[data-gst]').dataset.gst, i = FXI[id], v = b.dataset.v;
    edit(id, x => { if (!x.on){ x.on = true; if (!styleParts(i, x.style).includes(v)) x.style = v; } else x.style = styleToggle(i, x.style, v); delete soloWas[id]; }); });
  $('#gfxList').addEventListener('contextmenu', e => { const b = e.target.closest('[data-gst] button'); if (!b) return; e.preventDefault(); const id = b.closest('[data-gst]').dataset.gst, i = FXI[id], v = b.dataset.v;
    edit(id, x => { x.on = true; if (!FX_MULTI[id]){ x.style = v; return; } const cur = styleNorm(i, x.style);
      if (cur === v && soloWas[id]){ x.style = soloWas[id]; delete soloWas[id]; } else { if (cur !== v) soloWas[id] = cur; x.style = v; } }); });
  $('#gfxReset').addEventListener('click', () => { const g = curGif(); if (!g) return; delete g.gfx; redraw.all = true; syncGfxUI(g); });
}
function syncGfxUI(g){
  if (!gfxReady || !g) return; if (!gfxBuilt) buildGfx();
  for (const id of GFX_IDS){ const x = { ...gfxDef(id), ...((g.gfx && g.gfx[id]) || {}) };
    $(`[data-gon="${id}"]`).checked = !!x.on;
    const P = styleParts(FXI[id], x.style); $(`[data-gst="${id}"]`).querySelectorAll('button').forEach(b => b.classList.toggle('on', P.includes(b.dataset.v)));
    const r = $(`[data-gamt="${id}"]`); r.value = x.amt; r.nextElementSibling.textContent = Math.round(x.amt * 100) + '%';
    document.querySelector(`.gfxrow[data-id="${id}"]`).classList.toggle('off', !x.on); }   // (shown faint, but still takes clicks)
  $('#gTabs [data-v=gfx]').classList.toggle('act', gfxOn(g));
}
