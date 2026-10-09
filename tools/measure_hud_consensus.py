#!/usr/bin/env python3
"""HUD pixel-exactness against the TWO-FRAME ARCADE CONSENSUS.

R5's presentation lane reported the SCORE emblem, the HIT emblem and the
throttle widget as pixel-exact -- "13,272 of 13,272" over 12 frames, and
"11,060 of 11,060" over 10 after a later change. That harness was not left
in the tree, so this is a re-implementation from the method described in
judging/R5/lane-presentation.md, not a call into it; the per-frame totals it
produces are this tool's own and are not expected to equal 1,106 exactly.
What matters is that the SAME operator is run before and after a change.

THE OPERATOR.
  consensus  = pixels where reference/ab2-arcade-desert.png and
               reference/ab2-arcade-night-banking.png are byte-identical.
               Two different stages with two different ground palettes, so
               agreement over an element means the element is HUD bitmap and
               not world; this is derived from the frames, not a drawn box.
  region     = consensus restricted to the three element rects below, which
               are src/ui/hud.js's own measured extents.
  match      = our pixel equals the arcade pixel exactly, all three channels.

  A pixel where we draw NOTHING counts as a mismatch, deliberately. The
  alternative (scoring only pixels we chose to paint) would let a HUD that
  omits an element score 100%.

THE THROTTLE CAVEAT, which is the one place this could be gamed. The bar's
fill extent depends on throttleFraction, so the subject must be rendered at
the arcade's own setting (x96, i.e. f = 0.5634 -- see tools/hud-probe.mjs).
Measuring a live gameplay frame instead would score our throttle POSITION
against theirs and report the difference as a bitmap error.

    python3 tools/measure_hud_consensus.py --selftest
    python3 tools/measure_hud_consensus.py --frame <probe canvas png>
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NATIVE_W, NATIVE_H = 320, 224

# src/ui/hud.js: M_SCORE_EMBLEM {x16 y14 w56 h12}, M_HIT_EMBLEM {x160 y16
# w32 h8}, and the throttle rect the two native frames are byte-identical
# over, x[54,131] y[200,207].
RECTS = {
    'SCORE emblem': (16, 14, 72, 26),
    'HIT emblem': (160, 16, 192, 24),
    'throttle widget': (54, 200, 132, 208),
}


def load_rgb(path):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.uint8)
    h, w, _ = img.shape
    if (w, h) == (NATIVE_W, NATIVE_H):
        return img
    if w % NATIVE_W or h % NATIVE_H:
        raise SystemExit(f'{path}: {w}x{h} is not an integer multiple of native')
    sy, sx = h // NATIVE_H, w // NATIVE_W
    blocks = img.reshape(NATIVE_H, sy, NATIVE_W, sx, 3)
    if not (blocks == blocks[:, :1, :, :1, :]).all():
        raise SystemExit(f'{path}: upscale is not block-uniform')
    return img[::sy, ::sx]


def consensus_mask():
    a = load_rgb(os.path.join(ROOT, 'reference', 'ab2-arcade-desert.png'))
    b = load_rgb(os.path.join(ROOT, 'reference', 'ab2-arcade-night-banking.png'))
    return (a == b).all(axis=2), a


def _selftest():
    ok = True

    def check(name, got, want):
        nonlocal ok
        good = got == want
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {name}: got {got!r} want {want!r}')

    mask, arcade = consensus_mask()
    # The consensus must be a HUD-shaped set, not the whole frame and not
    # empty. If the two frames agreed everywhere, every comparison below
    # would be meaningless.
    frac = mask.mean()
    check('consensus is neither empty nor the whole frame', 0.01 < frac < 0.5, True)
    # Positive control: the arcade scored against ITSELF must be 100%.
    tot = match = 0
    for (x0, y0, x1, y1) in RECTS.values():
        sub = mask[y0:y1, x0:x1]
        tot += int(sub.sum())
        match += int(sub.sum())
    check('arcade vs itself, all rects matched', match, tot)
    # Negative control: one pixel of the arcade knocked out must cost
    # exactly one match, and must be inside the consensus to count.
    broken = arcade.copy()
    x0, y0, _, _ = RECTS['SCORE emblem']
    assert mask[y0 + 1, x0 + 1], 'control pixel is not in the consensus'
    broken[y0 + 1, x0 + 1] = (1, 2, 3)
    eq = (broken == arcade).all(axis=2)
    lost = 0
    for (rx0, ry0, rx1, ry1) in RECTS.values():
        sub = mask[ry0:ry1, rx0:rx1]
        lost += int(sub.sum()) - int((eq[ry0:ry1, rx0:rx1] & sub).sum())
    check('one knocked-out pixel costs exactly one match', lost, 1)
    print(f'  INFO  consensus covers {int(mask.sum())} px of the frame '
          f'({frac * 100:.1f}%)')
    for name, (x0, y0, x1, y1) in RECTS.items():
        print(f'  INFO  {name}: rect {(x1 - x0) * (y1 - y0)} px, '
              f'consensus {int(mask[y0:y1, x0:x1].sum())} px')
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frame', action='append', default=[])
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--show-misses', type=int, default=12)
    args = ap.parse_args()

    if args.selftest:
        print('instrument controls:')
        sys.exit(0 if _selftest() else 1)
    if not args.frame:
        raise SystemExit('--frame <png> is required')

    mask, arcade = consensus_mask()
    for path in args.frame:
        ours = load_rgb(path)
        eq = (ours == arcade).all(axis=2)
        print(f'\n{path}')
        tot_t = tot_m = 0
        for name, (x0, y0, x1, y1) in RECTS.items():
            sub = mask[y0:y1, x0:x1]
            n = int(sub.sum())
            m = int((eq[y0:y1, x0:x1] & sub).sum())
            tot_t += n
            tot_m += m
            flag = 'OK ' if m == n else 'DIFF'
            print(f'  {flag} {name:16} {m:5d} / {n:5d}')
            if m != n and args.show_misses:
                bad = np.argwhere(sub & ~eq[y0:y1, x0:x1])[:args.show_misses]
                for dy, dx in bad:
                    px, py = x0 + int(dx), y0 + int(dy)
                    print(f'        ({px},{py}) ours #%02x%02x%02x arcade #%02x%02x%02x'
                          % (*ours[py, px], *arcade[py, px]))
        print(f'  TOTAL {tot_m} / {tot_t} arcade-consensus pixels match')


if __name__ == '__main__':
    main()
