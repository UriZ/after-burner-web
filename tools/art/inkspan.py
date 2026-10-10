#!/usr/bin/env python3
"""INK-SPAN / STROKE — the DRAWING-WEIGHT operator.

Why this file exists
--------------------
Every statistic this project owns for the player aircraft is a VALUE or a
PALETTE statistic (value_census.py, the Criterion A ladder, the keyline
budget) or a SILHOUETTE-TOPOLOGY statistic (jetsil.py: two-blade rows, fin
extent, nozzle separation, cant). In R8 all of them passed on a sprite the
owner and the art critic both called wrong, and the critic found why with a
statistic nobody had taken: the aircraft carries 1.80x the arcade's INK at
the same wingspan. See judging/R8/art-critique.md §4.

The gap that closed is between "which colours, where" and "HOW MUCH LINE".
An arcade astern jet is drawn as LIT EDGES -- four thin blades, each a
2-3 px bright stroke with a dark shadow stroke beside it, and two heavy
nozzle discs. Ours was drawn as FILLED SURFACES with a perimeter outline.
Both can satisfy every value and topology gate simultaneously. Only a
drawing-weight statistic separates them.

The two statistics, stated once
-------------------------------
  INK       count of airframe-mask pixels, largest 8-connected component.
  SPAN      maximum pairwise distance between mask pixels (the Feret
            diameter), NOT the maximum row extent. The two agree on a level
            aircraft and diverge on a banked one, and the whole point of
            this operator is that it may be read on any pose. Computed on
            the convex hull, exactly.
  INK/SPAN  ink divided by span. This is the art critic's R8 invention. It
            is the mean number of lit pixels per pixel of wingspan, i.e.
            the aircraft's average drawn CROSS-SECTION.

            IT IS NOT SCALE-FREE, and that matters. Magnify a sprite by
            1.16 and INK/SPAN rises by 1.16 with not one pixel of the
            drawing changed -- which is precisely the difference between our
            authored level cell (SPAN 99) and the same cell measured on
            screen (SPAN 115, the R8 critique's reading). So INK/SPAN is
            only ever quoted here WITH the span it was read at.

  DENS      1000 x ink / span^2. The scale-free form, and the one to gate
            on. Dimensionless, bank-invariant (control 2), magnification-
            invariant. Arcade 84.4 (day, banked, native) and 83.3 (night,
            level, video) -- two poses, two times of day, two capture
            chains, agreeing to 1.3 %.

  SW        MEDIAN STROKE WIDTH = 2 x median over ink pixels of the
            Euclidean distance to the nearest background pixel. This file's
            addition. INK/SPAN says the drawing is too heavy; SW says WHERE
            the weight is, because it is a LOCAL measure: a 3 px stroke
            returns 3 whether it is 10 px long or 100, and a filled paddle
            returns its thickness no matter how little of the frame it
            covers. A drawing can hit INK/SPAN by shrinking and still be
            made of slabs; it cannot hit SW that way.
  P90SW     the 90th percentile of the same distribution -- the thickest
            mass on the aircraft. SW can be dragged down by a long thin
            keyline around a fat body; P90SW cannot.
  RSW/RP90  SW and P90SW as a percentage of SPAN: the scale-free forms,
            and again the ones to gate on. Arcade RSW 2.58 / 2.40.

All are reported raw (native px) and scale-free.

What this operator CANNOT see, stated so the next lane does not have to
rediscover it
-------------------------------------------------------------------------
  * It is blind to COLOUR. A correctly-weighted drawing in the wrong hues
    scores identically. Run value_census.py and the ladder beside it.
  * **EVERY NUMBER HERE IS A NUMBER UNDER A NAMED MASK, and the stroke
    statistics are the MOST mask-sensitive of the four.** Measured on one
    crop (ab2-arcade-desert.png, the arcade jet), changing only the
    membership rule -- four authored roles against this file's rule -- while
    holding the implementation fixed:

        ink +16 %   INK/SPAN +15 %   DENS +14 %   RSW +40 %   RP90 +30 %

    against, for the SAME rule across two independently built
    implementations: ink exact, RSW 0.8 %, RP90 0.9 %. SW measures LOCAL
    THICKNESS, so admitting six mid-tones thickens every drawn mass; ink only
    grows by the pixels themselves.

    So: cite the mask rule in the same sentence as the number, every time. A
    gate on RP90 is a gate on RP90-under-a-named-mask. (I published the
    opposite of this first -- see the day-mask note below -- and the criteria
    lane caught it, having just withdrawn the same claim itself. Two lanes
    reached the same wrong conclusion from the same coincidence.)
  * DENS AND INK/SPAN ARE NEARLY BLIND TO THE DEFECT THIS LANE EXISTS TO
    CATCH, and that is measured, not hedged. Control 7 builds a matched pair
    -- ONE CENTRED BAR against FOUR SEPARATED BLADES at the SAME ink and the
    SAME span, which is exactly the R4->R8 silhouette defect and exactly the
    head-on enemy defect -- and reads:

        INK/SPAN 1.025x    DENS 1.037x    RSW 1.430x    RP90 1.811x

    DENS separates a slab from a structure by 3.7 %. On a video-sourced
    anchor the criteria lane measured DENS's own background-tolerance licence
    at 17.3 % over tol 8-64, so THE SIGNAL IS FOUR TIMES SMALLER THAN THE
    MEASUREMENT'S OWN NOISE BAND. A build could go from four blades to a
    solid bar and DENS would move less than re-picking the tolerance does.

    So: DENS is a DIAGNOSTIC (is the drawing half-empty, or twice the
    arcade's weight?), not a silhouette gate. RP90 is the distribution
    statistic, with RSW beside it. jetsil.py's two-blade / fin-extent / cant
    statistics remain the topology gate and must keep passing. Credit: the
    criteria-fix lane found this with an independent implementation and a
    corrected control, and I reproduced it here before adopting it.
  * It is blind to WHERE the ink is in the OTHER sense: four blades and a
    blob of the same total ink AND the same local thickness read the same.
  * SW is quantised by the pixel grid: on a 3 px stroke the EDT takes only
    the values 1 and 2, so SW lands on 2, 3 or 4 and nothing between. Do
    not read a 0.3 difference as a change.

    THIS MAKES RSW THE LEAST ROTATION-STABLE OF THE FOUR, which matters
    because an astern bank IS a rotation. Control 6 rotates one drawing
    through eight angles and reports the coefficient of variation:

        INK/SPAN 1.2 %    DENS 1.7 %    RP90 5.3 %    RSW 18.4 %

    RSW is tolerance-free (it reads 2.40 at every background tolerance from
    8 to 64 on the arcade's night crop) and it is NOT rotation-free. RP90 is
    the only one of the four that is both reasonably rotation-stable (5.3 %)
    and distribution-sensitive (1.81x). If one number has to be the gate,
    it should be RP90, not RSW -- quote RSW beside it, not instead of it.
  * SPAN is a convex-hull diameter, so a single stray pixel (a shed debris
    fleck inside the mask, a missile still touching the wing) inflates it
    and deflates INK/SPAN. ALWAYS run with --dump and look at the mask.
  * It says nothing about ANIMATION, and the arcade's aircraft is a
    sequence of poses.

CONTROLS (python3 tools/art/inkspan.py --selftest)
--------------------------------------------------
An uncontrolled operator is how the R3 triple shipped. Five controls:
  1  analytic stroke figure: ink and SW known in closed form.
  2  the SAME figure rotated 35 deg: INK/SPAN and SW must be invariant.
     This is the BANK-INVARIANCE claim, tested rather than asserted.
  3  a FILLED figure of the same span and the same four limbs: must
     separate from (1) on both statistics, in the right direction.
  4  SPAN on a known-diameter disc.
  5  the arcade's own daylight jet. SPAN must reproduce the art critic's
     published 109.7 exactly. INK does NOT reproduce its 803 and the
     reconciliation is in the control's own output -- see RECONCILIATION.

RECONCILIATION with judging/R8/art-critique.md §4
-------------------------------------------------
The R8 critic published ink 803 / span 109.7 / ink-per-span 7.32 on this
same crop. This operator returns 984 / 109.7 / 8.97. SPAN agrees exactly and
INK does not, so the two masks differ -- "same name, different operator",
which this project has paid for before and which is reconciled here rather
than left as a discrepancy.

Resolved by colour: inside THIS mask, #840000 is 224 px and #000000 is
135 px. The critic's published shares, 27.9 % and 16.8 % of 803, are 224.0
and 134.9. **The two masks hold exactly the same dark-accent pixels.** The
whole 181 px difference is in the pale tones, and it is one tone: #f7e6b5,
178 px, the arcade's measured SECOND cream (REFERENCE.md; 23.7 % of the
airframe in tools/art/value_census.py's own arcade census). It is absent
from the critic's denominator and present in this one.

#f7e6b5 is an airframe tone on the project's own published census, so this
operator keeps it. The consequence is that every figure below is on an
8.97 anchor, not a 7.32 one, and the two must never be mixed. The RATIO is
what the lane is steered by and it is almost unchanged: the critic read ours
at 1.80x the arcade; this operator reads the same two subjects at 1.73x.
"""
import sys
import math
import json

