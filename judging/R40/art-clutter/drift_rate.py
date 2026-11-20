#!/usr/bin/env python3
"""How fast does cloud mass MOVE ACROSS THE SCREEN? Model-free.

This is the statistic the "glued to my jet" complaint is actually about: a
cloud that is glued has near-zero screen velocity; one that sweeps past has
a large one. It needs no assumption about the approach geometry, survives
clipping at the frame edge and at the band cut, and does not care whether a
mass grows, merges or splits -- all of which defeated a 1/size growth fit on
the arcade footage (arcade clouds frequently leave sideways before they ever
double in size).

OPERATOR: for each pair of frames (t, t+LAG) where BOTH carry at least
MIN_AREA native px of cloud mask, find the integer screen displacement
(dx,dy) in [-MAXD,MAXD]^2 that maximises the overlap |A_shifted & B|, and
report |(dx,dy)| converted to %W per second. Reported as the distribution
over all such pairs.

Validated on synthetic sequences with a KNOWN displacement per frame; see
--selftest, which must recover the planted velocity to within one pixel.
"""
import sys, os, glob, json
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cover import to_native, cloud_mask, ROW0, ROW1   # noqa: E402

FPS = 60.0
LAG = 3           # frames between the compared masks (0.05 s)
MAXD = 26         # search half-width, native px -- 26 px/3 frames = 162 %W/s
MIN_AREA = 700    # native px in BOTH frames, ~1.8 % of the combat band


def best_shift(a, b):
    """Displacement (dx,dy) maximising the overlap of a shifted onto b.

    Computed as a circular cross-correlation through the FFT -- the explicit
    (2*MAXD+1)^2 search this replaces returned the identical answer on the
    selftest but took minutes per sequence. The arrays are zero-padded to
    twice their size so the circular wrap cannot alias a real displacement,
    and only |d| <= MAXD is searched, so a wrapped peak can never win.
    """
    h, w = a.shape
    H, W = 2 * h, 2 * w
    fa = np.fft.rfft2(a.astype(np.float32), s=(H, W))
    fb = np.fft.rfft2(b.astype(np.float32), s=(H, W))
    corr = np.fft.irfft2(np.conj(fa) * fb, s=(H, W))
    best = (-1.0, 0, 0)
    for dy in range(-MAXD, MAXD + 1):
        for dx in range(-MAXD, MAXD + 1):
            ov = corr[dy % H, dx % W]
            if ov > best[0]:
                best = (ov, dx, dy)
    return best


def masks(d, side, hud=None, cloud_only=None):
    files = sorted(glob.glob(os.path.join(d, '*.png')))
    out = []
    if cloud_only:
        nf = sorted(glob.glob(os.path.join(cloud_only, '*.png')))
        band = None
        for a, b in zip(files, nf):
            x = np.asarray(Image.open(a).convert('RGB'), dtype=np.int16)[::3, ::3]
            y = np.asarray(Image.open(b).convert('RGB'), dtype=np.int16)[::3, ::3]
            m = np.abs(x - y).sum(axis=2) > 12
            if hud is not None:
                m &= ~hud
            if band is None:
                band = np.zeros_like(m); band[ROW0:ROW1, :] = True
            out.append(m & band)
    else:
        for p in files:
            out.append(cloud_mask(to_native(p, side), hud))
    return out


def run(d, side, hud=None, cloud_only=None):
    ms = masks(d, side, hud, cloud_only)
    speeds = []
    for i in range(0, len(ms) - LAG):
        a, b = ms[i], ms[i + LAG]
        if a.sum() < MIN_AREA or b.sum() < MIN_AREA:
            continue
        ov, dx, dy = best_shift(a, b)
        if ov < 0.25 * min(a.sum(), b.sum()):
            continue          # masses too dissimilar to call it the same mass
        px = np.hypot(dx, dy)
        speeds.append(px / 320.0 * 100.0 / (LAG / FPS))   # %W per second
    s = np.array(speeds)
    return s


if __name__ == '__main__':
    if sys.argv[1] == '--selftest':
        # Planted motion: a disc translating a known number of px per frame.
        import tempfile
        yy, xx = np.mgrid[0:672, 0:960]
        for vpx in (1.0, 4.0, 7.0):      # native px per frame
            td = tempfile.mkdtemp()
            for i in range(40):
                a = np.zeros((672, 960, 3), np.uint8); a[:, :] = (0, 159, 255)
                cx = 480 + vpx * 3 * i      # *3: capture res is 3x native
                a[((yy - 210) ** 2 + (xx - cx) ** 2) <= 60 ** 2] = (247, 247, 247)
                Image.fromarray(a).save(os.path.join(td, 'f%03d.png' % i))
            s = run(td, 'ours')
            want = vpx / 320.0 * 100.0 * FPS
            print('planted %.1f px/frame -> want %6.2f %%W/s   measured %6.2f  (n=%d)'
                  % (vpx, want, np.median(s), len(s)))
        sys.exit(0)
    label, d, side = sys.argv[1], sys.argv[2], sys.argv[3]
    hud = np.load(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != '-' else None
    co = sys.argv[5] if len(sys.argv) > 5 else None
    s = run(d, side, hud, co)
    print(json.dumps(dict(
        label=label, n_pairs=int(len(s)),
        drift_p25=(round(float(np.percentile(s, 25)), 2) if len(s) else None),
        drift_p50=(round(float(np.percentile(s, 50)), 2) if len(s) else None),
        drift_p75=(round(float(np.percentile(s, 75)), 2) if len(s) else None),
        drift_p90=(round(float(np.percentile(s, 90)), 2) if len(s) else None),
        frac_below_10pctW_per_s=(round(float((s < 10).mean()), 3) if len(s) else None),
    ), indent=1))
