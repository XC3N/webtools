// ---------- how VJif is put together ----------
// Data, from the file up:
//   media    one decoded file in the set's pool (frames, timing, size); shared, never edited (pool[], decodeAnim)
//   instance a media on a pad, with that pad's own settings: timing, colour, trigger, automation (pads[i].gif, insts)
//   clip     an instance placed on a layer: position, scale, crop, its own start beat (layers[l].clips[])
//   layer    four of them, 1 Background … 4 Overlay: on/off, opacity, blend, its clips
//   scene    what the 18 pads and 4 layers hold; nine per set, the live one *is* pads[] + layers[] (scenes[] holds the rest)
//   set      the scenes, pool, effects and presets, saved in IndexedDB or exported as a .vjif ZIP
// Three clocks:
//   beats             clock.beat, from tap / internal tempo or MIDI clock; triggers, Snap, automation and transitions use it
//   performance.now() ms; frame timing, clip start times (c.startTime) and Free-timing playback; beats ↔ ms use the current BPM
//   encoder µs        MP4 recording: frame n is n / fps after the bar the take started on (sound is moved onto it)
// The loop: frame() → step() each screen refresh (on the output window's rAF while it's open): clock, pending hits,
// drawing into the master canvas, recording, then the UI.
// Source files (tools/vjif/src/, stitched into one script in this order by build.js; one shared scope, order matters):
//   core          constants, state, canvases, helpers   types      the main objects and their short names (notes only)
//   lettering     text → a one-frame GIF              pool         decoding, the GIF pool
//   colour        key / swaps / HSV (shader + worker) clock-midi   tempo, MIDI clock, MIDI learn   playback   timing, envelopes, LFOs
//   scenes        scenes, BRB, transitions setup      render       geometry, drawing, transitions  effects    screen effects (WebGL)
//   output        output window, canvas format        keyboard     keys                            ui-*       panels
//   main-loop     the frame loop, load meter          persist      IndexedDB, sets, import/export  record     MP4 / WebM recording
//   undo          undo / redo
// Shared with the other tools (common/): util (Prefs, saveFile), controls (slider / dropdown behaviour), theme.

// ---------- constants ----------
// canvas size: set by the format (landscape for screens and projectors, vertical / square / 4:5 for social video)
const APP_VERSION = '0.90.0';   // bump with each release and add it to CHANGELOG.md
let W = 1920, H = 1080;
// Render size (Settings › Interface): everything is laid out in W×H "canvas pixels" (placement, sizes, guides), but drawn
// into canvases of CW×CH real pixels, RS of that (1, 2/3 or 1/2). Smaller = fewer pixels to draw, copy and run effects on,
// for older or weaker graphics. The output window scales it up; recordings are made at the render size.
let RS = [1, 2 / 3, 0.5].includes(+Prefs.get('vjif-rscale')) ? +Prefs.get('vjif-rscale') : 1;
let CW = Math.round(W * RS), CH = Math.round(H * RS);
// your own defaults for effects, effect presets and transition presets (Settings › Defaults), used by new sets and resets
let userDef = Prefs.json('vjif-userdef', {});
let maskEd = null, maskRev = 0;                     // mask.js: the layer whose mask is being painted (null: none) · bumped by every paint stroke
// interface size (Settings › Interface): the whole page is zoomed; pointer maths divides by it
let uiZoom = (() => { const z = +Prefs.get('vjif-uizoom'); return z >= 0.7 && z <= 1.3 ? z : 1; })();
document.documentElement.style.zoom = uiZoom === 1 ? '' : uiZoom; document.documentElement.style.setProperty('--uiz', uiZoom);
const FORMATS = { '16:9': [1920, 1080, 'Landscape 16:9 — screens, projectors, YouTube'], '9:16': [1080, 1920, 'Vertical 9:16 — Reels, TikTok, Shorts, Stories'],
                  '1:1': [1080, 1080, 'Square 1:1'], '4:5': [1080, 1350, 'Portrait 4:5 — Instagram feed'] };
