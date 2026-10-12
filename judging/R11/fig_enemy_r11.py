#!/usr/bin/env python3
"""R11 ENEMY-ART figures. Every panel's source, crop box and magnification is
in this file, so a reader can regenerate any figure and nobody has to recover
a panel grid by eye (judging/R10 lost two findings that way).

Run from the repo root:  python3 judging/R11/fig_enemy_r11.py
Writes into tools/out/enemy-art-r11/ (gitignored; regenerate, do not chase).

FIG1  the head-on enemy: arcade | before | after, matched to the SAME native
      span, each on the sky its own stage actually uses.
FIG2  the rear enemy, same treatment.
FIG3  all five bank cells before and after, to show the roll.
FIG4  the fleet: one cell of every day sheet at 1x, 2x and 6x on stage sky.
"""
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'tools/out/enemy-art-r11')
BEFORE = os.path.join(OUT, 'before')

S1_SKY = (0, 158, 255)      # stage 1, reference/stage1-*.png frame mode
S2_SKY = (231, 113, 5)      # stage 2, arc-enemy-mid-4x.png frame mode

# Arcade panels. (path, crop box, scale from the file's own pixels to NATIVE).
# arc-enemy-mid-4x.png is a 4x nearest crop of a 1028x720 decode of a 320x224
# original, so one native pixel is 4 * 3.2125 = 12.85 file pixels.
ARC_MID = (os.path.join(ROOT, 'tools/out/art-critic-r10/arc-enemy-mid-4x.png'),
           (0, 60, 959, 440), 12.85)
# A-arc-headon-NATIVE-12x.png is already resampled to native and magnified 12x.
ARC_NEAR = (os.path.join(ROOT, 'tools/out/art-critic-r10/A-arc-headon-NATIVE-12x.png'),
            (0, 0, 1200, 768), 12.0)
# s1near-B-3x.png is a 3x nearest crop of the 1028x720 60 fps decode at
# t = 88 + 56*10/60 = 97.3 s (hunt frame h0057), stage 1 by HUD digit.
ARC_S1_NEAR = (os.path.join(OUT, 's1near-B-3x.png'), (0, 0, 840, 660), 3 * 3.2125)


def to_native(spec):
    path, box, scale = spec
    im = Image.open(path).convert('RGB').crop(box)
    w = max(1, round(im.width / scale))
    h = max(1, round(im.height / scale))
    return im.resize((w, h), Image.BOX)


def cell(path, index=2, cw=64, ch=32):
    im = Image.open(path).convert('RGBA')
    return im.crop((index * cw, 0, (index + 1) * cw, ch))


def on_sky(rgba, sky, pad=2):
    bg = Image.new('RGB', (rgba.width + 2 * pad, rgba.height + 2 * pad), sky)
    bg.paste(rgba, (pad, pad), rgba)
    return bg


def row(panels, zoom, gap=8, bg=(24, 24, 24)):
    zs = [p.resize((p.width * zoom, p.height * zoom), Image.NEAREST) for p in panels]
    w = sum(z.width for z in zs) + gap * (len(zs) - 1)
    h = max(z.height for z in zs)
    out = Image.new('RGB', (w, h), bg)
    x = 0
    for z in zs:
        out.paste(z, (x, (h - z.height) // 2))
        x += z.width + gap
    return out


def fig_aspect(name, arcade_spec, arcade_sky, before_png, after_png, zoom=6):
    arc = to_native(arcade_spec)
    bef = on_sky(cell(before_png), arcade_sky)
    aft = on_sky(cell(after_png), arcade_sky)
    img = row([arc, bef, aft], zoom)
    img.save(os.path.join(OUT, name))
    print(f'{name}: arcade {arc.size} | before {bef.size} | after {aft.size} @ {zoom}x')


def fig_poses(name, before_png, after_png, sky, zoom=5):
    befs = [on_sky(cell(before_png, i), sky) for i in range(5)]
    afts = [on_sky(cell(after_png, i), sky) for i in range(5)]
    a = row(befs, zoom)
    b = row(afts, zoom)
    out = Image.new('RGB', (max(a.width, b.width), a.height + b.height + 10), (24, 24, 24))
    out.paste(a, (0, 0))
    out.paste(b, (0, a.height + 10))
    out.save(os.path.join(OUT, name))
    print(f'{name}: 5 poses before over 5 poses after @ {zoom}x')


def fig_fleet(name):
    sprites = os.path.join(ROOT, 'src/assets/sprites')
    rows = []
    for liv, sky in [('grey', S1_SKY), ('camo', S2_SKY),
                     ('interceptor', S1_SKY), ('prop', S2_SKY)]:
        panels = []
        for asp in ('head', 'rear'):
            c = cell(os.path.join(sprites, f'enemy-{liv}-{asp}.png'))
            panels.append(on_sky(c, sky))
        rows.append(row(panels, 6))
    w = max(r.width for r in rows)
    h = sum(r.height for r in rows) + 10 * (len(rows) - 1)
    out = Image.new('RGB', (w, h), (24, 24, 24))
    y = 0
    for r in rows:
        out.paste(r, (0, y))
        y += r.height + 10
    out.save(os.path.join(OUT, name))
    print(f'{name}: grey / camo / interceptor / prop, head then rear @ 6x')


def fig_sizes(name):
    """The size the player actually sees: one cell at 1x, 2x, 3x, 6x."""
    sprites = os.path.join(ROOT, 'src/assets/sprites')
    panels = []
    for liv, sky in [('grey', S1_SKY), ('camo', S2_SKY)]:
        for asp in ('head', 'rear'):
            panels.append(on_sky(cell(os.path.join(sprites, f'enemy-{liv}-{asp}.png')), sky))
    tiles = []
    for z in (1, 2, 3, 6):
        tiles.append(row(panels, z))
    w = max(t.width for t in tiles)
    h = sum(t.height for t in tiles) + 10 * (len(tiles) - 1)
    out = Image.new('RGB', (w, h), (24, 24, 24))
    y = 0
    for t in tiles:
        out.paste(t, (0, y))
        y += t.height + 10
    out.save(os.path.join(OUT, name))
    print(f'{name}: grey+camo head/rear at 1x 2x 3x 6x')


def main():
    sprites = os.path.join(ROOT, 'src/assets/sprites')
    fig_aspect('FIG1-headon-arcade-before-after.png', ARC_MID, S2_SKY,
               os.path.join(BEFORE, 'enemy-grey-head.png'),
               os.path.join(sprites, 'enemy-grey-head.png'))
    fig_aspect('FIG1b-headon-near-arcade-before-after.png', ARC_NEAR, S2_SKY,
               os.path.join(BEFORE, 'enemy-camo-head.png'),
               os.path.join(sprites, 'enemy-camo-head.png'))
    fig_aspect('FIG2-rear-arcade-before-after.png', ARC_S1_NEAR, S1_SKY,
               os.path.join(BEFORE, 'enemy-grey-rear.png'),
               os.path.join(sprites, 'enemy-grey-rear.png'))
    fig_poses('FIG3-bank-poses-before-after.png',
              os.path.join(BEFORE, 'enemy-grey-head.png'),
              os.path.join(sprites, 'enemy-grey-head.png'), S1_SKY)
    fig_fleet('FIG4-fleet.png')
    fig_sizes('FIG5-sizes.png')
    return 0


if __name__ == '__main__':
    sys.exit(main())
