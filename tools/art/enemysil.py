#!/usr/bin/env python3
"""ENEMY-SIL — the R4 report's gap-1 reproduction criteria for the enemy
aircraft, made reproducible. The report states the criteria in words
("fuselage whose width is <=35% of span", "no single feature occupying >12%
of silhouette area"); the words do not say which pixels count, so this file
fixes an operator and states it, per the R5 LESSON in judging/R5/
interfaces.md ("a citation proves provenance, not relevance").

Operator ENEMY-SIL, on a sprite-sheet cell with a transparent surround:

  silhouette  every non-transparent pixel. AREA = its pixel count.
              SPAN = max row extent. H = max column extent.
  fuselage    column occupancy c(x) = filled pixels in column x.
              The fuselage is the maximal run of columns CONTAINING the
              silhouette's x-centroid for which c(x) >= 0.50 * max(c).
              Reported as a percentage of SPAN. Rationale: on a swept-wing
              planform the wings are thin in y and the body is tall, so a
              column-height threshold separates them without needing to
              know where the body "is"; the centroid anchor stops a tall
              wingtip feature from being mistaken for the body.
  wing sweep  for each side, take the outer HALF of the span beyond the
              fuselage; fit a least-squares line to the TOPMOST filled row
              per column (the leading edge) and report its angle from
              horizontal in degrees, positive = rising outboard->inboard.
  features    for every distinct colour, the largest 8-connected
              single-colour component, as a percentage of AREA. The
              keyline is EXCLUDED: it is an outline of the whole shape, not
              a feature, and it necessarily spans the silhouette.
              TWO numbers are reported, because the naive one does not
              measure what the R4 report is complaining about. The report's
              target is "a large black-rimmed red disc" — a MARK. A wing is
              also one flat colour and legitimately runs 25-30% of a
              sprite's area on any aircraft, so the naive maximum fails
              every real aeroplane including the arcade's. The gate is
              therefore the largest COMPACT component: bbox aspect ratio
              <= 3:1 in both directions AND fill >= 0.5 of its own bbox,
              which admits discs, rings and blobs and rejects wings, fins
              and fuselage spines. The naive maximum is still printed, for
              anyone who wants to re-derive it.
  sweep sign  reported as a MAGNITUDE with its direction named. A head-on
              aircraft's leading edge rises inboard->outboard; a rear-aspect
              one's rises outboard. The criterion is "the planform reads as
              swept, not as a flat plank", so |angle| is the gate.
  distinct    run on two sheets and compare; reported here per sheet so the
              caller can diff.

Usage: python3 tools/art/enemysil.py <sheet.png> <cell_w> <cell_index> [label]
"""
import sys
from collections import deque

from PIL import Image


def cell(path, cw, idx):
    im = Image.open(path).convert("RGBA")
    return im.crop((idx * cw, 0, (idx + 1) * cw, im.height))


