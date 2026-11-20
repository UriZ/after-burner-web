#!/usr/bin/env python3
"""Fast cloud-coverage pass over a whole 60 Hz sequence.

Same class test as measure_cloud_cover.py (V>=0.72, S<=0.12 after the
haze-band validation), but speckle/thin-line rejection is a 3x3 binary
OPENING instead of a connected-component area floor -- there is no scipy on
this machine and a pure-python labeller over 1200 frames is not worth the
wall clock. Validated against the labeller on the six control frames: the
opening and the AREA_MIN>=60 floor agree to <0.004 coverage on all six.

Outputs per-frame coverage + cloud-mass centroid row (screen fraction of the
full 224-row frame), and run-length stats over the sequence.
"""
import sys, os, glob, json
import numpy as np
from PIL import Image

VMIN, SMAX = 0.72, 0.12
ROW0, ROW1 = 16, 140
H_FULL = 224


def to_native(path, side):
    im = Image.open(path).convert('RGB')
    if side == 'ours':
        return np.asarray(im, dtype=np.uint8)[::3, ::3]
    return np.asarray(im.resize((320, 224), Image.BOX), dtype=np.uint8)


def cloud_mask(a, hud=None):
    f = a.astype(np.float32) / 255.0
    mx = f.max(axis=2); mn = f.min(axis=2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0.0)
    m = (mx >= VMIN) & (s <= SMAX)
    if hud is not None:
        m &= ~hud
    band = np.zeros_like(m); band[ROW0:ROW1, :] = True
    m &= band
    return opening(m)


def shift_and(m):
    out = m.copy()
    out[1:, :] &= m[:-1, :]
    out[:-1, :] &= m[1:, :]
    out[:, 1:] &= m[:, :-1]
    out[:, :-1] &= m[:, 1:]
    return out


def shift_or(m):
    out = m.copy()
    out[1:, :] |= m[:-1, :]
    out[:-1, :] |= m[1:, :]
    out[:, 1:] |= m[:, :-1]
    out[:, :-1] |= m[:, 1:]
    return out


def opening(m):
    return shift_or(shift_and(m))


def run(side, d, hudpath=None, fps=60.0):
    hud = np.load(hudpath) if hudpath and hudpath != '-' else None
    files = sorted(glob.glob(os.path.join(d, '*.png')))
    cov, cen = [], []
    bandpx = (ROW1 - ROW0) * 320
    for p in files:
        m = cloud_mask(to_native(p, side), hud)
        cov.append(m.sum() / bandpx)
        ys = np.nonzero(m)[0]
        cen.append(ys.mean() / H_FULL if len(ys) else np.nan)
    cov = np.array(cov); cen = np.array(cen)

    def longest_run(th):
        best = cur = 0
        for c in cov:
            cur = cur + 1 if c > th else 0
            best = max(best, cur)
        return best / fps

    cenv = cen[~np.isnan(cen)]
    return dict(
        side=side, dir=os.path.basename(d), n=len(cov), seconds=len(cov) / fps,
        cover_mean=round(float(cov.mean()), 4),
        cover_p50=round(float(np.percentile(cov, 50)), 4),
        cover_p90=round(float(np.percentile(cov, 90)), 4),
        cover_max=round(float(cov.max()), 4),
        frac_gt_05=round(float((cov > 0.05).mean()), 3),
        frac_gt_10=round(float((cov > 0.10).mean()), 3),
        frac_gt_20=round(float((cov > 0.20).mean()), 3),
        longest_run_gt10_s=round(longest_run(0.10), 2),
        longest_run_gt05_s=round(longest_run(0.05), 2),
        cen_frac_p50=(round(float(np.percentile(cenv, 50)), 3) if len(cenv) else None),
        cen_frac_p10=(round(float(np.percentile(cenv, 10)), 3) if len(cenv) else None),
        cen_frac_p90=(round(float(np.percentile(cenv, 90)), 3) if len(cenv) else None),
    ), cov, cen


if __name__ == '__main__':
    side, d = sys.argv[1], sys.argv[2]
    hudp = sys.argv[3] if len(sys.argv) > 3 else None
    st, cov, cen = run(side, d, hudp)
    print(json.dumps(st, indent=1))
    np.save(os.path.join(d, '_cov.npy'), cov)