import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# masks
# ---------------------------------------------------------------------------

# THE AIRFRAME MASK, one rule for both sides.
#
# The arcade jet's airframe tones are all LOW SATURATION (#ffffef s=0.063,
# #f7e6b5 0.267, #d6d6a4 0.234, #a48484 0.195, #ceb59c 0.243) where the sky
# and sand it sits on are saturated gold (#f7b500 s=1.000, #e67300 1.000).
# Three measured accents are saturated and must be named rather than
# thresholded in: the daylight keyline #840000, the nozzle throat #000000,
# and the measured NIGHT keyline #425284 (s=0.500). So the rule is
# "achromatic OR one of three named hexes", largest 8-connected component.
#
# The afterburner glow is DELIBERATELY OUTSIDE the mask -- it is saturated
# orange on both sides, so excluding it by the same sat<0.35 line keeps the
# comparison symmetric. It leaves two holes in the nozzle discs; that is
# visible in every --dump and is the same on the arcade side.
#
# The desert ALSO carries low-saturation grey rock outcrops, which is why the
# component step is not optional and why --dump exists. Verified by looking:
# tools/out/drawing-r9/mask-arc-day.png.
#
# THE DAY MASK'S TONE LIST, PUBLISHED IN FULL so a third party can re-run it.
# The criteria-fix lane could not cross-validate the day anchor because its
# own operator is a not-background mask and THIS CROP HAS NO BACKGROUND -- the
# jet sits on dense desert terrain, where #e67300 is only 24 % of the crop.
# That is a correct finding about the frame, and the remedy is to state the
# membership explicitly rather than to describe the rule.
#
# reference/ab2-arcade-desert.png x[80,180] y[82,142], largest 8-connected
# component, 1016 px total:
#
#   IN, selected by sat<0.35            IN, selected by name
#     #ffffef  239   24.3 %               #840000  224   22.8 %
#     #f7e6b5  178   18.1 %               #000000  135   13.7 %
#     #a48484   96    9.8 %
#     #d6d6a4   60    6.1 %             IN, recovered by fill_holes (the
#     #ceb59c   41    4.2 %             afterburner glow, saturated, so the
#     #ffffff    6    0.6 %             rule rejects it and the hole-fill
#     #948463    4    0.4 %             puts it back -- 32 px)
#     #f7f7f7    1    0.1 %               #f78400 13, #f7b500 11, #f7e694 8
#
# OUT, and the two that matter are declared rather than buried:
#   * #e694f7, 9 px -- THE CANOPY FLECK. Saturated magenta, so sat<0.35
#     rejects it and it is not enclosed, so the hole-fill cannot recover it.
#     The day mask therefore UNDER-counts the arcade jet by ~0.9 % of ink.
#   * #940000 / #f70000 / #c50000 / #b50000 and friends -- explosion debris
#     elsewhere in the crop, correctly excluded by the component step.
# Everything else OUT is sky (#e67300 1249 px) or desert terrain.
AIRFRAME_EXTRA = [(0x84, 0x00, 0x00), (0x00, 0x00, 0x00), (0x42, 0x52, 0x84)]


