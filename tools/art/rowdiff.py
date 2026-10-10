#!/usr/bin/env python3
"""ROW-DIFF — where, on the aircraft, the excess ink sits.

INK-SPAN says the drawing is too heavy and SW says it is made of slabs.
Neither says WHICH slab. This prints the arcade's level astern silhouette
and ours as filled-pixel counts per row, both normalised to one span and one
height, so the two can be subtracted.

The arcade side is reference/stage3-night-level-t175.png, the SAME crop the
sheet's own anchors were read off (player-f14.js, "ROW-RUNS"), under the
same max(RGB)>30 mask -- so any disagreement here is a disagreement with the
sheet's own stated source, not with a new one.

Usage: python3 tools/art/rowdiff.py [--cell 4]
"""
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, 'tools/art')
from inkspan import (mask_achromatic, mask_value, largest_component,  # noqa: E402
                     fill_holes, feret, AIRFRAME_EXTRA)


def prof(m, nrows=31):
    """Filled count and extent per row, resampled to `nrows`, in % of SPAN."""
    ys = np.nonzero(m.any(axis=1))[0]
    xs = np.nonzero(m.any(axis=0))[0]
    sub = m[ys[0]:ys[-1] + 1, xs[0]:xs[-1] + 1]
    span = feret(m)
    h = sub.shape[0]
    out = []
    for i in range(nrows):
        a = int(round(i * h / nrows))
        b = max(a + 1, int(round((i + 1) * h / nrows)))
        band = sub[a:b]
        filled = band.sum() / (b - a)
        cols = np.nonzero(band.any(axis=0))[0]
        ext = (cols[-1] - cols[0] + 1) if cols.size else 0
        out.append((100.0 * filled / span, 100.0 * ext / span))
    return out, span, h


def main():
    cell = 4
    if '--cell' in sys.argv:
        cell = int(sys.argv[sys.argv.index('--cell') + 1])

    a = np.asarray(Image.open('reference/stage3-night-level-t175.png')
                   .convert('RGBA'))[227:306, 207:487]
    arc = fill_holes(largest_component(mask_value(a[:, :, :3])))

    im = Image.open('src/assets/sprites/player-f14.png').convert('RGBA')
    cw = im.width // 9
    o = np.asarray(im.crop((cell * cw, 0, (cell + 1) * cw, im.height)))
    ours = fill_holes(largest_component(
        mask_achromatic(o[:, :, :3], extra=AIRFRAME_EXTRA) & (o[:, :, 3] > 0)))

    pa, sa, ha = prof(arc)
    po, so, ho = prof(ours)
    print(f'arcade span {sa:.1f} h {ha}   ours span {so:.1f} h {ho}')
    print('  rows resampled to 31; FILL and EXTENT both in % of that side\'s own SPAN')
    print()
    print(f"{'row':>4}{'%H':>6} | {'ARC fill':>9}{'ARC ext':>9} | "
          f"{'OUR fill':>9}{'OUR ext':>9} | {'fill diff':>10}")
    tot = 0.0
    for i, ((fa, ea), (fo, eo)) in enumerate(zip(pa, po)):
        d = fo - fa
        tot += d
        bar = ('#' * int(d * 2)) if d > 0 else ('.' * int(-d * 2))
        print(f"{i:>4}{100*i/31:>6.0f} | {fa:>9.2f}{ea:>9.2f} | "
              f"{fo:>9.2f}{eo:>9.2f} | {d:>10.2f} {bar}")
    print(f"{'':>4}{'':>6} | {sum(x[0] for x in pa):>9.2f}{'':>9} | "
          f"{sum(x[0] for x in po):>9.2f}{'':>9} | {tot:>10.2f}")
    print()
    print('  FILL is span-normalised, so summing the column gives INK/SPAN x 100/31.')
    print(f"  arcade ink/span {sum(x[0] for x in pa)*31/100:.2f}   "
          f"ours {sum(x[0] for x in po)*31/100:.2f}   "
          f"ours is {sum(x[0] for x in po)/sum(x[0] for x in pa):.2f}x")


if __name__ == '__main__':
    main()
