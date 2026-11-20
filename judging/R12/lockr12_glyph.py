#!/usr/bin/env python3
"""R12 LOCK LANE -- an INDEPENDENT read of the arcade's sight -> lock-bracket
distance, built to check R11 feel-critique.md §5 rather than to rerun it.

WHY A SECOND INSTRUMENT AND NOT A RERUN. §5's column is the only arcade
evidence that exists for the bracket gate, and it is about to move code. The
repo's rule is that a measurement which disagrees with another instrument means
one of them is broken, so the useful thing is a DIFFERENT OPERATOR on the same
subject, not the same operator on the same frames.

  R11 (`feelcrit_lockrad.py`)  4-connected COMPONENTS of the white mask, then
                               components grouped into a box by shared x / y
                               values within +-4 px.
  THIS FILE                    no components at all: a DENSE INTEGRAL-IMAGE
                               STENCIL over every (y, x, S), testing the
                               four-corner glyph as a SHAPE -- four L-shaped
                               corner quadrants present, all four edge MIDDLES
                               empty.

The two share the white threshold (that is the glyph's own definition, and it
is swept here, see --thresh) and the size bands. They share nothing else: a
fault in run-based union-find, in the pairwise grouping, or in the component
area gate cannot reproduce itself here, and vice versa.

WHAT THE SHAPE TEST IS, stated once so it can be argued with.
For a candidate square of side S at (y, x), with quadrant side A = 0.30 S and
band thickness T = max(2, 0.085 S):

  CORNERS   each of the four A x A quadrants must carry an L: its outer ROW
            band (A x T) and its outer COLUMN band (T x A) must EACH be at
            least HALF ink. A bright blob in the corner has no preference for
            the outer row and column and fails this; a corner glyph passes it
            by construction.
  EDGES     the middle (S - 2A) of each of the four edges, T px thick, must be
            EMPTY (<= EDGE_MAX px of ink). This is what separates a corner
            glyph from a drawn rectangle, and it is the only test that has to
            survive an aircraft inside the box -- it is applied on the BORDER,
            never on the interior, because an arcade lock bracket has an
            airframe in the middle of it and `sight.py`'s hollow-centre test
            structurally cannot be used (feel-critique §5.1).
  INTERIOR  unconstrained for the bracket class. For the SIGHT class the
            hollow-centre test IS applied (the arcade sight is a 5 x 5 native
            glyph with an empty middle row and column), plus an isolation ring,
            because at 17 px a shape test alone picks up airframe ink -- which
            is the failure §5.1 reports for the permissive operator on this
            class.

POLARITY. The sight is WHITE on stage 1 and BLACK on stage 4 (`sight.py`), so
both are searched for the sight and the polarity is reported. The bracket is
searched WHITE-ONLY, which is the same stated undercount §5.3 item 1 carries:
GAME_SPEC.md §3 records blue bracket variants at t ~ 104, so bracket-PRESENCE
counts from this file are a lower bound. The DISTANCE statistic is unaffected
by sensitivity -- it uses only the detections it has, and every one of them is
cropped and looked at.

ISOTROPY. Distances are the units `lockSystem._lockable` is written in:
hypot(dx/W, (dy/H) * 224/320). The decode is 1028 x 720 and 720/1028 is 0.056 %
off 224/320; asserted in the selftest, not assumed.

SAMPLING. CONSECUTIVE 60 Hz frames, decoded
  ffmpeg -nostdin -ss T -i ab2-longplay-60fps.mp4 -frames:v N -vsync 0 f%04d.png
so frame i is t = T + (i-1)/60 exactly. Nothing here is sampled coarser.

  lockr12_glyph.py --selftest
  lockr12_glyph.py <dir-of-f*.png> --label NAME [--cache DIR] [--jobs N]
                   [--thresh 205] [--widescan]
"""
import sys, os, glob, json
import numpy as np
from PIL import Image

# --- the operator's constants, all stated -----------------------------------
THRESH = 205          # white: min(R,G,B) >= THRESH
DARK = 80             # black: max(R,G,B) <= DARK (sight only)
SIGHT_SIZES = range(14, 22)
BRK_SIZES = range(44, 65)
A_FRAC = 0.30         # corner quadrant side / S
T_FRAC = 0.085        # band thickness / S
EDGE_MAX = 2          # px of ink tolerated in an edge MIDDLE
L_FRAC = 0.5          # fraction of an outer row/column band that must be ink
SIGHT_RING = 3        # isolation ring width, px (sight class only)
SIGHT_RING_MAX = 2    # px of ink tolerated in that ring
# HUD band, fraction of frame height. Same reason sight.py and
# feelcrit_lockrad.py both carry one: the SCORE/HIT banner and the
# SPEED/STAGE/missile strip are full of four-corner-shaped ink, and the missile
# icons fired an independent detector 18 times in 20 frames before a band gate
# existed. Verified on this lane's own decode -- see --widescan.
BAND = (0.085, 0.875)
# Track identity. A single-frame detection is never published.
BRK_MIN_RUN, BRK_MAX_STEP = 3, 18     # matches §5 so the two are comparable
SIGHT_MIN_RUN, SIGHT_MAX_STEP = 4, 14  # sight.py's own rule


