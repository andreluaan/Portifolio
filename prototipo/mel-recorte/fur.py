"""Gives Mel's near-black coat its lighter fur: a greyer muzzle and chin, a frosted chest, lighter ear insides, socks and
a feathered tail tip. Runs on the atlas cut.py writes, so the patches follow the drawn hairs instead of covering them.

Usage: python -I fur.py <mel-atlas-base.webp> <mel-atlas-base.json> <mel-atlas.webp> <mel-atlas.json>

The pencil value of each pixel is recovered by inverting cut.py's DARK ramp, then re-toned towards a lighter ramp by
how much of each zone covers it. Dark strokes barely move and light hairs move most, so the fur still reads as drawn.
It also hides the cuts at the ears and the neck, which changes the atlas layout, hence the new json.
"""
import json
import sys

import numpy as np
from PIL import Image, ImageFilter

base_path, json_path, out_path, out_json = sys.argv[1:5]
atlas = np.asarray(Image.open(base_path).convert('RGBA')).astype(np.float32)
base = atlas.copy()
atlas_meta = json.load(open(json_path))
parts = atlas_meta['parts']

# Must match DARK in cut.py
DARK = [(0.0, (8, 8, 8)), (0.45, (20, 20, 20)), (0.7, (44, 45, 43)), (0.86, (78, 79, 76)), (1.0, (122, 123, 120))]
# Her lighter fur: still a dark grey where the pencil pressed hard, silvery where it only grazed the paper
LIGHT_FUR = [(0.0, (22, 22, 21)), (0.45, (60, 60, 57)), (0.7, (116, 117, 112)), (0.86, (166, 167, 162)), (1.0, (208, 209, 204))]

# The eyes and the nose were toned with cut.py's LIGHT ramp: they stay exactly as they are (head piece pixels)
HEAD_SPOTS = [(134, 143, 31), (239, 115, 20), (297, 192, 27)]

# Soft ellipses per piece, in piece pixels: (cx, cy, rx, ry, degrees, strength)
ZONES = {
    'head': [
        (262, 205, 62, 40, -12, 0.95),  # muzzle
        (232, 252, 88, 24, -8, 0.8),  # chin and lower lip
        (168, 218, 46, 34, 0, 0.45),  # cheek, below the eye
        (100, 292, 82, 26, 0, 0.55),  # throat, meets the chest
        (192, 80, 62, 30, -22, 0.7),  # forehead, between the eyes and down the stop
        (146, 98, 30, 12, -10, 0.75),  # brow over the near eye
        (238, 82, 18, 8, -20, 0.6),  # brow over the far eye
        (140, 36, 92, 26, 0, 0.22),  # light catching the crown
    ],
    'body': [
        (432, 360, 50, 118, -8, 0.9),  # chest, up into the front of the neck
        (262, 444, 120, 22, 0, 0.4),  # belly fringe
        (220, 266, 170, 26, -12, 0.22),  # light along the back
    ],
    'earNear': [(140, 128, 70, 34, 38, 0.5)],
    'earFar': [(180, 100, 62, 30, -32, 0.55)],
    'tail': [],
}
# Strips run root → tip along x, so these zones are fractions of the strip's length
STRIP_TIPS = {'leg.nearRear': (0.72, 0.55), 'leg.farRear': (0.72, 0.5), 'leg.nearFront': (0.68, 0.65), 'tail': (0.62, 0.6)}


def ramp(values, stops):
    out = np.zeros(values.shape + (3,), np.float32)
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        t = np.clip((values - a) / (b - a), 0, 1)[..., None]
        band = (values >= a) & (values <= b)
        out[band] = (np.array(ca) * (1 - t) + np.array(cb) * t)[band]
    return out


def pencil(rgb):
    """The drawing's grey before cut.py toned it, from the DARK ramp's luminance."""
    lum = rgb.mean(-1)
    return np.interp(lum, [c[0] for _, c in DARK], [g for g, _ in DARK])


