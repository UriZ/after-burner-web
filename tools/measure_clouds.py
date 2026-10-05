#!/usr/bin/env python3
"""Cloud bank segmentation, implementing the #132 operator EXACTLY as
published in REFERENCE.md ("Stage-1 clouds - and the operator the numbers
were taken with"). R5/I7: the previous version of this file diverged from
that operator on eight axes and its numbers were therefore not comparable
with the arcade's. Each divergence is named below next to the thing that
replaced it.

THE OPERATOR, in full (so this file needs nothing outside it):

  1. SEGMENTATION. sat < 0.25 AND V > 0.80, where V = max(R,G,B)/255 and
     sat = (max-min)/max. At the frame's STORED resolution, never upscaled.
     (was: sat < 0.35 and V > 0.588 -- both looser, both inflating count)

  2. ANALYSIS WINDOW. Rows 2%H to 45%H only. Load-bearing, not tidying:
     the same threshold matches white aircraft and sea foam, and on the
     cloudless arcade t=94 every qualifying component below the window is a
     fuselage or a wave crest.
     (was: rows 0 to --horizon-row, default 140/224 = 62.5%H)

  3. HUD EXCLUSION. Arcade frames: the two rects in ARCADE_HUD_RECTS below,
     as fractions of (W,H). Our frames: derived PER RUN from a live capture
     by tools/hud_mask.py -- never a hardcoded box. A mis-sized rect once
     left the HIT digits exposed and made a build with clouds DISABLED
     "report a cloud in 100% of frames".

  4. COMPONENTS. 8-connected, area >= 150 px at 686x480. 8-connectivity is
     load-bearing on dithered art: 4-connectivity splits a cloud at every
     diagonal dither step.
     (was: 4-connected, area >= 3 px at 320x224)

  5. HAZE-SEAM DISCARD. Drop any component wider than 90%W -- that is the
     horizon haze seam, not an object. It previously reported "clouds" of
     median width 100.0%W.
     (was: absent)

  6. TRUNCATION. A component touching either window cut has a height that
     is only a lower bound. Height and aspect come from UNTRUNCATED
     components only; width is ALWAYS pooled -- a horizontal cut cannot
     change a width, and truncation preferentially selects large banks, so
     an untruncated-only width median is biased small (7.07 vs the pooled
     9.26 on the arcade side).
     (was: absent)

  7. ASPECT IS NORMALISED, NOT GEOMETRIC. aspect = (width/W) / (height/H).
     The same bank reads 0.97 normalised and 1.39 in pixels on a 1.43:1
     frame. (The old file's arithmetic was already right here; only its
     "(w/h)" label was misleading.)

  8. FRAME RESOLUTION. Arcade frames are measured as stored, 686x480. Our
     captures are a 960x672 viewport over a 320x224 internal render
     (src/render/screen.js) upscaled 3x NEAREST-NEIGHBOUR, so img[::3,::3]
     is the EXACT INVERSE of that upscale, not a resampling: --verify-native
     proves it per run by checking every 3x3 block is uniform. The min-area
     threshold is then rescaled by frame AREA (150 px at 686x480 = 0.0456%
     of frame -> 33 px at 320x224), because an arcade cloud of N native
     pixels occupies 4.59N pixels at 686x480.

MIN-AREA SCALING, stated once: AREA_FRAC = 150/(686*480) = 4.5556e-4. Every
frame size derives its own threshold as round(AREA_FRAC * W * H).

Self-tests (run both before trusting any number this file prints):
    python3 tools/measure_clouds.py --synthetic      # known-width discs
    python3 tools/measure_clouds.py --verify-native 'tools/out/<run>/frame-*.png'

No scipy on this machine -- connected-component labelling is an explicit
BFS flood fill.
"""
import argparse
import glob
import os
import sys
import numpy as np
from PIL import Image
from collections import deque

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hud_mask import get_hud_mask  # noqa: E402

# --- the operator's constants -------------------------------------------------
SAT_MAX = 0.25
V_MIN = 0.80
WINDOW_TOP_FRAC = 0.02
WINDOW_BOT_FRAC = 0.45
HAZE_WIDTH_FRAC = 0.90
AREA_FRAC = 150.0 / (686.0 * 480.0)  # 150 px at the arcade frame size
NATIVE_SCALE = 3  # capture.mjs 960x672 viewport / 320x224 internal render

# REFERENCE.md's arcade HUD rects, as fractions of (W,H): (x0,y0,x1,y1).
ARCADE_HUD_RECTS = [
    (18 / 686, 20 / 480, 400 / 686, 58 / 480),
    (495 / 686, 30 / 480, 660 / 686, 105 / 480),
]