def distW(dx_px, dy_px, W, H):
    """Isotropic frame-width distance in the units lockSystem._lockable uses."""
    return float(np.hypot(dx_px / W, (dy_px / H) * (224 / 320)))


def _integral(m):
    return np.pad(np.cumsum(np.cumsum(m.astype(np.int32), 0), 1), ((1, 0), (1, 0)))


def _scan(mask, sizes, hollow=False, isolate=False):
    """Every (y, x, S) passing the stencil. Returns list of dicts.

    Dense and vectorised: for each S the test is ~12 integral-image box sums
    over the whole frame, so there is no candidate-generation step that could
    drop a true positive before the shape test runs.
    """
    H, W = mask.shape
    I = _integral(mask)
    out = []
    smax = max(sizes)
    pad = SIGHT_RING if isolate else 0
    y0, y1 = pad, H - smax - pad
    x0, x1 = pad, W - smax - pad
    if y1 <= y0 or x1 <= x0:
        return out

    def B(dy, dx, h, w):
        """Box sums for all top-left corners in the scan range, offset by
        (dy, dx) and of size (h, w)."""
        ya, yb = y0 + dy, y1 + dy
        xa, xb = x0 + dx, x1 + dx
        return (I[ya + h:yb + h, xa + w:xb + w] - I[ya:yb, xa + w:xb + w]
                - I[ya + h:yb + h, xa:xb] + I[ya:yb, xa:xb])

    for S in sizes:
        A = max(3, int(round(S * A_FRAC)))
        T = max(2, int(round(S * T_FRAC)))
        if S - 2 * A < 3:
            continue
        need = int(round(L_FRAC * A * T))
        ok = None
        # four corners, each an L: outer row band AND outer column band inked
        for sy in (0, 1):
            for sx in (0, 1):
                oy = S - T if sy else 0
                ox = S - T if sx else 0
                qy = S - A if sy else 0
                qx = S - A if sx else 0
                row = B(oy, qx, T, A)      # outer row band of this quadrant
                col = B(qy, ox, A, T)      # outer column band of this quadrant
                c = (row >= need) & (col >= need)
                ok = c if ok is None else (ok & c)
                if not ok.any():
                    break
            if ok is not None and not ok.any():
                break
        if ok is None or not ok.any():
            continue
        # four edge MIDDLES empty -- rejects a drawn rectangle
        mid = S - 2 * A
        for dy, dx, h, w in ((0, A, T, mid), (S - T, A, T, mid),
                             (A, 0, mid, T), (A, S - T, mid, T)):
            ok &= B(dy, dx, h, w) <= EDGE_MAX
            if not ok.any():
                break
        if not ok.any():
            continue
        if hollow:
            C = max(2, int(round(S * 0.30)))
            if S - 2 * C >= 2:
                ok &= B(C, C, S - 2 * C, S - 2 * C) <= EDGE_MAX
        if isolate:
            P = SIGHT_RING
            ring = B(-P, -P, S + 2 * P, S + 2 * P) - B(0, 0, S, S)
            ok &= ring <= SIGHT_RING_MAX
        if not ok.any():
            continue
        ys, xs = np.nonzero(ok)
        tot = B(0, 0, S, S)
        for yy, xx in zip(ys, xs):
            out.append(dict(x0=int(xx + x0), y0=int(yy + y0), w=S, h=S,
                            cx=float(xx + x0) + (S - 1) / 2,
                            cy=float(yy + y0) + (S - 1) / 2,
                            ink=int(tot[yy, xx])))
    return out


def _nms(dets):
    """Suppress overlapping detections, largest first (a bracket and the stray
    sub-boxes its own corners can form are the same object)."""
    dets = sorted(dets, key=lambda d: (-d['w'], -d['ink']))
    keep = []
    for d in dets:
        if any(abs(d['cx'] - k['cx']) <= k['w'] * 0.6
               and abs(d['cy'] - k['cy']) <= k['h'] * 0.6 for k in keep):
            continue
        keep.append(d)
    return keep


