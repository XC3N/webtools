// ---------- recording the output (MediaRecorder on the master canvas) ----------
// Where the browser can, the file is chosen first and written while recording (long sets don't fill memory);
// otherwise the recording is kept in memory and downloaded at the end.
// ---- music player: a track to play along and to record with the video (Settings › Recording › Music) ----
const SPECIAL_SND = ['music', 'tab'];
const mus = { el: new Audio(), name: '', url: null, ctx: null, dest: null, gain: null };
mus.el.crossOrigin = 'anonymous'; mus.el.preload = 'auto';
// file → speakers (at the listening level) and → a stream for recordings (full level)
function musGraph(){
  if (mus.ctx) return;
  mus.ctx = new AudioContext(); const src = mus.ctx.createMediaElementSource(mus.el);
  mus.gain = mus.ctx.createGain(); mus.gain.gain.value = +$('#musVol').value; mus.dest = mus.ctx.createMediaStreamDestination();
  src.connect(mus.gain); mus.gain.connect(mus.ctx.destination); src.connect(mus.dest);
}
function musSet(src, name, save = true){
  if (mus.url){ URL.revokeObjectURL(mus.url); mus.url = null; }
  mus.el.pause();
  if (src instanceof Blob){ mus.url = URL.createObjectURL(src); mus.el.src = mus.url; if (save) store.put('music', { name, blob: src }); }
  else { mus.el.src = src; if (save) store.put('music', { name, url: src }); }
  mus.name = name; musUI();
}
async function musPlay(){ musGraph(); try { await mus.ctx.resume(); await mus.el.play(); } catch (e) { toast("Can't play that track: " + (e.message || e.name)); } musUI(); }
const musSyncOn = () => recAudio && recAudio.id === 'music' && $('#musSync').checked && mus.el.src;
function musRecStart(){ if (!musSyncOn()) return; mus.el.currentTime = 0; musPlay(); }
function musRecStop(){ if (musSyncOn()){ mus.el.pause(); musUI(); } }
const mmss = t => isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '–:––';
function musUI(){
  $('#musName').textContent = mus.name || 'no track'; $('#musPlay').disabled = $('#musStop').disabled = !mus.el.src;
  $('#musPlay').innerHTML = mus.el.paused ? MUS_IC_PLAY : MUS_IC_PAUSE; $('#musPlay').classList.toggle('on', !mus.el.paused);
  $('#musPlay').title = mus.el.src ? `${mus.el.paused ? 'Play' : 'Pause'}: ${mus.name} · ${mmss(mus.el.currentTime)} / ${mmss(mus.el.duration)}` : 'Play / pause (no track: load one with ⏏)';
  $('#musTime').textContent = mus.el.src ? `${mmss(mus.el.currentTime)} / ${mmss(mus.el.duration)}` : '';
}
['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(ev => mus.el.addEventListener(ev, musUI));
mus.el.addEventListener('error', () => { if (mus.el.src) toast(`Can't load ${mus.name}: ${mus.url ? 'not an audio format this browser plays' : "the link isn't an audio file, or the site doesn't allow it"}`); });
const MUS_IC_PLAY = $('#musPlay').innerHTML, MUS_IC_PAUSE = '<svg viewBox="0 0 16 16" width="14" height="14" style="display:block;margin:auto"><rect x="3.5" y="3" width="3" height="10" fill="currentColor"/><rect x="9.5" y="3" width="3" height="10" fill="currentColor"/></svg>';
// the player's settings stay in this browser: loop, level, With Rec
const musOpt = Prefs.json('vjif-mus', {});
const musSave = () => Prefs.setJson('vjif-mus', { loop: mus.el.loop, vol: +$('#musVol').value, sync: $('#musSync').checked });
mus.el.loop = !!musOpt.loop; if (musOpt.vol > 0.02) $('#musVol').value = musOpt.vol;   // a level saved at 0 (the old upright slider could get stuck there) starts at the default if (musOpt.sync != null) $('#musSync').checked = musOpt.sync;
$('#musLoop').classList.toggle('on', mus.el.loop);
$('#musEject').addEventListener('click', () => $('#musFile').click());
$('#musStop').addEventListener('click', () => { mus.el.pause(); mus.el.currentTime = 0; musUI(); });
$('#musVolBtn').addEventListener('click', e => { e.stopPropagation(); $('#musVolPop').hidden = !$('#musVolPop').hidden; });
document.addEventListener('pointerdown', e => { if (!$('#musVolPop').hidden && !e.target.closest('.volwrap')) $('#musVolPop').hidden = true; });
$('#musSync').addEventListener('change', musSave);
$('#musFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) musSet(f, f.name); });
$('#musUrl').addEventListener('keydown', e => { if (e.key !== 'Enter') return; const u = e.target.value.trim(); if (!u) return;
  if (/youtube\.com|youtu\.be|spotify\.com|soundcloud\.com/i.test(u)) return toast('That page can\'t be played here: open it in another tab and pick Tab audio as the sound');
  musSet(u, decodeURIComponent(u.split(/[?#]/)[0].split('/').pop() || 'link')); e.target.value = ''; });
$('#musPlay').addEventListener('click', () => mus.el.paused ? musPlay() : mus.el.pause());
$('#musVol').addEventListener('input', e => { if (mus.gain) mus.gain.gain.value = +e.target.value; musSave(); });
$('#musLoop').addEventListener('click', () => { mus.el.loop = !mus.el.loop; $('#musLoop').classList.toggle('on', mus.el.loop); musSave(); });
$('#setPanel').addEventListener('dragover', e => { if ([...e.dataTransfer.items].some(i => i.type.startsWith('audio/'))) e.preventDefault(); });
$('#setPanel').addEventListener('drop', e => { const f = [...e.dataTransfer.files].find(f => f.type.startsWith('audio/')); if (!f) return; e.preventDefault(); e.stopPropagation(); musSet(f, f.name); });
async function musRestore(){ try { const r = await store.get('music'); if (r) musSet(r.blob || r.url, r.name, false); } catch (e) {} }

const rec = { mr: null, writer: null, t0: 0, wait: null, name: '', bytes: 0, starting: false };   // starting: an MP4 take is getting its encoders ready
// MP4 (H.264) uploads straight to Instagram / TikTok / YouTube; WebM (VP9) is the fallback where the browser has no H.264 encoder
const REC_MIMES = { mp4: ['video/mp4;codecs=avc1.64002A', 'video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1.4D0028', 'video/mp4;codecs=avc1'],
                    webm: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'] };
const recOk = m => window.MediaRecorder && MediaRecorder.isTypeSupported(m);
// with sound: the same containers with an audio codec (AAC or Opus in MP4, Opus in WebM)
const REC_MIMES_AV = { mp4: ['video/mp4;codecs=avc1.64002A,mp4a.40.2', 'video/mp4;codecs=avc1.640028,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1.64002A,opus', 'video/mp4;codecs=avc1,opus'],
                       webm: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus'] };
// MP4 is made with WebCodecs + mp4-muxer where the browser has them: a standard (not fragmented) MP4 at a constant
// frame rate, H.264 High + AAC by default, which Facebook / Instagram / TikTok accept. MediaRecorder's MP4 is the fallback.
const WC_MP4 = 'wc:video/mp4';
const wcOk = () => typeof VideoEncoder === 'function' && typeof Mp4Muxer === 'object';
function recMime(av = false){
  if (recFmt === 'mp4' && wcOk()) return WC_MP4;
  const M = av ? REC_MIMES_AV : REC_MIMES;
  const own = recFmt === 'webm' ? [`video/webm;codecs=${recCodec}${av ? ',opus' : ''}`] : [];   // the chosen WebM codec first
  return own.concat(M[recFmt]).find(recOk) || M[recFmt === 'mp4' ? 'webm' : 'mp4'].find(recOk) || '';
}
const recExt = mime => mime.startsWith('video/mp4') || mime === WC_MP4 ? 'mp4' : 'webm';
async function recToggle(){
  if (rec.mr) return recStop();
  if (rec.wait) return recCancelWait();              // a second click cancels a waiting start
  if (rec.busy || rec.starting) return;              // the save dialog is still open, or a take is getting ready
  rec.busy = true; try { await recPrepare(); } finally { rec.busy = false; }
}
function recDropAudio(){ if (rec.audio){ rec.audio.getTracks().forEach(t => t.stop()); rec.audio = null; } }
function recCancelWait(){
  if (!rec.wait) return;
  rec.wait = null; recDropAudio(); if (rec.writer){ try { rec.writer.abort(); } catch (e) {} rec.writer = null; }   // the chosen file is dropped, not left empty
  recUI();
}
async function recPrepare(){
  rec.audio = null;
  if (recAudio && recAudio.id === 'music'){          // the music player, straight from the file
    if (!mus.el.src) toast('No track loaded (Settings › Recording › Music) — recording without sound');
    else { musGraph(); try { await mus.ctx.resume(); } catch (e) {} rec.audio = new MediaStream(mus.dest.stream.getAudioTracks().map(t => t.clone())); }
  } else if (recAudio && recAudio.id === 'tab'){     // another tab's sound: Chrome asks which tab (its picture is captured too, then ignored)
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, preferCurrentTab: false, selfBrowserSurface: 'exclude', systemAudio: 'include', surfaceSwitching: 'include' });
      if (!st.getAudioTracks().length){ st.getTracks().forEach(t => t.stop()); toast('That share had no sound: tick "Also share tab audio" in Chrome\'s picker — recording without sound'); }
      else rec.audio = st;
    } catch (e) { if (e.name === 'NotAllowedError') return toast('Recording cancelled (no tab shared)'); toast(`Tab audio didn't start (${e.name === 'InvalidStateError' ? 'it needs a click on Rec, not a MIDI or key trigger' : e.message || e.name}) — recording without sound`); }
  } else if (recAudio){                              // the chosen sound input, raw (no echo cancelling / noise gate / level riding)
    try { rec.audio = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: recAudio.id }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { toast(`Can't open the sound input (${recAudio.label || 'chosen input'}) — recording without sound`); }
  }
  let mime = recMime(!!rec.audio);
  if (!mime && rec.audio){ recDropAudio(); toast('This browser can\'t record sound with this format — recording without sound'); mime = recMime(false); }
  if (!mime){ recDropAudio(); return toast('Recording needs MediaRecorder (use Chrome)'); }
  if (recExt(mime) !== recFmt) toast2(`This browser can't record ${recFmt.toUpperCase()} — recording ${recExt(mime).toUpperCase()} instead`);
  const ext = recExt(mime), type = ext === 'mp4' ? 'video/mp4' : 'video/webm';
  const d = new Date(), pad2 = n => String(n).padStart(2, '0');
  rec.name = `vjif-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}.${ext}`;
  rec.writer = null;
  if (window.showSaveFilePicker){
    try { const h = await showSaveFilePicker({ suggestedName: rec.name, types: [{ description: `${ext.toUpperCase()} video`, accept: { [type]: ['.' + ext] } }] });
      rec.writer = await h.createWritable(); rec.name = h.name; }
    catch (e) { if (e.name === 'AbortError'){ recDropAudio(); return; } rec.writer = null; }
  }
  // a bar-length take always starts on a bar: with a stopped MIDI clock it waits for the clock to start
  if (snapUnit() || recBars){ rec.wait = { beat: (Math.floor(clock.beat / 4 + 1e-9) + 1) * 4, mime }; rec.last = clock.beat; recUI(); }
  else recStart(mime);
}
function recStart(mime, beat = clock.beat){
  musRecStart();
  if (mime === WC_MP4) return wcStart(beat);
  rec.last = rec.lastFwd = clock.beat; rec.wait = null; rec.bytes = 0; rec.stopAt = recBars ? beat + recBars * 4 : 0;
  // this take owns its writer, chunks, name and sound input: a quick next take can't step on them while this one saves
  const writer = rec.writer, name = rec.name, chunks = [], audio = rec.audio; rec.audio = null;
  let pend = Promise.resolve();
  const stream = master.captureStream(recFps);
  if (audio) audio.getAudioTracks().forEach(t => stream.addTrack(t));
  const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: recMbps * 1e6, audioBitsPerSecond: 256e3 });
  mr.ondataavailable = e => { if (!e.data || !e.data.size) return; rec.bytes += e.data.size;
    if (writer){ const b = e.data; pend = pend.then(() => writer.write(b)).catch(err => toast('Writing the recording failed: ' + err.message)); }
    else chunks.push(e.data); };
  mr.onstop = async () => {
    stream.getTracks().forEach(t => t.stop()); if (audio) audio.getTracks().forEach(t => t.stop());
    if (writer){ await pend; try { await writer.close(); toast2(`Recording saved: ${name}`); } catch (e) { toast('Saving the recording failed: ' + e.message); } if (rec.writer === writer) rec.writer = null; }
    else { const blob = new Blob(chunks, { type: mime.split(';')[0] });
      saveFile(blob, name); toast2(`Recording saved: ${name} (downloads folder)`); }
  };
  mr.start(1000); rec.mr = mr; rec.t0 = performance.now(); redraw.all = true; recUI(); bgTickSet(true);
}
// ---- MP4 through WebCodecs: frames from the master canvas at a steady frame rate (Settings), sound from the chosen input ----
// codec strings to try, best first. Levels cover 1080p (and 1080×1920) at the chosen frame rate
const H264 = fps => fps > 30 ? ['avc1.64002A', 'avc1.4d002a', 'avc1.640028', 'avc1.4d0028'] : ['avc1.640028', 'avc1.64002A', 'avc1.4d0028', 'avc1.4d002a'];   // High / Main, level 4.0 or 4.2
const WC_CODECS = { h264: H264, hevc: () => ['hvc1.1.6.L123.B0', 'hev1.1.6.L123.B0'],   // HEVC Main, level 4.1
                    av1: fps => fps > 30 ? ['av01.0.09M.08', 'av01.0.08M.08'] : ['av01.0.08M.08', 'av01.0.09M.08'] };   // AV1 Main 8-bit, level 4.0 / 4.1
let wcCodecs = null;                                 // tests can force a codec list here
async function wcStart(beat = clock.beat){
  rec.starting = true;
  try { return await wcSetup(beat); } finally { rec.starting = false; }
}
async function wcSetup(beat){
  rec.last = rec.lastFwd = clock.beat; rec.wait = null; rec.bytes = 0; rec.stopAt = recBars ? beat + recBars * 4 : 0;
  const writer = rec.writer, name = rec.name, audio = rec.audio; rec.audio = null;
  const w = W & ~1, h = H & ~1;                      // H.264 wants even sizes
  const fps = recFps, us = 1e6 / fps;
  const tryList = async list => { for (const codec of list){
    const c = { codec, width: w, height: h, bitrate: recMbps * 1e6, framerate: fps,
      ...(codec.startsWith('avc') ? { avc: { format: 'avc' } } : codec.startsWith('h') ? { hevc: { format: 'hevc' } } : {}) };
    try { if ((await VideoEncoder.isConfigSupported(c)).supported) return c; } catch (e) {}
  } return null; };
  let vcfg = await tryList(wcCodecs || (WC_CODECS[recCodec] || H264)(fps));
  if (!vcfg && !wcCodecs && recCodec !== 'h264'){
    vcfg = await tryList(H264(fps));
    if (vcfg) toast2(`This browser can't encode ${WC_NAMES[recCodec]} — recording H.264 instead`);
  }
  if (!vcfg){                                        // no H.264 here: fall back to MediaRecorder (WebM when nothing else)
    const m = REC_MIMES_AV.mp4.concat(REC_MIMES.mp4).find(recOk) || (audio ? REC_MIMES_AV.webm : REC_MIMES.webm).find(recOk);
    if (!m){ if (audio) audio.getTracks().forEach(t => t.stop()); toast('This browser can\'t record video'); return; }
    if (!writer && !m.startsWith('video/mp4')) rec.name = name.replace(/\.mp4$/, '.webm');
    toast2(`No ${WC_NAMES[recCodec]}${recCodec !== 'h264' ? ' or H.264' : ''} encoder here — recording with the browser's own recorder instead`);
    rec.audio = audio; return recStart(m, beat);
  }
  const track = audio && audio.getAudioTracks()[0], set = track ? track.getSettings() : null;
  let acfg = null;
  if (track && typeof AudioEncoder === 'function' && typeof MediaStreamTrackProcessor === 'function'){
    for (const codec of recACodec === 'opus' ? ['opus', 'mp4a.40.2'] : ['mp4a.40.2', 'opus']){   // AAC is what the social sites expect; Opus in MP4 plays in browsers and VLC
      const c = { codec, sampleRate: set.sampleRate || 48000, numberOfChannels: Math.min(2, set.channelCount || 2), bitrate: 192000 };
      try { if ((await AudioEncoder.isConfigSupported(c)).supported){ acfg = c; break; } } catch (e) {}
    }
    if (!acfg) toast('This browser can\'t encode sound for MP4 — recording without sound');
    else if (acfg.codec === 'opus' && recACodec === 'aac') toast2('No AAC encoder here: the sound is Opus, which some sites refuse');
    else if (acfg.codec !== 'opus' && recACodec === 'opus') toast2('No Opus encoder here: the sound is AAC');
  }
  const target = writer ? new Mp4Muxer.FileSystemWritableFileStreamTarget(writer) : new Mp4Muxer.ArrayBufferTarget();
  // both tracks share one time base: video frame n sits at n / fps from the bar the take started on (C.t0), and the sound
  // is moved onto that clock (below), so 'cross-track-offset' leaves the two lined up instead of zeroing each one apart
  const muxer = new Mp4Muxer.Muxer({ target, fastStart: writer ? false : 'in-memory', firstTimestampBehavior: 'cross-track-offset',
    video: { codec: vcfg.codec.startsWith('avc') ? 'avc' : vcfg.codec.startsWith('h') ? 'hevc' : vcfg.codec.startsWith('vp09') ? 'vp9' : 'av1', width: w, height: h, frameRate: fps },
    audio: acfg ? { codec: acfg.codec === 'opus' ? 'opus' : 'aac', sampleRate: acfg.sampleRate, numberOfChannels: acfg.numberOfChannels } : undefined });
  const fail = e => { toast('Recording failed: ' + (e && e.message || e)); recStop(); };
  // the clip's clock starts on the bar it was asked to start on (getting the encoders ready took a few ms), so a bar-length take is exactly that long
  const C = { venc: null, aenc: null, reader: null, audio, muxer, target, writer, name, fps, us, n: 0, t0: performance.now() - Math.max(0, clock.beat - beat) * 60000 / clock.bpm,
              stopping: false, vOn: false, aHold: [], aOff: null, dropped: 0, warned: false };
  C.venc = new VideoEncoder({ output: (ch, meta) => { rec.bytes += ch.byteLength; muxer.addVideoChunk(ch, meta);
    if (!C.vOn){ C.vOn = true; C.aHold.forEach(a => muxer.addAudioChunkRaw(...a)); C.aHold = null; } }, error: fail });
  C.venc.configure(vcfg);
  if (acfg){
    // sound chunks are re-stamped onto the video clock; any that arrive before the first video chunk wait for it, so the
    // muxer sees the video track first (its first frame is time 0)
    C.aenc = new AudioEncoder({ output: (ch, meta) => {
      const t = ch.timestamp - C.aOff; if (t < 0) return;
      const b = new Uint8Array(ch.byteLength); ch.copyTo(b); rec.bytes += b.byteLength;
      const a = [b, ch.type, t, ch.duration ?? 0, meta];
      if (C.vOn) muxer.addAudioChunkRaw(...a); else C.aHold.push(a); }, error: fail });
    C.aenc.configure(acfg);
    C.reader = new MediaStreamTrackProcessor({ track }).readable.getReader();
    (async () => { for (;;){ const { value, done } = await C.reader.read().catch(() => ({ done: true })); if (done) break;
      if (C.aOff === null){
        // Chrome stamps captured sound on the page's own clock (µs since it opened): then it lines up exactly. If a source
        // uses another clock, the first block is placed at the moment it arrived instead.
        const ms = value.timestamp / 1000, wall = performance.now();
        C.aOff = Math.abs(ms - wall) < 2000 ? C.t0 * 1000 : value.timestamp - (wall - C.t0 - (value.duration || 0) / 1000) * 1000;
      }
      if (C.aenc.state === 'configured') C.aenc.encode(value); value.close(); } })();
  } else if (audio) audio.getTracks().forEach(t => t.stop());
  rec.wc = C;
  rec.mr = { stop: () => wcStop(C) };                 // the rest of the recorder (Rec button, bars, UI) treats it like MediaRecorder
  rec.t0 = C.t0; redraw.all = true; recUI(); bgTickSet(true);
}
// called every frame while recording: one encoded frame per frame slot of real time (a slow frame repeats the picture,
// so the clip keeps its length and stays in sync with the sound)
function wcCapture(now){
  const C = rec.wc; if (!C || C.stopping) return;
  const due = Math.floor((now - C.t0) / (1000 / C.fps));
  if (due < C.n) return;
  if (due - C.n > C.fps * 2) C.n = due;              // stalled for over 2 s (window hidden…): jump rather than flood the encoder
  for (; C.n <= due; C.n++){                         // every frame slot gets a frame, so the frame rate stays constant…
    // …unless the encoder falls behind (a software encoder at 1080p60): then frames are skipped (the picture before stays
    // up a little longer) rather than letting the queue, and the memory it holds, grow without end
    if (C.venc.encodeQueueSize > C.fps){
      C.dropped++;
      if (!C.warned && C.dropped > C.fps){ C.warned = true; toast(`The video encoder can't keep up — frames are being skipped. Try H.264, a lower frame rate or bitrate (Settings › Recording)`); }
      continue;
    }
    const f = new VideoFrame(master, { timestamp: C.n * C.us, duration: C.us });
    C.venc.encode(f, { keyFrame: C.n % (C.fps * 2) === 0 }); f.close();   // a keyframe every 2 s
  }
}
async function wcStop(C){
  if (C.stopping) return; C.stopping = true; if (rec.wc === C) rec.wc = null;
  try {
    if (C.reader) await C.reader.cancel().catch(() => {});
    if (C.audio) C.audio.getTracks().forEach(t => t.stop());
    await C.venc.flush(); if (C.aenc) await C.aenc.flush();
    if (!C.vOn){ C.venc.close(); if (C.aenc) C.aenc.close(); if (C.writer) await C.writer.abort().catch(() => {}); toast('The take stopped before its first frame — nothing was saved'); return; }
    C.muxer.finalize(); C.venc.close(); if (C.aenc) C.aenc.close();
    if (C.writer){ await C.writer.close(); toast2(`Recording saved: ${C.name}`); if (rec.writer === C.writer) rec.writer = null; }
    else { const blob = new Blob([C.target.buffer], { type: 'video/mp4' });
      saveFile(blob, C.name); toast2(`Recording saved: ${C.name} (downloads folder)`); }
  } catch (e) { toast('Saving the recording failed: ' + e.message); }
}
function recStop(){ if (!rec.mr) return; musRecStop(); bgTickSet(false); const mr = rec.mr; rec.mr = null; rec.stopAt = 0; mr.stop(); recUI(); }
function recUI(){
  const b = $('#recBtn'); $('#recLed').classList.toggle('on', !!rec.mr); $('#recLed').classList.toggle('wait', !!rec.wait);
  if (rec.mr){ const t = (performance.now() - rec.t0) / 1000, mb = rec.bytes / 1048576;
    $('#recTxt').textContent = rec.stopAt ? `${Math.max(1, Math.ceil((rec.stopAt - clock.beat) / 4))} bar${Math.ceil((rec.stopAt - clock.beat) / 4) > 1 ? 's' : ''}` : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    b.title = `Recording to ${rec.name}${rec.writer ? '' : ' (kept in memory until you stop)'} — ${mb.toFixed(0)} MB so far · click to stop`; }
  else { $('#recTxt').textContent = rec.wait ? 'Wait' : 'Rec';
    b.title = rec.wait ? 'Starts recording on the next bar — click to cancel' : `Record the output to a video file (${WC_NAMES[recCodec]} ${recFmt.toUpperCase()}, ${W}×${H}, ${recFps} fps, ${recMbps} Mb/s — Settings › Recording). With Snap on, recording starts on the next bar`; }
}
function recTick(){
  const b = clock.beat, back = b < (rec.last ?? b) - 0.5; rec.last = b;   // the beat count jumps back on Sync or a MIDI Start
  if (rec.wait){
    if (back) recStart(rec.wait.mime, b);                                // restarted on a downbeat: go now
    else if (b >= rec.wait.beat - 1e-9) recStart(rec.wait.mime, rec.wait.beat);
  } else if (rec.mr && rec.stopAt){
    if (back){ rec.stopAt = b + Math.max(0, rec.stopAt - rec.lastFwd); }   // keep the length still to go
    if (clock.src === 'midi' && !clock.midiRunning) recStop();           // the DAW stopped: so does the take
    else if (b >= rec.stopAt - 1e-9) recStop();                          // fixed length: stops exactly on the bar (a clean loop)
  }
  if (!back) rec.lastFwd = b;
}
setInterval(() => { if (rec.mr) recUI(); }, 500);
$('#recBtn').addEventListener('click', recToggle);
$('#fsBtn').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => toast('Full screen was refused by the browser')));
document.addEventListener('fullscreenchange', () => $('#fsBtn').classList.toggle('on', !!document.fullscreenElement));
$('#prepBtn').addEventListener('click', () => prep ? goLive() : startPrep());
// a .vjif set: where you choose (when the browser can ask), else to the downloads folder
async function saveSetFile(blob, filename){
  if (window.showSaveFilePicker){
    try {
      const h = await showSaveFilePicker({ suggestedName: filename, types: [{ description: 'VJif set', accept: { 'application/zip': ['.vjif'] } }] });
      const w = await h.createWritable(); await w.write(blob); await w.close(); toast2(`Exported ${h.name}`); return;
    } catch (e) { if (e.name === 'AbortError') return; }   // other errors: fall back to a download
  }
  saveFile(blob, filename);
  toast2(`Exported ${filename} (downloads folder)`);
}
async function importVjif(file){
  if (setsBusy) return;
  if (prep) return toast('Go live first (Enter): Prep keeps the output on the current set');
  try {
    const files = await readZip(file), meta = files.get('set.json');
    if (!meta) throw new Error('no set.json inside');
    const info = JSON.parse(new TextDecoder().decode(meta)), st = info.set;
    let missing = 0; const byFile = new Map(), reHash = new Map();
    // v4 files list the GIFs in `pool`; older ones on each pad
    const ents = [...(st.pool || []), st.pads || [], ...(st.scenes || []).map(sc => sc && !Array.isArray(sc) && sc.pads)].flat().filter(e => e && e.file);
    for (const sp of ents){
      if (!byFile.has(sp.file)){
        const data = files.get(sp.file);
        if (!data){ missing++; byFile.set(sp.file, null); continue; }
        const ext = (sp.file.match(/\.(\w+)$/) || [, 'gif'])[1].toLowerCase();
        const blob = new Blob([data], { type: ext === 'vjtext' ? TEXT_MIME : ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'image/gif' });
        const h = await hashBlob(blob); byFile.set(sp.file, h);
        await store.put('gif:' + h, { name: sp.name, blob });
      }
      if (byFile.get(sp.file)){ if (sp.hash) reHash.set(sp.hash, byFile.get(sp.file)); sp.hash = byFile.get(sp.file); }
      delete sp.file;
    }
    [st.pads || [], ...(st.scenes || []).map(sc => sc && !Array.isArray(sc) && sc.pads)].flat().forEach(sp => { if (sp && reHash.has(sp.hash)) sp.hash = reHash.get(sp.hash); });
    const rec = { id: newId(), name: uniqueName(info.name || file.name.replace(/\.(vjif|zip)$/i, '')), snap: JSON.stringify(st), updated: Date.now(), count: upgradeSnap(JSON.parse(JSON.stringify(st))).pool.length };
    await store.put('set:' + rec.id, rec); sets.set(rec.id, rec); renderSets();
    if (missing) toast(`Imported "${rec.name}", but ${missing} GIF file(s) were missing from the .vjif`);
    if (!dirty) await loadSet(rec.id);
    else { openSets(); toast2(`Imported "${rec.name}" — load it from the list (the current set has unsaved changes)`); }
  } catch (e) { toast(`Couldn't import ${file.name}: ${e.message}`); }
}

// ---- sets panel ----
function openSets(){ renderSets(); $('#setsPanel').hidden = false; $('#setNameIn').value = ''; }
function closeSets(){ closeAsk(); $('#setsPanel').hidden = true; document.activeElement && document.activeElement.blur && document.activeElement.blur(); }
// two-click confirm for anything destructive
// Inline confirm over `box`: a message plus explicit choices, always including Cancel. No timeout.
function ask(box, msg, actions){
  closeAsk();
  const el = document.createElement('div'); el.className = 'ask';
  el.innerHTML = `<span title="${esc(msg)}">${esc(msg)}</span>`;
  [...actions, { label: 'Cancel', fn: () => {} }].forEach(a => {
    const b = document.createElement('button'); b.textContent = a.label; if (a.cls) b.className = a.cls;
    b.addEventListener('click', e => { e.stopPropagation(); closeAsk(); a.fn(); });
    el.appendChild(b);
  });
  box.classList.add('asking'); box.appendChild(el); askBox = box;
  el.querySelector('button').focus();
}
let askBox = null;
function closeAsk(){ if (!askBox) return; askBox.classList.remove('asking'); const a = askBox.querySelector(':scope > .ask'); if (a) a.remove(); askBox = null; }
const unsavedMsg = () => curSet() ? `Unsaved changes to "${curSet().name}" will be lost.` : 'The current (unsaved) set will be lost.';
function renderSets(){
  askBox = null;
  const list = [...sets.values()].sort((a, b) => b.updated - a.updated), fmt = t => new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  $('#setList').innerHTML = list.map(r => `<div class="setRow${r.id === session.setId ? ' cur' : ''}" data-id="${r.id}">
    <div><span class="sname">${esc(r.name)}</span><span class="meta">${r.count} GIF${r.count === 1 ? '' : 's'} · ${fmt(r.updated)}${r.id === session.setId ? ' · current' + (dirty ? ', unsaved changes' : '') : ''}</span></div>
    <button data-act="load">Load</button><button data-act="rename">Rename</button><button data-act="export">Export</button><button data-act="del" class="danger">Delete</button></div>`).join('');
}
$('#setList').addEventListener('click', async e => {
  const b = e.target.closest('button'), row = e.target.closest('.setRow'); if (!b || !row) return;
  const id = row.dataset.id, rec = sets.get(id);
  if (b.dataset.act === 'load'){
    if (!dirty || !hasContent()) return loadSet(id);
    const acts = [{ label: 'Discard & load', cls: 'danger', fn: () => loadSet(id) }];
    if (curSet()) acts.unshift({ label: 'Save & load', cls: 'accent', fn: async () => { await saveSet(false); loadSet(id); } });
    ask(row, unsavedMsg(), acts);
  }
  else if (b.dataset.act === 'del') ask(row, `Delete "${rec.name}"? This can't be undone.`, [{ label: 'Delete', cls: 'danger', fn: () => deleteSet(id) }]);
  else if (b.dataset.act === 'export') exportSet(rec.name, rec.snap);
  else if (b.dataset.act === 'rename'){
    const span = row.querySelector('.sname'), inp = document.createElement('input');
    inp.type = 'text'; inp.value = rec.name; span.replaceWith(inp); inp.focus(); inp.select();
    let done = false; const fin = ok => { if (done) return; done = true; ok ? renameSet(id, inp.value) : renderSets(); };
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') fin(true); if (ev.key === 'Escape'){ ev.stopPropagation(); fin(false); } });
    inp.addEventListener('blur', () => fin(true));
  }
});
$('#setsBtn').addEventListener('click', openSets);
$('#setsClose').addEventListener('click', closeSets);
$('#setsPanel').addEventListener('pointerdown', e => { if (e.target.id === 'setsPanel') closeSets(); });
$('#saveBtn').addEventListener('click', quickSave);
$('#saveAsBtn').addEventListener('click', () => { saveSet(true, $('#setNameIn').value); $('#setNameIn').value = ''; });
$('#setNameIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('#saveAsBtn').click(); if (e.key === 'Escape') closeSets(); });
$('#exportCur').addEventListener('click', () => exportSet(curSet() ? curSet().name : 'Untitled set', snapshot()));
$('#importBtn').addEventListener('click', () => $('#importIn').click());
$('#importIn').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) importVjif(f); });
$('#newEmpty').addEventListener('click', () => {
  if (!dirty || !hasContent()) return newEmptySet();
  ask($('#setsFoot'), unsavedMsg(), [{ label: 'Discard & clear', cls: 'danger', fn: newEmptySet }]);
});

// ---- startup: reopen the working session (migrating the pre-sets storage layout) ----
async function restore(){
  try {
    await store.open();
    (await store.all('set:')).forEach(r => sets.set(r.id, r));
    session.setId = ((await store.get('session')) || {}).setId || null;
    if (!sets.has(session.setId)) session.setId = null;
    const st = JSON.parse(await store.get('state') || 'null');
    if (st && (st.v || 1) < 2){                       // pre-sets layout: files under 'pad:<i>'
      for (let i = 0; i < pads.length; i++){
        const rec = await store.get('pad:' + i);
        if (!rec){ st.pads[i] = null; continue; }
        const hash = await hashBlob(rec.blob);
        await store.put('gif:' + hash, rec); await store.del('pad:' + i);
        st.pads[i] = { ...(st.pads[i] || {}), hash, name: rec.name };
      }
      st.v = 2;
    }
    if (st){ $('#saveStat').textContent = 'restoring…'; await applySnapshot(st, { wait: false }); }
    session.savedSig = curSet() ? contentSig(curSet().snap) : '';
  } catch (e) { toast('Saved session could not be loaded: ' + e.message); }
  finally {
    syncLayerUI(); syncXfUI(); store.ready = true; store.last = snapshot(); musRestore();
    hist.cur = histState(); hist.ready = true;
    $('#saveStat').textContent = '';
    updSetLabel(); gcGifs();
  }
}
setInterval(autosave, 1000);
