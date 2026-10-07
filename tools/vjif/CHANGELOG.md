# VJif changelog

Versions follow `major.minor.patch`. 1.0 comes once VJif has been played live on real hardware (GPU, MIDI controller,
recording uploaded to the platforms). Until then, minor versions add features and patch versions fix things.
The version shows in the About panel (click the logo). What still needs testing by hand is in `TESTS.md`.

## 0.20.0 — 2026-10-07

### Recording
- Settings › Recording, its own section: video codec (H.264, HEVC or AV1 in MP4; VP9 or VP8 in WebM), length, frame rate (24, 25, 30, 50, 60 fps), quality (6–40 Mb/s) and the sound codec for MP4 (AAC or Opus), next to the sound input. Kept per browser.
- A codec the browser can't encode falls back to H.264, then to the browser's own recorder, and says so. The Rec button's tooltip shows the current settings.

## 0.19.0 — 2026-10-07

### Recording
- MP4 is now made with WebCodecs: a standard MP4 (not the fragmented kind Chrome's recorder writes), constant 30 fps, H.264 High with AAC sound. That's the format Facebook, Instagram, TikTok and YouTube expect. Bar-length takes are timed from the bar itself, so they stay exactly that long. Where the browser has no H.264 encoder, VJif falls back to its old recorder.
- Uses the MIT-licensed mp4-muxer library (common/vendor/mp4-muxer.js), built into the file.

### Colour
- Swap colours (GIF › Colour): the GIF's palette shows as swatches, most used first; click one and pick what it becomes. Up to 8 swaps per GIF, exact palette colours only, saved with the set; the key and the hue / saturation / brightness controls still work on top.

## 0.18.1 — 2026-10-07

### Fixes (review of Prep, Ctrl+click and recording)
- Prep: a GIF the output is still playing can't be removed from the pool (it used to freeze the output); loading a set, a new set, importing or changing the canvas format wait until you go live.
- Prep: the output's copy keeps the same random automation and colour-key region, and a pad held down when Prep starts is let go on the output.
- Prep: Sync restarts the output's GIFs too; a go-live waiting for the beat follows Sync.
- Going live: fade-trigger GIFs of the new scene fade in instead of staying invisible; the leaving scene keeps the output's effects while it fades out.
- Enter only starts Prep / goes live when no button, menu or field has focus.
- Ctrl+click on a Mac (which arrives as a right-click) deletes or resets on scenes, pool GIFs and transition presets too.
- Recording: each take keeps its own file and sound input, so starting the next one quickly can't cut the previous save or lose the sound; the microphone is let go on every early exit; if a format can't carry sound, it records without and says so.
- Scene tiles refresh after a GIF's colour work finishes.

## 0.18.0 — 2026-10-07

### Interface
- Full-screen button next to the settings and ? icons (F11 belongs to the effects).
- About: "Show this at start" and the button (now "Play!") sit at the lower right, the credits beside them on the left. Getting started mentions Prep.
- The logo sits centred in the header.

### Prep mode
- The tag reads "PREP · output locked to the last live scene".
- The Prep LED really blinks while it waits for the beat to go live.

### Resetting
- Ctrl+click on an effect or a transition preset puts it back to its defaults again (red outline while Ctrl is held); Ctrl+click on everything else still deletes.

### Scenes
- A scene with GIFs on its pads but nothing playing shows its first GIF fitted like a real scene thumbnail (it used to be a zoomed chip picture).

## 0.17.1 — 2026-10-07

### About
- The tagline picks one of three each time About opens: "actually, it's pronounced vjif", "Vanks Jod It's Friday", "VJing, with a hard G".

## 0.17.0 — 2026-10-07

### Prep mode
- Enter toggles Prep: Enter starts it, Enter again goes live. No more P key and no Go live button (nothing in the header moves); the Prep button's LED shows it's on, and blinks while waiting for the beat to go live.

### Deleting
- Ctrl+click (⌘+click on a Mac) deletes, instead of Shift+click: pads, scenes, effect presets, layer chips, GIFs in the pool. Holding Ctrl turns them red with a ✕. Shift is back to meaning "select / layers" only.
- Effects and transition presets are no longer reset by a modifier click (double-click a slider still resets that setting).
- Right-clicking a layer chip selects it (it used to delete it).

### Recording
- Sound: Settings › Canvas › Sound records an audio input with the video (an audio interface, or a loopback / virtual cable carrying the mix). Picked from a list the first time you allow audio input; Opus or AAC alongside the video.

### Layout
- The Frames controls (In / Out / Start) now sit under Play, next to the loop options; the Frames tab is gone.
- Dragging a GIF from the pool shows the slanted chip too.
- The logo is bigger again.

## 0.16.0 — 2026-10-06

### Prep mode
- Prep (P, or the header button): the output keeps playing the live scene exactly as it is, with its own copy of the GIFs and effects, while you work on any scene in the main window. Switch scenes, load and place GIFs, try effects: only the preview shows it.
- The live scene's tile says LIVE; the preview is framed in amber with a PREP tag.
- Go live (Enter, P or the button) sends the scene you're on out with the armed transition, on the next beat / bar with Snap.
- Blackout, freeze and recording keep acting on the output while you prep.

### Fixes
- Effect style buttons share the room when the window is narrow, so the last style (e.g. Dither) no longer disappears.

## 0.15.0 — 2026-10-06

### Output window
- Reopens where you left it: position and size are remembered. Shift+click Output resets them.
- Drag anywhere in the output to move the window; double-click switches full screen on and off.

## 0.14.2 — 2026-10-06

### Fixes and polish
- Shift held: what a click would clear turns clearly red with a ✕; what it would reset (effects, transition presets) gets a red outline, now drawn properly on the transition presets too.
- Undoing (or redoing) emptying another scene restores it in place, without switching to it.
- Dragging a scene tile or a layer chip shows the slanted chip too; a layer chip keeps its layer's colour.
- The logo is bigger.

## 0.14.1 — 2026-10-06

### Dragging
- Everything you drag rides under the pointer as a little slanted chip: pads, layer chips, effect tiles and the effect name.

## 0.14.0 — 2026-10-06

### Look
- New wordmark from Logo Lab: Russo One, chrome fill, "if" in #8f004a, tracking −0.08em, slanted −16°. In the header and the About panel (falls back to the interface font offline).

## 0.13.4 — 2026-10-06

### Pads
- Dragging a pad carries its chip under the pointer, as when dragging between layers; the pad dims while it's lifted.

## 0.13.3 — 2026-10-06

### Help
- The Alt+pad entry notes that a Chrome extension using the same Alt shortcut takes it first (fix it at chrome://extensions/shortcuts).

## 0.13.2 — 2026-10-06

### Header
- The version shows next to the logo (click it for What's new), with more room before the tempo controls.

## 0.13.1 — 2026-10-06

### Scenes
- Scene thumbnails show just the scene: no screen or layer effects, transitions, blackout or freeze.

## 0.13.0 — 2026-10-06

### Effects
- Mono has a third style, Dither: 1-bit black and white dots in an 8×8 ordered (Bayer) pattern, 2 px per dot. Amount fades it in over the picture.

## 0.12.0 — 2026-10-06

### Pads
- Drag a pad onto another to swap them (onto an empty pad: it moves). A GIF that's playing keeps playing under its new key. Undoable.
- Drag a pad onto a layer card to put its GIF on that layer (on top), or start it there if it wasn't playing.
- The press still hits the pad; once you drag, that hit is taken back, so dragging only rearranges.

## 0.11.0 — 2026-10-06

### About
- The changelog is built into VJif: About › What's new (or click the version number). After an update, VJif opens on What's new once.

## 0.10.0 — 2026-10-06

### Effects
- Release (Rel) for effects and effect presets. A Hit now plays at full for Length, then fades over Release; Hold and Latch fade out over Release when let go / switched off (was a fixed 1/32). Double-click Rel for the mode's usual value.
- Sets saved before this keep their sound: an old Hit's Length becomes its Release.

## 0.9.0 — 2026-10-06

First numbered version. Everything before it was built between 2026-10-05 and 2026-10-06; the full history is in git.

### Playing
- 18 keyboard pads: QWE ASD ZXC + RTY FGH VBN. Shift+key selects a pad without playing it. Alt+key (or Alt+click) swaps: the GIF takes its layer for itself.
- 4 layers with blend modes, opacity, on/off (Shift+1–4), a background fill and an edit layer (PgUp / PgDn, End). Layer chips: click to select, drag to move or reorder, right-click or Shift+click to remove.
- Tempo: tap (Space), type, drag or scroll the BPM, or follow MIDI clock. Snap to beat or bar, with a short grace period after the beat.
- Per GIF: timing (free / fit to a length / step), loop, ping-pong or once, restart, trigger modes and fade envelopes, colour key (magic wand), HSV, crop, flip, tile, and beat-synced automation of position, zoom, rotation, opacity and colour.
- Mouse transform in the preview: drag, stretch, zoom, rotate, Shift+handle to crop, wheel to zoom.

### Scenes and transitions
- 9 scenes on the numpad, each with its own pads and layers. Scenes can be named (right-click), swapped (drag), duplicated and emptied.
- Transition presets on 1–9: Cut, Fade (cross / dip / flash / luma), Slide, Wipe (line / iris), Zoom, Dissolve (blocks / pixelate), Glitch and Melt, with length, curve, direction and pixel size.
- A scene's tile shows a live thumbnail, or its first GIF (greyed) when the pads are loaded but nothing plays.

### Effects
- 12 screen effects on F1–F12, each with styles: Mono, Colour, Strobe, Poster, Zoom, Shake, Wobble, Mirror, Glitch, RGB, Pixel, Feedback. Hold, Hit (follows Snap) or Latch, with amount, rate and size.
- Each effect plays on the whole output or on one layer.
- 9 effect presets (Caps Lock + numpad). Fill one by dragging an effect onto it, or by holding it and clicking or pressing effects.
- Blackout (hold 0) and freeze (hold Ins).

### Output and recording
- Output window for a projector or second screen (double-click for full screen).
- Canvas formats: 16:9, 9:16 for Reels / TikTok / Shorts (with safe-zone guides in the preview), 1:1 and 4:5. Saved with the set.
- Recording: MP4 (H.264) or WebM, written to disk as it records in Chrome. Free length, or 4 / 8 / 16 / 32 bars, starting and stopping on the bar so the clip loops cleanly.

### Control
- MIDI control with learn mode (Settings › MIDI control): pads, scenes, transition presets, effects and presets, layers, layer opacity and effect amount on faders, blackout, freeze, tap and sync.
- Shift+click clears whatever is under the pointer (pads, scenes, presets, pool GIFs, layer chips); everything clearable turns red while Shift is held.
- Undo / redo across scenes (Ctrl+Z / Ctrl+Y).

### Sets and setup
- Sets saved in the browser (Ctrl+S) and exported / imported as `.vjif` files. The GIF pool keeps every GIF of the set; pads in any scene draw from it.
- Themes shared with Bad MOPHO (Settings › Theme).
- Performance panel: memory, frames per second against 60, load.
- About & getting started panel on first use; every key and mouse move under `?`.
