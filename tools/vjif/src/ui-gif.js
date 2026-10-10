// ---------- UI: gif settings ----------
const segHTML = opts => opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('');
$('#gBeats').innerHTML = segHTML(LEN_OPTS);
$('#gSub').innerHTML = segHTML(FRAME_OPTS.map(([b, l]) => [1 / b, l]));   // stored as frames per beat
$('#gRestart').innerHTML = segHTML(RESTART_OPTS);
const segSet = (id, v) => $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', Math.abs(+b.dataset.v - v) < 1e-6 || b.dataset.v === v));
// one handler per button group: sets the GIF's field from the clicked button
[['#gSync', 'sync', false], ['#gLoop', 'loop', false], ['#gBeats', 'beats', true], ['#gSub', 'subdiv', true], ['#gRestart', 'restart', true]].forEach(([id, key, num]) =>
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
function syncGifUI(){
  const p = pads[selPad], g = p.gif;
  $('#gifSettings').classList.toggle('disabled', !g);
  $('#gifName').textContent = `${p.label}${g ? '' : ' · empty'}`;
  $('#gText').hidden = !(g && g.media && g.media.text);
  if (!g){ document.querySelector('[data-pane=play]').classList.remove('textpad'); $('#gInfo').textContent = ''; document.querySelectorAll('#gifSettings [data-for]').forEach(f => f.hidden = f.dataset.for !== 'stretch'); return; }   // empty pad: one of the stacked fields, not all three on top of each other
  $('#gSmooth').checked = !g.crisp;
  document.querySelector('[data-pane=play]').classList.toggle('textpad', !!(g.media && g.media.text));   // lettering: the GIF-only settings are dimmed
  if (!$('#gPal').options.length) $('#gPal').innerHTML = '<option value="-1">None</option>' + FX_PALS.map((P, i) => `<option value="${i}" title="${esc(P.t)}">${esc(P.n)}</option>`).join('');
  $('#gPal').value = String(g.pal ? g.pal.i : -1); $('#gPalD').value = g.pal ? g.pal.d : 0; $('#gPalD').nextElementSibling.textContent = Math.round((g.pal ? g.pal.d : 0) * 100) + '%';
  $('#gPalD').closest('.field').classList.toggle('dimmed', !(g.pal && g.pal.i >= 0));
  segSet('#gSync', g.sync); segSet('#gLoop', g.loop); segSet('#gRes', String(g.media.scale || 1)); $('#gRes').classList.toggle('dimmed', !!g.media.text);
  $('#gSpeed').value = g.speed; $('#gSpeed').nextElementSibling.textContent = g.speed.toFixed(2) + '×';
  segSet('#gBeats', g.beats); segSet('#gSub', g.subdiv); segSet('#gRestart', g.restart);
  showCycle(g);
  document.querySelectorAll('#gifSettings [data-for]').forEach(f => f.hidden = !f.dataset.for.split(' ').includes(g.sync));
  $('#kOn').checked = g.key.on; $('#kCol').value = rgb2hex(g.key.color); segSet('#kRegion', g.key.region || 'all');
  $('#kTol').value = g.key.tol; $('#kTol').nextElementSibling.textContent = (g.key.tol * 100).toFixed(0) + '%';
  $('#kSoft').value = g.key.soft; $('#kSoft').nextElementSibling.textContent = (g.key.soft * 100).toFixed(0) + '%';
  syncRangeUI(g); drawPrev(g, g.startF);
  HSV_UI.forEach(([id, k, fmt]) => { $(id).value = g.hsv[k]; $(id).nextElementSibling.textContent = fmt(g.hsv[k]); });
  if (!$('#gPanes [data-pane="colour"]').classList.contains('off')) syncSwapUI(g);
  segSet('#tMode', g.trig); segSet('#tCurve', g.env.curve); $('#tGate').checked = g.env.gate;
  ENV_UI.forEach(([id, k]) => { const i = optIdx(ENV_OPTS, g.env[k]); $(id).value = i; $(id).nextElementSibling.textContent = ENV_OPTS[i][1]; });
  segSet('#tLen', g.env.len || 'free');
  $('#tEnv').classList.toggle('dimmed', g.trig !== 'fade'); $('#tHoldRow').classList.toggle('dimmed', g.env.gate || g.env.len === 'gif');
  $('#tLenRow').classList.toggle('dimmed', g.env.gate);
  syncAutoUI(g);
  const trimmed = g.seq.length < g.src.length ? ` (playing ${g.seq.length})` : '';
  $('#gInfo').textContent = g.keyMsg || `${g.name} — ${g.src.length} frames${trimmed} · ${g.w}×${g.h}${g.media && g.media.px ? ` (pixel art ×${g.media.px[0]}${g.media.px[1] !== g.media.px[0] ? '×' + g.media.px[1] : ''}, kept at ${g.w / g.media.px[0]}×${g.h / g.media.px[1]})` : ''} · ${(g.total/1000).toFixed(2)} s · ~${(g.bytes/1048576).toFixed(0)} MB`;
}
const curGif = () => pads[selPad].gif;
// readouts too narrow for their text: hovering shows all of it
document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest('.lcd, .tag, output, .seg button, .fxp .t>span');
  if (el && el.scrollWidth > el.clientWidth + 1 && (!el.title || el.dataset.autoTip)){ el.title = el.textContent.trim(); el.dataset.autoTip = 1; } });
