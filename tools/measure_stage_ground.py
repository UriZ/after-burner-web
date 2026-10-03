#!/usr/bin/env python3
"""Per-stage ground-structure measurement (R5 gap 6).

Reports, for a captured frame sequence, the same statistics that were
measured on the arcade reference frames in reference/, so our build and the
arcade can be compared with ONE operator:

  * ground-band mean RGB / value percentiles / saturation / hue
  * fraction of ground pixels above a value threshold (night city lights,
    stage-1 foam)
  * horizontal vs vertical autocorrelation (clump scale + anisotropy)
  * the per-row colour profile through the horizon haze band

HUD EXCLUSION IS DERIVED PER RUN, NEVER HARDCODED (ARCHITECTURE.md's
hard-won rule; five confidently-wrong measurements in two previous rounds
came from stale hardcoded boxes). Two mechanisms, because the project's
shared tools/hud_mask.py only claims the region ABOVE the horizon:

  * above the horizon: hud_mask.derive_hud_mask() — with jet/clouds/combat
    hidden, everything up there is either flat sky or HUD, by construction.
  * below the horizon: pixels that are byte-identical across every captured
    frame. The ground scrolls continuously (ground.js's uScroll advances
    every tick), so a below-horizon pixel that never changes across frames
    separated by many ticks is HUD — the SPEED/throttle/STAGE/missile strip
    — not terrain. This is derived from the capture itself and cannot go
    stale when the HUD is restyled.

Usage:
    python3 tools/measure_stage_ground.py --dir tools/out/world-r5/foo \\
        --frames 40 45 50 --band 0.70 0.92
    python3 tools/measure_stage_ground.py --arcade stage3
    python3 tools/measure_stage_ground.py --selftest
"""
import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hud_mask import load_native, derive_hud_mask, NATIVE_SCALE  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def hsv_channels(img):
    """H in degrees, S and V in [0,1], from an RGB array in 0..255."""
    mx = img.max(axis=2)
    mn = img.min(axis=2)
    d = mx - mn
    v = mx / 255.0
    s = np.where(mx > 0, d / np.maximum(mx, 1e-9), 0.0)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    h = np.zeros_like(d, dtype=np.float64)
    m = d > 0
    i = (mx == r) & m
    h[i] = ((g - b)[i] / d[i]) % 6
    i = (mx == g) & m
    h[i] = ((b - r)[i] / d[i]) + 2
    i = (mx == b) & m
    h[i] = ((r - g)[i] / d[i]) + 4
    return h * 60.0, s, v


def acf(a, axis, lags):
    """Normalized autocorrelation of a mean-removed 2-D array at the given
    pixel lags. axis=1 is horizontal (cross-track on screen), axis=0 is
    vertical."""
    x = a - a.mean()
    denom = (x * x).mean()
    out = []
    for L in lags:
        p = x[:, :-L] * x[:, L:] if axis == 1 else x[:-L, :] * x[L:, :]
        out.append(float(p.mean() / denom) if denom > 0 else 0.0)
    return out


def static_pixel_mask(stack, window=5, min_frac=0.6):
    """True where every frame in the stack has an identical pixel AND the
    pixel sits inside a locally-static neighbourhood.

    The raw "identical across frames" test alone is NOT safe on a quantized
    dark ground: stage 3's terrain is snapped to a 16-step ladder and is
    mostly on rung 0, so a large scatter of genuine TERRAIN pixels happens
    to hold the same value from frame to frame and gets flagged as HUD.
    Measured: on a stage-3 band containing no HUD at all, the raw operator
    flagged 128 px, which was enough to disqualify every row from the
    autocorrelation. Requiring `min_frac` of a `window`x`window` box to be
    static as well keeps the solid HUD glyph/plate areas (which are static
    in bulk) and drops the isolated accidental matches."""
    first = stack[0]
    same = np.ones(first.shape[:2], dtype=bool)
    for f in stack[1:]:
        same &= (np.abs(f - first).sum(axis=2) == 0)
    # Box-filter the boolean field via a summed-area table (no scipy dep).
    pad = window // 2
    p = np.pad(same.astype(np.int32), pad + 1, mode='constant')
    sat = p.cumsum(axis=0).cumsum(axis=1)
    h, w = same.shape
    y0 = np.arange(h)[:, None]
    x0 = np.arange(w)[None, :]
    box = (sat[y0 + window, x0 + window] - sat[y0, x0 + window]
           - sat[y0 + window, x0] + sat[y0, x0])
    return same & (box >= min_frac * window * window)


