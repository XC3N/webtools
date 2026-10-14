# VJif changelog

Versions follow `major.minor.patch`. 1.0 comes once VJif has been played live on real hardware (GPU, MIDI controller,
recording uploaded to the platforms). Until then, minor versions add features and patch versions fix things.
The version shows in the About panel (click the logo). What still needs testing by hand is in `TESTS.md`.

## 0.89.4 — 2026-10-14

### Preview
- The preview shows the output at an exact eighth of the render size (3/8, 1/2, 5/8…), counted in screen pixels so Windows / browser scaling is included: the largest that fits, centred. VJif shrinks the picture itself, in exact halves then one whole-ratio step, so anything that repeats every 1, 2, 4 or 8 pixels (Dot Matrix, dither, scanlines) lands the same way everywhere: no banding. Only a box smaller than 1/8 scales freely.
- Game Boy dots prefer a multiple of 4 pixels (4 at 720p, 8 at 1080p, 16 at 4K), so they fit the eighths.

### Output
- The output window works the same way while it's a window: an exact eighth that fits, in screen pixels. Its default and Shift+click reset size is half the render size in screen pixels (it was half in scaled units: at 125 % scaling that was really 5/8). Full screen still fills the screen.

### Interface
- GIF heading: a small picture of the selected GIF (its first frame, whole), so it's clear which GIF the panel edits, also when it's folded.

## 0.89.3 — 2026-10-14

### Preview
- The preview holds the picture at full render size and lets the browser scale it onto the screen, exactly like the output window. Fine patterns (Dot Matrix gaps, scanlines, dither) look the same in both, at any size. Replaces 0.89.2's preview-only gap redraw.

### Output
- Right-click Output: the output in an always-on-top window (Chrome / Edge 116+ Picture-in-Picture) with no address bar. Chrome picks where it opens and caps its size; it can't go full screen. Right-click again closes it; a click switches back to a normal window.
- Reopening the output window after Shift+click reset: the picture area is measured and corrected, so no thin black bars.

## 0.89.2 — 2026-10-14

### Preview
- Dot Matrix in the preview: the gaps no longer shimmer into moiré. The preview fills the gaps with their dot's colour, scales the picture down, then draws the gaps again at its own pixel size, evenly, with the same overall tone as the output.
- The preview scales the output down in exact halves first, so fine regular patterns (scanlines, pixel art) stay even.

## 0.89.1 — 2026-10-14

### Effects
- Colour › Palette › Dot Matrix / Pixels: the dots are whole pixels (8 at 1080p: 135 rows), square and all the same size, on a grid that lines up with the frame. A fractional dot size (7.5 px) gave dots of two widths and an uneven, tartan-like grid. The gaps are a little quieter.

## 0.89.0 — 2026-10-14

