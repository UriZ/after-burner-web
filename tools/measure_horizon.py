#!/usr/bin/env python3
"""Per-frame horizon line for AB2 stage-1 frames, and a sky-window cloud
measurement built on it.

WHY (R5, criteria-fix lane, W2). The published #132 cloud operator measures
inside a FIXED window of rows 2%H-45%H. That window was chosen to keep the sea
out, and it does not: the horizon moves with pitch and rolls with bank, so the
sea walks into the window while genuine near-horizon cloud is cut out of it. A
presence statistic computed over a window that cannot see much of the sky is
not the statistic anyone wants. This file replaces the fixed row cut with the
frame's own horizon.

THE HORIZON OPERATOR. Sky and cloud are SMOOTH; sea and land are TEXTURED
(AB2's sea is a hard-dithered stripe field, its islands are stippled rock and
canopy). So:

  1. texture T = local standard deviation of V over a 5x5 box, V = max(RGB)/255
  2. binarise  textured = T > TEX_THRESH (default 0.045)
  3. for each angle theta in [-75, +75] degrees, project every pixel onto the
     line normal n(theta) and find the offset d maximising the separation
     score   (fraction textured on the far side) - (fraction textured on the
     near side).  The best (theta, d) over the grid is the horizon.
  4. the SKY REGION is the near side of that line, minus the HUD rects.

The score is a difference of two fractions, so it is scale-free and does not
reward putting the line at a frame edge (an empty side scores 0 by definition).

VALIDATION. --synthetic builds half-textured frames at known angles and checks
the recovered angle and offset. --overlay draws the recovered line on real
frames so a human can look, which is the only check that matters.

LIMITS, stated up front: this finds ONE straight horizon. It is wrong by
construction on frames whose sea is hidden behind a full-width near object, and
on frames with no sea at all. --report prints a per-frame confidence (the
separation score) so low-confidence frames can be dropped rather than silently
believed.

Usage:
    python3 tools/measure_horizon.py --synthetic
    python3 tools/measure_horizon.py --frames '<glob>' --overlay <dir>
    python3 tools/measure_horizon.py --frames '<glob>' --clouds
"""
import argparse
import glob
import os
import sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from classify_clouds import (seg_mask, label8, AREA_FRAC,  # noqa: E402
                             HAZE_W_FRAC, ARCADE_HUD_RECTS)

TEX_THRESH = 0.045
TEX_BOX = 5
ANGLES = np.arange(-75.0, 75.1, 1.0)


