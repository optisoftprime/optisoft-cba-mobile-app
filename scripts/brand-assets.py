"""
Build every branded image a CBA-Mobile client needs from the client's logo.

    npm run brand:assets -- <client> path/to/lockup.png --mark path/to/mark.png
    (or: python scripts/brand-assets.py <client> path/to/lockup.png --mark path/to/mark.png)

Writes into clients/<client>/assets/ — the names the app and app.config.js read:

    logo.png                      the lockup, TRANSPARENT (for light backgrounds)
    logo-dark.png                 the same with a white wordmark (dark backgrounds)
    icon.png                      1024, OPAQUE — iOS rejects alpha
    adaptive-icon.png             Android, transparent, inside the safe circle
    adaptive-icon-monochrome.png  Android themed icons, white silhouette
    favicon.png                   the web build's tab icon

and copies the source artwork into clients/<client>/source/, so a later change
starts from the real files, not a screenshot. With --store <dir> it also writes
the two Play Console listing images (playStoreIcon.png 512x512, featureGraphic.png
1024x500) — those are uploaded by hand and are NOT in the app.

The icon background and the brand colour default to the client's client.json
(icon.background, colors.light.primary).

Ported from cba-agent-app/scripts/brand-assets.py. The rules it encodes, each of
which has cost a release before:
  * iOS icons must have NO alpha channel, so the icon is flattened onto a colour.
  * Android masks the adaptive icon to a circle and crops ~25% off each edge,
    so the mark is drawn at 66% of the canvas, centred.
  * A logo with a baked-in white (or black) background shows as a box on the
    other theme, so the flat background is cut out and the colours un-mixed.
  * A dark wordmark vanishes on a dark screen, so the dark variant repaints
    NEUTRAL (grey/black) pixels white and leaves coloured ones alone — unless
    the client supplies its own dark logo with --dark.

Needs Pillow (`pip install pillow`); an SVG source also needs PyMuPDF
(`pip install pymupdf`). A dev tool, not part of the app bundle.

Ask the client for the LOCKUP (mark + name) and the MARK (symbol alone)
separately, as SVG or PNG at 1024px or more. Smaller sources are upscaled and
look soft — the script says so.
"""

import argparse
import json
import os
import shutil
import sys

try:
    from PIL import Image
except ImportError:  # pragma: no cover - a dev machine without Pillow
    sys.exit("Pillow is needed: pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = None  # clients/<client>/assets — set in main()

# What the splash and the receipt draw from. Tall on purpose: the Android
# launch splash draws this image across the FULL screen width (the legacy
# full-screen mode we use to dodge Android 12's circle crop), so on a 1440p
# handset a 240px-tall lockup is upscaled and reads as blurry — which is what
# it did. At 480 the widest phone still downscales rather than stretches.
LOCKUP_HEIGHT = 480
ICON = 1024
STORE_ICON = 512  # Play Console listing icon
FAVICON = 196  # the web build's browser-tab icon
FEATURE = (1024, 500)  # Play Console feature graphic, fixed by Google
SAFE_AREA = 0.66  # Android crops the adaptive icon to roughly this
NEUTRAL_RANGE = 70  # max channel spread still counted as grey/black, not colour
WHITE_FLOOR = 8  # alpha below this is background, not a faint edge
# Much higher than WHITE_FLOOR, and deliberately so: a WhatsApp JPEG's black is
# not quite black, and the ringing around a bright edge survives as a grey halo
# that is invisible on a dark screen and obvious on a white one. The darkest
# real colour in the artwork (the deep purple) is far above this.
BLACK_FLOOR = 48
# How far above the floor counts as the anti-aliased edge. Narrow on purpose:
# wider eats into dark artwork, narrower leaves a hard, jagged outline.
BLACK_EDGE = 70


def open_source(path, render_width=2048):
    """
    Open a PNG/JPG, or render an SVG at a size big enough for the icon.

    SVG is the source to ask for: it is resolution-free, so the icon and the
    splash are both sharp whatever the designer exported at.
    """
    if not path.lower().endswith(".svg"):
        return Image.open(path)

    try:
        import pymupdf
    except ImportError:
        sys.exit("An SVG source needs: pip install pymupdf")

    from io import BytesIO

    page = pymupdf.open(path)[0]
    # Rasterise AT the size we need. Rendering small and enlarging afterwards
    # throws away the one advantage an SVG has.
    zoom = max(1, render_width / max(page.rect.width, page.rect.height))
    pixels = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), alpha=True)
    return Image.open(BytesIO(pixels.tobytes("png")))


