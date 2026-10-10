#!/usr/bin/env python3
"""HULK PROBE — what the death-sequence remap will make of a player sheet.

R8 closed the death hulk's VALUE defect and left one open item: our hulk's
p95 reads 123 against the arcade's 144, and the mechanism was correctly
diagnosed -- "the sheet's brightest authored tone is 23 % of its pixels and
cannot enter the arcade's top 5 % without splitting it." The remap lives in
src/game/flow/deathSequence.js, which the flow lane owns. THE LEVER IS THE
SHEET, which the sprite lane owns, and this file is how the sprite lane can
see the consequence of a sheet edit without running the game.

It reimplements nothing. ARCADE_HULK_Q and the Rec.601 luma are READ OUT OF
deathSequence.js's own source, so the two cannot drift -- the same reason
tools/art/far_lod_preview.mjs evaluates enemySprite.js's function text
instead of copying it.

The remap, restated so the output is readable: every DISTINCT source luma is
placed at the midpoint of its own share interval in the sheet's histogram
(black and transparent excluded) and given the arcade hulk's own R at that
quantile. So a tone owning a large share has its midpoint dragged toward the
middle of the distribution and CANNOT reach the top rung, however bright it
is in the sheet. To put a pixel on the arcade's 189, the brightest tone must
own under about 5 % of the opaque non-black sheet.

  python3 tools/art/hulk_probe.py [sheet.png ...]

CAVEAT, inherited and restated: the arcade target itself is a NIGHT, 30 fps,
video-decoded death (HUD digit 3) applied to a daylight object, and the R8
critique argues section 5(a) that the 144/191 tail should not be chased until
a daylight death instance exists. This tool therefore reports the whole
distribution and names the top-tone share as the actionable number; it does
not declare a pass or a fail on p95.
"""
import re
import sys
import numpy as np
from PIL import Image

SRC = open('src/game/flow/deathSequence.js').read()
Q = [int(x) for x in re.search(
    r'const ARCADE_HULK_Q = \[([^\]]*)\]', SRC).group(1).replace('\n', '').split(',') if x.strip()]
# the arcade's own measured percentiles, from the same file's comment table
ARCADE = {'p5': 36, 'p25': 51, 'p50': 65, 'p75': 84, 'p95': 144, 'max': 191}


def luma(a):
    return np.round((a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) / 1000).astype(int)


def probe(path):
    a = np.asarray(Image.open(path).convert('RGBA')).astype(int)
    op = a[..., 3] > 0
    y = luma(a)
    sel = op & (y > 0)
    vals = y[sel]
    n = vals.size
    u, c = np.unique(vals, return_counts=True)
    shares = c / n

    last = len(Q) - 1
    cum = 0.0
    lut = {}
    for v, s in zip(u, shares):
        mid = cum + s / 2
        cum += s
        lut[int(v)] = Q[min(last, max(0, int(round(mid * last))))]
    out = np.array([lut[int(v)] for v in vals])

    top = int(u[-1])
    print(f'{path}')
    print(f'  opaque non-black px {n}   distinct tones {u.size}')
    print(f'  brightest tone luma {top}, share {100*shares[-1]:.1f} %  -> remaps to R {lut[top]}')
    print(f'  (to reach the top rung {Q[-1]} the brightest tone must own '
          f'< {100*(1/(2*last)):.1f} %; to reach {Q[-2]}, < {100*(3/(2*last)):.1f} %)')
    pct = {'p5': 5, 'p25': 25, 'p50': 50, 'p75': 75, 'p95': 95}
    row = '  ours   ' + '  '.join(f'{k} {np.percentile(out, v):5.0f}' for k, v in pct.items())
    print(row + f'  max {out.max():5.0f}')
    print('  arcade ' + '  '.join(f'{k} {ARCADE[k]:5d}' for k in pct) + f"  max {ARCADE['max']:5d}")
    return lut[top]


if __name__ == '__main__':
    paths = sys.argv[1:] or ['src/assets/sprites/player-f14.png',
                             'src/assets/sprites/player-f14-night.png']
    for p in paths:
        probe(p)
        print()
