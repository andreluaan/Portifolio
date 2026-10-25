"""Cuts André's pencil drawing of Mel into animatable parts and packs them into one colored atlas.

Usage: python -I cut.py <drawing> <mask.png> <atlas.webp> <atlas.json>

Every part keeps the drawing's pixels, toned to the site's neutral palette. Areas the body loses to
the head and ears get a band of smeared fur, so nothing opens up when those parts rotate.
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

source, mask_path, atlas_path, json_path = sys.argv[1:5]
image = Image.open(source).convert('L')
gray = np.asarray(image).astype(np.float32) / 255
dog = np.asarray(Image.open(mask_path).convert('L')) > 127
H, W = gray.shape

# Rig space: x' = (x - 370) * 0.16 + 30, y' = 150 - (925 - y) * 0.16 (the same mapping the skeleton was traced with)
UNIT = 0.16
to_rig = lambda x, y: ((x - 370) * UNIT + 30, 150 - (925 - y) * UNIT)


def polygon_mask(points, feather=0):
    canvas = Image.new('L', (W, H), 0)
    ImageDraw.Draw(canvas).polygon(points, fill=255)
    if feather:
        canvas = canvas.filter(ImageFilter.GaussianBlur(feather))
    return np.asarray(canvas).astype(np.float32) / 255


PARTS = {
    'earNear': [(578, 296), (660, 276), (772, 302), (862, 368), (884, 420), (874, 470), (842, 550), (806, 588), (766, 578), (700, 504), (618, 424), (582, 360)],
    'earFar': [(916, 398), (978, 318), (1100, 258), (1236, 232), (1234, 312), (1172, 394), (1106, 456), (1042, 486), (978, 464), (934, 436)],
    'head': [(832, 430), (870, 384), (930, 368), (978, 382), (1020, 430), (1078, 478), (1122, 506), (1156, 544), (1144, 594), (1090, 626), (1024, 650), (962, 660), (902, 668), (862, 680), (822, 658), (808, 596), (812, 520)],
}

# Each leg as a chain of joints (hip or shoulder, knee or elbow, hock or wrist, toes) and the outline that holds it.
# The light leg under the rump is the near hind leg; the shaded one under the belly is the far hind leg.
LEGS = {
    'nearRear': {'chain': [(540, 738), (575, 810), (490, 862), (560, 912)], 'thickness': 124, 'outline': [(462, 690), (612, 690), (618, 780), (596, 832), (578, 880), (588, 925), (448, 925), (442, 868), (462, 800)]},
    'farRear': {'chain': [(665, 784), (668, 840), (655, 880), (700, 912)], 'thickness': 96, 'outline': [(618, 760), (716, 760), (726, 868), (734, 925), (612, 925), (608, 860)]},
    'nearFront': {'chain': [(820, 716), (812, 800), (846, 878), (896, 910)], 'thickness': 86, 'outline': [(786, 690), (862, 684), (872, 780), (890, 848), (924, 892), (924, 925), (810, 925), (804, 870), (792, 800)]},
}
CHAIN_POINTS = 24  # the rope that redraws each leg uses the same curve and point count
TAIL = [(352, 884), (396, 842), (446, 792), (492, 738), (528, 756), (506, 800), (466, 850), (424, 888), (372, 900)]


LIGHT = [(0.0, (21, 21, 21)), (0.35, (59, 60, 58)), (0.62, (141, 143, 139)), (0.82, (198, 200, 196)), (1.0, (243, 243, 241))]
# Her coat: near black, with the pencil's fur still showing as charcoal greys
DARK = [(0.0, (8, 8, 8)), (0.45, (20, 20, 20)), (0.7, (44, 45, 43)), (0.86, (78, 79, 76)), (1.0, (122, 123, 120))]
# The eyes and the nose keep the drawing's own tones, so their shine still reads against the dark coat
BRIGHT_SPOTS = [(935, 507, 31), (1040, 479, 20), (1098, 556, 27)]


def colorize(values, stops=DARK):
    """Pencil grey → the site's neutrals along `stops`."""
    out = np.zeros(values.shape + (3,), np.float32)
    for (a, ca), (b, cb) in zip(stops, stops[1:]):
        t = np.clip((values - a) / (b - a), 0, 1)[..., None]
        band = (values >= a) & (values <= b)
        out[band] = (np.array(ca) * (1 - t) + np.array(cb) * t)[band]
    return out


