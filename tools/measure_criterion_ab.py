#!/usr/bin/env python3
"""Criterion A (colour cardinality) + Criterion B (adjacent-pixel identity)
exactly as REFERENCE.md states them, reimplemented here from the prose so it
is a second independent instrument rather than a call into anyone's existing
tool.

CONTROLS FIRST. `--selftest` does two things before any of this is pointed at
the build:

  1. Synthetic controls with hand-computable answers (a flat fill, a 1px
     checkerboard, a per-pixel-random field, a 2x2 blocked field).
  2. The two true-native arcade frames, whose published figures are
     REFERENCE.md "Criterion A"/"Criterion B" and the R5 judge's re-run:
       ab2-arcade-desert.png        138 colours / 31 channel values / 68.7 / 68.5
       ab2-arcade-night-banking.png  79 colours / 17 channel values / 84.0 / 80.2

OPERATORS, stated so the numbers can be reproduced:

  Criterion A, over the WHOLE frame at true native 320x224:
    A1  len(unique rows of the Nx3 RGB array)
    A2  len(union of the three channels' value sets)   <- the judge's form,
        "union across channels, how REFERENCE's 31/17 were taken"
    A3  smallest number of distinct colours covering 90% of the pixels

  Criterion B (ADJ-ID), on a ground REGION of the same native frame:
    region = rows strictly below the fitted horizon, full width, minus a mask
    H-identity = fraction of in-region horizontally adjacent pairs whose three
                 channels are all equal; V-identity likewise. A pair counts
                 only when BOTH pixels are in the region.

  Our native frame is capture.mjs's 960x672 decimated by 3. `--check-blocks`
  verifies every 3x3 block is uniform first (ARCHITECTURE.md D3 renders at
  320x224 and blits nearest-neighbour, so it must be; if it ever is not, the
  decimation is measuring one corner of a filtered image and Criterion B is
  meaningless).

  Two mask variants are reported, because they answer different questions and
  the difference is large:
    --mask hud     the per-run tools/hud_mask.py mask. This is the R5 judge's
                   operator and the one the gate is stated against. That mask
                   is zeroed below the horizon by construction, so the BOTTOM
                   HUD band (SCORE/STAGE text drawn over ground) stays in the
                   region.
    --mask hud+static  additionally excludes below-horizon pixels that are
                   byte-identical across every frame of the run. The ground
                   scrolls at 68.93 world units/s, so a below-horizon pixel
                   that never changes over widely spaced ticks is HUD, not
                   sea. Derived per run from the frames themselves - no box.
"""
import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

NATIVE_W, NATIVE_H = 320, 224


# ---------------------------------------------------------------- loading

def load_rgb(path):
    return np.asarray(Image.open(path).convert('RGB'), dtype=np.uint8)


def to_native(img, check_blocks=True):
    """Decimate a capture to true native 320x224, verifying the upscale is
    lossless block duplication first."""
    h, w, _ = img.shape
    if (w, h) == (NATIVE_W, NATIVE_H):
        return img
    if w % NATIVE_W or h % NATIVE_H:
        raise SystemExit(f'{w}x{h} is not an integer multiple of {NATIVE_W}x{NATIVE_H}')
    sx, sy = w // NATIVE_W, h // NATIVE_H
    if check_blocks:
        blocks = img.reshape(NATIVE_H, sy, NATIVE_W, sx, 3)
        if not (blocks == blocks[:, :1, :, :1, :]).all():
            raise SystemExit('BLOCK CHECK FAILED: the upscale is not block-uniform, '
                             'decimation would be measuring a filtered image')
    return img[::sy, ::sx]


# ------------------------------------------------------------ criterion A

def criterion_a(img):
    flat = img.reshape(-1, 3)
    view = np.ascontiguousarray(flat).view([('r', 'u1'), ('g', 'u1'), ('b', 'u1')])
    uniq, counts = np.unique(view, return_counts=True)
    n_colours = len(uniq)
    chan_values = set()
    for c in range(3):
        chan_values |= set(np.unique(img[:, :, c]).tolist())
    order = np.sort(counts)[::-1]
    cum = np.cumsum(order) / order.sum()
    n90 = int(np.searchsorted(cum, 0.90) + 1)
    return n_colours, len(chan_values), n90


