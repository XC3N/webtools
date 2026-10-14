# 0.89.5: a press takes the GIF the hover outline shows (the selected one while on it); a click without moving on it steps
# to the next one under the pointer, with no timing; the pick uses where Auto shows a GIF now and how much of it shows
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    for k in (0, 1):
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/'busy.gif')]); await pg.wait_for_function(f"pads[{k}].gif")
    await pg.keyboard.press('KeyQ'); await pg.keyboard.press('KeyW'); await pg.wait_for_timeout(300)
    info = await pg.evaluate("(() => { const L = layers.findIndex(L => L.clips.length === 2); return [L, layers[L].clips.map(c => c.id)]; })()")
    li, ids = info; assert li >= 0, info
    await pg.evaluate(f"setTarget({li})")
    async def at(ox, oy):   # output px → client px
      return await pg.evaluate(f"(() => {{ const r = pv.getBoundingClientRect(), z = r.width / pv.clientWidth; return [r.left + (view.x + ({ox}) * view.w / W) * z, r.top + (view.y + ({oy}) * view.h / H) * z]; }})()")
    sel = lambda: pg.evaluate(f"layers[{li}].sel && layers[{li}].sel.id")
    x, y = await at("W/2", "H/2")
    await pg.mouse.click(x, y); s1 = await sel()
    await pg.mouse.click(x, y); s2 = await sel()                      # right away, same spot: the next one
    pos0 = await pg.evaluate(f"layers[{li}].clips.map(c => [c.id, Math.round(c.x)])")
    await pg.mouse.move(x, y); await pg.mouse.down(); await pg.mouse.move(x + 60, y, steps=4); await pg.mouse.up()   # press on the selected one and drag: it moves, no cycling
    s3 = await sel(); pos1 = await pg.evaluate(f"layers[{li}].clips.map(c => [c.id, Math.round(c.x)])")
    moved = [a[0] for a, b2 in zip(pos0, pos1) if a[1] != b2[1]]
    print('cycle/drag', s1, s2, s3, moved)
    assert s1 != s2 and s3 == s2 and moved == [s2], (s1, s2, s3, moved)
    # Auto: one GIF shown 500 px to the left of its box; a click there picks it
    other = [i for i in ids if i != s2][0]
    await pg.evaluate(f"""(() => {{ const c = layers[{li}].clips.find(c => c.id === {other}), g = pads[c.pad].gif; g.lfo.x = Object.assign(lfoDef("x"), {{ on: true, min: -500, max: -500 }}); redraw.all = true; }})()""")
    await pg.wait_for_timeout(1700)
    cx = await pg.evaluate(f"layers[{li}].clips.find(c => c.id === {other}).x")
    x2, y2 = await at(f"W/2 + {cx} - 500", "H/2")
    await pg.mouse.click(x2, y2); s4 = await sel()
    print('auto', s4, other, errs); assert s4 == other and not errs, (s4, other, errs)
    # a GIF made invisible by Auto (opacity 0) on top of the other: a click on the visible one picks the visible one, even after a long wait
    await pg.evaluate(f"""(() => {{ const c = layers[{li}].clips.find(c => c.id === {other}), g = pads[c.pad].gif; g.lfo.x.on = false; g.lfo.op = Object.assign(lfoDef("op"), {{ on: true, min: 0, max: 0 }});
      const L = layers[{li}]; L.clips.sort((a, b) => (a.id === {other}) - (b.id === {other})); L.sel = false; redraw.all = true; }})()""")   # the invisible one last: drawn on top
    await pg.wait_for_timeout(300)
    vis = [i for i in ids if i != other][0]
    vx = await pg.evaluate(f"layers[{li}].clips.find(c => c.id === {vis}).x")
    x3, y3 = await at(f"W/2 + {vx}", "H/2")
    await pg.mouse.move(x3 - 5, y3); await pg.mouse.move(x3, y3); hov = await pg.evaluate("pvHover && pvHover[1].id")
    await pg.mouse.click(x3, y3); s5 = await sel()
    await pg.mouse.click(x3, y3); s6 = await sel()   # a click without moving on the selected one: the next (the invisible one)
    await pg.wait_for_timeout(2000); await pg.mouse.move(x3, y3); await pg.mouse.down(); await pg.mouse.move(x3 + 40, y3, steps=3); await pg.mouse.up(); s7 = await sel()   # long after: pressing on the selected one still drags it
    print('visible', hov, s5, s6, s7, vis); assert hov == vis and s5 == vis and s6 == other and s7 == other, (hov, s5, s6, s7, vis)
    await b.close()
asyncio.run(main())
