// ---------- keyboard ----------
function isTyping(e){
  const t = e.target;
  if (!t || !t.tagName) return false;
  if (t.isContentEditable || t.tagName === 'TEXTAREA') return true;
  return t.tagName === 'INPUT' && ['text','number','url','search'].includes(t.type);
}
let npArm = null;                                   // Caps+Shift+numpad on a full preset: armed, waiting for the second press
const FX_MODE_KEYS = { Insert: 'hold', Home: 'hit', PageUp: 'latch' };   // the 3 keys above the arrows, left to right
let heldFxKey = -1;   // an F-key effect held down: 1–5 then set its layers
function onKey(e){
  if (midiCtl.learning){ if (e.key === 'Escape' || e.key === 'Enter'){ e.preventDefault(); endLearn(); } return; }
  if (!$('#textPanel').hidden){ if (e.key === 'Escape'){ e.preventDefault(); closeText(); } else if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); textOk(); } return; }   // Enter: put it on the pad · Shift+Enter: a new line (as everywhere)
  if (!$('#credPanel').hidden){ if (e.key === 'Escape'){ e.preventDefault(); $('#credPanel').hidden = true; } return; }
  if (!$('#aboutPanel').hidden){ if (e.key === 'Escape' || e.key === 'Enter'){ e.preventDefault(); closeAbout(); } return; }
  if (maskEd && e.key === 'Escape'){ e.preventDefault(); maskClose(); return; }   // painting a mask: Esc is Done (other keys keep playing)
  if (!$('#lpMapPanel').hidden){ if (e.key === 'Escape'){ e.preventDefault(); $('#lpMapPanel').hidden = true; } return; }
  if (!$('#helpPanel').hidden){ if (e.key === 'Escape' || (e.key === '?' && !isTyping(e))){ e.preventDefault(); $('#helpPanel').hidden = true; } return; }
  if (!$('#setPanel').hidden && e.key === 'Escape'){ e.preventDefault(); $('#setPanel').hidden = true; return; }   // a drawer: keys keep working
  if (!$('#poolPanel').hidden && e.key === 'Escape'){ e.preventDefault(); closePool(); return; }   // a floating window: keys keep working
  if (!$('#setsPanel').hidden){                      // the sets panel is modal
    if (e.key === 'Escape' && askBox){ e.preventDefault(); closeAsk(); }
    else if (e.key === 'Escape' && !e.target.closest?.('.setRow')){ e.preventDefault(); closeSets(); }
    return;
  }
  if (e.key === '?' && !isTyping(e)){ e.preventDefault(); $('#helpPanel').hidden = false; $('#helpQ').focus(); $('#helpQ').select(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'){ e.preventDefault(); quickSave(); return; }
  if ((e.ctrlKey || e.metaKey) && !isTyping(e) && /^[zy]$/i.test(e.key)){
    e.preventDefault(); (e.key.toLowerCase() === 'y' || e.shiftKey) ? redo() : undo(); return;
  }
  if (!isTyping(e) && e.altKey && !e.ctrlKey && !e.metaKey){            // Alt+pad: rename its GIF · Alt+1–4: the layer to edit / trigger into
    const ap = PAD_KEYS.indexOf(e.code); if (ap >= 0){ e.preventDefault(); if (!e.repeat) renamePad(ap); return; }
    const a = /^Digit([1-4])$/.exec(e.code); if (a){ e.preventDefault(); setTarget(+a[1] - 1); } return;
  }
  if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
  if (/^Arrow/.test(e.code)){                        // nudge the selected GIF: 1 px, Shift = 10 px (holding repeats; one undo step)
    const c = selClip(); if (!c) return;
    e.preventDefault();
    const st = e.shiftKey ? 10 : 1;
    c.x = clamp(c.x + (e.code === 'ArrowLeft' ? -st : e.code === 'ArrowRight' ? st : 0), -W, W);
    c.y = clamp(c.y + (e.code === 'ArrowUp' ? -st : e.code === 'ArrowDown' ? st : 0), -H, H);
    syncXfUI(); return;
  }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && !(e.target && e.target.closest && e.target.closest('button, select, a, input, textarea'))){ e.preventDefault(); prep ? goLive() : startPrep(); return; }   // Enter: Prep / go live (a focused control keeps its own Enter)
  const xi = FX_KEYS.indexOf(e.code);                // F1–F12: screen effects (Shift: edit without playing)
  if (xi >= 0){ e.preventDefault(); if (!e.repeat){ if (heldPre < 0 && !e.shiftKey) heldFxKey = xi; heldPre >= 0 ? togglePreFx(heldPre, xi) : e.shiftKey ? selectFx(xi) : fxPlay(xi); } return; }
  if ((e.code === 'NumpadDivide' || e.code === 'NumpadMultiply') && !isTyping(e)){ e.preventDefault(); if (!e.repeat) setScBank(scBank + (e.code === 'NumpadDivide' ? -1 : 1)); return; }   // / and *: the scene bank before / after
  const np = /^Numpad([1-9])$/.exec(e.code);         // numpad 1–9 (by position): scenes, or effect presets with Caps Lock
  if (np){
    e.preventDefault(); if (e.repeat) return;
    const k = +np[1] - 1;
    setCaps(e.getModifierState('CapsLock'));
    // Shift: on Windows, Shift+numpad with NumLock on arrives as Home / ↑ / PgUp… without the Shift flag
    const shifted = e.shiftKey || (e.getModifierState('NumLock') && !/^[0-9]$/.test(e.key));
    if (!capsOn && !shifted) return sceneKey(bankScene(k));   // the bank on show (0.91)
    // Caps Lock: the numpad plays effect presets (Shift stores into one) · Caps Lock off, Shift held: plays them too
    if (capsOn && shifted){                         // storing over a preset that has effects: press again within 1.5 s (Caps Lock left on by mistake can't wipe one)
      const full = Object.keys(fxPre[k].fx).length, now = performance.now();
      if (full && !(npArm && npArm.k === k && now - npArm.t < 1500)){ npArm = { k, t: now }; toast(`${FXP_LABELS[k]} has effects: press again to replace them (Caps Lock is on)`); return; }
      npArm = null; storeFxPre(k);
    } else { fxDown(NFX + k); heldPre = k; selectFx(NFX + k); }
    return;
  }
  if (heldFxKey >= 0 && !e.shiftKey && FX_MODE_KEYS[e.code]){   // an effect key held + Ins / Home / PgUp: Hold / Hit / Latch
    e.preventDefault(); if (!e.repeat){ setFxMode(heldFxKey, FX_MODE_KEYS[e.code]); toast2(`${FX_DEFS[heldFxKey].name}: ${FX_MODE_KEYS[e.code]}`); } return; }
  if (e.code === 'Digit0'){ e.preventDefault(); if (!e.repeat){ setBlack(true); updLiveTag(); } return; }   // 0: blackout while held
  if (e.code === 'Insert'){ e.preventDefault(); if (!e.repeat) setFreeze(true); return; }                  // Ins: freeze while held
  const ti = TR_KEYS.indexOf(e.code);                // 1–9: arm a transition preset · Shift+1–4: layer on / off
  if (ti >= 0 && heldFxKey >= 0 && !e.shiftKey){     // an effect key held + 1–4: that layer in / out of the effect's layers · + 5: All (again: the set back)
    e.preventDefault(); if (e.repeat || ti > 4) return;
    const C = fxCfg[heldFxKey]; if (ti === 4) allToggle(C); else C.target = tgtToggle(C.target, ti, false);
    const L = tgtList(C.target); toast2(`${FX_DEFS[heldFxKey].name}: ${L[0] === 'out' ? 'All' : 'layer' + (L.length > 1 ? 's ' : ' ') + L.map(i => i + 1).join(' + ')}`);
    if (selFx === heldFxKey) syncFxUI(); return;
  }
  if (ti >= 0){ e.preventDefault(); if (e.shiftKey){ if (ti < 4) toggleLayer(ti); } else armTrans(ti); return; }
  if (e.code === 'Space') e.preventDefault();
  const pi = PAD_KEYS.indexOf(e.code);
  if (e.repeat) return;
  if (pi >= 0){ e.preventDefault(); const p = pi < 9 && e.shiftKey ? B2 + pi : pi;   // Shift + a Scene key: its bank-2 pad (0.90); Shift + a Global key: select it without playing
    if (pi >= 9 && e.shiftKey) focusPad(pi); else { keyPad.set(e.code, p); trigger(p); } return; }
  if (e.code === 'Tab' && !e.ctrlKey && !e.altKey && !e.metaKey){ e.preventDefault(); setPadBank(padBank ? 0 : 1); return; }
  if (e.code === 'Space'){ e.shiftKey ? resync() : tap(); return; }
  if (e.code === 'Escape'){ stopPick(); return; }
  if (e.code === 'Delete' || e.code === 'Backspace'){ e.preventDefault(); removeClip(target, selClip()); return; }
  if (e.code === 'Home'){ e.preventDefault(); const c = selClip(); if (c){ Object.assign(c, newXf()); syncXfUI(); commit(); } return; }   // reset placement
  if (e.code === 'End'){ e.preventDefault(); toggleLayer(target); return; }                  // the edit layer on / off
  if (e.code === 'PageUp' || e.code === 'PageDown'){ e.preventDefault(); setTarget(clamp(target + (e.code === 'PageUp' ? -1 : 1), 0, 3)); return; }   // PgUp: the layer to the left (cards are 1→4 left to right), PgDn: to the right
}
const keyPad = new Map();   // a held pad key → the pad it played (bank 1 or 2)
function onKeyUp(e){                                // releases always count, even if focus moved into a text field meanwhile
  if (e.code === 'Space' && !isTyping(e)) e.preventDefault();
  const pi = PAD_KEYS.indexOf(e.code); if (pi >= 0){ release(keyPad.has(e.code) ? keyPad.get(e.code) : pi); keyPad.delete(e.code); }   // the pad that key started (Shift may be let go first)
  const xi = FX_KEYS.indexOf(e.code); if (xi >= 0){ fxUp(xi); if (heldFxKey === xi) heldFxKey = -1; }
  const qi = FXP_KEYS.indexOf(e.code); if (qi >= 0){ fxUp(NFX + qi); if (heldPre === qi) heldPre = -1; }
  if (e.code === 'Digit0' && live.blackOn){ setBlack(false); updLiveTag(); }
  if (e.code === 'Insert') setFreeze(false);
}
window.addEventListener('keydown', onKey);
window.addEventListener('keyup', onKeyUp);
// keep focus off controls so keys always reach the pads
document.addEventListener('change', e => { if (e.target.matches('select, input[type=range], input[type=checkbox], input[type=radio], input[type=color]')) e.target.blur(); });
document.addEventListener('click', e => { const b = e.target.closest('button'); if (b) b.blur(); });

// Keys & mouse: the search box shows only the entries that mention every word typed (and their group headings)
$('#helpQ').addEventListener('input', e => { const W = e.target.value.toLowerCase().split(/\s+/).filter(Boolean); let any = false;
  document.querySelectorAll('#helpPanel dl.keys').forEach(dl => { let n = 0;
    dl.querySelectorAll('dt').forEach(dt => { const dd = dt.nextElementSibling, t = (dt.textContent + ' ' + dd.textContent).toLowerCase(), ok = W.every(w => t.includes(w)); dt.hidden = dd.hidden = !ok; if (ok) n++; });
    dl.hidden = !n; dl.previousElementSibling.hidden = !n; if (n) any = true; });
  $('#helpNone').hidden = any; });
