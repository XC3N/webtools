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
  mus.ctx = new AudioContext(); const src = mus.src = mus.ctx.createMediaElementSource(mus.el);
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
async function musPlay(){ const go = rec.wait && rec.wait.play;   // Count-in › Play (0.96): the take starts with the music
  musGraph(); try { await mus.ctx.resume(); await mus.el.play(); } catch (e) { toast("Can't play that track: " + (e.message || e.name)); }
  if (go && rec.wait && rec.wait.play) recStart(rec.wait.mime, clock.beat);   // 0.99.27: the recorder starts once the track plays (starting it first, in the same moment, made the track stutter at its start)
  musUI(); }
// Sync on play (0.91; it was the other way round, Sync starting the track): Play from the top of the track is also Sync
// (beat 1), so the song and the beat grid start together. Recording never touches the track. To record a song from its
// start: Rec, then Play (the waiting take starts on that downbeat, with the song).
function musPlayTop(){ if (mus.el.paused && mus.el.currentTime < 0.05 && $('#musSync').checked && clock.src === 'internal') resync(); return musPlay(); }
const mmss = t => isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}` : '–:––';
function musUI(){
  $('#musName').textContent = mus.name || 'no track'; $('#musPlay').disabled = $('#musStop').disabled = !mus.el.src;
  // the icon only when it changes: swapping it on every time update (4× a second) removed the icon under a click in
  // progress, so the click never reached the button (the pause button "did nothing")
  const ic = mus.el.paused ? 'play' : 'pause'; if ($('#musPlay').dataset.ic !== ic){ $('#musPlay').dataset.ic = ic; $('#musPlay').innerHTML = mus.el.paused ? MUS_IC_PLAY : MUS_IC_PAUSE; }
  $('#musPlay').classList.toggle('on', !!mus.el.src && (!mus.el.paused || mus.el.currentTime > 0));   // lit from Play until Stop (a pause keeps it lit)
  $('#musPlay').title = mus.el.src ? `${mus.el.paused ? 'Play' : 'Pause'}: ${mus.name} · ${mmss(mus.el.currentTime)} / ${mmss(mus.el.duration)}` : 'Play / pause (no track: load one with ⏏)';
  $('#musTime').textContent = mus.el.src ? `${mmss(mus.el.currentTime)} / ${mmss(mus.el.duration)}` : '';
}
['play', 'pause', 'ended', 'timeupdate', 'loadedmetadata'].forEach(ev => mus.el.addEventListener(ev, musUI));
mus.el.addEventListener('error', () => { if (mus.el.src) toast(`Can't load ${mus.name}: ${mus.url ? 'not an audio format this browser plays' : "the link isn't an audio file, or the site doesn't allow it"}`); });
const MUS_IC_PLAY = $('#musPlay').innerHTML, MUS_IC_PAUSE = '<svg viewBox="0 0 16 16" width="14" height="14" style="display:block;margin:auto"><rect x="3.5" y="3" width="3" height="10" fill="currentColor"/><rect x="9.5" y="3" width="3" height="10" fill="currentColor"/></svg>';
// the player's settings stay in this browser: loop, level, With Sync
const musOpt = Prefs.json('vjif-mus', {});
const musSave = () => Prefs.setJson('vjif-mus', { loop: mus.el.loop, vol: +$('#musVol').value, sync: $('#musSync').checked });
mus.el.loop = !!musOpt.loop; if (musOpt.vol > 0.02) $('#musVol').value = musOpt.vol;   /* a level saved at 0 (the old upright slider could get stuck there) starts at the default */ if (musOpt.sync != null) $('#musSync').checked = musOpt.sync;   // (0.99: this was inside the comment, so Sync on play didn't come back after a reload)
$('#musLoop').classList.toggle('on', mus.el.loop);
$('#musEject').addEventListener('click', () => $('#musFile').click());
$('#musStop').addEventListener('click', () => { mus.el.pause(); mus.el.currentTime = 0; musUI(); });
$('#musVolBtn').addEventListener('click', e => { e.stopPropagation(); $('#musVolPop').hidden = !$('#musVolPop').hidden; });
document.addEventListener('pointerdown', e => { if (!$('#musVolPop').hidden && !(e.target.closest && e.target.closest('.volwrap') && e.target.closest('.volwrap').contains($('#musVolPop')))) $('#musVolPop').hidden = true; });   // (a press anywhere else, other pop-up sliders included, closes it)
$('#musSync').addEventListener('change', musSave);
$('#musFile').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) musSet(f, f.name); });
$('#musUrl').addEventListener('keydown', e => { if (e.key !== 'Enter') return; const u = e.target.value.trim(); if (!u) return;
  if (/youtube\.com|youtu\.be|spotify\.com|soundcloud\.com/i.test(u)) return toast('That page can\'t be played here: open it in another tab and pick Tab audio as the sound');
  musSet(u, decodeURIComponent(u.split(/[?#]/)[0].split('/').pop() || 'link')); e.target.value = ''; });
$('#musPlay').addEventListener('click', () => mus.el.paused ? musPlayTop() : mus.el.pause());
$('#musVol').addEventListener('input', e => { if (mus.gain) mus.gain.gain.value = +e.target.value; musSave(); });
$('#musLoop').addEventListener('click', () => { mus.el.loop = !mus.el.loop; $('#musLoop').classList.toggle('on', mus.el.loop); musSave(); });
$('#setPanel').addEventListener('dragover', e => { if ([...e.dataTransfer.items].some(i => i.type.startsWith('audio/'))) e.preventDefault(); });
$('#setPanel').addEventListener('drop', e => { const f = [...e.dataTransfer.files].find(f => f.type.startsWith('audio/')); if (!f) return; e.preventDefault(); e.stopPropagation(); musSet(f, f.name); });
async function musRestore(){ try { const r = await store.get('music'); if (r) musSet(r.blob || r.url, r.name, false); } catch (e) {} }

// ---- sound capture for MP4 takes: an AudioWorklet copies every block of samples to the page (as 2 channels) ----
const CAP_WORKLET = `class Cap extends AudioWorkletProcessor {
  constructor(){ super(); this.on = true; this.n = 0; this.f0 = 0; this.l = new Float32Array(2048); this.r = new Float32Array(2048);
    this.port.onmessage = e => { if (e.data === 'stop') this.on = false; }; }
  process(inputs){
    if (!this.on) return false;
    const inp = inputs[0], L = inp && inp[0], R = inp && (inp[1] || inp[0]), m = L ? L.length : 128;
    if (this.n === 0) this.f0 = currentFrame;
    if (L){ this.l.set(L, this.n); this.r.set(R, this.n); } else { this.l.fill(0, this.n, this.n + m); this.r.fill(0, this.n, this.n + m); }
    this.n += m;
    if (this.n >= 1024){ const l = this.l.slice(0, this.n), r = this.r.slice(0, this.n); this.port.postMessage({ f: this.f0, l, r }, [l.buffer, r.buffer]); this.n = 0; }
    return true; } }
registerProcessor('vjif-cap', Cap);`;
const capCtxs = new WeakSet();
async function audioCapture(stream){
  let ctx, srcNode, own = false;
  if (stream){ ctx = new AudioContext(); own = true; srcNode = ctx.createMediaStreamSource(stream); }   // another input: its own capture context
  else { musGraph(); ctx = mus.ctx; srcNode = mus.src; }                                              // the music player: tapped where it plays
  await ctx.resume().catch(() => {});
  if (!capCtxs.has(ctx)){                            // the worklet's code from a blob: URL (a data: URL where blobs are refused, e.g. a page opened from a file)
    const u = URL.createObjectURL(new Blob([CAP_WORKLET], { type: 'text/javascript' }));
    try { await ctx.audioWorklet.addModule(u); } catch (e) { await ctx.audioWorklet.addModule('data:text/javascript;charset=utf-8,' + encodeURIComponent(CAP_WORKLET)); }
    finally { URL.revokeObjectURL(u); }
    capCtxs.add(ctx); }
  const node = new AudioWorkletNode(ctx, 'vjif-cap', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
  const mute = ctx.createGain(); mute.gain.value = 0; srcNode.connect(node); node.connect(mute); mute.connect(ctx.destination);   // (a node only runs when it leads to the speakers)
  // the context's clock → the page's clock, from when the sound is heard (what you hear lines up with the picture)
  const ot = ctx.getOutputTimestamp ? ctx.getOutputTimestamp() : null, base = ot && ot.performanceTime ? { c: ot.contextTime, p: ot.performanceTime } : { c: ctx.currentTime, p: performance.now() };
  return { ctx,
    toPerf: sec => base.p + (sec - base.c) * 1000,
    start(fn){ node.port.onmessage = e => fn(e.data.f, [e.data.l, e.data.r]); },
    release(){ try { node.port.postMessage('stop'); srcNode.disconnect(node); node.disconnect(); mute.disconnect(); } catch (e) {} if (own) ctx.close().catch(() => {}); },   // the input itself stays open
    stop(){ this.release(); if (own) stream.getTracks().forEach(t => t.stop()); } };
}

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
// Chrome may keep its voice processing on despite the request (some drivers): say so, since it rides the level (0.94)
function micCheck(st){
  const t = st.getAudioTracks()[0], S = t && t.getSettings ? t.getSettings() : {};
  const on = [S.autoGainControl && 'auto gain', S.noiseSuppression && 'noise suppression', S.echoCancellation && 'echo cancelling'].filter(Boolean);
  if (on.length) toast(`The browser kept ${on.join(', ')} on for this input: its level may move by itself`);
}
function recDropAudio(){ if (rec.win){ rec.win.getTracks().forEach(t => t.stop()); rec.win = null; } if (rec.capPre){ rec.capPre.then(c => c && c.release()); rec.capPre = null; } if (rec.audio){ rec.audio.getTracks().forEach(t => t.stop()); rec.audio = null; } }
function recCancelWait(){
  if (!rec.wait) return;
  rec.wait = null; recDropAudio(); if (rec.writer){ try { rec.writer.abort(); } catch (e) {} rec.writer = null; }   // the chosen file is dropped, not left empty
  recUI();
}
// ---- choosing the sound tab and the save folder ahead of time, so a take starts the moment you ask (on the bar) ----
const recTabLive = () => rec.tab && rec.tab.getAudioTracks().some(t => t.readyState === 'live');
async function recTabAsk(){
  rec.tabAsked = false;
  try {
    const st = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, preferCurrentTab: false, selfBrowserSurface: 'exclude', systemAudio: 'include', surfaceSwitching: 'exclude' });
    rec.tabAsked = true;
    if (!st.getAudioTracks().length){ st.getTracks().forEach(t => t.stop()); toast('That share had no sound: tick "Also share tab audio" in Chrome\'s picker'); syncRecSrc(); return; }
    st.getVideoTracks().forEach(t => t.stop());       // only the sound is used
    if (rec.tab) rec.tab.getTracks().forEach(t => t.stop());
    rec.tab = st; rec.tabName = (st.getAudioTracks()[0].label || 'a tab').replace(/^Tab audio:?\s*/i, '');
    st.getAudioTracks()[0].addEventListener('ended', () => { rec.tab = null; syncRecSrc(); });   // the tab was closed or sharing stopped
  } catch (e) { rec.tabAsked = e.name !== 'NotAllowedError'; if (e.name === 'NotAllowedError') toast('No tab shared'); else toast(`Tab audio didn't start (${e.name === 'InvalidStateError' ? 'it needs a click, not a MIDI or key trigger' : e.message || e.name})`); }
  syncRecSrc();
}
function syncRecSrc(){
  const tab = recAudio && recAudio.id === 'tab'; $('#recTabRow').hidden = !tab;
  $('#recTabName').textContent = recTabLive() ? rec.tabName : 'no tab yet: asked at Rec';
  $('#recTabPick').textContent = recTabLive() ? 'Pick another…' : 'Pick the tab…';
  $('#recDirName').textContent = rec.dir ? rec.dir.name : 'ask for each take'; $('#recDirClear').hidden = !rec.dir;
}
$('#recTabPick').addEventListener('click', recTabAsk);
$('#recDirPick').addEventListener('click', async () => {
  if (!window.showDirectoryPicker) return toast('This browser can\'t pick a folder (use Chrome or Edge)');
  try { rec.dir = await showDirectoryPicker({ id: 'vjif-rec', mode: 'readwrite' }); store.put('recdir', rec.dir); syncRecSrc(); } catch (e) {}
});
$('#recDirClear').addEventListener('click', () => { rec.dir = null; store.del('recdir'); syncRecSrc(); });
(async () => { await new Promise(r => { const t = setInterval(() => { if (store.ready){ clearInterval(t); r(); } }, 200); });   // the folder chosen last time
  try { rec.dir = await store.get('recdir') || null; } catch (e) {} syncRecSrc(); })();
// a file in the chosen folder (permission is asked again once per session, on this click)
async function recDirFile(name){
  if (!rec.dir) return null;
  try {
    if ((await rec.dir.queryPermission({ mode: 'readwrite' })) !== 'granted' && (await rec.dir.requestPermission({ mode: 'readwrite' })) !== 'granted') return null;
    const h = await rec.dir.getFileHandle(name, { create: true }); return await h.createWritable();
  } catch (e) { toast(`Couldn't write in ${rec.dir.name} (${e.message || e.name}) — asking where to save instead`); return null; }
}
async function recPrepare(){
  rec.audio = null; rec.win = null;
  if (recSrc === 'win'){                              // the whole window (0.94): Chrome asks which tab to share (this one is offered first)
    try { rec.win = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: recFps, displaySurface: 'browser' }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include', surfaceSwitching: 'exclude' }); }
    catch (e) { toast(e.name === 'NotAllowedError' ? 'No window shared: nothing recorded' : `Window capture didn't start (${e.message || e.name})`); return; }
  }
  if (recAudio && recAudio.id === 'music'){          // the music player, straight from the file
    if (!mus.el.src) toast('No track loaded (Settings › Recording › Music) — recording without sound');
    else { musGraph(); try { await mus.ctx.resume(); } catch (e) {} rec.audio = new MediaStream(mus.dest.stream.getAudioTracks().map(t => t.clone())); }
  } else if (recAudio && recAudio.id === 'tab'){     // another tab's sound: the tab picked in Settings, else Chrome asks now
    if (!recTabLive()) await recTabAsk();
    if (recTabLive()) rec.audio = new MediaStream(rec.tab.getAudioTracks().map(t => t.clone()));   // a copy per take: the picked tab stays shared
    else if (!rec.tabAsked){ recDropAudio(); return; }   // the picker was cancelled
  } else if (recAudio){                              // the chosen sound input, raw (no echo cancelling / noise gate / level riding)
    try { rec.audio = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: recAudio.id }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { toast(`Can't open the sound input (${recAudio.label || 'chosen input'}) — recording without sound`); }
    if (rec.audio) micCheck(rec.audio);
  }
  // a tab or an input gets its capture going now, while the take waits for its bar: a capture started on the bar itself
  // could stumble for its first few blocks (a hiccup at the start of the clip)
  if (rec.audio && !(recAudio && recAudio.id === 'music') && typeof AudioEncoder === 'function' && typeof AudioData === 'function') rec.capPre = audioCapture(rec.audio).catch(() => null);
  let mime = recMime(!!rec.audio);
  if (!mime && rec.audio){ recDropAudio(); toast('This browser can\'t record sound with this format — recording without sound'); mime = recMime(false); }
  if (!mime){ recDropAudio(); return toast('Recording needs MediaRecorder (use Chrome)'); }
  if (recExt(mime) !== recFmt) toast2(`This browser can't record ${recFmt.toUpperCase()} — recording ${recExt(mime).toUpperCase()} instead`);
  const ext = recExt(mime), type = ext === 'mp4' ? 'video/mp4' : 'video/webm';
  const d = new Date(), pad2 = n => String(n).padStart(2, '0');
  rec.name = `vjif-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}.${ext}`;
  rec.writer = await recDirFile(rec.name);
  if (!rec.writer && window.showSaveFilePicker){
    try { const h = await showSaveFilePicker({ suggestedName: rec.name, types: [{ description: `${ext.toUpperCase()} video`, accept: { [type]: ['.' + ext] } }] });
      rec.writer = await h.createWritable(); rec.name = h.name; }
    catch (e) { if (e.name === 'AbortError'){ recDropAudio(); return; } rec.writer = null; }
  }
  // every take starts on the next downbeat (Snap or not), so you know when it begins; with a stopped MIDI clock it waits for the clock
  if (recCount < 0 && !mus.el.src) toast('Count-in › Play waits for the music player, and no track is loaded (Settings › Recording › Music)');
  if (recCount < 0 && mus.el.src){ musGraph(); mus.ctx.resume().catch(() => {}); }   // 0.99.27: the sound path is ready before Play (building it at Play was part of the stutter)
  rec.wait = { beat: recCount < 0 ? Infinity : (Math.floor(clock.beat / 4 + 1e-9) + 1) * 4 + recCount * 4, play: recCount < 0, mime }; rec.last = clock.beat; recUI();   // + the count-in (Play: until the music starts)
}
function recStart(mime, beat = clock.beat){
  if (mime === WC_MP4) return wcStart(beat);
  rec.last = rec.lastFwd = clock.beat; rec.wait = null; rec.bytes = 0; rec.stopAt = recBars ? beat + recBars * 4 : 0;
  // this take owns its writer, chunks, name and sound input: a quick next take can't step on them while this one saves
  if (rec.capPre){ rec.capPre.then(c => c && c.release()); rec.capPre = null; }   // the browser's own recorder takes the sound itself
  const writer = rec.writer, name = rec.name, chunks = [], audio = rec.audio, win = rec.win; rec.audio = null; rec.win = null;
  let pend = Promise.resolve();
  const stream = win || master.captureStream(recFps);
  if (win) win.getVideoTracks()[0].addEventListener('ended', () => { if (rec.mr === mr) recStop(); });   // sharing stopped from Chrome's bar: the take ends
  if (audio) audio.getAudioTracks().forEach(t => stream.addTrack(t));
  const mr = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: recMbps * 1e6, audioBitsPerSecond: 256e3 });
  mr.ondataavailable = e => { if (!e.data || !e.data.size) return; rec.bytes += e.data.size;
    if (writer){ const b = e.data; pend = pend.then(() => writer.write(b)).catch(err => toast('Writing the recording failed: ' + err.message)); }
    else chunks.push(e.data); };
  mr.onstop = async () => { try {
    stream.getTracks().forEach(t => t.stop()); if (audio) audio.getTracks().forEach(t => t.stop());
    if (writer){ await pend; try { await writer.close(); toast2(`Recording saved: ${name}`); } catch (e) { toast('Saving the recording failed: ' + e.message); } if (rec.writer === writer) rec.writer = null; }
    else { const blob = new Blob(chunks, { type: mime.split(';')[0] });
      saveFile(blob, name); toast2(`Recording saved: ${name} (downloads folder)`); }
  } finally { rec.fin = 0; recUI(); } };   // (0.99.16: Finalising ends here)
  mr.start(1000); rec.mr = mr; rec.t0 = performance.now(); redraw.all = true; recUI();
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
  const writer = rec.writer, name = rec.name, audio = rec.audio, win = rec.win; rec.audio = null; rec.win = null;
  let winEl = null, ws = null;
  if (win){ winEl = document.createElement('video'); winEl.muted = true; winEl.srcObject = win; try { await winEl.play(); } catch (e) {} ws = win.getVideoTracks()[0].getSettings(); }
  const w = (win ? ws.width || winEl.videoWidth || CW : CW) & ~1, h = (win ? ws.height || winEl.videoHeight || CH : CH) & ~1;   // H.264 wants even sizes (the output: the render size; the window: its size on screen)
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
    if (!m){ if (rec.capPre){ rec.capPre.then(c => c && c.release()); rec.capPre = null; } if (audio) audio.getTracks().forEach(t => t.stop()); if (win) win.getTracks().forEach(t => t.stop()); toast('This browser can\'t record video'); return; }
    if (!writer && !m.startsWith('video/mp4')) rec.name = name.replace(/\.mp4$/, '.webm');
    toast2(`No ${WC_NAMES[recCodec]}${recCodec !== 'h264' ? ' or H.264' : ''} encoder here — recording with the browser's own recorder instead`);
    rec.audio = audio; rec.win = win; return recStart(m, beat);
  }
  // The sound is captured on the audio thread (an AudioWorklet), so nothing is lost when the page is busy drawing: the blocks
  // queue up and arrive late at worst. Each block is stamped from its sample count, so the sound is one unbroken stream.
  // The music player is tapped straight from its own audio graph; other inputs go through a capture context of their own.
  const track = audio && audio.getAudioTracks()[0];
  let acfg = null, cap = null;
  if (track && typeof AudioEncoder === 'function' && typeof AudioData === 'function'){
    const pre = rec.capPre; rec.capPre = null;
    try { cap = pre ? await pre : await audioCapture(recAudio && recAudio.id === 'music' && mus.ctx ? null : audio); } catch (e) { cap = null; }
    if (!cap) toast('Couldn\'t capture the sound — recording without sound');
    else for (const codec of recACodec === 'opus' ? ['opus', 'mp4a.40.2'] : ['mp4a.40.2', 'opus']){   // AAC is what the social sites expect; Opus in MP4 plays in browsers and VLC
      const c = { codec, sampleRate: cap.ctx.sampleRate, numberOfChannels: 2, bitrate: 192000 };
      try { if ((await AudioEncoder.isConfigSupported(c)).supported){ acfg = c; break; } } catch (e) {}
    }
    if (cap && !acfg){ toast('This browser can\'t encode sound for MP4 — recording without sound'); cap.stop(); cap = null; }
    else if (acfg && acfg.codec === 'opus' && recACodec === 'aac') toast2('No AAC encoder here: the sound is Opus, which some sites refuse');
    else if (acfg && acfg.codec !== 'opus' && recACodec === 'opus') toast2('No Opus encoder here: the sound is AAC');
  }
  const target = writer ? new Mp4Muxer.FileSystemWritableFileStreamTarget(writer) : new Mp4Muxer.ArrayBufferTarget();
  // both tracks share one time base: video frame n sits at n / fps from the bar the take started on (C.t0), and the sound
  // is moved onto that clock (below), so 'cross-track-offset' leaves the two lined up instead of zeroing each one apart
  const muxer = new Mp4Muxer.Muxer({ target, fastStart: writer ? false : 'in-memory', firstTimestampBehavior: 'cross-track-offset',
    video: { codec: vcfg.codec.startsWith('avc') ? 'avc' : vcfg.codec.startsWith('h') ? 'hevc' : vcfg.codec.startsWith('vp09') ? 'vp9' : 'av1', width: w, height: h, frameRate: fps },
    audio: acfg ? { codec: acfg.codec === 'opus' ? 'opus' : 'aac', sampleRate: acfg.sampleRate, numberOfChannels: acfg.numberOfChannels } : undefined });
  const fail = e => { toast('Recording failed: ' + (e && e.message || e)); recStop(); };
  // the clip's clock starts on the bar it was asked to start on (getting the encoders ready took a few ms), so a bar-length take is exactly that long
  const C = { venc: null, aenc: null, cap: null, audio, muxer, target, writer, name, fps, us, n: 0, t0: performance.now() - Math.max(0, clock.beat - beat) * 60000 / clock.bpm,
              win, winEl, winCv: win ? new OffscreenCanvas(w, h) : null, stopping: false, vOn: false, aHold: [], aOff: null, aNext: null, dropped: 0, warned: false };
  C.venc = new VideoEncoder({ output: (ch, meta) => { rec.bytes += ch.byteLength; muxer.addVideoChunk(ch, meta);
    if (!C.vOn){ C.vOn = true; C.aHold.forEach(a => muxer.addAudioChunkRaw(...a)); C.aHold = null; } }, error: fail });
  C.venc.configure(vcfg);
  if (acfg){
    // sound chunks arrive stamped on the video clock (µs from C.t0); any that arrive before the first video chunk wait for
    // it, so the muxer sees the video track first (its first frame is time 0)
    C.aenc = new AudioEncoder({ output: (ch, meta) => {
      const b = new Uint8Array(ch.byteLength); ch.copyTo(b); rec.bytes += b.byteLength;
      const a = [b, ch.type, ch.timestamp, ch.duration ?? 0, meta];
      if (C.vOn) muxer.addAudioChunkRaw(...a); else C.aHold.push(a); }, error: fail });
    C.aenc.configure(acfg);
    C.cap = cap; const sr = cap.ctx.sampleRate;
    cap.start((frame, planes) => {                    // frame: the block's first sample, on the capture context's clock
      if (C.stopping || C.aenc.state !== 'configured') return;
      const t = (cap.toPerf(frame / sr) - C.t0) * 1000; if (t < 0) return;   // before the bar the take starts on
      const n = planes[0].length, data = new Float32Array(n * 2); data.set(planes[0], 0); data.set(planes[1] || planes[0], n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: sr, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(t), data });
      C.aenc.encode(ad); ad.close();
    });
  } else if (audio) audio.getTracks().forEach(t => t.stop());
  rec.wc = C;
  rec.mr = { stop: () => wcStop(C) };
  if (win) win.getVideoTracks()[0].addEventListener('ended', () => { if (rec.wc === C) recStop(); });   // sharing stopped from Chrome's bar: the take ends                 // the rest of the recorder (Rec button, bars, UI) treats it like MediaRecorder
  rec.t0 = C.t0; redraw.all = true; recUI();
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
    let src = master;
    if (C.win){ if (C.winEl.readyState < 2) continue; const x = C.winCv.getContext('2d'); x.drawImage(C.winEl, 0, 0, C.winCv.width, C.winCv.height); src = C.winCv; }   // the window, scaled to the size the take started at
    const f = new VideoFrame(src, { timestamp: C.n * C.us, duration: C.us });
    C.venc.encode(f, { keyFrame: C.n % (C.fps * 2) === 0 }); f.close();   // a keyframe every 2 s
  }
}
async function wcStop(C){
  if (C.stopping) return; C.stopping = true; if (rec.wc === C) rec.wc = null; rec.fin = performance.now(); recUI();   // (0.99.16: 'Finalising' shows on the Rec button until the file is written)
  try {
    if (C.cap) C.cap.stop();
    if (C.audio) C.audio.getTracks().forEach(t => t.stop());
    if (C.win) C.win.getTracks().forEach(t => t.stop());
    await C.venc.flush(); if (C.aenc) await C.aenc.flush();
    if (!C.vOn){ C.venc.close(); if (C.aenc) C.aenc.close(); if (C.writer) await C.writer.abort().catch(() => {}); toast('The take stopped before its first frame — nothing was saved'); return; }
    C.muxer.finalize(); C.venc.close(); if (C.aenc) C.aenc.close();
    if (C.writer){ await C.writer.close(); toast2(`Recording saved: ${C.name}`); if (rec.writer === C.writer) rec.writer = null; }
    else { const blob = new Blob([C.target.buffer], { type: 'video/mp4' });
      saveFile(blob, C.name); toast2(`Recording saved: ${C.name} (downloads folder)`); }
  } catch (e) { toast('Saving the recording failed: ' + e.message); } finally { rec.fin = 0; recUI(); }
}
function recStop(){ if (!rec.mr) return; const mr = rec.mr; rec.mr = null; rec.stopAt = 0; rec.fin = performance.now(); mr.stop(); recUI(); }
function recUI(){
  const b = $('#recBtn'); $('#recLed').classList.toggle('on', !!rec.mr); $('#recLed').classList.toggle('wait', !!rec.wait);
  if (rec.mr){ const t = (performance.now() - rec.t0) / 1000, mb = rec.bytes / 1048576;
    $('#recTxt').textContent = rec.stopAt ? `${Math.max(1, Math.ceil((rec.stopAt - clock.beat) / 4))} bar${Math.ceil((rec.stopAt - clock.beat) / 4) > 1 ? 's' : ''}` : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
    b.title = `Recording to ${rec.name}${rec.writer ? '' : ' (kept in memory until you stop)'} — ${mb.toFixed(0)} MB so far · click to stop`; }
  else if (rec.fin){ const t = (performance.now() - rec.fin) / 1000; $('#recTxt').textContent = 'Save…'; b.title = `Finalising the file (${Math.floor(t)} s so far): it is saved once this ends, a long take takes a while`; $('#recLed').classList.add('wait'); }
  else { const left = rec.wait ? Math.ceil((rec.wait.beat - clock.beat) / 4 - 1e-9) : 0;
    $('#recTxt').textContent = rec.wait ? (rec.wait.play ? 'Play…' : recCount > 0 && left > 0 ? 'In ' + left : 'Wait') : 'Rec';
    b.title = rec.wait ? rec.wait.play ? 'Waiting for the music player: the take starts when you press its Play — click to cancel' : (recCount > 0 ? `Count-in: recording starts in ${left} bar${left > 1 ? 's' : ''} — click to cancel` : 'Starts recording on the next bar — click to cancel') : `Record the output to a video file (${WC_NAMES[recCodec]} ${recFmt.toUpperCase()}, ${CW}×${CH}, ${recFps} fps, ${recMbps} Mb/s — Settings › Recording). Recording starts on the next bar`; }
}
function recTick(){
  const b = clock.beat, back = b < (rec.last ?? b) - 0.5; rec.last = b;   // the beat count jumps back on Sync or a MIDI Start
  if (rec.wait){
    if (rec.wait.play) {}                                // (Play: musPlay starts it)
    else if (back){ if (recCount) rec.wait.beat = b + recCount * 4; else recStart(rec.wait.mime, b); }   // restarted on a downbeat: go now (or count in from it)
    else if (b >= rec.wait.beat - 1e-9) recStart(rec.wait.mime, rec.wait.beat);
  } else if (rec.mr && rec.stopAt){
    if (back){ rec.stopAt = b + Math.max(0, rec.stopAt - rec.lastFwd); }   // keep the length still to go
    if (clock.src === 'midi' && !clock.midiRunning) recStop();           // the DAW stopped: so does the take
    else if (b >= rec.stopAt - 1e-9) recStop();                          // fixed length: stops exactly on the bar (a clean loop)
  }
  if (!back) rec.lastFwd = b;
}
setInterval(() => { if (rec.mr || rec.wait || rec.fin) recUI(); }, 250);   // the time, the bars left, the count-in
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
async function importVjif(file){ await setsReady;
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
    bootMark('restore starts'); await store.open(); bootMark('store open');
    session.setId = ((await store.get('session')) || {}).setId || null;
    { const cur = session.setId && await store.get('set:' + session.setId); if (cur) sets.set(cur.id, cur); else session.setId = null; }   // (only the set the session started from is read now: the rest load in the background)
    bootMark('sets read'); const st = JSON.parse(await store.get('state') || 'null'); bootMark('state read');
    if (st && (st.v || 1) < 2){                       // pre-sets layout: files under 'pad:<i>'
      for (let i = 0; i < N_KEYPADS; i++){
        const rec = await store.get('pad:' + i);
        if (!rec){ st.pads[i] = null; continue; }
        const hash = await hashBlob(rec.blob);
        await store.put('gif:' + hash, rec); await store.del('pad:' + i);
        st.pads[i] = { ...(st.pads[i] || {}), hash, name: rec.name };
      }
      st.v = 2;
    }
    if (st){ $('#saveStat').textContent = 'restoring…'; const t0 = performance.now(); await applySnapshot(st, { wait: false }); bootT.restoreMs = Math.round(performance.now() - t0); }
    session.savedSig = curSet() ? contentSig(curSet().snap) : '';
  } catch (e) { toast('Saved session could not be loaded: ' + e.message); }
  finally {
    store.all('set:').then(rs => { rs.forEach(x => sets.set(x.id, x)); bootMark('all sets'); renderSets(); updSetLabel(); }).catch(() => {}).finally(() => setsDone());
    bootT.readyAt = Math.round(performance.now()); bootMark('ready'); syncLayerUI(); syncXfUI(); store.ready = true; store.last = snapshot(); musRestore();
    hist.cur = histState(); hist.ready = true;
    $('#saveStat').textContent = '';
    updSetLabel(); gcGifs();
  }
}
setInterval(autosave, 1000);

