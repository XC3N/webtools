// common/controls.js — the control behaviour standard (from Bad MOPHO), for slider rows.
//
// Applies to every <input type=range> (optionally followed by an <output> readout):
//   • double-click the slider → back to its default
//       default = data-def ("min" / "max" allowed), or the value it had when Controls.init() ran
//   • mouse wheel over a hovered slider → ±1 step (Shift ×10). Dwell-gated: the slider only takes the
//     wheel once the cursor has settled on it and the page isn't scrolling (it glows when armed), so
//     scrolling a panel never changes values by accident
//   • arrow keys while hovering a slider → Up/Down ±1 step, Left/Right ±10 steps (Shift ×10)
//   • double-click the readout (the number) → type a value; Enter or clicking away applies, Esc cancels.
//     A readout drawn inside the bar lets clicks and drags through to the slider (style.css), so the slider
//     can be grabbed anywhere; a double-click over the number types instead of resetting
//       the text is read by el.ctlParse(text) when the tool sets one, else as a number
//       (data-pct on the slider: the number is a percentage → ÷100)
// Choice controls — every <select>, and every .seg button group that shows a choice (one button .on or .sel;
// not .tabs, which navigate, nor groups of plain action buttons):
//   • mouse wheel (same dwell gate) → next / previous option (wheel down = next, as down the list)
//   • arrow keys while hovering → Down / Right = next, Up / Left = previous; disabled / hidden options are skipped
//   • no double-click reset: a native dropdown opens on the first click, and a seg's double-click is two picks
// Every change is applied by setting the slider's value and dispatching 'input' then 'change' (select: 'input' +
// 'change'; seg: a click on the new button), so the tool's own handlers do the work. Opt out with data-no-ctl.
'use strict';
const Controls = (() => {
  const DWELL = 100, SCROLL_LOCK = 160, CHANGE_DELAY = 400;
  let px = 0, py = 0, lastMove = 0, lastScroll = -1e9, ready = null, readyT = 0, hover = null;
  const isRange = el => el && el.tagName === 'INPUT' && el.type === 'range' && !el.disabled && !el.closest('[data-no-ctl]');
  const rangeOf = el => {
    if (!el || !el.closest) return null;
    if (isRange(el)) return el;
    const o = el.closest('output'); if (!o) return null;
    const r = o.previousElementSibling; return isRange(r) ? r : null;
  };
  // choice controls: a <select>, or a .seg group of buttons
  const choiceOf = el => {
    if (!el || !el.closest || el.closest('[data-no-ctl]')) return null;
    const s = el.closest('select'); if (s) return s.disabled ? null : s;
    const g = el.closest('.seg'); return g && !g.classList.contains('tabs') && g.querySelector(':scope > button.on, :scope > button.sel') ? g : null;
  };
  const ctlOf = el => rangeOf(el) || choiceOf(el);
  const under = () => ctlOf(document.elementFromPoint(px, py));
  // step a choice control by n options
  function stepChoice(el, n){
    if (el.tagName === 'SELECT'){
      const o = [...el.options], ok = o.map(x => !x.disabled && !x.hidden);
      let i = el.selectedIndex;
      for (let k = 0; k < Math.abs(n); k++){ let j = i; do j += Math.sign(n); while (j >= 0 && j < o.length && !ok[j]); if (j < 0 || j >= o.length) break; i = j; }
      if (i === el.selectedIndex) return;
      el.selectedIndex = i;
      el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const bs = [...el.querySelectorAll(':scope > button')].filter(b => !b.disabled && b.offsetParent !== null);
    const cur = bs.findIndex(b => b.classList.contains('on') || b.classList.contains('sel'));
    const i = cur < 0 ? (n > 0 ? 0 : bs.length - 1) : Math.max(0, Math.min(bs.length - 1, cur + n));
    if (bs[i] && i !== cur) bs[i].click();
  }
  const num = (el, k) => +el[k];
  function defaultOf(el){
    const d = el.dataset.def;
    if (d === 'min') return num(el, 'min');
    if (d === 'max') return num(el, 'max');
    if (d !== undefined && d !== '') return +d;
    return el._ctlDef !== undefined ? el._ctlDef : null;
  }
  const changeT = new WeakMap();
  // set + notify; `lazy` batches the 'change' (one undo step per wheel / arrow gesture)
  function apply(el, v, lazy = false){
    const lo = num(el, 'min'), hi = num(el, 'max');
    el.value = Math.min(hi, Math.max(lo, v));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    clearTimeout(changeT.get(el));
    if (lazy) changeT.set(el, setTimeout(() => el.dispatchEvent(new Event('change', { bubbles: true })), CHANGE_DELAY));
    else el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  const stepOf = el => (el.step && el.step !== 'any') ? +el.step : (num(el, 'max') - num(el, 'min')) / 100;
  function nudge(el, n, lazy){ apply(el, +el.value + n * stepOf(el), lazy); }

  function clearReady(){ if (ready){ ready.classList.remove('wheelready'); ready = null; } }
  function checkReady(){
    if (performance.now() - lastScroll < SCROLL_LOCK){ clearReady(); return; }
    const w = under(); if (w === ready) return;
    clearReady(); if (w){ ready = w; w.classList.add('wheelready'); }
  }

  // ---- typing a value into the readout ----
  let editing = null;
  function startEdit(o, el){
    if (editing) endEdit(true);
    const inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'ctl-edit'; inp.value = o.textContent.trim(); inp.spellcheck = false;
    editing = { o, el, inp, text: o.textContent };
    o.textContent = ''; o.appendChild(inp); inp.focus(); inp.select();
    inp.addEventListener('keydown', e => {
      e.stopPropagation();                             // keys typed here never reach pads / shortcuts
      if (e.key === 'Enter'){ e.preventDefault(); endEdit(true); }
      else if (e.key === 'Escape'){ e.preventDefault(); endEdit(false); }
    });
    inp.addEventListener('blur', () => endEdit(true));
  }
  function endEdit(commit){
    if (!editing) return;
    const { o, el, inp, text } = editing; editing = null;
    const t = inp.value.trim();
    o.textContent = text;                            // the tool's input handler rewrites it if the value changes
    if (!commit || !t) return;
    let v = el.ctlParse ? el.ctlParse(t) : parseFloat(t.replace(',', '.'));
    if (v === null || v === undefined || !isFinite(v)) return;
    if (!el.ctlParse && el.dataset.pct !== undefined) v /= 100;
    apply(el, v);
  }

  // value bars: --p (0–100 %) on each slider, for a CSS fill. Kept in sync on user input AND when code sets .value
  // (tools set slider values directly when they show a different GIF / preset), via a hook on the value setter.
  const paint = el => { const lo = el.min === '' ? 0 : +el.min, hi = el.max === '' ? 100 : +el.max;
    el.style.setProperty('--p', Math.max(0, Math.min(100, (+el.value - lo) / ((hi - lo) || 1) * 100)) + '%'); };
  (() => {
    const d = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(HTMLInputElement.prototype, 'value', { configurable: true, enumerable: d.enumerable,
      get(){ return d.get.call(this); }, set(v){ d.set.call(this, v); if (this.type === 'range') paint(this); } });
    addEventListener('input', e => { if (e.target && e.target.type === 'range') paint(e.target); }, true);
  })();
  function init(root = document){
    root.querySelectorAll('input[type=range]').forEach(el => { if (el._ctlDef === undefined) el._ctlDef = +el.value; paint(el); });
    if (init.done) return; init.done = true;
    addEventListener('pointermove', e => {
      lastMove = performance.now(); px = e.clientX; py = e.clientY;
      hover = under();
      if (e.buttons){ clearReady(); clearTimeout(readyT); return; }
      if (hover && hover === ready) return;
      clearReady(); clearTimeout(readyT);
      if (hover) readyT = setTimeout(checkReady, DWELL);
    }, { passive: true });
    addEventListener('pointerup', () => { clearTimeout(readyT); readyT = setTimeout(checkReady, DWELL); }, { passive: true });
    addEventListener('scroll', () => { lastScroll = performance.now(); clearReady(); }, { passive: true, capture: true });
    addEventListener('wheel', e => {
      const el = ctlOf(e.target); if (!el) return;
      const now = performance.now();
      const armed = el === ready || (now - lastScroll >= SCROLL_LOCK && now - lastMove >= DWELL);
      if (!armed) return;                              // not settled yet: let the panel scroll
      e.preventDefault();
      const d = e.deltaY || e.deltaX; if (!d) return;
      if (el.tagName !== 'INPUT'){ stepChoice(el, d > 0 ? 1 : -1); return; }
      nudge(el, (d < 0 ? 1 : -1) * (e.shiftKey ? 10 : 1), true);
    }, { passive: false, capture: true });
    addEventListener('keydown', e => {                 // capture: runs before the tool's own arrow handling
      if (editing || e.ctrlKey || e.metaKey || e.altKey || !/^Arrow/.test(e.code)) return;   // real arrow keys only (not Shift+numpad)
      const a = document.activeElement;
      if (a && (a.tagName === 'TEXTAREA' || a.isContentEditable || (a.tagName === 'INPUT' && a.type !== 'range'))) return;
      const el = hover && hover.isConnected ? hover : null; if (!el) return;
      if (a && a.tagName === 'SELECT' && a === el) return;   // a focused dropdown under the cursor uses its own arrows
      if (a && a.tagName === 'SELECT') a.blur();
      e.preventDefault(); e.stopImmediatePropagation();
      if (el.tagName !== 'INPUT'){ stepChoice(el, e.code === 'ArrowDown' || e.code === 'ArrowRight' ? 1 : -1); return; }
      const up = e.code === 'ArrowUp' || e.code === 'ArrowRight', big = e.code === 'ArrowLeft' || e.code === 'ArrowRight';
      nudge(el, (up ? 1 : -1) * (big ? 10 : 1) * (e.shiftKey ? 10 : 1), true);
    }, true);
    // the value before a double-click's first click (which may have moved the slider), so typing starts from it
    addEventListener('mousedown', e => { const el = rangeOf(e.target); if (el && e.detail <= 1) el._ctlPrev = +el.value; }, true);
    addEventListener('dblclick', e => {
      const el = rangeOf(e.target); if (!el || editing) return;
      const o = el.nextElementSibling && el.nextElementSibling.tagName === 'OUTPUT' ? el.nextElementSibling : null;
      const r = o && o.getBoundingClientRect();
      if (o && (o.contains(e.target) || (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom))){
        e.preventDefault(); e.stopPropagation();
        if (el._ctlPrev !== undefined && +el.value !== el._ctlPrev) apply(el, el._ctlPrev);
        return startEdit(o, el);
      }
      const d = defaultOf(el); if (d === null) return;
      e.preventDefault(); e.stopPropagation(); apply(el, d);
    }, true);
  }
  return { init, apply, paint, defaultOf, setDefault(el, v){ el.dataset.def = v; } };
})();
