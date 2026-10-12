#!/usr/bin/env python3
"""Ruled contact sheets for HAND-DIGITISING the arcade player jet's screen x.

Why by hand: three automatic operators (jet_envelope.py's airframe mass,
jet_nozzles.py's nozzle pair, and the mass detector with morphological closing)
all pass their synthetic selftests and all FAIL on real frames, because the
thing they cannot do is tell the PLAYER's aircraft from an enemy, a cloud, an
explosion fragment or the bottom HUD. Identity is what a person supplies here.
An envelope is a POSITIONAL EXTREMUM, so it carries no speed claim and does not
need a 60 Hz sample; the sampling rate is stated anyway.

Each panel carries a ruler: a vertical line every 10 %W labelled 0..9, the
centreline (50 %W) in red, and a 5 %W minor tick between each pair.

Usage: sheet.py <dir> <out.png> [--cols 4] [--rows 3] [--start 0] [--step 1] [--scale 0.4]
"""
import sys, os, glob
from PIL import Image, ImageDraw, ImageFont

FONTS = ['/System/Library/Fonts/Supplemental/Arial Bold.ttf',
         '/System/Library/Fonts/Helvetica.ttc']


def font(sz):
    for f in FONTS:
        if os.path.exists(f):
            try: return ImageFont.truetype(f, sz)
            except Exception: pass
    return ImageFont.load_default()


def rule(im, label):
    W, H = im.size
    d = ImageDraw.Draw(im)
    for k in range(1, 20):
        x = W * k / 20.0
        if k % 2:
            d.line([x, 0, x, 34], fill=(255, 255, 255), width=2)          # 5 %W minor
        else:
            col = (255, 0, 0) if k == 10 else (0, 255, 255)
            d.line([x, 0, x, H], fill=col, width=2 if k != 10 else 3)
            d.text((x + 4, 2), str(k // 2), fill=col, font=font(44))
    d.text((6, H - 54), label, fill=(255, 255, 0), font=font(44))
    return im


def main():
    d_in, out = sys.argv[1], sys.argv[2]
    def arg(n, dv, cast=int):
        return cast(sys.argv[sys.argv.index(n) + 1]) if n in sys.argv else dv
    cols, rows = arg('--cols', 4), arg('--rows', 3)
    start, step = arg('--start', 0), arg('--step', 1)
    scale = arg('--scale', 0.4, float)
    files = sorted(glob.glob(os.path.join(d_in, 'f*.png')))[start::step][:cols * rows]
    ps = []
    for f in files:
        im = Image.open(f).convert('RGB')
        im = rule(im, os.path.basename(f).replace('.png', ''))
        ps.append(im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS))
    cw, ch = ps[0].size
    sh = Image.new('RGB', (cw * cols, ch * rows), (20, 20, 20))
    for j, p in enumerate(ps):
        sh.paste(p, ((j % cols) * cw, (j // cols) * ch))
    sh.save(out)
    print(out, sh.size, len(ps), 'panels')


if __name__ == '__main__':
    main()
