#!/usr/bin/env python3
"""TITLE-WORD-HEIGHT — letter height that is not a bounding box.

Why this file exists
--------------------
"BURNER is 13.7 % taller than AFTER" was published off
`reference/title-screen-t74.png` and would have been implemented as per-word
scaling (AFTER x1.13 / BURNER x1.29). It is an artefact of TWO independent
inflators, and a whole-word bounding box cannot separate either of them from a
real size difference:

  1. BASELINE SHEAR. The AB2 wordmark is set on a sloped, sheared baseline.
     A LONGER WORD'S BBOX SPANS MORE ROWS AT IDENTICAL LETTER HEIGHT, purely
     because its own width carries it further down the slope. BURNER is the
     longer word. Worth 6.7 points on a perfectly clean frame.
  2. THE SPHERE PLATE. The "II" plate is a 3-D object that TUMBLES, and on
     most title frames it sits behind the wordmark. Its white specular
     highlights pass a plain brightness threshold and extend whichever word
     they sit behind -- by a different amount in every frame, because the
     plate is in a different pose in every frame.

OPERATOR
  Per column of the word's row band, the local ink extent (last ink row minus
  first ink row, inclusive). Report the MEDIAN over inked columns. This is a
  LOCAL height and is invariant to the baseline slope; a whole-band bbox is
  not. Mask is WHITE ink only -- `min(RGB) >= 200 and max-min <= 30` -- which
  also excludes the blue A and the red B, so the oversized bookend letters do
  not enter a body-height statistic.

  Measure on a frame with NO PLATE BEHIND THE WORDMARK. In the longplay those
  are t70 and t71; t72-t75 all carry the plate.

CONTROL (--selftest): a 40-row bar translated down a 1-in-4 slope must return
a per-column median of 40 while its bbox returns 89.

WHAT IT CANNOT SEE
  * It is a HEIGHT statistic. It says nothing about weight, shear angle,
    chisel, or the oversized bookends -- which are the actual cause of the
    21.5 % whole-wordmark shortfall, and that shortfall SURVIVES this
    correction.
  * On a column passing through only a horizontal bar the extent is that
    bar's thickness, which drags the median down. Compare two words measured
    the same way; do not read an absolute.
"""
import sys
import numpy as np
from PIL import Image


def white_mask(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    return (a.min(axis=2) >= 200) & (a.max(axis=2) - a.min(axis=2) <= 30)


def per_column_height(mask, y0, y1):
    band = mask[y0:y1 + 1]
    hs = []
    for x in range(band.shape[1]):
        col = np.nonzero(band[:, x])[0]
        if len(col):
            hs.append(col.max() - col.min() + 1)
    if not hs:
        raise ValueError('no ink in band -- refusing to return a plausible zero')
    return np.array(hs)


def bbox_extent(mask, y0, y1):
    rows = np.nonzero(mask[y0:y1 + 1].any(axis=1))[0]
    return int(rows.max() - rows.min() + 1)


def selftest():
    ok = True
    syn = np.zeros((200, 300), bool)
    for x in range(200):
        y = 20 + x // 4
        syn[y:y + 40, x + 20] = True
    h = per_column_height(syn, 0, 199)
    bb = bbox_extent(syn, 0, 199)
    good = abs(np.median(h) - 40.0) < 0.5
    ok &= good
    print(f'  [{"PASS" if good else "FAIL"}] sloped 40-row bar: per-column median '
          f'{np.median(h):.1f} (want 40.0)')
    good = bb > 80
    ok &= good
    print(f'  [{"PASS" if good else "FAIL"}] the same bar by BBOX reads {bb} '
          f'-- the artefact this operator exists to remove')
    flat = np.zeros((100, 100), bool); flat[30:70, 10:90] = True
    good = abs(np.median(per_column_height(flat, 0, 99)) - 40.0) < 0.5
    ok &= good
    print(f'  [{"PASS" if good else "FAIL"}] unsloped 40-row bar still reads 40.0 '
          f'-- the operator is not just subtracting a constant')
    try:
        per_column_height(np.zeros((10, 10), bool), 0, 9)
        print('  [FAIL] empty band returned a value'); ok = False
    except ValueError:
        print('  [PASS] empty band raises rather than returning a plausible zero')
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(selftest())
    path = sys.argv[1]
    m = white_mask(path)
    for name, y0, y1 in (('AFTER (white FTER)', 112, 219), ('BURNER (white URNER)', 242, 357)):
        h = per_column_height(m, y0, y1)
        print(f'{name:22s} cols {len(h):3d}  per-column median {np.median(h):5.1f}  '
              f'p90 {np.percentile(h, 90):5.1f}  BBOX {bbox_extent(m, y0, y1):3d}')
