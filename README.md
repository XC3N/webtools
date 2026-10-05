# XC3N web tools

Browser tools for music and visuals. Each tool ships as **one standalone HTML file**: open it in Chrome, from
the website or from your disk, and it works — no install, no server, offline once loaded.

| Tool | What it does |
|---|---|
| **[VJif](tools/vjif/)** | GIF VJ tool: 18 keyboard pads, 4 blended layers, BPM / tap / MIDI-clock sync, live colour key and HSV, mouse transform handles, sets saved in the browser and exported as `.vjif` files. *Actually, it's pronounced vjif.* |
| **[Mopho Programmer](tools/mopho/)** | Web MIDI editor and librarian for the Dave Smith Instruments Mopho. |

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
Tool sources can include shared files with `<!-- @include common/file.css -->` or `/* @include common/file.js */`.

## Conventions

- Output is always a single self-contained HTML file. External requests are limited to web fonts, which fall back to system fonts offline.
- UI follows the shared design language and its layout-stability rules: readouts have fixed widths, context-dependent text lives in fixed boxes, swapped controls share one slot sized to the largest, unavailable controls are dimmed in place. See the comment at the top of each tool's stylesheet.
- Desktop Chrome is the target browser (WebCodecs, Web MIDI, OffscreenCanvas).

## Credits

UX & features design by XC3N · implementation & coding by Claude.
Typefaces: Archivo (Omnibus-Type) and JetBrains Mono (JetBrains), SIL Open Font License, loaded from Google Fonts.

If these tools are useful to you, consider supporting the music at [xc3n.bandcamp.com](https://xc3n.bandcamp.com).

## Licence

Licensed by XC3N under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/): free to use, share and adapt, with credit, for non-commercial purposes.
Using the tools in your own work is fine, **including paid gigs, streams, videos and commissions** — what's excluded is selling, sublicensing or bundling the tools or their code (or modified versions) for money. Details in [LICENSE](LICENSE).

The names "VJif" and "Mopho Programmer" and their logos aren't covered — forks need their own name. See [TRADEMARKS.md](TRADEMARKS.md).
