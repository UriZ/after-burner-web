#!/usr/bin/env python3
"""Explosion-ONSET index builder for 60 Hz arcade frame sequences.

This is an INDEX BUILDER, not a measurement: it proposes (frame, x, y) kill
candidates; every event is then CROPPED AND LOOKED AT by hand, and the
published statistic (enemy span %W just before the explosion) is hand-read
off the crops. False positives are discarded by eye, so the detector only
needs recall, not precision.

Operator: a frame pixel is "fireball" if it is warm and bright
(R>=170, R-B>=70, G>=60). Connected components (4-conn, own BFS — no scipy)
with area >= AMIN at full res. An event is a component whose centroid is not
within RADIUS px of any component seen in the previous LOOKBACK frames
(i.e. a NEW fireball appearing). Events within MERGE_F frames and MERGE_PX px
of an already-open event are the same explosion and are merged.

Validation (run with --control): a span the operator says has zero events
must be verified by eye, and the first N events of a real run are cropped
and looked at before the index is trusted.
"""
import sys, os, json
import numpy as np
from PIL import Image

AMIN = 60          # min component area, px (1028x720 frames)
LOOKBACK = 4       # frames a prior blob suppresses a "new" detection
RADIUS = 46        # px, same-blob association radius
MERGE_F = 25       # frames within which a nearby event is the same explosion
MERGE_PX = 70
DS = 4             # labeling downscale: mask is max-pooled DS x DS before BFS,
                   # areas scale ~1/DS^2 (AMIN -> AMIN/DS^2), coords scale back

def fire_mask(arr):
    # STAGE_MAP.md's explosion operator: explosion-bright (S>0.55, V>0.90)
    # AND warm-hued (<=50deg or >=340deg). The first warm-only version of
    # this mask ate stage 2's entire desert ground (components of 300k+ px);
    # the V>0.90 term is what separates a fireball from sunlit terrain.
    r = arr[:, :, 0].astype(np.int32)
    g = arr[:, :, 1].astype(np.int32)
    b = arr[:, :, 2].astype(np.int32)
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    v_ok = mx > 229  # V > 0.90
    s_ok = (mx - mn) > 0.55 * mx  # S > 0.55
    # warm hue: max channel is R, and hue <= 50deg (G-B <= (50/60)*(mx-mn))
    # or >= 340deg (B barely above G: B-G <= (20/60)*(mx-mn)).
    d = mx - mn
    warm = (r == mx) & (((g >= b) & ((g - b) * 60 <= 50 * d)) |
                        ((b > g) & ((b - g) * 60 <= 20 * d)))
    return v_ok & s_ok & warm

def components(mask):
    """4-connected components via BFS. Returns list of (area, cx, cy)."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        area = 0
        sx = sy = 0
        while stack:
            y, x = stack.pop()
            area += 1
            sx += x
            sy += y
            if y > 0 and mask[y-1, x] and not seen[y-1, x]:
                seen[y-1, x] = True; stack.append((y-1, x))
            if y < h-1 and mask[y+1, x] and not seen[y+1, x]:
                seen[y+1, x] = True; stack.append((y+1, x))
            if x > 0 and mask[y, x-1] and not seen[y, x-1]:
                seen[y, x-1] = True; stack.append((y, x-1))
            if x < w-1 and mask[y, x+1] and not seen[y, x+1]:
                seen[y, x+1] = True; stack.append((y, x+1))
        if area >= AMIN // (DS * DS):
            # area and centroid are in DOWNSCALED units; scale coords back.
            out.append((area * DS * DS, (sx / area) * DS, (sy / area) * DS))
    return out

def pool(mask):
    """Max-pool a boolean mask DS x DS (trailing rows/cols dropped)."""
    h, w = mask.shape
    h2, w2 = h // DS, w // DS
    m = mask[: h2 * DS, : w2 * DS].reshape(h2, DS, w2, DS)
    return m.any(axis=(1, 3))

def main():
    d = sys.argv[1]
    files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
    prev = []  # list of per-frame component lists, newest last
    events = []  # dicts: frame, x, y, area, last_frame
    for i, f in enumerate(files):
        arr = np.asarray(Image.open(os.path.join(d, f)).convert('RGB'))
        comps = components(pool(fire_mask(arr)))
        for area, cx, cy in comps:
            # suppressed if near any component in the previous LOOKBACK frames
            new = True
            for pcomps in prev[-LOOKBACK:]:
                for _, px, py in pcomps:
                    if (cx-px)**2 + (cy-py)**2 <= RADIUS**2:
                        new = False
                        break
                if not new:
                    break
            if new:
                # merge into an open event?
                merged = False
                for ev in events:
                    if i - ev['last_frame'] <= MERGE_F and \
                       (cx-ev['x'])**2 + (cy-ev['y'])**2 <= MERGE_PX**2:
                        ev['last_frame'] = i
                        merged = True
                        break
                if not merged:
                    events.append({'frame': i + 1, 'file': f, 'x': round(cx),
                                   'y': round(cy), 'area': area,
                                   'last_frame': i})
        prev.append(comps)
        if len(prev) > LOOKBACK:
            prev.pop(0)
    for ev in events:
        ev.pop('last_frame')
    print(json.dumps({'dir': d, 'n_frames': len(files),
                      'events': events}, indent=1))

if __name__ == '__main__':
    main()