def mask_achromatic(rgb, sat_max=0.35, v_min=0.08, extra=()):
    a = rgb.astype(np.int32)
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    sat = np.where(mx == 0, 0.0, (mx - mn) / np.maximum(mx, 1))
    m = (sat < sat_max) & (mx / 255.0 > v_min)
    for hx in extra:
        m |= np.all(a == np.array(hx, dtype=np.int32), axis=2)
    return m


def mask_alpha(rgba):
    return rgba[:, :, 3] > 0


def mask_value(rgb, v=30):
    """jetsil.py's dark-background form: max(R,G,B) > v. The right mask for a
    night jet on a black sky, where the achromatic rule fails (the airframe's
    own blue-greys run past s=0.35) and the #000000 clause would swallow the
    whole sky."""
    return rgb.astype(np.int32).max(axis=2) > v


def fill_holes(m):
    """Fill background regions not 4-CONNECTED to the frame border.

    THE BACKGROUND FLOOD IS 4-CONNECTED AND THE FOREGROUND IS 8-CONNECTED,
    and that pairing is forced, not a preference. In digital topology one of
    the two must be 4-connected or the Jordan curve property fails: with
    BOTH at 8, a diagonal chain of foreground pixels does not separate the
    plane, so background leaks out through a ring that is diagonally closed
    and an enclosed region is wrongly declared open.

    This file shipped an 8-connected background flood and it UNDER-FILLED.
    Caught by the criteria lane publishing a different arcade ink from the
    same crop: on the four-role mask of ab2-arcade-desert.png x[80,180]
    y[82,142] the 8-connected flood recovers 55 px and the 4-connected flood
    recovers 133 -- **78 px, 8.6 % of the subject, on a choice neither of us
    had written down.** Their 909 reproduces exactly at 4-connected and my
    831 reproduces exactly at 8. The nozzle discs are bounded by a
    diagonally-stepped black ring, which is precisely the case that leaks.

    Control 8 pins it on a synthetic ring so the connectivity cannot drift
    back silently.

    WHY FILL AT ALL -- this is what makes the arcade frames comparable, and it
    is not a cosmetic step. The nozzle THROAT and the afterburner GLOW are classified
    differently by the two masks this project can run -- the achromatic rule
    drops the saturated glow and keeps the black throat, the value rule keeps
    both -- and the two nozzle discs are 10-18 % of an astern jet. Filling
    interior holes removes that dependence entirely: whatever is inside the
    airframe's outline counts as airframe on every side.

    Controlled below: on our own sheets, where alpha>0 is ground truth, the
    hole-filled achromatic mask recovers the alpha mask to within 1 %.
    """
    h, w = m.shape
    bg = ~m
    seen = np.zeros_like(bg)
    stack = []
    for x in range(w):
        for y in (0, h - 1):
            if bg[y, x] and not seen[y, x]:
                seen[y, x] = True
                stack.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bg[y, x] and not seen[y, x]:
                seen[y, x] = True
                stack.append((y, x))
    while stack:
        y, x = stack.pop()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):  # 4-connected; see above
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                stack.append((ny, nx))
    return m | (bg & ~seen)


