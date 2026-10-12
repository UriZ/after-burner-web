#!/usr/bin/env python3
"""ARCADE NOSE-SIGHT detector: the four-corner glyph that leads the player's nose.

WHAT THE SUBJECT IS, measured off .../arc/w2/f0001.png (stage 4, -ss 210.0,
cropped at 10x and looked at): four L-shaped corner marks on a square whose
outer bbox is 17 x 17 px of a 1028 px frame = 1.65 %W -- R10's third operator's
figure for the same object (feel-critique.md 3.1). WHITE on stage 1, BLACK on
stage 4, so both polarities are searched and the polarity is reported.

It is NOT the lock bracket: that is the same four-corner shape at ~54 px
(5.2 %W), rejected here by the outer-box size gate (S <= 20).

Operator: integral-image shape test over every (x, y, S), S in 14..20.
  total    in [AMIN, AMAX]              -- ink of a four-corner glyph
  centre   (S-2C) square empty           -- hollow
  corners  each A x A quadrant >= CMIN   -- all four present
  edge mids empty                        -- corner marks, not a box outline
  ISOLATION: a P-px ring outside the box is empty -- this is the identity
             constraint that rejects terrain, lettering and airframe edges,
             and it is why the detector MISSES frames where the sight overlaps
             the player's own airframe. Misses are reported as blanks, never
             interpolated.

Identity rule, after R10 withdrew an NCC tracker that locked onto a fireball:
a single-frame detection is never published. A detection is kept only inside a
run of >= MIN_RUN consecutive frames whose centre moves <= MAX_STEP px/frame.

Usage: sight.py <dir-of-f*.png> [--csv out.csv] [--marks montage.png]
       sight.py --selftest
"""
import sys, os, glob, csv
import numpy as np
from PIL import Image, ImageDraw

SIZES = range(14, 21)
AMIN, AMAX = 20, 130
CMIN = 7            # ink per corner quadrant
A_FRAC = 0.40       # corner quadrant side as a fraction of S
C_FRAC = 0.30       # centre hole half-inset as a fraction of S
P = 3               # isolation ring width, px
BRIGHT, DARK = 190, 80
MIN_RUN, MAX_STEP = 4, 14
# World band, y fraction. The arcade HUD's SCORE/HIT banner and its
# SPEED/STAGE/missile strip both carry four-corner-glyph-shaped ink (the
# missile icons fired this detector 18/20 times before this gate existed --
# `w2-marks.png`, cropped and looked at). Measured off the window's own
# frames, stated rather than hidden.
BAND = (0.085, 0.875)


def _integral(m):
    return np.pad(np.cumsum(np.cumsum(m.astype(np.int32), 0), 1), ((1, 0), (1, 0)))


def _box(I, y, x, h, w):
    """Sum over [y, y+h) x [x, x+w) for arrays of top-left corners."""
    return I[y + h, x + w] - I[y, x + w] - I[y + h, x] + I[y, x]


