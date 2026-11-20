#!/usr/bin/env python3
"""AN ARCADE COLUMN FOR THE SPAWNER'S LATERAL SPREAD -- read off the glyph the
arcade DRAWS on an enemy, so that no airframe has to be identified at any size.

WHY THIS EXISTS. R11 measured our own authored traffic (feel critique §7):
median |screen x| 5.94 %W at the moment an enemy becomes gun-killable, on a
+-9.85 %W rail, with 50.0 % of it inside one gun hit-radius of dead centre.
There was no arcade side to that number, and R11 proved there could not be one
from a pixel detector: in the slice the lock window occupies an arcade enemy is
3-12 native px, a detector returned 128 candidates of which at most 6 were
aircraft (precision <= 5 %), and stage 1's white-capped sea foam sits at exactly
the signature of a distant grey jet. `judging/R11/arc_enemy_x.py` is kept as the
published dead end.

THE STEP THAT KILLED THAT DETECTOR IS AIRCRAFT IDENTITY, AND THIS OPERATOR DOES
NOT NEED IT. The arcade draws a 52-56 px four-corner lock bracket AROUND an
enemy. The bracket is a HUD glyph: fixed-size, pure white, four square corners,
and nothing in the terrain is shaped like it (feelcrit_lockrad.py's selftest
rejects salt noise, hollow outline boxes and empty sky; R10's independent width
histogram over 420 consecutive stage-1 frames found exactly two modes, 14-16 px
and 52-56 px). So a bracket detection is a statement about an ENEMY'S SCREEN
POSITION that was made by the arcade's own code, not by my mask.

    bracket centre x, minus the frame centre, in %W
      =  the screen x of an enemy the arcade itself selected.

The operator is imported from judging/R11/feelcrit_lockrad.py UNCHANGED
(selftest 15/15, and 12/12 of its R11 detections were cropped and verified by
eye as genuine four-corner brackets around aircraft, zero false positives).
This file adds no detection logic at all; it changes only WHICH STATISTIC is
read out of it. R11 read sight->bracket DISTANCE and was therefore limited by
sight.py's isolation ring, which needs clear sky and fails over cities and
coasts -- two of its twelve windows carried 202 bracket frames and contributed
nothing. x FROM THE FRAME CENTRE needs no sight, so every bracket frame counts.

WHY THE FRAME CENTRE IS THE RIGHT ORIGIN, on both sides. AB2's camera does not
pan laterally with the player: the player's own jet SLIDES across a fixed frame
(that is what makes the +-9.85 %W rail a rail). Verified here rather than
assumed -- the longplay frame is 1028x720 with no pillarbox (column means at
both edges are sky, not black), and sight.py's independently measured sight
travel over -ss 520.0 is [415.5, 618.0] px, whose midpoint 516.75 px sits
2.75 px = 0.27 %W from the frame centre 514.0. On our side `enemy.js` places
every enemy by `space.ndcToWorld(ndcX, ...)`, i.e. authored directly in SCREEN
space independent of where the player is, so screen-centre-relative x is the
quantity the spawner writes.

THE BIAS, NAMED BEFORE THE NUMBER. The arcade brackets the threats its own
logic selects, so this is not a census of all traffic. Direction is argued in
judging/R12/lane-spawn.md and both candidate directions are reported here:
--all gives every bracket frame, --tracks gives one row per track.

VALIDITY FLOOR, stated so it can be checked rather than trusted: a 44..64 px
white four-corner box inside the HUD band. Below that there is no measurement --
this operator says nothing about unbracketed traffic and nothing about enemy
SIZE, and it is not asked to.

Sampling: CONSECUTIVE 60 Hz, `ffmpeg -nostdin -ss T -i ab2-longplay-60fps.mp4
-frames:v N -vsync 0 f%04d.png`, so frame i is t = T + (i-1)/60 exactly.

  arc_bracket_x.py --selftest
  arc_bracket_x.py <dir-of-f*.png> --label NAME [--csv out.csv] [--marks out.png]
  arc_bracket_x.py --agg <csv> [<csv> ...]
"""
import sys, os, glob, csv, argparse
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'R11'))
import feelcrit_lockrad as LR   # noqa: E402  -- the validated operator, unchanged


