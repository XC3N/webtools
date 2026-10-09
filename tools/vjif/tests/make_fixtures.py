# makes the test GIFs (synthetic, so nothing copyrighted lives in the repo): run once, or let _env.py do it
import pathlib, random
from PIL import Image, ImageDraw
F = pathlib.Path(__file__).resolve().parent / 'fixtures'; F.mkdir(exist_ok=True)
rnd = random.Random(7)
def save(name, frames, ms):
    frames = [f.convert('P', palette=Image.ADAPTIVE, colors=64) for f in frames]
    frames[0].save(F / name, save_all=True, append_images=frames[1:], duration=ms, loop=0)
# busy: 800×600, 30 frames, lots of coloured blobs drifting over green (big, many colours: the general-purpose GIF)
blobs = [(rnd.randrange(800), rnd.randrange(600), rnd.randrange(20, 70), rnd.randrange(15, 40), tuple(rnd.randrange(40, 255) for _ in range(3)), rnd.uniform(-6, 6), rnd.uniform(-4, 4)) for _ in range(40)]
fr = []
for k in range(30):
    im = Image.new('RGB', (800, 600), (40, 255, 40)); d = ImageDraw.Draw(im)
    for x, y, rx, ry, c, vx, vy in blobs:
        cx, cy = (x + vx * k) % 800, (y + vy * k) % 600; d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=c)
    fr.append(im)
save('busy.gif', fr, 80)
# red: 320×180, 12 frames, a white bar sweeping across red
save('red.gif', [(lambda im: (ImageDraw.Draw(im).rectangle((k * 26, 40, k * 26 + 30, 140), fill=(255, 255, 255)), im)[1])(Image.new('RGB', (320, 180), (220, 30, 30))) for k in range(12)], 100)
# ring: 120×90, 6 frames, a ring growing on black (small: pixel-art sized)
save('ring.gif', [(lambda im: (ImageDraw.Draw(im).ellipse((60 - 8 - k * 6, 45 - 8 - k * 6, 60 + 8 + k * 6, 45 + 8 + k * 6), outline=(255, 200, 0), width=4), im)[1])(Image.new('RGB', (120, 90), (0, 0, 0))) for k in range(6)], 120)
# grad: a smooth two-way gradient (palette / dither tests)
im = Image.new('RGB', (320, 200)); px = im.load()
for x in range(320):
    for y in range(200): px[x, y] = (int(255 * x / 319), int(255 * y / 199), 128)
im.save(F / 'grad.gif')
# key-regions: white background, a blue ring with a white hole, a red box with two white windows (Key › Region)
fr = []
for k in range(8):
    im = Image.new('RGB', (320, 200), (255, 255, 255)); d = ImageDraw.Draw(im); x = 40 + k * 6
    d.ellipse((x, 40, x + 120, 160), fill=(30, 30, 200)); d.ellipse((x + 30, 70, x + 90, 130), fill=(255, 255, 255))
    d.rectangle((200, 50, 290, 150), fill=(200, 40, 40)); d.rectangle((215, 65, 240, 90), fill=(255, 255, 255)); d.rectangle((250, 110, 275, 135), fill=(255, 255, 255))
    fr.append(im)
frames = [f.convert('P', palette=Image.ADAPTIVE, colors=8) for f in fr]
frames[0].save(F / 'key-regions.gif', save_all=True, append_images=frames[1:], duration=120, loop=0)
print('fixtures in', F)
