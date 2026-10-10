#!/usr/bin/env python3
"""INK-SPAN (criteria-lane implementation) -- the DRAWING-WEIGHT operator, and
the SCALE LICENCE that the statistic cannot be read without.

This is a SECOND, INDEPENDENT implementation of the operator defined in
`tools/art/inkspan.py` (drawing lane, R9) and invented by the R8 art critic
(judging/R8/art-critique.md section 4). It exists for two reasons:

  1. To cross-validate that file's numbers on the arcade's own true-native
     frame before either number is licensed as a criterion.
  2. To establish, with a control rather than an assertion, the ONE licence
     condition nobody has stated: **INK/SPAN IS A DIMENSIONED QUANTITY.**
     Ink grows as the square of scale and span grows linearly, so the SAME
     DRAWING read at a different size returns a different number. It is only
     comparable between two objects at a MATCHED SPAN. The dimensionless
     companion that survives a scale change is SW/SPAN.

STATISTICS
  INK      pixels in the subject mask (largest 8-connected component).
  SPAN     Feret diameter -- maximum pairwise distance between mask pixels.
           Equals the row extent on a level aircraft and exceeds it on a
           banked one, which is the point: it may be read on any pose.
  INK/SPAN ink / span. Mean drawn cross-section, in PIXELS. Dimensioned.
  SW       2 x median over mask pixels of the Euclidean distance to the
           nearest background pixel. A LOCAL thickness: a 3 px stroke
           returns the same value whether it is 10 px long or 100.
  P90SW    the same at the 90th percentile -- the thickest mass present.
  SW/SPAN  SW as a per cent of span. DIMENSIONLESS; this is the form to use
           when the two subjects are not the same size on screen.

MASK
  `--bg R,G,B` exact-match background (true-native sources: the sky is one
  flat palette entry and the match is exact).
  `--bgtol N` Chebyshev tolerance for VIDEO sources, where the codec puts a
  ramp around every edge. A tolerance is a thumb on the scale: it ADDS ink
  at low values and REMOVES it at high ones, so any video figure must be
  published with a sensitivity sweep over the tolerance, not at one value.

WHAT IT CANNOT SEE (criteria-side; the instrument-side list is in
tools/art/inkspan.py and both apply)
  * It is blind to colour, and to WHERE the ink sits.
  * It cannot be compared across resolutions or across spans -- see above.
    This is the whole reason for --selftest's scale arm.
  * On a video source it is a function of the tolerance, and the arcade is
    the side that is always on video for every object except the player jet
    and the distant enemies on the two true-native frames.
  * It says nothing about whether the drawing is RIGHT, only how heavy it
    is. A correctly-weighted drawing of the wrong aircraft passes.
"""
import sys, math, argparse
import numpy as np
from PIL import Image


def mask_from(img, bg, tol):
    a = np.asarray(img.convert('RGB')).astype(np.int16)
    d = np.abs(a - np.array(bg, dtype=np.int16)).max(axis=2)
    return d > tol


def largest_component(m):
    h, w = m.shape
    lab = np.zeros((h, w), dtype=np.int32)
    cur, best, bestn = 0, 0, 0
    for sy in range(h):
        for sx in range(w):
            if not m[sy, sx] or lab[sy, sx]:
                continue
            cur += 1
            stack, n = [(sy, sx)], 0
            lab[sy, sx] = cur
            while stack:
                y, x = stack.pop()
                n += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = cur
                            stack.append((ny, nx))
            if n > bestn:
                bestn, best = n, cur
    return (lab == best) if best else m


