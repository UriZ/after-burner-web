#!/usr/bin/env python3
"""R7 gap-1 reproduction: Criterion A on digit-verified stage-1 frames, by
isolation arm, with the corruption sweep the result is only worth anything
with.

The judge's R6 gap 1 states the reproduction as: on digit-verified stage-1
frames captured in ordinary play (?fixed=1&seed=N&invincible=1) at >=3 tick
spacings, <=256 unique colours and <=32 channel values (union) on EVERY frame,
and each isolation arm passing the same gate on its own. This runs exactly
that, and it is deliberately a different program from
tools/measure_criterion_ab.py (which is the canonical A/B instrument) in three
ways that the gap needs:

  * every frame's STAGE DIGIT is read and a frame that is not stage 1 is
    EXCLUDED rather than measured. REFERENCE ledger rows 11 and 12 are two
    criteria that were correctly measured on the wrong stage's frame, and the
    only thing that catches that is reading the digit.
  * the sweep covers black frames, byte duplicates AND near-duplicates. A
    stalled live frame differing in a handful of pixels is invisible to an
    md5 sweep and still double-counts in a pooled distribution.
  * it reports, per frame, how many channel values are OFF REFERENCE.md's
    enumerated hardware ladder. That is not the gate (REFERENCE.md says
    explicitly not to make it one), but it is the quantity that explains
    whether a near-miss on A2 is art or arithmetic: a frame whose every
    channel value is on the 31-rung ladder cannot exceed 31.

--selftest plants a black frame, an exact duplicate and a one-native-texel
near-duplicate into a set of real frames and requires all three to be found.
A sweep that has not been shown a fault is not a sweep.

Usage:
  python3 tools/measure_fx_gate.py --selftest --source <a real capture dir>
  python3 tools/measure_fx_gate.py --label "ordinary play" --dirs tools/out/fx-r7/f-play-*
  python3 tools/measure_fx_gate.py --dirs <dirs> --stage 2
"""
import argparse
import glob
import hashlib
import os
import shutil
import sys
import tempfile

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from measure_criterion_ab import to_native, load_rgb, criterion_a  # noqa: E402
from measure_hud_insitu import read_stage_digit  # noqa: E402

# REFERENCE.md "Criterion A": the 31 channel values present in
# ab2-arcade-desert.png. A table, not a formula — see that section.
SEGA_LADDER = [0, 16, 25, 33, 41, 49, 58, 66, 74, 82, 91, 99, 107, 115, 123, 132,
               140, 148, 156, 164, 173, 181, 189, 197, 206, 214, 222, 230, 239, 247, 255]

NEAR_DUP_FRAC = 0.001  # pairs differing in fewer than 0.1% of native pixels


def channel_values(native):
    s = set()
    for c in range(3):
        s |= set(np.unique(native[:, :, c]).tolist())
    return s


