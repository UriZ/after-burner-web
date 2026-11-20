#!/usr/bin/env python3
"""How fast does a cloud CLOSE on the camera? Measured, not assumed.

A billboard of fixed world size at distance d projects to screen size
s = C/d. If it approaches at constant speed v then d(t) = d0 - v t, so

    (1/s)(ds/dt) = v / d                                        (*)

The left side is observable with no knowledge of world units: it is the
fractional growth rate of the cloud's on-screen size. Evaluated at a FIXED
on-screen size it is directly comparable between the arcade and us, because
at a fixed screen size the two clouds are at the same d/C -- and cloud world
size is already a closed measured quantity (R5: median bank width 18.66 %W,
the same on both sides).

So: for every cloud event, find the frame where the cloud first reaches a
target on-screen size, and measure the fractional growth rate there by
central difference over +/-W frames. Size proxy is sqrt(mask area), which
is proportional to screen width for any fixed silhouette; the target size is
chosen SMALL (well under the combat band's height) so the mass is never
clipped by the band or the frame edge during the fit window.

Reported per side: the distribution of (1/s)(ds/dt) in units of 1/s. Under
(*) the ratio between two sides at the same screen size IS the ratio of
their closing speeds.
"""
import sys, os, glob, json
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cover import to_native, cloud_mask, ROW0, ROW1   # noqa: E402

BANDPX = (ROW1 - ROW0) * 320
FPS = 60.0
# Target on-screen size for the comparison, as sqrt(area) in native px.
# 34 px of sqrt-area is roughly a 34x34 blob ~ 10.6 %W -- comfortably inside
# the 124-row band, so neither the band cut nor a frame edge is touching it.
S_TARGET = 34.0
FIT_LO, FIT_HI = 0.55, 1.8   # fit window, as multiples of S_TARGET
S_MIN_TRACK = 14.0   # ignore specks below this (reticle fragments, pips)


def sizes(d, side, hud=None, cloud_only=None):
    """sqrt(area) of the cloud mask per frame. If cloud_only is a directory
    of matched ?noclouds=1 frames, the mask is the exact difference instead
    (removes jet/smoke); otherwise the bright/low-sat class is used."""
    files = sorted(glob.glob(os.path.join(d, '*.png')))
    out = []
    if cloud_only:
        nfiles = sorted(glob.glob(os.path.join(cloud_only, '*.png')))
        for a, b in zip(files, nfiles):
            x = np.asarray(Image.open(a).convert('RGB'), dtype=np.int16)[::3, ::3]
            y = np.asarray(Image.open(b).convert('RGB'), dtype=np.int16)[::3, ::3]
            m = np.abs(x - y).sum(axis=2) > 12
            if hud is not None:
                m &= ~hud
            band = np.zeros_like(m); band[ROW0:ROW1, :] = True
            out.append(np.sqrt((m & band).sum()))
    else:
        ar = []
        for p in files:
            ar.append(cloud_mask(to_native(p, side), hud).sum())
        ar = np.array(ar, dtype=np.float64)
        # The bright/low-sat class also catches the player jet, which is a
        # roughly CONSTANT area present in every frame (measured on our own
        # ?nocombat=1&noclouds=1 control: 480 native px, p50). Subtract the
        # sequence's 10th-percentile area as that baseline before taking the
        # square root, otherwise the jet never lets the event detector drop
        # below S_MIN_TRACK and the whole sequence merges into one "event".
        # Cross-validated against the exact cloud-only diff on our side --
        # see NOTES.md.
        ar = np.maximum(ar - np.percentile(ar, 10), 0.0)
        out = np.sqrt(ar)
    return np.array(out)


def rates(s):
    """Fractional growth rate at the first upward crossing of S_TARGET in
    each separate cloud event.

    ESTIMATOR: 1/s is EXACTLY linear in t for a constant-speed approach
    (1/s = d/C = (d0 - v t)/C), so fit a straight line to 1/s over the
    frames where s sits in [LO,HI]*S_TARGET and read the rate off the fit:
        rate = v/d = -(d(1/s)/dt) / (1/s).
    A central difference on s itself was tried first and the synthetic
    control below caught it reading 12.5 % low -- s is convex, so
    differencing it is biased where 1/s is not.
    """
    res = []
    on = s >= S_MIN_TRACK
    i = 0
    n = len(s)
    t = np.arange(n) / FPS
    while i < n:
        if not on[i]:
            i += 1
            continue
        j = i
        while j < n and on[j]:
            j += 1
        seg = s[i:j]
        idx = np.nonzero(seg >= S_TARGET)[0]
        if len(idx):
            k = i + int(idx[0])
            win = np.nonzero((s[i:j] >= FIT_LO * S_TARGET) &
                             (s[i:j] <= FIT_HI * S_TARGET))[0] + i
            if len(win) >= 6:
                inv = 1.0 / s[win]
                b, a = np.polyfit(t[win], inv, 1)
                here = a + b * t[k]
                if here > 0:
                    res.append(dict(frame=int(k), s=float(s[k]),
                                    rate=float(-b / here), nfit=int(len(win))))
        i = j
    return res


if __name__ == '__main__':
    label = sys.argv[1]
    d = sys.argv[2]
    side = sys.argv[3]
    hud = np.load(sys.argv[4]) if len(sys.argv) > 4 and sys.argv[4] != '-' else None
    co = sys.argv[5] if len(sys.argv) > 5 else None
    s = sizes(d, side, hud, co)
    r = rates(s)
    v = np.array([x['rate'] for x in r])
    print(json.dumps(dict(
        label=label, n_events=len(r),
        rate_per_s=[round(x, 3) for x in v.tolist()],
        rate_median=(round(float(np.median(v)), 3) if len(v) else None),
        rate_p25=(round(float(np.percentile(v, 25)), 3) if len(v) else None),
        rate_p75=(round(float(np.percentile(v, 75)), 3) if len(v) else None),
    ), indent=1))
