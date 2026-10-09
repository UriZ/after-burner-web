#!/usr/bin/env python3
"""Criterion A per DIGIT-VERIFIED stage, split by screen region.

R7 gap 9. The R6 judge's figure for stage 2 is "33 channel values (median
over 43 frames, three spacings) against <=32, residual located in the horizon
band at 27 against the ground's 13", and the R6 world lane's own 41-43 does
not reproduce because it predates the HUD reticle fix. Re-measuring is
therefore the first step of the gap, not an optional check.

OPERATOR. Criterion A2 is the UNION over R, G and B of the distinct values
present, which is how REFERENCE.md's arcade figures (desert 31, night 17)
were taken -- ledger row 14. The per-channel maximum is reported beside it
because the two have been confused once already.

The regions are fixed native row bands and are reported separately so a
whole-frame figure, which is a composite over five lanes' output, is never
mistaken for this lane's. The HUD band is included in "frame" and excluded
from the three world bands, so the difference between them attributes the
residual.

CONTROL: --selftest reproduces REFERENCE.md's two published arcade frames
(138 colours / 31 union / 29 per-channel, and 79 / 17 / 17).
"""
import argparse
import glob
import hashlib
import os
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from measure_night_ground import load_native  # noqa: E402
from measure_stage_identity import read_digit  # noqa: E402

REGIONS = [
    ('sky  [0,120)', 0, 120),
    ('horiz[120,150)', 120, 150),
    ('mid  [150,180)', 150, 180),
    ('far  [180,196)', 180, 196),
    ('hud  [196,224)', 196, 224),
    ('frame', 0, 224),
]


def criterion_a(img):
    flat = img.reshape(-1, 3)
    uniq = np.unique(flat, axis=0)
    per = [set(np.unique(img[:, :, c]).tolist()) for c in range(3)]
    union = set().union(*per)
    return len(uniq), len(union), max(len(p) for p in per), union


def selftest():
    ok = True
    for name, wc, wu, wp in (('ab2-arcade-desert.png', 138, 31, 29),
                             ('ab2-arcade-night-banking.png', 79, 17, 17)):
        img = load_native(os.path.join(ROOT, 'reference', name))
        c, u, p, _ = criterion_a(img)
        good = (c, u, p) == (wc, wu, wp)
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {name}: colours {c} (want {wc}), '
              f'union {u} (want {wu}), per-channel {p} (want {wp})')
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dirs', nargs='+')
    ap.add_argument('--stage', type=int)
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--offladder', action='store_true',
                    help="list the frame's channel values that are NOT on REFERENCE.md's "
                         'enumerated 31-entry hardware ladder')
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())

    ladder = {0, 16, 25, 33, 41, 49, 58, 66, 74, 82, 91, 99, 107, 115, 123, 132,
              140, 148, 156, 164, 173, 181, 189, 197, 206, 214, 222, 230, 239, 247, 255}
    paths = []
    for d in a.dirs:
        paths += sorted(glob.glob(os.path.join(d, 'frame-*.png')))
    rows, seen = [], set()
    for p in paths:
        img = load_native(p)
        h = hashlib.md5(img.tobytes()).hexdigest()
        if h in seen:
            print(f'  DUPLICATE frame: {p}')
        seen.add(h)
        if img.max() == 0:
            print(f'  CORRUPT all-black: {p}')
            continue
        if a.stage is not None and read_digit(img)[0] != a.stage:
            continue
        rec = {}
        for name, y0, y1 in REGIONS:
            c, u, per, union = criterion_a(img[y0:y1])
            rec[name] = (c, u, per, union)
        rows.append((p, rec))
    if not rows:
        raise SystemExit('no frames matched')
    print(f'\n{len(rows)} frames' + (f' at stage {a.stage}' if a.stage else '') +
          f' over {len(a.dirs)} capture sets')
    print(f'{"region":16} {"colours min/med/max":>22} {"A2 union min/med/max":>24} {"per-chan max":>13}')
    for name, _, _ in REGIONS:
        cs = np.array([r[1][name][0] for r in rows])
        us = np.array([r[1][name][1] for r in rows])
        ps = np.array([r[1][name][2] for r in rows])
        print(f'{name:16} {cs.min():6d}/{int(np.median(cs)):5d}/{cs.max():6d}   '
              f'{us.min():6d}/{int(np.median(us)):5d}/{us.max():6d}   {ps.max():10d}')
    if a.offladder:
        worst = max(rows, key=lambda r: r[1]['frame'][1])
        for name, _, _ in REGIONS:
            off = sorted(v for v in worst[1][name][3] if v not in ladder)
            print(f'  off-ladder in {name:16} ({len(off):2d}): {off}')
        print(f'  (worst frame by A2 union: {os.path.basename(worst[0])})')


if __name__ == '__main__':
    main()
