from PIL import Image
import numpy as np
# Track ONE fleeing enemy's nozzle over blue sky, s1a f0055-f0115 (t99.9-100.9).
# Hot-orange threshold; cluster nearest to previous centroid within 70px.
cx, cy = 760, 300   # seed near the upper fleeing enemy at f0061
prev = None
for i in range(55, 116):
    im = np.asarray(Image.open(f's1a-f{i:04d}.png').convert('RGB'), dtype=int)
    r,g,b = im[...,0], im[...,1], im[...,2]
    hot = (r>200) & (g>60) & (g<190) & (b<80)
    ys, xs = np.nonzero(hot)
    if len(xs)==0:
        print(i, 0); continue
    d2 = (xs-cx)**2 + (ys-cy)**2
    sel = d2 < 70**2
    n = int(sel.sum())
    if n>0:
        cx, cy = float(xs[sel].mean()), float(ys[sel].mean())
    print(i, n, f"({cx:.0f},{cy:.0f})")
