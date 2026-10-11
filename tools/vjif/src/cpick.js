// ---------- colour picker: VJif's own, in place of the browser's ----------
// Every <input type=color> opens this instead: Hue / Sat / Bright and R / G / B as ordinary sliders (drag, mouse wheel,
// arrow keys, double-click the number to type it) plus a hex field. It writes the input's value and fires 'input'
// while you change it and 'change' when it closes, like the browser's picker, so the inputs' own handlers do the work.
const cpk = (() => {
  const el = document.createElement('div'); el.id = 'cpk'; el.hidden = true;
  const F = [['h', 'Hue', 360, '°'], ['s', 'Sat', 100, '%'], ['v', 'Bright', 100, '%'], ['r', 'R', 255, ''], ['g', 'G', 255, ''], ['b', 'B', 255, '']];
  el.innerHTML = `<div class="cpkTop"><i class="cpkSw"></i><input class="cpkHex" type="text" maxlength="7" spellcheck="false" title="Hex colour: type it, Enter applies"></div>` +
    `<canvas class="cpkSV" width="204" height="104" title="Click or drag: saturation (across) and brightness (up)"></canvas><canvas class="cpkH" width="204" height="12" title="Click or drag: hue"></canvas>` +
    F.map(([k, n, m, u]) => `<div class="field"><label>${n}</label><input type="range" data-k="${k}" min="0" max="${m}" step="1"><output></output></div>`).join('');
  document.body.appendChild(el);
  let tgt = null, hsv = [0, 0, 0], changed = false;
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0);
  const rgb2hex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const rgb2hsv = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
    const h = !d ? 0 : mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, mx ? d / mx * 100 : 0, mx * 100]; };
  const hsv2rgb = ([h, s, v]) => { s /= 100; v /= 100; const f = n => { const k = (n + h / 60) % 6; return (v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255; }; return [f(5), f(3), f(1)]; };
  const sl = k => el.querySelector(`[data-k="${k}"]`);
  function show(rgb, keepHsv){
    if (!keepHsv) { const n = rgb2hsv(rgb); hsv = [n[1] && n[2] ? n[0] : hsv[0], n[2] ? n[1] : hsv[1], n[2]]; }   // grey / black keep the hue (and black the sat) you had
    const V = { h: hsv[0], s: hsv[1], v: hsv[2], r: rgb[0], g: rgb[1], b: rgb[2] };
    F.forEach(([k, , , u]) => { const s = sl(k); s.value = Math.round(V[k]); s.nextElementSibling.textContent = Math.round(V[k]) + u; });
    drawMaps();
    const hx = rgb2hex(rgb); el.querySelector('.cpkSw').style.background = hx; if (document.activeElement !== el.querySelector('.cpkHex')) el.querySelector('.cpkHex').value = hx;
  }
  // the colour field (saturation × brightness for the hue) and the hue strip, with a mark where the colour is
  const sv = el.querySelector('.cpkSV'), hs = el.querySelector('.cpkH'), svx = sv.getContext('2d'), hsx = hs.getContext('2d');
  function drawMaps(){
    const w = sv.width, h = sv.height; svx.fillStyle = rgb2hex(hsv2rgb([hsv[0], 100, 100])); svx.fillRect(0, 0, w, h);
    let g = svx.createLinearGradient(0, 0, w, 0); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); svx.fillStyle = g; svx.fillRect(0, 0, w, h);
    g = svx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, '#000'); svx.fillStyle = g; svx.fillRect(0, 0, w, h);
    const x = hsv[1] / 100 * w, y = (1 - hsv[2] / 100) * h; svx.lineWidth = 2; svx.strokeStyle = hsv[2] > 55 ? '#000' : '#fff'; svx.beginPath(); svx.arc(x, y, 5, 0, 7); svx.stroke();
    const hw = hs.width; g = hsx.createLinearGradient(0, 0, hw, 0); for (let k = 0; k <= 6; k++) g.addColorStop(k / 6, rgb2hex(hsv2rgb([k * 60, 100, 100]))); hsx.fillStyle = g; hsx.fillRect(0, 0, hw, hs.height);
    const hx = hsv[0] / 360 * hw; hsx.fillStyle = '#fff'; hsx.fillRect(hx - 1.5, 0, 3, hs.height); hsx.fillStyle = '#000'; hsx.fillRect(hx - 0.5, 0, 1, hs.height);
  }
  const mapDrag = (cv, fn) => { const at = e => { const r = cv.getBoundingClientRect(); fn(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1)); };
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); at(e); cv._d = true; });
    cv.addEventListener('pointermove', e => { if (cv._d) at(e); }); cv.addEventListener('pointerup', () => cv._d = false); cv.addEventListener('pointercancel', () => cv._d = false); };
  mapDrag(sv, (fx, fy) => { hsv[1] = fx * 100; hsv[2] = (1 - fy) * 100; put(hsv2rgb(hsv), true); });
  mapDrag(hs, fx => { hsv[0] = Math.min(359.9, fx * 360); put(hsv2rgb(hsv), true); });
  function put(rgb, keepHsv){
    if (!tgt) return; const hx = rgb2hex(rgb); show(rgb, keepHsv);
    if (tgt.value !== hx){ tgt.value = hx; changed = true; tgt.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  el.addEventListener('input', e => {
    const k = e.target.dataset.k; if (!k) return; const v = +e.target.value;
    if ('hsv'.includes(k)){ hsv['hsv'.indexOf(k)] = v; put(hsv2rgb(hsv), true); }
    else { const c = hex2rgb(tgt.value); c['rgb'.indexOf(k)] = v; put(c); }
  });
  const hexIn = el.querySelector('.cpkHex');
  const hexApply = () => { let t = hexIn.value.trim().replace(/^#?/, '#'); if (/^#[0-9a-f]{3}$/i.test(t)) t = '#' + [...t.slice(1)].map(c => c + c).join('');
    if (/^#[0-9a-f]{6}$/i.test(t)) put(hex2rgb(t.toLowerCase())); else hexIn.value = tgt.value; };
  hexIn.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter'){ hexApply(); hexIn.blur(); } if (e.key === 'Escape'){ hexIn.value = tgt.value; hexIn.blur(); } });
  hexIn.addEventListener('blur', hexApply);
  function open(input){
    if (tgt === input) return close();
    close(); tgt = input; changed = false; el.hidden = false; show(hex2rgb(input.value));
    const r = input.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;   // under the swatch, kept on screen
    el.style.left = clamp(r.left, 6, innerWidth - w - 6) + 'px'; el.style.top = (r.bottom + h + 6 > innerHeight ? Math.max(6, r.top - h - 6) : r.bottom + 6) + 'px';
    input.classList.add('cpkOn');
  }
  function close(){
    if (!tgt) return; const t = tgt; tgt = null; el.hidden = true; t.classList.remove('cpkOn');
    if (changed) t.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.addEventListener('click', e => {   // the browser's picker never opens: ours does
    const i = e.target.closest && e.target.closest('input[type=color]'); if (!i || i.disabled) return; e.preventDefault(); open(i); }, true);
  document.addEventListener('pointerdown', e => { if (tgt && !el.contains(e.target) && e.target !== tgt && !(e.target.closest && e.target.closest('label') && e.target.closest('label').contains(tgt))) close(); }, true);
  addEventListener('keydown', e => { if (tgt && e.key === 'Escape' && document.activeElement !== hexIn){ e.stopPropagation(); close(); } }, true);
  return { el, open, close, get target(){ return tgt; } };
})();
