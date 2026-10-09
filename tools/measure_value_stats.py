#!/usr/bin/env python3
"""VALUE-STAT — HSV value statistics over a crop, restricted to achromatic pixels.

Operator (VALUE-STAT), as used for REFERENCE.md "Player jet / airframe value":
  1. Crop x0..x1, y0..y1 (inclusive-exclusive, in the IMAGE's own pixel grid).
  2. Convert sRGB bytes to HSV with the standard max/min formulation
     (V = max(R,G,B)/255, S = (max-min)/max, S=0 when max=0).
  3. Keep only ACHROMATIC pixels: S < SAT_MAX (default 0.25). This is what excludes the
     afterburner, the canopy and the sky; it is the pixel-selection half of the operator and
     changing it changes every number below.
  4. Report count, V median, V p90, V max, and share V > 0.80 over the KEPT pixels.

Also reports the same over ALL pixels in the crop, because the two differ and have been
quoted as one statistic before.

Controls: --selftest builds inputs with known answers and checks them.
"""
import argparse, sys
import numpy as np
from PIL import Image


def hsv(rgb):
    a = rgb.astype(np.float64) / 255.0
    mx = a.max(axis=-1); mn = a.min(axis=-1)
    v = mx
    s = np.where(mx > 0, (mx - mn) / np.where(mx > 0, mx, 1), 0.0)
    return s, v