def _find(mask, sizes=SIZES):
    H, W = mask.shape
    I = _integral(mask)
    y0, y1 = P, H - max(sizes) - P          # top-left range, exclusive end
    x0, x1 = P, W - max(sizes) - P
    def B(dy, dx, h, w):
        ya, yb = y0 + dy, y1 + dy
        xa, xb = x0 + dx, x1 + dx
        return (I[ya + h:yb + h, xa + w:xb + w] - I[ya:yb, xa + w:xb + w]
                - I[ya + h:yb + h, xa:xb] + I[ya:yb, xa:xb])
    hits = []
    for S in sizes:
        A = max(3, int(round(S * A_FRAC)))
        C = max(2, int(round(S * C_FRAC)))
        if S - 2 * C < 3:
            continue
        amax = max(AMAX, int(0.45 * S * S))
        tot = B(0, 0, S, S)
        ok = (tot >= AMIN) & (tot <= amax)
        if not ok.any():
            continue
        ok &= (B(-P, -P, S + 2 * P, S + 2 * P) - tot) == 0
        if not ok.any():
            continue
        ok &= B(C, C, S - 2 * C, S - 2 * C) == 0
        for (dy, dx) in ((0, 0), (0, S - A), (S - A, 0), (S - A, S - A)):
            if not ok.any():
                break
            ok &= B(dy, dx, A, A) >= CMIN
        # MIDDLE ROW BAND, full width, must be empty. A four-corner glyph has
        # no ink at its vertical centre; a hollow OUTLINE box does (its left
        # and right edges cross it), which is the negative this replaces an
        # edge-midpoint test with. The edge-midpoint test was tried first and
        # REJECTED THE REAL GLYPH: AV1 ringing widens the arcade glyph's top-
        # left arm to 7 px against the top-right's 6, so a window centred on
        # the box centre clips an arm. Kept as a comment because the next
        # reader will otherwise re-add it.
        e = max(2, S // 5)
        m = (S - e) // 2
        if ok.any():
            ok &= B(m, 0, e, S) == 0
        iy, ix = np.nonzero(ok)
        for yy, xx in zip(iy, ix):
            y, x = int(yy) + y0, int(xx) + x0
            hits.append(dict(cx=x + (S - 1) / 2, cy=y + (S - 1) / 2, w=S, h=S,
                             area=int(tot[yy, xx])))
    hits.sort(key=lambda g: g['w'])
    keep = []
    for g in hits:
        if all(abs(g['cx'] - k['cx']) > 6 or abs(g['cy'] - k['cy']) > 6 for k in keep):
            keep.append(g)
    return keep


def detect(path, band=BAND):
    a = np.asarray(Image.open(path).convert('RGB')).astype(int)
    H = a.shape[0]
    y0, y1 = band[0] * H, band[1] * H
    res = []
    for pol, mask in (('bright', a.min(axis=2) >= BRIGHT), ('dark', a.max(axis=2) <= DARK)):
        for g in _find(mask):
            if not (y0 <= g['cy'] <= y1):
                continue
            g['pol'] = pol
            res.append(g)
    return res, a.shape[1]


def track(n, dets):
    chosen = [None] * n
    runs, cur = [], []
    for i in range(n):
        ds = dets[i]
        if not ds:
            if len(cur) >= MIN_RUN: runs.append(cur)
            cur = []
            continue
        if cur:
            prev = cur[-1][1]
            cand = [d for d in ds if abs(d['cx'] - prev['cx']) <= MAX_STEP
                    and abs(d['cy'] - prev['cy']) <= MAX_STEP]
            if cand:
                cur.append((i, min(cand, key=lambda d: abs(d['cx'] - prev['cx'])))); continue
            if len(cur) >= MIN_RUN: runs.append(cur)
            cur = []
        cur = [(i, min(ds, key=lambda d: d['w']))]
    if len(cur) >= MIN_RUN: runs.append(cur)
    for r in runs:
        for i, d in r:
            chosen[i] = d
    return chosen


def _glyph_img(cx, cy, side=17, arm=6, thick=3, fg=(255, 255, 255), bg=(0, 120, 220),
               W=1028, H=720, im=None):
    im = im or Image.new('RGB', (W, H), bg)
    d = ImageDraw.Draw(im)
    x0, y0 = cx - side // 2, cy - side // 2
    x1, y1 = x0 + side - 1, y0 + side - 1
    for (ax, ay, dx, dy) in ((x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)):
        for (ex, ey) in ((arm, thick), (thick, arm)):
            xa, xb = sorted([ax, ax + dx * (ex - 1)])
            ya, yb = sorted([ay, ay + dy * (ey - 1)])
            d.rectangle([xa, ya, xb, yb], fill=fg)
    return im


def selftest():
    ok = fail = 0
    def chk(name, cond):
        nonlocal ok, fail
        print(('  PASS ' if cond else '  FAIL ') + name)
        if cond: ok += 1
        else: fail += 1
    import tempfile
    tmp = tempfile.mkdtemp(prefix='sight-selftest-')
    p = os.path.join(tmp, 'a.png')

    _glyph_img(500, 300).save(p)
    r, W = detect(p)
    chk('white glyph found exactly once (n=%d)' % len(r), len(r) == 1)
    chk('centre to <=1 px', bool(r) and abs(r[0]['cx'] - 500) <= 1 and abs(r[0]['cy'] - 300) <= 1)
    chk('polarity bright', bool(r) and r[0]['pol'] == 'bright')

    _glyph_img(400, 250, fg=(0, 0, 0), bg=(0, 150, 140)).save(p)
    r, _ = detect(p)
    chk('black glyph on teal found, polarity dark', len(r) == 1 and r[0]['pol'] == 'dark')

    _glyph_img(500, 300, side=54, arm=18, thick=4).save(p)
    chk('54 px lock bracket REJECTED', len(detect(p)[0]) == 0)

    Image.new('RGB', (1028, 720), (0, 120, 220)).save(p)
    chk('empty sky -> 0', len(detect(p)[0]) == 0)

    im = Image.new('RGB', (1028, 720), (0, 120, 220))
    ImageDraw.Draw(im).rectangle([500, 300, 516, 316], fill=(255,) * 3); im.save(p)
    chk('solid 17 px square REJECTED', len(detect(p)[0]) == 0)

    im = Image.new('RGB', (1028, 720), (0, 120, 220))
    ImageDraw.Draw(im).rectangle([500, 300, 516, 316], outline=(255,) * 3, width=3); im.save(p)
    chk('17 px hollow OUTLINE box REJECTED (edge mids filled)', len(detect(p)[0]) == 0)

    rng = np.random.default_rng(7)
    a = np.where(rng.random((720, 1028, 1)) < 0.04, 255, 0).astype(np.uint8).repeat(3, axis=2)
    Image.fromarray(a).save(p)
    chk('4 %% salt noise -> 0', len(detect(p)[0]) == 0)

    im = _glyph_img(300, 200); _glyph_img(700, 400, im=im).save(p)
    chk('two glyphs both found', len(detect(p)[0]) == 2)

    # a glyph TOUCHING a wing-like bar must be rejected by the isolation ring
    im = _glyph_img(300, 200)
    ImageDraw.Draw(im).rectangle([309, 195, 500, 205], fill=(255,) * 3); im.save(p)
    chk('glyph touching a bright bar REJECTED (isolation ring)', len(detect(p)[0]) == 0)

    # sub-sizes: 15 and 19 px glyphs are found and their size reported
    _glyph_img(500, 300, side=15, arm=5, thick=3).save(p)
    r, _ = detect(p); chk('15 px glyph found, S=15', len(r) == 1 and r[0]['w'] == 15)
    _glyph_img(500, 300, side=19, arm=7, thick=3).save(p)
    r, _ = detect(p); chk('19 px glyph found, S=19', len(r) == 1 and r[0]['w'] == 19)

    ds = [[dict(cx=500 + 2 * i, cy=300, w=17, h=17, area=40)] for i in range(8)]
    ds[3].append(dict(cx=200, cy=600, w=17, h=17, area=40))
    ch = track(8, ds)
    chk('tracked run kept 8/8', all(c is not None for c in ch))
    chk('impostor not selected', abs(ch[3]['cx'] - 506) < 1)
    chk('isolated single detection dropped',
        track(4, [[dict(cx=100, cy=100, w=17, h=17, area=40)], [], [], []])[0] is None)

    print('selftest %d/%d' % (ok, ok + fail))
    return fail == 0


def run(d, csvout, marks):
    frames = sorted(glob.glob(os.path.join(d, 'f*.png')))
    dets, W = [], None
    for f in frames:
        r, W = detect(f)
        dets.append(r)
    ch = track(len(frames), dets)
    rows = []
    for f, c in zip(frames, ch):
        rows.append((os.path.basename(f), '' if c is None else '%.1f' % c['cx'],
                     '' if c is None else '%.1f' % c['cy'],
                     '' if c is None else c['w'], '' if c is None else c['pol'],
                     '' if c is None else '%.3f' % (100 * c['cx'] / W)))
    if csvout:
        with open(csvout, 'w', newline='') as fh:
            w = csv.writer(fh); w.writerow(['frame', 'cx_px', 'cy_px', 'S', 'pol', 'x_pctW'])
            w.writerows(rows)
    for r in rows:
        print('\t'.join(str(x) for x in r))
    xs = [float(r[1]) for r in rows if r[1] != '']
    if xs:
        print('n=%d/%d  x %.1f..%.1f px = %.2f..%.2f %%W  centre %.2f  half-span %.2f %%W'
              % (len(xs), len(frames), min(xs), max(xs), 100 * min(xs) / W, 100 * max(xs) / W,
                 100 * (min(xs) + max(xs)) / 2 / W, 100 * (max(xs) - min(xs)) / 2 / W))
    if marks:
        tiles = []
        for f, c in zip(frames, ch):
            if c is None: continue
            im = Image.open(f).convert('RGB')
            x, y = int(c['cx']), int(c['cy'])
            t = im.crop((x - 24, y - 24, x + 25, y + 25)).resize((147, 147), Image.NEAREST)
            ImageDraw.Draw(t).text((2, 2), os.path.basename(f)[1:5], fill=(255, 0, 0))
            tiles.append(t)
        if tiles:
            cols = min(10, len(tiles)); rows_ = (len(tiles) + cols - 1) // cols
            sheet = Image.new('RGB', (cols * 149, rows_ * 149), (30, 30, 30))
            for i, t in enumerate(tiles):
                sheet.paste(t, ((i % cols) * 149, (i // cols) * 149))
            sheet.save(marks)
            print('marks ->', marks, len(tiles), 'tiles')


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        sys.exit(0 if selftest() else 1)
    a = sys.argv
    run(a[1], a[a.index('--csv') + 1] if '--csv' in a else None,
        a[a.index('--marks') + 1] if '--marks' in a else None)
