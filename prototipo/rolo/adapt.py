"""Prepares André's painting as the world's background. It is never repainted: only lightened, laid on the brand's
paper and resized.

Run: python prototipo/rolo/adapt.py
Output: public/images/rolo/ (scroll-<height>-0.webp) and src/data/rolo.json
"""

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "images" / "rolo"
MANIFEST = ROOT / "src" / "data" / "rolo.json"
SIZES = {1400: 82, 800: 78}

# Only the tones move: the paper goes close to white and the blacks ease, so what stands on top keeps its contrast
LIGHTEN = [min(255, round(255 * (min(value, 232) / 232) ** 0.62 * 0.74 + 66)) for value in range(256)]

# The andreluaan.dev paper (#F3F0E8). Multiplying is printing on it: the white becomes paper, the ink stays ink
PAPER = (243, 240, 232)
ON_PAPER = [round(value * tone / 255) for tone in PAPER for value in LIGHTEN]

source = Image.open(Path(__file__).with_name("original.webp")).convert("RGB").point(ON_PAPER)
for height, quality in SIZES.items():
    size = (round(source.width * height / source.height), height)
    source.resize(size, Image.LANCZOS).save(OUTPUT / f"scroll-{height}-0.webp", quality=quality, method=6)

width = round(source.width * max(SIZES) / source.height)
MANIFEST.write_text(json.dumps({"width": width, "height": max(SIZES), "tiles": 1, "tileWidth": width, "sizes": sorted(SIZES)}) + "\n")
print(source.size, width)