# Published accept bands for the #132 classifier (REFERENCE.md). The arcade
# itself reads presence 68-69%, width median 9.26 / p90 21.49 / max 42.27,
# height median 6.04, aspect median 0.97.
BANDS = {
    'presence': (58.0, 80.0),
    'width_median': (8.0, 11.0),
    'width_p90': (18.0, 46.0),
    'height_median': (5.0, 7.5),
    'aspect_median': (0.85, 1.10),
}


def min_area_for(w, h):
    return max(1, int(round(AREA_FRAC * w * h)))


def load_ours(path, native_scale=NATIVE_SCALE):
    """Our capture, decimated back to its native 320x224. Lossless -- see
    header item 8 and --verify-native."""
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.int32)
    return img[::native_scale, ::native_scale]


def load_arcade(path):
    """An arcade frame at its stored resolution. NEVER upscaled."""
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.int32)


def block_uniformity(path, native_scale=NATIVE_SCALE):
    """Fraction of native_scale x native_scale blocks that are NOT uniform,
    and the max intra-block channel deviation. Both must be 0 for
    img[::n,::n] to be the exact inverse of the nearest-neighbour upscale."""
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.int32)
    h, w, _ = img.shape
    if h % native_scale or w % native_scale:
        return None, None
    b = img.reshape(h // native_scale, native_scale, w // native_scale, native_scale, 3)
    dev = np.abs(b - b[:, 0:1, :, 0:1, :])
    return float((dev.max(axis=(1, 3, 4)) > 0).mean()), int(dev.max())


def cloud_mask(img, hud_mask=None, hud_rects=None,
               sat_max=SAT_MAX, v_min=V_MIN,
               win_top=WINDOW_TOP_FRAC, win_bot=WINDOW_BOT_FRAC):
    """Operator items 1-3. Returns (mask, y_top, y_bot) where the window is
    rows [y_top, y_bot)."""
    h, w, _ = img.shape
    mx = img.max(axis=2).astype(np.float64)
    mn = img.min(axis=2).astype(np.float64)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1), 0.0)
    mask = (sat < sat_max) & (mx / 255.0 > v_min)

    y_top = int(round(win_top * h))
    y_bot = int(round(win_bot * h))
    mask[:y_top, :] = False
    mask[y_bot:, :] = False

    if hud_mask is not None:
        if hud_mask.shape != mask.shape:
            raise SystemExit(
                f'HUD mask {hud_mask.shape} does not match frame {mask.shape} -- '
                'the mask must be derived at the same resolution the frame is measured at')
        mask &= ~hud_mask
    if hud_rects:
        for fx0, fy0, fx1, fy1 in hud_rects:
            mask[int(fy0 * h):int(np.ceil(fy1 * h)), int(fx0 * w):int(np.ceil(fx1 * w))] = False
    return mask, y_top, y_bot


NEIGH8 = ((-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1))


def connected_components(mask, neighbours=NEIGH8):
    """Operator item 4. 8-connected by default."""
    h, w = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    comps = []
    ys_idx, xs_idx = np.nonzero(mask)
    for y0, x0 in zip(ys_idx, xs_idx):
        if visited[y0, x0]:
            continue
        q = deque([(y0, x0)])
        visited[y0, x0] = True
        minx = maxx = x0
        miny = maxy = y0
        area = 0
        while q:
            y, x = q.popleft()
            area += 1
            if x < minx: minx = x
            if x > maxx: maxx = x
            if y < miny: miny = y
            if y > maxy: maxy = y
            for dy, dx in neighbours:
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                    visited[ny, nx] = True
                    q.append((ny, nx))
        comps.append((int(minx), int(miny), int(maxx) + 1, int(maxy) + 1, int(area)))
    return comps


