import sys, os, numpy as np
from PIL import Image

# Fire-blob scan: count gold/orange "enemy round" pixels per frame in a sky box.
# Mask: hot gold/orange — R high, G mid, B low (the measured round palette
# #ffd570 core / #ff7733 body). Excludes HUD via a fixed top/bottom trim ONLY
# for this coarse locator (not a measurement); blobs are then eyeballed.
def firemask(a):
    r, g, b = a[...,0].astype(int), a[...,1].astype(int), a[...,2].astype(int)
    return (r > 180) & (g > 80) & (g < 230) & (b < 110) & (r - b > 110)

d = sys.argv[1]
files = sorted(f for f in os.listdir(d) if f.endswith('.png'))
for f in files:
    a = np.asarray(Image.open(os.path.join(d, f)).convert('RGB'))
    m = firemask(a)
    m[:95,:] = False; m[630:,:] = False   # HUD trim, coarse locator only
    n = int(m.sum())
    if n > 30:
        ys, xs = np.nonzero(m)
        print(f, n, 'x', xs.min(), xs.max(), 'y', ys.min(), ys.max())
