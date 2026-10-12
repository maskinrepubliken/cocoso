"""Turn the Blender render into the icon file and the preview sheets.

    python3 docs/design/trana/export.py docs/design/trana/renders/v07-final.png

Same pipeline as the 3dicons set: trim to the alpha bounding box with a
small margin, scale so the longest side is 320 px (Lanczos), save as WebP
at quality 90. Also writes a 1024 px PNG preview and a comparison sheet
next to calendar, megaphone, pin and puzzle on the site's background.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
ICONS = ROOT / "public" / "3dicons"
OUT = Path(__file__).resolve().parent
BG = "#eeeedb"


def trim(im, margin_frac=0.02):
    bbox = im.getbbox()
    im = im.crop(bbox)
    m = int(round(max(im.size) * margin_frac))
    out = Image.new("RGBA", (im.width + 2 * m, im.height + 2 * m), (0, 0, 0, 0))
    out.alpha_composite(im, (m, m))
    return out


def fit(im, longest):
    scale = longest / max(im.size)
    size = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    return im.resize(size, Image.LANCZOS)


def on_bg(im, cell):
    tile = Image.new("RGBA", (cell, cell), BG)
    tile.alpha_composite(im, ((cell - im.width) // 2, (cell - im.height) // 2))
    return tile


def main(render_path):
    src = Image.open(render_path).convert("RGBA")
    trimmed = trim(src)

    icon = fit(trimmed, 320)
    icon.save(ICONS / "trana.webp", "WEBP", quality=90, method=6)
    fit(trimmed, 1024).save(OUT / "trana-preview-1024.png")

    # Comparison sheet: the set's icons and the crane, then the crane small.
    cell = 360
    names = ["calendar", "megaphone", "trana", "pin", "puzzle"]
    sheet = Image.new("RGBA", (cell * len(names), cell * 2), BG)
    for i, name in enumerate(names):
        im = Image.open(ICONS / f"{name}.webp").convert("RGBA")
        sheet.alpha_composite(on_bg(im, cell), (i * cell, 0))
    x = 20
    for size in (320, 128, 64, 32):
        small = fit(icon, size)
        sheet.alpha_composite(small, (x, cell + 20 + (320 - small.height)))
        x += small.width + 40
    sheet.convert("RGB").save(OUT / "trana-comparison.png")
    print("icon", icon.size, "->", ICONS / "trana.webp")


if __name__ == "__main__":
    main(sys.argv[1])