# ------------------------------------------------------------ criterion B

def adj_identity(img, region):
    """H/V identity over `region` (bool, True = inside)."""
    eq_h = (img[:, :-1, :] == img[:, 1:, :]).all(axis=2)
    both_h = region[:, :-1] & region[:, 1:]
    eq_v = (img[:-1, :, :] == img[1:, :, :]).all(axis=2)
    both_v = region[:-1, :] & region[1:, :]
    h = eq_h[both_h].mean() if both_h.any() else float('nan')
    v = eq_v[both_v].mean() if both_v.any() else float('nan')
    return float(h), float(v), int(both_h.sum()), int(both_v.sum())


def fit_horizon(img, n_cols=66, consecutive=6, threshold=60):
    """Median horizon row by per-column deviation-from-sky scanning, scanned
    BOTTOM-UP.

    The top-down form of this (hud_mask.py's detect_sky_and_horizon, which
    this reimplements rather than imports so the file stands alone) takes the
    first run of `consecutive` non-sky rows as the horizon. CLOUDS DEFEAT IT,
    and not marginally: on a six-frame stage-1 run, frames whose cloud bank
    happened to be large and central fitted the horizon at rows 21 and 26
    against ~140 on the other four, because a cumulus is a run of non-sky
    rows that starts 120 rows above the sea. That put the whole sky inside
    the "ground band", and a flat sky is ~100% self-identical, so it INFLATED
    Criterion B by 3-21 points on exactly the frames it broke. This is the
    third time something white and high-contrast in the upper sky has
    defeated a fit in this project (CLAUDE.md keeps the list).

    Bottom-up is immune by construction: a cloud is bounded above AND below
    by sky, so the first sky-like run encountered coming up from the bottom
    of the frame is the real horizon, whatever is floating above it.
    """
    f = img.astype(np.float64)
    h, w, _ = f.shape
    band = f[: int(h * 0.18)].reshape(-1, 3).astype(np.int32)
    colours, counts = np.unique(band, axis=0, return_counts=True)
    sky = colours[np.argmax(counts)].astype(np.float64)
    xs = np.linspace(0, w - 1, n_cols).astype(int)
    rows = []
    for x in xs:
        dev = np.abs(f[:, x, :] - sky).sum(axis=1)
        sky_like = dev <= threshold
        for y in range(h - 1, consecutive - 2, -1):
            if sky_like[y - consecutive + 1:y + 1].all():
                rows.append(y + 1)
                break
    return (int(np.median(rows)) if rows else h), sky


# -------------------------------------------------------------- selftest

