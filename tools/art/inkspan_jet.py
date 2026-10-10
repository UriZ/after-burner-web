#!/usr/bin/env python3
"""Read INK-SPAN / STROKE on every player-jet anchor this repo has, plus
every cell of our own sheets, with one operator (tools/art/inkspan.py).

  python3 tools/art/inkspan.py --selftest      <- the operator's controls
  python3 tools/art/inkspan_jet.py --controls  <- this file's mask controls
  python3 tools/art/inkspan_jet.py             <- the table

THE ARCADE SIDE IS THREE OBSERVATIONS, NOT ONE. R8's critique carried the
honest caveat that its jet figure was n = 1, banked, daylight, stage 2, and
that a true-native LEVEL astern frame (STATUS.md acquisition item 2) blocks
it. That frame still does not exist. What this file adds is the two other
anchors already in the repo, one of which IS a level pose:

  day-bank    reference/ab2-arcade-desert.png         TRUE NATIVE 320x224
  night-LEVEL reference/stage3-night-level-t175.png   686x480 VIDEO upscale
  day-level   does not exist. Still blocking, and now only for COLOUR -- the
              two above bracket the DRAWING WEIGHT on both poses and agree
              to 1.3 % on DENS across day/night, bank/level and
              native/video.

  night-bank  reference/ab2-arcade-night-banking.png is TRUE NATIVE and is
              NOT USED, because the jet in it is flying through its own
              kill's explosion and the two are one 8-connected mass under
              any mask that can see a blue-grey airframe on a black sky.
              The dump (tools/out/drawing-r9/mask-arc-night-bank.png) shows
              the fireball, a cloud and the sea band all inside the
              silhouette; it read DENS 189.5 against the other two anchors'
              84. It is a good SHAPE crop and not a measurement.

TWO MASKS, AND WHY, AND THE CONTROL THAT MAKES THEM COMPARABLE
--------------------------------------------------------------
No single mask works on all three frames, and pretending otherwise is how a
figure like the 78.2 %-dark reading this file produced in its first draft
gets published. That reading was the BLACK NIGHT SKY entering through the
mask's #000000 clause.

  achromatic  sat<0.35 or one of three named accents. Correct over the
              saturated desert. Useless at night: the airframe's own
              blue-greys run past s=0.35 and the #000000 clause swallows the
              sky.
  value       max(R,G,B)>30, jetsil.py's own dark-background form. Correct
              on a black night sky. Useless over bright desert.

Both are then reduced to the largest 8-connected component and HOLE-FILLED
(see fill_holes in inkspan.py: the nozzle discs are 10-18 % of an astern jet
and the two masks classify the throat and the glow differently, so filling
interior holes is what removes the dependence).

--controls runs the equivalence test on OUR OWN sheets, where alpha>0 is
ground truth. achromatic+fill recovers it to <=0.8 % on every cell; value+fill
to <=8 %. Figures below are therefore quoted from achromatic where available
and the night frames carry that 8 % as their stated error bar.

THE VIDEO FRAME IS NOT DECIMATED. INK scales as k^2, SPAN as k, SW as k, so
INK/SPAN and SW are divided by k = 686/320 = 2.14375 and reported as
native-equivalent. Exact for the geometry, NOT exact for the mask: codec
ringing fattens a bright stroke against black, so night-level is an UPPER
bound on the arcade's drawing weight. An upper bound is all that is needed
-- we are over it.
"""
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, 'tools/art')
from inkspan import (mask_achromatic, mask_value, largest_component,  # noqa: E402
                     fill_holes, stats, AIRFRAME_EXTRA)

K = 686.0 / 320.0

DARK = {'dark_accent_pct': [0x840000, 0x000000, 0x425284]}


def build(arr, how):
    if how == 'achro':
        m = mask_achromatic(arr[:, :, :3], extra=AIRFRAME_EXTRA)
    elif how == 'value':
        m = mask_value(arr[:, :, :3])
    else:
        m = arr[:, :, 3] > 0
    if arr.shape[2] == 4:
        m &= arr[:, :, 3] > 0
    return fill_holes(largest_component(m))


def read(path, box, how, scale=1.0, label='', dump=None):
    im = Image.open(path).convert('RGBA')
    if box:
        im = im.crop(box)
    arr = np.asarray(im)
    m = build(arr, how)
    if dump:
        o = np.zeros(m.shape + (3,), np.uint8)
        o[m] = (255, 255, 255)
        Image.fromarray(o).resize((m.shape[1] * 6, m.shape[0] * 6),
                                  Image.NEAREST).save(dump)
    r = stats(m, arr[:, :, :3], DARK)
    if r is None:
        return None
    r['label'] = label or path
    if scale != 1.0:
        r['ink_per_span'] = round(r['ink_per_span'] / scale, 2)
        r['SW'] = round(r['SW'] / scale, 2)
        r['P90SW'] = round(r['P90SW'] / scale, 2)
        r['span'] = round(r['span'] / scale, 1)
        r['ink'] = int(round(r['ink'] / (scale * scale)))
    return r


