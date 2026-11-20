"""Arcade frame blob locator for the R40 density-truth lane.

MEASUREMENT ONLY. The machine LOCATES and MEASURES candidate non-sky blobs;
a human/vision pass assigns identity (player / enemy / cloud / HUD / ground /
explosion / bullet). Never used as a presence statistic on its own -- every
figure published by this lane comes from an eye-classified box.

Operator: sky = the stage's modal RGB (AB2 sky is a flat fill, mode share
40-60% of a full frame). non-sky = L1 colour distance > TH. 8-connected
components over run-length union-find (no scipy on this machine).
Width published is the BBOX WIDTH IN PIXELS / frame width = DRAWN width %W.
"""
import numpy as np
from PIL import Image, ImageDraw
import json, sys, os

TH = 24

def sky_mode(paths, band=(55,150)):
    acc = {}
    for p in paths:
        a = np.asarray(Image.open(p).convert('RGB'))
        b = a[band[0]:band[1]].reshape(-1,3)
        key = (b[:,0].astype(np.int32)<<16) | (b[:,1].astype(np.int32)<<8) | b[:,2]
        u,c = np.unique(key, return_counts=True)
        for k,n in zip(u,c): acc[int(k)] = acc.get(int(k),0)+int(n)
    k = max(acc, key=acc.get)
    tot = sum(acc.values())
    return np.array([(k>>16)&255,(k>>8)&255,k&255], dtype=np.int16), acc[k]/tot

class UF:
    def __init__(s): s.p=[]
    def new(s):
        s.p.append(len(s.p)); return len(s.p)-1
    def find(s,x):
        while s.p[x]!=x:
            s.p[x]=s.p[s.p[x]]; x=s.p[x]
        return x
    def union(s,a,b):
        ra,rb=s.find(a),s.find(b)
        if ra!=rb: s.p[rb]=ra

def components(mask):
    """8-connected labelling via row runs + union-find. Returns list of
    (x0,y0,x1,y1,area)."""
    H,W = mask.shape
    uf = UF(); runs_prev=[]; info={}
    for y in range(H):
        row = mask[y]
        if not row.any():
            runs_prev=[]; continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        starts = np.flatnonzero(d==1); ends = np.flatnonzero(d==-1)
        runs=[]
        for x0,x1 in zip(starts, ends):
            lid = uf.new()
            info[lid]=[x0, y, x1-1, y, int(x1-x0)]
            # 8-connectivity: overlap with [x0-1, x1] on previous row
            for (px0,px1,plid) in runs_prev:
                if px1 >= x0-1 and px0 <= x1:
                    uf.union(plid, lid)
            runs.append((x0, x1-1, lid))
        runs_prev = runs
    out={}
    for lid,(x0,y0,x1,y1,a) in info.items():
        r = uf.find(lid)
        if r in out:
            o=out[r]
            o[0]=min(o[0],x0); o[1]=min(o[1],y0); o[2]=max(o[2],x1); o[3]=max(o[3],y1); o[4]+=a
        else:
            out[r]=[x0,y0,x1,y1,a]
    return list(out.values())

def analyse(path, sky, minarea=18, minw=5):
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    H,W,_ = a.shape
    mask = np.abs(a-sky).sum(axis=2) > TH
    comps = components(mask)
    res=[]
    for x0,y0,x1,y1,area in comps:
        w=x1-x0+1; h=y1-y0+1
        if area<minarea or w<minw: continue
        sub = a[y0:y1+1, x0:x1+1]
        m = mask[y0:y1+1, x0:x1+1]
        mean = sub[m].mean(axis=0) if m.any() else np.zeros(3)
        res.append(dict(x0=int(x0),y0=int(y0),x1=int(x1),y1=int(y1),w=int(w),h=int(h),
                        area=int(area), wfrac=round(w/W,4),
                        mean=[int(v) for v in mean]))
    res.sort(key=lambda r:-r['w'])
    return res, (W,H)

def annotate(path, res, out, maxbox=24):
    im = Image.open(path).convert('RGB')
    d = ImageDraw.Draw(im)
    for i,r in enumerate(res[:maxbox]):
        c = (255,0,255) if r['w']>=40 else (255,255,0)
        d.rectangle([r['x0']-2,r['y0']-2,r['x1']+2,r['y1']+2], outline=c, width=2)
        d.text((r['x0'], max(0,r['y0']-13)), f"{i}:{r['wfrac']*100:.1f}", fill=c)
    im.save(out)

if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--frames', nargs='+', required=True)
    ap.add_argument('--skyfrom', nargs='+', default=None)
    ap.add_argument('--annot', default=None)
    ap.add_argument('--json', default=None)
    ap.add_argument('--minarea', type=int, default=18)
    a = ap.parse_args()
    sky, share = sky_mode(a.skyfrom or a.frames[:5])
    print(json.dumps(dict(sky=[int(v) for v in sky], share=round(share,3))))
    allr={}
    for f in a.frames:
        res,(W,H) = analyse(f, sky, minarea=a.minarea)
        allr[os.path.basename(f)] = res
        if a.annot:
            os.makedirs(a.annot, exist_ok=True)
            annotate(f, res, os.path.join(a.annot, os.path.basename(f)))
    if a.json:
        json.dump(dict(sky=[int(v) for v in sky], frames=allr), open(a.json,'w'), indent=0)
    for k,v in allr.items():
        print(k, len(v), [ (r['w'], round(r['wfrac']*100,1)) for r in v[:8] ])
