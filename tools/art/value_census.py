#!/usr/bin/env python3
"""value_census.py — airframe VALUE and AREA census for the player jet.

WHY THIS EXISTS, AND WHY IT IS NOT tools/measure_value_stats.py
---------------------------------------------------------------
R6's judge REFUTED the headline "ours 0.839 = arcade 0.839" because the two
columns were produced by two different operators:

  REFERENCE.md VALUE-STAT step 2:  "keep achromatic pixels only, S < 0.25"
                                    -- and it does not say whether a V floor
                                    is applied.
  R6 sprite lane's V-CENSUS:       "S < 0.35 AND V > 0.08"

On one crop those differ by 0.13 of median, because the second silently drops
the black keyline out of the population and the first does not. So this tool
NEVER reports one median. It reports the SAME crop under all three readings,
side by side, always:

  A  S<0.25, no V floor        (REFERENCE.md's published text, literally)
  B  S<0.25, V>0.08            (the same with the floor the text omits)
  C  S<0.35, V>0.08            (R6's V-CENSUS)

Any single number quoted out of this tool must name its reading letter.

Saturation convention, stated because it is the whole disagreement: S =
(max-min)/max, and S is defined as 0 when max == 0. Pure black is therefore
ACHROMATIC and is in reading A's population. That is what makes A sensitive to
keyline area, which is the R7 lever.

The second half of the tool is the AREA census -- every colour in the mask with
its share, V and S. The R6 judge's and the art critic's joint finding is that
role AREA, not role value, is the dominant defect: our jet puts 29.5 % of its
airframe in one mauve-grey block where the arcade puts 8.7 %, and rings the
whole sprite in pure black where the arcade's rim is 10 % black. A median alone
cannot see either.

RIM census: the pixels 4-adjacent to the sprite mask but outside it. The art
critic's rank-2 operator, reimplemented here from its prose so both sides are
measured by one instrument.

Usage
  value_census.py IMG --box x0,y0,x1,y1 [--mask-mode sky|dark|alpha|diff]
                      [--diff IMG_OFF] [--isolate largest] [--dump DIR]
                      [--zoom 6] [--label NAME]
  value_census.py --selftest
"""
import argparse
import sys
from collections import Counter

import numpy as np
from PIL import Image


# --------------------------------------------------------------------------
# core statistics
# --------------------------------------------------------------------------
def vsat(rgb):
    """V = max/255 and S = (max-min)/max, with S==0 where max==0."""
    a = rgb.astype(np.int32)
    mx = a.max(axis=-1)
    mn = a.min(axis=-1)
    v = mx / 255.0
    s = np.zeros(mx.shape, dtype=np.float64)
    nz = mx > 0
    s[nz] = (mx[nz] - mn[nz]) / mx[nz]
    return v, s


READINGS = (
    ("A", 0.25, None, "S<0.25, no V floor (REFERENCE.md VALUE-STAT as published)"),
    ("B", 0.25, 0.08, "S<0.25, V>0.08"),
    ("C", 0.35, 0.08, "S<0.35, V>0.08 (R6 V-CENSUS)"),
)


def readings(rgb, mask):
    """All three achromatic readings over `mask`. Returns list of dicts."""
    v, s = vsat(rgb)
    out = []
    for letter, smax, vfloor, desc in READINGS:
        m = mask & (s < smax)
        if vfloor is not None:
            m = m & (v > vfloor)
        vv = v[m]
        out.append(
            dict(
                reading=letter,
                desc=desc,
                n=int(vv.size),
                share_of_mask=(vv.size / max(1, int(mask.sum()))),
                median=float(np.median(vv)) if vv.size else float("nan"),
                mean=float(vv.mean()) if vv.size else float("nan"),
                p90=float(np.percentile(vv, 90)) if vv.size else float("nan"),
                vmax=float(vv.max()) if vv.size else float("nan"),
                share_gt80=float((vv > 0.80).mean()) if vv.size else float("nan"),
                share_ge969=float((vv >= 0.969).mean()) if vv.size else float("nan"),
            )
        )
    return out


