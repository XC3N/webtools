const DPAT_HTML = $('#fxDpat').innerHTML;   // Dither's pattern icons (the slot shows the Game Boy LCD's instead with a GB palette)
// ---------- UI: screen effect pads, the effect editor and its envelope ----------
const NP_ORDER = [6, 7, 8, 3, 4, 5, 0, 1, 2];           // preset tiles laid out like the numpad (7 8 9 on top)
function fxTileHTML(i, key){ return `<div class="fxp" data-i="${i}"><span class="lv"></span><span class="hd"><span class="k">${key}</span><span class="md"></span></span>${i < NFX ? '<span class="mk"></span>' : '<span class="xdel" title="Empty this preset">×</span>'}<span class="t"><span class="n"></span><span class="s"></span></span>${i < NFX ? `<span class="fi">${fxIcon(FX_DEFS[i].id)}</span>` : ''}</div>`; }
// Filling presets: drag an effect tile onto a preset tile, or hold a preset (Caps Lock + its numpad key) and
// click / press effects — each one toggles in or out of that preset. The preset editor lists them with ×.
let heldPre = -1, fxDrag = null;
const FX_DRAG_WAIT = 120;   // ms a tile press waits (held still) before it plays: time for a drag to show itself
const fxEntry = i => ({ ...(fxCfg[i].mod ? { mod: JSON.parse(JSON.stringify(fxCfg[i].mod)) } : {}), amt: fxCfg[i].amt, rate: fxCfg[i].rate, style: fxCfg[i].style, target: fxCfg[i].target, size: fxCfg[i].size, ...Object.fromEntries(FX_XK.map(([k, def]) => [k, fxCfg[i][k] ?? def])), ...(fxCfg[i].pamt ? { pamt: { ...fxCfg[i].pamt } } : {}) });   // an effect as a preset holds it
function togglePreFx(k, i){
  const P = fxPre[k];
  if (P.fx[i]) delete P.fx[i]; else P.fx[i] = fxEntry(i);
  syncFxUI(); toast2(`${FXP_LABELS[k]}: ${fxPreName(P)}`);
}
// dragging a preset tile onto another: they swap; Ctrl (⌘) held at the drop: a copy, onto an empty preset only
const preEmpty = k => !Object.keys(fxPre[k].fx).length;
function fxDropMark(cp){
  const d = fxDrag; if (!d || !d.moved) return; const pre = d.i >= NFX; d.copy = pre && cp; document.body.classList.toggle('precopy', d.copy);
  const t = d.lastE && document.elementFromPoint(d.lastE.clientX, d.lastE.clientY), o = t && t.closest('#fxPre .fxp');
  // Ctrl over a preset with effects: held there COPY_HOLD ms (the red bar fills), the drop replaces it
  const full = pre && d.copy && o && +o.dataset.i !== d.i && !preEmpty(+o.dataset.i - NFX);
  const armed = copyHold(d, o, full, () => fxDropMark(d.copy));
  markTiles(document.querySelectorAll('#fxPre .fxp'), o, d, x => !pre || (+x.dataset.i !== d.i && (!d.copy || preEmpty(+x.dataset.i - NFX) || armed)));
}
addEventListener('keydown', e => { if (fxDrag && DEL_KEYS.includes(e.key)) fxDropMark(true); });
addEventListener('keyup', e => { if (fxDrag && DEL_KEYS.includes(e.key)) fxDropMark(false); });
function movePre(a, b, copy, over = false){
  if (copy){ if (!preEmpty(b) && !over) return toast(`Preset ${b + 1} has effects: hold over it until the bar fills, then drop, to replace them`); fxPre[b] = JSON.parse(JSON.stringify(fxPre[a])); toast2(`Preset ${a + 1} copied to ${b + 1}`); }
  else { [fxPre[a], fxPre[b]] = [fxPre[b], fxPre[a]]; toast2(`Presets ${a + 1} and ${b + 1} swapped`); }
  selFx = NFX + b; syncFxUI();
}
function addPreFx(k, i){ fxPre[k].fx[i] = fxEntry(i); selFx = NFX + k; syncFxUI(); toast2(`${FXP_LABELS[k]}: ${fxPreName(fxPre[k])}`); }
// what you carry: a slanted chip like a pad's (0.89), with the effect's icon, or the preset's icons
function fxGhost(i){ const el = document.createElement('span'); el.className = 'chip fxchip';
  const ids = i < NFX ? [i] : Object.keys(fxPre[i - NFX].fx).map(Number);
  el.innerHTML = `<span>${i < NFX ? FX_LABELS[i] : FXP_LABELS[i - NFX]}</span><i>${ids.map(k => fxIcon(FX_DEFS[k].id)).join('') || '·'}</i>`; ghost.show(el); }
function wireFxTile(el){
  const i = +el.dataset.i;
  el.addEventListener('pointerdown', e => {
    if (e.button) return;
    if (e.altKey && i >= NFX){ el._edit = true; const P = fxPre[i - NFX]; selFx = i; syncFxUI();   // Alt+click a preset: name it
      e.preventDefault(); setTimeout(() => nameEdit(el, P.name || '', fxPreName({ fx: P.fx }), v => { P.name = v || undefined; if (!v) delete P.name; touched.edit = true; el._sig = null; syncFxUI(); })); return; }
    if (e.target.closest('.xdel')){ el._edit = true; fxPre[i - NFX].fx = {}; toast2(`Preset ${i - NFX + 1} emptied`); selFx = i; syncFxUI(); return; }   // a preset's ×
    if (isRm(e) && heldPre < 0){ el._edit = true;                        // Ctrl+click: reset an effect / empty a preset
      if (i < NFX){ fxUp(i); fxCfg[i] = fxDefaults()[i]; toast2(`${FX_DEFS[i].name} back to its defaults`); }
      else { fxPre[i - NFX].fx = {}; toast2(`Preset ${i - NFX + 1} emptied`); }
      selFx = i; syncFxUI(); return; }
    if (i < NFX && heldPre >= 0){ togglePreFx(heldPre, i); el._edit = true; return; }     // a preset is held: this click edits it
    const was = { ...fxSt[i] };                        // its state before this press: a drag puts it back
    el.setPointerCapture(e.pointerId); if (selFx !== i){ selFx = i; syncFxUI(); }   // a click on the tile also opens it in the editor
    // it plays after FX_DRAG_WAIT ms held still, or at once when let go sooner: a drag that starts in that time never plays it
    const d = fxDrag = { i, x: e.clientX, y: e.clientY, moved: false, was, fired: false }; d.timer = setTimeout(() => { if (fxDrag === d && !d.moved){ d.fired = true; fxDown(i); } }, FX_DRAG_WAIT);
    if (i >= NFX) heldPre = i - NFX;   // holding a preset tile: F keys edit it; dragging it moves / copies it
  });
  el.addEventListener('pointermove', e => {
    if (!fxDrag || fxDrag.i !== i || fxDrag.cancel) return;
    if (!fxDrag.moved && Math.hypot(e.clientX - fxDrag.x, e.clientY - fxDrag.y) > 6){ fxDrag.moved = true; clearTimeout(fxDrag.timer); if (i >= NFX) heldPre = -1; if (fxDrag.fired){ for (const k in fxSt[i]) delete fxSt[i][k]; Object.assign(fxSt[i], fxDrag.was); } document.body.classList.add('fxdragging'); fxGhost(i); }   // a drag leaves the effect as it was: the press is undone
    if (fxDrag.moved){ ghost.move(e.clientX, e.clientY); fxDrag.lastE = e; fxDropMark(isDel(e)); }
  });
  const end = e => {
    if (el._edit){ el._edit = false; return; }       // that click edited a preset: nothing was started
    if (fxDrag && fxDrag.i === i && !fxDrag.moved){ clearTimeout(fxDrag.timer); if (!fxDrag.fired) fxDown(i); }   // let go before it played: a click
    if (!(fxDrag && fxDrag.i === i && fxDrag.moved)) fxUp(i); if (i >= NFX && heldPre === i - NFX) heldPre = -1;
    if (fxDrag && fxDrag.i === i && fxDrag.moved){
      const t = fxDrag.cancel ? null : document.elementFromPoint(e.clientX, e.clientY), d = t && t.closest('#fxPre .fxp'), cp = fxDrag.copy;   // (cancelled by a right click: dropped nowhere)
      if (d && i < NFX) addPreFx(+d.dataset.i - NFX, i);
      else if (d && +d.dataset.i !== i){ movePre(i - NFX, +d.dataset.i - NFX, cp, !!fxDrag.armed); if (cp) hushDel(); }
      copyHoldEnd(fxDrag);
      unmarkTiles(document.querySelectorAll('#fxPre .fxp')); document.body.classList.remove('fxdragging', 'precopy');
    }
    if (fxDrag && fxDrag.moved) ghost.hide();
    fxDrag = null;
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('contextmenu', e => { e.preventDefault(); selectFx(i); });
}
// the effect's name chip in the editor drags too (closer to the presets than its tile)
{
  const chip = $('#fxName'); let d = null;
  const over = e => { const t = document.elementFromPoint(e.clientX, e.clientY); return t && t.closest('#fxPre .fxp'); };
  chip.addEventListener('pointerdown', e => { if (e.button || selFx >= NFX) return; chip.setPointerCapture(e.pointerId); d = { i: selFx, x: e.clientX, y: e.clientY, moved: false }; });
  chip.addEventListener('pointermove', e => {
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4){ d.moved = true; document.body.classList.add('fxdragging'); fxGhost(d.i); }
    if (d.moved){ ghost.move(e.clientX, e.clientY); const o = over(e); document.querySelectorAll('#fxPre .fxp').forEach(x => x.classList.toggle('drop', x === o)); }
  });
  const end = e => { if (!d) return; if (d.moved){ const o = over(e); if (o) addPreFx(+o.dataset.i - NFX, d.i); }
    document.querySelectorAll('#fxPre .fxp').forEach(x => x.classList.remove('drop')); document.body.classList.remove('fxdragging'); if (d.moved) ghost.hide(); d = null; };
  chip.addEventListener('pointerup', end); chip.addEventListener('pointercancel', end);
}
let fxTiles = [], fxFitGen = 0;                      // the effect / preset tiles; fxFitGen: bumped when names must be measured again
function buildFx(){
  $('#fxPads').innerHTML = FX_DEFS.map((d, i) => fxTileHTML(i, FX_LABELS[i])).join('');
  $('#fxPre').innerHTML = NP_ORDER.map(k => fxTileHTML(NFX + k, k + 1)).join('');
  fxTiles = [...document.querySelectorAll('#fxStrip .fxp')]; fxTiles.forEach(wireFxTile);
  $('#fxRate').max = FX_RATES.length - 1; $('#fxSize').max = FX_SIZES.length - 1;
  document.querySelectorAll('#fxTgt button').forEach(b => { if (b.dataset.v !== 'out') b.style.setProperty('--lc', LCOL[+b.dataset.v]); });
}
const fxPreName = P => { if (P.name) return P.name; const ks = Object.keys(P.fx); return ks.length ? ks.map(i => FX_DEFS[i].name).join(' + ') : 'empty'; };
// short names, for when the full one doesn't fit on a pad
const FX_SHORT = { colour: 'CLR', codec: 'CDC', strobe: 'STRB', poster: 'PSTR', zoom: 'ZM', shake: 'SHK', wobble: 'WBL', mirror: 'MIR', glitch: 'GLT', rgb: 'CRT', pixel: 'PIX', feedback: 'FDBK' };
// the full text, else the short one, else (for style names) its first letters: whichever fits first
function fitText(el, full, short, tiny){ el.textContent = full; for (const t of [short, tiny]) if (t && el.scrollWidth > el.clientWidth + 1) el.textContent = t; }
// what an effect in a preset does, in a word or two: its palette (Colour › Palette) or its style(s)
const fxDetail = (i, E, short) => { const D = FX_DEFS[i], st = E.style || D.styles[0][0];
  if (D.id === 'colour' && st === 'pal') return (FX_PALS[E.pal || 0] || FX_PALS[0]).d;
  return D.styles.length > 1 ? styleLabel(i, st, short) : ''; };
