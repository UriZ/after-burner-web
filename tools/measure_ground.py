#!/usr/bin/env python3
"""Reproducible measurement instrument for gap 1/2/8 acceptance criteria
(R2 judge report). Re-implements, from the R1 judge report's prose, the
column-scan horizon operator and adds a distinct-color/palette-share count
and a 2D-autocorrelation anisotropy estimate for the near-field ground.

Usage: python3 tools/measure_ground.py <png> [--patch x0 y0 x1 y1]

R5 CAVEAT ON THE ANISOTROPY NUMBER — read before quoting it.
Behaviour here is UNCHANGED so earlier figures stay reproducible, but the
ratio is resolution-dependent in two ways that are easy to miss:

  1. `autocorr_anisotropy` floors the SHORTER half-width at 1 px
     (`max(min(hx, hy), 1)`). Our sea's along-track correlation length is
     BELOW that floor once a capture is decimated to native 320x224: on
     tools/out/world-r5b/sea-check/frame-0001.png it is 0.676 px, so the
     floor binds and the ratio prints 6.54x. The same frame measured at the
     stored 960x672 prints 9.63x from the identical structure (half-widths
     scale by exactly 3.00, as they must — the capture is an exact
     nearest-neighbour 3x replication, see tools/measure_clouds.py
     --verify-native). The published 6.51x is therefore a floor-limited
     reading, not a measurement of the texture.

  2. COMPARING ACROSS RESOLUTIONS IS INVALID. Arcade frames are 686x480
     interpolated upscales of the same 320x224 the hardware draws, and
     interpolation lengthens correlation lengths. Brought to a common
     resolution with a common filter — ours resampled 960x672 -> 686x480
     bilinear, arcade t116 as stored, same patch (240,260)-(445,465) — the
     two agree closely: ours hx 44.61 hy 9.02 ratio 4.95x, arcade hx 41.63
     hy 7.99 ratio 5.21x. Measuring ours at native and the arcade at 686
     made our sea look 2x more anisotropic than it is.

HISTOGRAM statistics (distinct colours, palette share, foam fraction,
contrast spread) are NOT affected by the decimation: the 3x upscale
replicates every pixel exactly 9 times, so every pixel keeps its weight.
"distinct colors below horizon" reads 13950 at both 320x224 and 960x672 on
the frame above, which is the control for that claim.
"""
import sys
import argparse
import numpy as np
from PIL import Image


def load(path, native_scale=1):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    if native_scale > 1:
        # Captures are a nearest-neighbor upscale of the real 320x224 render
        # (screen.js: integer scale = floor(min(viewport/320, viewport/224))
        # -- for the capture tool's 960x672 viewport that is exactly 3x).
        # Every native pixel is an NxN identical block; measuring
        # autocorrelation on the upscaled image mostly measures block-edge
        # structure at tiny lags, not real texture (found via measurement:
        # half-widths of 2-5px, i.e. within a single native pixel's block).
        # Striding back to the native grid removes the duplication exactly
        # (no interpolation, since the blocks are already pixel-identical).
        img = img[::native_scale, ::native_scale]
    return img


def sky_mode(img, band_frac=(0.0, 0.18)):
    h, w, _ = img.shape
    y0, y1 = int(h * band_frac[0]), int(h * band_frac[1])
    band = img[y0:y1].reshape(-1, 3).astype(np.int32)
    colors, counts = np.unique(band, axis=0, return_counts=True)
    mode = colors[np.argmax(counts)]
    return mode, counts.max() / band.shape[0]


def horizon_row(img, n_cols=66, consecutive=6, threshold=60):
    h, w, _ = img.shape
    mode, _ = sky_mode(img)
    xs = np.linspace(0, w - 1, n_cols).astype(int)
    rows = []
    for x in xs:
        col = img[:, x, :]
        dev = np.abs(col - mode).sum(axis=1)
        hit = dev > threshold
        found = None
        for y in range(h - consecutive):
            if hit[y:y + consecutive].all():
                found = y
                break
        if found is not None:
            rows.append(found)
    rows = np.array(rows)
    return float(np.median(rows)), rows, mode


def color_stats(img, y_from):
    h, w, _ = img.shape
    region = img[y_from:].reshape(-1, 3).astype(np.int32)
    colors, counts = np.unique(region, axis=0, return_counts=True)
    order = np.argsort(-counts)
    top8 = counts[order[:8]].sum() / counts.sum()
    return colors.shape[0], top8


