#!/usr/bin/env python3
"""R7 gap 3 — sweep the stage-1 dash cell size as ONE scalar.

The six cap/crest frequencies in STAGE_1.terrain are deliberately
non-commensurate with each other (see stage.js), so the thing to sweep is
their common SCALE, not any one of them. This writes `base * k` into all six,
captures, and measures SEA-DASH at the three published row offsets with the
bottom HUD excluded.

Same three harness rules as tools/sweep_night.py: fresh directory per row,
capture stderr filtered not discarded and a non-zero exit aborts, and any row
whose frames are byte-identical to an earlier row's is discarded as a run that
did not happen.
"""
import argparse
import glob
import hashlib
import os
import re
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from measure_sea_dashes import to_native, foam_mask, components, arcade_patch  # noqa: E402
from measure_stage_identity import read_digit  # noqa: E402

STAGE_JS = os.path.join(ROOT, 'src', 'game', 'stage.js')
KEYS = ('capFreqX', 'capFreqZ', 'capFreq2X', 'capFreq2Z', 'crestFreqX', 'crestFreqZ')
# The HUD's own rows, DERIVED not assumed: over 24 stage-1 frames at 71-tick
# spacing, the below-horizon pixels that are byte-identical across every frame
# (the sea scrolls at 68.93 world units/s, so an invariant one is an overlay)
# occupy native rows 198-219. REFERENCE.md's Criterion B operator excludes
# rows 196-216 as HUD on the arcade's own native frames. The patch is
# therefore clipped at 198 on both sides.
HUD_ROW = 198
OFFSETS = (150, 160, 170)


def read_block(name='STAGE_1'):
    src = open(STAGE_JS).read()
    i = src.index(f'export const {name} =')
    j = src.index('export const', i + 10)
    return src, i, j


def set_scale(base, k):
    src, i, j = read_block()
    seg = src[i:j]
    for key in KEYS:
        pat = re.compile(rf'^(\s*){key}:\s*[-\d.]+,', re.M)
        if not pat.search(seg):
            raise SystemExit(f'{key} not found in STAGE_1.terrain')
        seg = pat.sub(lambda m, key=key: f'{m.group(1)}{key}: {round(base[key] * k, 4)},', seg, 1)
    open(STAGE_JS, 'w').write(src[:i] + seg + src[j:])


def get_base():
    src, i, j = read_block()
    seg = src[i:j]
    return {k: float(re.search(rf'^\s*{k}:\s*([-\d.]+),', seg, re.M).group(1)) for k in KEYS}


def stats(p):
    m = foam_mask(p)
    c = components(m)
    if not c:
        return None
    hs = np.array([x[0] for x in c])
    ws = np.array([x[1] for x in c])
    ar = np.array([x[2] for x in c])
    return dict(foam=m.mean() * 100, n=len(c), dens=1000.0 * len(c) / m.size,
                w50=float(np.median(ws)), w90=float(np.percentile(ws, 90)), wmax=int(ws.max()),
                h90=float(np.percentile(hs, 90)), hmax=int(hs.max()),
                a50=float(np.median(ar)), amax=int(ar.max()))


def measure(outdir):
    arrs = [to_native(np.array(Image.open(f).convert('RGB')))
            for f in sorted(glob.glob(os.path.join(outdir, 'frame-*.png')))]
    s1 = [a for a in arrs if read_digit(a)[0] == 1]
    if not s1:
        raise SystemExit('no stage-1 frames in ' + outdir)
    for r0 in OFFSETS:
        r1 = min(r0 + 48, HUD_ROW)
        o = [stats(a[r0:r1, 20:300]) for a in s1]
        med = {k: float(np.median([x[k] for x in o])) for k in o[0]}
        print(f'    rows[{r0},{r1}) n={len(s1)}  foam {med["foam"]:5.1f}%  '
              f'comps {med["n"]:5.0f}  dens {med["dens"]:5.2f}/kpx  '
              f'w {med["w50"]:.0f}/{med["w90"]:.0f}/{med["wmax"]:.0f}  '
              f'h90 {med["h90"]:.0f} hmax {med["hmax"]:.0f}  '
              f'area {med["a50"]:.0f}/{med["amax"]:.0f}')


