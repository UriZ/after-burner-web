#!/usr/bin/env python3
"""Aggregate feelcrit_probe arms into the tables the critique publishes.

Every row names the TREE (from the arm's own `root`, not from the label) and the
SEEDS it pools, and every arm is 5400 CONSECUTIVE 60 Hz ticks.

  feelcrit_table.py pilots DIR      kills by pilot x weapon, pooled over seeds
  feelcrit_table.py hold   DIR      kills vs where the sight is parked
  feelcrit_table.py isol   DIR      the one-lever gun isolation
  feelcrit_table.py pair   DIR      tree x latency
  feelcrit_table.py brk    DIR      drawn-bracket population
  feelcrit_table.py repeat DIR      determinism control
"""
import json, os, sys, re
from statistics import mean, median
from collections import defaultdict


def load(d):
    arms = []
    for f in sorted(os.listdir(d)):
        if f.endswith('.json'):
            arms.append(json.load(open(os.path.join(d, f))))
    return arms


def tree(a):
    return os.path.basename(a['root']).replace('tree-', '')


def gunarg(a):
    m = re.search(r'gun=([^&]*)', a['url'])
    return m.group(1).replace('%3D', '=') if m else 'shipped'


def tot(a):
    c = a['counts'] or {}
    return c.get('vulcan', 0) + c.get('missile', 0) + c.get('other', 0)


def fmt(arr, val):
    """mean [seed:value ...] -- the per-seed values are LABELLED with their seed.
    An unlabelled list sorted by filename reads as seeds 11/3/5 while the reader
    assumes 3/5/11, which is a silent transposition of exactly the kind this
    round spent a correction on."""
    xs = [val(a) for a in arr]
    return (f'{mean(xs):5.1f} [' +
            ' '.join(f'{a["seed"]}:{val(a)}' for a in sorted(arr, key=lambda a: a['seed'])) + ']')


def cmd_pilots(arms):
    g = defaultdict(list)
    for a in arms:
        key = (tree(a), a['weapons'], a['pilot'], a['gain'])
        g[key].append(a)
    trees = sorted({k[0] for k in g})
    for t in trees:
        print(f'\n### tree {t}   (5400 consecutive 60 Hz ticks per arm, '
              f'seeds pooled; mean [per-seed])')
        print(f'{"weapon":9s} {"pilot":12s} {"kills":22s} {"vulcan":9s} {"missile":9s} '
              f'{"med aim err %W":>14s}')
        for w in ('both', 'gun', 'missile'):
            for p, gn in sorted({(k[2], k[3]) for k in g if k[0] == t and k[1] == w}):
                arr = g[(t, w, p, gn)]
                ks = arr
                vu = [(a['counts'] or {}).get('vulcan', 0) for a in arr]
                ms = [(a['counts'] or {}).get('missile', 0) for a in arr]
                errs = []
                for a in arr:
                    errs += [r['nerr'] * 100 for r in a['rows'] if r['nerr'] is not None]
                name = p if p == 'still' or p == 'sweep' else f'{p} g{gn:g}'
                # The aim-error column is computed against the probe's 26..88
                # depth band, which is the MISSILE's engagement band. For the
                # gun-band pilots it is therefore the distance to a target they
                # are deliberately not aiming at, and it is printed as '-'.
                e = ('-' if p in ('trackgun', 'trackboth')
                     else f'{median(errs):.2f}' if errs else 'nan')
                print(f'{w:9s} {name:14s} {fmt(ks, tot):30s} {mean(vu):8.1f} {mean(ms):8.1f} '
                      f'{e:>14s}')
        # the two ratios, computed over the SAME seeds
        for w in ('both', 'gun', 'missile'):
            rows = {(k[2], k[3]): g[k] for k in g if k[0] == t and k[1] == w}
            if not rows: continue
            seeds = sorted({a['seed'] for arr in rows.values() for a in arr})
            def per_seed(*ps):
                out = {}
                for (pp, gn), arr in rows.items():
                    if pp not in ps: continue
                    for a in arr: out.setdefault(a['seed'], []).append(tot(a))
                return {s: max(v) for s, v in out.items()}
            # THE DENOMINATOR IS THE BEST AIMING ARM AVAILABLE, over every
            # tracking pilot AND every gain, per seed. A single hand-picked
            # pursuit controller is not "the best aiming pilot" -- and when its
            # depth band misses the weapon's entirely it is not an aiming pilot
            # at all (see feelcrit_probe.mjs's PILOTS note).
            best = per_seed('track', 'trackgun', 'trackboth')
            still = per_seed('still')
            anti = per_seed('anti')
            if not (best and still): continue
            sh = [100 * still[s] / best[s] for s in seeds if s in best and s in still and best[s]]
            line = (f'  {w}: BLIND SHARE still/best-aiming = {mean(sh):.0f} % '
                    f'(n={len(sh)} seeds: {" ".join(f"{v:.0f}" for v in sh)})')
            if anti:
                span = [(best[s] - still[s]) / (best[s] - anti[s])
                        for s in seeds if s in best and s in anti and best[s] != anti[s]]
                line += (f'   | aiming spans {100*mean(span):.0f} % of the '
                         f'anti->best range (n={len(span)})')
            print(line)


