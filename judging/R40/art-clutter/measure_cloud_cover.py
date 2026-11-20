#!/usr/bin/env python3
"""Cloud coverage of the combat band, computed identically on arcade frames
and on our captures.

OPERATOR (stated so it can be re-run or refuted):
  1. Frame -> native 320x224 (ours: every 3rd px of the 960x672 capture;
     arcade: PIL BOX-resize of the 1028x720 3.2125x upscale, which is a
     resampled source -- so this operator deliberately uses NO
     frac-below-threshold statistic on raw channel values, only a
     bright/low-saturation CLASS plus connected-component AREA, both of
     which survive resampling, cf. R11 2.3).
  2. Combat band = rows [16,140) -- below the SCORE/HIT bar, above the
     0.625H level-flight horizon. The per-run HUD mask (tools/hud_mask.py)
     is subtracted for our side; the arcade's top/bottom bars are already
     outside the band and its reticle is removed by the AREA floor.
  3. Cloud class = V >= VMIN and S <= SMAX in HSV. Stage-1 sky (#009fff),
     sea and sea-streaks are all S ~ 1.0; land is green/brown and fails
     VMIN or SMAX.
  4. 4-connected components; components smaller than AREA_MIN native px are
     dropped (reticle brackets, foam speckle, bullet pips).
  5. Coverage = surviving cloud px / band px. Also returns the mass
     centroid row as a screen fraction of the FULL frame height.

The player jet is grey-white and IS counted when it overlaps nothing; that
bias is present on both sides and is bounded separately by a hidejet
control on our side (see cloud_jet_overlap.py).
"""
import sys, os, glob, json
import numpy as np
from PIL import Image

VMIN = 0.72
SMAX = 0.12   # tightened after validation: the arcade's pale near-horizon
              # haze band reads [200,243,255] = S 0.21 and was being counted
              # as cloud; true cloud white/cream is S 0.04, our day palette's
              # darkest rung #a4a4b5 is S 0.094.
AREA_MIN = 60     # native px; a 320x224 frame is 71680, so 0.08%
ROW0, ROW1 = 16, 140
H_FULL = 224


def to_native(path, side):
    im = Image.open(path).convert('RGB')
    if side == 'ours':
        a = np.asarray(im, dtype=np.uint8)
        return a[::3, ::3]
    # arcade: 1028x720 -> 320x224 by area average (BOX); the source is itself
    # an upscale of 320x224 so this inverts it rather than inventing detail.
    return np.asarray(im.resize((320, 224), Image.BOX), dtype=np.uint8)


def hsv(a):
    f = a.astype(np.float64) / 255.0
    mx = f.max(axis=2)
    mn = f.min(axis=2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-9), 0.0)
    return mx, s


def label4(mask):
    """Tiny iterative 4-connected labeller (no scipy dependency)."""
    h, w = mask.shape
    lab = np.zeros((h, w), dtype=np.int32)
    cur = 0
    stack = []
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if not row[x] or lab[y, x]:
                continue
            cur += 1
            stack.append((y, x))
            lab[y, x] = cur
            while stack:
                cy, cx = stack.pop()
                for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur
                        stack.append((ny, nx))
    return lab, cur


def frame_stats(a, hud=None):
    v, s = hsv(a)
    cloud = (v >= VMIN) & (s <= SMAX)
    if hud is not None:
        cloud &= ~hud
    band = np.zeros_like(cloud)
    band[ROW0:ROW1, :] = True
    cloud &= band
    lab, n = label4(cloud)
    keep = np.zeros_like(cloud)
    comps = []
    if n:
        counts = np.bincount(lab.ravel())
        for i in range(1, n + 1):
            if counts[i] >= AREA_MIN:
                m = lab == i
                keep |= m
                ys, xs = np.nonzero(m)
                comps.append(dict(area=int(counts[i]),
                                  y0=int(ys.min()), y1=int(ys.max()),
                                  x0=int(xs.min()), x1=int(xs.max()),
                                  cy=float(ys.mean()), cx=float(xs.mean())))
    bandpx = (ROW1 - ROW0) * 320
    ys, xs = np.nonzero(keep)
    return dict(cover=float(keep.sum()) / bandpx,
                n_comp=len(comps),
                big=max([c['area'] for c in comps], default=0),
                cen_frac=(float(ys.mean()) / H_FULL if len(ys) else None),
                comps=comps,
                mask=keep)


def main():
    side = sys.argv[1]
    d = sys.argv[2]
    hud = None
    if len(sys.argv) > 3 and sys.argv[3] != '-':
        hud = np.load(sys.argv[3])
    files = sorted(glob.glob(os.path.join(d, '*.png')))
    out = []
    for f in files:
        st = frame_stats(to_native(f, side), hud)
        st.pop('mask')
        st.pop('comps')
        st['file'] = os.path.basename(f)
        out.append(st)
    cov = np.array([o['cover'] for o in out])
    cen = np.array([o['cen_frac'] for o in out if o['cen_frac'] is not None])
    big = np.array([o['big'] for o in out])
    print(json.dumps(dict(
        side=side, dir=d, n=len(out),
        cover_mean=float(cov.mean()), cover_p50=float(np.percentile(cov, 50)),
        cover_p90=float(np.percentile(cov, 90)), cover_max=float(cov.max()),
        frac_frames_cover_gt_05=float((cov > 0.05).mean()),
        frac_frames_cover_gt_15=float((cov > 0.15).mean()),
        frac_frames_any=float((big > 0).mean()),
        cen_frac_mean=(float(cen.mean()) if len(cen) else None),
        cen_frac_p50=(float(np.percentile(cen, 50)) if len(cen) else None),
    ), indent=1))
    with open(os.path.join(d, '_cloudcover.json'), 'w') as fh:
        json.dump(out, fh)


if __name__ == '__main__':
    main()