def _band(dets, H):
    return [d for d in dets if BAND[0] * H <= d['cy'] <= BAND[1] * H]


def detect(path, thresh=THRESH, widescan=False):
    """-> (sight detections, bracket detections, W, H)."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    H, W = a.shape[:2]
    white = a.min(axis=2) >= thresh
    dark = a.max(axis=2) <= DARK
    sizes = range(12, 71) if widescan else BRK_SIZES
    brk = _nms(_band(_scan(white, sizes), H))
    sight = []
    for m, pol in ((white, 'w'), (dark, 'b')):
        for d in _scan(m, SIGHT_SIZES, hollow=True, isolate=True):
            d['pol'] = pol
            sight.append(d)
    sight = _nms(_band(sight, H))
    return sight, brk, W, H


# ------------------------------------------------------------------ tracking
def track(per_frame, min_run, max_step):
    """Greedy nearest-centre tracks over CONSECUTIVE frames; a run shorter than
    min_run is discarded, never published as a one-frame detection."""
    tracks, live = [], []
    for i, ds in enumerate(per_frame):
        used, nxt = set(), []
        for tr in live:
            last = tr['pts'][-1]
            best, bd = None, 1e9
            for n, d in enumerate(ds):
                if n in used:
                    continue
                dd = abs(d['cx'] - last['cx']) + abs(d['cy'] - last['cy'])
                if dd < bd and abs(d['cx'] - last['cx']) <= max_step \
                        and abs(d['cy'] - last['cy']) <= max_step:
                    best, bd = n, dd
            if best is None:
                if len(tr['pts']) >= min_run:
                    tracks.append(tr)
                continue
            used.add(best)
            tr['pts'].append(dict(ds[best], i=i))
            nxt.append(tr)
        for n, d in enumerate(ds):
            if n not in used:
                nxt.append(dict(pts=[dict(d, i=i)]))
        live = nxt
    for tr in live:
        if len(tr['pts']) >= min_run:
            tracks.append(tr)
    return tracks


def sight_series(per_frame, n):
    """One sight per frame, or None, after the run-identity rule. Where the
    detector offers several in a frame the one continuing the live track is
    taken and the ambiguity is counted (returned as `multi`)."""
    chosen = [None] * n
    multi = 0
    for tr in track(per_frame, SIGHT_MIN_RUN, SIGHT_MAX_STEP):
        for p in tr['pts']:
            if chosen[p['i']] is None:
                chosen[p['i']] = p
            else:
                multi += 1
    return chosen, multi


# ------------------------------------------------------------------ selftest
def _draw_glyph(cv, ox, oy, side, arm, stroke, val=255):
    for sx in (0, 1):
        for sy in (0, 1):
            x = ox + (side - stroke if sx else 0)
            y = oy + (side - stroke if sy else 0)
            hx = ox + (side - arm if sx else 0)
            cv[y:y + stroke, hx:hx + arm] = val
            vy = oy + (side - arm if sy else 0)
            cv[vy:vy + arm, x:x + stroke] = val


def _sky(h=300, w=400):
    cv = np.zeros((h, w, 3), np.uint8)
    cv[:, :] = (0, 120, 255)
    return cv


def _det(cv, **kw):
    import tempfile
    p = os.path.join(tempfile.mkdtemp(), 'f0001.png')
    Image.fromarray(cv).save(p)
    return detect(p, **kw)


def selftest():
    ok = tot = 0

    def chk(name, cond):
        nonlocal ok, tot
        tot += 1
        ok += bool(cond)
        print(('PASS ' if cond else 'FAIL ') + name)

    chk(f'decode aspect 720/1028 within 0.1 % of 224/320 '
        f'(off by {100*abs(720/1028-224/320)/(224/320):.3f} %)',
        abs(720 / 1028 - 224 / 320) / (224 / 320) < 1e-3)
    chk('distW: 100 px of x on a 1028 px frame = 9.728 %W',
        abs(100 * distW(100, 0, 1028, 720) - 9.7276) < 1e-3)
    chk('distW: 100 px of y on a 720 px frame = 9.722 %W',
        abs(100 * distW(0, 100, 1028, 720) - 9.7222) < 1e-3)

    # 1-3. bracket sizes recovered to +-1 px
    for side, arm, stroke in ((45, 11, 3), (53, 13, 3), (63, 15, 3)):
        cv = _sky(200, 260)
        _draw_glyph(cv, 60, 60, side, arm, stroke)
        _, b, _, _ = _det(cv)
        chk(f'{side} px bracket found once, side to 1 px (got {[x["w"] for x in b]})',
            len(b) == 1 and abs(b[0]['w'] - side) <= 1)

    # 4. THE CASE THE WHOLE MEASUREMENT TURNS ON -- both glyphs in one frame,
    #    both found, correctly separated into the two classes.
    cv = _sky()
    _draw_glyph(cv, 60, 120, 17, 6, 3)
    _draw_glyph(cv, 240, 100, 53, 13, 3)
    s, b, _, _ = _det(cv)
    chk(f'sight+bracket in one frame -> 1 sight, 1 bracket (got {len(s)},{len(b)})',
        len(s) == 1 and len(b) == 1 and abs(s[0]['w'] - 17) <= 1
        and abs(b[0]['w'] - 53) <= 1)
    if s and b:
        d = 100 * distW(b[0]['cx'] - s[0]['cx'], b[0]['cy'] - s[0]['cy'], 400, 300)
        # planted geometry: sight centre (68,128), bracket centre (266,126)
        exp = 100 * distW(266 - 68, 126 - 128, 400, 300)
        chk(f'planted sight->bracket distance recovered ({d:.2f} vs {exp:.2f} %W)',
            abs(d - exp) < 0.5)

    # 5. THE PRECONDITION sight.py's operator cannot meet and this one must:
    #    a bracket with a BRIGHT AIRFRAME inside it. A hollow-centre test
    #    returns zero here, and a zero from a violated precondition is the
    #    failure mode R11 paid for three times.
    cv = _sky()
    _draw_glyph(cv, 200, 100, 53, 13, 3)
    cv[118:140, 212:244] = (240, 240, 240)
    _, b, _, _ = _det(cv)
    chk(f'bracket around a bright airframe still found (got {len(b)})', len(b) == 1)

    # 6. a DRAWN RECTANGLE of bracket size must be rejected -- the edge-middle
    #    test is the only thing standing between this operator and every bright
    #    rectangular feature in an arcade frame.
    cv = _sky()
    cv[100:153, 200:203] = 255; cv[100:153, 250:253] = 255
    cv[100:103, 200:253] = 255; cv[150:153, 200:253] = 255
    _, b, _, _ = _det(cv)
    chk(f'53 px drawn rectangle REJECTED (got {len(b)})', len(b) == 0)

    # 7. four bright BLOBS at the corners, no L structure -> rejected
    cv = _sky()
    for dy in (0, 40):
        for dx in (0, 40):
            cv[100 + dy:113 + dy, 200 + dx:213 + dx] = 255
    _, b, _, _ = _det(cv)
    chk(f'four solid corner blobs (no L) rejected (got {len(b)})', len(b) == 0)

    # 8-9. nulls
    chk('empty sky -> 0 of either', _det(_sky())[0] == [] and _det(_sky())[1] == [])
    rng = np.random.default_rng(12)
    cv = np.where(rng.random((300, 400, 1)) < 0.04, 255, 0).astype(np.uint8).repeat(3, axis=2)
    s, b, _, _ = _det(cv)
    chk(f'4 % salt noise -> 0 of either (got {len(s)},{len(b)})', not s and not b)

    # 10. the HUD band gate gates
    cv = np.zeros((720, 1028, 3), np.uint8); cv[:, :] = (0, 120, 255)
    _draw_glyph(cv, 500, 20, 53, 13, 3)
    _, b, _, _ = _det(cv)
    chk(f'bracket above the HUD band gated out (got {len(b)})', len(b) == 0)

    # 11. BLACK sight on a bright sky (stage 4 polarity)
    cv = np.zeros((300, 400, 3), np.uint8); cv[:, :] = (235, 215, 180)
    _draw_glyph(cv, 120, 120, 17, 6, 3, val=20)
    s, _, _, _ = _det(cv)
    chk(f'black-polarity sight found (got {len(s)}, pol {[x["pol"] for x in s]})',
        len(s) == 1 and s[0]['pol'] == 'b')

    # 12-14. the tracker
    pf = [[dict(cx=500 + 3 * i, cy=300, w=53, h=53)] for i in range(5)]
    chk('5-frame run is one bracket track', len(track(pf, BRK_MIN_RUN, BRK_MAX_STEP)) == 1)
    pf = [[dict(cx=500, cy=300, w=53, h=53)], [], [], []]
    chk('1-frame blip is not a track', len(track(pf, BRK_MIN_RUN, BRK_MAX_STEP)) == 0)
    pf = [[], [], [dict(cx=600, cy=300, w=53, h=53)],
          [dict(cx=603, cy=300, w=53, h=53)], [dict(cx=606, cy=300, w=53, h=53)]]
    t = track(pf, BRK_MIN_RUN, BRK_MAX_STEP)
    chk(f'track starts at the frame it first appeared on '
        f'(got {t[0]["pts"][0]["i"] if t else None})',
        len(t) == 1 and t[0]['pts'][0]['i'] == 2)

    # 15. a track that JUMPS further than MAX_STEP is two tracks, not one --
    #     the identity rule that stopped R10's tracker locking onto a fireball
    pf = [[dict(cx=500, cy=300, w=53, h=53)] for _ in range(4)] \
        + [[dict(cx=700, cy=300, w=53, h=53)] for _ in range(4)]
    chk('a 200 px jump splits into two tracks',
        len(track(pf, BRK_MIN_RUN, BRK_MAX_STEP)) == 2)

    print(f'lockr12_glyph selftest {ok}/{tot}')
    return ok == tot


# ----------------------------------------------------------------------- run
def _one(args):
    path, thresh, widescan = args
    s, b, W, H = detect(path, thresh=thresh, widescan=widescan)
    return ([{k: d[k] for k in ('cx', 'cy', 'w', 'ink', 'pol')} for d in s],
            [{k: d[k] for k in ('cx', 'cy', 'w', 'ink')} for d in b], W, H)


def run(d, label, cache, jobs, thresh, widescan):
    frames = sorted(glob.glob(os.path.join(d, 'f*.png')))
    if not frames:
        print(f'no f*.png in {d}')
        sys.exit(2)
    key = None
    if cache:
        os.makedirs(cache, exist_ok=True)
        key = os.path.join(cache, f'{label}-t{thresh}{"-wide" if widescan else ""}.json')
    if key and os.path.exists(key):
        c = json.load(open(key))
        if c['n'] == len(frames):
            print(f'[cache] {key}')
            return c
    args = [(f, thresh, widescan) for f in frames]
    if jobs > 1:
        from multiprocessing import Pool
        with Pool(jobs) as p:
            res = p.map(_one, args, chunksize=4)
    else:
        res = [_one(a) for a in args]
    sraw = [r[0] for r in res]
    braw = [r[1] for r in res]
    W, H = res[0][2], res[0][3]
    out = dict(label=label, dir=d, n=len(frames), thresh=thresh, W=W, H=H,
               sightraw=sraw, brk=braw)
    if key:
        json.dump(out, open(key, 'w'))
        print(f'[wrote] {key}')
    return out


if __name__ == '__main__':
    a = sys.argv
    if '--selftest' in a:
        sys.exit(0 if selftest() else 1)
    if len(a) < 2:
        print(__doc__)
        sys.exit(2)
    g = lambda k, dv=None: a[a.index(k) + 1] if k in a else dv
    c = run(a[1], g('--label', os.path.basename(a[1].rstrip('/'))), g('--cache'),
            int(g('--jobs', '1')), int(g('--thresh', str(THRESH))), '--widescan' in a)
    n = c['n']
    sr = c['sightraw']
    sight, multi = sight_series(sr, n)
    nS = sum(1 for s in sight if s)
    sx = [s['cx'] for s in sight if s]
    nBf = sum(1 for b in c['brk'] if b)
    print(f'=== {c["label"]}  {n} CONSECUTIVE 60 Hz frames  {c["W"]}x{c["H"]}  '
          f'thresh {c["thresh"]}')
    print(f'  SIGHT   {nS}/{n} frames ({100*nS/n:.1f} %), {multi} ambiguous, x '
          + (f'{min(sx):.1f}..{max(sx):.1f} px = {100*min(sx)/c["W"]:.2f}..'
             f'{100*max(sx)/c["W"]:.2f} %W' if sx else 'n/a'))
    print(f'  BRACKET {sum(len(b) for b in c["brk"])} detections on {nBf}/{n} frames '
          f'({100*nBf/n:.1f} %), max/frame '
          f'{max((len(b) for b in c["brk"]), default=0)}')
    print(f'  bracket TRACKS (>={BRK_MIN_RUN} consecutive frames): '
          f'{len(track(c["brk"], BRK_MIN_RUN, BRK_MAX_STEP))}')
    if '--widescan' in a:
        from collections import Counter
        hist = Counter(d['w'] for bs in c['brk'] for d in bs)
        print('  WIDE-SCAN side histogram (px):')
        for k in sorted(hist):
            print(f'    {k:3d} {"#" * min(60, hist[k]):s} {hist[k]}')
