#!/usr/bin/env python3
"""Gap-10 measurement: horizontal ACF decorrelation length at two depth
bands (near vs far), at NATIVE TEXEL scale (R3 judge's corrected criterion
— the arcade video is a 2.144x upscale of 320x224, so matching pixel lags
on the raw 686x480 frame inflates everything by that factor).

Target direction: arcade REFINES toward the camera (decorrelation length
shrinks, e.g. 4.64 far -> 1.05 near); R3 measured ours COARSENING
(1.76 far -> 4.12 near) — the wrong direction. This script checks only
the TREND (does near < far, i.e. does our texture refine like the
arcade's), not an exact match to the arcade's absolute values, since
R3 flagged this gap-10 as low priority and the exact scanning geometry
the arcade measurement used is not fully reproducible here."""
import argparse
import numpy as np
from PIL import Image


def load_native(path, native_scale=3):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    return img[::native_scale, ::native_scale]


def horiz_decorrelation_length(img, y0, y1, x0, x1):
    """1/e half-width of the horizontal autocorrelation of the luminance
    signal in the given patch, sub-pixel interpolated (an integer-pixel
    step count is unusably noisy for lengths of only a few pixels —
    learned the hard way on the R3 roll-angle measurement)."""
    patch = img[y0:y1, x0:x1].mean(axis=2)
    row_acf = []
    for row in patch:
        row = row - row.mean()
        n = len(row)
        full = np.correlate(row, row, mode='full')
        acf = full[n - 1:]
        if acf[0] > 0:
            row_acf.append(acf / acf[0])
    if not row_acf:
        return None
    acf = np.mean(row_acf, axis=0)
    thresh = np.exp(-1)
    i = 0
    while i < len(acf) - 1 and acf[i] > thresh:
        i += 1
    if i == 0:
        return 0.0
    y_a, y_b = acf[i - 1], acf[i]
    if y_a == y_b:
        return float(i)
    frac = (y_a - thresh) / (y_a - y_b)
    return (i - 1) + frac


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('png')
    ap.add_argument('--horizon-row', type=int, default=140)
    args = ap.parse_args()

    img = load_native(args.png)
    h, w, _ = img.shape

    # Far band: just below the haze band (horizon + ~12%H), near-center x.
    # Near band: lower in the frame (closer to camera), same x range.
    far_y0, far_y1 = args.horizon_row + int(0.12 * h), args.horizon_row + int(0.20 * h)
    near_y0, near_y1 = int(0.85 * h), int(0.95 * h)
    x0, x1 = int(0.35 * w), int(0.65 * w)

    far_len = horiz_decorrelation_length(img, far_y0, far_y1, x0, x1)
    near_len = horiz_decorrelation_length(img, near_y0, near_y1, x0, x1)

    print(f'far band y[{far_y0},{far_y1}): horiz decorrelation length {far_len:.2f} native texels')
    print(f'near band y[{near_y0},{near_y1}): horiz decorrelation length {near_len:.2f} native texels')
    if far_len and near_len:
        trend = 'REFINES toward camera (correct direction)' if near_len < far_len else 'COARSENS toward camera (wrong direction)'
        print(f'ratio near/far: {near_len/far_len:.2f} -- {trend}')


if __name__ == '__main__':
    main()
