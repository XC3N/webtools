# VJif test list

What needs checking by hand, mostly things automated tests can't reach (real GPU, MIDI gear, Chrome's encoders,
uploads). New lines come in the same commit as the feature they cover. Ticked = checked by hand and working:
the ticks come from FYR's test bench (a private page; ids in `{braces}` match it) and are brought over at each
release. Want to help test? Pick an unticked line and open an issue with what you saw.

## Needs your gear
- [ ] {g1} **MIDI learn with your controller** — Settings › MIDI control › Learn → click a pad → hit a pad on the controller. Map a knob or fader to layer opacity and to effect Amt.
- [x] {g2} **MIDI mappings survive a reload** — reload VJif: mappings work again without re-learning.
- [x] {g3} **Controller unplugged at load** — Settings shows your input as "(not connected)".
- [ ] {g4} **MIDI clock from the DAW** (0.32: MIDI button in the top bar, input in Settings › MIDI) — a bar-length recording starts when the DAW starts and stops when it stops.
- [x] {lp1} **Launchpad lights** (0.43) — Settings › MIDI control › Lights on a Launchpad, then Launchpad layout: pads light in their GIF's colour, the live scene is white, effects light when on, Tap blinks on the beat. Untick: the Launchpad goes back to its own mode.
- [x] {lpmap} **Launchpad map** (0.47) — Settings › MIDI control › Map (or ? › Launchpad map): the picture matches where things are on your Launchpad and the colours match its lights.
- [x] {trgpu} **GPU transitions on your machine** (0.53) — Glitch › VHS, Glitch › Scramble, Dissolve (Pixel 2) at full render size, output full screen: smooth, LOAD lower than before, they look as they did.
- [x] {g5} **Performance on your GPU** — Feedback, Glitch and Luma especially, full screen in the output window. 0.40: LOAD should be lower, and pad hits / scene changes shouldn't hitch.

- [x] {rs1} **Render size on an older machine** (0.43) — Settings › Interface › Render 2/3 then 1/2: LOAD drops, the picture is softer but placed the same; a recording comes out at that size.

