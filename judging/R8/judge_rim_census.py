import glob, os, subprocess
from PIL import Image
import numpy as np
from collections import deque

def outer_rim(a):
    """Opaque pixels 4-adjacent to the EXTERIOR background (flood from border),
    i.e. the true outer contour — interior notches that do not drain to the
    border are excluded."""
    H,W = a.shape
    ext = np.zeros((H,W), bool)
    dq = deque()
    for x in range(W):
        for y in (0,H-1):
            if not a[y,x] and not ext[y,x]: ext[y,x]=True; dq.append((y,x))
    for y in range(H):
        for x in (0,W-1):
            if not a[y,x] and not ext[y,x]: ext[y,x]=True; dq.append((y,x))
    while dq:
        y,x = dq.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<H and 0<=nx<W and not a[ny,nx] and not ext[ny,nx]:
                ext[ny,nx]=True; dq.append((ny,nx))
    pad = np.zeros((H+2,W+2), bool); pad[1:-1,1:-1]=ext
    adj = pad[0:-2,1:-1]|pad[2:,1:-1]|pad[1:-1,0:-2]|pad[1:-1,2:]
    return a & adj

def sheet(data, cw, ch, thr):
    open('/tmp/_t.png','wb').write(data)
    arr = np.array(Image.open('/tmp/_t.png').convert('RGBA'))
    H,W,_ = arr.shape
    tot=0; nb=0; per=[]
    for cy in range(H//ch):
        for cx in range(W//cw):
            c = arr[cy*ch:(cy+1)*ch, cx*cw:(cx+1)*cw]
            a = c[:,:,3]>0
            if a.sum()==0: continue
            r = outer_rim(a)
            n = int(r.sum())
            if n==0: continue
            v = c[:,:,:3].astype(float).max(axis=2)/255.0
            k = int(((v<=thr)&r).sum())
            tot+=n; nb+=k; per.append(100.0*k/n)
    return (100.0*nb/tot if tot else None, min(per), max(per), tot)

def at(rev,name):
    r=subprocess.run(['git','show',f'{rev}:src/assets/sprites/{name}'],capture_output=True)
    return r.stdout if r.returncode==0 else None

names=[os.path.basename(p) for p in sorted(glob.glob('src/assets/sprites/enemy-*.png'))]
for thr in (0.12, 0.20):
  print(f"### OUTER-CONTOUR rim, near-black V<={thr}   (pooled%, per-cell min, per-cell max)")
  for n in names:
    b = sheet(at('82365e9',n),32,32,thr)
    a = sheet(open('src/assets/sprites/'+n,'rb').read(),32,32,thr)
    print(f"  {n:36s} before {b[0]:6.1f} [{b[1]:5.1f},{b[2]:5.1f}]   after {a[0]:6.1f} [{a[1]:5.1f},{a[2]:5.1f}]")
  for n in ['player-f14.png','player-f14-night.png','player-f14-roll.png']:
    a = sheet(open('src/assets/sprites/'+n,'rb').read(),100,72,thr)
    print(f"  {n:36s} {'':13s}            after {a[0]:6.1f} [{a[1]:5.1f},{a[2]:5.1f}]")

print("\n### WHAT THE RIM IS MADE OF NOW (outer contour, pooled over sheet, top 5 colours)")
from collections import Counter
for n in ['enemy-camo-head.png','enemy-camo-rear.png','enemy-grey-rear.png','enemy-interceptor-head.png']:
    arr=np.array(Image.open('src/assets/sprites/'+n).convert('RGBA'))
    cnt=Counter()
    for cy in range(arr.shape[0]//32):
        for cx in range(arr.shape[1]//32):
            c=arr[cy*32:(cy+1)*32,cx*32:(cx+1)*32]
            a=c[:,:,3]>0
            if a.sum()==0: continue
            r=outer_rim(a)
            for y,x in zip(*np.nonzero(r)):
                cnt['#%02x%02x%02x'%tuple(c[y,x,:3])]+=1
    tot=sum(cnt.values())
    print(' ',n, 'rim', tot, 'px')
    for h,k in cnt.most_common(5):
        v=max(int(h[1:3],16),int(h[3:5],16),int(h[5:7],16))/255
        print(f"    {h} V {v:.3f}  {k:5d}  {100*k/tot:5.1f} %")
