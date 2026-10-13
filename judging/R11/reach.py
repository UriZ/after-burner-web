#!/usr/bin/env python3
"""ENGAGEABLE FRACTION — how much of the traffic the player can physically
bring the lock cone onto, from `judging/R11/reach_probe.mjs` output.

                        --- THE OPERATOR ---

An enemy is ENGAGEABLE if there exists a tick of its life at which some
REACHABLE player position puts it inside the lock cone, in the lock test's own
units (`lockSystem.js:_lockable`):

    dx = (e.ndc.x - p.x) * 0.5
    dy = (e.ndc.y - p.y) * 0.5 * (224/320)
    lockable  <=>  dx^2 + dy^2 <= LOCK_RADIUS_FRAC^2
                   AND LOCK_DEPTH_MIN <= e.d <= LOCK_DEPTH_MAX

THE REACHABLE SET IS A POINT CLOUD, NOT A BOX. In the basis the lock test uses
(`space.worldToNdc`, which rotates with the world roll) a LATERAL stick input
also moves the player VERTICALLY, because it rolls the jet. The probe samples
the set on a grid of held stick positions; this reads that cloud and takes the
minimum lock distance over it. A box through the four rails would claim corners
the player cannot hold and would overstate what is engageable.

IT IS AN UPPER BOUND, deliberately. The player is given its best position at
every instant with no travel time, no reaction and no competing target. What
this calls unengageable cannot be engaged by anyone.

Usage: reach.py LABEL file.json [LABEL file.json ...]
"""
import sys, json, math

# Mirrored from src/weapons/lockSystem.js. A mirror is a known staleness risk
# (this repo has paid for one), so it is asserted against the file rather than
# trusted: see `_check_mirror`.
LOCK_RADIUS_FRAC = 0.083
LOCK_DEPTH_MIN = 26.0
LOCK_DEPTH_MAX = 88.0
ASPECT = 224.0 / 320.0


def _check_mirror(path='src/weapons/lockSystem.js'):
    import re, os
    if not os.path.exists(path):
        print(f'reach.py: WARNING cannot verify the mirror, {path} not found')
        return
    src = open(path).read()
    for name, want in (('LOCK_RADIUS_FRAC', LOCK_RADIUS_FRAC),
                       ('LOCK_DEPTH_MIN', LOCK_DEPTH_MIN),
                       ('LOCK_DEPTH_MAX', LOCK_DEPTH_MAX)):
        m = re.search(r'const\s+%s\s*=\s*([0-9.]+)' % name, src)
        if not m:
            raise SystemExit(f'reach.py: {name} not found in {path} — FIX THE TOOL')
        if abs(float(m.group(1)) - want) > 1e-9:
            raise SystemExit(
                f'reach.py: {name} is {m.group(1)} in {path} but {want} here. '
                f'The mirror is STALE — fix it rather than running blind.')


# The sight's offset from the airframe, from src/weapons/combat.js:
# SIGHT_NDC_Y_OFFSET = 0.30, taken along SCREEN UP. At zero roll that is
# exactly (0, +0.30) in NDC.
SIGHT_NDC_Y_OFFSET = 0.30


def load(path):
    """The player's reachable cone-centre set, at ZERO ROLL.

    WHY ZERO ROLL, AND WHY THAT IS THE CONSERVATIVE CHOICE. In the basis the
    lock test uses, rolling the jet swings the whole enemy field around the
    roll-compensated airframe, so a rolled player reaches FURTHER than an
    unrolled one — the probe's grid shows `playerNdc.x` reaching +-0.4315 NDC
    against the airframe's own +-0.2027. Rolling is therefore extra reach, and
    counting it would make this an upper bound on an upper bound.

    It is also not a set the player can simply BE in. player.js is a RATE
    controller: the stick commands a velocity, so zero stick HOLDS position and
    a held stick both rolls the jet AND slides it. At the shipped RATE_X of
    2.82 world units/s a full-stick hold crosses 85 % of the 0.733 envelope in
    one LOCK_ACQUIRE_S, so "parked at the rail at full roll" is not a state a
    lock can be completed from. The probe's stick grid measures a
    PATH-DEPENDENT set for exactly that reason and its extremes are reported
    but not used here.

    So the set used is the one that is unambiguously holdable: the airframe
    anywhere inside its own measured SCREEN envelope, at zero roll, with the
    sight 0.30 NDC above it. At zero roll `playerNdc` and `jetNdc` coincide
    exactly (verified in the probe output), so the two bases cannot be
    confused here.
    """
    d = json.load(open(path))
    g = d['box']['grid']
    jx = [r[4] for r in g]
    jy = [r[5] for r in g]
    x0, x1 = min(jx), max(jx)
    y0, y1 = min(jy), max(jy)
    # the cone centre is the SIGHT: the airframe box lifted by its offset
    return d, (x0, x1, y0 + SIGHT_NDC_Y_OFFSET, y1 + SIGHT_NDC_Y_OFFSET)


