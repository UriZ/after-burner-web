#!/usr/bin/env python3
"""Panels for hand-reading the JET's nozzle midpoint AS AN OFFSET from the
detected sight x. Reading a DIFFERENCE against a drawn line is what this is
for: the absolute-x read carries the ruler's own error twice.

Each panel is a 2x crop centred on the sight's x, with the sight column drawn
magenta, a tick every 20 px of the ORIGINAL frame (minor) and 100 px (major,
labelled with the signed offset).
"""
import sys, os, csv
from PIL import Image, ImageDraw, ImageFont

def font(sz=22):
    for f in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(f):
            try: return ImageFont.truetype(f, sz)
            except Exception: pass
    return ImageFont.load_default()

def panel(path, sx, half=260, y0=120, y1=560, scale=2):
    im = Image.open(path).convert('RGB')
    W, H = im.size
    x0 = int(round(sx)) - half
    c = im.crop((x0, y0, x0 + 2 * half, y1)).resize((2 * half * scale, (y1 - y0) * scale), Image.NEAREST)
    d = ImageDraw.Draw(c)
    for off in range(-half, half + 1, 20):
        X = (off + half) * scale + (sx - round(sx)) * scale
        major = (off % 100 == 0)
        d.line([X, 0, X, c.height if major else 26], fill=(255, 255, 0) if major else (0, 255, 255), width=1)
        if major and off: d.text((X + 3, 2), '%+d' % off, fill=(255, 255, 0), font=font(20))
    X = half * scale
    d.line([X, 0, X, c.height], fill=(255, 0, 255), width=2)
    d.text((6, c.height - 30), '%s  sight x=%.1f' % (os.path.basename(path)[:5], sx),
           fill=(255, 0, 0), font=font(24))
    return c

if __name__ == '__main__':
    d_in, csvp, out = sys.argv[1], sys.argv[2], sys.argv[3]
    want = sys.argv[4].split(',')
    rows = {r['frame'][:5]: r for r in csv.DictReader(open(csvp)) if r['cx_px']}
    ps = [panel(os.path.join(d_in, k + '.png'), float(rows[k]['cx_px'])) for k in want]
    cols = 2
    rws = (len(ps) + cols - 1) // cols
    sh = Image.new('RGB', (cols * ps[0].width, rws * ps[0].height), (20, 20, 20))
    for i, p in enumerate(ps):
        sh.paste(p, ((i % cols) * p.width, (i // cols) * p.height))
    sh.save(out)
    print(out, sh.size, len(ps), 'panels')
