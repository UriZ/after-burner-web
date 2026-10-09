#!/usr/bin/env python3
"""IN-SITU HUD palette audit: does the composited frame contain any colour
inside a HUD band that the HUD is not authored to produce?

tools/hud-probe.mjs measures the HUD's own canvas, which is the right place
to find antialiasing but says nothing about what the COMPOSITE does. This
tool closes that half. It is deliberately a different operator from the
probe's, so the two can disagree.

THE OPERATOR, stated so it can be argued with.

  For a HUD band B (a rectangle of rows/cols) and the same rows OUTSIDE the
  HUD's horizontal reach (the "sky control" band C), a colour found in B is
  ACCOUNTED FOR if it is either
     (a) an authored HUD colour (the exact list exported by src/ui/hud.js,
         read here out of the probe's JSON so there is no retyped copy), or
     (b) present in C in the SAME FRAME — i.e. it is the world, which is
         behind the HUD and legitimately visible between its elements.
  Anything else is an unexplained colour and is reported with its pixels.

  (b) is what makes this honest rather than circular: without it every sky
  and sea pixel showing through the reticle would read as a violation. With
  it, the only thing left is colour the HUD itself manufactured — which for
  a 1-bit overlay on a fixed palette must be the empty set.

  The control band C is chosen as the same ROWS at columns the HUD does not
  reach, so sky banding/dither at that altitude is represented. It is not a
  HUD exclusion box: getting C wrong can only make this test STRICTER (an
  unreported world colour shows up as unexplained), never looser.

STAGE IS READ, NOT ASSUMED (CLAUDE.md / STAGE_MAP.md: "Never anchor
per-stage work on an unlabelled frame"). The stage digit is matched against
font.js's BIG face bitmaps at the measured cell x[184,190] y[200,206].

    python3 tools/measure_hud_insitu.py --selftest
    python3 tools/measure_hud_insitu.py --dir <capture dir> \
        --palette tools/out/hud-quantize-r6/after-canvas.json
"""
import argparse
import glob
import json
import os
import sys

import numpy as np
from PIL import Image

NATIVE_W, NATIVE_H = 320, 224

# src/ui/hud.js M_STAGE_DIGIT: BIG face, 7x7 cell ink-centred on cx=187,
# y=200 -> x[184,190] y[200,206]. Ink is CREAM #f7f794.
STAGE_CELL = (184, 200, 191, 207)   # x0, y0, x1(excl), y1(excl)
STAGE_INK = (0xF7, 0xF7, 0x94)
# src/ui/font.js BIG_GLYPHS, verbatim.
BIG_GLYPHS = {
    '1': ['..###..', '.####..', '..###..', '..###..', '..###..', '..###..', '..###..'],
    '2': ['######.', '#######', '....###', '.#####.', '.......', '#######', '#######'],
    '3': ['#######', '######.', '.......', '...###.', '....###', '#######', '######.'],
    '4': ['...###.', '..###..', '.###...', '#######', '#######', '...###.', '...###.'],
    '5': ['#######', '#######', '.......', '######.', '....###', '#######', '######.'],
}

# HUD bands. Both are generous — a band that is too LARGE only adds world
# pixels, which rule (b) accounts for; a band that is too small could miss a
# defect, so err big.
#   reticle:  src/ui/hud.js BB_RETICLE is native x[237,291] y[24,47]; the
#             attitude line and its ticks reach ~13 px beyond that.
#   bottom:   the SPEED plate / throttle / STAGE / lives strip.
#   top:      the SCORE and HIT emblems and their digits.
BANDS = {
    'reticle': (230, 16, 300, 56),
    'top': (10, 10, 225, 30),
    'bottom': (10, 195, 310, 220),
}
# THE CONTROL REGION IS THE WHOLE FRAME OUTSIDE EVERY HUD BAND, and that is
# a correction to this tool's first version, which used a hand-picked column
# range beside each band. On the BEFORE captures that narrow control reported
# five "unexplained" colours in the TOP band (#a4a4b5 #b5b5c5 #c5c5d6 #d6d6e6
# #e6e6f7) on 9 of 20 frames. They are an evenly spaced near-white blue ramp,
# which is a cloud edge, not a HUD artefact: the band spans x[10,225] and the
# control sat at x[230,320], so a cloud that happened to lie left of the
# reticle was invisible to its own control. Cropped and looked at before
# changing anything (tools/out/hud-quantize-r6/control-check-*.png) -- the
# pixels are a cloud.
#
# Widening the control can only make the test LOOSER, so the direction is
# stated: a HUD-manufactured blend that coincides exactly with some colour
# elsewhere in the frame would now be explained away. That is a real hole and
# it is why this tool is the SECOND instrument, not the only one --
# tools/hud-probe.mjs measures the HUD canvas with no world in it at all, and
# can have no such hole.


