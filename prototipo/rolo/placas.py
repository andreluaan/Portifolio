"""Cuts the three illustrations out of the plaques reference and whitens them. They are not redrawn.

Run: python prototipo/rolo/placas.py
Output: public/images/placas/
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "public" / "images" / "placas"
PLAQUE_WHITE = 251
PANELS = {
    "varal": (432, 335, 640, 540),
    "sobre": (742, 335, 950, 540),
    "estante": (1040, 335, 1248, 540),
    "processo": (0, 0, 262, 258),
    "atelie": (1390, 200, 1660, 466),
}

# The branch is the faintest drawing in the reference; this brings it level with the others
INK_GAIN = {"processo": 2.4}

OUTPUT.mkdir(parents=True, exist_ok=True)
source = Image.open(Path(__file__).with_name("placas-original.webp")).convert("L")
for name, box in PANELS.items():
    crop = source.crop(box)
    crop = crop.resize((416, 410), Image.LANCZOS)
    ink = np.clip(1 - np.asarray(crop, dtype=np.float32) / 226, 0, 1) ** 1.15
    ink = np.clip(ink * INK_GAIN.get(name, 1), 0, 1)
    height, width = ink.shape
    across = np.minimum(np.arange(width), np.arange(width)[::-1]) / (width * 0.1)
    down = np.minimum(np.arange(height), np.arange(height)[::-1]) / (height * 0.1)
    # The crop's edges dissolve into the plaque, so no rectangle shows
    edge = np.clip(across, 0, 1)[None, :] * np.clip(down, 0, 1)[:, None]
    gray = PLAQUE_WHITE * (1 - ink * edge)
    Image.fromarray(gray.astype(np.uint8)).save(OUTPUT / f"{name}.webp", quality=80, method=6)