const fxPreLong = P => { const ks = Object.keys(P.fx); return ks.length ? ks.map(i => `${FX_DEFS[i].name} (${fxDetail(i, P.fx[i]) || FX_DEFS[i].styles[0][1]}, ${Math.round(P.fx[i].amt * 100)}%)`).join(' + ') : 'empty'; };
// store the effects that are on right now (from their own keys) into preset slot k
function storeFxPre(k){
  const b = clock.beat, fx = {};
  FX_DEFS.forEach((d, i) => { if (fxLevel(i, b) > 0.05) fx[i] = fxEntry(i); });
  if (!Object.keys(fx).length) return toast('Nothing to store — switch on the effects you want first (hold their F keys, or set them to Latch), then store');
  fxPre[k].fx = fx; selFx = NFX + k; syncFxUI(); toast2(`${FXP_LABELS[k]}: ${fxPreName(fxPre[k])}`);
}
const fxPadLv = [];
// a tile's bar: how strong the effect plays on the level the switch is on (GIF: on / off for the selected GIF)
function fxLvlAt(i, b){ if (i >= NFX || fxLvl === 'out' && !scSt[i].on && !scSt[i].held) return fxLevel(i, b);
  if (fxLvl === 'gif'){ const g = curGif(), x = g && g.gfx && g.gfx[FX_DEFS[i].id]; return x && x.on ? x.amt > 0 ? 1 : 0 : 0; }
  const C = fxConf(i), rel = C.rel ?? fxRelDef(C.mode), A = lvlSt(); let v = fxLevelRaw(C, A[i], b, rel); if (A === fxSt && fxPrev && fxPrev.i === i && !fxNoPrev) v = Math.max(v, fxPrevLevel(i, C, b)); return v; }
