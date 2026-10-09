#!/usr/bin/env python3
"""R7 gap 2 — parameter sweep for stage 3's night ground.

Harness hardening, all three rules earned in this lane in R6 (see
judging/R6/lane-world.md §0.3) and applied here:

  * capture's stderr is NEVER suppressed -- its success lines are filtered,
    the stream is not discarded, and a non-zero exit aborts the row.
  * every row gets a FRESH output directory, deleted first if present. A
    reused directory is what turns "capture failed" into "measured the
    previous row's frames".
  * two rows returning IDENTICAL numbers are treated as a failed run until
    disproved: the script hashes each row's frames and refuses to report a
    row whose frame set is byte-identical to an earlier row's.

Sweeps on the ISOLATED preview harness (tools/clouds-preview.html?stage=3),
which has no HUD, no player sprite and no stage card, so what is measured is
this lane's own output. Every shipped value is re-verified in situ on the
real game afterwards.
"""
import argparse
import hashlib
import glob
import itertools
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
STAGE_JS = os.path.join(ROOT, 'src', 'game', 'stage.js')


def set_param(block_name, key, value):
    """Set `key: value,` inside the named exported stage's terrain block."""
    src = open(STAGE_JS).read()
    i = src.index(f'export const {block_name} =')
    j = src.index('export const', i + 10) if 'export const' in src[i + 10:] else len(src)
    seg = src[i:j]
    pat = re.compile(rf'^(\s*){re.escape(key)}:\s*[-\d.]+,', re.M)
    if not pat.search(seg):
        raise SystemExit(f'{key} not found in {block_name}; add it first so the sweep '
                         'cannot silently write a key nothing reads')
    seg2 = pat.sub(lambda m: f'{m.group(1)}{key}: {value},', seg, count=1)
    open(STAGE_JS, 'w').write(src[:i] + seg2 + src[j:])


def get_param(block_name, key):
    src = open(STAGE_JS).read()
    i = src.index(f'export const {block_name} =')
    j = src.index('export const', i + 10)
    m = re.search(rf'^\s*{re.escape(key)}:\s*([-\d.]+),', src[i:j], re.M)
    return m.group(1) if m else None


def capture(outdir, frames, every, params, page):
    if os.path.isdir(outdir):
        shutil.rmtree(outdir)
    cmd = ['node', os.path.join(ROOT, 'tools', 'capture.mjs'), '--out', outdir,
           '--frames', str(frames), '--every', str(every), '--url-params', params,
           '--page', page]
    r = subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)
    for line in (r.stdout + r.stderr).splitlines():
        if not line.startswith('captured'):
            print('    capture: ' + line)
    if r.returncode != 0:
        raise SystemExit(f'capture FAILED (exit {r.returncode}) -- aborting the sweep '
                         'rather than measuring a stale directory')
    files = sorted(glob.glob(os.path.join(outdir, 'frame-*.png')))
    if len(files) != frames:
        raise SystemExit(f'capture produced {len(files)} of {frames} frames')
    return hashlib.md5(b''.join(open(f, 'rb').read() for f in files)).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--stage-block', default='STAGE_3')
    ap.add_argument('--keys', nargs='+', required=True,
                    help='key=v1,v2,v3 ... swept as a full cross product')
    ap.add_argument('--out-root', required=True)
    ap.add_argument('--page', default='/tools/clouds-preview.html')
    ap.add_argument('--url-params', default='stage=3')
    ap.add_argument('--frames', type=int, default=4)
    ap.add_argument('--every', type=int, default=211)
    ap.add_argument('--measure', default='night', choices=('night', 'dash'))
    ap.add_argument('--dash-offsets', default='150,160,170')
    a = ap.parse_args()

    names, grids = [], []
    for kv in a.keys:
        k, vs = kv.split('=')
        names.append(k)
        grids.append(vs.split(','))
    originals = {k: get_param(a.stage_block, k) for k in names}
    print('restoring on exit:', originals)

    seen_hash = {}
    try:
        for combo in itertools.product(*grids):
            tag = '_'.join(f'{k}{v}' for k, v in zip(names, combo))
            for k, v in zip(names, combo):
                set_param(a.stage_block, k, v)
            outdir = os.path.join(a.out_root, tag)
            print(f'--- {tag}')
            h = capture(outdir, a.frames, a.every, a.url_params, a.page)
            if h in seen_hash:
                print(f'    !! BYTE-IDENTICAL to row {seen_hash[h]} -- '
                      'at least one of the two runs did not happen. Row discarded.')
                continue
            seen_hash[h] = tag
            if a.measure == 'night':
                r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'measure_night_ground.py'),
                                    '--dir', outdir, '--quiet-frames', '--no-extremes'],
                                   capture_output=True, text=True, cwd=ROOT)
                keep = [ln for ln in r.stdout.splitlines()
                        if any(ln.strip().startswith(x) for x in
                               ('band_V', 'bg_V ', 'bg_top_share', 'bg_colours', 'light_share', 'band_H'))]
                print('\n'.join('    ' + x for x in keep))
                sys.stdout.flush()
            else:
                for off in a.dash_offsets.split(','):
                    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'measure_sea_dashes.py'),
                                        '--dir', outdir, '--rows', off, '--quiet-frames'],
                                       capture_output=True, text=True, cwd=ROOT)
                    print(f'    rows {off}: ' + (r.stdout.strip().splitlines() or ['(no output)'])[-1])
                    sys.stdout.flush()
    finally:
        for k, v in originals.items():
            if v is not None:
                set_param(a.stage_block, k, v)
        print('restored', originals)


if __name__ == '__main__':
    main()
