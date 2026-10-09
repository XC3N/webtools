# common/

Code shared between tools, inlined into each tool's single HTML file by `build.js`
(`<!-- @include common/… -->` or `/* @include common/… */`).

Rule of thumb: move something here when a **second** tool needs it, not before — or when it's a
standard every tool should follow (UI rules, control behaviour, theming).

A tool's source file that uses includes doesn't run on its own: open the built file in `dist/`
(`node build.js`), which is what GitHub Pages serves.

In use:

- `util.js` — `Prefs` (per-browser settings in localStorage, every access guarded) and `saveFile(data, name, type)` (a download).
  Used by VJif, Logo Lab and Bad MOPHO (and by `theme.js` for theme export, so include it first).
- `controls.js` + `controls.css` — the control behaviour standard from Bad MOPHO, for sliders:
  double-click resets to default (`data-def`), mouse wheel (dwell-gated) and hover + arrow keys adjust,
  double-click the number to type a value (single clicks and drags on it go to the slider). Dropdowns (`<select>`) and `.seg` button groups (not `.tabs`) get the
  same wheel (down = next option) and hover + arrows (Down/Right = next). Any control a tool adds with these
  elements follows the standard automatically; opt out with `data-no-ctl`. Used by VJif, Logo Lab and Bad MOPHO
  (Bad MOPHO's keyboard sliders opt out with `data-no-ctl`; its knobs and custom dropdowns aren't native controls, so they keep their own handling). `Controls.skipKeys(fn)` lets a tool keep the arrow keys while it needs them.
- `theme.js` + `theme.css` — Bad MOPHO's theming engine: four role hues — Controls, LCD,
  Curves, Meters (Controls and LCD optionally with saturation / brightness) — and a background hue / saturation / brightness turned into the CSS colour tokens, the
  four presets (Matte is the default), JSON import / export (same file as Bad MOPHO, so themes move between tools) and an editor
  (`Theme.mount`). Used by VJif (Settings) and Bad MOPHO (Settings › Theme). The default is the Matte preset.

Planned (currently living inside Bad MOPHO and VJif):

- `ui-kit.css` — theme tokens and base controls (panels, LCD readouts, segmented buttons, switches, sliders, scrollbars, modals, toast) plus the layout-stability rules
- `dropdown.js` — themed dropdown that can't hijack keyboard typing
- `midi.js` — Web MIDI device pickers, clock in, controller input
- `store.js` — IndexedDB key/value wrapper
- `zip.js` — minimal ZIP writer/reader
