#!/usr/bin/env python3
"""DRAW-WEIGHT for the title wordmark, plus the native-downsample instrument.

WHY NOT tools/art/inkspan.py DIRECTLY. That file is the licensed operator and
its DEFINITIONS are reused here verbatim (INK = largest 8-connected
component; SPAN = convex-hull Feret diameter; SW = 2 x median distance from
an ink pixel to the nearest background pixel; P90SW the same at p90; RSW =
SW/SPAN). What is NOT reusable is its MASK, which is the jet airframe's
"achromatic or one of three named hexes" rule. The subject here is letter
ink, so the mask rule differs and the operator is re-implemented rather than
called with a wrong mask -- see REFERENCE.md ledger "same name, different
operator".

THE LICENCE CONDITION IS THE REASON THIS FILE EXISTS AT ALL.
REFERENCE.md DRAW-WEIGHT: "INK/SPAN is a dimensioned quantity ... it may only
be compared between two subjects at a MATCHED SPAN, within +-10 %", and it
lists the TITLE as explicitly UNLICENSED because its only reference is
686x480 video at 2.14x our native scale.

This file is the answer to that, and it is the whole methodological point:
the arcade side is brought DOWN TO 320x224 before anything is measured, by
area-downsampling the 1028x720 source (3.2125x W / 3.2143x H) and
thresholding each native cell's coverage at 0.5. Both sides are then at the
board's own resolution and the span condition is satisfied by construction
rather than by hope. SW and RSW are reported as primary, INK/SPAN beside
them with its span, per the criterion.

THE INSTRUMENT IS CONTROLLED THREE WAYS before any figure is quoted:
  1  --selftest: an analytic stroke figure (known ink, known SW), the same
     figure at 2x (INK/SPAN must double, RSW must not), and a filled block
     of the same span (must separate on SW in the right direction).
  2  cross-frame: the SAME native mask is derived from four independent
     arcade frames at three different rotation phases of the sphere plate
     plus the repo's own 686x480 t74. Identical bbox on all four; ink
     agreeing to 1.6 %.
  3  the letter mask is a NEUTRALITY test, not a brightness test. The sphere
     matrix's specular highlights pass "bright" and sit inside the wordmark
     box; counting them is what produced the retired "BURNER is 13.7 %
     taller than AFTER".

    python3 judging/R9/title_drawweight_r9.py --selftest
    python3 judging/R9/title_drawweight_r9.py \
        --arcade <1028x720 title frame> --ours <our capture png>
"""
import argparse
import math
import os
import sys

import numpy as np
from PIL import Image

NATIVE_W, NATIVE_H = 320, 224


# ---------------------------------------------------------------------------
# statistics -- definitions copied verbatim from tools/art/inkspan.py
# ---------------------------------------------------------------------------
def largest_component(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = None
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = True
            px = []
            while stack:
                cy, cx = stack.pop()
                px.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if best is None or len(px) > len(best):
                best = px
    out = np.zeros_like(mask)
    if best:
        for cy, cx in best:
            out[cy, cx] = True
    return out


def feret(mask):
    """Convex-hull diameter, exact. Monotone chain over the ink pixels."""
    ys, xs = np.nonzero(mask)
    pts = sorted(set(zip(xs.tolist(), ys.tolist())))
    if len(pts) < 2:
        return 0.0
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lower = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)
    upper = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)
    hull = lower[:-1] + upper[:-1]
    best = 0.0
    for i in range(len(hull)):
        for j in range(i + 1, len(hull)):
            d = math.hypot(hull[i][0] - hull[j][0], hull[i][1] - hull[j][1])
            best = max(best, d)
    return best


def edt(mask):
    """Exact Euclidean distance from each ink pixel to the nearest background
    pixel. Brute force over the background boundary -- small subjects only,
    and correctness beats speed on a 232x115 wordmark."""
    pad = np.pad(mask, 1, constant_values=False)
    bg = ~pad
    # background pixels adjacent to ink are the only ones that can be nearest
    nb = np.zeros_like(bg)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            nb |= np.roll(np.roll(pad, dy, 0), dx, 1)
    boundary = bg & nb
    by, bx = np.nonzero(boundary)
    iy, ix = np.nonzero(pad)
    out = np.empty(len(iy))
    for k in range(len(iy)):
        out[k] = np.min(np.hypot(by - iy[k], bx - ix[k]))
    return out


