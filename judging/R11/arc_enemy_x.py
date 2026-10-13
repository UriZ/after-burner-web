#!/usr/bin/env python3
"""ACQUIRE THE ARCADE'S LATERAL ENEMY DISTRIBUTION — ATTEMPTED AND WITHDRAWN.

                     *** READ THIS BEFORE RUNNING IT ***

THE MEASUREMENT THIS FILE WAS BUILT FOR IS NOT OBTAINABLE FROM THIS FOOTAGE,
and the reason is a property of the footage rather than of the effort spent.

WHAT WAS WANTED. `spawner.js` says twice that no arcade count of where enemies
pass laterally exists. The slice that matters is the one our LOCK WINDOW
occupies: enemies at d 26-88 on our build span 0.87-3.66 %W (p5-max, median
1.63). On the 1028-wide longplay that is 9-38 px — and on the NATIVE 320-wide
hardware it is **3-12 px**.

WHY IT FAILS. Stage 1's sea is dense white-capped wave crest at exactly the
near-neutral, mid-bright signature of a distant grey aircraft, and at 9-38 px
there is no size or shape cue left to separate them. Run over four
HUD-verified stage-1 frames the proposer returns **128 candidates of which I
could identify AT MOST 6 as aircraft** — the rest are wave crests, cloud
fragments, explosion edges and HUD. **Precision <= 5 %.** The contact sheet is
`tools/out/spawner-r11/ARC-crops-A.png`; crop it and look, which is how this
was decided.

A HAND COUNT DOES NOT RESCUE IT, which is the part worth stating. The vertical
column in `spawner.js` was acquired by hand ("ARCADE (hand count)") and that
worked because it reads LARGE, unambiguous aircraft. Here the band that
matters is the one where an aircraft is 3-12 native px, and no reader —
operator or human — can tell those from foam. The arcade's LARGE enemies are
perfectly readable (see `ARC-crosser-approach.png`), so the failure is
specific to the far-field slice, which is exactly the slice the lock window
sits in.

WHAT WAS PUBLISHED INSTEAD, per the TL's standing instruction that an honest
bound is an accepted deliverable and an invented number is not: the
ENGAGEABLE-FRACTION BOUND in `judging/R11/lane-effects.md` §4B.2, measured on
our own telemetry where every quantity is exact.

The file is kept, not deleted, so the next attempt starts from a known dead
end rather than rediscovering it. If anyone does retry: the leverage is not a
better mask, it is a frame SELECTION — a stage over flat ground with no foam
(stage 2's desert) would remove the confounder entirely, at the cost of being
a different stage from the one our spawner is tuned against.

                        --- THE METHOD, FOR THE RECORD ---

SEMI-AUTOMATIC, AND THE HAND IS THE INSTRUMENT. A candidate detector proposes
compact near-neutral components; every one is drawn at 5x with its x in %W
printed on it, and a human accepts or rejects it by looking. The published
figure would have been the HAND COUNT; the detector only saves the arithmetic
and makes the reading auditable.

WHAT THE DETECTOR PROPOSES
  near-neutral (S < S_MAX) and mid-bright (V_MIN < V < V_MAX), 8-connected,
  component area within [MIN_PX, MAX_PX], excluding the HUD rows and any
  component wider than MAX_W.

Usage:
  arc_enemy_x.py crops   --dir D --frames a,b,c --out sheet.png --json cand.json
  arc_enemy_x.py propose --dir D --frames a,b,c --out sheet.png --json cand.json
  arc_enemy_x.py tally   --json cand.json --accept "t92:6 t100:3,13"
"""
import sys, os, json, math, argparse, glob
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fx_r11 import load, vs, components   # noqa: E402  (same repo, same operators)

# R11: the band is MATCHED TO OUR OWN LOCK WINDOW rather than picked. Enemies
# inside d 26-88 on our build span 0.87-3.66 %W (p5-max, median 1.63), which on
# a 1028-wide frame is 9-38 px. So the proposer looks for aircraft of that
# apparent size and nothing else — which also removes the two confounders that
# made the first pass unreadable, since the PLAYER's own airframe is ~150 px
# wide here and a cloud is larger still.
S_MAX = 0.34
V_MIN = 0.32
V_MAX = 0.99
MIN_PX = 40
MAX_PX = 900
MAX_W = 44           # video px; 1028 * 3.66 %W / 100 = 38, plus slack
HUD_TOP = 70         # rows excluded: SCORE/HIT strip
HUD_BOT = 640        # rows excluded: SPEED/STAGE strip and the missile rack


