#!/usr/bin/env python3
"""Assert, FROM THE CAPTURED FRAMES, what population a capture set actually holds.

WHY THIS TOOL EXISTS
--------------------
R7 published "Criterion A passes in ordinary play WITH COMBAT" off twelve frames
captured with `?fixed=1&seed=1&invincible=1`. The claim was true. The evidence
could not have shown it false: under `?fixed=1` with no `?demo`, `main.js`
injects no input at all, so those frames contain no player weapon, no kill and
no explosion -- only ambient enemy traffic. The R7 judge read the simulation's
own counters over 900 ticks of that exact URL and found vulcanRounds 0,
missilesInFlight 0, hits 0, every tick.

That is REFERENCE.md ledger row 21's own defect -- a Criterion A figure quoted
without its real population -- recurring INSIDE the repair for row 21, in the
same table, one round later, published by the lane that spent that round
enforcing the rule on everyone else, and confirmed a second time by a team-lead
verification that used the same invocation.

The rule the recurrence yields, and the reason this file is a tool and not a
paragraph:

    A POPULATION CLAIM IS VERIFIED BY AN ASSERTION OVER THE CAPTURED FRAMES,
    NEVER BY THE INVOCATION THAT WAS INTENDED TO PRODUCE THEM.

An invocation is an intention. A URL parameter records what a lane meant to
capture; a frame records what it captured. Every stage of R7's pipeline agreed
with the intention -- the parameter was spelled right, the capture ran, the
frames were non-black, de-duplicated and digit-verified -- and the population
was still absent. No hygiene sweep this project runs looks for CONTENT.

So: a population is a POSITIVE CONTROL, in exactly the sense an instrument
carries one. Before quoting a figure over a population, assert the population is
in the pixels.

WHAT IT MEASURES
----------------
Our effects are flat authored pixel art snapped to a declared palette
(effects/pixelTexture.js), so EXACT-COLOUR MEMBERSHIP is a sound detector for
them -- the R7 art critic measured 150 consecutive explosion ticks introducing
"exactly its seven authored palette colours and not one other colour". This tool
reads those palettes OUT OF src/ at run time (so it cannot silently go blind
when a lane retunes a constant) and counts exact-match pixels per class:

  PLAYER-WEAPON   vulcan rounds, muzzle flash, missile airframe/exhaust
  EXPLOSION       the fireball palette (a kill, OR the player's own death)
  ENEMY-FIRE      enemy shot sprites and the shot telegraph

PLAYER-WEAPON and EXPLOSION together are the content an "in combat" claim
asserts. ENEMY-FIRE is reported separately and ON PURPOSE: it is what R7's
no-input captures DID contain, and it is why those frames looked like combat to
everyone who checked them. A set with enemy fire and nothing else is the exact
false positive this tool exists to refuse.

Colours shared with non-combat objects are held in a WEAK set and never decide
the verdict:
  * `#e6e6e6` / `#9c9c9c` (missile body/nose) are achromatic and can be cloud
    or HUD greys on some trees;
  * `#f7f7e6` (fireball core) is also smoke.js's puff white.
The STRICT sets are chromatic and object-specific. `--collision-control DIR`
re-proves that per tree against a declared no-combat set, because a detector
whose colours have drifted into the background reports combat everywhere.

EXPLOSION DOES NOT IMPLY A KILL. The player's own death explosion is in the same
palette; `?combatonly=enemies,shots` holds explosion pixels on 1 of 5 R7 frames
with no player weapon in the arm at all. A "kills on screen" claim needs
PLAYER-WEAPON and EXPLOSION together, or a counter read in page. This tool
reports the classes; it does not infer causation between them.

NOT DETECTED HERE: the missile smoke trail. trailPalette.js is a set of
achromatic greys by measurement (the arcade's plume is near-white), so it is not
separable from cloud by colour. Assert a trail population in page, or by the
missile exhaust that precedes it.

USAGE
-----
  tools/assert_population.py --selftest
  tools/assert_population.py DIR [DIR ...] [--require weapon,explosion]
                             [--per-frame] [--collision-control DIR]

Exit status is 1 if any `--require` class is absent from a set, so this can gate
a capture before a figure is computed over it.
"""

import argparse
import glob
import os
import re
import sys

