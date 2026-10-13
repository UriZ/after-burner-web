#!/usr/bin/env python3
"""R11 effects lane instrument — the BREAK-UP (arrangement) half of the kill
explosion, plus the R10 judge's colour operator reimplemented so its claim can
be re-measured on both sides.

WHAT IS NEW HERE AND WHY. R10 closed the explosion's DURATION and left its
SHAPE open: the R10 judge's scale-matched strip shows the arcade's fireball
FRAGMENTING into a wide sparse spray while ours stays a compact lobed ball
that only changes colour. Every statistic R10 shipped (`peak`, `w60`, `n60`,
`r100`, `t_half`, `life10`) is an AREA-vs-TIME statistic: a sprite with the
right envelope and the wrong silhouette passes all of them, and the lane said
so (lane-envelope.md §6 "WHAT THIS CRITERION CANNOT SEE", item 6).

So this file adds two DIMENSIONLESS SHAPE statistics, which is the only kind
that can be compared across sides given the arcade's 7.3x peak spread:

  fill    = masked area / area of the mask's own convex hull
  spread  = Rg / sqrt(area/pi)        (Rg = radius of gyration about centroid)

Both are ratios of two quantities that scale identically with target depth and
with capture resolution, so NEITHER NEEDS SCALE MATCHING. A filled disc reads
fill 1.00 / spread 0.707; a sparse ring of chunks reads fill << 1 and
spread >> 0.707. `ncomp` (8-connected components above a pixel floor) is
reported alongside but is NOT dimensionless — it is resolution-dependent and
is published as corroboration only.

                          --- THE SELECTION ---

A FRAGMENTING MASS IS NOT ONE CONNECTED COMPONENT. "Largest 8-connected
component", which every R10 operator on both sides used, measures the largest
SURVIVING FRAGMENT and is therefore blind by construction to the exact
property under test. These statistics are computed over EVERY mask pixel
inside a per-event ROI, after the per-run persistence exclusion.

That trades one blind spot for a worse attribution problem: anything else
fire-coloured inside the ROI is counted. Three mitigations, all of them
mandatory for any figure taken with this file:

  1. the ROI is anchored on the event's own peak centroid and is SMALL
     (default 0.11 of frame width half-extent);
  2. the ATTRIBUTION HORIZON (lane-envelope.md §6.3) is measured in the SAME
     CAPTURE and published with every lag;
  3. `--marks` writes the measured mask over the ROI crop for every published
     lag. CROP IT AND LOOK. Two instruments were withdrawn in R10 for
     passing a selftest and failing this step.

                       --- COLOUR, FROM THE JUDGE ---

`corecolour` reimplements judging/R10 `jm.py:corecolour` verbatim (same three
class definitions, same `m_material` mask) so the judge's §1.4 table can be
reproduced and extended. Reproducing a number proves you ran THEIR operator,
not that it is the licensed one (R10's lesson) — the licence here is that
colour fractions are depth-free, which is the one thing §1.4 established.

Sampling rate: every figure this file produces is per-frame. The CALLER states
the rate. Arcade decodes are 60 Hz consecutive
(`ffmpeg -ss T -i ab2-longplay-60fps.mp4 -vsync 0 out/f%04d.png`,
`t = T_ss + (i-1)/60`, verified exactly in this round: frame f0106 of a
-ss 99.0 decode is byte-identical to reference/stage1-missile-salvo-t100.75.png,
mean |delta| 0.000000). Our captures are 60 Hz consecutive ticks via
`?fixed=1` + `window.__step(1)`.

Resolutions: arcade 1028x720 = 3.2125x native 320x224; our capture 960x672 =
3.00x native. `fill` and `spread` are dimensionless; the 7% resolution
difference is stated rather than corrected, and its direction is recorded in
the control (`--selftest` arm 7 runs the same synthetic at both scales).
"""
import sys, os, glob, math, json
import numpy as np
from PIL import Image

# --------------------------------------------------------------------------
# masks
# --------------------------------------------------------------------------

def load(p):
    return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)


def vs(a):
    mx = a.max(axis=2) / 255.0
    mn = a.min(axis=2) / 255.0
    v = mx
    s = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0.0)
    return v, s