// ---- level meter for the chosen sound (Settings › Recording › Sound and Rec ▾), only while one of them is open ----
// A sound input is only opened for it once the browser already allows the microphone (no permission prompt from a meter).
const vu = { key: '', ctx: null, ownCtx: false, an: null, src: null, stream: null, buf: null, lv: 0, busy: false };   // stream: an input opened for the meter (ours to stop)
function vuStop(){
  try { if (vu.src && vu.an) vu.src.disconnect(vu.an); } catch (e) {}
  if (vu.stream) vu.stream.getTracks().forEach(t => t.stop());
  if (vu.ownCtx && vu.ctx) vu.ctx.close().catch(() => {});
  Object.assign(vu, { ctx: null, ownCtx: false, an: null, src: null, stream: null, lv: 0 });
}
async function vuStart(id){
  if (id === 'music'){ musGraph(); vu.ctx = mus.ctx; vu.src = mus.src; }   // tapped where the player plays
  else {
    let st = null;
    if (id === 'tab') st = recTabLive() ? rec.tab : null;                 // the tab picked in Settings (not ours to stop)
    else { let ok = true; try { ok = (await navigator.permissions.query({ name: 'microphone' })).state === 'granted'; } catch (e) {}
      if (ok) try { st = vu.stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id }, echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); } catch (e) {} }
    if (!st) return;
    vu.ctx = new AudioContext(); vu.ownCtx = true; vu.ctx.resume().catch(() => {}); vu.src = vu.ctx.createMediaStreamSource(st);
  }
  vu.an = vu.ctx.createAnalyser(); vu.an.fftSize = 1024; vu.buf = new Float32Array(vu.an.fftSize); vu.src.connect(vu.an);
}
setInterval(async () => {
  const open = !$('#setPanel').hidden || !$('#recPop').hidden, id = open && recAudio ? recAudio.id + (recAudio.id === 'tab' && recTabLive() ? ':live' : '') : '';
  if (id !== vu.key && !vu.busy){ vu.busy = true; vuStop(); if (id) await vuStart(id.replace(/:live$/, '')).catch(() => {}); vu.key = id; vu.busy = false; }
  let peak = 0; if (vu.an){ vu.an.getFloatTimeDomainData(vu.buf); for (let i = 0; i < vu.buf.length; i++){ const a = Math.abs(vu.buf[i]); if (a > peak) peak = a; } }
  const db = peak > 0 ? 20 * Math.log10(peak) : -99, v = Math.max(0, Math.min(1, (db + 60) / 60));   // −60 dB … 0 dB
  const was = vu.lv; vu.lv = Math.max(v, vu.lv - 0.08);   // falls back gently
  if (!vu.an && was === 0 && vu.lv === 0) return;   // (0.97: no meter running and nothing to fade: no DOM work 20 times a second)
  document.querySelectorAll('.vu').forEach(m => { m.firstChild.style.transform = `scaleX(${vu.lv})`; m.classList.toggle('hot', db > -6); m.classList.toggle('clip', db > -0.5); m.classList.toggle('dimmed', !vu.an); });
}, 50);