let format = '16:9';
let allPipCol = /^#[0-9a-f]{6}$/i.test(Prefs.get('vjif-allpip', '')) ? Prefs.get('vjif-allpip', '') : '#c8c6c0';   // effect tiles: the pips of an effect on all layers
let recCount = [0, 1, 2, 4].includes(+Prefs.get('vjif-reccount', 0)) ? +Prefs.get('vjif-reccount', 0) : 0;   // count-in: bars to wait after the next bar
let recBars = +Prefs.get('vjif-recbars') || 0;   // 0 = until stopped
let recAudio = Prefs.json('vjif-recaudio');   // { id, label } of the sound input recorded with the video, or null
// recording settings (Settings › Recording), kept per browser
const REC_CODECS = ['h264', 'hevc', 'av1', 'vp9', 'vp8'];
const WC_NAMES = { h264: 'H.264', hevc: 'HEVC', av1: 'AV1', vp9: 'VP9', vp8: 'VP8' };
let recCodec = REC_CODECS.includes(Prefs.get('vjif-reccodec', '')) ? Prefs.get('vjif-reccodec', '') : 'h264';
let recFmt = recCodec.startsWith('vp') ? 'webm' : 'mp4';   // container, follows the codec
let recFps = [24, 25, 30, 50, 60].includes(+Prefs.get('vjif-recfps', 30)) ? +Prefs.get('vjif-recfps', 30) : 30;
let recMbps = [6, 12, 20, 40].includes(+Prefs.get('vjif-recmbps', 12)) ? +Prefs.get('vjif-recmbps', 12) : 12;
let recACodec = Prefs.get('vjif-recacodec', 'aac') === 'opus' ? 'opus' : 'aac';
const MAX_DIM = 1920;          // larger frames are downscaled on decode
const MAX_FRAMES = 1500;       // per GIF
const MAX_CLIPS = 6;           // GIFs per layer; a full layer refuses more (it flashes red)
const MEM_WARN_MB = 1500;      // whole bank
// 0.90: the Global pads moved to UIO / JKL / M,. (a free column between the two groups); the Scene pads got a second bank,
// played with Shift + their key, shown with Tab (pads 24–32)
const PAD_KEYS   = ['KeyQ','KeyW','KeyE','KeyA','KeyS','KeyD','KeyZ','KeyX','KeyC','KeyU','KeyI','KeyO','KeyJ','KeyK','KeyL','KeyM','Comma','Period'];
const PAD_LABELS = ['Q','W','E','A','S','D','Z','X','C','U','I','O','J','K','L','M',',','.', 'B1','B2','B3','B4','B5','B6', '⇧Q','⇧W','⇧E','⇧A','⇧S','⇧D','⇧Z','⇧X','⇧C'];
// 0.88: pads 0–8 (QWE ASD ZXC) are the Scene pads, each scene its own, played on Midground / Foreground; pads 9–17
// (UIO JKL M,.) are the Global pads, the same GIF, settings and placement in every scene, always on Overlay (layer 4,
// which is the same in every scene too); 18–23 are Background's six slots (each scene its own): no key, nothing to
// trigger, they just play on layer 1. A GIF still lives on one layer at a time.
const N_KEYPADS = 18, BG0 = 18, N_BG = 6, BG_LAYER = 0, GLOBAL_LAYER = 3, B2 = 24;   // B2: the Scene pads' second bank, 24–32
const isGlobalPad = i => i >= 9 && i < N_KEYPADS, isBgPad = i => i >= BG0 && i < BG0 + N_BG, isScenePad = i => (i >= 0 && i < 9) || (i >= B2 && i < B2 + 9);
const SCENE_PADS = [0, 1, 2, 3, 4, 5, 6, 7, 8, ...Array.from({ length: 9 }, (_, k) => B2 + k)];
let padBank = 0;   // which Scene bank the pad grid shows (Tab flips it); both play from the keys either way
const bankPad = k => k + (padBank ? B2 : 0);   // a Scene pad slot (0–8) in the shown bank
// which layer a pad's GIF plays on (scene pads: Midground or Foreground, the edited one if it's one of them)
const padLayer = (i, want) => isGlobalPad(i) ? GLOBAL_LAYER : isBgPad(i) ? BG_LAYER : want === 1 || want === 2 ? want : 1;
const layerTakes = (li, i) => li === GLOBAL_LAYER ? isGlobalPad(i) : li === BG_LAYER ? isBgPad(i) : isScenePad(i);
const BLENDS = [['source-over','Normal'],['lighter','Add'],['screen','Screen'],['multiply','Multiply'],['difference','Difference'],['exclusion','Exclusion'],['lighten','Lighten'],['darken','Darken'],['overlay','Overlay'],
  ['destination-out','Mask: cut out'],['destination-in','Mask: keep inside']];   // masks: this layer's GIFs cut holes in the layers below it, or keep only what's under them