def load_stack(dirpath, indices):
    paths = sorted(glob.glob(os.path.join(dirpath, 'frame-*.png')))
    if not paths:
        raise SystemExit(f'no frames in {dirpath}')
    if indices:
        paths = [os.path.join(dirpath, f'frame-{i:04d}.png') for i in indices]
    return np.stack([load_native(p) for p in paths]), paths


def report(name, img, mask, band, xband=(0.0, 1.0), lags=(1, 2, 3, 4, 6, 8, 12, 16, 24)):
    """`mask` is True where a pixel must be EXCLUDED. `band` is (y0frac,
    y1frac) of the frame height, `xband` the same for width."""
    h, w, _ = img.shape
    y0, y1 = int(h * band[0]), int(h * band[1])
    x0, x1 = int(w * xband[0]), int(w * xband[1])
    sub = img[y0:y1, x0:x1]
    sub_mask = mask[y0:y1, x0:x1]
    keep = ~sub_mask
    px = sub[keep]
    if len(px) == 0:
        print(f'{name}: band fully masked out')
        return
    hh, ss, vv = hsv_channels(sub)
    hk, sk, vk = hh[keep], ss[keep], vv[keep]
    print(f'{name}  rows {y0}-{y1} of {h} ({band[0]:.2f}-{band[1]:.2f}H), cols {x0}-{x1} of {w}, '
          f'{len(px)} px kept / {sub_mask.sum()} excluded')
    print(f'   meanRGB {px.mean(axis=0).round(2)}')
    print('   V  p5/p25/p50/p75/p90/p95/p99 = ' +
          '/'.join(f'{np.percentile(vk, p):.4f}' for p in (5, 25, 50, 75, 90, 95, 99)))
    print(f'   V  p5-p95 spread {np.percentile(vk, 95) - np.percentile(vk, 5):.4f}')
    print(f'   frac V==0 {float((vk == 0).mean()):.4f}   V<0.031 {float((vk < 0.031).mean()):.4f}')
    print(f'   frac V>0.25 {float((vk > 0.25).mean()):.4f}   V>0.5 {float((vk > 0.5).mean()):.4f}   '
          f'V>0.75 {float((vk > 0.75).mean()):.4f}   V>0.95 {float((vk > 0.95).mean()):.4f}')
    print('   S  p25/p50/p75 = ' + '/'.join(f'{np.percentile(sk, p):.3f}' for p in (25, 50, 75)) +
          '    H p25/p50/p75 = ' + '/'.join(f'{np.percentile(hk, p):.1f}' for p in (25, 50, 75)))
    # ACF needs a genuinely contiguous rectangle of ground: zeroing out
    # masked pixels would inject fake structure, and dropping whole rows
    # fails on stages where the bottom HUD strip touches every row of the
    # band. So pick the widest contiguous COLUMN span that is mask-free
    # over the whole band, then use every row inside it.
    col_clean = ~sub_mask.any(axis=0)
    best_len, best_start = 0, 0
    run = 0
    for ci, ok in enumerate(col_clean):
        run = run + 1 if ok else 0
        if run > best_len:
            best_len, best_start = run, ci - run + 1
    if best_len >= 32 and sub.shape[0] >= 8:
        print(f'   ACF window: cols {x0 + best_start}-{x0 + best_start + best_len} '
              f'({best_len} contiguous mask-free columns) x {sub.shape[0]} rows')
        vclean = vv[:, best_start:best_start + best_len]
        ah = acf(vclean, 1, lags)
        av = acf(vclean, 0, lags)
        print(f'   ACF lags {list(lags)}')
        print('     horiz ' + ' '.join(f'{x:.3f}' for x in ah))
        print('     vert  ' + ' '.join(f'{x:.3f}' for x in av))
        # decorrelation length: first lag where ACF drops below 0.5
        def half(a):
            for L, x in zip(lags, a):
                if x < 0.5:
                    return L
            return lags[-1]
        print(f'     half-corr lag: horiz {half(ah)} px, vert {half(av)} px (NATIVE px)')
    else:
        print(f'   ACF skipped: widest mask-free column run is only {best_len} px')


