# VJif changelog

Versions follow `major.minor.patch`. 1.0 comes once VJif has been played live on real hardware (GPU, MIDI controller,
recording uploaded to the platforms). Until then, minor versions add features and patch versions fix things.
The version shows in the About panel (click the logo). What still needs testing by hand is in `TESTS.md`.

## 0.44.0 — 2026-10-09

### Effects
- Feedback: the Rate row is now Length, how long the trails / echoes last before they fade (all three styles; 70% is the old look).

### Interface
- Beat counter: the downbeat is lit in the theme colour, the other beats white (was the other way round).

## 0.43.0 — 2026-10-09

### Performance
- Settings › Interface › Render: Full, 2/3 or 1/2. Everything is drawn at that fraction of the canvas size and scaled up, so effects and layers cost about half (2/3) or a quarter (1/2) of the work on slower machines. Recordings are made at that size.

### MIDI
- Lights on a Launchpad (Pro MK3, X, Mini MK3), in Settings › MIDI control: every mapped pad and button lights up for what it does — pads in their GIF's colour (bright while playing, blinking while waiting for the beat), the live scene white, the armed transition, effects that are on, layers in their colours, Blackout, Freeze, the beat on Tap and the downbeat on Sync. Chrome asks once for MIDI SysEx access.
- Launchpad layout: maps the 8×8 grid in one click — the 18 pads as on the keyboard, layers, Blackout, Freeze, scenes as on the numpad, F1–F12, Tap / Sync / BRB, transitions 1–9 and effect presets 1–9. Your other mappings are kept.

### Preview
- An eye button by the guides hides them all and brings them back as they were.

### Interface
- About: the credits are on the GitHub page (link).

## 0.42.1 — 2026-10-09

### Interface
- The settings gear stays lit while Settings is open.

## 0.42.0 — 2026-10-09

### Recording
- Every take starts on the next downbeat, Snap or not (Rec shows Wait until then; click again to cancel).
- Settings › Recording › Save to: choose a folder once and each take is written there under its date and time, no save dialog.
- Tab audio: Pick the tab… in Settings chooses the tab ahead of time (it stays shared), so Rec doesn't open Chrome's picker.

### Effects
- CRT › VHS: Amount is now Wear (the separate Wear control is gone), and the tape looks more analog: a softer picture with a faint edge ring, colour noise line by line, dropouts with a soft head trailing off instead of hard dashes.
- Effect editor: Hold / Hit / Latch stand beside the envelope, so Amount, Rate and Size get the whole row; their labels share one width (Amt is spelled Amount).

### Transitions
- Glitch › VHS: the picture tears up and dissolves into tape snow, and the new scene comes out of it (no more roll). Pixel is dimmed for it (it has no block size).

### Top bar
- Tempo ×2 and ÷2 (stacked next to ≈).
- The music player sits in the middle of the free space.
- MIDI learn button next to MIDI. While learning, each mapped object carries a tag with its control (N36, CC7…), a new assignment flashes there instead of a message, and pads show their dotted outline (it was hidden under the picture).
- With MIDI clock, Sync puts every GIF back in line with the DAW's bar (the bar itself belongs to the DAW).

## 0.41.1 — 2026-10-09

### Fixes
- Effect editor: each style button is as wide as its name (the row shares out the rest and wraps when needed), so Mono's Threshold isn't cut short.

## 0.41.0 — 2026-10-09

### Effects
- CRT › VHS has **Wear** (on the Rate row): how worn the tape is. Tracking bands rolling down torn hard sideways, colour bleeding to the right of shapes, white dropout dashes, the top of the picture bending, snowy switching noise along the bottom, and the odd vertical hop. At 0% it's the old VHS look.
- Mirror › Kaleido: the Amount row is now **Slices** (3–12).
- Effect tiles: a style name that doesn't fit is shortened (Threshold → Thresh → Thr.) instead of cut off.
- Envelope: dragging a point past the right edge zooms the graph out while you drag, so the point never leaves the box. Graph and sliders views are the same height (nothing below moves when you switch), and the sliders / graph icons are drawn on the pixel grid (no more blur).