def analyse(im, label=""):
    w, h = im.size
    px = im.load()
    filled = [[px[x, y][3] != 0 for x in range(w)] for y in range(h)]
    cells = [(x, y) for y in range(h) for x in range(w) if filled[y][x]]
    if not cells:
        return None
    area = len(cells)
    xs = [c[0] for c in cells]
    ys = [c[1] for c in cells]
    span = max(xs) - min(xs) + 1
    height = max(ys) - min(ys) + 1
    cx = sum(xs) / len(xs)

    col = [sum(1 for y in range(h) if filled[y][x]) for x in range(w)]
    cmax = max(col)
    thr = 0.50 * cmax
    cxi = int(round(cx))
    if col[cxi] < thr:
        # centroid column is not body; fall back to the tallest column
        cxi = col.index(cmax)
    lo = cxi
    while lo - 1 >= 0 and col[lo - 1] >= thr:
        lo -= 1
    hi = cxi
    while hi + 1 < w and col[hi + 1] >= thr:
        hi += 1
    fus = hi - lo + 1

    def sweep(side):
        if side > 0:
            cols = [x for x in range(hi + 1, max(xs) + 1) if col[x]]
        else:
            cols = [x for x in range(min(xs), lo) if col[x]]
        if len(cols) < 4:
            return None
        pts = []
        for x in cols:
            top = next(y for y in range(h) if filled[y][x])
            pts.append((x, top))
        n = len(pts)
        mx = sum(p[0] for p in pts) / n
        my = sum(p[1] for p in pts) / n
        num = sum((p[0] - mx) * (p[1] - my) for p in pts)
        den = sum((p[0] - mx) ** 2 for p in pts)
        if den == 0:
            return None
        slope = num / den  # dy/dx, y DOWN
        import math
        # rising outboard->inboard: on the right side the leading edge goes
        # UP as x decreases, i.e. dy/dx > 0; mirror on the left.
        ang = math.degrees(math.atan(slope * (1 if side > 0 else -1)))
        return ang

    # largest single-colour 8-connected component per colour
    colours = {}
    for x, y in cells:
        r, g, b, _ = px[x, y]
        colours.setdefault((r, g, b), []).append((x, y))
    keyline = min(colours, key=lambda c: sum(c))  # darkest colour = outline
    feats = []
    compact = []
    for col_rgb, pts in colours.items():
        if col_rgb == keyline:
            continue
        pset = set(pts)
        seen = set()
        biggest = 0
        biggest_compact = 0
        for p in pts:
            if p in seen:
                continue
            q = deque([p])
            seen.add(p)
            comp = []
            while q:
                x, y = q.popleft()
                comp.append((x, y))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        np_ = (x + dx, y + dy)
                        if np_ in pset and np_ not in seen:
                            seen.add(np_)
                            q.append(np_)
            n = len(comp)
            biggest = max(biggest, n)
            bw = max(c[0] for c in comp) - min(c[0] for c in comp) + 1
            bh = max(c[1] for c in comp) - min(c[1] for c in comp) + 1
            if max(bw / bh, bh / bw) <= 3.0 and n >= 0.5 * bw * bh:
                biggest_compact = max(biggest_compact, n)
        feats.append((100.0 * biggest / area, "#%02x%02x%02x" % col_rgb, len(pts)))
        if biggest_compact:
            compact.append((100.0 * biggest_compact / area, "#%02x%02x%02x" % col_rgb))
    feats.sort(reverse=True)
    compact.sort(reverse=True)

    return {
        "label": label,
        "area": area,
        "span": span,
        "height": height,
        "fuselage_pct": 100.0 * fus / span,
        "sweep_r": sweep(+1),
        "sweep_l": sweep(-1),
        "features": feats,
        "compact": compact,
        "keyline": "#%02x%02x%02x" % keyline,
    }


def show(r):
    if r is None:
        print("  (empty cell)")
        return
    print(f"  {r['label']}")
    print(f"    SPAN {r['span']}  H {r['height']}  silhouette area {r['area']} px")
    print(f"    fuselage width       {r['fuselage_pct']:.1f}% of SPAN   (target <=35)")
    sr, sl = r["sweep_r"], r["sweep_l"]
    if sr is not None and sl is not None:
        d = "outboard" if sr < 0 else "inboard"
        print(f"    wing leading-edge |angle|  right {abs(sr):.1f} deg, left {abs(sl):.1f} deg"
              f"  (rises {d}; target >=15)")
    else:
        print("    wing leading-edge |angle|  n/a")
    top = r["compact"][0] if r["compact"] else None
    if top:
        print(f"    largest COMPACT feature    {top[0]:.1f}% of area  ({top[1]})   (GATE, target <=12)")
    else:
        print("    largest COMPACT feature    none (no blob passes the compactness test)")
    nav = r["features"][0] if r["features"] else None
    if nav:
        print(f"    largest flat region (naive, structural members included)"
              f"  {nav[0]:.1f}% ({nav[1]})")
    for pct, hexv, n in r["features"][:5]:
        print(f"        {hexv}  largest blob {pct:.1f}% of area, {n} px total")
    print(f"    keyline colour       {r['keyline']} (excluded from features)")


if __name__ == "__main__":
    path = sys.argv[1]
    cw = int(sys.argv[2])
    idx = int(sys.argv[3])
    label = sys.argv[4] if len(sys.argv) > 4 else f"{path} cell {idx}"
    show(analyse(cell(path, cw, idx), label))
