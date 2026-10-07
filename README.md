# XC3N web tools

Browser tools for music and visuals. Each tool ships as **one standalone HTML file**: open it in Chrome, from
the website or from your disk, and it works — no install, no server, offline once loaded.

| Tool | What it does |
|---|---|
| **[VJif](tools/vjif/)** | GIF VJ tool: 18 keyboard pads, 9 scenes with transitions, 4 blended layers, screen effects, BPM / tap / MIDI-clock sync, live colour key and HSV, automation, mouse transform handles, sets saved in the browser and exported as `.vjif` files. *Actually, it's pronounced vjif.* [Changelog](tools/vjif/CHANGELOG.md) |
| **[Bad MOPHO](tools/bad-mopho/)** | Web MIDI editor and librarian for the Dave Smith Instruments Mopho. |

**Use them online:** https://xc3n.github.io/webtools/ (after the first deploy)
**Use them offline:** download the file from the site (or build it, below) and open it in Chrome.

## Layout

```
tools/<tool>/      a tool's source + tool.json (name, entry file, output file, description)
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
Typefaces: Instrument Sans and JetBrains Mono (JetBrains), SIL Open Font License, loaded from Google Fonts.

If these tools are useful to you, consider supporting the music at [xc3n.bandcamp.com](https://xc3n.bandcamp.com).

## Licence

[MIT](LICENSE) — use, change, share and sell it freely; keep the copyright notice.

The names "VJif" and "Bad MOPHO" and their logos aren't covered — forks need their own name. See [TRADEMARKS.md](TRADEMARKS.md).