def measure_frame(img, hud_mask=None, hud_rects=None, min_area=None,
                  neighbours=NEIGH8, haze_discard=True, truncation=True,
                  sat_max=SAT_MAX, v_min=V_MIN,
                  win_top=WINDOW_TOP_FRAC, win_bot=WINDOW_BOT_FRAC):
    """Returns (n_banks, [width %W], [height %H], [aspect]). Heights and
    aspects are UNTRUNCATED only; widths are pooled (operator item 6)."""
    h, w, _ = img.shape
    if min_area is None:
        min_area = min_area_for(w, h)
    mask, y_top, y_bot = cloud_mask(img, hud_mask, hud_rects,
                                    sat_max, v_min, win_top, win_bot)
    comps = connected_components(mask, neighbours)

    widths, heights, aspects = [], [], []
    n = 0
    for x0, y0, x1, y1, area in comps:
        if area < min_area:
            continue
        cw = (x1 - x0) / w * 100.0
        if haze_discard and cw > HAZE_WIDTH_FRAC * 100.0:
            continue  # horizon haze seam, not an object
        n += 1
        widths.append(cw)
        truncated = truncation and (y0 <= y_top or y1 >= y_bot)
        if not truncated:
            ch = (y1 - y0) / h * 100.0
            heights.append(ch)
            if ch > 0:
                aspects.append(cw / ch)  # NORMALISED: already %W over %H
    return n, widths, heights, aspects


def report(files, loader, hud_mask=None, hud_rects=None, label='', **kw):
    counts, widths, heights, aspects = [], [], [], []
    present = 0
    for f in files:
        img = loader(f)
        n, ws, hs, asp = measure_frame(img, hud_mask, hud_rects, **kw)
        counts.append(n)
        if n:
            present += 1
        widths += ws
        heights += hs
        aspects += asp

    nf = len(files)
    h0, w0, _ = loader(files[0]).shape
    out = {}
    out['frames'] = nf
    out['resolution'] = f'{w0}x{h0}'
    out['min_area'] = kw.get('min_area') or min_area_for(w0, h0)
    out['presence'] = present / nf * 100.0
    out['count_median'] = float(np.median(counts))
    out['count_p90'] = float(np.percentile(counts, 90))
    out['count_max'] = int(max(counts))
    cp = [c for c in counts if c > 0] or [0]
    out['count_present_median'] = float(np.median(cp))
    out['count_present_p90'] = float(np.percentile(cp, 90))
    out['n_banks'] = len(widths)
    if widths:
        out['width_median'] = float(np.median(widths))
        out['width_p90'] = float(np.percentile(widths, 90))
        out['width_max'] = float(max(widths))
    if heights:
        out['height_median'] = float(np.median(heights))
        out['n_untruncated'] = len(heights)
    if aspects:
        out['aspect_median'] = float(np.median(aspects))

    def band(key, val):
        if key not in BANDS or val is None:
            return ''
        lo, hi = BANDS[key]
        return f'  [{lo}-{hi}: {"PASS" if lo <= val <= hi else "FAIL"}]'

    print(f'--- {label or "clouds"} ---')
    print(f'frames: {nf}   measured at {out["resolution"]}   min component {out["min_area"]} px')
    print(f'presence:            {out["presence"]:.1f}%'
          f'{band("presence", out["presence"])}   (arcade 68-69)')
    print(f'count/frame:         median={out["count_median"]:.1f} '
          f'p90={out["count_p90"]:.1f} max={out["count_max"]}   (arcade 1 / 5 / 6)')
    print(f'count present-only:  median={out["count_present_median"]:.1f} '
          f'p90={out["count_present_p90"]:.1f}')
    if widths:
        print(f'width  %W:           median={out["width_median"]:.2f}'
              f'{band("width_median", out["width_median"])}'
              f'   p90={out["width_p90"]:.2f}{band("width_p90", out["width_p90"])}'
              f'   max={out["width_max"]:.2f}   (arcade 9.26 / 21.49 / 42.27)')
    if heights:
        print(f'height %H (untrunc): median={out["height_median"]:.2f}'
              f'{band("height_median", out["height_median"])}'
              f'   n={out["n_untruncated"]}/{out["n_banks"]}   (arcade 6.04)')
    if aspects:
        print(f'aspect (norm %W/%H): median={out["aspect_median"]:.2f}'
              f'{band("aspect_median", out["aspect_median"])}   (arcade 0.97)')
    print(f'n banks pooled:      {out["n_banks"]}')
    return out