// style buttons: the full name (Scanlines, Phosphor) where it fits, else the short one (Scan, Phos); measured only when the buttons or the width changed
function fitStyleBtns(){
  const box = $('#fxStyle'), sig = box.innerHTML.length + '|' + box.clientWidth + '|' + box.firstChild?.dataset.v; if (box._fit === sig) return;
  const bs = [...box.querySelectorAll('button')].filter(b => STYLE_BTN[b.dataset.v]);
  bs.forEach(b => { const st = FX_DEFS.flatMap(d => d.styles).find(x => x[0] === b.dataset.v); if (st) b.textContent = st[1]; });
  if ([...box.querySelectorAll('button')].some(b => b.scrollWidth > b.clientWidth + 0.5)) bs.forEach(b => b.textContent = STYLE_BTN[b.dataset.v]);   // all full or all short
  box._fit = box.innerHTML.length + '|' + box.clientWidth + '|' + box.firstChild?.dataset.v;
}
function paintFxPads(b){
  fxTiles.forEach(el => { const i = +el.dataset.i;
    const v = Math.round(fxLvlAt(i, b) * 100); if (fxPadLv[i] === v) return; fxPadLv[i] = v;
    el.firstChild.style.height = v + '%'; el.classList.toggle('on', v > 50);
  });
}
let preEd = null, preEdOf = -1;                      // an effect inside the selected preset being edited (its index), or null
function syncFxUI(){ syncFxUI0(); if (fxModReady) syncFxMod();   // (the LFO box is set up at the end of this file)
  const gl = fxLvl === 'gif', g = gl && curGif(); $('#fxEdit').classList.toggle('gifl', gl && selFx < NFX); $('#fxEdit').classList.toggle('nogif', gl && !g);
  segSet('#fxLvl', fxLvl); if (g && selFx < NFX && g.gfx) gfxTouch(g);   // the GIF's effects changed (or may have): redrawn, and its FX tab follows
}
function syncFxUI0(){
  if (selFx !== preEdOf){ preEd = null; preEdOf = selFx; }
  const pre = selFx >= NFX, C = fxConfE(selFx), GL = fxLvl === 'gif';
  if (pre && preEd != null && !C.fx[preEd]) preEd = null;
  const E = pre && preEd != null ? C.fx[preEd] : null, d = pre ? (E ? FX_DEFS[preEd] : null) : FX_DEFS[selFx];
  fxTiles.forEach(el => {
    const i = +el.dataset.i, c = fxConfE(i);
    if (el.classList.contains('sel') !== (i === selFx)) el.classList.toggle('sel', i === selFx);
    // names are measured (forces a layout) only when what the tile shows changed: pressing an effect key just moves the highlight
    const sig = i < NFX ? `${GL ? (c.on ? 'on' : 'off') : c.mode}|${c.target}|${c.style}|${fxFitGen}|${allPipCol}|${fxLvl}` : `${c.mode}|${JSON.stringify(fxPre[i - NFX].fx)}|${fxPre[i - NFX].name || ''}|${fxFitGen}`;
    if (el._sig === sig) return; el._sig = sig;
    el.querySelector('.md').textContent = GL && i < NFX ? (c.on ? 'on' : 'off') : c.mode;
    if (i < NFX){ const L = tgtList(c.target), mk = el.querySelector('.mk');   // the layers it works on: "all", or four pips lit in the layers' colours
      mk.innerHTML = [0, 1, 2, 3].map(k => L[0] === 'out' ? `<i class="on" style="--c:${allPipCol}"></i>` : `<i${L.includes(k) ? ` class="on" style="--c:${LCOL[k]}"` : ''}></i>`).join('');   // all: the four pips in one colour (Settings › Interface)
      mk.classList.toggle('all', L[0] === 'out'); }
    if (i < NFX){ const D = FX_DEFS[i], st = D.styles[styleIdx(i, c.style)];
      fitText(el.querySelector('.n'), D.name, FX_SHORT[D.id]); const many = styleParts(i, c.style).length > 1; fitText(el.querySelector('.s'), D.styles.length > 1 ? (many ? styleLabel(i, c.style) : st[1]) : '', many ? styleLabel(i, c.style, true) : STYLE_SHORT[st[0]], D.styles.length > 1 && st[1].length > 4 ? (many ? styleParts(i, c.style).length + ' styles' : st[1].slice(0, 3) + '.') : null);
      el.title = `${D.name} — ${st[2]} (${FX_LABELS[i]} · Shift+${FX_LABELS[i]} or right-click: edit)`; }
    else { const k = i - NFX, P = fxPre[k], e = !Object.keys(P.fx).length;
      const n = el.querySelector('.n'), s2 = el.querySelector('.s');
      if (e){ n.classList.remove('ics'); n.textContent = ''; s2.textContent = 'empty'; }
      else { const ks = Object.keys(P.fx);   // the effects' icons, and under them the preset's name (Alt+click) or what each does (its style, or its palette)
        n.classList.add('ics'); n.innerHTML = ks.map(i => fxIcon(FX_DEFS[i].id)).join('');
        if (P.name) fitText(s2, P.name, P.name);
        else { const dt = ks.map(i => fxDetail(i, P.fx[i]) || FX_DEFS[i].name), ds = ks.map(i => fxDetail(i, P.fx[i], true) || FX_SHORT[FX_DEFS[i].id]);
          fitText(s2, dt.join(' · '), ds.join('·')); } }
      el.classList.toggle('empty', e);
      el.title = `${FXP_LABELS[k]} with Caps Lock: ${fxPreLong(P)} · Caps+Shift+${FXP_LABELS[k]}: store · right-click: edit · Alt+click: name`; }
  });
  $('#fxEdit').classList.toggle('pre', pre); $('#fxEdit').classList.toggle('ent', !!E); { const Xe = d && typeof fxEd === 'function' ? fxEd() : null; $('#fxEdit').classList.toggle('sized', !!d && (!!d.size || d.id === 'wobble' || !!(Xe && sizeAlt(d, Xe.style || d.styles[0][0], Xe)))); } $('#fxEdit').classList.toggle('rated', !!d && !!d.rate);   // (0.99.26: a toggle that takes the Size slot — Mirror, Fit range — needs the row shown even where there's no Size; Wobble: no size, but its Edges toggle sits in that row, 0.93; 0.94: the comment had swallowed 'rated', hiding Rate)
  $('#fxName').innerHTML = (pre && !E ? '' : fxIcon(d.id)) + (E ? d.name : pre ? FXP_LABELS[selFx - NFX] : d.name);   // the effect's icon in the LCD (names are ours: no escaping needed)
  $('#fxName').title = E ? `${d.name} as ${FXP_LABELS[selFx - NFX]} plays it — click to go back to the preset` : pre ? 'Effect preset' : `${d.title} — drag onto a preset to add it there`;
  $('#fxName').classList.toggle('grab', !pre); $('#fxName').classList.toggle('back', !!E);
  if (E){                                              // one effect of the preset: its own style, layer, amount, rate / size
    setHTML($('#fxStyle'), d.styles.map(s => `<button data-v="${s[0]}" title="${s[1]}: ${s[2]}${FX_MULTI[d.id] ? ' · click: in / out · right-click: solo' : ''}">${s[1]}</button>`).join('')); fitStyleBtns();
    styleSet(FX_DEFS.indexOf(d), E.style || d.styles[0][0]); $('#fxStyle').classList.toggle('dimmed', d.styles.length < 2);
    tgtSet(E.target);
  }
  else if (pre){
    const ks = Object.keys(C.fx);
    setHTML($('#fxPreList'), ks.length ? ks.map(i => `<span class="pchip" data-e="${i}" title="${FX_DEFS[i].name} · ${styleLabel(i, C.fx[i].style)} · ${Math.round(C.fx[i].amt * 100)}% · click: adjust">${FX_DEFS[i].name}${tgtLabel(C.fx[i].target) ? ` <small>${tgtLabel(C.fx[i].target)}</small>` : ''}<button data-i="${i}" title="Take it out of this preset">×</button></span>`).join('')
      : '<span class="pempty">empty — drag effects here, or hold Caps + this numpad key and click them</span>');
  }
  else {
    setHTML($('#fxStyle'), d.styles.map(s => `<button data-v="${s[0]}" title="${s[1]}: ${s[2]}${FX_MULTI[d.id] ? ' · click: in / out · right-click: solo' : ''}">${s[1]}</button>`).join('')); fitStyleBtns();
    styleSet(FX_DEFS.indexOf(d), C.style); $('#fxStyle').classList.toggle('dimmed', d.styles.length < 2);
      // styles always in two even rows (CRT 4 + 3, Strobe 1 + 1): the editor keeps the same height for every effect
    tgtSet(C.target);
  }
  segSet('#fxMode', C.mode);
  const A = E || C, am = $('#fxAmt'), dd = E ? FX_DEFS[preEd] : selFx < NFX ? FX_DEFS[selFx] : null;
  const palAmt = !!dd && dd.id === 'colour' && (A.style || dd.styles[0][0]) === 'pal';   // Colour › Palette: the Amount slider picks the palette
  const kal = !!dd && dd.id === 'mirror' && (A.style || dd.styles[0][0]) === 'kal';        // Mirror › Kaleido: it sets the number of slices
  const wear = !!dd && dd.id === 'rgb' && styleParts(FXI.rgb, A.style).includes('vhs') && (styleParts(FXI.rgb, A.style).length === 1 || fxFocus.rgb === 'vhs');   // CRT › VHS (alone, or in focus in a stack): Amount is how worn the tape is
  am.closest('.field').querySelector('label').textContent = palAmt ? 'Palette' : kal ? 'Slices' : wear ? 'Wear' : 'Amount'; am.dataset.palAmt = palAmt ? '1' : ''; am.dataset.kal = kal ? '1' : '';
  if (palAmt){ const pi = A.pal || 0, [fi] = palFam(pi); Object.assign(am, { min: 0, max: PAL_FAM.length - 1, step: 1 }); am.value = fi; am.dataset.def = 0; delete am.dataset.pct;   // the slider runs in PAL_ORDER (by year)
    { const o = am.nextElementSibling; o.textContent = PAL_FAM[fi].n; if (o.scrollWidth > o.clientWidth + 1 && PAL_FAM[fi].n === 'ZX Spectrum') o.textContent = 'Spectrum'; } am.closest('.field').title = 'Palette: ' + FX_PALS[pi].t; }
  else if (kal){ const n = kalSlices(A.amt); Object.assign(am, { min: 3, max: 12, step: 1 }); am.value = n; am.dataset.def = 12; delete am.dataset.pct;
    am.nextElementSibling.textContent = n; am.closest('.field').title = 'Slices: how many wedges the kaleidoscope has'; }
  else { const pp = amtPart(dd, A), v = pp ? A.pamt?.[pp] ?? A.amt : A.amt; Object.assign(am, { min: 0.05, max: 1, step: 0.01 }); am.value = v; am.dataset.def = 1; am.dataset.pct = ''; am.nextElementSibling.textContent = Math.round(v * 100) + '%';
    am.closest('.field').title = (wear ? 'Wear: how worn the tape is (tracking, colour bleed, dropouts, noise)' : 'Amount: how strong') + (pp ? ` — for ${dd.styles[FXS[dd.id][pp]][1]} only (the style in focus; each stacked style has its own)` : ''); }
  drawFxEnv(); syncEnvSl();
  if (!pre || E){
    const C = E || fxConfE(selFx), di = E ? preEd : selFx;
    const alt = rateAlt(d, C.style || d.styles[0][0], C); $('#fxRateRow').classList.toggle('altrow', !!alt); if (!alt) $('#fxRateRow').classList.remove('nodith');
    $('#fxRateSeg').hidden = !(alt && alt.seg); $('#fxRate').hidden = $('#fxRate').nextElementSibling.hidden = !!(alt && alt.seg);   // a few fixed choices: a switch instead of the slider
    if (alt && alt.seg){ setHTML($('#fxRateSeg'), alt.list.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')); segSet('#fxRateSeg', String(C[alt.key] ?? alt.def)); }
    const sw = alt && (alt.pat || alt.lcd); $('#fxDpat').hidden = !sw; $('#fxRateRow').classList.toggle('patrow', !!sw);
    const dp = $('#fxDpat'), want = alt && alt.lcd ? 'lcd' : 'pat'; if (sw && dp.dataset.mode !== want){ dp.dataset.mode = want;   // Dither's pattern icons, or the Game Boy LCD's in the same place
      setHTML(dp, want === 'lcd' ? alt.lcd.list.map(([v, , t]) => `<button data-v="${v}" title="${t.replace(/"/g, '&quot;')}">${alt.lcd.icons[v]}</button>`).join('') : DPAT_HTML); }
    { const isPal = !!d && d.id === 'colour' && (C.style || d.styles[0][0]) === 'pal', [fi, vi] = palFam(C.pal || 0), F = PAL_FAM[fi], many = isPal && F.m.length > 1;   // the palette's variants (0.99.3)
      $('#fxPalVar').hidden = !many; $('#fxRateRow').classList.toggle('varrow', isPal); $('#fxRateRow').classList.toggle('lcdrow', !!(alt && alt.nodith));   // every palette: the same narrow Palette slider (0.99.4: no shift between families)
      if (many){ const h = F.m.map((x, k) => `<button data-v="${k}" title="${esc(FX_PALS[x.i].t)}"><span class="lng">${esc(x.l)}</span><span class="sht">${esc(x.s)}</span></button>`).join(''); if ($('#fxPalVar').dataset.f !== String(fi)){ setHTML($('#fxPalVar'), h); $('#fxPalVar').dataset.f = fi; } segSet('#fxPalVar', String(vi)); } }   // the Game Boy: its name, right-aligned against the switch, in the slider's room (the row keeps its width)
    if (sw) segSet('#fxDpat', String(alt.lcd ? Math.min(2, C.dots || 0) : C.dpat || 0));
    $('#fxRateRow label').textContent = alt ? alt.label : 'Rate';
    if (alt){ const L = alt.list, ai = optIdx(L, alt.get ? alt.get(C) : C[alt.key] ?? alt.def); $('#fxRate').max = L.length - 1; $('#fxRate').value = alt.off ? 0 : ai; $('#fxRate').nextElementSibling.textContent = alt.off ? '–' : L[ai][1]; $('#fxRate').dataset.def = optIdx(L, alt.def);   // (0.99.27: a palette without Dither shows none, not the last value)
      $('#fxRateRow').title = alt.off ? 'Dither: not on this palette (64 grey steps are already smooth; the NES never dithered)' : alt.title(ai); $('#fxRateRow').classList.remove('dimmed'); $('#fxRateRow').classList.toggle('nodith', !!alt.off); }   // (0.99.13: not 'dimmed': that hides the row's whole content, the bit switch too)
    else { $('#fxRate').max = FX_RATES.length - 1; $('#fxRateRow').title = 'Rate: how fast it moves (beats)';
    const ri = optIdx(FX_RATES, C.rate); $('#fxRate').value = ri; $('#fxRate').nextElementSibling.textContent = FX_RATES[ri][1];
    $('#fxRateRow').classList.toggle('dimmed', !d.rate || (!!d.rateFor && !styleParts(di, C.style || d.styles[0][0]).some(p => d.rateFor.includes(p)))); $('#fxRate').dataset.def = optIdx(FX_RATES, fxDefaults()[di].rate); }
    const za = sizeAlt(d, C.style || d.styles[0][0], C); $('#fxSizeRow label').textContent = za ? za.label : 'Size';
    $('#fxSizeSeg').hidden = !(za && (za.seg || za.side)); $('#fxSize').hidden = $('#fxSize').nextElementSibling.hidden = !!(za && za.seg);   // a few fixed choices: a switch instead of the slider
    $('#fxSizeSeg').classList.toggle('one', !!(za && (za.toggle || za.side))); $('#fxSizeRow').classList.toggle('onerow', !!(za && za.toggle)); $('#fxSizeRow').classList.toggle('siderow', !!(za && za.side));   // one toggle: its label right-aligned against it; siderow (0.99.27): a slider with a toggle beside it
    if (za && za.side){ const S = za.side, on = (C[S.key] ?? S.def) !== 0; setHTML($('#fxSizeSeg'), `<button data-v="${on ? 0 : 1}" class="${on ? 'on' : ''}" title="${S.title}">${S.icon}</button>`); }
    else if (za && za.toggle){ const on = (C[za.key] ?? za.def) !== 0; setHTML($('#fxSizeSeg'), `<button data-v="${on ? 0 : za.list[za.list.length - 1][0]}" class="${on ? 'on' : ''}" title="${za.title()}">${za.icon}</button>`); }   // one toggle: the button carries the value a click sets
    else if (za && za.seg){ setHTML($('#fxSizeSeg'), za.list.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')); segSet('#fxSizeSeg', String(C[za.key] ?? za.def)); }
    if (za){ const L = za.list, ai = optIdx(L, C[za.key] ?? za.def); $('#fxSize').max = L.length - 1; $('#fxSize').value = ai; $('#fxSize').nextElementSibling.textContent = L[ai][1];
      $('#fxSize').dataset.def = optIdx(L, za.def); $('#fxSizeRow').title = za.title(); $('#fxSizeRow').classList.remove('dimmed'); }
    else { $('#fxSize').max = FX_SIZES.length - 1; $('#fxSizeRow').title = 'Size: the pixel block size at full amount';
    const zi = optIdx(FX_SIZES, C.size || d.sizeDef || 64); $('#fxSize').value = zi; $('#fxSize').nextElementSibling.textContent = FX_SIZES[zi][1];
    $('#fxSize').dataset.def = optIdx(FX_SIZES, d.sizeDef || 64);
    $('#fxSizeRow').classList.toggle('dimmed', !d.size || d.id === 'colour' || (!!d.sizeFor && !styleParts(di, C.style).some(p => d.sizeFor.includes(p)))); }
  }
}
// effect names refit (full or short) when the window changes, and are measured again once the fonts are in
let fxFitT = 0; addEventListener('resize', () => { clearTimeout(fxFitT); fxFitT = setTimeout(() => { fxFitGen++; syncFxUI(); }, 150); });
if (document.fonts) document.fonts.ready.then(() => setTimeout(() => { fxFitGen++; syncFxUI(); }, 50));
onSeg($('#fxMode'), (b, e) => setFxMode(selFx, b.dataset.v));
function setFxMode(i, v){                           // Hold / Hit / Latch for effect (or preset) i
  const S = (i < NFX ? lvlSt() : fxSt)[i], C = fxConf(i), now = clock.beat, playing = fxLevel(i, now) > 0.001;
  const ad = (C.att || 0) + (C.dec || 0);
  S.held = false; S.on = false; S.b0 = -1e9; C.mode = v;
  if (v === 'latch'){ S.on = true; S.t0 = now - ad - 1e-6; }               // Latch starts on, straight at Sustain (no Attack: it was a mode change, not a hit)
  else if (playing){                                                       // Hold / Hit: what was playing fades out over Release
    if (v === 'hit') S.b0 = now - ad - (C.len || 0) - 1e-6; else { S.t0 = now - ad - 1e-6; S.rel = now; } }
  syncFxUI(); }
const fxEd = () => selFx < NFX ? fxConfE(selFx) : preEd != null ? fxPre[selFx - NFX].fx[preEd] : null;   // what the effect-level controls change
// 0.99.27 (ID-223 / ID-235): on the GIF level, an effect's settings are the selected GIF's own (g.gfx); else the shared ones
function fxConfE(i){ return i < NFX && fxLvl === 'gif' && curGif() ? gfxEntry(i) : fxConf(i); }
// target buttons: All = the whole output (alone); or a set of layers: a layer button takes its layer in or out (from All:
// just that one), right-click = that layer alone. Lit layer buttons take their layer's colour
const tgtSet = t => { const L = tgtList(t); $('#fxTgt').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === 'out' ? L[0] === 'out' : L.includes(+b.dataset.v))); };
onSeg($('#fxTgt'), (b, e) => { const X = fxEd(); if (X){ if (b.dataset.v === 'out') allToggle(X); else X.target = tgtToggle(X.target, +b.dataset.v, false); syncFxUI(); } });
$('#fxTgt').addEventListener('contextmenu', e => { const b = e.target.closest('button'); if (!b || b.dataset.v === 'out') return; e.preventDefault(); const X = fxEd(); if (X){ X.target = +b.dataset.v; syncFxUI(); } });
const styleSet = (i, v) => { const P = styleParts(i, v), f = fxFocus[FX_DEFS[i].id], multi = FX_MULTI[FX_DEFS[i].id] && P.length > 1;
  $('#fxStyle').querySelectorAll('button').forEach(b => { b.classList.toggle('on', P.includes(b.dataset.v)); b.classList.toggle('focus', !!multi && b.dataset.v === f && P.includes(f)); });
  $('#fxStyle').classList.toggle('hasfocus', !!multi && P.includes(f)); };   // (0.99: the other lit styles dim, so the one whose settings show stands out)
// stacked styles (Glitch, CRT): a click takes a style in or out (one that's on but not the one shown: shows its settings first);
// right-click solos it (only it on), right-click it again brings the stack back
const soloWas = new WeakMap();
onSeg($('#fxStyle'), (b, e) => { const X = fxEd(); if (!X) return; const i = selFx < NFX ? selFx : preEd, id = FX_DEFS[i].id, v = b.dataset.v, P = styleParts(i, X.style);
  if (FX_MULTI[id] && P.length > 1 && P.includes(v) && fxFocus[id] !== v){ fxFocus[id] = v; syncFxUI(); return; }
  X.style = styleToggle(i, X.style || FX_DEFS[i].styles[0][0], v); soloWas.delete(X);
  if (FX_MULTI[id]) fxFocus[id] = styleParts(i, X.style).includes(v) ? v : undefined;   // switched on: its settings show
  syncFxUI(); });
$('#fxStyle').addEventListener('contextmenu', e => { const b = e.target.closest('button'), X = fxEd(); if (!b || !X) return; e.preventDefault();
  const i = selFx < NFX ? selFx : preEd, id = FX_DEFS[i].id, v = b.dataset.v, cur = styleNorm(i, X.style);
  if (!FX_MULTI[id]){ X.style = v; syncFxUI(); return; }
  const was = soloWas.get(X);
  if (cur === v && was){ X.style = was; soloWas.delete(X); }                      // un-solo: the stack as it was
  else { if (cur !== v) soloWas.set(X, cur); X.style = v; }
  fxFocus[id] = v; syncFxUI(); });
// Glitch / CRT with several styles stacked: Amount sets the style in focus only (0.92); one style, or none in focus: the effect's
const amtPart = (dd, A) => { if (!dd || !FX_MULTI[dd.id]) return null; const P = styleParts(FXI[dd.id], A.style); return P.length > 1 && P.includes(fxFocus[dd.id]) ? fxFocus[dd.id] : null; };
$('#fxAmt').addEventListener('input', e => { const X = fxEd() || fxConfE(selFx); if (e.target.dataset.palAmt){ const F = PAL_FAM[+e.target.value]; X.pal = palLast[+e.target.value] ?? F.m[0].i; } else if (e.target.dataset.kal) X.amt = kalAmt(+e.target.value);
  else { const dd = selFx < NFX ? FX_DEFS[selFx] : preEd != null ? FX_DEFS[preEd] : null, pp = amtPart(dd, X); if (pp) (X.pamt || (X.pamt = {}))[pp] = +e.target.value; else X.amt = +e.target.value; } syncFxUI(); });
$('#fxName').addEventListener('click', () => { if (preEd != null){ preEd = null; syncFxUI(); } });
// ---- the effect envelope editor: points dragged along fixed steps (like the sliders were), so it reads at a glance ----
const FX_ATTS = [[0, '0'], [0.125, '1/32'], [0.25, '1/16'], [0.5, '1/8'], [1, '1/4'], [2, '1/2'], [4, '1 bar'], [8, '2 bars']];
const envZoom = new WeakMap();   // per envelope: how many steps the graph's width shows
const envGeo = (C, w, h, d) => {
  const ia = optIdx(FX_ATTS, C.att || 0), id = optIdx(FX_ATTS, C.dec || 0), il = optIdx(FX_LENS, C.len || 0), ir = optIdx(FX_RELS, C.rel ?? fxRelDef(C.mode));
  const hit = C.mode === 'hit', sus = C.sus ?? 1, base = 7 * d, n = ia + id + (hit ? il : 3) + ir;
  // the zoom only moves when it has to (the envelope outgrows it, or uses under half of it), so letting go of a point doesn't shift the graph
  let z = envZoom.get(C) || 0; if (!z || n + 2 > z || (n + 6 < z / 2 && z > 8)) envZoom.set(C, z = Math.max(8, n + 6));
  const u = fxEnvDrag && fxEnvDrag.u ? fxEnvDrag.u : (w - 7 * d - 4 * base - 4 * d) / z;
  const top = 7 * d, bot = h - 4 * d, ys = bot - (bot - top) * sus;   // clear of the top edge by as much as the start is from the left
  const x0 = 7 * d, xA = x0 + (ia ? base + ia * u : 0), xD = xA + base + id * u, xL = xD + (hit ? base + il * u : base + 6 * u * 0.5), xR = xL + base + ir * u;
  return { ia, id, il, ir, base, u, top, bot, ys, x0, xA, xD, xL, xR, hit, sus };
};
let fxEnvDrag = null, fxEnvEd = null;   // fxEnvDrag: { k, u } while a point is dragged (the steps keep their width)
function drawFxEnv(){
  const cv = $('#fxEnv'); if (!cv) return; const S = scopeCtx(cv); if (!S) return; const [x, w, h, d] = S;
  const C = fxEnvConf(); if (!C) return;
  const G = envGeo(C, w, h, d);
  x.fillStyle = `rgba(${TC.envRgb},.12)`; x.strokeStyle = TC.env; x.lineWidth = 1.5 * d;
  x.beginPath(); x.moveTo(G.x0, G.bot); x.lineTo(G.xA, G.top); x.lineTo(G.xD, G.ys); x.lineTo(G.xL, G.ys);
  if (G.hit){ for (let k = 1; k <= 12; k++){ const q = k / 12; x.lineTo(G.xL + (G.xR - G.xL) * q, G.bot - (G.bot - G.ys) * (1 - q) * (1 - q)); } }
  else x.lineTo(G.xR, G.bot);
  x.lineTo(G.x0, G.bot); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(G.x0, G.bot); x.lineTo(G.xA, G.top); x.lineTo(G.xD, G.ys);
  if (!G.hit){ x.stroke(); x.setLineDash([3 * d, 3 * d]); x.beginPath(); x.moveTo(G.xD, G.ys); x.lineTo(G.xL, G.ys); x.stroke(); x.setLineDash([]); x.beginPath(); x.moveTo(G.xL, G.ys); x.lineTo(G.xR, G.bot); }
  else { x.lineTo(G.xL, G.ys); for (let k = 1; k <= 12; k++){ const q = k / 12; x.lineTo(G.xL + (G.xR - G.xL) * q, G.bot - (G.bot - G.ys) * (1 - q) * (1 - q)); } }
  x.stroke();
  if (fxEnvEd) fxEnvEd.draw(x, d);                  // its points, and the value of the one under the pointer (the shared editor)
  const lv = selFx < NFX || preEd == null ? fxLevel(selFx, clock.beat) : 0;   // where it is now
  if (lv > 0.001){ x.fillStyle = '#fff'; x.fillRect(w - 5 * d, G.bot - (G.bot - G.top) * lv, 3 * d, (G.bot - G.top) * lv); }
}
const fxEnvConf = () => fxConf(selFx);              // the envelope belongs to the effect / preset (not to one effect inside a preset)
function fxEnvMove(k, px, py){
  const C = fxEnvConf(); if (!C) return; const cv = $('#fxEnv'), d = devicePixelRatio || 1, G = envGeo(C, cv.width, cv.height, d);
  const idx = (from, n) => clamp(Math.round((px - from - G.base) / G.u), 0, n);
  if (k === 'a') C.att = FX_ATTS[px - G.x0 < G.base / 2 ? 0 : idx(G.x0, FX_ATTS.length - 1)][0];
  else if (k === 'd'){ C.dec = FX_ATTS[idx(G.xA, FX_ATTS.length - 1)][0]; C.sus = Math.round(clamp((G.bot - py) / (G.bot - G.top), 0, 1) * 20) / 20; }
  else if (k === 'l') C.len = FX_LENS[idx(G.xD, FX_LENS.length - 1)][0];
  else if (k === 's'){ C.sus = Math.round(clamp((G.bot - py) / (G.bot - G.top), 0, 1) * 20) / 20; envPrevChanged(C); paintFxPads(clock.beat); return; }   // the Sustain line, up and down only
  else C.rel = FX_RELS[idx(G.xL, FX_RELS.length - 1)][0];
  // the dragged point would leave the box: zoom out now (not on letting go), keeping the steps steady from here on
  const G2 = envGeo(C, cv.width, cv.height, d), xk = { a: G2.xA, d: G2.xD, l: G2.xL, r: G2.xR }[k];
  if (G2.xR > cv.width - 6 * d || xk > cv.width - 6 * d){ fxEnvDrag.u = 0; envZoom.delete(C); fxEnvDrag.u = envGeo(C, cv.width, cv.height, d).u; }
  envPrevChanged(C); paintFxPads(clock.beat);
}
fxEnvEd = envEditor($('#fxEnv'), {
  on: () => !!fxEnvConf(),
  pts: () => { const C = fxEnvConf(), cv = $('#fxEnv'), G = envGeo(C, cv.width, cv.height, devicePixelRatio || 1); return [['a', G.xA, G.top], ['d', G.xD, G.ys], ...(G.hit ? [['l', G.xL, G.ys]] : []), ['r', G.xR, G.bot]]; },
  begin: k => { const C = fxEnvConf(), cv = $('#fxEnv'); fxEnvDrag = { k, u: envGeo(C, cv.width, cv.height, devicePixelRatio || 1).u }; envPrevStart(); },
  segs: () => { const C = fxEnvConf(), cv = $('#fxEnv'), G = envGeo(C, cv.width, cv.height, devicePixelRatio || 1); return [['s', G.xD, G.xL, G.ys]]; },
  move: fxEnvMove,
  end: () => { fxEnvDrag = null; envPrevStop(); },
  reset: k => { const C = fxEnvConf(); if (k === 'a') C.att = 0; else if (k === 's') C.sus = 1; else if (k === 'd'){ C.dec = 0; C.sus = 1; } else if (k === 'l') C.len = fxLenDef(C.mode); else C.rel = fxRelDef(C.mode); },
  tip: { a: envTip('a'), d: envTip('d'), l: envTip('l'), r: envTip('r', ', after the Gate, or after letting go of Hold / switching off Latch'), s: 'Sustain: drag the line up or down · double-click: full' },
  label: k => { const C = fxEnvConf(), sus = C.sus ?? 1; return k === 's' ? `Sustain ${Math.round(sus * 100)}%` : k === 'a' ? `Attack ${FX_ATTS[optIdx(FX_ATTS, C.att || 0)][1]}` : k === 'd' ? `Decay ${FX_ATTS[optIdx(FX_ATTS, C.dec || 0)][1]} · Sustain ${Math.round(sus * 100)}%`
    : k === 'l' ? `Gate ${FX_LENS[optIdx(FX_LENS, C.len || 0)][1]}` : `Release ${FX_RELS[optIdx(FX_RELS, C.rel ?? fxRelDef(C.mode))][1]}`; },
  redraw: () => drawFxEnv(),
});
// preview while editing: the envelope plays as a hit, over and over, restarting when a value changes
let envPrevOn = Prefs.get('vjif-envprev') !== '0';
let envSliders = Prefs.get('vjif-envview') === 'sl';
let fxPrev = null, fxPrevSig = '';
// drawn on the pixel grid at 1:1 (14 px, half-pixel lines) so they stay sharp
const ENV_IC_SL = '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1" shape-rendering="crispEdges" style="display:block;margin:auto"><path d="M1 3.5h12M1 7.5h12M1 11.5h12"/><rect x="3" y="2" width="3" height="3" fill="currentColor" stroke="none"/><rect x="8" y="6" width="3" height="3" fill="currentColor" stroke="none"/><rect x="5" y="10" width="3" height="3" fill="currentColor" stroke="none"/></svg>';
const ENV_IC_GRAPH = '<svg viewBox="0 0 14 14" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.2" style="display:block;margin:auto"><path d="M1.5 12.5L3.5 2.5l3 5h3.5l2.5 5"/></svg>';
function envPrevStart(){ if (!envPrevOn) return; if (fxLvl === 'gif' && selFx < NFX){ gfxPrevId = FX_DEFS[selFx].id; redraw.all = true; return; } fxPrev = { i: selFx, b0: clock.beat, loop: true }; }   // (0.92: a preset previews too)
// 0.99.30 (BG-067, BG-068): on the GIF level the preview is the selected GIF's own effect shown while the slider is held (on or not), not the output's effect
// any slider in the effect editor (Amount, Rate, Size, a preset's effect's own): while it's dragged the effect or preset plays
// its envelope over and over, so the change shows (Preview on, the ▶ beside the envelope) (0.92)
$('#fxEdit').addEventListener('pointerdown', e => { if (e.button || !e.target.matches('input[type=range]') || (fxPrev && fxPrev.loop)) return;   // (a right-click isn't a press: it did start the preview)
  envPrevStart();
  addEventListener('pointerup', envPrevStop, { once: true }); }, true);
function envPrevChanged(C){ const sg = [C.att, C.dec, C.sus, C.len, C.rel].join(); if (fxPrev && sg !== fxPrevSig) fxPrev.b0 = clock.beat; fxPrevSig = sg; }
function envPrevStop(){ if (fxPrev) fxPrev.loop = false; if (gfxPrevId){ gfxPrevId = null; redraw.all = true; } }
// the preview's level: a hit (Hold / Latch get a 1-beat length so Sustain shows), looping with a short gap
function fxPrevLevel(i, C, b){
  if (!fxPrev || fxPrev.i !== i) return 0;
  const len = C.mode === 'hit' ? (C.len || 0) : 1, rel = C.rel ?? fxRelDef(C.mode), top = (C.att || 0) + (C.dec || 0) + len, end = top + Math.max(rel, 0.01);
  let t = b - fxPrev.b0; if (t > end + 0.5){ if (fxPrev.loop){ fxPrev.b0 = b; t = 0; } else { fxPrev = null; return 0; } }
  if (t < top) return fxAD(C, t); const x = rel > 0 ? (t - top) / rel : 1; return x < 1 ? fxAD(C, top) * (1 - x) * (1 - x) : 0;
}
const syncEnvTg = () => { $('#envPrev').classList.toggle('on', envPrevOn); $('#fxEnvRow').classList.toggle('sliders', envSliders); $('#envView').innerHTML = envSliders ? ENV_IC_GRAPH : ENV_IC_SL; $('#envView').title = envSliders ? 'Show the envelope as a graph' : 'Show the envelope as sliders'; };
$('#envReset').addEventListener('click', () => { const C = fxConf(selFx), D = selFx < NFX ? fxDefaults()[selFx] : fxPreDefaults()[selFx - NFX];
  const top = hist.undo[hist.undo.length - 1]; if (top && top.kind === 'envrst' && top.sel === selFx && ENV_RST_KEYS.every(k => C[k] === D[k])){ undo(); return; }   // 0.99.12: reset again = back to what it was (so does Ctrl+Z)
  commit(); const was = {}; ENV_RST_KEYS.forEach(k => was[k] = C[k]);
  ['att', 'dec', 'sus', 'len', 'rel'].forEach(k => { if (D[k] === undefined) delete C[k]; else C[k] = D[k]; });
  if (D.mode !== C.mode){ C.len = fxLenDef(C.mode); C.rel = fxRelDef(C.mode); }   // its mode was changed: that mode's defaults
  pushStep({ kind: 'envrst', sel: selFx, vals: was }); syncFxUI(); toast2('Envelope back to its default'); });
$('#envPrev').addEventListener('click', () => { envPrevOn = !envPrevOn; Prefs.set('vjif-envprev', envPrevOn ? '1' : '0'); syncEnvTg(); });
$('#envView').addEventListener('click', () => { envSliders = !envSliders; Prefs.set('vjif-envview', envSliders ? 'sl' : 'g'); syncEnvTg(); syncEnvSl(); drawFxEnv(); syncAEnvView(); });   // (GIF › Auto › Envelope follows the same choice)
const ENV_SL = { a: [() => FX_ATTS, 'att'], d: [() => FX_ATTS, 'dec'], l: [() => FX_LENS, 'len'], r: [() => FX_RELS, 'rel'] };
function syncEnvSl(){
  const C = fxEnvConf(); if (!C || !envSliders) return;
  document.querySelectorAll('#fxEnvSl input').forEach(el => { const k = el.dataset.k, o = el.nextElementSibling;
    if (k === 's'){ el.value = Math.round((C.sus ?? 1) * 20); o.textContent = Math.round((C.sus ?? 1) * 100) + '%'; return; }
    const [L, f] = ENV_SL[k], list = L(), v = k === 'r' ? (C.rel ?? fxRelDef(C.mode)) : (C[f] || 0), ix = optIdx(list, v); el.max = list.length - 1; el.value = ix; o.textContent = list[ix][1];
    el.closest('.sl').classList.toggle('dimmed', k === 'l' && C.mode !== 'hit'); });
}
$('#fxEnvSl').addEventListener('input', e => { const el = e.target, C = fxEnvConf(); if (!C || !el.dataset.k) return; const k = el.dataset.k;
  if (!fxPrev || !fxPrev.loop) envPrevStart();
  if (k === 's') C.sus = +el.value / 20; else { const [L, f] = ENV_SL[k]; C[f] = L()[+el.value][0]; }
  envPrevChanged(C); syncEnvSl(); drawFxEnv(); paintFxPads(clock.beat); });
$('#fxEnvSl').addEventListener('change', envPrevStop);
syncEnvTg();
document.querySelectorAll('#fxEnvSl input').forEach(el => { el.closest('.sl').title = { a: ENV_WORDS.a, d: 'Decay: how long it takes to fall to Sustain', s: 'Sustain: the level it rests at after Decay', l: ENV_WORDS.l, r: ENV_WORDS.r }[el.dataset.k]; });
$('#fxSize').addEventListener('input', e => { const X = fxEd(); if (!X) return; const za = sizeAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style, X); if (za) X[za.key] = za.list[+e.target.value][0]; else X.size = FX_SIZES[+e.target.value][0]; syncFxUI(); });
onSeg($('#fxRateSeg'), b => { const X = fxEd(); if (!X) return; const alt = rateAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style, X); if (alt){ X[alt.key] = +b.dataset.v; syncFxUI(); } });
onSeg($('#fxSizeSeg'), b => { const X = fxEd(); if (!X) return; const za = sizeAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style, X); if (za){ X[za.side ? za.side.key : za.key] = +b.dataset.v; syncFxUI(); } });
onSeg($('#fxPalVar'), b => { const X = fxEd() || fxConfE(selFx); if (!X) return; const fi = +$('#fxPalVar').dataset.f, x = PAL_FAM[fi].m[+b.dataset.v]; X.pal = x.i; palLast[fi] = x.i; syncFxUI(); });
onSeg($('#fxDpat'), b => { const X = fxEd(); if (!X) return; const alt = rateAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style, X);
  if (alt && alt.lcd) X.dots = +b.dataset.v; else X.dpat = +b.dataset.v; syncFxUI(); });
