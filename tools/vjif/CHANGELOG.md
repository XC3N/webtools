# VJif changelog

Versions follow `major.minor.patch`. 1.0 comes once VJif has been played live on real hardware (GPU, MIDI controller,
recording uploaded to the platforms). Until then, minor versions add features and patch versions fix things.
The version shows in the About panel (click the logo). What still needs testing by hand is in `TESTS.md`.

## 0.99.29 — 2026/10/26

- New styles, from shaders.com's list of techniques (our own GLSL, nothing copied): Colour › Duotone (shadows to highlights in a pair of colours; the Colours slider picks one of six pairs, an LFO can step through them), Pixel › Halftone (a round dot per cell, its area as bright as the cell), Wobble › Swirl (twists round the centre and back, each Rate) (ID-254).
- Typing into a time slider's readout ("1/4T", "1/8.", "3 bars", or beats) also sets its note switch; the LFO Cycle did the same wrong before (BG-066).

## 0.99.28 — 2026/10/26

- GIF › Auto › LFO: Gap at the turn too: half the Gap at the turn of the cycle (the top of a Sine or Triangle, where Skew puts it), half at the end, so the peak holds (ID-253).
- Effects editor: the GIF / Scene / Out switch is three icons (a picture, a scene, a screen), so the effect's name fits again (ID-249).

## 0.99.27 — 2026/10/26

- Effects on three levels at once (ID-235): a GIF | Scene | Out switch in the effects editor (where FX Local was) picks which level the F-keys, the tiles and the editor work on. Out carries on from scene to scene; Scene is each scene's own (its latched effects go with it); GIF is the selected GIF's own. All three play together. All effects off clears the level the switch is on. A set saved with FX Local brings its latched effects back on the Scene level.
- GIF effects in full (ID-223): every effect on a GIF, with all its settings in the effects editor on the GIF level (no envelope or LFO there). GIF › FX lists all twelve, each section folded while it's off; its list icon opens the effect in the editor. A GIF's Zoom works around the GIF's centre, its Strobe flashes the GIF only.
- Kaleido: Angle (where the slices start; Drift is the old slow turn; an LFO with Ramp spins it in time), the Mirror switch beside it (ID-245).
- Pixel › ANSI: the shading is the real ░ ▒ ▓ glyphs on an 8 × 16 cell (ID-248).
- Blend: a GIF's blend now works against everything under it on screen, also with several GIFs on a plain layer (BG-059).
- GIF › Play: Timing (Free / Fit / Step) sits in the GIF Loop header as icons; Direction is icons too (BG-054). Resolution moved to the GIF header (TW-070).
- All automation off: a button in the effect editor switches every LFO of the effect off (settings kept) (ID-250).
- Loupe: once dragged it can sit anywhere in the window (ID-251). Shift+Home resets placement; Home alone no longer does (TW-071).
- Time sliders: Loop length, Each frame, Restart, Repeat, Fade in / Hold / Fade out and GIF › Auto's Gap have the Even / Dotted / Triplet switch beside them, as the LFO Cycle has (TW-056, TW-074).
- Frames: a Start before In plays the frames up to In once (an intro), then the loop; Outro to: the frames after Out play once when a Hold pad is let go or a One shot fades out, then the last one stays (ID-241).
- The effect's Amount slider follows its envelope while it moves (attack, release); it already followed an LFO (ID-247).
- Small fixes: NES / Grey 6-bit show no Dither value (BG-064); Shadow › Cut greyed while Floor is on (TW-072); Shadow Y reaches ±160 px (TW-073); Optimize leaves GIFs of 320 px or less alone and keeps a margin (QA-036); the recorder starts once the track plays with Count-in › Play, and the sound path is ready when you arm (BG-065).

## 0.99.26 — 2026/10/25