def candidates(path):
    a = load(path)
    v, s = vs(a)
    m = (s < S_MAX) & (v > V_MIN) & (v < V_MAX)
    m[:HUD_TOP, :] = False
    m[HUD_BOT:, :] = False
    lab, sizes, cens = components(m)
    out = []
    for i, n in enumerate(sizes):
        if n < MIN_PX or n > MAX_PX:
            continue
        ys, xs = np.nonzero(lab == i)
        w = xs.max() - xs.min() + 1
        h = ys.max() - ys.min() + 1
        if w > MAX_W or h > MAX_W:
            continue
        out.append(dict(n=int(n), cy=float(cens[i][0]), cx=float(cens[i][1]),
                        x0=int(xs.min()), x1=int(xs.max()),
                        y0=int(ys.min()), y1=int(ys.max())))
    out.sort(key=lambda c: -c['n'])
    return a, out


def crops(args):
    """A contact sheet of every candidate at 5x, labelled with its x in %W.

    This is what makes the hand pass possible: a full frame at screen size
    cannot be read, and the first attempt at this measurement stalled for
    exactly that reason. Each tile is one candidate, big enough to say
    'aircraft' or 'not an aircraft'."""
    files = sorted(glob.glob(os.path.join(args.dir, '*.png')))
    picks = [f for f in files if os.path.basename(f)[:-4] in set(args.frames.split(','))]
    rows = {}
    tiles = []
    Z = 5
    TS = 150
    for p in picks:
        key = os.path.basename(p)[:-4]
        a, cands = candidates(p)
        W = a.shape[1]
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        for i, c in enumerate(cands):
            c['pctW'] = round(100 * (c['cx'] - W / 2) / W, 2)
            c['spanW'] = round(100 * (c['x1'] - c['x0'] + 1) / W, 2)
            cw = max(c['x1'] - c['x0'], c['y1'] - c['y0']) + 14
            cx0 = int(c['cx'] - cw / 2)
            cy0 = int(c['cy'] - cw / 2)
            t = im.crop((cx0, cy0, cx0 + cw, cy0 + cw)).resize((TS, TS), Image.NEAREST)
            d = ImageDraw.Draw(t)
            d.text((3, 2), f'{key}#{i}', fill=(255, 0, 255))
            d.text((3, TS - 26), f'x{c["pctW"]:+.1f}', fill=(255, 0, 255))
            d.text((3, TS - 13), f'w{c["spanW"]:.2f}%', fill=(255, 0, 255))
            tiles.append(t)
        rows[key] = dict(file=p, W=int(W), cands=cands)
    cols = 10
    rn = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (TS * cols, TS * max(rn, 1)), (10, 10, 10))
    for k, t in enumerate(tiles):
        sheet.paste(t, ((k % cols) * TS, (k // cols) * TS))
    sheet.save(args.out)
    json.dump(rows, open(args.json, 'w'), indent=1)
    print(f'{args.out}: {len(tiles)} candidate crops over {len(picks)} frames')
    for key, r in rows.items():
        print(f'  {key}: ' + ' '.join(f'#{i}:{c["pctW"]:+.1f}/w{c["spanW"]:.2f}'
                                      for i, c in enumerate(r['cands'])))


def propose(args):
    files = sorted(glob.glob(os.path.join(args.dir, '*.png')))
    picks = [f for f in files if os.path.basename(f)[:-4] in set(args.frames.split(','))]
    if not picks:
        raise SystemExit(f'arc_enemy_x: none of {args.frames} found in {args.dir}')
    rows = {}
    tiles = []
    for p in picks:
        key = os.path.basename(p)[:-4]
        a, cands = candidates(p)
        W = a.shape[1]
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
        d = ImageDraw.Draw(im)
        # %W ruler every 10 %W from centre, so a reading can be checked by eye
        for k in range(-5, 6):
            x = W / 2 + k * 0.10 * W
            d.line([(x, HUD_TOP), (x, HUD_BOT)], fill=(0, 255, 0) if k else (255, 255, 0), width=1)
        for i, c in enumerate(cands):
            pct = 100 * (c['cx'] - W / 2) / W
            d.rectangle([c['x0'] - 2, c['y0'] - 2, c['x1'] + 2, c['y1'] + 2],
                        outline=(255, 0, 255), width=2)
            d.text((c['x0'], max(0, c['y0'] - 14)), f'{i}:{pct:+.1f}', fill=(255, 0, 255))
            c['pctW'] = round(pct, 2)
        rows[key] = dict(file=p, W=int(W), cands=cands)
        tiles.append((key, im))
    cols = 2
    tw = 740
    th = int(tw * tiles[0][1].size[1] / tiles[0][1].size[0])
    rowsN = (len(tiles) + cols - 1) // cols
    sheet = Image.new('RGB', (tw * cols, (th + 16) * rowsN), (10, 10, 10))
    sd = ImageDraw.Draw(sheet)
    for k, (key, im) in enumerate(tiles):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), ((k % cols) * tw, (k // cols) * (th + 16)))
        sd.text(((k % cols) * tw + 4, (k // cols) * (th + 16) + th + 2), key, fill=(255, 220, 120))
    sheet.save(args.out)
    json.dump(rows, open(args.json, 'w'), indent=1)
    print(f'{args.out}: {len(tiles)} frames, '
          f'{sum(len(r["cands"]) for r in rows.values())} candidates')
    for key, r in rows.items():
        print(f'  {key}: ' + ' '.join(f'{i}:{c["pctW"]:+.1f}({c["n"]})'
                                      for i, c in enumerate(r['cands'])))


def tally(args):
    rows = json.load(open(args.json))
    accept = {}
    for tok in args.accept.split():
        key, idxs = tok.split(':')
        accept[key] = [int(i) for i in idxs.split(',') if i != '']
    xs = []
    nframes = 0
    for key, idxs in accept.items():
        if key not in rows:
            raise SystemExit(f'arc_enemy_x: {key} not in {args.json}')
        nframes += 1
        for i in idxs:
            xs.append(rows[key]['cands'][i]['pctW'])
    a = sorted(abs(x) for x in xs)
    sx = sorted(xs)
    q = lambda v, f: v[min(len(v) - 1, int(len(v) * f))]
    print(f'HAND-ACCEPTED: {len(xs)} enemies over {nframes} frames')
    print('  signed x %%W : p5 %+.1f  p25 %+.1f  median %+.1f  p75 %+.1f  p95 %+.1f'
          % (q(sx, .05), q(sx, .25), q(sx, .5), q(sx, .75), q(sx, .95)))
    print('  |x| %%W     : median %.1f  p75 %.1f  p90 %.1f  max %.1f'
          % (q(a, .5), q(a, .75), q(a, .9), a[-1]))
    for band in (10, 15, 18.4, 25, 30):
        print('  share with |x| <= %5.1f %%W : %5.1f %%'
              % (band, 100 * sum(1 for v in a if v <= band) / len(a)))
    json.dump(dict(xs=xs, nframes=nframes), open(args.json + '.tally', 'w'))


ap = argparse.ArgumentParser()
sub = ap.add_subparsers(dest='cmd', required=True)
p1 = sub.add_parser('propose')
p1.add_argument('--dir', required=True)
p1.add_argument('--frames', required=True)
p1.add_argument('--out', required=True)
p1.add_argument('--json', required=True)
p1.set_defaults(fn=propose)
p3 = sub.add_parser('crops')
p3.add_argument('--dir', required=True)
p3.add_argument('--frames', required=True)
p3.add_argument('--out', required=True)
p3.add_argument('--json', required=True)
p3.set_defaults(fn=crops)
p2 = sub.add_parser('tally')
p2.add_argument('--json', required=True)
p2.add_argument('--accept', required=True)
p2.set_defaults(fn=tally)
a = ap.parse_args()
a.fn(a)
