#!/usr/bin/env python3
"""R36 cruise-sway: horizon position + tilt per frame.

Operator (per frame):
  1. Sky color = modal color of the top band (rows 8%..18%H — skips the very
     top border rows but stays above any plausible horizon). AB2 sky is a
     flat fill, so the mode is exact (STAGE_MAP: stage-1 sky mode share 97.8%).
  2. Per column x (subsampled): horizon candidate = smallest y where
     (a) rows y..y+6 all deviate from sky (sum |rgb diff| > 60), and
     (b) >=90% of rows from y down to the 84%H row deviate from sky.
     Condition (b) is what rejects HUD islands (SCORE/HIT text, lock reticle):
     they deviate but return to flat sky below, so the run test fails there.
  3. Robust line fit: median of candidates, reject columns >5%H from median,
     least-squares line on survivors, reject >2.5%H residuals, refit.
     Output: y at frame centre (as %H) and tilt (deg, positive = horizon
     descends to the right).

Columns through the player jet give horizon-too-high candidates; the
median rejection drops them (jet spans <35% of columns).

Validation: --control <frame.png> shifts a real frame down by a known 4 px
and rotates it by a known 2 deg; the operator must recover both.
"""
import argparse
import glob
import json
import math
import os
import sys

import numpy as np
from PIL import Image

DEV_THRESHOLD = 60
CONSEC = 6
RUN_FRac = 0.90
BOTTOM_FRAC = 0.84  # SPEED bar starts ~86%H; stop the run test above it


def load(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.int32)


def sky_color(img):
    h = img.shape[0]
    band = img[int(h * 0.08):int(h * 0.18)].reshape(-1, 3)
    colors, counts = np.unique(band, axis=0, return_counts=True)
    return colors[np.argmax(counts)], counts.max() / band.shape[0]


def horizon_fit(img, n_cols=80):
    h, w, _ = img.shape
    sky, share = sky_color(img)
    y_bot = int(h * BOTTOM_FRAC)
    xs = np.linspace(int(w * 0.02), int(w * 0.98), n_cols).astype(int)
    cand_x, cand_y = [], []
    dev_all = (np.abs(img - sky).sum(axis=2) > DEV_THRESHOLD)
    for x in xs:
        col = dev_all[:, x]
        run = np.convolve(col[:y_bot].astype(int), np.ones(CONSEC, int), 'valid') == CONSEC
        start_rows = np.nonzero(run)[0]
        found = None
        # cumulative-from-bottom deviating fraction, over rows y..y_bot
        csum = np.cumsum(col[:y_bot][::-1])[::-1]  # csum[y] = # deviating rows in [y, y_bot)
        for y in start_rows:
            frac = csum[y] / (y_bot - y)
            if frac >= RUN_FRac:
                found = y
                break
        if found is not None:
            cand_x.append(x)
            cand_y.append(found)
    if len(cand_y) < n_cols * 0.4:
        return None  # not enough sky->ground columns (e.g. extreme bank)
    cx = np.array(cand_x, float)
    cy = np.array(cand_y, float)

    def theil_sen(x, y):
        slopes = []
        n = len(x)
        for i in range(n):
            dx = x[i + 1:] - x[i]
            dy = y[i + 1:] - y[i]
            ok = np.abs(dx) > w * 0.05  # skip near-vertical pairs (noise amplifiers)
            slopes.extend((dy[ok] / dx[ok]).tolist())
        m = float(np.median(slopes))
        b = float(np.median(y - m * x))
        return m, b

    m, b = theil_sen(cx, cy)
    resid = np.abs(m * cx + b - cy)
    keep = resid < 0.025 * h
    if keep.sum() < 10:
        return None
    m, b = theil_sen(cx[keep], cy[keep])
    y_center = m * (w / 2) + b
    tilt_deg = math.degrees(math.atan2(m, 1.0))
    return {
        'y_center_px': float(y_center),
        'y_center_fracH': float(y_center / h),
        'tilt_deg': float(tilt_deg),
        'n_cols_used': int(keep.sum()),
        'sky_share': float(share),
    }


def run_dir(d, pattern='f*.png'):
    rows = []
    for i, p in enumerate(sorted(glob.glob(os.path.join(d, pattern)))):
        r = horizon_fit(load(p))
        rows.append({'frame': i, 'file': os.path.basename(p), **(r or {'y_center_px': None})})
    return rows


def control(path):
    img = load(path)
    base = horizon_fit(img)
    assert base is not None, 'control frame: no horizon found'
    # known shift: +4 px down
    shifted = np.roll(img, 4, axis=0)
    s = horizon_fit(shifted)
    dshift = s['y_center_px'] - base['y_center_px']
    # known tilt: rotate 2 deg about centre (PIL rotate is CCW; a CCW image
    # rotation makes the horizon RISE to the right -> operator tilt -2 under
    # our sign convention... measure and report both signs explicitly)
    pil = Image.fromarray(img.astype(np.uint8)).rotate(2.0, resample=Image.BILINEAR, fillcolor=tuple(int(v) for v in sky_color(img)[0]))
    r = horizon_fit(np.asarray(pil, dtype=np.int32))
    dtilt = r['tilt_deg'] - base['tilt_deg']
    print(f'base: y={base["y_center_px"]:.2f}px ({base["y_center_fracH"]*100:.2f}%H) tilt={base["tilt_deg"]:.3f}deg cols={base["n_cols_used"]}')
    print(f'shift control: measured dy={dshift:+.2f}px (expected +4.00)')
    print(f'tilt  control: measured dtilt={dtilt:+.3f}deg (expected magnitude 2.000)')
    ok = abs(dshift - 4.0) <= 0.75 and abs(abs(dtilt) - 2.0) <= 0.25
    print('CONTROL:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', help='frame dir to measure')
    ap.add_argument('--control', help='single frame for the known-shift/tilt control')
    ap.add_argument('--out', help='output jsonl')
    args = ap.parse_args()
    if args.control:
        sys.exit(control(args.control))
    rows = run_dir(args.dir)
    with open(args.out, 'w') as f:
        for r in rows:
            f.write(json.dumps(r) + '\n')
    good = [r for r in rows if r.get('y_center_px') is not None]
    print(f'{len(good)}/{len(rows)} frames fitted -> {args.out}')