def feret(mask):
    ys, xs = np.nonzero(mask)
    if len(xs) < 2:
        return float(len(xs))
    pts = np.stack([xs, ys], 1).astype(float)
    # hull via monotone chain, then brute force over hull vertices
    p = sorted(map(tuple, pts))
    def half(seq):
        out = []
        for q in seq:
            while len(out) >= 2 and (out[-1][0]-out[-2][0])*(q[1]-out[-2][1]) - (out[-1][1]-out[-2][1])*(q[0]-out[-2][0]) <= 0:
                out.pop()
            out.append(q)
        return out
    hull = half(p)[:-1] + half(p[::-1])[:-1]
    if len(hull) < 2:
        hull = p
    best = 0.0
    for i in range(len(hull)):
        for j in range(i + 1, len(hull)):
            d = math.hypot(hull[i][0]-hull[j][0], hull[i][1]-hull[j][1])
            best = max(best, d)
    return best + 1.0  # inclusive pixel extent, matching a row-extent convention


def edt_bruteforce(mask):
    """Exact Euclidean distance to the nearest background pixel, brute force
    over the whole background. Reference implementation: correct, and far too
    slow for a pose sweep (it could not finish one). Kept as the control that
    `edt` is checked against -- see selftest arm 5."""
    h, w = mask.shape
    pad = np.ones((h + 2, w + 2), dtype=bool)
    pad[1:-1, 1:-1] = mask
    by, bx = np.nonzero(~pad)
    ys, xs = np.nonzero(mask)
    out = np.empty(len(ys))
    for k in range(len(ys)):
        dy = by - (ys[k] + 1)
        dx = bx - (xs[k] + 1)
        out[k] = math.sqrt(float((dy * dy + dx * dx).min()))
    return out


def edt(mask):
    """Exact Euclidean distance to the nearest background pixel.

    Restricts the candidate set to BOUNDARY background pixels -- background
    8-adjacent to at least one foreground pixel. This is EXACT, not an
    approximation: if p were the nearest background pixel to a mask pixel m and
    p had no foreground 8-neighbour, then p's own neighbour in the direction of
    m would also be background and strictly closer, contradicting p. Verified
    against `edt_bruteforce` to 0.0 on every pixel (selftest arm 5).
    """
    h, w = mask.shape
    pad = np.ones((h + 2, w + 2), dtype=bool)
    pad[1:-1, 1:-1] = mask
    bg = ~pad
    nb = np.zeros_like(bg)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dy == 0 and dx == 0:
                continue
            nb |= np.roll(np.roll(pad, dy, 0), dx, 1)
    by, bx = np.nonzero(bg & nb)
    ys, xs = np.nonzero(mask)
    B = np.stack([by, bx], 1).astype(np.float64)
    out = np.empty(len(ys))
    for s in range(0, len(ys), 4096):
        e = min(s + 4096, len(ys))
        P = np.stack([ys[s:e] + 1, xs[s:e] + 1], 1).astype(np.float64)
        d2 = ((P[:, None, 0] - B[None, :, 0]) ** 2
              + (P[:, None, 1] - B[None, :, 1]) ** 2).min(axis=1)
        out[s:e] = np.sqrt(d2)
    return out


def _pred_cv(d, q):
    """Predicted pose CV for a percentile `q` of the EDT sample `d`."""
    lv = np.unique(np.round(d, 3))
    lo = lv[lv <= q + 1e-9]
    hi = lv[lv >= q - 1e-9]
    if len(lo) == 0 or len(hi) == 0:
        return 0.0
    a, b = lo[-1], hi[0]
    if a == b:
        # the percentile sits ON a level; the nearest neighbour sets the risk
        i = int(np.where(lv == a)[0][0])
        cand = [lv[j] for j in (i - 1, i + 1) if 0 <= j < len(lv)]
        if not cand:
            return 0.0
        b = min(cand, key=lambda v: abs(v - a))
    return float(50.0 * abs(b - a) / ((a + b) / 2.0))


