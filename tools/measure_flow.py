#!/usr/bin/env python3
"""Empirical cross-frame flow measurement for gap 10 (scrollSpeed
re-derivation). Cross-correlates a vertical strip near screen center between
two consecutive (1 fixed-tick apart, 1/60s) frames to find the apparent
downward displacement in native pixels/frame, then converts to the
motion-metrics 192px-work-width basis for comparison against the REFERENCE.md
certified floor (3.063 px/frame)."""
import argparse
import numpy as np
from PIL import Image


def load_native(path, native_scale=3):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    return img[::native_scale, ::native_scale]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frame0')
    ap.add_argument('frame1')
    ap.add_argument('--x-frac', type=float, default=0.5)
    ap.add_argument('--strip-width', type=int, default=20)
    ap.add_argument('--y0-frac', type=float, default=0.75)
    ap.add_argument('--y1-frac', type=float, default=0.92)
    ap.add_argument('--max-shift', type=int, default=15)
    args = ap.parse_args()

    a = load_native(args.frame0)
    b = load_native(args.frame1)
    h, w, _ = a.shape
    x0 = int(args.x_frac * w - args.strip_width / 2)
    x1 = x0 + args.strip_width
    y0 = int(args.y0_frac * h)
    y1 = int(args.y1_frac * h)

    stripA = a[y0:y1, x0:x1].mean(axis=(1, 2))  # 1D luminance profile vs y
    stripB = b[y0 - args.max_shift:y1 + args.max_shift, x0:x1].mean(axis=(1, 2))

    stripA = stripA - stripA.mean()
    best_shift, best_corr = 0, -1e18
    for shift in range(-args.max_shift, args.max_shift + 1):
        seg = stripB[args.max_shift + shift: args.max_shift + shift + len(stripA)]
        seg = seg - seg.mean()
        corr = np.dot(stripA, seg)
        if corr > best_corr:
            best_corr, best_shift = corr, shift

    print(f'strip: x[{x0},{x1}] y[{y0},{y1}] in {w}x{h} native')
    print(f'best displacement: {best_shift} native px/frame (positive = moved down/toward viewer)')
    native_w = 320
    work_width = 192
    px_at_work = best_shift * (work_width / native_w)
    print(f'equivalent at {work_width}px work width: {px_at_work:.3f} px/frame')
    print(f'certified floor: 3.063 px/frame -> margin ratio {px_at_work/3.063:.2f}x')


if __name__ == '__main__':
    main()
