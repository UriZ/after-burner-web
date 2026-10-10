#!/usr/bin/env python3
"""R9 JUDGE -- arcade PLAYER TRACKER for motion measurement.

The player's F-14 in AB2 carries TWO lit nozzle discs: a saturated orange ring
with a bright core, each ~10-14 px across on the 1028x720 upscale, each bounded
by black. Enemy aircraft from astern carry ONE. So the player is located as the
centroid of the orange-nozzle components.

THE CONTROL IS THE ONLY REASON TO BELIEVE IT: --mark writes the frames back out
with a cross on what was found, and they must be LOOKED AT. Explosions and the
afterburner are the two confusable populations and both are rejected by SIZE
(an explosion component is >1500 px, a nozzle is 40-700) and by the requirement
that the component be ROUNDISH (bbox aspect within 1:2).
"""
import sys, glob, json, math
import numpy as np
from PIL import Image, ImageDraw

def comps(mask, maxn=4000):
    H, W = mask.shape
    lab = -np.ones(mask.shape, int)
    out = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0] >= 0: continue
        cid = len(out); st = [(y0, x0)]; lab[y0, x0] = cid; px = []
        while st:
            y, x = st.pop(); px.append((y, x))
            if len(px) > maxn: break
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and lab[yy, xx] < 0:
                        lab[yy, xx] = cid; st.append((yy, xx))
        out.append(px)
    return out

def nozzles(img):
    r, g, b = img[..., 0].astype(int), img[..., 1].astype(int), img[..., 2].astype(int)
    m = (r > 195) & (g > 55) & (g < 190) & (b < 90)
    m[:int(0.06 * m.shape[0])] = False          # SCORE/HIT row
    m[int(0.86 * m.shape[0]):] = False          # SPEED/STAGE row
    good = []
    for px in comps(m):
        n = len(px)
        if n < 40 or n > 700: continue
        a = np.array(px); h = int(a[:, 0].max() - a[:, 0].min()) + 1; w = int(a[:, 1].max() - a[:, 1].min()) + 1
        if h == 0 or w == 0: continue
        if not (0.5 <= w / h <= 2.0): continue
        good.append((n, a[:, 1].mean(), a[:, 0].mean(), w, h))
    return good

def main():
    pats = sys.argv[1]
    mark = '--mark' in sys.argv
    fs = sorted(glob.glob(pats))
    rows = []
    for p in fs:
        img = np.asarray(Image.open(p).convert('RGB'))
        g = nozzles(img)
        if g:
            # The player has EXACTLY TWO nozzles. Keep the two largest
            # qualifying components; explosion fringe fragments are smaller and
            # are what the --mark control showed on frame 1.
            # PAIR CONSTRAINT, added after the --mark control showed the first
            # version pairing a PLAYER nozzle with a near ENEMY's nozzle (arcade
            # enemies carry a lit nozzle too) and with explosion fringe, giving a
            # nonsense 849 px separation on a 1028 px frame. Keep the best pair
            # that is plausibly ONE aircraft: similar component size and a
            # separation in the range a drawn F-14 can have.
            best = None
            for i in range(len(g)):
                for j in range(i + 1, len(g)):
                    n1, x1, y1, _, _ = g[i]; n2, x2, y2, _, _ = g[j]
                    if max(n1, n2) / min(n1, n2) > 1.8: continue
                    sep = math.hypot(x1 - x2, y1 - y2)
                    if not (18 <= sep <= 230): continue
                    if best is None or n1 + n2 > best[0]: best = (n1 + n2, [g[i], g[j]])
            if best is None:
                rows.append({'f': p, 'n': 0, 'reason': 'no plausible nozzle pair'})
                if mark:
                    im = Image.open(p).convert('RGB'); im.save(p.replace('.png', '.MARK.png'))
                continue
            g = best[1]
            tot = sum(x[0] for x in g)
            cx = sum(x[0] * x[1] for x in g) / tot
            cy = sum(x[0] * x[2] for x in g) / tot
            sep = 0.0
            if len(g) >= 2:
                g2 = sorted(g, reverse=True)[:2]
                sep = math.hypot(g2[0][1] - g2[1][1], g2[0][2] - g2[1][2])
            rows.append({'f': p, 'n': len(g), 'cx': cx, 'cy': cy,
                         'cxpct': 100 * cx / img.shape[1], 'cypct': 100 * cy / img.shape[0],
                         'nozzle_sep_px': sep})
        else:
            rows.append({'f': p, 'n': 0})
        if mark:
            im = Image.open(p).convert('RGB'); d = ImageDraw.Draw(im)
            for n, x, y, w, h in g:
                d.ellipse([x - 14, y - 14, x + 14, y + 14], outline=(255, 0, 255), width=2)
            im.save(p.replace('.png', '.MARK.png'))
    print(json.dumps(rows, indent=0))

main()
