#!/usr/bin/env python3
"""AN ARCADE COLUMN FOR THE LOCK RADIUS -- the quantity R11 moved between two
numbers that neither ground-truth document could anchor.

WHY THIS IS MEASURABLE AT ALL. `LOCK_RADIUS_FRAC` is a screen-space radius
about the sight: an enemy inside it can be bracketed, one outside it cannot.
Both ends of that statement are DRAWN in the arcade -- the nose sight is a
17 px four-corner glyph and the lock bracket is the same four-corner shape at
~53 px -- so the screen distance from the sight to a bracket is a directly
readable quantity, and the distance at the FIRST FRAME OF A BRACKET'S LIFE is
an acquisition distance. The arcade cannot bracket what its own rule says is
out of cone, so:

    max over tracks of (first-frame sight->bracket distance)  is a LOWER BOUND
    on the arcade's lock radius, and the distribution of all of them says
    whether a radius is the right model at all.

THE OPERATOR, stated once. white = min(R,G,B) >= THRESH. 4-connected components
of area 6..260 px with bbox <= 34 px on a side are CORNER CANDIDATES. A BOX is
four candidates sharing two left-x values (+-TOL), two top-y / bottom-y values
(+-TOL), square to within SQ_TOL px. Reported side is the OUTER span. Boxes are
classified by that side: SIGHT 14..21 px, BRACKET 44..64 px. (The two classes
are the two modes R10's independent bracket detector found in a width histogram
over 420 consecutive stage-1 frames -- 14-16 px and 52-56 px -- and they match
REFERENCE's published arcade sight 1.563 %W and bracket 5.15 %W.)

The corner-candidate operator is deliberately NOT the sight detector in
`judging/R11/sight.py`: that one requires a HOLLOW CENTRE and an empty
ISOLATION RING, and a lock bracket has an AIRCRAFT inside it and usually
terrain around it. Running sight.py's operator on brackets would return zero,
and a zero from a precondition violation is this round's most expensive
failure mode. Stated here so nobody reconciles the two by assuming a bug.

ISOTROPY. The project's isotropic frame-width distance is
`hypot(dx_ndc*0.5, dy_ndc*0.5*224/320)`, which in frame pixels is
`hypot(dx_px/W, (dy_px/H)*(224/320))`. The longplay frame is 1028 x 720 and
720/1028 = 0.700389, i.e. 0.056 % off AB2's native 224/320 -- close enough that
`hypot(dx_px, dy_px)/W` would be right to 0.06 %, but the exact form is applied
anyway and the 0.056 % discrepancy is asserted in the selftest rather than
assumed away.

Sampling rate: CONSECUTIVE 60 Hz frames, decoded
`ffmpeg -nostdin -ss T -i ab2-longplay-60fps.mp4 -frames:v N -vsync 0 f%04d.png`,
so frame i is t = T + (i-1)/60 exactly.

  feelcrit_lockrad.py --selftest
  feelcrit_lockrad.py <dir-of-f*.png> [--label NAME] [--marks out.png]
                      [--csv out.csv] [--sightband lo,hi]
"""
import sys, os, glob, csv
import numpy as np
from PIL import Image, ImageDraw

THRESH = 205
TOL = 4
SQ_TOL = 6
SIGHT_MIN, SIGHT_MAX = 14, 21
BRK_MIN, BRK_MAX = 44, 64
MIN_RUN, MAX_STEP = 3, 18
# The HUD band gate, same reason as sight.py: the SCORE/HIT banner and the
# SPEED/STAGE/missile strip carry four-corner-shaped ink, and the missile icons
# fired an independent detector 18 times in 20 frames before a band gate
# existed. Fractions of frame height, stated rather than hidden.
BAND = (0.085, 0.875)


