"""Build the site's favicon set from the crane bust render.

    python3 docs/design/trana/favicons.py docs/design/trana/renders/hals-v10.png

The small sizes need a face, not a silhouette, so every icon shows the
head and the upper neck of the bust on the site's dark green disc (the
same green as the old "T" favicon). Writes public/icons/favicon.svg (the
disc with the 256 px PNG embedded), favicon-16x16/32x32, apple-touch-icon
(180, opaque), android-chrome 192 and 512.
"""
import base64
import io
import sys
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
ICONS = ROOT / "public" / "icons"
GREEN = (0x1A, 0x4B, 0x1E, 255)


def head_crop(render):
    """The head and the upper neck: the top part of the trimmed bust. The
    neck is left long so it runs out of the disc instead of ending in a cut."""
    im = render.crop(render.getbbox())
    return im.crop((0, 0, im.width, int(im.height * 0.88)))


def disc_icon(head, size, opaque=False, content=0.74, top=0.15, supersample=4):
    s = size * supersample
    im = Image.new("RGBA", (s, s), GREEN)
    box = int(s * content)
    scale = box / head.width
    h = head.resize((max(1, round(head.width * scale)),
                     max(1, round(head.height * scale))), Image.LANCZOS)
    im.alpha_composite(h, ((s - h.width) // 2, int(s * top)))
    if not opaque:
        mask = Image.new("L", (s, s), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, s - 1, s - 1), fill=255)
        im.putalpha(mask)
    return im.resize((size, size), Image.LANCZOS)


def main(render_path):
    head = head_crop(Image.open(render_path).convert("RGBA"))

    disc_icon(head, 16, content=0.95, top=0.10).save(ICONS / "favicon-16x16.png")
    disc_icon(head, 32, content=0.88, top=0.12).save(ICONS / "favicon-32x32.png")
    disc_icon(head, 180, opaque=True, content=0.74).save(ICONS / "apple-touch-icon.png")
    disc_icon(head, 192).save(ICONS / "android-chrome-192x192.png")
    disc_icon(head, 512).save(ICONS / "android-chrome-512x512.png")

    buf = io.BytesIO()
    disc_icon(head, 256).save(buf, "PNG", optimize=True)
    data = base64.b64encode(buf.getvalue()).decode()
    (ICONS / "favicon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" '
        'viewBox="0 0 64 64">\n'
        '  <image width="64" height="64" xlink:href="data:image/png;base64,'
        f'{data}"/>\n</svg>\n')

    # A preview sheet with every size on the site background.
    sheet = Image.new("RGBA", (16 + 32 + 180 + 192 + 512 + 6 * 24, 512 + 48), "#eeeedb")
    x = 24
    for name in ("favicon-16x16", "favicon-32x32", "apple-touch-icon",
                 "android-chrome-192x192", "android-chrome-512x512"):
        im = Image.open(ICONS / f"{name}.png").convert("RGBA")
        sheet.alpha_composite(im, (x, 24 + 512 - im.height))
        x += im.width + 24
    sheet.convert("RGB").save(Path(__file__).resolve().parent / "favicons-preview.png")
    print("wrote icons to", ICONS)


if __name__ == "__main__":
    main(sys.argv[1])
