#!/usr/bin/env python3
"""Measures cloud presence/count/size distributions over a captured frame
sequence, against REFERENCE.md's "Stage-1 clouds" (ADOPTED #132): presence
68-69% of frames, count/frame median 1 p90 5 max 6, width median 9.26%W
(p90 21.49), height median 6.04%H, aspect median 0.97.

No scipy available on this machine — connected-component labeling is a
plain BFS flood-fill over a boolean mask (fast enough at 320x224 native res
with a sparse cloud mask)."""
import argparse
import glob
import os
import numpy as np
from PIL import Image
from collections import deque

SKY = np.array([0, 159, 255], dtype=np.float64)
# HUD boxes, native 320x224 (src/ui/hud.js bboxes scaled 320/686, 224/480).
HUD_BOXES = [(17, 16, 70, 23), (104, 16, 142, 22), (161, 16, 190, 23), (202, 17, 212, 22),
             (237, 24, 291, 47), (17, 201, 42, 206), (47, 201, 103, 207),
             (136, 200, 164, 207), (175, 199, 193, 210), (196, 199, 250, 220)]


def load_native(path, native_scale=3):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.float64)
    img = img[::native_scale, ::native_scale]
    for x0, y0, x1, y1 in HUD_BOXES:
        img[y0:y1, x0:x1] = SKY
    return img


def cloud_mask(img, horizon_row, top_margin=58):
    # Cloud pixels: bright and low-saturation (white/grey), distinct from
    # the flat-saturated sky, restricted to the sky region above horizon.
    #
    # top_margin excludes the top HUD strip (SCORE/HIT/reticle) ENTIRELY
    # rather than tracking its exact bounding boxes: those move as the HUD
    # dev iterates (found by measurement — stale HUD_BOXES from an earlier
    # hud.js reading let 8 of 10 "cloud" detections in one frame leak
    # through as HUD fragments, all clustered at y=16-50). clouds.js's own
    # spawn targets screenFrac 0.30-0.60 (native y 67-134 at 224px height),
    # so no legitimate cloud should ever appear above y~58 anyway — this
    # margin is a real constraint of the subject, not just a measurement
    # workaround.
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0)
    bright = mx > 150
    low_sat = sat < 0.35
    mask = bright & low_sat
    mask[horizon_row:, :] = False
    mask[:top_margin, :] = False
    return mask


def connected_components(mask):
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if not mask[y0, x0] or visited[y0, x0]:
                continue
            q = deque([(y0, x0)])
            visited[y0, x0] = True
            xs, ys = [], []
            while q:
                y, x = q.popleft()
                xs.append(x)
                ys.append(y)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
            comps.append((min(xs), min(ys), max(xs) + 1, max(ys) + 1, len(xs)))
    return comps


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frames_glob')
    ap.add_argument('--horizon-row', type=int, default=140)
    ap.add_argument('--min-area', type=int, default=3)
    args = ap.parse_args()

    files = sorted(glob.glob(args.frames_glob))
    if not files:
        print('no frames matched', args.frames_glob)
        return

    present_count = 0
    counts = []
    widths = []
    heights = []
    aspects = []

    for f in files:
        img = load_native(f)
        h, w, _ = img.shape
        mask = cloud_mask(img, args.horizon_row)
        comps = [c for c in connected_components(mask) if c[4] >= args.min_area]
        counts.append(len(comps))
        if len(comps) > 0:
            present_count += 1
        for x0, y0, x1, y1, area in comps:
            cw = (x1 - x0) / w * 100
            ch = (y1 - y0) / h * 100
            widths.append(cw)
            heights.append(ch)
            if ch > 0:
                aspects.append(cw / ch)

    n = len(files)
    presence_frac = present_count / n
    print(f'frames: {n}')
    print(f'presence: {presence_frac*100:.1f}% (target 60-75%, REFERENCE.md 68-69%)')
    if counts:
        counts_present = [c for c in counts if c > 0] or [0]
        print(f'count/frame (all frames incl. empty): median={np.median(counts):.1f} p90={np.percentile(counts,90):.1f} max={max(counts)}')
        print(f'count/frame (present frames only): median={np.median(counts_present):.1f} p90={np.percentile(counts_present,90):.1f} max={max(counts_present)}')
    if widths:
        print(f'width %W: median={np.median(widths):.2f} p90={np.percentile(widths,90):.2f} (target median 9.26, p90 21.49)')
        print(f'height %H: median={np.median(heights):.2f} (target median 6.04)')
        print(f'aspect (w/h): median={np.median(aspects):.2f} (target median 0.97)')
        print(f'n clouds total: {len(widths)}')
    else:
        print('no clouds detected in any frame')


if __name__ == '__main__':
    main()