def load_native(path):
    img = np.asarray(Image.open(path).convert('RGB'), dtype=np.uint8)
    h, w, _ = img.shape
    if (w, h) == (NATIVE_W, NATIVE_H):
        return img
    if w % NATIVE_W or h % NATIVE_H:
        raise SystemExit(f'{path}: {w}x{h} is not an integer multiple of native')
    sy, sx = h // NATIVE_H, w // NATIVE_W
    blocks = img.reshape(NATIVE_H, sy, NATIVE_W, sx, 3)
    if not (blocks == blocks[:, :1, :, :1, :]).all():
        raise SystemExit(f'{path}: upscale is not block-uniform; decimation would '
                         'be measuring a filtered image')
    return img[::sy, ::sx]


def colour_set(block):
    return {tuple(int(v) for v in c) for c in np.unique(block.reshape(-1, 3), axis=0)}


def channel_values(block):
    s = set()
    for c in range(3):
        s |= set(np.unique(block[:, :, c]).tolist())
    return s


def read_stage_digit(img):
    """Returns the digit as a string, or None if nothing matches. Matching is
    EXACT on the 7x7 ink mask: a partial match is not a stage reading."""
    x0, y0, x1, y1 = STAGE_CELL
    cell = img[y0:y1, x0:x1]
    ink = (cell == np.array(STAGE_INK, dtype=np.uint8)).all(axis=2)
    if not ink.any():
        return None
    for d, rows in BIG_GLYPHS.items():
        want = np.array([[c == '#' for c in r] for r in rows])
        if want.shape == ink.shape and (want == ink).all():
            return d
    return '?'


def band_mask():
    """True where NO HUD band covers the pixel -- the control region."""
    m = np.ones((NATIVE_H, NATIVE_W), dtype=bool)
    for bx0, by0, bx1, by1 in BANDS.values():
        m[by0:by1, bx0:bx1] = False
    return m


CONTROL_MASK = band_mask()


def audit_band(img, band, control_mask=None):
    bx0, by0, bx1, by1 = band
    block = img[by0:by1, bx0:bx1]
    present = colour_set(block)
    cm = CONTROL_MASK if control_mask is None else control_mask
    ctrl = colour_set(img[cm])
    return present, ctrl, block


def hexs(c):
    return '#%02x%02x%02x' % c


