# VJif test list

What still needs checking by hand, mostly things automated tests can't reach (real GPU, MIDI gear, Chrome's
encoders, uploads). Updated in the same commit as the feature it covers. Ticks live on FYR's test-bench page
(a private claude.ai page), which is kept in sync with this file: ids in `{braces}` match the page.

## Needs your gear
- {g1} **MIDI learn with your controller** — Settings › MIDI control › Learn → click a pad → hit a pad on the controller. Map a knob or fader to layer opacity and to effect Amt.
- {g2} **MIDI mappings survive a reload** — reload VJif: mappings work again without re-learning.
- {g3} **Controller unplugged at load** — Settings shows your input as "(not connected)".
- {g4} **MIDI clock from the DAW** (0.32: MIDI button in the top bar, input in Settings › MIDI) — a bar-length recording starts when the DAW starts and stops when it stops.
- {lp1} **Launchpad lights** (0.43) — Settings › MIDI control › Lights on a Launchpad, then Launchpad layout: pads light in their GIF's colour, the live scene is white, effects light when on, Tap blinks on the beat. Untick: the Launchpad goes back to its own mode.
- {g5} **Performance on your GPU** — Feedback, Glitch and Luma especially, full screen in the output window. 0.40: LOAD should be lower, and pad hits / scene changes shouldn't hitch.

- {rs1} **Render size on an older machine** (0.43) — Settings › Interface › Render 2/3 then 1/2: LOAD drops, the picture is softer but placed the same; a recording comes out at that size.