$('#fxRate').addEventListener('input', e => { const X = fxEd(); if (!X) return; const alt = rateAlt(FX_DEFS[selFx < NFX ? selFx : preEd], X.style, X); if (alt){ const v = alt.list[+e.target.value][0]; if (alt.set) alt.set(X, v); else X[alt.key] = v; } else X.rate = FX_RATES[+e.target.value][0]; syncFxUI(); });
$('#fxPreList').addEventListener('click', e => { if (selFx < NFX) return; const b = e.target.closest('button');
  if (b){ delete fxPre[selFx - NFX].fx[b.dataset.i]; syncFxUI(); return; }
  const ch = e.target.closest('.pchip'); if (ch){ preEd = +ch.dataset.e; syncFxUI(); } });
$('#fxStore').addEventListener('click', () => { if (selFx >= NFX) storeFxPre(selFx - NFX); });
$('#fxClear').addEventListener('click', () => { if (selFx >= NFX){ fxPre[selFx - NFX].fx = {}; syncFxUI(); } });
// ---- an effect setting's LFO (0.94, ID-185): right-click Amount, Rate or Size; the envelope's box shows that setting's LFO ----
// (ui-fx runs before effects.js: FX_RATES / FX_SIZES are read when used.) The LFO lives with the effect (fxCfg[i].mod[k], or a preset's entry: fxEd()), saved with the set and copied into presets.
let fxModK = null, fxModLast = null;   // 'amt' | 'rate' | 'size' while the box shows an LFO
const FXM = { amt: { name: 'Amount', el: '#fxAmt', row: '#fxAmt', min: 5, max: 100, fmt: v => Math.round(v) + '%', toV: i => i / 100, toI: v => Math.round(v * 100) },
  rate: { name: 'Rate', el: '#fxRate', row: '#fxRateRow', min: 0, get max(){ return FX_RATES.length - 1; }, fmt: i => FX_RATES[i][1], toV: i => i, toI: v => Math.round(v) },
  size: { name: 'Size', el: '#fxSize', row: '#fxSizeRow', min: 0, get max(){ return FX_SIZES.length - 1; }, fmt: i => FX_SIZES[i][1], toV: i => i, toI: v => Math.round(v) },
  // 0.99.25 (ID-185): the settings that take over the Rate / Size slider in some styles have their own LFOs (the slider's list is what swings)
  dith: { name: 'Dither', slot: 'rate', alt: true, el: '#fxRate', row: '#fxRateRow', min: 0, get max(){ return FX_DITH.length - 1; }, fmt: i => FX_DITH[i][1], toV: i => i, toI: v => Math.round(v), get list(){ return FX_DITH; } },
  fbk: { name: 'Length', slot: 'rate', alt: true, el: '#fxRate', row: '#fxRateRow', min: 0, get max(){ return FX_FBK.length - 1; }, fmt: i => FX_FBK[i][1], toV: i => i, toI: v => Math.round(v), get list(){ return FX_FBK; } },
  kz: { name: 'Zoom', slot: 'rate', alt: true, el: '#fxRate', row: '#fxRateRow', min: 0, get max(){ return FX_KZ.length - 1; }, fmt: i => FX_KZ[i][1], toV: i => i, toI: v => Math.round(v), get list(){ return FX_KZ; } },
  vdrop: { name: 'Dropouts', slot: 'size', alt: true, el: '#fxSize', row: '#fxSizeRow', min: 0, get max(){ return FX_DROP.length - 1; }, fmt: i => FX_DROP[i][1], toV: i => i, toI: v => Math.round(v), get list(){ return FX_DROP; } },
  duo: { name: 'Colours', slot: 'rate', alt: true, el: '#fxRate', row: '#fxRateRow', min: 0, get max(){ return FX_DUO.length - 1; }, fmt: i => FX_DUO[i][1], toV: i => i, toI: v => Math.round(v), get list(){ return FX_DUO; } },   // 0.99.29: Duotone's pair
  kang: { name: 'Angle', slot: 'size', alt: true, el: '#fxSize', row: '#fxSizeRow', min: 0, get max(){ return FX_KANG.length - 1; }, fmt: i => FX_KANG[i][1], toV: i => i, toI: v => Math.round(v), get list(){ return FX_KANG; } } };   // 0.99.27: Kaleido's Angle (Ramp: a spin in time)
