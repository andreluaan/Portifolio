"""Cuts the pieces ChatGPT painted out of their white background. They are not redrawn.

Run: python prototipo/pecas/recortar.py
Output: public/images/pecas/
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).parent
OUTPUT = HERE.parents[1] / "public" / "images" / "pecas"
WIDTHS = {"estante": 620, "placa": 420, "quadro": 1400, "casa": 620, "correio": 360, "moldura": 700, "mesinha": 640}
# Background closed inside a piece, which a flood from the edges cannot reach
HOLES = {"estante": [(499, 1009)], "placa": [(507, 110)], "quadro": [], "casa": [], "correio": [], "moldura": [], "mesinha": []}
OUTSIDE = 120
# How far the blacks rise towards white, so the heaviest wood sits with the pale painting
LIFT = {"estante": 0.14, "quadro": 0.22}
# The andreluaan.dev paper (#F3F0E8): every piece is printed on it, so its blank paper matches the page around it
PAPER = (243, 240, 232)

for name, width in WIDTHS.items():
    source = Image.open(HERE / f"{name}.png").convert("RGB")
    gray = source.convert("L")
    # Only white connected to the image's edge is background: the blank paper inside each piece stays opaque
    flood = gray.point(lambda value: 255 if value >= 244 else 0)
    for seed in [(0, 0), (flood.width - 1, 0), (0, flood.height - 1), (flood.width - 1, flood.height - 1), *HOLES[name]]:
        if flood.getpixel(seed) == 255:
            ImageDraw.floodfill(flood, seed, OUTSIDE)
    outside = flood.point(lambda value: 255 if value == OUTSIDE else 0)
    alpha = outside.point(lambda value: 255 - value).filter(ImageFilter.GaussianBlur(0.8))
    box = alpha.getbbox()
    lift = LIFT.get(name, 0)
    lifted = [value + (255 - value) * lift for value in range(256)]
    piece = source.point([round(value * tone / 255) for tone in PAPER for value in lifted])
    piece.putalpha(alpha)
    piece = piece.crop(box)
    piece = piece.resize((width, round(piece.height * width / piece.width)), Image.LANCZOS)
    piece.save(OUTPUT / f"{name}.webp", quality=84, method=6)
    print(name, piece.size, box, source.size)
    check = Image.new("RGB", piece.size, (120, 120, 120))
    check.paste(piece, (0, 0), piece)
    check.save(HERE / f"check-{name}.jpg", quality=80)