const MASK_BLENDS = new Set(['destination-out', 'destination-in']);
const LCOL = ['#4dff7a','#3ad1c4','#ff5bb0','#8fa8ff'];
const LNAMES = ['Background', 'Midground', 'Foreground', 'Overlay'];
// musical lengths in beats (4/4): [beats, label]
const LEN_OPTS     = [[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars'],[32,'8 bars']];
const FRAME_OPTS   = [[1/8,'1/32'],[1/6,'1/16T'],[1/4,'1/16'],[1/3,'1/8T'],[1/2,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar']];
const RESTART_OPTS = [[0,'off'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars'],[32,'8 bars']];
const BEAT_OPTS = LEN_OPTS.map(o => o[0]);
const lenLabel = b => { const o = LEN_OPTS.find(o => Math.abs(o[0] - b) < 1e-6); return o ? o[1] : b % 4 === 0 ? `${b/4} bars` : `${+b.toFixed(2)} beats`; };
// fade one-shot lengths and LFO cycles, in beats
const ENV_OPTS = [[0,'0'],[0.125,'1/32'],[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars']];
const GAP_OPTS = [[0, 'off'], [0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars'],[32,'8 bars']];   // LFO Gap: a pause after each cycle
const PER_OPTS = [[0.25,'1/16'],[0.5,'1/8'],[1,'1/4'],[2,'1/2'],[4,'1 bar'],[8,'2 bars'],[16,'4 bars'],[32,'8 bars'],[64,'16 bars']];
const optIdx = (opts, v) => opts.reduce((bi, o, i) => Math.abs(o[0] - v) < Math.abs(opts[bi][0] - v) ? i : bi, 0);
// LFO targets: [key, button, title, slider min, max, step, unit, default min, max, shape, cycle (beats)]
// Defaults are a usable starting move, not a neutral one: a gentle sway, a zoom punch on the beat, a hue cycle…
const LFO_T = [
  ['x', 'X', 'X position', -1920, 1920, 1, 'px', -100, 100, 'sine', 8],
  ['y', 'Y', 'Y position', -1080, 1080, 1, 'px', -40, 40, 'sine', 4],
  ['zoom', 'Zoom', 'Zoom', 0, 4, 0.01, '×', 1, 1.15, 'down', 1],
  ['sx', 'Width', 'Width (scale X)', 0, 4, 0.01, '×', 0.9, 1.1, 'sine', 2],
  ['sy', 'Height', 'Height (scale Y)', 0, 4, 0.01, '×', 0.9, 1.1, 'sine', 2],
  ['rot', 'Rotate', 'Rotation', -360, 360, 1, '°', -10, 10, 'sine', 8],
  ['op', 'Opac', 'Opacity', 0, 1, 0.01, '%', 0, 1, 'square', 1],
  ['h', 'Hue', 'Hue shift', -180, 180, 1, '°', -180, 180, 'up', 16],
  ['s', 'Sat', 'Saturation', 0, 3, 0.01, '×', 0, 1, 'sine', 4],
  ['v', 'Bright', 'Brightness', 0, 3, 0.01, '×', 1, 1.6, 'down', 1]];
// LFO shapes, drawn (0.89: Ramp ↓ is Ramp with Invert)
const SHAPES = [['sine', 'Sine', '<svg viewBox="0 0 20 12" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M1.0 6.0 1.5 5.2 2.0 4.5 2.5 3.8 3.0 3.1 3.5 2.6 4.0 2.1 4.5 1.8 5.0 1.6 5.5 1.5 6.0 1.6 6.5 1.8 7.0 2.1 7.5 2.6 8.0 3.1 8.5 3.7 9.0 4.5 9.5 5.2 10.0 6.0 10.5 6.8 11.0 7.5 11.5 8.2 12.0 8.9 12.5 9.4 13.0 9.9 13.5 10.2 14.0 10.4 14.5 10.5 15.0 10.4 15.5 10.2 16.0 9.9 16.5 9.4 17.0 8.9 17.5 8.2 18.0 7.5 18.5 6.8 19.0 6.0"/></svg>'], ['tri', 'Triangle', '<svg viewBox="0 0 20 12" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M1 10 10 2l9 8"/></svg>'], ['up', 'Ramp', '<svg viewBox="0 0 20 12" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M1 10 10 2v8l9-8"/></svg>'],
  ['square', 'Square', '<svg viewBox="0 0 20 12" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M1 10V2h9v8h9V2"/></svg>'], ['sh', 'Random (stepped)', '<svg viewBox="0 0 20 12" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M1 7h4V3h4v6h4V5h3v4h3"/></svg>'], ['drift', 'Drift (smooth random)', '<svg viewBox="0 0 20 12" width="20" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto"><path d="M1 7c2-4 4-4 6-1s3 4 5 1 3-5 4-3 2 3 3 3"/></svg>']];
const HANDLES = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
const KEY_MAX = 441.67;        // max RGB distance

const $ = s => document.querySelector(s);
// messages: toast() for problems (5 s), toast2() for confirmations (green, 2.5 s). Both timers live here, ahead of any
// code that could show a message while the page starts.
// the message strip: toast() for problems (stays 5 s), toast2() for confirmations (green, 2.5 s)
let toastT = 0;
function showToast(msg, ok){ const t = $('#toast'); t.classList.toggle('ok', ok); t.textContent = msg; t.style.display = 'block';
  clearTimeout(toastT); toastT = setTimeout(() => { t.style.display = 'none'; t.classList.remove('ok'); }, ok ? 2500 : 5000); }
const toast = msg => showToast(msg, false), toast2 = msg => showToast(msg, true);
// Ctrl+click (⌘+click on a Mac) deletes / resets
const isDel = e => e.ctrlKey || e.metaKey;
// the clock time (performance.now) at which `beat` fell / will fall, at the current tempo
const beatTime = beat => performance.now() - (clock.beat - beat) * 60000 / clock.bpm;
// a copy of what the output shows right now (a transition interrupted mid-way starts from it)
function stillOf(src = master){ const c = document.createElement('canvas'); c.width = CW; c.height = CH; c.getContext('2d').drawImage(src, 0, 0); return c; }
const mod = (a, n) => ((a % n) + n) % n;
// a tooltip that changes every second: the new text waits until the pointer leaves, so an open tooltip stays readable
function setTip(el, t){ el.dataset.tip = t; if (!el.matches(':hover')) el.title = t; if (!el._tip){ el._tip = 1; el.addEventListener('pointerleave', () => { el.title = el.dataset.tip; }); } }
// a small canvas for pictures that get read back (thumbnails): on the CPU, so reading it doesn't wait for the GPU
const cpuCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d', { willReadFrequently: true })]; };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// a row of buttons (segmented control): fn(button, event) for a click on one of them (not on a disabled one)
const onSeg = (el, fn) => el.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.disabled && el.contains(b)) fn(b, e); });
// innerHTML only when it differs from what was last put there (rebuilding buttons / images costs a layout)
const setHTML = (el, html) => { if (el._html !== html){ el.innerHTML = html; el._html = html; } };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// colours: '#rrggbb' ↔ [r, g, b] (the one pair used everywhere)
const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0);
const rgb2hex = c => '#' + c.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

// ---------- state ----------
const pads = PAD_LABELS.map((label, i) => ({ i, code: PAD_KEYS[i] || null, label, gif: null, loading: false, el: null, bg: isBgPad(i) }));   // (Background's slots have no key)
const newXf = () => ({ x: 0, y: 0, sx: 1, sy: 1, rot: 0, fit: 'auto', flipX: false, flipY: false, tile: false, cl: 0, ct: 0, cr: 0, cb: 0 });
let clipSeq = 0, gifSeq = 0;
// alpha = the sprite's own opacity (kept by transform Reset); env = fade one-shot state (not saved)
const newClip = p => ({ id: ++clipSeq, pad: p, startBeat: 0, startTime: 0, alpha: 1, env: null, ...newXf() });
const layers = [0,1,2,3].map(i => ({ i, on: false, opacity: 1, blend: 'source-over', clips: [], sel: null, row: null, fillOn: false, fill: '#1e2a3a', tr: 'cut' }));
let target = 0, selPad = 0, snapMode = 'off', picking = false;
const clock = { bpm: 120, beat: 0, last: performance.now(), src: 'internal', taps: [],
                midiTicks: 0, midiRunning: false, midiTickTimes: [], lastTick: 0 };

function selClip(li = target){
  const L = layers[li];
  if (L.sel === false) return null;                  // deselected on purpose (a click on nothing): stays so until something is picked
  if (L.sel && L.clips.includes(L.sel)) return L.sel;
  return L.sel = L.clips[L.clips.length - 1] || null;
}

// ---------- canvases ----------
const mkCanvas = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return c; };
const master = mkCanvas(), mctx = master.getContext('2d', { alpha: false });
const lbufs = layers.map(() => mkCanvas().getContext('2d'));   // per-layer group buffers
const pv = $('#pv'), pctx = pv.getContext('2d');                       // overlay: handles and outlines only
const pvScene = $('#pvScene'), sctx = pvScene.getContext('2d', { alpha: false });
const view = { x: 0, y: 0, w: 1, h: 1 };   // output frame inside the preview, CSS px (margin = pasteboard)
let outWin = null, outCtx = null;

// ---------- decoding (WebCodecs ImageDecoder, Chrome) ----------
function guessType(name){ const m = /\.(gif|webp|png|apng)$/i.exec(name||''); if (!m) return 'image/gif'; const e = m[1].toLowerCase(); return e === 'gif' ? 'image/gif' : e === 'webp' ? 'image/webp' : 'image/png'; }
