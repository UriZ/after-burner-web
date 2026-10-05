#!/usr/bin/env python3
"""Open-plain share of a ground band — the stage-2 criterion operator, stated exactly.

Why this file exists: interfaces.md I26 published four arcade readings ("fraction within
24 of #e67300" over y[310,420] at 686x480) without saying what "within 24" means. Chebyshev
(max per-channel delta) and Euclidean (L2 in RGB) are both natural readings of that phrase
and they are NOT interchangeable -- L2 <= 24 is a ball of radius 24, Chebyshev <= 24 is a
cube of half-side 24, which is 6.6x the volume. This script computes BOTH on every frame so
the published figure can name its own operator, and so the next lane cannot pick the other
one by accident. (Project memory: "same name, different operator" -- a stable small
disagreement usually means two definitions of one statistic.)

Instrument control (--synthetic) before any number is believed, per CLAUDE.md: a frame with
a KNOWN plain fraction, plus pixels placed at exactly the operator's boundary on both
metrics, so an off-by-one in the comparison shows up as a whole-pixel error.

Usage:
  python3 tools/measure_plain_share.py --synthetic
  python3 tools/measure_plain_share.py --glob 'tools/out/.../arcade-s2/t*.png'
  python3 tools/measure_plain_share.py --glob '...' --band 310 420 --tol 24 --csv out.csv
"""
import argparse
import glob as globmod
import os
import re
import sys

import numpy as np
from PIL import Image

PLAIN_HEX = "#e67300"


def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) for i in (0, 2, 4)], dtype=np.int16)


def shares(img, band, tol, target):
    """Return (chebyshev_pct, euclid_pct, n_band) over rows band[0]:band[1], all columns."""
    y0, y1 = band
    sub = img[y0:y1, :, :3].astype(np.int16)
    d = sub - target.reshape(1, 1, 3)
    cheb = np.abs(d).max(axis=2) <= tol
    eucl = (d.astype(np.int32) ** 2).sum(axis=2) <= tol * tol
    n = sub.shape[0] * sub.shape[1]
    return 100.0 * cheb.sum() / n, 100.0 * eucl.sum() / n, n


def synthetic(tol, target):
    """Known input. 686x480. Band y[310,420] is 110 rows x 686 cols = 75460 px.

    Construction, all inside the band:
      - rows 310..364 (55 rows, 37730 px) are EXACTLY #e67300      -> in both metrics
      - rows 365..392 (28 rows) are #e67300 + (24,0,0)             -> cheb YES (==tol),
                                                                      eucl YES (24 == tol)
      - rows 393..406 (14 rows)  are #e67300 + (25,0,0)            -> both NO (one over)
      - rows 407..413 (7 rows)   are #e67300 + (14,14,14)          -> cheb YES,
                                                                      eucl NO (24.2 > 24)
      - rows 414..419 (6 rows)   are #0010e6 (sea)                 -> both NO
    Expected: cheb = (55+28+7)/110 = 81.8182%, eucl = (55+28)/110 = 75.4545%.
    Outside the band the frame is pure #e67300, so a wrong band selection cannot
    accidentally reproduce these numbers -- it drives them toward 100%.
    """
    img = np.zeros((480, 686, 3), dtype=np.uint8)
    img[:, :] = target.astype(np.uint8)
    img[365:393] = (target + np.array([24, 0, 0])).astype(np.uint8)
    img[393:407] = (target + np.array([25, 0, 0])).astype(np.uint8)
    img[407:414] = (target + np.array([14, 14, 14])).astype(np.uint8)
    img[414:420] = np.array([0x00, 0x10, 0xE6], dtype=np.uint8)
    c, e, n = shares(img, (310, 420), tol, target)
    exp_c, exp_e = 100 * 90 / 110, 100 * 83 / 110
    ok = abs(c - exp_c) < 1e-9 and abs(e - exp_e) < 1e-9 and n == 110 * 686
    print(f"synthetic: band px {n} (expect {110*686})")
    print(f"  chebyshev {c:.4f}%  expect {exp_c:.4f}%   delta {c-exp_c:+.6f}")
    print(f"  euclidean {e:.4f}%  expect {exp_e:.4f}%   delta {e-exp_e:+.6f}")
    print("CONTROL:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--glob")
    ap.add_argument("--band", nargs=2, type=int, default=[310, 420])
    ap.add_argument("--tol", type=int, default=24)
    ap.add_argument("--target", default=PLAIN_HEX)
    ap.add_argument("--csv")
    ap.add_argument("--synthetic", action="store_true")
    a = ap.parse_args()
    target = hex_rgb(a.target)

    if a.synthetic:
        sys.exit(synthetic(a.tol, target))
    if not a.glob:
        ap.error("--glob or --synthetic")

    files = sorted(
        globmod.glob(a.glob),
        key=lambda p: float(re.search(r"t(-?\d+(?:\.\d+)?)", os.path.basename(p)).group(1)),
    )
    rows = []
    for f in files:
        img = np.array(Image.open(f).convert("RGB"))
        if img.shape[:2] != (480, 686):
            print(f"SKIP {f}: {img.shape[1]}x{img.shape[0]} is not 686x480", file=sys.stderr)
            continue
        t = float(re.search(r"t(-?\d+(?:\.\d+)?)", os.path.basename(f)).group(1))
        c, e, _ = shares(img, tuple(a.band), a.tol, target)
        rows.append((t, c, e))
        print(f"t{t:<8.1f} cheb {c:7.3f} %   eucl {e:7.3f} %")

    if not rows:
        return
    arr = np.array(rows)
    for name, col in (("chebyshev", 1), ("euclidean", 2)):
        v = arr[:, col]
        print(
            f"\n{name:10s} n={len(v)}  min {v.min():.3f}  p25 {np.percentile(v,25):.3f}  "
            f"median {np.median(v):.3f}  p75 {np.percentile(v,75):.3f}  "
            f"p90 {np.percentile(v,90):.3f}  max {v.max():.3f}  "
            f"frames at 0.0% {int((v==0).sum())}"
        )
    if a.csv:
        with open(a.csv, "w") as fh:
            fh.write("t,cheb_pct,eucl_pct\n")
            for t, c, e in rows:
                fh.write(f"{t},{c:.4f},{e:.4f}\n")
        print(f"\nwrote {a.csv}")


if __name__ == "__main__":
    main()