FXM.amt.slot = 'amt'; FXM.rate.slot = 'rate'; FXM.size.slot = 'size';
const fxModSlotKey = (slot, d, X) => { if (slot === 'amt') return 'amt';   // the key whose LFO the slot's slider carries now (null: none)
  const a = slot === 'rate' ? rateAlt(d, X.style, X) : sizeAlt(d, X.style, X);
  if (!a) return (slot === 'rate' ? d.rate : d.size) ? slot : null;
  return a.list && !a.toggle && !a.off && FXM[a.key] ? a.key : null; };
const fxModPlain = k => { const X = fxEd(), d = FX_DEFS[selFx < NFX ? selFx : preEd]; if (!X || !d) return false;   // only a slider in its plain meaning (not a palette, Dither, Dropouts…)
  if (k === 'amt') return !$('#fxAmt').dataset.palAmt && !$('#fxAmt').dataset.kal;
  return fxModSlotKey(FXM[k].slot, d, X) === k; };
const fxSlotName = k => { const f = $(FXM[k].row), l = f && (f.matches('label') ? f : f.closest('.field') && f.closest('.field').querySelector('label')); return (l && l.textContent.trim()) || FXM[k].name; };   // the slider's own word (Palette, not Amount)
const fxModKeys = () => Object.keys(FXM).filter(k => FXM[k]);
$('#fxLfoShape').innerHTML = SHAPES.filter(s => ['sine', 'tri', 'up', 'square', 'sh', 'drift'].includes(s[0])).map(([v, l, ic]) => `<button data-v="${v}" title="${l}">${ic}</button>`).join('');
$('#fxLfoPer').max = PER_FAM.e.length - 1; $('#fxLfoGap').max = GAP_OPTS.length - 1; $('#fxLfoBack').innerHTML = ENV_IC_GRAPH;
function fxModOpen(k){
  if (fxLvl === 'gif' && selFx < NFX) return toast2('GIF effects have no LFO or envelope: they play as set while the GIF does');   // (ID-223: no automation on GIF effects for now)
  if (!fxModPlain(k)) return toast(`${fxSlotName(k)} has no LFO in this style`);
  const X = fxEd(); X.mod = X.mod || {};
  if (!X.mod[k]){ const al = FXM[k].alt, a = al && (FXM[k].slot === 'rate' ? rateAlt : sizeAlt)(FX_DEFS[selFx < NFX ? selFx : preEd], X.style, X);
    const cur = k === 'amt' ? X.amt : al ? optIdx(FXM[k].list, X[k] ?? a.def) : k === 'rate' ? optIdx(FX_RATES, X.rate) : optIdx(FX_SIZES, X.size || FX_DEFS[selFx < NFX ? selFx : preEd].sizeDef || 64);
    X.mod[k] = { on: true, shape: 'sine', per: 4, lo: k === 'amt' ? 0.05 : FXM[k].min, hi: cur }; }
  fxModK = fxModLast = k; syncFxMod();
}
function syncFxMod(){
  const X = fxEd(), M = fxModK && X && X.mod && X.mod[fxModK];
  if (fxModK && !M) fxModK = null;
  $('#fxEdit .envrow').classList.toggle('lfo', !!fxModK);
  $('#envLfo').classList.toggle('dimmed', !(X && fxModKeys().some(k => fxModPlain(k))));
  document.querySelectorAll('.lfoOff').forEach(b => b.classList.toggle('dimmed', !(X && X.mod && Object.values(X.mod).some(m => m && m.on))));   // 0.99.27: all of this effect's LFOs off at once   // (0.99.6: greyed where no setting can have an LFO)
  { const lit = new Set(), all = new Set(); for (const k of fxModKeys()){ const r = $(FXM[k].row), f = r && (r.classList.contains('field') ? r : r.closest('.field')); if (!f) continue; all.add(f); if (X && X.mod && X.mod[k] && X.mod[k].on && fxModPlain(k)) lit.add(f); }
    all.forEach(f => f.classList.toggle('mod', lit.has(f))); }
  if (!M) return; const F = FXM[fxModK];
  $('#fxLfoT').textContent = 'LFO on ' + F.name; $('#fxLfoOn').checked = !!M.on;
  $('#fxLfoShape').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === M.shape));
  { const f = perFam(M.per), L = PER_FAM[f], pi = optIdx(L, M.per); $('#fxLfoPer').max = L.length - 1; $('#fxLfoPer').value = pi; $('#fxLfoPer').nextElementSibling.textContent = L[pi][1]; segSet('#fxLfoFam', f); }
  for (const [id, key] of [['#fxLfoLo', 'lo'], ['#fxLfoHi', 'hi']]){ const el = $(id); el.min = F.min; el.max = F.max;
    const i = fxModK === 'amt' ? F.toI(M[key]) : M[key]; el.value = i; el.nextElementSibling.textContent = F.fmt(i); }
  $('#fxLfoPh').value = M.ph || 0; $('#fxLfoPh').nextElementSibling.textContent = Math.round((M.ph || 0) * 360) + '°';
  $('#fxLfoSk').value = M.sk ?? 0.5; $('#fxLfoSk').nextElementSibling.textContent = skFmt(M.sk ?? 0.5);
  const gi = optIdx(GAP_OPTS, M.gap || 0); $('#fxLfoGap').value = gi; $('#fxLfoGap').nextElementSibling.textContent = GAP_OPTS[gi][1];   // (no room for the note switch in this narrow cell)
  $('#fxLfoInv').classList.toggle('on', !!M.inv);
}
for (const slot of ['amt', 'rate', 'size']) $(FXM[slot].row).closest('.field').addEventListener('contextmenu', e => { e.preventDefault();
  const X = fxEd(), d = FX_DEFS[selFx < NFX ? selFx : preEd], k = X && d ? fxModSlotKey(slot, d, X) : slot;   // (the key the slider carries now: Zoom, Dither, Length, Dropouts…)
  if (!k) return toast(`${fxSlotName(slot)} has no LFO in this style`);
  if (fxModK === k) { fxModK = null; syncFxMod(); } else fxModOpen(k); });
