# common/

Code shared between tools, inlined into each tool's single HTML file by `build.js`
(`<!-- @include common/… -->` or `/* @include common/… */`).

Rule of thumb: move something here when a **second** tool needs it, not before.

Planned candidates (currently living inside Bad MOPHO and VJif):

- `ui-kit.css` — theme tokens and base controls (panels, LCD readouts, segmented buttons, switches, sliders, scrollbars, modals, toast) plus the layout-stability rules
- `dropdown.js` — themed dropdown that can't hijack keyboard typing
- `wheel.js` — wheel-to-adjust with settle detection
- `midi.js` — Web MIDI device pickers, clock in, controller input
- `store.js` — IndexedDB key/value wrapper
- `zip.js` — minimal ZIP writer/reader