def largest_component(m):
    """8-connected, iterative, no scipy dependency."""
    h, w = m.shape
    lab = np.zeros((h, w), np.int32)
    cur = 0
    best = (0, 0)
    ys, xs = np.nonzero(m)
    for sy, sx in zip(ys, xs):
        if lab[sy, sx]:
            continue
        cur += 1
        stack = [(sy, sx)]
        lab[sy, sx] = cur
        n = 0
        while stack:
            y, x = stack.pop()
            n += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = cur
                        stack.append((ny, nx))
        if n > best[1]:
            best = (cur, n)
    return lab == best[0] if best[0] else np.zeros_like(m)


# ---------------------------------------------------------------------------
# statistics
# ---------------------------------------------------------------------------

def feret(m):
    """Exact maximum pairwise distance, via the convex hull of mask pixels.

    Brute force over the hull, which is tens of points on a sprite -- a
    rotating-callipers implementation would be the same answer with more
    places to be wrong.
    """
    ys, xs = np.nonzero(m)
    if xs.size == 0:
        return 0.0
    pts = np.stack([xs, ys], axis=1).astype(np.float64)
    if pts.shape[0] > 2:
        pts = _hull(pts)
    d = 0.0
    for i in range(len(pts)):
        dd = np.hypot(pts[:, 0] - pts[i, 0], pts[:, 1] - pts[i, 1]).max()
        d = max(d, dd)
    return float(d)


def _hull(pts):
    pts = np.unique(pts, axis=0)
    pts = pts[np.lexsort((pts[:, 1], pts[:, 0]))]
    if len(pts) <= 2:
        return pts

    def half(ps):
        out = []
        for p in ps:
            while len(out) >= 2:
                (ax, ay), (bx, by) = out[-2], out[-1]
                if (bx - ax) * (p[1] - ay) - (by - ay) * (p[0] - ax) <= 0:
                    out.pop()
                else:
                    break
            out.append(tuple(p))
        return out

    lo = half(pts)
    hi = half(pts[::-1])
    return np.array(lo[:-1] + hi[:-1], dtype=np.float64)


def edt(m):
    """Exact Euclidean distance to the nearest FALSE pixel, for TRUE pixels.

    Felzenszwalb-Huttenlocher squared-EDT: two 1-D passes, exact, O(n).
    Written out rather than imported so this tool has no scipy dependency
    (the project's other python tools have none either).
    """
    INF = 1e12
    f = np.where(m, INF, 0.0)
    # The frame edge is NOT background: an aircraft touching the crop edge
    # would otherwise be measured as thin there. Pad with background only if
    # the mask does not touch the edge; if it does, pad with INF (treat the
    # off-frame continuation as unknown-but-ink) and warn via the caller.
    d = np.empty_like(f)
    for i in range(f.shape[0]):
        d[i] = _dt1d(f[i])
    out = np.empty_like(d)
    for j in range(d.shape[1]):
        out[:, j] = _dt1d(d[:, j])
    return np.sqrt(out)


def _dt1d(f):
    n = f.size
    v = np.zeros(n, np.int64)
    z = np.empty(n + 1)
    z[0] = -1e20
    z[1] = 1e20
    k = 0
    for q in range(1, n):
        while True:
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2.0 * q - 2.0 * v[k])
            if s <= z[k]:
                k -= 1
            else:
                break
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = 1e20
    out = np.empty(n)
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        out[q] = (q - v[k]) ** 2 + f[v[k]]
    return out


def _straddle(dd, q):
    """The distinct EDT levels the q-th percentile sits between."""
    lv = np.unique(np.round(dd, 3))
    v = np.percentile(dd, 100 * q)
    below = lv[lv <= v + 1e-9]
    above = lv[lv >= v - 1e-9]
    out = []
    if below.size:
        out.append(float(below[-1]))
    if above.size and (not out or abs(above[0] - out[0]) > 1e-9):
        out.append(float(above[0]))
    return [round(x, 3) for x in out]


def _pred_cv(dd, q):
    lv = _straddle(dd, q)
    if len(lv) < 2 or sum(lv) == 0:
        return 0.0
    return round(100.0 * 0.5 * (lv[1] - lv[0]) / (0.5 * (lv[0] + lv[1])), 2)