- Pixel › ANSI (ID-248): text mode. The picture becomes character cells (Size = a cell's width; a cell is twice as tall), each in the two nearest of the 16 ANSI / VGA colours with a ░ ▒ ▓ shade between them. Also under GIF › FX › Pixel.
- GIF blend (BG-059): a GIF alone on its layer now blends with what's below the layer (its own blend did nothing without a second GIF on that layer).
- Fit range and Mirror's toggles were hidden with the Size row; they show again (BG-046, ID-245).
- LFO: sliders follow the LFO live even with the LFO pane open (ID-185); the Cycle note icons are no longer clipped; "Palette" is named properly in messages.
- Loupe: right-click locks the view; the border changes colour while locked (ID-230).
- GIF › Play: Restart is a slider (off at the left); Repeat has no on/off switch, its first stop is off; Hit moves into the Trigger header and the rest of Trigger folds under Loop and Hold; the loop section is named "GIF Loop" (ID-219, BG-054, TW-057, TW-054).
- Pool panel: "Add GIF" and "Loaded GIFs" groups, Load joined to the URL box; "Full" replaces "all". New undo / redo icons; the × on settings and the pool is no longer cut off; section titles no longer show a help cursor.

## 0.99.25 — 2026/10/23

- LFO on more settings (ID-185): right-click the slider when it holds Length (Feedback), Zoom (Mirror › Kaleido), Dither (Colour › Palette) or Dropouts (CRT › VHS): each has its own LFO, saved with the effect and in presets. (Switches, the Palette slider and Kaleido's slice count have none yet.)

## 0.99.24 — 2026/10/23

- Click a message (toast) to copy its text; the pointer resting on it keeps it up.

## 0.99.23 — 2026/10/23

- Links dropped on the Background card (from a web page, Google Images…) now go into its next free slot, as files already did.
- A drop that can't be fetched says what each link did (e.g. `media.site.com: blocked`).

## 0.99.22 — 2026/10/23

- Dropping a picture from a web page where the browser sends only links (Chrome on a Mac, Google Images): the picture's own address inside Google's link is fetched first, then the page's <img> address, then the other links; a reply that isn't a picture is skipped. The message now says what failed. Windows is unchanged (it sends the file itself).

## 0.99.21 — 2026/10/23

- Start-up: only the set the session came from is read before the page is ready; the other saved sets load in the background (the debug monitor's timeline shows 'all sets'). Saving, importing and tidying sets wait for them.
- Mask painting, Size / Soft: the brush follows the pointer itself, wherever it is, at its true size and softness (the pointer hides meanwhile); the pop-up slider jumps to where you click, then follows the pointer's movement, so the pointer can go anywhere on the screen.
- Mirror › Kaleido: a Mirror switch (in Size's place): on, every other slice is flipped (as before); off, the same slice repeats all round.
- Colour › Palette: a Fit range switch (in Size's place), like the GIF's: the picture's own darkest and brightest are stretched over the whole palette first.
- GIF › Display › Palette: the Variant row stays when a palette has none (greyed), and the pattern switch hides without moving the slider.
- Loupe: when the pointer leaves the preview, it stays on the spot where the pointer last rested, not where it crossed the edge.

## 0.99.20 — 2026/10/23

- One shot › Repeat: its label is back in front of the slider and the on / off switch sits after it (it had become part of the slider).
- Play › Trigger graph with Repeat: the dot travels along all the repeats from the hit (it stayed in the first one) and wraps at the end.
- LFO Hold (sample and hold at each hit): a One shot Repeat counts as a hit, so each repeat samples a new value (it stayed on the first).

## 0.99.19 — 2026/10/23

- Play › Trigger graph with Repeat: its points (Fade in, Hold, Fade out) sit on the curve where it reaches them, and a point the curve never reaches (a Repeat shorter than it) is left out, so no dot floats off the curve at the bottom.

## 0.99.18 — 2026/10/23

- Every GIF can have its own blend mode on any layer (it was Background only): the GIF is blended with the other GIFs under it on its layer, then the layer's own blend applies. Set it in the new block left of the GIF picture.
- That block holds the GIF's display options: Opacity, Blend, Smooth scaling and Bypass FX (moved from GIF › Display; no layout shift).

## 0.99.17 — 2026/10/23

- GIF › Colour › Palette now matches the Colour effect: a Snap to slider (None, then the palettes by year), the palette's variants as a switch, and Dither with its pattern switch (Noise / Bayer / Check; Bayer as before).
- Debug monitor: a bigger window, a Copy the text button (the text no longer refreshes while you select it), and a start-up timeline (seconds since the page opened, marked at script start, set read, GIFs decoded, first frame) to find where the start-up time goes.
- Pool: the Fit button is now Optimize (it shrinks the GIFs' memory).
- Note-family switches (Even / Dotted / Triplet…) are little pictures instead of letters.

## 0.99.16 — 2026/10/23

- GIF › FX stacks (Glitch, Codec, CRT) behave like the scene FX: a click on a lit style selects it (underlined, the others dim), the next click takes it out.
- One shot › Repeat has an on/off switch that keeps its count.
- Background slots: the Trigger section is greyed (nothing triggers them).
- Mask painting: a Show slider (the mask tint's strength) beside Size and Soft; while Size / Soft is held, the brush shows at the picture's centre at its true size and softness.
- Shadow › Scale: grows or shrinks the shadow around the GIF's centre.
- Rec: the button shows 'Save…' while the file is finalised.
- CRT › PAY-TV: an Invert switch (the now-and-then negative field; on as before).
- GIF tabs: room each side so the changed-dot doesn't sit on a label.

## 0.99.15 — 2026/10/23

- Esc, with nothing to cancel, deselects every GIF (the GIF panel greys out; clicking a pad or chip selects again).
- GIF › Play › Step: the frame length is a slider over the note values (it was nine buttons).
- Fit timing: switching Direction to Ping-pong doubles the loop length (and back halves it), so the speed stays the same forward and backward.
- Envelope graph with Repeat on: the dot starts where the carried-on level is on the fade in, not at the start of the curve.
- Transform: the layer and pad shows as a chip; the Placement heading has a dot only while changed (no triangle).
- About: the support line sits on its own line.
- Dark GIF chips: a lighter, 2 px outline.

## 0.99.14 — 2026/10/21

- Dither on palettes of 4 colours or fewer (CGA, the low greys): 100 % is one notch less extreme (the slider's top used to mix across the whole range, which looked overdone on CGA 1).

## 0.99.13 — 2026/10/21

- Fixed (0.99.12): on Grey 6-bit and the NES the whole palette row disappeared, the bit switch with it. Only the Dither slider and its pattern switch are greyed now.
- Monitor window › Start: how long the page took to be ready, how long restoring the set took, and how long each shader took to compile. For slow reloads: open the monitor after one and read these lines.

## 0.99.12 — 2026/10/21

- A GIF that fades out and is sent off to make room no longer pops a message (the dimmed chips and the red flash say enough). The GIF that takes its place now sits at the same height in the stack as the one it replaced (it went on top before).
- Esc closes the pool's right-click menu only; a second Esc closes the pool.
- Caps Lock no longer shifts the Scenes heading's export / import buttons (the numpad and CAPS·FX tags are the same width).
- An effect's envelope reset can be undone with Ctrl+Z (and redone), and clicking the reset button a second time puts the envelope back.
- Right-clicking a slider in the effect editor no longer starts the envelope preview.
- Pool: drag a tile out of the window to drop it as a file (Chrome).
- Palettes (BG-046): Dither is greyed out on Grey 6-bit (64 steps are already smooth) and on the NES (it never dithered; its second colour was often another hue). Blue counts more in the nearest-colour match (0.55, was 0.35): on CGA 3 a medium blue went to light red because cyan's green was too far; now it is light cyan. On palettes of 4 colours or fewer the Dither slider's low end is a gentle dither (it was a hard threshold: 1-bit vanished at 20 %). New in GIF › Display › Palette: **Fit range**: the GIF's own darkest and brightest are stretched over the palette first (a dull picture keeps its detail on a 2-bit grey). Not on the Colour effect's palette yet.
- Monitor window (ID-246): Shift+right-click LOAD opens a small window with graphs of load, FPS and JS heap over the last hour, the worst frame of the last minute, late frames and stalls, the heap's trend in MB/min and what the decoded memory is made of. Keep it open next to your work: a climbing line points at VJif, flat memory with a wandering load at the PC. (Help › Editing lists it.)
- About: "If this tool is useful to you, consider supporting the music".

## 0.99.11 — 2026/10/21

- **End** now turns mask editing on / off for the edit layer (it used to switch the layer on / off; Shift+1–4 still do that).
- Messages in the top bar wait their turn: each stays up at least ~1.5 s (longer for long text), up to 4 wait, repeats are dropped.
- Rec: a sound-input scan that comes back empty (the camera being opened) keeps the list instead of leaving only "No sound".
- CRT › VHS: at its lowest Amount only the blur (softness and colour smear) shows; tracking, tears, dropouts, snow and noise fade in from about 4 % up to 30 %.

## 0.99.10 — 2026/10/21

- A mostly black GIF's chip outline is brighter (light grey, was dark grey that vanished against the dark layer row), also when the chip is selected. Checked with a black 44×44 sprite on a see-through background: it is detected as dark and gets the outline.

## 0.99.9 — 2026/10/21

- Effect editor: the envelope and the LFO view are the same height again (0.99.7 made the LFO one 8 px taller, so the panel below moved when you switched); the shape icons are drawn smaller to fit.
- The LFO's title reads "LFO on Size" (which slider it moves), not "LFO · Size".

## 0.99.8 — 2026/10/21

### Layers
- Chips of GIFs that fade in and out and are at nothing now (finished, or placed but not hit yet) are dimmed with a closed-eye mark; the GIFs on screen stay bright. A disabled GIF keeps its struck-through label. The pad's layer dots dim the same way.
- A full layer no longer refuses a new GIF while some of its GIFs are not showing: the one that has been unseen longest leaves to make room (a toast says which). If every GIF on it is showing, it still refuses.
- Right-click a pad puts its GIF on its layer without playing it (ready to place, or back after it left).

### GIF
- Repeat shorter than the envelope: each repeat carries on from the level it is at (Retrigger › Continue) instead of dropping to 0 with a hard cut; Retrigger › Restart starts each repeat from 0.
- The shape buttons in Auto › LFO are taller, with the icons smaller inside them.

## 0.99.7 — 2026/10/20

- The loupe stays up where it last pointed when the pointer leaves the preview (so you can change sliders while it shows), and starts bottom right. Right-click pin is gone.
- Codec: Banding removed (Posterize does it).
- Settings › Defaults › Import also applies the imported effects, effect presets and transitions to the open set.
- Pool: Fit sets each GIF to the least resolution that covers its biggest placement in any scene (full, ½ or ¼); GIFs placed nowhere are left alone.
- The LFO shape buttons in the effect editor are taller.

## 0.99.6 — 2026-10-20

### Effects
- Freeze holds the whole picture, Bypass FX GIFs included (they kept playing over a frozen picture).
- During a transition, the arriving scene's Bypass FX GIFs are part of it, under its snow, tears and channel number, not on top of them.
- The effect editor's LFO button is greyed where no setting can have an LFO.

### GIFs
- Play › Trigger › Retrigger: Continue (carry on from where the fade is, as before) or Restart (fade in again from 0 on every hit).
- Auto › Flip H / Flip V: the heading is just the name; how it flips is in the tooltip.
- A changed section's mark is a dot.
- The Play tab has a tooltip.

### Layers
- Swapping Midground and Foreground also works when dropped on the other card's top bar (a sideways drag didn't count).
- The layer opacity readout is in the normal text colour, like other sliders.
- Mask › Alt colour brush: Soft widens the colour range much less, so a high Soft no longer lets almost every colour through.

### Interface
- Pool: right-click a GIF opens a small menu with Save GIF…, instead of saving straight away.
- Scenes heading: export and import sit in the middle, between the name and the bank switch.
- The tempo box has no tooltip (it covered the tempo).

## 0.99.5 — 2026-10-17

### Effects
- Glitch and Codec split by motion. Glitch has the moving styles: Slices, Blocks, Melt, plus Corrupt and Keyframe (from Codec). Codec has the still ones: Crunch and four new styles. Old sets, presets, defaults and GIF effects are converted. Where Codec was on with Corrupt or Keyframe, Glitch comes on instead.
  - Macroblock: each block keeps only its average and a slope, so the block grid shows.
  - Banding: gradients stepped into flat bands, the colour coarser than the brightness.
  - Chroma: colour at a fraction of the resolution, bleeding past edges.
  - Ringing: JPEG halos and mosquito noise along edges.
- Codec has no Rate: none of its styles move.
- Palettes without Dither keep more of the picture. The nearest colour is now judged by the eye-weighted RGB distance and the OKLab one together. OKLab alone flattened a picture of mostly one hue into one palette colour (a ginger cat all red on the ZX Spectrum).
- Dither:
  - Bayer no longer mixes far-apart colours. Orange on EGA was a red and green pattern, the right average but the wrong look.
  - Noise only dithers near the halfway point between two colours, so it's less grainy.
  - Checker no longer darkens midtones until detail vanishes (1-bit, Grey, CGA).
- The Game Boy palettes have no Dither again. DMG | Pocket | Light use its room, with full names.
- The Palette slider is wider, so ZX Spectrum fits. On narrow screens it reads Spectrum.

### GIFs
- Sections no longer fold. A changed section shows a mark where its arrow was.
- Colour Adjust starts off. Touching a slider switches it on.
- Trigger's switch is gone: Hit already chooses Loop, Hold or One shot.
- Shadow › Light: Turn, plus a new Floor option, a shadow flipped down from the GIF's bottom edge onto the ground in front.
- Auto: right-click Flip H or V in Transform opens its LFO. The graph shades where the GIF is flipped and dashes the 50% line.
- Sliders and the flip switches move with Auto's LFOs (the flips were missing).
- Cycle (GIF › Auto and the effect LFO) has an Even | Dotted | Triplet switch beside it. Triplets are new; every older value is in Even or Dotted.

### Layers
- Drag Midground's name onto Foreground (or back) to swap the two layers' contents. Undoable.
- The layer opacity slider reads Opacity and its value inside, like the other sliders.
- A Bypass FX GIF is no longer drawn over the layers above its own. It's cut where they cover it.
- Clicking a pad moves the edit layer to where its GIF plays, so Transform edits the GIF the GIF panel shows. Keys don't move it, and Scene pads still go to the Midground or Foreground you last edited.
- Mask › Alt colour brush: the colours come from what's under the masked thing (the layers below; on Background, the GIFs under the selected one).
- A dark chip's outline is judged by the GIF's edge too, so a black GIF with a bright middle gets it.

### Interface
- Reset and Clear buttons are the circular-arrow icon everywhere. "Reset all" has a dot in the middle.
- Sets is a folder icon and Save a disk icon.
- Headings: two styles only. Envelope and LFO in the effect editor are section headings, and pad group names and heading tags use the sans font.
- Tooltips rewritten short: one line, what it does, shortcuts after a ·.
- Settings › Theme: Background has a colour swatch like the other roles, with the same spacing above it.

## 0.99.4 — 2026-10-17

### Effects
- Colour › Palette: the Palette slider keeps the same width for every family, so the row no longer shifts as you step through them. Families without variants give the room to Dither.
- Greys are named by bits: 6 | 4 | 2 | 1 (64, 16, 4 and 2 shades). GIF › Display › Palette lists them as Grey 6-bit … Grey 1-bit.
- Dither works the same way on every palette. The second colour is still the one whose mix with the nearest comes closest to the original, but how much of it to use is now measured in linear light, the way the eye averages neighbouring pixels. A dithered area keeps the picture's brightness, where it used to come out darker or lighter depending on the palette. In a test over a range of colours, the dithered picture's error dropped by about a third on CGA, ZX Spectrum, EGA and 1-bit.
- Noise is now a dither pattern like the other two: the same two colours, with a fine even grain as the threshold instead of the Bayer grid. It used to nudge the colour before matching, so it behaved differently from palette to palette.
- The Game Boy palettes have Dither again (Bayer, in their four shades). The switch beside it is still the LCD (Off / Pixels / Dots); with Pixels or Dots the pattern follows the LCD's pixels.
- An Amount LFO now moves stacked CRT, Glitch and Codec styles that have their own Amount (VHS Wear, for example). Their share was worked out against the moving Amount, so the movement cancelled itself out.
- A slider under an LFO now moves with it: the effect's Amount, Rate and Size, and GIF › Transform, Opacity and Colour Adjust under GIF › Auto. It holds still while you drag it, and returns to its set value when the LFO stops.
- The LFO shape icons stay centred when the buttons are narrow (they ran off to the right below 1600 px).
- Codec › Crunch alone: Rate is dimmed. Crunch doesn't move, so Rate never did anything there.

### Pads & scenes
- Background: each GIF has its own mask. With a Background GIF selected, Mask paints on that GIF only, and what you mask shows the Background GIFs and colour under it. With none selected it is the whole layer's mask, as before. Saved with the set and scene files, copied with scenes, undoable.

### GIFs
- GIF › FX: each effect's icon comes after its name, like the effect pads.

### Interface
- Right-click MIDI in the top bar: Settings opens at the MIDI section.

## 0.99.3 — 2026-10-16

### Effects
- Colour › Palette: the slider steps through palette families (Grey, CGA, ZX Spectrum, C64, NES, EGA, Game Boy). A family's variants are a switch beside Dither: Grey Full | 16 | 4 | 1, CGA 1 | 2 | 3, Game Boy DMG | Pocket | Light. Saved sets keep their palettes.
- Palettes match colours in OKLab, a space where distance follows what the eye sees, here and in GIF › Display › Palette. With the old weighted-RGB match, greys beat real colours, so EGA and CGA pictures came out mostly grey with or without Dither. Every palette (except the Game Boys, which go by brightness) looks a little different, closer to the original colours.
- Dither (Bayer / Check) mixes the nearest colour with the one that brings the mix closest to the original. It used to take the second nearest, often a grey.

### GIFs
- One shot with fades: the Trigger graph keeps its shape on a retrigger. The dot starts further along the fade in, where it reaches the level the GIF was at. A retrigger on Smooth carries on along the same curve instead of starting a new one.
- A mostly black (or see-through) GIF's chip on a layer card has a dark grey outline, so it doesn't look like an empty square.

### Fixes
- Settings › Theme: Background's Saturation and Brightness were missing since 0.99.1 (the line that made them ended up inside a comment). The comment check in the tests now covers the shared code too.

## 0.99.2 — 2026-10-16

### Preview
- A right click on a GIF in the preview no longer shows "Cancelled": the right button started a drag that the right-click cancel then undid. Only the left button grabs now.

## 0.99.1 — 2026-10-16

### Interface
- Settings: the window can be dragged from its empty border as well as its title bar, and only its contents scroll (the scroll bar starts under the title bar, which stays put).
- Settings › Theme: Background is a row like the roles (its name on its hue's row, folding its saturation and brightness away), and every name lines up whether it folds or not (Graphs, Background, All-layers pips).

## 0.99.0 — 2026-10-15

### Effects
- The LFO box (right-click Amount, Rate or Size): Invert, Phase, Skew and Gap like the GIF LFOs; the sliders are smaller, with their names inside (Cycle, Min value, Max value). The envelope has an LFO view button (a sine) and the LFO box an envelope view button.
- Effect envelopes (and GIF › Auto › Envelope): drag the line between Decay and Gate up or down to set Sustain.
- Stacked styles (Glitch, Codec, CRT): the style whose settings show stays lit, the others dim.
- Colour › Palette: Grey 16 and Grey 4, where Dither shows (64 greys left nothing between two shades to dither).
- The Game Boy palettes (GB, GB Pocket, GB Light, also in GIF › Display) give each of their four shades an even share of the brightness range. GB Light's greens are all dark, so nearest-colour matching used to put most of the picture on one shade.

### GIFs
- GIF › FX: each effect has its icon. A click on a style switches the effect on (it used to need the switch first). Glitch, Codec and CRT stack like the effect pads: a click takes a style in or out, right-click solos it, right-click again brings the stack back.
- The GIF tabs: FX comes before Auto.
- Right-click the panel picture: the GIF as loaded (no key, colour, palette) or as drawn. Remembered.
- A GIF hidden from its chip (right-click) shows its chip greyed and crossed out. A CSS comment that was never closed had hidden that style since 0.95.

### Pads & scenes
- Scene import goes into the scene you're on when it's empty (else the first empty one of the bank on show). A scene with no name exports with no name (the file is called scene-N).
- The Scenes heading: numpad / CAPS·FX keep their full width, export and import sit before the bank buttons.

### Preview
- The loupe can be dragged anywhere on the preview (remembered; double-click: back to the corner). Right-click pins it on the spot it shows (blue border); right-click again lets it follow the pointer.

### Gear
- Launchpad layout: on the Pro MK3, ◀ ▶ (top left) step the scene banks and ▲ ▼ (left side) show scene pads bank 1 / 2. On the X and the Mini, the four arrows at the top. Loading the layout clears the arrows' 0.95 places (Session / Note).

### Fixes
- Music › Sync on play wasn't restored after a reload (the line was inside a comment).
- New test check: code or CSS rules hidden inside a comment fail the suite.

## 0.98.0 — 2026-10-15

### Performance
- Hovering the preview no longer reads GIF frames back from the GPU once they've been seen: each frame keeps a small copy (160 px on its long side) for picking. Before, the whole frame was read again every 250 ms while the pointer moved, about 80 stalls per 2 s over three GIFs.
- The full-size frame copies kept for clicks stay under 96 MB (oldest dropped first, and those of replaced GIFs). Before, every frame ever clicked on kept its copy while its GIF stayed loaded.

## 0.97.0 — 2026-10-15

### Performance
- A GIF with Colour settings or GIF › FX has each coloured frame worked out once and kept for the whole loop (up to 32–128 MB per GIF, dropped 15 s after the GIF stops being drawn). Before, only the last 2 were kept, so the GPU redid every frame on every loop.
- The live scene tile is redrawn only when the scene's make-up changes (GIFs, placement, layers, colour settings), not every second while GIFs play. Drawing it read the picture back from the GPU, which stalled a frame; it was the largest single cost in profiles.
- The preview and the output window share one downscale of each frame instead of each making its own.
- The redraw check no longer rebuilds each GIF's shadow and GIF-effect settings as text every frame.
- The sound meter does nothing while there's no sound.

## 0.96.0 — 2026-10-15

### GIFs
- GIF › FX: the GIF's own effects (Colour, Posterize, Pixel, Wobble, Glitch, Codec, CRT), each on / off with a style and an Amount. They run on that GIF alone, every frame while it plays, before its layer's effects and the effects on All. Each one costs a GPU pass. Saved with the GIF.
- Shadow › Skew: the shadow leans sideways from the GIF's bottom edge, like a light low to one side. Works with Crop.

### Music & rec
- Count-in › Play: after Rec, the take waits for the music player's Play and starts with it (the Rec button reads Play…).

### Interface
- Settings › Theme: Background folds its saturation and brightness away like the roles (click its heading).
- A window's × sits right in its corner.

## 0.95.0 — 2026-10-15

### Pads & scenes
- Scene export / import: ↓ on the Scenes heading saves the scene you're on as a .vjscene file (its pads, Background slots, layers, masks and name, with the GIF files). ↑, or dropping the file on the scenes, puts it in the first empty scene of the bank on show (or the empty tile it was dropped on); its GIFs join the pool. Ctrl+Z takes it out.
- Right-click a GIF chip on a layer card to hide that GIF (not drawn, not picked), to find which one is heavy; right-click again to bring it back.
- Copying a scene keeps its layers' masks, locks and transitions.

### Effects
- The editor's preview (dragging a slider or an envelope point) shows only in the preview while an output window is open or a take is recording; the output stays clean.
- Bypass FX now skips only its layer's effects: effects on All apply to it too.

### GIFs
- Auto: Flip H and Flip V targets (flipped while the LFO is above halfway). The targets sit six to a row.
- Auto › Skew reads 0% in the middle (−90 to +90%).
- Display: Opacity moved here from Transform; Smooth scaling and Bypass FX share a line.
- Colour Adjust › Reset and Swap colours › Clear also switch their section off, like Key › Clear. Shadow has a Reset.
- The picture at the top right is bigger (the tabs run full width under it) and stays on the first frame; Play › Frames' picture follows In / Out / Start.
- One shot: hitting it again mid-fade redraws the Trigger graph from the level it was at.

### Gear
- Launchpad layout: ▲ / ▼ step the scene banks, ◀ / ▶ show scene pads bank 1 / 2. Load the layout again to get them.

### Interface
- The envelope headers have Reset on the right. The mask tool icons are centred.

## 0.94.0 — 2026-10-15

### Effects
- The effect pads are regrouped. F1–F12 are now Colour, Posterize, Strobe, Feedback · Zoom, Shake, Wobble, Mirror · Pixel, Glitch, Codec, CRT.
  - Mono is gone: Colour › Palette starts with Grey and 1-bit (1-bit with Dither › Bayer is the old Mono › Dither).
  - Glitch keeps Slices, Blocks and Melt. Corrupt, Keyframe and Crunch move to the new Codec effect, so the two stack with their own Amount, Rate and Size.
  - Degauss moves to Strobe, where it swells and fades without flashing on the beat.
  - Older sets, presets, your saved defaults and MIDI mappings move with the effects.
- Effect LFOs: right-click Amount (or Rate / Size, where they have their plain meaning) and the envelope's box becomes that setting's LFO (shape, Cycle, Min, Max). A setting with an LFO shows ~ after its name. Saved with the set and copied into presets.
- Fixed: effects with both Rate and Size (Glitch, Shake…) showed only Size in 0.93.

### GIFs
- Auto › LFO › Cycle has dotted and triple steps: 3/8, 3/4, 1½, 3, 6 and 12 bars.

### Pads & scenes
- Background's GIFs are sublayers: with a Background GIF selected, the card's blend menu sets that GIF's own blend with the Background GIFs under it (Mask: cut out / keep inside work between them). Background as a whole always draws Normal (there is only black under it).

### Music & rec
- Settings › Recording › Source (also in Rec ▾): Output, or Window to record the whole VJif window for tutorials (Chrome asks which tab to share).
- With a microphone as the sound, a message says if Chrome kept its auto gain, noise suppression or echo cancelling on (they make the level move).

## 0.93.1 — 2026-10-15

### GIFs
- Pool: right-click a GIF to save its file (the original, as loaded). Ctrl+right-click still removes an unused one.

### Fixes
- The Background card could show 5 slots: Alt+hit (swap) on a Background GIF took the layer for itself and dropped the other slots' chips while their GIFs stayed loaded. Background now ignores swap, and a loaded slot always shows its chip.

## 0.93.0 — 2026-10-15

### GIFs
- Display › Bypass FX: that GIF is drawn on top of the effected picture, untouched by screen and layer effects (with its layer's opacity, blend and mask).
- Play › Loop length is a slider (1/16 to 16 bars).
- Play › Trigger › Repeat (One shot): plays the GIF by itself every 1/4 … 16 bars, on the beat grid; a hit still plays it at once.
- Pool: All full / ½ / ¼ sets the resolution of every GIF of the set at once.
- A GIF dropped on the Background card becomes the selected one.

### Pads & scenes
- Scene pads bank 2 play on R T Y F G H V B N (Shift+Q W E… still works); the pads show those letters. The scene bank keys wrap around (bank 1 back to 4).

### Interface
- Preview toolbar: a loupe (4× close-up at the cursor) for mask painting and pixel hunting.
- Mask mode: Alt+drag with the Free tool paints only where the layer has the colour you started on; Ctrl+wheel changes the brush size; Copy / Paste a mask between layers. The mask bar icons are all the same size.
- Effects panel: Follow comes first, All off has an X. Ghost and Current layer swapped places in the preview toolbar. A dragged transition chip is drawn smaller and offset, so the target shows.

### Fixes
- Wobble: the Edges (overscan) toggle shows again.

## 0.92.0 — 2026-10-15

### Effects
- Glitch and CRT with several styles stacked: Amount sets the style in focus only (click a lit style to focus it); each stacked style keeps its own Amount. With one style, or none in focus, Amount is the effect's, as before. Presets keep the per-style amounts.
- Dragging any slider in the effect editor (Amount, Rate, Size, a preset's effect's own) plays the effect, or the preset, over and over while you drag, so the change shows (with Preview on).

### Interface
- Settings › Theme: Signal is now Primary, Second is Secondary (right under Primary, with its own saturation and brightness), LCD is Info. Click a role's name to fold its saturation / brightness away (remembered).
- A window's × sits in its top right corner (Settings, Pool, Keys & mouse, About…).

## 0.91.0 — 2026-10-14

### Pads & scenes
- Scenes have four banks of nine (36 scenes). Numpad / and * step to the bank before / after, or use the 1–4 switch on the Scenes heading; the numpad plays the bank on show, and so does a MIDI control mapped to a first-bank scene. The strip follows the live scene when it changes from elsewhere (MIDI, BRB). BRB picks from every bank. Older sets open in bank 1.
- The Empty and Duplicate buttons under Scenes are gone: a scene's × (or Ctrl+click) empties it, Ctrl-drag copies it.

### GIFs
- The GIF tabs take the Signal colour and the choices inside them a second colour, set in Settings › Theme › Second.
- The eyedropper (Key, Swap) reads the GIF the panel edits, under the cursor, even where another GIF covers it, and no longer changes the selection.
- Auto › LFO: "Count from" is now "Sync to". Envelope › Loop has a square loop icon.
- Play › Frames keeps its own frame picture too (besides the one at the top right).

### Effects
- Shake and Wobble: the Edges toggle stands alone (no label); Rate's slider runs up to it.
- The effect editor's top row: FX Local, Follow, then All off.

### Transitions
- Glitch › Corrupt: the runs move only along the transition's direction (the slight sideways lean read as a drift down). Glitch's colour Split is stronger and shows from the start, so Clean / Split / Wide differ clearly.
- Transition presets: the dragged chip is the size of the preset.

### Interface
- Layer mask: opening the tools no longer moves anything on the card (the row keeps its margins).
- The Pool button shows its drop frame when files are held over it (its own drop handler stopped the one that set it).
- Pool stats are coloured (memory turns red past the warning level).
- Preview bar: "Current layer only" (was "This layer only").

### Music & rec
- Music player: "Sync on play" replaces "Music starts with Sync": playing the track from its start is also Sync (beat 1). To record a song from its start: Rec, then Play.

## 0.90.0 — 2026-10-14

### Pads & scenes
- Scene pads have a second bank: nine more per scene, played with Shift + QWE / ASD / ZXC. Tab (or the 1 / 2 switch on the Scene heading) flips which bank the grid shows; both play from the keys either way. A MIDI control mapped to a first-bank pad plays the bank on show.
- The Global pads moved to UIO / JKL / M,. — a free column between the two groups. Their pads, GIFs and MIDI mappings are the same.
- Shift + a Scene key plays bank 2 now; selecting a pad without playing it: right-click it (or Shift + a Global key).
- Transition presets drag like pads: onto another one swaps them; Ctrl (⌘) held copies, replacing the other once held over it until the red bar fills; a right click cancels.

### Preview
- "This layer only" (preview bar): clicks and hovering pick only GIFs on the selected layer.

### Effects
- Wobble › Edges, like Shake's: zoom in just enough that the frame edges never show (on by default).
- Glitch › Corrupt (effect and transition): broken blocks keep the picture's detail with the colour thrown off, instead of one flat colour each. The mosh kept copying those flat blocks, so after a while most of the picture went flat. In the effect, about one moshed block in 16 decodes right again each Rate; in the transition, broken runs show for one frame only.
- FX Local is an icon toggle in the effect editor's top row (with All off and Follow); it was a labelled button on the Scenes bar. Follow has a new icon: an arrow from the list down into the editor.

### GIFs
- The selected GIF's picture (the Play tab's frame preview) sits at the top right of the GIF panel, beside the heading and tabs, on every tab. The GIF heading no longer folds.
- The Transform / Play / Display / Auto tabs have their own highlight, so they read as the main categories over the choices inside them.
- Auto › Envelope › Loop: while the pad is held, the envelope starts over after Attack, Decay and Release; let go, it fades from where it is.
- Auto: Shift+click on Hold or Invert now sets every running LFO (it did nothing: the click came after the Shift state was cleared). The Sine icon is a true sine.
- The swap eyedropper's bulb is slimmer.

### Interface
- Layer mask tools take the blend mode's row only: opacity and the on / off transition stay visible. Every mask icon is the same size, centred.
- Mask Size / Soft: press the button and drag up / down to set it straight away; a click still opens the slider.
- Pool: the header shows the number of GIFs, their file size (what an export carries) and their memory once decoded (hover for details).
- The Pool button shows the same dashed frame as a pad when files are held over it.
- Keys & mouse: a small search box in the title bar (nothing shows through a gap any more), dotted leaders from each key to its description, and section titles ruled to the edge.

## 0.89.5 — 2026-10-14

### Preview
- Picking a GIF, new rules, no timing:
  - Hovering outlines the GIF a press would take. On the selected GIF, that's the selected one; elsewhere it's the GIF you actually see at that point: how much of its colour shows there, counting its opacity (Auto, fade), its layer's opacity and blend (black adds nothing in Add / Screen), and what covers it. Where nothing shows, the GIF with the closest visible pixels.
  - Press takes the outlined GIF and drags it at once.
  - A click without moving on the selected GIF steps to the next GIF under the pointer; the outline shows it right away. (Before: two clicks within 1.5 s cycled, so a press meant as a drag often cycled instead.)
  - Alt+click still cycles through everything under the pointer.
- A large GIF that shows nothing at a point (faded out, opacity 0, a mask layer's GIF, a transparent area) no longer takes the click from the GIF you see there.
- Auto: clicks find a GIF where Auto shows it now, not only in its box; the selected GIF gets a dotted outline at its live position.

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
