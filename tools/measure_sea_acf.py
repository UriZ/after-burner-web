#!/usr/bin/env python3
"""The stage-1 sea criteria that are NOT Criterion A/B, in one place, so a
change aimed at Criterion B can be watched against the criteria it could
break:

  1. DECORRELATION LENGTH + ANISOTROPY RATIO, REFERENCE.md "Sea anisotropy:
     ALWAYS pair the ratio with an absolute length".
     GATE: horizontal decorrelation length 1.21-2.25 native texels AND
     horiz/vert ratio >= 2.0.
     Operator (verbatim from that section): value channel (max(RGB)/255) of
     the near-field sea band; mean-subtract; 1-D normalised autocorrelation
     along each axis; decorrelation length = the lag at which the ACF first
     crosses 0.5, linearly interpolated, in NATIVE texels. On an upscaled
     arcade frame divide the frame-pixel lag by the upscale factor (t116 at
     686x480 is 686/320 = 2.1437 px per texel).
     Band: t116 y[340,415] x[40,640]; at 320x224 that is y[159,194] x[19,299].
     CONTROL (--selftest): must return arcade t116 = 1.73 / 0.74 / 2.34.

  2. FOAM FRACTION + CONTRAST SPREAD, REFERENCE.md "Sea texture, stage 1".
     Arcade t116: value p5-p95 spread 0.302-0.329; fraction of sea pixels
     above V 0.95 = 23.4% (near-field band) / 38.8% (whole sea y250-420).

  3. The named non-regression: cross-track anisotropy at a COMMON 686x480
     (ours 4.95x vs arcade 5.21x). Different operator again - see
     acf_halfwidths below.

Each operator's exact form was chosen by which one reproduces the published
arcade figures; where two readings of the prose disagree, the losing one is
recorded in the function's docstring so nobody re-derives it.
"""
import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NATIVE_W, NATIVE_H = 320, 224

# Native-texel band from REFERENCE.md.
NATIVE_BAND = (159, 194, 19, 299)
# The same band on the 686x480 arcade frames.
ARCADE_BAND = (340, 415, 40, 640)
ARCADE_UPSCALE = 686.0 / 320.0


def value_channel(img):
    return img.astype(np.float64).max(axis=2) / 255.0


def acf_1d(lines, max_lag):
    """Normalised autocorrelation along each row of `lines`, with a GLOBAL
    mean subtraction and a GLOBAL variance normalisation.

    The per-line variant (mean-subtract and normalise each line separately,
    then average the per-line ACFs) is the other natural reading of
    "mean-subtract; 1-D normalised autocorrelation along each axis", and it
    is WRONG here: it returns t116 = 1.614/0.708/2.28 where the published
    figures are 1.73/0.74/2.34. The global form returns 1.727/0.739/2.335 —
    the published numbers to the digit — so that is the published operator.
    (A full 2-D FFT autocorrelation read along its two axes gives
    1.693/0.726/2.332, i.e. the same answer within 2%; the three only differ
    in how much of the line-to-line brightness variation they keep.)"""
    x = lines - lines.mean()
    var = float((x * x).mean())
    if var < 1e-12:
        return np.full(max_lag + 1, np.nan)
    out = np.empty(max_lag + 1)
    out[0] = 1.0
    for lag in range(1, max_lag + 1):
        out[lag] = float((x[:, :-lag] * x[:, lag:]).mean() / var)
    return out


def cross_half(acf):
    """First lag where the ACF crosses 0.5, linearly interpolated."""
    for lag in range(1, len(acf)):
        if acf[lag] < 0.5:
            a, b = acf[lag - 1], acf[lag]
            return (lag - 1) + (a - 0.5) / (a - b)
    return float(len(acf) - 1)


def sea_acf(img, band, upscale, max_lag=60):
    y0, y1, x0, x1 = band
    v = value_channel(img)[y0:y1, x0:x1]
    h = cross_half(acf_1d(v, max_lag)) / upscale            # rows as signals -> horizontal
    vert = cross_half(acf_1d(v.T, max_lag)) / upscale       # columns as signals -> vertical
    return h, vert, (h / vert if vert > 0 else float('inf'))


def sea_contrast(img, band):
    y0, y1, x0, x1 = band
    v = value_channel(img)[y0:y1, x0:x1].ravel()
    p5, p95 = np.percentile(v, [5, 95])
    return p95 - p5, float((v > 0.95).mean())


def to_native(img):
    h, w, _ = img.shape
    if (w, h) == (NATIVE_W, NATIVE_H):
        return img
    sx, sy = w // NATIVE_W, h // NATIVE_H
    blocks = img.reshape(NATIVE_H, sy, NATIVE_W, sx, 3)
    assert (blocks == blocks[:, :1, :, :1, :]).all(), 'upscale is not block-uniform'
    return img[::sy, ::sx]



# ---------------------------------------------------------------------------
# The NAMED non-regression: "sea cross-track anisotropy, ours 4.95x vs arcade
# 5.21x at a COMMON 686x480" (REFERENCE.md ledger row 6). This is a DIFFERENT
# operator from the decorrelation lengths above - 2-D FFT ACF 1/e half-widths,
# Hanning-windowed, as in tools/measure_ground.py's autocorr_anisotropy, with
# the floor removed (the floor is what made the retired 6.51x wrong) - and its
# numbers are not interchangeable with theirs. Ours is resampled 960x672 ->
# 686x480 BILINEAR; the arcade frame is used as stored; same patch
# (240,260)-(445,465).
COMMON_PATCH = (240, 260, 445, 465)  # x0, y0, x1, y1


