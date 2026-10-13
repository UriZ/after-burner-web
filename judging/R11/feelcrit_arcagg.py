#!/usr/bin/env python3
"""Pool the arcade sight/bracket windows and state the bound three ways.

Reads the per-window caches written by `feelcrit_pairglyph.py` (sight detections
after sight.py's own run-identity rule, bracket detections per frame) and
reports, per bracket TRACK:

  first   the sight->bracket distance on the track's FIRST detected frame.
          An ACQUISITION distance, with one bias stated: a bracket that existed
          earlier but was not detectable (over terrain, inside an explosion)
          starts its track late, and since a closing enemy moves OUTWARD from a
          roughly central sight, a late start reads FARTHER than the truth. So
          `first` is biased UP and is a weak lower bound on the arcade radius.

  min     the SMALLEST distance anywhere in the track's life, over frames where
          the sight is also legible. This one is free of that bias and gives the
          stronger statement: if a bracket is NEVER within R of the sight in its
          whole life, then a build that drops its bracket the moment the aim
          leaves the target (which is what R11 shipped) would never have drawn
          that bracket at all. `min` > R for a track is therefore a direct
          refutation of R as a bracket gate, independent of when acquisition
          happened.

  n       frames in the track where both glyphs are legible. A track with n = 0
          contributes to neither statistic and is counted separately.

  feelcrit_arcagg.py <cache-dir> [--gate 8.3]
"""
import sys, os, json
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import feelcrit_lockrad as brk


def main(cachedir, gate):
    rows = []
    per_window = []
    for f in sorted(os.listdir(cachedir)):
        if not f.endswith('.json'):
            continue
        c = json.load(open(os.path.join(cachedir, f)))
        w, h, n = c['W'], c['H'], c['n']
        sight, braw = c['sight'], c['brk']
        tracks = brk.track_brackets(braw)
        nS = sum(1 for s in sight if s)
        nBf = sum(1 for b in braw if b)
        kept = 0
        for ti, tr in enumerate(tracks):
            ds, first = [], None
            for p in tr['pts']:
                s = sight[p['i']]
                if s is None:
                    continue
                d = 100 * brk.distW(p['cx'] - s['cx'], p['cy'] - s['cy'], w, h)
                if first is None:
                    first = (d, p['i'], p['i'] == tr['pts'][0]['i'])
                ds.append(d)
            if not ds:
                continue
            kept += 1
            rows.append(dict(win=f[:-5], track=ti, len=len(tr['pts']), nco=len(ds),
                             first=first[0], first_i=first[1],
                             first_is_track_start=first[2],
                             dmin=min(ds), dmax=max(ds),
                             i0=tr['pts'][0]['i']))
        per_window.append((f[:-5], n, nS, nBf, len(tracks), kept))

    print(f'{"window":8s} {"frames":>7s} {"sight f":>8s} {"brkt f":>7s} '
          f'{"tracks":>7s} {"usable":>7s}')
    for w_, n, nS, nBf, nt, k in per_window:
        print(f'{w_:8s} {n:7d} {nS:8d} {nBf:7d} {nt:7d} {k:7d}')
    if not rows:
        print('\nno usable tracks')
        return
    print(f'\n{"window":8s} {"trk":>4s} {"len":>4s} {"co":>3s} {"startframe":>10s} '
          f'{"first %W":>9s} {"min %W":>8s} {"max %W":>8s} {"first@start":>12s}')
    for r in sorted(rows, key=lambda r: (r['win'], r['i0'])):
        print(f'{r["win"]:8s} {r["track"]:4d} {r["len"]:4d} {r["nco"]:3d} {r["i0"]:10d} '
              f'{r["first"]:9.2f} {r["dmin"]:8.2f} {r["dmax"]:8.2f} '
              f'{"yes" if r["first_is_track_start"] else "no":>12s}')
    fs = [r['first'] for r in rows]
    ms = [r['dmin'] for r in rows]
    print(f'\nn = {len(rows)} usable bracket tracks across '
          f'{len({r["win"] for r in rows})} windows')
    print(f'  FIRST (acquisition, biased UP): min {min(fs):.2f}  median '
          f'{np.median(fs):.2f}  max {max(fs):.2f} %W')
    print(f'  MIN over each track (unbiased):  min {min(ms):.2f}  median '
          f'{np.median(ms):.2f}  max {max(ms):.2f} %W')
    over = [r for r in rows if r['dmin'] > gate]
    print(f'  tracks whose CLOSEST approach to the sight is still beyond '
          f'{gate} %W: {len(over)}/{len(rows)}')
    print(f'  => a build that drops the bracket whenever the target is outside '
          f'{gate} %W would never draw {len(over)} of these {len(rows)} brackets.')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__); sys.exit(2)
    g = 8.3
    if '--gate' in sys.argv:
        g = float(sys.argv[sys.argv.index('--gate') + 1])
    main(sys.argv[1], g)