// ---- Rec ▾: the take's length, frame rate and quality at hand (the same settings as Settings › Recording, kept in step) ----
{
  const ROWS = [['Source', '#recSrcSeg'], ['Bars', '#recBarsSeg'], ['Count-in', '#recCountSeg'], ['Frame rate', '#recFpsSeg'], ['Mb/s', '#recMbpsSeg']];
  $('#recPopRows').innerHTML = ROWS.map(([n, q], k) => `<span class="poprow"><span>${n}</span><div class="seg" data-src="${q}">${$(q).innerHTML.replace('4 bars', '4')}</div></span>`).join('');
  const sync = () => document.querySelectorAll('#recPopRows .seg').forEach(g => { const src = $(g.dataset.src).querySelectorAll('button');
    g.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', src[i].classList.contains('on'))); });
  document.querySelectorAll('#recPopRows .seg').forEach(g => onSeg(g, b => { $(g.dataset.src).querySelectorAll('button')[[...g.children].indexOf(b)].click(); sync(); }));
  // the sound source too (the same list as Settings › Recording › Sound), with its level meter
  $('#recPopRows').insertAdjacentHTML('beforeend', '<span class="poprow"><span>Sound</span><span class="sndrow"><select id="recPopSnd" title="The sound recorded with the video (Settings › Recording › Sound)"></select><span class="vu" title="Level of the chosen sound, so you can see it\'s coming in"><i></i></span></span></span>');
  const sndSync = () => { const s = $('#recAudioSel'), p = $('#recPopSnd'); p.innerHTML = s.innerHTML; p.value = s.value; };
  $('#recPopSnd').addEventListener('change', e => { const s = $('#recAudioSel'); s.value = e.target.value; s.dispatchEvent(new Event('change')); });
  $('#recCfg').addEventListener('click', e => { e.stopPropagation(); sync(); sndSync(); $('#recPop').hidden = !$('#recPop').hidden; });
  document.addEventListener('pointerdown', e => { if (!$('#recPop').hidden && !e.target.closest('#recWrap')) $('#recPop').hidden = true; });
  $('#recPopMore').addEventListener('click', () => { $('#recPop').hidden = true; if ($('#setPanel').hidden) $('#setBtn').click(); const r = $('#recBarsSeg').closest('.row'); if (r) r.scrollIntoView({ block: 'center' }); });
}

// ---- seek bar: a thin bar under the player's buttons (click or drag to move in the track) ----
{
  const bar = document.createElement('span'); bar.id = 'musSeek'; bar.title = 'Click or drag: move in the track'; bar.innerHTML = '<i></i>'; $('#musGrp').appendChild(bar);
  const fill = bar.firstChild;
  const at = e => { const r = bar.getBoundingClientRect(), d = mus.el.duration; if (!isFinite(d) || !d) return; mus.el.currentTime = clamp((e.clientX - r.left) / r.width, 0, 1) * d; draw(); };
  const draw = () => { const d = mus.el.duration; fill.style.width = (isFinite(d) && d ? mus.el.currentTime / d * 100 : 0) + '%'; bar.classList.toggle('off', !mus.el.src); };
  bar.addEventListener('pointerdown', e => { if (!mus.el.src) return; bar.setPointerCapture(e.pointerId); bar._d = true; at(e); });
  bar.addEventListener('pointermove', e => { if (bar._d) at(e); }); ['pointerup', 'pointercancel'].forEach(t => bar.addEventListener(t, () => bar._d = false));
  ['timeupdate', 'loadedmetadata', 'emptied', 'seeked'].forEach(ev => mus.el.addEventListener(ev, draw)); draw();
}