def row_profile(name, img, mask, y0frac, y1frac):
    h, w, _ = img.shape
    print(f'{name} per-row mean RGB (excluded pixels dropped):')
    for y in range(int(h * y0frac), int(h * y1frac)):
        keep = ~mask[y]
        if keep.sum() < w * 0.3:
            continue
        m = img[y][keep].mean(axis=0)
        print(f'   y={y:3d} ({y / h:.4f}H) meanRGB=({m[0]:6.2f},{m[1]:6.2f},{m[2]:6.2f})')


ARCADE = {
    # Reproduces the measurements this round's stage.js constants cite, so
    # the same script prints both sides of the comparison.
    'stage2': dict(path='reference/stage2-flight-t140.png', band=(300, 420, 10, 230)),
    'stage2n': dict(path='reference/ab2-arcade-desert.png', band=(140, 200, 0, 110)),
    'stage3': dict(path='reference/stage3-night-level-t175.png', band=(344, 424, 20, 660)),
    'stage3b': dict(path='reference/stage3-night-lockon-t186.png', band=(330, 420, 20, 300)),
    'nightcity': dict(path='reference/ab2-arcade-night-banking.png', band=(150, 190, 10, 310)),
    'nightmid': dict(path='reference/ab2-arcade-night-banking.png', band=(120, 145, 170, 310)),
}


def arcade_report(key, lags=(1, 2, 3, 4, 6, 8, 12, 16, 24)):
    spec = ARCADE[key]
    img = np.asarray(Image.open(os.path.join(ROOT, spec['path'])).convert('RGB'), dtype=np.float64)
    y0, y1, x0, x1 = spec['band']
    sub = img[y0:y1, x0:x1]
    hh, ss, vv = hsv_channels(sub)
    print(f"ARCADE {key}  {spec['path']} y[{y0},{y1}] x[{x0},{x1}]  ({img.shape[1]}x{img.shape[0]} source)")
    print(f'   meanRGB {sub.reshape(-1, 3).mean(axis=0).round(2)}')
    print('   V  p5/p25/p50/p75/p90/p95/p99 = ' +
          '/'.join(f'{np.percentile(vv, p):.4f}' for p in (5, 25, 50, 75, 90, 95, 99)))
    print(f'   V  p5-p95 spread {np.percentile(vv, 95) - np.percentile(vv, 5):.4f}')
    print(f'   frac V==0 {float((vv == 0).mean()):.4f}   V<0.031 {float((vv < 0.031).mean()):.4f}')
    print(f'   frac V>0.25 {float((vv > 0.25).mean()):.4f}   V>0.5 {float((vv > 0.5).mean()):.4f}   '
          f'V>0.75 {float((vv > 0.75).mean()):.4f}   V>0.95 {float((vv > 0.95).mean()):.4f}')
    print('   S  p25/p50/p75 = ' + '/'.join(f'{np.percentile(ss, p):.3f}' for p in (25, 50, 75)) +
          '    H p25/p50/p75 = ' + '/'.join(f'{np.percentile(hh, p):.1f}' for p in (25, 50, 75)))
    scale = img.shape[1] / 320.0
    print(f'   ACF lags {list(lags)} (source px; divide by {scale:.3f} for NATIVE px)')
    print('     horiz ' + ' '.join(f'{x:.3f}' for x in acf(vv, 1, lags)))
    print('     vert  ' + ' '.join(f'{x:.3f}' for x in acf(vv, 0, lags)))


