# common/

Code shared between tools, inlined into each tool's single HTML file by `build.js`
(`<!-- @include common/… -->` or `/* @include common/… */`).

Rule of thumb: move something here when a **second** tool needs it, not before — or when it's a
standard every tool should follow (UI rules, control behaviour, theming).

A tool's source file that uses includes doesn't run on its own: open the built file in `dist/`
(`node build.js`), which is what GitHub Pages serves.

In use:

- `controls.js` + `controls.css` — the control behaviour standard from Bad MOPHO, for sliders:
  double-click resets to default (`data-def`), mouse wheel (dwell-gated) and hover + arrow keys adjust,
  click the readout to type a value. Used by VJif; Bad MOPHO still has its own version (knobs) and can
  move onto this later.

Planned (currently living inside Bad MOPHO and VJif):

- `theme/` — Bad MOPHO's theming engine (theme JSON, palette tokens), to be shared with VJif
- `ui-kit.css` — theme tokens and base controls (panels, LCD readouts, segmented buttons, switches, sliders, scrollbars, modals, toast) plus the layout-stability rules
- `dropdown.js` — themed dropdown that can't hijack keyboard typing
- `midi.js` — Web MIDI device pickers, clock in, controller input
- `store.js` — IndexedDB key/value wrapper
- `zip.js` — minimal ZIP writer/reader
