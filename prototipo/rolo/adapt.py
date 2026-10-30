"""Prepares André's painting as the world's background. It is used as it is: only resized, never repainted.

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

source = Image.open(Path(__file__).with_name("original.webp")).convert("RGB")
for height, quality in SIZES.items():
    size = (round(source.width * height / source.height), height)
    source.resize(size, Image.LANCZOS).save(OUTPUT / f"scroll-{height}-0.webp", quality=quality, method=6)

width = round(source.width * max(SIZES) / source.height)
MANIFEST.write_text(json.dumps({"width": width, "height": max(SIZES), "tiles": 1, "tileWidth": width, "sizes": sorted(SIZES)}) + "\n")
print(source.size, width)
