#!/usr/bin/env python3
"""Isolate the player jet from a capture using its jet-off companion, and
report the I8 span/centroid operator.

Operator I8 (stated here so it is reproducible, per judging/R5 interfaces I8):
  mask      |dRGB|max > 24 between the jet-on frame and a jet-off frame
            captured at the SAME tick with the same seed and params plus
            `&hidejet=1`; then keep ONLY the largest 8-connected component.
  SPAN      bbox horizontal extent, as a percentage of frame width.
  centroid  reported BOTH ways, because the project has two definitions in
            circulation and they differ by ~2.5 points:
              - pixel centroid: mean y of the masked pixels. This is what the
                R4 judge used and what the 52-60%H band was drawn against.
              - bbox centre: (ymin+ymax)/2. Runs lower.

Also writes the jet isolated on black, which is the condition the arcade's own
t175 reference is in, so tools/art/jetsil.py can be run on both under the same
mask.

Usage:
  python3 tools/art/isolate_jet.py <on.png> <off.png> <out.png> [label]
"""
import sys
from collections import deque

import numpy as np
from PIL import Image


def largest_component(mask):
    h, w = mask.shape
    seen = np.zeros_like(mask)
    best = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        q = deque([(y0, x0)])
        seen[y0, x0] = True
        cells = []
        while q:
            y, x = q.popleft()
            cells.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
        if len(cells) > len(best):
            best = cells
    return best


def main():
    on_path, off_path, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    label = sys.argv[4] if len(sys.argv) > 4 else on_path
    on = np.asarray(Image.open(on_path).convert("RGB")).astype(int)
    off = np.asarray(Image.open(off_path).convert("RGB")).astype(int)
    if on.shape != off.shape:
        raise SystemExit("frames differ in size; they are not a matched pair")
    h, w, _ = on.shape
    mask = np.abs(on - off).max(axis=2) > 24
    comp = largest_component(mask)
    if not comp:
        raise SystemExit("difference mask is empty — are these the same frame?")
    ys = np.array([c[0] for c in comp])
    xs = np.array([c[1] for c in comp])
    span = xs.max() - xs.min() + 1

    print(f"  {label}")
    print(f"    frame {w}x{h}   changed pixels {len(comp)}")
    print(f"    bbox x[{xs.min()},{xs.max()}] y[{ys.min()},{ys.max()}]")
    print(f"    SPAN                 {span} px = {100*span/w:.2f}%W   (band 34-38)")
    print(f"    centroid, PIXEL      {100*ys.mean()/h:.2f}%H   (band 52-60; the operator the band was drawn against)")
    print(f"    centroid, BBOX CENTRE {100*(ys.min()+ys.max())/2/h:.2f}%H")

    keep = np.zeros_like(mask)
    for y, x in comp:
        keep[y, x] = True
    iso = np.where(keep[..., None], on, 0).astype(np.uint8)
    pad = 6
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad)
    Image.fromarray(iso[y0:y1, x0:x1]).save(out_path)
    print(f"    isolated on black -> {out_path}")


if __name__ == "__main__":
    main()
