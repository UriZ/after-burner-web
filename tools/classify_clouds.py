#!/usr/bin/env python3
"""Independent reimplementation of REFERENCE.md's #132 cloud operator, written
to ENUMERATE and CROP every component it returns so a human can classify each
one by eye. It is deliberately NOT an import of tools/measure_clouds.py: the
point is a second implementation from the prose, so a disagreement between the
two is informative.

Why this exists (R5, criteria-fix lane): measure_clouds.py is correct and
validated on a synthetic control, and it still produces non-cloud numbers,
because the operator's mask (bright + achromatic) matches carrier
superstructure, HUD reticle lines, enemy airframes, missile plumes, explosion
debris, coastline and sea foam as readily as it matches cloud. A validated
instrument over the wrong population returns exactly reproducible wrong
numbers, and cross-validating two implementations cannot detect it. Only
looking at the crops can.

THE OPERATOR (transcribed from REFERENCE.md "Stage-1 clouds - and the operator
the numbers were taken with"), applied at the frame's STORED resolution:

  segmentation  sat < 0.25 AND V > 0.80,  V = max(RGB)/255, sat = (max-min)/max
  window        rows 2%H .. 45%H only
  HUD exclude   arcade rects (18,20,400,58)/686x480 and (495,30,660,105)
  components    8-connected, area >= 150 px at 686x480 (scaled by frame AREA)
  haze discard  drop any component wider than 90%W
  truncation    a component touching either window cut has height = lower bound
  aspect        NORMALISED: (w/W)/(h/H), not pixel aspect

SELF-TEST (run before trusting any number this file prints):
    python3 tools/classify_clouds.py --synthetic

Usage:
    python3 tools/classify_clouds.py --frames 'tools/out/<dir>/*.png' \
        --dump-dir tools/out/<dir>/comps --sheet tools/out/<dir>/sheet.png
    python3 tools/classify_clouds.py --frames '...' --stats            # pooled
    python3 tools/classify_clouds.py --frames '...' --only 7,25,27     # subset

No scipy here; labelling is an explicit iterative flood fill on a boolean grid.
"""
import argparse
import glob
import os
import numpy as np
from PIL import Image

AREA_FRAC = 150.0 / (686.0 * 480.0)      # 4.5556e-4
WIN_TOP_FRAC = 0.02
WIN_BOT_FRAC = 0.45
SAT_MAX = 0.25
V_MIN = 0.80
HAZE_W_FRAC = 0.90
ARCADE_HUD_RECTS = [                      # (x0,y0,x1,y1) as fractions of (W,H)
    (18 / 686.0, 20 / 480.0, 400 / 686.0, 58 / 480.0),
    (495 / 686.0, 30 / 480.0, 660 / 686.0, 105 / 480.0),
]


def seg_mask(rgb):
    """sat < 0.25 AND V > 0.80 on uint8 HxWx3."""
    a = rgb.astype(np.float32)
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    v = mx / 255.0
    with np.errstate(divide='ignore', invalid='ignore'):
        sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    return (sat < SAT_MAX) & (v > V_MIN)


def label8(mask):
    """8-connected labelling by flood fill. Returns (labels, n)."""
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