## Recording
- [x] {r1} **MP4 recording** — Settings › Recording › Video: H.264 · MP4. The file is .mp4, not a WebM fallback.
- [x] {r2} **Upload the MP4 to Facebook / Instagram / TikTok** (0.19: standard MP4, 30 fps, H.264 + AAC) — Chrome writes MP4s in a slightly unusual layout.
- [ ] {r3} **4- or 8-bar take** — starts on the next bar, counts down on Rec, loops cleanly when played back.
- [ ] {r4} **Long free recording** — 10+ minutes: stays smooth, file plays fine.
- [x] {fbk} **Feedback Length** (0.44) — F12 › Trails, Tunnel, Spiral: Length 100% leaves long smears, 20% only short ones.
- [x] {inlab} **Labels inside sliders** (0.45) — Transform, GIF › Colour / Auto, the effect editor, Settings: labels readable over the fill, nothing cut off at 1280×720, drag and double-click still work where the label is.
- [x] {dpat} **Palette patterns** (0.49) — F2 › Palette, Dither 100%, on a photo or a gradient: Dither: Noise, Bayer, Check each look different; Bayer reads like a DOS game.
- [x] {mtgt} **Effect on several layers** (0.50) — GIFs on layers 1–3, Mirror: click 2 (from All): layers 1, 3, 4 mirrored each on their own; right-click 3: only layer 3; lit buttons in the layers' colours.
- [ ] {cpy2} **Copy scenes and presets** (0.51) — drag a scene / an effect preset, hold Ctrl: + on the empty ones, drop: a copy; without Ctrl: a swap.
- [x] {diag} **Stick to diagonals** (0.51) — Diagonals (or Perspective) + Stick: drag a GIF near a diagonal, its centre slides onto it and the line lights up.
- [x] {crtstack} **Stacked CRT** (0.52) — F10: click VHS, Scanlines, Phosphor: all three at once; Degauss alone; GPU LOAD with three stacked.
- [x] {gpal} **GIF palette** (0.54) — GIF › Colour › Palette on one pad (e.g. Game Boy), Dither 50%: only that GIF changes; reload: still there.
- [x] {fxorder} **Palette, then VHS** (0.54) — F2 › Palette + F10 › VHS: the tape noise and colour bleed show over the palette.
- [x] {shiftlock} **Shift slides along a guide** (0.56) — Stick on, drag a GIF onto a third line, hold Shift: it only moves along that line (also on a diagonal).
- [ ] {txdrag} **Text onto a pad** (0.56) — Text…, type, drag the chip onto any pad: the window steps aside, the text lands there.
- [x] {vhsref} **VHS like the footage** (0.57) — CRT › VHS at Wear above ~50%: the wide band rolling down turns dark and streaky, with a green cast under it and a magenta line on top. Same trail in the Glitch › VHS transition.
- [x] {crtfocus} **Stacked CRT settings** (0.57) — CRT with VHS + Scan on: right-click VHS → the Size row reads Dropouts, right-click Scan → Size; neither switches off. One row of styles.
- [ ] {picker} **File picker speed** (0.57) — + Add / an empty pad: does the system picker open faster than before?
- [ ] {cpk} **Colour picker** (0.58) — Background colour, a colour swap, Text colours: VJif's picker opens under the swatch; sliders drag / scroll / arrows / double-click the number; hex field + Enter; Esc closes.
- [ ] {lfopeek} **Auto Min / Max preview** (0.58) — GIF › Auto › Rotate: drag Max: the GIF sits at that angle while you hold it, then goes back to moving.
- [x] {syncfx} **Sync keeps effects** (0.58) — latch an effect, press Sync: it stays on. Queue a pad for the next bar, press Sync: it starts at once.
- [x] {sclayers} **Empty scene layers on** (0.58) — empty a scene, or go to a new one: the four layer switches are on.
- [x] {lamps} **Flat toggles** (0.58.1) — every on / off toggle is a flat lamp: easy enough to hit? (Clicking its label works too.)
- [x] {chan} **Channel transition** (0.59) — Transitions › Glitch › Channel, 1/2 to 1 bar: snow, the new scene rolls in, a green number top right (a new one each time).
- [x] {fxkeys} **Effect layers by key** (0.60) — hold F1, press 1 and 3: Mono works on layers 1 + 3; 5: All; 5 again: 1 + 3 back. Let go of F1: 1–9 arm transitions again.
- [x] {allback} **All remembers** (0.60) — effect on layers 2 + 4, click All, click All again: 2 + 4 again.
- [ ] {recsnd} **Rec sound, long track** (0.61) — MP4, Sound: Music player, a long MP3, a timed take (e.g. 8 bars) while the interface is busy: is the sound clean?
- [ ] {mussync} **Music With Sync** (0.61) — track playing: Rec doesn't restart it, and it keeps playing after a timed take. Sync: the track starts from the top. Rec then Sync: the take and the song start together.
- [x] {ch20} **20 px controls** (0.62) — look around every panel (Settings, Sets, pool, Text, MIDI map): anything clipped or cramped?
- [ ] {scdrop} **Drop on a scene** (0.62) — drag GIF files or a pool GIF onto another scene's tile: they land on its first empty pads, you stay where you are.
- [x] {decsc} **Decoding mark** (0.62) — load a big GIF, switch scene at once: the pad on the new scene isn't marked as decoding.
- [ ] {aresetall} **Auto Reset all** (0.62) — GIF › Auto › Reset all: every LFO of the GIF off.
- [x] {fxlocal} **FX Local** (0.63) — FX: Local; scene 1: latch Mono; scene 2: latch Colour, unlatch Mono; back to 1: Mono on, Colour off. Global, change scenes: effects stay. Local again: the scene's own come back. With a transition: do they ease in / out nicely?
- [x] {fxmask} **Layer pips** (0.63) — effect tiles: "all" or four pips in the layers' colours, on their own line.
- [x] {dpat2} **Dither switch** (0.63) — Colour › Palette: Dither slider + Noise / Bayer / Check pictures beside it.
- [x] {vhsbeat} **VHS rolls on the beat** (0.64) — CRT › VHS at high Wear, and the VHS transition: the bands start rolling on beats, at random.
- [x] {chopts} **Channel options** (0.64) — Transitions › Glitch › Channel › Options: Random / Scene (name a scene first) / Scene #.
- [ ] {cpkmap} **Picker colour field** (0.64) — any swatch: click / drag in the field and the hue strip.
- [ ] {padsc} **Pad onto another scene** (0.64) — drag a pad, hold it over another scene's tile: the scene opens; drop on an empty pad: a copy.
- [x] {sccur} **Copy into this scene** (0.64) — on an empty scene, Ctrl+drag another scene onto its tile: it fills in place; Ctrl+Z undoes it.
- [x] {livebar} **Go live / leave BRB on the bar** (0.64) — Snap off: Enter in Prep waits for the next bar; in BRB a scene key changes on the next bar.
- [x] {fbghost} **Feedback fades out** (0.64) — Feedback Trails at a long Length, change scenes: no faint ghost of the old scene left.
- [ ] {recsnd2} **Rec sound (worklet)** (0.65) — MP4 with the music player (a long track), a timed take, busy scene: is the sound clean, in sync, and there to the end?
- [ ] {recpop} **Rec ▾** (0.65) — the ▾ next to Rec: bars / frame rate / Mb/s; same as in Settings.
- [ ] {musseek} **Music seek bar** (0.65) — under the player buttons: click / drag to move in the track; the pause button pauses.
- [x] {fxmodekey} **Mode by key** (0.65) — hold F2, press Ins / Home / PgUp: Hold / Hit / Latch. F-keys don't move the editor.
- [ ] {envreset} **Envelope reset** (0.65) — the ↺ above the envelope.
- [x] {vhsblur} **VHS soft at low wear** (0.65) — CRT › VHS at 5 %: the picture is already soft and smeared.
- [ ] {shadow} **GIF drop shadow** (0.66) — a GIF with transparency, GIF › Colour › Shadow: offset / blur / opacity / colour; it stays put when the GIF rotates.
- [ ] {croptile} **Crop + tile** (0.66) — crop a GIF, then Tile: the cropped part repeats.
- [x] {fxlocal2} **FX Local, fresh scenes** (0.66) — FX Local, go to a scene never visited in Local: no effects on. ⏻ turns everything off.
- [x] {toastpos} **Notes above the preview** (0.66) — any note (e.g. undo) appears between the layer cards and the preview.
- [x] {ctrlhush} **No delete after copying** (0.70) — Ctrl+drag a pad onto an empty pad, keep Ctrl down: no red outlines, and Ctrl+click doesn't clear anything until you let go of Ctrl and press it again.
- [x] {hbar} **Section buttons on their own row** (0.67) — Pads and Scenes: the buttons are on a row under the name; Clear pad is at the bottom right, dimmed on an empty pad.
- [x] {ez8ev63uoip1luh6y982} **Covered windows keep playing** (0.68) — output window over the control window, click the control window (so it covers the output): playback goes on, in both.
- [ ] {r14m2kk53etwcxadqka1} **Layer solo** (0.68) — right-click a layer's number: only that layer on; right-click it again: the others as they were.
- [x] {allpip} **All-layers pips** (0.68) — an effect on All: four pips in one colour; Settings › Interface › All-layers pips changes it.
- [x] {osdfx} **Transitions keep their own colours** (0.70) — latch Colour › Palette, change scene with TV › Channel: the snow and the number keep their colours; the two scenes have the palette.
- [ ] {qx05hugalvzxnl9opxvt} **With Sync in Rec ▾** (0.68) — Rec ▾ › Music starts with Sync does what With Sync did.
- [x] {sgjh9joapu33uxnftn46} **Transitions regrouped** (0.69) — Type is a 3 × 3 grid; Melt is under Dissolve, VHS and Channel under TV; the Style row never takes two lines. Old presets still play the same.
- [ ] {6c1mq3jcoix9tqtc6gc1} **BRB linked to Prep** (0.69) — fill 3+ scenes, turn on the chain, Enter: the output changes scenes every N bars (never to the one you edit; switch scenes to edit freely). Enter again: your scene goes live, BRB stops.
- [ ] {4ofgrromx5bbl2ig0jiv} **Count-in** (0.69) — Rec ▾ › Count-in 2, Rec: the button counts In 2, In 1, then records.
- [x] {1iff1fyq0m9ucq0tcjit} **Border click deselects** (0.70) — click in the grey border around the canvas, on nothing: no GIF selected, and it stays so (a big GIF sticking out doesn't get picked).
- [x] {0lme81rrpjbxw13t1i1o} **Music Play stays lit** (0.70) — Play: lit; Pause: still lit (play icon); Stop: off.
- [x] {vhspal} **VHS / Phosphor over a palette** (0.70) — latch Colour › Palette, add CRT › VHS + Scanlines (or Phosphor): only palette colours, no original colours showing through.
- [ ] {18g1ehdwbwsh9iit2nzy} **Rotation sticks** (0.71) — Stick on, turn a GIF by its round handle: it catches at 0 / 45 / 90° …; Alt turns freely.
- [ ] {envdef} **Envelope defaults** (0.71) — an effect in Hit: ↺ gives Gate 1/8, Release 1/8; in Hold / Latch: Release 1/32.
- [ ] {ccmisycd54ppu6dwywvg} **Folding sections** (0.72) — click Shadow (GIF › Colour) or the Transform heading: it folds; click again: back. Still folded after a reload.
- [ ] {sxli9h0fg4vdbo0jxj1i} **Swap › Pick** (0.72) — Swap colours › Pick, click a colour of the GIF in the preview: its swatch is selected and its row shows.
- [ ] {spwmb1r0v2aujdqh5oo3} **Random direction** (0.72) — a Slide preset, Options › Rnd: each scene change slides a different way.
- [ ] {5q2g5ddfh2lc6nluvmgb} **New rows scroll into view** (0.72) — the right column scrolled so Swap is at the bottom, click a swatch: the panel scrolls to show its row.
- [ ] {4etro6ow3de4f12yceir} **Mask layers** (0.73) — layer 4 blend Mask: cut out: its GIFs punch black holes through layers 1–3; Mask: keep inside: only what's under them stays.
- [ ] {a5gwta1vqomj7j9e8ov4} **Shadow crop** (0.73) — a GIF with a shadow, Shadow › Crop 60 %: only the shadow under its lower part stays.
- [ ] {yt2qowv5cyezsz6war3v} **LFO gap** (0.73) — Auto › X, Cycle 1 bar, Gap 1 bar: it moves for a bar, waits a bar, moves again.
- [ ] {ilmva106bf3hjfzv20pn} **Transition options** (0.73) — try each Options row: Wipe Soft, Iris GIF, Luma Dark / Soft, Zoom Out / Through, Dissolve Lines / Diamonds, Glitch Split / Wide, VHS Chewed, Stutter 1/32 + Swing.
- [ ] {ji9c5cqlzozra079aeix} **Scramble from the centre** (0.73) — Glitch › Scramble with a growing Amount: blocks grow from the middle, not towards a corner.
- [x] {g8ly5v6hm5rljvfab49h} **Scene over pads** (0.73) — drag a scene tile over the pads: no dotted outline, nothing happens on drop.
- [ ] {ocv7fifdfkezjtcdvqtn} **Dragging an effect leaves it alone** (0.74.1) — drag an effect tile (to a preset, or off and back): an effect that was off stays off, a latched one stays on.
- [ ] {6ehia9scebhs8gx0dtj6} **LFO envelope** (0.75) — GIF › Auto › Envelope: Depth on a Sine X LFO: each hit swings then fades back; hold the key with Sustain up: it keeps swinging until you let go. Only on Zoom: a punch per hit (Attack 0, Decay 1/4).
- [ ] {hr757smrqn2mmmwqnow0} **Launchpad preset row** (0.73) — Settings › Launchpad layout: bottom row = presets 7 8 9 4 5 6 1 2, right button 3.
- [ ] {uqfogckolx2naf4ogqdd} **Shorter right column** (0.74) — no info strips under Transform and GIF (hover the headings' tags instead), Performance on one line.
- [ ] {idfxcorner} **Effects toolbar + Trig Follow** (0.74) — top-left of the effect editor: ⏻ and Trig Follow. Follow on: an F-key opens that effect in the editor; off: it doesn't.
- [ ] {le351226yqjllwldpp40} **VCR channel font** (0.74) — TV › Channel: the number in the VCR OSD font.
- [ ] {credits} **Credits window** (0.74) — About › Credits: the list opens over About; Esc closes it.
- [ ] {thumbspeed} **Smoother with effects** (0.74) — heavy effects on, watch FPS: no hitch once a second (the scene tile's refresh).
- [ ] {o9fm7v1dndg06e2kzku7} **Key selection modes** (0.56) — load key-regions.gif (white background, a ring, two windows), GIF › Colour › Key on, Pick the white. Everywhere: all the white goes; From edges: only the background; From pick: only the white area you clicked.
- [x] {pvt} **Guides / Stick / Ghosts** (0.28.1: under the preview, centred) — each guide set; drag a GIF near a line, edge or the centre (Alt: free); Ghosts off hides faded one-shots.
- [x] {undo40} **Undo after moving scenes** (0.40) — clear a pad or empty a scene, drag scenes to other numbers, Ctrl+Z: it comes back in the right scene.
- [x] {kal2} **Kaleido slices** (0.40) — Mirror › Kaleido: Amount changes the number of slices.
- [x] {oldset} **An old set still loads** (0.40) — open one of your oldest saved sets: transitions and effects as before.
- [ ] {padcopy} **Copy a pad** (0.46) — drag a pad, then hold Ctrl (⌘): empty pads show a +, drop on one: a copy with its own settings, MEM barely moves. Release Ctrl before dropping: a move. Ctrl+click still clears.
- [ ] {merge} **Swap merge** (0.36) — a compressed GIF: raise Merge until the near-identical colours become one swatch.
- [x] {trslot} **Stutter** (0.34) — Transition › Stutter, Ramp and Even, 1-bar and 2-bar: cuts land on the beat grid and end on the new scene.
- [ ] {llook} **Lettering looks** (0.33, 0.35: box, accent with |, slant, UPPER, presets) — Text… › Preset, Fill / Outline / Shadow / Glow / Box and the second colour: chrome + neon, stripes + long shadow; they survive a reload and a format change.
- [ ] {midi2} **MIDI button** (0.32) — MIDI on: "no input" / "no clock" in place of the dots, gear flashes until Settings › MIDI › Clock from is set; DAW playing: the light is steady and the tempo follows.
- [ ] {defparts} **Defaults by part** (0.32) — untick Effects and Effect presets, Export: a transitions-only file; Import it elsewhere.
- [ ] {topbar} **Top bar** (0.31) — music (play, stop, loop, ⏏, level pop-up; loop / level survive a reload), BRB button + ▾ pop-up, ≈ rounds the tempo; at 1280×720 it's still one line.
- [ ] {pal2} **Palette + Dither** (0.31) — F2 › Palette: Amount picks the palette, Rate = Dither; on a photo-like GIF try GB with Dither 50%.
- [ ] {modes} **Mode switching** (0.31) — a slow-Attack effect switched to Latch is on at once; switched back to Hold it fades over Release.
- [ ] {guides2} **Guides combined** (0.31) — grid + diagonals + safe areas together; 9:16 safe zones come from the bar now.
- [ ] {ctrl} **Ctrl hint** (0.31) — hold Ctrl: nothing turns red until you hover a pad / scene / chip; Ctrl+Z doesn't flash.
- [ ] {clus} **Near-identical colours** (0.31) — a GIF with several blacks: one swatch, its swap changes all of them.
- [ ] {pal} **Colour › Palette** (0.30) — F2, style Palette: step through the palettes with the slider (CGA, EGA, C64, NES, Game Boys); Mirror › Kaleido Zoom.
- [ ] {envz} **Envelope editing** (0.30) — short envelopes are easy to grab; the ▶ preview plays while dragging (try Decay); ≡ switches to sliders.
- [ ] {crop} **Crop to content** (0.30) — a GIF with a see-through border (a sprite): Transform › Crop › To content.
- [ ] {utoast} **Undo says what changed** (0.30) — move a GIF, change opacity, crop: Ctrl+Z names it; Settings › Interface › Undo turns it off.
- [ ] {fold} **Fold pad sections** (0.30) — click QWE / ASD / ZXC: folded, keys still play, the panels below get the room.
- [ ] {txc} **Lettering centring and cut-out** (0.30) — Size 150%: text in the middle; Cut-out with big text zooms out; dragging Size is smooth.
- [ ] {drop} **Pad onto the preview** (0.26) — drag a pad onto the preview: on the edit layer, centred where dropped.
- [ ] {link} **Link X / Y, From centre** (0.26) — Transform: scale sliders together; preview handles from the centre.
- [ ] {ltr} **Layer transitions** (0.30: per layer, the select under each layer's opacity) — cut / armed / a preset; Shift+1–4 fades / wipes a layer in and out.
- [ ] {vhs} **Glitch › VHS** (0.30: heavier tracking, dropouts, flagging, head-switching noise).
- [ ] {crt} **CRT effect** (0.27) — F10: Scanlines, Phosphor, Degauss (as a Hit with a long Release).
- [ ] {res} **GIF Resolution** (0.27) — Play › Resolution ½ / ¼ on a big GIF: same size on screen, MEM drops; save / reload keeps it.
- [ ] {adsr} **Effect envelope** (0.29) — Env graph: Zoom as a Hit with Attack 1/8, Decay 1/4, Sustain 40%, Length 1 bar; Mono Hold with a slow Attack and Release; a preset with its own envelope.
- [ ] {pix} **Pixel art kept small** (0.28.1) — load the 1200×1056 Game Boy GIF: the info line says pixel art ×8, MEM is a few MB instead of 600+, it looks identical (crisp). A photo-like GIF says nothing.
- [ ] {phold} **Hold to remove from the pool** (0.28.1) — Pool: hover a GIF that's on pads, press and hold ×: the bar sweeps, then it's gone from the pool, its pads and layers (other scenes too). A quick click says where it is.
- [ ] {rhid} **Recording while the tab is hidden** (0.28.1) — no output window, start a free take, switch to another tab for 20 s, come back, stop: the clip moves the whole time.
- [ ] {rsync} **Sound in sync** (0.28.1) — an MP4 take with sound (music player, a track with a clear kick): the kick lines up with the beat flashes from the start.
- [x] {uiz} **Interface size** (0.28) — Settings › Interface › 80% / 90%: everything fits, dragging in the preview and the pads still lands where the pointer is.
- [ ] {defs} **My defaults** (0.28) — tweak effects / presets, Save as my defaults, new set: they're there; Export / Import.
- [ ] {fx28} **Effects** (0.28) — Zoom › Each in / out; Kaleido Amount = slices; Dither / Glitch / Scanlines Size; Latch off keeps the editor.
- [ ] {thumbs} **Scene tiles after reload** (0.28).
- [ ] {small} **Small window** (0.27) — at ~1280×720: nothing vanishes, cut text shows on hover, panels hint when they scroll.
- [ ] {pre} **Adjust an effect inside a preset** (0.25) — click a chip in a preset: change its style, layer, amount; ‹ name goes back.
- [ ] {int} **Interrupted transition** (0.25) — a 1-bar fade from 1 to 2, back to 1 at once: no jump.
- [ ] {glx} **Glitch styles** (0.24) — Transition › Glitch: Slices, Blocks, Melt, Scramble at a few Pixel sizes; F9 Glitch › Scramble.
- [ ] {sel} **Scene selection** (0.24) — select a GIF and a layer in scene 1, go to 2, select others, back to 1: as you left it.
- [ ] {mus} **Music player** (0.23) — Settings › Recording › Music: load an MP3, Sound: Music player, 8-bar take: the music starts on the bar with the clip and is in the file; reload: the track is still there.
- [ ] {tab} **Tab audio** (0.23) — Sound: Tab audio, play YouTube in another tab, press Rec, pick that tab with "Also share tab audio": its sound is in the file.
- [ ] {r5} **Recording settings** (0.20) — Settings › Recording: try HEVC and AV1, 60 fps, 40 Mb/s, Opus. The file plays at that rate (VLC › Codec info); an unsupported codec says so and records H.264.

## Canvas formats
- [x] {c1} **Switch formats with GIFs playing** — 16:9 → 9:16 → 1:1 → 4:5: preview, effects and output window follow.
- [x] {c2} **Safe-zone guides in 9:16** (0.31: the Safe guide in the bar under the preview) — preview only, never in the output.
- [x] {c3} **Format is saved with the set** — save a 9:16 set, load a 16:9 one, reload the first: back in 9:16.

## New in 0.9–0.13
- [x] {n1} **Ctrl+click deleting** (0.17) — pads, scenes (name stays), effect presets, layer chips, pool GIFs turn red with ✕ while Ctrl is held; Ctrl+Z brings pads and scenes back; right-click a chip selects it.
- [x] {n2} **Shift highlight** (0.14.2) — hold Shift: what a click clears turns red with a ✕; effects and transition presets (reset only) get a red outline.
- [x] {n3} **Effect Release (Rel)** — Zoom on F5: Len holds at full, Rel fades. Also Rel on a Hold effect when you let go.
- [x] {n4} **Old sets still look the same** — load an existing set: its hit effects fade out as before Release existed.
- [x] {n5} **Scene tile when GIFs are loaded but nothing plays** — load a GIF on a pad of an empty scene without triggering it: the tile shows it greyed.
- [x] {n6} **What's new in About** — click the version number in the About title.
- [x] {n7} **Drag pads** (0.12) — pad onto pad swaps (onto an empty pad: moves); pad onto a layer card puts the GIF there. A quick press still plays instantly; a drag doesn't leave the GIF playing; the chip follows the pointer (0.13.4).
- [x] {n8} **Mono › Dither** (0.13) — F1, style Dither: crisp black and white dots, also on one layer and full screen in the output window.
- [x] {n9} **Clean scene thumbnails** (0.13.1) — with effects on (output and per layer) or mid-transition, the scene tiles show only the GIFs.
- [x] {n10} **Version next to the logo** (0.13.2) — click it: About opens on What's new; the tempo controls sit further right.
- [x] {n11} **New logo** (0.14) — header and About: Russo One, chrome, "if" in magenta, slanted; nothing clipped at your display scaling.
- [x] {n12} **Slanted drag chips everywhere** (0.14.1) — dragging a layer chip, an effect tile or the effect name shows the same slanted chip as pads.
- [x] {n13} **Output window remembers its place** (0.15) — move it to the projector screen, close it, reopen: same place and size. Drag inside it to move it; Shift+click Output resets.
- [x] {i5} **Prep mode** (0.17: Enter toggles) — Enter: the output keeps the live scene while you edit any scene (with the output window open on a second screen); Enter again goes live with the transition.
- [x] {n15} **Frames under Play** (0.17) — In / Out / Start next to Loop.
- [x] {n16} **Recording with sound** (0.17) — Settings › Canvas › Sound: pick your interface or loopback; the file has audio in sync.
- [x] {n17} **Small ones** (0.17.1) — pool drags show the slanted chip; the About tagline rotates.
- [x] {n18} **Full-screen button** (0.18) — next to ⚙ and ?: the whole VJif window goes full screen and back.
- [x] {n19} **About footer** (0.18) — Show this at start + Play! at the lower right, credits on the left.
- [ ] {txt} **Lettering** (0.22) — Text…: your name in a few fonts, a marquee at 2 bars, a Cut-out over a busy GIF on a lower layer; Edit text; switch to 9:16 and back; save, reload, export / import the set.
- [ ] {brb} **BRB** (0.21) — under the scenes: fill 3 scenes, pick 4 bars, press BRB and walk away. It changes on the bar, skips empty scenes; try Shuffle and Random transitions; a scene key takes back control.
- [x] {n21} **Swap colours** (0.19) — GIF › Colour › Swap colours: click a palette swatch, pick its new colour; check it in the output and after reloading the set.

## Next up
- [ ] {i4} **Launchpad MK3** — first hardware integration: LED feedback (colours per GIF, playing / live / on states) and a layout for the 8×8 grid. After the basic MIDI learn test.
- [ ] {i3} **Hercules P32 DJ** (parked) — probably not needed if the Launchpad's fader mode covers knobs.

## Open questions
- none right now (Alt shortcuts: fine on Windows; controller: Hercules P32 DJ, layout to follow)
