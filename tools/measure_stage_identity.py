#!/usr/bin/env python3
"""Read the HUD STAGE digit out of one of OUR captured frames.

R7 world lane. Every per-stage figure this lane publishes is keyed to the
stage digit rendered in the frame itself, not to a tick count and not to a
probe of game state. The reason is in CLAUDE.md: anchoring per-stage work on
an unlabelled frame shipped a stage-2 sky as stage 1 once. A tick count is an
inference (stage durations plus however long the tally cards held); the digit
is the thing the player sees.

Operator, stated because the gate figures depend on it:

  * Frames are captured at an integer upscale of the native 320x224 render
    (ARCHITECTURE.md D3 renders native and blits nearest-neighbour), so the
    frame is decimated back to native by taking the CENTRE pixel of each
    k x k block, and every block is checked uniform first. A non-uniform
    block means the frame is not a clean integer upscale and the frame is
    refused rather than measured.
  * The digit cell is native x[183,190] y[200,207) -- hud.js's
    M_STAGE_DIGIT (cx 187, y 200) with font.js's 7x7 BIG face, drawn
    centred on the ink.
  * Ink is the HUD's own cream `#f7f794` (hud.js `CREAM`), matched exactly.
    A brightness threshold does NOT work here and the first version of this
    reader failed on every stage-1 frame because of it: the digit is drawn
    OVER THE WORLD with no opaque bar behind it, so `max(R,G,B) >= 128`
    selected the sea (`#0010e7`, B 231) as ink and the cell came back
    solid. The sea's bright caps (`#d6f7f7`, `#b5e7f7`) also reach into the
    cell and survive an `R>=128 and G>=128` test, so the test is exact
    equality against the authored ink colour, which no sea colour is.
    The 7x7 ink mask is compared against font.js's BIG_GLYPHS for 1..9 and
    the best Hamming match wins, with the match distance reported so a bad
    read is visible rather than silent.

CONTROL: --selftest renders the three glyph bitmaps into synthetic frames
(including a shifted one and an all-black one) and asserts the reader
returns 1/2/3, tolerates the shift, and REFUSES the blank.
"""
import argparse
import glob
import os
import sys

import numpy as np
from PIL import Image

# font.js BIG_GLYPHS, transcribed. 1 and 3 are MEASURED on the arcade's own
# native frames (desert "248020" / night "515040" and the night STAGE digit);
# 2 is measured on the desert frame.
GLYPHS = {
    1: ['..###..', '.####..', '..###..', '..###..', '..###..', '..###..', '..###..'],
    2: ['######.', '#######', '....###', '.#####.', '.......', '#######', '#######'],
    3: ['#######', '######.', '.......', '...###.', '....###', '#######', '######.'],
    4: ['...###.', '..###..', '.###...', '#######', '#######', '...###.', '...###.'],
    5: ['#######', '#######', '.......', '######.', '....###', '#######', '######.'],
    6: ['######.', '#######', '###....', '#######', '###.###', '#######', '.#####.'],
    7: ['#######', '#######', '....###', '...###.', '..###..', '..###..', '..###..'],
    8: ['.#####.', '###.###', '#######', '.#####.', '###.###', '#######', '.#####.'],
    9: ['.#####.', '#######', '###.###', '#######', '....###', '#######', '.#####.'],
}
GLYPH_MASKS = {d: np.array([[c == '#' for c in row] for row in rows]) for d, rows in GLYPHS.items()}

DIGIT_X0, DIGIT_Y0 = 183, 200
CREAM = (247, 247, 148)  # hud.js CREAM '#f7f794', the stage digit's ink
NATIVE_W, NATIVE_H = 320, 224


