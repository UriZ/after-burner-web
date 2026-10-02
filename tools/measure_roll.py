#!/usr/bin/env python3
"""Measures world-roll angle from a captured frame via a horizon line-fit
(REFERENCE.md "Horizon tilt when banking" acceptance: rotation not shear,
line-fit residual < 2px; sign convention: positive = banking right = world
rotates clockwise on screen, horizon descends to the right)."""
import sys
import argparse
import numpy as np
from PIL import Image

SKY_HEX = (0x00, 0x9f, 0xff)  # stage-1 sky, srgb-exact per stage.js

# HUD bounding boxes (src/ui/hud.js, REFERENCE.md 686x480 table scaled by
# 320/686, 224/480) — these are screen-fixed and do NOT rotate with world
# roll, so they must be masked out before horizon detection or they read as
# spurious "horizon" hits regardless of actual roll (found by measurement:
# unmasked scans gave RMS residuals of 50-150px and a non-monotonic angle
# sequence under a constant held stick).
HUD_BOXES_NATIVE = [
    (17, 16, 70, 23), (104, 16, 142, 22), (161, 16, 190, 23), (202, 17, 212, 22),
    (237, 24, 291, 47), (17, 201, 42, 206), (47, 201, 103, 207),
    (136, 200, 164, 207), (175, 199, 193, 210), (196, 199, 250, 220),
]


def load_native(path, native_scale=3):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    img = img[::native_scale, ::native_scale]
    mode = np.array(SKY_HEX, dtype=np.float64)
    for x0, y0, x1, y1 in HUD_BOXES_NATIVE:
        img[y0:y1, x0:x1] = mode
    return img


def horizon_points(img, n_cols=40, consecutive=4, threshold=40):
    # Deviation from the exact sky color. Reliable at low-to-moderate roll
    # (measured: <=1.1px RMS residual up to ~25deg of roll); breaks down at
    # high roll angles because it also fires on the pale haze band's near
    # edge, which — viewed through an off-center frame corner under roll —
    # projects very non-uniformly (same radial-distortion effect found in
    # the ground-texture ACF measurement). Not used to measure saturation
    # angle for that reason; see dev report.
    h, w, _ = img.shape
    mode = np.array(SKY_HEX, dtype=np.float64)
    xs = np.linspace(w * 0.05, w * 0.95, n_cols).astype(int)
    pts = []
    for x in xs:
        col = img[:, x, :]
        dev = np.abs(col - mode).sum(axis=1)
        hit = dev > threshold
        for y in range(h - consecutive):
            if hit[y:y + consecutive].all():
                pts.append((x, y))
                break
    return np.array(pts)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('png')
    args = ap.parse_args()
    img = load_native(args.png)
    h, w, _ = img.shape
    pts = horizon_points(img)
    if len(pts) < 5:
        print(f'only {len(pts)} horizon points found, cannot fit')
        sys.exit(1)
    xs, ys = pts[:, 0].astype(float), pts[:, 1].astype(float)
    # Least-squares line fit y = m*x + c
    A = np.vstack([xs, np.ones_like(xs)]).T
    m, c = np.linalg.lstsq(A, ys, rcond=None)[0]
    pred = m * xs + c
    residual = np.sqrt(np.mean((ys - pred) ** 2))
    max_residual = np.max(np.abs(ys - pred))
    angle_deg = np.degrees(np.arctan(m))
    # Screen Y increases downward. m>0 means y increases with x, i.e. the
    # line descends (goes DOWN) as x increases (moving right) -> horizon
    # descends to the right.
    direction = 'descends to the right (banking right)' if m > 0 else 'descends to the left (banking left)' if m < 0 else 'level'
    print(f'image: {w}x{h}, {len(pts)} horizon points')
    print(f'fit: y = {m:.4f}*x + {c:.2f}')
    print(f'tilt angle: {angle_deg:.2f} deg, {direction}')
    print(f'RMS residual: {residual:.2f}px, max residual: {max_residual:.2f}px (rotation-not-shear acceptance: <2px)')


if __name__ == '__main__':
    main()