yy, xx = np.mgrid[0:H, 0:W]
spots = np.zeros((H, W), np.float32)
for cx, cy, r in BRIGHT_SPOTS:
    spots = np.maximum(spots, np.clip((1.05 - np.hypot(xx - cx, yy - cy) / r) * 6, 0, 1))
color = colorize(gray) * (1 - spots[..., None]) + colorize(gray, LIGHT) * spots[..., None]

# The outer edge of the silhouette gets a soft 1.5 px falloff; inside, everything is opaque
edge = np.asarray(Image.fromarray((dog * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32) / 255

rows = np.arange(H)[:, None]
masks = {name: polygon_mask(points, 2.5) * edge for name, points in PARTS.items()}
leg_masks = {name: polygon_mask(leg['outline'], 2.5) * edge for name, leg in LEGS.items()}
BELLY = 822  # below this line the body gives way to the legs; above it the two overlap, so no seam shows
# The ears sit behind the head: whatever the head covers is not part of an ear (or the far eye would ride along)
head_cover = polygon_mask(PARTS['head'], 1.5)
for name in ('earNear', 'earFar'):
    masks[name] = masks[name] * (1 - head_cover)
tail_mask = polygon_mask(TAIL, 2.5) * edge


def smear(rgb, known, steps):
    """Extends known colours outwards into unknown pixels, a ring at a time."""
    rgb = rgb.copy()
    known = known.copy()
    for _ in range(steps):
        total = np.zeros_like(rgb)
        count = np.zeros(known.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)):
            shifted_known = np.roll(np.roll(known, dy, 0), dx, 1)
            total += np.roll(np.roll(rgb, dy, 0), dx, 1) * shifted_known[..., None]
            count += shifted_known
        grow = (~known) & (count > 0)
        rgb[grow] = total[grow] / count[grow][:, None]
        known = known | grow
    return rgb


# Body: the whole silhouette minus the head, the ears, the lower legs and the tail beyond the rump
# Cut with hard, slightly grown shapes so no sliver of a part's outline stays behind on the body
leg_cuts = [polygon_mask(leg['outline']) * (rows > BELLY) for leg in LEGS.values()]
hard = np.maximum.reduce([polygon_mask(PARTS[name]) for name in ('head', 'earNear', 'earFar')] + leg_cuts + [polygon_mask(TAIL) * (np.arange(W)[None, :] < 470)])
hard = np.asarray(Image.fromarray((hard * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))).astype(np.float32) / 255
body_alpha = edge * (1 - hard)
# A band of smeared fur under the head and ears, so a turn of the head never shows paper through the neck
solid = body_alpha > 0.6
BAND = 9
# Only around the back of the neck, where the near ear and the head sit over the body; behind the ears is paper
NECK = [(752, 470), (884, 462), (906, 650), (852, 712), (748, 650)]
band = np.asarray(Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * BAND + 1))).astype(bool) & dog & ~solid
band &= polygon_mask(NECK) > 0.5
legs_below = np.maximum.reduce(leg_cuts) > 0.05
band &= ~legs_below
band_rgb = smear(color, solid, BAND + 2)
body_rgb = np.where(solid[..., None], color, band_rgb)
body_alpha = np.where(band, 1.0, body_alpha)
body_alpha[legs_below] = 0
masks_rgb = {'body': (body_rgb, body_alpha)}
for name, alpha in masks.items():
    masks_rgb[name] = (color, alpha)


def crop(rgb, alpha):
    ys, xs = np.nonzero(alpha > 0.02)
    x0, y0, x1, y1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
    rgba = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1] * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA'), (int(x0), int(y0))


pieces = {}
for name, (rgb, alpha) in masks_rgb.items():
    pieces[name] = crop(rgb, alpha)

def catmull(points, steps=8):
    """Uniform Catmull-Rom through the points, `steps` samples per span (mirrors mel-cutout.ts)."""
    out = []
    for i in range(len(points) - 1):
        p0 = points[max(0, i - 1)]; p1 = points[i]; p2 = points[i + 1]; p3 = points[min(len(points) - 1, i + 2)]
        for step in range(steps):
            t = step / steps
            out.append(tuple(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in (0, 1)))
    out.append(tuple(points[-1]))
    return np.array(out)


def resample(curve, count):
    """`count` points evenly spaced by arc length along the curve."""
    seg = np.hypot(*np.diff(curve, axis=0).T)
    dist = np.concatenate([[0], np.cumsum(seg)])
    targets = np.linspace(0, dist[-1], count)
    return np.stack([np.interp(targets, dist, curve[:, 0]), np.interp(targets, dist, curve[:, 1])], 1), float(dist[-1])