def box_mean(a, k):
    """Mean over a kxk box, edge-replicated, via a summed-area table."""
    p = np.pad(a, k // 2, mode='edge')
    c = np.cumsum(np.cumsum(p, 0), 1)
    c = np.pad(c, ((1, 0), (1, 0)))
    h, w = a.shape
    return (c[k:k + h, k:k + w] - c[0:h, k:k + w]
            - c[k:k + h, 0:w] + c[0:h, 0:w]) / float(k * k)


def texture(rgb):
    v = rgb.astype(np.float32).max(axis=2) / 255.0
    m = box_mean(v, TEX_BOX)
    m2 = box_mean(v * v, TEX_BOX)
    return np.sqrt(np.maximum(m2 - m * m, 0.0))


def find_horizon(rgb, hud_rects=ARCADE_HUD_RECTS):
    """Return (theta_deg, d, score, textured_mask). The sky side is where
    x*sin(theta) - y*cos(theta) > d, i.e. the UPPER side for theta = 0."""
    H, W = rgb.shape[:2]
    tex = texture(rgb) > TEX_THRESH
    valid = np.ones((H, W), bool)
    for (fx0, fy0, fx1, fy1) in hud_rects or []:
        valid[int(round(fy0 * H)):int(round(fy1 * H)),
              int(round(fx0 * W)):int(round(fx1 * W))] = False
    ys, xs = np.mgrid[0:H, 0:W]
    best = (0.0, 0.0, -1.0)
    for th in ANGLES:
        t = np.deg2rad(th)
        proj = (xs * np.sin(t) - ys * np.cos(t))[valid]
        tv = tex[valid]
        lo, hi = proj.min(), proj.max()
        bins = np.linspace(lo, hi, 161)
        idx = np.clip(np.digitize(proj, bins) - 1, 0, len(bins) - 2)
        n_tot = np.bincount(idx, minlength=len(bins) - 1).astype(float)
        n_tex = np.bincount(idx, weights=tv.astype(float),
                            minlength=len(bins) - 1)
        cum_tot = np.cumsum(n_tot)
        cum_tex = np.cumsum(n_tex)
        tot, texc = cum_tot[-1], cum_tex[-1]
        # split at each bin edge: "below" = proj <= edge (sea side for th=0)
        below_tot = cum_tot
        below_tex = cum_tex
        above_tot = tot - below_tot
        above_tex = texc - below_tex
        with np.errstate(invalid='ignore', divide='ignore'):
            f_below = np.where(below_tot > 0, below_tex / below_tot, 0.0)
            f_above = np.where(above_tot > 0, above_tex / above_tot, 0.0)
        # require both sides to hold at least 5% of the pixels
        okmask = (below_tot > 0.05 * tot) & (above_tot > 0.05 * tot)
        score = np.where(okmask, f_below - f_above, -1.0)
        k = int(np.argmax(score))
        if score[k] > best[2]:
            best = (float(th), float(bins[k + 1]), float(score[k]))
    th, d, sc = best
    return th, d, sc, tex


def sky_mask(shape, th, d):
    H, W = shape
    ys, xs = np.mgrid[0:H, 0:W]
    t = np.deg2rad(th)
    return (xs * np.sin(t) - ys * np.cos(t)) > d


def draw_line(im, th, d, colour=(255, 0, 255)):
    W, H = im.size
    t = np.deg2rad(th)
    st, ct = np.sin(t), np.cos(t)
    pts = []
    if abs(ct) > 1e-6:
        for x in (0, W - 1):
            y = (x * st - d) / ct
            if -1 <= y <= H:
                pts.append((x, y))
    if abs(st) > 1e-6:
        for y in (0, H - 1):
            x = (d + y * ct) / st
            if -1 <= x <= W:
                pts.append((x, y))
    if len(pts) >= 2:
        ImageDraw.Draw(im).line([pts[0], pts[1]], fill=colour, width=2)
    return im


# ---------------------------------------------------------------- self-test ---
def synthetic():
    ok = True
    rng = np.random.default_rng(7)
    W, H = 686, 480
    for truth_th, truth_frac in [(0.0, 0.55), (20.0, 0.50), (-35.0, 0.50),
                                 (55.0, 0.50), (-60.0, 0.45)]:
        ys, xs = np.mgrid[0:H, 0:W]
        t = np.deg2rad(truth_th)
        proj = xs * np.sin(t) - ys * np.cos(t)
        d = float(np.quantile(proj, truth_frac))
        sky = proj > d
        img = np.zeros((H, W, 3), np.uint8)
        img[sky] = (0, 159, 255)                       # smooth sky
        noise = rng.integers(0, 2, size=(H, W))
        sea = np.where(noise[..., None] > 0, np.array([0, 90, 200], np.uint8),
                       np.array([200, 240, 255], np.uint8))
        img[~sky] = sea[~sky]
        th, dd, sc, _ = find_horizon(img, hud_rects=None)
        # compare the two masks rather than raw (theta,d): equivalent lines can
        # differ numerically, the SET of sky pixels is what is used downstream.
        got = sky_mask((H, W), th, dd)
        iou = (got & sky).sum() / float((got | sky).sum())
        g = iou > 0.98 and abs(((th - truth_th + 90) % 180) - 90) <= 2.0
        ok &= g
        print(f'[H] truth {truth_th:+6.1f} deg -> got {th:+6.1f}  '
              f'skymask IoU {iou:.4f}  score {sc:.3f}  {"OK" if g else "FAIL"}')
    # a frame with NO texture anywhere must score ~0 (no horizon to find)
    img = np.zeros((H, W, 3), np.uint8)
    img[:] = (0, 159, 255)
    th, dd, sc, _ = find_horizon(img, hud_rects=None)
    n_ok = sc < 0.05
    ok &= n_ok
    print(f'[H] featureless frame -> score {sc:.3f} (expect ~0)  '
          f'{"OK" if n_ok else "FAIL"}')
    print('HORIZON SYNTHETIC CONTROL:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def warm_fraction(rgb, mask):
    """Mean (R-B) over the masked pixels. Explosion smoke is WARM (+25 or so);
    cloud and missile plume are both COOL (about -8). This separates smoke from
    cloud; it does NOT separate plume from cloud."""
    sel = rgb[mask].astype(float)
    return float((sel[:, 0] - sel[:, 2]).mean()) if sel.size else 0.0


def clouds_in_sky(path, min_score=0.15):
    rgb = np.asarray(Image.open(path).convert('RGB'))
    H, W = rgb.shape[:2]
    th, d, sc, _ = find_horizon(rgb)
    if sc < min_score:
        return None, (th, d, sc)
    sky = sky_mask((H, W), th, d)
    m = seg_mask(rgb) & sky
    for (fx0, fy0, fx1, fy1) in ARCADE_HUD_RECTS:
        m[int(round(fy0 * H)):int(round(fy1 * H)),
          int(round(fx0 * W)):int(round(fx1 * W))] = False
    lab, n = label8(m)
    min_area = int(round(AREA_FRAC * W * H))
    out = []
    for i in range(1, n + 1):
        sel = (lab == i)
        area = int(sel.sum())
        if area < min_area:
            continue
        ys, xs = np.nonzero(sel)
        x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
        pw, ph = x1 - x0 + 1, y1 - y0 + 1
        if 100.0 * pw / W > 100.0 * HAZE_W_FRAC:
            continue
        out.append(dict(path=path, bbox=(x0, y0, x1, y1), area=area,
                        w_pct=100.0 * pw / W, h_pct=100.0 * ph / H,
                        aspect=(100.0 * pw / W) / (100.0 * ph / H),
                        edge=(x0 == 0 or x1 == W - 1 or y0 == 0 or y1 == H - 1),
                        rb=warm_fraction(rgb, sel)))
    out.sort(key=lambda c: -c['area'])
    return out, (th, d, sc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--synthetic', action='store_true')
    ap.add_argument('--frames')
    ap.add_argument('--overlay')
    ap.add_argument('--clouds', action='store_true')
    ap.add_argument('--min-score', type=float, default=0.15)
    a = ap.parse_args()
    if a.synthetic:
        raise SystemExit(synthetic())
    paths = sorted(glob.glob(a.frames))
    if a.overlay:
        os.makedirs(a.overlay, exist_ok=True)
    rows = []
    for p in paths:
        rgb = np.asarray(Image.open(p).convert('RGB'))
        th, d, sc, _ = find_horizon(rgb)
        rows.append((p, th, d, sc))
        if a.overlay:
            im = Image.open(p).convert('RGB')
            draw_line(im, th, d)
            sk = sky_mask(rgb.shape[:2], th, d)
            ov = np.asarray(im).copy()
            ov[~sk] = (0.6 * ov[~sk] + 0.4 * np.array([0, 0, 0])).astype(np.uint8)
            Image.fromarray(ov).save(os.path.join(a.overlay, os.path.basename(p)))
        print(f'{os.path.basename(p):22s} theta {th:+6.1f}  d {d:9.2f}  score {sc:.3f}')
    if a.clouds:
        print('\n# sky-window cloud components (horizon-anchored)')
        nf = 0
        counts = []
        allc = []
        skipped = 0
        for p in paths:
            cs, (th, d, sc) = clouds_in_sky(p, a.min_score)
            if cs is None:
                skipped += 1
                continue
            counts.append(len(cs))
            nf += 1 if cs else 0
            for c in cs:
                allc.append(c)
                x0, y0, x1, y1 = c['bbox']
                print(f'{os.path.basename(p):22s} x[{x0:3d},{x1:3d}] y[{y0:3d},{y1:3d}] '
                      f'{c["area"]:7d} {c["w_pct"]:6.2f}W {c["h_pct"]:6.2f}H '
                      f'{c["aspect"]:5.2f} {"EDGE" if c["edge"] else "    "} '
                      f'R-B {c["rb"]:+6.1f}')
        print(f'\n# usable frames {len(counts)} (skipped {skipped} below score '
              f'{a.min_score})  presence {100.0*nf/max(1,len(counts)):.1f}%  '
              f'count med/p90/max {np.median(counts):.0f}/'
              f'{np.percentile(counts,90):.1f}/{max(counts) if counts else 0}')


if __name__ == '__main__':
    main()
