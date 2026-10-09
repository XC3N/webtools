# XC3N web tools

VibeCoded Browser tools for music and visuals. While AI was used for the totality of the code, hundreds of hours of human time was also put into designing, refining and testing the UX and UI.

| Tool | What it does |
|---|---|
| **[VJif](tools/vjif/)** | GIF VJ tool: 18 keyboard pads, 9 scenes with transitions, 4 blended layers, screen effects, BPM / tap / MIDI-clock sync, live colour key and HSV, automation, mouse transform handles, sets saved in the browser and exported as `.vjif` files. *Actually, it's pronounced vjif.* [Changelog](tools/vjif/CHANGELOG.md) |
| **[Bad MOPHO](tools/bad-mopho/)** | Web MIDI editor and librarian for the Dave Smith Instruments Mopho. |

**Use them online:** https://xc3n.github.io/webtools/
**Use them offline:** download the file from the site (or build it, below) and open it in Chrome.

## Layout

```
tools/<tool>/      a tool's source + tool.json (name, entry file, output file, description)
tools/vjif/src/    VJif's code in parts (core, pool, scenes, effects, record…), included by vjif.html
common/            code shared between tools (see common/README.md)
build.js           inlines includes → dist/<tool>.html + dist/index.html
.github/workflows  builds and publishes dist/ to GitHub Pages on every push to main
```

## Building

```
node build.js
```

Node 18+, no dependencies. Output goes to `dist/` (not committed — GitHub Actions builds it).
Tool sources can include shared files with `<!-- @include common/file.css -->` or `/* @include common/file.js */`,
and a Markdown file as HTML with `<!-- @markdown tools/vjif/CHANGELOG.md -->` (VJif's About panel shows its changelog this way).

## Conventions

- Output is always a single self-contained HTML file. External requests are limited to web fonts, which fall back to system fonts offline.
- UI follows the shared design language and its layout-stability rules: readouts have fixed widths, context-dependent text lives in fixed boxes, swapped controls share one slot sized to the largest, unavailable controls are dimmed in place. See the comment at the top of each tool's stylesheet.
- Desktop Chrome is the target browser (WebCodecs, Web MIDI, OffscreenCanvas).

## Third-party code

- [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) 5.2.2 (MIT) in `common/vendor/`, used by VJif to write MP4 recordings.

## Credits

UX & features design by XC3N · implementation & coding by Claude.

Apart from the vendored library above, the code is written for these tools rather than copied from other projects. What they borrow is listed here, and the list is updated in the same commit as whatever adds to it.

- Typefaces, loaded from Google Fonts: Instrument Sans, JetBrains Mono (JetBrains), and for VJif's Lettering Russo One, Anton, Bebas Neue, Bungee, Monoton, Orbitron, Press Start 2P, Rubik Mono One, Righteous (all SIL Open Font License) and Permanent Marker (Apache License 2.0).
- VJif Colour › Palette data: the C64 colours are Philip "Pepto" Timmermann's palette (pepto.de); the CGA, EGA, NES and Game Boy colours as listed in Wikipedia's "List of video game console palettes".
- Ideas, not code: the Glitch › Melt transition follows the Doom screen wipe (id Software, 1993); Pay-TV follows analogue cable sync suppression, Crypt follows Videocrypt's cut-and-rotate and Nagravision Syster's line shuffling; ordered dithering uses Bayer's matrix (Bryce Bayer, 1973).

If these tools are useful to you, consider supporting the music at [xc3n.bandcamp.com](https://xc3n.bandcamp.com).

## Licence

[MIT](LICENSE) — use, change, share and sell it freely; keep the copyright notice.

The names "VJif" and "Bad MOPHO" and their logos aren't covered — forks need their own name. See [TRADEMARKS.md](TRADEMARKS.md).
