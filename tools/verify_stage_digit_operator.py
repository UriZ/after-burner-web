#!/usr/bin/env python3
"""Head-to-head control for the two stage-attribution operators in this repo.

WHY
---
REFERENCE.md published the stage-attribution test as

    mean(RGB) > 170 over native y[200,207) x[184,192), a bar-shaped glyph for 1

and lanes have cited it for "stage digit read 1 on every frame". It CANNOT
FIRE. Two independent reasons, either alone fatal:

  1. It is a function of the BACKGROUND, not of the digit. The ink is hud.js's
     cream `#f7f794` (mean 214) and the "1" is 3 px wide inside a 7x8 box, so
     most of the box is whatever world is behind it -- the digit is drawn over
     the sea with no opaque plate. The same digit reads ~136 over bright sea
     and ~100 over dark sea, and never 170.
  2. The box is in the wrong place: hud.js's M_STAGE_DIGIT is cx 187 / y 200,
     drawn CENTRED ON THE INK, so the cell starts at x 183, not x 184.

`tools/measure_stage_identity.py` already documents failure (1) in its own
header and does exact-ink Hamming matching instead. The repo therefore held two
operators, one of which cannot work, and the ground-truth document published
the broken one. This file is the control that settles it, and it is a separate
tool rather than an edit to the reader so that the reader is not graded by
itself.

WHAT IT DOES
------------
Runs BOTH operators side by side on:

  * synthetic glyph renders 1..9 (ground truth known by construction);
  * a KNOWN-BAD input -- a cell with NO DIGIT IN IT, filled with bright sea
    caps. A usable operator must REFUSE this. The brightness operator cannot:
    its answer is a function of the background, so a bright enough background
    IS a "1";
  * real captured frames, where the digit read is cross-checked against an
    INDEPENDENT stage signature (the modal sky colour of native rows 20-60).
    Two instruments that disagree mean one is broken -- that reconciliation is
    the point, and it is why the real-frame check is not circular: the sky
    census never looks at the HUD.

Usage:
  tools/verify_stage_digit_operator.py --selftest
  tools/verify_stage_digit_operator.py --dir <capture dir> [--dir ...]
"""

import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from measure_stage_identity import (  # noqa: E402
    CREAM, DIGIT_X0, DIGIT_Y0, GLYPH_MASKS, NATIVE_H, NATIVE_W, read_digit,
    to_native)

# The operator as REFERENCE.md published it, transcribed verbatim.
PUB_BOX = (200, 207, 184, 192)   # y0, y1, x0, x1
PUB_THRESHOLD = 170.0

# Independent stage signature: the modal colour of native rows 20-60, full
# width. Measured on digit-verified captures; these are OUR renderer's skies,
# not the arcade's.
SKY_ROWS = (20, 60)


def published_operator(native):
    """REFERENCE.md's test. Returns (is_stage_1, box_mean)."""
    y0, y1, x0, x1 = PUB_BOX
    m = float(native[y0:y1, x0:x1].astype(np.float64).mean())
    return m > PUB_THRESHOLD, m


def sky_signature(native):
    """Modal sky colour of rows 20-60 -- an instrument that never sees the HUD."""
    band = native[SKY_ROWS[0]:SKY_ROWS[1]].reshape(-1, 3)
    cols, counts = np.unique(band, axis=0, return_counts=True)
    c = cols[counts.argmax()]
    return '#%02x%02x%02x' % tuple(int(v) for v in c), float(counts.max() / len(band))


def synth(digit=None, bg=(0, 159, 255), fill_cell=None):
    f = np.zeros((NATIVE_H, NATIVE_W, 3), np.uint8)
    f[:140] = bg
    if fill_cell is not None:
        f[DIGIT_Y0:DIGIT_Y0 + 8, DIGIT_X0:DIGIT_X0 + 9] = fill_cell
    if digit is not None:
        g = GLYPH_MASKS[digit]
        ys, xs = np.nonzero(g)
        f[DIGIT_Y0 + ys, DIGIT_X0 + xs] = CREAM
    return f


