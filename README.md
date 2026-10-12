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

## Credits

UX & features design by XC3N · implementation & coding by Claude. Third-party code (mp4-muxer, MIT), typefaces, palette data and borrowed ideas are listed in [CREDITS.md](CREDITS.md); VJif shows the same list under About › Credits.

If these tools are useful to you, consider supporting the music at [xc3n.bandcamp.com](https://xc3n.bandcamp.com).

## Licence

[PolyForm Shield 1.0.0](LICENSE.md): the source is here to read; anyone can use the tools free (gigs and paid work included), change them and share them, keeping the licence and its `Required Notice` lines with every copy. What's not allowed: selling the tools, or using the code for a product that competes with them. Copies published before October 12, 2026 were under the MIT License.

The names "VJif" and "Bad MOPHO" and their logos aren't covered — forks need their own name. See [TRADEMARKS.md](TRADEMARKS.md).
