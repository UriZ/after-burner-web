#!/usr/bin/env python3
"""Measures world-roll angle from a captured frame via a horizon line-fit
(REFERENCE.md "Horizon tilt when banking" acceptance: rotation not shear,
line-fit residual < 2px; sign convention: positive = banking right = world
rotates clockwise on screen, horizon descends to the right)."""
import os
import sys
import argparse
import numpy as np
from PIL import Image
from hud_mask import get_hud_mask

SKY_HEX = (0x00, 0x9f, 0xff)  # stage-1 sky, srgb-exact per stage.js

# HUD exclusion now comes from hud_mask.py (derived fresh from a clean
# capture) instead of a hardcoded bounding-box list. The old hardcoded list
# here silently stopped matching as the HUD was iterated by another agent —
# this is screen-fixed geometry (does NOT rotate with world roll, so it
# must be masked out before horizon detection or it reads as spurious
# "horizon" hits regardless of actual roll), but WHERE it sits on screen is
# not this script's to track. See hud_mask.py's header for the full history
# (hit independently 3 times in one round).


def load_native(path, native_scale=3, hud_mask=None):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    img = img[::native_scale, ::native_scale]
    if hud_mask is not None:
        mode = np.array(SKY_HEX, dtype=np.float64)
        img[hud_mask] = mode
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
    ap.add_argument('--hud-mask-dir', default=os.path.join('tools', 'out', 'hudmask-cache'),
                     help='cache dir for the derived HUD mask (captured fresh if absent)')
    ap.add_argument('--refresh-hud-mask', action='store_true', help='force re-deriving the HUD mask')
    args = ap.parse_args()
    hud_mask = get_hud_mask(args.hud_mask_dir, force=args.refresh_hud_mask)
    img = load_native(args.png, hud_mask=hud_mask)
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
