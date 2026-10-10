#!/usr/bin/env python3
"""The arcade title card's TWO periods, measured off the longplay.

This is the evidence for the two animation constants in
src/game/flow/titleScreen.js, and it exists because four rounds of this
project measured the title off a SINGLE FRAME of a MOVING object.

    # the title card is up t=64..77 s of ab2-longplay.mp4 (686x480, 30 fps)
    ffmpeg -v error -ss 64 -t 22 -i .reference-cache/video/ab2-longplay.mp4 \
           -vf fps=30 -y <dir>/f-%04d.png
    python3 judging/R9/title_anim_arcade_r9.py --frames <dir>

WHY THE 686x480 FILE AND NOT THE 1028x720 ONE. These are TIMING measurements
-- a red-pixel count and an area count, both thresholded far from their
decision boundaries -- so resolution buys nothing, and the 30 fps file does
not have the AV1 seek offset that CLAUDE.md warns about for sequence
extraction off the 60 fps file. The GEOMETRY measurements all use 1028x720;
these two do not.

  BLINK   red pixel count inside the "INSERT COIN!" line box. Run lengths,
          in 30 fps frames, over the whole dwell.
  TUMBLE  blue+red pixel count inside the sphere plate's box. The signal's
          autocorrelation peak is the period of |cos(tilt)|, i.e. HALF a
          revolution.

Both are reported in 60 Hz TICKS, which is what the game counts in.
"""
import argparse
import glob
import os

import numpy as np
from PIL import Image

# 686x480 boxes. INSERT COIN from the published t74 measurement; the plate
# box is the face-on native box (x[109,229] y[51,173]) scaled by 686/320,
# padded so a tilted pose cannot leave it.
COIN_BOX = (388, 416, 250, 440)      # y0 y1 x0 x1
PLATE_BOX = (100, 380, 210, 510)


def runs(flags):
    out = []
    cur = flags[0]
    n = 0
    for v in flags:
        if v == cur:
            n += 1
        else:
            out.append((cur, n))
            cur = v
            n = 1
    out.append((cur, n))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', required=True, help='dir of f-%%04d.png at 30 fps')
    ap.add_argument('--fps', type=float, default=30.0)
    # THE WINDOW IS PART OF THE MEASUREMENT. The extraction above starts at
    # t=64.0 s and the title card is replaced by the attract demo at t~76.0,
    # which has its own moving content inside both boxes. Measuring past the
    # card mixes two signals: the tumble autocorrelation drops from 64 frames
    # to 20 if the demo is included, and the blink's run lengths pick up a
    # tail of 53/26/27/23. Default = frames 0..359 = t 64.0..76.0.
    ap.add_argument('--window', default='0:360', help='frame range, lo:hi')
    args = ap.parse_args()
    fs = sorted(glob.glob(os.path.join(args.frames, 'f-*.png')))
    if not fs:
        raise SystemExit('no frames')
    lo, hi = (int(v) for v in args.window.split(':'))
    fs = fs[lo:hi]
    coin = []
    plate = []
    for f in fs:
        a = np.asarray(Image.open(f).convert('RGB')).astype(int)
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        c = a[COIN_BOX[0]:COIN_BOX[1], COIN_BOX[2]:COIN_BOX[3]]
        coin.append(int(((c[..., 0] > 150) & (c[..., 1] < 90) & (c[..., 2] < 90)).sum()))
        m = (((b - r) > 35) & (b > 120) & (r > 95)) | (((r - b) > 60) & (r > 140))
        m[:PLATE_BOX[0]] = False
        m[PLATE_BOX[1]:] = False
        m[:, :PLATE_BOX[2]] = False
        m[:, PLATE_BOX[3]:] = False
        plate.append(int(m.sum()))

    on = [c > 50 for c in coin]
    rr = runs(on)
    # drop the first and last run: they are clipped by the card's entry/exit
    mid = rr[1:-1]
    ons = [n for v, n in mid if v]
    offs = [n for v, n in mid if not v]
    print('BLINK  "INSERT COIN!" red-pixel presence, %d frames at %g fps' % (len(fs), args.fps))
    print('  ON  runs (frames):', ons)
    print('  OFF runs (frames):', offs)
    if ons and offs:
        print('  median ON %g frames = %g ticks, median OFF %g frames = %g ticks'
              % (np.median(ons), np.median(ons) * 60 / args.fps,
                 np.median(offs), np.median(offs) * 60 / args.fps))

    x = np.array(plate, float)
    x = x - x.mean()
    ac = [(float((x[:-d] * x[d:]).mean()), d) for d in range(20, min(200, len(x) - 1))]
    ac.sort(reverse=True)
    best = ac[0][1]
    print('TUMBLE sphere-plate area signal')
    print('  autocorrelation peak at %d frames = %.0f ticks (HALF a revolution)'
          % (best, best * 60 / args.fps))
    print('  -> one revolution = %.0f ticks' % (2 * best * 60 / args.fps))
    print('  area swing min %d max %d (x%.1f)' % (min(plate), max(plate), max(plate) / max(1, min(plate))))


if __name__ == '__main__':
    main()