def stats(mask, label, component='all'):
    # DELIBERATE DEVIATION FROM THE LICENSED OPERATOR, stated rather than
    # hidden. inkspan.py takes the LARGEST 8-CONNECTED COMPONENT because its
    # subject is one aircraft and the rule sheds debris flecks. A wordmark is
    # BY CONSTRUCTION a set of disconnected glyphs: on this subject
    # "largest component" measures whichever single letter happens to touch
    # its neighbour, and it would silently measure a DIFFERENT letter on the
    # two sides. So the default here is the whole mask, and --component
    # largest is kept so the deviation can be priced.
    comp = largest_component(mask) if component == 'largest' else mask.copy()
    ink = int(comp.sum())
    span = feret(comp)
    d = edt(comp)
    sw = 2.0 * float(np.median(d))
    p90 = 2.0 * float(np.percentile(d, 90))
    ys, xs = np.nonzero(comp)
    bb = (xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1)
    return {
        'label': label,
        'ink': ink,
        'all_ink': int(mask.sum()),
        'span': span,
        'ink_span': ink / span if span else 0.0,
        'dens': 1000.0 * ink / (span * span) if span else 0.0,
        'sw': sw,
        'p90sw': p90,
        'rsw': 100.0 * sw / span if span else 0.0,
        'rp90': 100.0 * p90 / span if span else 0.0,
        'bbox_fill': ink / bb if bb else 0.0,
        'bbox': (int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())),
    }


def show(s):
    print(f"{s['label']:<28} ink {s['ink']:>6} (mask {s['all_ink']:>6})  span {s['span']:7.2f}  "
          f"ink/span {s['ink_span']:6.2f}  DENS {s['dens']:6.1f}")
    print(f"{'':<28} SW {s['sw']:5.2f}  P90SW {s['p90sw']:5.2f}  RSW {s['rsw']:5.2f}%  "
          f"RP90 {s['rp90']:5.2f}%  bbox fill {s['bbox_fill']:.3f}  "
          f"bbox x[{s['bbox'][0]},{s['bbox'][1]}] y[{s['bbox'][2]},{s['bbox'][3]}]")


# ---------------------------------------------------------------------------
# masks
# ---------------------------------------------------------------------------
def native_from_upscale(path, thresh=0.5):
    """Area-downsample an arcade frame to 320x224 and return the LETTER-INK
    mask. The ink rule is NEUTRAL white (the wordmark) plus the leading A's
    blue and the leading B's red, both of which are the only saturated inks
    left of the sphere plate. Neutrality, not brightness: the plate's ball
    highlights are bright AND blue-tinted, and a brightness test counts them."""
    img = np.asarray(Image.open(path).convert('RGB')).astype(int)
    h, w, _ = img.shape
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx, mn = img.max(2), img.min(2)
    X = np.arange(w)[None, :]
    white = (mn > 195) & ((mx - mn) < 20)
    blue_a = (b > 200) & (r < 80) & (g > 110) & (X < w * 0.36)
    red_b = (r > 180) & (g < 90) & (b < 90) & (X < w * 0.30)
    ink = (white | blue_a | red_b).astype(float)
    sx, sy = w / NATIVE_W, h / NATIVE_H
    nat = np.zeros((NATIVE_H, NATIVE_W))
    for ny in range(NATIVE_H):
        y0, y1 = int(round(ny * sy)), int(round((ny + 1) * sy))
        for nx in range(NATIVE_W):
            x0, x1 = int(round(nx * sx)), int(round((nx + 1) * sx))
            nat[ny, nx] = ink[y0:y1, x0:x1].mean()
    m = nat > thresh
    return despeckle(m)


def despeckle(m):
    """Drop 1-px specks: the downsample of a 3.2x upscale leaves single
    cells at ball-highlight centres. 4 of 9 neighbours, which keeps every
    1-px feature that is part of a stroke."""
    pad = np.pad(m, 1)
    cnt = np.zeros_like(m, dtype=int)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            cnt += pad[1 + dy:1 + dy + m.shape[0], 1 + dx:1 + dx + m.shape[1]].astype(int)
    return m & (cnt >= 4)


