"""Frame strip builder: tiles N consecutive-decoded 60 Hz frames (whole frame,
downscaled, %W grid baked in) so an ARRIVAL can be stepped back to the frame it
first becomes visible. Usage:
  strip.py <framedir> <out.png> <f_first> <step> <ncols> <nrows> [scale] [t0]
"""
import sys, os, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Black.ttf', 15)
d, out, f0, step, nc, nr = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6])
scale = float(sys.argv[7]) if len(sys.argv) > 7 else 0.5
t0 = float(sys.argv[8]) if len(sys.argv) > 8 else 0.0
files = sorted(glob.glob(os.path.join(d, 'f*.png')))
W, H = Image.open(files[0]).size
cw, ch = int(W*scale), int(H*scale)
sheet = Image.new('RGB', (cw*nc, (ch+18)*nr), (12, 12, 12))
dr = ImageDraw.Draw(sheet)
for k in range(nc*nr):
    fi = f0 + k*step
    if fi < 0 or fi >= len(files): continue
    a = np.asarray(Image.open(files[fi]).convert('RGB')).astype(np.float32)
    for p in range(10, 100, 10):          # 10 %W majors only (survives downscale)
        a[:, int(round(p/100.0*W))] *= 0.45
    im = Image.fromarray(a.astype(np.uint8)).resize((cw, ch), Image.LANCZOS)
    cx, cy = (k % nc)*cw, (k//nc)*(ch+18)
    sheet.paste(im, (cx, cy+18))
    dr.text((cx+3, cy+1), f"f{fi}  t={t0+fi/60.0:.3f}s", fill=(255, 230, 0), font=FONT)
    dr.rectangle([cx, cy+18, cx+cw-1, cy+ch+17], outline=(90, 90, 90))
sheet.save(out)
print(out, sheet.size)
