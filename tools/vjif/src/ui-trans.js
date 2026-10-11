// ---------- UI: the Transition panel (presets, type, style, options, length) ----------
function syncTransUI(){
  if (!$('#trType').children.length){ $('#trType').innerHTML = TR_TYPES.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join(''); $('#trLen').max = TR_LENS.length - 1; $('#trPx').max = TR_PX.length - 1; }
  const T = transCfg, cut = T.type === 'cut';
  $('#trPre').innerHTML = trPresets.map((P, k) => `<button data-v="${k}" class="${k === trSel ? 'on' : ''}" title="Key ${k + 1}: ${trLabel(P)}${P.type === 'cut' ? '' : ' · ' + TR_LENS[optIdx(TR_LENS, P.len)][1]}">${k + 1}</button>`).join('');
  segSet('#trType', T.type); segSet('#trCurve', T.smooth ? 1 : 0);
  const sts = TR_STYLES[T.type] || [], stl = trStyleOf(T);
  $('#trStyle').innerHTML = sts.length ? sts.map(x => `<button data-v="${x[0]}" class="${x[0] === stl ? 'on' : ''}" title="${x[2]}">${x[1]}</button>`).join('') : '<button disabled>—</button>';
  $('#trStyleRow').classList.toggle('dimmed', !sts.length);
  const pi = optIdx(TR_PX, T.px || 12); $('#trPx').value = pi; $('#trPx').nextElementSibling.textContent = TR_PX[pi][1];
  $('#trPxRow').classList.toggle('dimmed', !(T.type === 'dissolve' || T.type === 'glitch'));   // TV (VHS, Channel) has no block size
  const i = optIdx(TR_LENS, T.len); $('#trLen').value = i; $('#trLen').nextElementSibling.textContent = TR_LENS[i][1];
  // the Options row: what this transition can be tuned with (groups of choices, and on / off switches)
  const G = trOptsOf(T), sig = T.type + '|' + stl, box = $('#trDir');
  if (box.dataset.sig !== sig){ box.dataset.sig = sig;
    box.innerHTML = G.length ? G.map(([k, list, tog]) => tog ? `<button data-k="${k}" data-tog="1" title="${list[2]}">${list[1]}</button>`
      : list.map(([v, l, t]) => `<button data-k="${k}" data-v="${v}" title="${t}">${l}</button>`).join('')).join('') : '<button disabled>—</button>'; }
  box.querySelectorAll('button[data-k]').forEach(b => { const k = b.dataset.k, g = G.find(x => x[0] === k);
    b.classList.toggle('on', b.dataset.tog ? !!T[k] : (T[k] ?? g[1][0][0]) === b.dataset.v); });
  $('#trDirRow').classList.toggle('dimmed', !G.length);
  $('#trLenRow').classList.toggle('dimmed', cut); $('#trCurveRow').classList.toggle('dimmed', cut || isMelt(T));   // the melt keeps Doom's own timing
  $('#trTag').textContent = `${trSel + 1} · ` + (cut ? 'cut' : `${trLabel(T).toLowerCase()} · ${TR_LENS[i][1]}`);
}
onSeg($('#trPre'), (b, e) => { const k = +b.dataset.v;
  if (isRm(e)){ trPresets[k] = trDefaults()[k]; toast2(`Transition ${k + 1} back to its default`); } armTrans(k); });   // Ctrl+click: reset it
$('#trPre').addEventListener('contextmenu', e => { const b = e.target.closest('button'); if (!b || !e.ctrlKey) return; e.preventDefault(); const k = +b.dataset.v; trPresets[k] = trDefaults()[k]; toast2(`Transition ${k + 1} back to its default`); armTrans(k); });
onSeg($('#trType'), (b, e) => { transCfg.type = b.dataset.v; transCfg.style = trStyleOf(transCfg); syncTransUI(); });
onSeg($('#trStyle'), (b, e) => {
  transCfg.style = b.dataset.v; if (b.dataset.v === 'pixelate' && (transCfg.px || 12) < 32) transCfg.px = 48;   // pixelate wants big blocks
  syncTransUI(); });
// each transition's options: [key, choices] (the first is the default) or [key, [_, label, title], true] for an on / off switch
const TR_DIR = ['dir', [['left', '←', 'Towards the left'], ['right', '→', 'Towards the right'], ['up', '↑', 'Upwards'], ['down', '↓', 'Downwards'], ['rand', 'Rnd', 'A random direction each time']]];
const TR_SOFT = ['soft', [0, 'Soft', 'A soft, feathered edge'], true];
function trOptsOf(T){ const st = trStyleOf(T);
  switch (T.type){
    case 'slide': return [TR_DIR];
    case 'wipe': return st === 'iris' ? [['from', [['mid', 'Middle', 'Opens from the middle of the frame'], ['gif', 'GIF', "Opens from the selected GIF's centre (in the new scene)"]]], TR_SOFT] : [TR_DIR, TR_SOFT];
    case 'fade': return st === 'luma' ? [['inv', [['bright', 'Bright', 'The brightest parts change first'], ['dark', 'Dark', 'The darkest parts change first']]], TR_SOFT] : [];
    case 'zoom': return [['zoom', [['in', 'In', 'The old scene grows and fades, the new one grows in'], ['out', 'Out', 'The old scene backs away, the new one comes down from close up'], ['thru', 'Through', 'The old scene flies past the camera']]]];
    case 'dissolve': return st === 'blocks' ? [['shape', [['sq', 'Squares', 'Square blocks'], ['lines', 'Lines', 'Whole lines (Pixel = their height)'], ['dia', 'Diamonds', 'Diamond-shaped blocks']]]] : [];
    case 'glitch': return st === 'scramble' ? [] : [['split', [['off', 'Clean', 'No colour split'], ['on', 'Split', 'The red pulled sideways as it tears'], ['wide', 'Wide', 'A wider colour split']]]];
    case 'tv': return st === 'channel' ? [['ch', [['rand', 'Random', 'A random channel number each time'], ['scene', 'Scene', "The new scene's name (or its number if it has none)"], ['num', 'Scene #', 'The new scene\'s number, with a leading 0 (01–09)']]]]
      : [['wear', [['light', 'Light', 'A tape in good shape'], ['worn', 'Worn', 'A well-used tape'], ['chewed', 'Chewed', 'The VCR ate it']]]];
    case 'stutter': return st === 'even' ? [['grid', [['0.25', '1/16', 'A cut every 1/16 note'], ['0.5', '1/8', 'A cut every 1/8 note'], ['0.125', '1/32', 'A cut every 1/32 note']]], ['swing', [0, 'Swing', 'Long-short pairs, like swung notes'], true]]
      : [['swing', [0, 'Swing', 'Long-short pairs, like swung notes'], true]];
  }
  return [];
}
onSeg($('#trDir'), (b, e) => { const k = b.dataset.k; if (!k) return; if (b.dataset.tog) transCfg[k] = !transCfg[k]; else transCfg[k] = b.dataset.v; syncTransUI(); });
onSeg($('#trCurve'), (b, e) => { transCfg.smooth = b.dataset.v === '1'; syncTransUI(); });
$('#trLen').addEventListener('input', e => { transCfg.len = TR_LENS[+e.target.value][0]; syncTransUI(); });
$('#trPx').addEventListener('input', e => { transCfg.px = TR_PX[+e.target.value][0]; syncTransUI(); });
