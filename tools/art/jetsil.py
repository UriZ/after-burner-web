#!/usr/bin/env python3
"""JET-SIL — REFERENCE.md "Silhouette discriminators, astern view", implemented
exactly as that section's operator specifies, so our sprite and the arcade's
can be read with one instrument.

Operator (quoting the steps that matter, because this project has twice
shipped a number whose operator was not written down):

  mask      max(R,G,B) > V_THRESH on a dark background, or saturation < 0.35
            AND V > 0.08 over a saturated sky; then keep ONLY the largest
            8-connected component.
  row width COUNT OF FILLED PIXELS in the row (not the row's extent).
  S         max row width.  SPAN = max row EXTENT (= wingspan).  H = height.
  fin band  rows from the top down to, but excluding, the first row whose
            filled width >= 0.30 * S.
  two-blade a fin-band row holds >= 2 runs of >= 2 consecutive mask pixels
            whose inter-run gap is >= max(2, 0.03*SPAN).
  fin extent  max over fin-band rows of (right-most minus left-most filled
            column) + 1, as a percentage of SPAN.
  cant      blade-pair half-separation at the TOPMOST fin row divided by the
            same at the LOWEST fin row, using the outermost two runs.
  nozzles   afterburner glow: hue 5-55 deg, S >= 0.45, V >= 0.45; the two
            largest 8-connected components; separation of their x-centroids
            as a percentage of SPAN.

Usage:
  python3 tools/art/jetsil.py <image> [--box x0,y0,x1,y1] [--v 30]
                              [--sky] [--label NAME]

--sky switches the airframe mask to the achromatic form, for our sprite over
the #009fff stage-1 sky. Default is the dark-background form.

Run with no arguments to execute the CONTROL suite against the arcade frames
and REFERENCE.md's published values; an uncontrolled operator is how the
defective R3 triple shipped.
"""
import sys
import colorsys
from collections import deque

from PIL import Image


def load(path, box):
    im = Image.open(path).convert("RGBA")
    if box:
        im = im.crop(box)
    return im


def airframe_mask(im, v_thresh, sky_mode):
    w, h = im.size
    px = im.load()
    m = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            mx = max(r, g, b)
            if sky_mode:
                mn = min(r, g, b)
                sat = 0.0 if mx == 0 else (mx - mn) / mx
                if sat < 0.35 and mx / 255.0 > 0.08:
                    m[y][x] = True
            else:
                if mx > v_thresh:
                    m[y][x] = True
    return m


def nozzle_mask(im):
    w, h = im.size
    px = im.load()
    m = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            hh, ss, vv = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            deg = hh * 360
            if (deg <= 55 or deg >= 355) and ss >= 0.45 and vv >= 0.45:
                m[y][x] = True
    return m