onSeg($('#gRes'), (b, e) => { const g = curGif(); if (!g || g.media.text) return;
  const sc = +b.dataset.v, m = g.media, was = m.srcBytes; segSet('#gRes', b.dataset.v);
  setMediaScale(m, sc).then(() => toast2(`${m.name}: ${(was / 1048576).toFixed(0)} → ${(m.srcBytes / 1048576).toFixed(0)} MB`)); });
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
const rgbHex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const sameRgb = (a, b) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
let swSel = null;                                     // the palette colour picked ([r,g,b]) or null; not yet swapped = a waiting row at the end
function syncSwapUI(g){
  if (!g) return;
  $('#swMerge').value = g.swapMerge ?? 0; $('#swMerge').nextElementSibling.textContent = (g.swapMerge ?? 0) ? (g.swapMerge ?? 0) + '' : 'off';
  const pal = gifPalette(g);
  if (swSel && !pal.some(c => sameRgb(c, swSel))) swSel = null;
  $('#swPal').innerHTML = pal.map((c, i) => `<button data-i="${i}" class="${g.swap.some(x => sameRgb(x.from, c)) ? 'on' : ''}${swSel && sameRgb(swSel, c) ? ' sel' : ''}" style="background:${rgbHex(c)}" title="${rgbHex(c)}"></button>`).join('');
  const ae = document.activeElement; if ((ae && ae.type === 'color' && $('#swList').contains(ae)) || (cpk.target && $('#swList').contains(cpk.target))) return;   // a colour picker is open in the list: leave it alone (a clicked × or ∅ still has focus: not that)
  const row = (from, to, i, pend, clr = pend ? false : !!(g.swap[i] && g.swap[i].clear)) => `<div class="swr${pend ? ' pending' : ''}${swSel && sameRgb(swSel, from) ? ' sel' : ''}" data-r="${i}"><i style="background:${rgbHex(from)}"></i>→<label class="swTo${clr ? ' clear' : ''}" style="background:${clr ? '' : rgbHex(to)}" title="${pend ? 'Click: pick what this colour becomes' : 'Click to change'}"><input type="color" data-i="${i}" value="${rgbHex(to)}"></label><button class="iconbtn${clr ? ' on' : ''}" data-k="${i}" title="Transparent: this colour disappears (click again to bring it back)">∅</button>${pend ? '' : `<button class="iconbtn" data-x="${i}" title="Remove this swap">×</button>`}</div>`;
  const pend = swSel && !g.swap.some(x => sameRgb(x.from, swSel));
  $('#swList').innerHTML = g.swap.map((x, i) => row(x.from, x.to, i, false)).join('') + (pend ? row(swSel, swSel, 'new', true) : '');
}
onSeg($('#swPal'), (b, e) => { const g = curGif(); if (!g) return;
  const c = gifPalette(g)[+b.dataset.i];
  if (swSel && sameRgb(swSel, c)) swSel = null;      // again: deselect
  else { if (!g.swap.some(x => sameRgb(x.from, c)) && g.swap.length >= SWAP_MAX) return toast(`Up to ${SWAP_MAX} swaps per GIF`); swSel = c.slice(); }
  syncSwapUI(g);
});
$('#swList').addEventListener('input', e => {
  const g = curGif(); if (!g || !e.target.matches('input[type=color]')) return;
  let x;
  if (e.target.dataset.i === 'new'){ if (!swSel) return; const pc = gifPalette(g).find(c => sameRgb(c, swSel)); x = { from: swSel.slice(), to: swSel.slice(), tol: pc && pc.rad ? pc.rad + 1.5 : undefined }; g.swap.push(x); e.target.dataset.i = g.swap.length - 1; e.target.closest('.swr').classList.remove('pending'); }
  else x = g.swap[+e.target.dataset.i];
  if (!x) return; x.to = hexRgb(e.target.value); e.target.parentElement.style.background = e.target.value; scheduleFx(g, 60);
});
$('#swList').addEventListener('change', e => { const g = curGif(); if (!g) return; e.target.blur(); scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); });
$('#swList').addEventListener('click', e => {
  const g = curGif(); if (!g) return;
  const k = e.target.closest('[data-k]'); if (k){   // transparent: on a pending row it creates the swap first
    let x; if (k.dataset.k === 'new'){ if (!swSel || g.swap.length >= SWAP_MAX) return; const pc = gifPalette(g).find(c => sameRgb(c, swSel)); x = { from: swSel.slice(), to: swSel.slice(), tol: pc && pc.rad ? pc.rad + 1.5 : undefined }; g.swap.push(x); }
    else x = g.swap[+k.dataset.k];
    if (x){ x.clear = !x.clear; scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); commit(); } return; }
  const b = e.target.closest('[data-x]'); if (b){ const x = g.swap[+b.dataset.x]; if (x && swSel && sameRgb(x.from, swSel)) swSel = null; g.swap.splice(+b.dataset.x, 1); scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); }
});
$('#swMerge').addEventListener('input', e => { const g = curGif(); if (!g) return; g.swapMerge = +e.target.value;
  const pal = gifPalette(g); g.swap.forEach(x => { const c = pal.find(c => sameRgb(c, x.from)); if (c) x.tol = c.rad + 1.5; });   // existing swaps follow their new swatch
  scheduleFx(g, 150); syncSwapUI(g); clearTimeout(e.target._t); e.target._t = setTimeout(commit, 400); });
