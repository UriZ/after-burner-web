#!/usr/bin/env python3
"""City-light statistics for the stage-3 night ground, computed identically
on the arcade's TRUE-NATIVE frame and on our native-resolution captures.

Both inputs are 320x224 native (reference/ab2-arcade-night-banking.png is an
original; ours is every 3rd pixel of the 960x672 capture, an exact inverse of
the 3x render scale). NO resampled source is used, so component sizes and
counts mean what they say -- the 3.2125x longplay upscale would smear a
1-px light across 3 px and inflate every one of these figures.

Reported per side, over a caller-given ground band:
  density      share of band pixels that are a light (V >= V_LIGHT)
  colour mix   share of lights that are near-neutral (white) vs saturated
  size         connected-component area distribution of the light mask
  clustering   index of dispersion of light counts over CELL x CELL blocks
               (variance/mean). Poisson/uniform-random = 1.0; clustered >> 1.
               This is the "city lights are structured, not white noise"
               claim stated as a number.
"""
import sys, json
import numpy as np
from PIL import Image

sys.path.insert(0, __file__.rsplit('/', 1)[0])
from measure_cloud_cover import label4   # noqa: E402

V_LIGHT = 0.45      # a lit pixel; the dark field is <= 0.22 V by construction
S_NEUTRAL = 0.25    # a light this unsaturated reads as white
CELL = 10


def native(path, ours):
    a = np.asarray(Image.open(path).convert('RGB'), dtype=np.uint8)
    return a[::3, ::3] if ours else a


def stats(a, y0, y1, x0, x1, label):
    sub = a[y0:y1, x0:x1]
    f = sub.astype(np.float32) / 255.0
    v = f.max(axis=2)
    mn = f.min(axis=2)
    s = np.where(v > 0, (v - mn) / np.maximum(v, 1e-9), 0.0)
    lit = v >= V_LIGHT
    n = lit.sum()
    out = dict(label=label, band=[y0, y1, x0, x1],
               density=round(float(n) / lit.size, 4))
    if n:
        out['white_share'] = round(float((s[lit] <= S_NEUTRAL).mean()), 3)
        out['sat_mean'] = round(float(s[lit].mean()), 3)
        lab, k = label4(lit)
        if k:
            c = np.bincount(lab.ravel())[1:]
            out['comp_n'] = int(k)
            out['comp_p50'] = float(np.percentile(c, 50))
            out['comp_p90'] = float(np.percentile(c, 90))
            out['comp_max'] = int(c.max())
        h, w = lit.shape
        gh, gw = h // CELL, w // CELL
        if gh and gw:
            blocks = lit[:gh * CELL, :gw * CELL].reshape(gh, CELL, gw, CELL)
            cnt = blocks.sum(axis=(1, 3)).astype(float)
            out['cluster_dispersion'] = round(float(cnt.var() / max(cnt.mean(), 1e-9)), 2)
            out['empty_cell_share'] = round(float((cnt == 0).mean()), 3)
    return out


if __name__ == '__main__':
    rows = []
    # Matched band: below the horizon, clear of the bottom HUD block, and
    # inside the arcade frame's own lit region.
    B = (150, 196, 20, 300)
    rows.append(stats(native('reference/ab2-arcade-night-banking.png', False),
                      *B, 'ARCADE native (night-banking)'))
    for p in sys.argv[1:]:
        rows.append(stats(native(p, True), *B, 'OURS ' + p.rsplit('/', 1)[-1]))
    for r in rows:
        print(json.dumps(r))
