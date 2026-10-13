#!/usr/bin/env python3
"""Pool tools/fairness_probe.mjs output across seeds into one row per arm.

POOLED, not a mean of per-seed ratios (R8 interface note I27): deaths and
crossings are counts over different flight-second denominators, so averaging
per-seed rates weights a seed that spent longer dead the same as one that
spent longer flying.

`pHit` is the statistic to compare arms on and `deathsPerMin` is the
prediction that can then be checked against it — the deaths in one arm are
40-60 events (Poisson sd 6-8, i.e. +-15 %), where the crossings are ~2 500.

Usage:  fairness_pool.py LABEL file.json [LABEL file.json ...]
"""
import sys, json, math


def row(path):
    d = json.load(open(path))
    runs = d['runs']
    deaths = sum(r['deaths'] for r in runs)
    flight = sum(r['flightSeconds'] for r in runs)
    secs = sum(r['seconds'] for r in runs)
    shots = sum(r['shotsFired'] for r in runs)
    cross = sum(r['missCrossings'] for r in runs)
    hits = sum(r['hitsTaken'] for r in runs)
    tele = sum(r['telegraphsStarted'] for r in runs)
    air = sum(r['meanShotsInAir'] for r in runs) / len(runs)
    warn = sorted(r['warningMedian'] for r in runs if r['warningMedian'] is not None)
    # pHit = hits / (hits + misses); `missCrossings` counts crossings OUTSIDE
    # the radius, and the probe's own self-check is that crossings inside it
    # equal playerHitsTaken exactly.
    tot = cross + hits
    p = hits / tot if tot else float('nan')
    # binomial standard error on pHit, and Poisson on the death count
    se = math.sqrt(p * (1 - p) / tot) if tot else float('nan')
    return dict(seeds=len(runs), secs=secs, deaths=deaths,
                dpm=60 * deaths / secs, dpfm=60 * deaths / flight,
                dpm_se=60 * math.sqrt(deaths) / secs,
                shots_min=60 * shots / secs, air=air, trains=tele,
                cross=tot, hits=hits, pHit=p, pHit_se=se,
                warn_med=(warn[len(warn) // 2] if warn else float('nan')),
                unann=sum(r['unannouncedFatalHits'] for r in runs))


def main():
    a = sys.argv[1:]
    print('%-26s %5s %6s %7s %8s %8s %8s %7s %7s %6s' %
          ('arm', 'seeds', 'deaths', 'd/min', 'd/flt-min', 'pHit %', 'rounds/m',
           'inAir', 'warn s', 'unann'))
    for i in range(0, len(a), 2):
        lab, path = a[i], a[i + 1]
        r = row(path)
        print('%-26s %5d %6d %7.3f %8.3f %8s %8.1f %7.2f %7.3f %6d' % (
            lab, r['seeds'], r['deaths'], r['dpm'], r['dpfm'],
            '%.3f+-%.3f' % (100 * r['pHit'], 100 * r['pHit_se']),
            r['shots_min'], r['air'], r['warn_med'], r['unann']))


if __name__ == '__main__':
    main()
