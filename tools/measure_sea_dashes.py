#!/usr/bin/env python3
"""SEA-DASH — the geometry of the arcade sea's bright scatter, which no
existing criterion captures and which is what R6 gap 1 actually turned on.

WHY THIS TOOL EXISTS. After the stage-1 sea rebuild, Criterion A and
Criterion B both passed on every frame of a six-frame run (56 colours / 31
channel values / H 89.3 % / V 55.1 %), and the near-field crop put beside
reference/stage1-level-flight-t116.png at native was still obviously wrong:
ours was a deep blue field carrying a few HUGE smooth pale slabs, the arcade
is the same deep blue carrying a DENSE SCATTER OF SHORT BRIGHT DASHES. Both
gates are blind to the difference — a big flat slab scores *better* on
adjacent-pixel identity than the dashes do, which is why our H sat 20 points
ABOVE the arcade's. This is the CLAUDE.md rule in its literal form: the crop
won, and the number that disagreed with it was measuring the wrong thing.

OPERATOR (SEA-DASH), identical on both sides:
  1. Reduce to true native scale. Ours: capture.mjs's integer upscale
     decimated by k, with every kxk block checked uniform first. The arcade:
     t116 is a 686x480 video frame of a 320x224 original, so the SAME SCREEN
     FRACTION is cropped and area-averaged (Image.BOX) back to the native
     patch size. Area-averaging, not point sampling: the frame is an
     upscale, so averaging approximately inverts it, where point sampling
     would keep one arbitrary sub-pixel of each native pixel.
  2. foam mask = V > 0.95 on max(R,G,B)/255, the same V>0.95 operator
     REFERENCE.md "Contrast / foam" already publishes a fraction for
     (23.4 % near-field band / 38.8 % whole sea on t116). Reproducing that
     published fraction on the arcade side is this tool's calibration.
  3. 4-connected components of the mask; report count, and the bbox width,
     bbox height and pixel area distributions.

The discriminating statistics are the EXTREMES, not the medians. Medians
agree between a correct sea and a wrong one (both are ~2 px wide, 1 px tall
— that is just what a thresholded field's small components look like); what
separates them is whether anything enormous exists. On the 280x48 near patch
the arcade's largest foam component is 38 px wide, 8 px tall, 83 px in area,
and our pre-fix build's was 280 px wide (the entire patch), 30 px tall, 2194
px in area — one sixth of the patch in a single blob.

--selftest checks the labeller against inputs whose answers are countable by
hand, and checks the arcade side against REFERENCE.md's published foam
fraction.
"""
import argparse
import sys

import numpy as np
from PIL import Image

# The judge's near-field patch, in native rows/cols.
PATCH = (150, 198, 20, 300)
REF_T116 = 'reference/stage1-level-flight-t116.png'


def to_native(arr):
    """Decimate our integer upscale to 320x224, refusing if it is not one."""
    h, w = arr.shape[:2]
    if (w, h) == (320, 224):
        return arr
    if w % 320 or h % 224 or w // 320 != h // 224:
        raise SystemExit(f'not an integer upscale of 320x224: {w}x{h}')
    k = w // 320
    dec = arr[::k, ::k]
    for dy in range(k):
        for dx in range(k):
            if np.abs(arr[dy::k, dx::k].astype(int) - dec.astype(int)).max():
                raise SystemExit('REFUSING: kxk blocks are not uniform, so the '
                                 'decimation would be measuring a filtered image')
    return dec


def components(mask):
    """4-connected components. Returns [(height, width, area), ...].

    Hand-rolled rather than scipy.ndimage.label because scipy is not
    installed in this environment; the selftest checks it against counts
    done by hand.
    """
    h, w = mask.shape
    seen = np.zeros((h, w), bool)
    out = []
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            y0 = y1 = sy
            x0 = x1 = sx
            area = 0
            while stack:
                cy, cx = stack.pop()
                area += 1
                y0 = min(y0, cy); y1 = max(y1, cy)
                x0 = min(x0, cx); x1 = max(x1, cx)
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            out.append((y1 - y0 + 1, x1 - x0 + 1, area))
    return out


def foam_mask(rgb):
    return (rgb.max(axis=2).astype(np.float64) / 255.0) > 0.95


def describe(rgb, label):
    m = foam_mask(rgb)
    comps = components(m)
    if not comps:
        return dict(label=label, foam=0.0, n=0)
    hs = np.array([c[0] for c in comps])
    ws = np.array([c[1] for c in comps])
    ar = np.array([c[2] for c in comps])
    return dict(
        label=label, foam=m.mean() * 100.0, n=len(comps),
        w50=np.median(ws), w90=np.percentile(ws, 90), wmax=ws.max(),
        h50=np.median(hs), h90=np.percentile(hs, 90), hmax=hs.max(),
        a50=np.median(ar), amax=ar.max(),
    )


def show(d):
    if not d['n']:
        print(f"{d['label']:<40s} no foam pixels at all -- LOOK at the crop before believing this")
        return
    print(f"{d['label']:<40s} foam {d['foam']:5.1f}%  comps {d['n']:5d}  "
          f"w {d['w50']:.0f}/{d['w90']:.0f}/{d['wmax']:<4.0f}  "
          f"h {d['h50']:.0f}/{d['h90']:.0f}/{d['hmax']:<3.0f}  "
          f"area {d['a50']:.0f}/{d['amax']:.0f}")