$('#fxLfoBack').addEventListener('click', () => { fxModK = null; syncFxMod(); });
// the envelope's LFO view button (0.99): the LFO last open here, else Amount's, else the first setting that can have one
$('#envLfo').addEventListener('click', () => { const k = [fxModLast, 'amt', 'rate', 'size', ...fxModKeys()].find(k => k && FXM[k] && fxModPlain(k)); if (k) fxModOpen(k); else toast('No setting of this effect can have an LFO here'); });
const fxModSet = f => { const X = fxEd(), M = X && X.mod && X.mod[fxModK]; if (M){ f(M); M.on = true; syncFxMod(); } };
$('#fxLfoPh').addEventListener('input', e => fxModSet(M => M.ph = +e.target.value));
$('#fxLfoSk').addEventListener('input', e => fxModSet(M => M.sk = +e.target.value));
$('#fxLfoGap').addEventListener('input', e => fxModSet(M => M.gap = GAP_OPTS[+e.target.value][0]));
$('#fxLfoInv').addEventListener('click', () => fxModSet(M => M.inv = !M.inv));
$('#fxLfoOn').addEventListener('change', e => { const X = fxEd(); if (X && X.mod && X.mod[fxModK]){ X.mod[fxModK].on = e.target.checked; syncFxMod(); } });
onSeg($('#fxLfoShape'), b => { const X = fxEd(); if (X && X.mod && X.mod[fxModK]){ X.mod[fxModK].shape = b.dataset.v; X.mod[fxModK].on = true; syncFxMod(); } });
$('#fxLfoPer').addEventListener('input', e => { const X = fxEd(); if (X && X.mod && X.mod[fxModK]){ X.mod[fxModK].per = PER_FAM[perFam(X.mod[fxModK].per)][+e.target.value][0]; syncFxMod(); } });
onSeg($('#fxLfoFam'), b => { const X = fxEd(); if (X && X.mod && X.mod[fxModK]){ X.mod[fxModK].per = perNear(b.dataset.v, X.mod[fxModK].per); syncFxMod(); } });
for (const [id, key] of [['#fxLfoLo', 'lo'], ['#fxLfoHi', 'hi']]) $(id).addEventListener('input', e => { const X = fxEd(); if (!(X && X.mod && X.mod[fxModK])) return;
  X.mod[fxModK][key] = fxModK === 'amt' ? FXM.amt.toV(+e.target.value) : +e.target.value; X.mod[fxModK].on = true; syncFxMod(); });
var fxModReady = true;
document.querySelectorAll('.lfoOff').forEach(b => b.addEventListener('click', () => { const X = fxEd(); const on = X && X.mod ? Object.values(X.mod).filter(m => m && m.on) : []; if (!on.length) return toast2('No LFO is on for this effect'); on.forEach(m => m.on = false); syncFxUI(); toast2(`${on.length} LFO${on.length > 1 ? 's' : ''} off (settings kept)`); }));
// 0.99.27 (ID-235): which level the F-keys, the tiles and this editor work on (all three play together)
onSeg($('#fxLvl'), b => { fxLvl = b.dataset.v; Prefs.set('vjif-fxlvl', fxLvl); fxFitGen++; fxPadLv.length = 0; syncFxUI();
  toast2(fxLvl === 'gif' ? 'GIF: the F-keys switch the selected GIF\'s own effects; the editor sets them' : fxLvl === 'scene' ? 'Scene: the F-keys play this scene\'s own effects (latched ones stay with the scene)' : 'Output: the F-keys play effects that carry on from scene to scene'); });