def acf_halfwidths(img, patch):
    x0, y0, x1, y1 = patch
    crop = img[y0:y1, x0:x1].astype(np.float64).mean(axis=2)
    crop = crop - crop.mean()
    crop = crop * np.hanning(crop.shape[0])[:, None] * np.hanning(crop.shape[1])[None, :]
    F = np.fft.fft2(crop)
    acf = np.fft.fftshift(np.fft.ifft2(np.abs(F) ** 2).real)
    acf /= acf.max()
    cy, cx = acf.shape[0] // 2, acf.shape[1] // 2

    def hw(profile, center):
        thresh = profile[center] * np.exp(-1)
        i = center
        while i < len(profile) - 1 and profile[i] > thresh:
            i += 1
        if i == center:
            return 0.0
        a, b = profile[i - 1], profile[i]
        return (i - 1 - center) + ((a - thresh) / (a - b) if a != b else 1.0)

    hx, hy = hw(acf[cy, :], cx), hw(acf[:, cx], cy)
    return hx, hy, (hx / hy if hy > 0 else float('inf'))


def common_res_anisotropy(path):
    im = Image.open(path).convert('RGB').resize((686, 480), Image.BILINEAR)
    return acf_halfwidths(np.asarray(im), COMMON_PATCH)


def _selftest():
    ok = True
    # Control 1: synthetic 4x2 blocks of independent values. Hand-derivable:
    # horizontal ACF 0.75 / 0.50 / 0.25 -> crosses 0.5 at lag 2.0; vertical
    # ACF 0.5 / 0.0 -> crosses at exactly 1.0; ratio 2.0.
    rng = np.random.default_rng(3)
    base = rng.random((120, 120))
    blk = np.repeat(np.repeat(base[: 120 // 2, : 120 // 4], 2, axis=0), 4, axis=1)
    img = (np.stack([blk] * 3, axis=-1) * 255).astype(np.uint8)
    h, v, r = sea_acf(img, (0, 120, 0, 120), 1.0)
    for label, got, want, tol in (('4x2 horiz', h, 2.0, 0.08), ('4x2 vert', v, 1.0, 0.05),
                                  ('4x2 ratio', r, 2.0, 0.12)):
        good = abs(got - want) <= tol
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {label}: got {got:.3f} want {want:.3f}')

    # Control 2: the published arcade t116 figures.
    arc = np.asarray(Image.open(os.path.join(ROOT, 'reference',
                                             'stage1-level-flight-t116.png')).convert('RGB'))
    h, v, r = sea_acf(arc, ARCADE_BAND, ARCADE_UPSCALE)
    for label, got, want, tol in (('t116 horiz texels', h, 1.73, 0.03),
                                  ('t116 vert texels', v, 0.74, 0.03),
                                  ('t116 ratio', r, 2.34, 0.06)):
        good = abs(got - want) <= tol
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {label}: got {got:.3f} want {want:.3f}')

    spread, foam = sea_contrast(arc, ARCADE_BAND)
    print(f'  INFO  t116 near-field band value p5-p95 spread {spread:.3f} '
          f'(published 0.302-0.329), foam>V0.95 {foam*100:.1f}% (published 23.4%)')
    ok &= 0.28 <= spread <= 0.36 and 0.20 <= foam <= 0.28

    hx, hy, r = acf_halfwidths(arc, COMMON_PATCH)
    for label, got, want, tol in (('t116 common-res hx', hx, 41.626, 0.6),
                                  ('t116 common-res hy', hy, 7.991, 0.4),
                                  ('t116 common-res ratio', r, 5.21, 0.25)):
        good = abs(got - want) <= tol
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {label}: got {got:.3f} want {want:.3f}')
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', default=None)
    ap.add_argument('--selftest', action='store_true')
    args = ap.parse_args()
    if args.selftest:
        ok = _selftest()
        print('SELFTEST', 'PASS' if ok else 'FAIL')
        sys.exit(0 if ok else 1)
    paths = sorted(glob.glob(os.path.join(args.dir, 'frame-*.png')))
    if not paths:
        raise SystemExit('no frames')
    rows = []
    for p in paths:
        n = to_native(np.asarray(Image.open(p).convert('RGB')))
        h, v, r = sea_acf(n, NATIVE_BAND, 1.0)
        spread, foam = sea_contrast(n, NATIVE_BAND)
        rows.append((os.path.basename(p), h, v, r, spread, foam))
        print(f'{rows[-1][0]:16} horiz {h:6.3f}  vert {v:6.3f}  ratio {r:6.3f}  '
              f'spread {spread:5.3f}  foam {foam*100:5.2f}%')
    a = np.array([[r[1], r[2], r[3], r[4], r[5]] for r in rows])
    m = np.median(a, axis=0)
    print(f'\nMEDIAN  horiz {m[0]:.3f} texels (gate 1.21-2.25)  vert {m[1]:.3f}  '
          f'ratio {m[2]:.3f} (gate >=2.0)')
    print(f'        value p5-p95 spread {m[3]:.3f} (arcade 0.302-0.329)  '
          f'foam>V0.95 {m[4]*100:.2f}% (arcade near-field 23.4%)')
    cr = np.array([common_res_anisotropy(p) for p in paths])
    cm = np.median(cr, axis=0)
    print(f'        common-res 686x480 anisotropy hx {cm[0]:.2f} hy {cm[1]:.2f} '
          f'ratio {cm[2]:.2f}x (arcade t116 41.63 / 7.99 / 5.21x)')


if __name__ == '__main__':
    main()
