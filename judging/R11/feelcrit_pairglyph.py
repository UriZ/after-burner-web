#!/usr/bin/env python3
"""ARCADE SIGHT -> LOCK-BRACKET distance, with each glyph read by the operator
that is validated for it.

WHY TWO OPERATORS AND NOT ONE. `feelcrit_lockrad.py`'s corner-candidate operator
finds the bracket correctly -- it has to, because a bracket has an AIRCRAFT
inside it and terrain around it, so no hollow-centre or isolation test can be
applied to it. Run on the SIGHT class (14-21 px boxes) that same permissive
operator returned detections spread over 2.09..86.53 %W on stage 1, against the
arcade sight's three-times-reproduced [52.04, 59.19] %W on the same 300 frames:
it is picking up small bracket-shaped and airframe-shaped ink. So:

  SIGHT   -> judging/R11/sight.py, unchanged (selftest 16/16; 83/83 detections
             cropped and looked at by the lane that wrote it; its published w1
             column [535.0, 608.5] px reproduces here EXACTLY from this file,
             which is the check that I am running their instrument and not a
             variant of it).
  BRACKET -> judging/R11/feelcrit_lockrad.py (selftest 15/15, including the
             case sight.py's operator cannot do: a bracket drawn around a
             bright airframe).

WHAT IS MEASURED, and what it does and does not bound.

  * The FIRST frame of a bracket track is an ACQUISITION. The arcade cannot
    bracket a target its own rule says is out of cone, so the largest
    first-appearance sight->bracket distance is a LOWER BOUND on the arcade's
    acquisition radius. This is the number `LOCK_RADIUS_FRAC` has never had.
  * A LATER frame of a track is NOT a bound on acquisition. Our own build keeps
    a completed lock after the target leaves the cone (lockSystem.js prunes
    `locks` on death / retire / break-depth, not on aim), so a far bracket can
    be a lock that was acquired close and drifted. Reported separately and
    never used as the headline.
  * YIELD IS THE BINDING LIMIT and it is stated per window: a first-appearance
    distance needs the sight glyph legible ON THE SAME FRAME, and sight.py's
    isolation ring deliberately drops every frame where the sight overlaps the
    airframe, terrain or an explosion -- which in a busy combat frame is most
    of them. Missing frames are reported as misses and never interpolated.

Sampling: CONSECUTIVE 60 Hz frames (ffmpeg -ss T -frames:v N -vsync 0), so
frame i is t = T + (i-1)/60 exactly. Both glyph reads are per frame; nothing is
sampled coarser.

  feelcrit_pairglyph.py <dir> --label NAME [--cache DIR] [--marks P] [--csv P]
"""
import sys, os, glob, json, csv
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import sight as sightmod                      # the validated sight operator
import feelcrit_lockrad as brk                # the bracket operator


def read_window(d, cache, fast=True, pad=6):
    """Per-frame bracket detections, and sight detections where they are needed.

    THE SIGHT OPERATOR COSTS ~1.2 s/frame AND THE BRACKET ONE ~0.25 s, and a
    1 000-frame span of arcade footage contains a handful of lock-on events. The
    first version ran both over every frame of four windows; one of those windows
    (a19, stage 19, -ss 775.0) turned out to be the REFUEL/RELOAD sequence with no
    lock-on in it at all, so 360 frames of the expensive operator bought a true,
    correctly-reported zero. `fast` runs the cheap operator over everything, finds
    the bracket TRACK STARTS, and then runs the sight operator only on a +-`pad`
    window around each -- which is the minimum sight.py's own identity rule needs
    (a detection survives only inside a run of >=4 consecutive frames), so the
    rule is still applied and not skipped.
    """
    frames = sorted(glob.glob(os.path.join(d, 'f*.png')))
    key = os.path.join(cache, os.path.basename(d.rstrip('/')) + '.json') if cache else None
    if key and os.path.exists(key):
        c = json.load(open(key))
        if c['n'] == len(frames):
            return frames, c['sight'], c['brk'], c['W'], c['H']
    sraw, braw, W, H = [], [], None, None
    for f in frames:
        a = np.asarray(Image.open(f).convert('RGB')).astype(int)
        H, W = a.shape[:2]
        _, b = brk.classify(brk.boxes(a), H)
        braw.append(b)
    if fast:
        want = set()
        for tr in brk.track_brackets(braw):
            i0 = tr['pts'][0]['i']
            for j in range(max(0, i0 - pad), min(len(frames), i0 + pad + 1)):
                want.add(j)
        sraw = [[] for _ in frames]
        for j in sorted(want):
            sraw[j], W = sightmod.detect(frames[j])
        print(f'  [fast] sight operator run on {len(want)}/{len(frames)} frames '
              f'(+-{pad} around each bracket track start)')
    else:
        sraw = []
        for f in frames:
            r, W = sightmod.detect(f)
            sraw.append(r)
    # sight.py's identity rule: a detection survives only inside a run of >=4
    # consecutive frames moving <=14 px/frame. Applied here, not reimplemented.
    chosen = sightmod.track(len(frames), sraw)
    sight = [None if c is None else dict(cx=c['cx'], cy=c['cy'], w=c['w'], pol=c['pol'])
             for c in chosen]
    if key:
        os.makedirs(cache, exist_ok=True)
        json.dump(dict(n=len(frames), sight=sight, brk=braw, W=W, H=H), open(key, 'w'))
    return frames, sight, braw, W, H


