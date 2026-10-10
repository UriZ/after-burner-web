#!/usr/bin/env python3
"""ARCADE-DENSITY — the arcade's own on-screen enemy-aircraft census.

Reads a hand-labelled arcade frame census (the R6 combat lane's `labels.csv` format)
and reports, per size floor:

  presence(T)  = share of flight frames holding >=1 enemy whose drawn span >= T %W
  presence2(T) = share of flight frames holding >=2 such enemies
  perframe(T)  = mean count of such enemies per flight frame
  empty        = share of flight frames holding NO enemy aircraft at any recorded size

OPERATOR, stated in full because this project loses rounds here:
  * population  = every frame in the file whose rows are not `excluded`, i.e. every
                  sampled flight frame, INCLUDING frames with zero enemies. This is the
                  "combat frames" denominator read broadly. The narrow reading
                  (frames holding any enemy) is reported separately as `-nonempty`.
  * subject     = rows with kind=enemy. kind=player rows are excluded by the file's own
                  convention; kind=excluded frames leave the population entirely.
  * statistic   = `wW`, a HUMAN-READ DRAWN SPAN as a per cent of frame WIDTH at 686x480,
                  +-2-3 points per the file's own header. It is NOT `spanFrac` (a quad
                  width); R8's feel critic measured the conversion at ~1.18x bank-weighted
                  (REFERENCE ledger row 27 — a bare "%W" is not a reportable quantity).
  * floors      = 3,5,10,15 %W. 10 is R3's "readable"; 5 is R3's second clause.

CONTROL: --selftest builds three synthetic censuses with hand-computable answers.
"""
import sys, csv, math
from collections import defaultdict


def load(path):
    frames = {}          # frame id -> list of (stage, wW) for enemies
    stages = {}
    excluded = set()
    with open(path) as fh:
        for raw in fh:
            line = raw.strip()
            if not line or line.startswith('#'):
                continue
            parts = [p.strip() for p in line.split(',')]
            frame, stage, kind = parts[0], parts[1], parts[2]
            if kind == 'excluded':
                excluded.add(frame)
                continue
            frames.setdefault(frame, [])
            stages[frame] = stage
            if kind == 'enemy':
                wW = float(parts[4]) if len(parts) > 4 and parts[4] != '' else None
                frames[frame].append(wW)
    for f in excluded:
        frames.pop(f, None)
        stages.pop(f, None)
    return frames, stages


def census(frames, floors=(3, 5, 10, 15)):
    n = len(frames)
    out = {'n_frames': n, 'n_obs': sum(len(v) for v in frames.values())}
    out['empty'] = sum(1 for v in frames.values() if len(v) == 0) / n
    nonempty = [v for v in frames.values() if len(v) > 0]
    out['n_nonempty'] = len(nonempty)
    for T in floors:
        cnt = [sum(1 for w in v if w is not None and w >= T) for v in frames.values()]
        out[f'perframe_{T}'] = sum(cnt) / n
        out[f'presence_{T}'] = sum(1 for c in cnt if c >= 1) / n
        out[f'presence2_{T}'] = sum(1 for c in cnt if c >= 2) / n
        cnt_ne = [sum(1 for w in v if w is not None and w >= T) for v in nonempty]
        out[f'presence_{T}_nonempty'] = (sum(1 for c in cnt_ne if c >= 1) / len(nonempty)) if nonempty else float('nan')
    spans = sorted(w for v in frames.values() for w in v if w is not None)
    if spans:
        def pct(p):
            k = (len(spans) - 1) * p / 100.0
            lo, hi = math.floor(k), math.ceil(k)
            return spans[lo] if lo == hi else spans[lo] + (spans[hi] - spans[lo]) * (k - lo)
        out['span_p25'], out['span_p50'], out['span_p75'] = pct(25), pct(50), pct(75)
        out['span_p90'], out['span_p95'], out['span_max'] = pct(90), pct(95), spans[-1]
        out['share_below_10'] = sum(1 for w in spans if w < 10) / len(spans)
    return out


def report(name, c):
    print(f'--- {name}: {c["n_frames"]} flight frames, {c["n_obs"]} enemy observations')
    print(f'    EMPTY SKY (no enemy at any size): {c["empty"]*100:.1f} %   '
          f'(frames holding >=1 enemy: {c["n_nonempty"]})')
    print('    floor %W | mean/frame | >=1 present | >=1 present (non-empty frames only) | >=2 present')
    for T in (3, 5, 10, 15):
        print(f'      >= {T:2d}   |   {c[f"perframe_{T}"]:5.3f}    |   {c[f"presence_{T}"]*100:5.1f} %   |'
              f'           {c[f"presence_{T}_nonempty"]*100:5.1f} %              |  {c[f"presence2_{T}"]*100:5.1f} %')
    if 'span_p50' in c:
        print(f'    drawn span %W: p25 {c["span_p25"]:.0f}  p50 {c["span_p50"]:.0f}  p75 {c["span_p75"]:.0f}  '
              f'p90 {c["span_p90"]:.0f}  p95 {c["span_p95"]:.0f}  max {c["span_max"]:.0f}   '
              f'below 10 %W: {c["share_below_10"]*100:.1f} %')


def selftest():
    """Three synthetic censuses whose answers are computable by hand."""
    ok = True
    # A: 4 frames, 2 empty, 2 holding one 12 %W aircraft each.
    A = {'f1': [], 'f2': [], 'f3': [12.0], 'f4': [12.0]}
    c = census(A)
    for k, want in [('empty', 0.5), ('presence_10', 0.5), ('perframe_10', 0.5),
                    ('presence2_10', 0.0), ('presence_10_nonempty', 1.0), ('presence_15', 0.0)]:
        got = c[k]
        good = abs(got - want) < 1e-9
        ok &= good
        print(f'  [{"PASS" if good else "FAIL"}] A.{k}: {got} (want {want})')
    # B: the >=2 clause must fire only on frames with two qualifying aircraft.
    B = {'g1': [6.0, 6.0], 'g2': [6.0, 4.0], 'g3': [4.0, 4.0], 'g4': []}
    c = census(B)
    for k, want in [('presence2_5', 0.25), ('presence_5', 0.5), ('perframe_5', 0.75), ('empty', 0.25)]:
        got = c[k]
        good = abs(got - want) < 1e-9
        ok &= good
        print(f'  [{"PASS" if good else "FAIL"}] B.{k}: {got} (want {want})')
    # C: the floor must be inclusive at exactly T, and an all-large census must read 100 %.
    C = {'h1': [10.0], 'h2': [9.9], 'h3': [10.0, 10.0]}
    c = census(C)
    for k, want in [('presence_10', 2/3), ('presence2_10', 1/3), ('perframe_10', 1.0)]:
        got = c[k]
        good = abs(got - want) < 1e-9
        ok &= good
        print(f'  [{"PASS" if good else "FAIL"}] C.{k}: {got} (want {want})')
    # D: a DEGENERATE control the operator must NOT pass -- an empty population.
    try:
        census({})
        print('  [FAIL] D: empty population did not raise')
        ok = False
    except ZeroDivisionError:
        print('  [PASS] D: empty population raises rather than returning a plausible 0')
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(selftest())
    path = sys.argv[1]
    frames, stages = load(path)
    report('ALL STAGES', census(frames))
    by = defaultdict(dict)
    for f, v in frames.items():
        by[stages[f]][f] = v
    for s in sorted(by, key=lambda x: int(x)):
        report(f'stage {s}', census(by[s]))