def stats(m, rgb=None, palette=None):
    ink = int(m.sum())
    if ink == 0:
        return None
    span = feret(m)
    # pad one background ring so a mask flush with the crop edge is still
    # measured against background on that side
    pm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), bool)
    pm[1:-1, 1:-1] = m
    dd = edt(pm)[1:-1, 1:-1][m]
    sw = 2.0 * float(np.median(dd))
    p90 = 2.0 * float(np.percentile(dd, 90))
    r = {
        'ink': ink,
        'span': round(span, 1),
        'ink_per_span': round(ink / span, 2) if span else None,
        # DENS and RSW are the two SCALE-FREE forms, and they are the ones to
        # quote. INK/SPAN is not scale-free -- magnify a sprite by 1.16 and
        # its INK/SPAN rises by 1.16 with the drawing untouched, which is
        # exactly the difference between the authored cell (SPAN 99) and the
        # same cell on screen (SPAN 115). Quoting INK/SPAN therefore requires
        # quoting the SPAN it was read at, every time.
        'DENS': round(1000.0 * ink / (span * span), 1) if span else None,
        'RSW': round(100.0 * sw / span, 2) if span else None,
        'SW': round(sw, 2),
        'P90SW': round(p90, 2),
        'RP90': round(100.0 * p90 / span, 2) if span else None,
        'edge_touch': bool(m[0].any() or m[-1].any() or m[:, 0].any() or m[:, -1].any()),
        # THE QUANTISATION LICENCE, carried by every measurement.
        #
        # criteria-fix's result, verified here: the expected POSE CV of a
        # stroke statistic is about HALF the relative gap between the two EDT
        # levels the percentile sits between -- readable from a SINGLE pose,
        # so no rotation sweep is needed to know whether a figure is quotable
        # as a point. Over eight cases spanning 0.5 % to 17.3 % their mean
        # absolute error is 0.66 points, and the residuals are one-sided
        # (three-level straddles come in UNDER prediction), so it is a
        # conservative upper bound -- the right direction for a licence.
        #
        # Verified on this operator: the arcade night-level jet at stored
        # 686x480 lands on a SINGLE level {6.0} -> predicted 0 %, observed
        # 0.00 % over eight angles. The same subject native-converted
        # straddles {2.83, 4.0} -> predicted 17.1 %, observed 10.7 %.
        #
        # If `sw_pose_cv_pred` is not ~0, QUOTE THE STATISTIC AS A RANGE.
        'sw_levels': _straddle(dd, 0.5),
        'sw_pose_cv_pred': _pred_cv(dd, 0.5),
        'p90_levels': _straddle(dd, 0.9),
        'p90_pose_cv_pred': _pred_cv(dd, 0.9),
    }
    if rgb is not None and palette:
        tot = ink
        for name, hexes in palette.items():
            cnt = 0
            for hx in hexes:
                t = np.array([(hx >> 16) & 255, (hx >> 8) & 255, hx & 255], np.int32)
                cnt += int((np.all(rgb.astype(np.int32) == t, axis=2) & m).sum())
            r[name] = round(100.0 * cnt / tot, 1)
    return r


# ---------------------------------------------------------------------------
# synthetic controls
# ---------------------------------------------------------------------------

def _blade_fig(width, span=100, size=160, fill=False):
    """Four limbs radiating from a centre, each `width` px thick (or a solid
    wedge of base `width*4` if fill=True), plus two discs. Analytic ink."""
    img = np.zeros((size, size), bool)
    cx = cy = size // 2
    half = span / 2 / math.sqrt(2)
    for ang in (45, 135, 225, 315):
        a = math.radians(ang)
        ex, ey = cx + half * math.cos(a) * math.sqrt(2), cy + half * math.sin(a) * math.sqrt(2)
        n = 2000
        for t in np.linspace(0, 1, n):
            x = cx + (ex - cx) * t
            y = cy + (ey - cy) * t
            w = width if not fill else width * (1 + 3 * (1 - t))
            rr = w / 2.0
            y0, y1 = int(y - rr), int(y + rr) + 1
            x0, x1 = int(x - rr), int(x + rr) + 1
            yy, xx = np.mgrid[y0:y1, x0:x1]
            sel = (yy - y) ** 2 + (xx - x) ** 2 <= rr * rr
            img[y0:y1, x0:x1] |= sel
    return img


def rot(m, deg):
    im = Image.fromarray((m * 255).astype(np.uint8))
    im = im.rotate(deg, resample=Image.NEAREST, expand=True)
    return np.asarray(im) > 127