def components(path, hud_rects=ARCADE_HUD_RECTS):
    """Return the operator's component list for one frame."""
    rgb = np.asarray(Image.open(path).convert('RGB'))
    H, W = rgb.shape[:2]
    m = seg_mask(rgb)
    for (fx0, fy0, fx1, fy1) in hud_rects or []:
        m[int(round(fy0 * H)):int(round(fy1 * H)),
          int(round(fx0 * W)):int(round(fx1 * W))] = False
    top = int(round(WIN_TOP_FRAC * H))
    bot = int(round(WIN_BOT_FRAC * H))
    win = np.zeros_like(m)
    win[top:bot, :] = m[top:bot, :]
    lab, n = label8(win)
    min_area = int(round(AREA_FRAC * W * H))
    out = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        area = ys.size
        if area < min_area:
            continue
        x0, x1 = int(xs.min()), int(xs.max())
        y0, y1 = int(ys.min()), int(ys.max())
        pw, ph = x1 - x0 + 1, y1 - y0 + 1
        cw = 100.0 * pw / W
        if cw > 100.0 * HAZE_W_FRAC:
            continue                      # horizon haze seam
        ch = 100.0 * ph / H
        out.append(dict(
            path=path, W=W, H=H, bbox=(x0, y0, x1, y1), area=area,
            w_pct=cw, h_pct=ch, aspect=cw / ch if ch else float('nan'),
            truncated=(y0 <= top or y1 >= bot - 1),
            cy_pct=100.0 * (0.5 * (y0 + y1)) / H,
        ))
    out.sort(key=lambda c: (-c['area']))
    return out, (W, H, min_area, top, bot)


def crop_image(c, margin=6, scale=None):
    """Crop the component's bbox with a margin, upscaled NEAREST for viewing."""
    im = Image.open(c['path']).convert('RGB')
    x0, y0, x1, y1 = c['bbox']
    box = (max(0, x0 - margin), max(0, y0 - margin),
           min(c['W'], x1 + 1 + margin), min(c['H'], y1 + 1 + margin))
    sub = im.crop(box)
    if scale is None:
        scale = max(1, min(6, int(260 / max(1, sub.width))))
    if scale > 1:
        sub = sub.resize((sub.width * scale, sub.height * scale), Image.NEAREST)
    return sub


