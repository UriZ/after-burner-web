#!/usr/bin/env python3
"""Read probe_r11.mjs output. `resp` -> step response; `combat` -> kill table."""
import sys, json, math, os
import numpy as np

TIE = 1e-9


def stats(xs):
    d = np.diff(xs)
    a = np.abs(d)
    peak = a.max() if len(a) else 0.0
    pk = int(np.argmax(a >= peak - TIE)) + 1 if len(a) else 0
    x0, xe = xs[0], xs[-1]
    t90 = -1
    for i in range(1, len(xs)):
        if abs(xs[i] - x0) >= 0.9 * abs(xe - x0):
            t90 = i; break
    return dict(peak=peak, peakTick=pk, t90=t90, travel=xe - x0)


def resp(path):
    j = json.load(open(path))
    rows = j['rows']; ev = j['events']
    px = np.array([r['px'] for r in rows], float)
    sx = np.array([(r['sx'] if r['sx'] is not None else math.nan) for r in rows], float)
    # NDC half-width 1.0 == 50 %W
    print('tree', j['root'])
    print('events', [(e['tick'], e['stick']) for e in ev])
    segs = []
    for k, e in enumerate(ev):
        a = e['tick']; b = ev[k + 1]['tick'] if k + 1 < len(ev) else len(rows)
        segs.append((e['stick'], a, b))
    for name, a, b in segs:
        s = stats(px[a:b])
        print('  %-2s [%4d,%4d)  travel %+7.4f NDC (%+6.2f %%W)  peak step %.5f on tick %d  t90 %s'
              % (name, a, b, s['travel'], s['travel'] * 50, s['peak'], s['peakTick'],
                 s['t90'] if s['t90'] > 0 else '-'))
    print('  jet  ndc x  min %+.4f  max %+.4f   half-envelope %.2f %%W' % (px.min(), px.max(), (px.max() - px.min()) / 2 * 50))
    if not np.isnan(sx).all():
        print('  sight ndc x min %+.4f  max %+.4f  half-envelope %.2f %%W' % (np.nanmin(sx), np.nanmax(sx), (np.nanmax(sx) - np.nanmin(sx)) / 2 * 50))
    return px, segs


def series(path, a, b):
    j = json.load(open(path))
    px = np.array([r['px'] for r in j['rows']], float)
    return np.diff(px[a:b]) * 50  # %W per tick


def combat(path):
    j = json.load(open(path))
    launches = kills = 0
    outcomes = {}
    for e in j['events']:
        if 'outcomes' in e:
            for o in e['outcomes']:
                outcomes[o.get('outcome', '?')] = outcomes.get(o.get('outcome', '?'), 0) + 1
        if 'kills' in e:
            kills += len(e['kills'])
    rows = j['rows']
    stock = [r['stock'] for r in rows if r['stock'] is not None]
    nbrk = np.array([r['nbrk'] or 0 for r in rows])
    nlk = np.array([r['nlocks'] or 0 for r in rows])
    # launches: every tick where inflight rises
    inf = np.array([r['inflight'] or 0 for r in rows])
    launches = int(np.clip(np.diff(inf), 0, None).sum())
    print('%-10s pilot=%-6s launches %3d  kills %3d  k/launch %5.1f%%   brackets>=1 %5.1f%% >=2 %5.1f%% max %d   locks>=1 %5.1f%% >=2 %5.1f%% max %d  errs %d'
          % (os.path.basename(os.path.dirname(path)), j['pilot'], launches, kills,
             100 * kills / launches if launches else 0,
             100 * (nbrk >= 1).mean(), 100 * (nbrk >= 2).mean(), nbrk.max(),
             100 * (nlk >= 1).mean(), 100 * (nlk >= 2).mean(), nlk.max(), len(j['errors'])))
    return dict(launches=launches, kills=kills)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        if 'resp' in os.path.basename(p): resp(p)
        else: combat(p)
