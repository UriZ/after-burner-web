#!/usr/bin/env python3
"""Gap-1 reconciliation instrument. Resamples a center strip onto a UNIFORM
WORLD-DISTANCE grid (inverting the camera's screenFrac(d) relation) before
cross-correlating consecutive frames, per the R2 judge's prescribed
reproduction method — a raw screen-pixel correlation is invalid because a
constant world-space scroll produces a non-uniform (accelerating,
near-field-faster) screen-space shift that no single screen-pixel lag
describes.

Validated with a synthetic shift (--self-test) before trusting any verdict
on real captures, per project culture (an uncontrolled instrument is not
evidence)."""
import argparse
import numpy as np
from PIL import Image

FOV_DEG = 55.0
CAMERA_HEIGHT = 2.2
CAMERA_PITCH = 0.12941440818613054
HORIZON_FRAC = 0.625  # cited: game.js horizonFracFor(CAMERA_PITCH, FOV_DEG)


def screen_frac(d, pitch=CAMERA_PITCH, fov_deg=FOV_DEG, hc=CAMERA_HEIGHT):
    half_tan = np.tan(np.radians(fov_deg) / 2)
    alpha = pitch + np.arctan(hc / d)
    ndc_y = -np.tan(alpha) / half_tan
    return (1 - ndc_y) / 2


def load_native(path, native_scale=3):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    return img[::native_scale, ::native_scale]


def resample_to_world_distance(img, x_frac=0.5, strip_width=20, d_min=6.3, d_max=22.5, d_step=0.1):
    # d range restricted to PURE resolved sea (screenFrac in ~[0.72, 0.98]):
    # d=1.0 (an earlier default) is actually OUTSIDE the 55deg FOV frustum
    # entirely (screen_frac(1.0) = 3.6, nonsensical/invisible), and d up to
    # 40 reaches only screenFrac 0.68 -- still INSIDE the haze band (which
    # ends at screenFrac 0.717, d=23.64). The haze band's color is a pure
    # function of screenFrac/horizonFrac, independent of uScroll entirely --
    # a large, high-contrast, perfectly STATIONARY feature. Averaged into a
    # whole-profile correlation it can dominate and mask real sea motion
    # (found by measurement: the original [1,40] range gave a PERFECT 1.000
    # correlation at lag 0, not just a modest one -- a smoking gun for "the
    # profile contains an unmoving dominant feature", not "nothing moves").
    h, w, _ = img.shape
    x0 = int(x_frac * w - strip_width / 2)
    x1 = x0 + strip_width
    col = img[:, x0:x1, :].mean(axis=1)  # (h, 3), averaged across the strip width

    ds = np.arange(d_min, d_max, d_step)
    fracs = screen_frac(ds)
    rows = fracs * h  # fractional native row for each d

    valid = (rows >= 0) & (rows < h - 1)
    ds, rows = ds[valid], rows[valid]

    r0 = np.floor(rows).astype(int)
    t = rows - r0
    profile = col[r0] * (1 - t[:, None]) + col[r0 + 1] * t[:, None]
    return ds, profile.mean(axis=1)  # luminance proxy vs world distance


def cross_correlate(ds, a, b, max_lag_units=6.0, d_step=0.1):
    a = a - a.mean()
    b = b - b.mean()
    max_lag_samples = int(max_lag_units / d_step)
    best_lag, best_corr, curve = 0, -1e18, []
    for lag in range(-max_lag_samples, max_lag_samples + 1):
        if lag >= 0:
            seg_a, seg_b = a[lag:], b[:len(b) - lag] if lag > 0 else b
        else:
            seg_a, seg_b = a[:len(a) + lag], b[-lag:]
        n = min(len(seg_a), len(seg_b))
        if n < 20:
            continue
        sa, sb = seg_a[:n], seg_b[:n]
        denom = (np.linalg.norm(sa) * np.linalg.norm(sb))
        corr = float(np.dot(sa, sb) / denom) if denom > 0 else 0
        curve.append((lag * d_step, corr))
        if corr > best_corr:
            best_corr, best_lag = corr, lag * d_step
    return best_lag, best_corr, curve


def self_test(shift_units):
    # Synthetic world-distance profile: smooth multi-frequency signal, pure
    # translation by `shift_units` between "frame A" and "frame B".
    ds = np.arange(1.0, 40.0, 0.1)
    rng = np.random.default_rng(42)
    freqs = rng.uniform(0.3, 2.0, 6)
    phases = rng.uniform(0, 6.28, 6)
    def signal(x):
        return sum(np.sin(f * x + p) for f, p in zip(freqs, phases))
    a = signal(ds)
    b = signal(ds + shift_units)  # frame B's feature at d came from d+shift in A
    best_lag, best_corr, _ = cross_correlate(ds, a, b)
    print(f'self-test: injected shift={shift_units}, recovered lag={best_lag:.2f}, corr={best_corr:.3f}')
    return best_lag


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frame0', nargs='?')
    ap.add_argument('frame1', nargs='?')
    ap.add_argument('--self-test', action='store_true')
    ap.add_argument('--predicted-shift', type=float, default=None)
    args = ap.parse_args()

    if args.self_test:
        for s in (-2.0, -1.1488, 0.5, 3.0):
            self_test(s)
        return

    a_img = load_native(args.frame0)
    b_img = load_native(args.frame1)
    ds, prof_a = resample_to_world_distance(a_img)
    _, prof_b = resample_to_world_distance(b_img)
    best_lag, best_corr, curve = cross_correlate(ds, prof_a, prof_b)
    print(f'best lag (world-distance units): {best_lag:.3f}, correlation: {best_corr:.3f}')
    if args.predicted_shift is not None:
        print(f'predicted shift: {args.predicted_shift:.3f}, ratio: {best_lag/args.predicted_shift if args.predicted_shift else float("nan"):.2f}')
    # print a few curve points around the peak and at 0 for inspection
    curve.sort()
    zero = min(curve, key=lambda c: abs(c[0]))
    peak = max(curve, key=lambda c: c[1])
    print(f'corr at lag=0: {zero[1]:.3f}; corr at best lag {peak[0]:.2f}: {peak[1]:.3f}')


if __name__ == '__main__':
    main()