def measure(dirs, label, stage='1', quiet=False):
    paths = []
    for d in dirs:
        paths += sorted(glob.glob(os.path.join(d, 'frame-*.png')))
    if not paths:
        raise SystemExit(f'{label}: no frames in {dirs}')

    rows = []
    black = []
    wrong_stage = []
    md5 = {}
    per_dir = {}
    for p in paths:
        n = to_native(load_rgb(p))
        if n.max() == 0:
            black.append(p)
            continue
        md5.setdefault(hashlib.md5(n.tobytes()).hexdigest(), []).append(p)
        per_dir.setdefault(os.path.dirname(p), []).append((os.path.basename(p), n))
        digit = read_stage_digit(n)
        if digit != stage:
            wrong_stage.append((p, digit))
            continue
        colours, chan_union, _ = criterion_a(n)
        off = len([v for v in channel_values(n) if v not in SEGA_LADDER])
        rows.append((p, colours, chan_union, off))

    dups = {k: v for k, v in md5.items() if len(v) > 1}
    near = []
    for d, frames in per_dir.items():
        for i in range(len(frames)):
            for j in range(i + 1, len(frames)):
                diff = (frames[i][1] != frames[j][1]).any(axis=2).mean()
                if 0 < diff < NEAR_DUP_FRAC:
                    near.append((os.path.basename(d), frames[i][0], frames[j][0], float(diff)))

    cols = [r[1] for r in rows]
    chs = [r[2] for r in rows]
    offs = [r[3] for r in rows]
    over = sum(1 for c in chs if c > 32)
    if not quiet:
        print(f'{label}: {len(rows)} digit-verified stage-{stage} frames of {len(paths)} '
              f'across {len(dirs)} capture dirs')
        print(f'   colours   min/med/max {min(cols)}/{int(np.median(cols))}/{max(cols)}'
              f'    GATE <=256  {"PASS" if max(cols) <= 256 else "FAIL"}')
        print(f'   chanVals  min/med/max {min(chs)}/{int(np.median(chs))}/{max(chs)}'
              f'    GATE <=32   {"PASS" if over == 0 else "FAIL"}   (frames over: {over}/{len(chs)})')
        print(f'   off-ladder channel values per frame  min/max {min(offs)}/{max(offs)}')
        print(f'   sweep: {len(black)} black, {len(dups)} byte-duplicate groups, '
              f'{len(near)} near-duplicate pairs')
        if black:
            print(f'     BLACK: {[os.path.basename(b) for b in black]}')
        if dups:
            print(f'     DUPS: {[[os.path.basename(x) for x in v] for v in dups.values()]}')
        if near:
            print(f'     NEAR: {near}')
        if wrong_stage:
            got = sorted({str(d) for _, d in wrong_stage})
            print(f'   excluded, stage digit not {stage}: {len(wrong_stage)} (read {got})')
    return {
        'n': len(rows), 'colours': cols, 'chan': chs, 'off': offs,
        'black': black, 'dups': dups, 'near': near, 'wrong_stage': wrong_stage,
        'pass': max(cols) <= 256 and over == 0,
    }


def selftest(source):
    frames = sorted(glob.glob(os.path.join(source, 'frame-*.png')))
    if len(frames) < 4:
        raise SystemExit(f'--selftest needs a capture dir with >=4 frames; {source} has {len(frames)}')
    tmp = tempfile.mkdtemp(prefix='fxgate-selftest-')
    try:
        for i, f in enumerate(frames[:4]):
            shutil.copy(f, os.path.join(tmp, f'frame-{i:04d}.png'))
        ref = np.asarray(Image.open(os.path.join(tmp, 'frame-0000.png')).convert('RGB'))
        Image.fromarray(np.zeros_like(ref)).save(os.path.join(tmp, 'frame-0004.png'))
        shutil.copy(os.path.join(tmp, 'frame-0001.png'), os.path.join(tmp, 'frame-0005.png'))
        a = np.asarray(Image.open(os.path.join(tmp, 'frame-0002.png')).convert('RGB')).copy()
        # One NATIVE texel. The capture is a 3x block upscale of 320x224, so the
        # plant has to be block-aligned or to_native's own block check rejects
        # it first -- which is itself a control worth knowing passes.
        a[99:102, 99:102] = (255, 0, 255)
        Image.fromarray(a).save(os.path.join(tmp, 'frame-0006.png'))
        r = measure([tmp], 'PLANTED-FAULT CONTROL', quiet=True)
        checks = [
            ('black frame found', len(r['black']) == 1, len(r['black'])),
            ('exact duplicate found', len(r['dups']) == 1, len(r['dups'])),
            ('one-texel near-duplicate found', len(r['near']) == 1, len(r['near'])),
            ('the 4 clean frames still measured', r['n'] == 6, r['n']),
        ]
        ok = True
        for name, good, got in checks:
            ok &= good
            print(f'  {"PASS" if good else "FAIL"}  {name}: {got}')
        print('SELFTEST', 'PASS' if ok else 'FAIL')
        return ok
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dirs', nargs='*', default=[])
    ap.add_argument('--label', default='arm')
    ap.add_argument('--stage', default='1')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--source', help='a real capture dir for --selftest to plant faults into')
    args = ap.parse_args()
    if args.selftest:
        if not args.source:
            raise SystemExit('--selftest needs --source <a real capture dir>')
        sys.exit(0 if selftest(args.source) else 1)
    if not args.dirs:
        raise SystemExit('--dirs or --selftest')
    r = measure(args.dirs, args.label, stage=args.stage)
    sys.exit(0 if r['pass'] else 3)


if __name__ == '__main__':
    main()
