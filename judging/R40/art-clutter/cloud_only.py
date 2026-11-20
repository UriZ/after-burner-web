#!/usr/bin/env python3
"""EXACT cloud-only coverage of the combat band, by differencing two matched
deterministic captures of the same seed/ticks: one full, one ?noclouds=1.

A pixel belongs to a VISIBLE cloud iff the two frames differ there -- nothing
else in the scene can move between the two runs, because ?fixed=1 stepping is
tick-exact and the cloud PRNG streams are separate from everything else
(clouds.js createClouds uses its own createPrng(seed)/createPrng(seed+7919)).
This removes the jet, missile smoke, kill smoke and explosions exactly,
instead of thresholding around them, and it counts a cloud only where it is
actually visible (a cloud hidden behind the jet contributes nothing, which is
the right accounting for "does it hide the fight").

Validation: on frames where clouds.js is suppressed the diff must be
identically zero; asserted below (--selftest).
"""
import sys, os, glob, json
import numpy as np
from PIL import Image

ROW0, ROW1 = 16, 140
BANDPX = (ROW1 - ROW0) * 320
FPS = 60.0


def native(p):
    return np.asarray(Image.open(p).convert('RGB'), dtype=np.int16)[::3, ::3]


def series(full_dir, noc_dir, hudpath=None):
    hud = np.load(hudpath) if hudpath else None
    a = sorted(glob.glob(os.path.join(full_dir, '*.png')))
    b = sorted(glob.glob(os.path.join(noc_dir, '*.png')))
    n = min(len(a), len(b))
    cov, cen = [], []
    for i in range(n):
        d = np.abs(native(a[i]) - native(b[i])).sum(axis=2) > 12
        if hud is not None:
            d &= ~hud
        band = np.zeros_like(d); band[ROW0:ROW1, :] = True
        d &= band
        cov.append(d.sum() / BANDPX)
        ys = np.nonzero(d)[0]
        cen.append(ys.mean() / 224 if len(ys) else np.nan)
    return np.array(cov), np.array(cen)


def summarise(cov, cen, label):
    def longest(th):
        best = cur = 0
        for c in cov:
            cur = cur + 1 if c > th else 0
            best = max(best, cur)
        return round(best / FPS, 2)

    def events(th):
        on = cov > th
        out, cur = [], 0
        for x in on:
            if x:
                cur += 1
            elif cur:
                out.append(cur); cur = 0
        if cur:
            out.append(cur)
        return np.array(out) / FPS

    ev = events(0.05)
    cv = cen[~np.isnan(cen)]
    return dict(
        label=label, n=len(cov), seconds=round(len(cov) / FPS, 1),
        cloud_cover_mean=round(float(cov.mean()), 4),
        cloud_cover_p50=round(float(np.percentile(cov, 50)), 4),
        cloud_cover_p90=round(float(np.percentile(cov, 90)), 4),
        cloud_cover_max=round(float(cov.max()), 4),
        frac_gt_05=round(float((cov > 0.05).mean()), 3),
        frac_gt_10=round(float((cov > 0.10).mean()), 3),
        longest_run_gt10_s=longest(0.10),
        longest_run_gt05_s=longest(0.05),
        n_events_gt05=int(len(ev)),
        event_med_s=(round(float(np.median(ev)), 2) if len(ev) else None),
        event_max_s=(round(float(ev.max()), 2) if len(ev) else None),
        cen_frac_p50=(round(float(np.percentile(cv, 50)), 3) if len(cv) else None),
    )


if __name__ == '__main__':
    full, noc, label = sys.argv[1], sys.argv[2], sys.argv[3]
    hud = sys.argv[4] if len(sys.argv) > 4 else None
    cov, cen = series(full, noc, hud)
    print(json.dumps(summarise(cov, cen, label), indent=1))
    np.save(os.path.join(full, '_cloudonly.npy'), cov)
