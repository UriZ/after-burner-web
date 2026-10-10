#!/usr/bin/env python3
"""IN-GAME jet measurement: locate the player aircraft in a captured frame,
then run INK-SPAN / STROKE and JET-SIL's own mask on it.

The authored cell and the thing on screen are not the same measurement. The
cell is 100 px of span; the sprite on screen is ~290 px in a 960x672 capture
(3x of native 320x224), so INK/SPAN -- which is dimensioned -- differs by that
factor with the drawing untouched. DENS and RSW do not, which is why they are
the figures quoted. See tools/art/inkspan.py.

The R9 brief's own rule: "JET-SIL is meaningless below ~250 px of in-game
span, so only in-game measurements at that scale are load-bearing." Every row
this prints carries its measured span so that rule can be applied.

LOCATING THE JET. The capture is taken with ?nocombat=1&noclouds=1 so the only
non-sky object in the lower half of the frame is the aircraft (and the HUD,
which is excluded by a mask derived per run from a ?hidejet=1 frame of the
same build -- never a hardcoded box; the HUD has been counted as an enemy, as
clouds and as a false horizon in this project, and it now contains a rotating
line).

  python3 tools/art/jet_ingame.py <hidejet-frame.png> <frame.png> [...]
"""
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, 'tools/art')
from inkspan import largest_component, fill_holes, stats  # noqa: E402


def jet_mask(rgb, bg, hudmask):
    """The jet is the DIFFERENCE against a ?hidejet=1 frame at the same tick.

    A background-colour mask does not work here and the failure is worth
    recording: the aircraft sits ON the horizon, so its lower half is in
    front of the dithered sea. My first version classified "the 24 commonest
    colours" as background, which swallowed the jet's own cream and returned
    spans of 26 to 167 px on a sprite that is ~290. Cropped and looked
    (tools/out/drawing-r9/look-day.png) and the mask was nonsense -- the
    measurement was clean, plausible, stable and wrong, which is the exact
    family CLAUDE.md says to crop before publishing.

    Differencing is exact because ?fixed=1&seed=1 is deterministic: the same
    tick with and without the player sprite differs only where the sprite is.
    """
    d = np.abs(rgb.astype(np.int32) - bg.astype(np.int32)).max(axis=2) > 8
    d &= ~hudmask
    return fill_holes(largest_component(d))


def main():
    hudsrc = sys.argv[1]
    hud = np.asarray(Image.open(hudsrc).convert('RGB'))
    a = hud.astype(np.int32)
    flat = a.reshape(-1, 3)
    key = (flat[:, 0] << 16) | (flat[:, 1] << 8) | flat[:, 2]
    u, c = np.unique(key, return_counts=True)
    bgset = set(u[np.argsort(-c)[:24]].tolist())
    k2 = (a[:, :, 0] << 16) | (a[:, :, 1] << 8) | a[:, :, 2]
    hm = ~np.isin(k2, list(bgset))
    # keep only the HUD: the top-right attitude box, the SCORE/HIT row and the
    # bottom bar. Everything else in a hidejet frame is sea dither, which must
    # NOT be excluded -- the jet overlaps it.
    keep = np.zeros_like(hm)
    keep[:int(0.16 * hm.shape[0]), :] = True
    keep[int(0.86 * hm.shape[0]):, :] = True
    hm &= keep
    for _ in range(3):
        hm = (hm | np.roll(hm, 1, 0) | np.roll(hm, -1, 0)
              | np.roll(hm, 1, 1) | np.roll(hm, -1, 1))
    print(f'HUD mask from {hudsrc}: {hm.sum()} px excluded (top 16 % and '
          f'bottom 14 % bands only; the sea dither in between is kept, '
          f'because the aircraft overlaps it)')
    print(f"{'frame':<46}{'ink':>7}{'span':>8}{'DENS':>8}{'RSW%':>7}{'RP90%':>7}")
    pairs = sys.argv[2:]
    for i in range(0, len(pairs), 2):
        bgp, fp = pairs[i], pairs[i + 1]
        bgf = np.asarray(Image.open(bgp).convert('RGB'))
        rgb = np.asarray(Image.open(fp).convert('RGB'))
        m = jet_mask(rgb, bgf, hm)
        r = stats(m)
        if r is None:
            print(f'{fp:<46}  (nothing found)')
            continue
        o = np.zeros(m.shape + (3,), np.uint8)
        o[m] = (255, 255, 255)
        Image.fromarray(o).save(fp.replace('.png', '-mask.png'))
        print(f"{fp:<46}{r['ink']:>7}{r['span']:>8.1f}{r['DENS']:>8.1f}"
              f"{r['RSW']:>7.2f}{r['RP90']:>7.2f}")

if __name__ == '__main__':
    main()