def native_from_ours(path):
    img = np.asarray(Image.open(path).convert('RGB'))
    h, w, _ = img.shape
    if (w, h) != (NATIVE_W, NATIVE_H):
        if w % NATIVE_W or h % NATIVE_H:
            raise SystemExit(f'{path}: {w}x{h} is not an integer multiple of native')
        sy, sx = h // NATIVE_H, w // NATIVE_W
        blocks = img.reshape(NATIVE_H, sy, NATIVE_W, sx, 3)
        if not (blocks == blocks[:, :1, :, :1, :]).all():
            raise SystemExit(f'{path}: upscale is not block-uniform')
        img = img[::sy, ::sx]
    img = img.astype(int)
    h2, w2, _ = img.shape
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx, mn = img.max(2), img.min(2)
    X = np.arange(w2)[None, :]
    white = (mn > 195) & ((mx - mn) < 20)
    blue_a = (b > 200) & (r < 80) & (g > 110) & (X < w2 * 0.36)
    # THE X GATE ON THE RED IS NOT COSMETIC AND THE FIRST VERSION OF THIS
    # FILE DID NOT HAVE IT. Our leading B and the plate's MOLTEN balls are
    # THE SAME INK (#f70000 — REFERENCE publishes one board red and the
    # palette uses it for both), so without the gate every molten ball on the
    # plate counts as letter ink. It inflated ours by ~900 px and left the
    # arcade side, which already had the gate, untouched: a one-sided
    # operator, i.e. exactly the "same name, different operator" failure this
    # project has a ledger row for. Found by printing the T's rows and
    # seeing a lattice under the baseline. Both sides now carry both gates.
    red_b = (r > 180) & (g < 90) & (b < 90) & (X < w2 * 0.30)
    m = white | blue_a | red_b
    m[180:] = False          # below the wordmark: INSERT COIN / CREDIT / SEGA
    return m


# ---------------------------------------------------------------------------
def selftest():
    ok = True

    def check(name, got, want, tol):
        nonlocal ok
        good = abs(got - want) <= tol
        ok = ok and good
        print(f"  {'PASS' if good else 'FAIL'}  {name}: got {got:.3f} want {want:.3f} +-{tol}")

    # 1. analytic stroke figure: an H of 3-px strokes in a 40x40 box
    a = np.zeros((60, 60), bool)
    a[10:50, 10:13] = True
    a[10:50, 30:33] = True
    a[28:31, 10:33] = True
    s1 = stats(a, 'control 1 stroke H')
    show(s1)
    check('control 1 SW on 3-px strokes', s1['sw'], 3.0, 1.0)

    # 2. the same figure at 2x: INK/SPAN must double, RSW must not move
    b = np.kron(a, np.ones((2, 2), bool))
    s2 = stats(b, 'control 2 same at 2x')
    show(s2)
    check('control 2 ink/span ratio vs control 1', s2['ink_span'] / s1['ink_span'], 2.0, 0.05)
    check('control 2 RSW invariant', s2['rsw'] / s1['rsw'], 1.0, 0.12)

    # 3. a FILLED block of the same span: must separate on SW, upward
    c = np.zeros((60, 60), bool)
    c[10:50, 10:33] = True
    s3 = stats(c, 'control 3 filled block')
    show(s3)
    check('control 3 SW >> control 1 SW', s3['sw'] / s1['sw'], 7.0, 4.0)
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--arcade', action='append', default=[])
    ap.add_argument('--ours', action='append', default=[])
    ap.add_argument('--component', default='all', choices=['all', 'largest'])
    args = ap.parse_args()
    if args.selftest:
        return selftest()
    masks = []
    for p in args.arcade:
        masks.append((f'ARCADE {os.path.basename(p)}', native_from_upscale(p)))
    for p in args.ours:
        masks.append((f'OURS   {os.path.basename(os.path.dirname(p))}', native_from_ours(p)))
    results = []
    for label, m in masks:
        s = stats(m, label, args.component)
        results.append(s)
        show(s)
    if len(results) >= 2:
        a, b = results[0], results[-1]
        ratio = b['span'] / a['span'] if a['span'] else 0
        print()
        print(f"span ratio ours/arcade = {ratio:.3f} "
              f"({'MATCHED, ink/span comparable' if abs(ratio - 1) <= 0.10 else 'NOT MATCHED -- quote RSW only'})")
        print(f"ink/span  arcade {a['ink_span']:.2f}  ours {b['ink_span']:.2f}  ours/arcade {b['ink_span']/a['ink_span']:.3f}")
        print(f"RSW       arcade {a['rsw']:.2f}%  ours {b['rsw']:.2f}%  ours/arcade {b['rsw']/a['rsw']:.3f}")
        print(f"bbox fill arcade {a['bbox_fill']:.3f}  ours {b['bbox_fill']:.3f}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
