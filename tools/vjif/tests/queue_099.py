# 0.99.8 (QA-028): GIFs that faded out are "not seen" (dim chip, dim pad dot); a full layer sends off the one unseen longest instead of refusing;
# right-click on its pad puts it back without playing it; a layer full of GIFs that are all showing still refuses
import asyncio
from _env import DIST, FIX, ARGS
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as p:
    b = await p.chromium.launch(args=ARGS); pg = await b.new_page(viewport={'width':1600,'height':960}); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.goto(DIST); await pg.wait_for_function("store.ready"); await pg.evaluate("$('#aboutPanel').hidden || closeAbout()")
    G = await pg.evaluate("pads.map((_, i) => i).filter(isGlobalPad).slice(0, 8)")
    for k in G:
      await pg.evaluate(f"fileTarget = {k}"); await pg.set_input_files('#fileIn', [str(FIX/'busy.gif')]); await pg.wait_for_function(f"pads[{k}].gif")
      await pg.evaluate(f"(() => {{ const g = pads[{k}].gif; g.trig = 'fade'; g.env = {{ ...g.env, a: 0, h: 0, r: 0.05, len: 'free' }}; }})()")
    await pg.evaluate("clock.bpm = 240")
    await pg.evaluate(f"[{G[0]},{G[1]},{G[2]},{G[3]},{G[4]},{G[5]}].forEach(p => fire(p, clock.beat))")
    await pg.wait_for_timeout(1500)
    st = await pg.evaluate("layers[3].clips.map(c => unseenClip(c))")
    await pg.evaluate("layers[3].clips.forEach((c, k) => c.lastSeen = k + 1)"); await pg.wait_for_timeout(400)
    chips = await pg.evaluate("[...layers[3].row.querySelectorAll('.chip')].map(c => c.classList.contains('unseen'))")
    print('all gone', st, chips); assert all(st) and len(st) == 6 and all(chips), (st, chips)
    await pg.evaluate("clock.bpm = 60"); await pg.evaluate(f"fire({G[6]}, clock.beat)")
    ons = await pg.evaluate("layers[3].clips.map(c => c.pad)")
    print('queue', ons, G); assert len(ons) == 6 and G[0] not in ons and G[6] in ons and G[1] in ons, ons
    await pg.evaluate(f"pads[{G[0]}].el.dispatchEvent(new MouseEvent('contextmenu', {{ bubbles: true, cancelable: true, button: 2 }}))")
    back = await pg.evaluate(f"(() => {{ const c = layers[3].clips.find(c => c.pad === {G[0]}); return [!!c, c && c.env, c && unseenClip(c), layers[3].clips.length, layers[3].clips.some(c => c.pad === {G[1]})]; }})()")
    print('back', back); assert back[0] and back[1] is None and back[2] and back[3] == 6 and back[4] is False, back
    # everything showing: a 7th is refused
    await pg.evaluate("layers[3].clips.forEach(c => { pads[c.pad].gif.trig = 'stay'; })")
    n = await pg.evaluate(f"(() => {{ fire({G[7]}, clock.beat); return [layers[3].clips.length, layers[3].clips.some(c => c.pad === {G[7]}), layers[3].row.classList.contains('refused')]; }})()")
    print('full', n, errs); assert n == [6, False, True] and not errs, (n, errs)
    # BG-054: a repeat shorter than the envelope carries on from the level it's at (Continue) instead of dropping to 0; Restart drops
    rep = await pg.evaluate(f"""(() => {{ const g = pads[{G[7]}].gif, c = newClip({G[7]}); g.trig = 'fade'; g.env = {{ ...g.env, a: 0.125, h: 0.25, r: 0.5, len: 'free', gate: false, every: 0.5, restart: false, curve: 'lin' }};
      const at = b => envLevel(c, g, b), a = [at(0.499), at(0.501), at(1.001), at(1.499)]; g.env.restart = true; const r = [at(0.499), at(0.501)]; return [a, r]; }})()""")
    print('repeat', rep); assert abs(rep[0][0] - rep[0][1]) < 0.05 and rep[0][1] > 0.2 and rep[1][1] < 0.05 and rep[1][0] > 0.2 and not errs, rep
    await b.close()
asyncio.run(main())
