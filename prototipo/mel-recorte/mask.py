"""Separates the drawn dog from the paper: dilate the pencil strokes so the outline closes, flood-fill the paper from
the borders, then shrink back. Writes mask.png (255 = dog) next to the output path given."""
import sys
from collections import deque

import numpy as np
from PIL import Image

source, out_dir = sys.argv[1], sys.argv[2]
gray = np.asarray(Image.open(source).convert('L')).astype(np.float32) / 255
h, w = gray.shape
GROUND = 921  # the drawn ground line starts at y = 923

ink = gray < 0.8
# The soft pencil shadow on the floor would weld the paws together: only firm strokes count down there
ink[860:GROUND, :] = gray[860:GROUND, :] < 0.5
ink[GROUND:, :] = False


def dilate(mask, radius):
    out = mask.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            if dx * dx + dy * dy > radius * radius:
                continue
            out |= np.roll(np.roll(mask, dy, axis=0), dx, axis=1)
    return out


closed = dilate(ink, 6)
background = np.zeros_like(closed)
queue = deque()
for x in range(w):
    for y in (0, h - 1):
        queue.append((y, x))
for y in range(h):
    for x in (0, w - 1):
        queue.append((y, x))
while queue:
    y, x = queue.popleft()
    if background[y, x] or (closed[y, x] and y < GROUND):
        continue
    background[y, x] = True
    if y > 0: queue.append((y - 1, x))
    if y < h - 1: queue.append((y + 1, x))
    if x > 0: queue.append((y, x - 1))
    if x < w - 1: queue.append((y, x + 1))

dog = ~background
# Shrink back the dilation, keeping a hair of margin so the soft pencil fur stays
dog = ~dilate(~dog, 4)
# The paws are drawn light, so near the floor the fill leaks into them: inside each paw's box, anything darker than
# the paper is paw. Then grow and shrink back to close what is left.
PAW_BOXES = [(452, 860, 580, GROUND), (608, 868, 732, GROUND), (808, 856, 926, GROUND)]
paws = np.zeros_like(dog)
for x0, y0, x1, y1 in PAW_BOXES:
    paws[y0:y1, x0:x1] = gray[y0:y1, x0:x1] < 0.9
paws = ~dilate(~dilate(paws, 5), 5)
dog |= paws
lower = dog.copy()
lower[:840, :] = False
dog |= ~dilate(~dilate(lower, 6), 6)
dog[GROUND:, :] = False
Image.fromarray((dog * 255).astype(np.uint8)).save(f'{out_dir}/mask.png')
ys, xs = np.nonzero(dog)
print('bbox', xs.min(), ys.min(), xs.max(), ys.max(), 'area', int(dog.sum()))
