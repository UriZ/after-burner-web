#!/usr/bin/env python3
"""Build the side-by-side jet panels: the arcade, then ours, at MATCHED SPAN
and true native scale, then zoomed nearest-neighbour.

"When a number and the reference crop disagree, the crop wins." This file is
the crop. Everything it emits is span-matched so the two aircraft can be laid
against each other without the eye doing the scaling.

  python3 tools/art/jet_compare.py <out.png> [--old <png>] [--zoom 7]

--old takes a saved copy of a previous sheet (e.g. `git show HEAD:...`
written to a file) so a BEFORE row can sit in the same figure.
"""
import sys
import numpy as np
from PIL import Image

SKY = (0, 148, 247)       # our stage-1 sky #0094f7
NIGHT = (0, 0, 0)


def composite(rgba, bg):
    a = rgba[:, :, 3:4].astype(float) / 255.0
    return (rgba[:, :, :3] * a + np.array(bg, float) * (1 - a)).astype(np.uint8)


def cell(sheet, i, n=9, bg=SKY):
    im = Image.open(sheet).convert('RGBA')
    cw = im.width // n
    return composite(np.asarray(im.crop((i * cw, 0, (i + 1) * cw, im.height))), bg)


def arcade_level(target_w=117):
    """t175 is a 2.14375x video upscale. Box-resample to native-equivalent."""
    im = Image.open('reference/stage3-night-level-t175.png').convert('RGB')
    c = im.crop((207, 227, 487, 306))
    k = c.width / target_w
    return np.asarray(c.resize((target_w, int(round(c.height / k))), Image.BOX))


def arcade_bank():
    im = Image.open('reference/ab2-arcade-desert.png').convert('RGB')
    return np.asarray(im.crop((80, 82, 180, 142)))


def label_band(w, text, h=9):
    """A 1-px-per-char marker row. Deliberately crude: the panels are the
    evidence and a rendered font would be the biggest thing in the figure."""
    return np.full((h, w, 3), 24, np.uint8)


def stack(panels, zoom, out, gap=5, bg=(26, 26, 30)):
    w = max(p.shape[1] for p in panels)
    h = sum(p.shape[0] for p in panels) + gap * (len(panels) - 1)
    c = np.full((h, w, 3), bg, np.uint8)
    y = 0
    for p in panels:
        x = (w - p.shape[1]) // 2
        c[y:y + p.shape[0], x:x + p.shape[1]] = p
        y += p.shape[0] + gap
    Image.fromarray(c).resize((w * zoom, h * zoom), Image.NEAREST).save(out)
    print(f'{out}  {w}x{h} native -> {zoom}x')


def main():
    out = sys.argv[1]
    zoom = 7
    old = None
    if '--zoom' in sys.argv:
        zoom = int(sys.argv[sys.argv.index('--zoom') + 1])
    if '--old' in sys.argv:
        old = sys.argv[sys.argv.index('--old') + 1]

    panels = [arcade_level()]
    if old:
        panels.append(cell(old, 4)[10:58])
    panels.append(cell('src/assets/sprites/player-f14.png', 4)[10:58])
    stack(panels, zoom, out)


if __name__ == '__main__':
    main()
