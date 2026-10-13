#!/usr/bin/env python3
"""Consecutive-frame strip builder, and THE GENERATOR FOR EVERY MONTAGE THIS
LANE PUBLISHES.

It exists because R10's headline side-by-side did not have one. That image
("MOTION-explosion-arcade-vs-ours.png") covered ~0.39 of the arcade frame on
one side and ~0.77 of ours on the other, so the same object occupied about
3.9x more of an arcade panel; two separate readers drew quantitative
conclusions from it and both were wrong by roughly four. The R10 judge made
the rule: *a side-by-side states the crop fraction of each side, or it is a
picture, not a measurement.*

So this tool REFUSES to build a two-sided strip without being told the crop
box on both sides, and it BURNS the crop fraction into the image itself —
the fraction of the source frame width that each panel covers, and the
scale-match ratio between the two sides. An image that leaves this file
carries its own provenance.

Usage:
  strip.py one   --dir D --out P --centre CY,CX --half H --from I --to J
                 --step S [--tile T] [--t0 T0] [--fps F] [--label L]
  strip.py pair  --top ... --bottom ...   (same keys, prefixed, as JSON)
"""
import sys, os, json, glob, argparse
from PIL import Image, ImageDraw


def frames(d, pattern='*.png'):
    return sorted(glob.glob(os.path.join(d, pattern)))


def build(spec):
    fs = frames(spec['dir'])
    cy, cx = spec['centre']
    half = spec['half']
    box = (cx - half, cy - half, cx + half, cy + half)
    src_w = Image.open(fs[0]).size[0]
    tile = spec.get('tile', 150)
    idx = list(range(spec['from'], spec['to'], spec.get('step', 1)))
    tiles = []
    for i in idx:
        im = Image.open(fs[i]).crop(box).resize((tile, tile), Image.NEAREST)
        tiles.append((i, im))
    return tiles, (2 * half) / src_w, src_w


def label_strip(tiles, cropfrac, src_w, spec, tile):
    pad = 18
    s = Image.new('RGB', (tile * len(tiles), tile + pad), (12, 12, 12))
    d = ImageDraw.Draw(s)
    pk = spec.get('peak')
    fps = spec.get('fps', 60.0)
    for k, (i, im) in enumerate(tiles):
        s.paste(im, (k * tile, 0))
        if pk is None:
            txt = 'f%04d' % (i + 1)
        else:
            txt = '%+d ms' % round((i - pk) * 1000.0 / fps)
        d.text((k * tile + 3, tile + 4), txt, fill=(255, 255, 255))
    return s, cropfrac


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'pair':
        ap = argparse.ArgumentParser()
        ap.add_argument('mode')
        ap.add_argument('--top', required=True, help='JSON spec')
        ap.add_argument('--bottom', required=True, help='JSON spec')
        ap.add_argument('--out', required=True)
        a = ap.parse_args()
        top, bot = json.loads(a.top), json.loads(a.bottom)
        tiles_t, cf_t, w_t = build(top)
        tiles_b, cf_b, w_b = build(bot)
        tile = top.get('tile', 150)
        st, _ = label_strip(tiles_t, cf_t, w_t, top, tile)
        sb, _ = label_strip(tiles_b, cf_b, w_b, bot, tile)
        head = 44
        W = max(st.size[0], sb.size[0])
        out = Image.new('RGB', (W, head + st.size[1] + sb.size[1] + head), (12, 12, 12))
        out.paste(st, (0, head))
        out.paste(sb, (0, head + st.size[1]))
        d = ImageDraw.Draw(out)
        d.text((4, 6), '%s   crop = %.3f of frame width (%d px of %d), %d Hz'
               % (top.get('label', 'TOP'), cf_t, 2 * top['half'], w_t, top.get('fps', 60)),
               fill=(255, 220, 120))
        d.text((4, 22), '%s   crop = %.3f of frame width (%d px of %d), %d Hz'
               % (bot.get('label', 'BOTTOM'), cf_b, 2 * bot['half'], w_b, bot.get('fps', 60)),
               fill=(255, 220, 120))
        d.text((4, head + st.size[1] + sb.size[1] + 6),
               'SCALE MATCH: a panel covers %.3f of the top frame and %.3f of the bottom one '
               '— ratio %.2fx. Areas read off the two sides differ by that factor squared.'
               % (cf_t, cf_b, cf_t / cf_b), fill=(255, 220, 120))
        out.save(a.out)
        print(a.out, 'crop fractions %.4f / %.4f  ratio %.3f' % (cf_t, cf_b, cf_t / cf_b))
        return

    ap = argparse.ArgumentParser()
    ap.add_argument('mode')
    ap.add_argument('--dir', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--centre', required=True)
    ap.add_argument('--half', type=int, required=True)
    ap.add_argument('--from', dest='frm', type=int, required=True)
    ap.add_argument('--to', type=int, required=True)
    ap.add_argument('--step', type=int, default=1)
    ap.add_argument('--tile', type=int, default=150)
    ap.add_argument('--peak', type=int)
    ap.add_argument('--fps', type=float, default=60.0)
    ap.add_argument('--label', default='')
    a = ap.parse_args()
    cy, cx = (int(v) for v in a.centre.split(','))
    spec = dict(dir=a.dir, centre=(cy, cx), half=a.half, tile=a.tile,
                peak=a.peak, fps=a.fps, label=a.label)
    spec['from'] = a.frm
    spec['to'] = a.to
    spec['step'] = a.step
    tiles, cf, w = build(spec)
    s, _ = label_strip(tiles, cf, w, spec, a.tile)
    out = Image.new('RGB', (s.size[0], s.size[1] + 20), (12, 12, 12))
    out.paste(s, (0, 20))
    ImageDraw.Draw(out).text((4, 4), '%s   crop = %.3f of frame width (%d px of %d), %g Hz'
                             % (a.label, cf, 2 * a.half, w, a.fps), fill=(255, 220, 120))
    out.save(a.out)
    print(a.out, 'crop fraction %.4f of frame width' % cf)


if __name__ == '__main__':
    main()