### Under the hood
- One envelope editor behind the three graphs (an effect's envelope, GIF › Auto's, GIF › Play › Trigger's): the same nearest-point grab, hover tip, value shown beside the point, double-click to its default, and the same words in the tips.
- One drag routine for pads, scenes and effect presets: the slanted chip under the pointer, Ctrl to copy, the hold-to-replace bar over a full one.

### Pads, scenes & layers
- Scenes drag like pads (no more browser drag): the chip follows the pointer; Ctrl+drag copies, held over a full scene until its bar fills replaces it.
- Effects and presets carry a chip with their icons while dragged.
- A right click during a drag cancels it (moving / sizing / turning / cropping in the preview, pads, scenes, presets).
- Background: filled and empty slots are the same size (every layer's chips are a sixth of the card). A slot's chip dragged onto a pad becomes that pad's GIF (and leaves Background).
- A chip can't be dragged onto a layer that won't take it (no target shows) instead of being refused after the drop.
- Overlay's faded-out one-shot ghosts only show while you edit Overlay.
- Files or links dropped on the Pool button go into the pool only.

### GIFs
- Trigger's graph is editable: drag Fade in, Hold (when it's a time) and Fade out, like an effect's envelope.
- Auto: shapes drawn (Sine, Triangle, Ramp, Square, Random, Drift; Ramp ↓ is Ramp with Invert — older sets convert); Invert and Hold are icon toggles beside them; Shift+click either sets it on every running LFO of the GIF.
- Smooth scaling has no section again: its own line after the last one (folding Shadow doesn't hide it).
- Key region icons: All a transparency checkerboard, Edges a frame round a hollow square, Wand with its sparkles further out. The pick buttons are a proper eyedropper.
- The colour picker moved on to the next colour after a change only if nothing had changed: after a change it closed instead. It now always moves to the colour you press.

### Effects
- Colour › Palette › Dot Matrix looks more like the Game Boy's LCD: the gaps show the backing with each dot's faint shadow down-right of it, the backing's fine grain shows in the light areas, and the dots are slow (a change ghosts over a few frames).
- Glitch › Corrupt transition: the mosh streams one way (the transition's direction), each row of runs at its own speed — no more swirl.
- Shake › Edges: the word sits against its button. Effect icons on a lit pad use the pad's text colour; preset icons have room under them.

### Layers
- Mask tools on one row; no Done (the layer's mask button again, or Esc, ends painting); Clear is a reset icon; the Size / Soft pop-ups fit "400 px".

### Interface
- Keys & mouse: the title and search stay on top while the list scrolls; every description starts at the same place; a wider box.
- Opening another pop-up slider closes the music volume.

## 0.88.0 — 2026-10-13

### Pads & scenes
- Two kinds of pads. **Scene** (QWE ASD ZXC): each scene its own, played on Midground or Foreground (the one you're editing, else Midground). **Global** (RTY FGH VBN): the same GIFs, settings and placement in every scene, always on Overlay.
- Overlay (layer 4) is the same in every scene: what plays there keeps playing through scene changes.
- Background (layer 1) has no pads: its card has 6 slots per scene. Click a + to fill one from the pool (or a file), or drop a GIF from the pool, a file or a pad on the card; they just play. A slot's × empties it (Ctrl+Z brings it back).
- Chips only move between the layers that take them; Overlay refuses Scene pads, Midground / Foreground refuse Global pads, with a message saying why.
- Older sets are rearranged once: the scene you're on gives the Global pads; other scenes' second-group GIFs move to their free Scene pads (or out, if full — the pool keeps them); Background's GIFs move into its slots; what was on Overlay moves down to Foreground / Midground, and the Global pads that were playing move up to Overlay.

### GIFs
- Transform is a tab of the GIF panel (Transform · Play · Display · Auto); its heading line reads Placement with the layer and pad, and the tab lights when fit, flip, tile or opacity are changed.
- Base size is one switch: Auto · Fit · Fill · Stretch · 1:1 (was a menu plus Fit / Fill / Stretch buttons). Picking Fit / Fill / Stretch sizes the cropped part to the frame and centres it; Auto and 1:1 go back to scale 1×, centred. Rotation and flips stay.
- Auto: Skew (where the shape turns: a Square at 25% is the old Pulse, which is gone — older sets convert) and Hold (on each pad hit the value jumps to where the LFO is and stays until the next hit; with Random, a new value per hit).
- Auto: Shift+drag Cycle, Gap, Phase, Skew or an envelope slider: every running LFO of the GIF follows.
- A text pad folds away the Play sections it can't use (their headings stay, dimmed).

### Layers
- Mask painting: two rows of icons (Free / Rect / Ellipse, Size and Soft as icons with an upright slider like the music volume; Invert, On, Clear, Done), so the GIF chips no longer cover them.

### Interface
- ?, full screen and Settings are their own group at the right end of the top bar; the top bar fits on one line at 1600 px wide (it wrapped before).
- Keys & mouse is much shorter: one line per entry.
- The Claude's VJif theme is gone (Mopho stays).

## 0.87.3 — 2026-10-13

### Effects
- Each effect has a small icon: on its pad (lower right), on preset tiles (the first line shows the icons, the name or details under them) and in the editor's LCD.
- Shake: Overscan is now one icon toggle, Edges (on: zoomed in just enough that no frame edge shows; off: the edges show). Older Some reads as on.
- Colour › Palette with a Game Boy palette: the row reads Dot Matrix, right-aligned against its switch.

### Transitions
- Glitch › Corrupt matches the Corrupt effect: a datamosh, runs of blocks pushed along by repeated motion, a few flat wrong-coloured blocks, the new scene arriving run by run.
- Stutter › Ramp: Intensity (10–100%) instead of Repeats; the number of flashes follows the length, so it looks alike at any length.
- TV › Channel: the slider reads Text time.

### GIFs
- Play: Trigger comes first, then Loop. Direction has Reverse (end to start, then wrap back to the end).
- Display: Colour Adjust (was Adjust), Palette, Swap colours, Key, Shadow; Smooth scaling is a one-line heading at the bottom.
- Pick buttons (Key, Swap colours) are eyedroppers; they light while waiting for the click. Key › region (All / Edges / Wand) as icons.
- Auto › Envelope: the same tooltips as an effect's envelope (points and sliders); double-click a point: its default. With LFO depth, the envelope is drawn dashed under the LFO it scales, so its points sit on a line.

### Preview
- Sticking to slanted guides (diagonals, vanishing-point rays): the box's corners and edge middles hook too, not only its centre, and the hooked handles fill in the guides' colour (was yellow).
- Transform's heading mark only lights for what the preview can't show you changing: fit, flip, tile, opacity.

### Interface
- The Tt button fits its icon (a capital T and a lowercase t).
- Settings › Ctrl+click to delete only also hides the × on the layer chips.
- Rows that appear below (a swap, …) are scrolled into view at any UI zoom.

## 0.87.2 — 2026-10-12

### Effects
- Colour › Palette with a Game Boy palette: the Dither row becomes LCD, three icons in the pattern switch's place (Off / Pixels / Dots); the row keeps its size, so nothing moves when you change palettes. Pixels: the picture in 144 rows of square pixels (the 160 × 144 look); Dots: the same with the dot-matrix gaps. Older 2 / 10 px settings read as Dots.

### Interface
- Settings (⚙) is at the far right of the top bar.
- The Alt outline is grey again.
- With the colour picker open, a press on another colour moves the picker to it (to tweak several in a row) instead of only closing it.

## 0.87.1 — 2026-10-12

### Preview
- Fixed: clicking where GIFs overlap could freeze the whole UI (since 0.86). Choosing what to select read the GIFs' pixels one at a time from the graphics card, dozens of times per click; each frame is now read once and kept.

## 0.87.0 — 2026-10-12

### Pads & scenes
- The Pads heading holds the Text (Tt) and Pool buttons; the Add… / URL row is gone (drop files, or the pool).
- Alt+click a scene to rename it in place. Holding Alt outlines only the pad, effect or scene under the pointer.

### Transitions
- TV › Channel: the number cuts out at the end of its Number time instead of fading, and is a little sharper.
- Wipe › Bands › Stagger (0–100%): each band gets its own start, length and ease; all are done by the end.

### Effects
- Colour › Palette: the Game Boy palettes' Dots switch is in the Dither row (Dots: Off / 2 px / 10 px); the Size slot is gone from Colour.
- Palettes run by year (CGA, ZX Spectrum, C64, NES, EGA, Game Boy) in the slider and GIF › Display.
- Glitch › Corrupt is a datamosh now: runs of blocks repeat the motion on the stale picture (like a duplicated P-frame), so it streams and swells; others still break into wrong-coloured blocks.

## 0.86.0 — 2026-10-12

### GIFs
- GIF › Colour is now GIF › Display, and Smooth scaling is back there as its first row.
- Swap colours: click a swap's original colour to switch that swap off and on (it stays in the list, dimmed); the swatches have room for their outline.
- Clicking another swap's colour while the colour picker is open closes it (a second click opens that one).

### Preview
- Clicking in a GIF's box selects it, transparent parts included; where boxes overlap, the GIF whose own pixels are nearest the pointer wins. Click again on the same spot to go through the others there.
- Transform's heading arrow lights when the selected GIF's placement is away from the defaults, like the GIF sections.

### Effects
- Shake › Overscan: Off / Some / Full: how far the picture zooms in while it shakes (Full: no frame edge ever shows; Some: as before).

## 0.85.0 — 2026-10-12

### Layers
- Painting a mask: the layer's card swaps its blend, opacity and transition rows for the mask tools (same height, GIF chips kept); the guides stay under the preview.

### Pads & scenes
- Settings › Interface › Permanent scene names: emptying a scene keeps its name (off by default).

### Effects
- Colour › Palette › Dots only with the Game Boy palettes, as a switch: Off / 2 px / 10 px (other sizes beat against the picture). With other palettes the slot is an empty grey box.

### GIFs
- Hit › Hold graph: back to the shape as set; while the pad is held the dot waits where the fade out starts, then runs down it when let go.

## 0.84.0 — 2026-10-12

### Layers
- The mask bar takes the guides' place under the preview while you paint: the preview no longer shrinks or moves, and nothing covers the picture.

### Pads & scenes
- Alt+click (or Alt + its key) renames a pad's GIF; Alt+click an effect preset names it (the name replaces the effect list on its tile). The old Alt swap (the GIF taking its layer for itself) is gone.
- Ctrl+drag a pad onto one that isn't empty: hold until the red bar fills and the drop replaces it (as with scenes and presets); Ctrl+Z brings it back.
- Dragging an effect preset: a swap shows a dashed outline, a copy a solid one (as pads and scenes do).
- Emptying a scene clears its name too (Ctrl+Z brings both back).
- Sets swap on the next beat even with Snap off (the next bar with Snap › Bar).

### Transitions
- Slide joined Wipe: Wipe › Push, Bands, Line, Iris (presets saved as Slide load as Wipe › Push / Bands).
- Glitch › Scramble is gone again (presets with it load as Corrupt).
- TV › Channel: the slider row reads Number: how long the channel number stays after the picture is back (off to 3 s; 0.8 s by default, was 1.6).

### Effects
- Glitch › Crunch: Size is the block size, like the other styles (it was a quarter of it, so it only showed at big sizes).

### Interface
- Settings › Interface › Blackout: the fade to black and back (cut to 2 s; 120 ms as before).
- All-layers pips moved to Settings › Theme.
- A slider row that stands for different settings (effect Rate / Size, transition Pixel) is an empty grey box when nothing applies.
- Keys & mouse is grouped (Getting GIFs in, Playing, Scenes & transitions, Effects, Layers & the preview, Tempo, Output, Editing, MIDI) with a search box (? opens it with the box ready).
- Themes: Claude's VJif redone (clay on warm charcoal, cream readouts); Mopho is back in VJif's list.
- The GIF pool's note became its title's tooltip.
- Rows revealed in the GIF panel (a new swap row) stop clear of the column's faded edges.

## 0.83.0 — 2026-10-12

### GIFs
- Play starts with a Loop section (Timing, length, Direction, Restart). Loop › Direction: Forward / Ping-pong. Once is gone: a Trigger's One shot does it (a set saved with Once loads as a One shot of one play, no fades).
- Trigger › Hit: Loop / Hold / One shot (Stay is now Loop).
- The frame readout sits under the envelope graph, both set apart by a line at the bottom of Play. Clear pad is gone: the pad's × clears it.
- Smooth scaling moved to Transform (it still belongs to the GIF: every layer and scene showing it).
- Key: the swatch sits with its Colour label, at the size of a Swap colours swatch; All / Edges / Wand get the rest of the row.
- Swap colours › Pick moved to the Merge row, inside the section.
- Auto: an LFO heading over Shape … Count from; Envelope › Mode reads Off / LFO depth / Bypass LFO; the graph sits apart at the bottom. Envelope has the effect editor's Reset and graph / sliders buttons (one choice for both); as a graph, drag its points: Attack, Decay with Sustain (up / down), Release.
- Text: the preset you pick stays shown in its menu (and comes back when you edit the text).

### Transitions
- TV › Channel draws its number with the VCR OSD Mono font file itself (a 4 KB cut of the TTF, only the characters it needs) instead of a bitmap copy of it.

### Fixes
- The section switches in GIF › Play / Colour (Frames, Trigger, Adjust, Palette, Swap colours) undid themselves on a mouse click.
- Swap colours › Clear also drops the selected swatch (and works with only a swatch selected).
- Hit › Hold: the envelope graph follows the hit as played: it grows while the pad is held, then shows the release from where it was let go.

## 0.82.0 — 2026-10-12

### Effects
- Colour › Palette: Dots, a dot-matrix screen (the Game Boy's LCD): the picture in blocks of 2–16 px with thin gaps in the palette's lightest colour. It sits on the Size row, which Palette didn't use.
- ZX Spectrum palette (15 colours: black, then the seven colours plain and bright), at the end of the list so saved palettes keep their place.

### GIFs
- Shadow › Crop with Turn with the GIF off: the crop line stays level on screen, across the GIF as it stands, so a turned GIF's shadow still only shows under it (it sits on the layer). With Turn on, the crop turns with the GIF as before.
- Labels first, switch after: "Turn with the GIF [ ]", "Smooth scaling [ ]".

### Preview
- Stick: the handles (or the centre cross) that sit on the lit guide turn yellow, instead of a yellow dot drawn at the point hooked (which landed between two handles when two guides held).

### Licence
- Bad MOPHO and the shared code in `common/` are back under the MIT License; VJif and Logo Lab stay under PolyForm Shield.

## 0.81.0 — 2026-10-12

### Layers
- The mask bar is one line between the layer cards and the preview (it no longer covers the preview). Left button paints, right button erases (Ctrl + left still erases). Clicking another layer ends painting.

### Transitions
- Glitch › Scramble is back (the 0.78 look), next to Corrupt.
- The Pixel slider row does what the transition needs: Pixel (Dissolve, Glitch), Hold (Fade › Dip / Flash: how much of the length stays black / white) or Repeats (Stutter › Ramp: how many times the new scene flashes in, 2–16, 8 by default). Ramp's 8 shots were 4 flashes of the new scene; the default is now 8 flashes. Ramp's Swing (it did nothing) is gone.
- Changing scene again during a TV › Channel transition: the screen effects no longer run over the snow and the number (they go on the arriving scene only).

### Effects
- Right-click a style of a stacked effect (Glitch, CRT): only it on; right-click it again: the stack back. A click on a style that's on but not the one shown shows its settings first; a second click takes it out.
- Effect preset tiles show what each effect does: its palette (Colour › Palette) or its style(s).
- Glitch › Corrupt: the smearing blocks move in whole pixels, mostly along one axis, so they stay sharp (digital, not analogue drift).
- Glitch › Crunch: the colour comes from blocks twice the size and bleeds across edges; the detail stays in finer steps (more unlike Pixel).

### GIFs
- Trigger › Hit: Stay, Hold, One shot. Hold is the old Gate switch (fades in while the pad is held, out when let go).

### Interface
- Settings sections fold (click their name; remembered).
- The tempo shows under the BPM box while the wheel turns it (Chrome keeps the pointer until the mouse moves).
- Settings › Interface › all-layers pip colour: the picker no longer closes Settings, and the effect tiles follow the colour as you drag.

### Fixes
- Emptying the scene you're on, going to another, then Ctrl+Z: the emptied scene's tile gets its picture back.

## 0.80.0 — 2026-10-12

### GIFs
- Every GIF section has its own switch on its heading line: Frames, Trigger (on: One shot), Key, Adjust, Palette, Shadow, Swap colours. Off skips that section and keeps its settings; touching a setting switches its section back on.
- Resets live on their section's heading line, so they're there when it's folded: Transform's Reset moved up to the Transform heading; Adjust's stays visible; Key has Pick and Clear (its reset) next to its switch.
- Key: the colour swatch (the usual swatch size) and the region (All, Edges, Wand) share one row.

## 0.79.0 — 2026-10-12

### Licence
- VJif and Bad MOPHO are now under the PolyForm Shield licence 1.0.0 (LICENSE.md): free to use, gigs and paid work included; the source is public; no selling the tools, no competing products made from the code. Copies carry its "Required Notice" lines (every built file has them at the top). Copies published before this were MIT.

### Effects
- Glitch styles stack, like CRT's (e.g. Corrupt + Crunch). New: Keyframe (a lost keyframe: the picture freezes, then moves with the live picture's motion block by block and smears; a few blocks catch up each Rate) and Crunch (a starved bit rate: blocky, banded detail, smeared colour).

### Transitions
- Glitch › Corrupt replaces Scramble: the old picture smears along block motion (P-frames on the wrong picture) while the new scene arrives in broken runs of blocks, then a clean keyframe. Presets with Scramble get Corrupt.

### Pads, scenes, presets
- A × in the corner of a pad, a scene and an effect preset deletes it in one click (shown on hover; Ctrl+Z brings it back). Settings › Interface › Ctrl+click to delete only hides them. A pad's layer numbers moved next to its key; a preset's mode next to its number.
- Ctrl+drag a scene or preset onto one that isn't empty: hold there until the red bar fills, then drop to replace it (one undo step for scenes).

### GIFs
- Trigger is a section of Play now (the tab is gone); its mode is Stay / One shot. One shot with Length › One play on a marquee: once across the screen.
- Scaling moved to Colour. The notes in Play and Trigger are gone (lettering dims what doesn't apply).
- One shot: a hit just after a snapped beat starts its Fade in when it fires (it used to start on the beat, so short fades never showed and Bar snap cut up to half a beat); the scope draws the fades as played.

### Interface
- MIDI learn's colour is the theme's signal colour at the opposite hue (it was a strong yellow).
- Undoing a scene emptied while you're in another scene brings its tile picture back.

## 0.78.0 — 2026-10-12

### Layers
- Painted masks: the new button on a layer card opens a bar over the preview; paint where that layer is hidden with a freehand brush, rectangles or ellipses (Ctrl erases; Size and Soft; Invert shows only what's painted; On / off; Clear). One mask per layer in each scene, saved with the set, each stroke an undo step. The bar moves by its title; Esc or Done ends painting.
- Lock is per scene now, like the layer's other settings.

### Effects
- The effect pads are grouped by row: F1–F4 the picture's look (Mono, Colour, Posterize, Strobe), F5–F8 movement (Zoom, Shake, Wobble, Mirror), F9–F12 texture and screen (Pixel, Glitch, CRT, Feedback). Sets, presets, scene effects, your saved defaults and MIDI mappings follow their effect to its new key.
- Caps Lock + Shift + numpad on a preset that already has effects asks for a second press before replacing them.
- FX Local: during a transition the scene being left keeps its own effects (the new scene's, a palette say, used to show on it as soon as the transition started).

### Transitions
- Slide › Bands: the frame splits into horizontal bands and the new scene's slide in one after another, from the left and the right in turn (Options: 4, 6, 8 or 12 bands).
- Stutter › Ramp: 8 shots, each shorter than the one before.
- TV › Channel: the number stays on for 1.6 s after the picture is back, then fades.

### Preview
- Stick, turning a GIF: it also catches at the angle of any slanted guide on show. The line it caught and the knob light up; moving, the point of the GIF that's hooked shows in yellow.

### GIFs
- Shadow › Turn: the shadow turns with the GIF (off: the light stays put, as before).
- Key › Pick sits in the Key heading (there when the section is folded); a folded section hides its Reset; a section changed from its defaults shows its arrow in the signal colour.
- Auto: the note under the scope is gone (it's the tooltip of the target row now).

### Interface
- Turning the mouse wheel over the tempo hides the pointer (it covered the digits) until the mouse moves.
- Dropping a pad on another scene's tile copies it to that scene's first empty pad, without opening it.

## 0.77.0 — 2026-10-12

### Effects
- Glitch › Corrupt replaces Scramble: a damaged video file. In runs along the rows, some blocks keep the frame before and smear along their own motion (datamosh), others break into flat, blocky squares in the wrong colours. Size = block size. Sets that used Scramble get Corrupt.
- Shift + numpad plays effect presets without Caps Lock (Caps Lock + Shift + numpad still stores).
- A click on an effect tile now plays it once it's held still for 120 ms (or at once when let go sooner): dragging a tile no longer flashes the effect.

### Layers
- Lock (padlock on the layer card): the mouse goes through that layer's GIFs in the preview, so a background can't be moved by accident. The Transform panel and arrow keys still work; the colour picker still sees it. Saved with the set, the same in every scene.

### Recording
- A tab or a sound input starts its capture as soon as you press Rec (while the take waits for its bar), so the start of the clip doesn't stumble.
- Settings › Sound: "Music player" and "Tab audio" without the extra words.

## 0.76.0 — 2026-10-11

### Recording
- A level meter next to the sound source (Settings › Recording › Sound, and Rec ▾), so you can see the signal coming in. It runs only while one of them is open, and only opens a sound input the browser already allows (no permission prompt from the meter).
- Rec ▾ has the sound source too (sound input, tab, music player, none), in step with Settings.

### GIFs
- Shadow › Soft: the cropped shadow fades in gradually at its top (a share of the GIF's height) instead of a straight cut. 20 % by default.

### Interface
- New theme: Claude's VJif (coral signal, cyan readouts, magenta graphs on warm charcoal). It replaces Claude's Mopho in VJif's list; Bad MOPHO keeps its own.
- About › Credits no longer carries the music link (it's for third-party credits only).

## 0.75.0 — 2026-10-11

### GIFs
- Auto › Envelope: each pad hit runs an envelope on the LFO: Attack, Decay, Sustain while the pad is held, then Release (a quick tap still gets the whole Attack and Decay). Mode Depth: the envelope fades the LFO's swing in and out (it rests at Min between hits). Mode Only: the envelope alone moves the value from Min to Max, ADSR style. Before the first hit after a scene starts, it rests at Min. The scope shows one hit held for a beat.

## 0.74.1 — 2026-10-11

### Fixes
- Dragging an effect tile no longer plays or stops it: once the drag starts, the effect goes back to how it was before the press (a click still plays it as before).

## 0.74.0 — 2026-10-11

### Interface
- The right column is shorter: no info strip under Transform (its heading now says the layer and pad; hover for the GIF's name) or under GIF (hover the GIF heading's pad letter for file, frames, size and length; processing messages show there too), and Performance is one line.
- The effect editor's top row: the buttons for all effects on the left (⏻ all off, Trig Follow), the effect's name in the middle, where it plays on the right.
- Trig Follow: with it on, playing an effect from its key or MIDI also opens it in the editor.
- About › Credits opens the credits in VJif itself (the same list as CREDITS.md in the repo).

### Transitions
- TV › Channel draws its number in VCR OSD Mono, the classic VCR on-screen font (by Riciery Leal, free for any use).

### Speed
- Scene and pad thumbnails are drawn on the CPU: reading back a GPU canvas once a second waited for the whole GPU queue (effects included), which could drop frames. The live scene tile is also only redrawn when the picture changed.

## 0.73.0 — 2026-10-11

### Layers
- Two mask blend modes: Mask: cut out (this layer's GIFs cut holes in the layers below, showing black) and Mask: keep inside (only what's under them stays).

### GIFs
- Shadow › Crop: takes away the top of the shadow, so the GIF seems to stand on what's behind it.
- Auto › Gap: a pause after each LFO cycle (the value holds where the cycle ended).

### Transitions
- Options for every family: Wipe and Luma › Soft edge; Iris from the middle or the selected GIF; Luma › Bright / Dark first; Zoom › In / Out / Through; Dissolve › Squares / Lines / Diamonds; Glitch › Clean / Split / Wide; TV › VHS › Light / Worn / Chewed; Stutter › 1/16 / 1/8 / 1/32 and Swing.

### Fixes
- Effect › Glitch › Scramble: the blocks grow from the centre (anchored in a corner, they seemed to slide into it).
- Dragging a scene tile over the pads no longer marks them as a place to drop it.
- An effect keeps playing while its tile is dragged (it stops when you let go).
- Copy targets: the dashed outline sits on the tile's own edge.
- Launchpad layout: the bottom row holds the effect presets in numpad order (7 8 9 4 5 6 1 2, 3 on the right-hand button).

### Under the hood
- The two biggest source files split by subject: scenes.js → scenes, ui-trans (the Transition panel), ui-fx (effect pads and editor); render.js → render, transitions, prep, preview (overlays and guides). The built page runs the same code in a compatible order.
- One pair of colour helpers (hex2rgb / rgb2hex) instead of four copies; unused code and styles removed; a stale "(ignored when tiled)" crop note fixed.
- The build checks that every script parses, so a syntax slip fails the build instead of showing a blank page.

## 0.72.0 — 2026-10-11

### Interface
- Sections fold: click a section's name in GIF › Play / Colour (Key, Adjust, Palette, Shadow, Swap colours, Frames), or the Transform / GIF heading itself. Remembered in this browser.
- What a click opens further down (a swap's colour row) scrolls into view when it would land below the panel's edge.

### GIFs
- Swap colours › Pick: click the GIF in the preview to select the swatch of that colour.

### Transitions
- Options › Rnd: a random direction each time (Slide, Wipe and the others with arrows).

## 0.71.0 — 2026-10-11

### Effects
- New envelope defaults: Hit plays Gate 1/8 + Release 1/8 (about a quarter note); Hold and Latch keep a short 1/32 release. The ↺ reset (and double-clicking a point) follows the effect's current mode.

### Preview
- With Stick on, turning a GIF sticks to straight (0 / 90 / 180°) and to the diagonals, within 4°.

### Interface
- The BRB and Rec chevrons are outlined on hover again, and lit while their menu is open.
- GIF › Play: "Scaling ☐ Smooth" on one line (was "Smooth scaling" wrapping onto two).

## 0.70.0 — 2026-10-11

### Fixes
- Preview: a click in the border on nothing deselected for a moment only: the selection came back to the layer's last GIF (often the big one sticking out). Now nothing stays selected until you pick something.
- CRT › VHS, Phosphor and Pay-TV over a palette (or Mono): their blur, colour smear and glow took the picture's original colours, which showed through the palette. They now use the picture's look too.
- After a Ctrl+drag copy, Ctrl+click no longer removes anything until Ctrl is let go and pressed again (the red outline already waited).

### Transitions
- The screen effects now run on each scene before the transition combines them, so the transition's own picture (TV snow, Channel's number, tears) keeps its colours under a latched Palette or Mono. A Feedback trail carries on from the arriving scene.

### Music
- Play stays lit from Play until Stop (Pause keeps it lit, with the play icon).

### Help
- All vs 1+2+3+4 explained (the All button and Keys & mouse › F1–F12).

## 0.69.0 — 2026-10-10

### Transitions
- Regrouped so every Style row fits on one line: Dissolve (Blocks, Pixelate, Melt), Glitch (Slices, Blocks, Scramble) and a new TV type (VHS, Channel). Types sit in a 3 × 3 grid. Saved presets move over by themselves.

### Scenes
- Link BRB to Prep (the chain button between them): with it on, Prep also starts BRB on the output, so the output keeps changing scenes while you prep (never to the scene you're editing; you can still change which scene you edit). Going live or leaving Prep stops it.

### Recording
- Count-in (Settings › Recording, and Rec ▾): Off / 1 / 2 / 4 bars to wait after the next bar before recording starts; the Rec button counts down (In 2, In 1).

## 0.68.0 — 2026-10-10

### Fixes
- Playback stopped when the output window was covered by the control window (or the other way round): a window that's completely covered counts as hidden, and the browser stops drawing it. The frames now run on whichever window is showing, and on a background timer when neither is.
- Feedback: a scene change no longer brings back a full-colour trail of a scene shown in an earlier transition (each trail starts clean when it hasn't been used for a moment).

### Effects
- An effect on all layers shows its four pips in one colour (Settings › Interface › All-layers pips) instead of "all".
- CRT styles read Scanlines and Phosphor in full where they fit (wide windows), Scan and Phos otherwise.

### Transitions
- Channel: the channel number goes on after the screen effects, so a latched Palette (or Glitch) no longer changes its colour.

### Interface
- Right-click a layer's number: solo that layer; right-click it again: the others come back as they were.
- Music "With Sync" moved to Rec ▾ (Music starts with Sync).

## 0.67.0 — 2026-10-10

### Interface
- Pads and Scenes: the buttons sit on their own row under the section name, so the headings are just names.
- Clear pad moved to the bottom right of the right column, always in the same place; dimmed when the pad is empty.

## 0.66.0 — 2026-10-10

### GIFs
- Drop shadow (GIF › Colour › Shadow): X / Y offset, Blur, Opacity and colour, from the GIF's see-through edges. The offset is in output pixels, so the light doesn't turn with the GIF. Saved with the GIF.
- Tile with a crop: the cropped part is what repeats (the crop used to be ignored when tiled).

### Effects
- FX Local: a scene with no effects of its own yet starts with none on (it used to inherit what was on). Switching to Local keeps what's on for the scene you're on.
- An "all effects off" button (⏻) left of the effect name: every latched effect and preset lets go, each over its Release.

### Interface
- Notes (toasts) show in the gap above the preview, under the layer cards, instead of at the bottom over the effects.
- After a Ctrl+drag copy (pads, scenes, presets), the red "Ctrl+click removes" outline stays off until you let go of Ctrl.
- Scenes header: FX Global / FX Local, and the buttons fit beside the name at 1280 wide.

## 0.65.0 — 2026-10-10

### Recording
- MP4 sound, rebuilt: the sound is now captured on the browser's audio thread (an AudioWorklet), so nothing is dropped while the page is busy drawing (blocks queue up and arrive late at worst). Each block is stamped from its sample count, so the sound is one unbroken stream that runs to the end of the picture. The music player is tapped straight from its own audio graph. A test records a tone with a 400 ms stall in the middle and checks for gaps and length.
- Rec ▾ (like BRB's): bars, frame rate and quality at hand, kept in step with Settings › Recording; More in Settings… for the rest.
- Music player: a thin seek bar under its buttons (click or drag).

### Effects
- Hold an F-key + Ins / Home / PgUp: that effect's mode becomes Hold / Hit / Latch.
- Playing an effect from its F-key (or MIDI) no longer moves the effect editor to it; clicking its tile still does.
- Envelope: a reset button (back to the effect's default).
- CRT › VHS: the tape's softness (blur and colour smear) is there in full from the lowest Wear; Wear adds the faults.

### Interface
- Layer cards show the selected GIF only on the edit layer (the one in the right-hand panel).
- Settings / pool windows: a few shades darker.
- Interface › Size: Settings only steps aside once you actually drag, so a double-click (reset) no longer flashes it.

### Fixes
- Music player: the pause button sometimes did nothing. Its icon was redrawn 4× a second, and a click that started on the old icon never reached the button.

## 0.64.0 — 2026-10-10

### Effects
- CRT › VHS (and the VHS transition): the tracking bands roll on the beat, at random. The wide one sweeps down over two beats (most pairs, each at its own speed), the thin one over one beat (about every other beat). Not only on the downbeat.

### Transitions
- The Direction row is now Options: what each transition can be tuned with. Slide / Wipe: the direction. Glitch › Channel: what the number shows: Random, Scene (the new scene's name, or its number), Scene # (01–09).
- The OSD font has letters (A–Z) for scene names.

### Interface
- Colour picker: a colour field (saturation across, brightness up) and a hue strip above the sliders, to click or drag.
- Dragging a pad: hold it over another scene's tile for half a second and that scene opens; drop it on an empty pad there for a copy.
- Ctrl+drag a scene onto the empty scene you're on: it fills in place (one undo step). It used to do nothing.
- BRB's ▾ button has its own full box.

### Timing
- Prep: going live waits for the downbeat, whatever Snap is set to.
- BRB: the scene key that takes you out of it changes the scene on the downbeat, whatever Snap is set to.

### Fixes
- Feedback: dim trails never faded completely (8-bit rounding kept the last few levels for ever), so a faint ghost of an older scene stayed. They now fade out to nothing.
- A click outside the canvas deselects, even where a GIF sticks out past the edge (nothing shows there). Handles still work outside.
- CRT › Split with Mono / Colour / Palette: each colour channel is now made from its own look, so a palette picture splits into its own colours instead of the fringes being snapped back.

## 0.63.0 — 2026-10-10

### Effects
- FX: Global / Local (scenes toolbar). Global: latched effects stay on from scene to scene (as before). Local: each scene remembers which latched effects were on when you left it; going to it switches those on and the rest off, each with its own attack / release, so they ease in and out with the transition. Switching back to Local brings the current scene's own effects back. Saved with the set.
- Effect tiles show which layers they work on, on their own line: "all", or four pips lit in the layers' colours (it used to be L1+3 next to the mode).
- Colour › Palette: Dither is its own amount again (off, 10–100 %), with a three-way pattern switch beside it (Noise, Bayer, Check, drawn as little pictures). The Palette slider gives up some room for them.

## 0.62.0 — 2026-10-10

### Interface
- Controls are 20 px tall (were 24): buttons, menus, sliders and fields. Text keeps its size; the GIF settings column and the effect editor get shorter.
- Drop GIF files, or a GIF from the pool, on a scene tile: they go onto that scene's first empty pads, without leaving the scene you're on.
- GIF › Auto: Reset all (every LFO of the GIF off and back to defaults), next to Reset (this one).

### Fixes
- A file still decoding no longer marks the same pad as "decoding" on another scene after you switch: the mark belongs to the scene the file is going to.

## 0.61.0 — 2026-10-10

### Recording
- Music player: With Rec is now With Sync. Sync (beat 1) starts the track from the top, so the song and the beat grid line up. Recording never starts, restarts or stops the track: a take records whatever is playing, and the track carries on when a timed take ends. To record a song from its start: Rec, then Sync (the waiting take starts on Sync's downbeat, with the song).
- MP4 sound (garbled with long takes / long tracks): the sound is read with a ~2 s buffer, so a busy frame no longer makes the browser drop sound blocks; the encoder is set up from the sound as it really arrives (rate, channels); and the sound is written as one unbroken stream instead of following jittery time stamps.

### Transitions
- Channel: the number is soft like an analog TV (blurred shadow, green glow, digits slightly out of focus), drawn once per transition and reused.

## 0.60.0 — 2026-10-10

### Effects
- Effect layers from the keyboard: hold an effect's F-key and press 1–4 to put layers in or out of the layers it works on, 5 for All (5 again: the layers it had). A note shows the result. Without an F-key held, 1–9 still arm transitions.
- The All button remembers: from a set of layers, All switches to the whole picture; All again brings that set back.

### Transitions
- Channel: the number is drawn with a built-in 5 × 7 pixel font (no font file, the same on every computer, crisp at any size).

## 0.59.0 — 2026-10-10

### Transitions
- Glitch › Channel: a TV changing channels. The old picture squashes and flares into snow, a hum bar drifts through, the new scene rolls down into place as the vertical hold catches, and a random two-digit channel number shows in green in the top right corner until the transition ends.

## 0.58.1 — 2026-10-10

### Interface
- Toggles are flat lamps (16 × 8 px): outlined when off, filled edge to edge in the signal colour when on (style G from the mockup, as a rectangle). Their text labels stay clickable too.

## 0.58.0 — 2026-10-10

### Interface
- VJif's own colour picker replaces the browser's: Hue / Sat / Bright and R / G / B sliders that drag, scroll, take arrow keys and typed numbers like every other slider, plus a hex field. Esc or a click elsewhere closes it.
- GIF › Auto: while you set Min or Max, the GIF jumps to that end (for as long as you hold the slider), wherever the cycle is.

### Fixes
- Sync no longer drops the effects that are on: everything timed in beats (effects, GIF fades, a transition, the envelope preview) moves with the clock when it jumps back to beat 1. GIFs and scenes waiting for the next beat / bar start at once.
- New and emptied scenes start with their four layers on (they were all off: a layer only came on when a GIF played on it).
- Stacked CRT: Amount reads Wear when VHS is the style in focus.

## 0.57.1 — 2026-10-10

### Effects
- CRT › VHS, closer to the footage: the dark tracking band holds dense short specks instead of long streaks, and the green under it is grainy instead of a flat tint (in the VHS transition too).

## 0.57.0 — 2026-10-10

### Effects
- CRT › VHS, from real tracking-glitch footage: at high Wear the wide tracking band loses the picture to a dark band of white and coloured streaks, a green cast trails below it (the colour lock coming back late), and a thin magenta line tops it. The picture also softens as Wear rises.
- Glitch › VHS transition: the same green trail and magenta line under and over its wide band.
- Effect styles always fit on one row (CRT's buttons read Scan and Phos; the tooltips keep the full names). The editor is one row shorter for every effect.
- Stacked CRT: right-click a style that's on to show its settings (VHS → Dropouts, Scanlines / Crypt → Size) without switching it off; switching a style on also brings up its settings. The style in focus is underlined.

### Fixes
- Stacked CRT: the Size row was greyed out whenever Scanlines or Crypt were stacked with another style.

### Interface
- The file pickers list extensions (.gif, .webp…) instead of file types, which some systems open faster.

## 0.56.0 — 2026-10-10

### Effects
- Degauss moved from CRT to Glitch (it's a one-off hit, not a screen). CRT's six styles now all stack, in two rows of three.
- CRT › VHS on its own: the Size row is Dropouts (0–200%). Dropouts also grow with Wear now (more often and brighter), and the switching noise along the bottom is in colour.
- Layer mask: All and the layer buttons are separate. Either All is lit, or a set of layers is (a layer button from All starts the set with just that layer; taking out the last one goes back to All).

### Preview
- Shift while dragging, once a guide lights up: the GIF slides along that guide only (straight or slanted). It used to make only the centre stick.
- The selected GIF shows a small + at its centre (what sticks to slanted guides).
- A click in the border around the canvas, on nothing, deselects the GIF.

### Interface
- Toggles are square boxes (empty = off, filled = on) instead of sliding switches.
- MIDI learn has its own colour (amber) for the outlines, tags, bar and button; the learn button is a crosshair.
- Settings stands out from the interface: a lighter face, an accent edge, a deeper shadow. While dragging Interface › Size, only that row stays: the rest of Settings steps aside so you can see the interface.
- Settings › Defaults: the part ticks sit in the heading and the explanation is its tooltip (two lines fewer).
- Transition panel: narrower labels, wider buttons.
- Transform: the Fit menu is Base size, with the same names as the buttons (Fit, Fill, Stretch); the buttons' tooltips say they set it and reset the scale.
- GIF › Play: Smooth scaling, one label. On a lettering pad the settings that don't apply to it (timing, loop, frames) are dimmed, with a note.
- Copying with Ctrl: the target pad / scene / preset shows one clean outline.
- Swap colours › Merge starts off (0).

### Lettering
- No Cancel / Put on pad buttons: drag the "Drag onto a pad" chip onto any pad (the window steps aside while you drag), or click it / press Enter for the next empty pad. ×, Esc or a click outside closes. The help line is gone.
- A bigger glow no longer zooms the preview out (it's sized by the letters).

## 0.55.0 — 2026-10-09

### Effects
- The effect editor keeps the same height for every effect: styles always sit in two even rows (CRT 4 + 3, Strobe 1 + 1). Switching effects no longer shifts the rows below.
- Colour › Palette: the Pattern control from 0.49 never actually showed (that row is hidden for Colour). Pattern and amount now share the Dither slider: off, then Noise / Bayer / Check from 10 to 100% (renamed from Scatter / Ordered / Checker so they fit).
- Layer mask: taking out the last lit layer gives every layer (1+2+3+4, each on its own), and lighting all four keeps them as layers instead of switching to All (the blended picture). All is only the All button.

## 0.54.1 — 2026-10-09

### Interface
- No browser menu on right-click anywhere in VJif (right-click selects / edits here). Text boxes keep it, for copy and paste.

## 0.54.0 — 2026-10-09

### GIFs
- GIF › Colour › Palette: snap one GIF's colours to a palette (the same ones as the Colour effect), with Dither in an ordered pattern on the GIF's own pixels. Saved with the GIF, so each pad / scene can have its own.
- Smoothing moved from Transform to GIF › Play: it's a setting of the GIF (everywhere it's used), not of where it's placed.

### Effects
- New order inside the effect pass: the picture's own look (Mono, Colour, Palette) now comes before the screen it's shown on (CRT). A Palette scene with VHS on top keeps VHS's noise, colour bleed and scanlines instead of having them snapped to the palette.

## 0.53.0 — 2026-10-09

### Performance
- Transitions Glitch › VHS, Glitch › Scramble and Dissolve run on the GPU, in one shader pass, instead of hundreds of separate draws (VHS) or a loop over every block with a read-back from the GPU (Scramble). They look the same. Without WebGL the old way still draws them.
- Prep: the output and the scene you're working on are only redrawn when something in them moves or changes. A still scene under Prep cost every effect pass, every frame.
- With no effect playing, no effect mix is built each frame. The effect shader only receives the settings that changed, and the 64-colour palette only when it changes.

## 0.52.2 — 2026-10-09

### Fixes (from a code review)
- Ctrl-dragging an empty scene onto another made a broken copy: going to it failed halfway, leaving the output half-switched. Empty scenes now say there's nothing to copy.
- BRB after a long Prep hold (or a jump in the beat count) changed scene every tenth of a second until it caught up; it now changes once and gets back on its grid.
- Smooth no longer bends Stutter's beat grid or the Doom melt's timing.
- A layer switched off while it has Feedback / Phosphor on starts its trail fresh when it comes back (no stale ghost).
- The same GIF dropped on several pads at once is decoded once. A load still decoding when another set is opened no longer lands in the new set's pool.
- A broken GIF frees its decoder and the frames read so far.
- A link whose file name contains % (100%.gif) loads instead of failing silently.
- Scene tiles no longer rewrite their pictures every second.

## 0.52.1 — 2026-10-09

### Effects
- CRT's seven style buttons sit in two even rows (4 + 3) instead of six and a lone Crypt.

## 0.52.0 — 2026-10-09

### Effects
- CRT styles stack: click several (Split + VHS + Scanlines + Phosphor…) and they play together, each as its own stage in a fixed order, one Amount for all; click a lit one to take it out. Degauss stays on its own (it's a one-off hit): picking it clears the others, picking another replaces it. The tile shows the stack (VHS+Scan+Phos).

## 0.51.0 — 2026-10-09

### Scenes and presets
- Drag a scene onto another: they swap, as before. Hold Ctrl (⌘) while dragging: a copy instead, onto an empty scene (the empty ones show a +). Duplicate uses the same copy.
- Effect presets drag too: onto another preset they swap; with Ctrl held, a copy onto an empty preset. While dragging, the red ✕ doesn't show.

### Preview
- Stick works with the slanted guides: a dragged GIF's centre sticks to the diagonals and the perspective rays (the line it's on lights up). The safe-area frames are stick lines too.

## 0.50.0 — 2026-10-09

### Effects
- An effect can play on several layers: in the effect editor, a layer button takes that layer in or out (from All: every layer but that one), right-click a layer button for that layer alone. Lit layer buttons take their layer's colour. All is still the whole output after blending; chosen layers each get the effect on their own, before blending. Tiles and preset chips show it as L1+3.
- Feedback › Length starts at 5% (0% wasn't "off", only the shortest trails).

## 0.49.0 — 2026-10-09

### Effects
- Colour › Palette: a Pattern row (where Size usually is) picks how in-between shades are drawn. Scatter is the look so far (noise, then the nearest colour). Ordered: each pixel is one of the two nearest palette colours, chosen by a 4×4 Bayer pattern, like DOS-era and 8-bit art. Checker: those two colours only as a 50% checkerboard, flat everywhere else (the hand-pixelled look). Dither still sets how much of the picture gets the pattern.

## 0.48.0 — 2026-10-09

### MIDI
- MIDI learn: the top-bar button is a target now (the old one read as a clock next to the tempo). The learn bar sits over the top of the preview, under the layer cards, so it no longer hides their on / off buttons.
- A layer's opacity mapping shows its tag on the opacity slider itself.
- Sync with MIDI clock says what it did ("GIFs lined up with the DAW's bar"): when the GIFs were already in line nothing visibly moves, which looked like it did nothing.

## 0.47.0 — 2026-10-09

### MIDI
- Launchpad lights: each kind of control has its own solid colour (pads amber, scenes blue, effects pink, effect presets violet, transitions teal, layers in their colours…), instead of each GIF's average colour. Brighter: full when playing / on, 35% when loaded, 10% when empty, so the regions show even in daylight.
- Launchpad map: a picture of the Launchpad (Pro MK3 layout) with what each pad and button is mapped to, in the same colours. Settings › MIDI control › Map, or Launchpad map in the help (?).

## 0.46.0 — 2026-10-09

### Pads
- Copying a pad: hold Ctrl (⌘) at any point while dragging it. The empty pads (the only places a copy can go) show a +, the one under the pointer lights up, and the original stays where it is. Let go of Ctrl before dropping and it's an ordinary move / swap again. While dragging, the red ✕ no longer shows on the pad you're carrying; Ctrl+click still clears.

## 0.45.0 — 2026-10-09

### Interface
- Slider labels sit inside the slider, on the left (the value stays on the right), so every slider gets the full width of its row. Clicks go through the label to the slider; the right-click hint for automation is on the whole row.

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
