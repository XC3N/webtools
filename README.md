# XC3N web tools

VibeCoded Browser tools for music and visuals. While AI was used for the totality of the code, hundreds of hours of human time was also put into designing, refining and testing the UX and UI.

| Tool | What it does |
|---|---|
| **[Glyph Viewer](tools/glyph-viewer/)** | Browse and filter every character the Sprawler game's font can draw, see which are already in the game's glyph atlas, and copy their code points. |
| **[Logo Lab](tools/logo-lab/)** | Design wordmarks: mix a typeface, a treatment and an accent colour, preview them in context, manage the Google Fonts in the lab and download one for offline use. |

**Moved to their own repositories** (October 30, 2026; their history up to then is still here):

| Tool | Repository | Online |
|---|---|---|
| **VJif** — GIF VJ tool | [XC3N/VJif](https://github.com/XC3N/VJif) | https://xc3n.github.io/VJif/ |
| **Bad MOPHO** — Mopho editor and librarian | [XC3N/BadMOPHO](https://github.com/XC3N/BadMOPHO) | https://xc3n.github.io/BadMOPHO/ |

The old addresses (`xc3n.github.io/webtools/vjif.html`, `…/bad-mopho.html`) redirect to the new ones (`moved.json`).

**Use them online:** https://xc3n.github.io/webtools/
**Use them offline:** download the file from the site (or build it, below) and open it in Chrome.

## Layout

```
tools/<tool>/      a tool's source + tool.json (name, entry file, output file, description)
common/            code shared between tools (see common/README.md); VJif and Bad MOPHO build with pinned copies of it
bench/             the shared test bench page used by every project's bench (see bench/README.md)
moved.json         tools now in their own repositories: index entries + redirect pages for their old file names
build.js           inlines includes → dist/<tool>.html + dist/index.html (+ the redirect pages)
.github/workflows  builds and publishes dist/ to GitHub Pages on every push to main
```

## Building

```
node build.js
```

Node 18+, no dependencies. Output goes to `dist/` (not committed — GitHub Actions builds it).
Tool sources can include shared files with `<!-- @include common/file.css -->` or `/* @include common/file.js */`,
and a Markdown file as HTML with `<!-- @markdown path/to/file.md -->`.

## Conventions

- Output is always a single self-contained HTML file. External requests are limited to web fonts, which fall back to system fonts offline.
- UI follows the shared design language and its layout-stability rules: readouts have fixed widths, context-dependent text lives in fixed boxes, swapped controls share one slot sized to the largest, unavailable controls are dimmed in place. See the comment at the top of each tool's stylesheet.
- Desktop Chrome is the target browser (WebCodecs, Web MIDI, OffscreenCanvas).

## Credits

UX & features design by XC3N · implementation & coding by Claude. Third-party code (mp4-muxer, MIT) and typefaces are listed in [CREDITS.md](CREDITS.md).

If these tools are useful to you, consider supporting the music at [xc3n.bandcamp.com](https://xc3n.bandcamp.com).

## Licence

[PolyForm Shield 1.0.0](LICENSE.md): the source is here to read; anyone can use the tools free (gigs and paid work included), change them and share them, keeping the licence and its `Required Notice` lines with every copy. What's not allowed: selling the tools, or using the code for a product that competes with them. Copies published before October 12, 2026 were under the MIT License.

Exception: the shared code in `common/` stays under the [MIT License](common/LICENSE.md). VJif and Bad MOPHO carry their own licences in their repositories.

The names "VJif" and "Bad MOPHO" and their logos aren't covered — forks need their own name. See [TRADEMARKS.md](TRADEMARKS.md).