def distW(dx_px, dy_px, W, H):
    """Isotropic frame-width distance, in the units lockSystem._lockable and
    combat._findAssistTarget are written in: x through half-ndc, y through the
    224/320 aspect term every hit test in this project applies."""
    return float(np.hypot(dx_px / W, (dy_px / H) * (224 / 320)))


# --------------------------------------------------------- connected components
def comps(mask):
    """4-connected components of a boolean mask, via row runs + union-find.

    Returns dicts with area and bbox. Run-based because the masks here are
    sparse (white ink on a coloured sky) and a per-pixel Python flood fill on
    1440 frames of 740k px is not affordable.
    """
    H, W = mask.shape
    runs = []            # (row, x0, x1) inclusive
    starts = [0] * (H + 1)
    for y in range(H):
        row = mask[y]
        if not row.any():
            starts[y + 1] = len(runs)
            continue
        idx = np.flatnonzero(row)
        brk = np.flatnonzero(np.diff(idx) > 1)
        s = np.concatenate(([0], brk + 1))
        e = np.concatenate((brk, [len(idx) - 1]))
        for a, b in zip(s, e):
            runs.append((y, int(idx[a]), int(idx[b])))
        starts[y + 1] = len(runs)
    parent = list(range(len(runs)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i, j):
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[max(ri, rj)] = min(ri, rj)

    for y in range(1, H):
        i, j = starts[y], starts[y + 1]
        pi, pj = starts[y - 1], starts[y]
        a = pi
        for r in range(i, j):
            _, x0, x1 = runs[r]
            while a < pj and runs[a][2] < x0:
                a += 1
            b = a
            while b < pj and runs[b][1] <= x1:
                union(r, b)
                b += 1
    out = {}
    for r, (y, x0, x1) in enumerate(runs):
        k = find(r)
        c = out.get(k)
        if c is None:
            out[k] = dict(area=x1 - x0 + 1, x0=x0, x1=x1, y0=y, y1=y)
        else:
            c['area'] += x1 - x0 + 1
            c['x0'] = min(c['x0'], x0); c['x1'] = max(c['x1'], x1)
            c['y0'] = min(c['y0'], y); c['y1'] = max(c['y1'], y)
    return list(out.values())


def candidates(a, thresh=THRESH):
    m = a.min(axis=2) >= thresh
    out = []
    for c in comps(m):
        w = c['x1'] - c['x0'] + 1
        h = c['y1'] - c['y0'] + 1
        if 6 <= c['area'] <= 260 and w <= 34 and h <= 34:
            out.append(c)
    return out


def boxes(a, smin=10, smax=BRK_MAX + 6, thresh=THRESH):
    cs = candidates(a, thresh)
    n = len(cs)
    byrow, bycol, bybot = {}, {}, {}
    for i, c in enumerate(cs):
        for t in range(c['y0'] - TOL, c['y0'] + TOL + 1): byrow.setdefault(t, []).append(i)
        for t in range(c['x0'] - TOL, c['x0'] + TOL + 1): bycol.setdefault(t, []).append(i)
        for t in range(c['y1'] - TOL, c['y1'] + TOL + 1): bybot.setdefault(t, []).append(i)
    found = []
    for i in range(n):
        A = cs[i]
        for j in set(byrow.get(A['y0'], ())):
            if j == i: continue
            B = cs[j]
            side = B['x0'] - A['x0']
            if side < smin or side > smax: continue
            for k in set(bycol.get(A['x0'], ())):
                if k in (i, j): continue
                C = cs[k]
                if not (smin <= C['y1'] - A['y0'] <= smax): continue
                for l in set(bycol.get(B['x0'], ())) & set(bybot.get(C['y1'], ())):
                    if l in (i, j, k): continue
                    D = cs[l]
                    x0 = min(A['x0'], C['x0']); x1 = max(B['x1'], D['x1'])
                    y0 = min(A['y0'], B['y0']); y1 = max(C['y1'], D['y1'])
                    w, h = x1 - x0 + 1, y1 - y0 + 1
                    if abs(w - h) > SQ_TOL: continue
                    found.append(dict(x0=x0, y0=y0, x1=x1, y1=y1, w=w, h=h,
                                      cx=(x0 + x1) / 2, cy=(y0 + y1) / 2))
    found.sort(key=lambda f: -f['w'])
    keep = []
    for f in found:
        if any(abs(f['cx'] - g['cx']) <= g['w'] * 0.6 and abs(f['cy'] - g['cy']) <= g['h'] * 0.6
               for g in keep):
            continue
        keep.append(f)
    return keep


def classify(bs, H, band=BAND):
    sight, brk = [], []
    for b in bs:
        if not (band[0] * H <= b['cy'] <= band[1] * H):
            continue
        if SIGHT_MIN <= b['w'] <= SIGHT_MAX:
            sight.append(b)
        elif BRK_MIN <= b['w'] <= BRK_MAX:
            brk.append(b)
    return sight, brk


def frame(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    H, W = a.shape[:2]
    s, b = classify(boxes(a), H)
    return s, b, W, H


# ------------------------------------------------------------------- tracking
def track_brackets(per_frame):
    """Greedy nearest-centre tracks over consecutive frames.

    A track is kept only if it spans >= MIN_RUN consecutive frames with centre
    motion <= MAX_STEP px/frame -- the same identity rule sight.py adopted after
    R10 withdrew an NCC tracker that locked onto a fireball. A single-frame
    detection is never a track, so it can never contribute a first-appearance
    distance.
    """
    tracks = []
    live = []
    for i, bs in enumerate(per_frame):
        used = set()
        nxt = []
        for tr in live:
            last = tr['pts'][-1]
            best, bd = None, 1e9
            for n, b in enumerate(bs):
                if n in used: continue
                d = abs(b['cx'] - last['cx']) + abs(b['cy'] - last['cy'])
                if d < bd and abs(b['cx'] - last['cx']) <= MAX_STEP \
                        and abs(b['cy'] - last['cy']) <= MAX_STEP:
                    best, bd = n, d
            if best is None:
                if len(tr['pts']) >= MIN_RUN: tracks.append(tr)
                continue
            used.add(best)
            tr['pts'].append(dict(bs[best], i=i))
            nxt.append(tr)
        for n, b in enumerate(bs):
            if n in used: continue
            nxt.append(dict(start=i, pts=[dict(b, i=i)]))
        live = nxt
    for tr in live:
        if len(tr['pts']) >= MIN_RUN: tracks.append(tr)
    return tracks


# ------------------------------------------------------------------- selftest
def _draw_box(cv, ox, oy, side, arm, stroke, val=255):
    for sx in (0, 1):
        for sy in (0, 1):
            x = ox + (side - stroke if sx else 0)
            y = oy + (side - stroke if sy else 0)
            hx = ox + (side - arm if sx else 0)
            cv[y:y + stroke, hx:hx + arm] = val
            vy = oy + (side - arm if sy else 0)
            cv[vy:vy + arm, x:x + stroke] = val


def selftest():
    ok = tot = 0
    def chk(n, c):
        nonlocal ok, tot
        tot += 1
        if c: ok += 1
        print(('PASS ' if c else 'FAIL ') + n)

    # 0. the isotropy claim this file's units rest on
    chk(f'frame aspect 720/1028 within 0.1 % of 224/320 '
        f'(off by {100*abs(720/1028-224/320)/(224/320):.3f} %)',
        abs(720 / 1028 - 224 / 320) / (224 / 320) < 1e-3)
    # the distance operator itself, in the units lockSystem._lockable uses
    chk('distW: 100 px of x on a 1028 px frame is 9.728 %W',
        abs(100 * distW(100, 0, 1028, 720) - 9.7276) < 1e-3)
    chk('distW: 100 px of y on a 720 px frame is 9.722 %W',
        abs(100 * distW(0, 100, 1028, 720) - 9.7222) < 1e-3)

    # 1-3. three sizes recovered, side to +-1 px
    for side, arm, stroke in ((33, 9, 3), (53, 13, 3), (17, 6, 3)):
        cv = np.zeros((200, 260, 3), np.uint8); cv[:, :] = (0, 120, 255)
        _draw_box(cv, 60, 60, side, arm, stroke)
        b = boxes(cv.astype(int))
        chk(f'{side} px box found once, side to 1 px (got {[x["w"] for x in b]})',
            len(b) == 1 and abs(b[0]['w'] - side) <= 1)

    # 4. THE CASE THE MEASUREMENT TURNS ON: a sight and a bracket in one frame,
    #    both found, correctly CLASSIFIED into the two classes.
    cv = np.zeros((300, 400, 3), np.uint8); cv[:, :] = (0, 120, 255)
    _draw_box(cv, 60, 120, 17, 6, 3)
    _draw_box(cv, 240, 100, 53, 13, 3)
    s, k = classify(boxes(cv.astype(int)), 300, band=(0.0, 1.0))
    chk(f'sight+bracket in one frame: 1 sight, 1 bracket (got {len(s)},{len(k)})',
        len(s) == 1 and len(k) == 1 and abs(s[0]['w'] - 17) <= 1 and abs(k[0]['w'] - 53) <= 1)

    # 5. THE PRECONDITION sight.py's operator fails and this one must not: a
    #    bracket with an AIRCRAFT inside it. A hollow-centre test returns zero
    #    here, and a zero from a violated precondition is the failure this
    #    round paid three times for.
    cv = np.zeros((300, 400, 3), np.uint8); cv[:, :] = (0, 120, 255)
    _draw_box(cv, 200, 100, 53, 13, 3)
    cv[118:138, 212:242] = (240, 240, 240)       # a bright airframe in the box
    s, k = classify(boxes(cv.astype(int)), 300, band=(0.0, 1.0))
    chk(f'bracket around a bright airframe still found (got {len(k)})', len(k) == 1)

    # 6. a hollow OUTLINE box of bracket size must be rejected (its edges cross
    #    the corner-candidate size gate as one long component)
    cv = np.zeros((300, 400, 3), np.uint8); cv[:, :] = (0, 120, 255)
    ImageDraw.Draw(Image.fromarray(cv))  # keep PIL import honest
    cv[100:153, 200:203] = 255; cv[100:153, 250:253] = 255
    cv[100:103, 200:253] = 255; cv[150:153, 200:253] = 255
    k = classify(boxes(cv.astype(int)), 300, band=(0.0, 1.0))[1]
    chk(f'53 px hollow outline box REJECTED (got {len(k)})', len(k) == 0)

    # 7. empty sky -> nothing
    cv = np.zeros((300, 400, 3), np.uint8); cv[:, :] = (0, 120, 255)
    chk('empty sky -> 0 boxes', len(boxes(cv.astype(int))) == 0)

    # 8. salt noise -> nothing
    rng = np.random.default_rng(11)
    cv = np.where(rng.random((300, 400, 1)) < 0.04, 255, 0).astype(np.uint8).repeat(3, axis=2)
    chk(f'4 % salt noise -> 0 boxes (got {len(boxes(cv.astype(int)))})',
        len(boxes(cv.astype(int))) == 0)

    # 9. the HUD band gate actually gates
    cv = np.zeros((720, 1028, 3), np.uint8); cv[:, :] = (0, 120, 255)
    _draw_box(cv, 500, 20, 53, 13, 3)            # cy ~ 46 px = 0.064 H, above the band
    s, k = classify(boxes(cv.astype(int)), 720)
    chk(f'bracket above the HUD band gated out (got {len(k)})', len(k) == 0)

    # 10-11. the tracker: a 5-frame run is a track, a 1-frame blip is not
    pf = [[dict(cx=500 + 3 * i, cy=300, w=53, h=53, x0=0, x1=0, y0=0, y1=0)] for i in range(5)]
    chk('5-frame run is one track', len(track_brackets(pf)) == 1)
    pf = [[dict(cx=500, cy=300, w=53, h=53, x0=0, x1=0, y0=0, y1=0)], [], [], []]
    chk('1-frame blip is not a track', len(track_brackets(pf)) == 0)

    # 12. a track's first point is the FIRST frame it appeared on, which is the
    #     whole measurement -- planted, because an off-by-one here would read an
    #     acquisition distance several frames into the lock.
    pf = [[], [], [dict(cx=600, cy=300, w=53, h=53, x0=0, x1=0, y0=0, y1=0)],
          [dict(cx=603, cy=300, w=53, h=53, x0=0, x1=0, y0=0, y1=0)],
          [dict(cx=606, cy=300, w=53, h=53, x0=0, x1=0, y0=0, y1=0)]]
    t = track_brackets(pf)
    chk(f'track starts at frame index 2 (got {t[0]["pts"][0]["i"] if t else None})',
        len(t) == 1 and t[0]['pts'][0]['i'] == 2 and abs(t[0]['pts'][0]['cx'] - 600) < 1)

    print(f'feelcrit_lockrad selftest {ok}/{tot}')
    return ok == tot


# ------------------------------------------------------------------------ run
def run(d, label, marks, csvout, sightband):
    frames = sorted(glob.glob(os.path.join(d, 'f*.png')))
    if not frames:
        print(f'no f*.png in {d}'); sys.exit(2)
    sights, brks, W, H = [], [], None, None
    for f in frames:
        s, b, W, H = frame(f)
        # One sight per frame: the arcade draws exactly one. If the detector
        # offers several, that is reported rather than silently resolved.
        sights.append(s)
        brks.append(b)
    nS = sum(1 for s in sights if len(s) == 1)
    nSmulti = sum(1 for s in sights if len(s) > 1)
    sx = [s[0]['cx'] for s in sights if len(s) == 1]
    print(f'--- {label}  {len(frames)} CONSECUTIVE 60 Hz frames  {W}x{H}')
    print(f'sight: {nS}/{len(frames)} frames with exactly one, {nSmulti} with >1')
    if sx:
        print(f'sight x {min(sx):.1f}..{max(sx):.1f} px = '
              f'{100*min(sx)/W:.2f}..{100*max(sx)/W:.2f} %W   '
              f'centre {100*(min(sx)+max(sx))/2/W:.2f} %W  half-span '
              f'{100*(max(sx)-min(sx))/2/W:.2f} %W')
    nB = sum(len(b) for b in brks)
    fB = sum(1 for b in brks if b)
    print(f'brackets: {nB} detections over {fB} frames '
          f'({100*fB/len(frames):.1f} % of frames carry >=1), max per frame '
          f'{max((len(b) for b in brks), default=0)}')
    tracks = track_brackets(brks)
    print(f'tracks (>= {MIN_RUN} consecutive frames, <= {MAX_STEP} px/frame): {len(tracks)}')

    rows = []
    for ti, tr in enumerate(tracks):
        p0 = tr['pts'][0]
        i0 = p0['i']
        s = sights[i0]
        if len(s) != 1:
            rows.append(dict(track=ti, i0=i0, n=len(tr['pts']), d=None,
                             why='no single sight on the first frame'))
            continue
        sgt = s[0]
        dx = p0['cx'] - sgt['cx']
        dy = p0['cy'] - sgt['cy']
        rows.append(dict(track=ti, i0=i0, n=len(tr['pts']),
                         d=100 * distW(dx, dy, W, H),
                         dxw=100 * dx / W, dyw=100 * dy / W,
                         bx=p0['cx'], by=p0['cy'], sx=sgt['cx'], sy=sgt['cy'],
                         side=p0['w'], why=''))
    good = [r for r in rows if r['d'] is not None]
    print(f'first-appearance distances usable on {len(good)}/{len(rows)} tracks')
    if good:
        ds = sorted(r['d'] for r in good)
        print('  sight->bracket at FIRST APPEARANCE, isotropic %W: '
              + ' '.join(f'{v:.2f}' for v in ds))
        print(f'  median {np.median(ds):.2f} %W   p90 {np.percentile(ds,90):.2f} %W   '
              f'MAX {max(ds):.2f} %W  (= lower bound on the arcade lock radius)')
        axs = sorted(abs(r['dxw']) for r in good)
        print(f'  |dx| median {np.median(axs):.2f} %W  max {max(axs):.2f} %W')
    # every bracket detection, not only first appearances -- the population a
    # radius model has to contain
    alld = []
    for i, bs in enumerate(brks):
        if len(sights[i]) != 1: continue
        s = sights[i][0]
        for b in bs:
            alld.append(100 * distW(b['cx'] - s['cx'], b['cy'] - s['cy'], W, H))
    if alld:
        a = sorted(alld)
        print(f'ALL bracket frames (n={len(a)}): median {np.median(a):.2f} %W  '
              f'p90 {np.percentile(a,90):.2f}  max {max(a):.2f} %W')
    if csvout:
        with open(csvout, 'w', newline='') as fh:
            w = csv.writer(fh)
            w.writerow(['track', 'first_frame_idx', 'len', 'dist_pctW', 'dx_pctW',
                        'dy_pctW', 'bx', 'by', 'sx', 'sy', 'side_px', 'why'])
            for r in rows:
                w.writerow([r['track'], r['i0'], r['n'],
                            '' if r['d'] is None else f'{r["d"]:.3f}',
                            r.get('dxw', ''), r.get('dyw', ''), r.get('bx', ''),
                            r.get('by', ''), r.get('sx', ''), r.get('sy', ''),
                            r.get('side', ''), r['why']])
        print('csv ->', csvout)
    if marks:
        tiles = []
        for r in rows:
            if r['d'] is None: continue
            im = Image.open(frames[r['i0']]).convert('RGB')
            x0 = int(min(r['bx'], r['sx'])) - 70
            x1 = int(max(r['bx'], r['sx'])) + 70
            y0 = int(min(r['by'], r['sy'])) - 70
            y1 = int(max(r['by'], r['sy'])) + 70
            t = im.crop((x0, y0, x1, y1))
            dr = ImageDraw.Draw(t)
            dr.line([r['sx'] - x0, r['sy'] - y0, r['bx'] - x0, r['by'] - y0], fill=(255, 0, 255))
            dr.rectangle([r['sx'] - x0 - 10, r['sy'] - y0 - 10,
                          r['sx'] - x0 + 10, r['sy'] - y0 + 10], outline=(0, 255, 0))
            dr.text((2, 2), f'f{r["i0"]+1} d={r["d"]:.1f}%W s={r["side"]}', fill=(255, 0, 0))
            tiles.append(t)
        if tiles:
            cw = max(t.width for t in tiles); ch = max(t.height for t in tiles)
            cols = min(6, len(tiles)); rws = (len(tiles) + cols - 1) // cols
            sheet = Image.new('RGB', (cols * (cw + 4), rws * (ch + 4)), (30, 30, 30))
            for i, t in enumerate(tiles):
                sheet.paste(t, ((i % cols) * (cw + 4), (i // cols) * (ch + 4)))
            sheet.save(marks)
            print('marks ->', marks, len(tiles), 'tiles')
    return rows


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(0 if selftest() else 1)
    a = sys.argv
    if len(a) < 2:
        print(__doc__); sys.exit(2)
    g = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    sb = g('--sightband')
    run(a[1], g('--label', os.path.basename(a[1].rstrip('/'))), g('--marks'), g('--csv'),
        tuple(float(x) for x in sb.split(',')) if sb else BAND)
