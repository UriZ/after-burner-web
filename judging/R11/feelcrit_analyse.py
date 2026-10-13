#!/usr/bin/env python3
"""Analyser for judging/R11/feelcrit_probe.mjs arms.

Every figure it prints is over CONSECUTIVE 60 Hz sim ticks (the probe takes one
sample per `window.__step(1)`), and every row names the tree sha the arm ran on.

  feelcrit_analyse.py validate  DIR...   the sight-frame known-answer test
  feelcrit_analyse.py hold      DIR...   did the hold controller hold?
  feelcrit_analyse.py kills     DIR...   kill table + aim error at the kill
  feelcrit_analyse.py aimerr    DIR...   achieved aim error per pilot
  feelcrit_analyse.py geom      DIR...   where the traffic crosses the screen
"""
import json, os, sys, math
from statistics import median, mean


def load(dirs):
    out = []
    for d in dirs:
        if os.path.isfile(d):
            out.append(json.load(open(d)))
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith('.json'):
                out.append(json.load(open(os.path.join(d, f))))
    return out


def tree(a):
    return os.path.basename(a['root']).replace('tree-', '')


def q(xs, p):
    if not xs:
        return float('nan')
    s = sorted(xs)
    i = min(len(s) - 1, max(0, int(round(p * (len(s) - 1)))))
    return s[i]


def cmd_validate(arms):
    """KNOWN-ANSWER TEST ON REAL FRAMES for the sight reconstruction.

    The answer is one the simulation already holds. `lockSystem.js:466` drops
    `tracked` the moment the aim leaves it, and `_lockable` is a hard radius
    test about `this.sight` in the PITCH-ONLY ndc frame. So on every tick where
    `__combatStats().trackedId` is non-null, that enemy is inside
    LOCK_RADIUS_FRAC of the real cone centre -- by construction, not by
    estimate. A correct reconstruction of the centre must report
    dist <= radius on 100.0 % of those ticks.

    `naive` is the discriminating control: the same test with the live-camera /
    nose-only aim point that `probe_r11.mjs` and `human_arm.mjs` steer their
    pilots on (`playerNdc.x`, `playerNdc.y + 0.30`). It is the SAME operator
    on a DIFFERENT aim point, so a gap between the two columns is the frame
    error and nothing else.

    `maxroll` is the validity floor for the test itself: at zero roll the two
    aim points coincide identically and the test cannot discriminate. Only an
    arm that banks can validate the reconstruction.
    """
    print(f'{"arm":30s} {"tree":8s} {"rad %W":>7s} {"ticks":>6s} {"tracked":>8s} '
          f'{"recon in":>9s} {"naive in":>9s} {"maxroll":>8s}')
    for a in arms:
        rad = (a.get('tunables') or {}).get('lockrad')
        rows = [r for r in a['rows'] if r.get('td') is not None]
        mr = max(abs(r['roll']) for r in a['rows'])
        if not rows or rad is None:
            print(f'{a["label"][:30]:30s} {tree(a):8s} {"?":>7s} {len(a["rows"]):6d} '
                  f'{len(rows):8d}  no tracked ticks / no radius readback')
            continue
        tol = 1e-9
        ok = sum(1 for r in rows if r['td'] <= rad + tol)
        okn = sum(1 for r in rows if r['tdn'] <= rad + tol)
        print(f'{a["label"][:30]:30s} {tree(a):8s} {100*rad:7.2f} {len(a["rows"]):6d} '
              f'{len(rows):8d} {100*ok/len(rows):8.1f}% {100*okn/len(rows):8.1f}% {mr:7.1f}d')


def cmd_hold(arms):
    print(f'{"arm":28s} {"tree":8s} {"target %W":>10s} {"mean %W":>9s} '
          f'{"sd %W":>7s} {"p95|err|":>9s} {"rail %W":>8s}')
    for a in arms:
        jx = [r['jx'] for r in a['rows']]
        tgt = a['holdNdc']
        err = [abs(v - tgt) for v in jx]
        m = mean(jx)
        sd = math.sqrt(sum((v - m) ** 2 for v in jx) / max(1, len(jx) - 1))
        print(f'{a["label"][:28]:28s} {tree(a):8s} {tgt*50:10.2f} {m*50:9.2f} '
              f'{sd*50:7.2f} {q(err,0.95)*50:9.2f} {a["rail"]["half"]*50:8.2f}')


def cmd_kills(arms):
    print(f'{"arm":30s} {"tree":8s} {"tot":>4s} {"vul":>4s} {"msl":>4s} '
          f'{"med errW":>9s} {"p90 errW":>9s} {"med errX":>9s} {"span":>6s}')
    for a in arms:
        c = a['counts'] or {}
        ks = a['kills']
        e = [k['errW'] * 100 for k in ks]
        ex = [k['errXW'] * 100 for k in ks]
        sp = [k['span'] * 100 for k in ks]
        print(f'{a["label"][:30]:30s} {tree(a):8s} {len(ks):4d} {c.get("vulcan",0):4d} '
              f'{c.get("missile",0):4d} {median(e) if e else float("nan"):9.2f} '
              f'{q(e,0.9) if e else float("nan"):9.2f} '
              f'{median(ex) if ex else float("nan"):9.2f} '
              f'{median(sp) if sp else float("nan"):6.2f}')


def cmd_aimerr(arms):
    """Achieved aim error -- the evidence that an 'aiming' pilot actually aims.

    `nerr` is the isotropic frame-width distance from the reconstructed sight to
    the nearest enemy inside the engagement depth band, per tick. A pilot arm
    whose nerr is not materially below `still`'s is not an aiming pilot and must
    not be used as the denominator of an 'aiming matters' ratio.
    """
    print(f'{"arm":30s} {"tree":8s} {"ticks w/tgt":>11s} {"med %W":>7s} '
          f'{"p10 %W":>7s} {"frac<8.3%W":>10s} {"frac<13%W":>10s}')
    for a in arms:
        v = [r['nerr'] * 100 for r in a['rows'] if r['nerr'] is not None]
        if not v:
            print(f'{a["label"][:30]:30s} {tree(a):8s}  no in-band ticks')
            continue
        lt83 = sum(1 for x in v if x < 8.3) / len(v)
        lt13 = sum(1 for x in v if x < 13.0) / len(v)
        print(f'{a["label"][:30]:30s} {tree(a):8s} {len(v):11d} {median(v):7.2f} '
              f'{q(v,0.10):7.2f} {100*lt83:9.1f}% {100*lt13:9.1f}%')


def cmd_geom(arms):
    """WHERE THE TRAFFIC CROSSES THE SCREEN, which is the alternative
    explanation for a motionless stick scoring well: if enemies arrive at the
    screen centre, a sight parked at centre is the optimal sight.

    Measured on the `still` arm only (zero stick, zero roll, so the pitch-only
    frame IS the screen frame and there is no reconstruction in the number).
    `x` is the enemy's own ndc x the first tick it is inside the gun's licensed
    span gate (span >= 10 %W), one sample per enemy id.
    """
    for a in arms:
        first = {}
        for r in a['rows']:
            pass
        # the per-tick rows do not carry per-enemy positions; use the kill
        # ledger's victims plus the band census as a coarse check
        print(f'{a["label"]}: use feelcrit_census.mjs for the geometry census')


CMDS = {'validate': cmd_validate, 'hold': cmd_hold, 'kills': cmd_kills,
        'aimerr': cmd_aimerr, 'geom': cmd_geom}

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in CMDS:
        print(__doc__)
        print('commands:', ', '.join(CMDS))
        sys.exit(2)
    CMDS[sys.argv[1]](load(sys.argv[2:]))
