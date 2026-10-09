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
//   core          constants, state, canvases          lettering    text → a one-frame GIF          pool       decoding, the GIF pool
//   colour        key / swaps / HSV (shader + worker) clock-midi   tempo, MIDI clock, MIDI learn   playback   timing, envelopes, LFOs
//   scenes        scenes, BRB, transitions setup      render       geometry, drawing, transitions  effects    screen effects (WebGL)
//   output        output window, canvas format        keyboard     keys                            ui-*       panels
//   main-loop     the frame loop, load meter          persist      IndexedDB, sets, import/export  record     MP4 / WebM recording
//   undo          undo / redo

// ---------- constants ----------
// canvas size: set by the format (landscape for screens and projectors, vertical / square / 4:5 for social video)
const APP_VERSION = '0.39.1';   // bump with each release and add it to CHANGELOG.md
let W = 1920, H = 1080;
// your own defaults for effects, effect presets and transition presets (Settings › Defaults), used by new sets and resets
let userDef = (() => { try { return JSON.parse(localStorage.getItem('vjif-userdef')) || {}; } catch (e) { return {}; } })();
// interface size (Settings › Interface): the whole page is zoomed; pointer maths divides by it
let uiZoom = (() => { try { const z = +localStorage.getItem('vjif-uizoom'); return z >= 0.7 && z <= 1.3 ? z : 1; } catch (e) { return 1; } })();
document.documentElement.style.zoom = uiZoom === 1 ? '' : uiZoom; document.documentElement.style.setProperty('--uiz', uiZoom);
const FORMATS = { '16:9': [1920, 1080, 'Landscape 16:9 — screens, projectors, YouTube'], '9:16': [1080, 1920, 'Vertical 9:16 — Reels, TikTok, Shorts, Stories'],
                  '1:1': [1080, 1080, 'Square 1:1'], '4:5': [1080, 1350, 'Portrait 4:5 — Instagram feed'] };
let format = '16:9';
let recBars = (() => { try { return +localStorage.getItem('vjif-recbars') || 0; } catch (e) { return 0; } })();   // 0 = until stopped
let recAudio = (() => { try { return JSON.parse(localStorage.getItem('vjif-recaudio')) || null; } catch (e) { return null; } })();   // { id, label } of the sound input recorded with the video, or null
// recording settings (Settings › Recording), kept per browser
const recLS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const REC_CODECS = ['h264', 'hevc', 'av1', 'vp9', 'vp8'];
const WC_NAMES = { h264: 'H.264', hevc: 'HEVC', av1: 'AV1', vp9: 'VP9', vp8: 'VP8' };
let recCodec = REC_CODECS.includes(recLS('vjif-reccodec', '')) ? recLS('vjif-reccodec', '') : 'h264';
let recFmt = recCodec.startsWith('vp') ? 'webm' : 'mp4';   // container, follows the codec
let recFps = [24, 25, 30, 50, 60].includes(+recLS('vjif-recfps', 30)) ? +recLS('vjif-recfps', 30) : 30;
let recMbps = [6, 12, 20, 40].includes(+recLS('vjif-recmbps', 12)) ? +recLS('vjif-recmbps', 12) : 12;
let recACodec = recLS('vjif-recacodec', 'aac') === 'opus' ? 'opus' : 'aac';
const MAX_DIM = 1920;          // larger frames are downscaled on decode
const MAX_FRAMES = 1500;       // per GIF
const MAX_CLIPS = 6;           // GIFs per layer; a full layer refuses more (it flashes red)
const MEM_WARN_MB = 1500;      // whole bank
const PAD_KEYS   = ['KeyQ','KeyW','KeyE','KeyA','KeyS','KeyD','KeyZ','KeyX','KeyC','KeyR','KeyT','KeyY','KeyF','KeyG','KeyH','KeyV','KeyB','KeyN'];
const PAD_LABELS = ['Q','W','E','A','S','D','Z','X','C','R','T','Y','F','G','H','V','B','N'];
const BLENDS = [['source-over','Normal'],['lighter','Add'],['screen','Screen'],['multiply','Multiply'],['difference','Difference'],['exclusion','Exclusion'],['lighten','Lighten'],['darken','Darken'],['overlay','Overlay']];
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
const SHAPES = [['sine','Sine'],['tri','Tri'],['up','Ramp ↑'],['down','Ramp ↓'],['square','Square'],['pulse','Pulse'],['sh','Random'],['drift','Drift']];
const HANDLES = [[-1,-1],[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0]];
const KEY_MAX = 441.67;        // max RGB distance

const $ = s => document.querySelector(s);
// messages: toast() for problems (5 s), toast2() for confirmations (green, 2.5 s). Both timers live here, ahead of any
// code that could show a message while the page starts.
let toastT = 0, toast2T = 0;
function toast(msg){ const t = $('#toast'); t.classList.remove('ok'); clearTimeout(toast2T); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', 5000); }
function toast2(msg){ const t = $('#toast'); t.classList.add('ok'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast2T); clearTimeout(toastT); toast2T = setTimeout(() => { t.style.display = 'none'; t.classList.remove('ok'); }, 2500); }
const mod = (a, n) => ((a % n) + n) % n;
// a tooltip that changes every second: the new text waits until the pointer leaves, so an open tooltip stays readable
function setTip(el, t){ el.dataset.tip = t; if (!el.matches(':hover')) el.title = t; if (!el._tip){ el._tip = 1; el.addEventListener('pointerleave', () => { el.title = el.dataset.tip; }); } }
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hex2rgb = h => [1,3,5].map(i => parseInt(h.substr(i, 2), 16));
const rgb2hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');

// ---------- state ----------
const pads = PAD_KEYS.map((code, i) => ({ i, code, label: PAD_LABELS[i], gif: null, loading: false, el: null }));
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
  if (L.sel && L.clips.includes(L.sel)) return L.sel;
  return L.sel = L.clips[L.clips.length - 1] || null;
}

// ---------- canvases ----------
const mkCanvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const master = mkCanvas(), mctx = master.getContext('2d', { alpha: false });
const lbufs = layers.map(() => mkCanvas().getContext('2d'));   // per-layer group buffers
const pv = $('#pv'), pctx = pv.getContext('2d');                       // overlay: handles and outlines only
const pvScene = $('#pvScene'), sctx = pvScene.getContext('2d', { alpha: false });
const view = { x: 0, y: 0, w: 1, h: 1 };   // output frame inside the preview, CSS px (margin = pasteboard)
let outWin = null, outCtx = null;

// ---------- decoding (WebCodecs ImageDecoder, Chrome) ----------
function guessType(name){ const m = /\.(gif|webp|png|apng)$/i.exec(name||''); if (!m) return 'image/gif'; const e = m[1].toLowerCase(); return e === 'gif' ? 'image/gif' : e === 'webp' ? 'image/webp' : 'image/png'; }
