#!/usr/bin/env python3
"""R11 ENEMY-ART census. One instrument, three readings, all on the AUTHORED
sheet (an isolation harness, per CLAUDE.md "isolation harnesses beat in-situ
measurement") plus an arcade-crop mode for the reference column.

READINGS
  VALUE   L = 0.299R + 0.587G + 0.114B over OPAQUE pixels only (alpha is
          ground truth on an authored sheet -- no mask discretion). Reports
          the full colour table with shares, mean L, frac L<80, frac L>200.
          `frac L<80` is the statistic judging/R10/art-critique.md Sec.2 states
          its finding in: ours 5.7 %, arcade stage-1 enemy 24.5-33.5 %.
  CRIT-A  unique opaque colours, and distinct values per channel (<=256
          and <=32 -- REFERENCE.md Criterion A, the Sega 5-bit ladder form).
  CRIT-B  adjacent-pixel identity. TWO variants are printed because they are
          different questions and they disagree by ~30 points:
            ALL    every 4-adjacent pair in the image, RGBA equality
                   (transparent==transparent counts).
            OPAQUE pairs where BOTH pixels are opaque, RGB equality.
          The R10 critique's "59.9 %" for enemy-grey-head is the OPAQUE
          variant; the selftest below asserts that, so the variant cannot be
          silently swapped.

ARCADE MODE (--arcade img --box x0,y0,x1,y1 [--sky r,g,b])
  Same VALUE operator, with the sky removed instead of alpha: sky = the modal
  colour of the crop unless --sky names one, and a pixel is "object" iff it is
  not within --sky-tol of that colour. Prints the same table so the arcade
  column and our sheet are read by ONE operator.

SELFTEST (--selftest) -- synthetic controls with hand-computable answers AND
two published real-frame numbers. A synthetic control proves the operator
computes what it says; it cannot prove a quality statistic ranks correctly, so
nothing here is used as a quality ranking (judging/R10/lane-criteria.md row 44).
"""
import argparse
import sys
from collections import Counter

import numpy as np
from PIL import Image


def lum(rgb):
    rgb = np.asarray(rgb, dtype=float)
    return 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]


def load(path):
    return np.array(Image.open(path).convert('RGBA'))


def value_census(rgba, mask=None, cells=None):
    """mask: bool array of 'object' pixels. Default = alpha>0."""
    if mask is None:
        mask = rgba[..., 3] > 0
    rgb = rgba[..., :3][mask]
    if rgb.size == 0:
        return None
    L = lum(rgb)
    counts = Counter(map(tuple, rgb.tolist()))
    n = len(L)
    table = []
    for c, k in sorted(counts.items(), key=lambda kv: lum(kv[0])):
        table.append((c, float(lum(c)), 100.0 * k / n))
    return {
        'n': n,
        'mean_L': float(L.mean()),
        'frac_dark80': float((L < 80).mean()),
        'frac_dark86': float((L <= 86).mean()),
        'frac_light200': float((L > 200).mean()),
        'table': table,
    }


def criterion_a(rgba):
    mask = rgba[..., 3] > 0
    rgb = rgba[..., :3][mask]
    cols = set(map(tuple, rgb.tolist()))
    chans = [len(set(int(v) for v in rgb[:, i])) for i in range(3)]
    return {'colours': len(cols), 'chan': chans, 'chan_union':
            len(set(int(v) for v in rgb.reshape(-1)))}


def criterion_b(rgba):
    a = rgba
    opaque = a[..., 3] > 0
    # ALL: RGBA equality over every 4-adjacent pair in the image.
    h_eq = np.all(a[:, :-1] == a[:, 1:], axis=-1)
    v_eq = np.all(a[:-1, :] == a[1:, :], axis=-1)
    all_id = (h_eq.sum() + v_eq.sum()) / (h_eq.size + v_eq.size)
    # OPAQUE: RGB equality, pairs where both are opaque.
    hb = opaque[:, :-1] & opaque[:, 1:]
    vb = opaque[:-1, :] & opaque[1:, :]
    h_rgb = np.all(a[:, :-1, :3] == a[:, 1:, :3], axis=-1) & hb
    v_rgb = np.all(a[:-1, :, :3] == a[1:, :, :3], axis=-1) & vb
    denom = hb.sum() + vb.sum()
    op_id = (h_rgb.sum() + v_rgb.sum()) / denom if denom else float('nan')
    return {'all': float(all_id), 'opaque': float(op_id), 'pairs': int(denom)}


def report(label, rgba, mask=None):
    vc = value_census(rgba, mask)
    ca = criterion_a(rgba)
    cb = criterion_b(rgba)
    print(f'=== {label}')
    print(f'    opaque px {vc["n"]}   mean L {vc["mean_L"]:.1f}   '
          f'frac L<80 {100*vc["frac_dark80"]:.1f} %   '
          f'frac L<=86 {100*vc["frac_dark86"]:.1f} %   '
          f'frac L>200 {100*vc["frac_light200"]:.1f} %')
    print(f'    CRIT-A  {ca["colours"]} colours   per-channel distinct '
          f'R{ca["chan"][0]} G{ca["chan"][1]} B{ca["chan"][2]}   '
          f'union {ca["chan_union"]}')
    print(f'    CRIT-B  opaque-pairs {100*cb["opaque"]:.1f} %   '
          f'all-pairs {100*cb["all"]:.1f} %   (n={cb["pairs"]})')
    for c, L, share in vc['table']:
        print(f'      rgb{c}  L {L:6.1f}   {share:5.1f} %')
    return vc, ca, cb