def selftest():
    ok = True
    print('=== stage-digit operator head-to-head ===\n')
    print(f'  published : mean(RGB) > {PUB_THRESHOLD:.0f} over y[{PUB_BOX[0]},{PUB_BOX[1]}) '
          f'x[{PUB_BOX[2]},{PUB_BOX[3]})')
    print(f'  shipped   : exact-ink #%02x%02x%02x Hamming match vs font.js BIG_GLYPHS, '
          f'cell x{DIGIT_X0} y{DIGIT_Y0}, +/-1 px slop\n' % CREAM)

    print('-- synthetic glyphs over the stage-1 sky (ground truth by construction) --')
    print(f'  {"digit":>5} {"shipped reads":>14} {"hamming":>8} {"published box mean":>20} '
          f'{"published verdict":>18}')
    for d in range(1, 10):
        f = synth(d)
        got, dist, _ = read_digit(f)
        hit, mean = published_operator(f)
        print(f'  {d:>5} {str(got):>14} {dist:>8} {mean:>20.1f} '
              f'{("stage 1" if hit else "NOT stage 1"):>18}')
        ok &= got == d and dist == 0
    print('  [%s] the shipped reader returns every digit exactly' % ('PASS' if ok else 'FAIL'))
    t = not any(published_operator(synth(d))[0] for d in range(1, 10))
    print(f'  [{"PASS" if t else "FAIL"}] the published operator fires on NONE of them '
          f'-- including the "1" it is written for')
    ok &= t

    print('\n-- KNOWN-BAD INPUT: a cell holding NO DIGIT, filled with sea caps #d6f7f7 --')
    bad = synth(digit=None, fill_cell=(214, 247, 247))
    got, dist, n = read_digit(bad)
    hit, mean = published_operator(bad)
    print(f'  shipped reader  : {got!r} (ink px {n}) -- REFUSES')
    print(f'  published oper. : box mean {mean:.1f} -> '
          f'{"STAGE 1" if hit else "not stage 1"}')
    t1 = got is None
    t2 = hit  # the known-bad input MUST fool the published operator
    print(f'  [{"PASS" if t1 else "FAIL"}] shipped reader refuses a digit-free cell')
    print(f'  [{"PASS" if t2 else "FAIL"}] published operator calls a digit-free cell '
          f'"stage 1" -- it is a brightness test on the world behind the HUD, '
          f'and this is the control that fails on a known-bad input')
    ok &= t1 and t2

    print('\n-- the reverse error: a real "1" over DARK sea --')
    dark = synth(1, bg=(0, 16, 231), fill_cell=(0, 16, 231))
    got, dist, _ = read_digit(dark)
    hit, mean = published_operator(dark)
    print(f'  shipped {got} (hamming {dist}) | published box mean {mean:.1f} -> '
          f'{"stage 1" if hit else "MISSES A GENUINE 1"}')
    t = got == 1 and not hit
    print(f'  [{"PASS" if t else "FAIL"}] the published operator misses a genuine digit '
          f'when the background is dark')
    ok &= t

    print('\n=== %s ===' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


def run_dirs(dirs):
    rc = 0
    for d in dirs:
        files = sorted(glob.glob(os.path.join(d, '*.png')))
        if not files:
            print(f'{d}: no PNGs')
            continue
        reads, means, pub_hits, skies = {}, [], 0, {}
        for f in files:
            try:
                nat = to_native(f)
            except ValueError as e:
                print(f'  REFUSED {e}')
                continue
            dg, dist, _ = read_digit(nat)
            reads[dg] = reads.get(dg, 0) + 1
            hit, m = published_operator(nat)
            means.append(m)
            pub_hits += bool(hit)
            sk, _share = sky_signature(nat)
            skies.setdefault(dg, {})
            skies[dg][sk] = skies[dg].get(sk, 0) + 1
        n = len(means)
        print(f'\n{d}   n={n}')
        print(f'  shipped reader digits      : '
              f'{ {k: v for k, v in sorted(reads.items(), key=lambda kv: (kv[0] is None, kv[0]))} }')
        print(f'  published operator         : box mean {min(means):.1f}-{max(means):.1f}, '
              f'fires on {pub_hits}/{n} frames')
        print(f'  independent sky signature  : ' +
              '; '.join(f'digit {k} -> {v}' for k, v in sorted(
                  skies.items(), key=lambda kv: (kv[0] is None, kv[0]))))
        if pub_hits == 0 and reads:
            print('  => the published operator attributes NOTHING here while the '
                  'shipped reader attributes every frame.')
            rc = 1
    return rc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', action='append', default=[])
    ap.add_argument('--selftest', action='store_true')
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.dir:
        ap.error('--dir or --selftest')
    return run_dirs(a.dir)


if __name__ == '__main__':
    sys.exit(main())
