// common/controls.js — the control behaviour standard (from Bad MOPHO), for slider rows.
//
// Applies to every <input type=range> (optionally followed by an <output> readout):
//   • double-click the slider or its readout → back to its default
//       default = data-def ("min" / "max" allowed), or the value it had when Controls.init() ran
//   • mouse wheel over a hovered slider → ±1 step (Shift ×10). Dwell-gated: the slider only takes the
//     wheel once the cursor has settled on it and the page isn't scrolling (it glows when armed), so
//     scrolling a panel never changes values by accident
//   • arrow keys while hovering a slider → Up/Down ±1 step, Left/Right ±10 steps (Shift ×10)
//   • click the readout → type a value; Enter or clicking away applies, Esc cancels
//       the text is read by el.ctlParse(text) when the tool sets one, else as a number
//       (data-pct on the slider: the number is a percentage → ÷100)
// Every change is applied by setting the slider's value and dispatching 'input' then 'change', so the
// tool's own handlers do the work. Opt out per element with data-no-ctl.
'use strict';
const Controls = (() => {
  const DWELL = 100, SCROLL_LOCK = 160, CHANGE_DELAY = 400;
  let px = 0, py = 0, lastMove = 0, lastScroll = -1e9, ready = null, readyT = 0, hover = null;
  const isRange = el => el && el.tagName === 'INPUT' && el.type === 'range' && !el.closest('[data-no-ctl]');
  const rangeOf = el => {
    if (!el || !el.closest) return null;
    if (isRange(el)) return el;
    const o = el.closest('output'); if (!o) return null;
    const r = o.previousElementSibling; return isRange(r) ? r : null;
  };
  const under = () => rangeOf(document.elementFromPoint(px, py));
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
      const el = rangeOf(e.target); if (!el) return;
      const now = performance.now();
      const armed = el === ready || (now - lastScroll >= SCROLL_LOCK && now - lastMove >= DWELL);
      if (!armed) return;                              // not settled yet: let the panel scroll
      e.preventDefault();
      const d = e.deltaY || e.deltaX; if (!d) return;
      nudge(el, (d < 0 ? 1 : -1) * (e.shiftKey ? 10 : 1), true);
    }, { passive: false, capture: true });
    addEventListener('keydown', e => {                 // capture: runs before the tool's own arrow handling
      if (editing || e.ctrlKey || e.metaKey || e.altKey || !/^Arrow/.test(e.code)) return;   // real arrow keys only (not Shift+numpad)
      const a = document.activeElement;
      if (a && (a.tagName === 'TEXTAREA' || a.isContentEditable || (a.tagName === 'INPUT' && a.type !== 'range') || a.tagName === 'SELECT')) return;
      const el = hover && hover.isConnected ? hover : null; if (!el) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const up = e.code === 'ArrowUp' || e.code === 'ArrowRight', big = e.code === 'ArrowLeft' || e.code === 'ArrowRight';
      nudge(el, (up ? 1 : -1) * (big ? 10 : 1) * (e.shiftKey ? 10 : 1), true);
    }, true);
    addEventListener('dblclick', e => {
      const el = rangeOf(e.target); if (!el || editing) return;
      const d = defaultOf(el); if (d === null) return;
      e.preventDefault(); e.stopPropagation(); apply(el, d);
    }, true);
    addEventListener('click', e => {
      const o = e.target.closest && e.target.closest('output'); if (!o || o.contains(editing && editing.inp)) return;
      const el = rangeOf(o); if (!el) return;
      // a quick second click is a double-click (reset): wait it out before opening the editor
      clearTimeout(o._ctlT); if (e.detail > 1) return;
      o._ctlT = setTimeout(() => startEdit(o, el), 220);
    }, true);
  }
  return { init, apply, paint, defaultOf, setDefault(el, v){ el.dataset.def = v; } };
})();
