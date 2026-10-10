#!/usr/bin/env python3
"""KNOWN-QUALITY PAIR -- the validation every quality statistic in this project is missing.

Why this file exists
--------------------
R9 published DRAW-WEIGHT, this project's first criterion for DRAWING rather
than colour, value or silhouette topology. It was validated against
synthetics, against rigid rotation, against two independent implementations,
against three mask rules, and against our own alpha channel.

It was never once run on two real drawings whose relative quality was
already settled. The R9 art critic ran that test and the gated statistic
RANKED THE WORSE DRAWING HIGHER.

  A synthetic control proves an operator COMPUTES WHAT IT SAYS.
  It cannot prove a QUALITY STATISTIC RANKS CORRECTLY.
  Those are different claims and this project had only ever tested the first.

A synthetic cannot test ranking because the person who builds it chooses
which arm is "better" -- the answer is an input. A known-quality pair's
answer comes from outside the instrument: from a redraw the project has
already accepted, or from an independent critic who ranked the two before
any number existed.

What a pair IS, and the three ways one can fail to be one
--------------------------------------------------------
A pair qualifies when (1) both arms are REAL subjects from this build,
(2) their relative quality was settled BEFORE and INDEPENDENTLY of the
statistic under test, and (3) the comparison is inside the statistic's own
licence (matched span, matched palette, named mask -- whatever that
statistic requires).

  NOT a pair: two arms of a synthetic. The answer is chosen.
  NOT a pair: a self-reported improvement by the lane that drew it, if the
              statistic under test is the lane's own. That is circular.
  WEAK pair:  two DIFFERENT subjects ranked by a critic. Legitimate, but it
              confounds "which drawing is better" with "which aircraft is
              which", and it is where the licence conditions bite hardest.

This tool uses git history as the pair source: a sheet before and after a
redraw the project has accepted is a same-subject pair, and the direction is
not the instrument's to choose.

Mask
----
Our own sheets carry an ALPHA CHANNEL, which is ground truth, so for
our-side-only pairs there is NO MASK DISCRETION AT ALL -- the single largest
source of disagreement in DRAW-WEIGHT's history (REFERENCE: ink 909 vs 1056,
RP90 7.51 vs 9.73 on one frame under two mask rules) is removed by
construction. That is why the pair test is cheap and why it should have been
run first.

Definitions are IMPORTED from tools/art/inkspan.py, not restated. Two
operators under one name is ledger rows 14, 22, 27 and 34.

Usage
-----
  python3 tools/known_quality_pair.py --selftest
  python3 tools/known_quality_pair.py --pairs --out tools/out/criteria-r10/<dir>
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'art'))
import inkspan  # noqa: E402  the licensed instrument; definitions are its, not ours

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ---------------------------------------------------------------------------
# the subject under test: DRAW-WEIGHT, through the licensed instrument
# ---------------------------------------------------------------------------

def draw_weight(rgba):
    """Every DRAW-WEIGHT statistic, on the alpha mask (ground truth).

    Steps 2 and 3 of the licensed membership rule still apply -- largest
    8-connected component, then fill background not 4-connected to the
    border. Step 1 (colour membership) is replaced by alpha, which is what
    makes this a discretion-free reading.
    """
    m = inkspan.mask_alpha(rgba)
    if not m.any():
        return None
    n_before = _components(m)
    m = inkspan.largest_component(m)
    m = inkspan.fill_holes(m)
    s = inkspan.stats(m, rgb=rgba[:, :, :3])
    s['components'] = n_before          # blind spot #3: if not 1, publish it
    s['bbox_fill'] = _bbox_fill(m)
    return s


def _components(m):
    lbl, n = inkspan.largest_component.__globals__['_label'](m) if False else (None, None)
    # inkspan has no exported label count; do an 8-connected flood here.
    seen = np.zeros_like(m)
    cnt = 0
    h, w = m.shape
    for y in range(h):
        for x in range(w):
            if m[y, x] and not seen[y, x]:
                cnt += 1
                stack = [(y, x)]
                seen[y, x] = True
                while stack:
                    cy, cx = stack.pop()
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            ny, nx = cy + dy, cx + dx
                            if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                                seen[ny, nx] = True
                                stack.append((ny, nx))
    return cnt


def _bbox_fill(m):
    ys, xs = np.nonzero(m)
    area = (ys.max() - ys.min() + 1) * (xs.max() - xs.min() + 1)
    return round(100.0 * m.sum() / area, 1)


# ---------------------------------------------------------------------------
# the art critic's candidate: INTERNAL LINE-WORK DENSITY (LINEWORK)
# ---------------------------------------------------------------------------
# Licensed verbatim from judging/R9/art-critique.md §5:
#   "adjacent in-ink pixel pairs differing by more than one ladder rung,
#    per 100 ink px.  Control: 0.0 on a flat fill, 95.0 on 1 px stripes."
#
# "Ladder rung" is the one term the critique leaves to the reader, so this
# file PINS IT and says so: a rung is a step on the value ladder, and the
# operational test used here is a VALUE difference, max(RGB) scaled to
# [0,1], exceeding RUNG. The critic's two control values are the check that
# the pinning is the same one they used -- see --selftest.

RUNG = 1.0 / 8.0        # one rung of an 8-level ladder; see Criterion A3


def _value(rgb):
    return rgb.astype(np.float64).max(axis=2) / 255.0


def linework(rgba, mask=None, rung=RUNG):
    m = inkspan.mask_alpha(rgba) if mask is None else mask
    ink = int(m.sum())
    if ink == 0:
        return None
    v = _value(rgba[:, :, :3])
    pairs = 0
    # 4-adjacency: each unordered in-ink pair counted once
    for dy, dx in ((0, 1), (1, 0)):
        a = m[: m.shape[0] - dy, : m.shape[1] - dx]
        b = m[dy:, dx:]
        both = a & b
        if not both.any():
            continue
        va = v[: v.shape[0] - dy, : v.shape[1] - dx][both]
        vb = v[dy:, dx:][both]
        pairs += int((np.abs(va - vb) > rung).sum())
    return round(100.0 * pairs / ink, 1)


# ---------------------------------------------------------------------------
# the art critic's REJECTED candidate: runs per row. Re-run, not re-derived.
# ---------------------------------------------------------------------------

def runs_per_row(rgba, mask=None):
    m = inkspan.mask_alpha(rgba) if mask is None else mask
    rows, runs = 0, 0
    for row in m:
        if not row.any():
            continue
        rows += 1
        runs += int(np.sum(row[1:] & ~row[:-1])) + int(row[0])
    return round(runs / rows, 2) if rows else None


# ---------------------------------------------------------------------------
# cells
# ---------------------------------------------------------------------------

def load(path_or_bytes):
    if isinstance(path_or_bytes, bytes):
        import io
        im = Image.open(io.BytesIO(path_or_bytes))
    else:
        im = Image.open(path_or_bytes)
    return np.array(im.convert('RGBA'))


def cell(a, index, cw, ch=None):
    ch = ch or a.shape[0]
    return a[0:ch, index * cw:(index + 1) * cw]


def git_blob(rev, path):
    return subprocess.run(['git', '-C', REPO, 'show', f'{rev}:{path}'],
                          capture_output=True, check=True).stdout


# ---------------------------------------------------------------------------
# controls
# ---------------------------------------------------------------------------

def _rgba(h, w, fill=(255, 255, 255, 255)):
    a = np.zeros((h, w, 4), np.uint8)
    a[:, :] = fill
    return a


def selftest():
    ok = []

    # 1. LINEWORK returns the art critic's two published control values.
    #    This is how we know the "ladder rung" pinning above is theirs.
    flat = _rgba(20, 20)
    c_flat = linework(flat)
    stripes = _rgba(20, 20)
    stripes[:, ::2, :3] = 0          # 1 px vertical stripes, full contrast
    c_str = linework(stripes)
    ok.append(('1 LINEWORK controls: flat 0.0, 1px stripes ~95',
               f'flat {c_flat}  stripes {c_str}',
               c_flat == 0.0 and 90.0 <= c_str <= 100.0))

    # 2. LINEWORK IS PALETTE-SENSITIVE -- the critic's own stated limit,
    #    reproduced rather than taken on trust. Same drawing, fewer rungs.
    half = _rgba(20, 20)
    half[:, ::2, :3] = 235           # (255-235)/255 = 0.078, SMALLER than one rung
    ok.append(('2 the stated palette-sensitivity is real: a sub-rung step scores 0',
               f'{linework(half)} on an ARRANGEMENT identical to control 1 (95.0)',
               linework(half) == 0.0))

    # 3. LINEWORK IS SCALE-SENSITIVE -- the second stated limit. 2x nearest
    #    changes no pixel of the drawing and must not be compared across it.
    big = np.kron(stripes, np.ones((2, 2, 1), np.uint8))
    ok.append(('3 the stated scale-sensitivity is real: 2x nearest moves it',
               f'1x {c_str} -> 2x {linework(big)}',
               linework(big) < c_str * 0.75))

    # 4. runs-per-row discriminates a bar from blades (so a null result on
    #    the real pair is a thinness result, not a broken operator).
    bar = _rgba(20, 20, (0, 0, 0, 0))
    bar[8:12, :] = (255, 255, 255, 255)
    comb = _rgba(20, 20, (0, 0, 0, 0))
    comb[:, 2:4] = comb[:, 8:10] = comb[:, 14:16] = (255, 255, 255, 255)
    ok.append(('4 runs-per-row control: bar 1.00, three strokes 3.00',
               f'bar {runs_per_row(bar)}  comb {runs_per_row(comb)}',
               runs_per_row(bar) == 1.0 and runs_per_row(comb) == 3.0))

    # 5. the alpha mask is the ground truth it is claimed to be: a known
    #    hole-free rect returns its own area and one component.
    rect = _rgba(20, 30, (0, 0, 0, 0))
    rect[5:15, 6:24] = (255, 255, 255, 255)
    s = draw_weight(rect)
    ok.append(('5 alpha mask on a known rect: ink 180, 1 component, fill 100 %',
               f"ink {s['ink']}  components {s['components']}  fill {s['bbox_fill']}",
               s['ink'] == 180 and s['components'] == 1 and s['bbox_fill'] == 100.0))

    # 6. THE RANKING DIRECTION THE TEST EXISTS TO CHECK, on a synthetic whose
    #    answer we DO know -- a filled slab against separated blades at
    #    matched ink and span is the R4->R8 defect, and RP90 must rank the
    #    blades lighter. This is a POSITIVE control on the gate, i.e. proof
    #    the harness would SHOW a correct ranking if one were there.
    blades = inkspan._blade_fig(3, span=100, size=160, fill=False)
    slab = inkspan._bar(58.0, int(blades.sum()), size=90)
    sb = inkspan.stats(blades)
    ss = inkspan.stats(slab)
    ok.append(('6 positive control: RP90 ranks separated blades below a slab',
               f"blades RP90 {sb['RP90']} < slab RP90 {ss['RP90']}",
               sb['RP90'] < ss['RP90']))

    print('KNOWN-QUALITY PAIR -- controls')
    for name, got, good in ok:
        print(f"  [{'ok' if good else 'FAIL'}] {name}\n        {got}")
    bad = [n for n, _, g in ok if not g]
    print(f"\nCONTROLS: {'PASS' if not bad else 'FAIL ' + str(bad)}  ({len(ok) - len(bad)}/{len(ok)})")
    return 1 if bad else 0


# ---------------------------------------------------------------------------
# the pairs
# ---------------------------------------------------------------------------
# Each row: (label, sheet, cell width, cell index, revision whose parent is the
# BEFORE and whose tree is the AFTER, who settled the direction).
#
# "settled by" is the field that makes a row a pair rather than an assertion.
# A row settled by the lane that drew it AND scored by that lane's own
# statistic is circular and is marked WEAK.
PAIRS = [
    ('player jet, R9 "blades with sky between them, not a filled mass"',
     'src/assets/sprites/player-f14.png', 100, 4, '010db2c',
     'R9 art critic, independently: "the player\'s wings have become blades", one of '
     '"four real things"'),
    ('player jet, R7 "the arcade\'s jet has no black outline"',
     'src/assets/sprites/player-f14.png', 100, 4, '2160842',
     'R8 judge + REFERENCE keyline criterion (ledger row 35)'),
    ('player jet, R6 "the jet is lit"',
     'src/assets/sprites/player-f14.png', 100, 4, 'a0826ea',
     'R6 judge: airframe VALUE band met; ledger row 11 retired the inverted ceiling'),
    ('player jet, R5 "the daylight jet was a different, worse drawing"',
     'src/assets/sprites/player-f14.png', 100, 4, '13ef30f',
     'WEAK -- the drawing lane\'s own commit message'),
    ('enemy interceptor head-on, R9 redraw',
     'src/assets/sprites/enemy-interceptor-head.png', 64, 0, '010db2c',
     'R9 art critic: "separated blades, dark-red shadow lines beside each one, a real '
     'fuselage and four value steps. It is good work."'),
    ('enemy prop head-on, R9 redraw',
     'src/assets/sprites/enemy-prop-head.png', 64, 0, '010db2c',
     'R8 named it a "solid filled delta"; R9 fixed it'),
    ('enemy grey head-on, R8->R9 enemy-art pass',
     'src/assets/sprites/enemy-grey-head.png', 64, 0, '1783060',
     'WEAK -- lane commit "the class got fixed, not the object"'),
    ('enemy interceptor head-on, R8->R9 enemy-art pass',
     'src/assets/sprites/enemy-interceptor-head.png', 64, 0, '1783060',
     'WEAK -- same commit'),
]

GATED = ('RP90',)
DIAG = ('RSW', 'DENS', 'ink_per_span', 'bbox_fill')


def run_pairs():
    print('KNOWN-QUALITY PAIR TEST -- DRAW-WEIGHT against pairs whose direction was')
    print('settled before and outside the statistic. Mask = ALPHA (ground truth), then')
    print('largest 8-connected component, then 4-connected background hole fill.')
    print('"ranks" = the statistic moves in the direction that calls the AFTER better,')
    print('i.e. LOWER (lighter) for every DRAW-WEIGHT statistic, which is how the')
    print('criterion\'s own prose reads it ("how heavily the object is drawn").\n')
    tally = {k: [0, 0, 0] for k in GATED + DIAG + ('LINEWORK', 'runs_per_row')}
    for label, path, cw, idx, rev, settled in PAIRS:
        try:
            before = cell(load(git_blob(rev + '^', path)), idx, cw)
            after = cell(load(git_blob(rev, path)), idx, cw)
        except subprocess.CalledProcessError:
            print(f'  -- {label}: sheet absent at {rev}^, skipped')
            continue
        if before.shape != after.shape:
            print(f'  -- {label}: cell geometry changed {before.shape} -> {after.shape};'
                  f' NOT a pair (the subject is not the same subject)')
            continue
        if (before == after).all():
            print(f'  -- {label}: cell {idx} byte-identical across {rev}, not a pair')
            continue
        sb, sa = draw_weight(before), draw_weight(after)
        print(f'### {label}')
        print(f'    {path} cell {idx}, {rev}^ -> {rev}   [{settled}]')
        sp = sa['span'] / sb['span']
        print(f"    span {sb['span']} -> {sa['span']}  (x{sp:.3f}"
              f"{'' if 0.9 <= sp <= 1.1 else '  ** OUTSIDE the matched-span licence **'})")
        for k in GATED + DIAG:
            d = 'ranks' if sa[k] < sb[k] else ('INVERTED' if sa[k] > sb[k] else 'tied')
            tag = ' <= GATED' if k in GATED else ''
            print(f"    {k:14s} {sb[k]:8.2f} -> {sa[k]:8.2f}   {d}{tag}")
            tally[k][0 if d == 'ranks' else (1 if d == 'INVERTED' else 2)] += 1
        for k, fn, better_hi in (('LINEWORK', linework, True),
                                 ('runs_per_row', runs_per_row, True)):
            vb, va = fn(before), fn(after)
            d = 'ranks' if (va > vb) == better_hi and va != vb else ('tied' if va == vb else 'INVERTED')
            print(f'    {k:14s} {vb:8.2f} -> {va:8.2f}   {d}   (higher = better)')
            tally[k][0 if d == 'ranks' else (1 if d == 'INVERTED' else 2)] += 1
        print()
    print('TALLY over the pairs above (ranks / INVERTED / tied):')
    for k, v in tally.items():
        print(f'    {k:14s} {v[0]} / {v[1]} / {v[2]}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if '--pairs' in args:
        run_pairs()
        sys.exit(0)
    if not args or '--selftest' in args:
        sys.exit(selftest())
