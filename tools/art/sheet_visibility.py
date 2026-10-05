#!/usr/bin/env python3
"""Point-sampling visibility check for every authored sprite sheet.

Why this exists: src/entities/enemySprite.js carries a long note about the
R3 "enemy disappears" bug — with NearestFilter and no mipmaps, point-sampling
a 64x32 texture down to a handful of screen pixels can land entirely on
transparent texels, and 27 of 80 frames of an approach rendered nothing at
all. The procedural textures dodge it by guaranteeing a fully-opaque
full-width band; the hand-drawn sheets have no such band (thin blade wings
with sky between them), so the guarantee has to be re-established by
measurement every time the art changes shape. The original check lived in a
scratch directory and did not survive the round. This one is committed.

Model: for a quad W x H screen pixels, sample texel
(floor(((i+0.5)/W)*tex_w), floor(((j+0.5)/H)*tex_h)) for every screen pixel,
which is what a NearestFilter magnification/minification does. A cell FAILS
at that size if no sampled texel is opaque.

Usage:
  python3 tools/art/sheet_visibility.py                 # all sheets, 6..24 px
  python3 tools/art/sheet_visibility.py <png> <cell_w> [min_px] [max_px]
"""
import glob
import os
import sys

from PIL import Image

MIN_PX = 6
MAX_PX = 24


def check(path, cell_w, lo=MIN_PX, hi=MAX_PX, aspect=2.0):
    im = Image.open(path).convert("RGBA")
    tw, th = im.size
    px = im.load()
    cells = tw // cell_w
    worst = []
    for c in range(cells):
        for w in range(lo, hi + 1):
            h = max(1, int(round(w / aspect)))
            hit = False
            for j in range(h):
                ty = int(((j + 0.5) / h) * th)
                ty = min(ty, th - 1)
                for i in range(w):
                    tx = c * cell_w + int(((i + 0.5) / w) * cell_w)
                    tx = min(tx, tw - 1)
                    if px[tx, ty][3] != 0:
                        hit = True
                        break
                if hit:
                    break
            if not hit:
                worst.append((c, w))
    return cells, worst


# Per-sheet quad-size range, in SCREEN PIXELS, because the two subjects do not
# occupy remotely the same range and one band for both is meaningless.
#
#   enemies  6-24 px. An enemy spans 2.5 native px at spawn and 87 at
#            fly-past (enemySprite.js's own note); 6-24 brackets the small
#            end, which is where the R3 disappearing bug lived. Below 6 the
#            far LOD takes over and this sheet is not sampled at all.
#   player   24-160 px. The player jet does NOT get small. Measured on this
#            build: 345 px span on a 960-wide capture = 115 native px, level
#            flight. Nothing scales it DOWN: launchSequence.js uses
#            ON_DECK_OVERSIZE 1.6 easing to 1.0, deathSequence.js uses
#            RESPAWN_OVERSIZE 1.9 easing to 1.0, and the one sub-1.0 factor
#            in the tree — Player.update's barrel-roll `scale.x * 0.15` —
#            still floors at ~17 native px, and is itself superseded by the
#            baked squish in player-f14-roll.png. 24 is a deliberately
#            generous floor, well under anything observed.
#
# Stated rather than silently tuned: the roll sheet's two edge-on cells DO
# fail at a 7 px quad, and would fail the enemies' band. They are not drawn
# at 7 px and raising SPAN_FLOOR does not fix it — the cause is that a 100x72
# cell holding a 31-row aircraft puts two of the three sampled texel rows in
# the transparent padding at that size. If the player sprite ever needs to
# render that small, this sheet needs a tighter cell, not a wider aeroplane.
SHEETS = [
    ("src/assets/sprites/enemy-*-head.png", 64, 6, 24),
    ("src/assets/sprites/enemy-*-rear.png", 64, 6, 24),
    ("src/assets/sprites/player-f14.png", 100, 24, 160),
    ("src/assets/sprites/player-f14-night.png", 100, 24, 160),
    ("src/assets/sprites/player-f14-roll.png", 100, 24, 160),
]

if __name__ == "__main__":
    if len(sys.argv) > 2:
        path = sys.argv[1]
        cw = int(sys.argv[2])
        lo = int(sys.argv[3]) if len(sys.argv) > 3 else MIN_PX
        hi = int(sys.argv[4]) if len(sys.argv) > 4 else MAX_PX
        cells, bad = check(path, cw, lo, hi)
        print(f"{path}: {cells} cells, {len(bad)} invisible (cell,size) combos at {lo}-{hi} px")
        for c, w in bad[:20]:
            print(f"   cell {c} invisible at {w} px wide")
        sys.exit(1 if bad else 0)

    fails = 0
    for pattern, cw, lo, hi in SHEETS:
        for path in sorted(glob.glob(pattern)):
            if not os.path.exists(path):
                continue
            cells, bad = check(path, cw, lo, hi)
            status = "OK " if not bad else "FAIL"
            print(f"  {status} {os.path.basename(path)}  {cells} cells, "
                  f"{len(bad)} invisible combos over {lo}-{hi} px")
            for c, w in bad[:5]:
                print(f"         cell {c} invisible at {w} px wide")
            fails += len(bad)
    print(f"\n  total invisible (sheet, cell, size) combos: {fails}")
    sys.exit(1 if fails else 0)