def cmd_hold(arms):
    g = defaultdict(list)
    for a in arms:
        g[(tree(a), a['hold'])].append(a)
    for t in sorted({k[0] for k in g}):
        print(f'\n### tree {t} -- kills vs WHERE THE SIGHT IS PARKED '
              f'(deadbeat hold, both weapons, 5400 ticks @60Hz)')
        print(f'{"hold (rail frac)":17s} {"screen x %W":>12s} {"kills":22s} '
              f'{"vulcan":8s} {"missile":8s} {"sd of held x":>13s}')
        for h in sorted(k[1] for k in g if k[0] == t):
            arr = g[(t, h)]
            ks = arr
            vu = mean([(a['counts'] or {}).get('vulcan', 0) for a in arr])
            ms = mean([(a['counts'] or {}).get('missile', 0) for a in arr])
            xs = [r['jx'] * 50 for a in arr for r in a['rows']]
            m = mean(xs)
            sd = (sum((v - m) ** 2 for v in xs) / (len(xs) - 1)) ** 0.5
            print(f'{h:17g} {m:12.2f} {fmt(ks, tot):30s} {vu:7.1f} {ms:7.1f} {sd:13.2f}')


def cmd_isol(arms):
    g = defaultdict(list)
    for a in arms:
        g[(tree(a), a['pilot'], gunarg(a))].append(a)
    print(f'{"tree":9s} {"pilot":7s} {"?gun= arm":22s} {"vulcan kills":22s} '
          f'{"assistrad":>9s} {"hitmult":>8s} {"minspan":>8s}')
    for k in sorted(g):
        arr = g[k]
        ks = arr
        tn = arr[0].get('tunables') or {}
        print(f'{k[0]:9s} {k[1]:7s} {k[2][:22]:22s} {fmt(ks, lambda a: (a["counts"] or {}).get("vulcan", 0)):30s} '
              f'{tn.get("assistrad",0):9.4f} {tn.get("hitmult",0):8.3f} '
              f'{tn.get("minspan",0):8.3f}')


def cmd_pair(arms):
    g = defaultdict(list)
    for a in arms:
        g[(tree(a), a['weapons'], a['gain'], a['lag'])].append(a)
    print(f'{"tree":9s} {"weapons":8s} {"gain":>5s} {"lag ticks":>9s} {"lag ms":>7s} '
          f'{"kills":24s} {"med aim err %W":>14s}')
    order = {'5e3d57e': 0, '82daaa4': 1, 'final': 2, 'fd833f6': 3}
    for k in sorted(g, key=lambda k: (order.get(k[0], 9), k[1], k[2], k[3])):
        arr = g[k]
        ks = arr
        errs = [r['nerr'] * 100 for a in arr for r in a['rows'] if r['nerr'] is not None]
        print(f'{k[0]:9s} {k[1]:8s} {k[2]:5g} {k[3]:9g} {1000*k[3]/60:7.0f} '
              f'{fmt(ks, tot):30s} {median(errs) if errs else float("nan"):14.2f}')


def cmd_brk(arms):
    g = defaultdict(list)
    for a in arms:
        g[(tree(a), a['pilot'], a['gain'], a['weapons'])].append(a)
    print('drawn-bracket population, per tick, 5400 consecutive 60 Hz ticks per arm')
    print(f'{"tree":9s} {"pilot":12s} {"weapons":8s} {">=1 brk":>8s} {">=2":>7s} {"max":>4s} '
          f'{"locks>=1":>9s}')
    for k in sorted(g):
        arr = g[k]
        n = sum(len(a['rows']) for a in arr)
        b1 = sum(1 for a in arr for r in a['rows'] if r['brk'] >= 1)
        b2 = sum(1 for a in arr for r in a['rows'] if r['brk'] >= 2)
        mx = max(r['brk'] for a in arr for r in a['rows'])
        l1 = sum(1 for a in arr for r in a['rows'] if r['locks'] >= 1)
        name = k[1] if k[1] not in ('track', 'anti') else f'{k[1]} g{k[2]:g}'
        print(f'{k[0]:9s} {name:12s} {k[3]:8s} {100*b1/n:7.1f}% {100*b2/n:6.1f}% {mx:4d} '
              f'{100*l1/n:8.1f}%')


def cmd_repeat(arms):
    g = defaultdict(list)
    for a in arms:
        g[(tree(a), a['pilot'], a['seed'])].append(a)
    print('DETERMINISM CONTROL -- the same arm run twice must agree exactly')
    for k, arr in sorted(g.items()):
        ks = [tot(a) for a in arr]
        same = len(set(ks)) == 1
        rowsame = all(json.dumps(a['rows']) == json.dumps(arr[0]['rows']) for a in arr)
        print(f'{k[0]:9s} {k[1]:7s} seed {k[2]:3d}  kills {ks}  '
              f'{"IDENTICAL" if same else "DIFFER"}  per-tick rows '
              f'{"identical" if rowsame else "DIFFER"}')


CMDS = {'pilots': cmd_pilots, 'hold': cmd_hold, 'isol': cmd_isol,
        'pair': cmd_pair, 'brk': cmd_brk, 'repeat': cmd_repeat}

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in CMDS:
        print(__doc__); sys.exit(2)
    CMDS[sys.argv[1]](load(sys.argv[2]))