def min_lock_dist(ex, ey, box):
    """Distance from the enemy to the NEAREST point of the reachable sight
    box, in the lock test's own units."""
    x0, x1, y0, y1 = box
    cx = min(max(ex, x0), x1)
    cy = min(max(ey, y0), y1)
    dx = (ex - cx) * 0.5
    dy = (ey - cy) * 0.5 * ASPECT
    return math.hypot(dx, dy)


def min_lock_dx(ex, box):
    x0, x1 = box[0], box[1]
    return abs(ex - min(max(ex, x0), x1)) * 0.5


def analyse(path):
    d, box = load(path)
    per = {}
    for tick, eid, pattern, ex, ey, depth, span in d['rows']:
        e = per.setdefault(eid, dict(pattern=pattern, best=float('inf'),
                                     bestx=float('inf'), n=0, nlock=0,
                                     _absx=float('inf')))
        e['n'] += 1
        if not (LOCK_DEPTH_MIN <= depth <= LOCK_DEPTH_MAX):
            continue
        e['nlock'] += 1
        if abs(ex) < e.get('_absx', float('inf')):
            e['_absx'] = abs(ex)
        dist = min_lock_dist(ex, ey, box)
        if dist < e['best']:
            e['best'] = dist
        # x-only: a NECESSARY condition, independent of the vertical, so a
        # target failing it cannot be reached by any amount of climbing
        dxo = min_lock_dx(ex, box)
        if dxo < e['bestx']:
            e['bestx'] = dxo
    out = dict(path=path, root=d.get('root'), n=len(per))
    eng = [k for k, v in per.items() if v['best'] <= LOCK_RADIUS_FRAC]
    engx = [k for k, v in per.items() if v['bestx'] <= LOCK_RADIUS_FRAC]
    inwin = [k for k, v in per.items() if v['nlock'] > 0]
    out['in_lock_window'] = len(inwin)
    out['engageable'] = len(eng)
    out['engageable_x_only'] = len(engx)
    out['frac'] = len(eng) / len(inwin) if inwin else float('nan')
    out['frac_x'] = len(engx) / len(inwin) if inwin else float('nan')
    by = {}
    for k, v in per.items():
        if v['nlock'] == 0:
            continue
        b = by.setdefault(v['pattern'], [0, 0])
        b[1] += 1
        if v['best'] <= LOCK_RADIUS_FRAC:
            b[0] += 1
    out['by_pattern'] = by
    # the distribution of how far OUT OF REACH the unreachable ones are, in %W
    miss = sorted(100 * (v['best'] - LOCK_RADIUS_FRAC)
                  for v in per.values() if v['nlock'] > 0 and v['best'] > LOCK_RADIUS_FRAC)
    out['miss_pct_w'] = miss
    # WHERE THE TRAFFIC ACTUALLY IS, laterally, during the lock window — the
    # quantity the spawn spread has to be matched to. One sample per enemy:
    # the |x| it is closest to reach at, in %W.
    out['closest_x_pct_w'] = sorted(100 * 0.5 * abs_
                                    for abs_ in (v['_absx'] for v in per.values() if v['nlock']))
    out['box'] = box
    return out


def main():
    _check_mirror()
    a = sys.argv[1:]
    print('%-34s %7s %7s %8s %8s   %s' %
          ('arm', 'in-win', 'engag.', 'frac', 'frac(x)', 'jet rail |x| %W'))
    rows = []
    for i in range(0, len(a), 2):
        lab, path = a[i], a[i + 1]
        r = analyse(path)
        rows.append((lab, r))
        print('%-34s %7d %7d %7.1f%% %7.1f%%   +-%.2f' % (
            lab, r['in_lock_window'], r['engageable'], 100 * r['frac'],
            100 * r['frac_x'], 50 * r['box'][1]))
    for lab, r in rows:
        print(f'\n{lab}  by pattern (engageable / in-window):')
        for p, (e, n) in sorted(r['by_pattern'].items()):
            print('    %-10s %3d / %3d  = %5.1f %%' % (p, e, n, 100 * e / n))
        c = r['closest_x_pct_w']
        if c:
            q = lambda f: c[min(len(c) - 1, int(len(c) * f))]
            print('    enemy |x| at its closest, %%W: p10 %.2f  median %.2f  p90 %.2f  max %.2f'
                  % (q(0.1), q(0.5), q(0.9), c[-1]))
        m = r['miss_pct_w']
        if m:
            q = lambda f: m[min(len(m) - 1, int(len(m) * f))]
            print('    unreachable by, %%W beyond the cone: p10 %.2f  median %.2f  p90 %.2f  max %.2f'
                  % (q(0.1), q(0.5), q(0.9), m[-1]))


if __name__ == '__main__':
    main()
