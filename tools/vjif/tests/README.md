# VJif browser tests

These are automated checks that drive the built page (`dist/vjif.html`) in headless Chromium through Playwright.
They catch crashes, script errors and render changes. What only a person can judge (real GPU, MIDI gear, uploads)
is in `../TESTS.md`.

```
node build.js                              # from the repo root: build first
python3 tools/vjif/tests/run_all.py        # every test; ok / FAIL per test
python3 tools/vjif/tests/run_all.py golden crt_stack -v   # some tests, with their output
```

## Requirements

- `pip install playwright pillow`.
- A Chromium. In the Claude cloud sandbox it is preinstalled; elsewhere, run `playwright install chromium`.
- WebGL runs on SwiftShader, a software GPU, so no graphics card is needed.

## How it works

- **`_env.py`** holds the paths: the built page, `fixtures/` and `out/`.
  - It makes the test GIFs on first use (`make_fixtures.py`). They are synthetic, so no third-party GIFs are in git.
  - Any script error on a page makes the test exit with code 3.
- **`golden.py`** renders every effect style and every transition from fixed inputs, then hashes the pictures.
  It compares the hashes with `golden_ref.json`.
  - Expect a difference when you change how something looks.
  - Once it looks right, run `golden.py --update` and commit the new reference with the change.
- **Screenshots** go to `out/`, which is not in git. Look at them when a test touches layout.

## Tests

| test | what it checks |
|---|---|
| smoke | Loads GIFs, hits pads, changes scenes, plays effects, undo / redo, Prep, autosave, FPS. |
| undo | Undo / redo of pad swaps, copies and emptied scenes, including after scenes are moved. |
| golden | Every effect style and transition renders the same as the reference. |
| render_size | Settings › Render at Full and 1/2: canvas sizes, draw time, the scene tile. |
| copy_pads | Drag a pad, then hold Ctrl: a copy; release Ctrl: a move; Ctrl+click: clear. |
| copy_scenes_presets | The same for effect presets and scenes, plus a swap without Ctrl. |
| fx_targets | Effect layer mask: toggles, right-click solo, and the per-layer mix. |
| crt_stack | CRT styles stack; Degauss stays on its own; the tile label. |
| stick_diagonal | A dragged GIF's centre sticks to a diagonal guide. |
| key_regions | Key › Everywhere / From edges / From pick, checked by transparency at known spots. |
| slider_labels | No slider label cut off, or running into its value, at 1600 and 1280 wide. |
| midi_learn | Learn bar placement, the opacity tag on the slider, Sync's message with MIDI clock. Uses a simulated MIDI input. |
| review_fixes | Regressions found in the 0.52 code review: copying an empty scene, a % in a URL name, the same file loading twice at once, BRB catching up after a hold, Smooth vs Stutter / Melt timing |
| gif_palette | GIF › Colour › Palette snaps to the palette (dither on), is saved with the set; Smoothing sits in GIF › Play |
| launchpad | Simulated Launchpad Pro MK3: Programmer-mode SysEx, the layout, LED colours, back to Live mode. |
