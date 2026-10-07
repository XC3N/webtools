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
- {r1} **MP4 recording** — Settings › Canvas › Recording: MP4. The file is .mp4, not a WebM fallback.
- {r2} **Upload the MP4 to Instagram or TikTok** — Chrome writes MP4s in a slightly unusual layout.
- {r3} **4- or 8-bar take** — starts on the next bar, counts down on Rec, loops cleanly when played back.
- {r4} **Long free recording** — 10+ minutes: stays smooth, file plays fine.

## Canvas formats
- {c1} **Switch formats with GIFs playing** — 16:9 → 9:16 → 1:1 → 4:5: preview, effects and output window follow.
- {c2} **Safe-zone guides in 9:16** — preview only, never in the output.
- {c3} **Format is saved with the set** — save a 9:16 set, load a 16:9 one, reload the first: back in 9:16.

## New in 0.9–0.12
- {n1} **Shift+click clearing** — pad, scene (name stays), effect preset, Pool GIF; resets an effect or transition preset. Ctrl+Z brings pads and scenes back.
- {n2} **Is the red under Shift too much?** — especially when using Shift+key to select pads.
- {n3} **Effect Release (Rel)** — Zoom on F5: Len holds at full, Rel fades. Also Rel on a Hold effect when you let go.
- {n4} **Old sets keep their sound** — load one of your existing sets: hit effects sound as before.
- {n5} **Scene tiles with pads but nothing playing** — show the first GIF, greyed.
- {n6} **What's new in About** — click the version number in the About title.
- {n7} **Drag pads** (0.12) — pad onto pad swaps (onto an empty pad: moves); pad onto a layer card puts the GIF there. A quick press still plays instantly; a drag doesn't leave the GIF playing.

## Open questions
- {q1} **Alt shortcuts on Windows** — Alt+E, Alt+F etc. don't open Chrome's menus.
- {q2} **Which MIDI controller do you use?** — decides the next MIDI work (BPM on a knob, LED feedback…).