def arcade_report(path, box, sky=None, tol=12):
    img = np.array(Image.open(path).convert('RGB'))
    x0, y0, x1, y1 = box
    crop = img[y0:y1, x0:x1]
    flat = crop.reshape(-1, 3)
    if sky is None:
        sky = Counter(map(tuple, flat.tolist())).most_common(1)[0][0]
    sky = np.array(sky, dtype=int)
    d = np.abs(crop.astype(int) - sky).max(axis=-1)
    mask = d > tol
    rgba = np.dstack([crop, np.where(mask, 255, 0).astype(np.uint8)])
    print(f'    sky rgb{tuple(int(v) for v in sky)}  L {lum(sky):.1f}  tol {tol}')
    return report(f'ARCADE {path} box={box}', rgba)


def selftest():
    ok = True

    def check(name, got, want, eps=1e-6):
        nonlocal ok
        good = abs(got - want) <= eps
        ok &= good
        print(f'  [{"PASS" if good else "FAIL"}] {name}: got {got:.4f} want {want:.4f}')

    # 1. flat 10x10 opaque fill -> adjacency identity 1.0, 1 colour, L exact
    flat = np.zeros((10, 10, 4), np.uint8)
    flat[..., :3] = (100, 150, 200)
    flat[..., 3] = 255
    check('flat adj-id (opaque)', criterion_b(flat)['opaque'], 1.0)
    check('flat colours', criterion_a(flat)['colours'], 1)
    check('flat mean L', value_census(flat)['mean_L'],
          0.299 * 100 + 0.587 * 150 + 0.114 * 200)

    # 2. 1px checkerboard of two opaque colours -> adjacency identity 0.0
    chk = np.zeros((10, 10, 4), np.uint8)
    chk[..., 3] = 255
    yy, xx = np.mgrid[0:10, 0:10]
    chk[..., :3] = np.where(((yy + xx) % 2)[..., None], 255, 0)
    check('checker adj-id (opaque)', criterion_b(chk)['opaque'], 0.0)

    # 3. prescribed dark share: 30 of 100 opaque px at L=0, rest at L=255
    pre = np.zeros((10, 10, 4), np.uint8)
    pre[..., 3] = 255
    pre[..., :3] = 255
    pre.reshape(-1, 4)[:30, :3] = 0
    check('prescribed frac L<80', value_census(pre)['frac_dark80'], 0.30)

    # 4. a half-transparent sheet: opaque-pair count must exclude the gap
    half = np.zeros((4, 4, 4), np.uint8)
    half[:, :2, :3] = (10, 10, 10)
    half[:, :2, 3] = 255
    # 4 rows x 1 h-pair + 3 v-pairs x 2 cols = 4 + 6 = 10 opaque pairs
    check('masked opaque pair count', criterion_b(half)['pairs'], 10)

    print('  --- published real-frame checks (these are the ones that matter) ---')
    # Against the sheet AS R10 MEASURED IT -- pinned to 21c789c, the tree the
    # R10 judge and art critic worked on -- and NOT against the working tree or
    # HEAD. Pointing the control at a sheet this lane just redrew would make it
    # validate itself, and pointing it at HEAD would stop working the moment the
    # TL commits. Falls back quietly outside a git checkout.
    import io
    import subprocess
    try:
        blob = subprocess.run(
            ['git', 'show', '21c789c:src/assets/sprites/enemy-grey-head.png'],
            capture_output=True, check=True).stdout
        g = np.array(Image.open(io.BytesIO(blob)).convert('RGBA'))
        vc = value_census(g)
        cb = criterion_b(g)
        d, b = 100 * vc['frac_dark80'], 100 * cb['opaque']
        check('21c789c enemy-grey-head frac L<80 (R10 published 5.7 %)', d, 5.7, 0.05)
        check('21c789c enemy-grey-head CRIT-B opaque (R10 published 59.9 %)', b, 59.9, 0.05)
    except Exception as e:  # noqa: BLE001 -- the control is optional, not the suite
        print(f'  (skipped: {e})')
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheets', nargs='*')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--arcade')
    ap.add_argument('--box')
    ap.add_argument('--sky')
    ap.add_argument('--sky-tol', type=int, default=12)
    a = ap.parse_args()
    if a.selftest:
        return selftest()
    if a.arcade:
        box = tuple(int(v) for v in a.box.split(','))
        sky = tuple(int(v) for v in a.sky.split(',')) if a.sky else None
        arcade_report(a.arcade, box, sky, a.sky_tol)
        return 0
    for p in a.sheets:
        report(p, load(p))
    return 0


if __name__ == '__main__':
    sys.exit(main())