def cut_out_background(image):
    """
    Drop a baked-in flat background and recover the colours underneath.

    Works for a WHITE or a BLACK background — a designer's export is usually
    one or the other, and the delivered eZONE artwork is on black. Which one it
    is, is read from the corners rather than assumed, and the alpha is derived
    from the distance to that background so the anti-aliased edge survives
    instead of turning into a halo.

    White cannot simply be treated as "background" here: the eZONE mark has
    white INSIDE it, so on a black source the white swirl is artwork and the
    black is background. Getting this backwards erases half the logo.
    """
    image = image.convert("RGBA")
    if any(pixel[3] < 255 for pixel in image.getdata()):
        return image  # already transparent, nothing to un-mix

    width, height = image.size
    corners = [
        image.getpixel((0, 0)),
        image.getpixel((width - 1, 0)),
        image.getpixel((0, height - 1)),
        image.getpixel((width - 1, height - 1)),
    ]
    on_black = sum(max(pixel[:3]) for pixel in corners) / len(corners) < 128

    out = Image.new("RGBA", image.size)
    source, target = image.load(), out.load()
    for y in range(height):
        for x in range(width):
            r, g, b, _ = source[x, y]

            if on_black:
                # The artwork is OPAQUE on black, not composited onto it, so
                # brightness is not coverage: the eZONE mark's deep purple is a
                # deep purple, and "un-mixing" it against black turns it into
                # lavender. Only a narrow band just above the floor is treated
                # as a soft edge; the colour itself is never touched.
                level = max(r, g, b)
                if level < BLACK_FLOOR:
                    target[x, y] = (0, 0, 0, 0)
                    continue
                edge = min(255, round(((level - BLACK_FLOOR) / BLACK_EDGE) * 255))
                target[x, y] = (r, g, b, edge)
                continue

            alpha = 255 - min(r, g, b)
            if alpha < WHITE_FLOOR:
                target[x, y] = (0, 0, 0, 0)
                continue
            share = alpha / 255
            target[x, y] = (
                *[max(0, min(255, round((v - (1 - share) * 255) / share))) for v in (r, g, b)],
                alpha,
            )
    return out


def whiten_neutrals(image):
    """Repaint grey/black pixels white; leave the brand's colours alone."""
    out = Image.new("RGBA", image.size)
    source, target = image.load(), out.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = source[x, y]
            if a == 0:
                target[x, y] = (0, 0, 0, 0)
            elif max(r, g, b) - min(r, g, b) < NEUTRAL_RANGE:
                target[x, y] = (255, 255, 255, a)
            else:
                target[x, y] = (r, g, b, a)
    return out


def trim(image):
    box = image.getbbox()
    return image.crop(box) if box else image


def scaled_to_height(image, height):
    return image.resize((max(1, round(image.width * height / image.height)), height), Image.LANCZOS)