def measure(mask):
    m = largest_component(mask)
    ink = int(m.sum())
    if ink == 0:
        raise ValueError('empty mask -- refusing to return a plausible zero')
    span = feret(m)
    d = edt(m)
    sw = 2.0 * float(np.median(d))
    p90 = 2.0 * float(np.percentile(d, 90))
    ys, xs = np.nonzero(m)
    return {
        'ink': ink, 'span': span, 'ink_per_span': ink / span,
        'dens': 1000.0 * ink / (span * span),
        'sw': sw, 'p90sw': p90,
        'sw_pct_span': 100.0 * sw / span, 'p90sw_pct_span': 100.0 * p90 / span,
        # THE QUANTISATION LICENCE (R9, with drawing-r9). The EDT on a pixel
        # grid takes discrete values, so a percentile of it JUMPS when the
        # population shifts across a level. Whichever percentile happens to sit
        # near a step is unstable under pose and tolerance; the other is not,
        # and WHICH ONE depends on the drawing's stroke width. Carrying the
        # levels lets a reader see whether a figure is on a knife-edge instead
        # of trusting a point value.
        'edt_levels': sorted(set(np.round(d, 3).tolist()))[:12],
        # POSE-CV SCREEN, from ONE pose. The underlying relationship is real:
        # observed pose CV ~= HALF the relative gap between the EDT levels the
        # percentile straddles (mean abs error 0.66 points over 8 cases
        # spanning 0.5-17.3%). BUT that was validated on the level set gathered
        # ACROSS the poses, which needs the sweep. From a SINGLE pose this is a
        # SCREEN, NOT A BOUND -- measured 5 of 6 conservative and one UNDER by
        # 2.7x (arcade night jet RP90: predicts 0.69%, actual 1.82%), because a
        # percentile sitting on a level at one pose can move to a wider-spaced
        # pair at another. It also over-predicts hugely when a percentile never
        # leaves its level (3px blades RSW: predicts 33%, actual 0.51%).
        # USE IT TO FLAG, NOT TO LICENSE. A quoted figure still needs the sweep.
        # TWO separate failure modes, both measured (R9):
        #  (i) SPAN FLOOR. RSW = SW/span and SPAN ITSELF MOVES under rotation,
        #      so even a percentile pinned to ONE EDT level has nonzero CV.
        #      Measured span CV 0.12-0.62% over three subjects; on 3px blades
        #      SW is constant {2.0} (SW CV 0.00%) yet RSW CV is 0.51% -- ALL of
        #      it span. A level-gap prediction of 0.0 is therefore never right.
        #      Add a span-CV floor (~0.7% covers every subject measured).
        # (ii) UNSEEN LEVELS. Rotation CREATES EDT levels absent at the
        #      reference pose (the real jet's P90 set is {11.31, 11.66, 12.0}
        #      across poses; 11.31 = 8*sqrt(2) appears only when rotated). No
        #      constant floor fixes this -- it is why the single-pose form
        #      cannot be promoted to a bound at all.
        # NOTE THE RULE CONFLICT: for a STROKE statistic, measure at the scale
        # where this gap is SMALLEST -- which can be an upscale. That is the
        # opposite of REFERENCE.md's "native outranks upscales", which is about
        # COLOUR levels. Different quantities, opposite advice.
        'pred_pose_cv': _pred_cv(d, np.median(d)),
        'pred_pose_cv_p90': _pred_cv(d, np.percentile(d, 90)),
        'bbox': (int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())),
        'bbox_fill': ink / float((xs.max()-xs.min()+1) * (ys.max()-ys.min()+1)),
    }


def show(name, r):
    print(f'{name:34s} ink {r["ink"]:6d}  span {r["span"]:7.2f}  INK/SPAN {r["ink_per_span"]:6.2f}  '
          f'SW {r["sw"]:4.1f} ({r["sw_pct_span"]:4.1f}% span)  P90SW {r["p90sw"]:4.1f}  '
          f'bboxfill {r["bbox_fill"]*100:5.1f}%  bbox {r["bbox"]}')


