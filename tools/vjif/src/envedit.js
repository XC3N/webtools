// ---------- envelope graphs: one editor behind the three (an effect's envelope, GIF › Auto's, GIF › Play › Trigger's fades) ----------
// Each graph says where its points are (canvas pixels), how dragging one changes the settings, what a point goes back to on
// a double-click, and how to name it; the editor does the rest the same way everywhere (0.89): the point nearest the pointer,
// its tip on hover, its value shown beside it while hovered or dragged, pointer capture, double-click resets, the points drawn
// (the one being dragged in white). E = { on(): bool, pts(): [[k, x, y]], move(k, px, py), reset(k), tip: { k: text },
// label(k): text, redraw(), begin?(k), end?(), reach?(): max distance in canvas px, idle?(): the tip when nothing is near }
function envEditor(cv, E){
  const st = { k: null, hover: null };
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height]; };
  const nearest = (px, py) => { const max = E.reach ? E.reach() : Infinity; let b = null;
    for (const [k, x, y] of E.pts()){ const d = Math.abs(x - px) + Math.abs(y - py) * 0.3; if (d <= max && (!b || d < b.d)) b = { k, d }; } return b && b.k; };
  cv.addEventListener('pointerdown', e => { if (e.button || !E.on()) return; const [px, py] = pos(e), k = nearest(px, py); if (!k) return;
    st.k = k; if (E.begin) E.begin(k); cv.setPointerCapture(e.pointerId); E.move(k, px, py); E.redraw(); });
  cv.addEventListener('pointermove', e => { const [px, py] = pos(e);
    if (st.k){ E.move(st.k, px, py); E.redraw(); return; }
    const k = E.on() ? nearest(px, py) : null; cv.style.cursor = k ? 'grab' : '';
    const t = k ? E.tip[k] : E.on() ? 'Drag a point · double-click: its default' : (E.idle ? E.idle() : ''); if (cv.title !== t) cv.title = t;
    if (k !== st.hover){ st.hover = k; E.redraw(); } });
  cv.addEventListener('pointerleave', () => { if (st.hover){ st.hover = null; E.redraw(); } });
  const up = () => { if (!st.k) return; st.k = null; if (E.end) E.end(); E.redraw(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('dblclick', e => { if (!E.on()) return; const [px, py] = pos(e), k = nearest(px, py); if (k){ E.reset(k); E.redraw(); } });
  return {
    st,
    // the points, and the value of the one under the pointer (or being dragged) in a small box at the top, beside it
    draw(x, d){
      if (!E.on()) return; const P = E.pts(), w = cv.width;
      for (const [k, px, py] of P){ x.fillStyle = st.k === k ? '#fff' : TC.env; x.beginPath(); x.arc(px, py, 3.2 * d, 0, Math.PI * 2); x.fill(); }
      const k = st.k || st.hover, p = k && P.find(p => p[0] === k); if (!p || !E.label) return;
      const t = E.label(k); x.font = `600 ${10 * d}px ui-monospace, monospace`; const tw = x.measureText(t).width + 8 * d, tx = clamp(p[1] + 6 * d, 2 * d, w - tw - 2 * d), ty = 3 * d;
      x.fillStyle = 'rgba(0,0,0,.75)'; x.fillRect(tx, ty, tw, 13 * d); x.fillStyle = '#fff'; x.textAlign = 'left'; x.fillText(t, tx + 4 * d, ty + 10 * d);
    },
  };
}
// the same words for the same stages, wherever they are
const ENV_WORDS = {
  a: 'Attack: how long it takes to rise to full',
  d: 'Decay: how long it takes to fall to Sustain (sideways); Sustain: the level it then rests at (up / down)',
  l: 'Gate (Hit only): how long it stays at Sustain, as if the key were held',
  r: 'Release: the fade out at the end',
};
const envTip = (k, extra = '') => `${ENV_WORDS[k]}${extra} · drag · double-click: its default`;