def run(d, label, cache, marks, csvout, fast=True):
    frames, sight, braw, W, H = read_window(d, cache, fast=fast)
    n = len(frames)
    nS = sum(1 for s in sight if s)
    sx = [s['cx'] for s in sight if s]
    print(f'=== {label}: {n} CONSECUTIVE 60 Hz frames, {W}x{H}')
    print(f'  SIGHT  {nS}/{n} frames ({100*nS/n:.1f} %), x '
          + (f'{min(sx):.1f}..{max(sx):.1f} px = {100*min(sx)/W:.2f}..{100*max(sx)/W:.2f} %W'
             if sx else 'n/a'))
    nBf = sum(1 for b in braw if b)
    print(f'  BRACKET {sum(len(b) for b in braw)} detections on {nBf}/{n} frames '
          f'({100*nBf/n:.1f} %), max/frame {max((len(b) for b in braw), default=0)}')
    tracks = brk.track_brackets(braw)
    print(f'  bracket TRACKS (>={brk.MIN_RUN} consecutive frames): {len(tracks)}')

    rows = []
    for ti, tr in enumerate(tracks):
        p0 = tr['pts'][0]
        s0 = sight[p0['i']]
        row = dict(track=ti, i0=p0['i'], n=len(tr['pts']), side=p0['w'],
                   bx=p0['cx'], by=p0['cy'])
        if s0 is None:
            row.update(d=None, why='no legible sight on the acquisition frame')
        else:
            row.update(d=100 * brk.distW(p0['cx'] - s0['cx'], p0['cy'] - s0['cy'], W, H),
                       dxw=100 * (p0['cx'] - s0['cx']) / W,
                       dyw=100 * (p0['cy'] - s0['cy']) / H * (224 / 320),
                       sx=s0['cx'], sy=s0['cy'], why='')
        rows.append(row)
    good = [r for r in rows if r.get('d') is not None]
    print(f'  ACQUISITION distances usable on {len(good)}/{len(rows)} tracks '
          f'(the rest had no legible sight on their first frame)')
    if good:
        ds = sorted(r['d'] for r in good)
        print('   ' + ' '.join(f'{v:.2f}' for v in ds) + '  %W')
        print(f'   median {np.median(ds):.2f}  max {max(ds):.2f} %W')
    # every frame where both are legible -- the population, not the bound
    allp = []
    for i, bs in enumerate(braw):
        if sight[i] is None: continue
        for b in bs:
            allp.append(100 * brk.distW(b['cx'] - sight[i]['cx'],
                                        b['cy'] - sight[i]['cy'], W, H))
    if allp:
        a = sorted(allp)
        print(f'  ALL co-legible bracket frames n={len(a)}: median {np.median(a):.2f} '
              f'p90 {np.percentile(a,90):.2f} max {max(a):.2f} %W')
    if csvout:
        with open(csvout, 'w', newline='') as fh:
            w = csv.writer(fh)
            w.writerow(['window', 'track', 'first_frame_idx', 'track_len', 'side_px',
                        'dist_pctW', 'dx_pctW', 'dy_pctW', 'bx', 'by', 'sx', 'sy', 'why'])
            for r in rows:
                w.writerow([label, r['track'], r['i0'], r['n'], r['side'],
                            '' if r.get('d') is None else f'{r["d"]:.3f}',
                            r.get('dxw', ''), r.get('dyw', ''), r['bx'], r['by'],
                            r.get('sx', ''), r.get('sy', ''), r.get('why', '')])
        print('  csv ->', csvout)
    if marks and good:
        tiles = []
        for r in good:
            im = Image.open(frames[r['i0']]).convert('RGB')
            x0 = int(min(r['bx'], r['sx'])) - 80; x1 = int(max(r['bx'], r['sx'])) + 80
            y0 = int(min(r['by'], r['sy'])) - 80; y1 = int(max(r['by'], r['sy'])) + 80
            t = im.crop((max(0, x0), max(0, y0), min(W, x1), min(H, y1)))
            dr = ImageDraw.Draw(t)
            ox, oy = max(0, x0), max(0, y0)
            dr.line([r['sx']-ox, r['sy']-oy, r['bx']-ox, r['by']-oy], fill=(255, 0, 255))
            dr.ellipse([r['sx']-ox-12, r['sy']-oy-12, r['sx']-ox+12, r['sy']-oy+12],
                       outline=(0, 255, 0))
            dr.text((2, 2), f'{label} f{r["i0"]+1} d={r["d"]:.1f}%W side={r["side"]}',
                    fill=(255, 0, 0))
            tiles.append(t)
        cw = max(t.width for t in tiles); ch = max(t.height for t in tiles)
        cols = min(4, len(tiles)); rws = (len(tiles) + cols - 1) // cols
        sheet = Image.new('RGB', (cols*(cw+4), rws*(ch+4)), (30, 30, 30))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols)*(cw+4), (i//cols)*(ch+4)))
        sheet.save(marks)
        print('  marks ->', marks, len(tiles), 'tiles')
    return rows


if __name__ == '__main__':
    a = sys.argv
    if len(a) < 2:
        print(__doc__); sys.exit(2)
    g = lambda k, d=None: a[a.index(k)+1] if k in a else d
    run(a[1], g('--label', os.path.basename(a[1].rstrip('/'))), g('--cache'),
        g('--marks'), g('--csv'), fast=('--full' not in a))