def centred_on(canvas_size, image, background=None):
    """Fit `image` inside the safe area of a square canvas."""
    canvas = Image.new("RGBA", (canvas_size, canvas_size), background or (0, 0, 0, 0))
    room = round(canvas_size * SAFE_AREA)
    ratio = min(room / image.width, room / image.height)
    fitted = image.resize((max(1, round(image.width * ratio)), max(1, round(image.height * ratio))), Image.LANCZOS)
    canvas.paste(fitted, ((canvas_size - fitted.width) // 2, (canvas_size - fitted.height) // 2), fitted)
    return canvas


def client_config(client):
    """The client's client.json — the one place its colours are written down."""
    with open(os.path.join(ROOT, "clients", client, "client.json"), encoding="utf-8") as f:
        return json.load(f)


def save(image, name, folder=None):
    path = os.path.join(folder or IMAGES, name)
    image.save(path, optimize=True)
    print(f"  {name:<32} {image.size[0]}x{image.size[1]}  {os.path.getsize(path) // 1024}KB")


def main():
    parser = argparse.ArgumentParser(description="Build a client's branded images from its logo.")
    parser.add_argument("client", help="the client folder name under clients/, e.g. optisoft")
    parser.add_argument("source", help="the full lockup (mark + wordmark), as big as you have")
    # Same names, same sizes, same place — the app and app.config.js need no edit.
    parser.add_argument("--mark", help="the mark on its own, for the icons; defaults to the source")
    parser.add_argument(
        "--dark",
        help="the lockup as drawn for DARK backgrounds (a white wordmark, usually). Without it the "
        "dark variant is derived by whitening the neutral pixels, which is a guess.",
    )
    parser.add_argument(
        "--icon-background", default=None, help="behind the iOS icon (default: client.json icon.background)"
    )
    parser.add_argument(
        "--logo-only",
        action="store_true",
        help="only the in-app lockup; leave the icons alone (for a logo we have but no icon artwork yet)",
    )
    parser.add_argument(
        "--feature-background",
        default="#FFFFFF",
        help="behind the Play Console feature graphic. NOT the icon's background: the graphic "
        "carries the full lockup, so its background has to suit the WORDMARK's colour.",
    )
    parser.add_argument(
        "--store",
        nargs="?",
        const=os.path.join(os.path.expanduser("~"), "Downloads"),
        help="also write the Play Console listing images here (default: your Downloads folder)",
    )
    args = parser.parse_args()

    global IMAGES
    client_dir = os.path.join(ROOT, "clients", args.client)
    if not os.path.exists(os.path.join(client_dir, "client.json")):
        sys.exit(f"clients/{args.client}/client.json not found — create the client first (see BRANDING.md).")
    config = client_config(args.client)
    IMAGES = os.path.join(client_dir, "assets")
    os.makedirs(IMAGES, exist_ok=True)
    if args.icon_background is None:
        args.icon_background = config.get("icon", {}).get("background", "#FFFFFF")

    # Keep the client's original artwork next to what is generated from it.
    source_dir = os.path.join(client_dir, "source")
    os.makedirs(source_dir, exist_ok=True)
    for original in filter(None, [args.source, args.mark, args.dark]):
        if os.path.abspath(os.path.dirname(original)) != os.path.abspath(source_dir):
            shutil.copy2(original, source_dir)

    lockup = trim(cut_out_background(open_source(args.source)))
    mark = trim(cut_out_background(open_source(args.mark))) if args.mark else lockup

    if lockup.height < LOCKUP_HEIGHT or mark.height < ICON * SAFE_AREA:
        print(
            f"WARNING: the source is {lockup.width}x{lockup.height}. The icon needs a mark around "
            f"{round(ICON * SAFE_AREA)}px and the lockup {LOCKUP_HEIGHT}px tall; anything smaller is "
            "upscaled and will look soft on a phone. Ask for an SVG or a 1024px export.\n"
        )

    print("writing:")
    save(scaled_to_height(lockup, LOCKUP_HEIGHT), "logo.png")
    dark = trim(cut_out_background(open_source(args.dark))) if args.dark else whiten_neutrals(lockup)
    save(scaled_to_height(dark, LOCKUP_HEIGHT), "logo-dark.png")

    if args.logo_only:
        print("\n--logo-only: icons left as they are.")
        return

    # iOS refuses an icon with an alpha channel, so this one is flattened.
    icon = centred_on(ICON, mark, background=args.icon_background)
    save(icon.convert("RGB"), "icon.png")

    save(centred_on(ICON, mark), "adaptive-icon.png")

    save(centred_on(FAVICON, mark, background=args.icon_background).convert("RGB"), "favicon.png")

    silhouette = Image.new("RGBA", mark.size)
    silhouette.putdata([(255, 255, 255, a) for (*_, a) in mark.convert("RGBA").getdata()])
    save(centred_on(ICON, silhouette), "adaptive-icon-monochrome.png")

    if args.store:
        os.makedirs(args.store, exist_ok=True)
        print(f"\nfor the Play Console listing, in {args.store}:")

        # Its own upload, shown beside the app name — the launcher artwork at
        # the size Google asks for. Saved as 32-bit RGBA, fully opaque: the
        # Console's spec for the listing icon is "32-bit PNG", and it rejects a
        # 24-bit one. The FEATURE graphic below is the opposite — 24-bit, no
        # alpha — so the two cannot share a save path.
        listing = centred_on(STORE_ICON, mark, background=args.icon_background)
        listing.putalpha(255)
        save(listing, "playStoreIcon.png", folder=args.store)

        # 1024x500 exactly, or the Console refuses it.
        #
        # The LIGHT lockup — the BLUE wordmark — on white, matching the app
        # icon and the listing around it. Tying this to the icon's background
        # was a bug: with a white icon background the white-wordmark lockup
        # went onto white and "ZONE" vanished.
        feature = Image.new("RGBA", FEATURE, args.feature_background)
        art = lockup
        room = (round(FEATURE[0] * 0.62), round(FEATURE[1] * 0.42))
        ratio = min(room[0] / art.width, room[1] / art.height)
        art = art.resize(
            (max(1, round(art.width * ratio)), max(1, round(art.height * ratio))), Image.LANCZOS
        )
        feature.paste(art, ((FEATURE[0] - art.width) // 2, (FEATURE[1] - art.height) // 2), art)
        save(feature.convert("RGB"), "featureGraphic.png", folder=args.store)

    print(f"\nNext: npm run check:brand -- {args.client}   then   npm run brand:use {args.client}")


if __name__ == "__main__":
    main()