def colour_census(rgb, mask):
    """Every colour under `mask`, by descending area share."""
    px = rgb[mask]
    c = Counter(map(tuple, px))
    tot = max(1, len(px))
    rows = []
    for (r, g, b), n in c.most_common():
        mx, mn = max(r, g, b), min(r, g, b)
        rows.append(
            dict(
                hex="#%02x%02x%02x" % (r, g, b),
                n=n,
                share=n / tot,
                v=mx / 255.0,
                s=0.0 if mx == 0 else (mx - mn) / mx,
            )
        )
    return rows, tot


# --------------------------------------------------------------------------
# masks
# --------------------------------------------------------------------------
def sprite_mask(rgb, mode, other=None):
    """Which pixels are the SPRITE (not the background).

    sky   -- reject the saturated blue sky family (our day captures / t116)
    dark  -- reject near-black background (the isolated night crops)
    desert-- reject the saturated desert sky+ground (the native desert frame):
             everything with S >= 0.35 is background there, which is exactly
             why REFERENCE.md uses that frame for the value statistic.
    diff  -- jet-on vs jet-off difference; colour-blind, the only mask that
             cannot be biased by the palette under test
    """
    if mode == "diff":
        if other is None:
            raise SystemExit("--mask-mode diff needs --diff IMG_OFF")
        return np.any(rgb.astype(np.int16) != other.astype(np.int16), axis=-1)
    v, s = vsat(rgb)
    if mode == "dark":
        return rgb.max(axis=-1) > 30
    if mode == "sky":
        r = rgb[..., 0].astype(np.int16)
        b = rgb[..., 2].astype(np.int16)
        return ~((r < 60) & (b > 170) & (b > r + 100))
    if mode == "desert":
        return s < 0.35
    raise SystemExit("unknown mask mode " + mode)


def largest_component(mask):
    """Largest 8-connected component of `mask`, iterative flood fill."""
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = None
    best_n = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or seen[y, x]:
                continue
            stack = [(y, x)]
            seen[y, x] = True
            comp = []
            while stack:
                cy, cx = stack.pop()
                comp.append((cy, cx))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
            if len(comp) > best_n:
                best_n = len(comp)
                best = comp
    out = np.zeros_like(mask)
    if best:
        for cy, cx in best:
            out[cy, cx] = True
    return out


def rim_of(mask):
    """Pixels 4-adjacent to the mask and outside it (the art critic's `rim`)."""
    grown = np.zeros_like(mask)
    grown[1:, :] |= mask[:-1, :]
    grown[:-1, :] |= mask[1:, :]
    grown[:, 1:] |= mask[:, :-1]
    grown[:, :-1] |= mask[:, 1:]
    return grown & ~mask