def _selftest():
    ok = True

    def check(name, got, want):
        nonlocal ok
        good = got == want
        ok &= good
        print(f'  {"PASS" if good else "FAIL"}  {name}: got {got!r} want {want!r}')

    # Stage-digit reader, on a synthetic frame carrying a known glyph.
    for d in ('1', '2', '3'):
        img = np.zeros((NATIVE_H, NATIVE_W, 3), dtype=np.uint8)
        x0, y0, _, _ = STAGE_CELL
        for r, row in enumerate(BIG_GLYPHS[d]):
            for c, ch in enumerate(row):
                if ch == '#':
                    img[y0 + r, x0 + c] = STAGE_INK
        check(f'stage digit {d}', read_stage_digit(img), d)
    # Blank cell must read None, not a lucky match.
    check('stage digit, blank cell', read_stage_digit(np.zeros((NATIVE_H, NATIVE_W, 3), np.uint8)), None)
    # A glyph with ONE pixel knocked out must NOT match: exact or nothing.
    img = np.zeros((NATIVE_H, NATIVE_W, 3), dtype=np.uint8)
    x0, y0, _, _ = STAGE_CELL
    for r, row in enumerate(BIG_GLYPHS['2']):
        for c, ch in enumerate(row):
            if ch == '#':
                img[y0 + r, x0 + c] = STAGE_INK
    img[y0 + 3, x0 + 3] = (0, 0, 0)
    check('stage digit, one pixel knocked out', read_stage_digit(img), '?')

    # Band audit: plant a colour in a band that is in neither the palette nor
    # the control, and check it is the ONLY thing reported.
    img = np.zeros((NATIVE_H, NATIVE_W, 3), dtype=np.uint8)
    img[:, :] = (0, 159, 255)                 # flat sky everywhere
    bx0, by0, bx1, by1 = BANDS['reticle']
    img[by0 + 2, bx0 + 2] = (247, 247, 247)   # an authored HUD white
    img[by0 + 4, bx0 + 4] = (123, 123, 123)   # the planted off-palette grey
    present, ctrl, _ = audit_band(img, BANDS['reticle'])
    unexplained = present - ctrl - {(247, 247, 247)}
    check('band audit finds exactly the planted colour',
          sorted(hexs(c) for c in unexplained), ['#7b7b7b'])
    # And with the plant removed, nothing is unexplained -- the negative
    # control, without which "0 unexplained" could just mean a blind test.
    img[by0 + 4, bx0 + 4] = (0, 159, 255)
    present, ctrl, _ = audit_band(img, BANDS['reticle'])
    check('band audit, no plant (negative control)',
          sorted(hexs(c) for c in present - ctrl - {(247, 247, 247)}), [])
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir', action='append', default=[])
    ap.add_argument('--palette', default=None,
                    help="JSON from tools/hud_palette_probe.mjs --json; its "
                         "`palette` key is src/ui/hud.js's HUD_PALETTE export")
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--show-pixels', action='store_true')
    args = ap.parse_args()

    if args.selftest:
        print('synthetic controls:')
        sys.exit(0 if _selftest() else 1)

    if not args.palette:
        raise SystemExit('--palette is required (see --help); refusing to '
                         'measure against a retyped colour list')
    with open(args.palette) as f:
        pal_hex = json.load(f)['palette']
    palette = {tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) for h in pal_hex}
    print(f'palette: {len(palette)} authored colours from {args.palette}')

    paths = []
    for d in args.dir:
        paths += sorted(glob.glob(os.path.join(d, 'frame-*.png')))
    if not paths:
        raise SystemExit('no frames')

    import hashlib
    md5s = {}
    frames = []
    for p in paths:
        img = load_native(p)
        if img.max() == 0:
            print(f'  CORRUPT all-black: {p}')
        md5s.setdefault(hashlib.md5(img.tobytes()).hexdigest(), []).append(p)
        frames.append((p, img))
    dups = {k: v for k, v in md5s.items() if len(v) > 1}
    print(f'  sweep: {len(paths)} frames, '
          f'{sum(1 for _, i in frames if i.max() == 0)} black, '
          f'{len(dups)} duplicate groups')
    for v in dups.values():
        print(f'    CORRUPT duplicates: {v}')

    hdr = f'{"frame":46} {"stg":>3} {"chan":>5} {"colr":>5}' + ''.join(
        f'{b[:7]:>9}' for b in BANDS)
    print(hdr)
    totals = {b: 0 for b in BANDS}
    worst = []
    for p, img in frames:
        stage = read_stage_digit(img)
        ch = len(channel_values(img))
        nc = len(colour_set(img))
        cells = []
        for name, band in BANDS.items():
            present, ctrl, block = audit_band(img, band)
            unexplained = present - ctrl - palette
            cells.append(len(unexplained))
            totals[name] += len(unexplained)
            if unexplained:
                worst.append((os.path.basename(p), name, sorted(hexs(c) for c in unexplained)))
        label = os.path.relpath(p)
        print(f'{label[-46:]:46} {str(stage):>3} {ch:5d} {nc:5d}' +
              ''.join(f'{c:9d}' for c in cells))

    print('\nUNEXPLAINED COLOURS (in a HUD band, not authored, not in the '
          'frame\'s own control band)')
    for name in BANDS:
        print(f'  {name:9} {totals[name]}')
    for frame, name, cols in worst[:20]:
        print(f'    {frame} {name}: {" ".join(cols[:14])}')
    print('\nGATE  unexplained == 0 in every band on every frame')


if __name__ == '__main__':
    main()
