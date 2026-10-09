#!/usr/bin/env python3
"""FIRE-MASK, verbatim from REFERENCE.md "FIRE-MASK — the fireball operator
that can actually see a core", reimplemented here as a third independent
instrument.

    mask = V > 0.55 AND ( R > B + 0.10 OR ( S < 0.25 AND V > 0.90 ) )
           MINUS the frame's excluded regions (MANDATORY)
           then the largest 8-connected component
    core fraction = ( S < 0.25 AND V > 0.94 ) within that component

--selftest runs the published control on ab2-arcade-huge-explosion.jpg BOTH
WAYS — verbatim and with the three mandatory rects — because REFERENCE.md
ledger row 19 is explicit that the verbatim reading is the recognisable
failure mode, and an instrument that cannot reproduce BOTH numbers has not
demonstrated it applied the whole operator.

Usage:
  python3 tools/fire_mask.py --selftest
  python3 tools/fire_mask.py --dir <capture dir>   # one row per frame with fire
"""
import argparse
import glob
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from measure_criterion_ab import to_native, load_rgb  # noqa: E402

# The three mandatory rects for ab2-arcade-huge-explosion.jpg (181x127):
# top HUD strip, bottom HUD strip, bottom-left cloud wedge.
ARCADE_FRAME = os.path.join(ROOT, 'reference', 'ab2-arcade-huge-explosion.jpg')


def hsv(a):
    f = a.astype(np.float64) / 255.0
    mx = f.max(axis=2)
    mn = f.min(axis=2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-12), 0.0)
    return f, mx, s


def fire_mask(a, exclude=None):
    f, v, s = hsv(a)
    m = (v > 0.55) & (((f[:, :, 0] > f[:, :, 2] + 0.10) | ((s < 0.25) & (v > 0.90))))
    if exclude is not None:
        m &= ~exclude
    return m, v, s