$('#swClear').addEventListener('click', () => { const g = curGif(); if (!g || !g.swap.length) return; g.swap = []; scheduleFx(g, 0); syncSwapUI(g); renderPad(selPad); });

$('#gSmooth').addEventListener('change', e => { const g = curGif(); if (g){ g.crisp = !e.target.checked; renderPad(selPad); redraw.all = true; } });   // a setting of the GIF (in GIF › Play), not of where it's placed
$('#gSpeed').addEventListener('input', e => { const g = curGif(); if (g){ g.speed = +e.target.value; e.target.nextElementSibling.textContent = g.speed.toFixed(2) + '×'; showCycle(g); } });
const HSV_UI = [['#hH', 'h', v => (v > 0 ? '+' : '') + v + '°'], ['#hS', 's', v => (+v).toFixed(2) + '×'], ['#hV', 'v', v => (+v).toFixed(2) + '×']];
HSV_UI.forEach(([id, k, fmt]) => $(id).addEventListener('input', e => {
  const g = curGif(); if (!g) return;
  g.hsv[k] = +e.target.value; e.target.nextElementSibling.textContent = fmt(g.hsv[k]);
  scheduleFx(g, 150);
}));
$('#gPal').addEventListener('change', e => { const g = curGif(); if (!g) return; g.pal = { ...(g.pal || { d: 0 }), i: +e.target.value }; e.target.blur(); scheduleFx(g, 0); syncGifUI(); renderPad(selPad); });
$('#gPalD').addEventListener('input', e => { const g = curGif(); if (!g) return; g.pal = { ...(g.pal || { i: -1 }), d: +e.target.value }; e.target.nextElementSibling.textContent = Math.round(g.pal.d * 100) + '%'; scheduleFx(g, 100); });
$('#hReset').addEventListener('click', () => { const g = curGif(); if (!g) return; Object.assign(g.hsv, { h: 0, s: 1, v: 1 }); scheduleFx(g, 0); syncGifUI(); });