import numpy as np
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Palette sources: (file, array-name) pairs resolved through that file's own
# `const NAME = '#rrggbb'` declarations.
SOURCES = {
    'EXPLOSION': [('src/effects/explosions.js', 'EXPLOSION_PALETTE'),
                  ('src/effects/explosions.js', 'CHUNK_PALETTE')],
    'PLAYER-WEAPON': [('src/weapons/projectileSprites.js', 'VULCAN_PALETTE'),
                      ('src/weapons/projectileSprites.js', 'MUZZLE_PALETTE'),
                      ('src/weapons/projectileSprites.js', 'MISSILE_PALETTE')],
    'ENEMY-FIRE': [('src/weapons/projectileSprites.js', 'SHOT_PALETTE'),
                   ('src/weapons/telegraph.js', 'TELEGRAPH_PALETTE')],
}

# Held out of every verdict: shared with cloud / smoke / HUD greys.
WEAK = {'#e6e6e6', '#9c9c9c', '#f7f7e6'}

CLASS_KEY = {'weapon': 'PLAYER-WEAPON', 'explosion': 'EXPLOSION',
             'enemyfire': 'ENEMY-FIRE'}


def _hex(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def load_palettes(repo=REPO):
    """Resolve the authored palettes out of src/. Raises loudly on any miss."""
    out = {}
    for cls, refs in SOURCES.items():
        strict, weak = {}, {}
        for rel, arr in refs:
            path = os.path.join(repo, rel)
            with open(path) as fh:
                text = fh.read()
            consts = dict(re.findall(
                r"const\s+([A-Z_][A-Z0-9_]*)\s*=\s*'(#[0-9a-fA-F]{6})'", text))
            m = re.search(r'\b' + arr + r'\s*=\s*\[([^\]]*)\]', text)
            if not m:
                raise SystemExit(
                    f'assert_population: {arr} not found in {rel}. The palette '
                    f'this detector reads has moved or been renamed -- FIX THE '
                    f'TOOL, do not run it blind.')
            names = [t.strip() for t in m.group(1).split(',') if t.strip()]
            for n in names:
                if n.startswith('#'):
                    hexv = n.strip("'\"")
                elif n in consts:
                    hexv = consts[n]
                else:
                    raise SystemExit(
                        f'assert_population: {arr} entry {n!r} in {rel} does '
                        f'not resolve to a hex literal.')
                (weak if hexv.lower() in WEAK else strict)[hexv.lower()] = n
        out[cls] = (strict, weak)
    return out


def decimate(path):
    """960x672 -> true native 320x224, with the 3x3 block proof enforced."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    h, w = a.shape[:2]
    if (h, w) == (224, 320):
        return a.astype(np.uint8), 0
    if (h, w) != (672, 960):
        raise SystemExit(f'assert_population: {path} is {w}x{h}; expected '
                         f'960x672 or native 320x224.')
    blocks = a.reshape(224, 3, 320, 3, 3)
    dev = int((blocks.max(axis=(1, 3)) - blocks.min(axis=(1, 3))).max())
    if dev != 0:
        raise SystemExit(f'assert_population: {path} is not a pure 3x nearest '
                         f'upscale (max within-block channel spread {dev}). '
                         f'Decimation would invent colours; refusing.')
    return a[::3, ::3].astype(np.uint8), dev


def count_frame(arr, palettes):
    res = {}
    for cls, (strict, weak) in palettes.items():
        for tag, pal in (('strict', strict), ('weak', weak)):
            n = 0
            for hexv in pal:
                n += int(np.count_nonzero(
                    np.all(arr == np.array(_hex(hexv), dtype=np.uint8), axis=-1)))
            res[(cls, tag)] = n
    return res


def scan(d, palettes):
    files = sorted(glob.glob(os.path.join(d, '*.png')))
    if not files:
        raise SystemExit(f'assert_population: no PNGs in {d}')
    rows = []
    for f in files:
        arr, _ = decimate(f)
        rows.append((os.path.basename(f), count_frame(arr, palettes)))
    return rows


def summarise(rows):
    out = {}
    for cls in SOURCES:
        strict = [r[1][(cls, 'strict')] for r in rows]
        weak = [r[1][(cls, 'weak')] for r in rows]
        out[cls] = dict(
            frames=len(rows),
            present=sum(1 for v in strict if v > 0),
            px_max=max(strict), px_total=sum(strict),
            weak_present=sum(1 for v in weak if v > 0))
    return out


def report(d, rows, per_frame=False):
    s = summarise(rows)
    n = len(rows)
    print(f'\n{d}   n={n} frames')
    print(f'  {"class":<14} {"frames with":>12} {"share":>8} {"max px":>8} '
          f'{"total px":>9}   weak-set frames')
    for cls in ('PLAYER-WEAPON', 'EXPLOSION', 'ENEMY-FIRE'):
        c = s[cls]
        print(f'  {cls:<14} {c["present"]:>12} {100.0*c["present"]/n:>7.1f}% '
              f'{c["px_max"]:>8} {c["px_total"]:>9}   {c["weak_present"]}')
    if per_frame:
        for name, r in rows:
            print(f'    {name:<20} W={r[("PLAYER-WEAPON","strict")]:<6} '
                  f'X={r[("EXPLOSION","strict")]:<6} '
                  f'E={r[("ENEMY-FIRE","strict")]:<6}')
    return s


# --------------------------------------------------------------------------
# Controls. An instrument this project trusts has to fail on a known-bad input
# before it is allowed to pass anything.
# --------------------------------------------------------------------------

KNOWN = {
    # The population R7's headline Criterion A figure was published over.
    # Known-bad BY COUNTER: the judge read vulcanRounds/missiles/hits = 0 over
    # 900 consecutive ticks of this exact URL. The detector must agree from the
    # pixels alone -- this is the test that the tool would have caught R7.
    'negative': [('tools/out/tl-r7-final-97', 'R7 headline: ?fixed=1, no input'),
                 ('tools/out/tl-r7-final-137', 'R7 headline: ?fixed=1, no input'),
                 ('tools/out/tl-r7-final-211', 'R7 headline: ?fixed=1, no input'),
                 ('tools/out/judge-r7/critA-play-97', 'judge replication, same URL')],
    # Combat genuinely on screen: ?demo=1 frames captured AT KILL TICKS.
    'positive': [('tools/out/judge-r7/expl-dump', '?demo=1 at 11 kill ticks')],
    # Nothing combat-coloured may exist in a no-combat frame, or the detector
    # has drifted into the background art.
    'null': [('tools/out/judge-r7/arm-nocombat-71', '?nocombat=1'),
             ('tools/out/judge-r7/arm-enemies-29', '?combatonly=enemies')],
}


def selftest():
    print('=== assert_population selftest ===\n')
    ok = True
    pal = load_palettes()
    print('Palettes resolved out of src/ (the operator, printed so it is visible):')
    for cls, (strict, weak) in pal.items():
        print(f'  {cls:<14} strict {sorted(strict)}')
        if weak:
            print(f'  {"":<14} weak   {sorted(weak)}  (never decides a verdict)')

    # --- synthetic controls -------------------------------------------------
    print('\n-- synthetic controls --')
    blank = np.zeros((224, 320, 3), np.uint8)
    c = count_frame(blank, pal)
    t = all(c[(k, 'strict')] == 0 for k in SOURCES)
    print(f'  [{"PASS" if t else "FAIL"}] a black frame detects nothing')
    ok &= t

    expl_hex = sorted(pal['EXPLOSION'][0])[0]
    planted = blank.copy()
    planted[10:17, 20:27] = _hex(expl_hex)            # 49 px
    c = count_frame(planted, pal)
    t = c[('EXPLOSION', 'strict')] == 49 and c[('PLAYER-WEAPON', 'strict')] == 0
    print(f'  [{"PASS" if t else "FAIL"}] planted 49 px of {expl_hex} reads '
          f'EXPLOSION={c[("EXPLOSION","strict")]}, no cross-talk')
    ok &= t

    # Off-by-one colour: exactness is the whole basis of the detector, so a
    # near-miss MUST read zero. If this fails the detector is fuzzy and a
    # background gradient can satisfy it.
    near = blank.copy()
    r, g, b = _hex(expl_hex)
    near[10:17, 20:27] = (min(r + 1, 255), g, b)
    c = count_frame(near, pal)
    t = c[('EXPLOSION', 'strict')] == 0
    print(f'  [{"PASS" if t else "FAIL"}] the same patch one channel level off '
          f'reads {c[("EXPLOSION","strict")]} -- membership is exact')
    ok &= t

    wk = sorted(pal['EXPLOSION'][1])
    if wk:
        weakf = blank.copy()
        weakf[0:10, 0:10] = _hex(wk[0])
        c = count_frame(weakf, pal)
        t = c[('EXPLOSION', 'strict')] == 0 and c[('EXPLOSION', 'weak')] == 100
        print(f'  [{"PASS" if t else "FAIL"}] 100 px of the shared colour '
              f'{wk[0]} scores 0 strict / {c[("EXPLOSION","weak")]} weak')
        ok &= t

    # Decimation refusal: a bilinear upscale must be refused, not averaged.
    bil = np.asarray(Image.fromarray(
        np.random.RandomState(0).randint(0, 255, (224, 320, 3), dtype=np.uint8)
    ).resize((960, 672), Image.BILINEAR))
    p = os.path.join(REPO, 'tools', 'out', 'criteria-r8', '_selftest-bilinear.png')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    Image.fromarray(bil).save(p)
    try:
        decimate(p)
        t = False
    except SystemExit:
        t = True
    print(f'  [{"PASS" if t else "FAIL"}] a bilinear 3x upscale is REFUSED, '
          f'not silently averaged')
    ok &= t
    os.remove(p)

    # --- real known inputs --------------------------------------------------
    print('\n-- known-BAD input: the frames R7 published its combat figure over --')
    for rel, why in KNOWN['negative']:
        d = os.path.join(REPO, rel)
        if not os.path.isdir(d):
            print(f'  [SKIP] {rel} absent')
            continue
        s = summarise(scan(d, pal))
        t = s['PLAYER-WEAPON']['present'] == 0 and s['EXPLOSION']['present'] == 0
        print(f'  [{"PASS" if t else "FAIL"}] {rel} ({why}): weapon '
              f'{s["PLAYER-WEAPON"]["present"]}/{s["PLAYER-WEAPON"]["frames"]}, '
              f'explosion {s["EXPLOSION"]["present"]}/{s["EXPLOSION"]["frames"]}, '
              f'ENEMY-FIRE {s["ENEMY-FIRE"]["present"]}/'
              f'{s["ENEMY-FIRE"]["frames"]} -- refused as "in combat"')
        ok &= t

    print('\n-- known-GOOD input --')
    for rel, why in KNOWN['positive']:
        d = os.path.join(REPO, rel)
        if not os.path.isdir(d):
            print(f'  [SKIP] {rel} absent')
            continue
        s = summarise(scan(d, pal))
        t = s['PLAYER-WEAPON']['present'] > 0 and s['EXPLOSION']['present'] > 0
        print(f'  [{"PASS" if t else "FAIL"}] {rel} ({why}): weapon '
              f'{s["PLAYER-WEAPON"]["present"]}/{s["PLAYER-WEAPON"]["frames"]}, '
              f'explosion {s["EXPLOSION"]["present"]}/{s["EXPLOSION"]["frames"]}')
        ok &= t

    print('\n-- collision control: combat colours must be ABSENT with combat off --')
    for rel, why in KNOWN['null']:
        d = os.path.join(REPO, rel)
        if not os.path.isdir(d):
            print(f'  [SKIP] {rel} absent')
            continue
        s = summarise(scan(d, pal))
        t = all(s[c]['present'] == 0 for c in SOURCES)
        print(f'  [{"PASS" if t else "FAIL"}] {rel} ({why}): '
              + ', '.join(f'{c}={s[c]["present"]}' for c in SOURCES))
        ok &= t

    print('\n=== %s ===' % ('PASS' if ok else 'FAIL'))
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('dirs', nargs='*')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--per-frame', action='store_true')
    ap.add_argument('--require', default='',
                    help='comma list of weapon,explosion,enemyfire that must be '
                         'present in at least one frame of every set; exit 1 if not')
    ap.add_argument('--collision-control', default=None,
                    help='a no-combat capture dir; every class must read 0 in it')
    a = ap.parse_args()

    if a.selftest:
        return selftest()
    if not a.dirs:
        ap.error('give at least one capture directory, or --selftest')

    pal = load_palettes()
    rc = 0
    if a.collision_control:
        s = summarise(scan(a.collision_control, pal))
        bad = [c for c in SOURCES if s[c]['present']]
        print(f'collision control {a.collision_control}: '
              + ('CLEAN' if not bad else f'CONTAMINATED in {bad}'))
        if bad:
            print('  The detector colours occur with combat off. Any population '
                  'verdict below is unsafe. Fix the class sets first.')
            rc = 1

    want = [CLASS_KEY[w.strip()] for w in a.require.split(',') if w.strip()]
    for d in a.dirs:
        s = report(d, scan(d, pal), a.per_frame)
        for cls in want:
            if s[cls]['present'] == 0:
                print(f'  ASSERTION FAILED: {cls} absent from every frame of {d}. '
                      f'This set does not hold the population being claimed.')
                rc = 1
    return rc


if __name__ == '__main__':
    sys.exit(main())