def largest_component(m):
    h, w = m.shape
    seen = np.zeros_like(m)
    best = None
    bestn = 0
    for sy in range(h):
        row = m[sy]
        for sx in range(w):
            if not row[sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            comp = []
            while q:
                y, x = q.popleft()
                comp.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            q.append((ny, nx))
            if len(comp) > bestn:
                bestn = len(comp)
                best = comp
    out = np.zeros_like(m)
    if best:
        ys = np.fromiter((p[0] for p in best), int)
        xs = np.fromiter((p[1] for p in best), int)
        out[ys, xs] = True
    return out


def stats(a, exclude=None):
    m, v, s = fire_mask(a, exclude)
    comp = largest_component(m)
    n = int(comp.sum())
    if n == 0:
        return None
    core = float(((s < 0.25) & (v > 0.94) & comp).sum()) / n
    return {
        'n': n,
        'meanV': float(v[comp].mean()),
        'bright': float((v[comp] > 0.95).mean()),
        'core': core,
        'meanS': float(s[comp].mean()),
    }


def arcade_exclusions(shape):
    h, w = shape
    e = np.zeros((h, w), bool)
    e[0:15, :] = True
    e[112:128, :] = True
    yy, xx = np.mgrid[0:h, 0:w]
    e |= (xx < 55) & (yy > 82)
    return e


def selftest():
    a = np.asarray(Image.open(ARCADE_FRAME).convert('RGB'))
    ok = True

    def check(name, got, want, tol):
        nonlocal ok
        good = abs(got - want) <= tol
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {name}: got {got:.4f} want {want:.4f} (+-{tol})')

    print('FIRE-MASK control, ab2-arcade-huge-explosion.jpg, VERBATIM (no exclusions):')
    v = stats(a)
    check('mean V', v['meanV'], 0.8989, 0.004)
    check('V>0.95', v['bright'], 0.531, 0.010)
    check('core', v['core'], 0.172, 0.006)
    check('mean S', v['meanS'], 0.764, 0.006)
    print('FIRE-MASK control, same frame, WITH the three mandatory rects:')
    r = stats(a, arcade_exclusions(a.shape[:2]))
    check('mean V', r['meanV'], 0.9028, 0.006)
    check('V>0.95', r['bright'], 0.536, 0.010)
    check('core', r['core'], 0.094, 0.006)
    check('mean S', r['meanS'], 0.847, 0.006)
    # Synthetic control: a disc of pure #ffffff inside a disc of #ff0000 has a
    # core fraction equal to the area ratio, computed by hand.
    syn = np.zeros((101, 101, 3), np.uint8)
    yy, xx = np.mgrid[0:101, 0:101]
    rr = (yy - 50) ** 2 + (xx - 50) ** 2
    syn[rr <= 40 ** 2] = (255, 0, 0)
    syn[rr <= 20 ** 2] = (255, 255, 255)
    want = float((rr <= 20 ** 2).sum()) / float((rr <= 40 ** 2).sum())
    got = stats(syn)['core']
    print('synthetic control (white disc r=20 inside red disc r=40):')
    check('core == area ratio', got, want, 1e-9)
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--dir')
    ap.add_argument('--hudmask-cache',
                    help='dir for tools/hud_mask.py to cache its clean capture in. '
                         'MANDATORY for our-side frames: the HUD is white, warm and '
                         'high-contrast, it satisfies FIRE-MASK on its own, and on a '
                         'frame with no explosion in it the operator returns a clean '
                         '377 px "fireball" at 100%% V>0.95 and 44.8%% core. That is '
                         'REFERENCE ledger row 19 in our own frames.')
    ap.add_argument('--min-px', type=int, default=200,
                    help='frames whose fire component is smaller than this are '
                         'reported as NO FIRE rather than measured')
    args = ap.parse_args()
    if args.selftest:
        sys.exit(0 if selftest() else 1)
    if not args.dir:
        raise SystemExit('--dir or --selftest')
    exclude = None
    if args.hudmask_cache:
        from hud_mask import get_hud_mask
        get_hud_mask(args.hudmask_cache)  # captures the clean frame if absent
        # DERIVED, NOT A BOX. hud_mask.py's mask is zeroed below the horizon by
        # construction, so it cannot see the bottom SPEED/STAGE strip -- which
        # is white on a plate, satisfies FIRE-MASK by itself, and on a frame
        # with no explosion in it returned a clean 253 px "fireball" at 100%
        # V>0.95 and 45.1% core. So the exclusion used here is: every pixel
        # FIRE-MASK selects in the SAME RUN's clean frame
        # (?nocombat=1&hidejet=1&noclouds=1, captured by hud_mask.py), dilated
        # by one pixel. Nothing that is there when no explosion is there can be
        # part of an explosion.
        clean = to_native(load_rgb(os.path.join(args.hudmask_cache, 'frame-0000.png')))
        base, _, _ = fire_mask(clean)
        exclude = np.zeros_like(base)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                exclude |= np.roll(np.roll(base, dy, axis=0), dx, axis=1)
        print(f'clean-frame exclusion: {int(exclude.sum())} px '
              f'(FIRE-MASK on the run\'s own no-combat frame, dilated 1 px)')
    rows = []
    for p in sorted(glob.glob(os.path.join(args.dir, 'frame-*.png'))):
        a = to_native(load_rgb(p))
        st = stats(a, exclude)
        name = os.path.basename(p)
        if st is None or st['n'] < args.min_px:
            print(f'{name:16} NO FIRE (n={0 if st is None else st["n"]})')
            continue
        rows.append(st)
        print(f'{name:16} n {st["n"]:5d}  meanV {st["meanV"]:.3f}  V>0.95 {st["bright"]*100:5.1f}%  '
              f'core {st["core"]*100:5.1f}%  meanS {st["meanS"]:.3f}')
    if rows:
        def band(k):
            xs = sorted(r[k] for r in rows)
            return xs[0], xs[len(xs) // 2], xs[-1]
        for k, fmt in (('meanV', '{:.3f}'), ('bright', '{:.3f}'), ('core', '{:.3f}'), ('meanS', '{:.3f}')):
            lo, md, hi = band(k)
            print(f'{k:7} min/med/max  ' + ' / '.join(fmt.format(x) for x in (lo, md, hi)))
        print(f'({len(rows)} frames with fire)')


if __name__ == '__main__':
    main()