## Recording
- {r1} **MP4 recording** — Settings › Recording › Video: H.264 · MP4. The file is .mp4, not a WebM fallback.
- {r2} **Upload the MP4 to Facebook / Instagram / TikTok** (0.19: standard MP4, 30 fps, H.264 + AAC) — Chrome writes MP4s in a slightly unusual layout.
- {r3} **4- or 8-bar take** — starts on the next bar, counts down on Rec, loops cleanly when played back.
- {r4} **Long free recording** — 10+ minutes: stays smooth, file plays fine.
- {fbk} **Feedback Length** (0.44) — F12 › Trails, Tunnel, Spiral: Length 100% leaves long smears, 20% only short ones.
- {pvt} **Guides / Stick / Ghosts** (0.28.1: under the preview, centred) — each guide set; drag a GIF near a line, edge or the centre (Alt: free); Ghosts off hides faded one-shots.
- {undo40} **Undo after moving scenes** (0.40) — clear a pad or empty a scene, drag scenes to other numbers, Ctrl+Z: it comes back in the right scene.
- {kal2} **Kaleido slices** (0.40) — Mirror › Kaleido: Amount changes the number of slices.
- {oldset} **An old set still loads** (0.40) — open one of your oldest saved sets: transitions and effects as before.
- {padcopy} **Copy a pad** (0.36) — Ctrl+drag a pad onto an empty one: a copy with its own settings; MEM barely moves. Ctrl+click still clears.
- {merge} **Swap merge** (0.36) — a compressed GIF: raise Merge until the near-identical colours become one swatch.
- {trslot} **Stutter** (0.34) — Transition › Stutter, Ramp and Even, 1-bar and 2-bar: cuts land on the beat grid and end on the new scene.
- {llook} **Lettering looks** (0.33, 0.35: box, accent with |, slant, UPPER, presets) — Text… › Preset, Fill / Outline / Shadow / Glow / Box and the second colour: chrome + neon, stripes + long shadow; they survive a reload and a format change.
- {midi2} **MIDI button** (0.32) — MIDI on: "no input" / "no clock" in place of the dots, gear flashes until Settings › MIDI › Clock from is set; DAW playing: the light is steady and the tempo follows.
- {defparts} **Defaults by part** (0.32) — untick Effects and Effect presets, Export: a transitions-only file; Import it elsewhere.
- {topbar} **Top bar** (0.31) — music (play, stop, loop, ⏏, level pop-up; loop / level survive a reload), BRB button + ▾ pop-up, ≈ rounds the tempo; at 1280×720 it's still one line.
- {pal2} **Palette + Dither** (0.31) — F2 › Palette: Amount picks the palette, Rate = Dither; on a photo-like GIF try GB with Dither 50%.
- {modes} **Mode switching** (0.31) — a slow-Attack effect switched to Latch is on at once; switched back to Hold it fades over Release.
- {guides2} **Guides combined** (0.31) — grid + diagonals + safe areas together; 9:16 safe zones come from the bar now.
- {ctrl} **Ctrl hint** (0.31) — hold Ctrl: nothing turns red until you hover a pad / scene / chip; Ctrl+Z doesn't flash.
- {clus} **Near-identical colours** (0.31) — a GIF with several blacks: one swatch, its swap changes all of them.
- {pal} **Colour › Palette** (0.30) — F2, style Palette: step through the palettes with the slider (CGA, EGA, C64, NES, Game Boys); Mirror › Kaleido Zoom.
- {envz} **Envelope editing** (0.30) — short envelopes are easy to grab; the ▶ preview plays while dragging (try Decay); ≡ switches to sliders.
- {crop} **Crop to content** (0.30) — a GIF with a see-through border (a sprite): Transform › Crop › To content.
- {utoast} **Undo says what changed** (0.30) — move a GIF, change opacity, crop: Ctrl+Z names it; Settings › Interface › Undo turns it off.
- {fold} **Fold pad sections** (0.30) — click QWE / ASD / ZXC: folded, keys still play, the panels below get the room.
- {txc} **Lettering centring and cut-out** (0.30) — Size 150%: text in the middle; Cut-out with big text zooms out; dragging Size is smooth.
- {drop} **Pad onto the preview** (0.26) — drag a pad onto the preview: on the edit layer, centred where dropped.
- {link} **Link X / Y, From centre** (0.26) — Transform: scale sliders together; preview handles from the centre.
- {ltr} **Layer transitions** (0.30: per layer, the select under each layer's opacity) — cut / armed / a preset; Shift+1–4 fades / wipes a layer in and out.
- {vhs} **Glitch › VHS** (0.30: heavier tracking, dropouts, flagging, head-switching noise).
- {crt} **CRT effect** (0.27) — F10: Scanlines, Phosphor, Degauss (as a Hit with a long Release).
- {res} **GIF Resolution** (0.27) — Play › Resolution ½ / ¼ on a big GIF: same size on screen, MEM drops; save / reload keeps it.
- {adsr} **Effect envelope** (0.29) — Env graph: Zoom as a Hit with Attack 1/8, Decay 1/4, Sustain 40%, Length 1 bar; Mono Hold with a slow Attack and Release; a preset with its own envelope.
- {pix} **Pixel art kept small** (0.28.1) — load the 1200×1056 Game Boy GIF: the info line says pixel art ×8, MEM is a few MB instead of 600+, it looks identical (crisp). A photo-like GIF says nothing.
- {phold} **Hold to remove from the pool** (0.28.1) — Pool: hover a GIF that's on pads, press and hold ×: the bar sweeps, then it's gone from the pool, its pads and layers (other scenes too). A quick click says where it is.
- {rhid} **Recording while the tab is hidden** (0.28.1) — no output window, start a free take, switch to another tab for 20 s, come back, stop: the clip moves the whole time.
- {rsync} **Sound in sync** (0.28.1) — an MP4 take with sound (music player, a track with a clear kick): the kick lines up with the beat flashes from the start.
- {uiz} **Interface size** (0.28) — Settings › Interface › 80% / 90%: everything fits, dragging in the preview and the pads still lands where the pointer is.
- {defs} **My defaults** (0.28) — tweak effects / presets, Save as my defaults, new set: they're there; Export / Import.
- {fx28} **Effects** (0.28) — Zoom › Each in / out; Kaleido Amount = slices; Dither / Glitch / Scanlines Size; Latch off keeps the editor.
- {thumbs} **Scene tiles after reload** (0.28).
- {small} **Small window** (0.27) — at ~1280×720: nothing vanishes, cut text shows on hover, panels hint when they scroll.
- {pre} **Adjust an effect inside a preset** (0.25) — click a chip in a preset: change its style, layer, amount; ‹ name goes back.
- {int} **Interrupted transition** (0.25) — a 1-bar fade from 1 to 2, back to 1 at once: no jump.
- {glx} **Glitch styles** (0.24) — Transition › Glitch: Slices, Blocks, Melt, Scramble at a few Pixel sizes; F9 Glitch › Scramble.
- {sel} **Scene selection** (0.24) — select a GIF and a layer in scene 1, go to 2, select others, back to 1: as you left it.
- {mus} **Music player** (0.23) — Settings › Recording › Music: load an MP3, Sound: Music player, 8-bar take: the music starts on the bar with the clip and is in the file; reload: the track is still there.
- {tab} **Tab audio** (0.23) — Sound: Tab audio, play YouTube in another tab, press Rec, pick that tab with "Also share tab audio": its sound is in the file.
- {r5} **Recording settings** (0.20) — Settings › Recording: try HEVC and AV1, 60 fps, 40 Mb/s, Opus. The file plays at that rate (VLC › Codec info); an unsupported codec says so and records H.264.

## Canvas formats
- {c1} **Switch formats with GIFs playing** — 16:9 → 9:16 → 1:1 → 4:5: preview, effects and output window follow.
- {c2} **Safe-zone guides in 9:16** (0.31: the Safe guide in the bar under the preview) — preview only, never in the output.
- {c3} **Format is saved with the set** — save a 9:16 set, load a 16:9 one, reload the first: back in 9:16.

## New in 0.9–0.13
- {n1} **Ctrl+click deleting** (0.17) — pads, scenes (name stays), effect presets, layer chips, pool GIFs turn red with ✕ while Ctrl is held; Ctrl+Z brings pads and scenes back; right-click a chip selects it.
- {n2} **Shift highlight** (0.14.2) — hold Shift: what a click clears turns red with a ✕; effects and transition presets (reset only) get a red outline.
- {n3} **Effect Release (Rel)** — Zoom on F5: Len holds at full, Rel fades. Also Rel on a Hold effect when you let go.
- {n4} **Old sets still look the same** — load an existing set: its hit effects fade out as before Release existed.
- {n5} **Scene tile when GIFs are loaded but nothing plays** — load a GIF on a pad of an empty scene without triggering it: the tile shows it greyed.
- {n6} **What's new in About** — click the version number in the About title.
- {n7} **Drag pads** (0.12) — pad onto pad swaps (onto an empty pad: moves); pad onto a layer card puts the GIF there. A quick press still plays instantly; a drag doesn't leave the GIF playing; the chip follows the pointer (0.13.4).
- {n8} **Mono › Dither** (0.13) — F1, style Dither: crisp black and white dots, also on one layer and full screen in the output window.
- {n9} **Clean scene thumbnails** (0.13.1) — with effects on (output and per layer) or mid-transition, the scene tiles show only the GIFs.
- {n10} **Version next to the logo** (0.13.2) — click it: About opens on What's new; the tempo controls sit further right.
- {n11} **New logo** (0.14) — header and About: Russo One, chrome, "if" in magenta, slanted; nothing clipped at your display scaling.
- {n12} **Slanted drag chips everywhere** (0.14.1) — dragging a layer chip, an effect tile or the effect name shows the same slanted chip as pads.
- {n13} **Output window remembers its place** (0.15) — move it to the projector screen, close it, reopen: same place and size. Drag inside it to move it; Shift+click Output resets.
- {i5} **Prep mode** (0.17: Enter toggles) — Enter: the output keeps the live scene while you edit any scene (with the output window open on a second screen); Enter again goes live with the transition.
- {n15} **Frames under Play** (0.17) — In / Out / Start next to Loop.
- {n16} **Recording with sound** (0.17) — Settings › Canvas › Sound: pick your interface or loopback; the file has audio in sync.
- {n17} **Small ones** (0.17.1) — pool drags show the slanted chip; the About tagline rotates.
- {n18} **Full-screen button** (0.18) — next to ⚙ and ?: the whole VJif window goes full screen and back.
- {n19} **About footer** (0.18) — Show this at start + Play! at the lower right, credits on the left.
- {txt} **Lettering** (0.22) — Text…: your name in a few fonts, a marquee at 2 bars, a Cut-out over a busy GIF on a lower layer; Edit text; switch to 9:16 and back; save, reload, export / import the set.
- {brb} **BRB** (0.21) — under the scenes: fill 3 scenes, pick 4 bars, press BRB and walk away. It changes on the bar, skips empty scenes; try Shuffle and Random transitions; a scene key takes back control.
- {n21} **Swap colours** (0.19) — GIF › Colour › Swap colours: click a palette swatch, pick its new colour; check it in the output and after reloading the set.

## Next up
- {i4} **Launchpad MK3** — first hardware integration: LED feedback (colours per GIF, playing / live / on states) and a layout for the 8×8 grid. After the basic MIDI learn test.
- {i3} **Hercules P32 DJ** (parked) — probably not needed if the Launchpad's fader mode covers knobs.

## Open questions
- none right now (Alt shortcuts: fine on Windows; controller: Hercules P32 DJ, layout to follow)