def to_native(path, allow_nonuniform=False):
    """Decimate a k-times-upscaled capture back to native 320x224."""
    a = np.array(Image.open(path).convert('RGB'))
    h, w = a.shape[:2]
    if (w, h) == (NATIVE_W, NATIVE_H):
        return a
    if w % NATIVE_W or h % NATIVE_H or w // NATIVE_W != h // NATIVE_H:
        raise ValueError(f'{path}: {w}x{h} is not an integer upscale of 320x224')
    k = w // NATIVE_W
    blocks = a.reshape(NATIVE_H, k, NATIVE_W, k, 3)
    centre = blocks[:, k // 2, :, k // 2, :]
    if not allow_nonuniform:
        if not np.all(blocks == centre[:, None, :, None, :]):
            raise ValueError(f'{path}: {k}x{k} blocks are not uniform; refusing to measure')
    return centre


def read_digit(native, cell=None):
    """Return (digit, hamming_distance, ink_px) or (None, None, ink_px)."""
    x0, y0 = cell if cell else (DIGIT_X0, DIGIT_Y0)
    crop = native[y0:y0 + 7, x0:x0 + 7].astype(np.int32)
    ink = np.all(crop == np.array(CREAM), axis=2)
    n = int(ink.sum())
    if n < 8:  # a 7x7 digit glyph is 20-35 px of ink; anything this thin is not a digit
        return None, None, n
    best, bestd = None, 99
    # Allow +/-1 px of horizontal slop: drawTextCenteredInk centres on the ink
    # extent, so a glyph whose ink is an even number of columns wide lands half
    # a pixel off and rounds either way.
    for dx in (-1, 0, 1):
        sub = native[y0:y0 + 7, x0 + dx:x0 + dx + 7].astype(np.int32)
        if sub.shape[1] != 7:
            continue
        m = np.all(sub == np.array(CREAM), axis=2)
        for d, g in GLYPH_MASKS.items():
            dist = int(np.logical_xor(m, g).sum())
            if dist < bestd:
                best, bestd = d, dist
    if bestd > 6:
        return None, bestd, n
    return best, bestd, n


def selftest():
    ok = True

    def synth(digit, shift=0):
        f = np.zeros((NATIVE_H, NATIVE_W, 3), np.uint8)
        f[:140] = (0, 159, 255)
        g = GLYPH_MASKS[digit]
        for y in range(7):
            for x in range(7):
                if g[y, x]:
                    f[DIGIT_Y0 + y, DIGIT_X0 + x + shift] = CREAM
        return f

    for d in (1, 2, 3):
        got, dist, n = read_digit(synth(d))
        print(f'  selftest exact  digit {d}: read {got} (hamming {dist}, ink {n})')
        ok &= got == d and dist == 0
    for d in (1, 2, 3):
        got, dist, n = read_digit(synth(d, shift=1))
        print(f'  selftest +1px   digit {d}: read {got} (hamming {dist}, ink {n})')
        ok &= got == d
    # The defect that broke the first version of this reader: the digit sits
    # over open sea, and the sea's bright caps reach into the cell.
    contaminated = synth(3)
    off = ~GLYPH_MASKS[3]
    ys, xs = np.nonzero(off)
    contaminated[DIGIT_Y0 + ys, DIGIT_X0 + xs] = (214, 247, 247)  # #d6f7f7 sea cap
    got, dist, n = read_digit(contaminated)
    print(f'  selftest sea-cap contamination in cell: read {got} (hamming {dist}, ink {n})')
    ok &= got == 3

    blank = np.zeros((NATIVE_H, NATIVE_W, 3), np.uint8)
    blank[DIGIT_Y0:DIGIT_Y0 + 7, DIGIT_X0:DIGIT_X0 + 7] = (0, 16, 231)  # bare sea
    got, dist, n = read_digit(blank)
    print(f'  selftest blank: read {got} (ink {n}) -- must be None')
    ok &= got is None
    # A planted WRONG glyph must not read as 1/2/3 by accident.
    noise = np.zeros((NATIVE_H, NATIVE_W, 3), np.uint8)
    rng = np.random.default_rng(7)
    noise[DIGIT_Y0:DIGIT_Y0 + 7, DIGIT_X0:DIGIT_X0 + 7] = (
        rng.integers(0, 2, (7, 7, 1)) * np.array(CREAM, np.uint8)
    )
    got, dist, n = read_digit(noise)
    print(f'  selftest random ink: read {got} (hamming {dist}, ink {n})')
    print('SELFTEST', 'PASS' if ok else 'FAIL')
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dir')
    ap.add_argument('--frames', nargs='*')
    ap.add_argument('--selftest', action='store_true')
    ap.add_argument('--stage', type=int, help='print only frames reading this stage')
    a = ap.parse_args()
    if a.selftest:
        sys.exit(selftest())
    files = sorted(a.frames or []) or sorted(glob.glob(os.path.join(a.dir, 'frame-*.png')))
    if not files:
        print('no frames', file=sys.stderr)
        sys.exit(2)
    counts = {}
    for f in files:
        try:
            nat = to_native(f)
        except ValueError as e:
            print(f'REFUSED {e}')
            continue
        d, dist, n = read_digit(nat)
        counts[d] = counts.get(d, 0) + 1
        if a.stage is None or d == a.stage:
            print(f'{os.path.basename(f)}\tstage={d}\thamming={dist}\tink={n}')
    print('--- totals:', {k: v for k, v in sorted(counts.items(), key=lambda kv: (kv[0] is None, kv[0]))})


if __name__ == '__main__':
    main()