### Fixes
- Music player: the level slider in the top bar ignored clicks and drags (an upright slider the app's slider styling doesn't support) and could be left at 0, so nothing was heard. It's a normal slider turned upright now, and a level saved at 0 starts at the default.
- Colour › Swap colours: × (and ∅) didn't refresh the list, so a removed swap stayed on screen.
- Effect presets: the second line of names is the same size as the first.

## 0.40.0 — 2026-10-08

### Faster (code review)
- A pad hit or a scene change no longer rebuilds the GIF, layer and Transform panels inside the frame: they're brought up to date once, right after it's drawn. A scene change also stops re-rendering a full-size picture for its tile (the live tile's last picture is reused) and redrawing all 18 pad pictures (only the ones whose GIF or colour changed).
- Pressing an effect key moves the highlight without rebuilding the style buttons or measuring all 21 tile names again.
- The effect pads, BRB countdown, MIDI clock status and tempo field keep their elements and only write when what they show changes (MIDI clock set the tempo field ~48 times a second).
- A coloured GIF (key, swaps, HSV) goes through the colour shader once per new frame, not once per screen refresh: a 10 fps GIF on a 60 Hz screen did the work 6×. (Colour automation still runs every frame.)
- Screen effects draw straight to the canvas unless Feedback or Phosphor needs the previous frame (one GPU pass and one copy fewer).
- The scene tile picture is drawn at tile size (96×54), not 1920×1080 once a second.
- Undo, autosave and the redraw check: cheap "something changed" flags in front of the full comparisons, and the per-frame checks compare values instead of building strings.

### Fixes
- Mirror › Kaleido: Amount sets the number of slices again (stuck at 2 since 0.36).
- Prep: Zoom › Each on the output used the editor's value instead of the output's own; going live, the scene leaving now keeps its own Zoom › Each too.
- Undo steps follow their scene when scenes are dragged to new numbers (no more rewriting the history on each move).
- Phosphor switched on after other effects starts its glow from that moment.

### Under the hood
- Effect styles are tested by name in the shader (constants generated from the style list), so adding a style can't shift the others. Transitions are a table (one function per type). Effect-history slots have names. The layer effects are passed to `render()` explicitly.
- Old-set conversions in one numbered list (`SNAP_STEPS`, persist.js); sets now save as step 5.
- Undo's special steps are kinds with their own undo / redo / held GIFs / name (`STEPS`, undo.js).
- Shared helpers: `Prefs` (guarded localStorage) and `saveFile` in `common/util.js`, now used by VJif, Logo Lab and Bad MOPHO; `onSeg` (button rows), `isDel` (Ctrl/⌘+click), `beatTime`, `stillOf`, one toast function.
- `src/types.js`: notes on the main objects (media, instance, clip, layer, scene, effect and transition settings) and the short names used for them.

## 0.39.1 — 2026-10-08

### Fixes
- An empty pad's GIF panel showed Speed and Loop length on top of each other.

### Under the hood
- The source is split into 20 files in `tools/vjif/src/` (core, lettering, pool, colour, clock-midi, playback, scenes, render, effects, output, keyboard, the UI panels, main-loop, persist, record, undo, and the stylesheet). `build.js` stitches them back into the same single vjif.html: the built file was byte-identical before and after the split.

## 0.39.0 — 2026-10-08

### GIFs
- Swap colours: ∅ on a swap makes that colour transparent (with Merge, its near-identical shades too). Click again to bring it back.

### Interface
- Effect pads and preset pads grow to fill the bottom panel, so the gaps between them are the same 4 px across and down.

## 0.38.0 — 2026-10-08

### Effects
- CRT › Pay-TV is now the cable-box look (sync suppressed): the picture wraps sideways in a wobbling S with the blanking bar showing inside it, the vertical hold drifts, a smeared echo, the colour decoded wrong and now and then a negative field.
- CRT › Crypt: the 0.37 version (Videocrypt cut-and-rotate + Nagravision line shuffle) as its own style.
- Effect editor: the effect's name and its layer buttons share the first row, the styles get a row of their own (wrapping onto a second line when there are many), so nothing is cut short. The bottom panel is a little taller.

## 0.37.0 — 2026-10-08

### Effects
- CRT › Pay-TV: a scrambled pay channel. Lines are shuffled within blocks (like Nagravision Syster) and each one is cut at a random point with its halves swapped (like Videocrypt), re-keyed 4 times a second; the colour drains and the blacks lift. Amount = how many lines are scrambled, Size = line height.

### About
- Credits: mp4-muxer, the fonts and their licences, the palette sources and the ideas borrowed (hover the line; the full list is in the README).

## 0.36.1 — 2026-10-08

### Fixes
- Latched effects and effect presets survive a reload (they come back on, at Sustain). Latching one doesn't mark the set as changed.

## 0.36.0 — 2026-10-08

### Pads
- Ctrl+drag a pad onto an empty pad: a copy. It shares the decoded frames (no extra memory for the picture) and gets its own settings. Ctrl+click still clears; Ctrl+Z undoes either.

### GIFs
- Swap colours › Merge: how close colours must be to count as one swatch (0 = exact, up to 48 for heavy compression noise). Existing swaps follow. Saved per GIF.
- Key: Tolerance and Softness start at 0% (exactly the picked colour).

### Effects
- Mirror: R→L and B→T, next to L→R and T→B.

## 0.35.0 — 2026-10-08

### Lettering
- The rest of Logo Lab's looks: Box (badge, split, LCD, frame), an accent part (type VJ|if: the part before or after the | takes the second colour), Slant (−20° to 20°) and UPPER. Slant and UPPER work on cut-outs too.
- Presets: Logo Lab's looks in one pick (Chrome + neon, Retro stack, Framed, Lifted badge, Neon sign, LCD, Synthwave, Split block, Drop shadow, Outline, Arcade, Gradient, Condensed italic). They set the font, look and colours; the text, size and marquee stay.

## 0.34.0 — 2026-10-08

### Transitions
- Stutter (the free slot): hard cuts back and forth between the scenes on the beat grid, landing on the new one. Ramp speeds up (1/8, then 1/16, then 1/32 notes); Even cuts every 1/16.

### Effects
- Colour › Palette follows the envelope again, as a dissolve: pixels switch to the palette in a dither pattern as it rises, and back as it releases, so a latched palette with a Release fades out without going muddy.
- Envelope: each point has its own tooltip (and each slider); the graph keeps clear of the top edge like it does of the left; the zoom only changes when the envelope outgrows it or uses under half of it, so letting go of a point no longer shifts the graph; smaller, square knobs on the sliders icon.

## 0.33.0 — 2026-10-08

### Lettering
- Logo Lab's looks for Letters, one choice per row: Fill (solid, chrome, gradient, stripes, hollow), Outline (thin, thick), Shadow (drop, long, lift), Glow (soft, neon), with a second colour for the gradient's end, the outline, the shadow and the glow. They're saved with the text and redrawn for each canvas format. A cut-out stays a plain matte.

## 0.32.0 — 2026-10-08

### Tempo and MIDI
- MIDI clock is a MIDI button in the top bar (on / off) instead of a menu that widened the bar. The clock input is chosen in Settings › MIDI (the last one used, or the only one plugged in, is picked by itself).
- While MIDI waits, "no clock" or "no input" shows where the beat dots are, and the button's light blinks; it lights up steadily once the clock runs. MIDI on with no input chosen: the settings gear flashes red and a message says so.

### BRB
- The light on BRB glows when it's on (and blinks in the last bar before a change); before, it was dark on dark.
- BRB and its ▾ are one split button.
- In order follows the numpad's reading order: 7 8 9, 4 5 6, 1 2 3.

### Layers
- On / off transition per layer is a row of buttons instead of a menu: ✕ cut, ★ the armed preset, 1–9 a fixed preset.

### Preview
- Shift while dragging a GIF: only its centre sticks, to the guides, the middle and the edges (works with Stick off too).
- Guides bar: colour, then grid and its size, then golden, safe, diagonals, perspective; Stick and Ghosts stay at the end. The on state is a quieter outline.

### Interface
- Settings › Defaults: tick which parts (effects, effect presets, transitions) Save, Reset, Export and Import work on, e.g. export only your transitions.
- Text window: Enter puts the text on the pad, Shift+Enter starts a new line (Enter confirms everywhere).
- Performance: the screen rate (FPS x / 60) is measured from a whole second and snapped to real refresh rates; it could read 360 after one short frame gap.

## 0.31.0 — 2026-10-08

### Top bar
- Music player in the top bar: play / pause, stop, loop, load (⏏) and a pop-up level slider. The track's name and time show on the play button's tooltip (and in Settings). Loop, level and With Rec are kept after a reload.
- BRB is one button in the top bar (click: on / off) with a ▾ pop-up for bars, scene order and transition. The Scenes section gets its two rows back.
- ≈ next to the tempo rounds it to the nearest whole BPM.
- On narrower windows the top bar stays on one line (labels and the version step aside, the set name shortens).

### Effects
- Colour › Palette: the Amount slider picks the palette, the Rate slider becomes Dither (ordered dots between palette colours, for in-between shades). The palette is either on or off, so it no longer goes muddy halfway.
- Mirror › Kaleido Zoom moves smoothly (1× to 6×, 0.05 steps).
- Switching an effect to Latch starts it straight at Sustain (no Attack: it wasn't a hit). Switching away from a playing effect fades it out over its Release instead of cutting it.
- Envelope: Length is now Gate (G): how long a Hit stays at Sustain, as if the key were held.
- Envelope: an Envelope heading above the graph, which takes the editor's whole width; the controls rows are a little tighter. With Attack at 0, the graph rises straight up. New icons for preview and graph / sliders.

### Preview
- Guides combine: golden ratio, grid, safe areas, diagonals and perspective (rays from the middle) can be on together.
- Safe areas: action safe (93%) and title safe (90%) in landscape and square; the Reels / TikTok / Shorts zones in 9:16. They moved here from Settings.
- Guides bar: colour swatch first, every control the same size, smaller icons, a new magnet, and an outline (not a fill) when something is on.

### GIFs
- Swap colours: colours too close to tell apart (ten slightly different blacks) are one swatch, and its swap covers all of them.

### Lettering
- A scrolling cut-out keeps only the letters as its picture and draws the rest of the matte around it, instead of a picture up to 16000 px wide. (the likely cause of horizontal bands at the end of a scroll).
- Letter spacing no longer pushes the text off centre.

### Interface
- Interface size follows the slider as you drag.
- Ctrl (⌘) held: only what's under the pointer turns red, instead of every pad, scene and chip (Ctrl+Z no longer flashes the whole screen).
- Settings: the explanations moved into tooltips on each section's heading (the ⓘ).
- "Verbose undo": the undo / redo message setting, renamed.

## 0.30.0 — 2026-10-08

### Effects
- Colour › Palette: every colour snapped to an old machine's palette: CGA 1, 2 and 3, EGA, C64, NES, Game Boy, Game Boy Pocket, Game Boy Light. The Rate slider becomes the palette picker for this style.
- Mirror › Kaleido: the Rate slider becomes Zoom (1× to 6×, into the middle of the kaleidoscope).
- Glitch › Melt has a Size (column width).
- Amount goes down to 5% (Kaleido's slice count starts at the low end of it).
- Switching an effect to Latch turns it on.
- Envelope: twice as tall, and zoomed to fit the envelope (with room to drag further), so short envelopes are easy to grab. The scale holds still while you drag.
- Envelope preview (▶ next to the graph, on by default): while you drag a point or a slider, the effect plays its envelope over and over, so you see the change.
- Envelope as sliders (≡ next to the graph): A, D, S, L, R as five sliders instead of the graph. Both choices are kept in this browser.
- Effect names in the editor have more room.

### Transitions
- On / off transition per layer: a select under each layer's opacity (cut, the armed preset, or preset 1–9), replacing the single setting in Transition.
- Glitch › VHS: much heavier tracking: two torn bands rolling down at different speeds, white dropouts, the top of the picture bending (flagging) and head-switching noise along the bottom.

### Placement
- Crop › To content: crops away the see-through border, measured over every frame.
- Undo / redo say what they changed ("Undo: W position", "Undo: Background opacity"). Settings › Interface › Undo turns the message off.

### Preview
- Guides bar: thirds and centre are now grid sizes (3×3, 2×2), a colour for the guide lines, a magnet icon for Stick, the on state in the signal colour, bigger icons. The grid numbers can be dragged up / down, scrolled or typed. The bar sits halfway between the picture and the panel below.
- Music transport over the preview while a track is loaded: play / pause, name, time.

### Pads
- The two pad sections fold away (click their heading) to give the panels below more room; a folded one shows how many GIFs it holds. Their keys keep working.

### Lettering
- Centred on the letters themselves, not the font's box, so big text sits in the middle.
- Cut-out: the black matte grows when the text is bigger than the frame, and the preview zooms out to show all of it.
- The preview is drawn small, so dragging Size is smooth.

### Interface
- Settings › Interface › Size is a slider (70% to 130%; double-click for 100%).
- Defaults: "Save current settings" and "Reset".
- The swap palette's colours are in spectrum order (greys first, dark to light).
- About says this is a preview version.
- The logo is centred in the top bar.

## 0.29.0 — 2026-10-08

### Effects
- Full envelope (ADSR) for effects and effect presets: Attack (rise to full), Decay (fall to Sustain), Sustain (the level it rests at), Length (Hit only: how long it rests; called Gate since 0.31) and Release. Edited as a small graph (Env): drag the points; the value shows next to the point; double-click one for its default. A bar on the right shows the level right now.
- Defaults sound as before (Attack 0, Decay 0, Sustain 100%).
- Rate and Size moved up next to Amount, so the envelope gets the whole bottom row.

## 0.28.2 — 2026-10-08

Last of the small code-review items; the bigger ones are on the test bench (Backlog, tagged "review").

### Under the hood
- The colour worker forgets GIFs once they're gone, and its script URL is released.
- A short overview at the top of the code: what media, instances, clips, layers, scenes and sets are, and the three clocks.
- Comments spell "colour" the way the interface does; a CSS rule put before the one that overrides it.

## 0.28.1 — 2026-10-08

Fixes from a code review, plus three of your test-bench notes.

### GIFs
- Pixel art saved blown up (every pixel an N×N block, like a 160×144 sprite exported at 1200×1056) is found on load and kept at its real pixels: same picture, N² times less memory (a 64th at ×8). The GIF info line says so. It only happens when every colour change sits on the grid, so nothing is lost.
- The pool's × now shows on every GIF. On one that's still on pads, hold it (or Ctrl+click and hold): a red bar sweeps across, then the GIF leaves the pool and every pad and layer it was on, in every scene. Letting go early says where it is.
- Loading many GIFs, or a big set, decodes three at a time instead of all at once (lower memory peaks).

### Recording
- Recording with no output window keeps going when the VJif tab is hidden (it used to freeze until you came back).
- MP4: the sound is placed on the same clock as the picture, so it lines up from the first frame.
- MP4: when the encoder can't keep up (AV1 or HEVC at 60 fps on a slow machine), frames are skipped and a message says so, instead of memory filling up.
- A second Rec press while an MP4 take is getting ready no longer starts a second take.
- Stopping a take before its first frame says nothing was saved, instead of an error.

### Interface
- Guides, Stick and Ghosts moved from the header to under the preview, centred.
- Rec help pointed to Settings › Canvas; it's Settings › Recording. The ⚙ tooltip lists everything under it.

### Under the hood
- A graphics driver reset (lost WebGL context) no longer turns the output black when effects or a Luma transition are on: the picture passes through untouched and effects come back when the context does.
- Changing the canvas format with lettering on the worker colour path no longer leaks frames.
- Dead code and stale comments removed; "centre" spelled one way in the interface.

## 0.28.0 — 2026-10-08

### Interface
- Settings › Interface › Size: 80, 90, 100 or 110%, for laptop screens (or big ones). Everything scales, pointer work included.
- Below 1280×720 a note says so and points to the Size setting (it can be hidden).
- Settings › Defaults: Save as my defaults (your effects, effect presets, transition presets and layer transition become what new sets start with and what resets go back to), VJif's defaults, Export / Import as a file.

### Effects
- Zoom › Each in / Each out: every GIF punches around its own centre instead of the frame's.
- Mirror › Kaleido: Amount sets how many slices (3 to 12) instead of fading it.
- Size for more effects: Mono › Dither (dot size), Glitch › Slices / Blocks / Scramble (slice height, block size), CRT › Scanlines (line spacing). It's next to Rate when the effect has both; dimmed for styles that don't use it.
- Colour: Flip comes first and is the default (then Invert, Cycle).
- Poster is now called Posterize.
- Switching a Latch effect off no longer moves the effect editor to it.

### Scenes
- Scene tiles keep their pictures after a reload (saved with the set; the live one is refreshed every 20 seconds).

## 0.27.0 — 2026-10-08

### Effects
- F10 is now CRT (was RGB), with five styles: Split, VHS, Scanlines (dark lines and an RGB aperture grille), Phosphor (bright parts glow and linger) and Degauss (the picture ripples through rainbow blotches; best as a Hit with a long Release).
- Effect pads have three lines: key + mode, name, style. When a name doesn't fit it uses a short one (MN, CLR, STRB, PSTR, ZM, SHK, WBL, MIR, GLT, CRT, PIX, FDBK); presets spread their effects over two lines, short names when needed.

### GIFs
- Play › Resolution: keep a GIF's frames at full, ½ or ¼ resolution. It looks the same size; ½ uses a quarter of the memory, ¼ a sixteenth. Applies wherever the GIF is used, and is saved with the set.

### Smaller screens
- Buttons in a row never disappear any more when there's no room: their text shortens with "…" (hover shows the whole thing). Transition styles go on two rows when there are five.
- Readouts and tags too narrow for their text show it all on hover.
- The side panels show a shadow at the top / bottom edge while there's more to scroll to.
- Transform: "Link" and "From centre" sit on a "Scale" row.

## 0.26.0 — 2026-10-07

### Preview
- Guides moved to the header as icons: thirds, golden ratio, centre and a grid with its own columns × rows (1–24 each; scroll over a number to change it). Click an active one to hide the guides. Stick (magnet) and Ghosts are next to them.
- Drag a pad onto the preview: its GIF goes on the edit layer, centred where you drop it.

### Transform
- Link X / Y: Scale X and Y move together, on the sliders and the side handles.
- From centre: the preview handles scale around the centre (Alt does the opposite).

### Transitions
- Glitch › VHS: a tape switching channels — tracking wobble, a noisy band rolling down, colour bleed, scanlines, and the picture rolls over to the new scene.
- Layers on / off can play a transition (Transition › Layers): cut, the armed preset, or always one preset. Saved with the set.

### Colour swap
- One list, no separate editor: each swap is "colour → colour" with both swatches alike; click the right one to change it. Clicking a colour that isn't swapped yet adds a waiting row at the end whose right swatch pulses until you pick; clicking a swapped colour highlights its row. No more doubles or helper text.

### Lettering
- A new text starts from the defaults every time. The font list shows each font in itself. Size goes up to 150% of the height, and the preview zooms out (the output frame dotted in pink) so the whole text shows.

### Fixes
- The FPS / LOAD / MEM tooltips stay readable: they no longer reset every second while you read them.
- About: "If it's useful to you…" starts on its own line.
- In a preset, an effect's name is no longer cut off while you adjust it.

## 0.25.0 — 2026-10-07

### Preview
- Guides (lower right of the preview): thirds, golden ratio, centre or a 4×4 grid, drawn over the preview only.
- Stick: a dragged GIF's edges or centre stick to the guides, the centre and the edges of the frame (a pink line shows which); hold Alt to place it freely.
- Ghosts: show or hide the dotted ghosts of faded one-shot GIFs.

### Effect presets
- Click an effect's chip in a preset to adjust it as the preset plays it: style, layer, amount, rate / size. Click the name (‹ Num 1 › Glitch) to go back to the preset.

### Transitions
- Changing scene again while a transition runs starts the new one from what's on screen, instead of cutting to the half-arrived scene.
- Glitch › Slices uses Pixel too (slice height).

### Colour swap
- Reworked: click a palette colour to select it (again to deselect), then pick what it becomes in the row below; the picker stays open while you drag in it and opens next to the row. Click a swap in the list to select it, × removes it.

### Lettering
- A font list instead of a typing box: twelve fonts built in (Russo One, Anton, Bebas Neue, Bungee, Monoton, Orbitron, Permanent Marker, Press Start 2P, Righteous, Rubik Mono One, Instrument Sans, JetBrains Mono), common installed ones, and "This computer's fonts…" (Chrome lists every font installed, after asking). The default text is VJif.

## 0.24.0 — 2026-10-07

### Transitions
- Glitch has styles, like the Glitch effect: Slices (as before), Blocks (shuffled, displaced blocks of both scenes settling on the new one), Melt (the Doom melt, which was its own type) and Scramble (pixelates, scrambles the colours into the new scene, then resolves). Pixel sets the block size / column width. Presets that used Melt become Glitch › Melt.

### Effects
- Glitch › Scramble: pixelated blocks with their colours scrambled (channels rotated, swapped or inverted; black stays black). Amount sets how big and how many.

### Scenes
- Each scene remembers what you had selected: the pad shown in the GIF panel and the edit layer. A scene you haven't edited yet keeps the edit layer, and the GIF panel shows that layer's selected GIF (it used to keep the same pad key, so the GIF panel and Transform could show two different GIFs).

## 0.23.0 — 2026-10-07

### Recording sound
- Music player (Settings › Recording › Music): load an audio file (MP3, WAV, FLAC, OGG, M4A…, or drop one on Settings) or a direct link to one. Play / pause, listening level, loop. The track is remembered.
- Sound › Music player: recordings take the track straight from the file at full level (no loopback cable). With Rec starts it from the top when the take starts, on the bar, and stops it with the take, so a clip and its music line up.
- Sound › Tab audio: when you press Rec, Chrome asks which tab to share; its sound is recorded with the video (YouTube or any player in another tab; tick "Also share tab audio"). YouTube / Spotify / SoundCloud links can't be played inside VJif itself.

## 0.22.2 — 2026-10-07

### Interface
- The GIF pool closes when you click anywhere outside it (the Pool button still toggles it; dragging a GIF onto a pad still works).
- About: the credits get their own row; below them, "Show this at start" on the left and Play! on the right.

## 0.22.1 — 2026-10-07

### Transitions
- Luma fade takes the same time whatever the scene's brightness. It used to sweep through raw brightness, so a dark scene sat still for most of the fade and then flipped at the end; now it sweeps through the scene's own brightness ranks (brightest parts first, as before), so the same share of the picture changes at each moment.

## 0.22.0 — 2026-10-07

### Lettering
- Text… (next to Add…): type a text (an artist's name, a message) and it goes on a pad like a GIF. Font (any installed font, or Russo One, Instrument Sans, JetBrains Mono…), bold / italic, size as a share of the output's height, letter spacing, colour.
- Looks: Letters (the text alone) or Cut-out (a matte with see-through letters: on a layer above the others, they show through the text only).
- Marquee: scrolls across from right to left, one pass per 1, 2, 4, 8 or 16 bars, starting when the pad is hit. It's X automation in the Auto tab, so it can be changed there.
- Edit text in the GIF panel changes a pad's text and keeps its settings. Texts are redrawn when the canvas format changes, and saved with the set and in .vjif files (as small .vjtext files).

## 0.21.0 — 2026-10-07

### Scenes
- BRB (be right back), under the scene tiles: VJif changes scene by itself every 4, 8, 16 or 32 bars, on the bar, to the next scene with GIFs playing (In order) or a random one (Shuffle), with the armed transition or a random preset each time (Random, never the same twice in a row; the armed preset stays armed). The button counts the bars down. Any scene key or click, or BRB again, takes back control; Prep pauses it. It can be MIDI-learned.

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