def selftest():
    ok = True
    def synth(stroke_rows, length, scale=1, blocks=1, gap=4, spine=False):
        """`spine=True` adds a 1 px column joining the blocks, so the figure is
        ONE 8-connected component. Without it, `measure()`'s largest-component
        step silently keeps a SINGLE block and the case tests one stroke, not
        `blocks` of them -- which is exactly what case D used to do."""
        h = blocks * (stroke_rows + gap) + gap
        a = np.zeros((h, length + 8), dtype=bool)
        for b in range(blocks):
            y0 = gap + b * (stroke_rows + gap)
            a[y0:y0+stroke_rows, 4:4+length] = True
        if spine and blocks > 1:
            a[gap:gap + (blocks - 1) * (stroke_rows + gap) + stroke_rows, 4] = True
        if scale > 1:
            a = np.kron(a, np.ones((scale, scale), dtype=bool))
        return a

    # 1. a 3 px x 60 px stroke: ink 180 exactly, span 60 (+1 inclusive).
    r = measure(synth(3, 60))
    show('A stroke 3x60', r)
    for k, want in [('ink', 180), ('ink_per_span', 180/60.0)]:
        good = abs(r[k] - want) < 0.05
        ok &= good
        print(f'   [{"PASS" if good else "FAIL"}] {k} {r[k]:.3f} want {want:.3f}')

    # 2. THE SCALE ARM. The SAME drawing at 2x nearest. INK/SPAN must DOUBLE
    #    and SW/SPAN must NOT move. This is the licence condition.
    r2 = measure(synth(3, 60, scale=2))
    show('B same stroke, 2x nearest', r2)
    ratio = r2['ink_per_span'] / r['ink_per_span']
    good = abs(ratio - 2.0) < 0.05
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] INK/SPAN ratio under 2x = {ratio:.3f}, want 2.000 '
          f'-- INK/SPAN IS DIMENSIONED AND MUST BE READ AT A MATCHED SPAN')
    dpct = abs(r2['sw_pct_span'] - r['sw_pct_span'])
    good = dpct < 0.35
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] SW/SPAN moves {dpct:.3f} points under 2x '
          f'({r["sw_pct_span"]:.2f} -> {r2["sw_pct_span"]:.2f}) -- the dimensionless companion')

    # 3. DISCRIMINATION. Same ink, same span: one slab vs four blades.
    slab = measure(synth(12, 60))
    show('C slab 12x60', slab)
    # D must be ONE component or the largest-component step keeps a single
    # blade and the case silently degenerates into case A. CORRECTED R9: it
    # did exactly that until the spine was added -- it reported ink 180 (one
    # 3x60 stroke) while claiming to measure four. Assert the component count
    # here rather than trusting the construction.
    sep = measure(synth(3, 60, blocks=4, gap=3, spine=True))
    show('D four 3px blades on a spine, sky between', sep)
    want_ink = 4 * 3 * 60 + (3 * 4 + 3 * 3) - 4 * 3   # blades + spine - overlap
    good = sep['ink'] == want_ink
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] D is ONE component carrying all four blades: '
          f'ink {sep["ink"]} want {want_ink} '
          f'(unspined, largest-component keeps {measure(synth(3, 60, blocks=4, gap=3))["ink"]} '
          f'= a single blade -- the defect this assert exists to catch)')
    good = slab['ink_per_span'] > 3.5 * measure(synth(3, 60))['ink_per_span'] * 0.9
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] slab INK/SPAN {slab["ink_per_span"]:.2f} '
          f'vs one blade {r["ink_per_span"]:.2f}')
    # A CONTROL THAT STOPS DISCRIMINATING MUST FAIL, NOT PASS. `sep['sw'] <
    # slab['sw']` is one-sided: if the two ever converged to within a hair the
    # bare inequality would still pass while the control had stopped testing
    # anything. Assert the separation is NON-TRIVIAL. (Adopted from drawing-r9,
    # whose mask-equivalence control printed a 23% cross-term for two days with
    # only its diagonal terms gated.)
    ratio = slab['sw'] / sep['sw']
    good = ratio >= 2.0
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] SW separates blades {sep["sw"]:.1f} from slab '
          f'{slab["sw"]:.1f} by {ratio:.2f}x (gate: >=2.00x, NON-TRIVIAL -- a bare "<" would '
          f'pass on a hair) at comparable ink ({sep["ink"]} vs {slab["ink"]}) and the same span')
    # And the statistic this one is quoted BESIDE must separate them too, or
    # the pair has collapsed to one number.
    rr = (slab['p90sw'] / sep['p90sw'])
    good = rr >= 2.0
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] P90SW separates them by {rr:.2f}x (gate: >=2.00x)')
    # DENS is EXPECTED to be nearly blind here -- assert the blind spot, so
    # that if DENS ever started discriminating, someone is told rather than
    # quietly benefiting from an operator that changed underneath them.
    dr = slab['dens'] / sep['dens']
    good = dr < 1.25
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] DENS is BLIND here by design, {dr:.3f}x '
          f'(gate: <1.25x) -- this asserts the documented blind spot still exists; '
          f'if it fires, DENS changed and its "diagnostic only" ruling needs revisiting')

    # 4. REFUSAL. An empty mask must raise, not return 0.
    try:
        measure(np.zeros((8, 8), dtype=bool))
        print('   [FAIL] empty mask returned a value'); ok = False
    except ValueError:
        print('   [PASS] empty mask raises rather than returning a plausible zero')

    # 5. THE FAST EDT IS THE SLOW ONE. `edt` restricts to boundary background
    #    pixels on a proof; a proof is not a test, so check it.
    rng = np.random.default_rng(7)
    worst = 0.0
    for _ in range(6):
        mm = largest_component(rng.random((40, 55)) < 0.45)
        if mm.sum() < 5:
            continue
        worst = max(worst, float(np.abs(np.sort(edt(mm)) - np.sort(edt_bruteforce(mm))).max()))
    good = worst == 0.0
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] boundary-restricted EDT == brute force, '
          f'max |delta| {worst:.6f} over 6 random masks')

    # 6. THE QUANTISATION LICENCE. The SAME drawing at two stroke widths puts a
    #    DIFFERENT percentile on a quantisation step. This is why no stability
    #    claim may be made from a synthetic whose stroke width you chose --
    #    measure stability on the real subject.
    thin = measure(synth(3, 60, blocks=4, gap=3, spine=True))
    thick = measure(synth(9, 60, blocks=4, gap=3, spine=True))
    print(f'   [INFO] 3px blades EDT levels {thin["edt_levels"][:5]} -> SW {thin["sw"]:.2f} '
          f'P90 {thin["p90sw"]:.2f}')
    print(f'   [INFO] 9px blades EDT levels {thick["edt_levels"][:5]} -> SW {thick["sw"]:.2f} '
          f'P90 {thick["p90sw"]:.2f}')
    good = len(thin['edt_levels']) < len(thick['edt_levels'])
    ok &= good
    print(f'   [{"PASS" if good else "FAIL"}] a thin drawing offers fewer EDT levels '
          f'({len(thin["edt_levels"])} vs {len(thick["edt_levels"])}) -- publish the level set '
          f'with any SW/P90 figure; >1 level across poses means quote a RANGE, not a point')
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--img'); ap.add_argument('--box')
    ap.add_argument('--bg', default='0,158,255'); ap.add_argument('--bgtol', type=int, default=0)
    ap.add_argument('--name', default='subject')
    ap.add_argument('--tolsweep', action='store_true')
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())
    im = Image.open(a.img).convert('RGB')
    if a.box:
        im = im.crop(tuple(int(v) for v in a.box.split(',')))
    bg = tuple(int(v) for v in a.bg.split(','))
    tols = [a.bgtol] if not a.tolsweep else [0, 8, 16, 24, 32, 48, 64]
    for t in tols:
        show(f'{a.name} tol={t}', measure(mask_from(im, bg, t)))