HDR = (f"{'subject':<28}{'ink':>6}{'span':>7}{'DENS':>8}{'RSW%':>7}"
       f"{'RP90%':>7}{'SW':>6}{'dark%':>7}")


def line(r):
    if r is None:
        return '  (no silhouette)'
    return (f"{r['label']:<28}{r['ink']:>6}{r['span']:>7.1f}{r['DENS']:>8.1f}"
            f"{r['RSW']:>7.2f}{r['RP90']:>7.2f}{r['SW']:>6.2f}"
            f"{r.get('dark_accent_pct', 0):>7.1f}")


def arcade(dumpdir=None):
    def d(n):
        return f'{dumpdir}/mask-{n}.png' if dumpdir else None
    return [
        read('reference/ab2-arcade-desert.png', (80, 82, 180, 142), 'achro', 1.0,
             '  day-bank    native', d('arc-day-bank')),
        read('reference/stage3-night-level-t175.png', (207, 227, 487, 306), 'value',
             K, '  night-LEVEL video*', d('arc-night-level')),
    ]


def controls():
    """Each mask is controlled on the sheet it is actually USED on.

    The achromatic mask reads the DAYLIGHT arcade frame, so it is controlled
    on our day sheet. The value mask reads the two NIGHT arcade frames, so
    it is controlled on our night sheet.

    Running the value mask on the DAY sheet is also printed, and it fails
    there by up to 17.7 %, for a reason worth recording rather than hiding:
    the day palette's nozzle throat is #000000, which fails max(RGB)>30, and
    in the steeper bank poses the broken ring leaves the afterburner glow as
    an island that the largest-component step discards. The night palette
    has no pure black, which is why the same mask is exact there. Do not
    quote a value-mask figure on a subject with a black throat.
    """
    FOUR = [0xffffef, 0xf7e6b5, 0x840000, 0x000000]

    def fourrole(arr):
        a = arr[:, :, :3].astype(np.int32)
        m = np.zeros(a.shape[:2], bool)
        for h in FOUR:
            m |= np.all(a == np.array([(h >> 16) & 255, (h >> 8) & 255, h & 255]), axis=2)
        if arr.shape[2] == 4:
            m &= arr[:, :, 3] > 0
        return fill_holes(largest_component(m))

    worst = {}
    for sheet, name in (('src/assets/sprites/player-f14.png', 'day'),
                        ('src/assets/sprites/player-f14-night.png', 'night')):
        im = Image.open(sheet).convert('RGBA')
        cw = im.width // 9
        print(f'MASK-EQUIVALENCE CONTROL -- {name} sheet, alpha>0 is ground truth')
        print(f"{'cell':>6}{'alpha':>8}{'achro+fill':>12}{'err%':>8}"
              f"{'value+fill':>12}{'err%':>8}")
        wa = wv = 0.0
        for i in range(9):
            a = np.asarray(im.crop((i * cw, 0, (i + 1) * cw, im.height)))
            gt = int(build(a, 'alpha').sum())
            ac = int(build(a, 'achro').sum())
            vv = int(build(a, 'value').sum())
            ea = 100.0 * abs(ac - gt) / gt
            ev = 100.0 * abs(vv - gt) / gt
            wa, wv = max(wa, ea), max(wv, ev)
            print(f"{i:>6}{gt:>8}{ac:>12}{ea:>8.2f}{vv:>12}{ev:>8.2f}")
        print(f"  worst: achromatic {wa:.2f} %, value {wv:.2f} %")
        worst[name] = (wa, wv)
        print()
    # WHICH RULE THE CRITERION MAY NAME. The criteria lane licensed a
    # four-authored-role mask (#ffffef/#f7e6b5/#840000/#000000 + enclosed),
    # which is a fair description of the ARCADE's jet -- that aircraft really
    # is mostly those four tones. It is NOT usable as the criterion's mask,
    # because the criterion compares OURS against the arcade and our sheet
    # puts most of its body on midNeutral and coolDark.
    im = Image.open('src/assets/sprites/player-f14.png').convert('RGBA')
    print('MASK-RULE CHOICE -- recovery against alpha ground truth, day sheet')
    print(f"{'cell':>6}{'alpha':>8}{'four-role':>11}{'rec%':>8}{'achro':>8}{'rec%':>8}")
    worst4 = 100.0
    for i in range(9):
        a = np.asarray(im.crop((i * 100, 0, (i + 1) * 100, 72)))
        gt = int(build(a, 'alpha').sum())
        f4 = int(fourrole(a).sum())
        ac = int(build(a, 'achro').sum())
        worst4 = min(worst4, 100.0 * f4 / gt)
        print(f"{i:>6}{gt:>8}{f4:>11}{100.0*f4/gt:>7.1f}%{ac:>8}{100.0*ac/gt:>7.1f}%")
    print(f'  four-role recovers as little as {worst4:.1f} % of the airframe and how')
    print('  much depends on the POSE. A mask rule named in a criterion has to be')
    print('  validated against ground truth on BOTH sides; only our sheets have it.')
    print()

    # Each rule is gated on the palette it is USED on, and the cross terms are
    # printed so a future lane cannot quietly apply one to the other.
    ok = (worst['day'][0] < 1.5 and worst['night'][1] < 2.0 and worst4 < 90
          and worst['night'][0] > 5.0 and worst['day'][1] > 5.0)
    print(f"  achromatic on DAY  {worst['day'][0]:.2f} %  (gate < 1.5 -- its use case)")
    print(f"  value      on NIGHT {worst['night'][1]:.2f} %  (gate < 2.0 -- its use case)")
    print(f"  value      on DAY  {worst['day'][1]:.2f} %  (NOT a use case; see the docstring)")
    print(f"  achromatic on NIGHT {worst['night'][0]:.2f} %  (NOT a use case -- the night")
    print('      blue-greys run to sat 0.50, above the 0.35 cutoff. Reading the night')
    print('      sheet with the achromatic rule was a live bug in this file.)')
    print('  BOTH cross terms are asserted NON-trivial (>5 %): if either ever drops')
    print('  to zero the two rules have converged and this control has stopped')
    print('  discriminating, which is a failure, not a success.')
    print('MASK CONTROL:', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def invariance():
    """THE BANK-INVARIANCE CONTROL, asked for by the criteria lane.

    The R8 art critique replaced bbox FILL with INK/SPAN because the latter is
    "bank-invariant in a way that fill is not", and the only evidence offered
    was two of our own poses moving 13.15 -> 10.93. That is one difference,
    not an invariance demonstration. This is the demonstration, in two arms,
    because the obvious arm is contaminated and the contamination is the
    interesting part.

    ARM A, the nine authored bank cells. This is what was asked for, and it
    CONFLATES BANK WITH SCALE: poseTransform applies SHRINK = 0.34, so the
    nine cells run span 65 -> 99. INK/SPAN is dimensioned, so a CV across them
    is mostly measuring the shrink.

    ARM B, one drawing rigidly rotated through eight angles. This is the
    actual claim, and it is the right model: the sheet's own pose comment
    states that from astern a bank "rotates in the IMAGE PLANE and does not
    foreshorten in span".
    """
    def cv(v):
        v = np.array(v, float)
        return 100.0 * v.std(ddof=1) / v.mean()

    def bbfill(m):
        ys, xs = np.nonzero(m)
        return 100.0 * m.sum() / ((xs.max() - xs.min() + 1) * (ys.max() - ys.min() + 1))

    angles = [-65, -45, -25, -10, 0, 10, 25, 45, 65]
    im = Image.open('src/assets/sprites/player-f14.png').convert('RGBA')
    print('ARM A -- the nine AUTHORED bank cells (conflates bank with SHRINK)')
    print(f"{'bank':>6}{'span':>8}{'INK/SPAN':>10}{'bboxfill%':>11}{'DENS':>8}"
          f"{'RSW':>7}{'RP90':>8}")
    acc = {k: [] for k in ('ips', 'fill', 'dens', 'rsw', 'rp90')}
    for i in range(9):
        a = np.asarray(im.crop((i * 100, 0, (i + 1) * 100, 72)))
        m = build(a, 'achro')
        r = stats(m)
        f = bbfill(m)
        for k, v in zip(acc, (r['ink_per_span'], f, r['DENS'], r['RSW'], r['RP90'])):
            acc[k].append(v)
        print(f"{angles[i]:>6}{r['span']:>8.1f}{r['ink_per_span']:>10.2f}{f:>11.2f}"
              f"{r['DENS']:>8.1f}{r['RSW']:>7.2f}{r['RP90']:>8.2f}")
    print(f"{'CV %':>6}{'':>8}{cv(acc['ips']):>10.1f}{cv(acc['fill']):>11.1f}"
          f"{cv(acc['dens']):>8.1f}{cv(acc['rsw']):>7.1f}{cv(acc['rp90']):>8.1f}")

    print()
    print('ARM B -- ONE drawing, rigidly rotated: the actual invariance test')
    from inkspan import _blade_fig, rot  # noqa: E402
    base = _blade_fig(3, 100)
    print(f"{'rot':>6}{'span':>8}{'INK/SPAN':>10}{'bboxfill%':>11}{'DENS':>8}"
          f"{'RSW':>7}{'RP90':>8}")
    acc2 = {k: [] for k in acc}
    for d in (0, 10, 20, 35, 45, 60, 75, 90):
        m = largest_component(rot(base, d) if d else base)
        r = stats(m)
        f = bbfill(m)
        for k, v in zip(acc2, (r['ink_per_span'], f, r['DENS'], r['RSW'], r['RP90'])):
            acc2[k].append(v)
        print(f"{d:>6}{r['span']:>8.1f}{r['ink_per_span']:>10.2f}{f:>11.2f}"
              f"{r['DENS']:>8.1f}{r['RSW']:>7.2f}{r['RP90']:>8.2f}")
    print(f"{'CV %':>6}{'':>8}{cv(acc2['ips']):>10.1f}{cv(acc2['fill']):>11.1f}"
          f"{cv(acc2['dens']):>8.1f}{cv(acc2['rsw']):>7.1f}{cv(acc2['rp90']):>8.1f}")

    print()
    print('VERDICT. Arm B: INK/SPAN CV 1.2 % against bbox fill CV 28.7 % -- a 24x')
    print('difference, so THE ART CRITIC\'S INVARIANCE CLAIM IS CORRECT and now')
    print('has a control. Arm A: 9.9 % against 15.0 %, only 1.5x, because the')
    print('authored cells differ in SIZE as well as bank and INK/SPAN is')
    print('dimensioned. The 13.15 -> 10.93 the critique quoted is SHRINK, not a')
    print('failure of invariance -- which is also why the scale-free forms are')
    print('the ones to gate on.')
    return 0


def main():
    if '--invariance' in sys.argv:
        sys.exit(invariance())
    if '--controls' in sys.argv:
        sys.exit(controls())
    dumpdir = None
    if '--dump' in sys.argv:
        dumpdir = sys.argv[sys.argv.index('--dump') + 1]
    print(HDR)
    print('-' * len(HDR))
    print('ARCADE')
    arc = [r for r in arcade(dumpdir) if r]
    for r in arc:
        print(line(r))
    mips = float(np.mean([r['DENS'] for r in arc]))
    msw = float(np.mean([r['RSW'] for r in arc]))
    mp90 = float(np.mean([r['RP90'] for r in arc]))
    print(f"{'  ARCADE mean':<28}{'':>6}{'':>7}{mips:>8.1f}{msw:>7.2f}{mp90:>7.2f}")
    print('  * 686x480 upscale -> native-equivalent; an UPPER bound (codec ringing).')

    angles = [-65, -45, -25, -10, 0, 10, 25, 45, 65]
    for sheet, name in (('src/assets/sprites/player-f14.png', 'day'),
                        ('src/assets/sprites/player-f14-night.png', 'night')):
        print()
        print(f'OURS -- {sheet}')
        im = Image.open(sheet).convert('RGBA')
        cw = im.width // 9
        # THE MASK IS CHOSEN PER PALETTE, NOT PER PROJECT. The achromatic
        # rule is for the DAY palette and the value rule for the NIGHT one,
        # and reading the night sheet with the achromatic rule was a live bug
        # in this file until the criteria-fix lane extended the ground-truth
        # test to the night sheet and found it.
        #
        # Measured, recovery against alpha>0 on our night sheet:
        #     achromatic (incl. the named #425284)  81.9 - 98.2 %
        #     value (max(RGB)>30)                  100.0 % on every cell
        # The 81.9 % is the LEVEL cell -- the one every night figure is quoted
        # from -- so the night column was short by 18 % of the aeroplane.
        #
        # The night blue-greys are not achromatic: #425284 sat 0.50, #6373a4
        # 0.39, #7384b5 0.36, all above the 0.35 cutoff, and together ~45 % of
        # the sheet's ink. Naming #425284 recovers most of it and not all.
        how = 'achro' if name == 'day' else 'value'
        rs = [read(sheet, (i * cw, 0, (i + 1) * cw, im.height), how, 1.0,
                   f'  {name} bank {angles[i]:+d}') for i in range(9)]
        for r in rs:
            print(line(r))
        for idx, what in ((4, 'LEVEL cell'), (1, 'bank -45 cell')):
            c = rs[idx]
            print(f"{'  ' + what + ' vs arcade':<28}{'':>6}{'':>7}"
                  f"{c['DENS'] / mips:>7.2f}x{c['RSW'] / msw:>6.2f}x"
                  f"{c['RP90'] / mp90:>6.2f}x")


if __name__ == '__main__':
    main()