def contact_sheet(items, cols=5, cell=(300, 230), pad=4):
    """Grid of crops, each letterboxed into a fixed cell on magenta."""
    rows = (len(items) + cols - 1) // cols
    cw, chh = cell
    sheet = Image.new('RGB', (cols * (cw + pad) + pad, rows * (chh + pad) + pad),
                      (255, 0, 255))
    for k, im in enumerate(items):
        r, cc = divmod(k, cols)
        f = min(cw / im.width, chh / im.height, 8.0)
        if f != 1.0:
            im = im.resize((max(1, int(im.width * f)), max(1, int(im.height * f))),
                           Image.NEAREST)
        sheet.paste(im, (pad + cc * (cw + pad) + (cw - im.width) // 2,
                         pad + r * (chh + pad) + (chh - im.height) // 2))
    return sheet


# ---------------------------------------------------------------- self-test ---
def synthetic():
    """Known-geometry controls. Every assertion below is a property of the
    OPERATOR, not of this implementation, so a failure means the file is wrong."""
    ok = True

    def frame(W, H, bg=(0, 159, 255)):
        return np.tile(np.array(bg, np.uint8), (H, W, 1)).copy()

    def put_rect(a, x0, y0, w, h, col=(247, 247, 230)):
        a[y0:y0 + h, x0:x0 + w] = col

    def run(a, tag):
        p = f'/tmp/_cc_{tag}.png'
        Image.fromarray(a).save(p)
        cs, meta = components(p, hud_rects=None)
        return cs, meta

    for (W, H) in [(686, 480), (320, 224)]:
        a = frame(W, H)
        widths = [0.06, 0.10, 0.21]
        for i, fw in enumerate(widths):
            put_rect(a, int(0.02 * W) + sum(int(f * W) + 8 for f in widths[:i]),
                     int(0.10 * H), int(fw * W), int(0.12 * H))
        cs, meta = run(a, f'A{W}')
        got = sorted(c['w_pct'] for c in cs)
        exp = sorted(100.0 * int(f * W) / W for f in widths)
        print(f'[A] {W}x{H} min_area={meta[2]} n={len(cs)} (expect 3)')
        for g, e in zip(got, exp):
            e_ok = abs(g - e) < 1e-9
            ok &= e_ok
            print(f'    width %W got {g:7.3f} truth {e:7.3f} '
                  f'err {abs(g-e):.3f}   {"OK" if e_ok else "FAIL"}')

    # [B] a square of side s has normalised aspect = H/W exactly
    W, H = 686, 480
    a = frame(W, H)
    put_rect(a, 200, 60, 80, 80)
    cs, _ = run(a, 'B')
    asp = cs[0]['aspect']
    b_ok = len(cs) == 1 and abs(asp - H / W) < 1e-6
    ok &= b_ok
    print(f'[B] square normalised aspect got {asp:.4f} expect {H/W:.4f} (frame H/W)  '
          f'{"OK" if b_ok else "FAIL"}')

    # [C] min-area gate: 11x11=121 px rejected, 13x13=169 px kept (min 150)
    for side, expect in ((11, 0), (13, 1)):
        a = frame(W, H)
        put_rect(a, 300, 80, side, side)
        cs, _ = run(a, f'C{side}')
        c_ok = len(cs) == expect
        ok &= c_ok
        print(f'[C] {side}x{side}={side*side} px -> n={len(cs)} expect {expect}  '
              f'{"OK" if c_ok else "FAIL"}')

    # [D] haze discard: a 95%W band is dropped, a 85%W band is kept
    for fw, expect in ((0.95, 0), (0.85, 1)):
        a = frame(W, H)
        put_rect(a, int(0.02 * W), 100, int(fw * W), 20)
        cs, _ = run(a, f'D{int(fw*100)}')
        d_ok = len(cs) == expect
        ok &= d_ok
        print(f'[D] band {fw:.2f}W -> n={len(cs)} expect {expect}  '
              f'{"OK" if d_ok else "FAIL"}')

    # [E] window: a blob centred at 0.70H is invisible, at 0.25H is seen
    for fy, expect in ((0.70, 0), (0.25, 1)):
        a = frame(W, H)
        put_rect(a, 300, int(fy * H) - 20, 60, 40)
        cs, _ = run(a, f'E{int(fy*100)}')
        e_ok = len(cs) == expect
        ok &= e_ok
        print(f'[E] blob at {fy:.2f}H -> n={len(cs)} expect {expect}  '
              f'{"OK" if e_ok else "FAIL"}')

    # [F] truncation flag at the 45%H cut
    a = frame(W, H)
    put_rect(a, 300, int(0.40 * H), 60, int(0.15 * H))
    cs, _ = run(a, 'F')
    f_ok = len(cs) == 1 and cs[0]['truncated']
    ok &= f_ok
    print(f'[F] blob straddling 45%H -> truncated={cs[0]["truncated"] if cs else None} '
          f'expect True  {"OK" if f_ok else "FAIL"}')

    # [G] 8-connectivity: two diagonally-adjacent squares are ONE component
    a = frame(W, H)
    put_rect(a, 200, 60, 14, 14)
    put_rect(a, 214, 74, 14, 14)          # shares exactly the corner (213,73)-(214,74)
    cs, _ = run(a, 'G')
    g_ok = len(cs) == 1
    ok &= g_ok
    print(f'[G] corner-adjacent squares -> n={len(cs)} expect 1 (8-conn)  '
          f'{"OK" if g_ok else "FAIL"}')

    # [H] threshold edges: cream passes, pale haze (sat .28) and mid grey (V .65) fail
    for col, expect, name in (((247, 247, 230), 1, 'cream sat .07 V .97'),
                              ((255, 199, 184), 0, 'haze sat .28 V 1.0'),
                              ((166, 166, 166), 0, 'mid grey V .65')):
        a = frame(W, H)
        put_rect(a, 300, 80, 40, 40, col)
        cs, _ = run(a, 'H' + name[:4])
        h_ok = len(cs) == expect
        ok &= h_ok
        print(f'[H] {name} -> n={len(cs)} expect {expect}  {"OK" if h_ok else "FAIL"}')

    print('SYNTHETIC CONTROL:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def pct(v, q):
    return float(np.percentile(np.asarray(v, float), q)) if len(v) else float('nan')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--synthetic', action='store_true')
    ap.add_argument('--frames')
    ap.add_argument('--dump-dir')
    ap.add_argument('--sheet')
    ap.add_argument('--only', help='comma list of component indices to dump')
    ap.add_argument('--stats', action='store_true')
    ap.add_argument('--keep', help='comma list of indices treated as CLOUD for --stats')
    a = ap.parse_args()
    if a.synthetic:
        raise SystemExit(synthetic())
    paths = sorted(glob.glob(a.frames))
    if not paths:
        raise SystemExit(f'no frames match {a.frames!r}')
    allc = []
    nframes_with = 0
    counts = []
    for p in paths:
        cs, meta = components(p)
        counts.append(len(cs))
        nframes_with += 1 if cs else 0
        allc.extend(cs)
    for i, c in enumerate(allc):
        c['idx'] = i
    print(f'# frames {len(paths)}  components {len(allc)}  '
          f'presence {100.0*nframes_with/len(paths):.1f}%  '
          f'count med/p90/max {np.median(counts):.0f}/{pct(counts,90):.1f}/{max(counts)}')
    print('# idx frame                 bbox                    area    %W     %H    aspect trunc')
    for c in allc:
        x0, y0, x1, y1 = c['bbox']
        print(f'{c["idx"]:4d} {os.path.basename(c["path"]):20s} '
              f'x[{x0:3d},{x1:3d}] y[{y0:3d},{y1:3d}] {c["area"]:7d} '
              f'{c["w_pct"]:6.2f} {c["h_pct"]:6.2f} {c["aspect"]:6.2f} '
              f'{"T" if c["truncated"] else "."}')
    sel = allc
    if a.only:
        want = {int(s) for s in a.only.split(',')}
        sel = [c for c in allc if c['idx'] in want]
    if a.dump_dir:
        os.makedirs(a.dump_dir, exist_ok=True)
        for c in sel:
            crop_image(c).save(os.path.join(
                a.dump_dir, f'c{c["idx"]:03d}_{os.path.basename(c["path"])}'))
        print(f'# dumped {len(sel)} crops to {a.dump_dir}')
    if a.sheet:
        contact_sheet([crop_image(c) for c in sel]).save(a.sheet)
        print(f'# sheet {a.sheet} ({len(sel)} cells, row-major, 5 per row)')
    if a.stats:
        keep = {int(s) for s in a.keep.split(',')} if a.keep else None
        pool = [c for c in allc if keep is None or c['idx'] in keep]
        w = [c['w_pct'] for c in pool]
        hu = [c['h_pct'] for c in pool if not c['truncated']]
        au = [c['aspect'] for c in pool if not c['truncated']]
        hall = [c['h_pct'] for c in pool]
        byframe = {}
        for c in pool:
            byframe[c['path']] = byframe.get(c['path'], 0) + 1
        cf = [byframe.get(p, 0) for p in paths]
        lbl = 'KEPT' if keep else 'ALL'
        print(f'\n[{lbl}] n={len(pool)}  '
              f'presence {100.0*sum(1 for v in cf if v)/len(paths):.1f}%  '
              f'count med/p90/max {np.median(cf):.0f}/{pct(cf,90):.1f}/{max(cf)}')
        print(f'  width %W   med {pct(w,50):6.2f}  p25 {pct(w,25):6.2f}  '
              f'p75 {pct(w,75):6.2f}  p90 {pct(w,90):6.2f}  max {max(w):6.2f}')
        print(f'  height %H  med(untrunc n={len(hu)}) {pct(hu,50):6.2f}  '
              f'p90 {pct(hu,90):6.2f}  | med(all) {pct(hall,50):6.2f}  '
              f'max(all) {max(hall):6.2f}')
        print(f'  aspect     med(untrunc) {pct(au,50):6.2f}  '
              f'p25 {pct(au,25):6.2f}  p75 {pct(au,75):6.2f}')


if __name__ == '__main__':
    main()
