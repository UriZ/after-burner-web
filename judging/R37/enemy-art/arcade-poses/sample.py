from PIL import Image
from collections import Counter
im = Image.open('s1b-f0106.png').convert('RGB')
boxes = {
 'nozzle_dark': (845,620,890,665),
 'orange_core': (895,640,925,670),
 'green_wing':  (760,505,820,560),
 'white_fuse':  (800,590,860,625),
}
for name,(x0,y0,x1,y1) in boxes.items():
    px = [im.getpixel((x,y)) for x in range(x0,x1) for y in range(y0,y1)]
    # quantize to 16-steps to find mode robustly
    q = Counter((r//16*16,g//16*16,b//16*16) for r,g,b in px)
    top = q.most_common(3)
    mean = tuple(sum(c[i] for c in px)//len(px) for i in range(3))
    print(f"{name}: mean={mean} modes={top}")