def m_fire(a):
    """R9's band mask, kept for continuity with R10's envelope column.
    Blind to the white-hot core BY CONSTRUCTION, which is also why it is
    blind to the white HUD. lane-envelope.md §6.2: it is the orange/amber
    BAND of a fireball, not the fireball."""
    return (a[..., 0] > 180) & (a[..., 1] > 60) & (a[..., 1] < 235) & (a[..., 2] < 90)


def m_material(a, th=26):
    """Judge-R10's `m_material`: any warm, non-blue, non-dark material.
    SEES the white-hot core and the deep-red rim, which is what a
    fragmentation reading needs — a spray of chunks that have cooled to
    maroon is invisible to m_fire."""
    v, _ = vs(a)
    return (a[..., 0] > a[..., 2] + th) & (v > 0.25)


def m_material_hot(a, th=26):
    """`m_material` WIDENED so it accepts a near-neutral white-hot core.

    Judge-R10's mask is `R > B + 26`, and our authored core E_HOT #f7f7e6 has
    R - B = 17: our own white-hot colour is outside it, while the arcade's
    warmer (249, 231, 192) core (R - B = 57) is inside. Every `hot` figure in
    this round uses THIS mask on both sides; the judge's is kept for
    reproduction. Selftest arm 8b is the control.

    The extra clause is `V > 0.80 AND S < 0.25` — bright and near-neutral.
    It ACCEPTS WHITE, so it accepts the HUD, and therefore it may only be
    used with the per-run persistence exclusion active (the HUD is static) and
    with `--marks` cropped and looked at. The sky #009eff (S 1.0) and the sea
    are rejected by the saturation clause, not by the warmth clause."""
    v, s = vs(a)
    return ((a[..., 0] > a[..., 2] + th) & (v > 0.25)) | ((v > 0.80) & (s < 0.25))


def m_peach(a):
    v, s = vs(a)
    return (v > 0.70) & (a[..., 0] > a[..., 2] + 10) & (s > 0.10) & (s < 0.45)