def _synthetic_selftest():
    ok = True

    def check(name, got, want, tol=1e-9):
        nonlocal ok
        good = abs(got - want) <= tol
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {name}: got {got:.4f} want {want:.4f}')

    full = np.ones((20, 20), dtype=bool)

    # fit_horizon control, with the exact failure that motivated bottom-up:
    # sky on top, a high-contrast CLOUD blob far above the horizon, ground
    # below row 140. The answer is 140 and nothing else.
    synth = np.zeros((224, 320, 3), dtype=np.uint8)
    synth[:140] = (0, 159, 255)          # sky
    synth[140:] = (0, 16, 230)           # sea
    synth[12:48, 100:220] = (247, 247, 247)  # cloud
    got_hz, _ = fit_horizon(synth)
    check('fit_horizon with a cloud above it', float(got_hz), 140.0)
    nocloud = synth.copy()
    nocloud[12:48, 100:220] = (0, 159, 255)
    check('fit_horizon, no cloud', float(fit_horizon(nocloud)[0]), 140.0)

    flat = np.full((20, 20, 3), 77, dtype=np.uint8)
    n, ch, n90 = criterion_a(flat)
    check('flat fill colours', n, 1)
    check('flat fill channel values', ch, 1)
    h, v, _, _ = adj_identity(flat, full)
    check('flat fill H', h, 1.0)
    check('flat fill V', v, 1.0)

    yy, xx = np.mgrid[0:20, 0:20]
    checker = np.where(((xx + yy) % 2)[..., None], 255, 0).astype(np.uint8).repeat(3, axis=2)
    h, v, _, _ = adj_identity(checker, full)
    check('1px checkerboard H', h, 0.0)
    check('1px checkerboard V', v, 0.0)

    # 2x2 blocks: for a 20-wide row, pairs (0,1)(1,2)...(18,19) = 19 pairs,
    # identical exactly when the two pixels share a block = 10 of 19.
    blocked = np.where((((xx // 2) + (yy // 2)) % 2)[..., None], 255, 0).astype(np.uint8).repeat(3, axis=2)
    h, v, _, _ = adj_identity(blocked, full)
    check('2x2 blocks H', h, 10 / 19)
    check('2x2 blocks V', v, 10 / 19)

    rng = np.random.default_rng(7)
    noise = rng.integers(0, 256, size=(200, 200, 3), dtype=np.uint8)
    h, v, _, _ = adj_identity(noise, np.ones((200, 200), dtype=bool))
    print(f'  INFO  uniform random 8-bit field H {h:.5f} V {v:.5f} (expect ~1/2^24 = 0)')
    ok &= h < 1e-4 and v < 1e-4

    # Region gating: a pair straddling the region edge must not count.
    reg = np.zeros((4, 4), dtype=bool)
    reg[:, :2] = True
    img = np.zeros((4, 4, 3), dtype=np.uint8)
    img[:, 2:] = 0  # equal across the edge, but those pairs must be excluded
    h, v, nh, nv = adj_identity(img, reg)
    check('region gating H pair count', nh, 4 * 1)  # only (0,1) per row
    check('region gating V pair count', nv, 3 * 2)

    return ok


def _arcade_selftest():
    ok = True
    cases = [
        ('ab2-arcade-desert.png', 138, 31, 31, 68.7, 68.5, (10, 26), (196, 216)),
        ('ab2-arcade-night-banking.png', 79, 17, 8, 84.0, 80.2, (10, 26), (196, 216)),
    ]
    for name, wn, wch, wn90, wh, wv, top, bot in cases:
        img = load_rgb(os.path.join(ROOT, 'reference', name))
        if img.shape[:2] != (NATIVE_H, NATIVE_W):
            raise SystemExit(f'{name} is not native {NATIVE_W}x{NATIVE_H}')
        n, ch, n90 = criterion_a(img)
        # REFERENCE.md Criterion B step 2: "If the frame has no sky ... the
        # region is the whole frame minus the HUD bands (rows 10-26 and
        # 196-216 on those two frames)."
        region = np.ones((NATIVE_H, NATIVE_W), dtype=bool)
        region[top[0]:top[1] + 1, :] = False
        region[bot[0]:bot[1] + 1, :] = False
        h, v, _, _ = adj_identity(img, region)
        for label, got, want, tol in (
            ('colours', n, wn, 0), ('channel values', ch, wch, 0), ('n90', n90, wn90, 0),
            ('H-identity %', h * 100, wh, 0.15), ('V-identity %', v * 100, wv, 0.15),
        ):
            good = abs(got - want) <= tol
            ok &= good
            print(f'  {"PASS" if good else "FAIL"}  {name} {label}: got {got} want {want}')
    return ok


# ------------------------------------------------------------------ masks

def static_mask(natives):
    """Below-horizon pixels byte-identical across every frame of the run.
    The sea scrolls at 68.93 world units/s, so over widely spaced ticks only
    HUD (and any other screen-space overlay) is invariant."""
    stack = np.stack(natives)
    same = (stack == stack[0]).all(axis=0).all(axis=-1)
    return same


def build_region(native, hudmask, extra_mask, horizon_row):
    region = np.ones(native.shape[:2], dtype=bool)
    region[:horizon_row + 1, :] = False
    if hudmask is not None:
        region &= ~hudmask
    if extra_mask is not None:
        region &= ~extra_mask
    return region


# ------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', nargs='*', default=None,
                    help='PNG paths, or a directory of frame-*.png')
    ap.add_argument('--dir', default=None)
    ap.add_argument('--hudmask-cache', default=None,
                    help='dir for tools/hud_mask.py to cache its clean capture in '
                         '(required to report the --mask hud figures)')
    ap.add_argument('--patch', default='150,198,20,300',
                    help='near-field patch y0,y1,x0,x1 in native rows (default the '
                         'judge\'s 280x48 rows 150-198)')
    ap.add_argument('--no-block-check', action='store_true')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--quiet-frames', action='store_true')
    args = ap.parse_args()

    if args.selftest:
        print('synthetic controls:')
        a = _synthetic_selftest()
        print('arcade native frames (published figures):')
        b = _arcade_selftest()
        print('SELFTEST', 'PASS' if (a and b) else 'FAIL')
        sys.exit(0 if (a and b) else 1)

    paths = []
    if args.dir:
        paths += sorted(glob.glob(os.path.join(args.dir, 'frame-*.png')))
    for p in args.frames or []:
        paths += sorted(glob.glob(os.path.join(p, 'frame-*.png'))) if os.path.isdir(p) else [p]
    if not paths:
        raise SystemExit('no frames')

    natives = [to_native(load_rgb(p), check_blocks=not args.no_block_check) for p in paths]

    # Corruption sweep: black frames and duplicates (two causes fixed in R5
    # is not proof there is no third).
    md5s = {}
    import hashlib
    for p, n in zip(paths, natives):
        if n.max() == 0:
            print(f'  CORRUPT all-black: {p}')
        d = hashlib.md5(n.tobytes()).hexdigest()
        md5s.setdefault(d, []).append(os.path.basename(p))
    dups = {k: v for k, v in md5s.items() if len(v) > 1}
    if dups:
        print(f'  CORRUPT duplicate frames: {dups}')
    else:
        print(f'  sweep: {len(paths)} frames, 0 black, 0 duplicates')

    hudmask = None
    if args.hudmask_cache:
        from hud_mask import get_hud_mask
        hudmask = get_hud_mask(args.hudmask_cache)
        print(f'  hud_mask.py: {int(hudmask.sum())} px above horizon')
    stat = static_mask(natives)

    py0, py1, px0, px1 = (int(v) for v in args.patch.split(','))

    rows = []
    for p, native in zip(paths, natives):
        n, ch, n90 = criterion_a(native)
        horizon, _sky = fit_horizon(native)
        r_hud = build_region(native, hudmask, None, horizon)
        h1, v1, _, _ = adj_identity(native, r_hud)
        r_both = build_region(native, hudmask, stat, horizon)
        h2, v2, _, _ = adj_identity(native, r_both)
        patch_reg = np.zeros(native.shape[:2], dtype=bool)
        patch_reg[py0:py1, px0:px1] = True
        if hudmask is not None:
            patch_reg &= ~hudmask
        patch_reg &= ~stat
        hp, vp, _, _ = adj_identity(native, patch_reg)
        pn, pch, _ = criterion_a(native[py0:py1, px0:px1])
        rows.append((os.path.basename(p), horizon, n, ch, n90, h1, v1, h2, v2, pn, hp, vp))

    hdr = (f'{"frame":16} {"hz":>3} {"colours":>8} {"chan":>5} {"n90":>5} '
           f'{"H(hud)":>7} {"V(hud)":>7} {"H(+st)":>7} {"V(+st)":>7} '
           f'{"pColr":>6} {"pH":>6} {"pV":>6}')
    if not args.quiet_frames:
        print(hdr)
        for r in rows:
            print(f'{r[0]:16} {r[1]:3d} {r[2]:8d} {r[3]:5d} {r[4]:5d} '
                  f'{r[5]*100:7.2f} {r[6]*100:7.2f} {r[7]*100:7.2f} {r[8]*100:7.2f} '
                  f'{r[9]:6d} {r[10]*100:6.2f} {r[11]*100:6.2f}')

    arr = np.array([[r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11]]
                    for r in rows], dtype=np.float64)
    med = np.median(arr, axis=0)
    print(f'\nMEDIAN of {len(rows)} frames  '
          f'colours {med[0]:.0f}  channel-values {med[1]:.0f}  n90 {med[2]:.0f}')
    print(f'  ground band, mask=hud        H {med[3]*100:.2f}%  V {med[4]*100:.2f}%')
    print(f'  ground band, mask=hud+static H {med[5]*100:.2f}%  V {med[6]*100:.2f}%')
    print(f'  near patch y[{py0},{py1}) x[{px0},{px1})  colours {med[7]:.0f}  '
          f'H {med[8]*100:.2f}%  V {med[9]*100:.2f}%')
    print('\nGATE  colours <=256, channel values <=32, H>=50%, V>=50%, patch V>=50%')


if __name__ == '__main__':
    main()
