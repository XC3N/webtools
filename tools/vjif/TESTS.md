# VJif test list

What still needs checking by hand, mostly things automated tests can't reach (real GPU, MIDI gear, Chrome's
encoders, uploads). Updated in the same commit as the feature it covers. Ticks live on FYR's test-bench page
(a private claude.ai page), which is kept in sync with this file: ids in `{braces}` match the page.

## Needs your gear
- {g1} **MIDI learn with your controller** — Settings › MIDI control › Learn → click a pad → hit a pad on the controller. Map a knob or fader to layer opacity and to effect Amt.
- {g2} **MIDI mappings survive a reload** — reload VJif: mappings work again without re-learning.
- {g3} **Controller unplugged at load** — Settings shows your input as "(not connected)".
- {g4} **MIDI clock from the DAW** — a bar-length recording starts when the DAW starts and stops when it stops.
- {g5} **Performance on your GPU** — Feedback, Glitch and Luma especially, full screen in the output window.

## Recording
- {r1} **MP4 recording** — Settings › Recording › Video: H.264 · MP4. The file is .mp4, not a WebM fallback.
- {r2} **Upload the MP4 to Facebook / Instagram / TikTok** (0.19: standard MP4, 30 fps, H.264 + AAC) — Chrome writes MP4s in a slightly unusual layout.
- {r3} **4- or 8-bar take** — starts on the next bar, counts down on Rec, loops cleanly when played back.
- {r4} **Long free recording** — 10+ minutes: stays smooth, file plays fine.
- {r5} **Recording settings** (0.20) — Settings › Recording: try HEVC and AV1, 60 fps, 40 Mb/s, Opus. The file plays at that rate (VLC › Codec info); an unsupported codec says so and records H.264.

## Canvas formats
- {c1} **Switch formats with GIFs playing** — 16:9 → 9:16 → 1:1 → 4:5: preview, effects and output window follow.
- {c2} **Safe-zone guides in 9:16** — preview only, never in the output.
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
