# XC3N web tools

The shared toolbox behind XC3N's projects: small single-file browser tools, the code the bigger tools share, and the test bench page every project uses. VibeCoded: AI wrote the code; the design, UX and testing are hundreds of hours of human work.

**Online:** https://xc3n.github.io/webtools/

## Tools

| Tool | What it does |
|---|---|
| **[Glyph Viewer](tools/glyph-viewer/)** | Browse and filter every character the Sprawler game's font can draw, see which are already in the game's glyph atlas, and copy their code points. |
| **[Logo Lab](tools/logo-lab/)** | Design wordmarks: mix a typeface, a treatment and an accent colour, preview them in context, manage the Google Fonts in the lab and download one for offline use. |

Each tool is one self-contained HTML file: open it on the site, or download it (or build it, below) and open it offline in Chrome.

## Projects with their own repository

| Project | Repository | Online |
|---|---|---|
| **VJif**: GIF VJ tool | [XC3N/VJif](https://github.com/XC3N/VJif) | https://xc3n.github.io/VJif/ |
| **Bad MOPHO**: Mopho editor and librarian | [XC3N/BadMOPHO](https://github.com/XC3N/BadMOPHO) | https://xc3n.github.io/BadMOPHO/ |

Both started here and moved out on October 30, 2026; their history up to then is still in this repo. The old addresses (`…/webtools/vjif.html`, `…/webtools/bad-mopho.html`) redirect to the new sites (`moved.json`).

## What else is here

- **`common/`**: code shared between tools (settings storage, the slider / dropdown behaviour standard, theming, the MP4 muxer). Tools in this repo include it directly; VJif and Bad MOPHO build with a pinned copy and take updates with their `sync-common.js`. Shared code is changed here first. See [common/README.md](common/README.md).
- **`bench/`**: the test bench page. Every project's bench (VJif, Sprawler) is a claude.ai artifact running this one page, with what differs per project in `benches.json`. See [bench/README.md](bench/README.md).

## Layout

```
tools/<tool>/      a tool's source + tool.json (name, entry file, output file, description)
common/            shared code (MIT), see common/README.md
bench/             the shared test bench page, see bench/README.md
moved.json         projects now in their own repositories: index entries + redirect pages
build.js           inlines includes → dist/<tool>.html, dist/index.html and the redirect pages
.github/workflows  builds and publishes dist/ to GitHub Pages on every push to main
```

## Building

```
node build.js
```

Node 18+, no dependencies. Output goes to `dist/` (not committed; GitHub Actions builds it).
Tool sources include shared files with `<!-- @include common/file.css -->` or `/* @include common/file.js */`,
and a Markdown file as HTML with `<!-- @markdown path/to/file.md -->`.

## Conventions

- Output is always a single self-contained HTML file. External requests are limited to web fonts, which fall back to system fonts offline.
- UI follows the shared design language and its layout-stability rules: readouts have fixed widths, context-dependent text lives in fixed boxes, swapped controls share one slot sized to the largest, unavailable controls are dimmed in place. See `common/style.css`.
- Desktop Chrome is the target browser.

## Credits

UX & features design by XC3N · implementation & coding by Claude. Third-party code and typefaces are listed in [CREDITS.md](CREDITS.md).

If these tools are useful to you, consider supporting the music at [xc3n.bandcamp.com](https://xc3n.bandcamp.com).

## Licence

[PolyForm Shield 1.0.0](LICENSE.md): the source is here to read; anyone can use the tools free, change them and share them, keeping the licence and its `Required Notice` lines with every copy. What's not allowed: selling them, or using the code for a product that competes with them. Copies published before October 12, 2026 were under the MIT License.

Exception: the shared code in `common/` is under the [MIT License](common/LICENSE.md). VJif and Bad MOPHO carry their own licences in their repositories.

The names "VJif" and "Bad MOPHO" and their logos aren't covered by any of these licences; forks need their own name. See [TRADEMARKS.md](TRADEMARKS.md).