def arcade_patch(path=REF_T116, patch=PATCH):
    """The same SCREEN FRACTION of the arcade frame, area-averaged to the
    native patch size. See the operator note in the module docstring."""
    y0, y1, x0, x1 = patch
    im = Image.open(path).convert('RGB')
    W, H = im.size
    box = (int(round(x0 / 320 * W)), int(round(y0 / 224 * H)),
           int(round(x1 / 320 * W)), int(round(y1 / 224 * H)))
    return np.array(im.crop(box).resize((x1 - x0, y1 - y0), Image.BOX)), box


def selftest():
    ok = True

    def check(name, got, want, tol=0.0):
        nonlocal ok
        if isinstance(want, (int, float)) and isinstance(got, (int, float)):
            good = abs(got - want) <= tol
        else:
            good = got == want
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {name}: got {got} want {want}')

    # Labeller controls, countable by hand.
    m = np.zeros((10, 10), bool)
    check('empty image: components', len(components(m)), 0)
    m[2, 2] = True
    check('one pixel: components', len(components(m)), 1)
    check('one pixel: (h,w,area)', components(m)[0], (1, 1, 1))
    m[:] = False
    m[3, 1:6] = True                      # a 1x5 horizontal dash
    m[7:9, 8] = True                      # a 2x1 vertical mark, not touching
    comps = sorted(components(m))
    check('two separate marks: count', len(comps), 2)
    check('dash (h,w,area)', comps[0], (1, 5, 5))
    check('vertical (h,w,area)', comps[1], (2, 1, 2))
    m[:] = False
    m[1, 1] = m[2, 2] = True              # diagonal touch must NOT join (4-conn)
    check('diagonal is two components under 4-connectivity', len(components(m)), 2)
    m[:] = True
    check('full mask: one component of 100', components(m)[0], (10, 10, 100))

    # foam_mask threshold control: V is max(R,G,B)/255, cut strictly above 0.95.
    # 242/255 = 0.9490 (out), 243/255 = 0.9529 (in).
    px = np.zeros((1, 2, 3), np.uint8)
    px[0, 0] = (242, 0, 0)
    px[0, 1] = (243, 0, 0)
    check('foam threshold at V 0.95', foam_mask(px).tolist(), [[False, True]])

    # Calibration against REFERENCE.md's own published figure. "Contrast /
    # foam" gives 23.4% V>0.95 on the t116 NEAR-FIELD band; this tool's patch
    # is the judge's 280x48 box, a different (smaller, nearer) window on the
    # same frame, so the figures are related but not equal -- the check is
    # that this operator lands in the published neighbourhood rather than
    # somewhere else entirely, which is what would catch a colour-space or
    # crop-box error.
    ref, box = arcade_patch()
    f = foam_mask(ref).mean() * 100.0
    good = 12.0 <= f <= 30.0
    ok &= good
    print(f'  {"PASS" if good else "FAIL"}  arcade t116 patch foam fraction {f:.1f}% '
          f'(REFERENCE.md publishes 23.4% on its own near-field band; '
          f'expect the same neighbourhood, crop box {box})')

    print('SELFTEST PASS' if ok else 'SELFTEST FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('frames', nargs='*', help='our capture PNGs (integer upscale of 320x224)')
    ap.add_argument('--patch', default=','.join(str(v) for v in PATCH),
                    help='native y0,y1,x0,x1 (default the judge 280x48 near patch)')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--crop-out', help='write an OURS-over-ARCADE native comparison PNG here')
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if not a.frames:
        ap.error('give at least one frame, or --selftest')
    y0, y1, x0, x1 = (int(v) for v in a.patch.split(','))
    patch = (y0, y1, x0, x1)

    print(f'patch native y[{y0},{y1}) x[{x0},{x1})   '
          f'columns are: foam%  comps  w p50/p90/max  h p50/p90/max  area p50/max')
    rows = []
    for f in a.frames:
        arr = to_native(np.array(Image.open(f).convert('RGB')))
        d = describe(arr[y0:y1, x0:x1], f.split('/')[-1])
        rows.append(d)
        show(d)
    if len(rows) > 1:
        med = dict(label=f'MEDIAN of {len(rows)}', n=int(np.median([r['n'] for r in rows])),
                   foam=np.median([r['foam'] for r in rows]))
        for k in ('w50', 'w90', 'wmax', 'h50', 'h90', 'hmax', 'a50', 'amax'):
            med[k] = np.median([r[k] for r in rows])
        show(med)
    ref, box = arcade_patch(patch=patch)
    show(describe(ref, 'ARCADE t116 (same screen fraction)'))

    if a.crop_out:
        ours = Image.fromarray(to_native(np.array(Image.open(a.frames[0]).convert('RGB')))
                               [y0:y1, x0:x1])
        k = 3
        w, h = ours.size
        canv = Image.new('RGB', (w * k, h * k * 2 + 6))
        canv.paste(ours.resize((w * k, h * k), Image.NEAREST), (0, 0))
        canv.paste(Image.new('RGB', (w * k, 6), (255, 0, 255)), (0, h * k))
        canv.paste(Image.fromarray(ref).resize((w * k, h * k), Image.NEAREST), (0, h * k + 6))
        canv.save(a.crop_out)
        print(f'wrote {a.crop_out} (OURS top, ARCADE bottom, 3x nearest, magenta rule between)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