def autocorr_anisotropy(img, patch):
    x0, y0, x1, y1 = patch
    crop = img[y0:y1, x0:x1].mean(axis=2)  # luminance proxy
    crop = crop - crop.mean()
    win_y = np.hanning(crop.shape[0])[:, None]
    win_x = np.hanning(crop.shape[1])[None, :]
    crop = crop * win_y * win_x
    F = np.fft.fft2(crop)
    S = np.abs(F) ** 2
    acf = np.fft.ifft2(S).real
    acf = np.fft.fftshift(acf)
    acf = acf / acf.max()
    cy, cx = acf.shape[0] // 2, acf.shape[1] // 2

    def half_width(profile, center):
        # 1/e half-width with LINEAR INTERPOLATION between the bracketing
        # samples for sub-pixel resolution — an integer-pixel step count is
        # unusably noisy when the real correlation length is only a few
        # pixels (measured: a 1px rounding difference swung the reported
        # anisotropy ratio by 2x on this texture).
        peak = profile[center]
        thresh = peak * np.exp(-1)
        i = center
        while i < len(profile) - 1 and profile[i] > thresh:
            i += 1
        if i == center:
            return 0.0
        y0, y1 = profile[i - 1], profile[i]
        if y0 == y1:
            return float(i - center)
        frac = (y0 - thresh) / (y0 - y1)
        return (i - 1 - center) + frac

    hx = half_width(acf[cy, :], cx)
    hy = half_width(acf[:, cx], cy)
    return hx, hy, (max(hx, hy) / max(min(hx, hy), 1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('png')
    ap.add_argument('--patch', nargs=4, type=int, default=None,
                     help='x0 y0 x1 y1 for the ACF near-field patch (defaults to an auto pick)')
    ap.add_argument('--native-scale', type=int, default=3,
                     help='nearest-neighbor upscale factor to undo before measuring (default 3, matches capture.mjs viewport 960x672 / 320x224)')
    args = ap.parse_args()

    img = load(args.png, args.native_scale)
    h, w, _ = img.shape

    hrow, rows, mode = horizon_row(img)
    hfrac = hrow / h
    print(f'image: {w}x{h}')
    print(f'sky mode: #{int(mode[0]):02x}{int(mode[1]):02x}{int(mode[2]):02x}')
    print(f'horizon row: {hrow:.1f} / {h} = {hfrac*100:.1f}%H  (p10={np.percentile(rows,10):.0f} p90={np.percentile(rows,90):.0f})')

    n_colors, top8 = color_stats(img, int(hrow))
    print(f'distinct colors below horizon: {n_colors}')
    print(f'top-8 palette share: {top8:.3f}')

    if args.patch:
        patch = tuple(args.patch)
    else:
        # Auto patch: clear of the haze band (horizon + 15%H down), clear of
        # the jet (centered) and the HUD (right-aligned, conservative margin
        # above the bottom HUD strip). Sized as close to SQUARE as the safe
        # zone allows — a thin/wide or thin/tall window biases the FFT
        # autocorrelation toward whichever axis has more room, independent
        # of any real signal (found by measurement: a 288x57 window read
        # 4.2x horizontal on a frame that, re-measured square, did not).
        # Near-CENTER (small |world-X|) is required for the "world-Z maps to
        # screen-vertical" assumption the along-track measurement rests on
        # — found by measurement: an off-center patch reads anisotropy in
        # the WRONG axis on a texture deliberately tuned for vertical
        # elongation, because off-axis, world-Z variation traces a RADIAL
        # path from the vanishing point with a real horizontal component,
        # not a vertical one. Capture with ?hidejet=1 (game.js) for an
        # unoccluded true-center patch.
        y0 = int(hrow + 0.11 * h)  # just clear of the ~9%H haze band
        y_avail = 0.97 * h - y0
        size = int(min(0.30 * w, y_avail))
        x0 = int(0.5 * w - size / 2)
        x1 = x0 + size
        y1 = y0 + size
        patch = (x0, y0, x1, y1)
    hx, hy, aniso = autocorr_anisotropy(img, patch)
    longer = 'vertical (along-track)' if hy > hx else 'horizontal (cross-track)'
    print(f'ACF patch: {patch}')
    print(f'ACF half-widths: horizontal={hx}px vertical={hy}px -> anisotropy {aniso:.2f}x, longer axis: {longer}')


if __name__ == '__main__':
    main()
