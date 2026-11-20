#!/usr/bin/env python3
"""R36 cruise-sway: find level sub-spans in a horizon jsonl (60 Hz) and
quantify the idle motion: y-position amplitude (px @720H and %H), tilt
amplitude (deg), and dominant period (s) via the mean zero-crossing
interval of the detrended series (FFT corroboration printed too)."""
import json
import sys

import numpy as np

FPS = 60


def load(path):
    rows = [json.loads(l) for l in open(path)]
    y = np.array([r['y_center_fracH'] if r.get('y_center_px') is not None else np.nan for r in rows])
    t = np.array([r['tilt_deg'] if r.get('y_center_px') is not None else np.nan for r in rows])
    return y, t


def spans(valid, min_len):
    out, start = [], None
    for i, v in enumerate(valid):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(valid) - start >= min_len:
        out.append((start, len(valid)))
    return out


def dominant_period(x):
    """Mean peak-to-peak interval via zero crossings of the detrended,
    lightly smoothed series; FFT peak as corroboration."""
    x = x - np.polyval(np.polyfit(np.arange(len(x)), x, 1), np.arange(len(x)))
    k = 9
    xs = np.convolve(x, np.ones(k) / k, 'same')
    sign = np.sign(xs)
    crossings = np.nonzero(np.diff(sign) != 0)[0]
    zc_period = 2 * np.mean(np.diff(crossings)) / FPS if len(crossings) > 2 else float('nan')
    f = np.fft.rfftfreq(len(xs), 1 / FPS)
    p = np.abs(np.fft.rfft(xs * np.hanning(len(xs)))) ** 2
    p[f < 0.05] = 0  # ignore DC / slower than 20 s
    fft_period = 1 / f[np.argmax(p)] if p.max() > 0 else float('nan')
    return zc_period, fft_period, xs


def main(path, tilt_cut=12.0, min_s=3.0):
    y, tilt = load(path)
    valid = ~np.isnan(y) & (np.abs(tilt) < tilt_cut)
    print(f'{path}: {valid.sum()}/{len(y)} frames level (|tilt|<{tilt_cut} deg)')
    for a, b in spans(valid, int(min_s * FPS)):
        ys = y[a:b] * 100  # %H
        ts = tilt[a:b]
        y_det = ys - np.polyval(np.polyfit(np.arange(len(ys)), ys, 1), np.arange(len(ys)))
        zc_y, fft_y, _ = dominant_period(ys)
        zc_t, fft_t, _ = dominant_period(ts)
        print(f'  frames {a}-{b} ({(b - a) / FPS:.1f}s):')
        print(f'    y: mean {ys.mean():.2f}%H, drift-range {ys.max() - ys.min():.2f}%H,'
              f' detrended p2p {np.percentile(y_det, 97.5) - np.percentile(y_det, 2.5):.2f}%H'
              f' (sd {y_det.std():.2f}), period zc {zc_y:.2f}s / fft {fft_y:.2f}s')
        print(f'    tilt: mean {ts.mean():.2f}deg, p2p(2.5-97.5) '
              f'{np.percentile(ts, 97.5) - np.percentile(ts, 2.5):.2f}deg (sd {ts.std():.2f}),'
              f' period zc {zc_t:.2f}s / fft {fft_t:.2f}s')


if __name__ == '__main__':
    for p in sys.argv[1:]:
        main(p)
