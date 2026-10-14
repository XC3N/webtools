// ---------- dragging tiles: pads, scenes and effect presets share these (0.89) ----------
// Dragging one onto another swaps them; Ctrl (⌘) held makes it a copy, onto an empty one; held over a full one for
// COPY_HOLD ms (a red bar fills it), the drop replaces it. A right click during the drag cancels it.
const COPY_HOLD = 1200;
// d: the drag's state ({ hold, armed }); o: the tile under the pointer; full: a copy there would replace something;
// again: called once the hold is over (to light the tile as armed)
function copyHold(d, o, full, again){
  if (full){ if (!d.hold || d.hold.o !== o){ clearTimeout(d.hold && d.hold.T); d.hold = { o, at: performance.now(), T: setTimeout(again, COPY_HOLD + 20) }; } }
  else if (d.hold){ clearTimeout(d.hold.T); d.hold = null; }
  return d.armed = !!d.hold && performance.now() - d.hold.at >= COPY_HOLD;
}
function copyHoldEnd(d){ if (d && d.hold) clearTimeout(d.hold.T); }
// the tiles' marks while dragging: where it would land, holding (the bar filling), armed (it will replace)
function markTiles(tiles, o, d, ok){
  for (const x of tiles){ x.classList.toggle('holding', !!d.hold && x === o && !d.armed); x.classList.toggle('armed', !!d.armed && x === o); x.classList.toggle('drop', x === o && ok(x)); }
}
const unmarkTiles = tiles => { for (const x of tiles) x.classList.remove('drop', 'holding', 'armed'); };
