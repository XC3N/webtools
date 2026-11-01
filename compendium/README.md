# Compendium

The page where a project's name pools are edited: for Sprawler, streets, capsule hotels, building kinds and their names, plain-building looks, MegaBuildings, the Corpsec HQ, and people's names and adjectives (Sprawler ID-035, ID-056).

It runs as a claude.ai artifact with a shared database (`db` and `user` capabilities), so everyone it's shared with edits the same lists, live. A web page can't push to GitHub, so the game doesn't read the page directly: with each Sprawler pull request Claude copies the pools into the game's `data/compendium.json` (the same shape as the page's **Copy JSON** button produces) and records the sync in `meta/info` (`syncedAt`, `syncedVersion`), which the page shows at the top.

**Live:** Sprawler Compendium, https://claude.ai/artifact/5WBx3GLwcQEVWSEgp63kPj

## Data

- `pools/<id>`: one list. `{group, key, entries[], edited, order?}`; building kinds add `{label, plain}`. Fixed lists (`streets`, `hotels`, `looks`, `hq`, `npc-first`, `npc-middle`, `npc-last`, `npc-titles`) have `group: "fixed"`; open groups (`kind`, `mega`, `adj`) take new lists from the page, with ids `<group>-<slug of key>`.
- `meta/info`: `{syncedAt, syncedVersion}`: when the pools were last copied into the game, and the game version that has them.

## Changing the page

Edit `compendium.html`, then publish it to the artifact above (read the live version first; leave `capabilities` out so it keeps `db` and `user`). Only Sprawler uses it so far; a second project would move the list definitions (`GROUPS`) into a config file the way `bench/benches.json` works.
