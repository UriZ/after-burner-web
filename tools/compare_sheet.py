#!/usr/bin/env python3
"""Build an ARCADE-vs-OURS comparison sheet with the row identity baked INTO
the image.

Why this exists: the round report labelled a BEFORE/AFTER strip "Ours vs the
arcade" twice, and the owner could not tell which panel was which — a caption
under a picture is not an answer when the picture itself is ambiguous. Every
row here carries a coloured spine with its own name, so the sheet stays
self-describing wherever it is pasted.

    python3 tools/compare_sheet.py --out <path.png> \
        --row "ARCADE 1987|#0a73c4|f1.png,f2.png" \
        --row "OURS|#d9630b|g1.png,g2.png"
"""
import argparse

from PIL import Image, ImageDraw, ImageFont

PANEL_H = 300          # every panel is scaled to this height
GAP = 8                # gap between panels
SPINE_W = 132          # width of the labelled spine on the left of each row
PAD = 10


def font(size, bold=False):
    names = (
        ["/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc"]
        if bold
        else ["/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc"]
    )
    for n in names:
        try:
            return ImageFont.truetype(n, size)
        except OSError:
            continue
    return ImageFont.load_default()


def load_row(paths):
    out = []
    for p in paths:
        im = Image.open(p).convert("RGB")
        w = max(1, round(im.width * PANEL_H / im.height))
        # NEAREST keeps arcade/our pixel art chunky instead of smearing it.
        out.append(im.resize((w, PANEL_H), Image.NEAREST))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--row", action="append", required=True,
                    help='"LABEL|#hex|path1,path2,..."')
    ap.add_argument("--title", default=None)
    args = ap.parse_args()

    rows = []
    for spec in args.row:
        label, colour, paths = spec.split("|", 2)
        rows.append((label, colour, load_row([p for p in paths.split(",") if p])))

    body_w = max(sum(im.width for im in ims) + GAP * (len(ims) - 1) for _, _, ims in rows)
    title_h = 44 if args.title else 0
    W = SPINE_W + body_w + PAD * 2
    H = title_h + len(rows) * (PANEL_H + GAP) - GAP + PAD * 2

    sheet = Image.new("RGB", (W, H), "#11161c")
    d = ImageDraw.Draw(sheet)

    if args.title:
        d.text((PAD, PAD + 6), args.title, fill="#ffffff", font=font(26, bold=True))

    y = title_h + PAD
    for label, colour, ims in rows:
        d.rectangle([PAD, y, PAD + SPINE_W - GAP, y + PANEL_H], fill=colour)
        f = font(21, bold=True)
        # Stack the label's words so a long name stays readable in the spine.
        words = label.split()
        line_h = 25
        ty = y + (PANEL_H - line_h * len(words)) // 2
        for w_ in words:
            tw = d.textbbox((0, 0), w_, font=f)[2]
            d.text((PAD + (SPINE_W - GAP - tw) / 2, ty), w_, fill="#ffffff", font=f)
            ty += line_h
        x = PAD + SPINE_W
        for im in ims:
            sheet.paste(im, (x, y))
            x += im.width + GAP
        y += PANEL_H + GAP

    sheet.save(args.out)
    print(f"wrote {args.out} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    main()