# --------------------------------------------------------------------------
# report
# --------------------------------------------------------------------------
def report(label, rgb, mask, dump=None, zoom=6, top=14):
    n = int(mask.sum())
    ys, xs = np.nonzero(mask)
    bbox = (
        (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
        if n
        else None
    )
    print(f"\n=== {label} ===")
    print(f"mask px {n}   bbox x[{bbox[0]},{bbox[2]}) y[{bbox[1]},{bbox[3]}) "
          f"= {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]}" if bbox else "mask EMPTY")
    print("  reading                                                  n     "
          "%mask  median   mean    p90    max   >0.80  >=0.969")
    for r in readings(rgb, mask):
        print(f"  {r['reading']}  {r['desc']:<50} {r['n']:6d} {r['share_of_mask']*100:6.1f}"
              f" {r['median']:7.3f} {r['mean']:6.3f} {r['p90']:6.3f} {r['vmax']:6.3f}"
              f" {r['share_gt80']*100:6.1f} {r['share_ge969']*100:7.1f}")

    rows, tot = colour_census(rgb, mask)
    print(f"  colour census: {len(rows)} unique over {tot} px")
    for r in rows[:top]:
        print(f"    {r['hex']}  V {r['v']:.3f}  S {r['s']:.3f}  "
              f"{r['n']:6d}  {r['share']*100:5.1f} %")
    if len(rows) > top:
        print(f"    ... {len(rows)-top} more, "
              f"{sum(r['share'] for r in rows[top:])*100:.1f} % of area")

    rim = rim_of(mask)
    rrows, rtot = colour_census(rgb, rim)
    nearblack = sum(r["n"] for r in rrows if r["v"] <= 0.12) / max(1, rtot)
    print(f"  RIM: {rtot} px, near-black (V<=0.12) {nearblack*100:.1f} %")
    for r in rrows[:6]:
        print(f"    {r['hex']}  V {r['v']:.3f}  {r['n']:5d}  {r['share']*100:5.1f} %")

    if dump:
        import os

        os.makedirs(dump, exist_ok=True)
        stem = label.replace(" ", "-").replace("/", "-")
        Image.fromarray((mask * 255).astype(np.uint8)).resize(
            (mask.shape[1] * zoom, mask.shape[0] * zoom), Image.NEAREST
        ).save(f"{dump}/{stem}-mask-{zoom}x.png")
        masked = rgb.copy()
        masked[~mask] = (255, 0, 255)
        Image.fromarray(masked).resize(
            (rgb.shape[1] * zoom, rgb.shape[0] * zoom), Image.NEAREST
        ).save(f"{dump}/{stem}-masked-{zoom}x.png")
        Image.fromarray(rgb).resize(
            (rgb.shape[1] * zoom, rgb.shape[0] * zoom), Image.NEAREST
        ).save(f"{dump}/{stem}-crop-{zoom}x.png")
        print(f"  dumped {dump}/{stem}-{{mask,masked,crop}}-{zoom}x.png  "
              "-- LOOK AT THESE before quoting a number")
    return rows, tot


# --------------------------------------------------------------------------
# self-test: the instrument is validated on synthetic input with a KNOWN answer
# before it is pointed at any artwork.
# --------------------------------------------------------------------------
def selftest():
    ok = True

    def check(name, got, want, tol=1e-9):
        nonlocal ok
        good = abs(got - want) <= tol if isinstance(want, float) else got == want
        print(f"  {'OK  ' if good else 'FAIL'} {name}: got {got!r} want {want!r}")
        ok = good and ok

    # 1. known grey ramp: median must be the middle value, exactly.
    ramp = np.array([[[v, v, v] for v in (0, 64, 128, 192, 255)]], dtype=np.uint8)
    m = np.ones(ramp.shape[:2], bool)
    rs = {r["reading"]: r for r in readings(ramp, m)}
    check("grey ramp, reading A median (5 px incl. black)", rs["A"]["median"], 128 / 255)
    check("grey ramp, reading A n", rs["A"]["n"], 5)
    # the V floor must drop exactly the black pixel and shift the median up
    check("grey ramp, reading B n (black dropped)", rs["B"]["n"], 4)
    check("grey ramp, reading B median", rs["B"]["median"], (128 / 255 + 192 / 255) / 2)

    # 2. THE DEFECT THE TOOL EXISTS FOR, as a positive control: keyline AREA.
    #    My first version of this control asserted that ringing a bright body
    #    in black "collapses" reading A's median. It does not, and the tool
    #    was right and the control wrong -- a 1 px ring on a 10x10 block is
    #    36 % of the pixels and A MEDIAN CANNOT SEE A 36 % MINORITY. That is
    #    worth keeping as a comment, because it is also the thing to remember
    #    about reading A's sensitivity: it is a step function at 50 % black,
    #    not a gradual one. The share statistic is the one that reads keyline
    #    area continuously.
    body = np.full((10, 10, 3), 0xF7, np.uint8)
    mb = np.ones((10, 10), bool)
    keyed = body.copy()
    keyed[0, :] = keyed[-1, :] = keyed[:, 0] = keyed[:, -1] = 0   # 36 px black
    half = body.copy()
    half[:6, :] = 0                                              # 60 px black
    check("keyline control: A on bare body", readings(body, mb)[0]["median"], 0xF7 / 255)
    check("keyline control: A median unmoved by a 36 % ring",
          readings(keyed, mb)[0]["median"], 0xF7 / 255)
    check("keyline control: A share>0.80 DOES see the 36 % ring",
          readings(keyed, mb)[0]["share_gt80"], 0.64, 1e-12)
    check("keyline control: A median collapses once black is the majority",
          readings(half, mb)[0]["median"], 0.0)
    check("keyline control: B is blind to all of it",
          readings(keyed, mb)[1]["median"], 0xF7 / 255)
    check("keyline control: B n excludes exactly the black px",
          readings(keyed, mb)[1]["n"], 64)

    # 3. saturated pixels must be rejected by every reading (the afterburner,
    #    the canopy, the sky).
    red = np.array([[[255, 0, 0]]], dtype=np.uint8)
    check("pure red rejected by A", readings(red, np.ones((1, 1), bool))[0]["n"], 0)

    # 4. #c5c5ad must read V 0.7725 exactly -- the constant the retired R4
    #    ceiling was built on, so a regression here would resurrect it.
    c5 = np.array([[[0xC5, 0xC5, 0xAD]]], dtype=np.uint8)
    check("#c5c5ad V", vsat(c5)[0][0, 0], 0xC5 / 255, 1e-12)

    # 5. rim: a 1 px ring round a 3x3 block is 2*(3+2)+2*3 = 16? No -- 4-adjacency
    #    gives the plus-shaped halo: 12 px for a 3x3 block in a 5x5 field.
    f = np.zeros((7, 7), bool)
    f[2:5, 2:5] = True
    check("rim of a 3x3 block, 4-adjacent", int(rim_of(f).sum()), 12)

    # 6. largest_component must pick the bigger of two blobs and nothing else.
    two = np.zeros((9, 9), bool)
    two[1:3, 1:3] = True          # 4 px
    two[4:8, 4:8] = True          # 16 px
    lc = largest_component(two)
    check("largest component n", int(lc.sum()), 16)
    check("largest component excludes the small blob", bool(lc[1, 1]), False)

    print("SELFTEST", "PASS" if ok else "FAIL")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("img", nargs="?")
    ap.add_argument("--box", help="x0,y0,x1,y1 in the image's own pixels")
    ap.add_argument("--mask-mode", default="desert",
                    choices=["sky", "dark", "desert", "diff"])
    ap.add_argument("--diff", help="the jet-off frame, for --mask-mode diff")
    ap.add_argument("--isolate", choices=["largest"], default=None)
    ap.add_argument("--decimate", type=int, default=1,
                    help="take img[::N,::N] first (our 3x captures -> native)")
    ap.add_argument("--dump")
    ap.add_argument("--zoom", type=int, default=6)
    ap.add_argument("--label", default=None)
    ap.add_argument("--selftest", action="store_true")
    a = ap.parse_args()

    if a.selftest:
        return selftest()
    if not a.img:
        ap.error("need IMG or --selftest")

    # A sheet cell is RGBA. Compositing transparency onto a FULLY SATURATED
    # magenta is what lets an authored cell and the arcade's native frame go
    # through one mask construction (S<0.35 + largest component): the arcade's
    # desert sky and ground are S=1.00 and so is the magenta, so "background"
    # means the same thing on both sides and the census populations match.
    src = Image.open(a.img)
    if src.mode in ("RGBA", "LA", "P"):
        src = src.convert("RGBA")
        bg = Image.new("RGBA", src.size, (255, 0, 255, 255))
        src = Image.alpha_composite(bg, src)
    rgb = np.asarray(src.convert("RGB"))
    other = np.asarray(Image.open(a.diff).convert("RGB")) if a.diff else None
    if a.decimate > 1:
        n = a.decimate
        blk = rgb.reshape(rgb.shape[0] // n, n, rgb.shape[1] // n, n, 3)
        if not (blk == blk[:, :1, :, :1]).all():
            print(f"WARNING: {n}x{n} blocks are NOT uniform; decimation is lossy")
        rgb = rgb[::n, ::n]
        if other is not None:
            other = other[::n, ::n]
    if a.box:
        x0, y0, x1, y1 = (int(t) for t in a.box.split(","))
        rgb = rgb[y0:y1, x0:x1]
        if other is not None:
            other = other[y0:y1, x0:x1]

    mask = sprite_mask(rgb, a.mask_mode, other)
    if a.isolate == "largest":
        mask = largest_component(mask)
    report(a.label or a.img, rgb, mask, dump=a.dump, zoom=a.zoom)
    return 0


if __name__ == "__main__":
    sys.exit(main())