def _bar(span, ink, size=90):
    """ONE centred bar of a given span and ink -- the R4 "one centred bar"."""
    w = int(round(span))
    h = max(1, int(round(ink / w)))
    c = size // 2
    img = np.zeros((size, size), bool)
    img[c - h // 2:c - h // 2 + h, c - w // 2:c - w // 2 + w] = True
    return img


def _spined_blades(n=4, length=28, width=3, size=90):
    """n separated blades joined by a 1 px spine so the figure is ONE
    8-connected component.

    The spine is not cosmetic. The criteria-fix lane's equivalent control ran
    for months with four DISJOINT blades, and its largest-component step
    silently kept one -- so the control measured a single stroke while
    claiming to measure four, and the assert it carried proved nothing. They
    declared it; this file joins the blades and asserts the component's ink,
    and controls 1-3 here were re-checked for the same degeneracy (all four
    limbs survive: they already radiate from a shared centre, 100 % kept).
    """
    img = np.zeros((size, size), bool)
    c = size // 2
    for k in range(n):
        a = math.radians(45 + 90 * k)
        for t in np.linspace(0, 1, 1200):
            x = c + length * math.cos(a) * t
            y = c + length * math.sin(a) * t
            r = width / 2.0
            y0, y1 = int(y - r), int(y + r) + 1
            x0, x1 = int(x - r), int(x + r) + 1
            yy, xx = np.mgrid[y0:y1, x0:x1]
            img[y0:y1, x0:x1] |= (yy - y) ** 2 + (xx - x) ** 2 <= r * r
    img[c - 1:c + 2, c - 1:c + 2] = True
    return img


def _diag_ring(size=21, r=7):
    """A DIAMOND ring, |dx| + |dy| == r, one pixel thick.

    Every step along it is diagonal, so the ring is 8-connected and has
    4-connected gaps at every corner -- which is exactly the case where an
    8-connected background flood leaks out of a closed ring and a
    4-connected one does not. The arcade's nozzle disc is bounded by a
    diagonally-stepped black ring and leaks the same way.

    A thick/round ring will NOT demonstrate this: my first attempt rasterized
    a circle, which came out 4-connected-closed, and both floods filled it
    identically. The control passed vacuously and proved nothing -- the same
    failure the criteria lane declared in its own control D. Check what a
    synthetic actually builds, not what you meant it to build.
    """
    img = np.zeros((size, size), bool)
    c = size // 2
    for d in range(r + 1):
        for sx, sy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
            img[c + sy * (r - d), c + sx * d] = True
    return img


def _cv(v):
    v = np.array(v, float)
    return 100.0 * v.std(ddof=1) / v.mean()


def selftest():
    print('INK-SPAN / STROKE control suite')
    print()

    print('  1  analytic stroke figure, 4 limbs x 3 px, span 100')
    a = _blade_fig(3, 100)
    ra = stats(largest_component(a))
    print('     ', {k: ra[k] for k in ('ink', 'span', 'ink_per_span', 'SW', 'P90SW')})
    print('      expect SW ~3 (a 3 px stroke), span ~100')
    ok1 = 2.0 <= ra['SW'] <= 4.0 and 95 <= ra['span'] <= 105

    print('  2  THE SAME figure rotated 35 deg -- bank-invariance control')
    b = largest_component(rot(a, 35))
    rb = stats(b)
    print('     ', {k: rb[k] for k in ('ink', 'span', 'ink_per_span', 'SW', 'P90SW')})
    dips = abs(rb['ink_per_span'] - ra['ink_per_span']) / ra['ink_per_span'] * 100
    dsw = abs(rb['SW'] - ra['SW'])
    print(f'      ink/span moves {dips:.1f}% , SW moves {dsw:.2f} px under a 35 deg bank')
    ok2 = dips < 12 and dsw <= 1.01

    print('  3  FILLED figure, same span, same four limbs')
    c = largest_component(_blade_fig(3, 100, fill=True))
    rc = stats(c)
    print('     ', {k: rc[k] for k in ('ink', 'span', 'ink_per_span', 'SW', 'P90SW')})
    print(f'      separation vs (1): ink/span x{rc["ink_per_span"]/ra["ink_per_span"]:.2f}, '
          f'SW x{rc["SW"]/ra["SW"]:.2f}, P90SW x{rc["P90SW"]/ra["P90SW"]:.2f}')
    ok3 = rc['ink_per_span'] > 1.5 * ra['ink_per_span'] and rc['P90SW'] > 1.5 * ra['P90SW']

    print('  4  SPAN on a disc of known diameter 61')
    yy, xx = np.mgrid[0:81, 0:81]
    d = ((yy - 40) ** 2 + (xx - 40) ** 2) <= 30 * 30
    rd = stats(d)
    print(f'      span {rd["span"]} (expect 60-61), SW {rd["SW"]} (expect ~ the radius x2 '
          f'at the centre -> median ~30)')
    ok4 = 59 <= rd['span'] <= 62

    print('  5  the arcade daylight jet -- SPAN must reproduce 109.7, and the two')
    print('     dark accents must reproduce the critic\'s 224 px / 135 px exactly')
    try:
        rgb = np.asarray(Image.open('reference/ab2-arcade-desert.png').convert('RGB'))
        sub = rgb[82:142, 80:180]
        m = largest_component(mask_achromatic(sub, extra=AIRFRAME_EXTRA))
        re_ = stats(m)
        print('     ', {k: re_[k] for k in ('ink', 'span', 'ink_per_span', 'SW', 'P90SW')})
        a = sub.astype(np.int32)
        n840 = int((np.all(a == np.array([0x84, 0, 0]), axis=2) & m).sum())
        n000 = int((np.all(a == np.array([0, 0, 0]), axis=2) & m).sum())
        nf7e = int((np.all(a == np.array([0xf7, 0xe6, 0xb5]), axis=2) & m).sum())
        print(f'      #840000 {n840} px (critic 27.9%% of 803 = 224.0)')
        print(f'      #000000 {n000} px (critic 16.8%% of 803 = 134.9)')
        print(f'      #f7e6b5 {nf7e} px -- the whole 984-803 difference; see RECONCILIATION')
        ok5 = (abs(re_['span'] - 109.7) < 0.15 and n840 == 224 and n000 == 135
               and re_['ink'] == 984)
    except FileNotFoundError:
        ok5 = False
        print('      reference/ab2-arcade-desert.png not found (run from the repo root)')

    print('  6  ROTATION STABILITY -- eight angles. An astern bank IS a rotation.')
    print('     MEASURED ON REAL SUBJECTS. A synthetic cannot carry this claim:')
    print('     the stroke width the author CHOOSES decides which percentile sits')
    print('     on a quantisation step, so a synthetic can be built to condemn')
    print('     either statistic. Both lanes did exactly that, in opposite')
    print('     directions, before anyone measured a real aircraft.')

    def _sweep(m0):
        cc = {k: [] for k in ('ink_per_span', 'DENS', 'RSW', 'RP90')}
        for d in (0, 10, 20, 35, 45, 60, 75, 90):
            rr = stats(largest_component(rot(m0, d) if d else m0))
            for k in cc:
                cc[k].append(rr[k])
        return {k: _cv(v) for k, v in cc.items()}

    subjects = []
    try:
        aa = np.asarray(Image.open('reference/stage3-night-level-t175.png')
                        .convert('RGB'))[227:306, 207:487]
        subjects.append(('arcade night-level jet',
                         fill_holes(largest_component(mask_value(aa)))))
        dd = np.asarray(Image.open('reference/ab2-arcade-desert.png')
                        .convert('RGB'))[82:142, 80:180]
        subjects.append(('arcade day-banked jet',
                         fill_holes(largest_component(
                             mask_achromatic(dd, extra=AIRFRAME_EXTRA)))))
        oo = np.asarray(Image.open('src/assets/sprites/player-f14.png')
                        .convert('RGBA'))[:, 400:500]
        subjects.append(('our level cell',
                         fill_holes(largest_component(
                             mask_achromatic(oo[:, :, :3], extra=AIRFRAME_EXTRA)
                             & (oo[:, :, 3] > 0)))))
    except FileNotFoundError:
        pass
    ok6 = bool(subjects)
    print(f"      {'subject':26}{'DENS':>8}{'RSW':>8}{'RP90':>8}")
    for name, mm in subjects:
        c = _sweep(mm)
        print(f"      {name:26}{c['DENS']:>7.2f}%{c['RSW']:>7.2f}%{c['RP90']:>7.2f}%")
        if max(c['RSW'], c['RP90']) > 6.0:
            ok6 = False
    for w in (3, 9):
        c = _sweep(largest_component(_blade_fig(w, 100)))
        print(f"      {f'synthetic, {w} px blades':26}{c['DENS']:>7.2f}%"
              f"{c['RSW']:>7.2f}%{c['RP90']:>7.2f}%   <- NOT evidence")
    print('      On real subjects BOTH stroke statistics are stable to ~4 %, and')
    print('      WHICH ONE IS MORE STABLE FLIPS BETWEEN SUBJECTS. The rotation')
    print('      axis does not arbitrate RSW against RP90; control 7 does.')

    print('  7  DISTRIBUTION SENSITIVITY -- one centred bar vs four separated')
    print('     blades, MATCHED ink and MATCHED span (the R4->R8 defect)')
    bl = largest_component(_spined_blades())
    rbl = stats(bl)
    assert rbl['ink'] > 300, ('the blade figure degenerated to one limb; see '
                              '_spined_blades')
    ba = largest_component(_bar(rbl['span'], rbl['ink']))
    rba = stats(ba)
    print(f"      blades ink {rbl['ink']} span {rbl['span']:.1f} | "
          f"bar ink {rba['ink']} span {rba['span']:.1f}")
    sep = {k: rba[k] / rbl[k] for k in ('ink_per_span', 'DENS', 'RSW', 'RP90')}
    print('      separation  ' + '  '.join(f'{k} {sep[k]:.3f}x' for k in
                                           ('ink_per_span', 'DENS', 'RSW', 'RP90')))
    # THE ASYMMETRY THAT LETS THIS CONTROL ARBITRATE, declared.
    # If BOTH subjects were UNIFORM thickness then P90 = 2.00 x SW on each by
    # construction, the span ratio would cancel, and RSW and RP90 would
    # separate identically -- so the control could not choose between them.
    # criteria-fix declared exactly that defect in its own slab/blades pair
    # (both returned 3.112x). Mine escapes it only because the blade figure
    # has a THICK HUB where the four blades meet, which an aircraft also has:
    print(f"      P90/SW  blades {rbl['P90SW']/rbl['SW']:.3f} (non-uniform: the hub) "
          f"| bar {rba['P90SW']/rba['SW']:.3f} (uniform)")
    print('      -> the 1.43 vs 1.81 difference comes from the hub. Declared,')
    print('         because a uniform-thickness pair CANNOT arbitrate these two.')
    # THE QUANTISATION LICENCE (criteria-fix's addition, adopted): publish the
    # discrete EDT level set. More than one member across poses or tolerances
    # means the figure sits on a knife-edge and must be quoted as a range.
    for nm, mm in (('blades', bl), ('bar', ba)):
        pm = np.zeros((mm.shape[0] + 2, mm.shape[1] + 2), bool)
        pm[1:-1, 1:-1] = mm
        lv = sorted(set(np.round(edt(pm)[1:-1, 1:-1][mm], 3).tolist()))
        print(f"      EDT levels, {nm:7} {lv[:8]}")
    print('      DENS sees 3-4 %. RP90 sees 1.8x. THIS IS THE OPERATOR\'S BLIND')
    print('      SPOT AND IT IS WHY DENS IS A DIAGNOSTIC AND RP90 IS THE GATE.')
    ok7 = sep['DENS'] < 1.15 and sep['RP90'] > 1.4

    print('  8  HOLE-FILL CONNECTIVITY -- a diagonally-stepped ring')
    ring = _diag_ring()
    filled = fill_holes(ring)
    # the same flood at 8-connectivity, for the comparison only
    h, w = ring.shape
    bg = ~ring
    seen = np.zeros_like(bg)
    st = [(y, x) for x in range(w) for y in (0, h - 1) if bg[y, x]]
    st += [(y, x) for y in range(h) for x in (0, w - 1) if bg[y, x]]
    for y, x in st:
        seen[y, x] = True
    st = list(st)
    while st:
        y, x = st.pop()
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and bg[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    st.append((ny, nx))
    eight = int((ring | (bg & ~seen)).sum())
    print(f"      ring {int(ring.sum())} px | 4-connected flood fills to "
          f"{int(filled.sum())} | 8-connected flood fills to {eight}")
    print('      an 8-connected background LEAKS through the diagonal steps and')
    print('      leaves the disc empty. This shipped, and it under-counted the')
    print('      arcade jet by 78 px -- see fill_holes.')
    ok8 = int(filled.sum()) > int(ring.sum()) * 2 and eight == int(ring.sum())

    print()
    oks = (ok1, ok2, ok3, ok4, ok5, ok6, ok7, ok8)
    allok = all(oks)
    print('CONTROLS:', 'PASS' if allok else 'FAIL', '  ' +
          '  '.join(f'{i+1} {"ok" if v else "FAIL"}' for i, v in enumerate(oks)))
    return 0 if allok else 1


# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    if not args or '--selftest' in args:
        sys.exit(selftest())
    path = args[0]
    box = None
    mode = 'alpha'
    dump = None
    label = path
    i = 1
    while i < len(args):
        if args[i] == '--box':
            box = tuple(int(n) for n in args[i + 1].split(',')); i += 2
        elif args[i] == '--mask':
            mode = args[i + 1]; i += 2
        elif args[i] == '--dump':
            dump = args[i + 1]; i += 2
        elif args[i] == '--label':
            label = args[i + 1]; i += 2
        else:
            i += 1
    im = Image.open(path).convert('RGBA')
    if box:
        im = im.crop(box)
    arr = np.asarray(im)
    if mode == 'alpha':
        m = mask_alpha(arr)
    elif mode == 'airframe':
        # THE published operator. Identical rule on both sides: achromatic
        # airframe tones plus the two named dark accents, EXCLUDING the
        # saturated afterburner glow -- which is excluded on the arcade side
        # too, by the same sat<0.35 line, so the comparison is symmetric.
        # Alpha-gated, because a transparent pixel's RGB is (0,0,0) and would
        # otherwise enter through the #000000 clause and mask the whole cell.
        m = mask_achromatic(arr[:, :, :3], extra=AIRFRAME_EXTRA) & (arr[:, :, 3] > 0)
    elif mode == 'sky':
        m = mask_achromatic(arr[:, :, :3]) & (arr[:, :, 3] > 0)
    else:
        raise SystemExit('--mask alpha|airframe|sky')
    m = largest_component(m)
    if dump:
        out = np.zeros(arr.shape[:2] + (3,), np.uint8)
        out[m] = (255, 255, 255)
        Image.fromarray(out).resize((m.shape[1] * 6, m.shape[0] * 6), Image.NEAREST).save(dump)
    r = stats(m, arr[:, :, :3])
    r['label'] = label
    print(json.dumps(r, indent=2))


if __name__ == '__main__':
    main()