def components8(m):
    h = len(m)
    w = len(m[0])
    seen = [[False] * w for _ in range(h)]
    out = []
    for sy in range(h):
        for sx in range(w):
            if not m[sy][sx] or seen[sy][sx]:
                continue
            q = deque([(sx, sy)])
            seen[sy][sx] = True
            cells = []
            while q:
                x, y = q.popleft()
                cells.append((x, y))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and m[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
            out.append(cells)
    out.sort(key=len, reverse=True)
    return out


def largest_only(m):
    comps = components8(m)
    if not comps:
        return m, 0
    h = len(m)
    w = len(m[0])
    out = [[False] * w for _ in range(h)]
    for x, y in comps[0]:
        out[y][x] = True
    return out, len(comps[0])


def runs(row):
    out = []
    start = None
    for x, on in enumerate(row):
        if on and start is None:
            start = x
        elif not on and start is not None:
            out.append((start, x - 1))
            start = None
    if start is not None:
        out.append((start, len(row) - 1))
    return [r for r in out if r[1] - r[0] + 1 >= 2]


def measure(path, box=None, v_thresh=30, sky_mode=False, label=""):
    im = load(path, box)
    m, _ = largest_only(airframe_mask(im, v_thresh, sky_mode))
    h = len(m)
    w = len(m[0])
    rows = [y for y in range(h) if any(m[y])]
    if not rows:
        return None
    top, bot = rows[0], rows[-1]
    widths = {y: sum(m[y]) for y in rows}
    extents = {}
    for y in rows:
        xs = [x for x in range(w) if m[y][x]]
        extents[y] = (xs[0], xs[-1])
    S = max(widths.values())
    SPAN = max(e[1] - e[0] + 1 for e in extents.values())
    H = bot - top + 1

    onset = None
    for y in range(top, bot + 1):
        if widths.get(y, 0) >= 0.30 * S:
            onset = y
            break
    fin_rows = [y for y in range(top, onset if onset is not None else bot + 1) if widths.get(y, 0)]

    gap_min = max(2, 0.03 * SPAN)
    two_blade = 0
    for y in fin_rows:
        rr = runs(m[y])
        ok = False
        for i in range(len(rr) - 1):
            if rr[i + 1][0] - rr[i][1] - 1 >= gap_min:
                ok = True
                break
        if ok:
            two_blade += 1

    fin_extent = 0
    for y in fin_rows:
        fin_extent = max(fin_extent, extents[y][1] - extents[y][0] + 1)

    def half_sep(y):
        rr = runs(m[y])
        if len(rr) < 2:
            return None
        cl = (rr[0][0] + rr[0][1]) / 2
        cr = (rr[-1][0] + rr[-1][1]) / 2
        return (cr - cl) / 2

    cant = None
    if fin_rows:
        a = half_sep(fin_rows[0])
        b = half_sep(fin_rows[-1])
        if a and b:
            cant = a / b

    nz = components8(nozzle_mask(im))
    nozzle_sep = None
    if len(nz) >= 2:
        cs = []
        for comp in nz[:2]:
            cs.append(sum(x for x, _ in comp) / len(comp))
        nozzle_sep = abs(cs[0] - cs[1])

    res = {
        "label": label or path,
        "frame_w": w,
        "S": S,
        "SPAN": SPAN,
        "H": H,
        "fin_rows": len(fin_rows),
        "two_blade_pct": 100.0 * two_blade / len(fin_rows) if fin_rows else 0.0,
        "fin_extent_pct": 100.0 * fin_extent / SPAN,
        "nozzle_sep_pct": 100.0 * nozzle_sep / SPAN if nozzle_sep else None,
        "cant": cant,
        "aspect": SPAN / H,
        "span_pct_frame": 100.0 * SPAN / w,
        "fin_maxrow_pct_of_S": 100.0 * max((widths[y] for y in fin_rows), default=0) / S,
    }
    return res


def show(r):
    if r is None:
        print("  (no silhouette)")
        return
    print(f"  {r['label']}")
    print(f"    SPAN {r['SPAN']} px ({r['span_pct_frame']:.2f}% of {r['frame_w']} px frame)"
          f"  H {r['H']}  S {r['S']}")
    print(f"    two-blade fin rows   {r['two_blade_pct']:.1f}%  ({r['fin_rows']} rows in band)")
    print(f"    fin-pair extent      {r['fin_extent_pct']:.1f}% of SPAN")
    sep = r["nozzle_sep_pct"]
    print(f"    nozzle separation    {sep:.1f}% of SPAN" if sep else "    nozzle separation    n/a")
    print(f"    blade cant           {r['cant']:.2f}" if r["cant"] else "    blade cant           n/a")
    print(f"    aspect SPAN/H        {r['aspect']:.2f}   (sanity 3.0-3.6)")
    print(f"    fin max row width    {r['fin_maxrow_pct_of_S']:.1f}% of S (description only)")


CONTROLS = [
    # path, box, v, label, published-expectation text
    ("reference/stage3-night-level-t175.png", (207, 227, 487, 306), 30,
     "arcade t175 (686x480)",
     "REFERENCE.md: two-blade 99-100%, fin extent 35.4-35.7%, nozzle sep 30.1%, "
     "cant 1.29, aspect 3.24, fin max row 16.2% of S"),
]


def main():
    args = sys.argv[1:]
    if not args:
        print("CONTROL SUITE — operator validated against REFERENCE.md's published values")
        for path, box, v, label, expect in CONTROLS:
            print(f"\n  expect: {expect}")
            show(measure(path, box, v, False, label))
        return
    path = args[0]
    box = None
    v = 30
    sky = False
    label = ""
    i = 1
    while i < len(args):
        if args[i] == "--box":
            box = tuple(int(n) for n in args[i + 1].split(","))
            i += 2
        elif args[i] == "--v":
            v = int(args[i + 1])
            i += 2
        elif args[i] == "--sky":
            sky = True
            i += 1
        elif args[i] == "--label":
            label = args[i + 1]
            i += 2
        else:
            i += 1
    show(measure(path, box, v, sky, label))


if __name__ == "__main__":
    main()