def pctW_from_centre(cx, W):
    """Signed screen x as a percentage of frame WIDTH, origin at the frame
    centre. The same unit `feelcrit_census.mjs` prints for our own enemies
    (ndcX * 50), so the two columns are directly comparable."""
    return 100.0 * (cx - (W - 1) / 2.0) / W


# ------------------------------------------------------------------- selftest
def selftest():
    ok = tot = 0

    def chk(n, c):
        nonlocal ok, tot
        tot += 1
        if c:
            ok += 1
        print(('PASS ' if c else 'FAIL ') + n)

    # 0. the imported operator still passes its own suite. If this fails,
    #    nothing below this line means anything.
    chk('imported feelcrit_lockrad selftest passes', LR.selftest())

    # 1-3. the unit map, which is the only arithmetic this file adds.
    chk('centre of a 1028 px frame reads 0.00 %W',
        abs(pctW_from_centre((1028 - 1) / 2, 1028)) < 1e-9)
    chk('+100 px right of centre on 1028 px reads +9.728 %W',
        abs(pctW_from_centre((1028 - 1) / 2 + 100, 1028) - 9.7276) < 1e-3)
    chk('left of centre is NEGATIVE',
        pctW_from_centre(100, 1028) < 0)

    # 4. END TO END on a planted frame: a bracket at a KNOWN offset must come
    #    back at that offset. This is the test that would catch an origin or a
    #    sign error, which is the only way this file can be wrong.
    for off in (-300, -53, 0, 120, 400):
        cv = np.zeros((720, 1028, 3), np.uint8)
        cv[:, :] = (0, 120, 255)
        side = 53
        ox = int(round((1028 - 1) / 2 + off - side / 2))
        LR._draw_box(cv, ox, 330, side, 13, 3)
        _, b = LR.classify(LR.boxes(cv.astype(int)), 720)
        got = pctW_from_centre(b[0]['cx'], 1028) if len(b) == 1 else None
        want = 100.0 * off / 1028
        chk(f'planted bracket at {off:+5d} px -> {want:+6.2f} %W (got '
            f'{"None" if got is None else f"{got:+6.2f}"})',
            got is not None and abs(got - want) < 0.12)

    # 5. a bracket with an aircraft inside it, at a known offset -- the
    #    precondition sight.py's operator fails. Position must be unaffected.
    #
    #    THIS CASE FAILED WHEN FIRST RUN, AND THE OPERATOR WAS NOT AT FAULT.
    #    The expectation was written as +18.19 %W, which is `_draw_box`'s x0
    #    (700 px) read as if it were the box CENTRE. The box's centre is
    #    x0 + side/2 = 726.5 px = +20.67 %W, and that is what came back, to
    #    0.005 %W, with and without the airframe. So the bad number was in the
    #    test, not in the measurement; corrected here with the derivation
    #    written out, and the case strengthened to assert the thing it was
    #    actually for -- that the planted airframe moves the reading by ZERO,
    #    which is now checked against the empty bracket directly rather than
    #    against a hand-copied constant.
    def _occ(airframe):
        cv = np.zeros((720, 1028, 3), np.uint8)
        cv[:, :] = (0, 120, 255)
        LR._draw_box(cv, 700, 330, 53, 13, 3)
        if airframe:
            cv[345:368, 712:745] = (230, 228, 220)
        _, bb = LR.classify(LR.boxes(cv.astype(int)), 720)
        return bb
    b, b_empty = _occ(True), _occ(False)
    want5 = pctW_from_centre(700 + 53 / 2, 1028)          # = +20.671 %W
    chk(f'occupied bracket: 1 detection at '
        f'{pctW_from_centre(b[0]["cx"],1028):+.2f} %W (expected {want5:+.2f}, '
        f'= x0 700 + side/2)' if b else 'occupied bracket: 1 detection',
        len(b) == 1 and abs(pctW_from_centre(b[0]['cx'], 1028) - want5) < 0.1)
    chk('the airframe inside the bracket shifts x by EXACTLY zero',
        len(b) == 1 and len(b_empty) == 1 and b[0]['cx'] == b_empty[0]['cx'])

    # 6. TWO brackets in one frame at opposite offsets both come back, with
    #    their SIGNS right -- the arcade draws up to 3 at once.
    cv = np.zeros((720, 1028, 3), np.uint8)
    cv[:, :] = (0, 120, 255)
    LR._draw_box(cv, 200, 250, 53, 13, 3)
    LR._draw_box(cv, 780, 420, 53, 13, 3)
    _, b = LR.classify(LR.boxes(cv.astype(int)), 720)
    xs = sorted(pctW_from_centre(x['cx'], 1028) for x in b)
    chk(f'two brackets, one each side (got {[round(v,2) for v in xs]})',
        len(b) == 2 and xs[0] < -24 and xs[1] > 24)

    # 7. the real frame has no pillarbox, so the frame centre IS the game
    #    centre. Asserted on a decoded frame when one is supplied.
    print(f'arc_bracket_x selftest {ok}/{tot}')
    return ok == tot