def label8(mask):
    """8-connected labelling by iterative flood fill (no scipy here). Returns (labels, n)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    n = 0
    nbr = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        stack = [(y0, x0)]
        lab[y0, x0] = n
        while stack:
            y, x = stack.pop()
            for dy, dx in nbr:
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n
                    stack.append((yy, xx))
    return lab, n


def largest_achromatic_component(rgb, sat_max, v_min):
    """Isolate the biggest achromatic blob in the crop. This is the airframe-isolation half
    of VALUE-STAT for a frame where the jet sits on a SATURATED background (blue sky, orange
    desert): the mask drops the sky and the sea, the component step drops HUD glyphs, debris
    and a second aircraft. ALWAYS dump and look at the result before believing a number."""
    s, v = hsv(rgb)
    m = (s < sat_max) & (v > v_min)
    lab, n = label8(m)
    if n == 0:
        return np.zeros(m.shape, bool), 0
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    k = int(sizes.argmax())
    return lab == k, int(sizes[k])


def stats(rgb, sat_max, keep=None):
    s, v = hsv(rgb)
    base = (s < sat_max) if keep is None else ((s < sat_max) & keep)
    out = {}
    for label, mask in (("achromatic", base), ("all", np.ones_like(s, bool) if keep is None else keep)):
        vv = v[mask]
        if vv.size == 0:
            out[label] = None; continue
        out[label] = dict(n=int(vv.size), median=float(np.median(vv)),
                          p90=float(np.percentile(vv, 90)), vmax=float(vv.max()),
                          share_gt_080=float((vv > 0.80).mean()))
    return out


def selftest():
    ok = True
    # 1. pure grey ramp: every pixel achromatic, V known exactly.
    ramp = np.stack([np.arange(256, dtype=np.uint8)] * 3, axis=-1).reshape(1, 256, 3)
    r = stats(ramp, 0.25)
    exp_med = (np.arange(256) / 255.0)
    ok &= r["achromatic"]["n"] == 256
    ok &= abs(r["achromatic"]["vmax"] - 1.0) < 1e-9
    ok &= abs(r["achromatic"]["median"] - float(np.median(exp_med))) < 1e-9
    print(f"  grey ramp: n={r['achromatic']['n']} (exp 256) median={r['achromatic']['median']:.4f} "
          f"(exp {np.median(exp_med):.4f}) max={r['achromatic']['vmax']:.4f} (exp 1.0000)")
    # 2. saturated red must be REJECTED by the achromatic filter, and must not move V median.
    mix = np.zeros((1, 200, 3), np.uint8)
    mix[0, :100] = (128, 128, 128)          # S=0,   V=0.502
    mix[0, 100:] = (255, 0, 0)              # S=1.0, V=1.000
    r = stats(mix, 0.25)
    ok &= r["achromatic"]["n"] == 100
    ok &= abs(r["achromatic"]["vmax"] - 128 / 255) < 1e-9
    ok &= abs(r["all"]["vmax"] - 1.0) < 1e-9
    print(f"  red rejection: kept {r['achromatic']['n']}/200 (exp 100), achromatic max "
          f"{r['achromatic']['vmax']:.4f} (exp 0.5020), all-pixel max {r['all']['vmax']:.4f} (exp 1.0000)")
    # 3. the exact colour the ceiling was written from.
    c = np.array([[[0xc5, 0xc5, 0xad]]], np.uint8)
    s, v = hsv(c)
    ok &= abs(v[0, 0] - 197 / 255) < 1e-9
    print(f"  #c5c5ad: V={v[0,0]:.4f} (exp 0.7725), S={s[0,0]:.4f}")
    # 4. a borderline-chroma pixel near the filter edge is classified by the stated threshold.
    b = np.array([[[200, 200, 160]]], np.uint8)   # S = 40/200 = 0.200 -> kept at 0.25
    s, _ = hsv(b)
    ok &= (s[0, 0] < 0.25)
    print(f"  #c8c8a0: S={s[0,0]:.4f} -> kept at SAT_MAX 0.25 (boundary behaviour stated)")
    # 5. component isolation: two achromatic blobs of known size on a saturated field;
    #    the operator must return the larger one and must not merge them.
    field = np.zeros((40, 80, 3), np.uint8)
    field[:, :] = (0, 158, 255)            # saturated sky
    field[5:15, 5:25] = (220, 220, 210)    # blob A: 10x20 = 200 px
    field[20:35, 40:70] = (240, 240, 230)  # blob B: 15x30 = 450 px
    m, sz = largest_achromatic_component(field, 0.25, 0.30)
    ok &= sz == 450 and m[25, 50] and not m[10, 10]
    print(f"  component isolation: picked {sz} px (exp 450), B in / A out: "
          f"{bool(m[25,50])}/{not bool(m[10,10])}")
    print("SELFTEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("image", nargs="?")
    ap.add_argument("--box", help="x0,y0,x1,y1 in image pixels")
    ap.add_argument("--sat-max", type=float, default=0.25)
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--dump-crop")
    ap.add_argument("--isolate", choices=["largest"], help="keep only the largest 8-connected achromatic component")
    ap.add_argument("--v-min", type=float, default=0.30, help="V floor for the isolation mask only")
    ap.add_argument("--dump-mask")
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    im = Image.open(a.image).convert("RGB")
    arr = np.asarray(im)
    box = "whole image %dx%d" % im.size
    if a.box:
        x0, y0, x1, y1 = (int(t) for t in a.box.split(","))
        arr = arr[y0:y1, x0:x1]
        box = f"x[{x0},{x1}) y[{y0},{y1}) of {im.size[0]}x{im.size[1]}"
    if a.dump_crop:
        Image.fromarray(arr).resize((arr.shape[1] * 6, arr.shape[0] * 6), Image.NEAREST).save(a.dump_crop)
    keep = None
    if a.isolate == "largest":
        keep, sz = largest_achromatic_component(arr, a.sat_max, a.v_min)
        print(f"  [isolate] largest achromatic component = {sz} px (V_MIN={a.v_min})")
        if a.dump_mask:
            shown = arr.copy(); shown[~keep] = (255, 0, 255)
            Image.fromarray(shown).resize((arr.shape[1] * 6, arr.shape[0] * 6), Image.NEAREST).save(a.dump_mask)
    r = stats(arr, a.sat_max, keep)
    print(f"{a.image}  {box}  SAT_MAX={a.sat_max}  isolate={a.isolate}")
    for k in ("achromatic", "all"):
        d = r[k]
        print(f"  {k:11s} n={d['n']:6d}  V median={d['median']:.3f}  p90={d['p90']:.3f}  "
              f"max={d['vmax']:.3f}  share V>0.80={d['share_gt_080']*100:.1f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