# --- synthetic instrument control --------------------------------------------
def synthetic_frames(w, h, specs, sky=(0, 159, 255), cloud=(250, 250, 252)):
    """specs: list of (cx_frac, cy_frac, diameter_frac_of_W) discs. Drawn as
    hard-edged filled discs on a flat saturated sky, so the operator's
    threshold cannot be the thing under test -- only its geometry can."""
    img = np.zeros((h, w, 3), dtype=np.int32)
    img[:, :] = sky
    yy, xx = np.mgrid[0:h, 0:w]
    truth = []
    for cxf, cyf, df in specs:
        cx, cy = cxf * w, cyf * h
        r = df * w / 2.0
        disc = (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r
        img[disc] = cloud
        xs = np.nonzero(disc.any(axis=0))[0]
        ys = np.nonzero(disc.any(axis=1))[0]
        truth.append({
            'width_pct': (xs.max() - xs.min() + 1) / w * 100.0,
            'height_pct': (ys.max() - ys.min() + 1) / h * 100.0,
            'area': int(disc.sum()),
        })
    return img, truth


def run_synthetic():
    """Validate the instrument on known input before trusting it on art."""
    ok = True

    # A. geometry: three discs of known width, well inside the window, well
    #    apart, every one above min-area.
    for (w, h) in ((686, 480), (320, 224)):
        specs = [(0.20, 0.22, 0.10), (0.50, 0.25, 0.21), (0.80, 0.20, 0.06)]
        img, truth = synthetic_frames(w, h, specs)
        n, ws, hs, asp = measure_frame(img)
        ws_s = sorted(ws)
        tw_s = sorted(t['width_pct'] for t in truth)
        print(f'[A] {w}x{h} min_area={min_area_for(w,h)}  n={n} (expect 3)')
        for got, want in zip(ws_s, tw_s):
            err = abs(got - want)
            print(f'    width %W got {got:6.3f}  truth {want:6.3f}  err {err:.3f}'
                  f'   {"OK" if err < 0.4 else "BAD"}')
            ok &= err < 0.4
        ok &= (n == 3)
        # normalised aspect of a CIRCLE on a 1.43:1 frame must read ~1/1.43
        # in %W/%H terms... no: a circle is w==h in PIXELS, so %W/%H = h/w of
        # the frame = 0.70. Anything near 1.0 here means the aspect is being
        # computed geometrically, which is exactly the 1.43x trap.
        exp_asp = h / w
        got_asp = float(np.median(asp))
        err = abs(got_asp - exp_asp)
        print(f'    circle normalised aspect got {got_asp:.3f}  expect {exp_asp:.3f}'
              f' (frame h/w)  {"OK" if err < 0.03 else "BAD -- aspect is geometric, not normalised"}')
        ok &= err < 0.03

    # B. min-area rejection: a disc just under / just over threshold.
    w, h = 686, 480
    ma = min_area_for(w, h)
    for df, want in ((0.012, 0), (0.030, 1)):
        img, truth = synthetic_frames(w, h, [(0.5, 0.25, df)])
        n, ws, _, _ = measure_frame(img)
        print(f'[B] disc area {truth[0]["area"]} px vs min {ma}: n={n} (expect {want})'
              f'  {"OK" if n == want else "BAD"}')
        ok &= (n == want)

    # C. haze-seam discard: a full-width band must be dropped.
    img, _ = synthetic_frames(w, h, [])
    img[int(0.30 * h):int(0.33 * h), :] = (250, 250, 252)
    n, ws, _, _ = measure_frame(img)
    print(f'[C] full-width haze band: n={n} (expect 0)  {"OK" if n == 0 else "BAD"}')
    ok &= (n == 0)
    n2, _, _, _ = measure_frame(img, haze_discard=False)
    print(f'    same band with discard off: n={n2} (expect 1, proves the band IS detected)'
          f'  {"OK" if n2 == 1 else "BAD"}')
    ok &= (n2 == 1)

    # D. window: a big disc below 45%H must be invisible; one inside visible.
    for cyf, want in ((0.70, 0), (0.25, 1)):
        img, _ = synthetic_frames(w, h, [(0.5, cyf, 0.12)])
        n, _, _, _ = measure_frame(img)
        print(f'[D] disc centred at {cyf:.2f}H: n={n} (expect {want})'
              f'  {"OK" if n == want else "BAD"}')
        ok &= (n == want)

    # E. truncation: a disc straddling the 45%H cut contributes a width but
    #    NO height/aspect.
    img, truth = synthetic_frames(w, h, [(0.5, 0.44, 0.12)])
    n, ws, hs, asp = measure_frame(img)
    print(f'[E] disc straddling the 45%H cut: n={n} widths={len(ws)} heights={len(hs)}'
          f' (expect 1 / 1 / 0)  {"OK" if (n, len(ws), len(hs)) == (1, 1, 0) else "BAD"}')
    ok &= (n, len(ws), len(hs)) == (1, 1, 0)

    # F. connectivity: two blocks sharing only a single CORNER pixel are
    #    one 8-connected component and two 4-connected ones. This is the
    #    axis that was fragmenting dithered cloud edges.
    img, _ = synthetic_frames(w, h, [])
    y0, x0, s_ = int(0.15 * h), int(0.40 * w), 14  # 14x14 = 196 px > min 150
    img[y0:y0 + s_, x0:x0 + s_] = (250, 250, 252)
    img[y0 + s_:y0 + 2 * s_, x0 + s_:x0 + 2 * s_] = (250, 250, 252)
    n8, _, _, _ = measure_frame(img)
    n4, _, _, _ = measure_frame(img, neighbours=((1, 0), (-1, 0), (0, 1), (0, -1)))
    print(f'[F] corner-touching blocks: 8-conn n={n8} (expect 1), '
          f'4-conn n={n4} (expect 2)  {"OK" if (n8, n4) == (1, 2) else "BAD"}')
    ok &= (n8, n4) == (1, 2)

    # G. sat/V thresholds: a cream cloud (sat 0.10, V 0.97) passes; a
    #    pale-blue sky haze (sat 0.30) and a mid-grey (V 0.65) do not.
    for colour, want, why in (((247, 247, 230), 1, 'cream cloud sat 0.07 V 0.97'),
                              ((178, 216, 247), 0, 'pale haze sat 0.28'),
                              ((166, 166, 166), 0, 'mid grey V 0.65')):
        img, _ = synthetic_frames(w, h, [(0.5, 0.25, 0.12)], cloud=colour)
        n, _, _, _ = measure_frame(img)
        print(f'[G] {why}: n={n} (expect {want})  {"OK" if n == want else "BAD"}')
        ok &= (n == want)

    print('\nSYNTHETIC CONTROL: ' + ('PASS' if ok else 'FAIL'))
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frames_glob', nargs='?')
    ap.add_argument('--mode', choices=('ours', 'arcade'), default='ours',
                    help='ours: 3x-decimate to native 320x224 + live HUD mask. '
                         'arcade: measure as stored + REFERENCE.md HUD rects.')
    ap.add_argument('--synthetic', action='store_true', help='instrument control on known input')
    ap.add_argument('--verify-native', metavar='GLOB',
                    help='prove img[::3,::3] is lossless on these frames')
    ap.add_argument('--legacy', action='store_true',
                    help='re-run with the pre-R5 divergent operator for A/B only')
    ap.add_argument('--hud-mask-dir', default=os.path.join('tools', 'out', 'hudmask-cache'))
    ap.add_argument('--refresh-hud-mask', action='store_true')
    ap.add_argument('--label', default='')
    args = ap.parse_args()

    if args.synthetic:
        sys.exit(0 if run_synthetic() else 1)

    if args.verify_native:
        files = sorted(glob.glob(args.verify_native))
        if not files:
            raise SystemExit('no frames matched ' + args.verify_native)
        worst_frac = worst_dev = 0
        for f in files:
            frac, dev = block_uniformity(f)
            if frac is None:
                raise SystemExit(f'{f} is not a multiple of {NATIVE_SCALE}; cannot decimate')
            worst_frac = max(worst_frac, frac)
            worst_dev = max(worst_dev, dev)
        print(f'{len(files)} frames: worst non-uniform {NATIVE_SCALE}x{NATIVE_SCALE} block '
              f'fraction {worst_frac:.6f}, worst intra-block deviation {worst_dev}')
        print('img[::3,::3] is ' + ('LOSSLESS (exact inverse of the nearest upscale)'
                                    if worst_dev == 0 else 'LOSSY -- do not decimate'))
        sys.exit(0 if worst_dev == 0 else 1)

    if not args.frames_glob:
        ap.error('frames_glob is required unless --synthetic or --verify-native')
    files = sorted(glob.glob(args.frames_glob))
    if not files:
        raise SystemExit('no frames matched ' + args.frames_glob)

    if args.mode == 'ours':
        loader, hud_mask, hud_rects = load_ours, get_hud_mask(
            args.hud_mask_dir, force=args.refresh_hud_mask), None
    else:
        loader, hud_mask, hud_rects = load_arcade, None, ARCADE_HUD_RECTS

    report(files, loader, hud_mask, hud_rects, label=args.label or args.mode)

    if args.legacy:
        print('\n(pre-R5 divergent operator, for A/B only -- NOT comparable with the arcade)')
        report(files, loader, hud_mask, hud_rects, label='LEGACY operator',
               min_area=3 if args.mode == 'ours' else 14,
               neighbours=((1, 0), (-1, 0), (0, 1), (0, -1)),
               haze_discard=False, truncation=False,
               sat_max=0.35, v_min=150.0 / 255.0, win_top=0.0,
               win_bot=140.0 / 224.0)


if __name__ == '__main__':
    main()