// ---- trigger tab: Stay / Fade one-shot ----
const ENV_UI = [['#tA', 'a'], ['#tH', 'h'], ['#tR', 'r']];
ENV_UI.forEach(([id, k]) => { const el = $(id); el.max = ENV_OPTS.length - 1;
  el.addEventListener('input', e => { const g = curGif(); if (!g) return; const o = ENV_OPTS[+e.target.value]; g.env[k] = o[0]; e.target.nextElementSibling.textContent = o[1]; }); });
onSeg($('#tMode'), (b, e) => { const g = curGif(); if (!g) return;
  g.trig = b.dataset.v; layers.forEach(L => L.clips.forEach(c => { if (c.pad === selPad) c.env = null; }));   // switching hides / shows it at once
  syncGifUI(); redraw.all = true;
});
onSeg($('#tLen'), (b, e) => { const g = curGif(); if (g){ g.env.len = b.dataset.v; syncGifUI(); } });
onSeg($('#tCurve'), (b, e) => { const g = curGif(); if (g){ g.env.curve = b.dataset.v; syncGifUI(); } });
$('#tGate').addEventListener('change', e => { const g = curGif(); if (g){ g.env.gate = e.target.checked; syncGifUI(); } });

// ---- auto tab: one LFO per target ----
let aSel = 'x';
$('#aTgt').innerHTML = LFO_T.map(t => `<button data-v="${t[0]}" title="${t[2]}">${t[1]}</button>`).join('');
$('#aShape').innerHTML = segHTML(SHAPES);
$('#aPer').max = PER_OPTS.length - 1;
const lfoFmt = (t, v) => t[6] === '%' ? Math.round(v * 100) + '%' : t[6] === '×' ? (+v).toFixed(2) + '×' : (v > 0 ? '+' : '') + Math.round(v) + (t[6] === '°' ? '°' : '');
function syncAutoUI(g){
  const t = LFO_T.find(t => t[0] === aSel), A = g.lfo[aSel] || lfoDef(aSel);
  $('#aTgt').querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.v === aSel); b.classList.toggle('act', !!(g.lfo[b.dataset.v] && g.lfo[b.dataset.v].on)); });
  $('#aTitle').textContent = t[2] + (['h', 's', 'v'].includes(aSel) && !liveFx() ? ' — needs WebGL' : '');
  $('#aOn').checked = A.on; segSet('#aShape', A.shape); segSet('#aSync', A.sync);
  const D = lfoDef(aSel);                            // double-click resets to this target's defaults
  [['#aMin', 'min'], ['#aMax', 'max']].forEach(([id, k]) => { const el = $(id); el.min = aSel === 'x' ? -W : aSel === 'y' ? -H : t[3]; el.max = aSel === 'x' ? W : aSel === 'y' ? H : t[4]; el.step = t[5];   // positions follow the canvas format
    el.value = A[k]; el.dataset.def = D[k];
    el.nextElementSibling.textContent = lfoFmt(t, A[k]); if (t[6] === '%') el.dataset.pct = ''; else delete el.dataset.pct; });
  const pi = optIdx(PER_OPTS, A.per); $('#aPer').value = pi; $('#aPer').dataset.def = optIdx(PER_OPTS, D.per); $('#aPer').nextElementSibling.textContent = PER_OPTS[pi][1];
  $('#aPh').value = A.ph; $('#aPh').nextElementSibling.textContent = Math.round(A.ph * 360) + '°';
  $('#gTabs [data-v=trig]').classList.toggle('act', g.trig === 'fade');
  $('#gTabs [data-v=auto]').classList.toggle('act', lfoAny(g));
}
// change the edited LFO; touching any setting switches it on
function editLfo(fn, turnOn = true){
  const g = curGif(); if (!g) return;
  const A = g.lfo[aSel] || (g.lfo[aSel] = lfoDef(aSel));
  fn(A); if (turnOn) A.on = true;
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
$('#aPer').addEventListener('input', e => editLfo(A => A.per = PER_OPTS[+e.target.value][0]));
$('#aPh').addEventListener('input', e => editLfo(A => A.ph = +e.target.value));
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
  const g = curGif(); if (!g) return;
  if (gTab === 'auto') drawLfoScope(g); else if (gTab === 'trig') drawEnvScope(g);
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
  const pos = lfoPos(A, c), seed = lfoSeed(g, i);
  const y = scopeTrace(x, w, h, d, u => lfoShape(A, pos + (u - 0.75) * 2, seed), A.on);   // two cycles, now at 3/4
  scopeDot(x, w * 0.75, y(lfoShape(A, pos, seed)), d);
}
function drawEnvScope(g){
  const S = scopeCtx($('#tScope')); if (!S) return; const [x, w, h, d] = S;
  const E = g.env, T = envTimes(g), hold = E.gate ? Math.max(E.h, 1) : T.h, span = Math.max(T.a + hold + T.r, 0.5) * 1.1;
  const shape = { env: { t0: 0, from: 0, rel: E.gate ? E.a + hold : null, noGate: false } };
  const y = scopeTrace(x, w, h, d, u => envLevel(shape, g, u * span), g.trig === 'fade');
  const c = clipOf(selPad);
  if (g.trig === 'fade' && c && c.env){
    const lv = envLevel(c, g, clock.beat), t = clock.beat - c.env.t0;
    if (lv > 0) scopeDot(x, Math.min(w - 3 * d, t / span * w), y(lv), d);
  }
}
function syncRangeUI(g){
  const F = g.src.length;
  [['#gIn', 'inF'], ['#gOut', 'outF'], ['#gStart', 'startF']].forEach(([id, k]) => { const el = $(id); el.max = F - 1; el.value = g[k]; el.nextElementSibling.textContent = g[k]; });
}
function drawPrev(g, f){
  const c = $('#gPrev'), x = c.getContext('2d'), img = fxImage(g, f);
  x.clearRect(0, 0, c.width, c.height);
  const s = Math.min(c.width / img.width, c.height / img.height);
  x.drawImage(img, (c.width - img.width*s)/2, (c.height - img.height*s)/2, img.width*s, img.height*s);
}
[['#gIn', 'inF'], ['#gOut', 'outF'], ['#gStart', 'startF']].forEach(([id, k]) => {
  $(id).addEventListener('input', e => {
    const g = curGif(); if (!g) return;
    const v = +e.target.value; g[k] = v;
    if (k === 'inF' && g.outF < v) g.outF = v;          // dragging in past out pushes out along (and vice versa)
    if (k === 'outF' && g.inF > v) g.inF = v;
    rebuildSeq(g); syncRangeUI(g); drawPrev(g, g[k]); showCycle(g);
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
$('#kPick').addEventListener('click', () => picking ? stopPick() : startPick());
function startPick(){ picking = true; $('#kPick').classList.add('armed'); $('#kPick').textContent = 'Click GIF…'; pv.style.cursor = 'crosshair'; }
function stopPick(){ picking = false; $('#kPick').classList.remove('armed'); $('#kPick').textContent = 'Pick'; pv.style.cursor = ''; }
function pickAt(px, py){
  stopPick();
  const hit = hitAny(px, py) || hitsAt(px, py, false)[0]; if (!hit) return toast('No GIF under the cursor');
  const c = hit[1], g = pads[c.pad].gif, d = sampleClip(c, px, py, true);
  g.key.color = [d[0], d[1], d[2]]; g.key.seed = [d.u, d.v]; g.key.on = true;
  selectPad(c.pad); scheduleFx(g, 0);
}
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
function afterPadChange(i){ renderScenes(); renderPad(i); selectPad(i); syncLayerUI(); syncXfUI(); updateMem(); renderPool(); redraw.all = true; }
$('#gClear').addEventListener('click', () => { clearPad(selPad); toast2('Pad cleared — Ctrl+Z brings it back'); });
