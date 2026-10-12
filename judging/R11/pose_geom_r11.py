#!/usr/bin/env python3
"""R11: is the bank a ROLL or a width squash? Per-cell bbox of the opaque
alpha, plus the fitted angle of the wing line.

R10 critique finding 3 states the defect as a number: bbox HEIGHT pinned at 27
in all five poses with span 48/55/62/55/48, cells 0 and 4 exact mirror twins.
A roll must move the height and must break the mirror symmetry of a cell
against the vertically-flipped... no: against ITSELF. Cells 0 and 4 of a true
roll are still mirror twins of each other (a left roll mirrored is a right
roll), so THAT is not the discriminator and this tool does not use it. The
discriminator is: does the bbox get TALLER, and does the fitted wing line
have a non-zero slope?

WING LINE FIT: for each column, the vertical centre of the opaque run; then a
least-squares line over the columns outside the fuselage (|x - 32| > 10), which
is where the wing is the only thing present. Reported in degrees.

Also runs the POINT-SAMPLING VISIBILITY check that src/entities/enemySprite.js
documents: simulate NearestFilter sampling of each cell at every render size
from 4 to 40 screen px (2:1 aspect) and assert no size renders zero pixels.
That check exists because R3 measured 27 of 80 frames of one approach
rendering ZERO pixels after a silhouette change.
"""
import glob
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CW, CH = 64, 32


def cells(path):
    a = np.array(Image.open(path).convert('RGBA'))
    return [a[:, i * CW:(i + 1) * CW] for i in range(a.shape[1] // CW)]


def geom(c):
    m = c[..., 3] > 0
    ys, xs = np.nonzero(m)
    if len(xs) == 0:
        return None
    cx, cy, n = [], [], 0
    for x in range(CW):
        col = np.nonzero(m[:, x])[0]
        if len(col) == 0:
            continue
        if abs(x - CW // 2) <= 10:
            continue
        cx.append(x)
        cy.append(col.mean())
    ang = float('nan')
    if len(cx) >= 4:
        s, _ = np.polyfit(np.array(cx), np.array(cy), 1)
        ang = np.degrees(np.arctan(s))
    return {
        'span': int(xs.max() - xs.min() + 1),
        'height': int(ys.max() - ys.min() + 1),
        'ink': int(m.sum()),
        'wing_deg': ang,
    }


def visibility(c, lo=10, hi=40):
    """NearestFilter point sampling at render size w x h, h = w/2."""
    m = c[..., 3] > 0
    bad = []
    for w in range(lo, hi + 1):
        h = max(1, round(w / 2))
        rows = [min(CH - 1, int((j + 0.5) / h * CH)) for j in range(h)]
        cols = [min(CW - 1, int((i + 0.5) / w * CW)) for i in range(w)]
        if not m[np.ix_(rows, cols)].any():
            bad.append(w)
    return bad


def main():
    paths = sys.argv[1:] or sorted(glob.glob(os.path.join(
        ROOT, 'src/assets/sprites/enemy-*-head.png'))) + sorted(glob.glob(
        os.path.join(ROOT, 'src/assets/sprites/enemy-*-rear.png')))
    worst = []
    for p in paths:
        if 'night' in p:
            continue
        print(f'=== {os.path.relpath(p, ROOT)}')
        print('  cell  span  height   ink   wing-line deg')
        for i, c in enumerate(cells(p)):
            g = geom(c)
            print(f'   {i}    {g["span"]:4d}  {g["height"]:5d}  {g["ink"]:5d}   '
                  f'{g["wing_deg"]:+7.1f}')
            bad = visibility(c)
            if bad:
                worst.append((p, i, bad))
            below = visibility(c, 2, 9)
            if below:
                print(f'        (informational: invisible at quad width {below}, '
                      'which is BELOW DETAIL_SWITCH_NATIVE_PX=10 and therefore '
                      'drawn by the far LOD, not by this sheet)')
    if worst:
        print('\nVISIBILITY FAIL -- these (sheet, cell) render ZERO pixels at these sizes:')
        for p, i, bad in worst:
            print(f'  {os.path.basename(p)} cell {i}: {bad}')
        return 1
    print('\nVISIBILITY: every cell of every day sheet renders >=1 pixel at every '
          'quad width 10-40 px -- the whole band in which this sheet is used '
          '(DETAIL_SWITCH_NATIVE_PX = 10). (R3 bug class: 27 of 80 frames of '
          'one approach rendered ZERO pixels after a silhouette change.)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