def selftest():
    """Known-answer checks on the two operators that can silently lie."""
    # static_pixel_mask: a synthetic stack where one rectangle never moves.
    rng = np.random.default_rng(3)
    stack = []
    base = rng.integers(0, 255, (20, 30, 3)).astype(np.float64)
    for i in range(4):
        f = (base + rng.integers(1, 40, (20, 30, 3))).astype(np.float64)
        f[5:9, 6:14] = 200.0  # the "HUD"
        stack.append(f)
    stacked = np.stack(stack)
    raw = static_pixel_mask(stacked, window=1, min_frac=0.0)
    assert raw[5:9, 6:14].all(), 'static_pixel_mask missed the static rect'
    assert raw.sum() == 4 * 8, f'raw static mask flagged {raw.sum()} px, expected 32'
    # With the neighbourhood filter on, the rect's interior survives and
    # nothing outside it is ever added.
    m = static_pixel_mask(stacked)
    assert m[6:8, 8:12].all(), 'neighbourhood-filtered mask lost the rect interior'
    assert not m[~raw].any(), 'neighbourhood filter invented pixels outside the raw mask'
    # And isolated accidental matches are dropped: plant one single static
    # pixel far from the rect and confirm the filter removes it.
    stack2 = [f.copy() for f in stack]
    for f in stack2:
        f[15, 25] = 7.0
    raw2 = static_pixel_mask(np.stack(stack2), window=1, min_frac=0.0)
    filt2 = static_pixel_mask(np.stack(stack2))
    assert raw2[15, 25] and not filt2[15, 25], 'isolated static pixel not filtered out'
    # acf: a pure horizontal stripe pattern must correlate perfectly
    # horizontally and decay vertically at its own period.
    yy, xx = np.mgrid[0:64, 0:64]
    stripes = np.sin(yy * np.pi / 4.0)  # constant along x, period 8 along y
    ah = acf(stripes, 1, [1, 4, 8])
    av = acf(stripes, 0, [1, 4, 8])
    assert all(x > 0.99 for x in ah), f'acf horiz on x-constant field: {ah}'
    assert av[1] < -0.9 and av[2] > 0.9, f'acf vert on period-8 stripes: {av}'
    # hsv_channels against three known colors
    probe = np.array([[[0, 159, 255], [247, 206, 0], [0, 0, 115]]], dtype=np.float64)
    h, s, v = hsv_channels(probe)
    assert abs(h[0, 0] - 202.6) < 0.5 and abs(v[0, 0] - 1.0) < 1e-9, (h[0, 0], v[0, 0])
    assert abs(h[0, 1] - 50.0) < 0.5 and abs(s[0, 1] - 1.0) < 1e-9, (h[0, 1], s[0, 1])
    assert abs(h[0, 2] - 240.0) < 0.5 and abs(v[0, 2] - 115 / 255) < 1e-9, (h[0, 2], v[0, 2])
    print('selftest: PASS (static_pixel_mask, acf, hsv_channels)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', help='capture directory containing frame-NNNN.png')
    ap.add_argument('--frames', type=int, nargs='*', default=None,
                    help='frame indices to use (default: every frame in the dir)')
    ap.add_argument('--band', type=float, nargs=2, default=(0.72, 0.95),
                    help='ground band as (y0frac, y1frac) of frame height')
    ap.add_argument('--xband', type=float, nargs=2, default=(0.0, 1.0),
                    help='column range as (x0frac, x1frac) of frame width')
    ap.add_argument('--profile', type=float, nargs=2, default=None,
                    help='also print a per-row colour profile over (y0frac, y1frac)')
    ap.add_argument('--arcade', choices=sorted(ARCADE), help='print the arcade-side numbers instead')
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return
    if args.arcade:
        arcade_report(args.arcade)
        return
    if not args.dir:
        ap.error('--dir or --arcade or --selftest required')

    stack, paths = load_stack(args.dir, args.frames)
    hud_above, horizon = derive_hud_mask(stack[0])
    hud_below = static_pixel_mask(stack)
    hud_below[:horizon, :] = False
    mask = hud_above | hud_below
    print(f'{len(paths)} frames, native scale 1/{NATIVE_SCALE}; horizon row {horizon} '
          f'({horizon / stack[0].shape[0]:.3f}H); HUD mask {int(hud_above.sum())} px above + '
          f'{int(hud_below.sum())} px below the horizon')
    # Measure on the LAST frame (any single frame; the mask is shared).
    report(os.path.basename(paths[-1]), stack[-1], mask, tuple(args.band), tuple(args.xband))
    if args.profile:
        row_profile('profile', stack[-1], mask, args.profile[0], args.profile[1])


if __name__ == '__main__':
    main()
