// common/theme.js — Bad MOPHO's theming engine, shared by the tools.
//
// A theme is seven numbers: four role hues and a background ramp —
//   hCtrl  controls & accents (buttons, sliders, highlights)      → --amber, --acc-*, --amber-dim
//   hLcd   LCD readouts                                            → --lcd-ink, --lcd-bg
//   hEnv   envelopes / curves (each tool says what that means)     → --env, --env-rgb (+ --env-f / --env-a / --env-3)
//   hMeter meters, value bars, secondary accents                   → --meter*, --meter-rgb
//   bh bs bv  background hue / saturation / brightness (HSV, %)    → --bg, --panel, --panel-2, --track, --edge, --edge-2
// Same JSON file as Bad MOPHO ({ app, kind: 'theme', theme: {...} }), so a theme exported from one tool loads in another.
//
// Theme.apply(t) sets the CSS variables on :root; Theme.mount(host, opts) builds the editor (preset, import / export,
// role hues, background); Theme.onApply(fn) is told about every change (redraw canvases, save prefs).
'use strict';
const Theme = (() => {
  function hsv2rgb(h, s, v){
    s /= 100; v /= 100; h = ((h % 360) + 360) % 360;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  const hsv2hex = (h, s, v) => '#' + hsv2rgb(h, s, v).map(n => n.toString(16).padStart(2, '0')).join('');
  // sCtrl / vCtrl and sLcd / vLcd (saturation / brightness, %) are optional: missing = Bad MOPHO's fixed ramp
  // the default theme is Matte (double-clicking a slider in the editor goes back to its Matte value)
  const DEFAULT = { hCtrl: 166, sCtrl: 39, vCtrl: 70, hLcd: 166, sLcd: 39, vLcd: 72, hEnv: 166, hMeter: 212, bh: 220, bs: 11, bv: 11 };
  const PRESETS = {
    'Matte':          { hCtrl: 166, sCtrl: 39, vCtrl: 70, hLcd: 166, sLcd: 39, vLcd: 72, hEnv: 166, hMeter: 212, bh: 220, bs: 11, bv: 11 },
    "Claude's Mopho": { hCtrl: 46, hLcd: 215, hEnv: 210, hMeter: 222, bh: 229, bs: 9, bv: 12 },
    'XC3N':           { hCtrl: 171, hLcd: 317, hEnv: 300, hMeter: 319, bh: 238, bs: 20, bv: 15 },
    'Blue Berries':   { hCtrl: 199, hLcd: 266, hEnv: 225, hMeter: 242, bh: 238, bs: 27, bv: 18 },
  };
  const CORE = ['hCtrl', 'hEnv', 'hMeter', 'bh', 'bs', 'bv'];   // hLcd is optional in older files
  let cur = { ...DEFAULT };
  const OPT = ['sCtrl', 'vCtrl', 'sLcd', 'vLcd'];
  const listeners = [];

  function apply(t = cur){
    cur = { ...DEFAULT, ...t };
    OPT.forEach(k => { if (t[k] === undefined) delete cur[k]; });   // a preset without them uses the classic ramp
    const R = document.documentElement.style, cl = n => Math.max(0, Math.min(100, n)), T = cur, set = (k, v) => R.setProperty(k, v);
    const H = T.hCtrl, cs = T.sCtrl ?? 100, cv = T.vCtrl ?? 100;   // controls / signal colour
    set('--amber', hsv2hex(H, cs, cv)); set('--acc-rgb', hsv2rgb(H, cs, cv).join(','));
    set('--acc-hi', hsv2hex(H, cs * 0.88, Math.min(100, cv * 1.08))); set('--acc-lo', hsv2hex(H, cs, cv * 0.88)); set('--acc-dk', hsv2hex(H, cs, cv * 0.7));
    set('--amber-dim', hsv2hex(H, cs, cv * 0.68));
    const sg = hsv2rgb(H, cs, cv).map(v => { v /= 255; return v <= 0.04 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    set('--sigtxt', 0.2126 * sg[0] + 0.7152 * sg[1] + 0.0722 * sg[2] > 0.3 ? '#0d1110' : '#ffffff');   // readable text on the signal colour
    const ls = T.sLcd ?? 60, lv = T.vLcd ?? 100;
    set('--lcd-ink', hsv2hex(T.hLcd, ls, lv)); set('--lcd-bg', hsv2hex(T.hLcd, Math.min(100, ls * 1.6), 6));
    const E = T.hEnv, Ef = (E + 335) % 360, E3 = (E + 25) % 360;
    set('--env', hsv2hex(E, 78, 100)); set('--env-rgb', hsv2rgb(E, 78, 100).join(','));
    set('--env-f', hsv2hex(Ef, 78, 100)); set('--env-f-rgb', hsv2rgb(Ef, 78, 100).join(','));
    set('--env-a', hsv2hex(E, 78, 100)); set('--env-a-rgb', hsv2rgb(E, 78, 100).join(','));
    set('--env-3', hsv2hex(E3, 78, 100)); set('--env-3-rgb', hsv2rgb(E3, 78, 100).join(','));
    const M = T.hMeter;
    set('--meter-hi', hsv2hex(M, 75, 90)); set('--meter-lo', hsv2hex(M, 85, 63)); set('--meter-dk', hsv2hex(M, 68, 22));
    set('--meter', hsv2hex(M, 75, 90)); set('--meter-rgb', hsv2rgb(M, 75, 90).join(','));
    set('--bg', hsv2hex(T.bh, T.bs, T.bv));
    set('--panel', hsv2hex(T.bh, T.bs, cl(T.bv + 3.5))); set('--panel-2', hsv2hex(T.bh, T.bs, cl(T.bv + 6.5)));
    set('--track', hsv2hex(T.bh, T.bs, cl(T.bv + 11)));
    set('--edge', hsv2hex(T.bh, T.bs, cl(T.bv + 10))); set('--edge-2', hsv2hex(T.bh, T.bs, cl(T.bv + 15)));
    listeners.forEach(f => f(get()));
  }
  const get = () => ({ ...cur });
  function match(t = cur){ for (const n in PRESETS){ const p = PRESETS[n]; if ([...Object.keys(p), ...OPT].every(k => t[k] === p[k])) return n; } return 'Custom'; }
  // a theme object from parsed JSON ({ theme: {...} } or bare), or null when it isn't one
  function parse(obj){
    const t = obj && obj.theme ? obj.theme : obj;
    if (!t || typeof t !== 'object' || !CORE.every(k => typeof t[k] === 'number')) return null;
    const out = {}; CORE.forEach(k => out[k] = t[k]);
    out.hLcd = typeof t.hLcd === 'number' ? t.hLcd : t.hCtrl;     // older files predate the LCD hue
    ['sCtrl', 'vCtrl', 'sLcd', 'vLcd'].forEach(k => { if (typeof t[k] === 'number') out[k] = t[k]; });
    return out;
  }
  // current value of a CSS variable (for canvas drawing)
  const color = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // the colour a role actually shows (what its swatch must match)
  const OPT_DEF = { sCtrl: 100, vCtrl: 100, sLcd: 60, vLcd: 100 };
  function roleColor(k, t = cur){
    if (k === 'hCtrl') return hsv2hex(t.hCtrl, t.sCtrl ?? 100, t.vCtrl ?? 100);
    if (k === 'hLcd') return hsv2hex(t.hLcd, t.sLcd ?? 60, t.vLcd ?? 100);
    if (k === 'hEnv') return hsv2hex(t.hEnv, 78, 100);
    if (k === 'hMeter') return hsv2hex(t.hMeter, 75, 90);
    return hsv2hex(t[k], 100, 100);
  }

  // ---- editor ----
  // opts: { app: 'vjif' (for exported files), toast(msg), onChange(theme) after each edit (save prefs here),
  //         roles: [[key, label, title, sv], …] — only the roles the tool uses; sv = also show saturation / brightness
  //         (hCtrl → sCtrl / vCtrl, hLcd → sLcd / vLcd) }
  // Slider drags are applied once per animation frame, however fast the input events come.
  function mount(host, opts = {}){
    const roles = opts.roles || [['hCtrl', 'Controls', 'Buttons, sliders, highlights'], ['hLcd', 'LCD', 'Readouts'],
                                 ['hEnv', 'Curves', 'Envelopes and curves'], ['hMeter', 'Meters', 'Meters and secondary accents']];
    const SV = { hCtrl: ['sCtrl', 'vCtrl'], hLcd: ['sLcd', 'vLcd'] };
    const say = m => opts.toast && opts.toast(m), changed = () => opts.onChange && opts.onChange(get());
    const HUE = 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)';
    host.classList.add('thm');
    host.innerHTML = `<div class="thm-prow"><select class="thm-preset" title="Theme preset">${[...Object.keys(PRESETS), 'Custom'].map(n => `<option>${n}</option>`).join('')}</select>
      <button type="button" class="thm-exp" title="Export this theme to a .json file">Export</button><button type="button" class="thm-imp" title="Import a theme .json (from any XC3N tool)">Import</button>
      <input type="file" accept=".json,application/json" hidden></div>
      <div class="thm-roles"></div>
      <div class="thm-sub">Background</div><div class="thm-bg"></div>`;
    const sliders = {}, owner = {};       // owner: s / v key → its hue key
    let next = null;
    const flush = () => { const t = next; next = null; if (t){ apply(t); sync(); } };
    const set = (key, v) => { const base = next || cur; if (!next) requestAnimationFrame(flush); next = { ...base, [key]: v }; };
    const row = (box, key, label, title, min, max, cls = '') => {
      const r = document.createElement('div'); r.className = 'thm-row' + cls; r.title = title || '';
      const def = DEFAULT[key] ?? OPT_DEF[key];
      r.innerHTML = `<label>${label}</label><input type="range" min="${min}" max="${max}" step="1" data-def="${def}"><output></output><i class="${key[0] === 'h' && key !== 'bh' ? 'thm-sw' : ''}"></i>`;
      const inp = r.querySelector('input');
      inp.addEventListener('input', () => set(key, +inp.value));
      inp.addEventListener('change', () => { flush(); changed(); });
      sliders[key] = r; box.appendChild(r);
    };
    const rb = host.querySelector('.thm-roles');
    roles.forEach(([k, l, t, sv]) => {
      const g = document.createElement('div'); g.className = 'thm-group'; rb.appendChild(g);
      row(g, k, l, t, 0, 360);
      if (sv && SV[k]){ const [s, v] = SV[k]; owner[s] = owner[v] = k;
        row(g, s, 'Saturation', `${l}: saturation`, 0, 100, ' thm-sv'); row(g, v, 'Brightness', `${l}: brightness`, 10, 100, ' thm-sv'); }
    });
    const bg = host.querySelector('.thm-bg');
    row(bg, 'bh', 'Hue', 'Background hue', 0, 360); row(bg, 'bs', 'Saturation', 'Background saturation', 0, 50); row(bg, 'bv', 'Brightness', 'Background brightness', 2, 22);
    function sync(){
      for (const k in sliders){
        const r = sliders[k], inp = r.querySelector('input'), sw = r.querySelector('.thm-sw');
        const v = cur[k] ?? OPT_DEF[k];
        inp.value = v; r.querySelector('output').textContent = v;
        let grad = HUE;
        if (k === 'bs') grad = `linear-gradient(to right,${hsv2hex(cur.bh, 0, cur.bv)},${hsv2hex(cur.bh, 50, cur.bv)})`;
        else if (k === 'bv') grad = `linear-gradient(to right,${hsv2hex(cur.bh, cur.bs, 2)},${hsv2hex(cur.bh, cur.bs, 22)})`;
        else if (owner[k]){ const h = cur[owner[k]], isS = k[0] === 's', other = isS ? cur['v' + k.slice(1)] ?? OPT_DEF['v' + k.slice(1)] : cur['s' + k.slice(1)] ?? OPT_DEF['s' + k.slice(1)];
          grad = isS ? `linear-gradient(to right,${hsv2hex(h, 0, other)},${hsv2hex(h, 100, other)})` : `linear-gradient(to right,${hsv2hex(h, other, 10)},${hsv2hex(h, other, 100)})`; }
        inp.style.background = grad;
        if (sw) sw.style.background = roleColor(k);
      }
      host.querySelector('.thm-preset').value = match();
    }
    host.querySelector('.thm-preset').addEventListener('change', e => { const p = PRESETS[e.target.value]; if (p){ apply(p); sync(); changed(); } else sync(); });
    host.querySelector('.thm-exp').addEventListener('click', () => {
      const m = match(), name = `${opts.app || 'xc3n'}-theme${m === 'Custom' ? '' : '-' + m.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: opts.app || 'xc3n', kind: 'theme', theme: get() }, null, 2)], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      say(`Theme exported: ${name}`);
    });
    const file = host.querySelector('input[type=file]');
    host.querySelector('.thm-imp').addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const f = file.files[0]; file.value = ''; if (!f) return;
      let t = null; try { t = parse(JSON.parse(await f.text())); } catch (e) {}
      if (!t) return say(`Couldn't import ${f.name}: not a theme file`);
      apply(t); sync(); changed(); say(`Theme imported: ${match()}`);
    });
    sync();
    return { sync };
  }
  return { DEFAULT, PRESETS, hsv2rgb, hsv2hex, apply, get, match, parse, color, roleColor, mount, onApply: f => listeners.push(f) };
})();
