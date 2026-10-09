import sys
from PIL import Image
import numpy as np
from collections import Counter, deque
def comps(mask,minpx):
    H,W=mask.shape; seen=np.zeros((H,W),bool); out=[]
    for y in range(H):
        for x in range(W):
            if mask[y,x] and not seen[y,x]:
                dq=deque([(y,x)]); seen[y,x]=True; n=0; ymax=0
                while dq:
                    cy,cx=dq.popleft(); n+=1; ymax=max(ymax,cy)
                    for dy in(-1,0,1):
                        for dx in(-1,0,1):
                            ny,nx=cy+dy,cx+dx
                            if 0<=ny<H and 0<=nx<W and mask[ny,nx] and not seen[ny,nx]:
                                seen[ny,nx]=True; dq.append((ny,nx))
                if n>=minpx: out.append((n,ymax))
    return out
for f in sys.argv[1:]:
    a=np.array(Image.open(f).convert('RGB')).astype(int)
    band=a[60:300,:,:].copy()
    sky=np.array(Counter(tuple(p) for p in band.reshape(-1,3)).most_common(1)[0][0])
    # HUD blanked TO SKY so it cannot register as an object (standing rule)
    band[0:60,490:686,:]=sky
    d=np.abs(band-sky).sum(axis=2)
    m=d>90
    cs=[c for c in comps(m,6) if c[1]<236]     # drop anything reaching the band floor (terrain/sea)
    tot=sum(c[0] for c in cs)
    big=sorted((c[0] for c in cs),reverse=True)[:5]
    print(f'{f.split("/")[-1]:26s} n_comp={len(cs):3d}  total_non_sky_px={tot:6d}  largest={big}')