def arcade():
    print('  ARCADE t116, same screen fraction, same clipped patches:')
    for r0 in OFFSETS:
        r1 = min(r0 + 48, HUD_ROW)
        a = stats(arcade_patch(patch=(r0, r1, 20, 300))[0])
        print(f'    rows[{r0},{r1})          foam {a["foam"]:5.1f}%  comps {a["n"]:5d}  '
              f'dens {a["dens"]:5.2f}/kpx  w {a["w50"]:.0f}/{a["w90"]:.0f}/{a["wmax"]:.0f}  '
              f'h90 {a["h90"]:.0f} hmax {a["hmax"]:.0f}  area {a["a50"]:.0f}/{a["amax"]:.0f}')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--scales', default='1.0')
    ap.add_argument('--keys', nargs='*', default=[],
                    help='key=v1,v2 ... extra STAGE_1.terrain keys, swept as a cross '
                         'product with --scales')
    ap.add_argument('--out-root', required=True)
    ap.add_argument('--frames', type=int, default=20)
    ap.add_argument('--every', type=int, default=71)
    ap.add_argument('--arcade-only', action='store_true')
    a = ap.parse_args()
    if a.arcade_only:
        arcade()
        return
    base = get_base()
    print('base cell sizes:', base)
    arcade()
    import itertools
    names, grids = [], []
    for kv in a.keys:
        nm, vs = kv.split('=')
        names.append(nm)
        grids.append(vs.split(','))
    orig = {nm: re.search(rf'^\s*{nm}:\s*([-\d.]+),', read_block()[0][read_block()[1]:read_block()[2]], re.M).group(1)
            for nm in names}
    seen = {}
    try:
        for ks, combo in itertools.product(a.scales.split(','), itertools.product(*grids) or [()]):
            k = float(ks)
            set_scale(base, k)
            for nm, v in zip(names, combo):
                src, i, j = read_block()
                seg = re.sub(rf'^(\s*){nm}:\s*[-\d.]+,', rf'\g<1>{nm}: {v},',
                             src[i:j], count=1, flags=re.M)
                open(STAGE_JS, 'w').write(src[:i] + seg + src[j:])
            tag = f'k{ks}' + ''.join(f'_{nm}{v}' for nm, v in zip(names, combo))
            # Print the ABSOLUTE cell sizes this row actually ran with. The
            # scale is relative to whatever is in stage.js when the sweep
            # starts, so running a 0.58 sweep against an already-0.58-baked
            # file silently measures 0.34. That happened once in R7 and the
            # byte-identical-rows detector cannot see it -- the rows differ,
            # they are just all at the wrong scale. Printing the absolute
            # numbers is what makes it visible.
            print('    effective cell sizes:',
                  {kk: round(base[kk] * k, 4) for kk in KEYS})
            outdir = os.path.join(a.out_root, tag)
            if os.path.isdir(outdir):
                shutil.rmtree(outdir)
            r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'capture.mjs'),
                                '--out', outdir, '--frames', str(a.frames),
                                '--every', str(a.every), '--url-params', 'seed=1&nocombat=1'],
                               capture_output=True, text=True, cwd=ROOT)
            for line in (r.stdout + r.stderr).splitlines():
                if not line.startswith('captured'):
                    print('    capture: ' + line)
            if r.returncode != 0:
                raise SystemExit(f'capture FAILED (exit {r.returncode})')
            files = sorted(glob.glob(os.path.join(outdir, 'frame-*.png')))
            h = hashlib.md5(b''.join(open(f, 'rb').read() for f in files)).hexdigest()
            print(f'--- {tag}')
            if h in seen:
                print(f'    !! BYTE-IDENTICAL to {seen[h]} -- row discarded')
                continue
            seen[h] = tag
            measure(outdir)
            sys.stdout.flush()
    finally:
        set_scale(base, 1.0)
        for nm, v in orig.items():
            src, i, j = read_block()
            seg = re.sub(rf'^(\s*){nm}:\s*[-\d.]+,', rf'\g<1>{nm}: {v},', src[i:j], count=1, flags=re.M)
            open(STAGE_JS, 'w').write(src[:i] + seg + src[j:])
        print('restored base cell sizes and', orig)


if __name__ == '__main__':
    main()
