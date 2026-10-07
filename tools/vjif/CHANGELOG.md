# VJif changelog

Versions follow `major.minor.patch`. 1.0 comes once VJif has been played live on real hardware (GPU, MIDI controller,
recording uploaded to the platforms). Until then, minor versions add features and patch versions fix things.
The version shows in the About panel (click the logo). What still needs testing by hand is in `TESTS.md`.

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
