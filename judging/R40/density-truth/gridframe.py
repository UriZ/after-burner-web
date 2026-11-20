"""Native-resolution frame with a %W measuring grid baked in (2 %W minor,
10 %W major). For aircraft that MERGE with the ground/sea mass and so cannot be
bbox-measured by blobs.py, this is how their DRAWN width is read: count grid
cells. Usage: gridframe.py <dir> <outdir> <frame> [<frame> ...]"""
import sys, os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Black.ttf', 14)
d, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
files = sorted(glob.glob(os.path.join(d, 'f*.png')))
for fs in sys.argv[3:]:
    fi = int(fs)
    a = np.asarray(Image.open(files[fi]).convert('RGB')).astype(np.float32)
    H, W, _ = a.shape
    for p in range(2, 100, 2):
        x = int(round(p/100.0*W))
        a[:, x] *= (0.40 if p % 10 == 0 else 0.68)
    im = Image.fromarray(a.astype(np.uint8)); dr = ImageDraw.Draw(im)
    for p in range(10, 100, 10):
        x = int(round(p/100.0*W))
        dr.text((x+2, H-20), f"{p}", fill=(255, 255, 0), font=FONT)
    im.save(os.path.join(out, f'g{fi:05d}.png'))
    print(os.path.join(out, f'g{fi:05d}.png'))