# ------------------------------------------------------------------------ run
def run(d, label, csvout, marksout):
    frames = sorted(glob.glob(os.path.join(d, 'f*.png')))
    if not frames:
        print(f'no f*.png in {d}')
        sys.exit(2)
    per_frame, sights, W, H = [], [], None, None
    for f in frames:
        s, b, W, H = LR.frame(f)
        per_frame.append(b)
        sights.append(s)

    # Pillarbox control: the frame centre is only the game centre if the game
    # fills the frame. Checked on the first frame of every window rather than
    # once, globally, because a window could be a different capture.
    a0 = np.asarray(Image.open(frames[0]).convert('RGB')).astype(int)
    edge = min(a0[:, :4].mean(), a0[:, -4:].mean())
    nB = sum(len(b) for b in per_frame)
    fB = sum(1 for b in per_frame if b)
    tracks = LR.track_brackets(per_frame)
    print(f'--- {label}  {len(frames)} CONSECUTIVE 60 Hz frames  {W}x{H}  '
          f'edge luma {edge:.1f} (pillarbox would read ~0)')
    print(f'    brackets: {nB} detections on {fB} frames '
          f'({100*fB/len(frames):.1f} %), max/frame '
          f'{max((len(b) for b in per_frame), default=0)}; tracks {len(tracks)}')

    rows = []
    for ti, tr in enumerate(tracks):
        xs = [pctW_from_centre(p['cx'], W) for p in tr['pts']]
        axs = [abs(v) for v in xs]
        sides = [p['w'] for p in tr['pts']]
        # the sight on the track's first frame, when there is exactly one --
        # not needed for x, carried so the R11 distance column reproduces.
        s0 = sights[tr['pts'][0]['i']]
        rows.append(dict(
            label=label, track=ti, i0=tr['pts'][0]['i'], n=len(tr['pts']),
            t0=None,
            x_first=xs[0], ax_first=axs[0],
            ax_min=min(axs), ax_med=float(np.median(axs)), ax_max=max(axs),
            x_at_axmax=xs[int(np.argmax(axs))],
            side_med=float(np.median(sides)),
            sight_x=(pctW_from_centre(s0[0]['cx'], W) if len(s0) == 1 else ''),
        ))
    if rows:
        am = sorted(r['ax_med'] for r in rows)
        print('    |x| from frame centre, per-track MEDIAN over its life, %W: '
              + ' '.join(f'{v:.2f}' for v in am))
    allx = [pctW_from_centre(b['cx'], W) for bs in per_frame for b in bs]
    if allx:
        aa = sorted(abs(v) for v in allx)
        print(f'    ALL {len(aa)} bracket frames: |x| median {np.median(aa):.2f} '
              f'p90 {np.percentile(aa,90):.2f} max {max(aa):.2f} %W; '
              f'signed mean {np.mean(allx):+.2f} %W')
        sd = [b['w'] for bs in per_frame for b in bs]
        print(f'    bracket side px: min {min(sd)} median {np.median(sd):.0f} '
              f'max {max(sd)} (fixed-size glyph => no depth selection)')

    if csvout:
        with open(csvout, 'w', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else
                               ['label', 'track'])
            w.writeheader()
            for r in rows:
                w.writerow(r)
        # per-frame detections too: the population a spread has to contain
        with open(csvout.replace('.csv', '-frames.csv'), 'w', newline='') as fh:
            w = csv.writer(fh)
            w.writerow(['label', 'frame_idx', 'x_pctW', 'cx_px', 'cy_px', 'side_px'])
            for i, bs in enumerate(per_frame):
                for b in bs:
                    w.writerow([label, i, f'{pctW_from_centre(b["cx"], W):.4f}',
                                b['cx'], b['cy'], b['w']])

    if marksout and tracks:
        # One contact sheet per window: every track's FIRST frame at 1:1 with
        # the bracket boxed, the frame centre drawn as a vertical line, and the
        # measured %W printed. Generator = this file; crop = none (full frame,
        # downscaled 2x to fit). CROP AND LOOK is not optional.
        cols = 2
        rowsn = (len(tracks) + cols - 1) // cols
        tw, th = W // 2, H // 2
        sheet = Image.new('RGB', (cols * tw, rowsn * th), (20, 20, 20))
        dr = ImageDraw.Draw(sheet)
        for ti, tr in enumerate(tracks):
            p = tr['pts'][0]
            im = Image.open(frames[p['i']]).convert('RGB')
            d2 = ImageDraw.Draw(im)
            d2.rectangle([p['x0'] - 3, p['y0'] - 3, p['x1'] + 3, p['y1'] + 3],
                         outline=(255, 0, 0), width=2)
            d2.line([(W - 1) / 2, 0, (W - 1) / 2, H], fill=(0, 255, 0), width=1)
            im = im.resize((tw, th), Image.NEAREST)
            ox, oy = (ti % cols) * tw, (ti // cols) * th
            sheet.paste(im, (ox, oy))
            dr.text((ox + 6, oy + 6),
                    f'{label} trk{ti} f{p["i"]} x={pctW_from_centre(p["cx"], W):+.2f}%W '
                    f'side={p["w"]}px n={len(tr["pts"])}', fill=(255, 255, 0))
        sheet.save(marksout)
        print(f'    marks -> {marksout}')
    return rows


def agg(paths, gate=None):
    rows = []
    for p in paths:
        with open(p) as fh:
            for r in csv.DictReader(fh):
                for k in ('ax_first', 'ax_min', 'ax_med', 'ax_max', 'x_first',
                          'side_med'):
                    r[k] = float(r[k])
                r['n'] = int(r['n'])
                rows.append(r)
    print(f'=== {len(rows)} bracket tracks over {len({r["label"] for r in rows})} windows')
    for stat in ('ax_first', 'ax_med', 'ax_min', 'ax_max'):
        v = sorted(r[stat] for r in rows)
        print(f'  {stat:9s} n={len(v):3d}  min {v[0]:6.2f}  p25 {np.percentile(v,25):6.2f}  '
              f'MEDIAN {np.median(v):6.2f}  p75 {np.percentile(v,75):6.2f}  '
              f'p90 {np.percentile(v,90):6.2f}  max {v[-1]:6.2f} %W')
    if gate:
        for g in gate:
            v = [r['ax_med'] for r in rows]
            print(f'  share of tracks with life-median |x| <= {g:5.2f} %W: '
                  f'{100*sum(1 for x in v if x <= g)/len(v):5.1f} %')
    return rows


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('dir', nargs='?')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--label', default='win')
    ap.add_argument('--csv')
    ap.add_argument('--marks')
    ap.add_argument('--agg', nargs='+')
    ap.add_argument('--gate', nargs='+', type=float)
    a = ap.parse_args()
    if a.selftest:
        sys.exit(0 if selftest() else 1)
    if a.agg:
        agg(a.agg, a.gate)
        sys.exit(0)
    if not a.dir:
        ap.error('need a frame directory, --selftest or --agg')
    run(a.dir, a.label, a.csv, a.marks)