def strip_along(rgba, chain, thickness, count=CHAIN_POINTS):
    """Unrolls the pixels around a joint chain into a straight strip (u along the leg, v across it)."""
    points, length = resample(catmull(np.array(chain, float)), count)
    width = int(round(length))
    u = np.linspace(0, length, width)
    dist = np.linspace(0, length, count)
    cx = np.interp(u, dist, points[:, 0]); cy = np.interp(u, dist, points[:, 1])
    tx = np.gradient(cx); ty = np.gradient(cy); norm = np.hypot(tx, ty) + 1e-6
    nx, ny = -ty / norm, tx / norm
    v = np.arange(thickness) - thickness / 2
    sx = cx[None, :] + nx[None, :] * v[:, None]
    sy = cy[None, :] + ny[None, :] * v[:, None]
    x0 = np.clip(np.floor(sx).astype(int), 0, W - 2); y0 = np.clip(np.floor(sy).astype(int), 0, H - 2)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    a = rgba.astype(np.float32)
    out = a[y0, x0] * (1 - fx) * (1 - fy) + a[y0, x0 + 1] * fx * (1 - fy) + a[y0 + 1, x0] * (1 - fx) * fy + a[y0 + 1, x0 + 1] * fx * fy
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA'), length


leg_strips = {}
for name, leg in LEGS.items():
    rgba = np.dstack([color, leg_masks[name] * 255])
    leg_strips[name] = strip_along(rgba, leg['chain'], leg['thickness'])

# Tail: resampled along its axis into a straight strip, root on the left, so a rope mesh can bend it smoothly
root, tip = np.array([500.0, 752.0]), np.array([368.0, 892.0])
axis = tip - root
length = float(np.hypot(*axis))
direction = axis / length
normal = np.array([-direction[1], direction[0]])
THICK, LEAD = 84, 24  # strip height, and how far it reaches back into the rump
tail_rgba = np.dstack([color, tail_mask * 255]).clip(0, 255).astype(np.uint8)
tail_image = Image.fromarray(tail_rgba, 'RGBA')
strip_length = int(length + LEAD + 10)
origin = root - direction * LEAD - normal * THICK / 2
tail_strip = tail_image.transform(
    (strip_length, THICK), Image.AFFINE,
    (direction[0], normal[0], origin[0], direction[1], normal[1], origin[1]),
    resample=Image.BICUBIC,
)
pieces['tail'] = (tail_strip, (0, 0))
for name, (strip, _) in leg_strips.items():
    pieces[f'leg.{name}'] = (strip, (0, 0))

# Shelf-pack everything into one atlas
order = sorted(pieces, key=lambda name: -pieces[name][0].height)
ATLAS_W, x, y, shelf = 1024, 0, 0, 0
frames = {}
for name in order:
    piece = pieces[name][0]
    if x + piece.width > ATLAS_W:
        x, y, shelf = 0, y + shelf + 2, 0
    frames[name] = (x, y, piece.width, piece.height)
    x += piece.width + 2
    shelf = max(shelf, piece.height)
atlas = Image.new('RGBA', (ATLAS_W, y + shelf), (0, 0, 0, 0))
for name, (piece, _) in pieces.items():
    fx, fy, _, _ = frames[name]
    atlas.paste(piece, (fx, fy))
atlas.save(atlas_path, 'WEBP', quality=92, method=6)

data = {'unit': UNIT, 'width': atlas.width, 'height': atlas.height, 'parts': {}}
for name, (piece, (left, top)) in pieces.items():
    fx, fy, fw, fh = frames[name]
    entry = {'frame': [fx, fy, fw, fh]}
    if name == 'tail':
        entry.update({'length': length, 'lead': LEAD, 'thickness': THICK})
    elif name.startswith('leg.'):
        leg = LEGS[name[4:]]
        entry.update({'chain': [[round(v, 3) for v in to_rig(x, y)] for x, y in leg['chain']], 'length': leg_strips[name[4:]][1], 'thickness': leg['thickness']})
    else:
        entry['rest'] = [round(v, 3) for v in to_rig(left, top)]
    data['parts'][name] = entry
json.dump(data, open(json_path, 'w'), indent=1)
print('atlas', atlas.size, {k: v['frame'][2:] for k, v in data['parts'].items()})