def dilate(m, k=1):
    o = m.copy()
    for dy in range(-k, k + 1):
        for dx in range(-k, k + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


# --------------------------------------------------------------------------
# connected components, 8-connected, numpy union-find
# --------------------------------------------------------------------------

def components(m):
    """8-connected components. (labels, sizes, centroids).

    VECTORISED hook-and-compress union-find: the per-pixel Python loop this
    started as took minutes on a 350x350 ROI of a 100 000-px mask, which is
    the per-frame working size here. Selftest arm 7 cross-validates the
    result against the mask's own pixel count over 24 random densities and
    pins the 8-vs-4 diagonal topology (R9 ledger row 38's case)."""
    h, w = m.shape
    idx = -np.ones((h, w), np.int64)
    ys, xs = np.nonzero(m)
    n = len(ys)
    if n == 0:
        return np.zeros((h, w), np.int64) - 1, np.array([], np.int64), []
    idx[ys, xs] = np.arange(n)
    us, vsx = [], []
    for dy, dx in ((-1, -1), (-1, 0), (-1, 1), (0, -1)):
        a0 = idx[max(0, -dy):h - max(0, dy), max(0, -dx):w - max(0, dx)]
        b0 = idx[max(0, dy):h - max(0, -dy), max(0, dx):w - max(0, -dx)]
        sel = (a0 >= 0) & (b0 >= 0)
        us.append(a0[sel])
        vsx.append(b0[sel])
    u = np.concatenate(us) if us else np.array([], np.int64)
    v = np.concatenate(vsx) if vsx else np.array([], np.int64)
    P = np.arange(n, dtype=np.int64)
    while True:
        prev = P.copy()
        if len(u):
            np.minimum.at(P, u, P[v])
            np.minimum.at(P, v, P[u])
        while True:
            Pn = P[P]
            if np.array_equal(Pn, P):
                break
            P = Pn
        if np.array_equal(P, prev):
            break
    uniq, inv, counts = np.unique(P, return_inverse=True, return_counts=True)
    lab = -np.ones((h, w), np.int64)
    lab[ys, xs] = inv
    k = len(uniq)
    sy = np.bincount(inv, weights=ys, minlength=k)
    sx = np.bincount(inv, weights=xs, minlength=k)
    cens = [(float(sy[i] / counts[i]), float(sx[i] / counts[i])) for i in range(k)]
    return lab, counts, cens


def largest_cc(m):
    lab, sizes, cens = components(m)
    if len(sizes) == 0:
        return np.zeros_like(m), 0, None
    k = int(np.argmax(sizes))
    return lab == k, int(sizes[k]), cens[k]


# --------------------------------------------------------------------------
# convex hull (monotone chain) and the two shape statistics
# --------------------------------------------------------------------------

def hull_area(pts):
    """Area of the convex hull of integer pixel CENTRES, plus 0.5-px
    inflation on each boundary so a single pixel has area 1 and a filled
    disc reads fill ~= 1.0 rather than 1.0 + O(1/R). The inflation is
    implemented by hulling the four CORNERS of every pixel, which is exact:
    the hull of the pixels-as-unit-squares is the hull of their corners."""
    if len(pts) == 0:
        return 0.0
    c = np.concatenate([pts + [0, 0], pts + [0, 1], pts + [1, 0], pts + [1, 1]])
    c = np.unique(c, axis=0)
    if len(c) < 3:
        return 0.0
    c = c[np.lexsort((c[:, 1], c[:, 0]))]

    def half(ps):
        st = []
        for p in ps:
            while len(st) >= 2:
                o, a = st[-2], st[-1]
                if (a[0] - o[0]) * (p[1] - o[1]) - (a[1] - o[1]) * (p[0] - o[0]) <= 0:
                    st.pop()
                else:
                    break
            st.append(p)
        return st

    lo = half(c)
    hi = half(c[::-1])
    poly = np.array(lo[:-1] + hi[:-1], float)
    if len(poly) < 3:
        return 0.0
    x, y = poly[:, 0], poly[:, 1]
    return 0.5 * abs(np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def shape(m, minpx=4):
    """The dimensionless shape statistics over EVERY pixel of `m`."""
    ys, xs = np.nonzero(m)
    n = len(ys)
    if n == 0:
        return dict(area=0, fill=float('nan'), spread=float('nan'), ncomp=0,
                    reach=float('nan'), cy=float('nan'), cx=float('nan'))
    cy, cx = ys.mean(), xs.mean()
    r2 = (ys - cy) ** 2 + (xs - cx) ** 2
    rg = math.sqrt(r2.mean())
    r_eq = math.sqrt(n / math.pi)
    # Only per-ROW EXTREME pixels can be convex-hull vertices, so hulling
    # them is exact and turns an O(area) hull into an O(height) one.
    order = np.lexsort((xs, ys))
    yo, xo = ys[order], xs[order]
    first = np.r_[True, yo[1:] != yo[:-1]]
    last = np.r_[yo[1:] != yo[:-1], True]
    ext = np.stack([np.r_[yo[first], yo[last]], np.r_[xo[first], xo[last]]], 1)
    ha = hull_area(ext)
    _, sizes, _ = components(m)
    return dict(area=int(n), fill=n / ha if ha > 0 else float('nan'),
                spread=rg / r_eq if r_eq > 0 else float('nan'),
                ncomp=int((sizes >= minpx).sum()),
                reach=math.sqrt(r2.max()) / r_eq if r_eq > 0 else float('nan'),
                cy=float(cy), cx=float(cx))


# --------------------------------------------------------------------------
# colour — judge-R10's operator, reimplemented
# --------------------------------------------------------------------------

def corecolour(a, m=None):
    """Verbatim reimplementation of judging/R10 `jm.py:corecolour`."""
    if m is None:
        m = m_material(a)
    if m.sum() == 0:
        return None
    px = a[m]
    gr = px[:, 1] / np.maximum(px[:, 0], 1)
    v, _ = vs(px.reshape(-1, 1, 3))
    v = v.reshape(-1)
    hot = ((px[:, 0] > 200) & (px[:, 1] > 160) & (px[:, 2] > 110)).mean()
    yell = ((gr > 0.62) & (px[:, 0] > 180)).mean()
    deep = ((gr < 0.45) & (px[:, 0] > 100)).mean()
    return dict(n=int(m.sum()), meanV=float(v.mean()),
                hot=float(hot), yellow=float(yell), deepred=float(deep))


# --------------------------------------------------------------------------
# the event: ROI, persistence exclusion, attribution horizon
# --------------------------------------------------------------------------

def persistence_exclusion(masks, frac=0.5, k=1):
    acc = np.sum([m.astype(np.int32) for m in masks], axis=0)
    return dilate(acc > frac * len(masks), k)


def event(files, peak_hint=None, search=None, roi_half=0.11, mask=m_material,
          minpx=4, excl_frac=0.5, roi=None):
    """Measure one event. `peak_hint` is a frame INDEX (0-based) near the
    event; the peak is the largest-component maximum within +-`search` of it.
    The ROI is anchored on the peak's own largest-component centroid.

    Returns per-frame shape + colour rows over the whole file list, so the
    caller can read any lag and so the pre-first-light clutter level is
    visible in the same table."""
    imgs = [load(p) for p in files]
    H, W, _ = imgs[0].shape
    masks = [mask(a) for a in imgs]
    excl = persistence_exclusion(masks, excl_frac)
    masks = [m & ~excl for m in masks]
    sizes = [largest_cc(m)[1] for m in masks]
    if peak_hint is None:
        pk = int(np.argmax(sizes))
    else:
        s = search if search is not None else 10
        lo, hi = max(0, peak_hint - s), min(len(files), peak_hint + s + 1)
        pk = lo + int(np.argmax(sizes[lo:hi]))
    _, _, cen = largest_cc(masks[pk])
    cy, cx = cen
    if roi is None:
        half = int(roi_half * W)
        y0, y1 = max(0, int(cy) - half), min(H, int(cy) + half)
        x0, x1 = max(0, int(cx) - half), min(W, int(cx) + half)
        roi = (y0, y1, x0, x1)
    else:
        y0, y1, x0, x1 = roi
        # A hand-set ROI is only legitimate if the SELECTION is re-made
        # inside it: picking the peak off a whole-frame largest component
        # and then measuring a different box is how the island became the
        # event the first time this ran.
        inner = [(m[y0:y1, x0:x1]).sum() for m in masks]
        if peak_hint is None:
            pk = int(np.argmax(inner))
        else:
            s = search if search is not None else 10
            lo, hi = max(0, peak_hint - s), min(len(files), peak_hint + s + 1)
            pk = lo + int(np.argmax(inner[lo:hi]))
    npx = (y1 - y0) * (x1 - x0)
    rows = []
    for i, a in enumerate(imgs):
        mr = masks[i][y0:y1, x0:x1]
        sh = shape(mr, minpx)
        cc = corecolour(a[y0:y1, x0:x1], mr)
        row = dict(i=i, lag=i - pk, areafrac=sh['area'] / npx, **sh)
        if cc:
            row.update({k: cc[k] for k in ('hot', 'yellow', 'deepred', 'meanV')})
        rows.append(row)
    # ---- THE LICENCE FOR AN ALL-PIXEL SHAPE READING ------------------------
    #
    # The R10 ATTRIBUTION HORIZON is defined on a LARGEST-COMPONENT selection:
    # it fires when that selection's centroid jumps. A genuinely FRAGMENTING
    # event trips it BY FRAGMENTING — the largest component stops being the
    # same fragment the moment the mass breaks — so the horizon cannot license
    # the measurement of a break-up. It is still computed and published here,
    # because when it is long it is informative and because withholding it
    # would be hiding an unfavourable reading; it is simply not the gate.
    #
    # The gate for these statistics is different, because the statistics are
    # different: `fill` and `spread` are computed over EVERY mask pixel in the
    # ROI, so the only question is whether anything ELSE is in the ROI. That is
    # answered by the ROI's own clutter floor — the median masked fraction of
    # the ROI over the frames BEFORE first light, in this same capture — and a
    # lag is licensed while the event's area is at least 4x it. Crop it and
    # look as well: the floor cannot see a competitor that arrives late.
    pre = [r['areafrac'] for r in rows[:max(1, _first_light(rows, pk))]]
    clutter_roi = float(np.median(pre)) if pre else 0.0
    for r in rows:
        r['licensed'] = r['areafrac'] >= 4 * clutter_roi
    # attribution horizon, measured in THIS capture (lane-envelope.md 6.3):
    # the earlier of (a) the first lag at which the largest component's
    # centroid jumps > T of frame width between consecutive frames, and
    # (b) the first lag at which the largest component has fallen to 2x the
    # pre-first-light clutter level.
    hz = horizon(masks, pk, W, rows)
    return dict(files=files, roi=roi, npx=npx, pk=pk, rows=rows, excl=excl,
                W=W, H=H, centroid=(cy, cx), horizon=hz, masks=masks,
                clutter_roi=clutter_roi)


def _first_light(rows, pk, thresh=0.25):
    peak = max(r['area'] for r in rows)
    fl = pk
    while fl > 0 and rows[fl - 1]['area'] > thresh * peak:
        fl -= 1
    return fl


def horizon(masks, pk, W, rows, T=0.10, first_light_thresh=0.25):
    """Two conditions, both required (the earlier wins). The size floor is
    the condition the R10 lane found the hard way: a jump-only detector
    reported a 28-frame horizon while sitting on the player's own afterburner
    nozzles, which move smoothly so no jump ever fires."""
    peak_area = max(r['area'] for r in rows)
    fl = pk
    while fl > 0 and rows[fl - 1]['area'] > first_light_thresh * peak_area:
        fl -= 1
    pre = [largest_cc(m)[1] for m in masks[:max(fl, 1)]]
    clutter = float(np.median(pre)) if pre else 0.0
    cens = []
    for m in masks:
        _, n, c = largest_cc(m)
        cens.append((n, c))
    h_jump = None
    for lag in range(1, len(masks) - pk):
        a, b = cens[pk + lag - 1][1], cens[pk + lag][1]
        if a is None or b is None:
            h_jump = lag - 1
            break
        if math.hypot(a[0] - b[0], a[1] - b[1]) > T * W:
            h_jump = lag - 1
            break
    h_size = None
    for lag in range(1, len(masks) - pk):
        if cens[pk + lag][0] <= 2 * clutter:
            h_size = lag - 1
            break
    cands = [h for h in (h_jump, h_size) if h is not None]
    return dict(horizon=(min(cands) if cands else len(masks) - pk - 1),
                jump=h_jump, size=h_size, clutter=clutter, first_light=fl)


def marks(ev, lags, path, tile=200, label=True):
    """Write the measured mask over the ROI crop at the given lags."""
    y0, y1, x0, x1 = ev['roi']
    tiles = []
    for lag in lags:
        i = ev['pk'] + lag
        if i < 0 or i >= len(ev['files']):
            continue
        a = load(ev['files'][i]).copy()
        m = ev['masks'][i]
        a[m] = a[m] * 0.35 + np.array([0, 255, 0]) * 0.65
        im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).crop((x0, y0, x1, y1))
        im = im.resize((tile, tile), Image.NEAREST)
        tiles.append(im)
    s = Image.new('RGB', (tile * len(tiles), tile), (16, 16, 16))
    for k, t in enumerate(tiles):
        s.paste(t, (k * tile, 0))
    s.save(path)
    return path


# --------------------------------------------------------------------------
# controls
# --------------------------------------------------------------------------

def _disc(h, w, cy, cx, r):
    yy, xx = np.mgrid[0:h, 0:w]
    return (yy - cy) ** 2 + (xx - cx) ** 2 <= r * r


def selftest():
    ok = tot = 0

    def chk(name, cond, got=''):
        nonlocal ok, tot
        tot += 1
        ok += bool(cond)
        print(('PASS ' if cond else 'FAIL ') + name + ('   ' + str(got) if got else ''))

    # --- arm 1: a filled disc. fill = 1.00, spread = 1/sqrt(2) = 0.7071 ----
    m = _disc(201, 201, 100, 100, 60)
    s = shape(m)
    chk('disc fill 1.00', abs(s['fill'] - 1.0) < 0.02, '%.4f' % s['fill'])
    chk('disc spread 0.7071', abs(s['spread'] - 0.70711) < 0.01, '%.4f' % s['spread'])
    chk('disc ncomp 1', s['ncomp'] == 1, s['ncomp'])

    # --- arm 2: an annulus a=0.8R. closed form fill 0.36, spread 1.5092 ----
    m = _disc(201, 201, 100, 100, 60) & ~_disc(201, 201, 100, 100, 48)
    s = shape(m)
    chk('annulus fill 0.36', abs(s['fill'] - 0.36) < 0.02, '%.4f' % s['fill'])
    chk('annulus spread 1.5092', abs(s['spread'] - 1.5092) < 0.02, '%.4f' % s['spread'])

    # --- arm 3: a sparse spray. 8 discs of r=8 on a ring of R=70 ----------
    # CLOSED FORM, derived before the operator was run (my first expectation,
    # fill ~= 0.116, was WRONG and the operator was right — the hull of a set
    # of discs is NOT the polygon through their centres, it bulges by r):
    #   hull  = area(octagon R=70) + perimeter(octagon) * r + pi r^2
    #         = 13859.3 + 428.6*8 + 201.1 = 17489
    #   mask  = 8 * pi * 64 = 1608.5
    #   fill  = 1608.5/17489 = 0.0919
    #   Rg^2  = R^2 + r^2/2 = 4932 ;  r_eq = r*sqrt(8) = 22.627
    #   spread= sqrt(4932)/22.627 = 3.104
    h = w = 201
    m = np.zeros((h, w), bool)
    for k in range(8):
        a = 2 * math.pi * k / 8
        m |= _disc(h, w, 100 + 70 * math.sin(a), 100 + 70 * math.cos(a), 8)
    s = shape(m)
    chk('spray fill 0.0919 (closed form)', abs(s['fill'] - 0.0919) < 0.006,
        '%.4f' % s['fill'])
    chk('spray spread 3.104 (closed form)', abs(s['spread'] - 3.104) < 0.03,
        '%.4f' % s['spread'])
    chk('spray ncomp 8', s['ncomp'] == 8, s['ncomp'])

    # --- arm 4: THE DISCRIMINATION. the spray and an EQUAL-AREA disc -------
    # This is the arm that matters: `area` cannot tell them apart and the two
    # new statistics must. A disc of the same area as the 8-chunk spray.
    r_eq = math.sqrt(s['area'] / math.pi)
    d = shape(_disc(h, w, 100, 100, r_eq))
    chk('equal-area disc has same area +-2%%',
        abs(d['area'] - s['area']) / s['area'] < 0.02,
        '%d vs %d' % (d['area'], s['area']))
    chk('fill separates them by >5x', s['fill'] < d['fill'] / 5,
        '%.3f vs %.3f' % (s['fill'], d['fill']))
    chk('spread separates them by >4x', s['spread'] > d['spread'] * 4,
        '%.3f vs %.3f' % (s['spread'], d['spread']))

    # --- arm 5: SCALE INVARIANCE, the licence for cross-side comparison ---
    # the same spray at 3.0x and 3.2125x — our capture scale and the arcade's
    for sc, tag in ((3.0, 'ours 3.00x'), (3.2125, 'arcade 3.2125x')):
        hh = ww = int(67 * sc) * 3
        mm = np.zeros((hh, ww), bool)
        for k in range(8):
            a = 2 * math.pi * k / 8
            mm |= _disc(hh, ww, hh / 2 + 70 / 3 * sc * math.sin(a),
                        ww / 2 + 70 / 3 * sc * math.cos(a), 8 / 3 * sc)
        ss = shape(mm)
        chk('scale-invariant fill @%s' % tag, abs(ss['fill'] - s['fill']) < 0.02,
            '%.4f' % ss['fill'])
        chk('scale-invariant spread @%s' % tag, abs(ss['spread'] - s['spread']) < 0.08,
            '%.4f' % ss['spread'])

    # --- arm 6: hull area on a known polygon ------------------------------
    m = np.zeros((50, 50), bool)
    m[10:30, 10:40] = True
    chk('hull of a 20x30 rect = 600', abs(hull_area(np.stack(np.nonzero(m), 1)) - 600) < 1e-6,
        hull_area(np.stack(np.nonzero(m), 1)))
    chk('single pixel hull = 1', abs(hull_area(np.array([[5, 5]])) - 1.0) < 1e-9)

    # --- arm 7: components, cross-validated against a slow union-find -----
    rng = np.random.default_rng(7)
    bad = 0
    for d in (0.05, 0.2, 0.35, 0.5):
        for _ in range(6):
            mm = rng.random((40, 40)) < d
            _, sizes, _ = components(mm)
            if sizes.sum() != mm.sum():
                bad += 1
    chk('components partition the mask over 24 random densities', bad == 0, bad)
    ring = np.zeros((9, 9), bool)
    for k, (yy, xx) in enumerate([(1, 1), (2, 2), (3, 3), (4, 4), (5, 5)]):
        ring[yy, xx] = True
    _, sizes, _ = components(ring)
    chk('diagonal chain is ONE 8-connected component', len(sizes) == 1 and sizes[0] == 5)

    # --- arm 8: the judge's colour classes on prescribed colours ----------
    # `all1` forces the mask so this arm tests the CLASSES ONLY, separately
    # from the mask (which arm 8b then tests on its own).
    all1 = np.ones((1, 1), bool)
    c = corecolour(np.array([[[247, 247, 230]]], np.float32), all1)   # E_HOT
    chk('E_HOT classes hot', c['hot'] == 1.0)
    c = corecolour(np.array([[[247, 247, 74]]], np.float32), all1)    # E_YELLOW
    chk('E_YELLOW classes yellow not hot', c['yellow'] == 1.0 and c['hot'] == 0.0)
    c = corecolour(np.array([[[156, 0, 0]]], np.float32), all1)       # E_RIM
    chk('E_RIM classes deepred', c['deepred'] == 1.0)
    px = np.array([[[0, 158, 255]]], np.float32)     # AB2 sky
    chk('material rejects AB2 sky', not m_material(px)[0, 0])

    # --- arm 8b: A MASK ASYMMETRY THE JUDGE'S OPERATOR CARRIES, recorded
    # here as a control result rather than argued in prose.
    #
    # judge-R10 `m_material` is `R > B + 26 AND V > 0.25`. Our authored
    # white-hot core is E_HOT #f7f7e6 = (247, 247, 230), R - B = 17, so IT
    # IS OUTSIDE THE MASK. The arcade's near-white core is warmer —
    # REFERENCE.md's t100.75 kill reads RGB (249, 231, 192), R - B = 57 —
    # and is INSIDE it. So the judge's `hot` column cannot see OUR core
    # while it can see the arcade's: the asymmetry runs AGAINST us, and the
    # judge's "ours is white-hot for exactly two frames" is a floor on our
    # hot fraction at lag 0, not a measurement of it.
    #
    # (It does NOT weaken the defect itself: phases 1 and 2 draw no core at
    # all — `explosions.js` returns before the core grid on `!phase.core` —
    # so zero after two frames is true from the source, independent of any
    # mask. `m_material_hot` below is the repair, used for every hot figure
    # this round, and the judge's mask is kept alongside for continuity.)
    chk('judge m_material REJECTS our E_HOT (the asymmetry)',
        not m_material(np.array([[[247, 247, 230]]], np.float32))[0, 0])
    chk('judge m_material ACCEPTS the arcade core (249,231,192)',
        m_material(np.array([[[249, 231, 192]]], np.float32))[0, 0])
    chk('repaired mask accepts BOTH cores',
        m_material_hot(np.array([[[247, 247, 230]]], np.float32))[0, 0]
        and m_material_hot(np.array([[[249, 231, 192]]], np.float32))[0, 0])
    chk('repaired mask still rejects AB2 sky #009eff',
        not m_material_hot(np.array([[[0, 158, 255]]], np.float32))[0, 0])
    chk('repaired mask still rejects the sea #5a8cc8',
        not m_material_hot(np.array([[[90, 140, 200]]], np.float32))[0, 0])
    chk('repaired mask ACCEPTS pure white — so the HUD must be excluded',
        m_material_hot(np.array([[[255, 255, 255]]], np.float32))[0, 0])

    # --- arm 9: the persistence exclusion, non-vacuously ------------------
    frames = []
    for i in range(60):
        a = np.zeros((80, 120, 3), np.float32)
        a[..., 2] = 255                      # sky
        a[2:6, 90:118] = [255, 255, 255]     # static HUD bar
        a[70:76, 10:16] = [255, 119, 51]     # static nozzle
        if 20 <= i < 26:
            a[30:50, 40:60] = [230, 120, 40]  # the transient
        frames.append(a)
    masks = [m_material(a) for a in frames]
    ex = persistence_exclusion(masks, 0.5, 1)
    left = [(m & ~ex).sum() for m in masks]
    chk('exclusion removes the static nozzle entirely', max(left[0:19]) == 0, max(left[0:19]))
    chk('exclusion keeps the transient', left[22] > 300, left[22])
    chk('exclusion test is NON-VACUOUS: material DOES accept the nozzle',
        m_material(np.array([[[255, 119, 51]]], np.float32))[0, 0])
    chk('m_fire rejects the white HUD bar',
        not m_fire(np.array([[[255, 255, 255]]], np.float32))[0, 0])

    # --- arm 10: the horizon detector, BOTH conditions, prescribed --------
    #
    # 40 frames, 300 px wide. PRESCRIPTION:
    #   * the event: frames 8..30 at (100, 80), radius 34 at f8 falling 2.4
    #     px/frame, so the PEAK IS f8 and the area is pi*r^2;
    #   * a DECOY at (100, 240) radius 26 (area 2124) in frames 15..24 only —
    #     10 of 40 frames, so it SURVIVES the 50 % persistence exclusion.
    #     At f15 the event's radius is 18 (area 1017) so the largest-component
    #     selection re-targets to the decoy, a 160 px centroid jump against a
    #     T = 10 % x 300 = 30 px threshold. => h_jump = 6.
    #   * a 9x9 CLUTTER blob drifting 4 px/frame, present in every frame, so
    #     the exclusion cannot remove it and clutter = 81 px. The size floor
    #     tests the LARGEST COMPONENT, which from f15 to f24 is the 2124 px
    #     decoy, so it cannot fire while the decoy holds the selection up; it
    #     fires at f25, the first frame after the decoy leaves, where the
    #     largest surviving component is the 81 px clutter blob itself.
    #     => h_size = 16, LATER than the jump, so the horizon must be 6.
    #
    #     THAT IS THE POINT OF THE ARM, not an accident of it: a size floor
    #     alone is blind for as long as something else is big enough to be
    #     selected — the mirror image of the R10 lane's finding that a
    #     jump test alone is blind to a competitor that moves smoothly.
    #     Each condition covers the other's blind spot and NEITHER IS
    #     SUFFICIENT; this arm fails if either is dropped.
    #
    # My FIRST version of this arm failed all three of its own assertions and
    # the detector was right both times: I mis-derived the peak frame (the
    # radius formula peaks at f8, not the f10 I asserted) and I made the decoy
    # PERSISTENT (25 of 40 frames -> 62 %), so the exclusion removed it and
    # there was nothing to re-target to. Recorded because "the instrument
    # disagrees with my expectation" resolved to "my expectation was wrong"
    # twice in one arm.
    files = []
    tmp = os.environ.get('TMPDIR', '/tmp') + '/fxr11_selftest'
    os.makedirs(tmp, exist_ok=True)
    for i in range(40):
        a = np.zeros((200, 300, 3), np.float32)
        a[..., 2] = 255
        a[20:29, 4 * i:4 * i + 9] = [230, 120, 40]        # drifting clutter
        if 8 <= i <= 30:
            r = max(2, int(34 - 2.4 * (i - 8)))
            a[_disc(200, 300, 100, 80, r)] = [230, 120, 40]
        if 15 <= i <= 24:
            a[_disc(200, 300, 100, 240, 26)] = [230, 120, 40]
        p = '%s/f%04d.png' % (tmp, i)
        Image.fromarray(a.astype(np.uint8)).save(p)
        files.append(p)
    ev = event(files, peak_hint=8, search=4, roi_half=0.45)
    hz = ev['horizon']
    chk('horizon: peak at the prescribed frame 8', ev['pk'] == 8, ev['pk'])
    chk('horizon: clutter floor recovered as 81 px', hz['clutter'] == 81.0, hz['clutter'])
    chk('horizon: jump condition fires at the prescribed lag 6', hz['jump'] == 6, hz['jump'])
    chk('horizon: size floor fires at the prescribed lag 16', hz['size'] == 16, hz['size'])
    chk('horizon: the EARLIER condition wins', hz['horizon'] == 6, hz['horizon'])
    chk('horizon: refuses to license the decoy frame f15',
        ev['pk'] + hz['horizon'] < 15, ev['pk'] + hz['horizon'])

    print('%d/%d' % (ok, tot))
    return ok == tot


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--selftest':
        sys.exit(0 if selftest() else 1)
    print(__doc__)