def ellipse(shape, cx, cy, rx, ry, degrees, strength):
    yy, xx = np.mgrid[0 : shape[0], 0 : shape[1]].astype(np.float32)
    a = np.radians(degrees)
    dx, dy = xx - cx, yy - cy
    u = (dx * np.cos(a) + dy * np.sin(a)) / rx
    v = (-dx * np.sin(a) + dy * np.cos(a)) / ry
    d = np.sqrt(u * u + v * v)
    t = np.clip(1.25 - d, 0, 1)  # soft from the rim inwards, so no edge shows
    return strength * t * t * (3 - 2 * t)


def patchy(shape, seed, cell=22):
    """Smooth value noise, so a patch thins and thickens like real fur instead of filling evenly."""
    rng = np.random.default_rng(seed)
    small = rng.random((shape[0] // cell + 2, shape[1] // cell + 2)).astype(np.float32)
    big = Image.fromarray((small * 255).astype(np.uint8)).resize((shape[1] + 2 * cell, shape[0] + 2 * cell), Image.BICUBIC)
    big = big.filter(ImageFilter.GaussianBlur(cell / 3))
    return np.asarray(big).astype(np.float32)[cell : cell + shape[0], cell : cell + shape[1]] / 255


for index, (name, part) in enumerate(parts.items()):
    x, y, w, h = part['frame']
    piece = atlas[y : y + h, x : x + w]
    rgb, alpha = piece[..., :3], piece[..., 3]
    amount = np.zeros((h, w), np.float32)
    for zone in ZONES.get(name, []):
        amount = np.maximum(amount, ellipse((h, w), *zone))
    if name in STRIP_TIPS:
        start, strength = STRIP_TIPS[name]
        t = np.clip((np.arange(w) / w - start) / (1 - start), 0, 1)
        amount = np.maximum(amount, (strength * t * t * (3 - 2 * t))[None, :].repeat(h, 0))
    amount *= np.clip(0.55 + 0.9 * patchy((h, w), 7 + index), 0, 1.15)

    g = pencil(rgb)
    toned = ramp(g, DARK) * (1 - amount[..., None]) + ramp(g, LIGHT_FUR) * amount[..., None]
    keep = np.zeros((h, w), np.float32)
    if name == 'head':
        yy, xx = np.mgrid[0:h, 0:w]
        for cx, cy, r in HEAD_SPOTS:
            keep = np.maximum(keep, np.clip((1.05 - np.hypot(xx - cx, yy - cy) / r) * 6, 0, 1))
    piece[..., :3] = rgb * keep[..., None] + toned * (1 - keep[..., None])
    atlas[y : y + h, x : x + w] = piece

# Seams -----------------------------------------------------------------------------------------------------------
# The ears and the body were cut off where the head covers them, so when the head nods or an ear flops, paper shows
# through the cut. Back in drawing space, each part grows fur under whatever sits on top of it: the ears under the
# head, the body under the head and the ears. Only inside her silhouette and only a little way, so nothing pokes out.
UNIT = atlas_meta['unit']
UNDER = {'body': ('head', 'earNear', 'earFar'), 'earNear': ('head',), 'earFar': ('head',)}
GROW = {'body': 34, 'earNear': 40, 'earFar': 40}
PLACED = ('body', 'earFar', 'earNear', 'head')

pieces = {}
for name, part in parts.items():
    x, y, w, h = part['frame']
    pieces[name] = atlas[y : y + h, x : x + w].copy()

origin = {}
for name in PLACED:
    rx, ry = parts[name]['rest']
    origin[name] = (int(round((rx - 30) / UNIT + 370)), int(round(925 - (150 - ry) / UNIT)))
MARGIN = 60
CW = max(origin[n][0] + pieces[n].shape[1] for n in PLACED) + MARGIN
CH = max(origin[n][1] + pieces[n].shape[0] for n in PLACED) + MARGIN


def place(name):
    canvas = np.zeros((CH, CW, 4), np.float32)
    ox, oy = origin[name]
    h, w = pieces[name].shape[:2]
    canvas[oy : oy + h, ox : ox + w] = pieces[name]
    return canvas


def grey(mask, size, kind):
    image = Image.fromarray((mask * 255).astype(np.uint8))
    return np.asarray(image.filter(kind(size))).astype(np.float32) / 255


def smear(rgb, known, steps):
    """Extends known colours outwards into unknown pixels, a ring at a time (as in cut.py)."""
    rgb, known = rgb.copy(), known.copy()
    for _ in range(steps):
        total = np.zeros_like(rgb)
        count = np.zeros(known.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            shifted = np.roll(np.roll(known, dy, 0), dx, 1)
            total += np.roll(np.roll(rgb, dy, 0), dx, 1) * shifted[..., None]
            count += shifted
        grow = (~known) & (count > 0)
        rgb[grow] = total[grow] / count[grow][:, None]
        known |= grow
    return rgb


layers = {name: place(name) for name in PLACED}
union = np.maximum.reduce([layer[..., 3] / 255 for layer in layers.values()])
# Closing the union fills the hairline gaps between the parts, which are exactly the seams to hide
silhouette = grey(grey(union > 0.35, 17, ImageFilter.MaxFilter), 17, ImageFilter.MinFilter)
silhouette = np.minimum(silhouette, grey(union > 0.02, 3, ImageFilter.MaxFilter))
soft_silhouette = np.asarray(Image.fromarray((silhouette * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255

for name, covers in UNDER.items():
    layer = layers[name]
    alpha = layer[..., 3] / 255
    solid = alpha > 0.6
    cover = np.maximum.reduce([layers[c][..., 3] / 255 for c in covers]) > 0.05
    # The seam itself is where neither this part nor the cover is solid; reach it from both sides
    cover = grey(cover, 9, ImageFilter.MaxFilter) > 0.5
    reach = grey(solid, 2 * GROW[name] + 1, ImageFilter.MaxFilter) > 0.5
    target = reach & cover & (silhouette > 0.5) & ~solid
    rgb = smear(layer[..., :3], solid, GROW[name] + 2)
    grown = np.where(target, soft_silhouette, 0)
    layer[..., :3] = np.where(solid[..., None], layer[..., :3], np.where(target[..., None], rgb, layer[..., :3]))
    alpha = np.maximum(alpha, grown)
    # Under its covers the part thins out away from what shows at rest, so a flopping ear uncovers soft fur rather
    # than the hard corner of a cut
    shown = solid & ~cover
    blur = lambda mask, radius: np.asarray(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius))).astype(np.float32) / 255
    fade = np.clip(blur(shown, GROW[name]) * 3.2, 0, 1)
    layer[..., 3] = np.where(cover, blur(alpha, 5) * fade, alpha) * 255

# Below the belly (cut.py's BELLY row) the body only keeps slivers from between the legs' outlines, which hang down
# as spikes once the legs move: drop them, and fade the straight line left behind over the legs' tops, which show the
# same drawing at rest
BELLY = 819  # cut.py grows its cuts by 3 px, so the line sits just above its BELLY
body = layers['body']
body[BELLY + 1 :, :, 3] = 0
hard_cut = body[BELLY, :, 3] > 150
FADE = 18
for row in range(BELLY - FADE, BELLY + 1):
    t = np.clip((BELLY + 1 - row) / FADE, 0, 1)
    body[row, hard_cut, 3] *= t * t * (3 - 2 * t)



def run_filter(values, size, pick):
    """A running min or max along one axis, edges held."""
    padded = np.pad(values, size // 2, mode='edge')
    return pick(np.lib.stride_tricks.sliding_window_view(padded, size), axis=-1)


def soften(values, sigma):
    radius = int(sigma * 3)
    kernel = np.exp(-0.5 * (np.arange(-radius, radius + 1) / sigma) ** 2)
    return np.convolve(np.pad(values, radius, mode='edge'), kernel / kernel.sum(), mode='valid')


# Legs: each strip was sampled with the full width of a polygon around the leg, so it carries scraps of the other
# legs, of the belly and of the paper between them. Rebuild every strip as one clean leg: in each column keep only the
# run of fur that crosses the leg's axis, close the notches along its outline, fill what is inside with smeared fur.
# The near legs, drawn over the body, also melt into it at the hip, and every paw ends softly at the toes.
NOTCH = 25  # px along the leg: anything narrower than this is closed over
for name in ('leg.nearRear', 'leg.farRear', 'leg.nearFront'):
    strip = pieces[name]
    h, w = strip.shape[:2]
    alpha = strip[..., 3] / 255
    # Paper the silhouette mask swallowed between the legs was toned grey like fur: find it by its untouched pencil value
    x, y = parts[name]['frame'][:2]
    paper = pencil(base[y : y + h, x : x + w, :3]) > 0.95
    paper = grey(grey(paper, 5, ImageFilter.MinFilter), 7, ImageFilter.MaxFilter) > 0.5
    solid = (alpha > 0.5) & ~paper
    top = np.full(w, h / 2)
    bottom = np.full(w, h / 2)
    for u in range(w):
        rows = np.nonzero(solid[:, u])[0]
        if not len(rows):
            continue
        seed = rows[np.argmin(np.abs(rows - h / 2))]
        if abs(seed - h / 2) > h * 0.3:
            continue
        a = b = seed
        while a > 0 and solid[a - 1, u]:
            a -= 1
        while b < h - 1 and solid[b + 1, u]:
            b += 1
        top[u], bottom[u] = a, b
    # A 1D closing (widen, then narrow back) bridges notches; smoothing keeps the outline from stepping
    top = soften(run_filter(run_filter(top, NOTCH, np.min), NOTCH, np.max), 2.5)
    bottom = soften(run_filter(run_filter(bottom, NOTCH, np.max), NOTCH, np.min), 2.5)
    rows = np.arange(h)[:, None]
    EDGE = 3.5
    inside = np.clip(np.minimum(rows - top[None, :], bottom[None, :] - rows) / EDGE + 0.5, 0, 1)
    fill = (inside > 0.5) & ~solid
    # Smear only from real fur: the pale rim where the drawing met paper would streak the fill
    rgb = smear(strip[..., :3], solid & (pencil(base[y : y + h, x : x + w, :3]) < 0.85), 34)
    strip[..., :3] = np.where(fill[..., None], rgb, strip[..., :3])
    # Inside the leg the gaps become fur; just outside it the drawing's own stray hairs stay, further out nothing
    FRINGE = 6
    near = np.clip(np.minimum(rows - top[None, :] + FRINGE, bottom[None, :] + FRINGE - rows) / FRINGE, 0, 1)
    alpha = np.where(inside > 0.5, np.maximum(np.where(paper, 0, alpha), inside), np.where(paper, 0, alpha) * near)
    along = np.arange(w)
    toes = np.clip((w - 1 - along) / 8, 0, 1)
    alpha *= (toes * toes * (3 - 2 * toes))[None, :]
    if name != 'leg.farRear':
        hip = np.clip(along / 22, 0, 1)
        alpha *= (hip * hip * (3 - 2 * hip))[None, :]
    strip[..., 3] = alpha * 255

# Re-crop the grown parts and pack every piece into a fresh atlas
to_rig = lambda x, y: ((x - 370) * UNIT + 30, 150 - (925 - y) * UNIT)
for name in PLACED:
    layer = layers[name]
    ys, xs = np.nonzero(layer[..., 3] > 5)
    x0, y0, x1, y1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
    pieces[name] = layer[y0:y1, x0:x1]
    parts[name]['rest'] = [round(v, 3) for v in to_rig(x0, y0)]

order = sorted(pieces, key=lambda name: -pieces[name].shape[0])
ATLAS_W, x, y, shelf = 1024, 0, 0, 0
for name in order:
    h, w = pieces[name].shape[:2]
    if x + w > ATLAS_W:
        x, y, shelf = 0, y + shelf + 2, 0
    parts[name]['frame'] = [x, y, w, h]
    x += w + 2
    shelf = max(shelf, h)
packed = np.zeros((y + shelf, ATLAS_W, 4), np.float32)
for name, piece in pieces.items():
    fx, fy, fw, fh = parts[name]['frame']
    packed[fy : fy + fh, fx : fx + fw] = piece

Image.fromarray(packed.clip(0, 255).astype(np.uint8), 'RGBA').save(out_path, 'WEBP', quality=92, method=6)
atlas_meta.update({'width': ATLAS_W, 'height': packed.shape[0], 'parts': parts})
json.dump(atlas_meta, open(out_json, 'w'), indent=1)
print('fur', out_path, packed.shape[1::-1])
